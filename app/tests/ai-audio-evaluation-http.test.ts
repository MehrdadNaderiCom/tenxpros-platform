import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  createHash,
} from "node:crypto";
import {
  mkdir,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  buildFreshRecoveryRandomization,
  buildResponseRecoveryPlan,
  primaryJudgeNextAction,
  phase2cPrimaryJudgeHttpTestHooks,
  verifyLedgerEntries,
} from "../scripts/ai-audio-evaluation-cli";
import {
  AI_AUDIO_EVALUATION_TOOL,
  AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION,
  AI_AUDIO_SCORE_DIMENSIONS,
  type AiBlindJudgeAssignment,
  type AiJudgeResponse,
} from "../src/lib/academy/narration/ai-audio-evaluation";

const FAKE_SECRET =
  "unit-test-only-secret-that-must-never-be-persisted";
const FIXED_NOW = "2026-07-26T12:00:00.000Z";
const TOKEN_USAGE = {
  prompt_tokens: 1_100,
  completion_tokens: 200,
  cost: 0.03425001,
  prompt_tokens_details: {
    audio_tokens: 1_000,
  },
};
const EXPECTED_COST_USD = 0.03425001;

type TestLedgerEntry = Parameters<
  typeof verifyLedgerEntries
>[0][number];

const temporaryDirectories: string[] = [];

function responseRecoveryPlanFixture() {
  const rejectedResponses = Array.from(
    { length: 10 },
    (_, offset) => {
      const requestIndex = offset + 3;
      return {
        requestIndex,
        perspectiveId:
          `judge-0${String(Math.floor(offset / 2) + 1)}` as
            | "judge-01"
            | "judge-02"
            | "judge-03"
            | "judge-04"
            | "judge-05",
        attempt: (offset % 2 === 0 ? 1 : 2) as
          | 1
          | 2,
        originalResponseId: `old-${String(requestIndex)}`,
        responseSha256: createHash("sha256")
          .update(`old-${String(requestIndex)}`)
          .digest("hex"),
        ledgerStatus: "REJECTED" as const,
        httpStatus: 200 as const,
        rawResponseStored: false as const,
        bodyHashVerification:
          "UNVERIFIED_BYTES_ABSENT" as const,
        usageCostUsd: 0.35,
      };
    },
  );
  return buildResponseRecoveryPlan({
    previousPlanHash:
      "ac8586e750afc4e0fcc279583c33cde67352bb08f355427a1936025c3dc97e5c",
    previousLedgerTerminalHash: "1".repeat(64),
    previousLedgerSha256: "2".repeat(64),
    previousLockSha256: "3".repeat(64),
    rejectedResponses,
    correctedResponseSchemaSha256: "4".repeat(64),
    recoveredPerspectiveIds: [],
    missingPerspectiveIds: [
      "judge-01",
      "judge-02",
      "judge-03",
      "judge-04",
      "judge-05",
    ],
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }),
  );
});

const preparedInput = (async () => {
  const frozen =
    await phase2cPrimaryJudgeHttpTestHooks.loadFrozenInput();
  const built =
    phase2cPrimaryJudgeHttpTestHooks.buildPlanAndPrivateManifest(
      frozen,
    );
  const assignment = built.assignments[0];
  const prompt = built.prompts.find(
    (candidate) =>
      candidate.judgeId === assignment?.judgeId,
  );
  if (!assignment || !prompt) {
    throw new Error("Primary judge fixture is incomplete");
  }
  return {
    frozen,
    plan: built.plan,
    privateManifest: built.privateManifest,
    assignment,
    prompt: prompt.prompt,
  };
})();

async function testPaths(): Promise<{
  root: string;
  ledger: string;
  records: string;
}> {
  const root = await mkdtemp(
    resolve(tmpdir(), "tenxpros-phase2c-http-test-"),
  );
  temporaryDirectories.push(root);
  const records = resolve(root, "records");
  await mkdir(records, { recursive: true });
  return {
    root,
    ledger: resolve(root, "ledger.jsonl"),
    records,
  };
}

function responseLike(
  payload: unknown,
  status = 200,
) {
  const text = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
    async text() {
      return text;
    },
  };
}

function validJudgeResponse(
  assignment: AiBlindJudgeAssignment,
): AiJudgeResponse {
  const clips = assignment.pairs.flatMap(
    (pair, pairIndex) =>
      pair.clips.map((clip, clipIndex) => ({
        clip_label: clip.neutralLabel,
        scores: Object.fromEntries(
          AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
            dimension,
            clipIndex === 0 ? 5 : 3,
          ]),
        ) as AiJudgeResponse["clips"][number]["scores"],
        evidence_note:
          `Audible take ${String(pairIndex + 1)}-${String(
            clipIndex + 1,
          )} has distinct phrase endings, cadence, and pause timing.`,
      })),
  );
  const pairs = assignment.pairs.map((pair, pairIndex) => {
    const preferred = pair.clips[0];
    const other = pair.clips[1];
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
      confidence: 82,
      concise_reason:
        `Comparison ${String(
          pairIndex + 1,
        )} audibly favors cleaner phrase endings, steadier pauses, and a more comfortable cadence.`,
      table_evaluation: pair.tableEvaluation
        ? {
            easier_to_follow: preferred.neutralLabel,
            repeated_labels_helpful: "yes" as const,
            longer_clip: preferred.neutralLabel,
            longer_duration_excessive: "no" as const,
            clarity_justifies_added_duration: "yes" as const,
            test_more_concise_table_narration:
              "no" as const,
          }
        : null,
    };
  });
  return {
    schema_version:
      AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION,
    assignment_id: assignment.assignmentId,
    judge_id: assignment.judgeId,
    evidence_basis: "AUDIO_ONLY",
    clips,
    pairs,
    overall_notes:
      "The attached clips have audible differences in pacing, articulation, pause placement, and sustained listening comfort.",
  };
}

function judgeEnvelope(
  toolArguments: unknown,
): Record<string, unknown> {
  return {
    id: "chatcmpl-mocked",
    usage: TOKEN_USAGE,
    choices: [
      {
        message: {
          tool_calls: [
            {
              type: "function",
              function: {
                name: AI_AUDIO_EVALUATION_TOOL.name,
                arguments: JSON.stringify(toolArguments),
              },
            },
          ],
        },
      },
    ],
  };
}

async function ledgerEntries(
  path: string,
): Promise<TestLedgerEntry[]> {
  const raw = await readFile(path, "utf8");
  return raw
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as TestLedgerEntry,
    );
}

async function recoveryJudgeFixture(
  perspectiveId:
    | "judge-01"
    | "judge-02" = "judge-01",
) {
  const prepared = await preparedInput;
  const paths = await testPaths();
  const acceptedResponsesDirectory = resolve(
    paths.root,
    "accepted",
  );
  await mkdir(acceptedResponsesDirectory);
  const sourcePairs =
    phase2cPrimaryJudgeHttpTestHooks.recoverySourcePairsFromFrozen(
      prepared.frozen,
    );
  const randomization =
    buildFreshRecoveryRandomization({
      perspectiveId,
      evaluationPackageId:
        "blind-review-8fab36b45ab641b5",
      sourcePairs,
      priorAssignments:
        prepared.privateManifest.judgeAssignments,
      entropySource: () => Buffer.alloc(32, 0x41),
    });
  return {
    prepared,
    paths,
    acceptedResponsesDirectory,
    sourcePairs,
    randomization,
    recoveryPlan: responseRecoveryPlanFixture(),
  };
}

function correctedRecoveryResponseFromRequest(
  requestBody: Record<string, unknown>,
) {
  const messages = requestBody.messages;
  if (!Array.isArray(messages)) {
    throw new Error("Missing recovery messages");
  }
  const user = messages.find(
    (message) =>
      typeof message === "object" &&
      message !== null &&
      (message as { role?: unknown }).role === "user",
  ) as { content?: unknown } | undefined;
  if (!Array.isArray(user?.content)) {
    throw new Error("Missing recovery user content");
  }
  const promptPart = user.content[0] as {
    text?: unknown;
  };
  if (typeof promptPart.text !== "string") {
    throw new Error("Missing recovery prompt");
  }
  const prompt = promptPart.text;
  const assignmentMatch =
    /Use assignment\nid ([^\s]+) and judge id (judge-0[1-5])\./u.exec(
      prompt,
    );
  const sets = [
    ...prompt.matchAll(
      /^- (SET-[A-F0-9]{8}): (CLIP-[A-F0-9]{10}), then (CLIP-[A-F0-9]{10})( \(also complete the table-following questions\))?$/gmu,
    ),
  ];
  if (!assignmentMatch || sets.length !== 5) {
    throw new Error(
      "Could not parse blind recovery assignment",
    );
  }
  const fileScores = sets.flatMap((set, pairIndex) => [
    {
      pair_id: set[1]!,
      version: "A",
      scores: Object.fromEntries(
        AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
          dimension,
          4,
        ]),
      ),
      evidence_note: `Version A in set ${set[1]!} has clearly audible phrase endings and pause timing ${String(pairIndex)}.`,
    },
    {
      pair_id: set[1]!,
      version: "B",
      scores: Object.fromEntries(
        AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
          dimension,
          3,
        ]),
      ),
      evidence_note: `Version B in set ${set[1]!} has audibly different cadence and spacing ${String(pairIndex)}.`,
    },
  ]);
  const pairEvaluations = sets.map((set, pairIndex) => ({
    pair_id: set[1]!,
    preferred_version_overall: "A",
    clearer_version: "A",
    more_natural_version: "A",
    better_paced_version: "A",
    long_form_preference: "A",
    speed_assessment: [
      {
        version: "A",
        too_slow: false,
        too_fast: false,
      },
      {
        version: "B",
        too_slow: pairIndex === 4,
        too_fast: false,
      },
    ],
    pronunciation_findings: [],
    audible_distinction: "CLEAR",
    confidence: 82,
    reason: `Set ${set[1]!} audibly differs in sentence cadence, pauses, and sustained listening comfort ${String(pairIndex)}.`,
  }));
  const tableSet = sets.find((set) => set[4] !== undefined)!;
  return {
    judge_metadata: {
      assignment_id: assignmentMatch[1]!,
      judge_id: assignmentMatch[2]!,
      evidence_basis: "AUDIO_ONLY",
    },
    file_scores: fileScores,
    pair_evaluations: pairEvaluations,
    table_evaluation: {
      pair_id: tableSet[1]!,
      clearer_version: "A",
      repeated_labels_helpful: true,
      longer_version: "tie",
      longer_duration_excessive: false,
      clarity_justifies_added_duration: false,
      concise_table_variant_recommended: false,
      confidence: 84,
      reason:
        "The marked table set is audibly easier to track with repeated labels and controlled pauses.",
    },
    overall_assessment: {
      notes:
        "Across all five sets, Version A is audibly steadier in pause placement, articulation, and long-form comfort.",
    },
    long_form_recommendation:
      "Across the complete lesson, prefer the rendering with steadier sentence endings, clearer pauses, and lower cumulative listening fatigue.",
    confidence: 84,
  };
}

describe("Phase 2C mocked primary-judge HTTP boundary", () => {
  it("hashes received bytes but durably stores only a mode-0600 redacted artifact when input audio is echoed", async () => {
    const root = await mkdtemp(
      resolve(
        tmpdir(),
        "tenxpros-provider-persistence-test-",
      ),
    );
    temporaryDirectories.push(root);
    const path = resolve(root, "provider-body.json");
    const audioData = Buffer.alloc(2_048, 0x5a).toString(
      "base64",
    );
    const rawBody = JSON.stringify({
      data: {
        request: {
          content: [
            {
              type: "input_audio",
              input_audio: {
                format: "mp3",
                data: audioData,
              },
            },
          ],
        },
        completion: "safe output",
      },
    });

    const persisted =
      await phase2cPrimaryJudgeHttpTestHooks.persistProviderHttpBodyBeforeSemanticParse(
        {
          path,
          rawBody,
          secret: FAKE_SECRET,
        },
      );

    const artifact = await readFile(path, "utf8");
    const metadata = await lstat(path);
    expect(persisted.rawBodySha256).toBe(
      createHash("sha256")
        .update(rawBody)
        .digest("hex"),
    );
    expect(persisted.artifactBodySha256).toBe(
      createHash("sha256")
        .update(artifact)
        .digest("hex"),
    );
    expect(persisted.exactRawBodyStored).toBe(false);
    expect(
      persisted.sanitizedArtifactStored,
    ).toBe(true);
    expect(
      persisted.inputAudioRedactionCount,
    ).toBe(1);
    expect(artifact).toContain(
      "[REDACTED_INPUT_AUDIO_BASE64]",
    );
    expect(artifact).not.toContain(audioData);
    expect(metadata.mode & 0o777).toBe(0o600);
  });

  it("refuses to persist an unsafe unparseable input_audio response", async () => {
    const root = await mkdtemp(
      resolve(
        tmpdir(),
        "tenxpros-provider-persistence-test-",
      ),
    );
    temporaryDirectories.push(root);
    const path = resolve(root, "unsafe-body.txt");

    await expect(
      phase2cPrimaryJudgeHttpTestHooks.persistProviderHttpBodyBeforeSemanticParse(
        {
          path,
          rawBody:
            '{"input_audio":{"data":"not-closed"}',
          secret: FAKE_SECRET,
        },
      ),
    ).rejects.toThrow(
      /cannot be safely parsed for pre-persistence redaction/u,
    );
    await expect(readFile(path, "utf8")).rejects.toThrow();
  });

  it("hash-binds conservative conditional duration and cost ceilings inside the executable $10 envelope", async () => {
    const prepared = await preparedInput;
    const correctedSeconds =
      prepared.frozen.manifest.pairs
        .flatMap((pair) => pair.samples)
        .filter(
          (sample) => sample.pipeline === "corrected",
        )
        .reduce(
          (sum, sample) => sum + sample.durationSeconds,
          0,
        );
    const baselineSeconds =
      prepared.frozen.manifest.pairs
        .flatMap((pair) => pair.samples)
        .filter(
          (sample) => sample.pipeline === "baseline",
        )
        .reduce(
          (sum, sample) => sum + sample.durationSeconds,
          0,
        );
    const expected =
      prepared.plan.expectedMaximumInput;
    expect(prepared.plan.provider).toMatchObject({
      id: "openrouter",
      apiBaseUrl: "https://openrouter.ai/api/v1",
      routing: {
        allowFallbacks: false,
        requireParameters: true,
      },
      promptLoggingRequested: false,
      dataUseOptInRequested: false,
    });
    expect(prepared.plan.provider).not.toHaveProperty(
      "creditsPreflightEndpoint",
    );
    expect(prepared.plan.model.id).toBe(
      "openai/gpt-audio",
    );
    expect(
      prepared.plan.model.maximumOutputRequestField,
    ).toBe("max_tokens");
    expect(prepared.plan.judges).toMatchObject({
      metadataPreflightCalls: 2,
      keyPreflightCalls: 1,
      modelsPreflightCalls: 1,
      creditsPreflightCalls: 0,
      maximumBryceCallsIncludingOneValidationRetryEach: 10,
      conditionalBranchMaximumPotentialCalls: 4,
      conditionalBranchMaximumCallsAfterWorstCaseBryce: 4,
      conditionalBranchMaximumTaskWideValidationRetries: 1,
      maximumApiRequests: 17,
    });
    expect(prepared.plan.planHash).not.toBe(
      "71cf16c1dcc93a88a03ec1dfcfceceb83b86be1c10e460ebab378e4129b2fb7a",
    );
    expect(prepared.plan.planHash).not.toBe(
      "230e43e70fbe964837c1d91c07c204de0ff0424e962585f4aba1f2b2c1ff97a0",
    );
    expect(prepared.plan.planHash).not.toBe(
      "5782b51d924395d4c10703c92d5c27e67ee6a456148581cbb104193e8a0ba383",
    );
    expect(prepared.plan.preflightPolicy).toMatchObject({
      secureInferenceKeyFileRequired: true,
      keyConfiguredLimitMaximumUsd: 10,
      minimumRequiredKeyRemainingUsd: 10,
      creditsEndpointCalled: false,
      cliMaximumUsd: 10,
      authoritativeActualCostField: "usage.cost",
      http402Policy: "FAIL_CLOSED_NO_RETRY",
    });
    const emittedPrivateManifestBytes =
      `${JSON.stringify(
        prepared.privateManifest,
        null,
        2,
      )}\n`;
    expect(
      createHash("sha256")
        .update(emittedPrivateManifestBytes, "utf8")
        .digest("hex"),
    ).toBe(
      prepared.plan.privateAssignmentManifestSha256,
    );
    expect(prepared.privateManifest).not.toHaveProperty(
      "planHash",
    );
    expect(prepared.privateManifest).toMatchObject({
      planCoreHashInvariant:
        "SHA256_OF_STABLE_PLAN_CORE_WITHOUT_PRIVATE_MANIFEST_SHA256_OR_PLAN_HASH",
      emittedFileHashInvariant:
        "SHA256_OF_EXACT_PRETTY_JSON_FILE_BYTES_WITH_TRAILING_LF",
    });
    expect(
      prepared.plan.privateAssignmentManifestHashInvariant,
    ).toBe(
      "SHA256_OF_EXACT_PRETTY_JSON_FILE_BYTES_WITH_TRAILING_LF",
    );
    expect(() =>
      phase2cPrimaryJudgeHttpTestHooks.assertPrivateManifestHashInvariant(
        prepared.plan,
        prepared.privateManifest,
      ),
    ).not.toThrow();
    expect(
      expected.conditionalGeneratedAudioDurationCeiling,
    ).toEqual({
      basis: "frozen_corrected_bryce_excerpt_duration",
      maximumGeneratedToSourceRatio: 2,
      correctedSourceAudioSeconds: correctedSeconds,
      maximumGeneratedSecondsPerCandidate:
        2 * correctedSeconds,
      enforcedByRuntimeCheck:
        "CONDITIONAL_DURATION_LIMIT",
      enforcedBeforeConditionalApi: true,
    });
    expect(
      expected.conditionalVoiceBranchPrimaryAudioSeconds,
    ).toBeCloseTo(
      3 * (correctedSeconds + 2 * (2 * correctedSeconds)),
      9,
    );
    expect(
      expected.conditionalTuningBranchPrimaryAudioSeconds,
    ).toBeCloseTo(
      3 *
        (baselineSeconds +
          correctedSeconds +
          2 * (2 * correctedSeconds)),
      9,
    );
    expect(
      prepared.plan.cost
        .nominalOtherVoiceBranchEstimatedUsd,
    ).toBe(4.436984);
    expect(
      prepared.plan.cost.nominalTuningBranchEstimatedUsd,
    ).toBe(5.199717);
    expect(
      prepared.plan.cost
        .nominalBrycePlusWorstConditionalPathEstimatedUsd,
    ).toBe(8.274934);
    expect(
      prepared.plan.cost.uncappedTheoreticalAllSlotsUsd,
    ).toBe(13.08339);
    expect(
      prepared.plan.cost.estimatedExecutableMaximumUsd,
    ).toBe(10);
    expect(
      prepared.plan.cost.executableEnvelopeMaximumUsd,
    ).toBe(10);
    expect(
      prepared.plan.cost.perRequestProviderBoundUsd,
    ).toBe(4.146);
  });

  it("accepts a valid audio judgment and accounts official token usage", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    const calls: {
      input: string;
      init?: RequestInit;
    }[] = [];

    const result =
      await phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
        prepared.frozen,
        prepared.assignment,
        prepared.prompt,
        1,
        [],
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        async (input, init) => {
          calls.push({ input, init });
          return responseLike(
            judgeEnvelope(
              validJudgeResponse(prepared.assignment),
            ),
          );
        },
        () => FIXED_NOW,
      );

    expect(result.status).toBe("ACCEPTED");
    expect(result.retryAllowed).toBe(false);
    expect(result.usage).toEqual({
      promptTokens: 1_100,
      audioInputTokens: 1_000,
      textInputTokens: 100,
      completionTokens: 200,
      openRouterCostUsd: EXPECTED_COST_USD,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe(
      "https://openrouter.ai/api/v1/chat/completions",
    );

    const entries = await ledgerEntries(paths.ledger);
    verifyLedgerEntries(
      entries,
      prepared.plan.planHash,
    );
    expect(entries).toHaveLength(3);
    expect(entries[1]?.event).toBe(
      "RAW_RESPONSE_PERSISTED",
    );
    expect(entries[2]?.data).toMatchObject({
      status: "ACCEPTED",
      provider: "openrouter",
      model: "openai/gpt-audio",
      openRouterRequestId: "chatcmpl-mocked",
      actualCostUsd: EXPECTED_COST_USD,
      cumulativeActualCostUsd: EXPECTED_COST_USD,
      estimatedMaximumUncertainCostUsd: 0,
      usageKnown: true,
      usage: {
        audioInputTokens: 1_000,
        textInputTokens: 100,
      },
    });
  });

  it("uses OpenRouter usage.cost authoritatively even when audio-token detail is omitted", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    const envelope = judgeEnvelope(
      validJudgeResponse(prepared.assignment),
    );
    envelope.usage = {
      prompt_tokens: 1_100,
      completion_tokens: 200,
      cost: 0.12345678,
    };
    const result =
      await phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
        prepared.frozen,
        prepared.assignment,
        prepared.prompt,
        1,
        [],
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        async () => responseLike(envelope),
        () => FIXED_NOW,
      );
    expect(result.status).toBe("ACCEPTED");
    expect(result.usage).toEqual({
      promptTokens: 1_100,
      audioInputTokens: null,
      textInputTokens: null,
      completionTokens: 200,
      openRouterCostUsd: 0.12345678,
    });
    expect(
      (await ledgerEntries(paths.ledger))[2]?.data,
    ).toMatchObject({
      actualCostUsd: 0.12345678,
      usage: {
        audioInputTokens: null,
        openRouterCostUsd: 0.12345678,
      },
    });
  });

  it("permits one controlled retry for a definite unbilled 429", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    const result =
      await phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
        prepared.frozen,
        prepared.assignment,
        prepared.prompt,
        1,
        [],
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        async () =>
          responseLike(
            { error: { message: "rate limited" } },
            429,
          ),
        () => FIXED_NOW,
      );
    expect(result).toMatchObject({
      status: "REJECTED",
      retryAllowed: true,
      usage: null,
      issues: [{ code: "HTTP_429_NOT_BILLED" }],
    });
    expect(
      (await ledgerEntries(paths.ledger))[2]?.data,
    ).toMatchObject({
      status: "FAILED_NOT_BILLED",
      actualCostUsd: 0,
      usageKnown: true,
      issueCodes: ["HTTP_429_NOT_BILLED"],
    });
    expect(primaryJudgeNextAction(result, 1)).toBe(
      "RETRY",
    );
    const retry =
      await phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
        prepared.frozen,
        prepared.assignment,
        prepared.prompt,
        2,
        [],
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        async () =>
          responseLike(
            judgeEnvelope(
              validJudgeResponse(prepared.assignment),
            ),
          ),
        () => FIXED_NOW,
      );
    expect(retry.status).toBe("ACCEPTED");
    const afterRetry = await ledgerEntries(paths.ledger);
    expect(afterRetry[3]?.data).toMatchObject({
      requestKind: "JUDGE",
      attempt: 2,
      retryOfRequestIndex: 1,
      status: "DISPATCHED",
    });
    expect(afterRetry[5]?.data).toMatchObject({
      requestKind: "JUDGE",
      attempt: 2,
      retryOfRequestIndex: 1,
      status: "ACCEPTED",
      cumulativeActualCostUsd: EXPECTED_COST_USD,
    });
  });

  it("stops fail-closed without retry on HTTP 402 and records the pre-inference rejection as unbilled", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    let fetchCalls = 0;
    const result =
      await phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
        prepared.frozen,
        prepared.assignment,
        prepared.prompt,
        1,
        [],
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        async () => {
          fetchCalls += 1;
          return responseLike(
            {
              error: {
                message: "Insufficient credits",
              },
            },
            402,
          );
        },
        () => FIXED_NOW,
      );
    expect(result).toMatchObject({
      status: "REJECTED",
      retryAllowed: false,
      usage: null,
      issues: [{ code: "HTTP_402" }],
    });
    expect(primaryJudgeNextAction(result, 1)).toBe(
      "STOP_PANEL",
    );
    expect(fetchCalls).toBe(1);
    expect(
      (await ledgerEntries(paths.ledger))[2]?.data,
    ).toMatchObject({
      status: "FAILED_NOT_BILLED",
      actualCostUsd: 0,
      usageKnown: true,
      retryPermitted: false,
      issueCodes: ["HTTP_402"],
    });
  });

  it("sends actual MP3 payloads but persists only a redacted, isolated request record", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    let capturedInit: RequestInit | undefined;

    await phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
      prepared.frozen,
      prepared.assignment,
      prepared.prompt,
      1,
      [],
      FAKE_SECRET,
      paths.ledger,
      prepared.plan,
      paths.records,
      async (_input, init) => {
        capturedInit = init;
        return responseLike(
          judgeEnvelope(
            validJudgeResponse(prepared.assignment),
          ),
        );
      },
      () => FIXED_NOW,
    );

    const outboundBody = String(capturedInit?.body);
    const parsedOutbound = JSON.parse(outboundBody) as {
      model: string;
      provider: {
        allow_fallbacks: boolean;
        require_parameters: boolean;
      };
      store: boolean;
      max_tokens: number;
      messages: {
        content?:
          | string
          | {
              type?: string;
              input_audio?: {
                data?: string;
                format?: string;
              };
            }[];
      }[];
    };
    expect(parsedOutbound).toMatchObject({
      model: "openai/gpt-audio",
      provider: {
        allow_fallbacks: false,
        require_parameters: true,
      },
      store: false,
      max_tokens: 5_000,
    });
    expect(parsedOutbound).not.toHaveProperty("modalities");
    expect(parsedOutbound).not.toHaveProperty("usage");
    expect(parsedOutbound).not.toHaveProperty(
      "max_completion_tokens",
    );
    const audioParts = parsedOutbound.messages.flatMap(
      (message) =>
        Array.isArray(message.content)
          ? message.content.filter(
              (part) => part.type === "input_audio",
            )
          : [],
    );
    expect(audioParts).toHaveLength(10);
    expect(
      audioParts.every(
        (part) =>
          part.input_audio?.format === "mp3" &&
          (part.input_audio.data?.length ?? 0) > 1_000 &&
          Buffer.from(
            part.input_audio?.data ?? "",
            "base64",
          ).byteLength > 1_000,
      ),
    ).toBe(true);
    const encodedAudio =
      audioParts[0]?.input_audio?.data ?? "";
    expect(
      (capturedInit?.headers as Record<string, string>)
        .Authorization,
    ).toBe(`Bearer ${FAKE_SECRET}`);
    expect(
      (capturedInit?.headers as Record<string, string>)[
        "HTTP-Referer"
      ],
    ).toBe("https://tenxpros.com");
    expect(
      (capturedInit?.headers as Record<string, string>)[
        "X-OpenRouter-Title"
      ],
    ).toBe("TenXPros Academy Audio Evaluation");
    expect(
      (capturedInit?.headers as Record<string, string>)[
        "X-OpenRouter-Metadata"
      ],
    ).toBe("enabled");

    const filenames = await readdir(paths.records);
    const requestFilename = filenames.find((filename) =>
      filename.endsWith("-request.json"),
    );
    expect(requestFilename).toBeDefined();
    const persistedRequest = await readFile(
      resolve(paths.records, requestFilename ?? ""),
      "utf8",
    );
    const allPersistedRecords = (
      await Promise.all(
        filenames.map((filename) =>
          readFile(resolve(paths.records, filename), "utf8"),
        ),
      )
    ).join("\n");
    expect(persistedRequest).not.toContain("input_audio");
    expect(persistedRequest).not.toContain(encodedAudio);
    expect(persistedRequest).not.toContain(
      "sample-01-A.mp3",
    );
    expect(persistedRequest).not.toContain(
      "sample-01-B.mp3",
    );
    expect(persistedRequest).not.toContain('"baseline"');
    expect(persistedRequest).not.toContain('"corrected"');
    expect(allPersistedRecords).not.toContain(FAKE_SECRET);
    expect(JSON.parse(persistedRequest)).toMatchObject({
      provider: "openrouter",
      endpoint: "/chat/completions",
      model: "openai/gpt-audio",
      store: false,
      providerRouting: {
        allowFallbacks: false,
        requireParameters: true,
      },
      audioClipCount: 10,
      omittedFields: expect.arrayContaining([
        "API secret",
        "Authorization header",
        "audio base64",
        "source filenames",
        "source paths",
        "private A/B mapping",
      ]),
    });
  });

  it("allows one schema-validation retry and refuses a second retry", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    let fetchCalls = 0;
    const invalidFetch = async () => {
      fetchCalls += 1;
      return responseLike(judgeEnvelope({}));
    };

    const first =
      await phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
        prepared.frozen,
        prepared.assignment,
        prepared.prompt,
        1,
        [],
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        invalidFetch,
        () => FIXED_NOW,
      );
    expect(first.status).toBe("REJECTED");
    expect(first.retryAllowed).toBe(true);

    const second =
      await phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
        prepared.frozen,
        prepared.assignment,
        prepared.prompt,
        2,
        [],
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        invalidFetch,
        () => FIXED_NOW,
      );
    expect(second.status).toBe("REJECTED");
    expect(second.retryAllowed).toBe(false);
    expect(fetchCalls).toBe(2);

    const entries = await ledgerEntries(paths.ledger);
    expect(
      entries.filter(
        (entry) =>
          entry.event === "EXTERNAL_REQUEST_DISPATCHED",
      ),
    ).toHaveLength(2);
    expect(
      entries.filter(
        (entry) =>
          entry.data.status === "REJECTED",
      ),
    ).toHaveLength(2);

    await expect(
      phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
        prepared.frozen,
        prepared.assignment,
        prepared.prompt,
        2,
        [],
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        invalidFetch,
        () => FIXED_NOW,
      ),
    ).rejects.toThrow(/already dispatched/iu);
    expect(fetchCalls).toBe(2);
  });

  it("classifies a thrown timeout as uncertain paid, reserves the ceiling, and never retries", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    let fetchCalls = 0;

    const result =
      await phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
        prepared.frozen,
        prepared.assignment,
        prepared.prompt,
        1,
        [],
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        async () => {
          fetchCalls += 1;
          const error = new Error(
            "Mocked request outcome is ambiguous",
          );
          error.name = "TimeoutError";
          throw error;
        },
        () => FIXED_NOW,
      );

    expect(result.status).toBe("UNCERTAIN_PAID");
    expect(result.retryAllowed).toBe(false);
    expect(result.usage).toBeNull();
    expect(fetchCalls).toBe(1);
    const entries = await ledgerEntries(paths.ledger);
    expect(entries).toHaveLength(2);
    expect(entries[1]?.data).toMatchObject({
      status: "UNCERTAIN_PAID",
      actualCostUsd: null,
      usageKnown: false,
      maximumPossibleCostUsd:
        phase2cPrimaryJudgeHttpTestHooks.providerBoundedMaximumRequestCostUsd,
      issueCodes: ["TimeoutError"],
    });
    const uncertainFilename = (
      await readdir(paths.records)
    ).find((filename) =>
      filename.endsWith("-uncertain.json"),
    );
    expect(uncertainFilename).toBeDefined();
    const uncertainRecord = await readFile(
      resolve(paths.records, uncertainFilename ?? ""),
      "utf8",
    );
    expect(JSON.parse(uncertainRecord)).toMatchObject({
      status: "UNCERTAIN_PAID",
      retryPermitted: false,
      failureClass: "TimeoutError",
    });
  });

  it("keeps the primary timeout armed through a stalled response body read", async () => {
    vi.useFakeTimers();
    try {
      const prepared = await preparedInput;
      const paths = await testPaths();
      let bodyReadStarted!: () => void;
      const started = new Promise<void>((resolveStarted) => {
        bodyReadStarted = resolveStarted;
      });
      const execution =
        phase2cPrimaryJudgeHttpTestHooks.executeJudgeAttempt(
          prepared.frozen,
          prepared.assignment,
          prepared.prompt,
          1,
          [],
          FAKE_SECRET,
          paths.ledger,
          prepared.plan,
          paths.records,
          async (_input, init) => ({
            ok: true,
            status: 200,
            async json() {
              return {};
            },
            text: async () => {
              bodyReadStarted();
              return new Promise<string>((_resolve, reject) => {
                const rejectAsAborted = () => {
                  const error = new Error(
                    "Response body read was aborted",
                  );
                  error.name = "AbortError";
                  reject(error);
                };
                if (init?.signal?.aborted) {
                  rejectAsAborted();
                  return;
                }
                init?.signal?.addEventListener(
                  "abort",
                  rejectAsAborted,
                  { once: true },
                );
              });
            },
          }),
          () => FIXED_NOW,
        );
      await started;
      await vi.advanceTimersByTimeAsync(10 * 60 * 1_000);
      const result = await execution;
      expect(result).toMatchObject({
        status: "UNCERTAIN_PAID",
        retryAllowed: false,
      });
      expect(
        (await ledgerEntries(paths.ledger))[1]?.data,
      ).toMatchObject({
        status: "UNCERTAIN_PAID",
        issueCodes: ["AbortError"],
        retryPermitted: false,
      });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("binds conditional reservations and retries to the exact subplan hash", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    const subplanHash = "a".repeat(64);
    const otherSubplanHash = "b".repeat(64);
    const maximumPossibleCostUsd = 0;
    await phase2cPrimaryJudgeHttpTestHooks.appendLedger(
      paths.ledger,
      prepared.plan.planHash,
      "CONDITIONAL_SUBPLAN_BOUND",
      { subplanHash },
      () => FIXED_NOW,
    );

    await expect(
      phase2cPrimaryJudgeHttpTestHooks.reserveExternalRequest(
        paths.ledger,
        prepared.plan,
        {
          requestKind: "JUDGE",
          maximumPossibleCostUsd,
          judgeId: "conditional-judge-01",
          attempt: 1,
          subplanHash: otherSubplanHash,
        },
        () => FIXED_NOW,
      ),
    ).rejects.toThrow(/exact bound subplan hash/iu);

    const firstIndex =
      await phase2cPrimaryJudgeHttpTestHooks.reserveExternalRequest(
        paths.ledger,
        prepared.plan,
        {
          requestKind: "JUDGE",
          maximumPossibleCostUsd,
          judgeId: "conditional-judge-01",
          attempt: 1,
          subplanHash,
        },
        () => FIXED_NOW,
      );
    await phase2cPrimaryJudgeHttpTestHooks.finalizeExternalRequest(
      paths.ledger,
      prepared.plan,
      {
        requestIndex: firstIndex,
        requestKind: "JUDGE",
        judgeId: "conditional-judge-01",
        attempt: 1,
        subplanHash,
        status: "REJECTED",
        maximumPossibleCostUsd,
        actualCostUsd: 0,
        usageKnown: true,
        retryPermitted: true,
      },
      () => FIXED_NOW,
    );
    const retryIndex =
      await phase2cPrimaryJudgeHttpTestHooks.reserveExternalRequest(
        paths.ledger,
        prepared.plan,
        {
          requestKind: "JUDGE",
          maximumPossibleCostUsd,
          judgeId: "conditional-judge-01",
          attempt: 2,
          subplanHash,
        },
        () => FIXED_NOW,
      );
    expect(retryIndex).toBe(2);

    const secondPrimaryIndex =
      await phase2cPrimaryJudgeHttpTestHooks.reserveExternalRequest(
        paths.ledger,
        prepared.plan,
        {
          requestKind: "JUDGE",
          maximumPossibleCostUsd,
          judgeId: "conditional-judge-02",
          attempt: 1,
          subplanHash,
        },
        () => FIXED_NOW,
      );
    await phase2cPrimaryJudgeHttpTestHooks.finalizeExternalRequest(
      paths.ledger,
      prepared.plan,
      {
        requestIndex: secondPrimaryIndex,
        requestKind: "JUDGE",
        judgeId: "conditional-judge-02",
        attempt: 1,
        subplanHash,
        status: "REJECTED",
        maximumPossibleCostUsd,
        actualCostUsd: 0,
        usageKnown: true,
        retryPermitted: true,
      },
      () => FIXED_NOW,
    );
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.reserveExternalRequest(
        paths.ledger,
        prepared.plan,
        {
          requestKind: "JUDGE",
          maximumPossibleCostUsd,
          judgeId: "conditional-judge-02",
          attempt: 2,
          subplanHash,
        },
        () => FIXED_NOW,
      ),
    ).rejects.toThrow(/single task-wide retry/iu);
  });

  it("passes exactly the key and model preflights and never calls the management-only credits endpoint", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    const calls: string[] = [];
    const result =
      await phase2cPrimaryJudgeHttpTestHooks.preflightOpenRouter(
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        async (input) => {
          calls.push(input);
          if (input.endsWith("/key")) {
            return responseLike({
              data: {
                label: "must-not-be-persisted",
                creator_user_id:
                  "must-not-be-persisted",
                limit: 10,
                limit_remaining: 10,
                expires_at: null,
                is_provisioning_key: false,
                is_active: true,
              },
            });
          }
          if (input.endsWith("/models")) {
            return responseLike({
              data: [
                {
                  id: "openai/gpt-audio",
                  context_length: 128_000,
                  architecture: {
                    input_modalities: ["text", "audio"],
                  },
                  supported_parameters: [
                    "tools",
                    "tool_choice",
                    "max_tokens",
                  ],
                  pricing: {
                    prompt: "0.0000025",
                    audio: "0.000032",
                    completion: "0.00001",
                  },
                },
              ],
            });
          }
          throw new Error(
            `Unexpected metadata endpoint: ${input}`,
          );
        },
        () => FIXED_NOW,
      );
    expect(calls).toEqual([
      "https://openrouter.ai/api/v1/key",
      "https://openrouter.ai/api/v1/models",
    ]);
    expect(result).toMatchObject({
      key: {
        active: true,
        managementOnly: false,
        configuredLimitUsd: 10,
        remainingLimitUsd: 10,
      },
      model: {
        id: "openai/gpt-audio",
        audioInput: true,
        toolCalling: true,
      },
    });
    expect(result).not.toHaveProperty("credits");
    const persisted = (
      await Promise.all(
        (await readdir(paths.records)).map((filename) =>
          readFile(resolve(paths.records, filename), "utf8"),
        ),
      )
    ).join("\n");
    expect(persisted).not.toContain(FAKE_SECRET);
    expect(persisted).not.toContain(
      "must-not-be-persisted",
    );
    expect(persisted).not.toContain("creator_user_id");
    expect(persisted).not.toContain("/credits");
    const preflightSummary = JSON.parse(
      await readFile(
        resolve(
          paths.records,
          "openrouter-preflight-summary.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(preflightSummary).toMatchObject({
      externalMetadataRequests: 2,
      paidModelRequests: 0,
      spendControls: {
        creditsEndpointCalled: false,
        cliMaximumUsd: 10,
        authoritativeActualCostField: "usage.cost",
        http402Policy: "FAIL_CLOSED_NO_RETRY",
      },
    });
    const entries = await ledgerEntries(paths.ledger);
    expect(
      entries.filter(
        (entry) =>
          entry.event === "EXTERNAL_REQUEST_DISPATCHED",
      ),
    ).toHaveLength(2);
    expect(
      entries.some(
        (entry) =>
          entry.data.requestKind === "JUDGE",
      ),
    ).toBe(false);
  });

  it("keeps the metadata timeout armed through body consumption and settles the zero-cost preflight", async () => {
    vi.useFakeTimers();
    try {
      const prepared = await preparedInput;
      const paths = await testPaths();
      let bodyReadStarted!: () => void;
      const started = new Promise<void>((resolveStarted) => {
        bodyReadStarted = resolveStarted;
      });
      const preflight =
        phase2cPrimaryJudgeHttpTestHooks.preflightOpenRouter(
          FAKE_SECRET,
          paths.ledger,
          prepared.plan,
          paths.records,
          async (_input, init) => ({
            ok: true,
            status: 200,
            async json() {
              return {};
            },
            text: async () => {
              bodyReadStarted();
              return new Promise<string>((_resolve, reject) => {
                const rejectAsAborted = () => {
                  const error = new Error(
                    "Metadata body read was aborted",
                  );
                  error.name = "AbortError";
                  reject(error);
                };
                if (init?.signal?.aborted) {
                  rejectAsAborted();
                  return;
                }
                init?.signal?.addEventListener(
                  "abort",
                  rejectAsAborted,
                  { once: true },
                );
              });
            },
          }),
          () => FIXED_NOW,
        );
      await started;
      await vi.advanceTimersByTimeAsync(30_000);
      await expect(preflight).rejects.toThrow(
        /KEY_PREFLIGHT failed before paid inference/iu,
      );
      const entries = await ledgerEntries(paths.ledger);
      expect(entries).toHaveLength(2);
      expect(entries[1]?.data).toMatchObject({
        requestKind: "KEY_PREFLIGHT",
        status: "FAILED_NOT_BILLED",
        actualCostUsd: 0,
        usageKnown: true,
        issueCodes: ["AbortError"],
      });
      const record = JSON.parse(
        await readFile(
          resolve(
            paths.records,
            "01-openrouter-key-preflight.json",
          ),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(record).toMatchObject({
        requestKind: "KEY_PREFLIGHT",
        ok: false,
        bodyReadCompleted: false,
        failureClass: "AbortError",
      });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails closed when Models API omits authoritative pricing.audio even if legacy-looking pricing.input_audio is present", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    const calls: string[] = [];
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.preflightOpenRouter(
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        async (input) => {
          calls.push(input);
          if (input.endsWith("/key")) {
            return responseLike({
              data: {
                limit: 10,
                limit_remaining: 10,
                expires_at: null,
                is_provisioning_key: false,
              },
            });
          }
          return responseLike({
            data: [
              {
                id: "openai/gpt-audio",
                context_length: 128_000,
                architecture: {
                  input_modalities: ["audio"],
                },
                supported_parameters: [
                  "tools",
                  "tool_choice",
                  "max_tokens",
                ],
                pricing: {
                  prompt: "0.0000025",
                  input_audio: "0.000032",
                  completion: "0.00001",
                },
              },
            ],
          });
        },
        () => FIXED_NOW,
      ),
    ).rejects.toThrow(
      /MODEL_CAPABILITY_OR_PRICING_DRIFT/u,
    );
    expect(calls).toEqual([
      "https://openrouter.ai/api/v1/key",
      "https://openrouter.ai/api/v1/models",
    ]);
    const entries = await ledgerEntries(paths.ledger);
    expect(entries.at(-1)?.data).toMatchObject({
      requestKind: "MODELS_PREFLIGHT",
      status: "FAILED_NOT_BILLED",
      issueCodes: ["MODEL_CAPABILITY_OR_PRICING_DRIFT"],
    });
  });

  it("fails closed before model inference when key limit_remaining is below the USD 10 authorization", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    const calls: string[] = [];
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.preflightOpenRouter(
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        async (input) => {
          calls.push(input);
          return responseLike({
            data: {
              limit: 10,
              limit_remaining: 9.99,
              expires_at: null,
              is_provisioning_key: false,
            },
          });
        },
        () => FIXED_NOW,
      ),
    ).rejects.toThrow(
      /KEY_REMAINING_LIMIT_INSUFFICIENT/u,
    );
    expect(calls).toEqual([
      "https://openrouter.ai/api/v1/key",
    ]);
    const entries = await ledgerEntries(paths.ledger);
    expect(entries.at(-1)?.data).toMatchObject({
      requestKind: "KEY_PREFLIGHT",
      status: "FAILED_NOT_BILLED",
      actualCostUsd: 0,
      issueCodes: ["KEY_REMAINING_LIMIT_INSUFFICIENT"],
    });
    expect(
      entries.some(
        (entry) =>
          entry.data.requestKind === "JUDGE",
      ),
    ).toBe(false);
  });

  it("uses the carried USD 3.54151 cost when checking recovery key headroom", async () => {
    const prepared = await preparedInput;
    const passing = await testPaths();
    const requiredRecoveryHeadroom = 6.45849;
    const modelPayload = {
      data: [
        {
          id: "openai/gpt-audio",
          context_length: 128_000,
          architecture: {
            input_modalities: ["text", "audio"],
          },
          supported_parameters: [
            "tools",
            "tool_choice",
            "max_tokens",
          ],
          pricing: {
            prompt: "0.0000025",
            audio: "0.000032",
            completion: "0.00001",
          },
        },
      ],
    };
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.preflightOpenRouter(
        FAKE_SECRET,
        passing.ledger,
        prepared.plan,
        passing.records,
        async (input) =>
          input.endsWith("/key")
            ? responseLike({
                data: {
                  limit: 10,
                  limit_remaining:
                    requiredRecoveryHeadroom,
                  expires_at: null,
                  is_provisioning_key: false,
                },
              })
            : responseLike(modelPayload),
        () => FIXED_NOW,
        {
          minimumRequiredKeyRemainingUsd:
            requiredRecoveryHeadroom,
        },
      ),
    ).resolves.toMatchObject({
      key: {
        remainingLimitUsd: requiredRecoveryHeadroom,
      },
    });
    const summary = JSON.parse(
      await readFile(
        resolve(
          passing.records,
          "openrouter-preflight-summary.json",
        ),
        "utf8",
      ),
    ) as {
      spendControls: {
        minimumRequiredKeyRemainingUsd: number;
      };
    };
    expect(
      summary.spendControls
        .minimumRequiredKeyRemainingUsd,
    ).toBe(requiredRecoveryHeadroom);

    const failing = await testPaths();
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.preflightOpenRouter(
        FAKE_SECRET,
        failing.ledger,
        prepared.plan,
        failing.records,
        async () =>
          responseLike({
            data: {
              limit: 10,
              limit_remaining:
                requiredRecoveryHeadroom - 0.00001,
              expires_at: null,
              is_provisioning_key: false,
            },
          }),
        () => FIXED_NOW,
        {
          minimumRequiredKeyRemainingUsd:
            requiredRecoveryHeadroom,
        },
      ),
    ).rejects.toThrow(
      /KEY_REMAINING_LIMIT_INSUFFICIENT/u,
    );
  });

  it("rejects a recovery key with absent inference-key type flags before models or chat", async () => {
    const paths = await testPaths();
    const calls: string[] = [];
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.executeRecoveryMetadataPreflight(
        {
          secret: FAKE_SECRET,
          recoveryPlan:
            responseRecoveryPlanFixture(),
          recoveryLedgerPath: paths.ledger,
          privateRecordsDirectory: paths.records,
          fetchImpl: async (input) => {
            calls.push(input);
            return responseLike({
              data: {
                limit: 10,
                limit_remaining: 6.45849,
                expires_at: null,
                is_active: true,
              },
            });
          },
          now: () => FIXED_NOW,
        },
      ),
    ).rejects.toThrow(/active inference key/iu);
    expect(calls).toEqual([
      "https://openrouter.ai/api/v1/key",
    ]);
  });

  it("settles HTTP 402 authoritatively and stops before any later recovery chat", async () => {
    const fixture = await recoveryJudgeFixture();
    let chatCalls = 0;
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.executeRecoveryJudgeRequest(
        {
          frozen: fixture.prepared.frozen,
          sourcePairs: fixture.sourcePairs,
          priorAssignments:
            fixture.prepared.privateManifest
              .judgeAssignments,
          priorRecoveryRandomizations: [],
          randomization: fixture.randomization,
          formatMode: "FORCED_TOOL_CALL",
          secret: FAKE_SECRET,
          recoveryPlan: fixture.recoveryPlan,
          recoveryLedgerPath: fixture.paths.ledger,
          privateRecordsDirectory:
            fixture.paths.records,
          acceptedResponsesDirectory:
            fixture.acceptedResponsesDirectory,
          fetchImpl: async () => {
            chatCalls += 1;
            return responseLike(
              {
                id: "or-402",
                usage: {
                  ...TOKEN_USAGE,
                  cost: 0.01,
                },
                error: {
                  message: "Insufficient credits",
                },
              },
              402,
            );
          },
          now: () => FIXED_NOW,
        },
      ),
    ).rejects.toThrow(/402_INSUFFICIENT_CREDIT/u);
    expect(chatCalls).toBe(1);
    const entries =
      await phase2cPrimaryJudgeHttpTestHooks.readResponseRecoveryLedger(
        fixture.paths.ledger,
      );
    expect(entries.at(-1)?.data).toMatchObject({
      status: "REJECTED_BILLED",
      actualCostUsd: 0.01,
      issueCodes: [
        "HTTP_402_INSUFFICIENT_CREDIT",
      ],
    });
  });

  it("records an ambiguous recovery POST as uncertain and blocks every later dispatch", async () => {
    const fixture = await recoveryJudgeFixture();
    let chatCalls = 0;
    const first =
      await phase2cPrimaryJudgeHttpTestHooks.executeRecoveryJudgeRequest(
        {
          frozen: fixture.prepared.frozen,
          sourcePairs: fixture.sourcePairs,
          priorAssignments:
            fixture.prepared.privateManifest
              .judgeAssignments,
          priorRecoveryRandomizations: [],
          randomization: fixture.randomization,
          formatMode: "FORCED_TOOL_CALL",
          secret: FAKE_SECRET,
          recoveryPlan: fixture.recoveryPlan,
          recoveryLedgerPath: fixture.paths.ledger,
          privateRecordsDirectory:
            fixture.paths.records,
          acceptedResponsesDirectory:
            fixture.acceptedResponsesDirectory,
          fetchImpl: async () => {
            chatCalls += 1;
            throw new Error("socket closed after send");
          },
          now: () => FIXED_NOW,
        },
      );
    expect(first.status).toBe("UNCERTAIN_PAID");
    const secondRandomization =
      buildFreshRecoveryRandomization({
        perspectiveId: "judge-02",
        evaluationPackageId:
          "blind-review-8fab36b45ab641b5",
        sourcePairs: fixture.sourcePairs,
        priorAssignments:
          fixture.prepared.privateManifest
            .judgeAssignments,
        priorRecoveryRandomizations: [
          fixture.randomization,
        ],
        entropySource: () => Buffer.alloc(32, 0x42),
      });
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.executeRecoveryJudgeRequest(
        {
          frozen: fixture.prepared.frozen,
          sourcePairs: fixture.sourcePairs,
          priorAssignments:
            fixture.prepared.privateManifest
              .judgeAssignments,
          priorRecoveryRandomizations: [
            fixture.randomization,
          ],
          randomization: secondRandomization,
          formatMode: "FORCED_TOOL_CALL",
          secret: FAKE_SECRET,
          recoveryPlan: fixture.recoveryPlan,
          recoveryLedgerPath: fixture.paths.ledger,
          privateRecordsDirectory:
            fixture.paths.records,
          acceptedResponsesDirectory:
            fixture.acceptedResponsesDirectory,
          fetchImpl: async () => {
            chatCalls += 1;
            throw new Error(
              "must never dispatch second request",
            );
          },
          now: () => FIXED_NOW,
        },
      ),
    ).rejects.toThrow(/UNCERTAIN_PAID/iu);
    expect(chatCalls).toBe(1);
  });

  it("executes two metadata requests and five sequential chats with durable raw bodies and a five-judge panel", async () => {
    const root = await mkdtemp(
      resolve(tmpdir(), "tenxpros-recovery-e2e-"),
    );
    temporaryDirectories.push(root);
    await mkdir(resolve(root, "private"));
    const sourceRoot = resolve(
      process.cwd(),
      "..",
      "scratch_academy",
      "ai-audio-evaluation",
      "phase2c-openrouter-bryce-20260726",
    );
    for (const filename of [
      "ai-evaluation-plan.json",
      "private-ai-manifest.json",
      "objective-audio-analysis.json",
    ]) {
      await writeFile(
        resolve(root, filename),
        await readFile(resolve(sourceRoot, filename)),
        { mode: 0o600 },
      );
    }
    const calls: string[] = [];
    let responseNumber = 0;
    const result =
      await phase2cPrimaryJudgeHttpTestHooks.executeResponseRecoveryPlan(
        {
          recoveryPlan:
            responseRecoveryPlanFixture(),
          outputDirectory: root,
          secret: FAKE_SECRET,
          fetchImpl: async (url, init) => {
            calls.push(url);
            if (url.endsWith("/key")) {
              return responseLike({
                data: {
                  limit: 10,
                  limit_remaining: 6.45849,
                  expires_at: null,
                  is_provisioning_key: false,
                  is_active: true,
                },
              });
            }
            if (url.endsWith("/models")) {
              return responseLike({
                data: [
                  {
                    id: "openai/gpt-audio",
                    context_length: 128_000,
                    architecture: {
                      input_modalities: [
                        "text",
                        "audio",
                      ],
                    },
                    supported_parameters: [
                      "max_tokens",
                      "tools",
                      "tool_choice",
                    ],
                    pricing: {
                      prompt: "0.0000025",
                      audio: "0.000032",
                      completion: "0.00001",
                    },
                  },
                ],
              });
            }
            responseNumber += 1;
            const requestBody = JSON.parse(
              String(init?.body),
            ) as Record<string, unknown>;
            return responseLike({
              id: `recovery-response-${String(
                responseNumber,
              )}`,
              usage: {
                prompt_tokens: 1_000,
                completion_tokens: 200,
                cost: 0.1,
                prompt_tokens_details: {
                  audio_tokens: 800,
                },
              },
              choices: [
                {
                  message: {
                    content: null,
                    tool_calls: [
                      {
                        type: "function",
                        function: {
                          name: "submit_audio_evaluation",
                          arguments: JSON.stringify(
                            correctedRecoveryResponseFromRequest(
                              requestBody,
                            ),
                          ),
                        },
                      },
                    ],
                  },
                },
              ],
            });
          },
          now: () => FIXED_NOW,
        },
      );
    expect(result.status).toBe("COMPLETE");
    expect(result.validIndependentJudgeCount).toBe(5);
    expect(calls).toHaveLength(7);
    expect(
      calls.filter((url) =>
        url.endsWith("/chat/completions"),
      ),
    ).toHaveLength(5);
    const privateRecords = await readdir(
      resolve(root, "private", "recovery-api-records"),
    );
    const rawBodies = privateRecords.filter((filename) =>
      filename.endsWith("-raw-response.txt"),
    );
    expect(rawBodies).toHaveLength(5);
    for (const filename of rawBodies) {
      const rawPath = resolve(
        root,
        "private",
        "recovery-api-records",
        filename,
      );
      const raw = await readFile(rawPath);
      const metadataFilename = filename.replace(
        "-raw-response.txt",
        "-response-metadata.json",
      );
      const metadata = JSON.parse(
        await readFile(
          resolve(
            root,
            "private",
            "recovery-api-records",
            metadataFilename,
          ),
          "utf8",
        ),
      ) as { responseSha256: string };
      expect(metadata.responseSha256).toBe(
        createHash("sha256")
          .update(raw)
          .digest("hex"),
      );
    }
  });

  it("rejects provisioning/management keys before the model request", async () => {
    const prepared = await preparedInput;
    const paths = await testPaths();
    const calls: string[] = [];
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.preflightOpenRouter(
        FAKE_SECRET,
        paths.ledger,
        prepared.plan,
        paths.records,
        async (input) => {
          calls.push(input);
          return responseLike({
            data: {
              limit: 10,
              limit_remaining: 10,
              expires_at: null,
              is_provisioning_key: true,
            },
          });
        },
        () => FIXED_NOW,
      ),
    ).rejects.toThrow(/MANAGEMENT_ONLY_KEY_REJECTED/u);
    expect(calls).toEqual([
      "https://openrouter.ai/api/v1/key",
    ]);
  });
});
