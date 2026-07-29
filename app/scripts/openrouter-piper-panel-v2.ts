#!/usr/bin/env tsx

import {
  createHash,
  randomBytes,
} from "node:crypto";
import {
  chmod,
  constants as fsConstants,
  lstat,
  mkdir,
  open,
  readFile,
} from "node:fs/promises";
import {
  dirname,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertFreshRecoveryRandomization,
  buildFreshRecoveryRandomization,
  phase2cPrimaryJudgeHttpTestHooks,
  type FreshRecoveryRandomization,
  type ResponseRecoveryPerspectiveId,
} from "./ai-audio-evaluation-cli";
import {
  prepareLivePaidGenerationRecovery,
  type PaidRecoveryFrozenInput,
} from "./openrouter-generation-recovery-paid";
import {
  canonicalAiJson,
  hashAiValue,
} from "../src/lib/academy/narration/ai-audio-evaluation";
import {
  formatUsdQuanta,
  parseOpenRouterGenerationMetadata,
  parseOpenRouterKeyUsage,
  parseUsdToQuanta,
} from "../src/lib/academy/narration/openrouter-generation-retrieval";
import {
  parseOpenRouterChatCompletionReceipt,
  resolveOpenRouterPaidJudgeCost,
} from "../src/lib/academy/narration/openrouter-paid-judge-executor";
import {
  PIPER_PANEL_V2_MAX_PAID_POSTS,
  PIPER_PANEL_V2_MAX_TOKENS,
  aggregatePiperPanelV2,
  canonicalPiperPanelV2,
  parsePiperPanelV2ToolArguments,
  piperPanelV2ArgumentsFromEnvelope,
  type PiperPanelV2PerspectiveId,
  type PiperPanelV2Run,
} from "../src/lib/academy/narration/openrouter-piper-panel-v2";
import {
  PIPER_PANEL_V2_CARRIED_COST_USD,
  PIPER_PANEL_V2_MAXIMUM_COST_USD,
  PIPER_PANEL_V2_MODEL_ID,
  assertPiperPanelV2Request,
  authorizePiperPanelV2Request,
  buildPiperPanelV2Request,
  estimatePiperPanelV2RequestCost,
  parsePiperPanelV2ModelCatalog,
  type PiperPanelV2ModelCapability,
} from "../src/lib/academy/narration/openrouter-piper-panel-v2-executor";

const API_BASE = "https://openrouter.ai/api/v1";
const CHAT_ENDPOINT = `${API_BASE}/chat/completions`;
const KEY_ENDPOINT = `${API_BASE}/key`;
const MODELS_ENDPOINT = `${API_BASE}/models`;
const GENERATION_ENDPOINT = `${API_BASE}/generation`;
const SECRET_PATH =
  "/run/secrets/openrouter_audio_judge_key";
const TASK_ATTACHMENT = resolve(
  "/home/ubuntu/.codex/attachments/c0c2fbfd-e221-4126-bacc-2efd3e464ede/pasted-text.txt",
);
const TASK_ATTACHMENT_SHA256 =
  "aeb948f922278e2d5e677ec6fc4c32f1db9b212cc94a1e0b56f91ef21577befb";
const REPOSITORY_ROOT = resolve(process.cwd(), "..");
const PHASE_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "ai-audio-evaluation",
);
const LIVE_OUTPUT_DIRECTORY = resolve(
  PHASE_ROOT,
  "phase2c-openrouter-bryce-tool-panel-v2c-20260727",
);
const LIVE_LOCK_PATH = resolve(
  PHASE_ROOT,
  ".phase2c-openrouter-bryce-tool-panel-v2c-20260727.lock",
);
const ZERO_POST_RUN_DIRECTORY = resolve(
  PHASE_ROOT,
  "phase2c-openrouter-bryce-tool-panel-v2-20260727",
);
const ONE_POST_RUN_DIRECTORY = resolve(
  PHASE_ROOT,
  "phase2c-openrouter-bryce-tool-panel-v2b-20260727",
);
const CONTINUED_ZERO_POST_LEDGER_SHA256 =
  "11d28040d60b5bd37553138bc46566256cc2e12082010912fa353ac76410d7b0";
const CONTINUED_ZERO_POST_TERMINAL_HASH =
  "582df61fe37a1a37ed554da88bf8dc54f761789522b35f1057105788c90d2524";
const CONTINUED_ONE_POST_LEDGER_SHA256 =
  "e4c298509153766ec85eee8903d6d8e3ba05cb7cc0777a9f9a8ce6191579d2d7";
const CONTINUED_ONE_POST_TERMINAL_HASH =
  "1cf2ce7eb1644ff7683639a59fcb596ecaa1cd0a8dc73ce0877d68cbdb0794dd";
const CONTINUED_PLAN_FILE_SHA256 =
  "2898b35a1606111db0d767722115f5e8308d486c12e7ed3dd5d9ee6fa933e5ad";
const CONTINUED_PLAN_HASH =
  "58e766e508836ffbf0be6a6111f94fc4233005632f6c021cd06e8abc749d65fc";
const CONTINUED_RAW_RESPONSE_SHA256 =
  "3d0d8f4575dae0dcf374331c5f5bcc8ec1758ae69731a62a70df225911a3f70e";
const CONTINUED_RANDOMIZATION_FILE_SHA256 =
  "dec550d304db27b4891d0516a77118a869b51df2d0c313aad19a3ba1dd1a0c1a";
const CONTINUED_RESPONSE_ID =
  "gen-1785153092-FK7ZY0FfI1wltr6mfKJP";
const CONTINUED_ACTUAL_COST_USD =
  "0.34008750";
const CONTINUED_METADATA_GETS = 6;
const PLAN_SCHEMA_VERSION =
  "tenxpros-openrouter-piper-panel-v2-plan-v1";
const LEDGER_SCHEMA_VERSION =
  "tenxpros-openrouter-piper-panel-v2-ledger-v1";
const GENESIS_HASH = "0".repeat(64);
const MAXIMUM_METADATA_GETS = 32;
const PERSPECTIVE_IDS = [
  "judge-01",
  "judge-02",
  "judge-03",
  "judge-04",
  "judge-05",
] as const satisfies readonly PiperPanelV2PerspectiveId[];

type FetchLike = (
  url: string,
  init: {
    method: "GET" | "POST";
    headers?: Readonly<Record<string, string>>;
    body?: string;
    redirect: "error";
    signal: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

async function sha256File(path: string): Promise<string> {
  return sha256(await readFile(path));
}

async function ensurePrivateDirectory(
  path: string,
  recursive = false,
): Promise<void> {
  await mkdir(path, { recursive, mode: 0o700 });
  const metadata = await lstat(path);
  const currentUid = process.getuid?.();
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o700 ||
    (currentUid !== undefined &&
      metadata.uid !== currentUid)
  ) {
    throw new Error(
      `Directory is not private and owner-controlled: ${path}`,
    );
  }
}

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeNewRestricted(
  path: string,
  value: string | Buffer,
): Promise<void> {
  const handle = await open(
    path,
    fsConstants.O_WRONLY |
      fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(path, 0o600);
  await syncDirectory(dirname(path));
  const metadata = await lstat(path);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o600
  ) {
    throw new Error(
      `Restricted artifact failed its mode check: ${path}`,
    );
  }
}

async function appendRestricted(
  path: string,
  value: string,
): Promise<void> {
  const handle = await open(
    path,
    fsConstants.O_WRONLY |
      fsConstants.O_APPEND |
      fsConstants.O_CREAT |
      fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    const metadata = await handle.stat();
    if (
      !metadata.isFile() ||
      (metadata.mode & 0o777) !== 0o600
    ) {
      throw new Error("Ledger descriptor is unsafe");
    }
    await handle.writeFile(value, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await syncDirectory(dirname(path));
}

interface RunPaths {
  root: string;
  plan: string;
  ledger: string;
  privateRoot: string;
  rawResponses: string;
  redactedRequests: string;
  randomizations: string;
  normalizedResponses: string;
  keySnapshots: string;
  metadataResponses: string;
  privateManifest: string;
  panel: string;
  invalid: string;
  cost: string;
  report: string;
}

function runPaths(root: string): RunPaths {
  const privateRoot = resolve(root, "private");
  return {
    root,
    plan: resolve(root, "evaluation-plan.json"),
    ledger: resolve(root, "request-ledger.jsonl"),
    privateRoot,
    rawResponses: resolve(
      privateRoot,
      "raw-inference-responses",
    ),
    redactedRequests: resolve(
      privateRoot,
      "redacted-requests",
    ),
    randomizations: resolve(
      privateRoot,
      "blind-randomizations",
    ),
    normalizedResponses: resolve(
      privateRoot,
      "normalized-responses",
    ),
    keySnapshots: resolve(
      privateRoot,
      "key-snapshots",
    ),
    metadataResponses: resolve(
      privateRoot,
      "metadata-responses",
    ),
    privateManifest: resolve(
      privateRoot,
      "private-manifest.json",
    ),
    panel: resolve(root, "piper-panel.json"),
    invalid: resolve(root, "invalid-responses.json"),
    cost: resolve(root, "cost-report.json"),
    report: resolve(root, "evaluation-report.md"),
  };
}

interface LedgerEntry {
  schemaVersion: typeof LEDGER_SCHEMA_VERSION;
  sequence: number;
  timestamp: string;
  planHash: string;
  event: string;
  data: Readonly<Record<string, unknown>>;
  previousHash: string;
  entryHash: string;
}

async function readLedger(
  path: string,
): Promise<LedgerEntry[]> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (
      isRecord(error) &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
  const entries = raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LedgerEntry);
  let prior = GENESIS_HASH;
  for (const [index, entry] of entries.entries()) {
    const { entryHash, ...withoutHash } = entry;
    if (
      entry.sequence !== index + 1 ||
      entry.previousHash !== prior ||
      hashAiValue(withoutHash) !== entryHash
    ) {
      throw new Error(
        `Panel ledger hash chain failed at ${String(index + 1)}`,
      );
    }
    prior = entry.entryHash;
  }
  return entries;
}

async function appendLedger(input: {
  path: string;
  planHash: string;
  event: string;
  data: Readonly<Record<string, unknown>>;
  now: () => string;
}): Promise<LedgerEntry> {
  const entries = await readLedger(input.path);
  const withoutHash: Omit<
    LedgerEntry,
    "entryHash"
  > = {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    sequence: entries.length + 1,
    timestamp: input.now(),
    planHash: input.planHash,
    event: input.event,
    data: input.data,
    previousHash:
      entries.at(-1)?.entryHash ?? GENESIS_HASH,
  };
  const entry = {
    ...withoutHash,
    entryHash: hashAiValue(withoutHash),
  };
  const serialized = `${canonicalAiJson(entry)}\n`;
  if (
    /(?:sk-or-v1-|authorization|bearer\s+|data:audio\/|input_audio.{0,80}[A-Za-z0-9+/]{256})/iu.test(
      serialized,
    )
  ) {
    throw new Error(
      "Ledger serialization contains prohibited credential or audio material",
    );
  }
  await appendRestricted(input.path, serialized);
  return entry;
}

async function withTimeout<T>(
  milliseconds: number,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    milliseconds,
  );
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function safeHeaders(
  response: {
    headers: { get(name: string): string | null };
  },
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    [
      "content-type",
      "date",
      "x-request-id",
      "x-openrouter-generation-id",
    ].flatMap((name) => {
      const value = response.headers.get(name);
      return value !== null &&
        value.length <= 160 &&
        /^[A-Za-z0-9 !#$%&'*+,.\/:;=?@_~-]+$/u.test(
          value,
        ) &&
        !/(?:authorization|bearer|sk-or-)/iu.test(
          value,
        )
        ? [[name, value]]
        : [];
    }),
  );
}

function safeGenerationHeader(
  response: {
    headers: { get(name: string): string | null };
  },
): string | null {
  const value = response.headers.get(
    "x-openrouter-generation-id",
  );
  return value !== null &&
    /^gen-[A-Za-z0-9_-]{8,}$/u.test(value)
    ? value
    : null;
}

export async function persistRawResponseBeforeParse<T>(
  input: {
    path: string;
    rawBody: string;
    prohibitedSecret?: string;
    recordPersistence: (evidence: {
      rawBodySha256: string;
      rawBodyBytes: number;
    }) => Promise<void>;
    parse: (rawBody: string) => T;
  },
): Promise<{
  parsed: T;
  rawBodySha256: string;
  rawBodyBytes: number;
}> {
  if (
    (input.prohibitedSecret !== undefined &&
      input.prohibitedSecret.length > 0 &&
      input.rawBody.includes(
        input.prohibitedSecret,
      )) ||
    /(?:sk-or-v1-|authorization\s*:|bearer\s+\S+)/iu.test(
      input.rawBody,
    ) ||
    /(?:data:audio\/[^,]+,|[A-Za-z0-9+/]{4096,}={0,2})/u.test(
      input.rawBody,
    )
  ) {
    throw new Error(
      "Provider body contains prohibited credential or audio payload material",
    );
  }
  const rawBodySha256 = sha256(input.rawBody);
  const rawBodyBytes = Buffer.byteLength(
    input.rawBody,
    "utf8",
  );
  await writeNewRestricted(input.path, input.rawBody);
  if (
    (await sha256File(input.path)) !== rawBodySha256
  ) {
    throw new Error(
      "Persisted raw response hash does not match memory",
    );
  }
  await input.recordPersistence({
    rawBodySha256,
    rawBodyBytes,
  });
  return {
    parsed: input.parse(input.rawBody),
    rawBodySha256,
    rawBodyBytes,
  };
}

interface DeterministicPlan {
  schemaVersion: typeof PLAN_SCHEMA_VERSION;
  provider: "OpenRouter";
  model: typeof PIPER_PANEL_V2_MODEL_ID;
  taskAttachmentSha256: typeof TASK_ATTACHMENT_SHA256;
  carriedActualCostUsd: typeof PIPER_PANEL_V2_CARRIED_COST_USD;
  maximumCumulativeCostUsd: typeof PIPER_PANEL_V2_MAXIMUM_COST_USD;
  maximumNewPaidJudgePosts: 7;
  primaryPerspectiveCount: 5;
  maximumInvalidResponseReplacements: 2;
  maximumOutputTokens: 2500;
  modelCapability: {
    contextLength: number;
    inputModalities: readonly string[];
    supportedParameters: readonly string[];
    pricing: {
      promptUsdPerToken: string;
      audioUsdPerToken: string;
      completionUsdPerToken: string;
    };
  };
  frozenAudio: readonly {
    sampleId: string;
    sha256: string;
    durationSeconds: number;
  }[];
  immutablePriorBindings: {
    retrievalPlanHash: string;
    reconciliationSupplementSha256: string;
    responseRecoveryPlanHash: string;
    privateSamplesSha256: string;
    objectiveAnalysisHash: string;
    priorAssignmentHashes: readonly string[];
    priorRecoveryRandomizationHashes: readonly string[];
    continuedPanelEvidence: {
      zeroPostLedgerSha256: string;
      zeroPostTerminalHash: string;
      onePostLedgerSha256: string;
      onePostTerminalHash: string;
      priorPlanFileSha256: string;
      priorPlanHash: string;
      paidPostsUsed: 1;
      primaryPostsUsed: 1;
      invalidPerspectiveId: "judge-01";
      actualCostUsd: typeof CONTINUED_ACTUAL_COST_USD;
      responseId: typeof CONTINUED_RESPONSE_ID;
      rawResponseSha256: string;
      randomizationFileSha256: string;
      metadataGetsUsed: 6;
    };
  };
  requestPolicy: {
    oneFreshContextPerRequest: true;
    independentlyRandomizedNeutralLabels: true;
    actualTenMp3Inputs: true;
    forcedToolName: "submit_audio_evaluation";
    responseFormatOmitted: true;
    rawResponseBeforeParse: true;
    keyReadBeforeEveryPost: true;
    noUnfavorableRetry: true;
    primaryRequestsBeforeReplacements: true;
  };
  planHash: string;
}

function buildPlan(input: {
  frozen: PaidRecoveryFrozenInput;
  priorPlan: Awaited<
    ReturnType<
      typeof prepareLivePaidGenerationRecovery
    >
  >["execution"]["plan"];
  model: PiperPanelV2ModelCapability;
}): DeterministicPlan {
  const durations = new Map(
    input.frozen.sourcePairs.flatMap((pair) =>
      pair.samples.map((sample) => [
        sample.sampleId,
        sample.durationSeconds,
      ] as const),
    ),
  );
  const withoutHash: Omit<
    DeterministicPlan,
    "planHash"
  > = {
    schemaVersion: PLAN_SCHEMA_VERSION,
    provider: "OpenRouter" as const,
    model: PIPER_PANEL_V2_MODEL_ID,
    taskAttachmentSha256:
      TASK_ATTACHMENT_SHA256,
    carriedActualCostUsd:
      PIPER_PANEL_V2_CARRIED_COST_USD,
    maximumCumulativeCostUsd:
      PIPER_PANEL_V2_MAXIMUM_COST_USD,
    maximumNewPaidJudgePosts: 7 as const,
    primaryPerspectiveCount: 5 as const,
    maximumInvalidResponseReplacements:
      2 as const,
    maximumOutputTokens: 2_500 as const,
    modelCapability: {
      contextLength: input.model.contextLength,
      inputModalities: input.model.inputModalities,
      supportedParameters:
        input.model.supportedParameters,
      pricing: {
        promptUsdPerToken:
          input.model.pricing.promptUsdPerToken,
        audioUsdPerToken:
          input.model.pricing.audioUsdPerToken,
        completionUsdPerToken:
          input.model.pricing.completionUsdPerToken,
      },
    },
    frozenAudio: input.frozen.audio
      .map((sample) => {
        const duration = durations.get(
          sample.sampleId,
        );
        if (duration === undefined) {
          throw new Error(
            "Frozen audio duration binding is missing",
          );
        }
        return {
          sampleId: sample.sampleId,
          sha256: sample.sha256,
          durationSeconds: duration,
        };
      })
      .sort((left, right) =>
        left.sampleId.localeCompare(right.sampleId),
      ),
    immutablePriorBindings: {
      retrievalPlanHash:
        input.priorPlan.retrievalPlanHash,
      reconciliationSupplementSha256:
        input.priorPlan
          .reconciliationSupplementSha256,
      responseRecoveryPlanHash:
        input.priorPlan.recoveryPlanHash,
      privateSamplesSha256:
        input.priorPlan.privateSamplesSha256,
      objectiveAnalysisHash:
        input.priorPlan.objectiveAnalysisHash,
      priorAssignmentHashes: [
        ...input.priorPlan.priorAssignmentHashes,
      ].sort(),
      priorRecoveryRandomizationHashes: [
        ...input.priorPlan
          .priorRecoveryRandomizationHashes,
      ].sort(),
      continuedPanelEvidence: {
        zeroPostLedgerSha256:
          CONTINUED_ZERO_POST_LEDGER_SHA256,
        zeroPostTerminalHash:
          CONTINUED_ZERO_POST_TERMINAL_HASH,
        onePostLedgerSha256:
          CONTINUED_ONE_POST_LEDGER_SHA256,
        onePostTerminalHash:
          CONTINUED_ONE_POST_TERMINAL_HASH,
        priorPlanFileSha256:
          CONTINUED_PLAN_FILE_SHA256,
        priorPlanHash: CONTINUED_PLAN_HASH,
        paidPostsUsed: 1 as const,
        primaryPostsUsed: 1 as const,
        invalidPerspectiveId:
          "judge-01" as const,
        actualCostUsd:
          CONTINUED_ACTUAL_COST_USD,
        responseId: CONTINUED_RESPONSE_ID,
        rawResponseSha256:
          CONTINUED_RAW_RESPONSE_SHA256,
        randomizationFileSha256:
          CONTINUED_RANDOMIZATION_FILE_SHA256,
        metadataGetsUsed: 6 as const,
      },
    },
    requestPolicy: {
      oneFreshContextPerRequest: true as const,
      independentlyRandomizedNeutralLabels:
        true as const,
      actualTenMp3Inputs: true as const,
      forcedToolName:
        "submit_audio_evaluation" as const,
      responseFormatOmitted: true as const,
      rawResponseBeforeParse: true as const,
      keyReadBeforeEveryPost: true as const,
      noUnfavorableRetry: true as const,
      primaryRequestsBeforeReplacements:
        true as const,
    },
  };
  return {
    ...withoutHash,
    planHash: hashAiValue(withoutHash),
  };
}

interface KeySnapshot {
  usageQuanta: bigint;
  limitQuanta: bigint;
  remainingQuanta: bigint;
  usageUsd: string;
  limitUsd: string;
  remainingUsd: string;
  rawBodySha256: string;
  metadataGetIndex: number;
}

interface InvalidAttempt {
  requestOrdinal: number;
  perspectiveId: PiperPanelV2PerspectiveId;
  attempt: 1 | 2;
  httpStatus: number | null;
  responseId: string | null;
  rawBodySha256: string | null;
  actualCostUsd: string | null;
  costSource: string | null;
  exactReason: string;
}

interface AttemptEvidence {
  requestOrdinal: number;
  perspectiveId: PiperPanelV2PerspectiveId;
  attempt: 1 | 2;
  phase: "PRIMARY" | "REPLACEMENT";
  httpStatus: number | null;
  responseId: string | null;
  rawBodySha256: string | null;
  actualCostUsd: string | null;
  costSource: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  audioTokens: number | null;
  valid: boolean;
}

interface ExecutionState {
  paidPosts: number;
  primaryPosts: number;
  replacementPosts: number;
  metadataGets: number;
  knownNewActualCostQuanta: bigint;
  unresolvedActualUsageDeltaQuanta: bigint;
  maximumUncertainCostQuanta: bigint;
  costEvidenceStable: boolean;
  terminalReason: string | null;
  validRuns: Map<
    PiperPanelV2PerspectiveId,
    PiperPanelV2Run
  >;
  invalidAttempts: InvalidAttempt[];
  attempts: AttemptEvidence[];
  randomizations: FreshRecoveryRandomization[];
  primaryAttempted:
    Set<PiperPanelV2PerspectiveId>;
}

interface ExecutionContext {
  paths: RunPaths;
  plan: DeterministicPlan;
  frozen: PaidRecoveryFrozenInput;
  model: PiperPanelV2ModelCapability;
  fetchImpl: FetchLike;
  secret: string;
  now: () => string;
  state: ExecutionState;
}

function assertMetadataAllowance(
  state: ExecutionState,
): number {
  const next = state.metadataGets + 1;
  if (next > MAXIMUM_METADATA_GETS) {
    throw new Error("METADATA_GET_CAP_EXCEEDED");
  }
  state.metadataGets = next;
  return next;
}

async function getCurrentKey(
  context: ExecutionContext,
  label: string,
): Promise<KeySnapshot> {
  const metadataGetIndex =
    assertMetadataAllowance(context.state);
  await appendLedger({
    path: context.paths.ledger,
    planHash: context.plan.planHash,
    event: "METADATA_GET_DISPATCHED",
    data: {
      metadataGetIndex,
      kind: "CURRENT_KEY",
      label,
      paidInference: false,
    },
    now: context.now,
  });
  const response = await withTimeout(
    30_000,
    (signal) =>
      context.fetchImpl(KEY_ENDPOINT, {
        method: "GET",
        redirect: "error",
        signal,
        headers: {
          Authorization: `Bearer ${context.secret}`,
        },
      }),
  );
  const rawBody = await response.text();
  if (rawBody.includes(context.secret)) {
    throw new Error(
      "Current-key response contains the exact inference secret",
    );
  }
  const rawBodySha256 = sha256(rawBody);
  if (!response.ok) {
    await appendLedger({
      path: context.paths.ledger,
      planHash: context.plan.planHash,
      event: "CURRENT_KEY_FAILED",
      data: {
        metadataGetIndex,
        label,
        httpStatus: response.status,
        rawBodySha256,
      },
      now: context.now,
    });
    throw new Error(
      `Current-key GET failed with HTTP ${String(response.status)}`,
    );
  }
  const key = parseOpenRouterKeyUsage(rawBody);
  const currentTime = Date.parse(context.now());
  if (
    key.keyKind !== "INFERENCE_CONFIRMED" ||
    !key.active ||
    key.limitQuanta <= 0n ||
    key.limitQuanta >
      parseUsdToQuanta(
        PIPER_PANEL_V2_MAXIMUM_COST_USD,
      ) ||
    key.usageQuanta +
      key.limitRemainingQuanta !==
      key.limitQuanta ||
    (key.expiresAt !== null &&
      Date.parse(key.expiresAt) <= currentTime)
  ) {
    throw new Error(
      "Current key is not an active inference key within the USD 10 authorization",
    );
  }
  const sanitized = {
    schemaVersion:
      "tenxpros-openrouter-key-snapshot-v1",
    metadataGetIndex,
    label,
    httpStatus: response.status,
    rawBodySha256,
    usageUsd: key.usageUsd,
    limitUsd: key.limitUsd,
    limitRemainingUsd: key.limitRemainingUsd,
    keyKind: key.keyKind,
    active: key.active,
    expiresAt: key.expiresAt,
    secretStored: false,
    providerLabelStored: false,
  };
  const path = resolve(
    context.paths.keySnapshots,
    `${String(metadataGetIndex).padStart(
      2,
      "0",
    )}-${label}.json`,
  );
  await writeNewRestricted(
    path,
    `${canonicalAiJson(sanitized)}\n`,
  );
  await appendLedger({
    path: context.paths.ledger,
    planHash: context.plan.planHash,
    event: "CURRENT_KEY_RECONCILED",
    data: {
      metadataGetIndex,
      label,
      httpStatus: response.status,
      rawBodySha256,
      usageUsd: key.usageUsd,
      limitUsd: key.limitUsd,
      limitRemainingUsd: key.limitRemainingUsd,
      sanitizedArtifact: relative(
        context.paths.root,
        path,
      ),
    },
    now: context.now,
  });
  return {
    usageQuanta: key.usageQuanta,
    limitQuanta: key.limitQuanta,
    remainingQuanta: key.limitRemainingQuanta,
    usageUsd: key.usageUsd,
    limitUsd: key.limitUsd,
    remainingUsd: key.limitRemainingUsd,
    rawBodySha256,
    metadataGetIndex,
  };
}

async function generationCostFallback(input: {
  context: ExecutionContext;
  generationId: string;
  requestOrdinal: number;
}): Promise<{
  metadata: ReturnType<
    typeof parseOpenRouterGenerationMetadata
  >;
} | null> {
  const metadataGetIndex = assertMetadataAllowance(
    input.context.state,
  );
  await appendLedger({
    path: input.context.paths.ledger,
    planHash: input.context.plan.planHash,
    event: "METADATA_GET_DISPATCHED",
    data: {
      metadataGetIndex,
      kind: "GENERATION_COST_FALLBACK",
      generationId: input.generationId,
      requestOrdinal: input.requestOrdinal,
      paidInference: false,
    },
    now: input.context.now,
  });
  let response:
    | Awaited<ReturnType<FetchLike>>
    | undefined;
  try {
    response = await withTimeout(
      30_000,
      (signal) =>
        input.context.fetchImpl(
          `${GENERATION_ENDPOINT}?id=${encodeURIComponent(
            input.generationId,
          )}`,
          {
            method: "GET",
            redirect: "error",
            signal,
            headers: {
              Authorization: `Bearer ${input.context.secret}`,
            },
          },
        ),
    );
  } catch (error) {
    await appendLedger({
      path: input.context.paths.ledger,
      planHash: input.context.plan.planHash,
      event: "GENERATION_COST_FALLBACK_FAILED",
      data: {
        metadataGetIndex,
        generationId: input.generationId,
        exactReason: errorMessage(error),
      },
      now: input.context.now,
    });
    return null;
  }
  const rawBody = await response.text();
  const path = resolve(
    input.context.paths.metadataResponses,
    `${String(metadataGetIndex).padStart(
      2,
      "0",
    )}-${input.generationId}.http-body.txt`,
  );
  let parsed:
    | ReturnType<
        typeof parseOpenRouterGenerationMetadata
      >
    | undefined;
  try {
    const persisted =
      await persistRawResponseBeforeParse({
        path,
        rawBody,
        prohibitedSecret: input.context.secret,
        recordPersistence: async (evidence) => {
          await appendLedger({
            path: input.context.paths.ledger,
            planHash: input.context.plan.planHash,
            event: "METADATA_RAW_RESPONSE_PERSISTED",
            data: {
              metadataGetIndex,
              kind: "GENERATION_COST_FALLBACK",
              generationId: input.generationId,
              httpStatus: response!.status,
              rawBodyPath: relative(
                input.context.paths.root,
                path,
              ),
              ...evidence,
            },
            now: input.context.now,
          });
        },
        parse: (body) =>
          parseOpenRouterGenerationMetadata(
            body,
            input.generationId,
          ),
      });
    parsed = persisted.parsed;
  } catch (error) {
    await appendLedger({
      path: input.context.paths.ledger,
      planHash: input.context.plan.planHash,
      event: "GENERATION_COST_FALLBACK_INVALID",
      data: {
        metadataGetIndex,
        generationId: input.generationId,
        httpStatus: response.status,
        exactReason: errorMessage(error),
      },
      now: input.context.now,
    });
    return null;
  }
  if (!response.ok) return null;
  return {
    metadata: parsed,
  };
}

function extractAudioTokens(envelope: unknown): number | null {
  if (!isRecord(envelope) || !isRecord(envelope.usage)) {
    return null;
  }
  const candidates = [
    isRecord(envelope.usage.prompt_tokens_details)
      ? envelope.usage.prompt_tokens_details
          .audio_tokens
      : undefined,
    envelope.usage.audio_tokens,
  ].filter((value) => value !== undefined);
  if (
    candidates.length !== 1 ||
    typeof candidates[0] !== "number" ||
    !Number.isSafeInteger(candidates[0]) ||
    candidates[0] < 0
  ) {
    return null;
  }
  return candidates[0];
}

async function reconcileByKeyDelta(input: {
  context: ExecutionContext;
  before: KeySnapshot;
  label: string;
}): Promise<{
  resolved: true;
  costQuanta: bigint;
  costUsd: string;
  source: "current_key_usage_delta";
} | {
  resolved: false;
  exactReason: string;
}> {
  try {
    const after = await getCurrentKey(
      input.context,
      input.label,
    );
    const delta =
      after.usageQuanta - input.before.usageQuanta;
    if (delta < 0n) {
      return {
        resolved: false,
        exactReason:
          "Current-key usage decreased after a transmitted request",
      };
    }
    return {
      resolved: true,
      costQuanta: delta,
      costUsd: formatUsdQuanta(delta),
      source: "current_key_usage_delta",
    };
  } catch (error) {
    return {
      resolved: false,
      exactReason: `Key-delta reconciliation failed: ${errorMessage(
        error,
      )}`,
    };
  }
}

function addKnownCost(
  state: ExecutionState,
  cost: bigint,
): void {
  if (cost < 0n) {
    throw new Error("Resolved request cost is negative");
  }
  state.knownNewActualCostQuanta += cost;
  const cap =
    parseUsdToQuanta(
      PIPER_PANEL_V2_CARRIED_COST_USD,
    ) +
    state.knownNewActualCostQuanta +
    state.unresolvedActualUsageDeltaQuanta;
  if (
    cap >
    parseUsdToQuanta(
      PIPER_PANEL_V2_MAXIMUM_COST_USD,
    )
  ) {
    state.terminalReason =
      "ACTUAL_COST_EXCEEDED_USD_10";
  }
}

function recordInvalid(
  context: ExecutionContext,
  invalid: InvalidAttempt,
): void {
  context.state.invalidAttempts.push(invalid);
  context.state.attempts.push({
    requestOrdinal: invalid.requestOrdinal,
    perspectiveId: invalid.perspectiveId,
    attempt: invalid.attempt,
    phase:
      invalid.attempt === 1
        ? "PRIMARY"
        : "REPLACEMENT",
    httpStatus: invalid.httpStatus,
    responseId: invalid.responseId,
    rawBodySha256: invalid.rawBodySha256,
    actualCostUsd: invalid.actualCostUsd,
    costSource: invalid.costSource,
    promptTokens: null,
    completionTokens: null,
    audioTokens: null,
    valid: false,
  });
}

async function executeAttempt(input: {
  context: ExecutionContext;
  perspectiveId: PiperPanelV2PerspectiveId;
  attempt: 1 | 2;
}): Promise<void> {
  const { context } = input;
  if (
    context.state.terminalReason !== null ||
    context.state.validRuns.has(input.perspectiveId) ||
    (input.attempt === 1 &&
      context.state.primaryAttempted.has(
        input.perspectiveId,
      ))
  ) {
    return;
  }
  const priorRandomizations = [
    ...context.frozen.priorRecoveryRandomizations,
    ...context.state.randomizations,
  ];
  const randomization =
    buildFreshRecoveryRandomization({
      perspectiveId:
        input.perspectiveId as ResponseRecoveryPerspectiveId,
      evaluationPackageId:
        context.frozen.evaluationPackageId,
      sourcePairs: context.frozen.sourcePairs,
      priorAssignments:
        context.frozen.priorAssignments,
      priorRecoveryRandomizations:
        priorRandomizations,
      entropySource: () => randomBytes(32),
    });
  assertFreshRecoveryRandomization({
    randomization,
    evaluationPackageId:
      context.frozen.evaluationPackageId,
    sourcePairs: context.frozen.sourcePairs,
    priorAssignments:
      context.frozen.priorAssignments,
    priorRecoveryRandomizations:
      priorRandomizations,
  });
  const audioContent =
    await phase2cPrimaryJudgeHttpTestHooks.recoveryAudioContent(
      context.frozen as never,
      randomization,
    );
  const built = buildPiperPanelV2Request({
    assignment: randomization.assignment,
    audioContent,
  });
  assertPiperPanelV2Request(built.body);
  const estimate =
    estimatePiperPanelV2RequestCost({
      durationSeconds:
        context.frozen.sourcePairs.flatMap((pair) =>
          pair.samples.map(
            (sample) => sample.durationSeconds,
          ),
        ),
      textPayloadBytes: built.textPayloadBytes,
      maximumCompletionTokens:
        PIPER_PANEL_V2_MAX_TOKENS,
      pricing: context.model.pricing,
    });
  let beforeKey: KeySnapshot;
  try {
    beforeKey = await getCurrentKey(
      context,
      `before-post-${String(
        context.state.paidPosts + 1,
      )}`,
    );
  } catch (error) {
    context.state.costEvidenceStable = false;
    context.state.terminalReason =
      `CURRENT_KEY_PREFLIGHT_FAILED: ${errorMessage(
        error,
      )}`;
    await appendLedger({
      path: context.paths.ledger,
      planHash: context.plan.planHash,
      event: "CURRENT_KEY_PREFLIGHT_BLOCKED_POST",
      data: {
        perspectiveId: input.perspectiveId,
        attempt: input.attempt,
        exactReason:
          context.state.terminalReason,
        paidPostsBeforeFailure:
          context.state.paidPosts,
      },
      now: context.now,
    });
    return;
  }
  const knownCumulative =
    parseUsdToQuanta(
      PIPER_PANEL_V2_CARRIED_COST_USD,
    ) + context.state.knownNewActualCostQuanta;
  context.state.unresolvedActualUsageDeltaQuanta =
    beforeKey.usageQuanta > knownCumulative
      ? beforeKey.usageQuanta - knownCumulative
      : 0n;
  if (beforeKey.usageQuanta < knownCumulative) {
    await appendLedger({
      path: context.paths.ledger,
      planHash: context.plan.planHash,
      event: "CURRENT_KEY_USAGE_LAG_OBSERVED",
      data: {
        perspectiveId: input.perspectiveId,
        attempt: input.attempt,
        providerReportedUsageUsd:
          beforeKey.usageUsd,
        locallyKnownAuthoritativeActualUsd:
          formatUsdQuanta(knownCumulative),
        lagUsd: formatUsdQuanta(
          knownCumulative -
            beforeKey.usageQuanta,
        ),
        admissionUses:
          "inline usage.cost plus local USD 10 cap and key limit_remaining",
      },
      now: context.now,
    });
  }
  const admission = authorizePiperPanelV2Request({
    paidPostsUsed: context.state.paidPosts,
    cumulativeKnownActualCost: knownCumulative,
    unresolvedActualUsageDelta:
      context.state.unresolvedActualUsageDeltaQuanta,
    maximumUncertainCost:
      context.state.maximumUncertainCostQuanta,
    nextEstimate:
      estimate.conservativeCostQuanta,
    keyUsage: beforeKey.usageQuanta,
    keyLimit: beforeKey.limitQuanta,
    keyLimitRemaining:
      beforeKey.remainingQuanta,
    costEvidenceStable:
      context.state.costEvidenceStable,
  });
  if (!admission.allowed) {
    context.state.terminalReason =
      admission.reason ?? "ADMISSION_BLOCKED";
    await appendLedger({
      path: context.paths.ledger,
      planHash: context.plan.planHash,
      event: "PAID_POST_ADMISSION_BLOCKED",
      data: {
        perspectiveId: input.perspectiveId,
        attempt: input.attempt,
        reason: context.state.terminalReason,
        estimateUsd:
          estimate.conservativeCostUsd,
        projectedCapCostUsd:
          admission.projectedCapCostUsd,
      },
      now: context.now,
    });
    return;
  }
  const requestOrdinal =
    context.state.paidPosts + 1;
  const phase =
    input.attempt === 1
      ? "PRIMARY"
      : "REPLACEMENT";
  const stem = `${String(requestOrdinal).padStart(
    2,
    "0",
  )}-${input.perspectiveId}-attempt-${String(
    input.attempt,
  )}`;
  const randomizationPath = resolve(
    context.paths.randomizations,
    `${stem}.json`,
  );
  const requestPath = resolve(
    context.paths.redactedRequests,
    `${stem}.json`,
  );
  await writeNewRestricted(
    randomizationPath,
    `${canonicalAiJson(randomization)}\n`,
  );
  await writeNewRestricted(
    requestPath,
    `${canonicalAiJson({
      ...built.redactedRequest,
      requestBodySha256:
        built.requestBodySha256,
      costEstimate: {
        ...estimate,
        conservativeCostQuanta:
          estimate.conservativeCostQuanta.toString(),
      },
    })}\n`,
  );
  await appendLedger({
    path: context.paths.ledger,
    planHash: context.plan.planHash,
    event: "PAID_POST_RESERVED",
    data: {
      requestOrdinal,
      phase,
      perspectiveId: input.perspectiveId,
      attempt: input.attempt,
      requestBodySha256:
        built.requestBodySha256,
      redactedRequestPath: relative(
        context.paths.root,
        requestPath,
      ),
      randomizationPath: relative(
        context.paths.root,
        randomizationPath,
      ),
      randomizationSha256:
        randomization.randomizationSha256,
      audioInputCount: built.audioInputCount,
      responseFormatOmitted: true,
      maximumOutputTokens:
        PIPER_PANEL_V2_MAX_TOKENS,
      conservativeEstimateUsd:
        estimate.conservativeCostUsd,
      projectedCapCostUsd:
        admission.projectedCapCostUsd,
    },
    now: context.now,
  });
  context.state.randomizations.push(
    randomization,
  );
  context.state.paidPosts = requestOrdinal;
  if (input.attempt === 1) {
    context.state.primaryPosts += 1;
    context.state.primaryAttempted.add(
      input.perspectiveId,
    );
  } else {
    context.state.replacementPosts += 1;
  }
  await appendLedger({
    path: context.paths.ledger,
    planHash: context.plan.planHash,
    event: "PAID_POST_DISPATCHED",
    data: {
      requestOrdinal,
      phase,
      perspectiveId: input.perspectiveId,
      attempt: input.attempt,
      endpoint: "/chat/completions",
      model: PIPER_PANEL_V2_MODEL_ID,
      secretStored: false,
      completeRequestBodyStored: false,
    },
    now: context.now,
  });
  process.stdout.write(
    `Dispatched ${phase.toLowerCase()} ${String(
      requestOrdinal,
    )} for ${input.perspectiveId}; estimate USD ${
      estimate.conservativeCostUsd
    }.\n`,
  );
  let response:
    | Awaited<ReturnType<FetchLike>>
    | undefined;
  try {
    response = await withTimeout(
      120_000,
      (signal) =>
        context.fetchImpl(CHAT_ENDPOINT, {
          method: "POST",
          redirect: "error",
          signal,
          headers: {
            Authorization: `Bearer ${context.secret}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://tenxpros.com",
            "X-OpenRouter-Title":
              "TenXPros Academy Audio Evaluation",
          },
          body: JSON.stringify(built.body),
        }),
    );
  } catch (error) {
    const reconciled = await reconcileByKeyDelta({
      context,
      before: beforeKey,
      label: `after-transport-ambiguity-${String(
        requestOrdinal,
      )}`,
    });
    if (reconciled.resolved) {
      addKnownCost(
        context.state,
        reconciled.costQuanta,
      );
    } else {
      context.state.maximumUncertainCostQuanta =
        estimate.conservativeCostQuanta;
      context.state.costEvidenceStable = false;
      context.state.terminalReason =
        "AMBIGUOUS_TRANSPORT_COST_UNRESOLVED";
    }
    recordInvalid(context, {
      requestOrdinal,
      perspectiveId: input.perspectiveId,
      attempt: input.attempt,
      httpStatus: null,
      responseId: null,
      rawBodySha256: null,
      actualCostUsd: reconciled.resolved
        ? reconciled.costUsd
        : null,
      costSource: reconciled.resolved
        ? reconciled.source
        : null,
      exactReason: reconciled.resolved
        ? `Transport ambiguity after transmission; cost reconciled. ${errorMessage(
            error,
          )}`
        : `${errorMessage(error)}; ${reconciled.exactReason}`,
    });
    return;
  }
  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch (error) {
    const reconciled = await reconcileByKeyDelta({
      context,
      before: beforeKey,
      label: `after-body-read-ambiguity-${String(
        requestOrdinal,
      )}`,
    });
    if (reconciled.resolved) {
      addKnownCost(
        context.state,
        reconciled.costQuanta,
      );
    } else {
      context.state.maximumUncertainCostQuanta =
        estimate.conservativeCostQuanta;
      context.state.costEvidenceStable = false;
      context.state.terminalReason =
        "AMBIGUOUS_BODY_READ_COST_UNRESOLVED";
    }
    recordInvalid(context, {
      requestOrdinal,
      perspectiveId: input.perspectiveId,
      attempt: input.attempt,
      httpStatus: response.status,
      responseId: safeGenerationHeader(response),
      rawBodySha256: null,
      actualCostUsd: reconciled.resolved
        ? reconciled.costUsd
        : null,
      costSource: reconciled.resolved
        ? reconciled.source
        : null,
      exactReason: reconciled.resolved
        ? `Response-body read failed after transmission; cost reconciled. ${errorMessage(
            error,
          )}`
        : `${errorMessage(error)}; ${reconciled.exactReason}`,
    });
    return;
  }
  const rawPath = resolve(
    context.paths.rawResponses,
    `${stem}.http-body.txt`,
  );
  let envelope: unknown;
  let rawBodySha256: string;
  try {
    const persisted =
      await persistRawResponseBeforeParse({
        path: rawPath,
        rawBody,
        prohibitedSecret: context.secret,
        recordPersistence: async (evidence) => {
          await appendLedger({
            path: context.paths.ledger,
            planHash: context.plan.planHash,
            event: "INFERENCE_RAW_RESPONSE_PERSISTED",
            data: {
              requestOrdinal,
              phase,
              perspectiveId:
                input.perspectiveId,
              attempt: input.attempt,
              httpStatus: response!.status,
              responseIdFromHeader:
                safeGenerationHeader(response!),
              rawBodyPath: relative(
                context.paths.root,
                rawPath,
              ),
              ...evidence,
              semanticParseStarted: false,
              safeResponseHeaders:
                safeHeaders(response!),
            },
            now: context.now,
          });
        },
        parse: (body) =>
          JSON.parse(body) as unknown,
      });
    envelope = persisted.parsed;
    rawBodySha256 =
      persisted.rawBodySha256;
  } catch (error) {
    const reconciled = await reconcileByKeyDelta({
      context,
      before: beforeKey,
      label: `after-persistence-failure-${String(
        requestOrdinal,
      )}`,
    });
    if (reconciled.resolved) {
      addKnownCost(
        context.state,
        reconciled.costQuanta,
      );
    } else {
      context.state.maximumUncertainCostQuanta =
        estimate.conservativeCostQuanta;
      context.state.costEvidenceStable = false;
      context.state.terminalReason =
        "RAW_PERSISTENCE_OR_PARSE_COST_UNRESOLVED";
    }
    recordInvalid(context, {
      requestOrdinal,
      perspectiveId: input.perspectiveId,
      attempt: input.attempt,
      httpStatus: response.status,
      responseId: safeGenerationHeader(response),
      rawBodySha256: null,
      actualCostUsd: reconciled.resolved
        ? reconciled.costUsd
        : null,
      costSource: reconciled.resolved
        ? reconciled.source
        : null,
      exactReason: `Raw-first persistence or envelope JSON gate failed: ${errorMessage(
        error,
      )}`,
    });
    return;
  }
  let receipt:
    | ReturnType<
        typeof parseOpenRouterChatCompletionReceipt
      >
    | null = null;
  let receiptError: string | null = null;
  try {
    receipt =
      parseOpenRouterChatCompletionReceipt({
        rawBody,
        generationHeaderId:
          safeGenerationHeader(response),
      });
  } catch (error) {
    receiptError = errorMessage(error);
  }
  let cost:
    | {
        costQuanta: bigint;
        costUsd: string;
        source: string;
        promptTokens: number | null;
        completionTokens: number | null;
      }
    | null = null;
  if (
    response.status >= 400 &&
    response.status < 500 &&
    receipt?.generationId === null
  ) {
    const reconciled = await reconcileByKeyDelta({
      context,
      before: beforeKey,
      label: `after-4xx-${String(requestOrdinal)}`,
    });
    if (reconciled.resolved) {
      cost = {
        ...reconciled,
        promptTokens: receipt.promptTokens,
        completionTokens:
          receipt.completionTokens,
      };
    }
  } else if (receipt !== null) {
    let resolution =
      resolveOpenRouterPaidJudgeCost({ receipt });
    if (
      resolution.status ===
      "REQUIRES_GENERATION_METADATA"
    ) {
      const fallback =
        await generationCostFallback({
          context,
          generationId:
            resolution.generationId,
          requestOrdinal,
        });
      if (fallback !== null) {
        resolution =
          resolveOpenRouterPaidJudgeCost({
            receipt,
            generationMetadata:
              fallback.metadata,
          });
      }
    }
    if (resolution.status === "RESOLVED") {
      cost = {
        costQuanta:
          resolution.costQuanta,
        costUsd: resolution.costUsd,
        source: resolution.source,
        promptTokens: receipt.promptTokens,
        completionTokens:
          receipt.completionTokens,
      };
    }
  }
  if (cost === null) {
    const reconciled = await reconcileByKeyDelta({
      context,
      before: beforeKey,
      label: `after-unresolved-cost-${String(
        requestOrdinal,
      )}`,
    });
    if (reconciled.resolved) {
      cost = {
        ...reconciled,
        promptTokens:
          receipt?.promptTokens ?? null,
        completionTokens:
          receipt?.completionTokens ?? null,
      };
    } else {
      context.state.maximumUncertainCostQuanta =
        estimate.conservativeCostQuanta;
      context.state.costEvidenceStable = false;
      context.state.terminalReason =
        "REQUEST_COST_UNRESOLVED";
      recordInvalid(context, {
        requestOrdinal,
        perspectiveId: input.perspectiveId,
        attempt: input.attempt,
        httpStatus: response.status,
        responseId:
          receipt?.generationId ??
          safeGenerationHeader(response),
        rawBodySha256,
        actualCostUsd: null,
        costSource: null,
        exactReason: `Request cost could not be resolved${
          receiptError === null
            ? ""
            : `; receipt error: ${receiptError}`
        }; ${reconciled.exactReason}`,
      });
      return;
    }
  }
  addKnownCost(
    context.state,
    cost.costQuanta,
  );
  const responseId =
    receipt?.generationId ??
    safeGenerationHeader(response);
  if (response.status === 402) {
    context.state.terminalReason =
      "HTTP_402_INSUFFICIENT_CREDIT";
    recordInvalid(context, {
      requestOrdinal,
      perspectiveId: input.perspectiveId,
      attempt: input.attempt,
      httpStatus: response.status,
      responseId,
      rawBodySha256,
      actualCostUsd: cost.costUsd,
      costSource: cost.source,
      exactReason:
        "HTTP 402 fail-closed insufficient-credit response",
    });
    return;
  }
  if (!response.ok) {
    recordInvalid(context, {
      requestOrdinal,
      perspectiveId: input.perspectiveId,
      attempt: input.attempt,
      httpStatus: response.status,
      responseId,
      rawBodySha256,
      actualCostUsd: cost.costUsd,
      costSource: cost.source,
      exactReason: `OpenRouter returned HTTP ${String(
        response.status,
      )}`,
    });
    return;
  }
  try {
    if (responseId === null) {
      throw new Error(
        "Successful response has no OpenRouter generation ID",
      );
    }
    if (
      [...context.state.validRuns.values()].some(
        (run) =>
          run.responseId === responseId ||
          run.rawBodySha256 === rawBodySha256,
      )
    ) {
      throw new Error(
        "Successful response duplicates an accepted response identity",
      );
    }
    const argumentsJson =
      piperPanelV2ArgumentsFromEnvelope(envelope);
    const evaluation =
      parsePiperPanelV2ToolArguments({
        argumentsJson,
        assignment:
          randomization.assignment,
      });
    const normalizedResponseSha256 =
      hashAiValue(evaluation);
    const normalizedPath = resolve(
      context.paths.normalizedResponses,
      `${stem}.json`,
    );
    await writeNewRestricted(
      normalizedPath,
      `${canonicalPiperPanelV2(evaluation)}\n`,
    );
    const run: PiperPanelV2Run = {
      perspectiveId: input.perspectiveId,
      assignment:
        randomization.assignment,
      evaluation,
      responseId,
      rawBodySha256,
      normalizedResponseSha256,
      requestOrdinal,
      attempt: input.attempt,
    };
    context.state.validRuns.set(
      input.perspectiveId,
      run,
    );
    const audioTokens =
      extractAudioTokens(envelope);
    context.state.attempts.push({
      requestOrdinal,
      perspectiveId: input.perspectiveId,
      attempt: input.attempt,
      phase,
      httpStatus: response.status,
      responseId,
      rawBodySha256,
      actualCostUsd: cost.costUsd,
      costSource: cost.source,
      promptTokens: cost.promptTokens,
      completionTokens:
        cost.completionTokens,
      audioTokens,
      valid: true,
    });
    await appendLedger({
      path: context.paths.ledger,
      planHash: context.plan.planHash,
      event: "INFERENCE_RESPONSE_ACCEPTED",
      data: {
        requestOrdinal,
        phase,
        perspectiveId: input.perspectiveId,
        attempt: input.attempt,
        httpStatus: response.status,
        responseId,
        rawBodySha256,
        normalizedResponseSha256,
        normalizedPath: relative(
          context.paths.root,
          normalizedPath,
        ),
        actualCostUsd: cost.costUsd,
        costSource: cost.source,
        promptTokens: cost.promptTokens,
        completionTokens:
          cost.completionTokens,
        audioTokens,
      },
      now: context.now,
    });
    process.stdout.write(
      `Accepted ${input.perspectiveId} from request ${String(
        requestOrdinal,
      )}; actual USD ${cost.costUsd}.\n`,
    );
  } catch (error) {
    const invalid: InvalidAttempt = {
      requestOrdinal,
      perspectiveId: input.perspectiveId,
      attempt: input.attempt,
      httpStatus: response.status,
      responseId,
      rawBodySha256,
      actualCostUsd: cost.costUsd,
      costSource: cost.source,
      exactReason: errorMessage(error),
    };
    recordInvalid(context, invalid);
    await appendLedger({
      path: context.paths.ledger,
      planHash: context.plan.planHash,
      event: "INFERENCE_RESPONSE_REJECTED",
      data: { ...invalid },
      now: context.now,
    });
    process.stdout.write(
      `Rejected ${input.perspectiveId} request ${String(
        requestOrdinal,
      )}: ${invalid.exactReason}.\n`,
    );
  }
}

export interface PiperPanelV2LiveResult {
  status: "COMPLETE" | "INCONCLUSIVE";
  planHash: string;
  primaryRequests: number;
  replacementRequests: number;
  totalPaidJudgePosts: number;
  metadataGets: number;
  validIndependentPerspectives: number;
  cumulativeKnownActualCostUsd: string;
  newActualCostUsd: string;
  unresolvedActualUsageDeltaUsd: string;
  maximumUncertainCostUsd: string;
  taskDecision:
    | "PASS_PIPER_BRYCE"
    | "TUNE_PIPER_PIPELINE"
    | "TEST_OTHER_LOCAL_VOICES"
    | "CONSIDER_ELEVENLABS"
    | "INCONCLUSIVE_AI_ONLY_EVALUATION";
  terminalReason: string | null;
  outputDirectory: string;
}

async function fetchModelCatalog(input: {
  paths: RunPaths;
  fetchImpl: FetchLike;
  metadataGetIndex: number;
}): Promise<{
  model: PiperPanelV2ModelCapability;
  rawBodySha256: string;
  httpStatus: number;
}> {
  const response = await withTimeout(
    30_000,
    (signal) =>
      input.fetchImpl(MODELS_ENDPOINT, {
        method: "GET",
        redirect: "error",
        signal,
      }),
  );
  const rawBody = await response.text();
  const path = resolve(
    input.paths.metadataResponses,
    `${String(input.metadataGetIndex).padStart(
      2,
      "0",
    )}-model-catalog.http-body.json`,
  );
  const persisted =
    await persistRawResponseBeforeParse({
      path,
      rawBody,
      recordPersistence: async () => {},
      parse: (body) =>
        parsePiperPanelV2ModelCatalog(body),
    });
  if (!response.ok) {
    throw new Error(
      `OpenRouter model catalog failed with HTTP ${String(
        response.status,
      )}`,
    );
  }
  return {
    model: persisted.parsed,
    rawBodySha256:
      persisted.rawBodySha256,
    httpStatus: response.status,
  };
}

async function createLayout(): Promise<RunPaths> {
  await ensurePrivateDirectory(PHASE_ROOT, true);
  await ensurePrivateDirectory(
    LIVE_OUTPUT_DIRECTORY,
  );
  const paths = runPaths(LIVE_OUTPUT_DIRECTORY);
  for (const path of [
    paths.privateRoot,
    paths.rawResponses,
    paths.redactedRequests,
    paths.randomizations,
    paths.normalizedResponses,
    paths.keySnapshots,
    paths.metadataResponses,
  ]) {
    await ensurePrivateDirectory(path);
  }
  return paths;
}

async function assertAndLoadContinuation(
  frozen: PaidRecoveryFrozenInput,
): Promise<FreshRecoveryRandomization> {
  const zeroLedgerPath = resolve(
    ZERO_POST_RUN_DIRECTORY,
    "request-ledger.jsonl",
  );
  const oneLedgerPath = resolve(
    ONE_POST_RUN_DIRECTORY,
    "request-ledger.jsonl",
  );
  const priorPlanPath = resolve(
    ONE_POST_RUN_DIRECTORY,
    "evaluation-plan.json",
  );
  const rawPath = resolve(
    ONE_POST_RUN_DIRECTORY,
    "private",
    "raw-inference-responses",
    "01-judge-01-attempt-1.http-body.txt",
  );
  const randomizationPath = resolve(
    ONE_POST_RUN_DIRECTORY,
    "private",
    "blind-randomizations",
    "01-judge-01-attempt-1.json",
  );
  const hashes = await Promise.all([
    sha256File(zeroLedgerPath),
    sha256File(oneLedgerPath),
    sha256File(priorPlanPath),
    sha256File(rawPath),
    sha256File(randomizationPath),
  ]);
  if (
    hashes[0] !==
      CONTINUED_ZERO_POST_LEDGER_SHA256 ||
    hashes[1] !==
      CONTINUED_ONE_POST_LEDGER_SHA256 ||
    hashes[2] !== CONTINUED_PLAN_FILE_SHA256 ||
    hashes[3] !==
      CONTINUED_RAW_RESPONSE_SHA256 ||
    hashes[4] !==
      CONTINUED_RANDOMIZATION_FILE_SHA256
  ) {
    throw new Error(
      "Prior tool-panel continuation evidence changed",
    );
  }
  const [zeroTerminal, oneEntries, priorPlan] =
    await Promise.all([
      readLedger(zeroLedgerPath).then((items) =>
        items.at(-1),
      ),
      readLedger(oneLedgerPath),
      readFile(priorPlanPath, "utf8").then(
        (value) =>
          JSON.parse(value) as {
            planHash?: unknown;
          },
      ),
    ]);
  const oneTerminal = oneEntries.at(-1);
  const rejection = oneEntries.find(
    (entry) =>
      entry.event ===
        "INFERENCE_RESPONSE_REJECTED" &&
      entry.data.requestOrdinal === 1,
  );
  if (
    zeroTerminal?.entryHash !==
      CONTINUED_ZERO_POST_TERMINAL_HASH ||
    zeroTerminal.event !==
      "PANEL_EXECUTION_COMPLETED" ||
    zeroTerminal.data.totalPaidJudgePosts !== 0 ||
    oneTerminal?.entryHash !==
      CONTINUED_ONE_POST_TERMINAL_HASH ||
    oneTerminal.event !==
      "PANEL_EXECUTION_COMPLETED" ||
    oneTerminal.data.totalPaidJudgePosts !== 1 ||
    priorPlan.planHash !== CONTINUED_PLAN_HASH ||
    rejection?.data.perspectiveId !==
      "judge-01" ||
    rejection.data.attempt !== 1 ||
    rejection.data.responseId !==
      CONTINUED_RESPONSE_ID ||
    rejection.data.rawBodySha256 !==
      CONTINUED_RAW_RESPONSE_SHA256 ||
    rejection.data.actualCostUsd !==
      CONTINUED_ACTUAL_COST_USD ||
    rejection.data.costSource !==
      "usage.cost" ||
    rejection.data.exactReason !==
      "$.pairs[0].a.naturalness must be an integer from 1 to 5"
  ) {
    throw new Error(
      "Prior zero/one-POST terminal semantics changed",
    );
  }
  const randomization = JSON.parse(
    await readFile(randomizationPath, "utf8"),
  ) as FreshRecoveryRandomization;
  assertFreshRecoveryRandomization({
    randomization,
    evaluationPackageId:
      frozen.evaluationPackageId,
    sourcePairs: frozen.sourcePairs,
    priorAssignments: frozen.priorAssignments,
    priorRecoveryRandomizations:
      frozen.priorRecoveryRandomizations,
  });
  if (
    randomization.perspectiveId !== "judge-01"
  ) {
    throw new Error(
      "Continued randomization belongs to another perspective",
    );
  }
  return randomization;
}

async function acquireLock(now: () => string): Promise<void> {
  await writeNewRestricted(
    LIVE_LOCK_PATH,
    `${canonicalAiJson({
      schemaVersion:
        "tenxpros-openrouter-piper-panel-v2-lock-v1",
      taskAttachmentSha256:
        TASK_ATTACHMENT_SHA256,
      acquiredAt: now(),
      processId: process.pid,
      maximumPaidJudgePosts:
        PIPER_PANEL_V2_MAX_PAID_POSTS,
      secretRead: false,
      removal:
        "Retain as immutable evidence for this one-off paid run.",
    })}\n`,
  );
}

export async function runLivePiperPanelV2(input: {
  fetchImpl?: FetchLike;
  now?: () => string;
} = {}): Promise<PiperPanelV2LiveResult> {
  if (
    process.cwd() !==
    resolve(REPOSITORY_ROOT, "app")
  ) {
    throw new Error(
      "Run from the TenXPros app directory",
    );
  }
  const now =
    input.now ?? (() => new Date().toISOString());
  if (
    (await sha256File(TASK_ATTACHMENT)) !==
    TASK_ATTACHMENT_SHA256
  ) {
    throw new Error("Task attachment hash changed");
  }
  const prepared =
    await prepareLivePaidGenerationRecovery();
  await Promise.all(
    prepared.execution.frozen.audio.map(
      async (sample) => {
        if (
          (await sha256File(sample.path)) !==
          sample.sha256
        ) {
          throw new Error(
            `Frozen audio changed: ${sample.sampleId}`,
          );
        }
      },
    ),
  );
  const continuedRandomization =
    await assertAndLoadContinuation(
      prepared.execution.frozen,
    );
  const paths = await createLayout();
  await acquireLock(now);
  const fetchImpl: FetchLike =
    input.fetchImpl ??
    (async (url, init) =>
      fetch(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        redirect: init.redirect,
        signal: init.signal,
      }));
  const catalog = await fetchModelCatalog({
    paths,
    fetchImpl,
    metadataGetIndex:
      CONTINUED_METADATA_GETS + 1,
  });
  const plan = buildPlan({
    frozen: prepared.execution.frozen,
    priorPlan: prepared.execution.plan,
    model: catalog.model,
  });
  await writeNewRestricted(
    paths.plan,
    `${canonicalAiJson(plan)}\n`,
  );
  await appendLedger({
    path: paths.ledger,
    planHash: plan.planHash,
    event: "PLAN_PINNED",
    data: {
      planPath: relative(paths.root, paths.plan),
      planFileSha256: await sha256File(paths.plan),
      taskAttachmentSha256:
        TASK_ATTACHMENT_SHA256,
      frozenAudioCount: 10,
      maximumPaidJudgePosts: 7,
      carriedActualCostUsd:
        PIPER_PANEL_V2_CARRIED_COST_USD,
      continuedActualCostUsd:
        CONTINUED_ACTUAL_COST_USD,
      continuedPaidJudgePosts: 1,
    },
    now,
  });
  await appendLedger({
    path: paths.ledger,
    planHash: plan.planHash,
    event: "METADATA_RAW_RESPONSE_PERSISTED",
    data: {
      metadataGetIndex:
        CONTINUED_METADATA_GETS + 1,
      kind: "MODEL_CATALOG",
      paidInference: false,
      httpStatus: catalog.httpStatus,
      rawBodyPath: relative(
        paths.root,
        resolve(
          paths.metadataResponses,
          `${String(
            CONTINUED_METADATA_GETS + 1,
          ).padStart(
            2,
            "0",
          )}-model-catalog.http-body.json`,
        ),
      ),
      rawBodySha256:
        catalog.rawBodySha256,
      parsedModel:
        PIPER_PANEL_V2_MODEL_ID,
      pricing: plan.modelCapability.pricing,
    },
    now,
  });
  const secret =
    (
      await phase2cPrimaryJudgeHttpTestHooks.readOpenRouterSecretFileAfterAllGates(
        SECRET_PATH,
      )
    ).trim();
  if (secret.length < 16) {
    throw new Error(
      "OpenRouter inference key is unavailable",
    );
  }
  const state: ExecutionState = {
    paidPosts: 1,
    primaryPosts: 1,
    replacementPosts: 0,
    metadataGets:
      CONTINUED_METADATA_GETS + 1,
    knownNewActualCostQuanta:
      parseUsdToQuanta(
        CONTINUED_ACTUAL_COST_USD,
      ),
    unresolvedActualUsageDeltaQuanta: 0n,
    maximumUncertainCostQuanta: 0n,
    costEvidenceStable: true,
    terminalReason: null,
    validRuns: new Map(),
    invalidAttempts: [
      {
        requestOrdinal: 1,
        perspectiveId: "judge-01",
        attempt: 1,
        httpStatus: 200,
        responseId: CONTINUED_RESPONSE_ID,
        rawBodySha256:
          CONTINUED_RAW_RESPONSE_SHA256,
        actualCostUsd:
          CONTINUED_ACTUAL_COST_USD,
        costSource: "usage.cost",
        exactReason:
          "$.pairs[0].a.naturalness must be an integer from 1 to 5",
      },
    ],
    attempts: [
      {
        requestOrdinal: 1,
        perspectiveId: "judge-01",
        attempt: 1,
        phase: "PRIMARY",
        httpStatus: 200,
        responseId: CONTINUED_RESPONSE_ID,
        rawBodySha256:
          CONTINUED_RAW_RESPONSE_SHA256,
        actualCostUsd:
          CONTINUED_ACTUAL_COST_USD,
        costSource: "usage.cost",
        promptTokens: 11_119,
        completionTokens: 1_670,
        audioTokens: 10_020,
        valid: false,
      },
    ],
    randomizations: [continuedRandomization],
    primaryAttempted: new Set(["judge-01"]),
  };
  const context: ExecutionContext = {
    paths,
    plan,
    frozen: prepared.execution.frozen,
    model: catalog.model,
    fetchImpl,
    secret,
    now,
    state,
  };
  await appendLedger({
    path: paths.ledger,
    planHash: plan.planHash,
    event: "SECRET_READ_IN_MEMORY_AFTER_ALL_GATES",
    data: {
      secretStored: false,
      secretLogged: false,
      secretPathStored: false,
    },
    now,
  });
  await appendLedger({
    path: paths.ledger,
    planHash: plan.planHash,
    event: "PRIOR_TOOL_PANEL_RUN_CONTINUED",
    data: {
      continuedPlanHash: CONTINUED_PLAN_HASH,
      zeroPostLedgerSha256:
        CONTINUED_ZERO_POST_LEDGER_SHA256,
      onePostLedgerSha256:
        CONTINUED_ONE_POST_LEDGER_SHA256,
      priorPaidJudgePosts: 1,
      priorPrimaryPosts: 1,
      priorActualCostUsd:
        CONTINUED_ACTUAL_COST_USD,
      invalidPerspectiveId: "judge-01",
      invalidReason:
        "$.pairs[0].a.naturalness must be an integer from 1 to 5",
      providerKeyUsageLagDoesNotOverride:
        "authoritative inline usage.cost",
    },
    now,
  });
  for (const perspectiveId of PERSPECTIVE_IDS) {
    if (state.terminalReason !== null) break;
    await executeAttempt({
      context,
      perspectiveId,
      attempt: 1,
    });
  }
  if (
    state.terminalReason === null &&
    state.primaryPosts === 5
  ) {
    const missing = PERSPECTIVE_IDS.filter(
      (perspectiveId) =>
        !state.validRuns.has(perspectiveId),
    );
    for (const perspectiveId of missing.slice(0, 2)) {
      if (state.terminalReason !== null) break;
      await executeAttempt({
        context,
        perspectiveId,
        attempt: 2,
      });
    }
  }
  if (
    state.paidPosts > 0 &&
    state.maximumUncertainCostQuanta === 0n
  ) {
    try {
      const finalKey = await getCurrentKey(
        context,
        "final-after-panel",
      );
      const known =
        parseUsdToQuanta(
          PIPER_PANEL_V2_CARRIED_COST_USD,
        ) + state.knownNewActualCostQuanta;
      state.unresolvedActualUsageDeltaQuanta =
        finalKey.usageQuanta > known
          ? finalKey.usageQuanta - known
          : 0n;
      await appendLedger({
        path: paths.ledger,
        planHash: plan.planHash,
        event: "FINAL_KEY_USAGE_RECONCILED",
        data: {
          usageUsd: finalKey.usageUsd,
          knownActualCostUsd:
            formatUsdQuanta(known),
          unresolvedActualUsageDeltaUsd:
            formatUsdQuanta(
              state.unresolvedActualUsageDeltaQuanta,
            ),
          providerUsageLagUsd:
            finalKey.usageQuanta < known
              ? formatUsdQuanta(
                  known -
                    finalKey.usageQuanta,
                )
              : "0.00000000",
        },
        now,
      });
    } catch (error) {
      state.costEvidenceStable = false;
      state.terminalReason ??=
        `FINAL_KEY_RECONCILIATION_FAILED: ${errorMessage(
          error,
        )}`;
    }
  }
  const runs = PERSPECTIVE_IDS.flatMap(
    (perspectiveId) => {
      const run = state.validRuns.get(perspectiveId);
      return run ? [run] : [];
    },
  );
  const aggregate =
    runs.length > 0
      ? aggregatePiperPanelV2({
          runs,
          privateSamples:
            context.frozen.privateSamples,
          objective: context.frozen.objective,
        })
      : null;
  const taskDecision =
    runs.length === 5 && aggregate !== null
      ? aggregate.perceptualDecision
      : "INCONCLUSIVE_AI_ONLY_EVALUATION";
  await writeNewRestricted(
    paths.privateManifest,
    `${canonicalAiJson({
      schemaVersion:
        "tenxpros-openrouter-piper-panel-v2-private-manifest-v1",
      planHash: plan.planHash,
      randomizations: state.randomizations,
      privateSamples:
        context.frozen.privateSamples,
      acceptedRuns: runs.map((run) => ({
        perspectiveId: run.perspectiveId,
        requestOrdinal: run.requestOrdinal,
        responseId: run.responseId,
        rawBodySha256:
          run.rawBodySha256,
        normalizedResponseSha256:
          run.normalizedResponseSha256,
      })),
    })}\n`,
  );
  await writeNewRestricted(
    paths.panel,
    `${canonicalAiJson({
      schemaVersion:
        "tenxpros-openrouter-piper-panel-v2-result-v1",
      planHash: plan.planHash,
      status:
        runs.length === 5
          ? "COMPLETE"
          : "INCONCLUSIVE",
      validPerspectiveCount: runs.length,
      aggregate,
      taskDecision,
    })}\n`,
  );
  await writeNewRestricted(
    paths.invalid,
    `${canonicalAiJson({
      schemaVersion:
        "tenxpros-openrouter-piper-panel-v2-invalid-v1",
      invalidAttempts:
        state.invalidAttempts,
    })}\n`,
  );
  const cumulativeKnown =
    parseUsdToQuanta(
      PIPER_PANEL_V2_CARRIED_COST_USD,
    ) + state.knownNewActualCostQuanta;
  const costReport = {
    schemaVersion:
      "tenxpros-openrouter-piper-panel-v2-cost-v1",
    carriedActualCostUsd:
      PIPER_PANEL_V2_CARRIED_COST_USD,
    newActualCostUsd: formatUsdQuanta(
      state.knownNewActualCostQuanta,
    ),
    cumulativeKnownActualCostUsd:
      formatUsdQuanta(cumulativeKnown),
    unresolvedActualUsageDeltaUsd:
      formatUsdQuanta(
        state.unresolvedActualUsageDeltaQuanta,
      ),
    maximumUncertainCostUsd:
      formatUsdQuanta(
        state.maximumUncertainCostQuanta,
      ),
    capAccountedCostUsd: formatUsdQuanta(
      cumulativeKnown +
        state.unresolvedActualUsageDeltaQuanta +
        state.maximumUncertainCostQuanta,
    ),
    maximumCumulativeCostUsd:
      PIPER_PANEL_V2_MAXIMUM_COST_USD,
    paidJudgePosts: state.paidPosts,
    metadataGets: state.metadataGets,
    attempts: state.attempts,
    authoritativeCostSource:
      "inline usage.cost; generation total_cost fallback; current-key delta only for ambiguous/no-ID reconciliation",
    costEvidenceStable:
      state.costEvidenceStable,
  };
  await writeNewRestricted(
    paths.cost,
    `${canonicalAiJson(costReport)}\n`,
  );
  const result: PiperPanelV2LiveResult = {
    status:
      runs.length === 5
        ? "COMPLETE"
        : "INCONCLUSIVE",
    planHash: plan.planHash,
    primaryRequests: state.primaryPosts,
    replacementRequests:
      state.replacementPosts,
    totalPaidJudgePosts: state.paidPosts,
    metadataGets: state.metadataGets,
    validIndependentPerspectives:
      runs.length,
    cumulativeKnownActualCostUsd:
      formatUsdQuanta(cumulativeKnown),
    newActualCostUsd: formatUsdQuanta(
      state.knownNewActualCostQuanta,
    ),
    unresolvedActualUsageDeltaUsd:
      formatUsdQuanta(
        state.unresolvedActualUsageDeltaQuanta,
      ),
    maximumUncertainCostUsd:
      formatUsdQuanta(
        state.maximumUncertainCostQuanta,
      ),
    taskDecision,
    terminalReason:
      state.terminalReason,
    outputDirectory: paths.root,
  };
  await appendLedger({
    path: paths.ledger,
    planHash: plan.planHash,
    event: "PANEL_EXECUTION_COMPLETED",
    data: {
      ...result,
      outputDirectory: relative(
        REPOSITORY_ROOT,
        result.outputDirectory,
      ),
    },
    now,
  });
  const dimensions =
    aggregate?.dimensionScores.corrected ?? null;
  await writeNewRestricted(
    paths.report,
    `# Piper perceptual panel v2

- Status: ${result.status}
- Plan hash: \`${result.planHash}\`
- Primary requests: ${String(result.primaryRequests)} / 5
- Replacement requests: ${String(result.replacementRequests)} / 2
- Valid independent perspectives: ${String(result.validIndependentPerspectives)} / 5
- New actual OpenRouter cost: USD ${result.newActualCostUsd}
- Cumulative known actual OpenRouter cost: USD ${result.cumulativeKnownActualCostUsd}
- Unresolved actual usage delta: USD ${result.unresolvedActualUsageDeltaUsd}
- Maximum uncertain cost: USD ${result.maximumUncertainCostUsd}
- Corrected pair-majority wins: ${aggregate === null ? "unavailable" : `${String(aggregate.correctedPairMajorityWins)} / 5`}
- Corrected overall preference rate: ${aggregate?.correctedOverallPreferenceRate === null || aggregate === null ? "unavailable" : `${(aggregate.correctedOverallPreferenceRate * 100).toFixed(1)}%`}
- Corrected dimension medians: ${dimensions === null ? "unavailable" : JSON.stringify(dimensions)}
- Table efficiency pass: ${aggregate?.table.efficiencyPass === undefined ? "unavailable" : String(aggregate.table.efficiencyPass)}
- Judge agreement mean: ${aggregate?.judgeAgreementMean === null || aggregate === null ? "unavailable" : aggregate.judgeAgreementMean.toFixed(3)}
- Decision: ${result.taskDecision}
- Terminal reason: ${result.terminalReason ?? "none"}
- ElevenLabs calls: 0
- Direct OpenAI calls: 0
- Production mutations: 0
`,
  );
  return result;
}

const directlyInvoked =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url);

if (directlyInvoked) {
  if (
    process.argv.length !== 3 ||
    process.argv[2] !== "--execute-live"
  ) {
    process.stderr.write(
      "Usage: pnpm exec tsx scripts/openrouter-piper-panel-v2.ts --execute-live\n",
    );
    process.exitCode = 2;
  } else {
    runLivePiperPanelV2()
      .then((result) => {
        process.stdout.write(
          `${JSON.stringify(result, null, 2)}\n`,
        );
      })
      .catch((error: unknown) => {
        process.stderr.write(
          `Piper panel v2 failed: ${errorMessage(
            error,
          )}\n`,
        );
        process.exitCode = 1;
      });
  }
}
