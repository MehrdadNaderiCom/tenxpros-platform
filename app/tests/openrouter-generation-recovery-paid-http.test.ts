import { createHash } from "node:crypto";
import {
  lstat,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { resolve } from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  phase2cPrimaryJudgeHttpTestHooks,
  type FreshRecoveryRandomization,
} from "../scripts/ai-audio-evaluation-cli";
import {
  buildPaidRecoveryPlan,
  executePaidGenerationRecovery,
  prepareLivePaidGenerationRecovery,
} from "../scripts/openrouter-generation-recovery-paid";
import { hashAiValue } from "../src/lib/academy/narration/ai-audio-evaluation";

const REPOSITORY_ROOT = resolve(process.cwd(), "..");
const HISTORICAL_RUN = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "ai-audio-evaluation",
  "phase2c-openrouter-bryce-20260726",
);
const PHASE_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "ai-audio-evaluation",
);
const FAKE_SECRET =
  "test-only-paid-recovery-secret-never-persist";
const FIXED_NOW = "2026-07-27T01:00:00.000Z";

const temporaryPaths: string[] = [];

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function usd(value: number): string {
  return value.toFixed(8);
}

function jsonUnicodeEscape(value: string): string {
  return [...value]
    .map(
      (character) =>
        `\\u${character
          .codePointAt(0)!
          .toString(16)
          .padStart(4, "0")}`,
    )
    .join("");
}

function parsePrompt(body: unknown): {
  assignmentId: string;
  judgeId: string;
  pairs: {
    pairId: string;
    table: boolean;
  }[];
} {
  const request = body as {
    messages: [
      unknown,
      {
        content: {
          type: string;
          text?: string;
        }[];
      },
    ];
  };
  const prompt = request.messages[1].content
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n");
  const assignmentId =
    /assignment\s+id\s+([^\s]+)\s+and\s+judge\s+id/iu.exec(
      prompt,
    )?.[1];
  const judgeId =
    /judge\s+id\s+(judge-0[1-5])/iu.exec(prompt)?.[1];
  const pairs = [...prompt.matchAll(
    /^-\s+(SET-[A-F0-9]{8,10}):[^\n]+(?:\s+\(also complete the table-following questions\))?$/gmu,
  )].map((match) => ({
    pairId: match[1]!,
    table: match[0].includes(
      "table-following questions",
    ),
  }));
  if (!assignmentId || !judgeId || pairs.length !== 5) {
    throw new Error("Could not parse blind test prompt");
  }
  return { assignmentId, judgeId, pairs };
}

function validArguments(body: unknown): string {
  const parsed = parsePrompt(body);
  const table = parsed.pairs.find((pair) => pair.table);
  if (!table) throw new Error("Missing table pair");
  return JSON.stringify({
    judge_metadata: {
      assignment_id: parsed.assignmentId,
      judge_id: parsed.judgeId,
      evidence_basis: "AUDIO_ONLY",
    },
    file_scores: parsed.pairs.flatMap((pair, pairIndex) =>
      (["A", "B"] as const).map((version) => ({
        pair_id: pair.pairId,
        version,
        scores: {
          naturalness: 4,
          pause_quality: 4,
          pronunciation: 4,
          clarity: 4,
          listening_comfort: 4,
          professional_quality: 4,
          long_form_suitability: 4,
        },
        evidence_note: `Audible evidence ${String(
          pairIndex + 1,
        )}-${version} is clear and comfortable.`,
      })),
    ),
    pair_evaluations: parsed.pairs.map(
      (pair, pairIndex) => ({
        pair_id: pair.pairId,
        preferred_version_overall: "tie",
        clearer_version: "tie",
        more_natural_version: "tie",
        better_paced_version: "tie",
        long_form_preference: "tie",
        speed_assessment: [
          {
            version: "A",
            too_slow: false,
            too_fast: false,
          },
          {
            version: "B",
            too_slow: false,
            too_fast: false,
          },
        ],
        pronunciation_findings: [],
        audible_distinction: "CLEAR",
        confidence: 75,
        reason: `The heard pacing difference in set ${String(
          pairIndex + 1,
        )} is not material.`,
      }),
    ),
    table_evaluation: {
      pair_id: table.pairId,
      clearer_version: "tie",
      repeated_labels_helpful: true,
      longer_version: "tie",
      longer_duration_excessive: false,
      clarity_justifies_added_duration: false,
      concise_table_variant_recommended: false,
      confidence: 75,
      reason:
        "Both table presentations are comparably clear and efficient.",
    },
    overall_assessment: {
      notes: `Independent ${parsed.judgeId} audio assessment is complete.`,
    },
    long_form_recommendation:
      "Either neutral presentation is suitable for longer professional listening.",
    confidence: 75,
  });
}

async function fixture() {
  const outputDirectory = await mkdtemp(
    resolve(PHASE_ROOT, "paid-recovery-http-test-"),
  );
  temporaryPaths.push(outputDirectory);
  const lockRoot = await mkdtemp(
    resolve(PHASE_ROOT, "paid-recovery-lock-test-"),
  );
  temporaryPaths.push(lockRoot);
  const frozen =
    await phase2cPrimaryJudgeHttpTestHooks.loadFrozenInput();
  const built =
    phase2cPrimaryJudgeHttpTestHooks.buildPlanAndPrivateManifest(
      frozen,
    );
  const sourcePairs =
    phase2cPrimaryJudgeHttpTestHooks.recoverySourcePairsFromFrozen(
      frozen,
    );
  const priorRecoveryRandomizations: FreshRecoveryRandomization[] =
    [];
  for (const judge of ["judge-01", "judge-02"]) {
    priorRecoveryRandomizations.push(
      JSON.parse(
        await readFile(
          resolve(
            HISTORICAL_RUN,
            "private",
            "recovery-randomizations",
            `${judge}.json`,
          ),
          "utf8",
        ),
      ) as FreshRecoveryRandomization,
    );
  }
  const objectiveArtifact = JSON.parse(
    await readFile(
      resolve(
        HISTORICAL_RUN,
        "objective-audio-analysis.json",
      ),
      "utf8",
    ),
  ) as Parameters<
    typeof phase2cPrimaryJudgeHttpTestHooks.objectiveSummaryFromArtifact
  >[1];
  const privateSamples =
    phase2cPrimaryJudgeHttpTestHooks.identityRecords(frozen);
  const objective =
    phase2cPrimaryJudgeHttpTestHooks.objectiveSummaryFromArtifact(
      frozen,
      objectiveArtifact,
    );
  const plan = buildPaidRecoveryPlan({
    retrievalPlanHash: "a".repeat(64),
    reconciliationSupplementSha256: "b".repeat(64),
    recoveryPlanHash: "c".repeat(64),
    frozenAudio: frozen.audio.map((sample) => ({
      sampleId: sample.sampleId,
      sha256: sample.sha256,
    })),
    priorAssignmentHashes: built.assignments.map(
      (assignment) => assignment.assignmentHash,
    ),
    priorRecoveryRandomizationHashes:
      priorRecoveryRandomizations.map(
        (item) => item.randomizationSha256,
      ),
    privateSamplesSha256: hashAiValue(privateSamples),
    objectiveAnalysisHash: objective.analysisHash,
    missingPerspectiveIds: [
      "judge-01",
      "judge-02",
      "judge-03",
      "judge-04",
      "judge-05",
    ],
  });
  let entropyCounter = 0;
  return {
    outputDirectory,
    lockPath: resolve(lockRoot, "paid.lock"),
    plan,
    frozen: {
      evaluationPackageId:
        "blind-review-8fab36b45ab641b5",
      audio: frozen.audio.map((sample) => ({
        sampleId: sample.sampleId,
        path: sample.path,
        sha256: sample.sha256,
      })),
      sourcePairs,
      priorAssignments: built.assignments,
      priorRecoveryRandomizations,
      privateSamples,
      objective,
    },
    entropySource: () => {
      entropyCounter += 1;
      return createHash("sha256")
        .update(`paid-http-test-${String(entropyCounter)}`)
        .digest();
    },
  };
}

function mockProvider(options: {
  invalidPost?: number;
  metadataFallbackPost?: number;
  forcedToolUnsupportedPost?: number;
  billedFourXxWithoutGenerationPost?: number;
  echoedInputAudioPost?: number;
  http402Post?: number;
  transportAmbiguityPost?: number;
  failKeyCall?: number;
  generationMetadataTextFailure?: boolean;
  unsafeHeaderPost?: number;
  encodedUnsafeHeaderPost?: number;
  unicodeEscapedCredentialPost?: number;
}) {
  let actualUsage = 3.54151;
  let postCount = 0;
  let keyCount = 0;
  let generationMetadataCount = 0;
  const requestBodies: unknown[] = [];
  const calls: { method: string; url: string }[] = [];
  const fetchImpl = async (
    url: string,
    init: {
      method?: string;
      headers?: Readonly<Record<string, string>>;
      body?: string;
    } = {},
  ) => {
    const method = init.method ?? "GET";
    calls.push({ method, url });
    expect(init.headers?.Authorization).toBe(
      `Bearer ${FAKE_SECRET}`,
    );
    if (url.endsWith("/key")) {
      keyCount += 1;
      if (options.failKeyCall === keyCount) {
        throw new Error(
          "Simulated current-key transport failure",
        );
      }
      return {
        ok: true,
        status: 200,
        headers: {
          get: () => null,
        },
        text: async () =>
          JSON.stringify({
            data: {
              label: "masked-provider-key-label",
              usage: usd(actualUsage),
              limit: "10.00000000",
              limit_remaining: usd(10 - actualUsage),
              is_management_key: false,
              is_provisioning_key: false,
              is_active: true,
              expires_at: "2027-07-27T00:00:00.000Z",
            },
          }),
      };
    }
    if (url.includes("/generation?id=")) {
      generationMetadataCount += 1;
      const generationId = decodeURIComponent(
        url.split("id=")[1]!,
      );
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => {
          if (options.generationMetadataTextFailure) {
            throw new Error(
              "Simulated metadata body failure",
            );
          }
          return JSON.stringify({
            data: {
              id: generationId,
              total_cost: "0.10000000",
              tokens_prompt: 100,
              tokens_completion: 100,
              provider_name: "OpenAI",
              finish_reason: "stop",
              model: "openai/gpt-audio",
            },
          });
        },
      };
    }
    if (!url.endsWith("/chat/completions")) {
      throw new Error(`Unexpected URL ${url}`);
    }
    postCount += 1;
    const body = JSON.parse(init.body ?? "null") as Record<
      string,
      unknown
    >;
    requestBodies.push(body);
    expect(body.response_format).toBeUndefined();
    if (body.tools === undefined) {
      expect(body.tool_choice).toBeUndefined();
    } else {
      expect(body.tool_choice).toEqual({
        type: "function",
        function: {
          name: "submit_audio_evaluation",
        },
      });
    }
    const messages = body.messages as {
      content: { type: string }[];
    }[];
    expect(
      messages[1]!.content.filter(
        (part) => part.type === "input_audio",
      ),
    ).toHaveLength(10);
    if (options.transportAmbiguityPost === postCount) {
      throw new Error(
        "Simulated ambiguous transport failure",
      );
    }
    if (options.http402Post === postCount) {
      return {
        ok: false,
        status: 402,
        headers: { get: () => null },
        text: async () =>
          JSON.stringify({
            error: {
              message: "Insufficient credits",
            },
            usage: { cost: "0.00000000" },
          }),
      };
    }
    if (
      options.forcedToolUnsupportedPost === postCount
    ) {
      return {
        ok: false,
        status: 400,
        headers: { get: () => null },
        text: async () =>
          JSON.stringify({
            error: {
              message:
                "Unsupported top-level parameter tools",
              param: "tools",
            },
          }),
      };
    }
    if (
      options.billedFourXxWithoutGenerationPost ===
      postCount
    ) {
      actualUsage += 0.1;
      return {
        ok: false,
        status: 400,
        headers: { get: () => null },
        text: async () =>
          JSON.stringify({
            error: {
              message: "Provider validation failure",
            },
          }),
      };
    }
    actualUsage += 0.1;
    const id = `gen-paid-test-${String(postCount).padStart(
      8,
      "0",
    )}`;
    const argumentsValue =
      options.invalidPost === postCount
        ? JSON.stringify({ incomplete: true })
        : validArguments(body);
    const plainMode = body.tools === undefined;
    return {
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (
            name.toLowerCase() ===
            "x-openrouter-generation-id"
          ) {
            return id;
          }
          if (
            name.toLowerCase() === "x-request-id" &&
            options.unsafeHeaderPost === postCount
          ) {
            return "Bearer sk-or-v1-ECHOED-CREDENTIAL";
          }
          if (
            name.toLowerCase() === "x-request-id" &&
            options.encodedUnsafeHeaderPost === postCount
          ) {
            return "\\u0073\\u006b\\u002dor\\u002dv1\\u002dENCODED";
          }
          return null;
        },
      },
      text: async () => {
        const serialized = JSON.stringify({
          id,
          usage: {
            prompt_tokens: 100,
            completion_tokens: 100,
            ...(options.metadataFallbackPost === postCount
              ? {}
              : { cost: "0.10000000" }),
          },
          choices: [
            {
              message: {
                content: plainMode
                  ? argumentsValue
                  : null,
                ...(plainMode
                  ? {}
                  : {
                      tool_calls: [
                        {
                          type: "function",
                          function: {
                            name: "submit_audio_evaluation",
                            arguments: argumentsValue,
                          },
                        },
                      ],
                    }),
              },
            },
          ],
          ...(options.echoedInputAudioPost === postCount
            ? {
                echo: {
                  input_audio: {
                    data: "ECHOED_BASE64_MUST_NOT_PERSIST",
                    format: "mp3",
                  },
                },
              }
            : {}),
        });
        if (
          options.unicodeEscapedCredentialPost ===
          postCount
        ) {
          return `${serialized.slice(
            0,
            -1,
          )},"\\u0061uthorization":"${jsonUnicodeEscape(
            FAKE_SECRET,
          )}"}`;
        }
        return serialized;
      },
    };
  };
  return {
    fetchImpl,
    stats: () => ({
      postCount,
      keyCount,
      generationMetadataCount,
      requestBodies,
      calls,
    }),
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
});

describe("paid OpenRouter generation-recovery HTTP integration", () => {
  it("prepares the exact live continuation read-only before any lock or secret read", async () => {
    const prepared =
      await prepareLivePaidGenerationRecovery({
        now: () => FIXED_NOW,
      });
    expect(prepared.execution.plan).toMatchObject({
      retrievalPlanHash:
        "d580401892d365ba0a29bde20e8044ada1058cd1105aaf5217f856bb5495c7f9",
      reconciliationSupplementSha256:
        "91485cb7852c2a51c0e5f7432cf00f4ba723014eef99a82334752f671a510bf0",
      recoveryPlanHash:
        "2284bae0ec6c4fbdac1f877050da57a5b5b8a3dfdb37d017e3d3313795ccf1b4",
      carriedActualCostUsd: "3.54151000",
      carriedMetadataGets: 24,
      missingPerspectiveIds: [
        "judge-01",
        "judge-02",
        "judge-03",
        "judge-04",
        "judge-05",
      ],
    });
    expect(prepared.execution.frozen.audio).toHaveLength(10);
  });

  it("runs five blind forced-tool judges, persists raw before parse, and falls back to generation cost metadata", async () => {
    const prepared = await fixture();
    const provider = mockProvider({
      metadataFallbackPost: 3,
    });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    const debugLedger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(result, debugLedger).toMatchObject({
      status: "COMPLETE",
      paidJudgePosts: 5,
      metadataGets: 31,
      cumulativeActualCostUsd: "4.04151000",
      validIndependentJudges: 5,
    });
    expect(provider.stats()).toMatchObject({
      postCount: 5,
      keyCount: 6,
      generationMetadataCount: 1,
    });
    const ledger = (
      await readFile(
        resolve(
          prepared.outputDirectory,
          "paid-generation-recovery-ledger.jsonl",
        ),
        "utf8",
      )
    )
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line) as {
            sequence: number;
            event: string;
            data: Record<string, unknown>;
          },
      );
    for (let post = 1; post <= 5; post += 1) {
      const persisted = ledger.find(
        (entry) =>
          entry.event ===
            "PAID_RAW_RESPONSE_PERSISTED" &&
          entry.data.transportPostIndex === post,
      );
      const accepted = ledger.find(
        (entry) =>
          entry.event === "PAID_RESPONSE_ACCEPTED" &&
          entry.data.transportPostIndex === post,
      );
      expect(persisted?.data).toMatchObject({
        exactRawBodyStored: true,
        semanticParseStarted: false,
      });
      expect(persisted!.sequence).toBeLessThan(
        accepted!.sequence,
      );
    }
    const publicLedger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(publicLedger).not.toContain(FAKE_SECRET);
    expect(publicLedger).not.toContain("input_audio");
    expect(publicLedger).not.toContain("sourceSampleId");
    const rawFiles = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        lstat(
          resolve(
            prepared.outputDirectory,
            "private",
            "paid-generation-recovery",
            "raw-responses",
            `${String(index + 1).padStart(2, "0")}-judge-0${String(
              index + 1,
            )}.http-body.txt`,
          ),
        ),
      ),
    );
    expect(
      rawFiles.every(
        (metadata) => (metadata.mode & 0o777) === 0o600,
      ),
    ).toBe(true);
  });

  it("counts a failed final key reconciliation once after five valid judges", async () => {
    const prepared = await fixture();
    const provider = mockProvider({ failKeyCall: 6 });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    expect(result).toMatchObject({
      status: "COMPLETE",
      physicalChatCompletionPosts: 5,
      paidJudgePosts: 5,
      metadataGets: 30,
      validIndependentJudges: 5,
      costStatus: "UNCERTAIN_PAID",
    });
    expect(provider.stats()).toMatchObject({
      postCount: 5,
      keyCount: 6,
    });
    const ledger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(ledger).toContain(
      '"event":"FINAL_KEY_RECONCILIATION_FAILED_UNCERTAIN"',
    );
  });

  it("does not retry a paid schema-invalid perspective", async () => {
    const prepared = await fixture();
    const provider = mockProvider({ invalidPost: 2 });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    expect(result).toMatchObject({
      status: "INCONCLUSIVE",
      paidJudgePosts: 5,
      validIndependentJudges: 4,
      primaryDecision:
        "INCONCLUSIVE_AI_ONLY_EVALUATION",
    });
    expect(provider.stats().postCount).toBe(5);
    const ledger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(
      ledger.match(
        /"event":"PAID_RESPONSE_INVALID_NO_RETRY"/gu,
      ),
    ).toHaveLength(1);
  });

  it("uses one exact plain fallback after a key-delta-zero tool rejection without exceeding five physical POSTs", async () => {
    const prepared = await fixture();
    const provider = mockProvider({
      forcedToolUnsupportedPost: 1,
    });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    expect(result).toMatchObject({
      status: "INCONCLUSIVE",
      paidJudgePosts: 4,
      physicalChatCompletionPosts: 5,
      validIndependentJudges: 4,
      taskDecision:
        "INCONCLUSIVE_AI_ONLY_EVALUATION",
    });
    const stats = provider.stats();
    expect(stats.postCount).toBe(5);
    expect(
      (
        stats.requestBodies[1] as Record<string, unknown>
      ).response_format,
    ).toBeUndefined();
    expect(
      (
        stats.requestBodies[1] as Record<string, unknown>
      ).tools,
    ).toBeUndefined();
    const ledger = (
      await readFile(
        resolve(
          prepared.outputDirectory,
          "paid-generation-recovery-ledger.jsonl",
        ),
        "utf8",
      )
    )
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line) as {
            entryHash: string;
            event: string;
            data: Record<string, unknown>;
          },
      );
    const rejection = ledger.find(
      (entry) =>
        entry.event ===
        "CONFIRMED_UNBILLED_TOOL_REJECTION",
    );
    expect(rejection?.data.transportPostIndex).toBe(1);
    const fallbackRecord = JSON.parse(
      await readFile(
        resolve(
          prepared.outputDirectory,
          "private",
          "paid-generation-recovery",
          "redacted-requests",
          "02-judge-01.json",
        ),
        "utf8",
      ),
    ) as {
      confirmedUnbilledTaskLocalEvidence: {
        transportPostIndex: number;
        ledgerEntryHash: string;
      };
    };
    expect(
      fallbackRecord.confirmedUnbilledTaskLocalEvidence,
    ).toEqual(
      expect.objectContaining({
        transportPostIndex: 1,
        ledgerEntryHash: rejection?.entryHash,
      }),
    );
  });

  it("settles an HTTP 4xx without generation ID from the after-key delta and never retries that perspective", async () => {
    const prepared = await fixture();
    const provider = mockProvider({
      billedFourXxWithoutGenerationPost: 1,
    });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    expect(result).toMatchObject({
      status: "INCONCLUSIVE",
      physicalChatCompletionPosts: 5,
      paidJudgePosts: 5,
      validIndependentJudges: 4,
      cumulativeActualCostUsd: "4.04151000",
    });
    const ledger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(ledger).toContain(
      '"event":"HTTP_4XX_NO_GENERATION_COST_RECONCILED"',
    );
    expect(ledger).toContain(
      '"costSource":"key.usage_delta"',
    );
    expect(
      provider.stats().requestBodies.filter((body) =>
        JSON.stringify(body).includes("judge-01"),
      ),
    ).toHaveLength(1);
  });

  it("redacts echoed input_audio and forbids semantic acceptance of that response", async () => {
    const prepared = await fixture();
    const provider = mockProvider({
      echoedInputAudioPost: 1,
      unsafeHeaderPost: 1,
    });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    expect(result).toMatchObject({
      status: "INCONCLUSIVE",
      physicalChatCompletionPosts: 5,
      paidJudgePosts: 5,
      validIndependentJudges: 4,
    });
    const artifact = await readFile(
      resolve(
        prepared.outputDirectory,
        "private",
        "paid-generation-recovery",
        "raw-responses",
        "01-judge-01.http-body.txt",
      ),
      "utf8",
    );
    expect(artifact).toContain(
      "[REDACTED_ECHOED_INPUT_AUDIO]",
    );
    expect(artifact).not.toContain(
      "ECHOED_BASE64_MUST_NOT_PERSIST",
    );
    const ledger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(ledger).toContain(
      '"event":"ECHOED_INPUT_AUDIO_REDACTED_NO_SEMANTIC_PARSE"',
    );
    expect(ledger).not.toContain(
      "ECHOED_BASE64_MUST_NOT_PERSIST",
    );
    expect(ledger).not.toContain(
      "sk-or-v1-ECHOED-CREDENTIAL",
    );
  });

  it("fails closed before persisting decoded Unicode credentials and omits encoded headers", async () => {
    const prepared = await fixture();
    const provider = mockProvider({
      encodedUnsafeHeaderPost: 1,
      unicodeEscapedCredentialPost: 2,
    });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    expect(result).toMatchObject({
      status: "INCONCLUSIVE",
      physicalChatCompletionPosts: 2,
      paidJudgePosts: 2,
      validIndependentJudges: 1,
      costStatus: "UNCERTAIN_PAID",
    });
    expect(provider.stats().postCount).toBe(2);
    await expect(
      lstat(
        resolve(
          prepared.outputDirectory,
          "private",
          "paid-generation-recovery",
          "raw-responses",
          "02-judge-02.http-body.txt",
        ),
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const ledger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(ledger).toContain(
      '"event":"PAID_RESPONSE_PERSISTENCE_FAILED_UNCERTAIN_NO_RETRY"',
    );
    expect(ledger).not.toContain(FAKE_SECRET);
    expect(ledger).not.toContain("\\u0073\\u006b");
    expect(ledger).not.toContain("\\u0061uthorization");
  });

  it("stops immediately on HTTP 402 with no later POST", async () => {
    const prepared = await fixture();
    const provider = mockProvider({ http402Post: 1 });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    expect(result).toMatchObject({
      status: "INCONCLUSIVE",
      physicalChatCompletionPosts: 1,
      paidJudgePosts: 1,
      validIndependentJudges: 0,
      cumulativeActualCostUsd: "3.54151000",
      costStatus: "RECONCILED_EXACT",
    });
    expect(provider.stats().postCount).toBe(1);
    const ledger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(ledger).toContain(
      '"event":"HTTP_402_FAIL_CLOSED"',
    );
  });

  it("reports ambiguous transport exposure fail-closed without retrying", async () => {
    const prepared = await fixture();
    const provider = mockProvider({
      transportAmbiguityPost: 1,
    });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    expect(result).toMatchObject({
      status: "INCONCLUSIVE",
      physicalChatCompletionPosts: 1,
      paidJudgePosts: 1,
      validIndependentJudges: 0,
      cumulativeActualCostUsd: "3.54151000",
      costStatus: "UNCERTAIN_PAID",
      maximumUncertainCostUsd: "6.45849000",
      capAccountedCostUsd: "10.00000000",
    });
    expect(provider.stats().postCount).toBe(1);
    const ledger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(ledger).toContain(
      '"event":"PAID_POST_UNCERTAIN_NO_RETRY"',
    );
    expect(ledger).toContain(
      '"costStatus":"UNCERTAIN_PAID"',
    );
  });

  it("settles the original 4xx POST uncertain when its after-key reconciliation fails", async () => {
    const prepared = await fixture();
    const provider = mockProvider({
      billedFourXxWithoutGenerationPost: 1,
      failKeyCall: 2,
    });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    expect(result).toMatchObject({
      status: "INCONCLUSIVE",
      physicalChatCompletionPosts: 1,
      paidJudgePosts: 1,
      costStatus: "UNCERTAIN_PAID",
      capAccountedCostUsd: "10.00000000",
    });
    expect(provider.stats().postCount).toBe(1);
    const ledger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(ledger).toContain(
      "POST_4XX_KEY_RECONCILIATION_FAILED",
    );
  });

  it("settles the original POST uncertain when generation-cost metadata cannot be durably read", async () => {
    const prepared = await fixture();
    const provider = mockProvider({
      metadataFallbackPost: 1,
      generationMetadataTextFailure: true,
    });
    const result = await executePaidGenerationRecovery({
      ...prepared,
      fetchImpl: provider.fetchImpl,
      readSecret: async () => FAKE_SECRET,
      now: () => FIXED_NOW,
    });

    expect(result).toMatchObject({
      status: "INCONCLUSIVE",
      physicalChatCompletionPosts: 1,
      paidJudgePosts: 1,
      costStatus: "UNCERTAIN_PAID",
      capAccountedCostUsd: "10.00000000",
    });
    expect(provider.stats()).toMatchObject({
      postCount: 1,
      generationMetadataCount: 1,
    });
    const ledger = await readFile(
      resolve(
        prepared.outputDirectory,
        "paid-generation-recovery-ledger.jsonl",
      ),
      "utf8",
    );
    expect(ledger).toContain(
      '"event":"GENERATION_COST_FALLBACK_UNCERTAIN"',
    );
    expect(ledger).toContain(
      '"event":"PAID_POST_UNCERTAIN_NO_RETRY"',
    );
  });
});
