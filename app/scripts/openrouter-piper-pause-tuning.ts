#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import {
  chmod,
  constants,
  lstat,
  mkdir,
  open,
  readFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatUsdQuanta,
  parseOpenRouterKeyUsage,
  parseUsdToQuanta,
} from "../src/lib/academy/narration/openrouter-generation-retrieval";
import {
  parseOpenRouterChatCompletionReceipt,
  parseOpenRouterPaidJudgePayload,
} from "../src/lib/academy/narration/openrouter-paid-judge-executor";
import {
  parsePiperPanelV2ModelCatalog,
} from "../src/lib/academy/narration/openrouter-piper-panel-v2-executor";
import {
  PIPER_PAUSE_TUNING_PERSPECTIVES,
  PIPER_PAUSE_TUNING_TOOL_NAME,
  aggregatePiperSemanticBlockFinal,
  parsePiperPauseTuningJudgeResult,
  piperPauseTuningTool,
  type BlindVersion,
  type PiperPauseTuningJudgeResult,
  type PiperPauseTuningPerspective,
} from "../src/lib/academy/narration/piper-pause-tuning-judge";

const SCRIPT_DIRECTORY = dirname(
  fileURLToPath(import.meta.url),
);
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
const RUN_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/piper-semantic-block-flow/semantic-block-flow-v1-20260727",
);
const SECRET_PATH =
  "/run/secrets/openrouter_audio_judge_key";
const API_BASE = "https://openrouter.ai/api/v1";
const KEY_ENDPOINT = `${API_BASE}/key`;
const MODELS_ENDPOINT = `${API_BASE}/models`;
const CHAT_ENDPOINT = `${API_BASE}/chat/completions`;
const MODEL = "openai/gpt-audio";
const CARRIED_COST = parseUsdToQuanta(
  "6.13768350",
);
const MAXIMUM_COST = parseUsdToQuanta(
  "10.00000000",
);
const MAXIMUM_PAID_POSTS = 4;
const MAXIMUM_COMPLETION_TOKENS = 4_000;
const GENESIS_HASH = "0".repeat(64);

interface JsonRecord {
  [key: string]: unknown;
}

interface BlindFile extends JsonRecord {
  pairId: string;
  kind: "control" | "semantic";
  fileName: string;
  sha256: string;
  sizeBytes: number;
}

interface BlindAssignment extends JsonRecord {
  pairId: string;
  A: BlindFile;
  B: BlindFile;
  privateMapping: {
    A: "control" | "semantic";
    B: "control" | "semantic";
  };
}

interface PerspectiveManifest extends JsonRecord {
  perspectiveId: string;
  semanticBlindVersion: BlindVersion;
  assignments: readonly BlindAssignment[];
}

interface CostEstimate {
  audioDurationSeconds: number;
  audioTokenEstimate: number;
  textTokenEstimate: number;
  maximumCompletionTokens: number;
  promptCostUsd: string;
  audioCostUsd: string;
  completionCostUsd: string;
  baseCostUsd: string;
  safetyMarginBasisPoints: number;
  conservativeCostUsd: string;
  conservativeCostQuanta: bigint;
}

interface Attempt {
  requestOrdinal: number;
  perspectiveId: PiperPauseTuningPerspective;
  phase: "PRIMARY" | "REPLACEMENT";
  httpStatus: number | null;
  responseId: string | null;
  rawResponsePath: string | null;
  rawResponseSha256: string | null;
  actualCostUsd: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  audioTokens: number | null;
  provider: string | null;
  valid: boolean;
  exactError: string | null;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

async function sha256File(path: string): Promise<string> {
  return sha256(await readFile(path));
}

function canonical(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") {
    return JSON.stringify(value.toString());
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Canonical JSON rejects non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (typeof value === "object") {
    const object = value as JsonRecord;
    return `{${Object.keys(object)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical(object[key])}`,
      )
      .join(",")}}`;
  }
  throw new Error("Canonical JSON rejects unsupported values");
}

function object(
  value: unknown,
  label: string,
): JsonRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonRecord;
}

function array(
  value: unknown,
  label: string,
): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

async function readJson(
  path: string,
): Promise<JsonRecord> {
  return JSON.parse(
    await readFile(path, "utf8"),
  ) as JsonRecord;
}

async function ensureNewPrivateDirectory(
  path: string,
): Promise<void> {
  await mkdir(path, { recursive: false, mode: 0o700 });
  await chmod(path, 0o700);
  const metadata = await lstat(path);
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o700
  ) {
    throw new Error(
      `Private directory check failed: ${path}`,
    );
  }
}

async function writeNewRestricted(
  path: string,
  value: string | Buffer,
): Promise<void> {
  const handle = await open(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
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
  const handle = await open(
    path,
    constants.O_WRONLY |
      constants.O_APPEND |
      constants.O_CREAT |
      constants.O_NOFOLLOW,
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
}

let ledgerSequence = 0;
let ledgerPriorHash = GENESIS_HASH;

async function ledger(
  path: string,
  planHash: string,
  event: string,
  data: unknown,
): Promise<string> {
  const entryWithoutHash = {
    schemaVersion:
      "tenxpros-piper-pause-tuning-ledger-v1",
    sequence: ledgerSequence + 1,
    timestamp: new Date().toISOString(),
    planHash,
    priorHash: ledgerPriorHash,
    event,
    data,
  };
  const eventHash = sha256(
    canonical(entryWithoutHash),
  );
  const entry = {
    ...entryWithoutHash,
    eventHash,
  };
  await appendRestricted(
    path,
    `${canonical(entry)}\n`,
  );
  ledgerSequence += 1;
  ledgerPriorHash = eventHash;
  return eventHash;
}

async function fetchText(input: {
  url: string;
  method: "GET" | "POST";
  secret: string;
  body?: string;
  timeoutMilliseconds: number;
}) {
  const response = await fetch(input.url, {
    method: input.method,
    redirect: "error",
    signal: AbortSignal.timeout(
      input.timeoutMilliseconds,
    ),
    headers: {
      Authorization: `Bearer ${input.secret}`,
      ...(input.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body: input.body,
  });
  return {
    ok: response.ok,
    status: response.status,
    generationHeaderId: response.headers.get(
      "x-openrouter-generation-id",
    ),
    rawBody: await response.text(),
  };
}

function sanitizeKey(
  key: ReturnType<typeof parseOpenRouterKeyUsage>,
) {
  return {
    usageUsd: key.usageUsd,
    limitUsd: key.limitUsd,
    limitRemainingUsd: key.limitRemainingUsd,
    keyKind: key.keyKind,
    active: key.active,
    expiresAt: key.expiresAt,
  };
}

async function getKey(
  secret: string,
): Promise<
  ReturnType<typeof parseOpenRouterKeyUsage>
> {
  const response = await fetchText({
    url: KEY_ENDPOINT,
    method: "GET",
    secret,
    timeoutMilliseconds: 30_000,
  });
  if (!response.ok) {
    throw new Error(
      `/key returned HTTP ${String(response.status)}`,
    );
  }
  return parseOpenRouterKeyUsage(response.rawBody);
}

function estimateCost(input: {
  model: ReturnType<
    typeof parsePiperPanelV2ModelCatalog
  >;
  durationSeconds: number;
  textBytes: number;
}): CostEstimate {
  const audioTokenEstimate = Math.max(
    10_020,
    Math.ceil(
      (input.durationSeconds * 1_000) / 60,
    ),
  );
  const textTokenEstimate = Math.ceil(
    input.textBytes / 3,
  );
  const prompt =
    BigInt(textTokenEstimate) *
    input.model.pricing.promptQuantaPerToken;
  const audio =
    BigInt(audioTokenEstimate) *
    input.model.pricing.audioQuantaPerToken;
  const completion =
    BigInt(MAXIMUM_COMPLETION_TOKENS) *
    input.model.pricing.completionQuantaPerToken;
  const base = prompt + audio + completion;
  const conservative =
    (base * 12_500n + 9_999n) / 10_000n;
  return {
    audioDurationSeconds: input.durationSeconds,
    audioTokenEstimate,
    textTokenEstimate,
    maximumCompletionTokens:
      MAXIMUM_COMPLETION_TOKENS,
    promptCostUsd: formatUsdQuanta(prompt),
    audioCostUsd: formatUsdQuanta(audio),
    completionCostUsd:
      formatUsdQuanta(completion),
    baseCostUsd: formatUsdQuanta(base),
    safetyMarginBasisPoints: 2_500,
    conservativeCostUsd:
      formatUsdQuanta(conservative),
    conservativeCostQuanta: conservative,
  };
}

const PERSPECTIVE_LENSES: Record<
  PiperPauseTuningPerspective,
  { title: string; focus: string }
> = {
  "judge-01": {
    title: "temporal hierarchy and prosody specialist",
    focus:
      "internal sentence flow, paragraph-to-sentence contrast, heading and section hierarchy, and audible joins",
  },
  "judge-02": {
    title: "long-form professional learning listener",
    focus:
      "comfort, fatigue, naturalness, clarity, and whether the pace remains credible over an Academy lesson",
  },
  "judge-03": {
    title: "audio QA and information-structure reviewer",
    focus:
      "headings, lists, section transitions, table traceability and efficiency, pronunciation, discontinuities, and acoustic defects",
  },
};

function blindAssignment(
  manifest: JsonRecord,
  perspectiveId: string,
): PerspectiveManifest {
  const perspective = array(
    manifest.perspectives,
    "blind perspectives",
  )
    .map((value) =>
      object(value, "blind perspective"),
    )
    .find(
      (candidate) =>
        candidate.perspectiveId ===
        perspectiveId,
    );
  if (!perspective) {
    throw new Error(
      `${perspectiveId} blind assignment missing`,
    );
  }
  return perspective as PerspectiveManifest;
}

async function audioPart(
  file: BlindFile,
): Promise<JsonRecord> {
  const path = resolve(
    RUN_DIRECTORY,
    "blind/audio",
    file.fileName,
  );
  const bytes = await readFile(path);
  if (
    sha256(bytes) !== file.sha256 ||
    bytes.length !== file.sizeBytes
  ) {
    throw new Error(
      `${file.fileName} blind audio binding changed`,
    );
  }
  return {
    type: "input_audio",
    input_audio: {
      data: bytes.toString("base64"),
      format: "mp3",
    },
  };
}

async function buildRequest(input: {
  perspectiveId: PiperPauseTuningPerspective;
  assignment: PerspectiveManifest;
}) {
  const lens = PERSPECTIVE_LENSES[input.perspectiveId];
  const byPair = new Map(
    input.assignment.assignments.map((assignment) => [
      assignment.pairId,
      assignment,
    ]),
  );
  const sample05 = byPair.get("sample-05");
  const sample02 = byPair.get("sample-02");
  if (!sample05 || !sample02) {
    throw new Error(
      "Blind tuning request requires sample-05 and sample-02",
    );
  }
  const systemPrompt = `You are one independent blind audio judge acting as a ${lens.title}.
Your focus is ${lens.focus}.
You receive two anonymous narration systems, Version A and Version B. Each system has the same pause-coverage lesson clip and the same table clip. You have no identity information. Listen completely at normal 1.0x playback. Do not infer hidden identities and do not discuss implementation. Judge only audible evidence. You have not received any other judge's result.`;
  const instruction = `Compare Version A with Version B across both clips.

The pause-coverage clip contains several sentences inside paragraphs, paragraph transitions, a heading, list items, a callout, and a section transition. Listen specifically for whether sentence-to-sentence flow inside each paragraph is natural and smooth; whether every paragraph transition is clearly longer than an ordinary sentence pause and appropriately noticeable; whether headings are clearly separated; whether the section is clear without theatrical silence; whether list separation is natural; and whether audible joins or discontinuities are reduced.

The table clip repeats helpful row labels. Determine which system is easier to follow and more time-efficient without treating intact repeated labels as a defect.

Score internal_sentence_flow as the naturalness and smooth continuity between sentences inside one paragraph. Every score must be an integer from 1 through 5. Confidence must be an integer from 0 through 100. Use A, B, BOTH, NEITHER, or TIE exactly where the tool schema requires it. A critical defect means a major audible pronunciation, clipping, truncation, duplication, discontinuity, or acoustic failure—not a minor preference. Your overall preference must reflect suitability for a 15-to-30-minute professional lesson. Submit exactly one ${PIPER_PAUSE_TUNING_TOOL_NAME} call.`;
  const userContent = [
    { type: "text", text: instruction },
    {
      type: "text",
      text: "Version A — pause-coverage clip (Sample 05):",
    },
    await audioPart(sample05.A),
    {
      type: "text",
      text: "Version A — table clip (Sample 02):",
    },
    await audioPart(sample02.A),
    {
      type: "text",
      text: "Version B — pause-coverage clip (Sample 05):",
    },
    await audioPart(sample05.B),
    {
      type: "text",
      text: "Version B — table clip (Sample 02):",
    },
    await audioPart(sample02.B),
  ];
  const body = {
    model: MODEL,
    provider: {
      allow_fallbacks: false,
      require_parameters: true,
    },
    store: false,
    stream: false,
    max_tokens: MAXIMUM_COMPLETION_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [
      piperPauseTuningTool(
        input.perspectiveId,
      ),
    ],
    tool_choice: {
      type: "function",
      function: {
        name: PIPER_PAUSE_TUNING_TOOL_NAME,
      },
    },
  };
  if (
    Object.hasOwn(body, "response_format") ||
    /\b(?:tuned|current|corrected|baseline)\b/iu.test(
      `${systemPrompt}\n${instruction}`,
    )
  ) {
    throw new Error(
      "Blind request contains private identity language",
    );
  }
  const serialized = JSON.stringify(body);
  const redactedContent = userContent.map((part) =>
    part.type === "input_audio"
      ? {
          type: "input_audio",
          input_audio: {
            data: "[OMITTED_PRIVATE_AUDIO]",
            format: "mp3",
          },
        }
      : part,
  );
  return {
    body,
    serialized,
    requestBodySha256: sha256(serialized),
    textBytes: Buffer.byteLength(
      JSON.stringify({
        systemPrompt,
        instruction,
        tool: piperPauseTuningTool(
          input.perspectiveId,
        ),
      }),
    ),
    redacted: {
      ...body,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: redactedContent },
      ],
    },
  };
}

function audioTokens(rawBody: string): number | null {
  const envelope = JSON.parse(rawBody) as unknown;
  const value = object(envelope, "response");
  const usage = object(value.usage, "usage");
  const details =
    usage.prompt_tokens_details === undefined
      ? null
      : object(
          usage.prompt_tokens_details,
          "prompt token details",
        );
  const candidate =
    details?.audio_tokens ?? usage.audio_tokens;
  return Number.isSafeInteger(candidate)
    ? Number(candidate)
    : null;
}

function responseProvider(rawBody: string): string | null {
  const envelope = JSON.parse(rawBody) as unknown;
  const value = object(envelope, "response");
  return typeof value.provider === "string"
    ? value.provider
    : null;
}

async function main(): Promise<void> {
  process.umask(0o077);
  if (
    !process.argv.includes(
      "--semantic-block-final",
    )
  ) {
    throw new Error(
      "Explicit --semantic-block-final mode is required",
    );
  }
  const [
    secretRaw,
    plan,
    blindManifest,
    runtime,
    selection,
  ] = await Promise.all([
    readFile(SECRET_PATH, "utf8"),
    readJson(
      resolve(
        RUN_DIRECTORY,
        "block-level-generation-plan.json",
      ),
    ),
    readJson(
      resolve(
        RUN_DIRECTORY,
        "blind-manifest.json",
      ),
    ),
    readJson(
      resolve(RUN_DIRECTORY, "runtime-results.json"),
    ),
    readJson(
      resolve(
        RUN_DIRECTORY,
        "selected-sentence-silence.json",
      ),
    ),
  ]);
  const secret = secretRaw.trim();
  if (
    secret.length < 20 ||
    secret.includes("\n") ||
    secret.includes("\r")
  ) {
    throw new Error("Inference secret is malformed");
  }
  if (
    selection.profileId !==
      "semantic-block-flow-v1" ||
    plan.planHash !== blindManifest.planHash ||
    plan.planHash !== runtime.planHash
  ) {
    throw new Error(
      "Selected profile or artifact hash binding failed",
    );
  }
  const rawDirectory = resolve(
    RUN_DIRECTORY,
    "raw-ai-responses",
  );
  const metadataDirectory = resolve(
    RUN_DIRECTORY,
    "final-tuning-metadata",
  );
  const redactedDirectory = resolve(
    RUN_DIRECTORY,
    "redacted-judge-requests",
  );
  await ensureNewPrivateDirectory(rawDirectory);
  await ensureNewPrivateDirectory(metadataDirectory);
  await ensureNewPrivateDirectory(redactedDirectory);
  const ledgerPath = resolve(
    RUN_DIRECTORY,
    "final-tuning-ledger.jsonl",
  );
  const ledgerHandle = await open(
    ledgerPath,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  await ledgerHandle.close();
  await chmod(ledgerPath, 0o600);

  const initialKey = await getKey(secret);
  if (
    !initialKey.active ||
    initialKey.keyKind !== "INFERENCE_CONFIRMED" ||
    initialKey.limitQuanta <= 0n ||
    initialKey.limitQuanta > MAXIMUM_COST ||
    initialKey.usageQuanta +
      initialKey.limitRemainingQuanta !==
      initialKey.limitQuanta ||
    (initialKey.expiresAt !== null &&
      Date.parse(initialKey.expiresAt) <= Date.now())
  ) {
    throw new Error(
      "OpenRouter inference-key preflight failed",
    );
  }
  const modelResponse = await fetchText({
    url: MODELS_ENDPOINT,
    method: "GET",
    secret,
    timeoutMilliseconds: 45_000,
  });
  if (!modelResponse.ok) {
    throw new Error(
      `Model catalog returned HTTP ${String(modelResponse.status)}`,
    );
  }
  const model = parsePiperPanelV2ModelCatalog(
    modelResponse.rawBody,
  );
  const executionConfiguration = {
    schemaVersion:
      "tenxpros-piper-semantic-block-final-inference-plan-v1",
    tuningPlanHash: plan.planHash,
    blindManifestSha256: await sha256File(
      resolve(
        RUN_DIRECTORY,
        "blind-manifest.json",
      ),
    ),
    provider: "OpenRouter",
    model: MODEL,
    carriedActualCostUsd:
      formatUsdQuanta(CARRIED_COST),
    maximumCumulativeCostUsd:
      formatUsdQuanta(MAXIMUM_COST),
    primaryPerspectives:
      PIPER_PAUSE_TUNING_PERSPECTIVES,
    maximumPaidPosts: MAXIMUM_PAID_POSTS,
    maximumInvalidReplacements: 1,
    forcedToolCall: true,
    responseFormatOmitted: true,
    modelCapability: {
      contextLength: model.contextLength,
      inputModalities: model.inputModalities,
      supportedParameters:
        model.supportedParameters,
      pricing: {
        promptUsdPerToken:
          model.pricing.promptUsdPerToken,
        audioUsdPerToken:
          model.pricing.audioUsdPerToken,
        completionUsdPerToken:
          model.pricing.completionUsdPerToken,
      },
      catalogSha256: model.catalogSha256,
    },
  };
  const inferencePlanHash = sha256(
    canonical(executionConfiguration),
  );
  await writeNewRestricted(
    resolve(
      metadataDirectory,
      "preflight.json",
    ),
    `${JSON.stringify(
      {
        ...executionConfiguration,
        inferencePlanHash,
        key: sanitizeKey(initialKey),
      },
      null,
      2,
    )}\n`,
  );
  await ledger(
    ledgerPath,
    String(plan.planHash),
    "PREFLIGHT_PASSED",
    {
      inferencePlanHash,
      key: sanitizeKey(initialKey),
      modelCatalogSha256: model.catalogSha256,
      responseFormatOmitted: true,
    },
  );

  const totalDuration = array(
    blindManifest.files,
    "blind files",
  )
    .map((value) =>
      Number(
        object(value, "blind file")
          .durationSeconds,
      ),
    )
    .reduce((sum, value) => sum + value, 0);

  let paidPosts = 0;
  let actualNewCost = 0n;
  let uncertainCost = 0n;
  let invalidReplacementUsed = false;
  let terminalReason: string | null = null;
  const attempts: Attempt[] = [];
  const validRuns = new Map<
    PiperPauseTuningPerspective,
    {
      perspectiveId: PiperPauseTuningPerspective;
      tunedVersion: BlindVersion;
      result: PiperPauseTuningJudgeResult;
      responseId: string | null;
      actualCostUsd: string;
      rawResponseSha256: string;
    }
  >();

  async function execute(
    perspectiveId: PiperPauseTuningPerspective,
    phase: "PRIMARY" | "REPLACEMENT",
  ): Promise<void> {
    if (
      terminalReason !== null ||
      paidPosts >= MAXIMUM_PAID_POSTS ||
      validRuns.has(perspectiveId)
    ) {
      return;
    }
    const assignment = blindAssignment(
      blindManifest,
      perspectiveId,
    );
    const built = await buildRequest({
      perspectiveId,
      assignment,
    });
    const estimate = estimateCost({
      model,
      durationSeconds: totalDuration,
      textBytes: built.textBytes,
    });
    const key = await getKey(secret);
    const locallyKnown =
      CARRIED_COST + actualNewCost;
    const providerAhead = key.usageQuanta > locallyKnown
      ? key.usageQuanta - locallyKnown
      : 0n;
    uncertainCost =
      uncertainCost > providerAhead
        ? uncertainCost
        : providerAhead;
    const projected =
      locallyKnown +
      uncertainCost +
      estimate.conservativeCostQuanta;
    if (
      !key.active ||
      key.keyKind !== "INFERENCE_CONFIRMED" ||
      key.limitQuanta <= 0n ||
      key.limitQuanta > MAXIMUM_COST ||
      key.limitRemainingQuanta <
        estimate.conservativeCostQuanta ||
      projected > MAXIMUM_COST ||
      paidPosts + 1 > MAXIMUM_PAID_POSTS
    ) {
      terminalReason =
        "PAID_REQUEST_ADMISSION_BLOCKED";
      await ledger(
        ledgerPath,
        String(plan.planHash),
        "PAID_REQUEST_ADMISSION_BLOCKED",
        {
          perspectiveId,
          phase,
          key: sanitizeKey(key),
          projectedUsd: formatUsdQuanta(projected),
          conservativeEstimateUsd:
            estimate.conservativeCostUsd,
        },
      );
      return;
    }
    const requestOrdinal = paidPosts + 1;
    const stem = `${String(requestOrdinal).padStart(2, "0")}-${perspectiveId}-${phase.toLowerCase()}`;
    await writeNewRestricted(
      resolve(
        redactedDirectory,
        `${stem}.json`,
      ),
      `${JSON.stringify(
        {
          requestBodySha256:
            built.requestBodySha256,
          redactedRequest: built.redacted,
          estimate: {
            ...estimate,
            conservativeCostQuanta:
              estimate.conservativeCostQuanta.toString(),
          },
          keyBefore: sanitizeKey(key),
        },
        null,
        2,
      )}\n`,
    );
    await ledger(
      ledgerPath,
      String(plan.planHash),
      "PAID_REQUEST_RESERVED",
      {
        requestOrdinal,
        perspectiveId,
        phase,
        requestBodySha256:
          built.requestBodySha256,
        conservativeEstimateUsd:
          estimate.conservativeCostUsd,
        projectedUsd: formatUsdQuanta(projected),
      },
    );
    paidPosts += 1;
    await ledger(
      ledgerPath,
      String(plan.planHash),
      "PAID_REQUEST_DISPATCHED",
      {
        requestOrdinal,
        perspectiveId,
        phase,
      },
    );
    let response:
      | Awaited<ReturnType<typeof fetchText>>
      | undefined;
    try {
      response = await fetchText({
        url: CHAT_ENDPOINT,
        method: "POST",
        secret,
        body: built.serialized,
        timeoutMilliseconds: 480_000,
      });
    } catch (error) {
      uncertainCost +=
        estimate.conservativeCostQuanta;
      terminalReason =
        "UNCERTAIN_PAID_TRANSPORT_RESULT";
      attempts.push({
        requestOrdinal,
        perspectiveId,
        phase,
        httpStatus: null,
        responseId: null,
        rawResponsePath: null,
        rawResponseSha256: null,
        actualCostUsd: null,
        promptTokens: null,
        completionTokens: null,
        audioTokens: null,
        provider: null,
        valid: false,
        exactError:
          error instanceof Error
            ? error.message
            : String(error),
      });
      await ledger(
        ledgerPath,
        String(plan.planHash),
        "UNCERTAIN_PAID",
        {
          requestOrdinal,
          perspectiveId,
          phase,
          reservedMaximumUsd:
            estimate.conservativeCostUsd,
          retryProhibited: true,
        },
      );
      return;
    }
    const rawPath = resolve(
      rawDirectory,
      `${stem}.http-body.txt`,
    );
    await writeNewRestricted(
      rawPath,
      response.rawBody,
    );
    const rawSha = sha256(response.rawBody);
    await ledger(
      ledgerPath,
      String(plan.planHash),
      "RAW_RESPONSE_PERSISTED_BEFORE_PARSE",
      {
        requestOrdinal,
        perspectiveId,
        phase,
        httpStatus: response.status,
        path: relative(RUN_DIRECTORY, rawPath),
        sha256: rawSha,
        bytes: Buffer.byteLength(
          response.rawBody,
        ),
      },
    );
    if (response.status === 402) {
      terminalReason =
        "HTTP_402_INSUFFICIENT_CREDIT";
      attempts.push({
        requestOrdinal,
        perspectiveId,
        phase,
        httpStatus: 402,
        responseId: null,
        rawResponsePath: relative(
          RUN_DIRECTORY,
          rawPath,
        ),
        rawResponseSha256: rawSha,
        actualCostUsd: null,
        promptTokens: null,
        completionTokens: null,
        audioTokens: null,
        provider: null,
        valid: false,
        exactError:
          "HTTP 402 fail-closed insufficient credit",
      });
      await ledger(
        ledgerPath,
        String(plan.planHash),
        "HTTP_402_FAIL_CLOSED",
        { requestOrdinal, perspectiveId },
      );
      return;
    }
    if (!response.ok) {
      uncertainCost +=
        estimate.conservativeCostQuanta;
      terminalReason = `AMBIGUOUS_HTTP_${String(response.status)}`;
      attempts.push({
        requestOrdinal,
        perspectiveId,
        phase,
        httpStatus: response.status,
        responseId: null,
        rawResponsePath: relative(
          RUN_DIRECTORY,
          rawPath,
        ),
        rawResponseSha256: rawSha,
        actualCostUsd: null,
        promptTokens: null,
        completionTokens: null,
        audioTokens: null,
        provider: null,
        valid: false,
        exactError:
          "Ambiguous potentially billed HTTP response; retry prohibited",
      });
      await ledger(
        ledgerPath,
        String(plan.planHash),
        "UNCERTAIN_PAID",
        {
          requestOrdinal,
          perspectiveId,
          httpStatus: response.status,
          reservedMaximumUsd:
            estimate.conservativeCostUsd,
          retryProhibited: true,
        },
      );
      return;
    }

    let receipt:
      | ReturnType<
          typeof parseOpenRouterChatCompletionReceipt
        >
      | undefined;
    let parsed:
      | PiperPauseTuningJudgeResult
      | undefined;
    let exactError: string | null = null;
    let provider: string | null = null;
    let observedAudioTokens: number | null = null;
    try {
      receipt =
        parseOpenRouterChatCompletionReceipt({
          rawBody: response.rawBody,
          generationHeaderId:
            response.generationHeaderId,
        });
      if (
        receipt.inlineUsageCostQuanta === null ||
        receipt.inlineUsageCostUsd === null
      ) {
        throw new Error(
          "Successful response has no authoritative usage.cost",
        );
      }
      actualNewCost +=
        receipt.inlineUsageCostQuanta;
      provider = responseProvider(response.rawBody);
      observedAudioTokens = audioTokens(
        response.rawBody,
      );
      const payload =
        parseOpenRouterPaidJudgePayload({
          rawBody: response.rawBody,
          mode: "FORCED_TOOL_CALL",
        });
      parsed =
        parsePiperPauseTuningJudgeResult(
          payload.payload,
          perspectiveId,
        );
    } catch (error) {
      exactError =
        error instanceof Error
          ? error.message
          : String(error);
      if (
        receipt?.inlineUsageCostQuanta === null ||
        receipt === undefined
      ) {
        uncertainCost +=
          estimate.conservativeCostQuanta;
        terminalReason =
          "SUCCESS_RESPONSE_COST_UNRESOLVED";
      }
    }
    const actualCostUsd =
      receipt?.inlineUsageCostUsd ?? null;
    const attempt: Attempt = {
      requestOrdinal,
      perspectiveId,
      phase,
      httpStatus: response.status,
      responseId:
        receipt?.generationId ?? null,
      rawResponsePath: relative(
        RUN_DIRECTORY,
        rawPath,
      ),
      rawResponseSha256: rawSha,
      actualCostUsd,
      promptTokens:
        receipt?.promptTokens ?? null,
      completionTokens:
        receipt?.completionTokens ?? null,
      audioTokens: observedAudioTokens,
      provider,
      valid: parsed !== undefined,
      exactError,
    };
    attempts.push(attempt);
    if (parsed && receipt?.inlineUsageCostUsd) {
      validRuns.set(perspectiveId, {
        perspectiveId,
        tunedVersion:
          assignment.semanticBlindVersion,
        result: parsed,
        responseId:
          receipt.generationId,
        actualCostUsd:
          receipt.inlineUsageCostUsd,
        rawResponseSha256: rawSha,
      });
      await ledger(
        ledgerPath,
        String(plan.planHash),
        "VALID_JUDGE_RESULT_ACCEPTED",
        attempt,
      );
    } else {
      await ledger(
        ledgerPath,
        String(plan.planHash),
        "INVALID_JUDGE_RESULT_RECORDED",
        attempt,
      );
    }
  }

  for (const perspective of PIPER_PAUSE_TUNING_PERSPECTIVES) {
    await execute(perspective, "PRIMARY");
  }
  if (terminalReason === null) {
    const invalidPerspective =
      PIPER_PAUSE_TUNING_PERSPECTIVES.find(
        (perspective) =>
          !validRuns.has(perspective),
      );
    if (
      invalidPerspective &&
      paidPosts < MAXIMUM_PAID_POSTS
    ) {
      invalidReplacementUsed = true;
      await execute(
        invalidPerspective,
        "REPLACEMENT",
      );
    }
  }
  const runs = [...validRuns.values()];
  const aggregate =
    runs.length === 3
      ? aggregatePiperSemanticBlockFinal(
          runs,
        )
      : null;
  const decision =
    aggregate?.decision ??
    "INCONCLUSIVE_AI_ONLY_EVALUATION";
  const cumulativeActual =
    CARRIED_COST + actualNewCost;
  const finalKey = await getKey(secret).catch(
    () => null,
  );
  const panel = {
    schemaVersion:
      "tenxpros-piper-semantic-block-final-panel-v1",
    tuningPlanHash: plan.planHash,
    inferencePlanHash,
    selectedProfileId:
      selection.profileId,
    status:
      runs.length === 3
        ? "COMPLETE"
        : "INCOMPLETE",
    validPerspectiveCount: runs.length,
    paidPosts,
    invalidReplacementUsed,
    terminalReason,
    attempts,
    validRuns: runs,
    aggregate,
    decision,
  };
  const costReport = {
    schemaVersion:
      "tenxpros-piper-semantic-block-final-cost-v1",
    authoritativeCostSource:
      "OpenRouter inline usage.cost",
    carriedActualCostUsd:
      formatUsdQuanta(CARRIED_COST),
    newActualCostUsd:
      formatUsdQuanta(actualNewCost),
    cumulativeActualCostUsd:
      formatUsdQuanta(cumulativeActual),
    unresolvedOrUncertainCostUsd:
      formatUsdQuanta(uncertainCost),
    maximumCumulativeCostUsd:
      formatUsdQuanta(MAXIMUM_COST),
    paidJudgeRequests: paidPosts,
    maximumPaidJudgeRequests:
      MAXIMUM_PAID_POSTS,
    withinCostCap:
      cumulativeActual + uncertainCost <=
      MAXIMUM_COST,
    finalKey:
      finalKey === null
        ? null
        : sanitizeKey(finalKey),
    attempts: attempts.map((attempt) => ({
      requestOrdinal: attempt.requestOrdinal,
      perspectiveId: attempt.perspectiveId,
      phase: attempt.phase,
      actualCostUsd: attempt.actualCostUsd,
      valid: attempt.valid,
      responseId: attempt.responseId,
    })),
  };
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "final-tuning-panel.json",
    ),
    `${JSON.stringify(panel, null, 2)}\n`,
  );
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "final-tuning-judge-results.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-piper-semantic-block-final-judge-results-v1",
        planHash: plan.planHash,
        validRuns: runs,
        attempts,
      },
      null,
      2,
    )}\n`,
  );
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "final-tuning-aggregate-analysis.json",
    ),
    `${JSON.stringify(
      aggregate ?? {
        schemaVersion:
          "tenxpros-piper-semantic-block-final-aggregate-v1",
        validPerspectiveCount: runs.length,
        decision,
      },
      null,
      2,
    )}\n`,
  );
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "final-tuning-cost-report.json",
    ),
    `${JSON.stringify(costReport, null, 2)}\n`,
  );
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "final-tuning-cost-reconciliation.json",
    ),
    `${JSON.stringify(costReport, null, 2)}\n`,
  );
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "final-tuning-decision.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-piper-semantic-block-final-decision-v1",
        planHash: plan.planHash,
        decision,
        validPerspectiveCount: runs.length,
        gates: aggregate?.gates ?? null,
      },
      null,
      2,
    )}\n`,
  );
  await ledger(
    ledgerPath,
    String(plan.planHash),
    "PANEL_EXECUTION_COMPLETED",
    {
      decision,
      paidPosts,
      validPerspectiveCount: runs.length,
      newActualCostUsd:
        formatUsdQuanta(actualNewCost),
      cumulativeActualCostUsd:
        formatUsdQuanta(cumulativeActual),
      unresolvedOrUncertainCostUsd:
        formatUsdQuanta(uncertainCost),
    },
  );
  process.stdout.write(
    `${JSON.stringify({
      decision,
      validPerspectiveCount: runs.length,
      paidPosts,
      newActualCostUsd:
        formatUsdQuanta(actualNewCost),
      cumulativeActualCostUsd:
        formatUsdQuanta(cumulativeActual),
      unresolvedOrUncertainCostUsd:
        formatUsdQuanta(uncertainCost),
    })}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
