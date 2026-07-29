import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertResponseRecoveryPlanInvariant,
  assertFreshRecoveryRandomization,
  buildFreshRecoveryRandomization,
  buildRecoveryJudgePrompt,
  buildRecoveryReplacementRequestBody,
  phase2cPrimaryJudgeHttpTestHooks,
  type FreshRecoveryRandomization,
  type ResponseRecoveryPerspectiveId,
} from "./ai-audio-evaluation-cli";
import {
  aggregateAiPanel,
  canonicalAiJson,
  decideLocalNarration,
  deriveBryceDecisionMetrics,
  hashAiValue,
  validateJudgeResponse,
  type AiBlindJudgeAssignment,
  type AiBlindSourcePair,
  type AiNarrationDecision,
  type AiObjectiveAnalysisSummary,
  type AiPrivateSampleIdentity,
  type AiValidatedJudgeRun,
} from "../src/lib/academy/narration/ai-audio-evaluation";
import {
  recoverAiAudioJudgeResponse,
  toLegacyAiJudgeResponse,
  type AiAudioRecoveryAssignment,
} from "../src/lib/academy/narration/ai-audio-response-recovery";
import {
  assertOpenRouterPaidJudgeRequestBody,
  authorizeOpenRouterSemanticParse,
  buildOpenRouterPartialPanelStatus,
  classifyOpenRouterConfirmedUnbilledToolRejection,
  createOpenRouterPaidJudgeExecutorState,
  createOpenRouterRawResponseLifecycle,
  parseOpenRouterChatCompletionReceipt,
  parseOpenRouterPaidJudgePayload,
  planNextOpenRouterPaidJudgeRequest,
  recordOpenRouterRawPersistenceLedgered,
  recordOpenRouterRawResponsePersisted,
  resolveOpenRouterPaidJudgeCost,
  settleOpenRouterPaidJudgeRequest,
  type OpenRouterPaidJudgeExecutorState,
  type OpenRouterPaidJudgePerspectiveId,
  type OpenRouterPaidJudgeRequestMode,
  type OpenRouterRawResponseLifecycle,
} from "../src/lib/academy/narration/openrouter-paid-judge-executor";
import {
  OPENROUTER_MAXIMUM_METADATA_GETS,
  OPENROUTER_MAXIMUM_NEW_PAID_JUDGE_POSTS,
  OPENROUTER_MAXIMUM_SPEND_QUANTA,
  OPENROUTER_MODEL_ID,
  OPENROUTER_PINNED_NEXT_JUDGE_ESTIMATE_QUANTA,
  checkMetadataGetCap,
  formatUsdQuanta,
  parseOpenRouterGenerationMetadata,
  parseOpenRouterKeyUsage,
  parseUsdToQuanta,
} from "../src/lib/academy/narration/openrouter-generation-retrieval";

const API_BASE = "https://openrouter.ai/api/v1";
const CHAT_ENDPOINT = `${API_BASE}/chat/completions`;
const KEY_ENDPOINT = `${API_BASE}/key`;
const GENERATION_ENDPOINT = `${API_BASE}/generation`;
const GENESIS_HASH = "0".repeat(64);

export const PAID_RECOVERY_CARRIED_ACTUAL_COST_USD =
  "3.54151000";
export const PAID_RECOVERY_CARRIED_METADATA_GETS = 24;
export const PAID_RECOVERY_SECRET_PATH =
  "/run/secrets/openrouter_audio_judge_key";
export const PAID_RECOVERY_SCHEMA_VERSION =
  "tenxpros-openrouter-generation-recovery-paid-v1" as const;

const LIVE_OUTPUT_DIRECTORY = resolve(
  process.cwd(),
  "..",
  "scratch_academy",
  "ai-audio-evaluation",
  "phase2c-openrouter-bryce-20260726",
);
const LIVE_LOCK_PATH = resolve(
  process.cwd(),
  "..",
  "scratch_academy",
  "ai-audio-evaluation",
  ".phase2c-openrouter-generation-recovery-paid.lock",
);
const LIVE_PINS = Object.freeze({
  retrievalLedgerSha256:
    "22f09c3b5c11f5e6846a6789d2f4914b31acee058b037e67c8eefeb46413a0a3",
  retrievalTerminalSequence: 113,
  retrievalTerminalHash:
    "cfe8a71e7ac7812be7317665a81466e0a91cde28cb148e5d2ee64af5700f6a29",
  retrievalPlanFileSha256:
    "ab5ef8be37f0c9b57f45c1576edf1c0331a4d239980b6cf20d6c831c41490b2a",
  retrievalPlanHash:
    "d580401892d365ba0a29bde20e8044ada1058cd1105aaf5217f856bb5495c7f9",
  evidenceManifestSha256:
    "55980291ef68c76a019398801a172298e060396fa56f24acb28bafc23bf2bf58",
  supplementSha256:
    "91485cb7852c2a51c0e5f7432cf00f4ba723014eef99a82334752f671a510bf0",
  responseRecoveryPlanFileSha256:
    "0407a55ca067530c0388dc44b1d6e1f85b29f08ca1ff59c80b6b4af3a80c2e13",
  responseRecoveryPlanHash:
    "2284bae0ec6c4fbdac1f877050da57a5b5b8a3dfdb37d017e3d3313795ccf1b4",
  responseRecoveryLedgerSha256:
    "195517da75f83a73f67da3bbc9bc4c7d5dc1fdeb7fb14f08c2d7623d809b1658",
  privateManifestSha256:
    "884aa3931c89587280dccd680fd478718415e1700f454d4f443ff89d8f59f5b5",
  objectiveSha256:
    "e8b35edb9c2c0f33ad3e4ec6ee0f5bb521607d0fca8b8b73ba3519b59bb0ff26",
  modelPreflightSha256:
    "ae11584af1ff157408f73e6651e578c04c195d36d847f9b97a4bd3e4de1a5c60",
});

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Readonly<Record<string, string>>;
    body?: string;
    redirect?: "error";
  },
) => Promise<{
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null };
  text(): Promise<string>;
}>;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertSha256(value: string, field: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${field} must be a SHA-256`);
  }
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

async function ensurePrivateDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const metadata = await lstat(path);
  if (!metadata.isDirectory()) {
    throw new Error(`${path} is not a directory`);
  }
  await chmod(path, 0o700);
}

async function writeNewRestricted(
  path: string,
  value: string | Buffer,
): Promise<void> {
  await ensurePrivateDirectory(dirname(path));
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(path, 0o600);
}

async function appendRestricted(
  path: string,
  value: string,
): Promise<void> {
  const handle = await open(path, "a", 0o600);
  try {
    await handle.writeFile(value, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(path, 0o600);
}

export interface PaidRecoveryPlan {
  schemaVersion: typeof PAID_RECOVERY_SCHEMA_VERSION;
  provider: "OpenRouter";
  model: typeof OPENROUTER_MODEL_ID;
  retrievalPlanHash: string;
  reconciliationSupplementSha256: string;
  recoveryPlanHash: string;
  frozenAudio: readonly {
    sampleId: string;
    sha256: string;
  }[];
  priorAssignmentHashes: readonly string[];
  priorRecoveryRandomizationHashes: readonly string[];
  privateSamplesSha256: string;
  objectiveAnalysisHash: string;
  missingPerspectiveIds: readonly OpenRouterPaidJudgePerspectiveId[];
  carriedActualCostUsd: typeof PAID_RECOVERY_CARRIED_ACTUAL_COST_USD;
  maximumActualSpendUsd: "10.00000000";
  maximumNewPaidJudgePosts: 5;
  carriedMetadataGets: 24;
  maximumMetadataGets: 40;
  requestPolicy: {
    actualAudioRequired: true;
    forcedTool: "submit_audio_evaluation";
    responseFormatOmitted: true;
    onePotentiallyBilledPrimaryPerPerspective: true;
    ambiguousPaidRetryForbidden: true;
    rawBeforeParse: true;
    keyBeforeEveryPost: true;
  };
  planHash: string;
}

export function buildPaidRecoveryPlan(
  input: Omit<
    PaidRecoveryPlan,
    | "schemaVersion"
    | "provider"
    | "model"
    | "carriedActualCostUsd"
    | "maximumActualSpendUsd"
    | "maximumNewPaidJudgePosts"
    | "carriedMetadataGets"
    | "maximumMetadataGets"
    | "requestPolicy"
    | "planHash"
  >,
): PaidRecoveryPlan {
  assertSha256(input.retrievalPlanHash, "retrievalPlanHash");
  assertSha256(
    input.reconciliationSupplementSha256,
    "reconciliationSupplementSha256",
  );
  assertSha256(input.recoveryPlanHash, "recoveryPlanHash");
  if (
    input.frozenAudio.length !== 10 ||
    new Set(input.frozenAudio.map((item) => item.sampleId)).size !== 10 ||
    input.frozenAudio.some((item) => {
      try {
        assertSha256(item.sha256, "frozen audio hash");
        return false;
      } catch {
        return true;
      }
    }) ||
    input.priorAssignmentHashes.length !== 5 ||
    new Set(input.priorAssignmentHashes).size !== 5 ||
    input.priorAssignmentHashes.some(
      (item) => !/^[a-f0-9]{64}$/u.test(item),
    ) ||
    new Set(input.missingPerspectiveIds).size !==
      input.missingPerspectiveIds.length
  ) {
    throw new Error("Paid recovery plan bindings are incomplete");
  }
  assertSha256(
    input.privateSamplesSha256,
    "privateSamplesSha256",
  );
  assertSha256(
    input.objectiveAnalysisHash,
    "objectiveAnalysisHash",
  );
  const withoutHash = {
    schemaVersion: PAID_RECOVERY_SCHEMA_VERSION,
    provider: "OpenRouter" as const,
    model: OPENROUTER_MODEL_ID as "openai/gpt-audio",
    retrievalPlanHash: input.retrievalPlanHash,
    reconciliationSupplementSha256:
      input.reconciliationSupplementSha256,
    recoveryPlanHash: input.recoveryPlanHash,
    frozenAudio: [...input.frozenAudio].sort((a, b) =>
      a.sampleId.localeCompare(b.sampleId),
    ),
    priorAssignmentHashes: [
      ...input.priorAssignmentHashes,
    ].sort(),
    priorRecoveryRandomizationHashes: [
      ...input.priorRecoveryRandomizationHashes,
    ].sort(),
    privateSamplesSha256: input.privateSamplesSha256,
    objectiveAnalysisHash:
      input.objectiveAnalysisHash,
    missingPerspectiveIds: [...input.missingPerspectiveIds],
    carriedActualCostUsd:
      PAID_RECOVERY_CARRIED_ACTUAL_COST_USD as "3.54151000",
    maximumActualSpendUsd: "10.00000000" as const,
    maximumNewPaidJudgePosts:
      OPENROUTER_MAXIMUM_NEW_PAID_JUDGE_POSTS as 5,
    carriedMetadataGets:
      PAID_RECOVERY_CARRIED_METADATA_GETS as 24,
    maximumMetadataGets:
      OPENROUTER_MAXIMUM_METADATA_GETS as 40,
    requestPolicy: {
      actualAudioRequired: true as const,
      forcedTool: "submit_audio_evaluation" as const,
      responseFormatOmitted: true as const,
      onePotentiallyBilledPrimaryPerPerspective:
        true as const,
      ambiguousPaidRetryForbidden: true as const,
      rawBeforeParse: true as const,
      keyBeforeEveryPost: true as const,
    },
  };
  return {
    ...withoutHash,
    planHash: hashAiValue(withoutHash),
  };
}

export interface PaidRecoveryLedgerEntry {
  schemaVersion:
    "tenxpros-openrouter-generation-recovery-paid-ledger-v1";
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
): Promise<PaidRecoveryLedgerEntry[]> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
  const entries = raw
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as PaidRecoveryLedgerEntry,
    );
  let previous = GENESIS_HASH;
  for (const [index, entry] of entries.entries()) {
    const { entryHash, ...withoutHash } = entry;
    if (
      entry.sequence !== index + 1 ||
      entry.previousHash !== previous ||
      hashAiValue(withoutHash) !== entryHash
    ) {
      throw new Error(
        `Paid recovery ledger hash-chain failed at ${String(index + 1)}`,
      );
    }
    previous = entryHash;
  }
  return entries;
}

async function appendLedger(
  path: string,
  planHash: string,
  event: string,
  data: Readonly<Record<string, unknown>>,
  now: () => string,
): Promise<PaidRecoveryLedgerEntry> {
  const prior = await readLedger(path);
  const withoutHash = {
    schemaVersion:
      "tenxpros-openrouter-generation-recovery-paid-ledger-v1" as const,
    sequence: prior.length + 1,
    timestamp: now(),
    planHash,
    event,
    data,
    previousHash:
      prior.at(-1)?.entryHash ?? GENESIS_HASH,
  };
  const entry = {
    ...withoutHash,
    entryHash: hashAiValue(withoutHash),
  };
  await appendRestricted(
    path,
    `${canonicalAiJson(entry)}\n`,
  );
  return entry;
}

export interface PaidRecoveryFrozenInput {
  evaluationPackageId: string;
  audio: readonly {
    sampleId: string;
    path: string;
    sha256: string;
  }[];
  sourcePairs: readonly AiBlindSourcePair[];
  priorAssignments: readonly AiBlindJudgeAssignment[];
  priorRecoveryRandomizations:
    readonly FreshRecoveryRandomization[];
  privateSamples: readonly AiPrivateSampleIdentity[];
  objective: AiObjectiveAnalysisSummary;
}

export interface PaidRecoveryExecutionInput {
  outputDirectory: string;
  lockPath: string;
  plan: PaidRecoveryPlan;
  frozen: PaidRecoveryFrozenInput;
  fetchImpl: FetchLike;
  readSecret: () => Promise<string>;
  now?: () => string;
  entropySource?: () => Buffer;
}

interface ExecutionPaths {
  root: string;
  ledger: string;
  privateRoot: string;
  raw: string;
  requests: string;
  keys: string;
  generationMetadata: string;
  randomizations: string;
  normalized: string;
  privateManifest: string;
  panel: string;
  report: string;
}

function executionPaths(root: string): ExecutionPaths {
  const privateRoot = resolve(root, "private", "paid-generation-recovery");
  return {
    root,
    ledger: resolve(root, "paid-generation-recovery-ledger.jsonl"),
    privateRoot,
    raw: resolve(privateRoot, "raw-responses"),
    requests: resolve(privateRoot, "redacted-requests"),
    keys: resolve(privateRoot, "key-snapshots"),
    generationMetadata: resolve(
      privateRoot,
      "generation-metadata",
    ),
    randomizations: resolve(privateRoot, "randomizations"),
    normalized: resolve(privateRoot, "normalized-responses"),
    privateManifest: resolve(
      privateRoot,
      "private-manifest.json",
    ),
    panel: resolve(root, "paid-generation-recovery-panel.json"),
    report: resolve(root, "paid-generation-recovery-report.md"),
  };
}

function safeHeaders(
  headers:
    | { get(name: string): string | null }
    | undefined,
  secret: string,
): Readonly<Record<string, string>> {
  if (!headers) return {};
  const allowedValue = (
    name: string,
    value: string,
  ): boolean => {
    if (
      value.length === 0 ||
      value.length > 256 ||
      /[\u0000-\u001f\u007f\\%]/u.test(value) ||
      value.includes(secret) ||
      /(?:sk-or-|bearer\s+|authorization|input_audio|data:audio\/)/iu.test(
        value,
      ) ||
      /[A-Za-z0-9+/]{128,}={0,2}/u.test(value)
    ) {
      return false;
    }
    switch (name) {
      case "content-type":
        return /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+(?:;\s*charset=[A-Za-z0-9._-]+)?$/u.test(
          value,
        );
      case "date":
        return /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/u.test(
          value,
        );
      case "x-openrouter-generation-id":
      case "x-request-id":
        return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(
          value,
        );
      default:
        return false;
    }
  };
  return Object.fromEntries(
    [
      "content-type",
      "date",
      "x-openrouter-generation-id",
      "x-request-id",
    ].flatMap((name) => {
      const value = headers.get(name);
      if (value === null || !allowedValue(name, value)) {
        return [];
      }
      return [[name, value]];
    }),
  );
}

function assertNoSecret(value: string, secret: string): void {
  if (secret.length > 0 && value.includes(secret)) {
    throw new Error(
      "Provider response contains the inference secret",
    );
  }
}

const DECODED_CREDENTIAL_FIELD_NAMES = new Set([
  "authorization",
  "proxyauthorization",
  "apikey",
  "accesskey",
  "clientsecret",
  "secret",
  "token",
  "accesstoken",
  "refreshtoken",
  "credential",
  "credentials",
  "password",
]);

function normalizedCredentialName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/gu, "");
}

function assertNoDecodedCredentialMaterial(
  value: unknown,
  secret: string,
): void {
  const inspect = (item: unknown): void => {
    if (typeof item === "string") {
      const normalized = normalizedCredentialName(item);
      if (
        (secret.length > 0 && item.includes(secret)) ||
        DECODED_CREDENTIAL_FIELD_NAMES.has(normalized) ||
        /(?:\bBearer\s+\S+|sk-or-v1-[A-Za-z0-9_-]+)/iu.test(
          item,
        )
      ) {
        throw new Error(
          "Decoded provider response contains credential material",
        );
      }
      return;
    }
    if (Array.isArray(item)) {
      for (const entry of item) inspect(entry);
      return;
    }
    if (!isRecord(item)) return;
    for (const [key, entry] of Object.entries(item)) {
      if (
        DECODED_CREDENTIAL_FIELD_NAMES.has(
          normalizedCredentialName(key),
        )
      ) {
        throw new Error(
          "Decoded provider response contains a credential field",
        );
      }
      inspect(entry);
    }
  };
  inspect(value);
}

function keyAllowlist(rawBody: string): string {
  const envelope = JSON.parse(rawBody) as unknown;
  if (!isRecord(envelope) || !isRecord(envelope.data)) {
    throw new Error("Current-key response is malformed");
  }
  const data = envelope.data;
  const allowed = [
    "usage",
    "limit",
    "limit_remaining",
    "is_management_key",
    "is_provisioning_key",
    "disabled",
    "is_active",
    "expires_at",
  ] as const;
  const sanitized = JSON.stringify({
    data: Object.fromEntries(
      allowed.flatMap((key) =>
        Object.hasOwn(data, key)
          ? [[key, data[key]]]
          : [],
      ),
    ),
  });
  if (
    /(?:sk-or-v1-|authorization|bearer\s+)/iu.test(
      sanitized,
    )
  ) {
    throw new Error(
      "Sanitized current-key artifact contains credential-like material",
    );
  }
  return sanitized;
}

function recoveryAssignment(
  assignment: AiBlindJudgeAssignment,
): AiAudioRecoveryAssignment {
  return {
    assignmentId: assignment.assignmentId,
    judgeId: assignment.judgeId,
    pairs: assignment.pairs.map((pair) => ({
      pairId: pair.neutralPairLabel,
      versionAFileId: pair.clips[0].neutralLabel,
      versionBFileId: pair.clips[1].neutralLabel,
      tableEvaluation: pair.tableEvaluation,
    })),
  };
}

async function audioContent(
  frozen: PaidRecoveryFrozenInput,
  randomization: FreshRecoveryRandomization,
): Promise<readonly Readonly<Record<string, unknown>>[]> {
  const byId = new Map(
    frozen.audio.map((sample) => [sample.sampleId, sample]),
  );
  const result: Record<string, unknown>[] = [];
  for (const pair of randomization.assignment.pairs) {
    result.push({
      type: "text",
      text: `Now listen to ${pair.neutralPairLabel}. The first attached clip is Version A; the second is Version B.`,
    });
    for (const clip of pair.clips) {
      const sample = byId.get(clip.sourceSampleId);
      if (!sample || sample.sha256 !== clip.audioSha256) {
        throw new Error(
          "Fresh mapping does not match frozen audio",
        );
      }
      const bytes = await readFile(sample.path);
      if (sha256(bytes) !== sample.sha256) {
        throw new Error(
          "Frozen audio changed before dispatch",
        );
      }
      result.push({
        type: "text",
        text: `Neutral clip label: ${clip.neutralLabel}`,
      });
      result.push({
        type: "input_audio",
        input_audio: {
          data: bytes.toString("base64"),
          format: "mp3",
        },
      });
    }
  }
  return result;
}

interface KeySnapshot {
  usageQuanta: bigint;
  limitQuanta: bigint;
  remainingQuanta: bigint;
  rawBodySha256: string;
}

async function getCurrentKey(input: {
  secret: string;
  paths: ExecutionPaths;
  plan: PaidRecoveryPlan;
  fetchImpl: FetchLike;
  now: () => string;
  metadataGetsUsed: number;
  label: string;
  expectedUsageQuanta?: bigint;
}): Promise<{
  snapshot: KeySnapshot;
  metadataGetsUsed: number;
}> {
  const cap = checkMetadataGetCap({
    metadataGetsUsed: input.metadataGetsUsed,
  });
  if (!cap.allowed) {
    throw new Error("METADATA_GET_CAP_EXCEEDED");
  }
  await appendLedger(
    input.paths.ledger,
    input.plan.planHash,
    "METADATA_GET_RESERVED",
    {
      kind: "CURRENT_KEY",
      label: input.label,
      metadataGetIndex: cap.nextCount,
    },
    input.now,
  );
  const response = await input.fetchImpl(KEY_ENDPOINT, {
    method: "GET",
    redirect: "error",
    headers: {
      Authorization: `Bearer ${input.secret}`,
    },
  });
  const rawBody = await response.text();
  assertNoSecret(rawBody, input.secret);
  const rawBodySha256 = sha256(rawBody);
  const sanitized = keyAllowlist(rawBody);
  const artifact = resolve(
    input.paths.keys,
    `${String(cap.nextCount).padStart(2, "0")}-${input.label}.json`,
  );
  await writeNewRestricted(artifact, sanitized);
  await appendLedger(
    input.paths.ledger,
    input.plan.planHash,
    "METADATA_RAW_PERSISTED",
    {
      kind: "CURRENT_KEY",
      label: input.label,
      httpStatus: response.status,
      rawBodySha256,
      artifactBodySha256: sha256(sanitized),
      exactRawBodyStored: false,
      sanitizedArtifactStored: true,
      safeResponseHeaders: safeHeaders(
        response.headers,
        input.secret,
      ),
    },
    input.now,
  );
  if (!response.ok) {
    throw new Error(
      `Current-key preflight failed with HTTP ${String(response.status)}`,
    );
  }
  /*
   * Parse the exact in-memory provider body, not the allowlisted artifact:
   * JSON reserialization can change monetary lexemes at the IEEE-754 edge.
   * The raw body is never persisted because /key can include a masked label.
   */
  const key = parseOpenRouterKeyUsage(rawBody);
  const currentMs = Date.parse(input.now());
  if (
    key.keyKind !== "INFERENCE_CONFIRMED" ||
    !key.active ||
    key.limitQuanta !== OPENROUTER_MAXIMUM_SPEND_QUANTA ||
    (input.expectedUsageQuanta !== undefined &&
      key.usageQuanta !==
        input.expectedUsageQuanta) ||
    key.limitRemainingQuanta !==
      key.limitQuanta - key.usageQuanta ||
    (key.expiresAt !== null &&
      Date.parse(key.expiresAt) <= currentMs)
  ) {
    throw new Error(
      "Current-key financial reconciliation failed",
    );
  }
  await appendLedger(
    input.paths.ledger,
    input.plan.planHash,
    "CURRENT_KEY_RECONCILED",
    {
      label: input.label,
      usageUsd: key.usageUsd,
      limitUsd: key.limitUsd,
      limitRemainingUsd: key.limitRemainingUsd,
      expectedUsageUsd:
        input.expectedUsageQuanta === undefined
          ? null
          : formatUsdQuanta(
              input.expectedUsageQuanta,
            ),
    },
    input.now,
  );
  return {
    snapshot: {
      usageQuanta: key.usageQuanta,
      limitQuanta: key.limitQuanta,
      remainingQuanta: key.limitRemainingQuanta,
      rawBodySha256,
    },
    metadataGetsUsed: cap.nextCount,
  };
}

async function persistExactRaw(input: {
  rawBody: string;
  path: string;
  secret: string;
  paths: ExecutionPaths;
  plan: PaidRecoveryPlan;
  eventData: Readonly<Record<string, unknown>>;
  now: () => string;
}): Promise<OpenRouterRawResponseLifecycle> {
  assertNoSecret(input.rawBody, input.secret);
  if (
    /(?:sk-or-v1-|bearer\s+|authorization\s*:)/iu.test(
      input.rawBody,
    )
  ) {
    throw new Error(
      "Provider response contains credential-like material",
    );
  }
  const bodyHash = sha256(input.rawBody);
  let artifactBody = input.rawBody;
  let echoedInputAudioRedacted = false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.rawBody) as unknown;
  } catch {
    parsed = undefined;
  }
  if (parsed !== undefined) {
    assertNoDecodedCredentialMaterial(parsed, input.secret);
    const decodedJson = JSON.stringify(parsed);
    assertNoSecret(decodedJson, input.secret);
    if (
      /(?:sk-or-v1-|bearer\s+|authorization\s*:)/iu.test(
        decodedJson,
      )
    ) {
      throw new Error(
        "Decoded provider response contains credential-like material",
      );
    }
  }
  let redactionCount = 0;
  const redact = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(redact);
    if (typeof value === "string") {
      if (
        /\\?"input_audio\\?"\s*:/iu.test(value) ||
        /^data:audio\/[^;,]+;base64,/iu.test(value) ||
        (value.length >= 256 &&
          /^[A-Za-z0-9+/]+={0,2}$/u.test(value))
      ) {
        redactionCount += 1;
        return "[REDACTED_ECHOED_INPUT_AUDIO]";
      }
      return value;
    }
    if (!isRecord(value)) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (
          /^(?:input_audio|audio_data|audio_base64|audio_url)$/iu.test(
            key,
          )
        ) {
          redactionCount += 1;
          return [
            key,
            "[REDACTED_ECHOED_INPUT_AUDIO]",
          ];
        }
        return [key, redact(item)];
      }),
    );
  };
  if (parsed !== undefined) {
    const redacted = redact(parsed);
    if (redactionCount > 0) {
      artifactBody = JSON.stringify(redacted);
      echoedInputAudioRedacted = true;
    }
  } else if (
    /(?:input_audio|data:audio\/|[A-Za-z0-9+/]{256,}={0,2})/iu.test(
      input.rawBody,
    )
  ) {
    throw new Error(
      "Non-JSON provider response appears to echo audio and cannot be persisted",
    );
  }
  await writeNewRestricted(input.path, artifactBody);
  const persisted = recordOpenRouterRawResponsePersisted(
    createOpenRouterRawResponseLifecycle(),
    {
      rawBodySha256: bodyHash,
      artifactBodySha256: sha256(artifactBody),
      rawBodyBytes: Buffer.byteLength(input.rawBody),
      exactRawBodyStored: !echoedInputAudioRedacted,
      sanitizedArtifactStored: echoedInputAudioRedacted,
    },
  );
  const ledger = await appendLedger(
    input.paths.ledger,
    input.plan.planHash,
    "PAID_RAW_RESPONSE_PERSISTED",
    {
      ...input.eventData,
      rawBodySha256: bodyHash,
      rawBodyBytes: Buffer.byteLength(input.rawBody),
      exactRawBodyStored: !echoedInputAudioRedacted,
      sanitizedArtifactStored: echoedInputAudioRedacted,
      echoedInputAudioRedacted,
      semanticParseStarted: false,
    },
    input.now,
  );
  return authorizeOpenRouterSemanticParse(
    recordOpenRouterRawPersistenceLedgered(
      persisted,
      ledger.entryHash,
    ),
  );
}

async function generationCostFallback(input: {
  generationId: string;
  secret: string;
  paths: ExecutionPaths;
  plan: PaidRecoveryPlan;
  fetchImpl: FetchLike;
  now: () => string;
  metadataGetsUsed: number;
}): Promise<{
  metadata:
    | ReturnType<typeof parseOpenRouterGenerationMetadata>
    | null;
  metadataGetsUsed: number;
}> {
  const cap = checkMetadataGetCap({
    metadataGetsUsed: input.metadataGetsUsed,
  });
  if (!cap.allowed) {
    return {
      metadata: null,
      metadataGetsUsed: input.metadataGetsUsed,
    };
  }
  await appendLedger(
    input.paths.ledger,
    input.plan.planHash,
    "METADATA_GET_RESERVED",
    {
      kind: "GENERATION_COST_FALLBACK",
      generationId: input.generationId,
      metadataGetIndex: cap.nextCount,
    },
    input.now,
  );
  let response:
    | Awaited<ReturnType<FetchLike>>
    | undefined;
  try {
    response = await input.fetchImpl(
      `${GENERATION_ENDPOINT}?id=${encodeURIComponent(
        input.generationId,
      )}`,
      {
        method: "GET",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${input.secret}`,
        },
      },
    );
  } catch {
    await appendLedger(
      input.paths.ledger,
      input.plan.planHash,
      "GENERATION_COST_FALLBACK_UNCERTAIN",
      {
        generationId: input.generationId,
        metadataGetIndex: cap.nextCount,
        reason: "TRANSPORT_AMBIGUITY",
      },
      input.now,
    );
    return {
      metadata: null,
      metadataGetsUsed: cap.nextCount,
    };
  }
  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    await appendLedger(
      input.paths.ledger,
      input.plan.planHash,
      "GENERATION_COST_FALLBACK_UNCERTAIN",
      {
        generationId: input.generationId,
        metadataGetIndex: cap.nextCount,
        reason: "RESPONSE_BODY_READ_AMBIGUITY",
      },
      input.now,
    );
    return {
      metadata: null,
      metadataGetsUsed: cap.nextCount,
    };
  }
  let lifecycle: OpenRouterRawResponseLifecycle;
  try {
    lifecycle = await persistExactRaw({
      rawBody,
      path: resolve(
        input.paths.generationMetadata,
        `${input.generationId}.json`,
      ),
      secret: input.secret,
      paths: input.paths,
      plan: input.plan,
      eventData: {
        kind: "GENERATION_COST_FALLBACK",
        generationId: input.generationId,
        metadataGetIndex: cap.nextCount,
        httpStatus: response.status,
        safeResponseHeaders: safeHeaders(
          response.headers,
          input.secret,
        ),
      },
      now: input.now,
    });
  } catch {
    await appendLedger(
      input.paths.ledger,
      input.plan.planHash,
      "GENERATION_COST_FALLBACK_UNCERTAIN",
      {
        generationId: input.generationId,
        metadataGetIndex: cap.nextCount,
        reason:
          "PRIVACY_OR_DURABILITY_GATE_FAILED",
      },
      input.now,
    );
    return {
      metadata: null,
      metadataGetsUsed: cap.nextCount,
    };
  }
  if (
    lifecycle.stage !== "SEMANTIC_PARSE_AUTHORIZED" ||
    !lifecycle.exactRawBodyStored ||
    !response.ok
  ) {
    return {
      metadata: null,
      metadataGetsUsed: cap.nextCount,
    };
  }
  try {
    return {
      metadata: parseOpenRouterGenerationMetadata(
        rawBody,
        input.generationId,
      ),
      metadataGetsUsed: cap.nextCount,
    };
  } catch {
    return {
      metadata: null,
      metadataGetsUsed: cap.nextCount,
    };
  }
}

function finalizePanel(input: {
  frozen: PaidRecoveryFrozenInput;
  runs: readonly AiValidatedJudgeRun[];
}): {
  analysis: ReturnType<typeof aggregateAiPanel>;
  decision: AiNarrationDecision;
  taskDecision:
    | "PASS_PIPER_BRYCE"
    | "TUNE_PIPER_PIPELINE"
    | "TEST_OTHER_LOCAL_VOICES"
    | "CONSIDER_ELEVENLABS"
    | "INCONCLUSIVE_AI_ONLY_EVALUATION";
} {
  const analysis = aggregateAiPanel({
    evaluationPackageId: input.frozen.evaluationPackageId,
    runs: input.runs,
    privateSamples: input.frozen.privateSamples,
    objective: input.frozen.objective,
  });
  const corrected = input.frozen.privateSamples.find(
    (item) => item.pipeline === "corrected",
  )?.candidateId;
  const baseline = input.frozen.privateSamples.find(
    (item) => item.pipeline === "baseline",
  )?.candidateId;
  if (!corrected || !baseline) {
    throw new Error("Private candidate mapping is incomplete");
  }
  const bryce = deriveBryceDecisionMetrics({
    analysis,
    privateSamples: input.frozen.privateSamples,
    correctedCandidateId: corrected,
    baselineCandidateId: baseline,
  });
  const initial = decideLocalNarration({ bryce });
  const decision =
    initial.internalBranch === "TUNING"
      ? decideLocalNarration({
          bryce,
          tuning: {
            status: "NOT_EXECUTED_BUDGET",
            evidence: [
              "All five authorized paid-judge POST slots were consumed by the primary panel.",
            ],
          },
        })
      : initial.internalBranch === "OTHER_LOCAL_VOICES"
        ? {
            ...initial,
            primaryDecision:
              "INCONCLUSIVE_AI_ONLY_EVALUATION" as const,
            limitations: [
              ...initial.limitations,
              "Linda/Cori comparison was skipped because all five authorized paid-judge POST slots were consumed.",
            ],
          }
        : initial;
  const taskDecision =
    initial.internalBranch === "TUNING"
      ? "TUNE_PIPER_PIPELINE"
      : initial.internalBranch === "OTHER_LOCAL_VOICES"
        ? "TEST_OTHER_LOCAL_VOICES"
        : initial.primaryDecision ===
            "PASS_PIPER_BRYCE" ||
            initial.primaryDecision ===
              "CONSIDER_ELEVENLABS"
          ? initial.primaryDecision
          : "INCONCLUSIVE_AI_ONLY_EVALUATION";
  return { analysis, decision, taskDecision };
}

export interface PaidRecoveryExecutionResult {
  status: "COMPLETE" | "INCONCLUSIVE";
  planHash: string;
  paidJudgePosts: number;
  physicalChatCompletionPosts: number;
  metadataGets: number;
  cumulativeActualCostUsd: string;
  costStatus:
    | "RECONCILED_EXACT"
    | "UNCERTAIN_PAID";
  maximumUncertainCostUsd: string;
  capAccountedCostUsd: string;
  validIndependentJudges: number;
  primaryDecision:
    | AiNarrationDecision["primaryDecision"]
    | "INCONCLUSIVE_AI_ONLY_EVALUATION";
  taskDecision:
    | "PASS_PIPER_BRYCE"
    | "TUNE_PIPER_PIPELINE"
    | "TEST_OTHER_LOCAL_VOICES"
    | "CONSIDER_ELEVENLABS"
    | "INCONCLUSIVE_AI_ONLY_EVALUATION";
  conditionalBranch:
    | "NOT_REQUIRED"
    | "SKIPPED_PAID_POST_CAP_EXHAUSTED";
}

export async function executePaidGenerationRecovery(
  input: PaidRecoveryExecutionInput,
): Promise<PaidRecoveryExecutionResult> {
  const now = input.now ?? (() => new Date().toISOString());
  const paths = executionPaths(resolve(input.outputDirectory));
  for (const path of [
    paths.privateRoot,
    paths.raw,
    paths.requests,
    paths.keys,
    paths.generationMetadata,
    paths.randomizations,
    paths.normalized,
  ]) {
    await ensurePrivateDirectory(path);
  }
  const frozenHashes = input.frozen.audio
    .map((item) => ({
      sampleId: item.sampleId,
      sha256: item.sha256,
    }))
    .sort((a, b) => a.sampleId.localeCompare(b.sampleId));
  if (
    canonicalAiJson(frozenHashes) !==
      canonicalAiJson(input.plan.frozenAudio) ||
    canonicalAiJson(
      input.frozen.priorAssignments
        .map((item) => item.assignmentHash)
        .sort(),
    ) !==
      canonicalAiJson(
        [...input.plan.priorAssignmentHashes].sort(),
      ) ||
    canonicalAiJson(
      input.frozen.priorRecoveryRandomizations
        .map((item) => item.randomizationSha256)
        .sort(),
    ) !==
      canonicalAiJson(
        [
          ...input.plan
            .priorRecoveryRandomizationHashes,
        ].sort(),
      ) ||
    hashAiValue(input.frozen.privateSamples) !==
      input.plan.privateSamplesSha256 ||
    input.frozen.objective.analysisHash !==
      input.plan.objectiveAnalysisHash ||
    input.plan.planHash !==
      buildPaidRecoveryPlan({
        retrievalPlanHash: input.plan.retrievalPlanHash,
        reconciliationSupplementSha256:
          input.plan.reconciliationSupplementSha256,
        recoveryPlanHash: input.plan.recoveryPlanHash,
        frozenAudio: input.plan.frozenAudio,
        priorAssignmentHashes:
          input.plan.priorAssignmentHashes,
        priorRecoveryRandomizationHashes:
          input.plan.priorRecoveryRandomizationHashes,
        privateSamplesSha256:
          input.plan.privateSamplesSha256,
        objectiveAnalysisHash:
          input.plan.objectiveAnalysisHash,
        missingPerspectiveIds:
          input.plan.missingPerspectiveIds,
      }).planHash
  ) {
    throw new Error("Paid recovery plan or frozen audio drifted");
  }
  await Promise.all(
    input.frozen.audio.map(async (sample) => {
      if (sha256(await readFile(sample.path)) !== sample.sha256) {
        throw new Error(
          `Frozen audio bytes changed before lock: ${sample.sampleId}`,
        );
      }
    }),
  );
  await writeNewRestricted(
    resolve(paths.root, "paid-generation-recovery-plan.json"),
    `${canonicalAiJson(input.plan)}\n`,
  );
  await appendLedger(
    paths.ledger,
    input.plan.planHash,
    "PLAN_PINNED",
    {
      reconciliationSupplementSha256:
        input.plan.reconciliationSupplementSha256,
      frozenAudioCount: 10,
      carriedActualCostUsd:
        PAID_RECOVERY_CARRIED_ACTUAL_COST_USD,
      carriedMetadataGets:
        PAID_RECOVERY_CARRIED_METADATA_GETS,
    },
    now,
  );
  await writeNewRestricted(
    input.lockPath,
    `${canonicalAiJson({
      schemaVersion:
        "tenxpros-openrouter-generation-recovery-paid-lock-v1",
      planHash: input.plan.planHash,
      reconciliationSupplementSha256:
        input.plan.reconciliationSupplementSha256,
      acquiredAt: now(),
      secretRead: false,
    })}\n`,
  );
  await appendLedger(
    paths.ledger,
    input.plan.planHash,
    "LOCK_ACQUIRED_BEFORE_SECRET",
    {
      lockSha256: sha256(await readFile(input.lockPath)),
      secretRead: false,
    },
    now,
  );
  const secret = (await input.readSecret()).trim();
  if (secret.length < 16) {
    throw new Error("OpenRouter inference secret is unavailable");
  }
  await appendLedger(
    paths.ledger,
    input.plan.planHash,
    "SECRET_READ_IN_MEMORY_AFTER_LOCK",
    {
      secretStored: false,
      secretLogged: false,
    },
    now,
  );

  let metadataGetsUsed = PAID_RECOVERY_CARRIED_METADATA_GETS;
  let transportPosts = 0;
  let state: OpenRouterPaidJudgeExecutorState =
    createOpenRouterPaidJudgeExecutorState({
      existingValidPerspectiveIds: [],
    });
  const runs: AiValidatedJudgeRun[] = [];
  const acceptedIdentities: {
    perspectiveId: OpenRouterPaidJudgePerspectiveId;
    generationId: string;
    rawBodySha256: string;
  }[] = [];
  const newRandomizations: FreshRecoveryRandomization[] = [];
  const dispatchedRandomizations: {
    transportPostIndex: number;
    perspectiveId: OpenRouterPaidJudgePerspectiveId;
    randomization: FreshRecoveryRandomization;
  }[] = [];
  let fallbackRandomization:
    | FreshRecoveryRandomization
    | null = null;
  let fallbackEvidence:
    | {
        transportPostIndex: number;
        ledgerEntryHash: string;
        responseSha256: string;
      }
    | null = null;

  while (true) {
    const panel = buildOpenRouterPartialPanelStatus(state);
    if (
      panel.status === "COMPLETE" ||
      transportPosts >= OPENROUTER_MAXIMUM_NEW_PAID_JUDGE_POSTS ||
      state.costReconciliationRequired ||
      state.terminalReason !== null
    ) {
      break;
    }
    const expectedUsage =
      parseUsdToQuanta(
        PAID_RECOVERY_CARRIED_ACTUAL_COST_USD,
      ) + state.knownNewActualCostQuanta;
    const key = await getCurrentKey({
      secret,
      paths,
      plan: input.plan,
      fetchImpl: input.fetchImpl,
      now,
      metadataGetsUsed,
      label: `before-post-${String(transportPosts + 1)}`,
      expectedUsageQuanta: expectedUsage,
    });
    metadataGetsUsed = key.metadataGetsUsed;
    const planned = planNextOpenRouterPaidJudgeRequest({
      state,
      reconciledActualCost:
        PAID_RECOVERY_CARRIED_ACTUAL_COST_USD,
      maximumUncertainCost: "0",
      estimatedNextRequestCost:
        OPENROUTER_PINNED_NEXT_JUDGE_ESTIMATE_QUANTA,
      costEvidenceStable: true,
    });
    if (planned.status !== "PLANNED") break;
    state = planned.state;
    const perspectiveId =
      planned.request.perspectiveId as ResponseRecoveryPerspectiveId;
    if (!input.plan.missingPerspectiveIds.includes(perspectiveId)) {
      throw new Error(
        "Executor selected a perspective outside the pinned missing set",
      );
    }
    const priorRandomizations = [
      ...input.frozen.priorRecoveryRandomizations,
      ...newRandomizations,
    ];
    const randomization: FreshRecoveryRandomization =
      fallbackRandomization ??
      buildFreshRecoveryRandomization({
        perspectiveId,
        evaluationPackageId: input.frozen.evaluationPackageId,
        sourcePairs: input.frozen.sourcePairs,
        priorAssignments: input.frozen.priorAssignments,
        priorRecoveryRandomizations: priorRandomizations,
        entropySource: input.entropySource,
      });
    if (
      randomization.perspectiveId !== perspectiveId
    ) {
      throw new Error(
        "Plain fallback randomization is bound to another perspective",
      );
    }
    assertFreshRecoveryRandomization({
      randomization,
      evaluationPackageId: input.frozen.evaluationPackageId,
      sourcePairs: input.frozen.sourcePairs,
      priorAssignments: input.frozen.priorAssignments,
      priorRecoveryRandomizations: priorRandomizations,
    });
    const prompt = buildRecoveryJudgePrompt(
      randomization.assignment,
    );
    const userContent = await audioContent(
      input.frozen,
      randomization,
    );
    const formatMode: OpenRouterPaidJudgeRequestMode =
      state.formatMode;
    const built = buildRecoveryReplacementRequestBody({
      randomization,
      evaluationPackageId: input.frozen.evaluationPackageId,
      sourcePairs: input.frozen.sourcePairs,
      priorAssignments: input.frozen.priorAssignments,
      priorRecoveryRandomizations: priorRandomizations,
      prompt,
      userContent,
      formatMode:
        formatMode === "FORCED_TOOL_CALL"
          ? "FORCED_TOOL_CALL"
          : "PLAIN_JSON_FALLBACK_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
      ...(formatMode === "FORCED_TOOL_CALL"
        ? {}
        : {
            confirmedUnbilledTaskLocalEvidence:
              fallbackEvidence ??
              (() => {
                throw new Error(
                  "Plain fallback lacks exact local unbilled evidence",
                );
              })(),
          }),
    });
    const requestAudit =
      assertOpenRouterPaidJudgeRequestBody({
        body: built.body,
        mode: formatMode,
      });
    if (!requestAudit.responseFormatOmitted) {
      throw new Error("response_format is forbidden");
    }
    await writeNewRestricted(
      resolve(
        paths.randomizations,
        `${String(transportPosts + 1).padStart(
          2,
          "0",
        )}-${perspectiveId}-${formatMode.toLowerCase()}.json`,
      ),
      `${canonicalAiJson(randomization)}\n`,
    );
    await writeNewRestricted(
      resolve(
        paths.requests,
        `${String(transportPosts + 1).padStart(2, "0")}-${perspectiveId}.json`,
      ),
      `${canonicalAiJson(built.redactedRequestRecord)}\n`,
    );
    await appendLedger(
      paths.ledger,
      input.plan.planHash,
      "PAID_POST_RESERVED",
      {
        transportPostIndex: transportPosts + 1,
        perspectiveId,
        mode: formatMode,
        requestBodySha256: requestAudit.requestBodySha256,
        responseFormatOmitted: true,
        audioClipCount: requestAudit.audioInputCount,
        admissionProjectedCostUsd: formatUsdQuanta(
          planned.request.admissionProjectedCostQuanta,
        ),
      },
      now,
    );
    dispatchedRandomizations.push({
      transportPostIndex: transportPosts + 1,
      perspectiveId:
        perspectiveId as OpenRouterPaidJudgePerspectiveId,
      randomization,
    });
    transportPosts += 1;
    let response:
      | Awaited<ReturnType<FetchLike>>
      | undefined;
    try {
      response = await input.fetchImpl(CHAT_ENDPOINT, {
        method: "POST",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(built.body),
      });
    } catch {
      state = settleOpenRouterPaidJudgeRequest({
        state,
        settlement: {
          kind: "UNCERTAIN_POSSIBLY_PAID",
        },
      });
      await appendLedger(
        paths.ledger,
        input.plan.planHash,
        "PAID_POST_UNCERTAIN_NO_RETRY",
        {
          transportPostIndex: transportPosts,
          perspectiveId,
          reason: "TRANSPORT_AMBIGUITY",
        },
        now,
      );
      break;
    }
    let rawBody: string;
    try {
      rawBody = await response.text();
    } catch {
      state = settleOpenRouterPaidJudgeRequest({
        state,
        settlement: {
          kind: "UNCERTAIN_POSSIBLY_PAID",
        },
      });
      await appendLedger(
        paths.ledger,
        input.plan.planHash,
        "PAID_POST_UNCERTAIN_NO_RETRY",
        {
          transportPostIndex: transportPosts,
          perspectiveId,
          reason: "RESPONSE_BODY_READ_AMBIGUITY",
        },
        now,
      );
      break;
    }
    let lifecycle: OpenRouterRawResponseLifecycle;
    try {
      lifecycle = await persistExactRaw({
        rawBody,
        path: resolve(
          paths.raw,
          `${String(transportPosts).padStart(2, "0")}-${perspectiveId}.http-body.txt`,
        ),
        secret,
        paths,
        plan: input.plan,
        eventData: {
          transportPostIndex: transportPosts,
          perspectiveId,
          httpStatus: response.status,
          safeResponseHeaders: safeHeaders(
            response.headers,
            secret,
          ),
        },
        now,
      });
    } catch {
      state = settleOpenRouterPaidJudgeRequest({
        state,
        settlement: {
          kind: "UNCERTAIN_POSSIBLY_PAID",
        },
      });
      await appendLedger(
        paths.ledger,
        input.plan.planHash,
        "PAID_RESPONSE_PERSISTENCE_FAILED_UNCERTAIN_NO_RETRY",
        {
          transportPostIndex: transportPosts,
          perspectiveId,
          responseReceived: true,
          rawBodyPersisted: false,
          reason: "PRIVACY_OR_DURABILITY_GATE_FAILED",
        },
        now,
      );
      break;
    }
    if (
      lifecycle.stage !== "SEMANTIC_PARSE_AUTHORIZED"
    ) {
      throw new Error(
        "Paid response persistence lifecycle is incomplete",
      );
    }
    if (!lifecycle.exactRawBodyStored) {
      const sanitizedBody = await readFile(
        resolve(
          paths.raw,
          `${String(transportPosts).padStart(
            2,
            "0",
          )}-${perspectiveId}.http-body.txt`,
        ),
        "utf8",
      );
      let accountingReceipt;
      try {
        accountingReceipt =
          parseOpenRouterChatCompletionReceipt({
            rawBody: sanitizedBody,
            generationHeaderId:
              response.headers?.get(
                "x-openrouter-generation-id",
              ) ?? null,
          });
      } catch {
        accountingReceipt = null;
      }
      let accountingCost =
        accountingReceipt === null
          ? null
          : resolveOpenRouterPaidJudgeCost({
              receipt: accountingReceipt,
            });
      if (
        accountingCost?.status ===
        "REQUIRES_GENERATION_METADATA"
      ) {
        const fallback =
          await generationCostFallback({
            generationId:
              accountingCost.generationId,
            secret,
            paths,
            plan: input.plan,
            fetchImpl: input.fetchImpl,
            now,
            metadataGetsUsed,
          });
        metadataGetsUsed =
          fallback.metadataGetsUsed;
        accountingCost =
          resolveOpenRouterPaidJudgeCost({
            receipt: accountingReceipt!,
            generationMetadata: fallback.metadata,
          });
      }
      if (
        accountingCost?.status === "RESOLVED"
      ) {
        state = settleOpenRouterPaidJudgeRequest({
          state,
          settlement: {
            kind:
              response.status === 402
                ? "HTTP_402"
                : "INVALID_PAID",
            actualCostQuanta:
              accountingCost.costQuanta,
          },
        });
      } else {
        state = settleOpenRouterPaidJudgeRequest({
          state,
          settlement: {
            kind: "UNCERTAIN_POSSIBLY_PAID",
          },
        });
      }
      await appendLedger(
        paths.ledger,
        input.plan.planHash,
        "ECHOED_INPUT_AUDIO_REDACTED_NO_SEMANTIC_PARSE",
        {
          transportPostIndex: transportPosts,
          perspectiveId,
          sanitizedArtifactStored: true,
          actualCostUsd:
            accountingCost?.status === "RESOLVED"
              ? accountingCost.costUsd
              : null,
        },
        now,
      );
      newRandomizations.push(randomization);
      fallbackRandomization = null;
      if (
        response.status === 402 ||
        state.costReconciliationRequired
      ) {
        break;
      }
      continue;
    }
    let receipt;
    try {
      receipt = parseOpenRouterChatCompletionReceipt({
        rawBody,
        generationHeaderId:
          response.headers?.get(
            "x-openrouter-generation-id",
          ) ?? null,
      });
    } catch {
      receipt = null;
    }
    if (
      receipt !== null &&
      lifecycle.rawBodySha256 !==
        receipt.rawBodySha256
    ) {
      throw new Error(
        "Paid response receipt is not bound to the durable raw body",
      );
    }
    if (
      response.status === 402
    ) {
      state = settleOpenRouterPaidJudgeRequest({
        state,
        settlement: {
          kind: "HTTP_402",
          ...(receipt?.inlineUsageCostQuanta === null ||
          receipt?.inlineUsageCostQuanta === undefined
            ? {}
            : {
                actualCostQuanta:
                  receipt.inlineUsageCostQuanta,
              }),
        },
      });
      await appendLedger(
        paths.ledger,
        input.plan.planHash,
        "HTTP_402_FAIL_CLOSED",
        {
          transportPostIndex: transportPosts,
          perspectiveId,
        },
        now,
      );
      break;
    }
    let noGenerationFourXxDelta: bigint | null = null;
    let postFourXxKey: KeySnapshot | null = null;
    if (
      response.status >= 400 &&
      response.status < 500 &&
      receipt?.generationId == null
    ) {
      let afterKey:
        | Awaited<ReturnType<typeof getCurrentKey>>
        | undefined;
      try {
        afterKey = await getCurrentKey({
          secret,
          paths,
          plan: input.plan,
          fetchImpl: input.fetchImpl,
          now,
          metadataGetsUsed,
          label: `after-4xx-post-${String(
            transportPosts,
          )}`,
          expectedUsageQuanta: undefined,
        });
      } catch {
        metadataGetsUsed = Math.min(
          OPENROUTER_MAXIMUM_METADATA_GETS,
          metadataGetsUsed + 1,
        );
        state = settleOpenRouterPaidJudgeRequest({
          state,
          settlement: {
            kind: "UNCERTAIN_POSSIBLY_PAID",
          },
        });
        await appendLedger(
          paths.ledger,
          input.plan.planHash,
          "PAID_POST_UNCERTAIN_NO_RETRY",
          {
            transportPostIndex: transportPosts,
            perspectiveId,
            reason:
              "POST_4XX_KEY_RECONCILIATION_FAILED",
          },
          now,
        );
        break;
      }
      metadataGetsUsed = afterKey.metadataGetsUsed;
      postFourXxKey = afterKey.snapshot;
      noGenerationFourXxDelta =
        afterKey.snapshot.usageQuanta -
        key.snapshot.usageQuanta;
      if (
        noGenerationFourXxDelta < 0n ||
        key.snapshot.usageQuanta +
          noGenerationFourXxDelta >
          OPENROUTER_MAXIMUM_SPEND_QUANTA
      ) {
        state = settleOpenRouterPaidJudgeRequest({
          state,
          settlement: {
            kind: "UNCERTAIN_POSSIBLY_PAID",
          },
        });
        await appendLedger(
          paths.ledger,
          input.plan.planHash,
          "PAID_POST_UNCERTAIN_NO_RETRY",
          {
            transportPostIndex: transportPosts,
            perspectiveId,
            reason: "INVALID_POST_4XX_KEY_DELTA",
          },
          now,
        );
        break;
      }
      await appendLedger(
        paths.ledger,
        input.plan.planHash,
        "HTTP_4XX_NO_GENERATION_COST_RECONCILED",
        {
          transportPostIndex: transportPosts,
          perspectiveId,
          beforeUsageUsd: formatUsdQuanta(
            key.snapshot.usageQuanta,
          ),
          afterUsageUsd: formatUsdQuanta(
            afterKey.snapshot.usageQuanta,
          ),
          actualDeltaUsd: formatUsdQuanta(
            noGenerationFourXxDelta,
          ),
        },
        now,
      );
    }
    if (receipt !== null && formatMode === "FORCED_TOOL_CALL") {
      const evidence =
        classifyOpenRouterConfirmedUnbilledToolRejection({
          lifecycle,
          httpStatus: response.status,
          rawBody,
          receipt,
          ...(noGenerationFourXxDelta === 0n &&
          postFourXxKey !== null
            ? {
                stableKeyUsageDeltaZero: {
                  beforeUsageQuanta:
                    key.snapshot.usageQuanta,
                  afterUsageQuanta:
                    postFourXxKey.usageQuanta,
                  beforeRawBodySha256:
                    key.snapshot.rawBodySha256,
                  afterRawBodySha256:
                    postFourXxKey.rawBodySha256,
                },
              }
            : {}),
        });
      if (evidence) {
        state = settleOpenRouterPaidJudgeRequest({
          state,
          settlement: {
            kind: "CONFIRMED_UNBILLED_TOOL_UNSUPPORTED",
            evidence,
          },
        });
        const rejectionLedger = await appendLedger(
          paths.ledger,
          input.plan.planHash,
          "CONFIRMED_UNBILLED_TOOL_REJECTION",
          {
            transportPostIndex: transportPosts,
            perspectiveId,
            rawBodySha256: receipt.rawBodySha256,
            httpStatus: evidence.httpStatus,
            unbilledEvidence:
              evidence.unbilledEvidence,
            keyDeltaEvidence:
              evidence.unbilledEvidence ===
                "STABLE_CURRENT_KEY_USAGE_DELTA_ZERO" &&
              postFourXxKey !== null
                ? {
                    beforeUsageUsd:
                      formatUsdQuanta(
                        key.snapshot.usageQuanta,
                      ),
                    afterUsageUsd:
                      formatUsdQuanta(
                        postFourXxKey.usageQuanta,
                      ),
                    beforeRawBodySha256:
                      key.snapshot.rawBodySha256,
                    afterRawBodySha256:
                      postFourXxKey.rawBodySha256,
                  }
                : null,
          },
          now,
        );
        fallbackRandomization = randomization;
        fallbackEvidence = {
          transportPostIndex: transportPosts,
          ledgerEntryHash:
            rejectionLedger.entryHash,
          responseSha256:
            receipt.rawBodySha256,
        };
        continue;
      }
    }
    let costResolution =
      receipt === null
        ? null
        : resolveOpenRouterPaidJudgeCost({ receipt });
    let reconciledCostSource:
      | "key.usage_delta"
      | null = null;
    if (noGenerationFourXxDelta !== null) {
      if (
        receipt?.inlineUsageCostQuanta !== null &&
        receipt?.inlineUsageCostQuanta !== undefined &&
        receipt.inlineUsageCostQuanta !==
          noGenerationFourXxDelta
      ) {
        state = settleOpenRouterPaidJudgeRequest({
          state,
          settlement: {
            kind: "UNCERTAIN_POSSIBLY_PAID",
          },
        });
        await appendLedger(
          paths.ledger,
          input.plan.planHash,
          "PAID_POST_UNCERTAIN_NO_RETRY",
          {
            transportPostIndex: transportPosts,
            perspectiveId,
            reason:
              "INLINE_COST_AND_POST_4XX_KEY_DELTA_CONFLICT",
          },
          now,
        );
        break;
      }
      costResolution = {
        status: "RESOLVED",
        source: "usage.cost",
        generationId: null,
        costQuanta: noGenerationFourXxDelta,
        costUsd: formatUsdQuanta(
          noGenerationFourXxDelta,
        ),
      };
      reconciledCostSource = "key.usage_delta";
    }
    if (
      costResolution?.status ===
      "REQUIRES_GENERATION_METADATA"
    ) {
      const fallback = await generationCostFallback({
        generationId: costResolution.generationId,
        secret,
        paths,
        plan: input.plan,
        fetchImpl: input.fetchImpl,
        now,
        metadataGetsUsed,
      });
      metadataGetsUsed = fallback.metadataGetsUsed;
      costResolution = resolveOpenRouterPaidJudgeCost({
        receipt: receipt!,
        generationMetadata: fallback.metadata,
      });
    }
    if (
      costResolution === null ||
      costResolution.status !== "RESOLVED"
    ) {
      state = settleOpenRouterPaidJudgeRequest({
        state,
        settlement: {
          kind: "UNCERTAIN_POSSIBLY_PAID",
        },
      });
      await appendLedger(
        paths.ledger,
        input.plan.planHash,
        "PAID_POST_UNCERTAIN_NO_RETRY",
        {
          transportPostIndex: transportPosts,
          perspectiveId,
          reason: "COST_UNRESOLVED",
        },
        now,
      );
      break;
    }
    if (!response.ok || receipt === null) {
      state = settleOpenRouterPaidJudgeRequest({
        state,
        settlement: {
          kind: "INVALID_PAID",
          actualCostQuanta:
            costResolution.costQuanta,
        },
      });
      await appendLedger(
        paths.ledger,
        input.plan.planHash,
        "PAID_RESPONSE_INVALID_NO_RETRY",
        {
          transportPostIndex: transportPosts,
          perspectiveId,
          actualCostUsd: costResolution.costUsd,
          costSource:
            reconciledCostSource ??
            costResolution.source,
          reason: `HTTP_${String(response.status)}`,
        },
        now,
      );
      newRandomizations.push(randomization);
      fallbackRandomization = null;
      continue;
    }
    let run: AiValidatedJudgeRun | null = null;
    let issueCodes: readonly string[] = [];
    try {
      const payload = parseOpenRouterPaidJudgePayload({
        rawBody,
        mode: formatMode,
      });
      const assignment = recoveryAssignment(
        randomization.assignment,
      );
      const recovered = recoverAiAudioJudgeResponse({
        responseId:
          receipt.generationId ??
          `response-${receipt.rawBodySha256}`,
        response: payload.payload,
        assignment,
      });
      if (recovered.valid) {
        const legacy = toLegacyAiJudgeResponse(
          recovered.response,
          assignment,
        );
        const validated = validateJudgeResponse(
          legacy,
          randomization.assignment,
          {
            attemptNumber: 1,
            clearlyDistinctSourcePairIds:
              input.frozen.objective
                .clearlyDistinctPairIds,
          },
        );
        if (validated.valid) {
          run = {
            assignment: randomization.assignment,
            response: validated.response,
            responseHash: validated.responseHash,
          };
          await writeNewRestricted(
            resolve(
              paths.normalized,
              `${perspectiveId}.json`,
            ),
            `${canonicalAiJson({
              schemaVersion:
                "tenxpros-openrouter-paid-normalized-response-v1",
              perspectiveId,
              generationId: receipt.generationId,
              rawBodySha256: receipt.rawBodySha256,
              recoveredResponseHash:
                recovered.responseHash,
              provenance: recovered.provenance,
              response: recovered.response,
            })}\n`,
          );
        } else {
          issueCodes = validated.issues.map(
            (item) => item.code,
          );
        }
      } else {
        issueCodes = recovered.issues.map(
          (item) => item.code,
        );
      }
    } catch (error) {
      issueCodes = [
        error instanceof Error
          ? error.message
          : "SEMANTIC_PARSE_FAILED",
      ];
    }
    state = settleOpenRouterPaidJudgeRequest({
      state,
      settlement: {
        kind: run ? "VALID_PAID" : "INVALID_PAID",
        actualCostQuanta: costResolution.costQuanta,
      },
    });
    if (run) {
      runs.push(run);
      acceptedIdentities.push({
        perspectiveId:
          perspectiveId as OpenRouterPaidJudgePerspectiveId,
        generationId:
          receipt.generationId ??
          `response-${receipt.rawBodySha256}`,
        rawBodySha256: receipt.rawBodySha256,
      });
    }
    await appendLedger(
      paths.ledger,
      input.plan.planHash,
      run
        ? "PAID_RESPONSE_ACCEPTED"
        : "PAID_RESPONSE_INVALID_NO_RETRY",
      {
        transportPostIndex: transportPosts,
        perspectiveId,
        generationId: receipt.generationId,
        rawBodySha256: receipt.rawBodySha256,
        actualCostUsd: costResolution.costUsd,
        costSource:
          reconciledCostSource ??
          costResolution.source,
        issueCodes,
      },
      now,
    );
    newRandomizations.push(randomization);
    fallbackRandomization = null;
  }

  let finalKeyReconciliationFailed = false;
  if (
    transportPosts > 0 &&
    !state.costReconciliationRequired
  ) {
    const metadataGetsBeforeFinalReconciliation =
      metadataGetsUsed;
    const finalExpectedUsage =
      parseUsdToQuanta(
        PAID_RECOVERY_CARRIED_ACTUAL_COST_USD,
      ) + state.knownNewActualCostQuanta;
    try {
      const finalKey = await getCurrentKey({
        secret,
        paths,
        plan: input.plan,
        fetchImpl: input.fetchImpl,
        now,
        metadataGetsUsed,
        label: "final-after-settlements",
        expectedUsageQuanta: finalExpectedUsage,
      });
      metadataGetsUsed = finalKey.metadataGetsUsed;
      await appendLedger(
        paths.ledger,
        input.plan.planHash,
        "FINAL_KEY_USAGE_RECONCILED",
        {
          cumulativeActualCostUsd:
            formatUsdQuanta(finalExpectedUsage),
          usageUsd: formatUsdQuanta(
            finalKey.snapshot.usageQuanta,
          ),
        },
        now,
      );
    } catch {
      metadataGetsUsed = Math.min(
        OPENROUTER_MAXIMUM_METADATA_GETS,
        Math.max(
          metadataGetsUsed,
          metadataGetsBeforeFinalReconciliation + 1,
        ),
      );
      finalKeyReconciliationFailed = true;
      await appendLedger(
        paths.ledger,
        input.plan.planHash,
        "FINAL_KEY_RECONCILIATION_FAILED_UNCERTAIN",
        {
          cumulativeKnownActualCostUsd:
            formatUsdQuanta(finalExpectedUsage),
          metadataGetsUsed,
          noLaterPostAllowed: true,
        },
        now,
      );
    }
  }

  const partial = buildOpenRouterPartialPanelStatus(state);
  const complete =
    partial.status === "COMPLETE" &&
    runs.length === 5 &&
    new Set(
      acceptedIdentities.map((item) => item.perspectiveId),
    ).size === 5 &&
    new Set(
      acceptedIdentities.map((item) => item.generationId),
    ).size === 5 &&
    new Set(
      acceptedIdentities.map((item) => item.rawBodySha256),
    ).size === 5;
  let primaryDecision:
    | AiNarrationDecision["primaryDecision"]
    | "INCONCLUSIVE_AI_ONLY_EVALUATION" =
    "INCONCLUSIVE_AI_ONLY_EVALUATION";
  let conditionalBranch:
    PaidRecoveryExecutionResult["conditionalBranch"] =
    "NOT_REQUIRED";
  let taskDecision:
    PaidRecoveryExecutionResult["taskDecision"] =
    "INCONCLUSIVE_AI_ONLY_EVALUATION";
  let panelArtifact: unknown = {
    schemaVersion:
      "tenxpros-openrouter-paid-partial-panel-v1",
    partial: {
      ...partial,
      knownNewActualCostQuanta:
        partial.knownNewActualCostQuanta.toString(),
    },
    validRuns: runs.map((run) => ({
      judgeId: run.assignment.judgeId,
      responseHash: run.responseHash,
      response: run.response,
    })),
  };
  if (complete) {
    const result = finalizePanel({
      frozen: input.frozen,
      runs,
    });
    primaryDecision = result.decision.primaryDecision;
    taskDecision = result.taskDecision;
    conditionalBranch =
      result.decision.internalBranch === "NONE"
        ? "NOT_REQUIRED"
        : "SKIPPED_PAID_POST_CAP_EXHAUSTED";
    panelArtifact = {
      schemaVersion:
        "tenxpros-openrouter-paid-complete-panel-v1",
      analysis: result.analysis,
      decision: result.decision,
    };
  }
  await writeNewRestricted(
    paths.privateManifest,
    `${canonicalAiJson({
      schemaVersion:
        "tenxpros-openrouter-paid-private-manifest-v1",
      planHash: input.plan.planHash,
      randomizations: newRandomizations,
      dispatchedRandomizations,
      acceptedIdentities,
      privateMappingStoredOnlyHere: true,
    })}\n`,
  );
  await writeNewRestricted(
    paths.panel,
    `${canonicalAiJson(panelArtifact)}\n`,
  );
  const cumulativeActual =
    parseUsdToQuanta(
      PAID_RECOVERY_CARRIED_ACTUAL_COST_USD,
    ) + state.knownNewActualCostQuanta;
  const maximumUncertainCost =
    state.costReconciliationRequired ||
    finalKeyReconciliationFailed
      ? OPENROUTER_MAXIMUM_SPEND_QUANTA -
        cumulativeActual
      : 0n;
  const capAccountedCost =
    cumulativeActual + maximumUncertainCost;
  const result: PaidRecoveryExecutionResult = {
    status: complete ? "COMPLETE" : "INCONCLUSIVE",
    planHash: input.plan.planHash,
    paidJudgePosts: state.paidJudgePostsUsed,
    physicalChatCompletionPosts: transportPosts,
    metadataGets: metadataGetsUsed,
    cumulativeActualCostUsd:
      formatUsdQuanta(cumulativeActual),
    costStatus:
      state.costReconciliationRequired ||
      finalKeyReconciliationFailed
      ? "UNCERTAIN_PAID"
      : "RECONCILED_EXACT",
    maximumUncertainCostUsd:
      formatUsdQuanta(maximumUncertainCost),
    capAccountedCostUsd:
      formatUsdQuanta(capAccountedCost),
    validIndependentJudges:
      partial.validIndependentJudgeCount,
    primaryDecision,
    taskDecision,
    conditionalBranch,
  };
  await appendLedger(
    paths.ledger,
    input.plan.planHash,
    "EXECUTION_COMPLETE",
    { ...result },
    now,
  );
  await writeNewRestricted(
    paths.report,
    `# OpenRouter paid generation-recovery report

- Status: ${result.status}
- Plan hash: \`${result.planHash}\`
- New paid judge POSTs: ${String(result.paidJudgePosts)} / 5
- Physical chat-completion POSTs: ${String(result.physicalChatCompletionPosts)} / 5
- Metadata GET count: ${String(result.metadataGets)} / 40
- Cumulative actual cost: USD ${result.cumulativeActualCostUsd}
- Cost status: ${result.costStatus}
- Maximum uncertain cost: USD ${result.maximumUncertainCostUsd}
- Cap-accounted cost: USD ${result.capAccountedCostUsd}
- Valid independent judges: ${String(result.validIndependentJudges)} / 5
- Primary decision: ${result.primaryDecision}
- Task-contract decision: ${result.taskDecision}
- Conditional branch: ${result.conditionalBranch}
- ElevenLabs calls: 0
- Direct OpenAI calls: 0
- Production mutations: 0
`,
  );
  return result;
}

interface LiveReconciliationSupplement {
  schemaVersion: string;
  status: string;
  offlineOnly: boolean;
  networkRequestCount: number;
  paidInferenceRequestCount: number;
  chatCompletionPostCount: number;
  carriedMetadataGetCount: number;
  retrievalPlanHash: string;
  immutablePriorState: {
    planFileSha256: string;
    evidenceManifestSha256: string;
    ledgerSha256: string;
    terminalSequence: number;
    terminalHash: string;
    keyArtifactSha256: string;
  };
  keyReadings: {
    usageUsd: string;
    limitUsd: string;
    limitRemainingUsd: string;
    keyKind: string;
    active: boolean;
    expiresAt: string | null;
    reinterpretationSequence: number;
    reinterpretationEntryHash: string;
  }[];
  reconciliation: {
    reconciledActualCostUsd: string;
    capAccountedCostUsd: string;
    remainingKeyLimitUsd: string;
    retainedHypotheticalUncertainUsd: string;
    canContinuePaidInference: boolean;
    ledgerSequence: number;
    ledgerEntryHash: string;
  };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function assertFileHash(
  path: string,
  expected: string,
): Promise<void> {
  if (sha256(await readFile(path)) !== expected) {
    throw new Error(`Pinned artifact changed: ${path}`);
  }
}

function assertSupplement(
  value: unknown,
  nowIso: string,
): asserts value is LiveReconciliationSupplement {
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) {
    throw new Error(
      "Reconciliation supplement comparison time is invalid",
    );
  }
  if (
    !isRecord(value) ||
    value.schemaVersion !==
      "tenxpros-openrouter-generation-reconciliation-supplement-v1" ||
    value.status !== "UNCERTAIN_COST_CLEARED" ||
    value.offlineOnly !== true ||
    value.networkRequestCount !== 0 ||
    value.paidInferenceRequestCount !== 0 ||
    value.chatCompletionPostCount !== 0 ||
    value.carriedMetadataGetCount !== 24 ||
    value.retrievalPlanHash !==
      LIVE_PINS.retrievalPlanHash ||
    !isRecord(value.immutablePriorState) ||
    !Array.isArray(value.keyReadings) ||
    value.keyReadings.length !== 2 ||
    !isRecord(value.reconciliation)
  ) {
    throw new Error(
      "Reconciliation supplement does not authorize paid continuation",
    );
  }
  const supplement =
    value as unknown as LiveReconciliationSupplement;
  if (
    supplement.immutablePriorState.planFileSha256 !==
      LIVE_PINS.retrievalPlanFileSha256 ||
    supplement.immutablePriorState
      .evidenceManifestSha256 !==
      LIVE_PINS.evidenceManifestSha256 ||
    supplement.immutablePriorState.terminalSequence !==
      109 ||
    supplement.immutablePriorState.terminalHash !==
      "ad82a9ebd3a48ced1353c6cb38302a26bfd5c533496289d0372cb0f9c0f492ac" ||
    supplement.keyReadings.some(
      (reading) =>
        reading.usageUsd !==
          PAID_RECOVERY_CARRIED_ACTUAL_COST_USD ||
        reading.limitUsd !== "10.00000000" ||
        reading.limitRemainingUsd !== "6.45849000" ||
        reading.keyKind !== "INFERENCE_CONFIRMED" ||
        !reading.active ||
        reading.expiresAt === null ||
        Date.parse(reading.expiresAt) <= nowMs,
    ) ||
    supplement.keyReadings[0]!
      .reinterpretationSequence !== 110 ||
    supplement.keyReadings[1]!
      .reinterpretationSequence !== 111 ||
    supplement.reconciliation.reconciledActualCostUsd !==
      PAID_RECOVERY_CARRIED_ACTUAL_COST_USD ||
    supplement.reconciliation.capAccountedCostUsd !==
      PAID_RECOVERY_CARRIED_ACTUAL_COST_USD ||
    supplement.reconciliation.remainingKeyLimitUsd !==
      "6.45849000" ||
    supplement.reconciliation
      .retainedHypotheticalUncertainUsd !==
      "0.00000000" ||
    !supplement.reconciliation.canContinuePaidInference ||
    supplement.reconciliation.ledgerSequence !== 112 ||
    supplement.reconciliation.ledgerEntryHash !==
      "f9c62b8f04f17f77c43307788d9403e330896ac5d3bf24482c896831ec1bb886"
  ) {
    throw new Error(
      "Reconciliation supplement financial evidence drifted",
    );
  }
}

export interface PreparedLivePaidGenerationRecovery {
  execution: Omit<
    PaidRecoveryExecutionInput,
    "fetchImpl" | "readSecret"
  >;
  secretPath: typeof PAID_RECOVERY_SECRET_PATH;
}

/**
 * Read-only live preparation. It binds every authorization/accounting input
 * before the executor creates its one-off lock. It inspects secret metadata
 * but deliberately does not open or read the secret.
 */
export async function prepareLivePaidGenerationRecovery(
  input: {
    outputDirectory?: string;
    lockPath?: string;
    now?: () => string;
  } = {},
): Promise<PreparedLivePaidGenerationRecovery> {
  const outputDirectory = resolve(
    input.outputDirectory ?? LIVE_OUTPUT_DIRECTORY,
  );
  const lockPath = resolve(
    input.lockPath ?? LIVE_LOCK_PATH,
  );
  if (outputDirectory !== LIVE_OUTPUT_DIRECTORY) {
    throw new Error(
      "Live paid preparation is pinned to the existing Phase 2C run",
    );
  }
  const artifact = (name: string) =>
    resolve(outputDirectory, name);
  const supplementPath = artifact(
    "generation-retrieval-reconciliation-supplement.json",
  );
  const retrievalLedgerPath = artifact(
    "generation-retrieval-ledger.jsonl",
  );
  const retrievalPlanPath = artifact(
    "generation-retrieval-plan.json",
  );
  const evidencePath = artifact(
    "generation-retrieval-evidence-manifest.json",
  );
  const responseRecoveryPlanPath = artifact(
    "response-recovery-plan.json",
  );
  const responseRecoveryLedgerPath = artifact(
    "response-recovery-ledger.jsonl",
  );
  const privateManifestPath = artifact(
    "private-ai-manifest.json",
  );
  const objectivePath = artifact(
    "objective-audio-analysis.json",
  );
  const modelPreflightPath = artifact(
    "private/api-records/openrouter-preflight-summary.json",
  );
  await Promise.all([
    assertFileHash(
      supplementPath,
      LIVE_PINS.supplementSha256,
    ),
    assertFileHash(
      retrievalLedgerPath,
      LIVE_PINS.retrievalLedgerSha256,
    ),
    assertFileHash(
      retrievalPlanPath,
      LIVE_PINS.retrievalPlanFileSha256,
    ),
    assertFileHash(
      evidencePath,
      LIVE_PINS.evidenceManifestSha256,
    ),
    assertFileHash(
      responseRecoveryPlanPath,
      LIVE_PINS.responseRecoveryPlanFileSha256,
    ),
    assertFileHash(
      responseRecoveryLedgerPath,
      LIVE_PINS.responseRecoveryLedgerSha256,
    ),
    assertFileHash(
      privateManifestPath,
      LIVE_PINS.privateManifestSha256,
    ),
    assertFileHash(
      objectivePath,
      LIVE_PINS.objectiveSha256,
    ),
    assertFileHash(
      modelPreflightPath,
      LIVE_PINS.modelPreflightSha256,
    ),
  ]);
  const retrievalEntries = (
    await readFile(retrievalLedgerPath, "utf8")
  )
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as {
          sequence: number;
          event: string;
          entryHash: string;
          retrievalPlanHash: string;
          data: Record<string, unknown>;
        },
    );
  const terminal = retrievalEntries.at(-1);
  if (
    terminal?.sequence !==
      LIVE_PINS.retrievalTerminalSequence ||
    terminal.entryHash !==
      LIVE_PINS.retrievalTerminalHash ||
    terminal.event !==
      "GENERATION_RETRIEVAL_OFFLINE_RECONCILIATION_COMPLETED" ||
    terminal.retrievalPlanHash !==
      LIVE_PINS.retrievalPlanHash ||
    terminal.data.supplementSha256 !==
      LIVE_PINS.supplementSha256 ||
    terminal.data.paidContinuationAccountingGate !==
      true
  ) {
    throw new Error(
      "Generation-retrieval terminal continuation gate changed",
    );
  }
  const supplement = await readJson(supplementPath);
  assertSupplement(
    supplement,
    (input.now ?? (() => new Date().toISOString()))(),
  );
  const recoveryPlan = await readJson(
    responseRecoveryPlanPath,
  );
  assertResponseRecoveryPlanInvariant(recoveryPlan);
  if (
    recoveryPlan.recoveryPlanHash !==
      LIVE_PINS.responseRecoveryPlanHash ||
    recoveryPlan.recoveredPerspectiveIds.length !== 0 ||
    canonicalAiJson(
      recoveryPlan.missingPerspectiveIds,
    ) !==
      canonicalAiJson([
        "judge-01",
        "judge-02",
        "judge-03",
        "judge-04",
        "judge-05",
      ])
  ) {
    throw new Error(
      "Response-recovery perspective set changed",
    );
  }
  const preflight = await readJson(modelPreflightPath);
  if (
    !isRecord(preflight) ||
    preflight.status !== "PASS" ||
    preflight.provider !== "openrouter" ||
    preflight.model !== OPENROUTER_MODEL_ID ||
    !isRecord(preflight.modelCapability) ||
    preflight.modelCapability.audioInput !== true ||
    preflight.modelCapability.toolCalling !== true
  ) {
    throw new Error(
      "Pinned OpenRouter audio/tool capability preflight failed",
    );
  }
  const secretMetadata = await lstat(
    PAID_RECOVERY_SECRET_PATH,
  );
  if (
    !secretMetadata.isFile() ||
    secretMetadata.isSymbolicLink() ||
    (secretMetadata.mode & 0o777) !== 0o400 ||
    secretMetadata.nlink !== 1 ||
    secretMetadata.size < 16 ||
    secretMetadata.size > 512 ||
    (process.getuid !== undefined &&
      secretMetadata.uid !== process.getuid())
  ) {
    throw new Error(
      "Inference secret metadata gate failed",
    );
  }
  const frozen =
    await phase2cPrimaryJudgeHttpTestHooks.loadFrozenInput();
  const built =
    phase2cPrimaryJudgeHttpTestHooks.buildPlanAndPrivateManifest(
      frozen,
    );
  const storedPrivateManifest = await readJson(
    privateManifestPath,
  );
  phase2cPrimaryJudgeHttpTestHooks.assertPrivateManifestHashInvariant(
    built.plan,
    storedPrivateManifest as Parameters<
      typeof phase2cPrimaryJudgeHttpTestHooks.assertPrivateManifestHashInvariant
    >[1],
  );
  const sourcePairs =
    phase2cPrimaryJudgeHttpTestHooks.recoverySourcePairsFromFrozen(
      frozen,
    );
  const priorRecoveryRandomizations: FreshRecoveryRandomization[] =
    [];
  for (const perspectiveId of [
    "judge-01",
    "judge-02",
  ] as const) {
    const randomization = (await readJson(
      artifact(
        `private/recovery-randomizations/${perspectiveId}.json`,
      ),
    )) as FreshRecoveryRandomization;
    assertFreshRecoveryRandomization({
      randomization,
      evaluationPackageId:
        "blind-review-8fab36b45ab641b5",
      sourcePairs,
      priorAssignments: built.assignments,
      priorRecoveryRandomizations,
    });
    priorRecoveryRandomizations.push(randomization);
  }
  const objectiveArtifact = await readJson(
    objectivePath,
  );
  const privateSamples =
    phase2cPrimaryJudgeHttpTestHooks.identityRecords(frozen);
  const objective =
    phase2cPrimaryJudgeHttpTestHooks.objectiveSummaryFromArtifact(
      frozen,
      objectiveArtifact as Parameters<
        typeof phase2cPrimaryJudgeHttpTestHooks.objectiveSummaryFromArtifact
      >[1],
    );
  const plan = buildPaidRecoveryPlan({
    retrievalPlanHash:
      LIVE_PINS.retrievalPlanHash,
    reconciliationSupplementSha256:
      LIVE_PINS.supplementSha256,
    recoveryPlanHash:
      LIVE_PINS.responseRecoveryPlanHash,
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
    missingPerspectiveIds:
      recoveryPlan.missingPerspectiveIds as OpenRouterPaidJudgePerspectiveId[],
  });
  return {
    execution: {
      outputDirectory,
      lockPath,
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
      now: input.now,
    },
    secretPath: PAID_RECOVERY_SECRET_PATH,
  };
}

export async function runLivePaidGenerationRecovery(): Promise<PaidRecoveryExecutionResult> {
  const prepared =
    await prepareLivePaidGenerationRecovery();
  return executePaidGenerationRecovery({
    ...prepared.execution,
    fetchImpl: async (url, init) =>
      fetch(url, {
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
        redirect: init?.redirect,
      }),
    readSecret: async () =>
      phase2cPrimaryJudgeHttpTestHooks.readOpenRouterSecretFileAfterAllGates(
        prepared.secretPath,
      ),
  });
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
      "Usage: pnpm exec tsx scripts/openrouter-generation-recovery-paid.ts --execute-live\n",
    );
    process.exitCode = 2;
  } else {
    runLivePaidGenerationRecovery()
      .then((result) => {
        process.stdout.write(
          `${JSON.stringify(result, null, 2)}\n`,
        );
      })
      .catch((error: unknown) => {
        process.stderr.write(
          `Paid generation recovery failed: ${
            error instanceof Error
              ? error.message
              : String(error)
          }\n`,
        );
        process.exitCode = 1;
      });
  }
}
