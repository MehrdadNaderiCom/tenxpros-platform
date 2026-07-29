import { createHash } from "node:crypto";

import {
  OPENROUTER_MODEL_ID,
  OPENROUTER_PINNED_NEXT_JUDGE_ESTIMATE_QUANTA,
  checkPaidInferenceCap,
  formatUsdQuanta,
  parseUsdToQuanta,
  resolveOpenRouterInferenceCost,
  type OpenRouterGenerationMetadata,
  type OpenRouterUsdInput,
} from "./openrouter-generation-retrieval";

export const OPENROUTER_PAID_JUDGE_TOOL_NAME =
  "submit_audio_evaluation";
export const OPENROUTER_PAID_JUDGE_MAX_TOKENS = 5_000;
export const OPENROUTER_PAID_JUDGE_AUDIO_INPUTS = 10;
export const OPENROUTER_PAID_JUDGE_PERSPECTIVE_IDS =
  Object.freeze([
    "judge-01",
    "judge-02",
    "judge-03",
    "judge-04",
    "judge-05",
  ] as const);

export type OpenRouterPaidJudgePerspectiveId =
  (typeof OPENROUTER_PAID_JUDGE_PERSPECTIVE_IDS)[number];

export type OpenRouterPaidJudgeRequestMode =
  | "FORCED_TOOL_CALL"
  | "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION";

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function sha256(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function isPerspectiveId(
  value: unknown,
): value is OpenRouterPaidJudgePerspectiveId {
  return (
    typeof value === "string" &&
    (
      OPENROUTER_PAID_JUDGE_PERSPECTIVE_IDS as readonly string[]
    ).includes(value)
  );
}

function uniquePerspectiveIds(
  values: readonly OpenRouterPaidJudgePerspectiveId[],
  fieldName: string,
): readonly OpenRouterPaidJudgePerspectiveId[] {
  if (
    values.some((value) => !isPerspectiveId(value)) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(
      `${fieldName} must contain unique known perspectives`,
    );
  }
  return [...values];
}

export type OpenRouterPaidJudgeRequestIssue =
  | "WRONG_MODEL"
  | "PROVIDER_ROUTING_NOT_PINNED"
  | "STORE_MUST_BE_FALSE"
  | "STREAM_MUST_BE_FALSE"
  | "MAX_TOKENS_MUST_BE_5000"
  | "RESPONSE_FORMAT_MUST_BE_OMITTED"
  | "FORCED_TOOL_DEFINITION_INVALID"
  | "FORCED_TOOL_CHOICE_INVALID"
  | "PLAIN_FALLBACK_MUST_OMIT_TOOLS"
  | "MESSAGES_INVALID"
  | "AUDIO_INPUT_COUNT_NOT_10"
  | "AUDIO_INPUT_INVALID"
  | "PRIVATE_PIPELINE_IDENTITY_LEAK";

export interface OpenRouterPaidJudgeRequestAudit {
  valid: boolean;
  issues: readonly OpenRouterPaidJudgeRequestIssue[];
  mode: OpenRouterPaidJudgeRequestMode;
  audioInputCount: number;
  responseFormatOmitted: boolean;
  requestBodySha256: string;
}

function requestTextAndAudio(
  messages: unknown,
): {
  validMessages: boolean;
  audioParts: readonly Record<string, unknown>[];
  text: string;
} {
  if (!Array.isArray(messages) || messages.length !== 2) {
    return {
      validMessages: false,
      audioParts: [],
      text: "",
    };
  }
  const system = messages[0];
  const user = messages[1];
  if (
    !isRecord(system) ||
    system.role !== "system" ||
    typeof system.content !== "string" ||
    !isRecord(user) ||
    user.role !== "user" ||
    !Array.isArray(user.content)
  ) {
    return {
      validMessages: false,
      audioParts: [],
      text: "",
    };
  }
  const audioParts = user.content.filter(
    (part): part is Record<string, unknown> =>
      isRecord(part) && part.type === "input_audio",
  );
  const textParts = user.content
    .filter(
      (part) =>
        isRecord(part) &&
        part.type === "text" &&
        typeof part.text === "string",
    )
    .map((part) =>
      String((part as Record<string, unknown>).text),
    );
  const allPartsRecognized = user.content.every(
    (part) =>
      isRecord(part) &&
      (part.type === "text" ||
        part.type === "input_audio"),
  );
  return {
    validMessages: allPartsRecognized,
    audioParts,
    text: [system.content, ...textParts].join("\n"),
  };
}

/**
 * Audits a request without returning or logging any input_audio.data value.
 * The hash binds the in-memory request, while the returned summary is safe to
 * persist.
 */
export function auditOpenRouterPaidJudgeRequestBody(input: {
  body: unknown;
  mode: OpenRouterPaidJudgeRequestMode;
}): OpenRouterPaidJudgeRequestAudit {
  const body = input.body;
  const issues: OpenRouterPaidJudgeRequestIssue[] = [];
  if (!isRecord(body)) {
    throw new Error(
      "OpenRouter paid judge request body must be an object",
    );
  }
  if (body.model !== OPENROUTER_MODEL_ID) {
    issues.push("WRONG_MODEL");
  }
  if (
    !isRecord(body.provider) ||
    body.provider.allow_fallbacks !== false ||
    body.provider.require_parameters !== true
  ) {
    issues.push("PROVIDER_ROUTING_NOT_PINNED");
  }
  if (body.store !== false) {
    issues.push("STORE_MUST_BE_FALSE");
  }
  if (body.stream !== false) {
    issues.push("STREAM_MUST_BE_FALSE");
  }
  if (
    body.max_tokens !==
    OPENROUTER_PAID_JUDGE_MAX_TOKENS
  ) {
    issues.push("MAX_TOKENS_MUST_BE_5000");
  }
  const responseFormatOmitted = !Object.hasOwn(
    body,
    "response_format",
  );
  if (!responseFormatOmitted) {
    issues.push("RESPONSE_FORMAT_MUST_BE_OMITTED");
  }
  if (input.mode === "FORCED_TOOL_CALL") {
    const tools = body.tools;
    const tool =
      Array.isArray(tools) && tools.length === 1
        ? tools[0]
        : undefined;
    const fn =
      isRecord(tool) && isRecord(tool.function)
        ? tool.function
        : undefined;
    if (
      !isRecord(tool) ||
      tool.type !== "function" ||
      !fn ||
      fn.name !==
        OPENROUTER_PAID_JUDGE_TOOL_NAME ||
      fn.strict !== true ||
      !isRecord(fn.parameters) ||
      fn.parameters.type !== "object" ||
      fn.parameters.additionalProperties !== false
    ) {
      issues.push("FORCED_TOOL_DEFINITION_INVALID");
    }
    const choice = body.tool_choice;
    if (
      !isRecord(choice) ||
      choice.type !== "function" ||
      !isRecord(choice.function) ||
      choice.function.name !==
        OPENROUTER_PAID_JUDGE_TOOL_NAME
    ) {
      issues.push("FORCED_TOOL_CHOICE_INVALID");
    }
  } else if (
    Object.hasOwn(body, "tools") ||
    Object.hasOwn(body, "tool_choice")
  ) {
    issues.push("PLAIN_FALLBACK_MUST_OMIT_TOOLS");
  }
  const content = requestTextAndAudio(body.messages);
  if (!content.validMessages) {
    issues.push("MESSAGES_INVALID");
  }
  if (
    content.audioParts.length !==
    OPENROUTER_PAID_JUDGE_AUDIO_INPUTS
  ) {
    issues.push("AUDIO_INPUT_COUNT_NOT_10");
  }
  if (
    content.audioParts.some((part) => {
      const audio = part.input_audio;
      return (
        !isRecord(audio) ||
        audio.format !== "mp3" ||
        typeof audio.data !== "string" ||
        audio.data.length === 0
      );
    })
  ) {
    issues.push("AUDIO_INPUT_INVALID");
  }
  if (
    /\b(?:baseline|corrected|pipeline)\b/iu.test(
      content.text,
    )
  ) {
    issues.push("PRIVATE_PIPELINE_IDENTITY_LEAK");
  }
  const deduplicated = [...new Set(issues)];
  return {
    valid: deduplicated.length === 0,
    issues: deduplicated,
    mode: input.mode,
    audioInputCount: content.audioParts.length,
    responseFormatOmitted,
    requestBodySha256: sha256(JSON.stringify(body)),
  };
}

export function assertOpenRouterPaidJudgeRequestBody(input: {
  body: unknown;
  mode: OpenRouterPaidJudgeRequestMode;
}): OpenRouterPaidJudgeRequestAudit {
  const audit =
    auditOpenRouterPaidJudgeRequestBody(input);
  if (!audit.valid) {
    throw new Error(
      `OpenRouter paid judge request policy failed: ${audit.issues.join(
        ",",
      )}`,
    );
  }
  return audit;
}

function parseJsonObject(
  rawBody: string,
  description: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error(`${description} is not JSON`);
  }
  if (!isRecord(parsed)) {
    throw new Error(`${description} must be an object`);
  }
  return parsed;
}

function requireGenerationId(
  value: unknown,
  source: string,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (
    typeof value !== "string" ||
    !/^gen-[A-Za-z0-9_-]{8,}$/u.test(value)
  ) {
    throw new Error(
      `${source} is not a proven OpenRouter generation ID`,
    );
  }
  return value;
}

function usageCostLexeme(rawBody: string): string {
  const pattern =
    /"cost"\s*:\s*(?:"((?:[^"\\]|\\.)*)"|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?))/gu;
  const matches = [...rawBody.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(
      "Expected exactly one lexical usage.cost field",
    );
  }
  return matches[0][1] === undefined
    ? matches[0][2]
    : (JSON.parse(`"${matches[0][1]}"`) as string);
}

function optionalTokenCount(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === undefined) return null;
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be a nonnegative safe integer`,
    );
  }
  return value;
}

export interface OpenRouterChatCompletionReceipt {
  generationId: string | null;
  inlineUsageCostQuanta: bigint | null;
  inlineUsageCostUsd: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  rawBodySha256: string;
  rawBodyBytes: number;
}

/**
 * Parses accounting identity only. A generic x-request-id must never be
 * supplied as generationHeaderId; only x-openrouter-generation-id is valid.
 */
export function parseOpenRouterChatCompletionReceipt(input: {
  rawBody: string;
  generationHeaderId?: string | null;
}): OpenRouterChatCompletionReceipt {
  const envelope = parseJsonObject(
    input.rawBody,
    "OpenRouter chat completion response",
  );
  const bodyGenerationId = requireGenerationId(
    envelope.id,
    "response id",
  );
  const headerGenerationId = requireGenerationId(
    input.generationHeaderId,
    "x-openrouter-generation-id",
  );
  if (
    bodyGenerationId !== null &&
    headerGenerationId !== null &&
    bodyGenerationId !== headerGenerationId
  ) {
    throw new Error(
      "Body and header generation IDs conflict",
    );
  }
  let inlineUsageCostQuanta: bigint | null = null;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  if (envelope.usage !== undefined) {
    if (!isRecord(envelope.usage)) {
      throw new Error(
        "OpenRouter response usage must be an object",
      );
    }
    promptTokens = optionalTokenCount(
      envelope.usage.prompt_tokens,
      "usage.prompt_tokens",
    );
    completionTokens = optionalTokenCount(
      envelope.usage.completion_tokens,
      "usage.completion_tokens",
    );
    if (envelope.usage.cost !== undefined) {
      const lexical = parseUsdToQuanta(
        usageCostLexeme(input.rawBody),
        "usage.cost lexical value",
      );
      const semantic = parseUsdToQuanta(
        envelope.usage.cost,
        "usage.cost",
      );
      if (lexical !== semantic) {
        throw new Error(
          "usage.cost lexical and parsed values disagree",
        );
      }
      inlineUsageCostQuanta = lexical;
    }
  }
  return {
    generationId:
      bodyGenerationId ?? headerGenerationId,
    inlineUsageCostQuanta,
    inlineUsageCostUsd:
      inlineUsageCostQuanta === null
        ? null
        : formatUsdQuanta(inlineUsageCostQuanta),
    promptTokens,
    completionTokens,
    rawBodySha256: sha256(input.rawBody),
    rawBodyBytes: Buffer.byteLength(
      input.rawBody,
      "utf8",
    ),
  };
}

export interface OpenRouterPaidJudgePayload {
  mode: OpenRouterPaidJudgeRequestMode;
  payload: string;
  payloadSha256: string;
  sourcePath: string;
}

export function parseOpenRouterPaidJudgePayload(input: {
  rawBody: string;
  mode: OpenRouterPaidJudgeRequestMode;
}): OpenRouterPaidJudgePayload {
  const envelope = parseJsonObject(
    input.rawBody,
    "OpenRouter paid judge response",
  );
  if (
    !Array.isArray(envelope.choices) ||
    envelope.choices.length !== 1 ||
    !isRecord(envelope.choices[0]) ||
    !isRecord(envelope.choices[0].message)
  ) {
    throw new Error(
      "Paid judge response must contain exactly one message",
    );
  }
  const message = envelope.choices[0].message;
  let payload: string;
  let sourcePath: string;
  if (input.mode === "FORCED_TOOL_CALL") {
    if (
      message.content !== undefined &&
      message.content !== null &&
      message.content !== ""
    ) {
      throw new Error(
        "Forced tool response contains ambiguous message content",
      );
    }
    if (
      !Array.isArray(message.tool_calls) ||
      message.tool_calls.length !== 1 ||
      !isRecord(message.tool_calls[0]) ||
      message.tool_calls[0].type !== "function" ||
      !isRecord(message.tool_calls[0].function) ||
      message.tool_calls[0].function.name !==
        OPENROUTER_PAID_JUDGE_TOOL_NAME ||
      typeof message.tool_calls[0].function.arguments !==
        "string" ||
      message.tool_calls[0].function.arguments.length === 0
    ) {
      throw new Error(
        "Forced paid judge response must contain exactly one required tool call",
      );
    }
    payload =
      message.tool_calls[0].function.arguments;
    sourcePath =
      "$.choices[0].message.tool_calls[0].function.arguments";
  } else {
    if (
      message.tool_calls !== undefined &&
      (!Array.isArray(message.tool_calls) ||
        message.tool_calls.length > 0)
    ) {
      throw new Error(
        "Plain JSON fallback response unexpectedly contains tool calls",
      );
    }
    if (typeof message.content === "string") {
      payload = message.content;
      sourcePath = "$.choices[0].message.content";
    } else if (
      Array.isArray(message.content) &&
      message.content.length === 1 &&
      isRecord(message.content[0]) &&
      message.content[0].type === "text" &&
      typeof message.content[0].text === "string"
    ) {
      payload = message.content[0].text;
      sourcePath =
        "$.choices[0].message.content[0].text";
    } else {
      throw new Error(
        "Plain JSON fallback response has no single text payload",
      );
    }
    if (payload.length === 0) {
      throw new Error(
        "Plain JSON fallback payload cannot be empty",
      );
    }
  }
  return {
    mode: input.mode,
    payload,
    payloadSha256: sha256(payload),
    sourcePath,
  };
}

export type OpenRouterPaidJudgeCostResolution =
  | {
      status: "RESOLVED";
      source:
        | "usage.cost"
        | "generation.data.total_cost";
      generationId: string | null;
      costQuanta: bigint;
      costUsd: string;
    }
  | {
      status: "REQUIRES_GENERATION_METADATA";
      generationId: string;
    }
  | {
      status: "UNRESOLVED_FAIL_CLOSED";
      generationId: null;
    };

export function resolveOpenRouterPaidJudgeCost(input: {
  receipt: OpenRouterChatCompletionReceipt;
  generationMetadata?: OpenRouterGenerationMetadata | null;
}): OpenRouterPaidJudgeCostResolution {
  const resolved = resolveOpenRouterInferenceCost({
    inlineUsageCost:
      input.receipt.inlineUsageCostQuanta,
    generationId: input.receipt.generationId,
    generationMetadata: input.generationMetadata,
  });
  if (resolved.resolved) {
    return {
      status: "RESOLVED",
      source: resolved.source,
      generationId: input.receipt.generationId,
      costQuanta: resolved.costQuanta,
      costUsd: resolved.costUsd,
    };
  }
  if (
    resolved.requiresGenerationMetadata &&
    input.receipt.generationId !== null
  ) {
    return {
      status: "REQUIRES_GENERATION_METADATA",
      generationId: input.receipt.generationId,
    };
  }
  return {
    status: "UNRESOLVED_FAIL_CLOSED",
    generationId: null,
  };
}

export type OpenRouterRawResponseLifecycleStage =
  | "AWAITING_DURABLE_RAW"
  | "AWAITING_PERSISTENCE_LEDGER"
  | "READY_FOR_SEMANTIC_PARSE"
  | "SEMANTIC_PARSE_AUTHORIZED";

export interface OpenRouterRawResponseLifecycle {
  stage: OpenRouterRawResponseLifecycleStage;
  rawBodySha256: string | null;
  artifactBodySha256: string | null;
  rawBodyBytes: number | null;
  exactRawBodyStored: boolean;
  sanitizedArtifactStored: boolean;
  persistenceLedgerEntryHash: string | null;
}

export function createOpenRouterRawResponseLifecycle():
OpenRouterRawResponseLifecycle {
  return {
    stage: "AWAITING_DURABLE_RAW",
    rawBodySha256: null,
    artifactBodySha256: null,
    rawBodyBytes: null,
    exactRawBodyStored: false,
    sanitizedArtifactStored: false,
    persistenceLedgerEntryHash: null,
  };
}

function assertSha256(
  value: string,
  fieldName: string,
): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${fieldName} is not a SHA-256`);
  }
}

export function recordOpenRouterRawResponsePersisted(
  state: OpenRouterRawResponseLifecycle,
  receipt: {
    rawBodySha256: string;
    artifactBodySha256: string;
    rawBodyBytes: number;
    exactRawBodyStored: boolean;
    sanitizedArtifactStored: boolean;
  },
): OpenRouterRawResponseLifecycle {
  if (state.stage !== "AWAITING_DURABLE_RAW") {
    throw new Error(
      "Raw response persistence can be recorded only once and before parsing",
    );
  }
  assertSha256(
    receipt.rawBodySha256,
    "rawBodySha256",
  );
  assertSha256(
    receipt.artifactBodySha256,
    "artifactBodySha256",
  );
  if (
    !Number.isSafeInteger(receipt.rawBodyBytes) ||
    receipt.rawBodyBytes < 0 ||
    receipt.exactRawBodyStored ===
      receipt.sanitizedArtifactStored ||
    (receipt.exactRawBodyStored &&
      receipt.rawBodySha256 !==
        receipt.artifactBodySha256)
  ) {
    throw new Error(
      "Raw response durable-persistence receipt is invalid",
    );
  }
  return {
    ...state,
    stage: "AWAITING_PERSISTENCE_LEDGER",
    ...receipt,
  };
}

export function recordOpenRouterRawPersistenceLedgered(
  state: OpenRouterRawResponseLifecycle,
  ledgerEntryHash: string,
): OpenRouterRawResponseLifecycle {
  if (
    state.stage !== "AWAITING_PERSISTENCE_LEDGER"
  ) {
    throw new Error(
      "Raw-persistence ledger evidence must follow durable persistence",
    );
  }
  assertSha256(
    ledgerEntryHash,
    "persistence ledger entry hash",
  );
  return {
    ...state,
    stage: "READY_FOR_SEMANTIC_PARSE",
    persistenceLedgerEntryHash: ledgerEntryHash,
  };
}

export function authorizeOpenRouterSemanticParse(
  state: OpenRouterRawResponseLifecycle,
): OpenRouterRawResponseLifecycle {
  if (state.stage !== "READY_FOR_SEMANTIC_PARSE") {
    throw new Error(
      "Semantic parsing is forbidden before raw persistence and its ledger event",
    );
  }
  return {
    ...state,
    stage: "SEMANTIC_PARSE_AUTHORIZED",
  };
}

export interface OpenRouterConfirmedUnbilledToolRejection {
  classification:
    "CONFIRMED_UNBILLED_TOOL_UNSUPPORTED";
  httpStatus: 400 | 422;
  responseSha256: string;
  unbilledEvidence:
    | "INLINE_USAGE_COST_ZERO"
    | "EXPLICIT_PROVIDER_NO_CHARGE"
    | "STABLE_CURRENT_KEY_USAGE_DELTA_ZERO";
}

/**
 * The sole retry exception is deliberately narrow: raw storage and its ledger
 * event must already exist, the provider must reject tools/tool_choice at the
 * top level, and zero billing must be explicit. Tool-argument/schema errors
 * are completed inference and never qualify.
 */
export function classifyOpenRouterConfirmedUnbilledToolRejection(
  input: {
    lifecycle: OpenRouterRawResponseLifecycle;
    httpStatus: number;
    rawBody: string;
    receipt: OpenRouterChatCompletionReceipt;
    stableKeyUsageDeltaZero?: {
      beforeUsageQuanta: bigint;
      afterUsageQuanta: bigint;
      beforeRawBodySha256: string;
      afterRawBodySha256: string;
    };
  },
): OpenRouterConfirmedUnbilledToolRejection | null {
  if (
    input.lifecycle.stage !==
      "SEMANTIC_PARSE_AUTHORIZED" ||
    (input.httpStatus !== 400 &&
      input.httpStatus !== 422)
  ) {
    return null;
  }
  const explicitZero =
    input.receipt.inlineUsageCostQuanta === 0n;
  const explicitNoCharge =
    /(?:not billed|no charge|charged[^.]{0,20}(?:false|0))/iu.test(
      input.rawBody,
    );
  const keyDeltaZero =
    input.stableKeyUsageDeltaZero !== undefined &&
    input.stableKeyUsageDeltaZero
      .beforeUsageQuanta ===
      input.stableKeyUsageDeltaZero
        .afterUsageQuanta &&
    /^[a-f0-9]{64}$/u.test(
      input.stableKeyUsageDeltaZero
        .beforeRawBodySha256,
    ) &&
    /^[a-f0-9]{64}$/u.test(
      input.stableKeyUsageDeltaZero
        .afterRawBodySha256,
    );
  const conflictingPositiveBilling =
    (input.receipt.inlineUsageCostQuanta !== null &&
      input.receipt.inlineUsageCostQuanta > 0n) ||
    (input.stableKeyUsageDeltaZero !== undefined &&
      input.stableKeyUsageDeltaZero
        .afterUsageQuanta >
        input.stableKeyUsageDeltaZero
          .beforeUsageQuanta);
  const unsupported =
    /(?:unsupported|not supported|does not support|unknown parameter|invalid parameter)/iu.test(
      input.rawBody,
    ) &&
    (/"param"\s*:\s*"(?:tools|tool_choice)"/iu.test(
      input.rawBody,
    ) ||
      /(?:unsupported|unknown|invalid)\s+(?:top-level\s+)?(?:parameter\s+)?['"]?(?:tools|tool_choice)['"]?/iu.test(
        input.rawBody,
      ));
  const completedInferenceError =
    /(?:tools?\[[^\]]+\]\.function\.(?:parameters|arguments)|schema validation|invalid tool arguments)/iu.test(
      input.rawBody,
    );
  if (
    (!explicitZero &&
      !explicitNoCharge &&
      !keyDeltaZero) ||
    conflictingPositiveBilling ||
    !unsupported ||
    completedInferenceError
  ) {
    return null;
  }
  if (
    input.receipt.rawBodySha256 !==
    sha256(input.rawBody)
  ) {
    throw new Error(
      "Unbilled tool-rejection evidence does not match the persisted response receipt",
    );
  }
  return {
    classification:
      "CONFIRMED_UNBILLED_TOOL_UNSUPPORTED",
    httpStatus: input.httpStatus,
    responseSha256:
      input.receipt.rawBodySha256,
    unbilledEvidence: explicitZero
      ? "INLINE_USAGE_COST_ZERO"
      : explicitNoCharge
        ? "EXPLICIT_PROVIDER_NO_CHARGE"
        : "STABLE_CURRENT_KEY_USAGE_DELTA_ZERO",
  };
}

export type OpenRouterPaidJudgeTerminalReason =
  | "HTTP_402_INSUFFICIENT_CREDIT"
  | "CONFIRMED_UNBILLED_NON_TOOL_FAILURE_NO_RETRY";

export interface OpenRouterPaidJudgeExecutorState {
  existingValidPerspectiveIds:
    readonly OpenRouterPaidJudgePerspectiveId[];
  validNewPerspectiveIds:
    readonly OpenRouterPaidJudgePerspectiveId[];
  attemptedPaidPerspectiveIds:
    readonly OpenRouterPaidJudgePerspectiveId[];
  paidJudgePostsUsed: number;
  knownNewActualCostQuanta: bigint;
  formatMode: OpenRouterPaidJudgeRequestMode;
  confirmedUnbilledToolRejectionUsed: boolean;
  fallbackPerspectiveId:
    | OpenRouterPaidJudgePerspectiveId
    | null;
  pending:
    | {
        perspectiveId:
          OpenRouterPaidJudgePerspectiveId;
        mode: OpenRouterPaidJudgeRequestMode;
        paidAttemptOrdinal: number;
      }
    | null;
  costReconciliationRequired: boolean;
  terminalReason:
    | OpenRouterPaidJudgeTerminalReason
    | null;
}

function assertOpenRouterPaidJudgeExecutorState(
  state: OpenRouterPaidJudgeExecutorState,
): void {
  const existing = uniquePerspectiveIds(
    state.existingValidPerspectiveIds,
    "existing valid perspectives",
  );
  const validNew = uniquePerspectiveIds(
    state.validNewPerspectiveIds,
    "new valid perspectives",
  );
  const attempted = uniquePerspectiveIds(
    state.attemptedPaidPerspectiveIds,
    "paid attempted perspectives",
  );
  if (
    existing.some((item) => validNew.includes(item)) ||
    validNew.some((item) => !attempted.includes(item)) ||
    state.paidJudgePostsUsed !== attempted.length ||
    state.paidJudgePostsUsed < 0 ||
    state.paidJudgePostsUsed > 5 ||
    state.knownNewActualCostQuanta < 0n
  ) {
    throw new Error(
      "OpenRouter paid judge executor state invariants failed",
    );
  }
  if (
    state.pending !== null &&
    (!isPerspectiveId(state.pending.perspectiveId) ||
      attempted.includes(state.pending.perspectiveId) ||
      existing.includes(state.pending.perspectiveId) ||
      validNew.includes(state.pending.perspectiveId) ||
      state.pending.mode !== state.formatMode ||
      state.pending.paidAttemptOrdinal !==
        state.paidJudgePostsUsed + 1)
  ) {
    throw new Error(
      "Pending OpenRouter judge request violates one-primary-per-perspective policy",
    );
  }
  if (
    state.fallbackPerspectiveId !== null &&
    (!state.confirmedUnbilledToolRejectionUsed ||
      state.formatMode !==
        "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION" ||
      attempted.includes(state.fallbackPerspectiveId) ||
      existing.includes(state.fallbackPerspectiveId) ||
      validNew.includes(state.fallbackPerspectiveId))
  ) {
    throw new Error(
      "Plain JSON fallback is not bound to one confirmed-unbilled forced-tool rejection",
    );
  }
  if (
    (state.formatMode ===
      "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION") !==
    state.confirmedUnbilledToolRejectionUsed
  ) {
    throw new Error(
      "Plain JSON mode and confirmed-unbilled tool evidence must agree",
    );
  }
}

export function createOpenRouterPaidJudgeExecutorState(input: {
  existingValidPerspectiveIds:
    readonly OpenRouterPaidJudgePerspectiveId[];
}): OpenRouterPaidJudgeExecutorState {
  return {
    existingValidPerspectiveIds:
      uniquePerspectiveIds(
        input.existingValidPerspectiveIds,
        "existing valid perspectives",
      ),
    validNewPerspectiveIds: [],
    attemptedPaidPerspectiveIds: [],
    paidJudgePostsUsed: 0,
    knownNewActualCostQuanta: 0n,
    formatMode: "FORCED_TOOL_CALL",
    confirmedUnbilledToolRejectionUsed: false,
    fallbackPerspectiveId: null,
    pending: null,
    costReconciliationRequired: false,
    terminalReason: null,
  };
}

export interface OpenRouterPaidJudgeRequestPlan {
  perspectiveId: OpenRouterPaidJudgePerspectiveId;
  mode: OpenRouterPaidJudgeRequestMode;
  paidAttemptOrdinal: number;
  isFallbackAfterConfirmedUnbilledToolRejection: boolean;
  admissionProjectedCostQuanta: bigint;
  admissionNextCostQuanta: bigint;
}

export type OpenRouterPaidJudgePlanResult =
  | {
      status: "PLANNED";
      state: OpenRouterPaidJudgeExecutorState;
      request: OpenRouterPaidJudgeRequestPlan;
    }
  | {
      status: "NO_REQUEST";
      state: OpenRouterPaidJudgeExecutorState;
      reason:
        | "PANEL_ALREADY_COMPLETE"
        | "ALL_PERSPECTIVES_ATTEMPTED"
        | "COST_RECONCILIATION_REQUIRED"
        | "TERMINAL"
        | "CAP_BLOCKED";
      capReason?: string;
    };

export function planNextOpenRouterPaidJudgeRequest(input: {
  state: OpenRouterPaidJudgeExecutorState;
  reconciledActualCost: OpenRouterUsdInput;
  maximumUncertainCost?: OpenRouterUsdInput;
  estimatedNextRequestCost?: OpenRouterUsdInput;
  costEvidenceStable: boolean;
}): OpenRouterPaidJudgePlanResult {
  const state = input.state;
  assertOpenRouterPaidJudgeExecutorState(state);
  if (state.pending !== null) {
    throw new Error(
      "A paid judge request is already pending",
    );
  }
  if (state.terminalReason !== null) {
    return {
      status: "NO_REQUEST",
      state,
      reason: "TERMINAL",
    };
  }
  if (state.costReconciliationRequired) {
    return {
      status: "NO_REQUEST",
      state,
      reason: "COST_RECONCILIATION_REQUIRED",
    };
  }
  const valid = new Set([
    ...state.existingValidPerspectiveIds,
    ...state.validNewPerspectiveIds,
  ]);
  const attempted = new Set(
    state.attemptedPaidPerspectiveIds,
  );
  const perspectiveId =
    state.fallbackPerspectiveId ??
    OPENROUTER_PAID_JUDGE_PERSPECTIVE_IDS.find(
      (candidate) =>
        !valid.has(candidate) &&
        !attempted.has(candidate),
    );
  if (perspectiveId === undefined) {
    return {
      status: "NO_REQUEST",
      state,
      reason:
        valid.size === 5
          ? "PANEL_ALREADY_COMPLETE"
          : "ALL_PERSPECTIVES_ATTEMPTED",
    };
  }
  /*
   * The caller supplies the reconciled pre-executor baseline. Every known
   * settlement accumulated by this state is added internally, so a caller
   * cannot accidentally reuse the baseline and undercount later admission.
   * If a caller supplies an already-inclusive amount, double counting is
   * conservative and still fail-closed.
   */
  const cumulativeKnownActualQuanta =
    parseUsdToQuanta(
      input.reconciledActualCost,
      "paid executor reconciled baseline cost",
    ) + state.knownNewActualCostQuanta;
  const gate = checkPaidInferenceCap({
    paidJudgePostsUsed: state.paidJudgePostsUsed,
    reconciledActualCost:
      cumulativeKnownActualQuanta,
    unresolvedActualUsageDelta: "0",
    maximumUncertainCost:
      input.maximumUncertainCost ?? "0",
    estimatedNextRequestCost:
      input.estimatedNextRequestCost ??
      OPENROUTER_PINNED_NEXT_JUDGE_ESTIMATE_QUANTA,
    costEvidenceStable: input.costEvidenceStable,
  });
  if (
    !gate.allowed ||
    gate.projectedCostQuanta === null ||
    gate.effectiveNextRequestCostQuanta === null
  ) {
    return {
      status: "NO_REQUEST",
      state,
      reason: "CAP_BLOCKED",
      capReason: gate.reason ?? "UNKNOWN_CAP_FAILURE",
    };
  }
  const pending = {
    perspectiveId,
    mode: state.formatMode,
    paidAttemptOrdinal:
      state.paidJudgePostsUsed + 1,
  } as const;
  return {
    status: "PLANNED",
    state: {
      ...state,
      pending,
    },
    request: {
      ...pending,
      isFallbackAfterConfirmedUnbilledToolRejection:
        state.fallbackPerspectiveId === perspectiveId,
      admissionProjectedCostQuanta:
        gate.projectedCostQuanta,
      admissionNextCostQuanta:
        gate.effectiveNextRequestCostQuanta,
    },
  };
}

export type OpenRouterPaidJudgeSettlement =
  | {
      kind: "CONFIRMED_UNBILLED_TOOL_UNSUPPORTED";
      evidence:
        OpenRouterConfirmedUnbilledToolRejection;
    }
  | {
      kind: "VALID_PAID";
      actualCostQuanta: bigint;
    }
  | {
      kind: "INVALID_PAID";
      actualCostQuanta: bigint;
    }
  | {
      kind: "UNCERTAIN_POSSIBLY_PAID";
    }
  | {
      kind: "HTTP_402";
      actualCostQuanta?: bigint;
    }
  | {
      kind: "CONFIRMED_UNBILLED_NON_TOOL_FAILURE";
    };

function assertCostQuanta(
  value: bigint,
): void {
  if (value < 0n) {
    throw new Error(
      "Settled actual cost cannot be negative",
    );
  }
}

/**
 * A paid or ambiguous response permanently consumes that perspective's one
 * allowed primary. Only a confirmed-unbilled forced-tool capability rejection
 * may schedule the same perspective again, in global plain-JSON mode.
 */
export function settleOpenRouterPaidJudgeRequest(input: {
  state: OpenRouterPaidJudgeExecutorState;
  settlement: OpenRouterPaidJudgeSettlement;
}): OpenRouterPaidJudgeExecutorState {
  const { state, settlement } = input;
  assertOpenRouterPaidJudgeExecutorState(state);
  const pending = state.pending;
  if (!pending) {
    throw new Error(
      "Cannot settle without a pending judge request",
    );
  }
  if (
    settlement.kind ===
    "CONFIRMED_UNBILLED_TOOL_UNSUPPORTED"
  ) {
    if (
      pending.mode !== "FORCED_TOOL_CALL" ||
      state.confirmedUnbilledToolRejectionUsed ||
      settlement.evidence.classification !==
        "CONFIRMED_UNBILLED_TOOL_UNSUPPORTED" ||
      ![400, 422].includes(
        settlement.evidence.httpStatus,
      ) ||
      !/^[a-f0-9]{64}$/u.test(
        settlement.evidence.responseSha256,
      )
    ) {
      throw new Error(
        "Only one forced-tool rejection may authorize the unbilled fallback",
      );
    }
    return {
      ...state,
      formatMode:
        "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
      confirmedUnbilledToolRejectionUsed: true,
      fallbackPerspectiveId:
        pending.perspectiveId,
      pending: null,
    };
  }
  if (
    settlement.kind ===
    "CONFIRMED_UNBILLED_NON_TOOL_FAILURE"
  ) {
    return {
      ...state,
      pending: null,
      terminalReason:
        "CONFIRMED_UNBILLED_NON_TOOL_FAILURE_NO_RETRY",
    };
  }
  const attempted = [
    ...state.attemptedPaidPerspectiveIds,
    pending.perspectiveId,
  ];
  if (
    new Set(attempted).size !== attempted.length ||
    state.paidJudgePostsUsed + 1 > 5
  ) {
    throw new Error(
      "A perspective cannot receive a paid retry and paid judge posts cannot exceed five",
    );
  }
  if (
    settlement.kind === "UNCERTAIN_POSSIBLY_PAID"
  ) {
    return {
      ...state,
      attemptedPaidPerspectiveIds: attempted,
      paidJudgePostsUsed:
        state.paidJudgePostsUsed + 1,
      fallbackPerspectiveId: null,
      pending: null,
      costReconciliationRequired: true,
    };
  }
  const actualCost =
    settlement.actualCostQuanta ?? 0n;
  assertCostQuanta(actualCost);
  const paidJudgePostsUsed =
    state.paidJudgePostsUsed + 1;
  const knownNewActualCostQuanta =
    state.knownNewActualCostQuanta + actualCost;
  if (settlement.kind === "HTTP_402") {
    return {
      ...state,
      attemptedPaidPerspectiveIds: attempted,
      paidJudgePostsUsed,
      knownNewActualCostQuanta,
      fallbackPerspectiveId: null,
      pending: null,
      terminalReason:
        "HTTP_402_INSUFFICIENT_CREDIT",
    };
  }
  return {
    ...state,
    attemptedPaidPerspectiveIds: attempted,
    validNewPerspectiveIds:
      settlement.kind === "VALID_PAID"
        ? [
            ...state.validNewPerspectiveIds,
            pending.perspectiveId,
          ]
        : state.validNewPerspectiveIds,
    paidJudgePostsUsed,
    knownNewActualCostQuanta,
    fallbackPerspectiveId: null,
    pending: null,
  };
}

export function resumeOpenRouterPaidJudgeAfterCostReconciliation(
  state: OpenRouterPaidJudgeExecutorState,
): OpenRouterPaidJudgeExecutorState {
  assertOpenRouterPaidJudgeExecutorState(state);
  if (
    !state.costReconciliationRequired ||
    state.pending !== null ||
    state.terminalReason !== null
  ) {
    throw new Error(
      "Executor is not paused solely for cost reconciliation",
    );
  }
  return {
    ...state,
    costReconciliationRequired: false,
  };
}

export interface OpenRouterPartialPanelStatus {
  status: "COMPLETE" | "PARTIAL";
  decision:
    | "READY_FOR_PRIVATE_AGGREGATION"
    | "INCONCLUSIVE_AI_ONLY_EVALUATION";
  validIndependentJudgeCount: number;
  validPerspectiveIds:
    readonly OpenRouterPaidJudgePerspectiveId[];
  invalidPaidPerspectiveIds:
    readonly OpenRouterPaidJudgePerspectiveId[];
  unattemptedPerspectiveIds:
    readonly OpenRouterPaidJudgePerspectiveId[];
  paidJudgePostsUsed: number;
  knownNewActualCostQuanta: bigint;
  knownNewActualCostUsd: string;
  costReconciliationRequired: boolean;
  terminalReason:
    | OpenRouterPaidJudgeTerminalReason
    | null;
}

/**
 * Partial status intentionally contains no perceptual scores or private A/B
 * mapping. Fewer than five valid perspectives is always inconclusive.
 */
export function buildOpenRouterPartialPanelStatus(
  state: OpenRouterPaidJudgeExecutorState,
): OpenRouterPartialPanelStatus {
  assertOpenRouterPaidJudgeExecutorState(state);
  if (state.pending !== null) {
    throw new Error(
      "Cannot finalize partial panel status while a request is pending",
    );
  }
  const validPerspectiveIds =
    OPENROUTER_PAID_JUDGE_PERSPECTIVE_IDS.filter(
      (perspectiveId) =>
        state.existingValidPerspectiveIds.includes(
          perspectiveId,
        ) ||
        state.validNewPerspectiveIds.includes(
          perspectiveId,
        ),
    );
  const invalidPaidPerspectiveIds =
    state.attemptedPaidPerspectiveIds.filter(
      (perspectiveId) =>
        !state.validNewPerspectiveIds.includes(
          perspectiveId,
        ),
    );
  const attempted = new Set(
    state.attemptedPaidPerspectiveIds,
  );
  const unattemptedPerspectiveIds =
    OPENROUTER_PAID_JUDGE_PERSPECTIVE_IDS.filter(
      (perspectiveId) =>
        !validPerspectiveIds.includes(perspectiveId) &&
        !attempted.has(perspectiveId),
    );
  const complete = validPerspectiveIds.length === 5;
  return {
    status: complete ? "COMPLETE" : "PARTIAL",
    decision: complete
      ? "READY_FOR_PRIVATE_AGGREGATION"
      : "INCONCLUSIVE_AI_ONLY_EVALUATION",
    validIndependentJudgeCount:
      validPerspectiveIds.length,
    validPerspectiveIds,
    invalidPaidPerspectiveIds,
    unattemptedPerspectiveIds,
    paidJudgePostsUsed: state.paidJudgePostsUsed,
    knownNewActualCostQuanta:
      state.knownNewActualCostQuanta,
    knownNewActualCostUsd: formatUsdQuanta(
      state.knownNewActualCostQuanta,
    ),
    costReconciliationRequired:
      state.costReconciliationRequired,
    terminalReason: state.terminalReason,
  };
}
