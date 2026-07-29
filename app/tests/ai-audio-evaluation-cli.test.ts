import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import {
  acquireResponseRecoveryRunLock,
  acquireTaskWidePaidExecutionLock,
  assertRecoveryReplacementDispatchAllowed,
  assertNextRecoveryRequestFits,
  assertNextPaidRequestFits,
  assertPaidAuthorization,
  assertResponseRecoveryPlanInvariant,
  assertResponseRecoveryPaidAuthorization,
  buildFreshRecoveryRandomization,
  buildRecoveryJudgePrompt,
  buildRecoveryReplacementRequestBody,
  canStartConditionalBranchSequentially,
  buildResponseRecoveryPlan,
  createLedgerEntry,
  incompleteTuningStatusForConditionalExecution,
  parseAiAudioEvaluationCliOptions,
  phase2cPrimaryJudgeHttpTestHooks,
  selectedTuningMetrics,
  verifyOfflineRecoveryCompletionForPaidExecution,
  verifyLedgerEntries,
  writeOfflineResponseRecoveryArtifacts,
} from "../scripts/ai-audio-evaluation-cli";
import {
  bindConditionalSubplan,
  createTuningConditionalDraft,
  type AiConditionalCandidateSummary,
} from "../src/lib/academy/narration/ai-audio-conditional-evaluation";
import {
  AI_AUDIO_SCORE_DIMENSIONS,
  buildBlindJudgeAssignments,
  decideLocalNarration,
  hashAiValue,
  type AiBlindSourcePair,
  type AiAudioScoreDimension,
  type AiBryceDecisionMetrics,
} from "../src/lib/academy/narration/ai-audio-evaluation";

const PLAN_HASH = "a".repeat(64);
const temporaryDirectories: string[] = [];

function scoreRecord(
  value: number,
): Record<AiAudioScoreDimension, number | null> {
  return Object.fromEntries(
    AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      value,
    ]),
  ) as Record<AiAudioScoreDimension, number | null>;
}

function tuningInputMetrics(): AiBryceDecisionMetrics {
  return {
    validJudgeCount: 5,
    correctedPairMajorityWins: 4,
    totalPairCount: 5,
    correctedOverallPreferenceRate: 0.8,
    correctedMedianScores: {
      ...scoreRecord(4),
      pause_quality: 3.5,
    },
    baselineNaturalnessMedian: 3.5,
    criticalPronunciationMaxJudgeCount: 0,
    blockingAcousticDefects: [],
    correctedExcessivelySlowMajoritySampleIds: [],
    tableCorrectedClearerRate: 0.8,
    tableAddedDurationAcceptedRate: 0.8,
    tableOnlyRemainingIssue: true,
    semanticPauseStructurePass: true,
    segmentationPass: true,
    tableEfficiencyPass: false,
    voiceNaturalnessAcceptable: true,
    fatigueAcceptable: true,
    panelConfidence: 90,
    decisiveEvidence: [],
    dissentingEvidence: [],
  };
}

function conditionalSummary(
  candidateId: string,
  overrides: Partial<AiConditionalCandidateSummary> = {},
): AiConditionalCandidateSummary {
  return {
    candidateId,
    validJudgeCount: 3,
    medianScores: scoreRecord(4),
    semanticFaithfulnessMedian: 5,
    firstPlaceVotes: 0,
    firstPlaceVotesByExcerpt: {},
    aheadOfCandidateVotesByExcerpt: {},
    clearerThanCandidateVotesByExcerpt: {},
    meanConfidence: 90,
    criticalPronunciationJudgeCount: 0,
    tooSlowJudgeCountByExcerpt: {},
    tooFastJudgeCountByExcerpt: {},
    heardAsLongerCount: 0,
    longerDurationExcessiveRate: null,
    clarityJustifiesLongerDurationRate: null,
    objectiveIntegrityPass: true,
    contentConsistency: 1,
    ...overrides,
  };
}

function tuningEvaluationFixture(
  selectedDuration: number,
  directClearerVotes = 3,
) {
  const draft = createTuningConditionalDraft({
    basePlanHash: PLAN_HASH,
    signals: [
      {
        dimension: "table_row_pause",
        direction: "too_long",
        severity: 1,
        evidence: ["The frozen table excerpt is inefficient."],
      },
    ],
    affectedExcerptIdsByDimension: {
      table_row_pause: ["sample-02"],
    },
  });
  const selectedCandidateId = draft.profiles[0]!.profileId;
  const subplan = bindConditionalSubplan({
    draft,
    audioInputs: draft.candidates.map((candidate) => ({
      excerptId: "sample-02",
      candidateId: candidate.candidateId,
      audioSha256: hashAiValue([
        "tuning-metric-test",
        candidate.candidateId,
        selectedDuration,
      ]),
      durationSeconds:
        candidate.candidateId === "source-baseline"
          ? 100
          : candidate.candidateId === "source-corrected"
            ? 150
            : candidate.candidateId === selectedCandidateId
              ? selectedDuration
              : 140,
      objectiveIntegrityPass: true,
      contentConsistency: 1,
    })),
  });
  const selected = conditionalSummary(selectedCandidateId, {
    medianScores: scoreRecord(4),
    firstPlaceVotes: 3,
    firstPlaceVotesByExcerpt: { "sample-02": 3 },
    aheadOfCandidateVotesByExcerpt: {
      "source-baseline": { "sample-02": 3 },
    },
    clearerThanCandidateVotesByExcerpt: {
      "source-baseline": {
        "sample-02": directClearerVotes,
      },
    },
    heardAsLongerCount: 3,
    longerDurationExcessiveRate: 0,
    clarityJustifiesLongerDurationRate: 1,
  });
  const conditionalBaseline = conditionalSummary(
    "source-baseline",
    {
      medianScores: {
        ...scoreRecord(4),
        naturalness: 4.1,
      },
    },
  );
  const pairPreferences = Object.fromEntries(
    [1, 2, 3, 4, 5].map((number) => [
      `sample-0${String(number)}`,
      {
        overall: {
          counts: {
            "bryce-corrected": 4,
            "bryce-baseline": 1,
          },
          total: 5,
          majorityCandidateId: "bryce-corrected",
        },
      },
    ]),
  );
  const primaryPanel = {
    perceptual: {
      pair_preferences: pairPreferences,
    },
  } as unknown as Parameters<typeof selectedTuningMetrics>[4];
  return {
    draft,
    subplan,
    selected,
    conditionalBaseline,
    primaryPanel,
  };
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

function planForAuthorization() {
  return {
    planHash: PLAN_HASH,
    judges: {
      maximumApiRequests: 17,
    },
    cost: {
      executableEnvelopeMaximumUsd: 10,
    },
  } as Parameters<typeof assertPaidAuthorization>[1];
}

describe("Phase 2C CLI paid gates", () => {
  it("defaults to a zero-request dry run", () => {
    const options = parseAiAudioEvaluationCliOptions([]);
    expect(options.allowPaid).toBe(false);
    expect(options.suppliedMaxUsd).toBeUndefined();
    expect(options.suppliedMaxRequests).toBeUndefined();
  });

  it("requires the three exact paid flags and pins the generated plan internally", () => {
    expect(() =>
      assertPaidAuthorization(
        parseAiAudioEvaluationCliOptions([
          "--allow-paid-ai-evaluation",
        ]),
        planForAuthorization(),
      ),
    ).toThrow(/all three exact/iu);

    const authorized = parseAiAudioEvaluationCliOptions([
      "--allow-paid-ai-evaluation",
      "--max-usd",
      "10",
      "--max-requests",
      "17",
    ]);
    expect(() =>
      assertPaidAuthorization(
        authorized,
        planForAuthorization(),
      ),
    ).not.toThrow();
  });

  it("requires the exact cumulative 10 USD / 24 request recovery authorization", () => {
    const authorized = parseAiAudioEvaluationCliOptions([
      "--execute-response-recovery",
      "--allow-paid-ai-evaluation",
      "--max-usd",
      "10",
      "--max-requests",
      "24",
    ]);
    expect(() =>
      assertResponseRecoveryPaidAuthorization(
        authorized,
      ),
    ).not.toThrow();
    expect(() =>
      assertResponseRecoveryPaidAuthorization(
        parseAiAudioEvaluationCliOptions([
          "--execute-response-recovery",
          "--allow-paid-ai-evaluation",
          "--max-usd",
          "10",
          "--max-requests",
          "17",
        ]),
      ),
    ).toThrow(/exact cumulative/iu);
  });

  it("rejects cap drift, duplicate options, and unknown options", () => {
    expect(() =>
      assertPaidAuthorization(
        parseAiAudioEvaluationCliOptions([
          "--allow-paid-ai-evaluation",
          "--max-usd",
          "10.00",
          "--max-requests",
          "17",
        ]),
        planForAuthorization(),
      ),
    ).toThrow(/does not exactly match/iu);
    expect(() =>
      parseAiAudioEvaluationCliOptions([
        "--max-usd",
        "10",
        "--max-usd",
        "10",
      ]),
    ).toThrow(/duplicate/iu);
    expect(() =>
      parseAiAudioEvaluationCliOptions(["--api-key", "secret"]),
    ).toThrow(/unknown/iu);
    expect(() =>
      parseAiAudioEvaluationCliOptions([
        "--plan-hash",
        PLAN_HASH,
      ]),
    ).toThrow(/unknown/iu);
  });
});

describe("OpenRouter secret-file gate", () => {
  it("acquires the recovery lock before reading the secret", async () => {
    const order: string[] = [];
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.acquireRecoveryLockThenReadSecret(
        {
          acquireLock: async () => {
            order.push("lock");
          },
          readSecret: async () => {
            order.push("secret");
            return "test-secret";
          },
        },
      ),
    ).resolves.toBe("test-secret");
    expect(order).toEqual(["lock", "secret"]);
  });

  it("accepts only a process-owned mode-0400 regular file with the OpenRouter prefix", async () => {
    const root = await mkdtemp(
      resolve(tmpdir(), "tenxpros-openrouter-secret-test-"),
    );
    temporaryDirectories.push(root);
    const secretPath = resolve(root, "key");
    await writeFile(
      secretPath,
      "sk-or-v1-unit-test-placeholder\n",
      { mode: 0o400 },
    );
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.readOpenRouterSecretFileAfterAllGates(
        secretPath,
      ),
    ).resolves.toBe("sk-or-v1-unit-test-placeholder");

    await chmod(secretPath, 0o600);
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.readOpenRouterSecretFileAfterAllGates(
        secretPath,
      ),
    ).rejects.toThrow(/mode-0400/iu);

    await chmod(secretPath, 0o400);
    const wrongPrefixPath = resolve(root, "wrong-prefix");
    await writeFile(wrongPrefixPath, "not-an-openrouter-key\n", {
      mode: 0o400,
    });
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.readOpenRouterSecretFileAfterAllGates(
        wrongPrefixPath,
      ),
    ).rejects.toThrow(/expected sk-or-v1-/iu);
  });
});

describe("Phase 2C append-only accounting", () => {
  it("verifies the chained ledger and detects tampering", () => {
    const first = createLedgerEntry({
      sequence: 1,
      timestamp: "2026-07-26T00:00:00.000Z",
      previousHash: "0".repeat(64),
      event: "DRY_RUN_PREPARED",
      planHash: PLAN_HASH,
      data: { externalRequestsMade: 0 },
    });
    const second = createLedgerEntry({
      sequence: 2,
      timestamp: "2026-07-26T00:01:00.000Z",
      previousHash: first.entryHash,
      event: "EXTERNAL_REQUEST_DISPATCHED",
      planHash: PLAN_HASH,
      data: { requestIndex: 1 },
    });
    expect(() =>
      verifyLedgerEntries([first, second], PLAN_HASH),
    ).not.toThrow();
    expect(() =>
      verifyLedgerEntries(
        [{ ...first, event: "TAMPERED" }, second],
        PLAN_HASH,
      ),
    ).toThrow(/hash-chain/iu);
  });

  it("stops before crossing either hard cap", () => {
    expect(() =>
      assertNextPaidRequestFits({
        requestsUsed: 16,
        capAccountedCostUsd: 7,
        nextMaximumPossibleCostUsd: 1,
      }),
    ).not.toThrow();
    expect(() =>
      assertNextPaidRequestFits({
        requestsUsed: 17,
        capAccountedCostUsd: 0,
        nextMaximumPossibleCostUsd: 0,
      }),
    ).toThrow(/request cap/iu);
    expect(() =>
      assertNextPaidRequestFits({
        requestsUsed: 5,
        capAccountedCostUsd: 9.5,
        nextMaximumPossibleCostUsd: 0.50000001,
      }),
    ).toThrow(/spending cap/iu);
  });

  it("admits conditional judges sequentially when known actual usage leaves room, without reserving all four possible calls up front", () => {
    const providerBound =
      phase2cPrimaryJudgeHttpTestHooks
        .providerBoundedMaximumRequestCostUsd;
    let requestsUsed = 8;
    let capAccountedCostUsd = 5.7;
    expect(
      capAccountedCostUsd + 4 * providerBound,
    ).toBeGreaterThan(10);

    for (const knownActualCostUsd of [
      0.05, 0.06, 0.07,
    ]) {
      expect(
        canStartConditionalBranchSequentially({
          requestsUsed,
          capAccountedCostUsd,
        }),
      ).toBe(true);
      requestsUsed += 1;
      capAccountedCostUsd += knownActualCostUsd;
    }
    expect(requestsUsed).toBe(11);
    expect(capAccountedCostUsd).toBeCloseTo(5.88, 8);

    const ambiguousExposure =
      capAccountedCostUsd + providerBound;
    expect(
      canStartConditionalBranchSequentially({
        requestsUsed,
        capAccountedCostUsd: ambiguousExposure,
      }),
    ).toBe(false);
  });
});

describe("Phase 2C task-wide paid lock", () => {
  it("blocks alternate output directories and regenerated plan hashes behind one fixed, secure task lock", async () => {
    const phaseRoot = await mkdtemp(
      resolve(tmpdir(), "tenxpros-phase2c-lock-test-"),
    );
    temporaryDirectories.push(phaseRoot);
    await mkdir(resolve(phaseRoot, "output-one"), {
      mode: 0o700,
    });
    await mkdir(resolve(phaseRoot, "output-two"), {
      mode: 0o700,
    });

    const lockPath =
      await acquireTaskWidePaidExecutionLock({
        planHash: PLAN_HASH,
        createdAt: "2026-07-26T12:00:00.000Z",
        processId: 1234,
        phaseRootForTest: phaseRoot,
      });
    expect(dirname(lockPath)).toBe(phaseRoot);
    expect(lockPath).not.toContain("output-one");
    expect(lockPath).not.toContain("output-two");
    expect((await lstat(lockPath)).mode & 0o777).toBe(
      0o600,
    );
    expect(
      JSON.parse(await readFile(lockPath, "utf8")),
    ).toMatchObject({
      schemaVersion:
        "tenxpros-phase2c-openrouter-task-wide-paid-execution-lock-v2",
      evaluationId: "phase2c-openrouter-bryce-20260726",
      planHash: PLAN_HASH,
      processId: 1234,
    });

    await expect(
      acquireTaskWidePaidExecutionLock({
        planHash: "b".repeat(64),
        createdAt: "2026-07-26T12:01:00.000Z",
        processId: 5678,
        phaseRootForTest: phaseRoot,
      }),
    ).rejects.toThrow(
      /changing the output directory or regenerating the plan/iu,
    );
  });
});

describe("Phase 2C response-recovery plan and lock", () => {
  const priorPlanHash =
    "ac8586e750afc4e0fcc279583c33cde67352bb08f355427a1936025c3dc97e5c";
  const evidence = Array.from(
    { length: 10 },
    (_, offset) => {
      const requestIndex = offset + 3;
      const perspectiveNumber =
        Math.floor(offset / 2) + 1;
      return {
        requestIndex,
        perspectiveId:
          `judge-0${String(perspectiveNumber)}` as
            | "judge-01"
            | "judge-02"
            | "judge-03"
            | "judge-04"
            | "judge-05",
        attempt: (offset % 2 === 0 ? 1 : 2) as
          | 1
          | 2,
        originalResponseId: `response-${String(
          requestIndex,
        )}`,
        responseSha256: createHash("sha256")
          .update(`response-${String(requestIndex)}`)
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
  const recoveryAudioBytes = Array.from(
    { length: 10 },
    (_, index) =>
      Buffer.from(`recovery-audio-${String(index)}`, "utf8"),
  );
  const recoverySourcePairs: readonly AiBlindSourcePair[] =
    Array.from({ length: 5 }, (_, pairIndex) => {
      const sample = (sampleIndex: 0 | 1) => {
        const itemIndex = pairIndex * 2 + sampleIndex;
        return {
          sampleId: `sample-${String(itemIndex + 1)}`,
          audioSha256: createHash("sha256")
            .update(recoveryAudioBytes[itemIndex]!)
            .digest("hex"),
          durationSeconds: 10 + itemIndex,
        };
      };
      return {
        pairId: `pair-${String(pairIndex + 1)}`,
        tableEvaluation: pairIndex === 1,
        samples: [sample(0), sample(1)],
      };
    });
  const oldAssignments = buildBlindJudgeAssignments({
    evaluationPackageId:
      "blind-review-8fab36b45ab641b5",
    blindSeed: "old-blind-seed-".repeat(4),
    pairs: recoverySourcePairs,
  });

  function replacementFixture(
    perspectiveId:
      | "judge-01"
      | "judge-02"
      | "judge-03"
      | "judge-04"
      | "judge-05" = "judge-01",
  ) {
    const randomization =
      buildFreshRecoveryRandomization({
        perspectiveId,
        evaluationPackageId:
          "blind-review-8fab36b45ab641b5",
        sourcePairs: recoverySourcePairs,
        priorAssignments: oldAssignments,
        entropySource: () => Buffer.alloc(32, 0x5a),
      });
    const bytesByHash = new Map(
      recoveryAudioBytes.map((bytes) => [
        createHash("sha256").update(bytes).digest("hex"),
        bytes,
      ]),
    );
    const content = randomization.assignment.pairs.flatMap(
      (pair) =>
        pair.clips.map((clip) => ({
          type: "input_audio",
          input_audio: {
            data: bytesByHash
              .get(clip.audioSha256)!
              .toString("base64"),
            format: "mp3",
          },
        })),
    );
    return {
      randomization,
      content,
      prompt: buildRecoveryJudgePrompt(
        randomization.assignment,
      ),
    };
  }

  it("hash-binds all ten old responses and carries USD 3.54151 / 12 requests into the USD 10 / 24 caps", () => {
    const plan = buildResponseRecoveryPlan({
      previousPlanHash: priorPlanHash,
      previousLedgerTerminalHash: "1".repeat(64),
      previousLedgerSha256: "2".repeat(64),
      previousLockSha256: "3".repeat(64),
      rejectedResponses: evidence,
      correctedResponseSchemaSha256: "4".repeat(64),
      recoveredPerspectiveIds: [
        "judge-01",
        "judge-03",
        "judge-05",
      ],
      missingPerspectiveIds: [
        "judge-02",
        "judge-04",
      ],
    });
    expect(plan).toMatchObject({
      previousPlanHash: priorPlanHash,
      priorRun: {
        actualCostUsd: 3.54151,
        externalRequests: 12,
        uncertainCostUsd: 0,
      },
      recoveredPerspectiveCount: 3,
      missingPerspectiveCount: 2,
      remainingCostUsd: 6.45849,
      remainingExternalRequests: 12,
      replacementPolicy: {
        exactlyOnePrimaryPerMissingPerspective: true,
        maximumNewPrimaryRequests: 2,
        billedAutomaticRetries: 0,
        replayPriorRequestIndexes: [],
      },
      cumulativeCaps: {
        maximumActualPlusUncertainCostUsd: 10,
        maximumExternalRequests: 24,
      },
    });
    expect(plan.rejectedResponses).toHaveLength(10);
    expect(plan.recoveryPlanHash).toMatch(
      /^[a-f0-9]{64}$/u,
    );
    expect(() =>
      assertResponseRecoveryPlanInvariant(plan),
    ).not.toThrow();
    expect(() =>
      assertResponseRecoveryPlanInvariant({
        ...plan,
        recoveredPerspectiveCount: 4,
      }),
    ).toThrow(/deterministic frozen reconstruction/iu);
    expect(() =>
      buildResponseRecoveryPlan({
        previousPlanHash: priorPlanHash,
        previousLedgerTerminalHash: "1".repeat(64),
        previousLedgerSha256: "2".repeat(64),
        previousLockSha256: "3".repeat(64),
        rejectedResponses: evidence.slice(1),
        correctedResponseSchemaSha256: "4".repeat(64),
        recoveredPerspectiveIds: [],
        missingPerspectiveIds: [
          "judge-01",
          "judge-02",
          "judge-03",
          "judge-04",
          "judge-05",
        ],
      }),
    ).toThrow(/exactly ten/iu);
  });

  it("includes prior accounting in every recovery admission check", () => {
    expect(() =>
      assertNextRecoveryRequestFits({
        newExternalRequestsUsed: 11,
        newKnownActualCostUsd: 2,
        newUncertainMaximumCostUsd: 0,
        nextMaximumPossibleCostUsd: 4.146,
      }),
    ).not.toThrow();
    expect(() =>
      assertNextRecoveryRequestFits({
        newExternalRequestsUsed: 12,
        newKnownActualCostUsd: 0,
        newUncertainMaximumCostUsd: 0,
        nextMaximumPossibleCostUsd: 0,
      }),
    ).toThrow(/request cap/iu);
    expect(() =>
      assertNextRecoveryRequestFits({
        newExternalRequestsUsed: 0,
        newKnownActualCostUsd: 2.4,
        newUncertainMaximumCostUsd: 0,
        nextMaximumPossibleCostUsd: 4.146,
      }),
    ).toThrow(/spending cap/iu);
  });

  it("settles successful recovery metadata preflight as zero-cost without judge usage", async () => {
    const root = await mkdtemp(
      resolve(tmpdir(), "tenxpros-recovery-accounting-"),
    );
    temporaryDirectories.push(root);
    const ledgerPath = resolve(
      root,
      "response-recovery-ledger.jsonl",
    );
    const recoveryPlan = buildResponseRecoveryPlan({
      previousPlanHash: priorPlanHash,
      previousLedgerTerminalHash: "1".repeat(64),
      previousLedgerSha256: "2".repeat(64),
      previousLockSha256: "3".repeat(64),
      rejectedResponses: evidence,
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
    const requestIndex =
      await phase2cPrimaryJudgeHttpTestHooks.reserveRecoveryExternalRequest(
        {
          recoveryLedgerPath: ledgerPath,
          recoveryPlan,
          requestKind: "KEY_PREFLIGHT",
          maximumPossibleCostUsd: 0,
          now: () => "2026-07-27T00:00:00.000Z",
        },
      );
    await expect(
      phase2cPrimaryJudgeHttpTestHooks.settleRecoveryExternalRequest(
        {
          recoveryLedgerPath: ledgerPath,
          recoveryPlan,
          requestIndex,
          status: "ACCEPTED",
          actualCostUsd: 0,
          issueCodes: [],
          latencyMs: 1,
          now: () => "2026-07-27T00:00:01.000Z",
        },
      ),
    ).resolves.toBeUndefined();
    const accounting =
      phase2cPrimaryJudgeHttpTestHooks.recoveryRequestAccounting(
        await phase2cPrimaryJudgeHttpTestHooks.readResponseRecoveryLedger(
          ledgerPath,
        ),
      );
    expect(accounting).toMatchObject({
      newExternalRequestsUsed: 1,
      newKnownActualCostUsd: 0,
      newUncertainMaximumCostUsd: 0,
    });
  });

  it("builds a forced-tool replacement with one confirmed-unbilled prompt-only JSON fallback and no response_format", () => {
    const { randomization, content, prompt } =
      replacementFixture();
    const forced = buildRecoveryReplacementRequestBody({
      randomization,
      evaluationPackageId:
        "blind-review-8fab36b45ab641b5",
      sourcePairs: recoverySourcePairs,
      priorAssignments: oldAssignments,
      prompt,
      userContent: content,
      formatMode: "FORCED_TOOL_CALL",
    });
    expect(forced.body).toMatchObject({
      model: "openai/gpt-audio",
      provider: {
        allow_fallbacks: false,
        require_parameters: true,
      },
      tools: [
        {
          type: "function",
          function: {
            name: "submit_audio_evaluation",
            strict: true,
            parameters: {
              additionalProperties: false,
            required: [
              "judge_metadata",
              "file_scores",
              "pair_evaluations",
              "table_evaluation",
              "overall_assessment",
                "long_form_recommendation",
                "confidence",
            ],
          },
        },
        },
      ],
      tool_choice: {
        type: "function",
        function: {
          name: "submit_audio_evaluation",
        },
      },
    });
    expect(forced.body).not.toHaveProperty(
      "response_format",
    );
    const strictSchema = (
      forced.body.tools as readonly {
        function: {
          parameters: Record<string, unknown>;
        };
      }[]
    )[0]!.function.parameters;
    const required = strictSchema.required as
      | readonly string[]
      | undefined;
    expect(required).toBeDefined();
    expect(new Set(required).size).toBe(
      required?.length,
    );
    expect(
      (
        (
          strictSchema.properties as Record<
            string,
            Record<string, unknown>
          >
        ).pair_evaluations?.items as {
          required: readonly string[];
        }
      ).required,
    ).not.toContain("table_evaluation");
    const fallback =
      buildRecoveryReplacementRequestBody({
        randomization,
        evaluationPackageId:
          "blind-review-8fab36b45ab641b5",
        sourcePairs: recoverySourcePairs,
        priorAssignments: oldAssignments,
        prompt,
        userContent: content,
        formatMode:
          "PLAIN_JSON_FALLBACK_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
        fallbackOfRequestIndex: 13,
        confirmedUnbilledToolCallRequestIndex: 13,
      });
    expect(fallback.body).not.toHaveProperty(
      "response_format",
    );
    expect(fallback.body).not.toHaveProperty("tools");
    expect(fallback.body).not.toHaveProperty(
      "tool_choice",
    );
    expect(
      fallback.redactedRequestRecord,
    ).toMatchObject({
      fallbackOfRequestIndex: 13,
      audioClipCount: 10,
      privateMappingStored: false,
    });
    expect(prompt).toContain(
      "the first named clip is Version A",
    );
    expect(prompt).toContain(
      "exact neutral SET label as pair_id",
    );
    expect(prompt).toContain(
      "cannot be both too_slow and too_fast",
    );
    expect(prompt).toContain(
      "pronunciation score to be 3 or lower",
    );
    expect(prompt).toContain(
      "corresponding score cannot be lower",
    );
    expect(prompt).toContain(
      "at least one comparison-choice field must be tie",
    );
    expect(prompt).toContain(
      "both longer_duration_excessive and clarity_justifies_added_duration must be false",
    );
    expect(
      fallback.redactedRequestRecord,
    ).toMatchObject({
      neutralRandomizationSha256:
        randomization.randomizationSha256,
      distinctFromPriorAssignmentHashes: true,
      distinctFromPriorPresentationSignatures: true,
    });
    expect(() =>
      buildRecoveryReplacementRequestBody({
        randomization,
        evaluationPackageId:
          "blind-review-8fab36b45ab641b5",
        sourcePairs: recoverySourcePairs,
        priorAssignments: oldAssignments,
        prompt,
        userContent: [
          {
            ...content[0],
            input_audio: {
              data: Buffer.from("tampered", "utf8").toString(
                "base64",
              ),
              format: "mp3",
            },
          },
          ...content.slice(1),
        ],
        formatMode: "FORCED_TOOL_CALL",
      }),
    ).toThrow(/audio order or bytes/iu);
  });

  it("binds each generated recovery presentation to old and earlier new randomizations", () => {
    const first = buildFreshRecoveryRandomization({
      perspectiveId: "judge-01",
      evaluationPackageId:
        "blind-review-8fab36b45ab641b5",
      sourcePairs: recoverySourcePairs,
      priorAssignments: oldAssignments,
      entropySource: () => Buffer.alloc(32, 0x31),
    });
    const second = buildFreshRecoveryRandomization({
      perspectiveId: "judge-02",
      evaluationPackageId:
        "blind-review-8fab36b45ab641b5",
      sourcePairs: recoverySourcePairs,
      priorAssignments: oldAssignments,
      priorRecoveryRandomizations: [first],
      entropySource: () => Buffer.alloc(32, 0x32),
    });
    expect(second.randomizationSha256).not.toBe(
      first.randomizationSha256,
    );
    expect(second.presentationSignature).not.toBe(
      first.presentationSignature,
    );
    expect(
      second.priorRecoveryRandomizationHashes,
    ).toEqual([first.randomizationSha256]);
  });

  it("treats one confirmed-unbilled forced-tool rejection as task-wide and forbids billed retries or replay", () => {
    const recoveryPlan = buildResponseRecoveryPlan({
      previousPlanHash: priorPlanHash,
      previousLedgerTerminalHash: "1".repeat(64),
      previousLedgerSha256: "2".repeat(64),
      previousLockSha256: "3".repeat(64),
      rejectedResponses: evidence,
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
    expect(() =>
      assertRecoveryReplacementDispatchAllowed({
        recoveryPlan,
        perspectiveId: "judge-01",
        mode: "PRIMARY_FORCED_TOOL_CALL",
        priorNewRequests: [],
      }),
    ).not.toThrow();
    const unsupported = [
      {
        requestIndex: 13,
        perspectiveId: "judge-01" as const,
        mode: "PRIMARY_FORCED_TOOL_CALL" as const,
        status: "FAILED_NOT_BILLED" as const,
        issueCodes: [
          "FORCED_TOOL_CALL_UNSUPPORTED",
        ],
      },
    ];
    expect(() =>
      assertRecoveryReplacementDispatchAllowed({
        recoveryPlan,
        perspectiveId: "judge-01",
        mode: "UNBILLED_PLAIN_JSON_FALLBACK",
        priorNewRequests: unsupported,
      }),
    ).not.toThrow();
    expect(() =>
      assertRecoveryReplacementDispatchAllowed({
        recoveryPlan,
        perspectiveId: "judge-02",
        mode: "UNBILLED_PLAIN_JSON_FALLBACK",
        priorNewRequests: unsupported,
      }),
    ).not.toThrow();
    expect(() =>
      assertRecoveryReplacementDispatchAllowed({
        recoveryPlan,
        perspectiveId: "judge-02",
        mode: "PRIMARY_FORCED_TOOL_CALL",
        priorNewRequests: unsupported,
      }),
    ).toThrow(/globally unsupported/iu);
    expect(() =>
      assertRecoveryReplacementDispatchAllowed({
        recoveryPlan,
        perspectiveId: "judge-01",
        mode: "UNBILLED_PLAIN_JSON_FALLBACK",
        priorNewRequests: [
          {
            ...unsupported[0]!,
            status: "REJECTED_BILLED",
            issueCodes: ["SCHEMA_INVALID"],
          },
        ],
      }),
    ).toThrow(/confirmed-unbilled/iu);
    expect(() =>
      assertRecoveryReplacementDispatchAllowed({
        recoveryPlan,
        perspectiveId: "judge-02",
        mode: "PRIMARY_FORCED_TOOL_CALL",
        priorNewRequests: [
          {
            ...unsupported[0]!,
            requestIndex: 12,
          },
        ],
      }),
    ).toThrow(/replay or relabel/iu);
  });

  it("creates a secure superseding recovery lock without changing the prior lock or ledger bytes", async () => {
    const phaseRoot = await mkdtemp(
      resolve(tmpdir(), "tenxpros-recovery-lock-test-"),
    );
    temporaryDirectories.push(phaseRoot);
    await chmod(phaseRoot, 0o700);
    const priorRunDirectory = resolve(
      phaseRoot,
      "phase2c-openrouter-bryce-20260726",
    );
    await mkdir(priorRunDirectory, { mode: 0o700 });
    const oldLockPath =
      await acquireTaskWidePaidExecutionLock({
        planHash: priorPlanHash,
        createdAt: "2026-07-26T20:49:57.924Z",
        processId: 1234,
        phaseRootForTest: phaseRoot,
      });
    const oldLedgerPath = resolve(
      priorRunDirectory,
      "ai-evaluation-ledger.jsonl",
    );
    await writeFile(
      oldLedgerPath,
      "immutable-old-ledger-bytes\n",
      { mode: 0o600 },
    );
    const oldLockBytes = await readFile(oldLockPath);
    const oldLedgerBytes = await readFile(oldLedgerPath);
    const priorSnapshot = {
      previousPlanHash: priorPlanHash,
      previousLedgerTerminalHash: "1".repeat(64),
      previousLedgerSha256: createHash("sha256")
        .update(oldLedgerBytes)
        .digest("hex"),
      previousLockSha256: createHash("sha256")
        .update(oldLockBytes)
        .digest("hex"),
      rejectedResponses: evidence,
      actualCostUsd: 3.54151 as const,
      externalRequests: 12 as const,
      uncertainCostUsd: 0 as const,
    } as const;
    const offline =
      await writeOfflineResponseRecoveryArtifacts({
        priorSnapshot,
        attempts: evidence.map((item) => ({
          evidence: item,
          status: "SOURCE_MISSING" as const,
          issueCodes: ["RAW_RESPONSE_BODY_MISSING"],
        })),
        correctedResponseSchemaSha256: "4".repeat(64),
        priorRunDirectory,
        phaseRootForTest: phaseRoot,
        now: () => "2026-07-27T00:00:00.000Z",
      });
    const plan = offline.recoveryPlan;
    const reportBytes = await readFile(
      offline.recoveryReportPath,
    );
    expect(reportBytes.toString("utf8")).toContain(
      "UNVERIFIED_BYTES_ABSENT",
    );
    expect(reportBytes.toString("utf8")).toContain(
      "New paid requests made during this offline pass: 0",
    );
    const recoveryLedgerLines = (
      await readFile(offline.recoveryLedgerPath, "utf8")
    )
      .trim()
      .split("\n");
    expect(recoveryLedgerLines).toHaveLength(18);
    expect(
      JSON.parse(recoveryLedgerLines.at(-1)!),
    ).toMatchObject({
      event:
        "OFFLINE_RECOVERY_REPORT_HASH_VERIFIED",
      data: {
        recoveryReportSha256: createHash("sha256")
          .update(reportBytes)
          .digest("hex"),
        reportReadAndHashedBeforeVerificationEvent: true,
      },
    });
    await expect(
      verifyOfflineRecoveryCompletionForPaidExecution({
        recoveryPlan: plan,
        priorRunDirectory,
      }),
    ).resolves.toMatchObject({
      recoveryReportSha256: createHash("sha256")
        .update(reportBytes)
        .digest("hex"),
    });
    expect(
      (
        await readdir(offline.recoveredResponsesDirectory)
      ).length,
    ).toBe(0);
    await writeFile(
      offline.recoveryReportPath,
      Buffer.concat([
        reportBytes,
        Buffer.from("\nTAMPERED\n", "utf8"),
      ]),
    );
    await expect(
      acquireResponseRecoveryRunLock({
        recoveryPlan: plan,
        createdAt: "2026-07-27T00:00:00.000Z",
        processId: 5678,
        priorRunDirectory,
        phaseRootForTest: phaseRoot,
      }),
    ).rejects.toThrow(/report hash/iu);
    await writeFile(offline.recoveryReportPath, reportBytes);
    const recoveryLockPath =
      await acquireResponseRecoveryRunLock({
        recoveryPlan: plan,
        createdAt: "2026-07-27T00:00:00.000Z",
        processId: 5678,
        priorRunDirectory,
        phaseRootForTest: phaseRoot,
      });
    expect((await lstat(recoveryLockPath)).mode & 0o777).toBe(
      0o600,
    );
    expect(await readFile(oldLockPath)).toEqual(oldLockBytes);
    expect(await readFile(oldLedgerPath)).toEqual(
      oldLedgerBytes,
    );
    expect(
      JSON.parse(await readFile(recoveryLockPath, "utf8")),
    ).toMatchObject({
      recoveryPlanHash: plan.recoveryPlanHash,
      supersedesWithoutDeletion: {
        priorPlanHash,
        priorLockSha256: plan.previousLockSha256,
        priorLedgerSha256: plan.previousLedgerSha256,
      },
      carriedForwardAccounting: {
        actualCostUsd: 3.54151,
        externalRequests: 12,
        uncertainCostUsd: 0,
      },
      cumulativeCaps: {
        maximumActualPlusUncertainCostUsd: 10,
        maximumExternalRequests: 24,
      },
      offlineRecoveryAttestation: {
        recoveryReportSha256: createHash("sha256")
          .update(reportBytes)
          .digest("hex"),
        completionEvent:
          "OFFLINE_RECOVERY_REPORT_HASH_VERIFIED",
      },
      replayProhibitedRequestIndexes: evidence.map(
        (item) => item.requestIndex,
      ),
    });
    await expect(
      acquireResponseRecoveryRunLock({
        recoveryPlan: plan,
        createdAt: "2026-07-27T00:01:00.000Z",
        priorRunDirectory,
        phaseRootForTest: phaseRoot,
      }),
    ).rejects.toThrow(/already locked/iu);
  });
});

describe("Phase 2C conditional tuning decision integration", () => {
  it("requires direct tuned table evidence instead of promoting a stale generic audit", () => {
    const original = tuningInputMetrics();
    const staleDuration = tuningEvaluationFixture(150);
    const staleMetrics = selectedTuningMetrics(
      original,
      staleDuration.selected,
      staleDuration.conditionalBaseline,
      staleDuration.draft,
      staleDuration.primaryPanel,
      staleDuration.subplan,
    );

    expect(staleMetrics.baselineNaturalnessMedian).toBe(4.1);
    expect(staleMetrics.tableCorrectedClearerRate).toBe(1);
    expect(staleMetrics.tableAddedDurationAcceptedRate).toBe(1);
    expect(staleMetrics.tableEfficiencyPass).toBe(false);
    expect(
      decideLocalNarration({
        bryce: original,
        tuning: {
          status: "COMPLETED_SELECTED",
          selectedMetrics: staleMetrics,
        },
      }).primaryDecision,
    ).toBe("TUNE_PIPER_PIPELINE");

    const improvedDuration = tuningEvaluationFixture(130);
    const improvedMetrics = selectedTuningMetrics(
      original,
      improvedDuration.selected,
      improvedDuration.conditionalBaseline,
      improvedDuration.draft,
      improvedDuration.primaryPanel,
      improvedDuration.subplan,
    );
    expect(improvedMetrics.tableEfficiencyPass).toBe(true);
    expect(
      decideLocalNarration({
        bryce: original,
        tuning: {
          status: "COMPLETED_SELECTED",
          selectedMetrics: improvedMetrics,
        },
      }).primaryDecision,
    ).toBe("PASS_PIPER_BRYCE");
  });

  it("does not treat an overall first-place ranking as a direct table-clarity majority", () => {
    const original = tuningInputMetrics();
    const rankingOnly = tuningEvaluationFixture(130, 1);
    const metrics = selectedTuningMetrics(
      original,
      rankingOnly.selected,
      rankingOnly.conditionalBaseline,
      rankingOnly.draft,
      rankingOnly.primaryPanel,
      rankingOnly.subplan,
    );

    expect(
      rankingOnly.selected.aheadOfCandidateVotesByExcerpt[
        "source-baseline"
      ]?.["sample-02"],
    ).toBe(3);
    expect(metrics.correctedOverallPreferenceRate).toBeGreaterThan(
      0.65,
    );
    expect(metrics.tableCorrectedClearerRate).toBeCloseTo(
      1 / 3,
      8,
    );
    expect(metrics.tableEfficiencyPass).toBe(false);
    expect(
      decideLocalNarration({
        bryce: original,
        tuning: {
          status: "COMPLETED_SELECTED",
          selectedMetrics: metrics,
        },
      }).primaryDecision,
    ).not.toBe("PASS_PIPER_BRYCE");
  });

  it("turns a conditional STOPPED_CAP into the budget-specific tuning result", () => {
    const original = tuningInputMetrics();
    const tuningStatus =
      incompleteTuningStatusForConditionalExecution(
        "STOPPED_CAP",
      );

    expect(tuningStatus).toBe("NOT_EXECUTED_BUDGET");
    expect(
      decideLocalNarration({
        bryce: original,
        tuning: {
          status: tuningStatus,
          evidence: ["The hard cap stopped the branch."],
        },
      }).primaryDecision,
    ).toBe("TUNING_RECOMMENDED_BUT_NOT_EXECUTED");
  });
});
