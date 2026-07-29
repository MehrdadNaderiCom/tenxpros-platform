import { describe, expect, it } from "vitest";

import {
  aggregateAiPanel,
  AI_AUDIO_EVALUATION_TOOL,
  AI_AUDIO_FINAL_DECISIONS,
  AI_AUDIO_JUDGE_LENSES,
  AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION,
  AI_AUDIO_SCORE_DIMENSIONS,
  authorizeNextAiRequest,
  buildAiEvaluationPlan,
  buildBlindJudgeAssignments,
  buildJudgePrompt,
  canonicalAiJson,
  decideLocalNarration,
  deriveBryceDecisionMetrics,
  estimateEvaluationCost,
  hashAiValue,
  selectBestLocalVoice,
  selectTuningProfiles,
  summarizeAiRequestLedger,
  validateJudgeResponse,
  type AiAudioModelPricing,
  type AiBlindJudgeAssignment,
  type AiBlindSourcePair,
  type AiBryceDecisionMetrics,
  type AiJudgeResponse,
  type AiLocalVoice,
  type AiObjectiveAnalysisSummary,
  type AiPrivateSampleIdentity,
  type AiRequestLedgerEntry,
  type AiValidatedJudgeRun,
  type AiVoiceCandidateMetrics,
} from "../src/lib/academy/narration/ai-audio-evaluation";

const PACKAGE_ID = "blind-review-0123456789abcdef";
const BLIND_SEED =
  "phase-2c-independent-blind-seed-with-more-than-thirty-two-characters";

function sourcePairs(): readonly AiBlindSourcePair[] {
  return Array.from({ length: 5 }, (_, pairIndex) => {
    const pairId = `sample-${String(pairIndex + 1).padStart(
      2,
      "0",
    )}`;
    return {
      pairId,
      tableEvaluation: pairIndex === 1,
      samples: [
        {
          sampleId: `${pairId}-A`,
          audioSha256: hashAiValue({
            pairId,
            label: "A",
          }),
          durationSeconds: 10,
        },
        {
          sampleId: `${pairId}-B`,
          audioSha256: hashAiValue({
            pairId,
            label: "B",
          }),
          durationSeconds: 10,
        },
      ],
    };
  });
}

function assignments(): readonly AiBlindJudgeAssignment[] {
  return buildBlindJudgeAssignments({
    evaluationPackageId: PACKAGE_ID,
    blindSeed: BLIND_SEED,
    pairs: sourcePairs(),
  });
}

function judgeResponse(
  assignment: AiBlindJudgeAssignment,
  options: {
    preferCorrectedSource?: boolean;
    boilerplate?: boolean;
  } = {},
): AiJudgeResponse {
  const scoreByLabel = new Map<string, number>();
  const clips = assignment.pairs.flatMap((pair, pairIndex) =>
    pair.clips.map((clip, clipIndex) => {
      const corrected = clip.sourceSampleId.endsWith("-A");
      const score = options.preferCorrectedSource
        ? corrected
          ? 5
          : 3
        : clipIndex === 0
          ? 5
          : 3;
      scoreByLabel.set(clip.neutralLabel, score);
      return {
        clip_label: clip.neutralLabel,
        scores: Object.fromEntries(
          AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
            dimension,
            score,
          ]),
        ) as AiJudgeResponse["clips"][number]["scores"],
        evidence_note: options.boilerplate
          ? "The delivery has clear rhythm and audible phrasing."
          : `The delivery has distinct rhythm ${String(
              pairIndex + 1,
            )}-${String(clipIndex + 1)} with clearly heard endings.`,
      };
    }),
  );
  const pairs = assignment.pairs.map((pair, pairIndex) => {
    const preferred = options.preferCorrectedSource
      ? pair.clips.find((clip) =>
          clip.sourceSampleId.endsWith("-A"),
        )!
      : pair.clips[0];
    const other = pair.clips.find(
      (clip) => clip.neutralLabel !== preferred.neutralLabel,
    )!;
    expect(scoreByLabel.get(preferred.neutralLabel)).toBe(5);
    return {
      pair_label: pair.neutralPairLabel,
      preferred_version_overall: preferred.neutralLabel,
      clearer_version: preferred.neutralLabel,
      more_natural_version: preferred.neutralLabel,
      better_paced_version: preferred.neutralLabel,
      long_lesson_preference: preferred.neutralLabel,
      speed_assessment: [
        {
          clip_label: preferred.neutralLabel,
          too_slow: false,
          too_fast: false,
        },
        {
          clip_label: other.neutralLabel,
          too_slow: pairIndex === 4,
          too_fast: false,
        },
      ],
      pronunciation_issues: [],
      audible_distinction: "CLEAR" as const,
      confidence: 80,
      concise_reason: options.boilerplate
        ? "The preferred delivery has clearer pacing and stronger rhythm."
        : `Audible comparison ${String(
            pairIndex + 1,
          )} has clearer pacing, cleaner endings, and steadier rhythm.`,
      table_evaluation: pair.tableEvaluation
        ? {
            easier_to_follow: preferred.neutralLabel,
            repeated_labels_helpful: "yes" as const,
            longer_clip: preferred.neutralLabel,
            longer_duration_excessive: "no" as const,
            clarity_justifies_added_duration: "yes" as const,
            test_more_concise_table_narration: "no" as const,
          }
        : null,
    };
  });
  return {
    schema_version: AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION,
    assignment_id: assignment.assignmentId,
    judge_id: assignment.judgeId,
    evidence_basis: "AUDIO_ONLY",
    clips,
    pairs,
    overall_notes:
      "The comparisons contain audible differences in pacing, comfort, and articulation.",
  };
}

const PRICING: AiAudioModelPricing = {
  providerId: "openrouter",
  modelId: "openai/gpt-audio",
  verification: "VERIFIED",
  audioInputUsdPerMillionTokens: 32,
  textInputUsdPerMillionTokens: 2.5,
  textOutputUsdPerMillionTokens: 10,
  audioTokensPerSecond: 32,
  source: "official-model-pricing-snapshot",
  verifiedAt: "2026-07-26T00:00:00.000Z",
  authoritativeActualCostField: "usage.cost",
};

function evaluationPlan(
  pricing: AiAudioModelPricing = PRICING,
) {
  return buildAiEvaluationPlan({
    evaluationPackageId: PACKAGE_ID,
    manifestSha256: "a".repeat(64),
    modelId: pricing.modelId,
    assignments: assignments(),
    pricing,
    maximumOutputTokensPerRequest: 4_000,
    additionalInputTokensPerRequest: 1_000,
    hardMaximumUsd: 8,
  });
}

function scoreRecord(
  value: number,
): AiVoiceCandidateMetrics["medianScores"] {
  return Object.fromEntries(
    AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      value,
    ]),
  ) as AiVoiceCandidateMetrics["medianScores"];
}

function bryceMetrics(
  overrides: Partial<AiBryceDecisionMetrics> = {},
): AiBryceDecisionMetrics {
  return {
    validJudgeCount: 5,
    correctedPairMajorityWins: 4,
    totalPairCount: 5,
    correctedOverallPreferenceRate: 0.65,
    correctedMedianScores: {
      naturalness: 3.8,
      pause_quality: 4,
      pronunciation: 4,
      clarity: 4,
      listening_comfort: 3.8,
      professional_quality: 3.8,
      long_form_suitability: 3.8,
    },
    baselineNaturalnessMedian: 4,
    criticalPronunciationMaxJudgeCount: 1,
    blockingAcousticDefects: [],
    correctedExcessivelySlowMajoritySampleIds: [],
    tableCorrectedClearerRate: 0.6,
    tableAddedDurationAcceptedRate: 0.6,
    tableOnlyRemainingIssue: false,
    semanticPauseStructurePass: true,
    segmentationPass: true,
    tableEfficiencyPass: true,
    voiceNaturalnessAcceptable: true,
    fatigueAcceptable: true,
    panelConfidence: 82,
    decisiveEvidence: ["Four of five pair majorities favor the candidate."],
    dissentingEvidence: ["One pair favors the comparison clip."],
    ...overrides,
  };
}

function voiceMetrics(
  voice: AiLocalVoice,
  score: number,
  overrides: Partial<AiVoiceCandidateMetrics> = {},
): AiVoiceCandidateMetrics {
  return {
    voice,
    validJudgeCount: 3,
    medianScores: scoreRecord(score),
    blockingAcousticDefects: [],
    contentConsistency: 0.8,
    failsPrimarilyVoiceNaturalnessOrFatigue: false,
    decisiveEvidence: [`${voice} has stable scores.`],
    dissentingEvidence: [],
    ...overrides,
  };
}

describe("five independent blind judge assignments", () => {
  it("is deterministic while giving every lens fresh neutral labels and ordering", () => {
    const first = assignments();
    const second = assignments();

    expect(second).toEqual(first);
    expect(first).toHaveLength(5);
    expect(first.map((assignment) => assignment.lensId)).toEqual(
      AI_AUDIO_JUDGE_LENSES.map((lens) => lens.id),
    );
    expect(
      new Set(first.map((assignment) => assignment.assignmentHash))
        .size,
    ).toBe(5);
    const labelSets = first.map((assignment) =>
      assignment.pairs.flatMap((pair) =>
        pair.clips.map((clip) => clip.neutralLabel),
      ),
    );
    expect(new Set(labelSets.flat()).size).toBe(50);

    const sourceOrderPatterns = first.map((assignment) =>
      assignment.pairs
        .map((pair) =>
          pair.clips.map((clip) => clip.sourceSampleId).join(","),
        )
        .join("|"),
    );
    expect(new Set(sourceOrderPatterns).size).toBeGreaterThan(1);
  });

  it("renders no hidden identity, input id, hash, duration, or technical evidence", () => {
    for (const assignment of assignments()) {
      const prompt = buildJudgePrompt(assignment);
      expect(prompt).toContain(
        "exactly 1.0x normal speed",
      );
      expect(prompt).not.toMatch(
        /\b(?:baseline|corrected|piper|bryce|linda|cori|elevenlabs|provider|filename|metadata)\b/iu,
      );
      for (const pair of assignment.pairs) {
        expect(prompt).not.toContain(pair.sourcePairId);
        for (const clip of pair.clips) {
          expect(prompt).not.toContain(clip.sourceSampleId);
          expect(prompt).not.toContain(clip.audioSha256);
          expect(prompt).toContain(clip.neutralLabel);
        }
      }
    }
    expect(AI_AUDIO_EVALUATION_TOOL.type).toBe("function");
    expect(AI_AUDIO_EVALUATION_TOOL.strict).toBe(false);
  });
});

describe("judge response validation", () => {
  it("accepts one complete audio-only response and rejects missing fields", () => {
    const assignment = assignments()[0]!;
    const response = judgeResponse(assignment);
    const accepted = validateJudgeResponse(response, assignment);

    expect(accepted.valid).toBe(true);
    expect(accepted.responseHash).toBe(hashAiValue(response));
    expect(accepted.retryAllowed).toBe(false);

    const incomplete = structuredClone(response) as unknown as {
      pairs: unknown[];
    };
    incomplete.pairs = incomplete.pairs.slice(1);
    const rejected = validateJudgeResponse(
      incomplete,
      assignment,
      { attemptNumber: 1 },
    );
    expect(rejected.valid).toBe(false);
    expect(rejected.retryAllowed).toBe(true);
    expect(rejected.issues.map((issue) => issue.code)).toContain(
      "INCOMPLETE_SET",
    );
  });

  it("rejects identical boilerplate and internally contradictory choices", () => {
    const assignment = assignments()[0]!;
    const boilerplate = validateJudgeResponse(
      judgeResponse(assignment, { boilerplate: true }),
      assignment,
    );
    expect(boilerplate.valid).toBe(false);
    expect(
      boilerplate.issues.map((issue) => issue.code),
    ).toContain("IDENTICAL_BOILERPLATE");

    const contradictory = judgeResponse(assignment);
    const pair = contradictory.pairs[0]!;
    const preferred = pair.preferred_version_overall;
    const other = assignment.pairs[0]!.clips.find(
      (clip) => clip.neutralLabel !== preferred,
    )!.neutralLabel;
    pair.clearer_version = other;
    const invalid = validateJudgeResponse(
      contradictory,
      assignment,
      { attemptNumber: 2 },
    );
    expect(invalid.valid).toBe(false);
    expect(invalid.retryAllowed).toBe(false);
    expect(invalid.issues.map((issue) => issue.code)).toContain(
      "INTERNAL_CONTRADICTION",
    );
  });

  it("rejects identity guesses and failure to acknowledge a known distinction", () => {
    const assignment = assignments()[0]!;
    const identityGuess = judgeResponse(assignment);
    identityGuess.overall_notes =
      "The baseline system seems smoother in what I heard.";
    expect(
      validateJudgeResponse(identityGuess, assignment).issues.map(
        (issue) => issue.code,
      ),
    ).toContain("UNBLINDING_CLAIM");

    const noDistinction = judgeResponse(assignment);
    noDistinction.pairs[0]!.audible_distinction = "NONE";
    noDistinction.pairs[0]!.confidence = 50;
    expect(
      validateJudgeResponse(noDistinction, assignment, {
        clearlyDistinctSourcePairIds: [
          assignment.pairs[0]!.sourcePairId,
        ],
      }).issues.map((issue) => issue.code),
    ).toContain("AUDIBLE_DISTINCTION_NOT_ACKNOWLEDGED");
  });
});

describe("deterministic plan, pricing, and paid guards", () => {
  it("hashes canonical JSON and the complete pessimistic plan deterministically", () => {
    expect(canonicalAiJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(hashAiValue({ b: 2, a: 1 })).toBe(
      hashAiValue({ a: 1, b: 2 }),
    );
    const first = evaluationPlan();
    const second = evaluationPlan();
    expect(second).toEqual(first);
    expect(first.judge_count).toBe(5);
    expect(first.primary_request_count).toBe(5);
    expect(first.maximum_request_count).toBe(10);
    expect(first.audio_file_count).toBe(10);
    expect(first.provider).toEqual({
      id: "openrouter",
      api_base_url: "https://openrouter.ai/api/v1",
      endpoint: "/chat/completions",
      allow_fallbacks: false,
      require_parameters: true,
      prompt_logging_requested: false,
      data_use_opt_in_requested: false,
      authoritative_actual_cost_field: "usage.cost",
    });
    expect(first.cost.paid_execution_allowed).toBe(true);
    expect(first.plan_hash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("blocks an over-cap estimate and unverified pricing", () => {
    const prompts = assignments().map(buildJudgePrompt);
    const overCap = estimateEvaluationCost({
      pricing: {
        ...PRICING,
        audioInputUsdPerMillionTokens: 1_000,
      },
      prompts,
      audioDurationSecondsPerRequest: 100,
      primaryRequestCount: 5,
      maximumRequestCount: 10,
      maximumOutputTokensPerRequest: 4_000,
      hardMaximumUsd: 8,
    });
    expect(overCap.paid_execution_allowed).toBe(false);
    expect(overCap.blocking_reasons).toContain(
      "ESTIMATE_EXCEEDS_CAP",
    );

    const unverified = estimateEvaluationCost({
      pricing: { ...PRICING, verification: "UNVERIFIED" },
      prompts,
      audioDurationSecondsPerRequest: 100,
      primaryRequestCount: 5,
      maximumRequestCount: 10,
      maximumOutputTokensPerRequest: 4_000,
      hardMaximumUsd: 8,
    });
    expect(unverified.blocking_reasons).toContain(
      "UNVERIFIED_PRICING",
    );
  });

  it("accounts an ambiguous timeout at maximum cost and stops before cap overflow", () => {
    const ledger: AiRequestLedgerEntry[] = [
      {
        sequence: 1,
        requestId: "request-1",
        judgeId: "judge-01",
        attempt: 1,
        status: "ACCEPTED",
        maximumPossibleCostUsd: 2,
        actualCostUsd: 1,
        usageKnown: true,
      },
      {
        sequence: 2,
        requestId: "request-2",
        judgeId: "judge-02",
        attempt: 1,
        status: "UNCERTAIN_PAID",
        maximumPossibleCostUsd: 3,
        actualCostUsd: null,
        usageKnown: false,
      },
    ];
    const summary = summarizeAiRequestLedger(ledger);
    expect(summary.uncertain_paid_count).toBe(1);
    expect(summary.known_actual_cost_usd).toBe(1);
    expect(summary.uncertain_maximum_exposure_usd).toBe(3);
    expect(summary.cap_accounted_cost_usd).toBe(4);

    const plan = evaluationPlan();
    const common = {
      plan,
      ledger,
      nextJudgeId: "judge-03",
      nextAttempt: 1 as const,
      allowPaidAiEvaluation: true,
      suppliedPlanHash: plan.plan_hash,
      suppliedMaxUsd: 8,
      suppliedMaxRequests: plan.maximum_request_count,
      inputHashesMatch: true,
      manifestHashMatches: true,
      modelAvailable: true,
      secretAvailable: true,
      billingAvailable: true,
    };
    expect(
      authorizeNextAiRequest({
        ...common,
        nextRequestMaximumCostUsd: 4,
      }).allowed,
    ).toBe(true);
    const blocked = authorizeNextAiRequest({
      ...common,
      nextRequestMaximumCostUsd: 4.01,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reasons).toContain(
      "Next request could exceed the spending cap",
    );
    const ambiguousRetry = authorizeNextAiRequest({
      ...common,
      nextJudgeId: "judge-02",
      nextAttempt: 2,
      nextRequestMaximumCostUsd: 1,
    });
    expect(ambiguousRetry.allowed).toBe(false);
    expect(ambiguousRetry.reasons).toContain(
      "UNCERTAIN_PAID requests must not be retried automatically",
    );
  });
});

describe("AI panel separation and aggregation", () => {
  it("keeps perceptual, objective, and agreement results separate", () => {
    const blindAssignments = assignments();
    const runs: AiValidatedJudgeRun[] = blindAssignments.map(
      (assignment, judgeIndex) => {
        const response = judgeResponse(assignment, {
          preferCorrectedSource: true,
        });
        if (judgeIndex < 2) {
          const firstPair = assignment.pairs.find(
            (pair) => pair.sourcePairId === "sample-01",
          )!;
          const corrected = firstPair.clips.find((clip) =>
            clip.sourceSampleId.endsWith("-A"),
          )!;
          response.clips.find(
            (clip) => clip.clip_label === corrected.neutralLabel,
          )!.scores.pronunciation = 2;
          response.pairs
            .find(
              (pair) =>
                pair.pair_label === firstPair.neutralPairLabel,
            )!
            .pronunciation_issues.push({
              clip_label: corrected.neutralLabel,
              severity: "critical",
              description:
                judgeIndex === 0
                  ? "The brand term loses its final consonant."
                  : "The ending sound of the named term is missing.",
            });
        }
        const validation = validateJudgeResponse(
          response,
          assignment,
          {
            clearlyDistinctSourcePairIds: sourcePairs().map(
              (pair) => pair.pairId,
            ),
          },
        );
        if (!validation.valid) {
          throw new Error(
            validation.issues
              .map((issue) => issue.message)
              .join("; "),
          );
        }
        return {
          assignment,
          response: validation.response,
          responseHash: validation.responseHash,
        };
      },
    );
    const privateSamples: AiPrivateSampleIdentity[] =
      sourcePairs().flatMap((pair) =>
        pair.samples.map((sample) => ({
          sourceSampleId: sample.sampleId,
          sourcePairId: pair.pairId,
          candidateId: sample.sampleId.endsWith("-A")
            ? "candidate-new"
            : "candidate-old",
          pipeline: sample.sampleId.endsWith("-A")
            ? ("corrected" as const)
            : ("baseline" as const),
          voice: "bryce" as const,
        })),
      );
    const objective: AiObjectiveAnalysisSummary = {
      analysisHash: "b".repeat(64),
      blockingDefects: [],
      regressions: [
        {
          sampleId: "sample-01-A",
          pairId: "sample-01",
          code: "STITCH_DISCONTINUITY_REVIEW_CANDIDATE",
          detail:
            "heuristic-unverified amplitude fingerprint; not proof of a defect",
          severity: "warning",
        },
      ],
      improvements: [
        {
          sampleId: null,
          pairId: "sample-02",
          code: "ROW_ALIGNMENT_IMPROVED",
          detail: "Table row boundaries align more consistently.",
          severity: "informational",
        },
      ],
      directionalFindings: [
        {
          pairId: "sample-01",
          metric: "duration",
          favoredCandidateId: "candidate-old",
          strength: "moderate",
        },
      ],
      clearlyDistinctPairIds: sourcePairs().map(
        (pair) => pair.pairId,
      ),
    };
    const analysis = aggregateAiPanel({
      evaluationPackageId: PACKAGE_ID,
      runs,
      privateSamples,
      objective,
    });

    expect(analysis.valid_judge_count).toBe(5);
    expect(
      analysis.perceptual.by_candidate["candidate-new"]?.clarity
        .median,
    ).toBe(5);
    expect(
      analysis.perceptual.corrected_pair_majority_wins,
    ).toBe(5);
    expect(
      analysis.perceptual.corrected_overall_preference_rate,
    ).toBe(1);
    expect(
      analysis.perceptual.pair_preferences["sample-01"]?.clearer
        .counts["candidate-new"],
    ).toBe(5);
    expect(analysis.objective.improvements).toHaveLength(1);
    expect(analysis.agreement.contradictions).toBe(1);
    expect(analysis.analysis_hash).toMatch(/^[a-f0-9]{64}$/u);

    const metrics = deriveBryceDecisionMetrics({
      analysis,
      privateSamples,
      correctedCandidateId: "candidate-new",
      baselineCandidateId: "candidate-old",
    });
    expect(metrics.correctedPairMajorityWins).toBe(5);
    expect(metrics.correctedMedianScores.clarity).toBe(5);
    expect(metrics.criticalPronunciationMaxJudgeCount).toBe(2);
    expect(metrics.segmentationPass).toBe(true);
    expect(metrics.dissentingEvidence).toContain(
      "1 perceptual/objective comparison(s) conflict.",
    );

    const confirmedAnalysis = {
      ...analysis,
      objective: {
        ...analysis.objective,
        regressions: [
          {
            sampleId: "sample-01-A",
            pairId: "sample-01",
            code: "STITCH_DISCONTINUITY_CONFIRMED",
            detail: "Confirmed discontinuity at a stitch boundary.",
            severity: "warning" as const,
          },
        ],
      },
    };
    expect(
      deriveBryceDecisionMetrics({
        analysis: confirmedAnalysis,
        privateSamples,
        correctedCandidateId: "candidate-new",
        baselineCandidateId: "candidate-old",
      }).segmentationPass,
    ).toBe(false);
  });
});

describe("Bryce, tuning, and local voice decisions", () => {
  it("passes Bryce at the exact provisional boundaries", () => {
    const decision = decideLocalNarration({
      bryce: bryceMetrics(),
    });
    expect(decision.primaryDecision).toBe("PASS_PIPER_BRYCE");
    expect(decision.confidence).toBe(82);
    expect(decision.engineeringBasisStatement).toContain(
      "without a human listening study",
    );

    const belowBoundary = decideLocalNarration({
      bryce: bryceMetrics({
        correctedOverallPreferenceRate: 0.649,
      }),
    });
    expect(belowBoundary.primaryDecision).not.toBe(
      "PASS_PIPER_BRYCE",
    );
  });

  it("identifies one tuning cause, limits profiles to two, and reports insufficient budget", () => {
    const profiles = selectTuningProfiles([
      {
        dimension: "table_row_pause",
        direction: "too_long",
        severity: 0.9,
        evidence: ["Most table pauses exceed the target window."],
      },
      {
        dimension: "sentence_pause",
        direction: "too_short",
        severity: 0.5,
        evidence: ["Some sentence endings are compressed."],
      },
    ]);
    expect(profiles).toHaveLength(2);
    expect(
      new Set(profiles.map((profile) => profile.targetDimension)),
    ).toEqual(new Set(["table_row_pause"]));

    const metrics = bryceMetrics({
      correctedMedianScores: {
        ...bryceMetrics().correctedMedianScores,
        pause_quality: 3.5,
      },
      tableEfficiencyPass: false,
    });
    expect(
      decideLocalNarration({ bryce: metrics }).primaryDecision,
    ).toBe("TUNE_PIPER_PIPELINE");
    expect(
      decideLocalNarration({
        bryce: metrics,
        tuning: { status: "NOT_EXECUTED_BUDGET" },
      }).primaryDecision,
    ).toBe("TUNING_RECOMMENDED_BUT_NOT_EXECUTED");
  });

  it("never exposes the internal other-voice branch as a final decision", () => {
    expect(AI_AUDIO_FINAL_DECISIONS).toHaveLength(7);
    expect(
      (AI_AUDIO_FINAL_DECISIONS as readonly string[]).includes(
        "TEST_OTHER_LOCAL_VOICES",
      ),
    ).toBe(false);
    const voiceLimited = bryceMetrics({
      correctedMedianScores: {
        ...bryceMetrics().correctedMedianScores,
        naturalness: 3,
        listening_comfort: 3,
        professional_quality: 3.5,
      },
      voiceNaturalnessAcceptable: false,
      fatigueAcceptable: false,
    });
    const incomplete = decideLocalNarration({
      bryce: voiceLimited,
      voices: { status: "NOT_EXECUTED_BUDGET" },
    });
    expect(incomplete.primaryDecision).toBe(
      "INCONCLUSIVE_AI_ONLY_EVALUATION",
    );
    expect(incomplete.internalBranch).toBe("OTHER_LOCAL_VOICES");
  });

  it("selects Linda or Cori only when thresholds pass, then considers an external test only after all three voice-only failures", () => {
    const linda = selectBestLocalVoice([
      voiceMetrics("bryce", 3.7),
      voiceMetrics("linda", 4.5),
      voiceMetrics("cori", 4.1),
    ]);
    expect(linda.decision).toBe("PASS_PIPER_LINDA");

    const cori = selectBestLocalVoice([
      voiceMetrics("bryce", 4),
      voiceMetrics("linda", 4.1),
      voiceMetrics("cori", 4.6),
    ]);
    expect(cori.decision).toBe("PASS_PIPER_CORI");

    const allFail = (["bryce", "linda", "cori"] as const).map(
      (voice) =>
        voiceMetrics(voice, 3.2, {
          failsPrimarilyVoiceNaturalnessOrFatigue: true,
        }),
    );
    expect(selectBestLocalVoice(allFail).decision).toBe(
      "CONSIDER_ELEVENLABS",
    );

    const voiceLimited = bryceMetrics({
      correctedMedianScores: {
        ...bryceMetrics().correctedMedianScores,
        naturalness: 3,
        listening_comfort: 3,
        professional_quality: 3.5,
      },
      voiceNaturalnessAcceptable: false,
      fatigueAcceptable: false,
    });
    expect(
      decideLocalNarration({
        bryce: voiceLimited,
        voices: { status: "COMPLETE", candidates: allFail },
      }).primaryDecision,
    ).toBe("CONSIDER_ELEVENLABS");
  });
});
