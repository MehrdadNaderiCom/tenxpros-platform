import { createHash } from "node:crypto";

import {
  formatUsdQuanta,
  parseUsdToQuanta,
} from "./openrouter-generation-retrieval";
import {
  PIPER_PANEL_V2_MAX_PAID_POSTS,
  PIPER_PANEL_V2_MAX_TOKENS,
  PIPER_PANEL_V2_TOOL_NAME,
  piperPanelV2Tool,
} from "./openrouter-piper-panel-v2";
import type { AiBlindJudgeAssignment } from "./ai-audio-evaluation";

export const PIPER_PANEL_V2_MODEL_ID =
  "openai/gpt-audio";
export const PIPER_PANEL_V2_CARRIED_COST_USD =
  "3.54151000";
export const PIPER_PANEL_V2_MAXIMUM_COST_USD =
  "10.00000000";
export const PIPER_PANEL_V2_HISTORICAL_AUDIO_TOKENS =
  10_020;
export const PIPER_PANEL_V2_AUDIO_TOKENS_PER_MINUTE =
  1_000;
export const PIPER_PANEL_V2_COST_MARGIN_BPS = 2_500;

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

function positivePrice(
  value: unknown,
  field: string,
): { usdPerToken: string; quantaPerToken: bigint } {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim()
  ) {
    throw new Error(`${field} must be an exact decimal string`);
  }
  const quantaPerToken = parseUsdToQuanta(value, field);
  if (quantaPerToken <= 0n) {
    throw new Error(`${field} must be positive`);
  }
  return { usdPerToken: value, quantaPerToken };
}

export interface PiperPanelV2ModelCapability {
  id: typeof PIPER_PANEL_V2_MODEL_ID;
  contextLength: number;
  inputModalities: readonly string[];
  supportedParameters: readonly string[];
  pricing: {
    promptUsdPerToken: string;
    audioUsdPerToken: string;
    completionUsdPerToken: string;
    promptQuantaPerToken: bigint;
    audioQuantaPerToken: bigint;
    completionQuantaPerToken: bigint;
  };
  catalogSha256: string;
}

export function parsePiperPanelV2ModelCatalog(
  rawBody: string,
): PiperPanelV2ModelCapability {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error("OpenRouter model catalog is not JSON");
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.data)) {
    throw new Error("OpenRouter model catalog is malformed");
  }
  const matches = parsed.data.filter(
    (candidate) =>
      isRecord(candidate) &&
      candidate.id === PIPER_PANEL_V2_MODEL_ID,
  );
  if (matches.length !== 1) {
    throw new Error(
      "The exact OpenRouter audio model must occur once",
    );
  }
  const model = matches[0]!;
  const architecture = model.architecture;
  const pricing = model.pricing;
  if (
    !isRecord(architecture) ||
    !Array.isArray(architecture.input_modalities) ||
    !architecture.input_modalities.every(
      (item: unknown): item is string =>
        typeof item === "string",
    ) ||
    !architecture.input_modalities.includes("audio") ||
    !Array.isArray(model.supported_parameters) ||
    !model.supported_parameters.every(
      (item: unknown): item is string =>
        typeof item === "string",
    ) ||
    !model.supported_parameters.includes("tools") ||
    !model.supported_parameters.includes("tool_choice") ||
    !model.supported_parameters.includes("max_tokens") ||
    !Number.isSafeInteger(model.context_length) ||
    Number(model.context_length) <=
      PIPER_PANEL_V2_MAX_TOKENS ||
    !isRecord(pricing)
  ) {
    throw new Error(
      "OpenRouter model lacks the required audio/tool capability",
    );
  }
  const prompt = positivePrice(
    pricing.prompt,
    "model pricing.prompt",
  );
  const audio = positivePrice(
    pricing.audio,
    "model pricing.audio",
  );
  const completion = positivePrice(
    pricing.completion,
    "model pricing.completion",
  );
  return {
    id: PIPER_PANEL_V2_MODEL_ID,
    contextLength: Number(model.context_length),
    inputModalities: [
      ...architecture.input_modalities,
    ].sort(),
    supportedParameters: [
      ...model.supported_parameters,
    ].sort(),
    pricing: {
      promptUsdPerToken: prompt.usdPerToken,
      audioUsdPerToken: audio.usdPerToken,
      completionUsdPerToken:
        completion.usdPerToken,
      promptQuantaPerToken:
        prompt.quantaPerToken,
      audioQuantaPerToken:
        audio.quantaPerToken,
      completionQuantaPerToken:
        completion.quantaPerToken,
    },
    catalogSha256: sha256(rawBody),
  };
}

function ceilingDivide(
  numerator: bigint,
  denominator: bigint,
): bigint {
  return (numerator + denominator - 1n) / denominator;
}

export interface PiperPanelV2CostEstimate {
  totalAudioDurationSeconds: number;
  audioTokenEstimate: number;
  historicalAudioTokenReference: number;
  audioTokensPerMinuteAssumption: number;
  textPayloadBytes: number;
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

export function estimatePiperPanelV2RequestCost(input: {
  durationSeconds: readonly number[];
  textPayloadBytes: number;
  maximumCompletionTokens?: number;
  pricing: PiperPanelV2ModelCapability["pricing"];
}): PiperPanelV2CostEstimate {
  if (
    input.durationSeconds.length !== 10 ||
    input.durationSeconds.some(
      (duration) =>
        !Number.isFinite(duration) || duration <= 0,
    ) ||
    !Number.isSafeInteger(input.textPayloadBytes) ||
    input.textPayloadBytes <= 0
  ) {
    throw new Error(
      "Cost estimate requires ten positive durations and a positive text byte count",
    );
  }
  const maximumCompletionTokens =
    input.maximumCompletionTokens ??
    PIPER_PANEL_V2_MAX_TOKENS;
  if (
    !Number.isSafeInteger(maximumCompletionTokens) ||
    maximumCompletionTokens <= 0 ||
    maximumCompletionTokens >
      PIPER_PANEL_V2_MAX_TOKENS
  ) {
    throw new Error(
      "Maximum completion tokens exceed the authorized ceiling",
    );
  }
  const totalAudioDurationSeconds =
    input.durationSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    );
  const durationBasedAudioTokens = Math.ceil(
    (totalAudioDurationSeconds *
      PIPER_PANEL_V2_AUDIO_TOKENS_PER_MINUTE) /
      60,
  );
  const audioTokenEstimate = Math.max(
    PIPER_PANEL_V2_HISTORICAL_AUDIO_TOKENS,
    durationBasedAudioTokens,
  );
  /*
   * Three UTF-8 bytes per token is deliberately conservative for this
   * ASCII-heavy prompt and tool schema. Audio base64 is excluded because the
   * provider prices input_audio through the separate audio-token field.
   */
  const textTokenEstimate = Math.ceil(
    input.textPayloadBytes / 3,
  );
  const promptCost =
    BigInt(textTokenEstimate) *
    input.pricing.promptQuantaPerToken;
  const audioCost =
    BigInt(audioTokenEstimate) *
    input.pricing.audioQuantaPerToken;
  const completionCost =
    BigInt(maximumCompletionTokens) *
    input.pricing.completionQuantaPerToken;
  const baseCost =
    promptCost + audioCost + completionCost;
  const conservativeCost = ceilingDivide(
    baseCost *
      BigInt(
        10_000 + PIPER_PANEL_V2_COST_MARGIN_BPS,
      ),
    10_000n,
  );
  return {
    totalAudioDurationSeconds,
    audioTokenEstimate,
    historicalAudioTokenReference:
      PIPER_PANEL_V2_HISTORICAL_AUDIO_TOKENS,
    audioTokensPerMinuteAssumption:
      PIPER_PANEL_V2_AUDIO_TOKENS_PER_MINUTE,
    textPayloadBytes: input.textPayloadBytes,
    textTokenEstimate,
    maximumCompletionTokens,
    promptCostUsd: formatUsdQuanta(promptCost),
    audioCostUsd: formatUsdQuanta(audioCost),
    completionCostUsd:
      formatUsdQuanta(completionCost),
    baseCostUsd: formatUsdQuanta(baseCost),
    safetyMarginBasisPoints:
      PIPER_PANEL_V2_COST_MARGIN_BPS,
    conservativeCostUsd:
      formatUsdQuanta(conservativeCost),
    conservativeCostQuanta: conservativeCost,
  };
}

export interface PiperPanelV2Admission {
  allowed: boolean;
  reason: string | null;
  nextPaidPostCount: number;
  projectedCapCostUsd: string;
}

export function authorizePiperPanelV2Request(input: {
  paidPostsUsed: number;
  cumulativeKnownActualCost: string | bigint;
  unresolvedActualUsageDelta: string | bigint;
  maximumUncertainCost: string | bigint;
  nextEstimate: string | bigint;
  keyUsage: string | bigint;
  keyLimit: string | bigint;
  keyLimitRemaining: string | bigint;
  costEvidenceStable: boolean;
}): PiperPanelV2Admission {
  if (
    !Number.isSafeInteger(input.paidPostsUsed) ||
    input.paidPostsUsed < 0
  ) {
    throw new Error("Paid POST accounting is invalid");
  }
  const known = parseUsdToQuanta(
    input.cumulativeKnownActualCost,
    "cumulative known actual cost",
  );
  const unresolved = parseUsdToQuanta(
    input.unresolvedActualUsageDelta,
    "unresolved actual usage delta",
  );
  const uncertain = parseUsdToQuanta(
    input.maximumUncertainCost,
    "maximum uncertain cost",
  );
  const next = parseUsdToQuanta(
    input.nextEstimate,
    "next conservative request estimate",
  );
  const keyUsage = parseUsdToQuanta(
    input.keyUsage,
    "current key usage",
  );
  const keyLimit = parseUsdToQuanta(
    input.keyLimit,
    "current key limit",
  );
  const keyRemaining = parseUsdToQuanta(
    input.keyLimitRemaining,
    "current key remaining limit",
  );
  const maximum = parseUsdToQuanta(
    PIPER_PANEL_V2_MAXIMUM_COST_USD,
  );
  const nextPaidPostCount = input.paidPostsUsed + 1;
  const projected = known + unresolved + uncertain + next;
  const reason =
    !input.costEvidenceStable
      ? "COST_EVIDENCE_NOT_STABLE"
      : nextPaidPostCount >
          PIPER_PANEL_V2_MAX_PAID_POSTS
        ? "PAID_POST_CAP_EXCEEDED"
        : keyLimit <= 0n || keyLimit > maximum
          ? "KEY_LIMIT_OUTSIDE_AUTHORIZATION"
          : keyUsage + keyRemaining !== keyLimit
            ? "KEY_USAGE_REMAINING_MISMATCH"
            : keyUsage > known + unresolved
              ? "KEY_USAGE_EXCEEDS_RECONCILED_ACCOUNTING"
              : keyRemaining < next
                ? "KEY_REMAINING_INSUFFICIENT"
                : projected > maximum
                  ? "USD_CAP_EXCEEDED"
                  : null;
  return {
    allowed: reason === null,
    reason,
    nextPaidPostCount,
    projectedCapCostUsd: formatUsdQuanta(projected),
  };
}

export interface PiperPanelV2RequestBuild {
  body: Readonly<Record<string, unknown>>;
  redactedRequest: Readonly<Record<string, unknown>>;
  requestBodySha256: string;
  textPayloadBytes: number;
  audioInputCount: number;
}

function requestText(
  assignment: AiBlindJudgeAssignment,
): string {
  const pairs = assignment.pairs
    .map(
      (pair) =>
        `${pair.neutralPairLabel}: first audio is Version A; second audio is Version B${
          pair.tableEvaluation
            ? "; this is the table pair"
            : ""
        }.`,
    )
    .join("\n");
  return `Evaluate every attached pair at normal 1.0x playback.
${pairs}
Use the exact pair labels. Every quality score MUST be one integer from 1 through 5; never use 6 through 10 and never use a decimal. Every confidence MUST be an integer from 0 through 100, such as 85; never use 0.85. Base every reason on audible evidence. Keep each reason and description to 35 words or fewer. Report no pronunciation issue unless one was actually heard. Submit exactly one ${PIPER_PANEL_V2_TOOL_NAME} call.`;
}

export function buildPiperPanelV2Request(input: {
  assignment: AiBlindJudgeAssignment;
  audioContent: readonly Readonly<Record<string, unknown>>[];
}): PiperPanelV2RequestBuild {
  const systemPrompt = `You are an independent blind audio judge acting as: ${input.assignment.lensTitle}.
Focus: ${input.assignment.lensFocus}
You receive five neutral A/B audio pairs with no identity information. Listen to all ten clips completely at normal 1.0x playback. Do not infer hidden identities. Judge only what is audible: naturalness, pauses, pronunciation, clarity, comfort, professional quality, long-form suitability, preference, pacing, and the designated table pair.`;
  const userText = requestText(input.assignment);
  const userContent = [
    {
      type: "text",
      text: userText,
    },
    ...input.audioContent,
  ];
  const body = {
    model: PIPER_PANEL_V2_MODEL_ID,
    provider: {
      allow_fallbacks: false,
      require_parameters: true,
    },
    store: false,
    stream: false,
    max_tokens: PIPER_PANEL_V2_MAX_TOKENS,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    tools: [piperPanelV2Tool(input.assignment)],
    tool_choice: {
      type: "function",
      function: {
        name: PIPER_PANEL_V2_TOOL_NAME,
      },
    },
  } satisfies Record<string, unknown>;
  const audioParts = userContent.filter(
    (part) =>
      isRecord(part) && part.type === "input_audio",
  );
  if (
    audioParts.length !== 10 ||
    audioParts.some((part) => {
      const audio = part.input_audio;
      return (
        !isRecord(audio) ||
        audio.format !== "mp3" ||
        typeof audio.data !== "string" ||
        audio.data.length === 0
      );
    }) ||
    Object.hasOwn(body, "response_format") ||
    /\b(?:corrected|baseline)\b/iu.test(
      `${systemPrompt}\n${userText}`,
    )
  ) {
    throw new Error(
      "Paid judge request violates the blind audio contract",
    );
  }
  const redactedUserContent = userContent.map((part) =>
    isRecord(part) && part.type === "input_audio"
      ? {
          type: "input_audio",
          input_audio: {
            data: "[OMITTED_FROZEN_AUDIO]",
            format: "mp3",
          },
        }
      : part,
  );
  const redactedRequest = {
    ...body,
    messages: [
      body.messages[0],
      {
        role: "user",
        content: redactedUserContent,
      },
    ],
    audit: {
      audioInputCount: audioParts.length,
      responseFormatOmitted: true,
      forcedToolChoice:
        PIPER_PANEL_V2_TOOL_NAME,
      privateMappingIncluded: false,
    },
  };
  const textPayloadBytes = Buffer.byteLength(
    JSON.stringify({
      systemPrompt,
      userText,
      tool: piperPanelV2Tool(input.assignment),
      audioLabels: input.audioContent
        .filter(
          (part) =>
            isRecord(part) && part.type === "text",
        )
        .map((part) => part.text),
    }),
    "utf8",
  );
  return {
    body,
    redactedRequest,
    requestBodySha256: sha256(JSON.stringify(body)),
    textPayloadBytes,
    audioInputCount: audioParts.length,
  };
}

export function assertPiperPanelV2Request(
  body: unknown,
): void {
  if (!isRecord(body)) {
    throw new Error("Request body must be an object");
  }
  const choice = body.tool_choice;
  const tools = body.tools;
  if (
    body.model !== PIPER_PANEL_V2_MODEL_ID ||
    body.store !== false ||
    body.stream !== false ||
    body.max_tokens !== PIPER_PANEL_V2_MAX_TOKENS ||
    Object.hasOwn(body, "response_format") ||
    !Array.isArray(tools) ||
    tools.length !== 1 ||
    !isRecord(tools[0]) ||
    !isRecord(tools[0].function) ||
    tools[0].function.name !==
      PIPER_PANEL_V2_TOOL_NAME ||
    !isRecord(choice) ||
    choice.type !== "function" ||
    !isRecord(choice.function) ||
    choice.function.name !==
      PIPER_PANEL_V2_TOOL_NAME
  ) {
    throw new Error(
      "Request does not enforce the one-tool response contract",
    );
  }
}
