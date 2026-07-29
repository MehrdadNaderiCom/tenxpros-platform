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
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatUsdQuanta,
  parseOpenRouterKeyUsage,
  parseUsdToQuanta,
} from "../src/lib/academy/narration/openrouter-generation-retrieval";
import {
  OPENROUTER_PAID_JUDGE_TOOL_NAME,
  parseOpenRouterChatCompletionReceipt,
  parseOpenRouterPaidJudgePayload,
} from "../src/lib/academy/narration/openrouter-paid-judge-executor";
import {
  parsePiperPanelV2ModelCatalog,
} from "../src/lib/academy/narration/openrouter-piper-panel-v2-executor";

type JsonRecord = Record<string, unknown>;
type VoiceLabel = "Voice A" | "Voice B" | "Voice C";
type AliasId =
  | "a_i_space"
  | "a_i_periods"
  | "ay_eye";
type PerspectiveId =
  | "judge-01"
  | "judge-02"
  | "judge-03"
  | "judge-04"
  | "judge-05";

interface AuditionResult extends JsonRecord {
  resultHash: string;
  planHash: string;
  results: readonly AuditionSample[];
}

interface AuditionSample extends JsonRecord {
  ordinal: number;
  kind:
    | "GOLDEN_AUDITION"
    | "AI_PRONUNCIATION_MICRO";
  neutralLabel: VoiceLabel;
  aliasId: AliasId | null;
  aliasSpoken: string | null;
  transcriptSha256: string;
  outputRelativePath: string;
  generatedAudioChecksum: string;
  audit: {
    fileBytes: number;
    fileSha256: string;
    durationSeconds: number;
  };
}

interface VoiceEvaluation {
  voice_label: VoiceLabel;
  naturalness: number;
  clarity: number;
  professional_quality: number;
  long_form_suitability: number;
  comfort: number;
  sentence_flow: number;
  paragraph_flow: number;
  heading_separation: number;
  list_pacing: number;
  table_clarity: number;
  dense_passage_clarity: number;
  pronunciation_consistency: number;
  acronym_pronunciation: number;
  tenxpros_pronunciation: number;
  ai_pronunciation_correct: boolean;
  selected_ai_alias: AliasId;
  selected_ai_alias_naturalness: number;
  tenxpros_correct: boolean;
  acronyms_correct: boolean;
  unacceptable_fatigue: boolean;
  critical_pronunciation_defect: boolean;
  critical_defects: readonly string[];
  summary: string;
}

interface JudgeResult {
  perspective_id: PerspectiveId;
  voice_evaluations: readonly VoiceEvaluation[];
  preferred_voice: VoiceLabel;
  preference_reason: string;
  confidence: number;
}

const SCRIPT_DIRECTORY = dirname(
  fileURLToPath(import.meta.url),
);
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
const PHASE_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/elevenlabs-final-migration/phase-e1-final-20260728",
);
const AUDITION_ROOT = resolve(
  PHASE_ROOT,
  "audition-runtime",
);
const AUDITION_RESULT_PATH = resolve(
  AUDITION_ROOT,
  "audition-result.json",
);
const OUTPUT_ROOT = resolve(
  PHASE_ROOT,
  "voice-selection-openrouter-v1",
);
const PLAN_PATH = resolve(
  OUTPUT_ROOT,
  "evaluation-plan.json",
);
const LEDGER_PATH = resolve(
  OUTPUT_ROOT,
  "request-ledger.jsonl",
);
const RESULT_PATH = resolve(
  OUTPUT_ROOT,
  "voice-selection-result.json",
);
const SECRET_PATH =
  "/run/secrets/openrouter_audio_judge_key";
const KEY_ENDPOINT =
  "https://openrouter.ai/api/v1/key";
const MODELS_ENDPOINT =
  "https://openrouter.ai/api/v1/models";
const CHAT_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-audio";
const MAXIMUM_SELECTION_COST = parseUsdToQuanta(
  "3.00000000",
);
const MAXIMUM_KEY_LIMIT = parseUsdToQuanta(
  "10.00000000",
);
const MAXIMUM_REQUEST_COST = parseUsdToQuanta(
  "0.60000000",
);
const MAXIMUM_COMPLETION_TOKENS = 1_500;
const GENESIS_HASH = "0".repeat(64);
const PERSPECTIVES: Readonly<
  Record<PerspectiveId, { title: string; focus: string }>
> = {
  "judge-01": {
    title: "international professional learner",
    focus:
      "naturalness, intelligibility across accents, comfort, and credibility",
  },
  "judge-02": {
    title: "e-learning narration reviewer",
    focus:
      "instructional flow, headings, paragraphs, lists, tables, and dense material",
  },
  "judge-03": {
    title: "long-form fatigue reviewer",
    focus:
      "listening comfort, fatigue, consistency, pace, and 15-to-30-minute suitability",
  },
  "judge-04": {
    title: "speech clarity and pronunciation reviewer",
    focus:
      "AI, Ten X Pros, acronyms, articulation, and pronunciation consistency",
  },
  "judge-05": {
    title: "skeptical professional-credibility reviewer",
    focus:
      "authority without theatrics, naturalness, clarity, and production readiness",
  },
};
const SCORE_FIELDS = [
  "naturalness",
  "clarity",
  "professional_quality",
  "long_form_suitability",
  "comfort",
  "sentence_flow",
  "paragraph_flow",
  "heading_separation",
  "list_pacing",
  "table_clarity",
  "dense_passage_clarity",
  "pronunciation_consistency",
  "acronym_pronunciation",
  "tenxpros_pronunciation",
  "selected_ai_alias_naturalness",
] as const;
const VOICE_LABELS = [
  "Voice A",
  "Voice B",
  "Voice C",
] as const;
const ALIAS_IDS = [
  "a_i_space",
  "a_i_periods",
  "ay_eye",
] as const;

function sha256(
  value: string | Buffer,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string")
    return JSON.stringify(value);
  if (
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(canonical).join(",")}]`;
  if (
    typeof value === "object" &&
    value !== null
  ) {
    const record = value as JsonRecord;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical(
            record[key],
          )}`,
      )
      .join(",")}}`;
  }
  throw new Error(
    `Unsupported canonical value: ${typeof value}`,
  );
}

function isRecord(
  value: unknown,
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

async function ensurePrivateDirectory(
  path: string,
  create: boolean,
): Promise<void> {
  if (create) {
    await mkdir(path, {
      recursive: false,
      mode: 0o700,
    });
  }
  await chmod(path, 0o700);
  const metadata = await lstat(path);
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o700
  ) {
    throw new Error(
      `Unsafe private directory: ${path}`,
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
      throw new Error("Unsafe ledger");
    }
    await handle.writeFile(value, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function loadSecret(): Promise<string> {
  const metadata = await lstat(SECRET_PATH);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.uid !== process.getuid?.() ||
    (metadata.mode & 0o077) !== 0
  ) {
    throw new Error(
      "OpenRouter secret preflight failed",
    );
  }
  const secret = (
    await readFile(SECRET_PATH, "utf8")
  ).trim();
  if (secret.length === 0) {
    throw new Error("OpenRouter secret is empty");
  }
  return secret;
}

function assertNoSecret(
  value: string,
  secret: string,
): void {
  if (
    value.includes(secret) ||
    /(?:sk-or-v1-|authorization\s*:|bearer\s+)/iu.test(
      value,
    )
  ) {
    throw new Error(
      "Credential-like material detected",
    );
  }
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
        : {
            "Content-Type": "application/json",
          }),
    },
    body: input.body,
  });
  const rawBody = await response.text();
  assertNoSecret(rawBody, input.secret);
  return {
    ok: response.ok,
    status: response.status,
    generationHeaderId: response.headers.get(
      "x-openrouter-generation-id",
    ),
    rawBody,
  };
}

function keySummary(
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

function assertKey(
  key: ReturnType<typeof parseOpenRouterKeyUsage>,
): void {
  if (
    !key.active ||
    key.keyKind !== "INFERENCE_CONFIRMED" ||
    key.limitQuanta <= 0n ||
    key.limitQuanta > MAXIMUM_KEY_LIMIT ||
    key.usageQuanta +
      key.limitRemainingQuanta !==
      key.limitQuanta ||
    key.limitRemainingQuanta <
      MAXIMUM_SELECTION_COST ||
    (key.expiresAt !== null &&
      Date.parse(key.expiresAt) <= Date.now())
  ) {
    throw new Error(
      "OpenRouter inference-key financial preflight failed",
    );
  }
}

function toolDefinition() {
  const score = {
    type: "integer",
    minimum: 1,
    maximum: 5,
  };
  const voiceProperties: JsonRecord = {
    voice_label: {
      type: "string",
      enum: VOICE_LABELS,
    },
  };
  for (const field of SCORE_FIELDS) {
    voiceProperties[field] = score;
  }
  Object.assign(voiceProperties, {
    ai_pronunciation_correct: {
      type: "boolean",
    },
    selected_ai_alias: {
      type: "string",
      enum: ALIAS_IDS,
    },
    tenxpros_correct: { type: "boolean" },
    acronyms_correct: { type: "boolean" },
    unacceptable_fatigue: { type: "boolean" },
    critical_pronunciation_defect: {
      type: "boolean",
    },
    critical_defects: {
      type: "array",
      items: { type: "string" },
      maxItems: 8,
    },
    summary: {
      type: "string",
      minLength: 1,
      maxLength: 1_200,
    },
  });
  return {
    type: "function",
    function: {
      name: OPENROUTER_PAID_JUDGE_TOOL_NAME,
      description:
        "Submit exactly one independent blind ElevenLabs voice evaluation.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          perspective_id: {
            type: "string",
            enum: Object.keys(PERSPECTIVES),
          },
          voice_evaluations: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              properties: voiceProperties,
              required: Object.keys(
                voiceProperties,
              ),
            },
          },
          preferred_voice: {
            type: "string",
            enum: VOICE_LABELS,
          },
          preference_reason: {
            type: "string",
            minLength: 1,
            maxLength: 1_200,
          },
          confidence: {
            type: "integer",
            minimum: 1,
            maximum: 5,
          },
        },
        required: [
          "perspective_id",
          "voice_evaluations",
          "preferred_voice",
          "preference_reason",
          "confidence",
        ],
      },
    },
  };
}

function parseJudge(
  payload: string,
  perspectiveId: PerspectiveId,
): JudgeResult {
  const parsed = JSON.parse(payload) as unknown;
  if (
    !isRecord(parsed) ||
    parsed.perspective_id !== perspectiveId ||
    !Array.isArray(parsed.voice_evaluations) ||
    parsed.voice_evaluations.length !== 3 ||
    !VOICE_LABELS.includes(
      parsed.preferred_voice as VoiceLabel,
    ) ||
    typeof parsed.preference_reason !== "string" ||
    parsed.preference_reason.length === 0 ||
    !Number.isInteger(parsed.confidence) ||
    Number(parsed.confidence) < 1 ||
    Number(parsed.confidence) > 5
  ) {
    throw new Error("Judge envelope is invalid");
  }
  const seen = new Set<string>();
  for (const value of parsed.voice_evaluations) {
    if (
      !isRecord(value) ||
      !VOICE_LABELS.includes(
        value.voice_label as VoiceLabel,
      ) ||
      seen.has(String(value.voice_label))
    ) {
      throw new Error(
        "Judge voice labels are invalid",
      );
    }
    seen.add(String(value.voice_label));
    for (const field of SCORE_FIELDS) {
      if (
        !Number.isInteger(value[field]) ||
        Number(value[field]) < 1 ||
        Number(value[field]) > 5
      ) {
        throw new Error(
          `${String(field)} must be an integer from 1 to 5`,
        );
      }
    }
    for (const field of [
      "ai_pronunciation_correct",
      "tenxpros_correct",
      "acronyms_correct",
      "unacceptable_fatigue",
      "critical_pronunciation_defect",
    ]) {
      if (typeof value[field] !== "boolean") {
        throw new Error(
          `${field} must be boolean`,
        );
      }
    }
    if (
      !ALIAS_IDS.includes(
        value.selected_ai_alias as AliasId,
      ) ||
      !Array.isArray(value.critical_defects) ||
      !value.critical_defects.every(
        (item) =>
          typeof item === "string" &&
          item.length > 0,
      ) ||
      typeof value.summary !== "string" ||
      value.summary.length === 0
    ) {
      throw new Error(
        "Judge pronunciation or summary fields are invalid",
      );
    }
  }
  if (seen.size !== 3) {
    throw new Error(
      "Judge result must cover all three voices",
    );
  }
  return parsed as unknown as JudgeResult;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort(
    (left, right) => left - right,
  );
  return sorted[Math.floor(sorted.length / 2)]!;
}

function aggregate(
  results: readonly JudgeResult[],
) {
  const voices = VOICE_LABELS.map((label) => {
    const evaluations = results.map(
      (result) =>
        result.voice_evaluations.find(
          (value) => value.voice_label === label,
        )!,
    );
    const preferenceVotes = results.filter(
      (result) =>
        result.preferred_voice === label,
    ).length;
    const aliases = ALIAS_IDS.map((alias) => ({
      alias,
      votes: evaluations.filter(
        (value) =>
          value.selected_ai_alias === alias,
      ).length,
      medianNaturalness: median(
        evaluations
          .filter(
            (value) =>
              value.selected_ai_alias === alias,
          )
          .map(
            (value) =>
              value.selected_ai_alias_naturalness,
          ),
      ),
    })).sort(
      (left, right) =>
        right.votes - left.votes ||
        right.medianNaturalness -
          left.medianNaturalness ||
        ALIAS_IDS.indexOf(left.alias) -
          ALIAS_IDS.indexOf(right.alias),
    );
    const selectedAlias = aliases[0]!;
    const metrics = Object.fromEntries(
      SCORE_FIELDS.filter(
        (field) =>
          field !==
          "selected_ai_alias_naturalness",
      ).map((field) => [
        field,
        median(
          evaluations.map((value) => value[field]),
        ),
      ]),
    );
    const aiCorrectVotes = evaluations.filter(
      (value) => value.ai_pronunciation_correct,
    ).length;
    const criticalPronunciationVotes =
      evaluations.filter(
        (value) =>
          value.critical_pronunciation_defect,
      ).length;
    const fatigueVotes = evaluations.filter(
      (value) => value.unacceptable_fatigue,
    ).length;
    const passes =
      preferenceVotes >= 3 &&
      aiCorrectVotes >= 3 &&
      criticalPronunciationVotes < 3 &&
      fatigueVotes < 3 &&
      Number(metrics.naturalness) >= 4 &&
      Number(metrics.clarity) >= 4 &&
      Number(metrics.professional_quality) >= 4 &&
      Number(metrics.long_form_suitability) >= 4;
    return {
      voiceLabel: label,
      preferenceVotes,
      preferencePercentage:
        results.length === 0
          ? 0
          : (preferenceVotes * 100) /
            results.length,
      aiCorrectVotes,
      criticalPronunciationVotes,
      unacceptableFatigueVotes: fatigueVotes,
      selectedAiAlias: selectedAlias.alias,
      selectedAiAliasVotes: selectedAlias.votes,
      aliasRanking: aliases,
      medians: metrics,
      passes,
      judgeSummaries: evaluations.map(
        (value, index) => ({
          perspectiveId:
            results[index]!.perspective_id,
          summary: value.summary,
          criticalDefects:
            value.critical_defects,
        }),
      ),
    };
  });
  const passing = voices
    .filter((voice) => voice.passes)
    .sort(
      (left, right) =>
        right.preferenceVotes -
          left.preferenceVotes ||
        Number(
          right.medians.long_form_suitability,
        ) -
          Number(
            left.medians.long_form_suitability,
          ) ||
        Number(right.medians.comfort) -
          Number(left.medians.comfort) ||
        Number(
          right.medians.pronunciation_consistency,
        ) -
          Number(
            left.medians
              .pronunciation_consistency,
          ),
    );
  return {
    perspectiveCount: results.length,
    voices,
    selectedVoiceLabel:
      passing[0]?.voiceLabel ?? null,
    selectedAiAlias:
      passing[0]?.selectedAiAlias ?? null,
    decision:
      results.length !== 5
        ? "INCONCLUSIVE"
        : passing.length === 0
          ? "NO_ELEVENLABS_VOICE_PASSED"
          : "VOICE_PASSED",
  };
}

function safeProvider(rawBody: string): string | null {
  try {
    const value = JSON.parse(rawBody) as unknown;
    if (
      isRecord(value) &&
      typeof value.provider === "string"
    ) {
      return value.provider;
    }
  } catch {
    return null;
  }
  return null;
}

function audioTokens(rawBody: string): number | null {
  try {
    const value = JSON.parse(rawBody) as unknown;
    if (!isRecord(value) || !isRecord(value.usage))
      return null;
    const details =
      value.usage.prompt_tokens_details;
    if (
      isRecord(details) &&
      Number.isSafeInteger(details.audio_tokens)
    ) {
      return Number(details.audio_tokens);
    }
    if (
      Number.isSafeInteger(value.usage.audio_tokens)
    ) {
      return Number(value.usage.audio_tokens);
    }
  } catch {
    return null;
  }
  return null;
}

async function auditionSamples(): Promise<{
  result: AuditionResult;
  samples: readonly (AuditionSample & {
    absolutePath: string;
    sizeBytes: number;
    sha256: string;
  })[];
}> {
  const result = JSON.parse(
    await readFile(AUDITION_RESULT_PATH, "utf8"),
  ) as AuditionResult;
  if (
    result.resultHash !==
      "0877bc1764214cd2347e61dde8800959bc1527b1b57f38ec24899d5efa7aab00" ||
    !Array.isArray(result.results) ||
    result.results.length !== 12
  ) {
    throw new Error(
      "Frozen audition result changed",
    );
  }
  const samples = [];
  for (const sample of result.results) {
    const absolutePath = resolve(
      AUDITION_ROOT,
      sample.outputRelativePath,
    );
    const bytes = await readFile(absolutePath);
    const checksum = sha256(bytes);
    if (
      checksum !== sample.generatedAudioChecksum ||
      checksum !== sample.audit.fileSha256 ||
      bytes.length !== sample.audit.fileBytes
    ) {
      throw new Error(
        `Frozen audition audio changed: ${sample.ordinal}`,
      );
    }
    samples.push({
      ...sample,
      absolutePath,
      sizeBytes: bytes.length,
      sha256: checksum,
    });
  }
  return { result, samples };
}

function requestText(
  perspectiveId: PerspectiveId,
): {
  system: string;
  instruction: string;
} {
  const lens = PERSPECTIVES[perspectiveId];
  return {
    system: `You are one independent blind audio judge acting as an ${lens.title}. Your focus is ${lens.focus}. You receive three anonymous candidate narrators called Voice A, Voice B, and Voice C. You have no voice identity or provider metadata, no private mapping, and no other judge's result. Listen to the complete supplied audio at normal 1.0x playback. Judge only audible evidence. Do not infer identities.`,
    instruction: `Select a production narrator for professional Academy lessons lasting 15 to 30 minutes.

For each neutral voice, the first clip is the same full Golden Audition: real Academy prose containing headings, paragraph transitions, ordered-list material, a table row, a form description, a dense rules passage, a callout, AI, Ten X, Ten X Pro, Ten X Pros, B to B, B to C, C E O, and an SME expansion. The following three short clips use alternative written renderings for the term AI:
- a_i_space means "A I"
- a_i_periods means "A. I."
- ay_eye means "ay eye"

Evaluate the actual audio for naturalness; AI and brand pronunciation; acronym pronunciation; sentence and paragraph flow; heading separation; list pacing; table clarity; dense-passage clarity; professional quality; comfort; long-form suitability; fatigue; and consistency.

Choose the best AI alias separately for each voice from the three supplied micro-clips. ai_pronunciation_correct means the chosen alias is clearly pronounced as the two English letter names with no unnatural pause. A critical defect is a major audible pronunciation, clipping, truncation, duplication, discontinuity, or acoustic failure—not a minor preference. Give integer scores from 1 to 5. Set unacceptable_fatigue true only when the voice would be unsuitable for sustained professional listening. Submit exactly one ${OPENROUTER_PAID_JUDGE_TOOL_NAME} call for perspective ${perspectiveId}.`,
  };
}

async function buildBody(
  perspectiveId: PerspectiveId,
  samples: readonly (AuditionSample & {
    absolutePath: string;
  })[],
) {
  const text = requestText(perspectiveId);
  const content: JsonRecord[] = [
    { type: "text", text: text.instruction },
  ];
  for (const label of VOICE_LABELS) {
    const voiceSamples = samples
      .filter(
        (sample) =>
          sample.neutralLabel === label,
      )
      .sort((left, right) => {
        const leftOrder =
          left.kind === "GOLDEN_AUDITION"
            ? -1
            : ALIAS_IDS.indexOf(left.aliasId!);
        const rightOrder =
          right.kind === "GOLDEN_AUDITION"
            ? -1
            : ALIAS_IDS.indexOf(right.aliasId!);
        return leftOrder - rightOrder;
      });
    for (const sample of voiceSamples) {
      const sampleName =
        sample.kind === "GOLDEN_AUDITION"
          ? "complete Golden Audition"
          : `AI alias ${sample.aliasId}`;
      content.push({
        type: "text",
        text: `${label} — ${sampleName}:`,
      });
      const bytes = await readFile(
        sample.absolutePath,
      );
      content.push({
        type: "input_audio",
        input_audio: {
          data: bytes.toString("base64"),
          format: "mp3",
        },
      });
    }
  }
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
      { role: "system", content: text.system },
      { role: "user", content },
    ],
    tools: [toolDefinition()],
    tool_choice: {
      type: "function",
      function: {
        name: OPENROUTER_PAID_JUDGE_TOOL_NAME,
      },
    },
  };
  return {
    body,
    serialized: JSON.stringify(body),
    redacted: {
      ...body,
      messages: [
        body.messages[0],
        {
          role: "user",
          content: content.map((part) =>
            part.type === "input_audio"
              ? {
                  type: "input_audio",
                  input_audio: {
                    data: "[OMITTED_AUDIO]",
                    format: "mp3",
                  },
                }
              : part,
          ),
        },
      ],
    },
  };
}

let ledgerSequence = 0;
let ledgerPriorHash = GENESIS_HASH;

async function ledger(
  planHash: string,
  event: string,
  data: JsonRecord,
): Promise<void> {
  const core = {
    schemaVersion:
      "tenxpros-elevenlabs-voice-selection-ledger-v1",
    sequence: ledgerSequence + 1,
    timestamp: new Date().toISOString(),
    planHash,
    priorHash: ledgerPriorHash,
    event,
    data,
  };
  const eventHash = sha256(canonical(core));
  await appendRestricted(
    LEDGER_PATH,
    `${canonical({ ...core, eventHash })}\n`,
  );
  ledgerSequence += 1;
  ledgerPriorHash = eventHash;
}

async function prepare(): Promise<void> {
  const secret = await loadSecret();
  const { result, samples } =
    await auditionSamples();
  const keyResponse = await fetchText({
    url: KEY_ENDPOINT,
    method: "GET",
    secret,
    timeoutMilliseconds: 30_000,
  });
  if (!keyResponse.ok) {
    throw new Error(
      `/key returned HTTP ${keyResponse.status}`,
    );
  }
  const key = parseOpenRouterKeyUsage(
    keyResponse.rawBody,
  );
  assertKey(key);
  const modelResponse = await fetchText({
    url: MODELS_ENDPOINT,
    method: "GET",
    secret,
    timeoutMilliseconds: 45_000,
  });
  if (!modelResponse.ok) {
    throw new Error(
      `/models returned HTTP ${modelResponse.status}`,
    );
  }
  const model = parsePiperPanelV2ModelCatalog(
    modelResponse.rawBody,
  );
  const totalDurationSeconds = samples.reduce(
    (sum, sample) =>
      sum + sample.audit.durationSeconds,
    0,
  );
  const estimatedAudioTokens = Math.ceil(
    (totalDurationSeconds * 1_000) / 60,
  );
  const baseEstimate =
    BigInt(estimatedAudioTokens) *
      model.pricing.audioQuantaPerToken +
    2_000n *
      model.pricing.promptQuantaPerToken +
    BigInt(MAXIMUM_COMPLETION_TOKENS) *
      model.pricing.completionQuantaPerToken;
  const conservativeEstimate =
    (baseEstimate * 11_250n + 9_999n) /
    10_000n;
  if (
    conservativeEstimate >
      MAXIMUM_REQUEST_COST ||
    conservativeEstimate * 5n >
      MAXIMUM_SELECTION_COST
  ) {
    throw new Error(
      "Conservative five-judge estimate exceeds USD 3",
    );
  }
  const planCore = {
    schemaVersion:
      "tenxpros-elevenlabs-blind-voice-selection-plan-v1",
    provider: "OpenRouter",
    model: MODEL,
    auditionResultHash: result.resultHash,
    auditionPlanHash: result.planHash,
    inputSamples: samples.map((sample) => ({
      ordinal: sample.ordinal,
      neutralLabel: sample.neutralLabel,
      kind: sample.kind,
      aliasId: sample.aliasId,
      transcriptSha256:
        sample.transcriptSha256,
      path: relative(
        REPOSITORY_ROOT,
        sample.absolutePath,
      ),
      sha256: sample.sha256,
      sizeBytes: sample.sizeBytes,
      durationSeconds:
        sample.audit.durationSeconds,
    })),
    blindLabels: VOICE_LABELS,
    privateMappingExcluded: true,
    perspectives: Object.entries(
      PERSPECTIVES,
    ).map(([perspectiveId, value]) => ({
      perspectiveId,
      ...value,
    })),
    requestCount: 5,
    audioInputsPerRequest: 12,
    forcedToolCall: true,
    responseFormatOmitted: true,
    automaticRetries: 0,
    maximumCompletionTokens:
      MAXIMUM_COMPLETION_TOKENS,
    maximumAdditionalCostUsd:
      formatUsdQuanta(MAXIMUM_SELECTION_COST),
    maximumUncertainCostPerRequestUsd:
      formatUsdQuanta(MAXIMUM_REQUEST_COST),
    estimatedMaximumCostPerRequestUsd:
      formatUsdQuanta(conservativeEstimate),
    estimatedMaximumTotalCostUsd:
      formatUsdQuanta(
        conservativeEstimate * 5n,
      ),
    actualCostAuthority: "OpenRouter usage.cost",
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
    toolSchemaSha256: sha256(
      canonical(toolDefinition()),
    ),
    promptHashes: Object.fromEntries(
      (
        Object.keys(PERSPECTIVES) as PerspectiveId[]
      ).map((id) => [
        id,
        sha256(canonical(requestText(id))),
      ]),
    ),
  };
  const planHash = sha256(canonical(planCore));
  await ensurePrivateDirectory(
    OUTPUT_ROOT,
    true,
  );
  for (const name of [
    "raw-responses",
    "redacted-requests",
    "normalized-responses",
    "metadata",
  ]) {
    await ensurePrivateDirectory(
      resolve(OUTPUT_ROOT, name),
      true,
    );
  }
  await writeNewRestricted(
    resolve(
      OUTPUT_ROOT,
      "metadata/model-catalog.http-body.json",
    ),
    modelResponse.rawBody,
  );
  await writeNewRestricted(
    resolve(
      OUTPUT_ROOT,
      "metadata/key-preflight.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-openrouter-key-preflight-v1",
        ...keySummary(key),
        rawResponseSha256: sha256(
          keyResponse.rawBody,
        ),
      },
      null,
      2,
    )}\n`,
  );
  await writeNewRestricted(
    PLAN_PATH,
    `${JSON.stringify(
      { ...planCore, planHash },
      null,
      2,
    )}\n`,
  );
  console.log(
    JSON.stringify({
      status: "VOICE_SELECTION_PLAN_READY",
      planHash,
      requestCount: 5,
      estimatedMaximumTotalCostUsd:
        formatUsdQuanta(
          conservativeEstimate * 5n,
        ),
      key: keySummary(key),
    }),
  );
}

async function execute(): Promise<void> {
  const secret = await loadSecret();
  const plan = JSON.parse(
    await readFile(PLAN_PATH, "utf8"),
  ) as JsonRecord;
  const planHash = String(plan.planHash);
  const { planHash: ignored, ...planCore } =
    plan;
  void ignored;
  if (
    planHash !== sha256(canonical(planCore))
  ) {
    throw new Error(
      "Voice-selection plan hash changed",
    );
  }
  const { samples } = await auditionSamples();
  const frozenSamples = plan.inputSamples;
  if (
    !Array.isArray(frozenSamples) ||
    frozenSamples.length !== samples.length ||
    samples.some((sample, index) => {
      const frozen = frozenSamples[index];
      return (
        !isRecord(frozen) ||
        frozen.sha256 !== sample.sha256 ||
        frozen.sizeBytes !== sample.sizeBytes
      );
    })
  ) {
    throw new Error(
      "Frozen audio bindings changed",
    );
  }
  const keyResponse = await fetchText({
    url: KEY_ENDPOINT,
    method: "GET",
    secret,
    timeoutMilliseconds: 30_000,
  });
  if (!keyResponse.ok) {
    throw new Error(
      `/key returned HTTP ${keyResponse.status}`,
    );
  }
  const initialKey = parseOpenRouterKeyUsage(
    keyResponse.rawBody,
  );
  assertKey(initialKey);
  await writeNewRestricted(
    resolve(
      OUTPUT_ROOT,
      "metadata/key-before-execution.json",
    ),
    `${JSON.stringify(
      {
        ...keySummary(initialKey),
        rawResponseSha256: sha256(
          keyResponse.rawBody,
        ),
      },
      null,
      2,
    )}\n`,
  );
  await ledger(planHash, "EXECUTION_STARTED", {
    key: keySummary(initialKey),
    maximumAdditionalCostUsd:
      formatUsdQuanta(MAXIMUM_SELECTION_COST),
    maximumRequests: 5,
  });
  let actualCost = 0n;
  let uncertainCost = 0n;
  let requestCount = 0;
  const attempts: JsonRecord[] = [];
  const validResults: JudgeResult[] = [];
  for (const perspectiveId of Object.keys(
    PERSPECTIVES,
  ) as PerspectiveId[]) {
    if (
      actualCost +
        uncertainCost +
        MAXIMUM_REQUEST_COST >
        MAXIMUM_SELECTION_COST ||
      requestCount >= 5
    ) {
      await ledger(
        planHash,
        "FINANCIAL_GATE_STOP",
        {
          actualCostUsd:
            formatUsdQuanta(actualCost),
          uncertainCostUsd:
            formatUsdQuanta(uncertainCost),
          nextMaximumCostUsd:
            formatUsdQuanta(
              MAXIMUM_REQUEST_COST,
            ),
        },
      );
      break;
    }
    const ordinal = requestCount + 1;
    const built = await buildBody(
      perspectiveId,
      samples,
    );
    const stem = `${String(ordinal).padStart(
      2,
      "0",
    )}-${perspectiveId}`;
    await writeNewRestricted(
      resolve(
        OUTPUT_ROOT,
        `redacted-requests/${stem}.json`,
      ),
      `${JSON.stringify(built.redacted, null, 2)}\n`,
    );
    await ledger(planHash, "REQUEST_RESERVED", {
      ordinal,
      perspectiveId,
      requestBodySha256: sha256(
        built.serialized,
      ),
      audioInputCount: 12,
      actualCostBeforeUsd:
        formatUsdQuanta(actualCost),
      uncertainCostBeforeUsd:
        formatUsdQuanta(uncertainCost),
      reservedMaximumUsd:
        formatUsdQuanta(MAXIMUM_REQUEST_COST),
      automaticRetry: false,
    });
    requestCount += 1;
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
      uncertainCost += MAXIMUM_REQUEST_COST;
      const exactError =
        error instanceof Error
          ? error.message
          : String(error);
      attempts.push({
        ordinal,
        perspectiveId,
        httpStatus: null,
        valid: false,
        actualCostUsd: null,
        exactError,
        accounting: "UNCERTAIN_PAID",
      });
      await ledger(planHash, "UNCERTAIN_PAID", {
        ordinal,
        perspectiveId,
        reservedMaximumUsd:
          formatUsdQuanta(
            MAXIMUM_REQUEST_COST,
          ),
        retryProhibited: true,
        exactError,
      });
      continue;
    }
    const rawPath = resolve(
      OUTPUT_ROOT,
      `raw-responses/${stem}.http-body.json`,
    );
    await writeNewRestricted(
      rawPath,
      response.rawBody,
    );
    const rawResponseSha256 = sha256(
      response.rawBody,
    );
    await ledger(
      planHash,
      "RAW_RESPONSE_PERSISTED_BEFORE_PARSE",
      {
        ordinal,
        perspectiveId,
        httpStatus: response.status,
        path: relative(
          REPOSITORY_ROOT,
          rawPath,
        ),
        sha256: rawResponseSha256,
        bytes: Buffer.byteLength(
          response.rawBody,
        ),
      },
    );
    if (response.status === 402) {
      attempts.push({
        ordinal,
        perspectiveId,
        httpStatus: 402,
        valid: false,
        actualCostUsd: null,
        accounting: "HTTP_402_FAIL_CLOSED",
      });
      await ledger(
        planHash,
        "HTTP_402_FAIL_CLOSED",
        { ordinal, perspectiveId },
      );
      break;
    }
    if (!response.ok) {
      uncertainCost += MAXIMUM_REQUEST_COST;
      attempts.push({
        ordinal,
        perspectiveId,
        httpStatus: response.status,
        valid: false,
        actualCostUsd: null,
        accounting: "UNCERTAIN_PAID",
      });
      await ledger(planHash, "UNCERTAIN_PAID", {
        ordinal,
        perspectiveId,
        httpStatus: response.status,
        reservedMaximumUsd:
          formatUsdQuanta(
            MAXIMUM_REQUEST_COST,
          ),
        retryProhibited: true,
      });
      continue;
    }
    let receipt:
      | ReturnType<
          typeof parseOpenRouterChatCompletionReceipt
        >
      | undefined;
    let parsed: JudgeResult | undefined;
    let exactError: string | null = null;
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
      actualCost +=
        receipt.inlineUsageCostQuanta;
      const payload =
        parseOpenRouterPaidJudgePayload({
          rawBody: response.rawBody,
          mode: "FORCED_TOOL_CALL",
        });
      parsed = parseJudge(
        payload.payload,
        perspectiveId,
      );
      validResults.push(parsed);
      await writeNewRestricted(
        resolve(
          OUTPUT_ROOT,
          `normalized-responses/${stem}.json`,
        ),
        `${JSON.stringify(parsed, null, 2)}\n`,
      );
    } catch (error) {
      exactError =
        error instanceof Error
          ? error.message
          : String(error);
      if (
        receipt?.inlineUsageCostQuanta ===
          null ||
        receipt === undefined
      ) {
        uncertainCost += MAXIMUM_REQUEST_COST;
      }
    }
    const attempt = {
      ordinal,
      perspectiveId,
      httpStatus: response.status,
      responseId:
        receipt?.generationId ?? null,
      rawResponseSha256,
      actualCostUsd:
        receipt?.inlineUsageCostUsd ?? null,
      promptTokens:
        receipt?.promptTokens ?? null,
      completionTokens:
        receipt?.completionTokens ?? null,
      audioTokens: audioTokens(
        response.rawBody,
      ),
      provider: safeProvider(
        response.rawBody,
      ),
      valid: parsed !== undefined,
      exactError,
      accounting:
        receipt?.inlineUsageCostUsd !== null &&
        receipt?.inlineUsageCostUsd !==
          undefined
          ? "usage.cost"
          : "UNCERTAIN_PAID",
    };
    attempts.push(attempt);
    await ledger(
      planHash,
      parsed
        ? "VALID_JUDGE_RESULT"
        : "INVALID_JUDGE_RESULT",
      attempt,
    );
  }
  const aggregateResult = aggregate(validResults);
  const finalKeyResponse = await fetchText({
    url: KEY_ENDPOINT,
    method: "GET",
    secret,
    timeoutMilliseconds: 30_000,
  });
  if (!finalKeyResponse.ok) {
    throw new Error(
      `Final /key returned HTTP ${finalKeyResponse.status}`,
    );
  }
  const finalKey = parseOpenRouterKeyUsage(
    finalKeyResponse.rawBody,
  );
  assertKey(finalKey);
  await writeNewRestricted(
    resolve(
      OUTPUT_ROOT,
      "metadata/key-after-execution.json",
    ),
    `${JSON.stringify(
      {
        ...keySummary(finalKey),
        rawResponseSha256: sha256(
          finalKeyResponse.rawBody,
        ),
      },
      null,
      2,
    )}\n`,
  );
  const resultCore = {
    schemaVersion:
      "tenxpros-elevenlabs-blind-voice-selection-result-v1",
    planHash,
    requestCount,
    actualCostUsd: formatUsdQuanta(
      actualCost,
    ),
    uncertainCostUsd: formatUsdQuanta(
      uncertainCost,
    ),
    costAuthority: "OpenRouter usage.cost",
    keyUsageBeforeUsd:
      initialKey.usageUsd,
    keyUsageAfterUsd: finalKey.usageUsd,
    keyUsageDeltaUsd: formatUsdQuanta(
      finalKey.usageQuanta -
        initialKey.usageQuanta,
    ),
    attempts,
    validPerspectives: validResults.map(
      (value) => value.perspective_id,
    ),
    aggregate: aggregateResult,
  };
  const resultHash = sha256(
    canonical(resultCore),
  );
  await writeNewRestricted(
    RESULT_PATH,
    `${JSON.stringify(
      { ...resultCore, resultHash },
      null,
      2,
    )}\n`,
  );
  await ledger(planHash, "EXECUTION_COMPLETED", {
    requestCount,
    actualCostUsd:
      formatUsdQuanta(actualCost),
    uncertainCostUsd:
      formatUsdQuanta(uncertainCost),
    validPerspectiveCount:
      validResults.length,
    decision: aggregateResult.decision,
    selectedVoiceLabel:
      aggregateResult.selectedVoiceLabel,
    selectedAiAlias:
      aggregateResult.selectedAiAlias,
    resultHash,
  });
  console.log(
    JSON.stringify({
      status: aggregateResult.decision,
      planHash,
      resultHash,
      requestCount,
      validPerspectiveCount:
        validResults.length,
      actualCostUsd:
        formatUsdQuanta(actualCost),
      uncertainCostUsd:
        formatUsdQuanta(uncertainCost),
      selectedVoiceLabel:
        aggregateResult.selectedVoiceLabel,
      selectedAiAlias:
        aggregateResult.selectedAiAlias,
    }),
  );
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "prepare") {
    await prepare();
  } else if (command === "execute") {
    await execute();
  } else {
    throw new Error(
      "Usage: openrouter-elevenlabs-voice-selector.ts <prepare|execute>",
    );
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
