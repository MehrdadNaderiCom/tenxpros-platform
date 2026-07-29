import { createHash } from "node:crypto";

export const OPENROUTER_USD_QUANTA_PER_DOLLAR =
  100_000_000n;
export const OPENROUTER_RECONCILIATION_TOLERANCE_QUANTA =
  1n;
export const OPENROUTER_MAXIMUM_SPEND_QUANTA =
  1_000_000_000n;
export const OPENROUTER_MAXIMUM_METADATA_GETS = 40;
export const OPENROUTER_MAXIMUM_NEW_PAID_JUDGE_POSTS = 5;
export const OPENROUTER_MAXIMUM_PLAUSIBLE_UNEXPLAINED_QUANTA =
  414_600_000n;
export const OPENROUTER_HISTORICAL_TOOL_NAME =
  "submit_blind_audio_evaluation";
export const OPENROUTER_MODEL_ID = "openai/gpt-audio";

export type OpenRouterUsdInput = string | number | bigint;
const OPENROUTER_MAXIMUM_NUMERIC_NOISE_DECIMAL_PLACES =
  15;

export interface OpenRouterUsdNumericCanonicalization {
  field: string;
  originalNumericLexeme: string;
  canonicalUsd: string;
  absoluteAdjustmentUsd: string;
  maximumAcceptedAdjustmentUsd: "0.000000000000001";
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

function sha256(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

/**
 * Parses USD without binary floating-point arithmetic. One quantum is
 * USD 0.00000001. Scientific notation, signs, whitespace, leading zeroes,
 * and precision beyond eight decimal places are deliberately rejected.
 */
function formatDecimalFraction(
  numerator: bigint,
  decimalPlaces: number,
): string {
  if (numerator < 0n || decimalPlaces < 0) {
    throw new Error(
      "Decimal fraction formatter requires nonnegative inputs",
    );
  }
  const digits = numerator
    .toString()
    .padStart(decimalPlaces + 1, "0");
  const whole =
    digits.slice(0, -decimalPlaces) || "0";
  if (decimalPlaces === 0) return whole;
  return `${whole}.${digits.slice(-decimalPlaces)}`;
}

function parseNumericUsdLexemeToQuanta(input: {
  source: string;
  fieldName: string;
}): {
  quanta: bigint;
  canonicalization:
    | OpenRouterUsdNumericCanonicalization
    | null;
} {
  const match =
    /^(0|[1-9]\d*)(?:\.(\d+))?$/u.exec(
      input.source,
    );
  if (!match) {
    throw new Error(
      `${input.fieldName} numeric input must be a plain unsigned finite decimal`,
    );
  }
  const whole = match[1]!;
  const fraction = match[2] ?? "";
  if (fraction.length <= 8) {
    return {
      quanta:
        BigInt(whole) *
          OPENROUTER_USD_QUANTA_PER_DOLLAR +
        BigInt(fraction.padEnd(8, "0")),
      canonicalization: null,
    };
  }
  const retained = fraction.slice(0, 8);
  const discarded = fraction.slice(8);
  let roundedQuanta =
    BigInt(whole) *
      OPENROUTER_USD_QUANTA_PER_DOLLAR +
    BigInt(retained);
  if (discarded[0]! >= "5") {
    roundedQuanta += 1n;
  }
  const scale =
    10n ** BigInt(fraction.length);
  const exactScaled =
    BigInt(`${whole}${fraction}`);
  const roundedScaled =
    roundedQuanta *
    (10n **
      BigInt(fraction.length - 8));
  const adjustmentScaled =
    exactScaled >= roundedScaled
      ? exactScaled - roundedScaled
      : roundedScaled - exactScaled;
  const maximumAdjustmentScaled =
    fraction.length >=
    OPENROUTER_MAXIMUM_NUMERIC_NOISE_DECIMAL_PLACES
      ? 10n **
        BigInt(
          fraction.length -
            OPENROUTER_MAXIMUM_NUMERIC_NOISE_DECIMAL_PLACES,
        )
      : 0n;
  if (
    adjustmentScaled > maximumAdjustmentScaled
  ) {
    throw new Error(
      `${input.fieldName} numeric precision exceeds the maximum IEEE-754 noise adjustment of USD 0.000000000000001`,
    );
  }
  if (scale <= 0n) {
    throw new Error(
      `${input.fieldName} numeric decimal scale is invalid`,
    );
  }
  return {
    quanta: roundedQuanta,
    canonicalization: {
      field: input.fieldName,
      originalNumericLexeme: input.source,
      canonicalUsd:
        formatUsdQuanta(roundedQuanta),
      absoluteAdjustmentUsd:
        formatDecimalFraction(
          adjustmentScaled,
          fraction.length,
        ),
      maximumAcceptedAdjustmentUsd:
        "0.000000000000001",
    },
  };
}

export function parseUsdToQuanta(
  value: unknown,
  fieldName = "USD value",
): bigint {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new Error(`${fieldName} cannot be negative`);
    }
    return value;
  }
  if (
    typeof value === "number" &&
    (!Number.isFinite(value) ||
      value < 0 ||
      Object.is(value, -0))
  ) {
    throw new Error(`${fieldName} must be finite and nonnegative`);
  }
  if (
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    throw new Error(
      `${fieldName} must be a number, decimal string, or quanta bigint`,
    );
  }
  if (typeof value === "number") {
    return parseNumericUsdLexemeToQuanta({
      source: String(value),
      fieldName,
    }).quanta;
  }
  const source = value;
  if (
    source.length === 0 ||
    source !== source.trim() ||
    !/^(?:0|[1-9]\d*)(?:\.(\d{1,8}))?$/u.test(source)
  ) {
    throw new Error(
      `${fieldName} must be a plain nonnegative decimal with at most eight fractional digits`,
    );
  }
  const [whole, fraction = ""] = source.split(".");
  return (
    BigInt(whole) * OPENROUTER_USD_QUANTA_PER_DOLLAR +
    BigInt(fraction.padEnd(8, "0"))
  );
}

export function formatUsdQuanta(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole =
    absolute / OPENROUTER_USD_QUANTA_PER_DOLLAR;
  const fraction = (
    absolute % OPENROUTER_USD_QUANTA_PER_DOLLAR
  )
    .toString()
    .padStart(8, "0");
  return `${negative ? "-" : ""}${String(
    whole,
  )}.${fraction}`;
}

function absolute(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function parseJsonEnvelope(
  rawBody: string,
  endpoint: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error(`${endpoint} response is not JSON`);
  }
  if (!isRecord(parsed)) {
    throw new Error(`${endpoint} response must be an object`);
  }
  return parsed;
}

function requiredDataObject(
  envelope: Record<string, unknown>,
  endpoint: string,
): Record<string, unknown> {
  if (!isRecord(envelope.data)) {
    throw new Error(`${endpoint} response data must be an object`);
  }
  return envelope.data;
}

function usdFieldLexeme(
  rawBody: string,
  fieldName: string,
): {
  source: string;
  quoted: boolean;
} {
  const escapedName = fieldName.replace(
    /[.*+?^${}()|[\]\\]/gu,
    "\\$&",
  );
  const pattern = new RegExp(
    `"${escapedName}"\\s*:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|(-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?))`,
    "gu",
  );
  const matches = [...rawBody.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one lexical ${fieldName} field`,
    );
  }
  if (matches[0][1] !== undefined) {
    return {
      source: JSON.parse(
        `"${matches[0][1]}"`,
      ) as string,
      quoted: true,
    };
  }
  return {
    source: matches[0][2]!,
    quoted: false,
  };
}

function parseUsdField(
  rawBody: string,
  fieldName: string,
  semanticValue: unknown,
): bigint {
  const lexeme = usdFieldLexeme(
    rawBody,
    fieldName,
  );
  const lexical = parseUsdToQuanta(
    lexeme.source,
    fieldName,
  );
  const semantic = parseUsdToQuanta(
    semanticValue,
    fieldName,
  );
  if (lexical !== semantic) {
    throw new Error(
      `${fieldName} lexical and parsed values disagree`,
    );
  }
  return lexical;
}

function parseKeyUsdField(
  rawBody: string,
  fieldName: string,
  semanticValue: unknown,
): {
  quanta: bigint;
  canonicalization:
    | OpenRouterUsdNumericCanonicalization
    | null;
} {
  const lexeme = usdFieldLexeme(
    rawBody,
    fieldName,
  );
  const lexical = lexeme.quoted
    ? {
        quanta: parseUsdToQuanta(
          lexeme.source,
          fieldName,
        ),
        canonicalization: null,
      }
    : parseNumericUsdLexemeToQuanta({
        source: lexeme.source,
        fieldName,
      });
  const semantic = parseUsdToQuanta(
    semanticValue,
    fieldName,
  );
  if (lexical.quanta !== semantic) {
    throw new Error(
      `${fieldName} lexical and parsed values disagree`,
    );
  }
  return lexical;
}

function requireExpectedGenerationId(
  envelope: Record<string, unknown>,
  data: Record<string, unknown>,
  expectedGenerationId: string,
  endpoint: string,
): void {
  const ids = [data.id, envelope.id].filter(
    (value): value is string => typeof value === "string",
  );
  if (
    ids.some((id) => id !== expectedGenerationId) ||
    new Set(ids).size > 1
  ) {
    throw new Error(
      `${endpoint} response generation ID does not match the requested ID`,
    );
  }
  for (const candidate of [data.id, envelope.id]) {
    if (
      candidate !== undefined &&
      typeof candidate !== "string"
    ) {
      throw new Error(
        `${endpoint} response generation ID is malformed`,
      );
    }
  }
}

interface CompletionCandidate {
  value: string;
  sourcePath: string;
  toolName: string | null;
}

function pushDirectContentCandidate(
  container: Record<string, unknown>,
  path: string,
  candidates: CompletionCandidate[],
): void {
  if (
    container.content === undefined ||
    container.content === null
  ) {
    return;
  }
  if (typeof container.content !== "string") {
    throw new Error(
      `Generation content at ${path}.content must be a string`,
    );
  }
  candidates.push({
    value: container.content,
    sourcePath: `${path}.content`,
    toolName: null,
  });
}

function pushToolCallCandidate(
  container: Record<string, unknown>,
  path: string,
  candidates: CompletionCandidate[],
): void {
  if (container.tool_calls === undefined) return;
  if (
    !Array.isArray(container.tool_calls) ||
    container.tool_calls.length !== 1 ||
    !isRecord(container.tool_calls[0]) ||
    container.tool_calls[0].type !== "function" ||
    !isRecord(container.tool_calls[0].function) ||
    container.tool_calls[0].function.name !==
      OPENROUTER_HISTORICAL_TOOL_NAME ||
    typeof container.tool_calls[0].function.arguments !==
      "string"
  ) {
    throw new Error(
      `Generation tool call at ${path}.tool_calls must contain exactly one complete function call`,
    );
  }
  candidates.push({
    value: container.tool_calls[0].function.arguments,
    sourcePath: `${path}.tool_calls[0].function.arguments`,
    toolName: container.tool_calls[0].function.name,
  });
}

function pushChoiceCandidate(
  container: Record<string, unknown>,
  path: string,
  candidates: CompletionCandidate[],
): void {
  if (container.choices === undefined) return;
  if (
    !Array.isArray(container.choices) ||
    container.choices.length !== 1 ||
    !isRecord(container.choices[0]) ||
    !isRecord(container.choices[0].message)
  ) {
    throw new Error(
      `Generation choices at ${path}.choices must contain exactly one message`,
    );
  }
  const message = container.choices[0].message;
  pushDirectContentCandidate(
    message,
    `${path}.choices[0].message`,
    candidates,
  );
  pushToolCallCandidate(
    message,
    `${path}.choices[0].message`,
    candidates,
  );
}

export interface OpenRouterGenerationContent {
  generationId: string;
  completion: string;
  completionSha256: string;
  sourcePath: string;
  toolName: string | null;
}

/**
 * Extracts only explicitly allowlisted OpenRouter completion paths. It never
 * recursively searches provider payloads, so prompt/request strings cannot be
 * mistaken for the completion. Multiple candidate paths are rejected even
 * when they happen to contain the same text.
 */
export function parseOpenRouterGenerationContent(
  rawBody: string,
  expectedGenerationId: string,
): OpenRouterGenerationContent {
  const endpoint = "/api/v1/generation/content";
  const envelope = parseJsonEnvelope(rawBody, endpoint);
  if (
    envelope.data !== undefined &&
    !isRecord(envelope.data)
  ) {
    throw new Error(
      `${endpoint} response data must be an object when present`,
    );
  }
  const data = isRecord(envelope.data)
    ? envelope.data
    : {};
  requireExpectedGenerationId(
    envelope,
    data,
    expectedGenerationId,
    endpoint,
  );
  const candidates: CompletionCandidate[] = [];
  pushDirectContentCandidate(data, "$.data", candidates);
  pushToolCallCandidate(data, "$.data", candidates);
  pushChoiceCandidate(data, "$.data", candidates);
  pushDirectContentCandidate(envelope, "$", candidates);
  pushToolCallCandidate(envelope, "$", candidates);
  pushChoiceCandidate(envelope, "$", candidates);
  if (candidates.length !== 1) {
    throw new Error(
      candidates.length === 0
        ? "Generation content response has no allowlisted completion"
        : "Generation content response is ambiguous",
    );
  }
  const candidate = candidates[0];
  if (candidate.value.length === 0) {
    throw new Error("Generation completion cannot be empty");
  }
  return {
    generationId: expectedGenerationId,
    completion: candidate.value,
    completionSha256: sha256(candidate.value),
    sourcePath: candidate.sourcePath,
    toolName: candidate.toolName,
  };
}

function parseNonnegativeInteger(
  value: unknown,
  fieldName: string,
): number {
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

function selectTokenField(
  data: Record<string, unknown>,
  primary: string,
  fallback: string,
): { value: number; sourceField: string } {
  const primaryValue = data[primary];
  const fallbackValue = data[fallback];
  if (primaryValue !== undefined) {
    const value = parseNonnegativeInteger(
      primaryValue,
      `generation metadata data.${primary}`,
    );
    if (fallbackValue !== undefined) {
      parseNonnegativeInteger(
        fallbackValue,
        `generation metadata data.${fallback}`,
      );
    }
    return { value, sourceField: primary };
  }
  return {
    value: parseNonnegativeInteger(
      fallbackValue,
      `generation metadata data.${fallback}`,
    ),
    sourceField: fallback,
  };
}

function selectRequiredString(
  data: Record<string, unknown>,
  fields: readonly string[],
  description: string,
  rejectConflictingAliases = true,
): { value: string; sourceField: string } {
  for (const field of fields) {
    const candidate = data[field];
    if (candidate === undefined) continue;
    if (
      typeof candidate !== "string" ||
      candidate.trim().length === 0
    ) {
      throw new Error(
        `generation metadata ${description} is malformed`,
      );
    }
    for (const alternate of fields) {
      const alternateValue = data[alternate];
      if (
        alternateValue !== undefined &&
        typeof alternateValue !== "string"
      ) {
        throw new Error(
          `generation metadata ${description} is malformed`,
        );
      }
      if (
        rejectConflictingAliases &&
        alternateValue !== undefined &&
        alternateValue !== candidate
      ) {
        throw new Error(
          `generation metadata ${description} aliases conflict`,
        );
      }
    }
    return {
      value: candidate,
      sourceField: field,
    };
  }
  throw new Error(
    `generation metadata ${description} is missing`,
  );
}

export interface OpenRouterGenerationMetadata {
  generationId: string;
  totalCostQuanta: bigint;
  totalCostUsd: string;
  promptTokens: number;
  completionTokens: number;
  nativePromptTokens: number | null;
  nativeCompletionTokens: number | null;
  promptTokenSource: string;
  completionTokenSource: string;
  provider: string;
  alternateProvider: string | null;
  providerSource: string;
  finishReason: string;
  nativeFinishReason: string | null;
  finishReasonSource: string;
  model: string | null;
}

export function parseOpenRouterGenerationMetadata(
  rawBody: string,
  expectedGenerationId: string,
  expectedModel = OPENROUTER_MODEL_ID,
): OpenRouterGenerationMetadata {
  const endpoint = "/api/v1/generation";
  const envelope = parseJsonEnvelope(rawBody, endpoint);
  const data = requiredDataObject(envelope, endpoint);
  requireExpectedGenerationId(
    envelope,
    data,
    expectedGenerationId,
    endpoint,
  );
  if (data.id === undefined) {
    throw new Error(
      "Generation metadata must contain data.id",
    );
  }
  const totalCostQuanta = parseUsdField(
    rawBody,
    "total_cost",
    data.total_cost,
  );
  const prompt = selectTokenField(
    data,
    "tokens_prompt",
    "native_tokens_prompt",
  );
  const completion = selectTokenField(
    data,
    "tokens_completion",
    "native_tokens_completion",
  );
  const provider = selectRequiredString(
    data,
    ["provider_name", "provider"],
    "provider",
    false,
  );
  const finishReason = selectRequiredString(
    data,
    ["finish_reason", "native_finish_reason"],
    "finish reason",
    false,
  );
  const nativeFinishReason =
    data.native_finish_reason === undefined
      ? null
      : selectRequiredString(
          data,
          ["native_finish_reason"],
          "native finish reason",
        ).value;
  if (
    data.model !== undefined &&
    (typeof data.model !== "string" ||
      data.model !== expectedModel)
  ) {
    throw new Error(
      "Generation metadata model does not match the expected model",
    );
  }
  return {
    generationId: expectedGenerationId,
    totalCostQuanta,
    totalCostUsd: formatUsdQuanta(totalCostQuanta),
    promptTokens: prompt.value,
    completionTokens: completion.value,
    nativePromptTokens:
      data.native_tokens_prompt === undefined
        ? null
        : parseNonnegativeInteger(
            data.native_tokens_prompt,
            "generation metadata data.native_tokens_prompt",
          ),
    nativeCompletionTokens:
      data.native_tokens_completion === undefined
        ? null
        : parseNonnegativeInteger(
            data.native_tokens_completion,
            "generation metadata data.native_tokens_completion",
          ),
    promptTokenSource: prompt.sourceField,
    completionTokenSource: completion.sourceField,
    provider: provider.value,
    alternateProvider:
      data.provider_name !== undefined &&
      typeof data.provider === "string"
        ? data.provider
        : null,
    providerSource: provider.sourceField,
    finishReason: finishReason.value,
    nativeFinishReason,
    finishReasonSource: finishReason.sourceField,
    model:
      typeof data.model === "string"
        ? data.model
        : null,
  };
}

export type OpenRouterKeyKind =
  | "INFERENCE_CONFIRMED"
  | "MANAGEMENT_OR_PROVISIONING"
  | "UNKNOWN";

export interface OpenRouterKeyUsage {
  usageQuanta: bigint;
  limitQuanta: bigint;
  limitRemainingQuanta: bigint;
  usageUsd: string;
  limitUsd: string;
  limitRemainingUsd: string;
  keyKind: OpenRouterKeyKind;
  active: boolean;
  expiresAt: string | null;
  numericCanonicalizations?: readonly OpenRouterUsdNumericCanonicalization[];
}

export function parseOpenRouterKeyUsage(
  rawBody: string,
): OpenRouterKeyUsage {
  const endpoint = "/api/v1/key";
  const envelope = parseJsonEnvelope(rawBody, endpoint);
  const data = requiredDataObject(envelope, endpoint);
  const usage = parseKeyUsdField(
    rawBody,
    "usage",
    data.usage,
  );
  const limit = parseKeyUsdField(
    rawBody,
    "limit",
    data.limit,
  );
  const limitRemaining = parseKeyUsdField(
    rawBody,
    "limit_remaining",
    data.limit_remaining,
  );
  const usageQuanta = usage.quanta;
  const limitQuanta = limit.quanta;
  const limitRemainingQuanta =
    limitRemaining.quanta;
  for (const field of [
    "is_management_key",
    "is_provisioning_key",
    "disabled",
    "is_active",
  ] as const) {
    if (
      data[field] !== undefined &&
      typeof data[field] !== "boolean"
    ) {
      throw new Error(`key data.${field} is malformed`);
    }
  }
  if (
    data.expires_at !== undefined &&
    data.expires_at !== null &&
    (typeof data.expires_at !== "string" ||
      Number.isNaN(Date.parse(data.expires_at)))
  ) {
    throw new Error("key data.expires_at is malformed");
  }
  const explicitlyInference =
    data.is_management_key === false ||
    data.is_provisioning_key === false;
  const explicitlyManagement =
    data.is_management_key === true ||
    data.is_provisioning_key === true;
  return {
    usageQuanta,
    limitQuanta,
    limitRemainingQuanta,
    usageUsd: formatUsdQuanta(usageQuanta),
    limitUsd: formatUsdQuanta(limitQuanta),
    limitRemainingUsd: formatUsdQuanta(
      limitRemainingQuanta,
    ),
    keyKind: explicitlyManagement
      ? "MANAGEMENT_OR_PROVISIONING"
      : explicitlyInference
        ? "INFERENCE_CONFIRMED"
        : "UNKNOWN",
    active:
      data.disabled !== true &&
      data.is_active !== false,
    expiresAt:
      typeof data.expires_at === "string"
        ? data.expires_at
        : null,
    numericCanonicalizations: [
      usage.canonicalization,
      limit.canonicalization,
      limitRemaining.canonicalization,
    ].filter(
      (
        item,
      ): item is OpenRouterUsdNumericCanonicalization =>
        item !== null,
    ),
  };
}

export type OpenRouterReconciliationStatus =
  | "UNCERTAIN_COST_CLEARED"
  | "UNEXPLAINED_ACTUAL_DELTA_CARRIED"
  | "IMPLAUSIBLE_ACTUAL_DELTA_BLOCKED"
  | "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN";

export interface OpenRouterUsageReconciliation {
  status: OpenRouterReconciliationStatus;
  canContinuePaidInference: boolean;
  historicalGenerationCostQuanta: bigint;
  carriedHistoricalCostQuanta: bigint;
  currentKeyUsageQuanta: bigint | null;
  unexplainedDeltaQuanta: bigint | null;
  reconciledActualCostQuanta: bigint;
  unresolvedActualDeltaQuanta: bigint;
  retainedHypotheticalUncertainQuanta: bigint;
  capAccountedCostQuanta: bigint;
  event:
    | {
        event: "UNCERTAIN_COST_RECONCILED";
        previousUncertainAmountUsd: string;
        currentKeyUsageUsd: string;
        historicalGenerationCostUsd: string;
        reconciledActualAmountUsd: string;
        toleranceUsd: string;
        evidence: "TWO_STABLE_KEY_READINGS_AND_TEN_GENERATION_COSTS";
      }
    | null;
  reasons: readonly string[];
}

export interface OpenRouterReconciliationInput {
  historicalGenerationCosts: readonly OpenRouterUsdInput[];
  carriedHistoricalCost: OpenRouterUsdInput;
  initialKeyUsage: OpenRouterUsdInput;
  keyReadingBefore: OpenRouterKeyUsage;
  keyReadingAfter: OpenRouterKeyUsage;
  priorUncertainMaximum: OpenRouterUsdInput;
  noInferenceBetweenKeyReadings: boolean;
  toleranceQuanta?: bigint;
  maximumPlausibleUnexplained?: OpenRouterUsdInput;
  maximumKeyLimit?: OpenRouterUsdInput;
  nowIso?: string;
}

/**
 * Reconciles K - B - H using two stable key readings. A blocked precondition
 * never mutates or clears the prior uncertain entry; callers may only append
 * the returned overlay event when `event` is non-null.
 */
export function reconcileOpenRouterUsage(
  input: OpenRouterReconciliationInput,
): OpenRouterUsageReconciliation {
  const tolerance =
    input.toleranceQuanta ??
    OPENROUTER_RECONCILIATION_TOLERANCE_QUANTA;
  if (
    tolerance < 0n ||
    tolerance >
      OPENROUTER_RECONCILIATION_TOLERANCE_QUANTA
  ) {
    throw new Error(
      "Reconciliation tolerance must not exceed one USD quantum",
    );
  }
  const costs = input.historicalGenerationCosts.map(
    (cost, index) =>
      parseUsdToQuanta(
        cost,
        `historical generation cost ${String(index + 1)}`,
      ),
  );
  const historical = costs.reduce(
    (sum, cost) => sum + cost,
    0n,
  );
  const carried = parseUsdToQuanta(
    input.carriedHistoricalCost,
    "carried historical cost",
  );
  const baseline = parseUsdToQuanta(
    input.initialKeyUsage,
    "initial key usage",
  );
  const priorUncertain = parseUsdToQuanta(
    input.priorUncertainMaximum,
    "prior uncertain maximum",
  );
  const maximumLimit = parseUsdToQuanta(
    input.maximumKeyLimit ?? "10",
    "maximum key limit",
  );
  if (
    maximumLimit >
    OPENROUTER_MAXIMUM_SPEND_QUANTA
  ) {
    throw new Error(
      "Maximum key limit cannot exceed the immutable USD 10 cap",
    );
  }
  const maximumPlausible = parseUsdToQuanta(
    input.maximumPlausibleUnexplained ?? "4.146",
    "maximum plausible unexplained cost",
  );
  if (
    maximumPlausible >
    OPENROUTER_MAXIMUM_PLAUSIBLE_UNEXPLAINED_QUANTA
  ) {
    throw new Error(
      "Maximum plausible unexplained cost cannot exceed the immutable prior request bound",
    );
  }
  const before = input.keyReadingBefore;
  const after = input.keyReadingAfter;
  const reasons: string[] = [];
  let nowMs: number | null = null;
  if (input.nowIso !== undefined) {
    nowMs = Date.parse(input.nowIso);
    if (Number.isNaN(nowMs)) {
      throw new Error(
        "Injected reconciliation time is malformed",
      );
    }
  }
  if (costs.length !== 10) {
    reasons.push(
      "Exactly ten historical generation costs are required",
    );
  }
  if (absolute(historical - carried) > tolerance) {
    reasons.push(
      "Historical generation costs do not reconcile to the carried cost",
    );
  }
  if (!input.noInferenceBetweenKeyReadings) {
    reasons.push(
      "No-inference stability between key readings was not established",
    );
  }
  if (
    before.usageQuanta !== after.usageQuanta ||
    before.limitQuanta !== after.limitQuanta ||
    before.limitRemainingQuanta !==
      after.limitRemainingQuanta
  ) {
    reasons.push("The two key readings are unstable");
  }
  for (const [label, reading] of [
    ["before", before],
    ["after", after],
  ] as const) {
    if (
      absolute(
        reading.usageQuanta +
          reading.limitRemainingQuanta -
          reading.limitQuanta,
      ) > tolerance
    ) {
      reasons.push(
        `The ${label} key reading fails usage + remaining = limit`,
      );
    }
    if (
      reading.limitQuanta <= 0n ||
      reading.limitQuanta > maximumLimit
    ) {
      reasons.push(
        `The ${label} key limit is outside the authorized range`,
      );
    }
    if (
      !reading.active ||
      reading.keyKind !== "INFERENCE_CONFIRMED"
    ) {
      reasons.push(
        `The ${label} key is not a confirmed active inference key`,
      );
    }
    if (reading.expiresAt !== null) {
      if (nowMs === null) {
        reasons.push(
          `The ${label} key expiry cannot be checked without an injected time`,
        );
      } else if (Date.parse(reading.expiresAt) <= nowMs) {
        reasons.push(`The ${label} key is expired`);
      }
    }
  }
  const delta =
    after.usageQuanta - baseline - historical;
  if (delta < -tolerance) {
    reasons.push(
      "Current key usage is below baseline plus historical generation costs",
    );
  }
  if (reasons.length > 0) {
    return {
      status: "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN",
      canContinuePaidInference: false,
      historicalGenerationCostQuanta: historical,
      carriedHistoricalCostQuanta: carried,
      currentKeyUsageQuanta: after.usageQuanta,
      unexplainedDeltaQuanta: delta,
      reconciledActualCostQuanta: historical,
      unresolvedActualDeltaQuanta: 0n,
      retainedHypotheticalUncertainQuanta:
        priorUncertain,
      capAccountedCostQuanta:
        after.usageQuanta >
        historical + priorUncertain
          ? after.usageQuanta
          : historical + priorUncertain,
      event: null,
      reasons,
    };
  }
  const reconciledDelta =
    absolute(delta) <= tolerance ? 0n : delta;
  const reconciledActual = historical + reconciledDelta;
  const event = {
    event: "UNCERTAIN_COST_RECONCILED" as const,
    previousUncertainAmountUsd:
      formatUsdQuanta(priorUncertain),
    currentKeyUsageUsd: formatUsdQuanta(
      after.usageQuanta,
    ),
    historicalGenerationCostUsd:
      formatUsdQuanta(historical),
    reconciledActualAmountUsd:
      formatUsdQuanta(reconciledDelta),
    toleranceUsd: formatUsdQuanta(tolerance),
    evidence:
      "TWO_STABLE_KEY_READINGS_AND_TEN_GENERATION_COSTS" as const,
  };
  if (reconciledDelta > maximumPlausible) {
    return {
      status: "IMPLAUSIBLE_ACTUAL_DELTA_BLOCKED",
      canContinuePaidInference: false,
      historicalGenerationCostQuanta: historical,
      carriedHistoricalCostQuanta: carried,
      currentKeyUsageQuanta: after.usageQuanta,
      unexplainedDeltaQuanta: reconciledDelta,
      reconciledActualCostQuanta: reconciledActual,
      unresolvedActualDeltaQuanta: 0n,
      retainedHypotheticalUncertainQuanta: 0n,
      capAccountedCostQuanta: reconciledActual,
      event,
      reasons: [
        "The actual unexplained usage delta exceeds the plausible single-request bound",
      ],
    };
  }
  return {
    status:
      reconciledDelta === 0n
        ? "UNCERTAIN_COST_CLEARED"
        : "UNEXPLAINED_ACTUAL_DELTA_CARRIED",
    canContinuePaidInference: true,
    historicalGenerationCostQuanta: historical,
    carriedHistoricalCostQuanta: carried,
    currentKeyUsageQuanta: after.usageQuanta,
    unexplainedDeltaQuanta: reconciledDelta,
    reconciledActualCostQuanta: reconciledActual,
    unresolvedActualDeltaQuanta: 0n,
    retainedHypotheticalUncertainQuanta: 0n,
    capAccountedCostQuanta: reconciledActual,
    event,
    reasons: [],
  };
}

export interface OpenRouterRequestCapDecision {
  allowed: boolean;
  reason: string | null;
  nextCount: number;
  projectedCostQuanta: bigint | null;
  effectiveNextRequestCostQuanta: bigint | null;
}

export function checkMetadataGetCap(input: {
  metadataGetsUsed: number;
  maximumMetadataGets?: number;
}): OpenRouterRequestCapDecision {
  const maximum =
    input.maximumMetadataGets ??
    OPENROUTER_MAXIMUM_METADATA_GETS;
  if (
    !Number.isInteger(input.metadataGetsUsed) ||
    input.metadataGetsUsed < 0 ||
    !Number.isInteger(maximum) ||
    maximum < 0 ||
    maximum >
      OPENROUTER_MAXIMUM_METADATA_GETS
  ) {
    throw new Error("Invalid metadata GET accounting");
  }
  const nextCount = input.metadataGetsUsed + 1;
  return {
    allowed: nextCount <= maximum,
    reason:
      nextCount <= maximum
        ? null
        : "METADATA_GET_CAP_EXCEEDED",
    nextCount,
    projectedCostQuanta: null,
    effectiveNextRequestCostQuanta: null,
  };
}

export function checkPaidInferenceCap(input: {
  paidJudgePostsUsed: number;
  reconciledActualCost: OpenRouterUsdInput;
  unresolvedActualUsageDelta: OpenRouterUsdInput;
  maximumUncertainCost?: OpenRouterUsdInput;
  estimatedNextRequestCost: OpenRouterUsdInput;
  costEvidenceStable: boolean;
  maximumPaidJudgePosts?: number;
  maximumSpend?: OpenRouterUsdInput;
}): OpenRouterRequestCapDecision {
  const maximumPosts =
    input.maximumPaidJudgePosts ??
    OPENROUTER_MAXIMUM_NEW_PAID_JUDGE_POSTS;
  if (
    !Number.isInteger(input.paidJudgePostsUsed) ||
    input.paidJudgePostsUsed < 0 ||
    !Number.isInteger(maximumPosts) ||
    maximumPosts < 0 ||
    maximumPosts >
      OPENROUTER_MAXIMUM_NEW_PAID_JUDGE_POSTS
  ) {
    throw new Error("Invalid paid POST accounting");
  }
  const actual = parseUsdToQuanta(
    input.reconciledActualCost,
    "reconciled actual cost",
  );
  const unresolved = parseUsdToQuanta(
    input.unresolvedActualUsageDelta,
    "unresolved actual usage delta",
  );
  const next = parseUsdToQuanta(
    input.estimatedNextRequestCost,
    "estimated next-request cost",
  );
  const uncertain = parseUsdToQuanta(
    input.maximumUncertainCost ?? "0",
    "maximum uncertain cost",
  );
  const maximumSpend = parseUsdToQuanta(
    input.maximumSpend ?? "10",
    "maximum spend",
  );
  if (
    maximumSpend >
    OPENROUTER_MAXIMUM_SPEND_QUANTA
  ) {
    throw new Error(
      "Maximum spend cannot exceed the immutable USD 10 cap",
    );
  }
  const nextCount = input.paidJudgePostsUsed + 1;
  const effectiveNext =
    next <
    OPENROUTER_PINNED_NEXT_JUDGE_ESTIMATE_QUANTA
      ? OPENROUTER_PINNED_NEXT_JUDGE_ESTIMATE_QUANTA
      : next;
  const projected =
    actual + unresolved + uncertain + effectiveNext;
  const reason = !input.costEvidenceStable
    ? "COST_EVIDENCE_NOT_STABLE"
    : nextCount > maximumPosts
      ? "PAID_JUDGE_POST_CAP_EXCEEDED"
      : projected > maximumSpend
        ? "USD_CAP_EXCEEDED"
        : null;
  return {
    allowed: reason === null,
    reason,
    nextCount,
    projectedCostQuanta: projected,
    effectiveNextRequestCostQuanta: effectiveNext,
  };
}

export const OPENROUTER_HISTORICAL_AUDIO_TOKEN_MAXIMUM =
  10_020;
export const OPENROUTER_HISTORICAL_TEXT_TOKEN_MAXIMUM =
  1_249;
export const OPENROUTER_JUDGE_MAX_OUTPUT_TOKENS = 5_000;
export const OPENROUTER_JUDGE_COST_SAFETY_MARGIN_BPS =
  2_500;
export const OPENROUTER_PINNED_NEXT_JUDGE_ESTIMATE_QUANTA =
  50_000_000n;

function ceilingDivide(
  numerator: bigint,
  denominator: bigint,
): bigint {
  return (numerator + denominator - 1n) / denominator;
}

/**
 * Prices the exact historical input-token maxima plus the hard 5,000 output
 * token ceiling at the official $32/$2.50/$10 per-million rates. The paid
 * admission estimate is pinned to USD 0.50: the full current text/tool-schema
 * payload costs less than USD 0.023 even at one token per ASCII byte, so the
 * all-in base is below USD 0.394 and the pin retains more than 25% headroom.
 * Actual usage is reconciled after every call.
 */
export function estimateConservativeNextJudgeCost(): {
  baseCostQuanta: bigint;
  safetyMarginBasisPoints: number;
  estimatedCostQuanta: bigint;
  estimatedCostUsd: string;
} {
  const perMillion = 1_000_000n;
  const audio = ceilingDivide(
    BigInt(
      OPENROUTER_HISTORICAL_AUDIO_TOKEN_MAXIMUM,
    ) *
      32n *
      OPENROUTER_USD_QUANTA_PER_DOLLAR,
    perMillion,
  );
  const text = ceilingDivide(
    BigInt(
      OPENROUTER_HISTORICAL_TEXT_TOKEN_MAXIMUM,
    ) *
      25n *
      OPENROUTER_USD_QUANTA_PER_DOLLAR,
    10n * perMillion,
  );
  const output = ceilingDivide(
    BigInt(OPENROUTER_JUDGE_MAX_OUTPUT_TOKENS) *
      10n *
      OPENROUTER_USD_QUANTA_PER_DOLLAR,
    perMillion,
  );
  const baseCostQuanta = audio + text + output;
  const estimatedCostQuanta = ceilingDivide(
    baseCostQuanta *
      BigInt(
        10_000 +
          OPENROUTER_JUDGE_COST_SAFETY_MARGIN_BPS,
      ),
    10_000n,
  );
  if (
    estimatedCostQuanta >=
    OPENROUTER_PINNED_NEXT_JUDGE_ESTIMATE_QUANTA
  ) {
    throw new Error(
      "Pinned USD 0.50 admission estimate lost its documented safety headroom",
    );
  }
  return {
    baseCostQuanta,
    safetyMarginBasisPoints:
      OPENROUTER_JUDGE_COST_SAFETY_MARGIN_BPS,
    estimatedCostQuanta:
      OPENROUTER_PINNED_NEXT_JUDGE_ESTIMATE_QUANTA,
    estimatedCostUsd:
      formatUsdQuanta(
        OPENROUTER_PINNED_NEXT_JUDGE_ESTIMATE_QUANTA,
      ),
  };
}

export type OpenRouterResolvedInferenceCost =
  | {
      resolved: true;
      source:
        | "usage.cost"
        | "generation.data.total_cost";
      costQuanta: bigint;
      costUsd: string;
    }
  | {
      resolved: false;
      source: null;
      requiresGenerationMetadata: boolean;
    };

/**
 * Inline usage.cost remains authoritative. When it is absent, matching
 * generation metadata is an exact fallback rather than an uncertain maximum.
 */
export function resolveOpenRouterInferenceCost(input: {
  inlineUsageCost: OpenRouterUsdInput | null | undefined;
  generationId: string | null;
  generationMetadata?: OpenRouterGenerationMetadata | null;
}): OpenRouterResolvedInferenceCost {
  if (input.inlineUsageCost !== null &&
      input.inlineUsageCost !== undefined) {
    const costQuanta = parseUsdToQuanta(
      input.inlineUsageCost,
      "usage.cost",
    );
    return {
      resolved: true,
      source: "usage.cost",
      costQuanta,
      costUsd: formatUsdQuanta(costQuanta),
    };
  }
  if (input.generationId === null) {
    return {
      resolved: false,
      source: null,
      requiresGenerationMetadata: false,
    };
  }
  if (!input.generationMetadata) {
    return {
      resolved: false,
      source: null,
      requiresGenerationMetadata: true,
    };
  }
  if (
    input.generationMetadata.generationId !==
    input.generationId
  ) {
    throw new Error(
      "Generation metadata ID does not match inference response",
    );
  }
  return {
    resolved: true,
    source: "generation.data.total_cost",
    costQuanta:
      input.generationMetadata.totalCostQuanta,
    costUsd: input.generationMetadata.totalCostUsd,
  };
}
