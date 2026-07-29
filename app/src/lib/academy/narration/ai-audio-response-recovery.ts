import { z } from "zod";

import {
  AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION,
  AI_AUDIO_SCORE_DIMENSIONS,
  hashAiValue,
  type AiAudioScoreDimension,
  type AiJudgeResponse,
} from "./ai-audio-evaluation";

export const AI_AUDIO_RECOVERED_RESPONSE_SCHEMA_VERSION =
  "academy-ai-audio-judge-response-v2";
export const AI_AUDIO_RESPONSE_RECOVERY_POLICY_VERSION =
  "academy-ai-audio-response-recovery-v1";

export const AI_AUDIO_PRONUNCIATION_SEVERITIES = Object.freeze([
  "none",
  "minor",
  "moderate",
  "major",
  "critical",
] as const);

export type AiAudioPronunciationSeverity =
  (typeof AI_AUDIO_PRONUNCIATION_SEVERITIES)[number];

export const AI_AUDIO_SEVERITY_SYNONYMS = Object.freeze({
  none: "none",
  "no issue": "none",
  no_issue: "none",
  low: "minor",
  slight: "minor",
  mild: "minor",
  minor: "minor",
  medium: "moderate",
  moderate: "moderate",
  high: "major",
  serious: "major",
  major: "major",
  severe: "critical",
  critical: "critical",
} satisfies Readonly<Record<string, AiAudioPronunciationSeverity>>);

const choiceValues = ["A", "B", "tie"] as const;
type AiAudioPresentationChoice = (typeof choiceValues)[number];

const scoreSchema = z.number().int().min(1).max(5);
const textSchema = z.string().min(1).max(1_000);
const longFormRecommendationSchema = z
  .string()
  .trim()
  .min(20)
  .max(1_000)
  .refine(
    (value) => !/^(?:A|B|tie)$/iu.test(value),
    "Overall long-form recommendation must be prose, not a presentation-position label",
  );
const pairIdSchema = z.string().trim().min(1).max(100);

const scoresSchema = z
  .object({
    naturalness: scoreSchema,
    pause_quality: scoreSchema,
    pronunciation: scoreSchema,
    clarity: scoreSchema,
    listening_comfort: scoreSchema,
    professional_quality: scoreSchema,
    long_form_suitability: scoreSchema,
  })
  .strict();

export const aiAudioRecoveredJudgeResponseSchema = z
  .object({
    judge_metadata: z
      .object({
        assignment_id: z.string().trim().min(1).max(100),
        judge_id: z.string().regex(/^judge-0[1-5]$/u),
        evidence_basis: z.literal("AUDIO_ONLY"),
      })
      .strict(),
    file_scores: z
      .array(
        z
          .object({
            pair_id: pairIdSchema,
            version: z.enum(choiceValues.slice(0, 2)),
            scores: scoresSchema,
            evidence_note: textSchema,
          })
          .strict(),
      )
      .length(10),
    pair_evaluations: z
      .array(
        z
          .object({
            pair_id: pairIdSchema,
            preferred_version_overall: z.enum(choiceValues),
            clearer_version: z.enum(choiceValues),
            more_natural_version: z.enum(choiceValues),
            better_paced_version: z.enum(choiceValues),
            long_form_preference: z.enum(choiceValues),
            speed_assessment: z
              .array(
                z
                  .object({
                    version: z.enum(choiceValues.slice(0, 2)),
                    too_slow: z.boolean(),
                    too_fast: z.boolean(),
                  })
                  .strict(),
              )
              .length(2),
            pronunciation_findings: z.array(
              z
                .object({
                  version: z.enum(choiceValues.slice(0, 2)),
                  severity: z.enum(
                    AI_AUDIO_PRONUNCIATION_SEVERITIES,
                  ),
                  description: z.string().min(1).max(500),
                })
                .strict(),
            ),
            audible_distinction: z.enum([
              "CLEAR",
              "SUBTLE",
              "NONE",
            ]),
            confidence: z.number().int().min(0).max(100),
            reason: textSchema,
          })
          .strict(),
      )
      .length(5),
    table_evaluation: z
      .object({
        pair_id: pairIdSchema,
        clearer_version: z.enum(choiceValues),
        repeated_labels_helpful: z.boolean(),
        longer_version: z.enum(choiceValues),
        longer_duration_excessive: z.boolean(),
        clarity_justifies_added_duration: z.boolean(),
        concise_table_variant_recommended: z.boolean(),
        confidence: z.number().int().min(0).max(100),
        reason: textSchema,
      })
      .strict(),
    overall_assessment: z
      .object({
        notes: textSchema,
      })
      .strict(),
    long_form_recommendation:
      longFormRecommendationSchema.optional(),
    confidence: z.number().int().min(0).max(100).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.long_form_recommendation === undefined) !==
      (value.confidence === undefined)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Future overall long-form recommendation and confidence must either both be present or both be absent",
      });
    }
  });

export type AiAudioRecoveredJudgeResponse = z.infer<
  typeof aiAudioRecoveredJudgeResponseSchema
>;

const integerSchema = {
  type: "integer",
} as const;
const choiceJsonSchema = {
  type: "string",
  enum: [...choiceValues],
} as const;
const versionJsonSchema = {
  type: "string",
  enum: ["A", "B"],
} as const;
const scoresJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [...AI_AUDIO_SCORE_DIMENSIONS],
  properties: Object.fromEntries(
    AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      {
        ...integerSchema,
        minimum: 1,
        maximum: 5,
      },
    ]),
  ),
} as const;

/**
 * Strict, blind-safe response schema for any replacement request. "A" and
 * "B" are presentation positions only; source/pipeline identities do not
 * occur in this schema.
 */
export const AI_AUDIO_RECOVERED_RESPONSE_JSON_SCHEMA = Object.freeze({
  type: "object",
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
  properties: {
    judge_metadata: {
      type: "object",
      additionalProperties: false,
      required: [
        "assignment_id",
        "judge_id",
        "evidence_basis",
      ],
      properties: {
        assignment_id: { type: "string" },
        judge_id: {
          type: "string",
          pattern: "^judge-0[1-5]$",
        },
        evidence_basis: {
          type: "string",
          enum: ["AUDIO_ONLY"],
        },
      },
    },
    file_scores: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "pair_id",
          "version",
          "scores",
          "evidence_note",
        ],
        properties: {
          pair_id: { type: "string" },
          version: versionJsonSchema,
          scores: scoresJsonSchema,
          evidence_note: { type: "string" },
        },
      },
    },
    pair_evaluations: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "pair_id",
          "preferred_version_overall",
          "clearer_version",
          "more_natural_version",
          "better_paced_version",
          "long_form_preference",
          "speed_assessment",
          "pronunciation_findings",
          "audible_distinction",
          "confidence",
          "reason",
        ],
        properties: {
          pair_id: { type: "string" },
          preferred_version_overall: choiceJsonSchema,
          clearer_version: choiceJsonSchema,
          more_natural_version: choiceJsonSchema,
          better_paced_version: choiceJsonSchema,
          long_form_preference: choiceJsonSchema,
          speed_assessment: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["version", "too_slow", "too_fast"],
              properties: {
                version: versionJsonSchema,
                too_slow: { type: "boolean" },
                too_fast: { type: "boolean" },
              },
            },
          },
          pronunciation_findings: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "version",
                "severity",
                "description",
              ],
              properties: {
                version: versionJsonSchema,
                severity: {
                  type: "string",
                  enum: [
                    ...AI_AUDIO_PRONUNCIATION_SEVERITIES,
                  ],
                },
                description: { type: "string" },
              },
            },
          },
          audible_distinction: {
            type: "string",
            enum: ["CLEAR", "SUBTLE", "NONE"],
          },
          confidence: {
            ...integerSchema,
            minimum: 0,
            maximum: 100,
          },
          reason: { type: "string" },
        },
      },
    },
    table_evaluation: {
      type: "object",
      additionalProperties: false,
      required: [
        "pair_id",
        "clearer_version",
        "repeated_labels_helpful",
        "longer_version",
        "longer_duration_excessive",
        "clarity_justifies_added_duration",
        "concise_table_variant_recommended",
        "confidence",
        "reason",
      ],
      properties: {
        pair_id: { type: "string" },
        clearer_version: choiceJsonSchema,
        repeated_labels_helpful: { type: "boolean" },
        longer_version: choiceJsonSchema,
        longer_duration_excessive: { type: "boolean" },
        clarity_justifies_added_duration: {
          type: "boolean",
        },
        concise_table_variant_recommended: {
          type: "boolean",
        },
        confidence: {
          ...integerSchema,
          minimum: 0,
          maximum: 100,
        },
        reason: { type: "string" },
      },
    },
    overall_assessment: {
      type: "object",
      additionalProperties: false,
      required: ["notes"],
      properties: {
        notes: { type: "string" },
      },
    },
    long_form_recommendation: {
      type: "string",
      minLength: 20,
      maxLength: 1_000,
      description:
        "A bounded prose recommendation across the full evaluation; never an A/B presentation-position label.",
    },
    confidence: {
      ...integerSchema,
      minimum: 0,
      maximum: 100,
    },
  },
} as const);

export const AI_AUDIO_RECOVERED_RESPONSE_FORMAT = Object.freeze({
  type: "json_schema",
  json_schema: {
    name: "tenxpros_blind_audio_evaluation",
    strict: true,
    schema: AI_AUDIO_RECOVERED_RESPONSE_JSON_SCHEMA,
  },
} as const);

const recoveryPairSchema = z
  .object({
    pairId: z.string().trim().min(1).max(100),
    versionAFileId: z.string().trim().min(1).max(100),
    versionBFileId: z.string().trim().min(1).max(100),
    tableEvaluation: z.boolean(),
  })
  .strict();

const recoveryAssignmentSchema = z
  .object({
    assignmentId: z.string().trim().min(1).max(100),
    judgeId: z.string().regex(/^judge-0[1-5]$/u),
    pairs: z.array(recoveryPairSchema).length(5),
  })
  .strict()
  .superRefine((assignment, context) => {
    if (
      assignment.pairs.filter((pair) => pair.tableEvaluation)
        .length !== 1
    ) {
      context.addIssue({
        code: "custom",
        message: "Exactly one recovery pair must be the table pair",
      });
    }
    const pairIds = assignment.pairs.map((pair) => pair.pairId);
    const fileIds = assignment.pairs.flatMap((pair) => [
      pair.versionAFileId,
      pair.versionBFileId,
    ]);
    if (new Set(pairIds).size !== pairIds.length) {
      context.addIssue({
        code: "custom",
        message: "Recovery pair ids must be unique",
      });
    }
    if (new Set(fileIds).size !== fileIds.length) {
      context.addIssue({
        code: "custom",
        message: "Recovery file ids must be unique",
      });
    }
  });

/**
 * This context intentionally has no source sample id, pipeline identity, or
 * baseline/corrected mapping. A/B mean only first/second presentation slots.
 */
export type AiAudioRecoveryAssignment = z.infer<
  typeof recoveryAssignmentSchema
>;

type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type AiAudioRecoveryNormalizationRule =
  | "COPIED_UNCHANGED"
  | "TRIM_WHITESPACE"
  | "REMOVE_MARKDOWN_JSON_FENCE"
  | "PARSE_JSON_STRING"
  | "RENAME_FIELD"
  | "MOVE_TABLE_EVALUATION_TO_TOP_LEVEL"
  | "NUMERIC_STRING_TO_INTEGER"
  | "VERSION_LABEL_TO_CANONICAL"
  | "NEUTRAL_FILE_LABEL_TO_PRESENTATION_VERSION"
  | "PAIR_FILE_LABEL_TO_PAIR_ID"
  | "LEGACY_SIMILAR_DURATION_TO_TIE"
  | "SEVERITY_SYNONYM_TO_CANONICAL"
  | "LEGACY_TABLE_YES_NO_TO_BOOLEAN"
  | "COMBINED_PERMITTED_NORMALIZATION";

export interface AiAudioRecoveryProvenance {
  originalResponseId: string;
  outputPath: string;
  originalJsonPath: string;
  originalValue: JsonValue;
  normalizedValue: JsonValue;
  normalizationRule: AiAudioRecoveryNormalizationRule;
}

export type AiAudioRecoveryIssueCode =
  | "INVALID_JSON"
  | "INVALID_RECOVERY_CONTEXT"
  | "PRIVATE_MAPPING_INPUT"
  | "UNSUPPORTED_FIELD"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_VALUE"
  | "UNKNOWN_SEVERITY"
  | "UNKNOWN_PRESENTATION_LABEL"
  | "INCOMPLETE_FILE_SCORES"
  | "INCOMPLETE_PAIR_EVALUATIONS"
  | "INVALID_TABLE_EVALUATION"
  | "AUDIO_EVIDENCE_MISSING"
  | "MISSING_FIELD_PROVENANCE"
  | "SCHEMA_INVALID";

export interface AiAudioRecoveryIssue {
  code: AiAudioRecoveryIssueCode;
  path: string;
  message: string;
}

export type AiAudioRecoveryResult =
  | {
      valid: true;
      originalResponseId: string;
      response: AiAudioRecoveredJudgeResponse;
      responseHash: string;
      provenance: readonly AiAudioRecoveryProvenance[];
      issues: readonly [];
    }
  | {
      valid: false;
      originalResponseId: string;
      response: null;
      responseHash: null;
      provenance: readonly AiAudioRecoveryProvenance[];
      issues: readonly AiAudioRecoveryIssue[];
    };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        toJsonValue(item),
      ]),
    );
  }
  return String(value);
}

function containsPrivateMappingKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsPrivateMappingKey);
  }
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, item]) =>
      /(?:sourceSample|sourcePair|pipeline|baseline|corrected|private|mapping)/iu.test(
        key,
      ) || containsPrivateMappingKey(item),
  );
}

interface RecoveryState {
  responseId: string;
  assignment: AiAudioRecoveryAssignment;
  provenance: AiAudioRecoveryProvenance[];
  issues: AiAudioRecoveryIssue[];
}

function issue(
  state: RecoveryState,
  code: AiAudioRecoveryIssueCode,
  path: string,
  message: string,
): void {
  state.issues.push({ code, path, message });
}

function provenance(
  state: RecoveryState,
  outputPath: string,
  originalJsonPath: string,
  originalValue: unknown,
  normalizedValue: unknown,
  normalizationRule: AiAudioRecoveryNormalizationRule,
): void {
  state.provenance.push({
    originalResponseId: state.responseId,
    outputPath,
    originalJsonPath,
    originalValue: toJsonValue(originalValue),
    normalizedValue: toJsonValue(normalizedValue),
    normalizationRule,
  });
}

function assertAllowedKeys(
  state: RecoveryState,
  value: unknown,
  allowed: readonly string[],
  path: string,
): value is UnknownRecord {
  if (!isRecord(value)) {
    issue(state, "INVALID_VALUE", path, "Expected an object");
    return false;
  }
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      issue(
        state,
        "UNSUPPORTED_FIELD",
        `${path}.${key}`,
        "Recovery may not discard or reinterpret an unsupported field",
      );
    }
  }
  return true;
}

function required(
  state: RecoveryState,
  record: UnknownRecord,
  key: string,
  path: string,
): unknown {
  if (!(key in record)) {
    issue(
      state,
      "MISSING_REQUIRED_FIELD",
      `${path}.${key}`,
      "Recovery may not invent a missing field",
    );
    return undefined;
  }
  return record[key];
}

function normalizeString(
  state: RecoveryState,
  value: unknown,
  originalPath: string,
  outputPath: string,
  options: {
    rename?: boolean;
    maximumLength?: number;
  } = {},
): string | null {
  if (typeof value !== "string") {
    issue(state, "INVALID_VALUE", originalPath, "Expected a string");
    return null;
  }
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > (options.maximumLength ?? 1_000)
  ) {
    issue(
      state,
      "INVALID_VALUE",
      originalPath,
      "String is empty or too long",
    );
    return null;
  }
  const changedByTrim = normalized !== value;
  provenance(
    state,
    outputPath,
    originalPath,
    value,
    normalized,
    changedByTrim && options.rename
      ? "COMBINED_PERMITTED_NORMALIZATION"
      : changedByTrim
        ? "TRIM_WHITESPACE"
        : options.rename
          ? "RENAME_FIELD"
          : "COPIED_UNCHANGED",
  );
  return normalized;
}

function normalizeInteger(
  state: RecoveryState,
  value: unknown,
  originalPath: string,
  outputPath: string,
  minimum: number,
  maximum: number,
): number | null {
  let normalized: number;
  let rule: AiAudioRecoveryNormalizationRule;
  if (typeof value === "number" && Number.isInteger(value)) {
    normalized = value;
    rule = "COPIED_UNCHANGED";
  } else if (
    typeof value === "string" &&
    /^[+-]?\d+$/u.test(value.trim())
  ) {
    normalized = Number(value.trim());
    rule =
      value === value.trim()
        ? "NUMERIC_STRING_TO_INTEGER"
        : "COMBINED_PERMITTED_NORMALIZATION";
  } else {
    issue(
      state,
      "INVALID_VALUE",
      originalPath,
      "Expected an unambiguous integer",
    );
    return null;
  }
  if (
    !Number.isSafeInteger(normalized) ||
    normalized < minimum ||
    normalized > maximum
  ) {
    issue(
      state,
      "INVALID_VALUE",
      originalPath,
      `Integer must be between ${String(minimum)} and ${String(maximum)}`,
    );
    return null;
  }
  provenance(
    state,
    outputPath,
    originalPath,
    value,
    normalized,
    rule,
  );
  return normalized;
}

/**
 * The legacy table object encoded its boolean judgments with the exact
 * machine values "yes" and "no". Converting those two sentinels is part of
 * structurally moving that existing table object to the corrected top-level
 * shape; it does not interpret prose or accept broader truthy aliases.
 */
function normalizeLegacyTableBoolean(
  state: RecoveryState,
  value: unknown,
  originalPath: string,
  outputPath: string,
): boolean | null {
  if (typeof value === "boolean") {
    provenance(
      state,
      outputPath,
      originalPath,
      value,
      value,
      "COPIED_UNCHANGED",
    );
    return value;
  }
  if (typeof value === "string") {
    const token = value.trim();
    if (token === "yes" || token === "no") {
      const normalized = token === "yes";
      provenance(
        state,
        outputPath,
        originalPath,
        value,
        normalized,
        value === value.trim()
          ? "LEGACY_TABLE_YES_NO_TO_BOOLEAN"
          : "COMBINED_PERMITTED_NORMALIZATION",
      );
      return normalized;
    }
  }
  issue(
    state,
    "INVALID_VALUE",
    originalPath,
    "Expected boolean or unambiguous yes/no",
  );
  return null;
}

function normalizeExactBoolean(
  state: RecoveryState,
  value: unknown,
  originalPath: string,
  outputPath: string,
): boolean | null {
  if (typeof value !== "boolean") {
    issue(state, "INVALID_VALUE", originalPath, "Expected a boolean");
    return null;
  }
  provenance(
    state,
    outputPath,
    originalPath,
    value,
    value,
    "COPIED_UNCHANGED",
  );
  return value;
}

function pairById(
  assignment: AiAudioRecoveryAssignment,
  pairId: string,
): AiAudioRecoveryAssignment["pairs"][number] | null {
  return (
    assignment.pairs.find((pair) => pair.pairId === pairId) ??
    null
  );
}

function pairByFileId(
  assignment: AiAudioRecoveryAssignment,
  fileId: string,
): AiAudioRecoveryAssignment["pairs"][number] | null {
  return (
    assignment.pairs.find(
      (pair) =>
        pair.versionAFileId === fileId ||
        pair.versionBFileId === fileId,
    ) ?? null
  );
}

function normalizeChoice(
  state: RecoveryState,
  value: unknown,
  pair: AiAudioRecoveryAssignment["pairs"][number],
  originalPath: string,
  outputPath: string,
): AiAudioPresentationChoice | null {
  if (typeof value !== "string") {
    issue(
      state,
      "INVALID_VALUE",
      originalPath,
      "Expected an A/B/tie choice",
    );
    return null;
  }
  const trimmed = value.trim();
  let normalized: AiAudioPresentationChoice | null = null;
  let rule: AiAudioRecoveryNormalizationRule =
    "VERSION_LABEL_TO_CANONICAL";
  if (trimmed === pair.versionAFileId) {
    normalized = "A";
    rule = "NEUTRAL_FILE_LABEL_TO_PRESENTATION_VERSION";
  } else if (trimmed === pair.versionBFileId) {
    normalized = "B";
    rule = "NEUTRAL_FILE_LABEL_TO_PRESENTATION_VERSION";
  } else if (trimmed === "A" || trimmed === "Version A") {
    normalized = "A";
  } else if (trimmed === "B" || trimmed === "Version B") {
    normalized = "B";
  } else if (trimmed === "tie") {
    normalized = "tie";
  }
  if (!normalized) {
    issue(
      state,
      "UNKNOWN_PRESENTATION_LABEL",
      originalPath,
      "Choice is not an assigned presentation label or unambiguous A/B/tie value",
    );
    return null;
  }
  const unchanged =
    (value === "A" && normalized === "A") ||
    (value === "B" && normalized === "B") ||
    (value === "tie" && normalized === "tie");
  provenance(
    state,
    outputPath,
    originalPath,
    value,
    normalized,
    unchanged
      ? "COPIED_UNCHANGED"
      : value !== trimmed
        ? "COMBINED_PERMITTED_NORMALIZATION"
        : rule,
  );
  return normalized;
}

function normalizeLongerVersion(
  state: RecoveryState,
  value: unknown,
  pair: AiAudioRecoveryAssignment["pairs"][number],
  originalPath: string,
  outputPath: string,
): AiAudioPresentationChoice | null {
  if (
    typeof value === "string" &&
    value.trim() === "SIMILAR_DURATION"
  ) {
    provenance(
      state,
      outputPath,
      originalPath,
      value,
      "tie",
      value === value.trim()
        ? "LEGACY_SIMILAR_DURATION_TO_TIE"
        : "COMBINED_PERMITTED_NORMALIZATION",
    );
    return "tie";
  }
  return normalizeChoice(
    state,
    value,
    pair,
    originalPath,
    outputPath,
  );
}

function normalizeVersion(
  state: RecoveryState,
  value: unknown,
  pair: AiAudioRecoveryAssignment["pairs"][number],
  originalPath: string,
  outputPath: string,
): "A" | "B" | null {
  const choice = normalizeChoice(
    state,
    value,
    pair,
    originalPath,
    outputPath,
  );
  if (choice === "tie") {
    issue(
      state,
      "INVALID_VALUE",
      originalPath,
      "A file-level value must identify A or B, not a tie",
    );
    return null;
  }
  return choice;
}

function normalizeSeverity(
  state: RecoveryState,
  value: unknown,
  originalPath: string,
  outputPath: string,
): AiAudioPronunciationSeverity | null {
  if (typeof value !== "string") {
    issue(
      state,
      "UNKNOWN_SEVERITY",
      originalPath,
      "Pronunciation severity must be an approved string",
    );
    return null;
  }
  const token = value.trim();
  const normalized =
    AI_AUDIO_SEVERITY_SYNONYMS[
      token as keyof typeof AI_AUDIO_SEVERITY_SYNONYMS
    ];
  if (!normalized) {
    issue(
      state,
      "UNKNOWN_SEVERITY",
      originalPath,
      "Pronunciation severity is not in the approved synonym map",
    );
    return null;
  }
  provenance(
    state,
    outputPath,
    originalPath,
    value,
    normalized,
    value === normalized
      ? "COPIED_UNCHANGED"
      : value !== value.trim()
        ? "COMBINED_PERMITTED_NORMALIZATION"
        : "SEVERITY_SYNONYM_TO_CANONICAL",
  );
  return normalized;
}

function buildScores(
  state: RecoveryState,
  value: unknown,
  originalPath: string,
  outputPath: string,
): Record<AiAudioScoreDimension, number> | null {
  if (
    !assertAllowedKeys(
      state,
      value,
      AI_AUDIO_SCORE_DIMENSIONS,
      originalPath,
    )
  ) {
    return null;
  }
  const result = {} as Record<AiAudioScoreDimension, number>;
  for (const dimension of AI_AUDIO_SCORE_DIMENSIONS) {
    const score = normalizeInteger(
      state,
      required(state, value, dimension, originalPath),
      `${originalPath}.${dimension}`,
      `${outputPath}.${dimension}`,
      1,
      5,
    );
    if (score !== null) result[dimension] = score;
  }
  return Object.keys(result).length ===
    AI_AUDIO_SCORE_DIMENSIONS.length
    ? result
    : null;
}

function parseInput(
  state: RecoveryState,
  response: unknown,
): unknown {
  if (typeof response !== "string") return response;
  const original = response;
  let text = response.trim();
  if (text !== original) {
    provenance(
      state,
      "$",
      "$",
      original,
      text,
      "TRIM_WHITESPACE",
    );
  }
  const fenceMatch =
    /^```(?:json)?[ \t]*\r?\n?([\s\S]*?)\r?\n?```$/iu.exec(text);
  if (fenceMatch) {
    const unfenced = fenceMatch[1]!.trim();
    provenance(
      state,
      "$",
      "$",
      text,
      unfenced,
      "REMOVE_MARKDOWN_JSON_FENCE",
    );
    text = unfenced;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    provenance(
      state,
      "$",
      "$",
      text,
      parsed,
      "PARSE_JSON_STRING",
    );
    return parsed;
  } catch {
    issue(
      state,
      "INVALID_JSON",
      "$",
      "Response is not valid JSON after permitted fence removal",
    );
    return null;
  }
}

function buildMetadataFromOld(
  state: RecoveryState,
  value: UnknownRecord,
): AiAudioRecoveredJudgeResponse["judge_metadata"] | null {
  const assignmentId = normalizeString(
    state,
    required(state, value, "assignment_id", "$"),
    "$.assignment_id",
    "$.judge_metadata.assignment_id",
    { rename: true, maximumLength: 100 },
  );
  const judgeId = normalizeString(
    state,
    required(state, value, "judge_id", "$"),
    "$.judge_id",
    "$.judge_metadata.judge_id",
    { rename: true, maximumLength: 20 },
  );
  const evidenceBasis = normalizeString(
    state,
    required(state, value, "evidence_basis", "$"),
    "$.evidence_basis",
    "$.judge_metadata.evidence_basis",
    { rename: true, maximumLength: 30 },
  );
  if (!assignmentId || !judgeId || !evidenceBasis) return null;
  return {
    assignment_id: assignmentId,
    judge_id: judgeId,
    evidence_basis: evidenceBasis as "AUDIO_ONLY",
  };
}

function buildOldFileScores(
  state: RecoveryState,
  value: unknown,
): AiAudioRecoveredJudgeResponse["file_scores"] {
  if (!Array.isArray(value)) {
    issue(state, "INVALID_VALUE", "$.clips", "Expected an array");
    return [];
  }
  return value.flatMap((item, index) => {
    const originalPath = `$.clips[${String(index)}]`;
    const outputPath = `$.file_scores[${String(index)}]`;
    if (
      !assertAllowedKeys(
        state,
        item,
        ["clip_label", "scores", "evidence_note"],
        originalPath,
      )
    ) {
      return [];
    }
    const rawFileId = required(
      state,
      item,
      "clip_label",
      originalPath,
    );
    if (typeof rawFileId !== "string") {
      issue(
        state,
        "INVALID_VALUE",
        `${originalPath}.clip_label`,
        "Expected a file label",
      );
      return [];
    }
    const fileId = rawFileId.trim();
    const pair = pairByFileId(state.assignment, fileId);
    if (!pair) {
      issue(
        state,
        "UNKNOWN_PRESENTATION_LABEL",
        `${originalPath}.clip_label`,
        "File label is not in the blind presentation context",
      );
      return [];
    }
    provenance(
      state,
      `${outputPath}.pair_id`,
      `${originalPath}.clip_label`,
      rawFileId,
      pair.pairId,
      "PAIR_FILE_LABEL_TO_PAIR_ID",
    );
    const version = normalizeVersion(
      state,
      rawFileId,
      pair,
      `${originalPath}.clip_label`,
      `${outputPath}.version`,
    );
    const scores = buildScores(
      state,
      required(state, item, "scores", originalPath),
      `${originalPath}.scores`,
      `${outputPath}.scores`,
    );
    const evidenceNote = normalizeString(
      state,
      required(state, item, "evidence_note", originalPath),
      `${originalPath}.evidence_note`,
      `${outputPath}.evidence_note`,
      { maximumLength: 1_000 },
    );
    return version && scores && evidenceNote
      ? [
          {
            pair_id: pair.pairId,
            version,
            scores,
            evidence_note: evidenceNote,
          },
        ]
      : [];
  });
}

interface OldPairBuildResult {
  evaluations: AiAudioRecoveredJudgeResponse["pair_evaluations"];
  table: AiAudioRecoveredJudgeResponse["table_evaluation"] | null;
}

function buildOldPairEvaluations(
  state: RecoveryState,
  value: unknown,
): OldPairBuildResult {
  if (!Array.isArray(value)) {
    issue(state, "INVALID_VALUE", "$.pairs", "Expected an array");
    return { evaluations: [], table: null };
  }
  let table: AiAudioRecoveredJudgeResponse["table_evaluation"] | null =
    null;
  const evaluations =
    value.flatMap<AiAudioRecoveredJudgeResponse["pair_evaluations"][number]>(
      (item, index) => {
        const originalPath = `$.pairs[${String(index)}]`;
        const outputPath = `$.pair_evaluations[${String(index)}]`;
        if (
          !assertAllowedKeys(
            state,
            item,
            [
              "pair_label",
              "preferred_version_overall",
              "clearer_version",
              "more_natural_version",
              "better_paced_version",
              "long_lesson_preference",
              "speed_assessment",
              "pronunciation_issues",
              "audible_distinction",
              "confidence",
              "concise_reason",
              "table_evaluation",
            ],
            originalPath,
          )
        ) {
          return [];
        }
        const pairId = normalizeString(
          state,
          required(state, item, "pair_label", originalPath),
          `${originalPath}.pair_label`,
          `${outputPath}.pair_id`,
          { rename: true, maximumLength: 100 },
        );
        if (!pairId) return [];
        const pair = pairById(state.assignment, pairId);
        if (!pair) {
          issue(
            state,
            "UNKNOWN_PRESENTATION_LABEL",
            `${originalPath}.pair_label`,
            "Pair label is not in the blind presentation context",
          );
          return [];
        }
        const choice = (
          oldKey: string,
          newKey: string,
        ): AiAudioPresentationChoice | null =>
          normalizeChoice(
            state,
            required(state, item, oldKey, originalPath),
            pair,
            `${originalPath}.${oldKey}`,
            `${outputPath}.${newKey}`,
          );
        const preferred = choice(
          "preferred_version_overall",
          "preferred_version_overall",
        );
        const clearer = choice(
          "clearer_version",
          "clearer_version",
        );
        const natural = choice(
          "more_natural_version",
          "more_natural_version",
        );
        const paced = choice(
          "better_paced_version",
          "better_paced_version",
        );
        const longForm = choice(
          "long_lesson_preference",
          "long_form_preference",
        );
        const rawSpeeds = required(
          state,
          item,
          "speed_assessment",
          originalPath,
        );
        const speeds = Array.isArray(rawSpeeds)
          ? rawSpeeds.flatMap((speed, speedIndex) => {
              const speedOriginalPath =
                `${originalPath}.speed_assessment[` +
                `${String(speedIndex)}]`;
              const speedOutputPath =
                `${outputPath}.speed_assessment[` +
                `${String(speedIndex)}]`;
              if (
                !assertAllowedKeys(
                  state,
                  speed,
                  ["clip_label", "too_slow", "too_fast"],
                  speedOriginalPath,
                )
              ) {
                return [];
              }
              const version = normalizeVersion(
                state,
                required(
                  state,
                  speed,
                  "clip_label",
                  speedOriginalPath,
                ),
                pair,
                `${speedOriginalPath}.clip_label`,
                `${speedOutputPath}.version`,
              );
              const tooSlow = normalizeExactBoolean(
                state,
                required(
                  state,
                  speed,
                  "too_slow",
                  speedOriginalPath,
                ),
                `${speedOriginalPath}.too_slow`,
                `${speedOutputPath}.too_slow`,
              );
              const tooFast = normalizeExactBoolean(
                state,
                required(
                  state,
                  speed,
                  "too_fast",
                  speedOriginalPath,
                ),
                `${speedOriginalPath}.too_fast`,
                `${speedOutputPath}.too_fast`,
              );
              return version !== null &&
                tooSlow !== null &&
                tooFast !== null
                ? [{ version, too_slow: tooSlow, too_fast: tooFast }]
                : [];
            })
          : [];
        if (!Array.isArray(rawSpeeds)) {
          issue(
            state,
            "INVALID_VALUE",
            `${originalPath}.speed_assessment`,
            "Expected an array",
          );
        }
        const rawPronunciations = required(
          state,
          item,
          "pronunciation_issues",
          originalPath,
        );
        const pronunciations = Array.isArray(rawPronunciations)
          ? rawPronunciations.flatMap(
              (pronunciation, pronunciationIndex) => {
                const pronunciationOriginalPath =
                  `${originalPath}.pronunciation_issues[` +
                  `${String(pronunciationIndex)}]`;
                const pronunciationOutputPath =
                  `${outputPath}.pronunciation_findings[` +
                  `${String(pronunciationIndex)}]`;
                if (
                  !assertAllowedKeys(
                    state,
                    pronunciation,
                    ["clip_label", "severity", "description"],
                    pronunciationOriginalPath,
                  )
                ) {
                  return [];
                }
                const version = normalizeVersion(
                  state,
                  required(
                    state,
                    pronunciation,
                    "clip_label",
                    pronunciationOriginalPath,
                  ),
                  pair,
                  `${pronunciationOriginalPath}.clip_label`,
                  `${pronunciationOutputPath}.version`,
                );
                const severity = normalizeSeverity(
                  state,
                  required(
                    state,
                    pronunciation,
                    "severity",
                    pronunciationOriginalPath,
                  ),
                  `${pronunciationOriginalPath}.severity`,
                  `${pronunciationOutputPath}.severity`,
                );
                const description = normalizeString(
                  state,
                  required(
                    state,
                    pronunciation,
                    "description",
                    pronunciationOriginalPath,
                  ),
                  `${pronunciationOriginalPath}.description`,
                  `${pronunciationOutputPath}.description`,
                  { maximumLength: 500 },
                );
                return version && severity && description
                  ? [{ version, severity, description }]
                  : [];
              },
            )
          : [];
        if (!Array.isArray(rawPronunciations)) {
          issue(
            state,
            "INVALID_VALUE",
            `${originalPath}.pronunciation_issues`,
            "Expected an array",
          );
        }
        const audibleDistinction = normalizeString(
          state,
          required(
            state,
            item,
            "audible_distinction",
            originalPath,
          ),
          `${originalPath}.audible_distinction`,
          `${outputPath}.audible_distinction`,
          { maximumLength: 20 },
        );
        const confidence = normalizeInteger(
          state,
          required(state, item, "confidence", originalPath),
          `${originalPath}.confidence`,
          `${outputPath}.confidence`,
          0,
          100,
        );
        const reason = normalizeString(
          state,
          required(state, item, "concise_reason", originalPath),
          `${originalPath}.concise_reason`,
          `${outputPath}.reason`,
          { rename: true, maximumLength: 1_000 },
        );

        const rawTable = item.table_evaluation;
        if (!pair.tableEvaluation) {
          if (rawTable !== undefined && rawTable !== null) {
            issue(
              state,
              "INVALID_TABLE_EVALUATION",
              `${originalPath}.table_evaluation`,
              "A non-table pair may not supply a table evaluation",
            );
          }
        } else if (
          !assertAllowedKeys(
            state,
            rawTable,
            [
              "easier_to_follow",
              "repeated_labels_helpful",
              "longer_clip",
              "longer_duration_excessive",
              "clarity_justifies_added_duration",
              "test_more_concise_table_narration",
            ],
            `${originalPath}.table_evaluation`,
          )
        ) {
          issue(
            state,
            "INVALID_TABLE_EVALUATION",
            `${originalPath}.table_evaluation`,
            "The known table pair requires its table evaluation",
          );
        } else {
          const tableOutputPath = "$.table_evaluation";
          const tableOriginalPath =
            `${originalPath}.table_evaluation`;
          provenance(
            state,
            `${tableOutputPath}.pair_id`,
            `${originalPath}.pair_label`,
            pairId,
            pairId,
            "MOVE_TABLE_EVALUATION_TO_TOP_LEVEL",
          );
          const tableClearer = normalizeChoice(
            state,
            required(
              state,
              rawTable,
              "easier_to_follow",
              tableOriginalPath,
            ),
            pair,
            `${tableOriginalPath}.easier_to_follow`,
            `${tableOutputPath}.clearer_version`,
          );
          const repeatedLabels = normalizeLegacyTableBoolean(
            state,
            required(
              state,
              rawTable,
              "repeated_labels_helpful",
              tableOriginalPath,
            ),
            `${tableOriginalPath}.repeated_labels_helpful`,
            `${tableOutputPath}.repeated_labels_helpful`,
          );
          const longerVersion = normalizeLongerVersion(
            state,
            required(
              state,
              rawTable,
              "longer_clip",
              tableOriginalPath,
            ),
            pair,
            `${tableOriginalPath}.longer_clip`,
            `${tableOutputPath}.longer_version`,
          );
          const excessive = normalizeLegacyTableBoolean(
            state,
            required(
              state,
              rawTable,
              "longer_duration_excessive",
              tableOriginalPath,
            ),
            `${tableOriginalPath}.longer_duration_excessive`,
            `${tableOutputPath}.longer_duration_excessive`,
          );
          const justified = normalizeLegacyTableBoolean(
            state,
            required(
              state,
              rawTable,
              "clarity_justifies_added_duration",
              tableOriginalPath,
            ),
            `${tableOriginalPath}.clarity_justifies_added_duration`,
            `${tableOutputPath}.clarity_justifies_added_duration`,
          );
          const concise = normalizeLegacyTableBoolean(
            state,
            required(
              state,
              rawTable,
              "test_more_concise_table_narration",
              tableOriginalPath,
            ),
            `${tableOriginalPath}.test_more_concise_table_narration`,
            `${tableOutputPath}.concise_table_variant_recommended`,
          );
          if (
            tableClearer &&
            repeatedLabels !== null &&
            longerVersion &&
            excessive !== null &&
            justified !== null &&
            concise !== null &&
            confidence !== null &&
            reason
          ) {
            if (table) {
              issue(
                state,
                "INVALID_TABLE_EVALUATION",
                tableOriginalPath,
                "Only one top-level table evaluation is permitted",
              );
            } else {
              /*
               * The legacy schema attached one confidence and one concise
               * reason to the complete known table-pair judgment rather than
               * duplicating them inside its nested table object. Moving that
               * pair's existing evidence to the single corrected table
               * record preserves the exact values; it does not synthesize a
               * new confidence or infer a reason from prose.
               */
              provenance(
                state,
                `${tableOutputPath}.confidence`,
                `${originalPath}.confidence`,
                item.confidence,
                confidence,
                item.confidence === confidence
                  ? "MOVE_TABLE_EVALUATION_TO_TOP_LEVEL"
                  : "COMBINED_PERMITTED_NORMALIZATION",
              );
              provenance(
                state,
                `${tableOutputPath}.reason`,
                `${originalPath}.concise_reason`,
                item.concise_reason,
                reason,
                item.concise_reason === reason
                  ? "MOVE_TABLE_EVALUATION_TO_TOP_LEVEL"
                  : "COMBINED_PERMITTED_NORMALIZATION",
              );
              table = {
                pair_id: pairId,
                clearer_version: tableClearer,
                repeated_labels_helpful: repeatedLabels,
                longer_version: longerVersion,
                longer_duration_excessive: excessive,
                clarity_justifies_added_duration: justified,
                concise_table_variant_recommended: concise,
                confidence,
                reason,
              };
            }
          }
        }
        if (
          !preferred ||
          !clearer ||
          !natural ||
          !paced ||
          !longForm ||
          speeds.length !== 2 ||
          !audibleDistinction ||
          confidence === null ||
          !reason
        ) {
          return [];
        }
        return [
          {
            pair_id: pair.pairId,
            preferred_version_overall: preferred,
            clearer_version: clearer,
            more_natural_version: natural,
            better_paced_version: paced,
            long_form_preference: longForm,
            speed_assessment: speeds,
            pronunciation_findings: pronunciations,
            audible_distinction:
              audibleDistinction as "CLEAR" | "SUBTLE" | "NONE",
            confidence,
            reason,
          },
        ];
      },
    );
  return { evaluations, table };
}

function buildFromOld(
  state: RecoveryState,
  value: UnknownRecord,
): unknown {
  assertAllowedKeys(
    state,
    value,
    [
      "schema_version",
      "assignment_id",
      "judge_id",
      "evidence_basis",
      "clips",
      "pairs",
      "overall_notes",
    ],
    "$",
  );
  if ("schema_version" in value) {
    const schemaVersion = normalizeString(
      state,
      value.schema_version,
      "$.schema_version",
      "$@source_schema_version",
      { maximumLength: 100 },
    );
    if (!schemaVersion) {
      issue(
        state,
        "INVALID_VALUE",
        "$.schema_version",
        "Invalid source schema version",
      );
    }
  }
  const metadata = buildMetadataFromOld(state, value);
  const files = buildOldFileScores(
    state,
    required(state, value, "clips", "$"),
  );
  const pairs = buildOldPairEvaluations(
    state,
    required(state, value, "pairs", "$"),
  );
  const notes = normalizeString(
    state,
    required(state, value, "overall_notes", "$"),
    "$.overall_notes",
    "$.overall_assessment.notes",
    { rename: true, maximumLength: 1_000 },
  );
  return metadata && pairs.table && notes
    ? {
        judge_metadata: metadata,
        file_scores: files,
        pair_evaluations: pairs.evaluations,
        table_evaluation: pairs.table,
        overall_assessment: { notes },
      }
    : null;
}

function normalizeCorrectedFileScores(
  state: RecoveryState,
  value: unknown,
): AiAudioRecoveredJudgeResponse["file_scores"] {
  if (!Array.isArray(value)) {
    issue(
      state,
      "INVALID_VALUE",
      "$.file_scores",
      "Expected an array",
    );
    return [];
  }
  return value.flatMap((item, index) => {
    const path = `$.file_scores[${String(index)}]`;
    if (
      !assertAllowedKeys(
        state,
        item,
        ["pair_id", "version", "scores", "evidence_note"],
        path,
      )
    ) {
      return [];
    }
    const pairId = normalizeString(
      state,
      required(state, item, "pair_id", path),
      `${path}.pair_id`,
      `${path}.pair_id`,
      { maximumLength: 100 },
    );
    const pair = pairId
      ? pairById(state.assignment, pairId)
      : null;
    if (!pair) {
      issue(
        state,
        "UNKNOWN_PRESENTATION_LABEL",
        `${path}.pair_id`,
        "Pair id is not in the blind presentation context",
      );
      return [];
    }
    const version = normalizeVersion(
      state,
      required(state, item, "version", path),
      pair,
      `${path}.version`,
      `${path}.version`,
    );
    const scores = buildScores(
      state,
      required(state, item, "scores", path),
      `${path}.scores`,
      `${path}.scores`,
    );
    const evidence = normalizeString(
      state,
      required(state, item, "evidence_note", path),
      `${path}.evidence_note`,
      `${path}.evidence_note`,
      { maximumLength: 1_000 },
    );
    return pairId && version && scores && evidence
      ? [
          {
            pair_id: pairId,
            version,
            scores,
            evidence_note: evidence,
          },
        ]
      : [];
  });
}

function normalizeCorrectedPairEvaluations(
  state: RecoveryState,
  value: unknown,
): AiAudioRecoveredJudgeResponse["pair_evaluations"] {
  if (!Array.isArray(value)) {
    issue(
      state,
      "INVALID_VALUE",
      "$.pair_evaluations",
      "Expected an array",
    );
    return [];
  }
  return value.flatMap((item, index) => {
    const path = `$.pair_evaluations[${String(index)}]`;
    if (
      !assertAllowedKeys(
        state,
        item,
        [
          "pair_id",
          "preferred_version_overall",
          "clearer_version",
          "more_natural_version",
          "better_paced_version",
          "long_form_preference",
          "speed_assessment",
          "pronunciation_findings",
          "audible_distinction",
          "confidence",
          "reason",
        ],
        path,
      )
    ) {
      return [];
    }
    const pairId = normalizeString(
      state,
      required(state, item, "pair_id", path),
      `${path}.pair_id`,
      `${path}.pair_id`,
      { maximumLength: 100 },
    );
    const pair = pairId
      ? pairById(state.assignment, pairId)
      : null;
    if (!pair) {
      issue(
        state,
        "UNKNOWN_PRESENTATION_LABEL",
        `${path}.pair_id`,
        "Pair id is not in the blind presentation context",
      );
      return [];
    }
    const choice = (
      key: string,
    ): AiAudioPresentationChoice | null =>
      normalizeChoice(
        state,
        required(state, item, key, path),
        pair,
        `${path}.${key}`,
        `${path}.${key}`,
      );
    const preferred = choice("preferred_version_overall");
    const clearer = choice("clearer_version");
    const natural = choice("more_natural_version");
    const paced = choice("better_paced_version");
    const longForm = choice("long_form_preference");
    const rawSpeeds = required(
      state,
      item,
      "speed_assessment",
      path,
    );
    const speeds = Array.isArray(rawSpeeds)
      ? rawSpeeds.flatMap((speed, speedIndex) => {
          const speedPath =
            `${path}.speed_assessment[${String(speedIndex)}]`;
          if (
            !assertAllowedKeys(
              state,
              speed,
              ["version", "too_slow", "too_fast"],
              speedPath,
            )
          ) {
            return [];
          }
          const version = normalizeVersion(
            state,
            required(state, speed, "version", speedPath),
            pair,
            `${speedPath}.version`,
            `${speedPath}.version`,
          );
          const tooSlow = normalizeExactBoolean(
            state,
            required(state, speed, "too_slow", speedPath),
            `${speedPath}.too_slow`,
            `${speedPath}.too_slow`,
          );
          const tooFast = normalizeExactBoolean(
            state,
            required(state, speed, "too_fast", speedPath),
            `${speedPath}.too_fast`,
            `${speedPath}.too_fast`,
          );
          return version &&
            tooSlow !== null &&
            tooFast !== null
            ? [{ version, too_slow: tooSlow, too_fast: tooFast }]
            : [];
        })
      : [];
    if (!Array.isArray(rawSpeeds)) {
      issue(
        state,
        "INVALID_VALUE",
        `${path}.speed_assessment`,
        "Expected an array",
      );
    }
    const rawPronunciations = required(
      state,
      item,
      "pronunciation_findings",
      path,
    );
    const pronunciations = Array.isArray(rawPronunciations)
      ? rawPronunciations.flatMap(
          (pronunciation, pronunciationIndex) => {
            const pronunciationPath =
              `${path}.pronunciation_findings[` +
              `${String(pronunciationIndex)}]`;
            if (
              !assertAllowedKeys(
                state,
                pronunciation,
                ["version", "severity", "description"],
                pronunciationPath,
              )
            ) {
              return [];
            }
            const version = normalizeVersion(
              state,
              required(
                state,
                pronunciation,
                "version",
                pronunciationPath,
              ),
              pair,
              `${pronunciationPath}.version`,
              `${pronunciationPath}.version`,
            );
            const severity = normalizeSeverity(
              state,
              required(
                state,
                pronunciation,
                "severity",
                pronunciationPath,
              ),
              `${pronunciationPath}.severity`,
              `${pronunciationPath}.severity`,
            );
            const description = normalizeString(
              state,
              required(
                state,
                pronunciation,
                "description",
                pronunciationPath,
              ),
              `${pronunciationPath}.description`,
              `${pronunciationPath}.description`,
              { maximumLength: 500 },
            );
            return version && severity && description
              ? [{ version, severity, description }]
              : [];
          },
        )
      : [];
    if (!Array.isArray(rawPronunciations)) {
      issue(
        state,
        "INVALID_VALUE",
        `${path}.pronunciation_findings`,
        "Expected an array",
      );
    }
    const audible = normalizeString(
      state,
      required(state, item, "audible_distinction", path),
      `${path}.audible_distinction`,
      `${path}.audible_distinction`,
      { maximumLength: 20 },
    );
    const confidence = normalizeInteger(
      state,
      required(state, item, "confidence", path),
      `${path}.confidence`,
      `${path}.confidence`,
      0,
      100,
    );
    const reason = normalizeString(
      state,
      required(state, item, "reason", path),
      `${path}.reason`,
      `${path}.reason`,
      { maximumLength: 1_000 },
    );
    return preferred &&
      clearer &&
      natural &&
      paced &&
      longForm &&
      speeds.length === 2 &&
      audible &&
      confidence !== null &&
      reason
      ? [
          {
            pair_id: pair.pairId,
            preferred_version_overall: preferred,
            clearer_version: clearer,
            more_natural_version: natural,
            better_paced_version: paced,
            long_form_preference: longForm,
            speed_assessment: speeds,
            pronunciation_findings: pronunciations,
            audible_distinction:
              audible as "CLEAR" | "SUBTLE" | "NONE",
            confidence,
            reason,
          },
        ]
      : [];
  });
}

function normalizeCorrectedTable(
  state: RecoveryState,
  value: unknown,
): AiAudioRecoveredJudgeResponse["table_evaluation"] | null {
  const path = "$.table_evaluation";
  if (
    !assertAllowedKeys(
      state,
      value,
      [
        "pair_id",
        "clearer_version",
        "repeated_labels_helpful",
        "longer_version",
        "longer_duration_excessive",
        "clarity_justifies_added_duration",
        "concise_table_variant_recommended",
        "confidence",
        "reason",
      ],
      path,
    )
  ) {
    return null;
  }
  const pairId = normalizeString(
    state,
    required(state, value, "pair_id", path),
    `${path}.pair_id`,
    `${path}.pair_id`,
    { maximumLength: 100 },
  );
  const pair = pairId
    ? pairById(state.assignment, pairId)
    : null;
  if (!pair?.tableEvaluation) {
    issue(
      state,
      "INVALID_TABLE_EVALUATION",
      `${path}.pair_id`,
      "Top-level table evaluation must refer to the known table pair",
    );
    return null;
  }
  const clearer = normalizeChoice(
    state,
    required(state, value, "clearer_version", path),
    pair,
    `${path}.clearer_version`,
    `${path}.clearer_version`,
  );
  const repeated = normalizeExactBoolean(
    state,
    required(state, value, "repeated_labels_helpful", path),
    `${path}.repeated_labels_helpful`,
    `${path}.repeated_labels_helpful`,
  );
  const longer = normalizeChoice(
    state,
    required(state, value, "longer_version", path),
    pair,
    `${path}.longer_version`,
    `${path}.longer_version`,
  );
  const excessive = normalizeExactBoolean(
    state,
    required(state, value, "longer_duration_excessive", path),
    `${path}.longer_duration_excessive`,
    `${path}.longer_duration_excessive`,
  );
  const justified = normalizeExactBoolean(
    state,
    required(
      state,
      value,
      "clarity_justifies_added_duration",
      path,
    ),
    `${path}.clarity_justifies_added_duration`,
    `${path}.clarity_justifies_added_duration`,
  );
  const concise = normalizeExactBoolean(
    state,
    required(
      state,
      value,
      "concise_table_variant_recommended",
      path,
    ),
    `${path}.concise_table_variant_recommended`,
    `${path}.concise_table_variant_recommended`,
  );
  const confidence = normalizeInteger(
    state,
    required(state, value, "confidence", path),
    `${path}.confidence`,
    `${path}.confidence`,
    0,
    100,
  );
  const reason = normalizeString(
    state,
    required(state, value, "reason", path),
    `${path}.reason`,
    `${path}.reason`,
    { maximumLength: 1_000 },
  );
  return clearer &&
    repeated !== null &&
    longer &&
    excessive !== null &&
    justified !== null &&
    concise !== null &&
    confidence !== null &&
    reason
    ? {
        pair_id: pair.pairId,
        clearer_version: clearer,
        repeated_labels_helpful: repeated,
        longer_version: longer,
        longer_duration_excessive: excessive,
        clarity_justifies_added_duration: justified,
        concise_table_variant_recommended: concise,
        confidence,
        reason,
      }
    : null;
}

function buildFromCorrected(
  state: RecoveryState,
  value: UnknownRecord,
): unknown {
  assertAllowedKeys(
    state,
    value,
    [
      "judge_metadata",
      "file_scores",
      "pair_evaluations",
      "table_evaluation",
      "overall_assessment",
      "long_form_recommendation",
      "confidence",
    ],
    "$",
  );
  const rawMetadata = required(
    state,
    value,
    "judge_metadata",
    "$",
  );
  let metadata: AiAudioRecoveredJudgeResponse["judge_metadata"] | null =
    null;
  if (
    assertAllowedKeys(
      state,
      rawMetadata,
      ["assignment_id", "judge_id", "evidence_basis"],
      "$.judge_metadata",
    )
  ) {
    const assignmentId = normalizeString(
      state,
      required(
        state,
        rawMetadata,
        "assignment_id",
        "$.judge_metadata",
      ),
      "$.judge_metadata.assignment_id",
      "$.judge_metadata.assignment_id",
      { maximumLength: 100 },
    );
    const judgeId = normalizeString(
      state,
      required(
        state,
        rawMetadata,
        "judge_id",
        "$.judge_metadata",
      ),
      "$.judge_metadata.judge_id",
      "$.judge_metadata.judge_id",
      { maximumLength: 20 },
    );
    const evidenceBasis = normalizeString(
      state,
      required(
        state,
        rawMetadata,
        "evidence_basis",
        "$.judge_metadata",
      ),
      "$.judge_metadata.evidence_basis",
      "$.judge_metadata.evidence_basis",
      { maximumLength: 30 },
    );
    if (assignmentId && judgeId && evidenceBasis) {
      metadata = {
        assignment_id: assignmentId,
        judge_id: judgeId,
        evidence_basis: evidenceBasis as "AUDIO_ONLY",
      };
    }
  }
  const files = normalizeCorrectedFileScores(
    state,
    required(state, value, "file_scores", "$"),
  );
  const pairs = normalizeCorrectedPairEvaluations(
    state,
    required(state, value, "pair_evaluations", "$"),
  );
  const table = normalizeCorrectedTable(
    state,
    required(state, value, "table_evaluation", "$"),
  );
  const rawOverall = required(
    state,
    value,
    "overall_assessment",
    "$",
  );
  let notes: string | null = null;
  if (
    assertAllowedKeys(
      state,
      rawOverall,
      ["notes"],
      "$.overall_assessment",
    )
  ) {
    notes = normalizeString(
      state,
      required(
        state,
        rawOverall,
        "notes",
        "$.overall_assessment",
      ),
      "$.overall_assessment.notes",
      "$.overall_assessment.notes",
      { maximumLength: 1_000 },
    );
  }
  const hasFutureOverallFields =
    "long_form_recommendation" in value ||
    "confidence" in value;
  const longFormRecommendation =
    hasFutureOverallFields
      ? normalizeString(
          state,
          required(
            state,
            value,
            "long_form_recommendation",
            "$",
          ),
          "$.long_form_recommendation",
          "$.long_form_recommendation",
          { maximumLength: 1_000 },
        )
      : null;
  const overallConfidence =
    hasFutureOverallFields
      ? normalizeInteger(
          state,
          required(state, value, "confidence", "$"),
          "$.confidence",
          "$.confidence",
          0,
          100,
        )
      : null;
  return metadata &&
    table &&
    notes &&
    (!hasFutureOverallFields ||
      (longFormRecommendation !== null &&
        overallConfidence !== null))
    ? {
        judge_metadata: metadata,
        file_scores: files,
        pair_evaluations: pairs,
        table_evaluation: table,
        overall_assessment: { notes },
        ...(hasFutureOverallFields
          ? {
              long_form_recommendation:
                longFormRecommendation!,
              confidence: overallConfidence!,
            }
          : {}),
      }
    : null;
}

function validateCompleteResponse(
  state: RecoveryState,
  response: AiAudioRecoveredJudgeResponse,
): void {
  if (
    response.judge_metadata.assignment_id !==
      state.assignment.assignmentId ||
    response.judge_metadata.judge_id !==
      state.assignment.judgeId ||
    response.judge_metadata.evidence_basis !== "AUDIO_ONLY"
  ) {
    issue(
      state,
      "INVALID_VALUE",
      "$.judge_metadata",
      "Recovered metadata does not match the blind assignment",
    );
  }
  const expectedFileKeys = state.assignment.pairs.flatMap((pair) => [
    `${pair.pairId}\0A`,
    `${pair.pairId}\0B`,
  ]);
  const actualFileKeys = response.file_scores.map(
    (file) => `${file.pair_id}\0${file.version}`,
  );
  if (
    actualFileKeys.length !== expectedFileKeys.length ||
    new Set(actualFileKeys).size !== actualFileKeys.length ||
    [...actualFileKeys].sort().join("\n") !==
      [...expectedFileKeys].sort().join("\n")
  ) {
    issue(
      state,
      "INCOMPLETE_FILE_SCORES",
      "$.file_scores",
      "All ten assigned A/B file score records are required exactly once",
    );
  }
  const expectedPairIds = state.assignment.pairs
    .map((pair) => pair.pairId)
    .sort();
  const actualPairIds = response.pair_evaluations
    .map((pair) => pair.pair_id)
    .sort();
  if (
    actualPairIds.length !== expectedPairIds.length ||
    new Set(actualPairIds).size !== actualPairIds.length ||
    actualPairIds.join("\n") !== expectedPairIds.join("\n")
  ) {
    issue(
      state,
      "INCOMPLETE_PAIR_EVALUATIONS",
      "$.pair_evaluations",
      "All five assigned pair evaluations are required exactly once",
    );
  }
  for (const pair of response.pair_evaluations) {
    if (
      pair.speed_assessment.length !== 2 ||
      new Set(
        pair.speed_assessment.map((speed) => speed.version),
      ).size !== 2
    ) {
      issue(
        state,
        "INCOMPLETE_PAIR_EVALUATIONS",
        `$.pair_evaluations.${pair.pair_id}.speed_assessment`,
        "Each pair requires one speed assessment for A and one for B",
      );
    }
  }
  const tablePair = state.assignment.pairs.find(
    (pair) => pair.tableEvaluation,
  )!;
  if (response.table_evaluation.pair_id !== tablePair.pairId) {
    issue(
      state,
      "INVALID_TABLE_EVALUATION",
      "$.table_evaluation.pair_id",
      "The single table evaluation does not refer to the known table pair",
    );
  }
}

function recoveredLeafPaths(
  value: unknown,
  path = "$",
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      recoveredLeafPaths(item, `${path}[${String(index)}]`),
    );
  }
  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, item]) =>
      recoveredLeafPaths(item, `${path}.${key}`),
    );
  }
  return [path];
}

function validateFieldProvenanceCoverage(
  state: RecoveryState,
  response: AiAudioRecoveredJudgeResponse,
): void {
  const documentedOutputPaths = new Set(
    state.provenance.map((entry) => entry.outputPath),
  );
  for (const path of recoveredLeafPaths(response)) {
    if (!documentedOutputPaths.has(path)) {
      issue(
        state,
        "MISSING_FIELD_PROVENANCE",
        path,
        "Every recovered scalar field must retain its original path, value, and normalization rule",
      );
    }
  }
}

export function recoverAiAudioJudgeResponse(input: {
  responseId: string;
  response: unknown;
  assignment: AiAudioRecoveryAssignment;
}): AiAudioRecoveryResult {
  const responseId = input.responseId.trim();
  const parsedAssignment = recoveryAssignmentSchema.safeParse(
    input.assignment,
  );
  const state: RecoveryState = {
    responseId,
    assignment: parsedAssignment.success
      ? parsedAssignment.data
      : ({
          assignmentId: "",
          judgeId: "judge-01",
          pairs: [],
        } as unknown as AiAudioRecoveryAssignment),
    provenance: [],
    issues: [],
  };
  if (!responseId) {
    issue(
      state,
      "INVALID_VALUE",
      "$@responseId",
      "Original response id is required",
    );
  }
  if (!parsedAssignment.success) {
    issue(
      state,
      containsPrivateMappingKey(input.assignment)
        ? "PRIVATE_MAPPING_INPUT"
        : "INVALID_RECOVERY_CONTEXT",
      "$@assignment",
      containsPrivateMappingKey(input.assignment)
        ? "Recovery context must not contain source or private pipeline mapping"
        : parsedAssignment.error.issues
            .map((entry) => entry.message)
            .join("; "),
    );
    return {
      valid: false,
      originalResponseId: responseId,
      response: null,
      responseHash: null,
      provenance: state.provenance,
      issues: state.issues,
    };
  }
  const parsedInput = parseInput(state, input.response);
  if (!isRecord(parsedInput)) {
    if (state.issues.length === 0) {
      issue(
        state,
        "INVALID_VALUE",
        "$",
        "Judge response must be a JSON object",
      );
    }
    return {
      valid: false,
      originalResponseId: responseId,
      response: null,
      responseHash: null,
      provenance: state.provenance,
      issues: state.issues,
    };
  }
  const candidate =
    "judge_metadata" in parsedInput ||
    "file_scores" in parsedInput ||
    "pair_evaluations" in parsedInput
      ? buildFromCorrected(state, parsedInput)
      : buildFromOld(state, parsedInput);
  const validated =
    aiAudioRecoveredJudgeResponseSchema.safeParse(candidate);
  if (!validated.success) {
    for (const schemaIssue of validated.error.issues) {
      issue(
        state,
        "SCHEMA_INVALID",
        schemaIssue.path.length > 0
          ? `$.${schemaIssue.path.join(".")}`
          : "$",
        schemaIssue.message,
      );
    }
  } else {
    validateCompleteResponse(state, validated.data);
    validateFieldProvenanceCoverage(state, validated.data);
  }
  if (!validated.success || state.issues.length > 0) {
    return {
      valid: false,
      originalResponseId: responseId,
      response: null,
      responseHash: null,
      provenance: state.provenance,
      issues: state.issues,
    };
  }
  return {
    valid: true,
    originalResponseId: responseId,
    response: validated.data,
    responseHash: hashAiValue(validated.data),
    provenance: state.provenance,
    issues: [],
  };
}

function choiceToFileLabel(
  choice: AiAudioPresentationChoice,
  pair: AiAudioRecoveryAssignment["pairs"][number],
): string {
  if (choice === "A") return pair.versionAFileId;
  if (choice === "B") return pair.versionBFileId;
  return "NO_PREFERENCE";
}

/**
 * Converts the corrected top-level shape back into the existing panel input.
 * The conversion uses only presentation labels. It never accepts or resolves
 * source/pipeline identities, and it preserves all five canonical severities.
 */
export function toLegacyAiJudgeResponse(
  response: AiAudioRecoveredJudgeResponse,
  assignment: AiAudioRecoveryAssignment,
): AiJudgeResponse {
  const parsedResponse =
    aiAudioRecoveredJudgeResponseSchema.parse(response);
  const parsedAssignment = recoveryAssignmentSchema.parse(assignment);
  const table = parsedResponse.table_evaluation;
  const legacy = {
    schema_version: AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION,
    assignment_id: parsedResponse.judge_metadata.assignment_id,
    judge_id: parsedResponse.judge_metadata.judge_id,
    evidence_basis: parsedResponse.judge_metadata.evidence_basis,
    clips: parsedResponse.file_scores.map((file) => {
      const pair = pairById(parsedAssignment, file.pair_id);
      if (!pair) {
        throw new Error(
          `Unknown recovery pair ${file.pair_id}`,
        );
      }
      return {
        clip_label:
          file.version === "A"
            ? pair.versionAFileId
            : pair.versionBFileId,
        scores: file.scores,
        evidence_note: file.evidence_note,
      };
    }),
    pairs: parsedResponse.pair_evaluations.map((evaluation) => {
      const pair = pairById(parsedAssignment, evaluation.pair_id);
      if (!pair) {
        throw new Error(
          `Unknown recovery pair ${evaluation.pair_id}`,
        );
      }
      return {
        pair_label: pair.pairId,
        preferred_version_overall: choiceToFileLabel(
          evaluation.preferred_version_overall,
          pair,
        ),
        clearer_version: choiceToFileLabel(
          evaluation.clearer_version,
          pair,
        ),
        more_natural_version: choiceToFileLabel(
          evaluation.more_natural_version,
          pair,
        ),
        better_paced_version: choiceToFileLabel(
          evaluation.better_paced_version,
          pair,
        ),
        long_lesson_preference: choiceToFileLabel(
          evaluation.long_form_preference,
          pair,
        ),
        speed_assessment: evaluation.speed_assessment.map(
          (speed) => ({
            clip_label:
              speed.version === "A"
                ? pair.versionAFileId
                : pair.versionBFileId,
            too_slow: speed.too_slow,
            too_fast: speed.too_fast,
          }),
        ),
        pronunciation_issues:
          evaluation.pronunciation_findings.map((finding) => ({
            clip_label:
              finding.version === "A"
                ? pair.versionAFileId
                : pair.versionBFileId,
            severity: finding.severity,
            description: finding.description,
          })),
        audible_distinction: evaluation.audible_distinction,
        confidence: evaluation.confidence,
        concise_reason: evaluation.reason,
        table_evaluation: pair.tableEvaluation
          ? {
              easier_to_follow: choiceToFileLabel(
                table.clearer_version,
                pair,
              ),
              repeated_labels_helpful:
                table.repeated_labels_helpful ? "yes" : "no",
              longer_clip:
                table.longer_version === "tie"
                  ? "SIMILAR_DURATION"
                  : choiceToFileLabel(table.longer_version, pair),
              longer_duration_excessive:
                table.longer_duration_excessive ? "yes" : "no",
              clarity_justifies_added_duration:
                table.clarity_justifies_added_duration
                  ? "yes"
                  : "no",
              test_more_concise_table_narration:
                table.concise_table_variant_recommended
                  ? "yes"
                  : "no",
            }
          : null,
      };
    }),
    overall_notes: parsedResponse.overall_assessment.notes,
  };
  // The core response schema is widened alongside recovery to retain all five
  // canonical severity values. This cast is structural and performs no value
  // transformation or suppression.
  return legacy as unknown as AiJudgeResponse;
}

export interface AiAudioRecoveryAttempt {
  perspectiveId: string;
  attempt: 1 | 2;
  result: AiAudioRecoveryResult;
}

export interface AiAudioSelectedRecoveredResponse {
  perspectiveId: string;
  selectedAttempt: 1 | 2;
  originalResponseId: string;
  response: AiAudioRecoveredJudgeResponse;
  responseHash: string;
  provenance: readonly AiAudioRecoveryProvenance[];
}

export interface AiAudioIndependentRecoverySelection {
  selected: readonly AiAudioSelectedRecoveredResponse[];
  missingPerspectiveIds: readonly string[];
  validIndependentJudgeCount: number;
}

/**
 * Chooses at most one response for each perspective. A valid initial response
 * always wins; a retry is used only when the initial response is unusable.
 */
export function selectIndependentRecoveredResponses(input: {
  perspectiveIds: readonly string[];
  attempts: readonly AiAudioRecoveryAttempt[];
}): AiAudioIndependentRecoverySelection {
  if (
    input.perspectiveIds.length !== 5 ||
    new Set(input.perspectiveIds).size !== 5 ||
    input.perspectiveIds.some(
      (id) => !/^judge-0[1-5]$/u.test(id),
    )
  ) {
    throw new Error(
      "Recovery selection requires the five unique judge-01 through judge-05 perspectives",
    );
  }
  const expected = new Set(input.perspectiveIds);
  if (
    input.attempts.some(
      (attempt) => !expected.has(attempt.perspectiveId),
    )
  ) {
    throw new Error(
      "Recovery attempt refers to an unexpected perspective",
    );
  }
  for (const attempt of input.attempts) {
    if (
      attempt.result.valid &&
      attempt.result.response.judge_metadata.judge_id !==
        attempt.perspectiveId
    ) {
      throw new Error(
        `Recovered response ${attempt.result.originalResponseId} judge metadata does not match perspective ${attempt.perspectiveId}`,
      );
    }
  }
  const selected: AiAudioSelectedRecoveredResponse[] = [];
  const missingPerspectiveIds: string[] = [];
  for (const perspectiveId of input.perspectiveIds) {
    const perspectiveAttempts = input.attempts.filter(
      (attempt) => attempt.perspectiveId === perspectiveId,
    );
    const initial = perspectiveAttempts.filter(
      (attempt) => attempt.attempt === 1,
    );
    const retry = perspectiveAttempts.filter(
      (attempt) => attempt.attempt === 2,
    );
    if (initial.length > 1 || retry.length > 1) {
      throw new Error(
        `Perspective ${perspectiveId} has duplicate attempt records`,
      );
    }
    const chosen =
      initial[0]?.result.valid === true
        ? initial[0]
        : retry[0]?.result.valid === true
          ? retry[0]
          : null;
    if (!chosen || !chosen.result.valid) {
      missingPerspectiveIds.push(perspectiveId);
      continue;
    }
    selected.push({
      perspectiveId,
      selectedAttempt: chosen.attempt,
      originalResponseId: chosen.result.originalResponseId,
      response: chosen.result.response,
      responseHash: chosen.result.responseHash,
      provenance: chosen.result.provenance,
    });
  }
  const selectedResponseIds = selected.map(
    (response) => response.originalResponseId,
  );
  const selectedResponseHashes = selected.map(
    (response) => response.responseHash,
  );
  if (
    new Set(selectedResponseIds).size !==
      selectedResponseIds.length ||
    new Set(selectedResponseHashes).size !==
      selectedResponseHashes.length
  ) {
    throw new Error(
      "Independent recovery selection may not count a duplicate response id or response hash across perspectives",
    );
  }
  return {
    selected,
    missingPerspectiveIds,
    validIndependentJudgeCount: selected.length,
  };
}
