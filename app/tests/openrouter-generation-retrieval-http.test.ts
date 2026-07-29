import { createHash } from "node:crypto";
import {
  appendFile,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  executePreparedGenerationRetrieval,
  prepareGenerationRetrievalRun,
  prepareGenerationRetrievalResumeRun,
  reconcileCompletedGenerationRetrievalOffline,
  runAiAudioEvaluationCli,
} from "../scripts/ai-audio-evaluation-cli";
import {
  OPENROUTER_HISTORICAL_TOOL_NAME,
} from "../src/lib/academy/narration/openrouter-generation-retrieval";

const REPOSITORY_ROOT = resolve(process.cwd(), "..");
const PHASE_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "ai-audio-evaluation",
);
const HISTORICAL_RUN = resolve(
  PHASE_ROOT,
  "phase2c-openrouter-bryce-20260726",
);
const FIXED_NOW = "2026-07-26T12:00:00.000Z";
const FAKE_SECRET =
  "test-only-openrouter-secret-never-persist";

const temporaryDirectories: string[] = [];

function sha256(value: string | Buffer): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

async function sha256File(path: string): Promise<string> {
  return sha256(await readFile(path));
}

async function copyHistoricalBindings(
  outputDirectory: string,
): Promise<void> {
  const relativeFiles = [
    "ai-evaluation-plan.json",
    "ai-evaluation-ledger.jsonl",
    "private-ai-manifest.json",
    "response-recovery-plan.json",
    "response-recovery-ledger.jsonl",
    "private/api-records/openrouter-preflight-summary.json",
    "private/recovery-api-records/16-judge-01-unbilled_format_fallback-raw-response.txt",
  ] as const;
  await mkdir(
    resolve(outputDirectory, "private", "api-records"),
    { recursive: true, mode: 0o700 },
  );
  await mkdir(
    resolve(
      outputDirectory,
      "private",
      "recovery-api-records",
    ),
    { recursive: true, mode: 0o700 },
  );
  await Promise.all(
    relativeFiles.map(async (relativePath) => {
      await copyFile(
        resolve(HISTORICAL_RUN, relativePath),
        resolve(outputDirectory, relativePath),
      );
    }),
  );
}

async function preparedRetrieval() {
  const outputDirectory = await mkdtemp(
    resolve(PHASE_ROOT, "retrieval-http-test-"),
  );
  temporaryDirectories.push(outputDirectory);
  await copyHistoricalBindings(outputDirectory);
  const prepared = await prepareGenerationRetrievalRun({
    outputDirectory,
    phaseRootForTest: resolve(
      outputDirectory,
      "test-lock-root",
    ),
    now: () => FIXED_NOW,
  });
  return { outputDirectory, prepared };
}

async function interruptedResumeFixture() {
  const outputDirectory = await mkdtemp(
    resolve(PHASE_ROOT, "retrieval-resume-test-"),
  );
  temporaryDirectories.push(outputDirectory);
  await copyHistoricalBindings(outputDirectory);
  await mkdir(
    resolve(
      outputDirectory,
      "openrouter-generation-content",
    ),
    { mode: 0o700 },
  );
  await mkdir(
    resolve(
      outputDirectory,
      "openrouter-generation-metadata",
    ),
    { mode: 0o700 },
  );
  await copyFile(
    resolve(
      HISTORICAL_RUN,
      "generation-retrieval-plan.json",
    ),
    resolve(
      outputDirectory,
      "generation-retrieval-plan.json",
    ),
  );
  const interruptedLedgerPrefix = (
    await readFile(
      resolve(
        HISTORICAL_RUN,
        "generation-retrieval-ledger.jsonl",
      ),
      "utf8",
    )
  )
    .split("\n")
    .filter(Boolean)
    .slice(0, 7)
    .join("\n");
  await writeFile(
    resolve(
      outputDirectory,
      "generation-retrieval-ledger.jsonl",
    ),
    `${interruptedLedgerPrefix}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  const firstGenerationId =
    "gen-1785098999-kONSJ7QUKSoo5Bx767YX";
  await copyFile(
    resolve(
      HISTORICAL_RUN,
      "openrouter-generation-content",
      `${firstGenerationId}.http-body.txt`,
    ),
    resolve(
      outputDirectory,
      "openrouter-generation-content",
      `${firstGenerationId}.http-body.txt`,
    ),
  );
  const lockRoot = resolve(
    outputDirectory,
    "test-lock-root",
  );
  await mkdir(lockRoot, { mode: 0o700 });
  const lockPath = resolve(
    lockRoot,
    ".phase2c-openrouter-generation-retrieval.lock",
  );
  await copyFile(
    resolve(
      PHASE_ROOT,
      ".phase2c-openrouter-generation-retrieval.lock",
    ),
    lockPath,
  );
  return {
    outputDirectory,
    lockRoot,
    lockPath,
    firstGenerationId,
  };
}

async function secondInterruptedResumeFixture() {
  const outputDirectory = await mkdtemp(
    resolve(
      PHASE_ROOT,
      "retrieval-second-resume-test-",
    ),
  );
  temporaryDirectories.push(outputDirectory);
  await copyHistoricalBindings(outputDirectory);
  const contentDirectory = resolve(
    outputDirectory,
    "openrouter-generation-content",
  );
  const metadataDirectory = resolve(
    outputDirectory,
    "openrouter-generation-metadata",
  );
  await mkdir(contentDirectory, { mode: 0o700 });
  await mkdir(metadataDirectory, { mode: 0o700 });
  const planSource = resolve(
    HISTORICAL_RUN,
    "generation-retrieval-plan.json",
  );
  const planPath = resolve(
    outputDirectory,
    "generation-retrieval-plan.json",
  );
  await copyFile(planSource, planPath);
  const plan = JSON.parse(
    await readFile(planPath, "utf8"),
  ) as {
    historicalGenerations: {
      generationId: string;
    }[];
  };
  const generationIds =
    plan.historicalGenerations.map(
      (binding) => binding.generationId,
    );
  const interruptedLedgerPrefix = (
    await readFile(
      resolve(
        HISTORICAL_RUN,
        "generation-retrieval-ledger.jsonl",
      ),
      "utf8",
    )
  )
    .split("\n")
    .filter(Boolean)
    .slice(0, 88)
    .join("\n");
  await writeFile(
    resolve(
      outputDirectory,
      "generation-retrieval-ledger.jsonl",
    ),
    `${interruptedLedgerPrefix}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await Promise.all(
    generationIds.flatMap((generationId) => [
      copyFile(
        resolve(
          HISTORICAL_RUN,
          "openrouter-generation-content",
          `${generationId}.http-body.txt`,
        ),
        resolve(
          contentDirectory,
          `${generationId}.http-body.txt`,
        ),
      ),
      copyFile(
        resolve(
          HISTORICAL_RUN,
          "openrouter-generation-metadata",
          `${generationId}.http-body.txt`,
        ),
        resolve(
          metadataDirectory,
          `${generationId}.http-body.txt`,
        ),
      ),
    ]),
  );
  const lockRoot = resolve(
    outputDirectory,
    "test-lock-root",
  );
  await mkdir(lockRoot, { mode: 0o700 });
  const lockPath = resolve(
    lockRoot,
    ".phase2c-openrouter-generation-retrieval.lock",
  );
  await copyFile(
    resolve(
      PHASE_ROOT,
      ".phase2c-openrouter-generation-retrieval.lock",
    ),
    lockPath,
  );
  return {
    outputDirectory,
    contentDirectory,
    metadataDirectory,
    lockRoot,
    lockPath,
    generationIds,
  };
}

async function completedOfflineReconciliationFixture() {
  const outputDirectory = await mkdtemp(
    resolve(
      PHASE_ROOT,
      "retrieval-offline-reconcile-test-",
    ),
  );
  temporaryDirectories.push(outputDirectory);
  await copyHistoricalBindings(outputDirectory);
  const contentDirectory = resolve(
    outputDirectory,
    "openrouter-generation-content",
  );
  const metadataDirectory = resolve(
    outputDirectory,
    "openrouter-generation-metadata",
  );
  await mkdir(contentDirectory, { mode: 0o700 });
  await mkdir(metadataDirectory, { mode: 0o700 });
  const planPath = resolve(
    outputDirectory,
    "generation-retrieval-plan.json",
  );
  await copyFile(
    resolve(
      HISTORICAL_RUN,
      "generation-retrieval-plan.json",
    ),
    planPath,
  );
  const plan = JSON.parse(
    await readFile(planPath, "utf8"),
  ) as {
    historicalGenerations: {
      generationId: string;
    }[];
  };
  const generationIds =
    plan.historicalGenerations.map(
      (binding) => binding.generationId,
    );
  const ledgerPath = resolve(
    outputDirectory,
    "generation-retrieval-ledger.jsonl",
  );
  const completedLedgerPrefix = (
    await readFile(
      resolve(
        HISTORICAL_RUN,
        "generation-retrieval-ledger.jsonl",
      ),
      "utf8",
    )
  )
    .split("\n")
    .filter(Boolean)
    .slice(0, 109)
    .join("\n");
  await writeFile(
    ledgerPath,
    `${completedLedgerPrefix}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  const evidencePath = resolve(
    outputDirectory,
    "generation-retrieval-evidence-manifest.json",
  );
  const reportPath = resolve(
    outputDirectory,
    "generation-retrieval-report.md",
  );
  await copyFile(
    resolve(
      HISTORICAL_RUN,
      "generation-retrieval-evidence-manifest.json",
    ),
    evidencePath,
  );
  await copyFile(
    resolve(
      HISTORICAL_RUN,
      "generation-retrieval-report.md",
    ),
    reportPath,
  );
  await Promise.all(
    generationIds.flatMap((generationId) => [
      copyFile(
        resolve(
          HISTORICAL_RUN,
          "openrouter-generation-content",
          `${generationId}.http-body.txt`,
        ),
        resolve(
          contentDirectory,
          `${generationId}.http-body.txt`,
        ),
      ),
      copyFile(
        resolve(
          HISTORICAL_RUN,
          "openrouter-generation-metadata",
          `${generationId}.http-body.txt`,
        ),
        resolve(
          metadataDirectory,
          `${generationId}.http-body.txt`,
        ),
      ),
    ]),
  );
  for (const filename of [
    "current-key-before.http-body.txt",
    "current-key-after.http-body.txt",
  ]) {
    await copyFile(
      resolve(
        HISTORICAL_RUN,
        "openrouter-generation-metadata",
        filename,
      ),
      resolve(metadataDirectory, filename),
    );
  }
  const lockRoot = resolve(
    outputDirectory,
    "test-lock-root",
  );
  await mkdir(lockRoot, { mode: 0o700 });
  const lockPath = resolve(
    lockRoot,
    ".phase2c-openrouter-generation-retrieval.lock",
  );
  await copyFile(
    resolve(
      PHASE_ROOT,
      ".phase2c-openrouter-generation-retrieval.lock",
    ),
    lockPath,
  );
  return {
    outputDirectory,
    contentDirectory,
    metadataDirectory,
    planPath,
    ledgerPath,
    evidencePath,
    reportPath,
    lockRoot,
    lockPath,
    generationIds,
  };
}

function responseLike(
  payload: unknown,
  status = 200,
) {
  const body = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get() {
        return null;
      },
    },
    async text() {
      return body;
    },
    async json() {
      return payload;
    },
  };
}

function contentPayload(
  generationId: string,
): unknown {
  return {
    data: {
      id: generationId,
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                type: "function",
                function: {
                  name:
                    OPENROUTER_HISTORICAL_TOOL_NAME,
                  arguments: JSON.stringify({
                    recovered_generation: generationId,
                  }),
                },
              },
            ],
          },
        },
      ],
    },
  };
}

type Prepared = Awaited<
  ReturnType<typeof preparedRetrieval>
>["prepared"];

function successfulMetadataFetch(input: {
  prepared: Prepared;
  calls: {
    url: string;
    method: string;
  }[];
  unavailableContentIds?: ReadonlyMap<
    string,
    403 | 404
  >;
  invalidContentId?: string;
  metadataMutator?: (
    generationId: string,
    payload: Record<string, unknown>,
  ) => void;
  malformedSecondKey?: boolean;
  includeNumericAudioCount?: boolean;
}) {
  let keyReading = 0;
  return async (url: string, init?: RequestInit) => {
    const method = String(init?.method ?? "GET");
    input.calls.push({ url, method });
    const parsedUrl = new URL(url);
    const generationId =
      parsedUrl.searchParams.get("id");
    if (parsedUrl.pathname.endsWith("/key")) {
      keyReading += 1;
      if (
        input.malformedSecondKey &&
        keyReading === 2
      ) {
        return responseLike({
          data: {
            usage: "not-a-decimal",
            limit: 10,
            limit_remaining: 6.45849,
            is_provisioning_key: false,
            is_active: true,
          },
        });
      }
      return responseLike({
        data: {
          usage: 3.54151,
          limit: 10,
          limit_remaining: 6.45849,
          expires_at: null,
          is_provisioning_key: false,
          is_active: true,
        },
      });
    }
    if (!generationId) {
      throw new Error("Missing generation ID");
    }
    if (
      parsedUrl.pathname.endsWith(
        "/generation/content",
      )
    ) {
      const unavailable =
        input.unavailableContentIds?.get(
          generationId,
        );
      if (unavailable) {
        return responseLike(
          { error: { message: "unavailable" } },
          unavailable,
        );
      }
      if (generationId === input.invalidContentId) {
        return responseLike({
          data: {
            id: generationId,
            prompt: "must never be mistaken for output",
          },
        });
      }
      return responseLike(
        contentPayload(generationId),
      );
    }
    if (parsedUrl.pathname.endsWith("/generation")) {
      const binding =
        input.prepared.plan.historicalGenerations.find(
          (candidate) =>
            candidate.generationId === generationId,
        );
      if (!binding) {
        throw new Error(
          "Unknown mocked generation ID",
        );
      }
      const payload: Record<string, unknown> = {
        id: generationId,
        total_cost: binding.oldActualCostUsd,
        tokens_prompt:
          binding.oldUsage.promptTokens,
        tokens_completion:
          binding.oldUsage.completionTokens,
        provider_name: "OpenAI",
        finish_reason: "tool_calls",
        model: "openai/gpt-audio",
        ...(input.includeNumericAudioCount
          ? { num_input_audio_prompt: 1 }
          : {}),
      };
      input.metadataMutator?.(
        generationId,
        payload,
      );
      return responseLike({ data: payload });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
}

async function ledgerEntries(
  outputDirectory: string,
): Promise<
  {
    sequence: number;
    event: string;
    data: Record<string, unknown>;
    previousHash: string;
    entryHash: string;
  }[]
> {
  return (await readFile(
    resolve(
      outputDirectory,
      "generation-retrieval-ledger.jsonl",
    ),
    "utf8",
  ))
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as {
          sequence: number;
          event: string;
          data: Record<string, unknown>;
          previousHash: string;
          entryHash: string;
        },
    );
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(async (directory) => {
        await rm(directory, {
          recursive: true,
          force: true,
        });
      }),
  );
});

describe("OpenRouter generation retrieval HTTP orchestration", () => {
  it("performs exactly 22 ordered GETs, continues after 403/404, stores before parsing, and clears stable accounting", async () => {
    const historicalLedgerPath = resolve(
      HISTORICAL_RUN,
      "ai-evaluation-ledger.jsonl",
    );
    const oldLedgerShaBefore = await sha256File(
      historicalLedgerPath,
    );
    const { outputDirectory, prepared } =
      await preparedRetrieval();
    const ids =
      prepared.plan.historicalGenerations.map(
        (binding) => binding.generationId,
      );
    const calls: {
      url: string;
      method: string;
    }[] = [];
    const fetchImpl = successfulMetadataFetch({
      prepared,
      calls,
      unavailableContentIds: new Map([
        [ids[0]!, 403],
        [ids[1]!, 404],
      ]),
      invalidContentId: ids[2],
    });

    const result =
      await executePreparedGenerationRetrieval({
        prepared,
        secret: FAKE_SECRET,
        fetchImpl,
        now: () => FIXED_NOW,
      });

    expect(calls).toHaveLength(22);
    expect(
      calls.every((call) => call.method === "GET"),
    ).toBe(true);
    expect(
      calls.some((call) =>
        call.url.endsWith("/chat/completions"),
      ),
    ).toBe(false);
    expect(
      calls.map((call) => {
        const url = new URL(call.url);
        return {
          path: url.pathname,
          id: url.searchParams.get("id"),
        };
      }),
    ).toEqual([
      ...ids.flatMap((id) => [
        {
          path: "/api/v1/generation/content",
          id,
        },
        {
          path: "/api/v1/generation",
          id,
        },
      ]),
      { path: "/api/v1/key", id: null },
      { path: "/api/v1/key", id: null },
    ]);
    expect(result).toMatchObject({
      generationContentsRecovered: 7,
      generationMetadataRecovered: 10,
      generationMetadataGets: 22,
      exactHistoricalCostUsd: "3.54151000",
      paidJudgePostsMade: 0,
    });
    expect(result.reconciliation).toMatchObject({
      status: "UNCERTAIN_COST_CLEARED",
      canContinuePaidInference: true,
      unresolvedActualDeltaQuanta: 0n,
    });

    const entries = await ledgerEntries(
      outputDirectory,
    );
    const invalid = entries.find(
      (entry) =>
        entry.event ===
          "GENERATION_CONTENT_INVALID" &&
        entry.data.generationId === ids[2],
    );
    const stored = entries.find(
      (entry) =>
        entry.event ===
          "METADATA_RESPONSE_STORED" &&
        entry.data.generationId === ids[2] &&
        entry.data.kind === "GENERATION_CONTENT",
    );
    expect(stored?.sequence).toBeLessThan(
      invalid?.sequence ?? 0,
    );
    expect(stored?.data).toMatchObject({
      storedBeforeSemanticParse: true,
      exactRawBodyStored: true,
      sanitizedArtifactStored: false,
      fileMode: "0600",
    });
    expect(
      entries.filter(
        (entry) =>
          entry.event === "METADATA_GET_RESERVED",
      ),
    ).toHaveLength(22);
    expect(entries.at(-1)?.event).toBe(
      "GENERATION_RETRIEVAL_COMPLETED",
    );

    const evidence = JSON.parse(
      await readFile(
        resolve(
          outputDirectory,
          "generation-retrieval-evidence-manifest.json",
        ),
        "utf8",
      ),
    ) as {
      requestCounts: {
        totalMetadataGets: number;
        chatCompletionPosts: number;
      };
      contentOutcomes: unknown[];
      metadataOutcomes: unknown[];
      currentKeyReadings: unknown[];
    };
    expect(evidence.requestCounts).toEqual(
      expect.objectContaining({
        totalMetadataGets: 22,
        chatCompletionPosts: 0,
      }),
    );
    expect(evidence.contentOutcomes).toHaveLength(10);
    expect(evidence.metadataOutcomes).toHaveLength(10);
    expect(evidence.currentKeyReadings).toHaveLength(2);

    for (const path of [
      outputDirectory,
      resolve(
        outputDirectory,
        "openrouter-generation-content",
      ),
      resolve(
        outputDirectory,
        "openrouter-generation-metadata",
      ),
    ]) {
      expect((await lstat(path)).mode & 0o777).toBe(
        0o700,
      );
    }
    for (const path of [
      resolve(
        outputDirectory,
        "generation-retrieval-plan.json",
      ),
      resolve(
        outputDirectory,
        "generation-retrieval-ledger.jsonl",
      ),
      resolve(
        outputDirectory,
        "generation-retrieval-evidence-manifest.json",
      ),
      resolve(
        outputDirectory,
        "openrouter-generation-content",
        `${ids[0]!}.http-body.txt`,
      ),
      resolve(
        outputDirectory,
        "openrouter-generation-metadata",
        "current-key-after.http-body.txt",
      ),
    ]) {
      expect((await lstat(path)).mode & 0o777).toBe(
        0o600,
      );
    }
    expect(await sha256File(historicalLedgerPath)).toBe(
      oldLedgerShaBefore,
    );
  });

  it("resumes only the exact seven-entry live prefix, preserves request 1, retries request 2 as request 3, and settles at 23 reservations", async () => {
    const fixture =
      await interruptedResumeFixture();
    const originalLedger = (
      await ledgerEntries(fixture.outputDirectory)
    ).map((entry) => ({
      sequence: entry.sequence,
      event: entry.event,
      data: entry.data,
      previousHash: entry.previousHash,
      entryHash: entry.entryHash,
    }));
    const lockShaBefore = await sha256File(
      fixture.lockPath,
    );
    const oldRecoveryLedgerPath = resolve(
      HISTORICAL_RUN,
      "response-recovery-ledger.jsonl",
    );
    const oldRecoveryLedgerShaBefore =
      await sha256File(oldRecoveryLedgerPath);
    const prepared =
      await prepareGenerationRetrievalResumeRun({
        outputDirectory: fixture.outputDirectory,
        phaseRootForTest: fixture.lockRoot,
        now: () => FIXED_NOW,
      });
    const calls: {
      url: string;
      method: string;
    }[] = [];

    const result =
      await executePreparedGenerationRetrieval({
        prepared,
        secret: FAKE_SECRET,
        fetchImpl: successfulMetadataFetch({
          prepared,
          calls,
          includeNumericAudioCount: true,
        }),
        now: () => FIXED_NOW,
      });

    expect(calls).toHaveLength(21);
    expect(
      calls.every((call) => call.method === "GET"),
    ).toBe(true);
    expect(
      calls.some((call) =>
        call.url.endsWith("/chat/completions"),
      ),
    ).toBe(false);
    const ids =
      prepared.plan.historicalGenerations.map(
        (binding) => binding.generationId,
      );
    expect(
      calls.map((call) => {
        const url = new URL(call.url);
        return {
          path: url.pathname,
          id: url.searchParams.get("id"),
        };
      }),
    ).toEqual([
      {
        path: "/api/v1/generation",
        id: ids[0],
      },
      ...ids.slice(1).flatMap((id) => [
        {
          path: "/api/v1/generation/content",
          id,
        },
        {
          path: "/api/v1/generation",
          id,
        },
      ]),
      { path: "/api/v1/key", id: null },
      { path: "/api/v1/key", id: null },
    ]);
    expect(result).toMatchObject({
      generationContentsRecovered: 9,
      generationMetadataRecovered: 10,
      generationMetadataGets: 23,
      exactHistoricalCostUsd: "3.54151000",
    });
    expect(result.reconciliation).toMatchObject({
      status: "UNCERTAIN_COST_CLEARED",
      canContinuePaidInference: true,
    });

    const entries = await ledgerEntries(
      fixture.outputDirectory,
    );
    expect(
      entries.slice(0, 7).map((entry) => ({
        sequence: entry.sequence,
        event: entry.event,
        data: entry.data,
        previousHash: entry.previousHash,
        entryHash: entry.entryHash,
      })),
    ).toEqual(originalLedger);
    expect(entries[7]).toMatchObject({
      sequence: 8,
      event:
        "METADATA_RESPONSE_PERSISTENCE_FAILED",
      data: {
        requestIndex: 2,
        failedBeforeDurableBodyPersistence: true,
        retryPermittedAsNewReservation: true,
      },
    });
    expect(entries[8]).toMatchObject({
      sequence: 9,
      event: "GENERATION_RETRIEVAL_RESUMED",
      data: {
        interruptedRequestIndex: 2,
        staleOriginalProcessVerifiedAbsent: true,
        existingLockReusedWithoutMutation: true,
        retryWillUseNewRequestIndex: 3,
      },
    });
    const retryReservation = entries.find(
      (entry) =>
        entry.event ===
          "METADATA_GET_RESERVED" &&
        entry.data.requestIndex === 3,
    );
    expect(retryReservation?.data).toMatchObject({
      kind: "GENERATION_METADATA",
      generationId: ids[0],
      retryOfRequestIndex: 2,
    });
    expect(
      entries.filter(
        (entry) =>
          entry.event ===
            "METADATA_GET_RESERVED" &&
          entry.data.kind === "GENERATION_CONTENT" &&
          entry.data.generationId === ids[0],
      ),
    ).toHaveLength(1);
    expect(
      entries.filter(
        (entry) =>
          entry.event === "METADATA_GET_RESERVED",
      ),
    ).toHaveLength(23);
    expect(entries.at(-1)?.event).toBe(
      "GENERATION_RETRIEVAL_COMPLETED",
    );
    const retryStored = entries.find(
      (entry) =>
        entry.event ===
          "METADATA_RESPONSE_STORED" &&
        entry.data.requestIndex === 3,
    );
    expect(retryStored?.data).toMatchObject({
      exactRawBodyStored: true,
      sanitizedArtifactStored: false,
      inputAudioRedactionCount: 0,
      storedBeforeSemanticParse: true,
    });
    const retryArtifact = await readFile(
      resolve(
        fixture.outputDirectory,
        "openrouter-generation-metadata",
        `${ids[0]!}.http-body.txt`,
      ),
      "utf8",
    );
    expect(retryArtifact).toContain(
      '"num_input_audio_prompt":1',
    );
    expect(await sha256File(fixture.lockPath)).toBe(
      lockShaBefore,
    );
    expect(
      await sha256File(oldRecoveryLedgerPath),
    ).toBe(oldRecoveryLedgerShaBefore);
  });

  it("resumes the exact 88-entry live prefix, reconstructs all 20 generation outcomes offline with native-token correction overlays, and dispatches only key requests 23 and 24", async () => {
    const fixture =
      await secondInterruptedResumeFixture();
    const originalLedger = await ledgerEntries(
      fixture.outputDirectory,
    );
    expect(originalLedger).toHaveLength(88);
    expect(
      await sha256File(
        resolve(
          fixture.outputDirectory,
          "generation-retrieval-ledger.jsonl",
        ),
      ),
    ).toBe(
      "6160ee2067d50ea185f4c173461d07afabde53b5a5c404b131c237fe4c5e6947",
    );
    expect(originalLedger.at(-1)).toMatchObject({
      sequence: 88,
      event:
        "METADATA_RESPONSE_PERSISTENCE_FAILED",
      entryHash:
        "8a5afc27328fb3cf34c7b41889cf6336b8dbbe17b1cb9d104cc5a2c09e03e4eb",
      data: {
        requestIndex: 22,
        kind: "CURRENT_KEY_BEFORE",
        rawBodySha256:
          "298090c6b1e36bd5d3419878eddfe38a14a79fd1f4963116831b931a17394de8",
      },
    });
    const lockShaBefore = await sha256File(
      fixture.lockPath,
    );
    const prepared =
      await prepareGenerationRetrievalResumeRun({
        outputDirectory: fixture.outputDirectory,
        phaseRootForTest: fixture.lockRoot,
        now: () => FIXED_NOW,
      });
    expect(prepared.resume).toMatchObject({
      stage: "AFTER_REQUEST_22",
      interruptedRequestIndex: 22,
      priorMetadataGetReservations: 22,
      completedGenerationOutcomes: 20,
    });
    const calls: {
      url: string;
      method: string;
    }[] = [];
    const keyPayload = {
      data: {
        usage: 3.54151,
        limit: 10,
        limit_remaining: 6.45849,
        expires_at: null,
        is_management_key: false,
        is_provisioning_key: false,
        is_active: true,
        label:
          "sk-or-v1-provider-masked-label-****",
        creator_user_id:
          "user-provider-private-identifier",
        key_hash:
          "provider-private-key-fingerprint",
      },
    };
    const result =
      await executePreparedGenerationRetrieval({
        prepared,
        secret: FAKE_SECRET,
        fetchImpl: async (url, init) => {
          calls.push({
            url,
            method: String(init?.method ?? "GET"),
          });
          const parsed = new URL(url);
          if (
            parsed.pathname !== "/api/v1/key" ||
            parsed.search.length > 0
          ) {
            throw new Error(
              `Second resume attempted a non-key endpoint: ${url}`,
            );
          }
          return responseLike(keyPayload);
        },
        now: () => FIXED_NOW,
      });

    expect(calls).toEqual([
      {
        url: "https://openrouter.ai/api/v1/key",
        method: "GET",
      },
      {
        url: "https://openrouter.ai/api/v1/key",
        method: "GET",
      },
    ]);
    expect(result).toMatchObject({
      generationContentsRecovered: 0,
      generationMetadataRecovered: 10,
      generationMetadataGets: 24,
      exactHistoricalCostUsd: "3.54151000",
      paidJudgePostsMade: 0,
    });
    expect(result.reconciliation).toMatchObject({
      status: "UNCERTAIN_COST_CLEARED",
      canContinuePaidInference: true,
    });

    const entries = await ledgerEntries(
      fixture.outputDirectory,
    );
    expect(entries.slice(0, 88)).toEqual(
      originalLedger,
    );
    expect(entries[88]).toMatchObject({
      sequence: 89,
      event: "GENERATION_RETRIEVAL_RESUMED",
      data: {
        interruptedRequestIndex: 22,
        completedLogicalOutcomes: 20,
        retryWillUseNewRequestIndex: 23,
      },
    });
    const oldMismatches = entries.filter(
      (entry) =>
        entry.event ===
        "GENERATION_METADATA_HISTORICAL_BINDING_MISMATCH",
    );
    const corrections = entries.filter(
      (entry) =>
        entry.event ===
        "GENERATION_METADATA_NATIVE_BINDING_RECONCILED",
    );
    expect(oldMismatches).toHaveLength(10);
    expect(corrections).toHaveLength(10);
    const oldMismatchById = new Map(
      oldMismatches.map((entry) => [
        entry.data.generationId,
        entry,
      ]),
    );
    corrections.forEach((correction) => {
      const prior = oldMismatchById.get(
        correction.data.generationId,
      );
      expect(correction.data).toMatchObject({
        correctedPriorMismatchSequence:
          prior?.sequence,
        correctedPriorMismatchEntryHash:
          prior?.entryHash,
        priorMismatchPreservedWithoutMutation: true,
        bindingPromptTokenSource:
          "native_tokens_prompt",
        bindingCompletionTokenSource:
          "native_tokens_completion",
        historicalInlineBindingSource:
          "NATIVE_OPENROUTER_FIELDS",
        costMatchesHistoricalLedger: true,
        promptTokensMatchHistoricalLedger: true,
        completionTokensMatchHistoricalLedger:
          true,
        matchesHistoricalBinding: true,
        parsingResult:
          "PARSED_AND_BOUND_NATIVE_TOKEN_OVERLAY",
      });
    });
    const reservations = entries.filter(
      (entry) =>
        entry.event === "METADATA_GET_RESERVED",
    );
    expect(reservations).toHaveLength(24);
    expect(
      reservations.find(
        (entry) =>
          entry.data.requestIndex === 23,
      )?.data,
    ).toMatchObject({
      kind: "CURRENT_KEY_BEFORE",
      generationId: null,
      retryOfRequestIndex: 22,
    });
    expect(
      reservations.find(
        (entry) =>
          entry.data.requestIndex === 24,
      )?.data,
    ).toMatchObject({
      kind: "CURRENT_KEY_AFTER",
      generationId: null,
      retryOfRequestIndex: null,
    });
    expect(
      entries.filter(
        (entry) =>
          entry.event ===
            "METADATA_GET_DISPATCHED" &&
          Number(entry.data.requestIndex) >= 23,
      ),
    ).toHaveLength(2);
    const keyStored = entries.filter(
      (entry) =>
        entry.event ===
          "METADATA_RESPONSE_STORED" &&
        (entry.data.kind ===
          "CURRENT_KEY_BEFORE" ||
          entry.data.kind ===
            "CURRENT_KEY_AFTER"),
    );
    expect(keyStored).toHaveLength(2);
    keyStored.forEach((entry) => {
      expect(entry.data).toMatchObject({
        exactRawBodyStored: false,
        sanitizedArtifactStored: true,
        providerMetadataAllowlistApplied: true,
        storedBeforeSemanticParse: true,
        fileMode: "0600",
      });
      expect(
        Number(
          entry.data
            .providerMetadataRedactionCount,
        ),
      ).toBeGreaterThan(0);
      const parsed = entries.find(
        (candidate) =>
          candidate.event ===
            "CURRENT_KEY_USAGE_PARSED" &&
          candidate.data.requestIndex ===
            entry.data.requestIndex,
      );
      expect(entry.sequence).toBeLessThan(
        parsed?.sequence ?? 0,
      );
    });
    for (const filename of [
      "current-key-before.http-body.txt",
      "current-key-after.http-body.txt",
    ]) {
      const path = resolve(
        fixture.metadataDirectory,
        filename,
      );
      const artifact = await readFile(path, "utf8");
      expect((await lstat(path)).mode & 0o777).toBe(
        0o600,
      );
      expect(artifact).not.toMatch(
        /sk-or|label|creator|fingerprint/iu,
      );
      expect(JSON.parse(artifact)).toEqual({
        data: {
          usage: 3.54151,
          limit: 10,
          limit_remaining: 6.45849,
          expires_at: null,
          is_management_key: false,
          is_provisioning_key: false,
          is_active: true,
        },
      });
    }
    const evidence = JSON.parse(
      await readFile(
        resolve(
          fixture.outputDirectory,
          "generation-retrieval-evidence-manifest.json",
        ),
        "utf8",
      ),
    ) as {
      requestCounts: Record<string, number>;
      metadataOutcomes: {
        normalizedPromptTokens: number;
        normalizedCompletionTokens: number;
        nativePromptTokens: number;
        nativeCompletionTokens: number;
        bindingPromptTokenSource: string;
        bindingCompletionTokenSource: string;
        historicalInlineBindingSource: string;
        matchesHistoricalBinding: boolean;
      }[];
    };
    expect(evidence.requestCounts).toMatchObject({
      logicalGenerationContentOutcomes: 10,
      generationContentGetReservations: 10,
      logicalGenerationMetadataOutcomes: 10,
      generationMetadataGetReservations: 11,
      logicalCurrentKeyOutcomes: 2,
      currentKeyGetReservations: 3,
      totalMetadataGets: 24,
      metadataGetsDispatchedInThisProcess: 2,
      interruptedPersistenceAttempts: 2,
      retryReservations: 2,
      chatCompletionPosts: 0,
    });
    expect(evidence.metadataOutcomes).toHaveLength(10);
    evidence.metadataOutcomes.forEach((outcome) => {
      expect(outcome).toEqual(
        expect.objectContaining({
          bindingPromptTokenSource:
            "native_tokens_prompt",
          bindingCompletionTokenSource:
            "native_tokens_completion",
          historicalInlineBindingSource:
            "NATIVE_OPENROUTER_FIELDS",
          matchesHistoricalBinding: true,
        }),
      );
      expect(outcome.nativePromptTokens).toBeGreaterThan(
        outcome.normalizedPromptTokens,
      );
      expect(
        outcome.nativeCompletionTokens,
      ).not.toBe(
        outcome.normalizedCompletionTokens,
      );
    });
    expect(entries.at(-1)).toMatchObject({
      event: "GENERATION_RETRIEVAL_COMPLETED",
      data: {
        metadataGetCount: 24,
        metadataGetsDispatchedInThisProcess: 2,
        interruptedPersistenceAttemptCount: 2,
        retryReservationCount: 2,
        paidJudgePostCount: 0,
      },
    });
    expect(await sha256File(fixture.lockPath)).toBe(
      lockShaBefore,
    );
  });

  it("rejects a credential-like value inside an allowlisted current-key field before writing an artifact", async () => {
    const fixture =
      await secondInterruptedResumeFixture();
    const prepared =
      await prepareGenerationRetrievalResumeRun({
        outputDirectory: fixture.outputDirectory,
        phaseRootForTest: fixture.lockRoot,
        now: () => FIXED_NOW,
      });
    const calls: string[] = [];

    await expect(
      executePreparedGenerationRetrieval({
        prepared,
        secret: FAKE_SECRET,
        fetchImpl: async (url) => {
          calls.push(url);
          return responseLike({
            data: {
              usage:
                "sk-or-v1-malicious-allowed-field",
              limit: 10,
              limit_remaining: 6.45849,
              is_provisioning_key: false,
              is_active: true,
            },
          });
        },
        now: () => FIXED_NOW,
      }),
    ).rejects.toThrow(
      /Sanitized provider artifact still contains secret/iu,
    );
    expect(calls).toEqual([
      "https://openrouter.ai/api/v1/key",
    ]);
    await expect(
      lstat(
        resolve(
          fixture.metadataDirectory,
          "current-key-before.http-body.txt",
        ),
      ),
    ).rejects.toThrow();
    const entries = await ledgerEntries(
      fixture.outputDirectory,
    );
    expect(entries.at(-1)).toMatchObject({
      event:
        "METADATA_RESPONSE_PERSISTENCE_FAILED",
      data: {
        requestIndex: 23,
        kind: "CURRENT_KEY_BEFORE",
        exactRawBodyStored: false,
        sanitizedArtifactStored: false,
        artifactRelativePath: null,
      },
    });
  });

  it("rejects second-resume artifact mutation after preparation before making any HTTP request", async () => {
    const fixture =
      await secondInterruptedResumeFixture();
    const prepared =
      await prepareGenerationRetrievalResumeRun({
        outputDirectory: fixture.outputDirectory,
        phaseRootForTest: fixture.lockRoot,
        now: () => FIXED_NOW,
      });
    await appendFile(
      resolve(
        fixture.metadataDirectory,
        `${fixture.generationIds[0]!}.http-body.txt`,
      ),
      "tampered",
      "utf8",
    );
    const calls: string[] = [];

    await expect(
      executePreparedGenerationRetrieval({
        prepared,
        secret: FAKE_SECRET,
        fetchImpl: async (url) => {
          calls.push(url);
          throw new Error(
            "HTTP must not be reached after tamper",
          );
        },
        now: () => FIXED_NOW,
      }),
    ).rejects.toThrow(
      /changed after resume preparation/iu,
    );
    expect(calls).toHaveLength(0);
    expect(
      (
        await ledgerEntries(
          fixture.outputDirectory,
        )
      ).filter(
        (entry) =>
          entry.event ===
          "GENERATION_METADATA_NATIVE_BINDING_RECONCILED",
      ),
    ).toHaveLength(0);
  });

  it("rejects an extra artifact in the exact second-resume inventory", async () => {
    const fixture =
      await secondInterruptedResumeFixture();
    await writeFile(
      resolve(
        fixture.metadataDirectory,
        "unexpected.http-body.txt",
      ),
      "{}",
      { encoding: "utf8", mode: 0o600 },
    );

    await expect(
      prepareGenerationRetrievalResumeRun({
        outputDirectory: fixture.outputDirectory,
        phaseRootForTest: fixture.lockRoot,
        now: () => FIXED_NOW,
      }),
    ).rejects.toThrow(
      /artifact inventory differs/iu,
    );
  });

  it("performs the exact completed-run reconciliation offline, preserves all prior bytes, appends four chained events, and refuses a second execution", async () => {
    const fixture =
      await completedOfflineReconciliationFixture();
    const originalLedger = await readFile(
      fixture.ledgerPath,
      "utf8",
    );
    const originalEvidenceSha = await sha256File(
      fixture.evidencePath,
    );
    const originalReportSha = await sha256File(
      fixture.reportPath,
    );
    const originalKeyShas = await Promise.all(
      [
        "current-key-before.http-body.txt",
        "current-key-after.http-body.txt",
      ].map((filename) =>
        sha256File(
          resolve(
            fixture.metadataDirectory,
            filename,
          ),
        ),
      ),
    );
    expect(sha256(originalLedger)).toBe(
      "b0b7c4d294a906451d998ef15e2dd4d256efb2cf88a108e1da717df06bf74fc1",
    );
    expect(originalEvidenceSha).toBe(
      "55980291ef68c76a019398801a172298e060396fa56f24acb28bafc23bf2bf58",
    );
    expect(originalReportSha).toBe(
      "85eacb5a286023e6b70578e543475ba4ead926eaf35959134cce9b8d0a6487a0",
    );
    expect(new Set(originalKeyShas)).toEqual(
      new Set([
        "5de5cc487178182933e62052d8a02e3b2c966cca22afce30d23ae4d510cad8b7",
      ]),
    );
    const calls: string[] = [];
    const result = await runAiAudioEvaluationCli(
      [
        "--reconcile-openrouter-generations-offline",
        "--output-dir",
        fixture.outputDirectory,
      ],
      {
        fetchImpl: async (url) => {
          calls.push(url);
          throw new Error(
            "Offline reconciliation must not call fetch",
          );
        },
        now: () => FIXED_NOW,
      },
    );

    expect(calls).toHaveLength(0);
    expect(result).toMatchObject({
      mode: "METADATA",
      status:
        "GENERATION_RETRIEVAL_OFFLINE_RECONCILIATION_COMPLETE",
      outputDirectory: fixture.outputDirectory,
      planHash:
        "d580401892d365ba0a29bde20e8044ada1058cd1105aaf5217f856bb5495c7f9",
    });
    const completedLedger = await readFile(
      fixture.ledgerPath,
      "utf8",
    );
    expect(completedLedger.startsWith(originalLedger)).toBe(
      true,
    );
    const entries = await ledgerEntries(
      fixture.outputDirectory,
    );
    expect(entries).toHaveLength(113);
    expect(entries.slice(0, 109)).toEqual(
      originalLedger
        .split("\n")
        .filter(Boolean)
        .map(
          (line) =>
            JSON.parse(line) as (typeof entries)[number],
        ),
    );
    const reinterpreted = entries.slice(109, 111);
    expect(
      reinterpreted.map((entry) => entry.event),
    ).toEqual([
      "CURRENT_KEY_USAGE_REINTERPRETED",
      "CURRENT_KEY_USAGE_REINTERPRETED",
    ]);
    expect(reinterpreted[0]?.data).toMatchObject({
      reading: 1,
      requestIndex: 23,
      priorStoredSequence: 102,
      priorInvalidSequence: 103,
      sourceArtifactReusedOffline: true,
      networkRequestMade: false,
      usageUsd: "3.54151000",
      limitUsd: "10.00000000",
      limitRemainingUsd: "6.45849000",
      keyKind: "INFERENCE_CONFIRMED",
      active: true,
      numericCanonicalization: {
        field: "limit_remaining",
        originalNumericLexeme:
          "6.458489999999999",
        canonicalUsd: "6.45849000",
        absoluteAdjustmentUsd:
          "0.000000000000001",
      },
    });
    expect(reinterpreted[1]?.data).toMatchObject({
      reading: 2,
      requestIndex: 24,
      priorStoredSequence: 106,
      priorInvalidSequence: 107,
      networkRequestMade: false,
    });
    expect(entries[111]).toMatchObject({
      sequence: 112,
      event: "UNCERTAIN_COST_RECONCILED",
      data: {
        supersedesBlockedSequence: 108,
        blockedEntryPreservedWithoutMutation: true,
        oldUncertainRequestIndex: 16,
        previousUncertainAmountUsd: "4.14600000",
        historicalGenerationCostUsd: "3.54151000",
        stableCurrentKeyUsageUsd: "3.54151000",
        unexplainedActualDeltaUsd: "0.00000000",
        reconciledActualCostUsd: "3.54151000",
        retainedHypotheticalUncertainUsd:
          "0.00000000",
        capAccountedCostUsd: "3.54151000",
        reconciliationStatus:
          "UNCERTAIN_COST_CLEARED",
        canContinuePaidInference: true,
        networkRequestCount: 0,
        paidInferenceRequestCount: 0,
      },
    });
    expect(entries[112]).toMatchObject({
      sequence: 113,
      event:
        "GENERATION_RETRIEVAL_OFFLINE_RECONCILIATION_COMPLETED",
      data: {
        supersedesPriorTerminalWithoutMutation:
          true,
        priorTerminalSequence: 109,
        priorTerminalHash:
          "ad82a9ebd3a48ced1353c6cb38302a26bfd5c533496289d0372cb0f9c0f492ac",
        uncertainCostReconciliationStatus:
          "UNCERTAIN_COST_CLEARED",
        reconciledActualCostUsd: "3.54151000",
        capAccountedCostUsd: "3.54151000",
        retainedHypotheticalUncertainUsd:
          "0.00000000",
        paidContinuationAccountingGate: true,
        metadataGetCount: 24,
        networkRequestCountDuringContinuation: 0,
        paidJudgePostCountDuringContinuation: 0,
      },
    });
    for (let index = 109; index < entries.length; index += 1) {
      expect(entries[index]?.previousHash).toBe(
        entries[index - 1]?.entryHash,
      );
    }
    const supplementPath = resolve(
      fixture.outputDirectory,
      "generation-retrieval-reconciliation-supplement.json",
    );
    const supplementReportPath = resolve(
      fixture.outputDirectory,
      "generation-retrieval-reconciliation-supplement.md",
    );
    const supplement = JSON.parse(
      await readFile(supplementPath, "utf8"),
    ) as {
      status: string;
      offlineOnly: boolean;
      networkRequestCount: number;
      carriedMetadataGetCount: number;
      immutablePriorState: Record<string, unknown>;
      keyReadings: {
        usageUsd: string;
        limitUsd: string;
        limitRemainingUsd: string;
      }[];
      reconciliation: Record<string, unknown>;
    };
    expect(supplement).toMatchObject({
      status: "UNCERTAIN_COST_CLEARED",
      offlineOnly: true,
      networkRequestCount: 0,
      carriedMetadataGetCount: 24,
      retrievalPlanHash:
        "d580401892d365ba0a29bde20e8044ada1058cd1105aaf5217f856bb5495c7f9",
      immutablePriorState: {
        planFileSha256:
          "ab5ef8be37f0c9b57f45c1576edf1c0331a4d239980b6cf20d6c831c41490b2a",
        ledgerSha256:
          "b0b7c4d294a906451d998ef15e2dd4d256efb2cf88a108e1da717df06bf74fc1",
        terminalHash:
          "ad82a9ebd3a48ced1353c6cb38302a26bfd5c533496289d0372cb0f9c0f492ac",
        evidenceManifestSha256:
          "55980291ef68c76a019398801a172298e060396fa56f24acb28bafc23bf2bf58",
        keyArtifactSha256:
          "5de5cc487178182933e62052d8a02e3b2c966cca22afce30d23ae4d510cad8b7",
        priorArtifactsOverwritten: false,
        priorLedgerEntriesRewritten: false,
      },
      reconciliation: {
        historicalGenerationCostUsd:
          "3.54151000",
        stableCurrentKeyUsageUsd:
          "3.54151000",
        unexplainedActualDeltaUsd:
          "0.00000000",
        retainedHypotheticalUncertainUsd:
          "0.00000000",
        reconciledActualCostUsd: "3.54151000",
        capAccountedCostUsd: "3.54151000",
        remainingKeyLimitUsd: "6.45849000",
        canContinuePaidInference: true,
      },
    });
    expect(supplement.keyReadings).toHaveLength(2);
    for (const reading of supplement.keyReadings) {
      expect(reading).toMatchObject({
        usageUsd: "3.54151000",
        limitUsd: "10.00000000",
        limitRemainingUsd: "6.45849000",
      });
    }
    for (const path of [
      supplementPath,
      supplementReportPath,
    ]) {
      expect((await lstat(path)).mode & 0o777).toBe(
        0o600,
      );
    }
    expect(entries[112]?.data).toMatchObject({
      supplementSha256:
        await sha256File(supplementPath),
      supplementReportSha256:
        await sha256File(supplementReportPath),
    });
    expect(
      await sha256File(fixture.evidencePath),
    ).toBe(originalEvidenceSha);
    expect(await sha256File(fixture.reportPath)).toBe(
      originalReportSha,
    );
    expect(
      await Promise.all(
        [
          "current-key-before.http-body.txt",
          "current-key-after.http-body.txt",
        ].map((filename) =>
          sha256File(
            resolve(
              fixture.metadataDirectory,
              filename,
            ),
          ),
        ),
      ),
    ).toEqual(originalKeyShas);

    const ledgerAfterSuccess = await readFile(
      fixture.ledgerPath,
      "utf8",
    );
    await expect(
      runAiAudioEvaluationCli(
        [
          "--reconcile-openrouter-generations-offline",
          "--output-dir",
          fixture.outputDirectory,
        ],
        {
          fetchImpl: async (url) => {
            calls.push(url);
            throw new Error(
              "Idempotent refusal must remain offline",
            );
          },
          now: () => FIXED_NOW,
        },
      ),
    ).rejects.toThrow(/supplement artifact already exists/iu);
    expect(calls).toHaveLength(0);
    expect(
      await readFile(fixture.ledgerPath, "utf8"),
    ).toBe(ledgerAfterSuccess);
  });

  it("refuses offline reconciliation after the pinned inference key expiry without appending or fetching", async () => {
    const fixture =
      await completedOfflineReconciliationFixture();
    const ledgerShaBefore = await sha256File(
      fixture.ledgerPath,
    );

    await expect(
      reconcileCompletedGenerationRetrievalOffline({
        outputDirectory: fixture.outputDirectory,
        phaseRootForTest: fixture.lockRoot,
        now: () =>
          "2026-07-27T18:00:00.000Z",
      }),
    ).rejects.toThrow(/expired/iu);
    expect(
      await sha256File(fixture.ledgerPath),
    ).toBe(ledgerShaBefore);
    await expect(
      lstat(
        resolve(
          fixture.outputDirectory,
          "generation-retrieval-reconciliation-supplement.json",
        ),
      ),
    ).rejects.toThrow();
  });

  it.each(
    [
      "ledger",
      "evidence",
      "report",
      "key-artifact",
      "plan",
      "lock",
      "extra-artifact",
    ] as const,
  )(
    "rejects offline reconciliation when pinned %s state is tampered",
    async (target) => {
      const fixture =
        await completedOfflineReconciliationFixture();
      if (target === "extra-artifact") {
        await writeFile(
          resolve(
            fixture.metadataDirectory,
            "unexpected.http-body.txt",
          ),
          "{}",
          { encoding: "utf8", mode: 0o600 },
        );
      } else {
        const targetPath =
          target === "ledger"
            ? fixture.ledgerPath
            : target === "evidence"
              ? fixture.evidencePath
              : target === "report"
                ? fixture.reportPath
                : target === "key-artifact"
                  ? resolve(
                      fixture.metadataDirectory,
                      "current-key-before.http-body.txt",
                    )
                  : target === "plan"
                    ? fixture.planPath
                    : fixture.lockPath;
        await appendFile(
          targetPath,
          "tampered",
          "utf8",
        );
      }

      await expect(
        reconcileCompletedGenerationRetrievalOffline({
          outputDirectory:
            fixture.outputDirectory,
          phaseRootForTest: fixture.lockRoot,
          now: () => FIXED_NOW,
        }),
      ).rejects.toThrow(
        /Offline generation reconciliation refused|JSON/iu,
      );
      await expect(
        lstat(
          resolve(
            fixture.outputDirectory,
            "generation-retrieval-reconciliation-supplement.json",
          ),
        ),
      ).rejects.toThrow();
    },
  );

  it.each(["ledger", "lock", "artifact"] as const)(
    "rejects resume when the pinned %s is tampered",
    async (target) => {
      const fixture =
        await interruptedResumeFixture();
      const targetPath =
        target === "ledger"
          ? resolve(
              fixture.outputDirectory,
              "generation-retrieval-ledger.jsonl",
            )
          : target === "lock"
            ? fixture.lockPath
            : resolve(
                fixture.outputDirectory,
                "openrouter-generation-content",
                `${fixture.firstGenerationId}.http-body.txt`,
              );
      await appendFile(targetPath, "tampered", "utf8");

      await expect(
        prepareGenerationRetrievalResumeRun({
          outputDirectory:
            fixture.outputDirectory,
          phaseRootForTest: fixture.lockRoot,
          now: () => FIXED_NOW,
        }),
      ).rejects.toThrow(/Resume refused/u);
    },
  );

  it("blocks reconciliation when per-ID costs differ even if the aggregate cost is unchanged", async () => {
    const { outputDirectory, prepared } =
      await preparedRetrieval();
    const ids =
      prepared.plan.historicalGenerations.map(
        (binding) => binding.generationId,
      );
    const calls: {
      url: string;
      method: string;
    }[] = [];
    const result =
      await executePreparedGenerationRetrieval({
        prepared,
        secret: FAKE_SECRET,
        fetchImpl: successfulMetadataFetch({
          prepared,
          calls,
          metadataMutator(generationId, payload) {
            if (generationId === ids[0]) {
              payload.total_cost =
                Number(payload.total_cost) + 0.00000001;
            }
            if (generationId === ids[1]) {
              payload.total_cost =
                Number(payload.total_cost) - 0.00000001;
            }
          },
        }),
        now: () => FIXED_NOW,
      });

    expect(calls).toHaveLength(22);
    expect(result.reconciliation).toMatchObject({
      status:
        "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN",
      canContinuePaidInference: false,
    });
    expect(result.reconciliation.event).toBeNull();
    expect(
      result.reconciliation
        .capAccountedCostQuanta,
    ).toBeGreaterThanOrEqual(
      result.reconciliation
        .reconciledActualCostQuanta +
        414_600_000n,
    );
    expect(
      (await ledgerEntries(outputDirectory)).filter(
        (entry) =>
          entry.event ===
          "GENERATION_METADATA_HISTORICAL_BINDING_MISMATCH",
      ),
    ).toHaveLength(2);
  });

  it("completes metadata retrieval but blocks on a malformed key reading", async () => {
    const { prepared } = await preparedRetrieval();
    const calls: {
      url: string;
      method: string;
    }[] = [];
    const result =
      await executePreparedGenerationRetrieval({
        prepared,
        secret: FAKE_SECRET,
        fetchImpl: successfulMetadataFetch({
          prepared,
          calls,
          malformedSecondKey: true,
        }),
        now: () => FIXED_NOW,
      });

    expect(calls).toHaveLength(22);
    expect(result.reconciliation).toMatchObject({
      status:
        "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN",
      canContinuePaidInference: false,
      event: null,
    });
  });

  it.each([401, 402] as const)(
    "fails closed after HTTP %i and makes no later request",
    async (status) => {
      const { prepared } = await preparedRetrieval();
      const calls: string[] = [];

      await expect(
        executePreparedGenerationRetrieval({
          prepared,
          secret: FAKE_SECRET,
          fetchImpl: async (url) => {
            calls.push(url);
            return responseLike(
              { error: { message: "blocked" } },
              status,
            );
          },
          now: () => FIXED_NOW,
        }),
      ).rejects.toThrow(
        new RegExp(`HTTP ${String(status)}`, "u"),
      );
      expect(calls).toHaveLength(1);
    },
  );
});
