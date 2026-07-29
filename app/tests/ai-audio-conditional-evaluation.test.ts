import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  aggregateConditionalPanel,
  assertConditionalSubplanIntegrity,
  bindConditionalSubplan,
  conditionalSubplanLedgerBinding,
  createLocalVoiceConditionalDraft,
  createTuningConditionalDraft,
  executeConditionalPanelWithFetch,
  selectTunedConditionalCandidate,
  validateConditionalJudgeResponse,
  voiceMetricsFromConditionalPanel,
  type AiBoundConditionalSubplan,
  type AiConditionalAudioClip,
  type AiConditionalJudgeAssignment,
  type AiConditionalJudgeResponse,
  type AiValidatedConditionalJudgeRun,
} from "../src/lib/academy/narration/ai-audio-conditional-evaluation";
import {
  AI_AUDIO_CONDITIONAL_TOOL,
  AI_AUDIO_CONDITIONAL_RESPONSE_SCHEMA_VERSION,
  AI_AUDIO_CONDITIONAL_TOOL_NAME,
} from "../src/lib/academy/narration/ai-audio-conditional-evaluation";
import {
  AI_AUDIO_SCORE_DIMENSIONS,
  hashAiValue,
  selectBestLocalVoice,
  type AiAudioScoreDimension,
} from "../src/lib/academy/narration/ai-audio-evaluation";

const BASE_PLAN_HASH = "a".repeat(64);

function audioInputsForDraft(
  draft: Parameters<typeof bindConditionalSubplan>[0]["draft"],
): readonly AiConditionalAudioClip[] {
  return draft.affectedExcerptIds.flatMap((excerptId) =>
    draft.candidates.map((candidate) => ({
      excerptId,
      candidateId: candidate.candidateId,
      audioSha256: hashAiValue([
        "test-audio",
        excerptId,
        candidate.candidateId,
      ]),
      durationSeconds:
        20 +
        Number.parseInt(
          hashAiValue([excerptId, candidate.candidateId]).slice(
            0,
            2,
          ),
          16,
        ) /
          100,
      objectiveIntegrityPass: true,
      contentConsistency: 1,
    })),
  );
}

function allScores(
  value: number,
): Record<AiAudioScoreDimension, number> {
  return Object.fromEntries(
    AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      value,
    ]),
  ) as Record<AiAudioScoreDimension, number>;
}

function responseFor(
  assignment: AiConditionalJudgeAssignment,
  candidateScores: Readonly<
    Record<
      string,
      Partial<Record<AiAudioScoreDimension, number>> & {
        default: number;
      }
    >
  >,
): AiConditionalJudgeResponse {
  const clips = assignment.sets.flatMap((set, setIndex) =>
    set.clips.map((clip) => {
      const score = candidateScores[clip.candidateId]!;
      return {
        clip_label: clip.neutralLabel,
        scores: {
          ...allScores(score.default),
          ...Object.fromEntries(
            Object.entries(score).filter(
              ([dimension]) => dimension !== "default",
            ),
          ),
        },
        semantic_faithfulness: 5,
        too_slow: false,
        too_fast: false,
        evidence_note: `Heard cadence and pause timing specific to passage ${String(
          setIndex + 1,
        )} in this delivery.`,
      };
    }),
  );
  const sets = assignment.sets.map((set, setIndex) => {
    const ranking = [...set.clips]
      .sort(
        (left, right) =>
          candidateScores[right.candidateId]!.default -
            candidateScores[left.candidateId]!.default ||
          left.neutralLabel.localeCompare(right.neutralLabel),
      )
      .map((clip) => clip.neutralLabel);
    return {
      set_label: set.neutralSetLabel,
      ranking,
      clearest_clip: ranking[0]!,
      pronunciation_issues: [],
      duration_judgment: {
        longer_clip: "SIMILAR_DURATION" as const,
        longer_duration_excessive: "no" as const,
        clarity_justifies_longer_duration:
          "not_applicable" as const,
      },
      audible_distinction: "CLEAR" as const,
      confidence: 88,
      concise_reason: `Heard a clearer rhythm and steadier tone in passage ${String(
        setIndex + 1,
      )}.`,
    };
  });
  return {
    schema_version:
      AI_AUDIO_CONDITIONAL_RESPONSE_SCHEMA_VERSION,
    assignment_id: assignment.assignmentId,
    judge_id: assignment.judgeId,
    evidence_basis: "AUDIO_ONLY",
    clips,
    sets,
    overall_notes:
      "Heard meaningful differences in cadence, pauses, tone, and sustained comfort.",
  };
}

function runsFor(
  subplan: AiBoundConditionalSubplan,
  scores: Parameters<typeof responseFor>[1],
  transformResponse?: (
    response: AiConditionalJudgeResponse,
    assignment: AiConditionalJudgeAssignment,
  ) => AiConditionalJudgeResponse,
): readonly AiValidatedConditionalJudgeRun[] {
  return subplan.assignments.map((assignment) => {
    const original = responseFor(assignment, scores);
    const response = transformResponse
      ? transformResponse(original, assignment)
      : original;
    const validation = validateConditionalJudgeResponse(
      response,
      assignment,
    );
    if (!validation.valid) {
      throw new Error(
        validation.issues.map((issue) => issue.message).join("; "),
      );
    }
    return {
      assignment,
      response: validation.response,
      responseHash: validation.responseHash,
    };
  });
}

describe("Phase 2C conditional subplans", () => {
  it("binds one tuning cause, no more than two profiles, affected audio, and every prompt hash before a request", () => {
    const draft = createTuningConditionalDraft({
      basePlanHash: BASE_PLAN_HASH,
      signals: [
        {
          dimension: "table_row_pause",
          direction: "too_long",
          severity: 0.95,
          evidence: ["The frozen table is slower than needed."],
        },
        {
          dimension: "sentence_pause",
          direction: "too_short",
          severity: 0.4,
          evidence: ["A sentence ending may be compressed."],
        },
      ],
      affectedExcerptIdsByDimension: {
        table_row_pause: ["sample-02"],
        sentence_pause: ["sample-01"],
      },
    });
    expect(draft.cause?.dimension).toBe("table_row_pause");
    expect(draft.profiles).toHaveLength(2);
    expect(draft.affectedExcerptIds).toEqual(["sample-02"]);

    const audioInputs = audioInputsForDraft(draft);
    const subplan = bindConditionalSubplan({
      draft,
      audioInputs,
    });
    expect(subplan.audioInputs).toHaveLength(4);
    expect(subplan.assignments).toHaveLength(3);
    expect(
      new Set(
        subplan.assignments.flatMap((assignment) =>
          assignment.sets.flatMap((set) =>
            set.clips.map((clip) => clip.neutralLabel),
          ),
        ),
      ).size,
    ).toBe(12);
    expect(subplan.prompts).toHaveLength(3);
    expect(
      subplan.prompts.every((item) =>
        item.prompt.includes(
          "exactly 1.0x normal playback speed",
        ),
      ),
    ).toBe(true);
    expect(() =>
      assertConditionalSubplanIntegrity(subplan, audioInputs),
    ).not.toThrow();

    const ledgerBinding =
      conditionalSubplanLedgerBinding(subplan);
    expect(ledgerBinding).toMatchObject({
      event: "CONDITIONAL_SUBPLAN_BOUND",
      data: {
        subplanHash: subplan.subplanHash,
        boundBeforeExternalRequest: true,
        primaryJudgeCalls: 3,
        maximumCallsIncludingValidationRetries: 4,
      },
    });
    expect(() =>
      assertConditionalSubplanIntegrity(subplan, [
        {
          ...audioInputs[0]!,
          audioSha256: "b".repeat(64),
        },
        ...audioInputs.slice(1),
      ]),
    ).toThrow(/changed after binding/iu);
  });

  it("validates conditional audio evidence and permits only one schema retry", () => {
    const draft = createLocalVoiceConditionalDraft({
      basePlanHash: BASE_PLAN_HASH,
      excerptIds: [
        "sample-01",
        "sample-02",
        "sample-03",
        "sample-04",
        "sample-05",
      ],
    });
    const subplan = bindConditionalSubplan({
      draft,
      audioInputs: audioInputsForDraft(draft),
    });
    const assignment = subplan.assignments[0]!;
    const valid = responseFor(assignment, {
      "voice-bryce": { default: 4 },
      "voice-linda": { default: 5 },
      "voice-cori": { default: 4 },
    });
    expect(
      validateConditionalJudgeResponse(valid, assignment).valid,
    ).toBe(true);
    expect(
      AI_AUDIO_CONDITIONAL_RESPONSE_SCHEMA_VERSION,
    ).toBe("tenxpros-phase2c-conditional-judge-response-v2");
    expect(
      AI_AUDIO_CONDITIONAL_TOOL.parameters.properties.sets.items
        .required,
    ).toContain("clearest_clip");

    const firstSetWithoutClarity = Object.fromEntries(
      Object.entries(valid.sets[0]!).filter(
        ([field]) => field !== "clearest_clip",
      ),
    );
    const omittedClarityChoice = {
      ...valid,
      sets: [
        firstSetWithoutClarity,
        ...valid.sets.slice(1),
      ],
    };
    expect(
      validateConditionalJudgeResponse(
        omittedClarityChoice,
        assignment,
      ).valid,
    ).toBe(false);

    const invalidClarityChoice = {
      ...valid,
      sets: valid.sets.map((set, index) =>
        index === 0
          ? {
              ...set,
              clearest_clip: "ALT-FFFFFFFFFF",
            }
          : set,
      ),
    };
    expect(
      validateConditionalJudgeResponse(
        invalidClarityChoice,
        assignment,
      ).valid,
    ).toBe(false);

    const firstAssignedSet = assignment.sets[0]!;
    const lowerClarityLabel = firstAssignedSet.clips.find(
      (clip) => clip.candidateId === "voice-bryce",
    )!.neutralLabel;
    const contradictoryClarityChoice = {
      ...valid,
      sets: valid.sets.map((set, index) =>
        index === 0
          ? {
              ...set,
              clearest_clip: lowerClarityLabel,
            }
          : set,
      ),
    };
    const contradictoryValidation =
      validateConditionalJudgeResponse(
        contradictoryClarityChoice,
        assignment,
      );
    expect(contradictoryValidation.valid).toBe(false);
    expect(
      contradictoryValidation.issues.some(
        (issue) =>
          issue.code === "INTERNAL_CONTRADICTION" &&
          issue.path.endsWith(".clearest_clip"),
      ),
    ).toBe(true);

    const tied = responseFor(assignment, {
      "voice-bryce": { default: 4 },
      "voice-linda": { default: 4 },
      "voice-cori": { default: 4 },
    });
    const tiedAlternative = {
      ...tied,
      sets: tied.sets.map((set, index) =>
        index === 0
          ? {
              ...set,
              clearest_clip:
                assignment.sets[0]!.clips[1]!.neutralLabel,
            }
          : set,
      ),
    };
    expect(
      validateConditionalJudgeResponse(
        tiedAlternative,
        assignment,
      ).valid,
    ).toBe(true);

    const unblinded = {
      ...valid,
      overall_notes:
        "The Linda voice has a natural cadence and steady pauses.",
    };
    const first = validateConditionalJudgeResponse(
      unblinded,
      assignment,
      1,
    );
    const second = validateConditionalJudgeResponse(
      unblinded,
      assignment,
      2,
    );
    expect(first.valid).toBe(false);
    expect(first.retryAllowed).toBe(true);
    expect(second.valid).toBe(false);
    expect(second.retryAllowed).toBe(false);
  });

  it("selects a one-round tuned candidate only with a clear target gain and all safeguards", () => {
    const draft = createTuningConditionalDraft({
      basePlanHash: BASE_PLAN_HASH,
      signals: [
        {
          dimension: "sentence_pause",
          direction: "too_short",
          severity: 0.9,
          evidence: ["Sentence endings are compressed."],
        },
      ],
      affectedExcerptIdsByDimension: {
        sentence_pause: ["sample-01"],
      },
    });
    const subplan = bindConditionalSubplan({
      draft,
      audioInputs: audioInputsForDraft(draft),
    });
    const panel = aggregateConditionalPanel({
      subplan,
      runs: runsFor(subplan, {
        "source-baseline": {
          default: 3,
          pause_quality: 2,
        },
        "source-corrected": {
          default: 4,
          pause_quality: 3,
        },
        "tune-sentence_pause-1": {
          default: 5,
          pause_quality: 5,
        },
        "tune-sentence_pause-2": {
          default: 4,
          pause_quality: 3,
        },
      }),
    });
    expect(panel.validJudgeCount).toBe(3);
    expect(
      panel.candidates.find(
        (candidate) =>
          candidate.candidateId ===
          "tune-sentence_pause-1",
      )?.clearerThanCandidateVotesByExcerpt[
        "source-baseline"
      ]?.["sample-01"],
    ).toBe(3);
    expect(
      selectTunedConditionalCandidate({
        draft,
        summaries: panel.candidates,
      }),
    ).toMatchObject({
      status: "COMPLETED_SELECTED",
      selectedCandidateId: "tune-sentence_pause-1",
    });
  });

  it("keeps overall ranking separate from direct clarity and ignores inaudible clarity choices", () => {
    const draft = createTuningConditionalDraft({
      basePlanHash: BASE_PLAN_HASH,
      signals: [
        {
          dimension: "sentence_pause",
          direction: "too_short",
          severity: 0.9,
          evidence: ["Sentence endings are compressed."],
        },
      ],
      affectedExcerptIdsByDimension: {
        sentence_pause: ["sample-01"],
      },
    });
    const subplan = bindConditionalSubplan({
      draft,
      audioInputs: audioInputsForDraft(draft),
    });
    const scores = {
      "source-baseline": { default: 3 },
      "source-corrected": { default: 4 },
      "tune-sentence_pause-1": {
        default: 5,
        clarity: 5,
      },
      "tune-sentence_pause-2": {
        default: 4,
        clarity: 5,
      },
    };
    const chooseSecondProfile = (
      response: AiConditionalJudgeResponse,
      assignment: AiConditionalJudgeAssignment,
      audibleDistinction: "CLEAR" | "NONE",
    ): AiConditionalJudgeResponse => ({
      ...response,
      sets: response.sets.map((responseSet) => {
        const assignedSet = assignment.sets.find(
          (set) =>
            set.neutralSetLabel === responseSet.set_label,
        )!;
        return {
          ...responseSet,
          clearest_clip: assignedSet.clips.find(
            (clip) =>
              clip.candidateId ===
              "tune-sentence_pause-2",
          )!.neutralLabel,
          audible_distinction: audibleDistinction,
        };
      }),
    });
    const distinctPanel = aggregateConditionalPanel({
      subplan,
      runs: runsFor(
        subplan,
        scores,
        (response, assignment) =>
          chooseSecondProfile(
            response,
            assignment,
            "CLEAR",
          ),
      ),
    });
    const rankingWinner = distinctPanel.candidates.find(
      (candidate) =>
        candidate.candidateId ===
        "tune-sentence_pause-1",
    )!;
    const clarityWinner = distinctPanel.candidates.find(
      (candidate) =>
        candidate.candidateId ===
        "tune-sentence_pause-2",
    )!;
    expect(
      rankingWinner.firstPlaceVotesByExcerpt["sample-01"],
    ).toBe(3);
    expect(
      rankingWinner.clearerThanCandidateVotesByExcerpt[
        "source-baseline"
      ]?.["sample-01"] ?? 0,
    ).toBe(0);
    expect(
      clarityWinner.firstPlaceVotesByExcerpt["sample-01"] ??
        0,
    ).toBe(0);
    expect(
      clarityWinner.clearerThanCandidateVotesByExcerpt[
        "source-baseline"
      ]?.["sample-01"],
    ).toBe(3);

    const inaudiblePanel = aggregateConditionalPanel({
      subplan,
      runs: runsFor(
        subplan,
        scores,
        (response, assignment) =>
          chooseSecondProfile(response, assignment, "NONE"),
      ),
    });
    expect(
      inaudiblePanel.candidates.find(
        (candidate) =>
          candidate.candidateId ===
          "tune-sentence_pause-2",
      )!.clearerThanCandidateVotesByExcerpt[
        "source-baseline"
      ]?.["sample-01"] ?? 0,
    ).toBe(0);
  });

  it("never selects the frozen baseline as a tuned profile even when it wins every blind ranking", () => {
    const draft = createTuningConditionalDraft({
      basePlanHash: BASE_PLAN_HASH,
      signals: [
        {
          dimension: "sentence_pause",
          direction: "too_short",
          severity: 0.9,
          evidence: ["Sentence endings are compressed."],
        },
      ],
      affectedExcerptIdsByDimension: {
        sentence_pause: ["sample-01"],
      },
    });
    const subplan = bindConditionalSubplan({
      draft,
      audioInputs: audioInputsForDraft(draft),
    });
    const panel = aggregateConditionalPanel({
      subplan,
      runs: runsFor(subplan, {
        "source-baseline": {
          default: 5,
          pause_quality: 5,
        },
        "source-corrected": {
          default: 4,
          pause_quality: 3,
        },
        "tune-sentence_pause-1": {
          default: 4,
          pause_quality: 3,
        },
        "tune-sentence_pause-2": {
          default: 4,
          pause_quality: 3,
        },
      }),
    });

    expect(
      panel.candidates.find(
        (candidate) =>
          candidate.candidateId === "source-baseline",
      )?.firstPlaceVotesByExcerpt["sample-01"],
    ).toBe(3);
    expect(
      selectTunedConditionalCandidate({
        draft,
        summaries: panel.candidates,
      }),
    ).toMatchObject({
      status: "COMPLETED_NO_CLEAR_IMPROVEMENT",
      selectedCandidateId: null,
    });
  });

  it("converts a complete three-judge, five-excerpt branch into Bryce/Linda/Cori metrics", () => {
    const draft = createLocalVoiceConditionalDraft({
      basePlanHash: BASE_PLAN_HASH,
      excerptIds: [
        "sample-01",
        "sample-02",
        "sample-03",
        "sample-04",
        "sample-05",
      ],
    });
    const subplan = bindConditionalSubplan({
      draft,
      audioInputs: audioInputsForDraft(draft),
    });
    const panel = aggregateConditionalPanel({
      subplan,
      runs: runsFor(subplan, {
        "voice-bryce": {
          default: 4,
          naturalness: 3,
          listening_comfort: 3,
          long_form_suitability: 3,
        },
        "voice-linda": { default: 5 },
        "voice-cori": { default: 4 },
      }),
    });
    const metrics = voiceMetricsFromConditionalPanel({
      draft,
      summaries: panel.candidates,
    });
    expect(metrics).toHaveLength(3);
    expect(selectBestLocalVoice(metrics)).toMatchObject({
      decision: "PASS_PIPER_LINDA",
      selectedVoice: "linda",
    });
  });
});

describe("Phase 2C conditional fetch execution", () => {
  function executableFixture() {
    const draft = createTuningConditionalDraft({
      basePlanHash: BASE_PLAN_HASH,
      signals: [
        {
          dimension: "sentence_pause",
          direction: "too_short",
          severity: 0.9,
          evidence: ["Sentence endings are compressed."],
        },
      ],
      affectedExcerptIdsByDimension: {
        sentence_pause: ["sample-01"],
      },
    });
    const payloads = new Map<string, Buffer>();
    const audioInputs = draft.candidates.map((candidate) => {
      const key = `sample-01\0${candidate.candidateId}`;
      const bytes = Buffer.from(`fake-mp3-${candidate.candidateId}`);
      payloads.set(key, bytes);
      return {
        excerptId: "sample-01",
        candidateId: candidate.candidateId,
        audioSha256: createHash("sha256")
          .update(bytes)
          .digest("hex"),
        durationSeconds: 10,
        objectiveIntegrityPass: true,
        contentConsistency: 1,
      };
    });
    const subplan = bindConditionalSubplan({
      draft,
      audioInputs,
    });
    return { subplan, audioInputs, payloads };
  }

  function envelopeFor(
    assignment: AiConditionalJudgeAssignment,
    response?: AiConditionalJudgeResponse,
  ) {
    const judged =
      response ??
      responseFor(assignment, {
        "source-baseline": { default: 3 },
        "source-corrected": { default: 4 },
        "tune-sentence_pause-1": { default: 5 },
        "tune-sentence_pause-2": { default: 4 },
      });
    return {
      choices: [
        {
          message: {
            tool_calls: [
              {
                type: "function",
                function: {
                  name: AI_AUDIO_CONDITIONAL_TOOL_NAME,
                  arguments: JSON.stringify(judged),
                },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 1_200,
        completion_tokens: 100,
        cost: 0.031,
        prompt_tokens_details: { audio_tokens: 900 },
      },
    };
  }

  it("binds before dispatch, sends actual MP3 bytes, and completes three fresh mocked fetches", async () => {
    const { subplan, audioInputs, payloads } =
      executableFixture();
    const events: string[] = [];
    let requestIndex = 0;
    const fetchImpl = vi.fn(
      async (
        url: string,
        init: {
          body: string;
          headers: Readonly<Record<string, string>>;
        },
      ) => {
        events.push("fetch");
        expect(url).toBe(
          "https://openrouter.ai/api/v1/chat/completions",
        );
        expect(init.headers).toMatchObject({
          "HTTP-Referer": "https://tenxpros.com",
          "X-OpenRouter-Title":
            "TenXPros Academy Audio Evaluation",
          "X-OpenRouter-Metadata": "enabled",
        });
        const body = JSON.parse(init.body) as {
          model: string;
          provider: {
            allow_fallbacks: boolean;
            require_parameters: boolean;
          };
          store: boolean;
          max_tokens: number;
          messages: {
            content?: {
              type: string;
              input_audio?: { data: string };
            }[];
          }[];
        };
        expect(body.store).toBe(false);
        expect(body.max_tokens).toBe(5_000);
        expect(body.model).toBe("openai/gpt-audio");
        expect(body.provider).toEqual({
          allow_fallbacks: false,
          require_parameters: true,
        });
        expect(body).not.toHaveProperty("modalities");
        expect(body).not.toHaveProperty("usage");
        expect(body).not.toHaveProperty(
          "max_completion_tokens",
        );
        expect(
          body.messages[1]?.content?.filter(
            (part) => part.type === "input_audio",
          ),
        ).toHaveLength(4);
        const assignment =
          subplan.assignments[fetchImpl.mock.calls.length - 1]!;
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify(envelopeFor(assignment)),
        };
      },
    );
    const settled: string[] = [];
    const result = await executeConditionalPanelWithFetch({
      subplan,
      currentAudioInputs: audioInputs,
      readAudio: async (clip) =>
        payloads.get(
          `${clip.excerptId}\0${clip.candidateId}`,
        )!,
      secret: "test-secret-never-persisted",
      fetchImpl,
      hooks: {
        bindSubplanBeforeRequests: async () => {
          events.push("bound");
        },
        reserveRequest: async () => {
          events.push("reserved");
          requestIndex += 1;
          return requestIndex;
        },
        settleRequest: async (record) => {
          settled.push(record.status);
        },
      },
    });
    expect(events[0]).toBe("bound");
    expect(result.status).toBe("COMPLETE");
    expect(result.runs).toHaveLength(3);
    expect(result.externalRequests).toBe(3);
    expect(settled).toEqual([
      "ACCEPTED",
      "ACCEPTED",
      "ACCEPTED",
    ]);
  });

  it("never retries an ambiguous paid request", async () => {
    const { subplan, audioInputs, payloads } =
      executableFixture();
    let requestIndex = 0;
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("timed out", "AbortError");
    });
    const settled: string[] = [];
    const result = await executeConditionalPanelWithFetch({
      subplan,
      currentAudioInputs: audioInputs,
      readAudio: async (clip) =>
        payloads.get(
          `${clip.excerptId}\0${clip.candidateId}`,
        )!,
      secret: "test-secret-never-persisted",
      fetchImpl,
      hooks: {
        bindSubplanBeforeRequests: async () => {},
        reserveRequest: async () => {
          requestIndex += 1;
          return requestIndex;
        },
        settleRequest: async (record) => {
          settled.push(record.status);
        },
      },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("STOPPED_UNCERTAIN");
    expect(result.externalRequests).toBe(1);
    expect(settled).toEqual(["UNCERTAIN_PAID"]);
  });

  it("stops the conditional panel fail-closed without retry on HTTP 402", async () => {
    const { subplan, audioInputs, payloads } =
      executableFixture();
    let requestIndex = 0;
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 402,
      text: async () =>
        JSON.stringify({
          error: { message: "Insufficient credits" },
        }),
    }));
    const settled: {
      status: string;
      actualCostUsd: number | null;
      retryPermitted: boolean;
      issueCodes: readonly string[];
    }[] = [];
    const result = await executeConditionalPanelWithFetch({
      subplan,
      currentAudioInputs: audioInputs,
      readAudio: async (clip) =>
        payloads.get(
          `${clip.excerptId}\0${clip.candidateId}`,
        )!,
      secret: "test-secret-never-persisted",
      fetchImpl,
      hooks: {
        bindSubplanBeforeRequests: async () => {},
        reserveRequest: async () => {
          requestIndex += 1;
          return requestIndex;
        },
        settleRequest: async (record) => {
          settled.push({
            status: record.status,
            actualCostUsd: record.actualCostUsd,
            retryPermitted: record.retryPermitted,
            issueCodes: record.issueCodes,
          });
        },
      },
    });
    expect(result).toMatchObject({
      status: "STOPPED_HTTP",
      externalRequests: 1,
      rejected: [
        {
          attempt: 1,
          issueCodes: ["HTTP_402"],
        },
      ],
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(settled).toEqual([
      {
        status: "FAILED_NOT_BILLED",
        actualCostUsd: 0,
        retryPermitted: false,
        issueCodes: ["HTTP_402"],
      },
    ]);
  });

  it("keeps the conditional timeout armed through a stalled response body read", async () => {
    vi.useFakeTimers();
    try {
      const { subplan, audioInputs, payloads } =
        executableFixture();
      let requestIndex = 0;
      let bodyReadStarted!: () => void;
      const started = new Promise<void>((resolveStarted) => {
        bodyReadStarted = resolveStarted;
      });
      const settled: {
        status: string;
        retryPermitted: boolean;
      }[] = [];
      const execution = executeConditionalPanelWithFetch({
        subplan,
        currentAudioInputs: audioInputs,
        readAudio: async (clip) =>
          payloads.get(
            `${clip.excerptId}\0${clip.candidateId}`,
          )!,
        secret: "test-secret-never-persisted",
        requestTimeoutMs: 1_000,
        fetchImpl: async (_url, init) => ({
          ok: true,
          status: 200,
          text: async () => {
            bodyReadStarted();
            return new Promise<string>((_resolve, reject) => {
              const rejectAsAborted = () => {
                const error = new Error(
                  "Conditional body read was aborted",
                );
                error.name = "AbortError";
                reject(error);
              };
              if (init.signal.aborted) {
                rejectAsAborted();
                return;
              }
              init.signal.addEventListener(
                "abort",
                rejectAsAborted,
                { once: true },
              );
            });
          },
        }),
        hooks: {
          bindSubplanBeforeRequests: async () => {},
          reserveRequest: async () => {
            requestIndex += 1;
            return requestIndex;
          },
          settleRequest: async (record) => {
            settled.push({
              status: record.status,
              retryPermitted: record.retryPermitted,
            });
          },
        },
      });
      await started;
      await vi.advanceTimersByTimeAsync(1_000);
      const result = await execution;
      expect(result).toMatchObject({
        status: "STOPPED_UNCERTAIN",
        externalRequests: 1,
      });
      expect(settled).toEqual([
        {
          status: "UNCERTAIN_PAID",
          retryPermitted: false,
        },
      ]);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rehashes payload bytes before reserving a request slot", async () => {
    const { subplan, audioInputs, payloads } =
      executableFixture();
    const reserveRequest = vi.fn(async () => 1);
    const fetchImpl = vi.fn();
    await expect(
      executeConditionalPanelWithFetch({
        subplan,
        currentAudioInputs: audioInputs,
        readAudio: async (clip) => {
          const key = `${clip.excerptId}\0${clip.candidateId}`;
          return clip.candidateId ===
            subplan.candidates[0]?.candidateId
            ? Buffer.from("changed-after-binding")
            : payloads.get(key)!;
        },
        secret: "test-secret-never-persisted",
        fetchImpl,
        hooks: {
          bindSubplanBeforeRequests: async () => {},
          reserveRequest,
          settleRequest: async () => {},
        },
      }),
    ).rejects.toThrow(/changed after subplan binding/iu);
    expect(reserveRequest).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rethrows ledger and linkage failures instead of misclassifying them as a cap stop", async () => {
    const { subplan, audioInputs, payloads } =
      executableFixture();
    const fetchImpl = vi.fn();
    await expect(
      executeConditionalPanelWithFetch({
        subplan,
        currentAudioInputs: audioInputs,
        readAudio: async (clip) =>
          payloads.get(
            `${clip.excerptId}\0${clip.candidateId}`,
          )!,
        secret: "test-secret-never-persisted",
        fetchImpl,
        hooks: {
          bindSubplanBeforeRequests: async () => {},
          reserveRequest: async () => {
            throw new Error(
              "Ledger hash-chain verification failed",
            );
          },
          settleRequest: async () => {},
        },
      }),
    ).rejects.toThrow(/ledger hash-chain verification failed/iu);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("retries one machine-invalid result once in a fresh request", async () => {
    const { subplan, audioInputs, payloads } =
      executableFixture();
    let requestIndex = 0;
    let call = 0;
    const assignmentOrder = [0, 1, 2, 0] as const;
    const reservations: string[] = [];
    const fetchImpl = vi.fn(async () => {
      const assignment =
        subplan.assignments[assignmentOrder[call]!]!;
      const valid = responseFor(assignment, {
        "source-baseline": { default: 3 },
        "source-corrected": { default: 4 },
        "tune-sentence_pause-1": { default: 5 },
        "tune-sentence_pause-2": { default: 4 },
      });
      const judged =
        call === 0
          ? {
              ...valid,
              overall_notes:
                "Bryce has natural cadence and clear pause timing.",
            }
          : valid;
      call += 1;
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify(envelopeFor(assignment, judged)),
      };
    });
    const result = await executeConditionalPanelWithFetch({
      subplan,
      currentAudioInputs: audioInputs,
      readAudio: async (clip) =>
        payloads.get(
          `${clip.excerptId}\0${clip.candidateId}`,
        )!,
      secret: "test-secret-never-persisted",
      fetchImpl,
      hooks: {
        bindSubplanBeforeRequests: async () => {},
        reserveRequest: async (reservation) => {
          reservations.push(
            `${reservation.judgeId}:${String(
              reservation.attempt,
            )}`,
          );
          requestIndex += 1;
          return requestIndex;
        },
        settleRequest: async () => {},
      },
    });
    expect(result.status).toBe("COMPLETE");
    expect(result.externalRequests).toBe(4);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.attempt).toBe(1);
    expect(reservations).toEqual([
      `${subplan.assignments[0]!.judgeId}:1`,
      `${subplan.assignments[1]!.judgeId}:1`,
      `${subplan.assignments[2]!.judgeId}:1`,
      `${subplan.assignments[0]!.judgeId}:2`,
    ]);
  });

  it("defers the only task-wide retry until all three primaries and does not retry a second invalid judge", async () => {
    const { subplan, audioInputs, payloads } =
      executableFixture();
    const assignmentOrder = [0, 1, 2, 0] as const;
    const reservations: string[] = [];
    const retryPermissions: boolean[] = [];
    let call = 0;
    let requestIndex = 0;
    const fetchImpl = vi.fn(async () => {
      const assignment =
        subplan.assignments[assignmentOrder[call]!]!;
      const valid = responseFor(assignment, {
        "source-baseline": { default: 3 },
        "source-corrected": { default: 4 },
        "tune-sentence_pause-1": { default: 5 },
        "tune-sentence_pause-2": { default: 4 },
      });
      const judged =
        call < 2
          ? {
              ...valid,
              overall_notes:
                "Bryce has natural cadence and clear pause timing.",
            }
          : valid;
      call += 1;
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify(envelopeFor(assignment, judged)),
      };
    });
    const result = await executeConditionalPanelWithFetch({
      subplan,
      currentAudioInputs: audioInputs,
      readAudio: async (clip) =>
        payloads.get(
          `${clip.excerptId}\0${clip.candidateId}`,
        )!,
      secret: "test-secret-never-persisted",
      fetchImpl,
      hooks: {
        bindSubplanBeforeRequests: async () => {},
        reserveRequest: async (reservation) => {
          reservations.push(
            `${reservation.judgeId}:${String(
              reservation.attempt,
            )}`,
          );
          requestIndex += 1;
          return requestIndex;
        },
        settleRequest: async (record) => {
          retryPermissions.push(record.retryPermitted);
        },
      },
    });
    expect(result.status).toBe("INCOMPLETE_INVALID");
    expect(result.externalRequests).toBe(4);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(reservations).toEqual([
      `${subplan.assignments[0]!.judgeId}:1`,
      `${subplan.assignments[1]!.judgeId}:1`,
      `${subplan.assignments[2]!.judgeId}:1`,
      `${subplan.assignments[0]!.judgeId}:2`,
    ]);
    expect(retryPermissions).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });
});
