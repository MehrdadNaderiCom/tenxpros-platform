import { createHash } from "node:crypto";

import { z } from "zod";

export const AI_AUDIO_EVALUATION_PLAN_SCHEMA_VERSION =
  "academy-openrouter-audio-evaluation-plan-v2";
export const AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION =
  "academy-ai-audio-judge-response-v1";
export const AI_AUDIO_PANEL_ANALYSIS_SCHEMA_VERSION =
  "academy-ai-audio-panel-analysis-v1";

export const AI_AUDIO_SCORE_DIMENSIONS = Object.freeze([
  "naturalness",
  "pause_quality",
  "pronunciation",
  "clarity",
  "listening_comfort",
  "professional_quality",
  "long_form_suitability",
] as const);

export type AiAudioScoreDimension =
  (typeof AI_AUDIO_SCORE_DIMENSIONS)[number];

export const AI_AUDIO_JUDGE_LENSES = Object.freeze([
  {
    id: "international_professional_learner",
    title:
      "International professional learner whose first language may not be English",
    focus:
      "Prioritize intelligibility, comfortable pacing, and pronunciation that remains clear to an international professional audience.",
  },
  {
    id: "elearning_narration_reviewer",
    title: "E-learning narration quality reviewer",
    focus:
      "Prioritize instructional narration craft, coherent pauses, polish, and suitability for a serious online course.",
  },
  {
    id: "long_form_fatigue_reviewer",
    title: "Long-form listening and fatigue reviewer",
    focus:
      "Prioritize sustained comfort, fatigue risk, rhythm, and whether the voice remains usable for a fifteen-to-thirty-minute lesson.",
  },
  {
    id: "speech_clarity_pacing_pronunciation_reviewer",
    title: "Speech clarity, pacing and pronunciation reviewer",
    focus:
      "Prioritize articulation, pronunciation, sentence rhythm, semantic pauses, and speed.",
  },
  {
    id: "skeptical_professional_credibility_reviewer",
    title: "Strict skeptical reviewer focused on professional credibility",
    focus:
      "Apply a demanding standard for credibility, natural delivery, consistency, and professional finish.",
  },
] as const);

export type AiAudioJudgeLensId =
  (typeof AI_AUDIO_JUDGE_LENSES)[number]["id"];

export const AI_AUDIO_FINAL_DECISIONS = Object.freeze([
  "PASS_PIPER_BRYCE",
  "PASS_PIPER_LINDA",
  "PASS_PIPER_CORI",
  "TUNE_PIPER_PIPELINE",
  "TUNING_RECOMMENDED_BUT_NOT_EXECUTED",
  "CONSIDER_ELEVENLABS",
  "INCONCLUSIVE_AI_ONLY_EVALUATION",
] as const);

export type AiAudioFinalDecision =
  (typeof AI_AUDIO_FINAL_DECISIONS)[number];

export const AI_BRYCE_DECISION_THRESHOLDS = Object.freeze({
  requiredJudges: 5,
  requiredPairs: 5,
  correctedPairWins: 4,
  correctedOverallPreferenceRate: 0.65,
  clarityMedian: 4,
  pronunciationMedian: 4,
  pauseQualityMedian: 4,
  professionalQualityMedian: 3.8,
  longFormSuitabilityMedian: 3.8,
  listeningComfortMedian: 3.8,
  naturalnessMedian: 3.8,
  materialNaturalnessDrop: 0.25,
  localVoiceContentConsistency: 0.6,
} as const);

export const AI_AUDIO_TUNING_DIMENSIONS = Object.freeze([
  "sentence_pause",
  "paragraph_pause",
  "heading_pause",
  "table_row_pause",
  "list_item_pause",
  "section_pause",
  "table_label_repetition",
  "short_table_field_grouping",
  "speaking_rate",
] as const);

export type AiAudioTuningDimension =
  (typeof AI_AUDIO_TUNING_DIMENSIONS)[number];

export type AiLocalVoice = "bryce" | "linda" | "cori";
export type AiPipelineIdentity = "baseline" | "corrected";

type JsonPrimitive = string | number | boolean | null;
type CanonicalJson =
  | JsonPrimitive
  | readonly CanonicalJson[]
  | { readonly [key: string]: CanonicalJson };

function canonicalize(
  value: unknown,
  seen: Set<object>,
): CanonicalJson {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Canonical JSON cannot contain non-finite numbers");
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new Error("Canonical JSON cannot contain cycles");
    }
    seen.add(value);
    const result = value.map((item) => canonicalize(item, seen));
    seen.delete(value);
    return result;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    if (seen.has(value)) {
      throw new Error("Canonical JSON cannot contain cycles");
    }
    seen.add(value);
    const result: Record<string, CanonicalJson> = {};
    for (const key of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item === undefined) {
        throw new Error(
          `Canonical JSON cannot contain undefined at ${key}`,
        );
      }
      result[key] = canonicalize(item, seen);
    }
    seen.delete(value);
    return result;
  }
  throw new Error(
    `Canonical JSON cannot contain ${typeof value} values`,
  );
}

export function canonicalAiJson(value: unknown): string {
  return JSON.stringify(canonicalize(value, new Set()));
}

export function hashAiValue(value: unknown): string {
  return createHash("sha256")
    .update(canonicalAiJson(value), "utf8")
    .digest("hex");
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 hash`);
  }
}

function roundMoney(value: number): number {
  return Number(value.toFixed(8));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export interface AiBlindSourceSample {
  sampleId: string;
  audioSha256: string;
  durationSeconds: number;
}

export interface AiBlindSourcePair {
  pairId: string;
  tableEvaluation: boolean;
  samples: readonly [AiBlindSourceSample, AiBlindSourceSample];
}

export interface AiBlindJudgeClip {
  neutralLabel: string;
  sourceSampleId: string;
  audioSha256: string;
  durationSeconds: number;
  presentationOrder: 1 | 2;
}

export interface AiBlindJudgePair {
  neutralPairLabel: string;
  sourcePairId: string;
  tableEvaluation: boolean;
  presentationOrder: number;
  clips: readonly [AiBlindJudgeClip, AiBlindJudgeClip];
}

export interface AiBlindJudgeAssignment {
  assignmentId: string;
  judgeId: string;
  judgeNumber: 1 | 2 | 3 | 4 | 5;
  lensId: AiAudioJudgeLensId;
  lensTitle: string;
  lensFocus: string;
  evaluationPackageId: string;
  pairs: readonly AiBlindJudgePair[];
  assignmentHash: string;
}

export interface BuildBlindJudgeAssignmentsInput {
  evaluationPackageId: string;
  blindSeed: string;
  pairs: readonly AiBlindSourcePair[];
}

function derivedHex(
  seed: string,
  ...components: readonly string[]
): string {
  return createHash("sha256")
    .update([seed, ...components].join("\0"), "utf8")
    .digest("hex");
}

function neutralToken(hex: string, length = 10): string {
  return hex.slice(0, length).toUpperCase();
}

function validateBlindSources(
  input: BuildBlindJudgeAssignmentsInput,
): void {
  if (
    !/^blind-review-[a-f0-9]{16}$/u.test(
      input.evaluationPackageId,
    )
  ) {
    throw new Error("Invalid evaluation package id");
  }
  if (input.blindSeed.length < 32) {
    throw new Error("Blind seed must contain at least 32 characters");
  }
  if (input.pairs.length !== 5) {
    throw new Error("The Bryce evaluation requires exactly five pairs");
  }
  if (
    input.pairs.filter((pair) => pair.tableEvaluation).length !== 1
  ) {
    throw new Error("Exactly one pair must be the table evaluation");
  }
  const pairIds = new Set<string>();
  const sampleIds = new Set<string>();
  const hashes = new Set<string>();
  for (const pair of input.pairs) {
    if (!pair.pairId || pairIds.has(pair.pairId)) {
      throw new Error(`Duplicate or empty pair id: ${pair.pairId}`);
    }
    pairIds.add(pair.pairId);
    if (pair.samples.length !== 2) {
      throw new Error(`${pair.pairId} must contain two clips`);
    }
    for (const sample of pair.samples) {
      if (!sample.sampleId || sampleIds.has(sample.sampleId)) {
        throw new Error(
          `Duplicate or empty sample id: ${sample.sampleId}`,
        );
      }
      sampleIds.add(sample.sampleId);
      assertSha256(
        sample.audioSha256,
        `${sample.sampleId} audioSha256`,
      );
      if (
        !Number.isFinite(sample.durationSeconds) ||
        sample.durationSeconds <= 0
      ) {
        throw new Error(
          `${sample.sampleId} duration must be positive`,
        );
      }
      hashes.add(sample.audioSha256);
    }
  }
  if (hashes.size !== sampleIds.size) {
    throw new Error("Every blind audio input must have a unique hash");
  }
}

/**
 * Produces five deterministic but independently blinded judge assignments.
 *
 * The returned objects are private orchestration records. Prompt rendering
 * deliberately ignores source ids, audio hashes, durations, and the seed.
 */
export function buildBlindJudgeAssignments(
  input: BuildBlindJudgeAssignmentsInput,
): readonly AiBlindJudgeAssignment[] {
  validateBlindSources(input);
  const assignments = AI_AUDIO_JUDGE_LENSES.map((lens, lensIndex) => {
    const judgeNumber = (lensIndex + 1) as 1 | 2 | 3 | 4 | 5;
    const judgeId = `judge-${String(judgeNumber).padStart(2, "0")}`;
    const orderedPairs = input.pairs
      .map((pair) => ({
        pair,
        orderKey: derivedHex(
          input.blindSeed,
          judgeId,
          pair.pairId,
          "pair-order",
        ),
      }))
      .sort(
        (left, right) =>
          left.orderKey.localeCompare(right.orderKey) ||
          left.pair.pairId.localeCompare(right.pair.pairId),
      );
    const pairs = orderedPairs.map(({ pair }, pairIndex) => {
      const orderDigest = derivedHex(
        input.blindSeed,
        judgeId,
        pair.pairId,
        "clip-order",
      );
      const orderedSamples =
        Number.parseInt(orderDigest.slice(0, 2), 16) % 2 === 0
          ? pair.samples
          : ([pair.samples[1], pair.samples[0]] as const);
      const neutralPairLabel = `SET-${neutralToken(
        derivedHex(
          input.blindSeed,
          judgeId,
          pair.pairId,
          "pair-label",
        ),
        8,
      )}`;
      const clips = orderedSamples.map((sample, sampleIndex) => ({
        neutralLabel: `CLIP-${neutralToken(
          derivedHex(
            input.blindSeed,
            judgeId,
            pair.pairId,
            sample.sampleId,
            "clip-label",
          ),
          10,
        )}`,
        sourceSampleId: sample.sampleId,
        audioSha256: sample.audioSha256,
        durationSeconds: sample.durationSeconds,
        presentationOrder: (sampleIndex + 1) as 1 | 2,
      })) as [AiBlindJudgeClip, AiBlindJudgeClip];
      return {
        neutralPairLabel,
        sourcePairId: pair.pairId,
        tableEvaluation: pair.tableEvaluation,
        presentationOrder: pairIndex + 1,
        clips,
      };
    });
    const assignmentWithoutHash = {
      assignmentId: `run-${neutralToken(
        derivedHex(
          input.blindSeed,
          judgeId,
          input.evaluationPackageId,
          "run",
        ),
        16,
      )}`,
      judgeId,
      judgeNumber,
      lensId: lens.id,
      lensTitle: lens.title,
      lensFocus: lens.focus,
      evaluationPackageId: input.evaluationPackageId,
      pairs,
    };
    return {
      ...assignmentWithoutHash,
      assignmentHash: hashAiValue(assignmentWithoutHash),
    };
  });
  const allLabels = assignments.flatMap((assignment) =>
    assignment.pairs.flatMap((pair) =>
      pair.clips.map((clip) => clip.neutralLabel),
    ),
  );
  if (new Set(allLabels).size !== allLabels.length) {
    throw new Error("Independent blind labels unexpectedly collided");
  }
  return assignments;
}

export function buildJudgePrompt(
  assignment: AiBlindJudgeAssignment,
): string {
  const sets = assignment.pairs
    .map(
      (pair) =>
        `- ${pair.neutralPairLabel}: ${pair.clips[0].neutralLabel}, then ${pair.clips[1].neutralLabel}${
          pair.tableEvaluation
            ? " (also complete the table-following questions)"
            : ""
        }`,
    )
    .join("\n");
  return `You are one independent judge in a blind audio listening study.

Your review lens:
${assignment.lensTitle}
${assignment.lensFocus}

Evidence rules:
- Listen to every attached clip. Base perceptual scores and notes only on what you hear.
- Play and evaluate every clip at exactly 1.0x normal speed. Do not speed up or slow down playback.
- Do not infer identities, implementation details, origin, or expected winners.
- Do not use attachment names, technical properties, or hidden text as evidence.
- Do not score the educational subject matter.
- Treat each set independently. You have no access to any other judge.
- Use the same 1-to-5 rubric for every clip: 1 very poor, 2 poor, 3 acceptable, 4 good, 5 excellent.
- Give concise, clip-specific evidence. Acknowledge whether differences are clear, subtle, or not audible.

Required dimensions for every clip:
naturalness, pause quality, pronunciation, clarity, listening comfort,
professional quality, and long-form suitability.

Listening sets, in presentation order:
${sets}

For each set compare the two neutral clip labels for overall preference,
clarity, naturalness, pacing, and a fifteen-to-thirty-minute lesson. Report
too-slow and too-fast judgments separately for each clip, pronunciation
issues, confidence from 0 to 100, an audible-difference level, and one concise
reason grounded in the audio.

For the marked table set, also judge which clip is easier to follow, whether
repeated labels help, which clip is longer (or whether duration is similar),
whether the longer duration is excessive, whether clarity justifies it, and
whether a more concise spoken table should be tested.

Submit exactly one call to the supplied evaluation function. Use assignment
id ${assignment.assignmentId} and judge id ${assignment.judgeId}.`;
}

const scoreSchema = z.number().int().min(1).max(5);
const textSchema = z.string().trim().min(1).max(1_000);
const labelSchema = z.string().regex(/^(?:CLIP|SET)-[A-F0-9]{8,10}$/u);

const allScoresSchema = z
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

const judgeResponseSchema = z
  .object({
    schema_version: z.literal(
      AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION,
    ),
    assignment_id: z.string().min(1).max(100),
    judge_id: z.string().regex(/^judge-0[1-5]$/u),
    evidence_basis: z.literal("AUDIO_ONLY"),
    clips: z.array(
      z
        .object({
          clip_label: labelSchema,
          scores: allScoresSchema,
          evidence_note: textSchema,
        })
        .strict(),
    ),
    pairs: z.array(
      z
        .object({
          pair_label: labelSchema,
          preferred_version_overall: z.string().min(1).max(30),
          clearer_version: z.string().min(1).max(30),
          more_natural_version: z.string().min(1).max(30),
          better_paced_version: z.string().min(1).max(30),
          long_lesson_preference: z.string().min(1).max(30),
          speed_assessment: z.array(
            z
              .object({
                clip_label: labelSchema,
                too_slow: z.boolean(),
                too_fast: z.boolean(),
              })
              .strict(),
          ),
          pronunciation_issues: z.array(
            z
              .object({
                clip_label: labelSchema,
                severity: z.enum([
                  "none",
                  "minor",
                  "moderate",
                  "major",
                  "critical",
                ]),
                description: z.string().trim().min(1).max(500),
              })
              .strict(),
          ),
          audible_distinction: z.enum(["CLEAR", "SUBTLE", "NONE"]),
          confidence: z.number().int().min(0).max(100),
          concise_reason: textSchema,
          table_evaluation: z
            .object({
              easier_to_follow: z.string().min(1).max(30),
              repeated_labels_helpful: z.enum([
                "yes",
                "no",
                "uncertain",
              ]),
              longer_clip: z.string().min(1).max(30),
              longer_duration_excessive: z.enum([
                "yes",
                "no",
                "uncertain",
              ]),
              clarity_justifies_added_duration: z.enum([
                "yes",
                "no",
                "not_applicable",
              ]),
              test_more_concise_table_narration: z.enum([
                "yes",
                "no",
                "uncertain",
              ]),
            })
            .strict()
            .nullable(),
        })
        .strict(),
    ),
    overall_notes: z.string().trim().min(1).max(1_000),
  })
  .strict();

export type AiJudgeResponse = z.infer<typeof judgeResponseSchema>;

export const AI_AUDIO_EVALUATION_TOOL = Object.freeze({
  type: "function",
  name: "submit_blind_audio_evaluation",
  description:
    "Submit the complete machine-readable result of a blind audio listening evaluation.",
  strict: false,
  parameters: {
    type: "object",
    additionalProperties: false,
    required: [
      "schema_version",
      "assignment_id",
      "judge_id",
      "evidence_basis",
      "clips",
      "pairs",
      "overall_notes",
    ],
    properties: {
      schema_version: {
        type: "string",
        enum: [AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION],
      },
      assignment_id: { type: "string" },
      judge_id: { type: "string" },
      evidence_basis: {
        type: "string",
        enum: ["AUDIO_ONLY"],
      },
      clips: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["clip_label", "scores", "evidence_note"],
          properties: {
            clip_label: { type: "string" },
            scores: {
              type: "object",
              additionalProperties: false,
              required: [...AI_AUDIO_SCORE_DIMENSIONS],
              properties: Object.fromEntries(
                AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
                  dimension,
                  { type: "integer", minimum: 1, maximum: 5 },
                ]),
              ),
            },
            evidence_note: { type: "string" },
          },
        },
      },
      pairs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
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
          properties: {
            pair_label: { type: "string" },
            preferred_version_overall: { type: "string" },
            clearer_version: { type: "string" },
            more_natural_version: { type: "string" },
            better_paced_version: { type: "string" },
            long_lesson_preference: { type: "string" },
            speed_assessment: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["clip_label", "too_slow", "too_fast"],
                properties: {
                  clip_label: { type: "string" },
                  too_slow: { type: "boolean" },
                  too_fast: { type: "boolean" },
                },
              },
            },
            pronunciation_issues: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "clip_label",
                  "severity",
                  "description",
                ],
                properties: {
                  clip_label: { type: "string" },
                  severity: {
                    type: "string",
                    enum: [
                      "none",
                      "minor",
                      "moderate",
                      "major",
                      "critical",
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
              type: "integer",
              minimum: 0,
              maximum: 100,
            },
            concise_reason: { type: "string" },
            table_evaluation: {
              anyOf: [
                { type: "null" },
                {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "easier_to_follow",
                    "repeated_labels_helpful",
                    "longer_clip",
                    "longer_duration_excessive",
                    "clarity_justifies_added_duration",
                    "test_more_concise_table_narration",
                  ],
                  properties: {
                    easier_to_follow: { type: "string" },
                    repeated_labels_helpful: {
                      type: "string",
                      enum: ["yes", "no", "uncertain"],
                    },
                    longer_clip: { type: "string" },
                    longer_duration_excessive: {
                      type: "string",
                      enum: ["yes", "no", "uncertain"],
                    },
                    clarity_justifies_added_duration: {
                      type: "string",
                      enum: ["yes", "no", "not_applicable"],
                    },
                    test_more_concise_table_narration: {
                      type: "string",
                      enum: ["yes", "no", "uncertain"],
                    },
                  },
                },
              ],
            },
          },
        },
      },
      overall_notes: { type: "string" },
    },
  },
} as const);

export type AiJudgeInvalidityCode =
  | "INVALID_JSON"
  | "SCHEMA_INVALID"
  | "ASSIGNMENT_MISMATCH"
  | "INCOMPLETE_SET"
  | "UNBLINDING_CLAIM"
  | "FILE_OR_METADATA_EVIDENCE"
  | "TRANSCRIPT_ONLY_EVIDENCE"
  | "IDENTICAL_BOILERPLATE"
  | "INTERNAL_CONTRADICTION"
  | "AUDIBLE_DISTINCTION_NOT_ACKNOWLEDGED";

export interface AiJudgeInvalidity {
  code: AiJudgeInvalidityCode;
  path: string;
  message: string;
}

export type AiJudgeValidationResult =
  | {
      valid: true;
      response: AiJudgeResponse;
      responseHash: string;
      retryAllowed: false;
      issues: readonly [];
    }
  | {
      valid: false;
      response: null;
      responseHash: string | null;
      retryAllowed: boolean;
      issues: readonly AiJudgeInvalidity[];
    };

export interface ValidateJudgeResponseOptions {
  attemptNumber?: 1 | 2;
  clearlyDistinctSourcePairIds?: readonly string[];
}

function uniqueSetMatches(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    [...actual].sort().join("\0") ===
      [...expected].sort().join("\0")
  );
}

function preferenceAllowed(
  value: string,
  clipLabels: readonly string[],
): boolean {
  return value === "NO_PREFERENCE" || clipLabels.includes(value);
}

function normalizeBoilerplate(
  text: string,
  assignment: AiBlindJudgeAssignment,
): string {
  let normalized = text.normalize("NFKC").toLocaleLowerCase("en-US");
  for (const pair of assignment.pairs) {
    normalized = normalized.replaceAll(
      pair.neutralPairLabel.toLocaleLowerCase("en-US"),
      "<set>",
    );
    for (const clip of pair.clips) {
      normalized = normalized.replaceAll(
        clip.neutralLabel.toLocaleLowerCase("en-US"),
        "<clip>",
      );
    }
  }
  return normalized
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function scoreFor(
  response: AiJudgeResponse,
  clipLabel: string,
  dimension: AiAudioScoreDimension,
): number {
  const clip = response.clips.find(
    (candidate) => candidate.clip_label === clipLabel,
  );
  if (!clip) throw new Error(`Missing clip ${clipLabel}`);
  return clip.scores[dimension];
}

function choiceContradictsScore(
  response: AiJudgeResponse,
  choice: string,
  other: string,
  dimension: AiAudioScoreDimension,
): boolean {
  if (choice === "NO_PREFERENCE") return false;
  return (
    scoreFor(response, choice, dimension) + 2 <=
    scoreFor(response, other, dimension)
  );
}

function allTextValues(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => allTextValues(item)).join("\n");
  }
  if (value && typeof value === "object") {
    return Object.values(value)
      .map((item) => allTextValues(item))
      .join("\n");
  }
  return "";
}

export function validateJudgeResponse(
  value: unknown,
  assignment: AiBlindJudgeAssignment,
  options: ValidateJudgeResponseOptions = {},
): AiJudgeValidationResult {
  const attemptNumber = options.attemptNumber ?? 1;
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return {
        valid: false,
        response: null,
        responseHash: null,
        retryAllowed: attemptNumber === 1,
        issues: [
          {
            code: "INVALID_JSON",
            path: "$",
            message: "Judge response is not valid JSON",
          },
        ],
      };
    }
  }
  const parsed = judgeResponseSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      valid: false,
      response: null,
      responseHash: null,
      retryAllowed: attemptNumber === 1,
      issues: parsed.error.issues.map((issue) => ({
        code: "SCHEMA_INVALID" as const,
        path: issue.path.join(".") || "$",
        message: issue.message,
      })),
    };
  }
  const response = parsed.data;
  const issues: AiJudgeInvalidity[] = [];
  if (
    response.assignment_id !== assignment.assignmentId ||
    response.judge_id !== assignment.judgeId
  ) {
    issues.push({
      code: "ASSIGNMENT_MISMATCH",
      path: "$",
      message: "Response does not match its independent assignment",
    });
  }
  const expectedClips = assignment.pairs.flatMap((pair) =>
    pair.clips.map((clip) => clip.neutralLabel),
  );
  const expectedPairs = assignment.pairs.map(
    (pair) => pair.neutralPairLabel,
  );
  if (
    !uniqueSetMatches(
      response.clips.map((clip) => clip.clip_label),
      expectedClips,
    ) ||
    !uniqueSetMatches(
      response.pairs.map((pair) => pair.pair_label),
      expectedPairs,
    )
  ) {
    issues.push({
      code: "INCOMPLETE_SET",
      path: "$",
      message: "Response clip or pair set is incomplete or duplicated",
    });
  }
  const searchable = allTextValues(response);
  if (
    /\b(?:baseline|corrected|piper|bryce|linda|cori|elevenlabs|pipeline|provider)\b/iu.test(
      searchable,
    )
  ) {
    issues.push({
      code: "UNBLINDING_CLAIM",
      path: "$",
      message: "Response claims or guesses a hidden identity",
    });
  }
  if (
    /\b(?:file(?:name)?|metadata|id3|codec|bitrate|hash|mp3|attachment name)\b/iu.test(
      searchable,
    )
  ) {
    issues.push({
      code: "FILE_OR_METADATA_EVIDENCE",
      path: "$",
      message: "Response uses file or metadata evidence",
    });
  }
  if (
    /\b(?:transcript|written text|text-only|text content|script wording)\b/iu.test(
      searchable,
    )
  ) {
    issues.push({
      code: "TRANSCRIPT_ONLY_EVIDENCE",
      path: "$",
      message: "Response appears to rely on text instead of heard audio",
    });
  }
  const audioEvidencePattern =
    /\b(?:sound|heard|voice|delivery|pause|pace|pacing|rhythm|pronunciation|articulation|intonation|stress|timing|comfort|natural|breath|silence|tempo|cadence|pitch|tone|ending)\w*/iu;
  if (
    response.clips.some(
      (clip) => !audioEvidencePattern.test(clip.evidence_note),
    ) ||
    response.pairs.some(
      (pair) => !audioEvidencePattern.test(pair.concise_reason),
    )
  ) {
    issues.push({
      code: "TRANSCRIPT_ONLY_EVIDENCE",
      path: "$",
      message:
        "Every note and reason must cite something perceptible in the audio",
    });
  }
  const pairReasons = response.pairs.map((pair) =>
    normalizeBoilerplate(pair.concise_reason, assignment),
  );
  const clipNotes = response.clips.map((clip) =>
    normalizeBoilerplate(clip.evidence_note, assignment),
  );
  if (
    new Set(pairReasons).size <= 1 ||
    new Set(clipNotes).size <= 1
  ) {
    issues.push({
      code: "IDENTICAL_BOILERPLATE",
      path: "$",
      message:
        "Evidence is identical boilerplate instead of clip-specific observations",
    });
  }
  if (
    response.pairs.some(
      (pair) =>
        pair.concise_reason.trim().split(/\s+/u).length < 5,
    ) ||
    response.clips.some(
      (clip) =>
        clip.evidence_note.trim().split(/\s+/u).length < 5,
    )
  ) {
    issues.push({
      code: "SCHEMA_INVALID",
      path: "$",
      message:
        "Evidence notes must contain a short audio-specific observation",
    });
  }
  const clearlyDistinct = new Set(
    options.clearlyDistinctSourcePairIds ?? [],
  );
  for (const pairAssignment of assignment.pairs) {
    const pair = response.pairs.find(
      (candidatePair) =>
        candidatePair.pair_label ===
        pairAssignment.neutralPairLabel,
    );
    if (!pair) continue;
    const labels = pairAssignment.clips.map(
      (clip) => clip.neutralLabel,
    );
    if (
      !preferenceAllowed(pair.preferred_version_overall, labels) ||
      !preferenceAllowed(pair.clearer_version, labels) ||
      !preferenceAllowed(pair.more_natural_version, labels) ||
      !preferenceAllowed(pair.better_paced_version, labels) ||
      !preferenceAllowed(pair.long_lesson_preference, labels) ||
      !uniqueSetMatches(
        pair.speed_assessment.map((speed) => speed.clip_label),
        labels,
      ) ||
      pair.pronunciation_issues.some(
        (issue) => !labels.includes(issue.clip_label),
      )
    ) {
      issues.push({
        code: "INCOMPLETE_SET",
        path: `pairs.${pair.pair_label}`,
        message:
          "Pair choices or clip-level details do not match the assigned clips",
      });
      continue;
    }
    const otherFor = (choice: string) =>
      labels.find((label) => label !== choice) ?? labels[0]!;
    const strictOverallContradiction =
      pair.preferred_version_overall !== "NO_PREFERENCE" &&
      AI_AUDIO_SCORE_DIMENSIONS.every(
        (dimension) =>
          scoreFor(
            response,
            pair.preferred_version_overall,
            dimension,
          ) <
          scoreFor(
            response,
            otherFor(pair.preferred_version_overall),
            dimension,
          ),
      );
    if (
      strictOverallContradiction ||
      pair.speed_assessment.some(
        (speed) => speed.too_slow && speed.too_fast,
      ) ||
      pair.pronunciation_issues.some(
        (issue) =>
          issue.severity === "critical" &&
          scoreFor(
            response,
            issue.clip_label,
            "pronunciation",
          ) >= 4,
      ) ||
      choiceContradictsScore(
        response,
        pair.clearer_version,
        otherFor(pair.clearer_version),
        "clarity",
      ) ||
      choiceContradictsScore(
        response,
        pair.more_natural_version,
        otherFor(pair.more_natural_version),
        "naturalness",
      ) ||
      choiceContradictsScore(
        response,
        pair.long_lesson_preference,
        otherFor(pair.long_lesson_preference),
        "long_form_suitability",
      ) ||
      (pair.audible_distinction === "NONE" &&
        pair.confidence >= 80 &&
        [
          pair.preferred_version_overall,
          pair.clearer_version,
          pair.more_natural_version,
          pair.better_paced_version,
          pair.long_lesson_preference,
        ].every((choice) => choice !== "NO_PREFERENCE"))
    ) {
      issues.push({
        code: "INTERNAL_CONTRADICTION",
        path: `pairs.${pair.pair_label}`,
        message:
          "Preference, confidence, audible distinction, and scores conflict",
      });
    }
    if (
      clearlyDistinct.has(pairAssignment.sourcePairId) &&
      pair.audible_distinction === "NONE"
    ) {
      issues.push({
        code: "AUDIBLE_DISTINCTION_NOT_ACKNOWLEDGED",
        path: `pairs.${pair.pair_label}.audible_distinction`,
        message:
          "A locally verified audible distinction was not acknowledged",
      });
    }
    if (
      pairAssignment.tableEvaluation !==
      (pair.table_evaluation !== null)
    ) {
      issues.push({
        code: "INCOMPLETE_SET",
        path: `pairs.${pair.pair_label}.table_evaluation`,
        message:
          "Table-specific answers do not match the assigned table set",
      });
    }
    if (pair.table_evaluation) {
      const table = pair.table_evaluation;
      if (
        !preferenceAllowed(table.easier_to_follow, labels) ||
        !(
          table.longer_clip === "SIMILAR_DURATION" ||
          labels.includes(table.longer_clip)
        )
      ) {
        issues.push({
          code: "INCOMPLETE_SET",
          path: `pairs.${pair.pair_label}.table_evaluation`,
          message:
            "Table-specific choices do not match the assigned clips",
        });
      }
      if (
        table.longer_clip === "SIMILAR_DURATION" &&
        (table.longer_duration_excessive === "yes" ||
          table.clarity_justifies_added_duration === "yes")
      ) {
        issues.push({
          code: "INTERNAL_CONTRADICTION",
          path: `pairs.${pair.pair_label}.table_evaluation`,
          message:
            "Similar duration conflicts with claims about excessive or justified added duration",
        });
      }
    }
  }
  if (issues.length > 0) {
    return {
      valid: false,
      response: null,
      responseHash: hashAiValue(response),
      retryAllowed: attemptNumber === 1,
      issues,
    };
  }
  return {
    valid: true,
    response,
    responseHash: hashAiValue(response),
    retryAllowed: false,
    issues: [],
  };
}

export interface AiAudioModelPricing {
  providerId: "openrouter";
  modelId: string;
  verification: "VERIFIED" | "UNVERIFIED";
  audioInputUsdPerMillionTokens: number;
  textInputUsdPerMillionTokens: number;
  textOutputUsdPerMillionTokens: number;
  audioTokensPerSecond: number;
  source: string;
  verifiedAt: string;
  authoritativeActualCostField: "usage.cost";
}

export interface EstimateEvaluationCostInput {
  pricing: AiAudioModelPricing;
  prompts: readonly string[];
  audioDurationSecondsPerRequest: number;
  primaryRequestCount: number;
  maximumRequestCount: number;
  maximumOutputTokensPerRequest: number;
  additionalInputTokensPerRequest?: number;
  hardMaximumUsd: number;
}

export interface AiEvaluationCostEstimate {
  model_id: string;
  pricing_verification: AiAudioModelPricing["verification"];
  pricing_source: string;
  pricing_verified_at: string;
  unit_pricing: {
    audio_input_usd_per_million_tokens: number;
    text_input_usd_per_million_tokens: number;
    text_output_usd_per_million_tokens: number;
    audio_tokens_per_second: number;
  };
  primary_request_count: number;
  maximum_request_count: number;
  audio_seconds_per_request: number;
  maximum_audio_input_seconds: number;
  maximum_audio_input_tokens: number;
  maximum_text_input_tokens: number;
  maximum_text_output_tokens: number;
  estimated_audio_input_usd: number;
  estimated_text_input_usd: number;
  estimated_text_output_usd: number;
  maximum_single_request_usd: number;
  estimated_maximum_usd: number;
  hard_maximum_usd: number;
  paid_execution_allowed: boolean;
  blocking_reasons: readonly (
    | "UNVERIFIED_PRICING"
    | "CAP_ABOVE_AUTHORIZED_MAXIMUM"
    | "ESTIMATE_EXCEEDS_CAP"
  )[];
}

function assertNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number`);
  }
}

export function estimateEvaluationCost(
  input: EstimateEvaluationCostInput,
): AiEvaluationCostEstimate {
  for (const [label, value] of [
    [
      "audioInputUsdPerMillionTokens",
      input.pricing.audioInputUsdPerMillionTokens,
    ],
    [
      "textInputUsdPerMillionTokens",
      input.pricing.textInputUsdPerMillionTokens,
    ],
    [
      "textOutputUsdPerMillionTokens",
      input.pricing.textOutputUsdPerMillionTokens,
    ],
    ["audioTokensPerSecond", input.pricing.audioTokensPerSecond],
    [
      "audioDurationSecondsPerRequest",
      input.audioDurationSecondsPerRequest,
    ],
    [
      "maximumOutputTokensPerRequest",
      input.maximumOutputTokensPerRequest,
    ],
    [
      "additionalInputTokensPerRequest",
      input.additionalInputTokensPerRequest ?? 0,
    ],
    ["hardMaximumUsd", input.hardMaximumUsd],
  ] as const) {
    assertNonNegative(value, label);
  }
  if (
    input.pricing.audioInputUsdPerMillionTokens <= 0 ||
    input.pricing.textInputUsdPerMillionTokens <= 0 ||
    input.pricing.textOutputUsdPerMillionTokens <= 0 ||
    input.pricing.audioTokensPerSecond <= 0
  ) {
    throw new Error(
      "Verified unit prices and audio token rate must be positive",
    );
  }
  if (
    !input.pricing.source.trim() ||
    Number.isNaN(Date.parse(input.pricing.verifiedAt))
  ) {
    throw new Error(
      "Pricing requires a source and valid verification timestamp",
    );
  }
  if (
    !Number.isInteger(input.primaryRequestCount) ||
    input.primaryRequestCount <= 0 ||
    !Number.isInteger(input.maximumRequestCount) ||
    input.maximumRequestCount < input.primaryRequestCount ||
    input.prompts.length !== input.primaryRequestCount
  ) {
    throw new Error("Invalid primary or maximum request count");
  }
  const attemptsPerPrimary =
    input.maximumRequestCount / input.primaryRequestCount;
  if (!Number.isInteger(attemptsPerPrimary)) {
    throw new Error(
      "Maximum request count must reserve equal attempts per judge",
    );
  }
  const promptTokenEstimate = input.prompts.reduce(
    (sum, prompt) => sum + Math.ceil(prompt.length / 4),
    0,
  );
  const largestPromptTokens = Math.max(
    ...input.prompts.map((prompt) => Math.ceil(prompt.length / 4)),
  );
  const maximumTextInputTokens =
    promptTokenEstimate * attemptsPerPrimary +
    (input.additionalInputTokensPerRequest ?? 0) *
      input.maximumRequestCount;
  const maximumAudioInputSeconds =
    input.audioDurationSecondsPerRequest * input.maximumRequestCount;
  const maximumAudioInputTokens = Math.ceil(
    maximumAudioInputSeconds * input.pricing.audioTokensPerSecond,
  );
  const maximumTextOutputTokens =
    input.maximumOutputTokensPerRequest * input.maximumRequestCount;
  const estimatedAudioInputUsd =
    (maximumAudioInputTokens / 1_000_000) *
    input.pricing.audioInputUsdPerMillionTokens;
  const estimatedTextInputUsd =
    (maximumTextInputTokens / 1_000_000) *
    input.pricing.textInputUsdPerMillionTokens;
  const estimatedTextOutputUsd =
    (maximumTextOutputTokens / 1_000_000) *
    input.pricing.textOutputUsdPerMillionTokens;
  const maximumSingleRequestUsd =
    (Math.ceil(
      input.audioDurationSecondsPerRequest *
        input.pricing.audioTokensPerSecond,
    ) /
      1_000_000) *
      input.pricing.audioInputUsdPerMillionTokens +
    ((largestPromptTokens +
      (input.additionalInputTokensPerRequest ?? 0)) /
      1_000_000) *
      input.pricing.textInputUsdPerMillionTokens +
    (input.maximumOutputTokensPerRequest / 1_000_000) *
      input.pricing.textOutputUsdPerMillionTokens;
  const estimatedMaximumUsd =
    estimatedAudioInputUsd +
    estimatedTextInputUsd +
    estimatedTextOutputUsd;
  const blockingReasons: AiEvaluationCostEstimate["blocking_reasons"][number][] =
    [];
  if (input.pricing.verification !== "VERIFIED") {
    blockingReasons.push("UNVERIFIED_PRICING");
  }
  if (input.hardMaximumUsd > 8) {
    blockingReasons.push("CAP_ABOVE_AUTHORIZED_MAXIMUM");
  }
  if (estimatedMaximumUsd > input.hardMaximumUsd) {
    blockingReasons.push("ESTIMATE_EXCEEDS_CAP");
  }
  return {
    model_id: input.pricing.modelId,
    pricing_verification: input.pricing.verification,
    pricing_source: input.pricing.source,
    pricing_verified_at: new Date(
      input.pricing.verifiedAt,
    ).toISOString(),
    unit_pricing: {
      audio_input_usd_per_million_tokens:
        input.pricing.audioInputUsdPerMillionTokens,
      text_input_usd_per_million_tokens:
        input.pricing.textInputUsdPerMillionTokens,
      text_output_usd_per_million_tokens:
        input.pricing.textOutputUsdPerMillionTokens,
      audio_tokens_per_second: input.pricing.audioTokensPerSecond,
    },
    primary_request_count: input.primaryRequestCount,
    maximum_request_count: input.maximumRequestCount,
    audio_seconds_per_request: input.audioDurationSecondsPerRequest,
    maximum_audio_input_seconds: maximumAudioInputSeconds,
    maximum_audio_input_tokens: maximumAudioInputTokens,
    maximum_text_input_tokens: maximumTextInputTokens,
    maximum_text_output_tokens: maximumTextOutputTokens,
    estimated_audio_input_usd: roundMoney(estimatedAudioInputUsd),
    estimated_text_input_usd: roundMoney(estimatedTextInputUsd),
    estimated_text_output_usd: roundMoney(estimatedTextOutputUsd),
    maximum_single_request_usd: roundMoney(
      maximumSingleRequestUsd,
    ),
    estimated_maximum_usd: roundMoney(estimatedMaximumUsd),
    hard_maximum_usd: input.hardMaximumUsd,
    paid_execution_allowed: blockingReasons.length === 0,
    blocking_reasons: blockingReasons,
  };
}

export interface BuildAiEvaluationPlanInput {
  evaluationPackageId: string;
  manifestSha256: string;
  modelId: string;
  assignments: readonly AiBlindJudgeAssignment[];
  pricing: AiAudioModelPricing;
  maximumOutputTokensPerRequest: number;
  additionalInputTokensPerRequest?: number;
  hardMaximumUsd: number;
  maximumAttemptsPerJudge?: 1 | 2;
}

export interface AiEvaluationPlan {
  schema_version: typeof AI_AUDIO_EVALUATION_PLAN_SCHEMA_VERSION;
  evaluation_package_id: string;
  manifest_sha256: string;
  provider: {
    id: "openrouter";
    api_base_url: "https://openrouter.ai/api/v1";
    endpoint: "/chat/completions";
    allow_fallbacks: false;
    require_parameters: true;
    prompt_logging_requested: false;
    data_use_opt_in_requested: false;
    authoritative_actual_cost_field: "usage.cost";
  };
  model_id: string;
  judge_count: 5;
  primary_request_count: 5;
  maximum_request_count: number;
  audio_file_count: number;
  total_audio_duration_seconds: number;
  expected_maximum_audio_input_seconds: number;
  expected_maximum_text_output_tokens: number;
  audio_inputs: readonly {
    source_sample_id: string;
    sha256: string;
    duration_seconds: number;
  }[];
  judge_runs: readonly {
    assignment_id: string;
    judge_id: string;
    lens_id: AiAudioJudgeLensId;
    assignment_hash: string;
    prompt_sha256: string;
  }[];
  cost: AiEvaluationCostEstimate;
  plan_hash: string;
}

export function buildAiEvaluationPlan(
  input: BuildAiEvaluationPlanInput,
): AiEvaluationPlan {
  assertSha256(input.manifestSha256, "manifestSha256");
  if (
    !/^blind-review-[a-f0-9]{16}$/u.test(
      input.evaluationPackageId,
    )
  ) {
    throw new Error("Invalid evaluation package id");
  }
  if (
    input.assignments.length !== 5 ||
    new Set(input.assignments.map((item) => item.judgeId)).size !== 5
  ) {
    throw new Error("An evaluation plan requires five assignments");
  }
  if (input.modelId !== input.pricing.modelId) {
    throw new Error("Plan and pricing model ids differ");
  }
  if (
    input.pricing.providerId !== "openrouter" ||
    input.modelId !== "openai/gpt-audio" ||
    input.pricing.authoritativeActualCostField !==
      "usage.cost"
  ) {
    throw new Error(
      "Phase 2C is pinned to OpenRouter openai/gpt-audio with usage.cost accounting",
    );
  }
  for (const assignment of input.assignments) {
    const { assignmentHash, ...assignmentWithoutHash } = assignment;
    if (
      assignment.evaluationPackageId !==
        input.evaluationPackageId ||
      assignmentHash !== hashAiValue(assignmentWithoutHash)
    ) {
      throw new Error(
        `Assignment changed before planning: ${assignment.judgeId}`,
      );
    }
  }
  const audioById = new Map<
    string,
    {
      source_sample_id: string;
      sha256: string;
      duration_seconds: number;
    }
  >();
  for (const assignment of input.assignments) {
    for (const clip of assignment.pairs.flatMap(
      (pair) => pair.clips,
    )) {
      const existing = audioById.get(clip.sourceSampleId);
      if (
        existing &&
        (existing.sha256 !== clip.audioSha256 ||
          existing.duration_seconds !== clip.durationSeconds)
      ) {
        throw new Error(
          `Audio input drift in assignments: ${clip.sourceSampleId}`,
        );
      }
      audioById.set(clip.sourceSampleId, {
        source_sample_id: clip.sourceSampleId,
        sha256: clip.audioSha256,
        duration_seconds: clip.durationSeconds,
      });
    }
  }
  const audioInputs = [...audioById.values()].sort((left, right) =>
    left.source_sample_id.localeCompare(right.source_sample_id),
  );
  if (audioInputs.length !== 10) {
    throw new Error("The Bryce plan requires ten unique audio inputs");
  }
  const totalDuration = audioInputs.reduce(
    (sum, audio) => sum + audio.duration_seconds,
    0,
  );
  const prompts = input.assignments.map(buildJudgePrompt);
  const maximumAttempts = input.maximumAttemptsPerJudge ?? 2;
  const maximumRequests = input.assignments.length * maximumAttempts;
  const cost = estimateEvaluationCost({
    pricing: input.pricing,
    prompts,
    audioDurationSecondsPerRequest: totalDuration,
    primaryRequestCount: 5,
    maximumRequestCount: maximumRequests,
    maximumOutputTokensPerRequest:
      input.maximumOutputTokensPerRequest,
    additionalInputTokensPerRequest:
      input.additionalInputTokensPerRequest,
    hardMaximumUsd: input.hardMaximumUsd,
  });
  const withoutHash = {
    schema_version:
      AI_AUDIO_EVALUATION_PLAN_SCHEMA_VERSION as typeof AI_AUDIO_EVALUATION_PLAN_SCHEMA_VERSION,
    evaluation_package_id: input.evaluationPackageId,
    manifest_sha256: input.manifestSha256,
    provider: {
      id: "openrouter" as const,
      api_base_url:
        "https://openrouter.ai/api/v1" as const,
      endpoint: "/chat/completions" as const,
      allow_fallbacks: false as const,
      require_parameters: true as const,
      prompt_logging_requested: false as const,
      data_use_opt_in_requested: false as const,
      authoritative_actual_cost_field:
        input.pricing.authoritativeActualCostField,
    },
    model_id: input.modelId,
    judge_count: 5 as const,
    primary_request_count: 5 as const,
    maximum_request_count: maximumRequests,
    audio_file_count: audioInputs.length,
    total_audio_duration_seconds: totalDuration,
    expected_maximum_audio_input_seconds:
      cost.maximum_audio_input_seconds,
    expected_maximum_text_output_tokens:
      cost.maximum_text_output_tokens,
    audio_inputs: audioInputs,
    judge_runs: input.assignments.map((assignment, index) => ({
      assignment_id: assignment.assignmentId,
      judge_id: assignment.judgeId,
      lens_id: assignment.lensId,
      assignment_hash: assignment.assignmentHash,
      prompt_sha256: sha256Text(prompts[index]!),
    })),
    cost,
  };
  return {
    ...withoutHash,
    plan_hash: hashAiValue(withoutHash),
  };
}

export type AiRequestLedgerStatus =
  | "ACCEPTED"
  | "REJECTED"
  | "UNCERTAIN_PAID"
  | "FAILED_NOT_BILLED";

export interface AiRequestLedgerEntry {
  sequence: number;
  requestId: string;
  judgeId: string;
  attempt: 1 | 2;
  status: AiRequestLedgerStatus;
  maximumPossibleCostUsd: number;
  actualCostUsd: number | null;
  usageKnown: boolean;
}

export interface AiRequestLedgerSummary {
  request_count: number;
  accepted_count: number;
  rejected_count: number;
  uncertain_paid_count: number;
  failed_not_billed_count: number;
  known_actual_cost_usd: number;
  uncertain_maximum_exposure_usd: number;
  cap_accounted_cost_usd: number;
}

export function summarizeAiRequestLedger(
  entries: readonly AiRequestLedgerEntry[],
): AiRequestLedgerSummary {
  const sequences = entries.map((entry) => entry.sequence);
  if (
    !sequences.every((sequence, index) => sequence === index + 1) ||
    new Set(entries.map((entry) => entry.requestId)).size !==
      entries.length ||
    new Set(
      entries.map(
        (entry) => `${entry.judgeId}\0${String(entry.attempt)}`,
      ),
    ).size !== entries.length
  ) {
    throw new Error(
      "Request ledger must be append-only, sequential, and unique by request and judge attempt",
    );
  }
  const byJudge = new Map<string, AiRequestLedgerEntry[]>();
  for (const entry of entries) {
    const judgeEntries = byJudge.get(entry.judgeId) ?? [];
    judgeEntries.push(entry);
    byJudge.set(entry.judgeId, judgeEntries);
  }
  for (const [judgeId, judgeEntries] of byJudge) {
    if (
      judgeEntries.length > 2 ||
      judgeEntries.some(
        (entry, index) => entry.attempt !== index + 1,
      ) ||
      judgeEntries
        .slice(0, -1)
        .some(
          (entry) =>
            entry.status === "ACCEPTED" ||
            entry.status === "UNCERTAIN_PAID",
        )
    ) {
      throw new Error(
        `${judgeId} has an invalid retry sequence in the request ledger`,
      );
    }
  }
  let knownActual = 0;
  let uncertainExposure = 0;
  for (const entry of entries) {
    assertNonNegative(
      entry.maximumPossibleCostUsd,
      `${entry.requestId} maximum cost`,
    );
    if (entry.status === "UNCERTAIN_PAID") {
      if (entry.actualCostUsd !== null || entry.usageKnown) {
        throw new Error(
          "UNCERTAIN_PAID entries cannot claim known usage",
        );
      }
      uncertainExposure += entry.maximumPossibleCostUsd;
    } else if (entry.status === "FAILED_NOT_BILLED") {
      if (entry.actualCostUsd !== 0 || !entry.usageKnown) {
        throw new Error(
          "FAILED_NOT_BILLED must explicitly record known zero cost",
        );
      }
    } else {
      if (
        entry.actualCostUsd === null ||
        !entry.usageKnown ||
        entry.actualCostUsd < 0 ||
        entry.actualCostUsd > entry.maximumPossibleCostUsd
      ) {
        throw new Error(
          "Billed entries require bounded actual cost and known usage",
        );
      }
      knownActual += entry.actualCostUsd;
    }
  }
  return {
    request_count: entries.length,
    accepted_count: entries.filter(
      (entry) => entry.status === "ACCEPTED",
    ).length,
    rejected_count: entries.filter(
      (entry) => entry.status === "REJECTED",
    ).length,
    uncertain_paid_count: entries.filter(
      (entry) => entry.status === "UNCERTAIN_PAID",
    ).length,
    failed_not_billed_count: entries.filter(
      (entry) => entry.status === "FAILED_NOT_BILLED",
    ).length,
    known_actual_cost_usd: roundMoney(knownActual),
    uncertain_maximum_exposure_usd: roundMoney(uncertainExposure),
    cap_accounted_cost_usd: roundMoney(
      knownActual + uncertainExposure,
    ),
  };
}

export interface AiPaidRequestGuardInput {
  plan: AiEvaluationPlan;
  ledger: readonly AiRequestLedgerEntry[];
  nextRequestMaximumCostUsd: number;
  nextJudgeId: string;
  nextAttempt: 1 | 2;
  allowPaidAiEvaluation: boolean;
  suppliedPlanHash: string;
  suppliedMaxUsd: number;
  suppliedMaxRequests: number;
  inputHashesMatch: boolean;
  manifestHashMatches: boolean;
  modelAvailable: boolean;
  secretAvailable: boolean;
  billingAvailable: boolean;
}

export interface AiPaidRequestGuardResult {
  allowed: boolean;
  reasons: readonly string[];
  accountedCostUsd: number;
  projectedMaximumCostUsd: number;
  requestsUsed: number;
  requestsRemaining: number;
}

export function authorizeNextAiRequest(
  input: AiPaidRequestGuardInput,
): AiPaidRequestGuardResult {
  assertNonNegative(
    input.nextRequestMaximumCostUsd,
    "nextRequestMaximumCostUsd",
  );
  const ledger = summarizeAiRequestLedger(input.ledger);
  const reasons: string[] = [];
  const priorJudgeEntries = input.ledger.filter(
    (entry) => entry.judgeId === input.nextJudgeId,
  );
  if (
    input.nextAttempt !== priorJudgeEntries.length + 1 ||
    input.nextAttempt > 2
  ) {
    reasons.push("Judge attempt is not the next allowed attempt");
  }
  if (
    priorJudgeEntries.some(
      (entry) => entry.status === "UNCERTAIN_PAID",
    )
  ) {
    reasons.push(
      "UNCERTAIN_PAID requests must not be retried automatically",
    );
  }
  if (
    priorJudgeEntries.some(
      (entry) => entry.status === "ACCEPTED",
    )
  ) {
    reasons.push("An accepted judge run must not be called again");
  }
  if (
    input.nextAttempt === 2 &&
    priorJudgeEntries[0]?.status !== "REJECTED"
  ) {
    reasons.push(
      "A second attempt is allowed only after one invalid rejected response",
    );
  }
  if (!input.allowPaidAiEvaluation) {
    reasons.push("Missing --allow-paid-ai-evaluation");
  }
  if (input.suppliedPlanHash !== input.plan.plan_hash) {
    reasons.push("Plan hash differs");
  }
  if (
    input.suppliedMaxUsd !== 8 ||
    input.suppliedMaxUsd !== input.plan.cost.hard_maximum_usd
  ) {
    reasons.push("The paid cap must exactly match the approved USD 8 plan");
  }
  if (
    input.suppliedMaxRequests !==
    input.plan.maximum_request_count
  ) {
    reasons.push("Request cap differs from the deterministic plan");
  }
  if (!input.plan.cost.paid_execution_allowed) {
    reasons.push(...input.plan.cost.blocking_reasons);
  }
  if (
    input.nextRequestMaximumCostUsd <
    input.plan.cost.maximum_single_request_usd
  ) {
    reasons.push(
      "Next-request maximum understates the deterministic per-request bound",
    );
  }
  if (!input.inputHashesMatch) reasons.push("Audio inputs changed");
  if (!input.manifestHashMatches) reasons.push("Manifest changed");
  if (!input.modelAvailable) reasons.push("Model unavailable");
  if (!input.secretAvailable) reasons.push("API secret absent");
  if (!input.billingAvailable) {
    reasons.push("Billing or authentication unavailable");
  }
  const projected =
    ledger.cap_accounted_cost_usd +
    input.nextRequestMaximumCostUsd;
  if (ledger.request_count + 1 > input.suppliedMaxRequests) {
    reasons.push("Next request would exceed the request cap");
  }
  if (projected > input.suppliedMaxUsd) {
    reasons.push("Next request could exceed the spending cap");
  }
  return {
    allowed: reasons.length === 0,
    reasons,
    accountedCostUsd: ledger.cap_accounted_cost_usd,
    projectedMaximumCostUsd: roundMoney(projected),
    requestsUsed: ledger.request_count,
    requestsRemaining: Math.max(
      0,
      input.suppliedMaxRequests - ledger.request_count,
    ),
  };
}

export interface AiPrivateSampleIdentity {
  sourceSampleId: string;
  sourcePairId: string;
  candidateId: string;
  pipeline: AiPipelineIdentity;
  voice: AiLocalVoice;
}

export interface AiObjectiveFinding {
  sampleId: string | null;
  pairId: string | null;
  code: string;
  detail: string;
  severity: "informational" | "warning" | "blocking";
}

export interface AiObjectiveDirectionalFinding {
  pairId: string;
  metric: string;
  favoredCandidateId: string | null;
  strength: "weak" | "moderate" | "strong";
}

export interface AiObjectiveAnalysisSummary {
  analysisHash: string;
  blockingDefects: readonly AiObjectiveFinding[];
  regressions: readonly AiObjectiveFinding[];
  improvements: readonly AiObjectiveFinding[];
  directionalFindings: readonly AiObjectiveDirectionalFinding[];
  clearlyDistinctPairIds: readonly string[];
}

export interface AiValidatedJudgeRun {
  assignment: AiBlindJudgeAssignment;
  response: AiJudgeResponse;
  responseHash: string;
}

export interface AiDescriptiveStatistics {
  count: number;
  mean: number | null;
  median: number | null;
}

export interface AiPreferenceSummary {
  counts: Readonly<Record<string, number>>;
  total: number;
  majorityCandidateId: string | null;
  agreementRate: number | null;
  confidenceWeightedCounts: Readonly<Record<string, number>>;
}

export interface AiPairPreferenceSummary {
  overall: AiPreferenceSummary;
  clearer: AiPreferenceSummary;
  more_natural: AiPreferenceSummary;
  better_paced: AiPreferenceSummary;
  long_lesson: AiPreferenceSummary;
}

export interface AiPanelAnalysis {
  schema_version: typeof AI_AUDIO_PANEL_ANALYSIS_SCHEMA_VERSION;
  evaluation_package_id: string;
  valid_judge_count: number;
  perceptual: {
    by_file: Readonly<
      Record<
        string,
        Record<AiAudioScoreDimension, AiDescriptiveStatistics>
      >
    >;
    by_candidate: Readonly<
      Record<
        string,
        Record<AiAudioScoreDimension, AiDescriptiveStatistics>
      >
    >;
    score_difference_corrected_minus_baseline: Readonly<
      Record<AiAudioScoreDimension, AiDescriptiveStatistics>
    >;
    pair_preferences: Readonly<
      Record<string, AiPairPreferenceSummary>
    >;
    corrected_pair_majority_wins: number;
    corrected_pair_win_rate: number | null;
    corrected_overall_preference_rate: number | null;
    confidence_weighted_corrected_preference_rate: number | null;
    corrected_long_form_preference_rate: number | null;
    judge_agreement_mean: number | null;
    mean_confidence: number | null;
    speed: {
      too_slow_by_candidate: Readonly<Record<string, number>>;
      too_fast_by_candidate: Readonly<Record<string, number>>;
      too_slow_by_sample: Readonly<Record<string, number>>;
      too_fast_by_sample: Readonly<Record<string, number>>;
    };
    pronunciation_issues: readonly {
      judgeId: string;
      sampleId: string;
      candidateId: string;
      severity:
        | "none"
        | "minor"
        | "moderate"
        | "major"
        | "critical";
      description: string;
    }[];
    table: {
      pairId: string | null;
      corrected_clearer_rate: number | null;
      repeated_labels_helpful_rate: number | null;
      corrected_duration_excessive_rate: number | null;
      clarity_justifies_added_duration_rate: number | null;
      concise_table_test_yes_rate: number | null;
    };
  };
  objective: AiObjectiveAnalysisSummary;
  agreement: {
    comparisons: number;
    agreements: number;
    contradictions: number;
    unresolved: number;
    contradiction_rate: number | null;
    details: readonly {
      pairId: string;
      metric: string;
      objectiveFavoredCandidateId: string;
      perceptualMajorityCandidateId: string | null;
      outcome: "agreement" | "contradiction" | "unresolved";
    }[];
  };
  analysis_hash: string;
}

function descriptive(values: readonly number[]): AiDescriptiveStatistics {
  if (values.length === 0) {
    return { count: 0, mean: null, median: null };
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? sorted[middle]!
      : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return {
    count: values.length,
    mean:
      values.reduce((sum, value) => sum + value, 0) /
      values.length,
    median,
  };
}

function increment(
  record: Record<string, number>,
  key: string,
  amount = 1,
): void {
  record[key] = (record[key] ?? 0) + amount;
}

export interface AggregateAiPanelInput {
  evaluationPackageId: string;
  runs: readonly AiValidatedJudgeRun[];
  privateSamples: readonly AiPrivateSampleIdentity[];
  objective: AiObjectiveAnalysisSummary;
}

export function aggregateAiPanel(
  input: AggregateAiPanelInput,
): AiPanelAnalysis {
  assertSha256(input.objective.analysisHash, "objective.analysisHash");
  const identities = new Map(
    input.privateSamples.map((sample) => [
      sample.sourceSampleId,
      sample,
    ]),
  );
  if (
    identities.size !== input.privateSamples.length ||
    input.privateSamples.length === 0
  ) {
    throw new Error("Private sample identities are empty or duplicated");
  }
  const correctedCandidateIds = [
    ...new Set(
      input.privateSamples
        .filter(
          (sample) =>
            sample.pipeline === "corrected" &&
            sample.voice === "bryce",
        )
        .map((sample) => sample.candidateId),
    ),
  ];
  const baselineCandidateIds = [
    ...new Set(
      input.privateSamples
        .filter(
          (sample) =>
            sample.pipeline === "baseline" &&
            sample.voice === "bryce",
        )
        .map((sample) => sample.candidateId),
    ),
  ];
  if (
    correctedCandidateIds.length !== 1 ||
    baselineCandidateIds.length !== 1
  ) {
    throw new Error(
      "Bryce aggregation requires one corrected and one baseline candidate id",
    );
  }
  const correctedCandidateId = correctedCandidateIds[0]!;
  const judgeIds = new Set<string>();
  const fileScores = new Map<
    string,
    Record<AiAudioScoreDimension, number[]>
  >();
  const candidateScores = new Map<
    string,
    Record<AiAudioScoreDimension, number[]>
  >();
  const pairedDifferences = Object.fromEntries(
    AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      [] as number[],
    ]),
  ) as Record<AiAudioScoreDimension, number[]>;
  const pairVotes = new Map<
    string,
    {
      counts: Record<string, number>;
      confidence: Record<string, number>;
      total: number;
    }
  >();
  const clearerVotes = new Map<
    string,
    {
      counts: Record<string, number>;
      confidence: Record<string, number>;
      total: number;
    }
  >();
  const naturalVotes = new Map<
    string,
    {
      counts: Record<string, number>;
      confidence: Record<string, number>;
      total: number;
    }
  >();
  const pacedVotes = new Map<
    string,
    {
      counts: Record<string, number>;
      confidence: Record<string, number>;
      total: number;
    }
  >();
  const longVotes = new Map<
    string,
    {
      counts: Record<string, number>;
      confidence: Record<string, number>;
      total: number;
    }
  >();
  const tooSlow: Record<string, number> = {};
  const tooFast: Record<string, number> = {};
  const tooSlowBySample: Record<string, number> = {};
  const tooFastBySample: Record<string, number> = {};
  const confidenceValues: number[] = [];
  const pronunciationIssues: AiPanelAnalysis["perceptual"]["pronunciation_issues"][number][] =
    [];
  const tableRecords: {
    pairId: string;
    correctedClearer: boolean;
    repeatedHelpful: boolean | null;
    correctedExcessive: boolean | null;
    clarityJustifies: boolean | null;
    conciseYes: boolean;
  }[] = [];

  const emptyDimensionRecord = () =>
    Object.fromEntries(
      AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
        dimension,
        [] as number[],
      ]),
    ) as Record<AiAudioScoreDimension, number[]>;

  for (const run of input.runs) {
    if (judgeIds.has(run.assignment.judgeId)) {
      throw new Error("Each judge may contribute only one accepted run");
    }
    judgeIds.add(run.assignment.judgeId);
    const validation = validateJudgeResponse(
      run.response,
      run.assignment,
      {
        attemptNumber: 2,
        clearlyDistinctSourcePairIds:
          input.objective.clearlyDistinctPairIds,
      },
    );
    if (
      !validation.valid ||
      validation.responseHash !== run.responseHash
    ) {
      throw new Error(
        `Run is not a validated response: ${run.assignment.judgeId}`,
      );
    }
    const labelToSource = new Map(
      run.assignment.pairs.flatMap((pair) =>
        pair.clips.map((clip) => [
          clip.neutralLabel,
          clip.sourceSampleId,
        ]),
      ),
    );
    for (const clip of run.response.clips) {
      const sourceId = labelToSource.get(clip.clip_label);
      const identity = sourceId
        ? identities.get(sourceId)
        : undefined;
      if (!sourceId || !identity) {
        throw new Error(`Missing private identity for ${clip.clip_label}`);
      }
      const byFile =
        fileScores.get(sourceId) ?? emptyDimensionRecord();
      const byCandidate =
        candidateScores.get(identity.candidateId) ??
        emptyDimensionRecord();
      for (const dimension of AI_AUDIO_SCORE_DIMENSIONS) {
        byFile[dimension].push(clip.scores[dimension]);
        byCandidate[dimension].push(clip.scores[dimension]);
      }
      fileScores.set(sourceId, byFile);
      candidateScores.set(identity.candidateId, byCandidate);
    }
    for (const assignmentPair of run.assignment.pairs) {
      const responsePair = run.response.pairs.find(
        (pair) =>
          pair.pair_label === assignmentPair.neutralPairLabel,
      );
      if (!responsePair) {
        throw new Error(
          `Missing pair ${assignmentPair.neutralPairLabel}`,
        );
      }
      const identitiesForPair = assignmentPair.clips.map((clip) => {
        const identity = identities.get(clip.sourceSampleId);
        if (!identity) {
          throw new Error(
            `Missing private identity for ${clip.sourceSampleId}`,
          );
        }
        return { clip, identity };
      });
      const candidateForChoice = (choice: string) => {
        if (choice === "NO_PREFERENCE") return "NO_PREFERENCE";
        return (
          identitiesForPair.find(
            ({ clip }) => clip.neutralLabel === choice,
          )?.identity.candidateId ?? "NO_PREFERENCE"
        );
      };
      const preference = candidateForChoice(
        responsePair.preferred_version_overall,
      );
      confidenceValues.push(responsePair.confidence);
      const addVote = (
        collection: typeof pairVotes,
        choice: string,
      ) => {
        const vote =
          collection.get(assignmentPair.sourcePairId) ?? {
            counts: {},
            confidence: {},
            total: 0,
          };
        increment(vote.counts, choice);
        increment(
          vote.confidence,
          choice,
          responsePair.confidence,
        );
        vote.total += 1;
        collection.set(assignmentPair.sourcePairId, vote);
      };
      addVote(pairVotes, preference);
      addVote(
        clearerVotes,
        candidateForChoice(responsePair.clearer_version),
      );
      addVote(
        naturalVotes,
        candidateForChoice(responsePair.more_natural_version),
      );
      addVote(
        pacedVotes,
        candidateForChoice(responsePair.better_paced_version),
      );
      addVote(
        longVotes,
        candidateForChoice(responsePair.long_lesson_preference),
      );
      /*
       * Overall preferences drive the provisional win thresholds. The other
       * four dimensions remain separate so disagreement is not hidden.
       */
      for (const speed of responsePair.speed_assessment) {
        const candidate = candidateForChoice(speed.clip_label);
        const sourceId = labelToSource.get(speed.clip_label);
        if (speed.too_slow) increment(tooSlow, candidate);
        if (speed.too_fast) increment(tooFast, candidate);
        if (sourceId && speed.too_slow) {
          increment(tooSlowBySample, sourceId);
        }
        if (sourceId && speed.too_fast) {
          increment(tooFastBySample, sourceId);
        }
      }
      for (const issue of responsePair.pronunciation_issues) {
        const sourceId = labelToSource.get(issue.clip_label);
        const identity = sourceId
          ? identities.get(sourceId)
          : undefined;
        if (sourceId && identity) {
          pronunciationIssues.push({
            judgeId: run.assignment.judgeId,
            sampleId: sourceId,
            candidateId: identity.candidateId,
            severity: issue.severity,
            description: issue.description,
          });
        }
      }
      const corrected = identitiesForPair.find(
        ({ identity }) =>
          identity.pipeline === "corrected" &&
          identity.voice === "bryce",
      );
      const baseline = identitiesForPair.find(
        ({ identity }) =>
          identity.pipeline === "baseline" &&
          identity.voice === "bryce",
      );
      if (corrected && baseline) {
        const correctedScores = run.response.clips.find(
          (clip) =>
            clip.clip_label === corrected.clip.neutralLabel,
        )!.scores;
        const baselineScores = run.response.clips.find(
          (clip) =>
            clip.clip_label === baseline.clip.neutralLabel,
        )!.scores;
        for (const dimension of AI_AUDIO_SCORE_DIMENSIONS) {
          pairedDifferences[dimension].push(
            correctedScores[dimension] -
              baselineScores[dimension],
          );
        }
      }
      if (
        assignmentPair.tableEvaluation &&
        responsePair.table_evaluation &&
        corrected
      ) {
        const table = responsePair.table_evaluation;
        tableRecords.push({
          pairId: assignmentPair.sourcePairId,
          correctedClearer:
            table.easier_to_follow === corrected.clip.neutralLabel,
          repeatedHelpful:
            table.repeated_labels_helpful === "uncertain"
              ? null
              : table.repeated_labels_helpful === "yes",
          correctedExcessive:
            table.longer_clip !== corrected.clip.neutralLabel
              ? null
              : table.longer_duration_excessive === "uncertain"
                ? null
                : table.longer_duration_excessive === "yes",
          clarityJustifies:
            table.clarity_justifies_added_duration ===
            "not_applicable"
              ? null
              : table.clarity_justifies_added_duration === "yes",
          conciseYes:
            table.test_more_concise_table_narration === "yes",
        });
      }
    }
  }

  const byFile = Object.fromEntries(
    [...fileScores.entries()].map(([sampleId, dimensions]) => [
      sampleId,
      Object.fromEntries(
        AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
          dimension,
          descriptive(dimensions[dimension]),
        ]),
      ),
    ]),
  ) as AiPanelAnalysis["perceptual"]["by_file"];
  const byCandidate = Object.fromEntries(
    [...candidateScores.entries()].map(
      ([candidateId, dimensions]) => [
        candidateId,
        Object.fromEntries(
          AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
            dimension,
            descriptive(dimensions[dimension]),
          ]),
        ),
      ],
    ),
  ) as AiPanelAnalysis["perceptual"]["by_candidate"];
  const pairPreferences: Record<
    string,
    AiPairPreferenceSummary
  > = {};
  let correctedWins = 0;
  let correctedPreferences = 0;
  let confidenceCorrected = 0;
  let confidenceTotal = 0;
  let totalPreferences = 0;
  let correctedLong = 0;
  let totalLong = 0;
  const summarizePreference = (
    vote:
      | {
          counts: Record<string, number>;
          confidence: Record<string, number>;
          total: number;
        }
      | undefined,
  ): AiPreferenceSummary => {
    const resolved = vote ?? {
      counts: {},
      confidence: {},
      total: 0,
    };
    const directional = Object.entries(resolved.counts).filter(
      ([candidate]) => candidate !== "NO_PREFERENCE",
    );
    const max = Math.max(
      0,
      ...directional.map(([, count]) => count),
    );
    const leaders = directional.filter(([, count]) => count === max);
    const majority =
      max > resolved.total / 2 && leaders.length === 1
        ? leaders[0]![0]
        : null;
    return {
      counts: resolved.counts,
      total: resolved.total,
      majorityCandidateId: majority,
      agreementRate:
        resolved.total === 0 ? null : max / resolved.total,
      confidenceWeightedCounts: resolved.confidence,
    };
  };
  for (const [pairId, vote] of pairVotes) {
    const overall = summarizePreference(vote);
    const majority = overall.majorityCandidateId;
    if (majority === correctedCandidateId) correctedWins += 1;
    correctedPreferences +=
      vote.counts[correctedCandidateId] ?? 0;
    totalPreferences += vote.total;
    confidenceCorrected +=
      vote.confidence[correctedCandidateId] ?? 0;
    confidenceTotal += Object.values(vote.confidence).reduce(
      (sum, value) => sum + value,
      0,
    );
    const long = longVotes.get(pairId);
    correctedLong += long?.counts[correctedCandidateId] ?? 0;
    totalLong += Object.values(long?.counts ?? {}).reduce(
      (sum, value) => sum + value,
      0,
    );
    pairPreferences[pairId] = {
      overall,
      clearer: summarizePreference(clearerVotes.get(pairId)),
      more_natural: summarizePreference(
        naturalVotes.get(pairId),
      ),
      better_paced: summarizePreference(pacedVotes.get(pairId)),
      long_lesson: summarizePreference(long),
    };
  }
  const agreementValues = Object.values(pairPreferences)
    .flatMap((preference) => [
      preference.overall.agreementRate,
      preference.clearer.agreementRate,
      preference.more_natural.agreementRate,
      preference.better_paced.agreementRate,
      preference.long_lesson.agreementRate,
    ])
    .filter((rate): rate is number => rate !== null);
  const tablePairId = tableRecords[0]?.pairId ?? null;
  const booleanRate = (
    values: readonly (boolean | null)[],
  ): number | null => {
    const known = values.filter(
      (value): value is boolean => value !== null,
    );
    return known.length === 0
      ? null
      : known.filter(Boolean).length / known.length;
  };
  const agreementDetails: AiPanelAnalysis["agreement"]["details"][number][] =
    [];
  for (const finding of input.objective.directionalFindings) {
    if (!finding.favoredCandidateId) continue;
    const majority =
      pairPreferences[finding.pairId]?.overall
        .majorityCandidateId ?? null;
    agreementDetails.push({
      pairId: finding.pairId,
      metric: finding.metric,
      objectiveFavoredCandidateId: finding.favoredCandidateId,
      perceptualMajorityCandidateId: majority,
      outcome:
        majority === null
          ? "unresolved"
          : majority === finding.favoredCandidateId
            ? "agreement"
            : "contradiction",
    });
  }
  const agreements = agreementDetails.filter(
    (detail) => detail.outcome === "agreement",
  ).length;
  const contradictions = agreementDetails.filter(
    (detail) => detail.outcome === "contradiction",
  ).length;
  const unresolved = agreementDetails.filter(
    (detail) => detail.outcome === "unresolved",
  ).length;
  const comparable = agreements + contradictions;
  const withoutHash = {
    schema_version:
      AI_AUDIO_PANEL_ANALYSIS_SCHEMA_VERSION as typeof AI_AUDIO_PANEL_ANALYSIS_SCHEMA_VERSION,
    evaluation_package_id: input.evaluationPackageId,
    valid_judge_count: input.runs.length,
    perceptual: {
      by_file: byFile,
      by_candidate: byCandidate,
      score_difference_corrected_minus_baseline:
        Object.fromEntries(
          AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
            dimension,
            descriptive(pairedDifferences[dimension]),
          ]),
        ) as Record<
          AiAudioScoreDimension,
          AiDescriptiveStatistics
        >,
      pair_preferences: pairPreferences,
      corrected_pair_majority_wins: correctedWins,
      corrected_pair_win_rate:
        pairVotes.size === 0 ? null : correctedWins / pairVotes.size,
      corrected_overall_preference_rate:
        totalPreferences === 0
          ? null
          : correctedPreferences / totalPreferences,
      confidence_weighted_corrected_preference_rate:
        confidenceTotal === 0
          ? null
          : confidenceCorrected / confidenceTotal,
      corrected_long_form_preference_rate:
        totalLong === 0 ? null : correctedLong / totalLong,
      judge_agreement_mean:
        agreementValues.length === 0
          ? null
          : agreementValues.reduce(
              (sum, value) => sum + value,
              0,
            ) / agreementValues.length,
      mean_confidence:
        confidenceValues.length === 0
          ? null
          : confidenceValues.reduce(
              (sum, value) => sum + value,
              0,
            ) / confidenceValues.length,
      speed: {
        too_slow_by_candidate: tooSlow,
        too_fast_by_candidate: tooFast,
        too_slow_by_sample: tooSlowBySample,
        too_fast_by_sample: tooFastBySample,
      },
      pronunciation_issues: pronunciationIssues,
      table: {
        pairId: tablePairId,
        corrected_clearer_rate:
          tableRecords.length === 0
            ? null
            : tableRecords.filter((record) => record.correctedClearer)
                .length / tableRecords.length,
        repeated_labels_helpful_rate: booleanRate(
          tableRecords.map((record) => record.repeatedHelpful),
        ),
        corrected_duration_excessive_rate: booleanRate(
          tableRecords.map((record) => record.correctedExcessive),
        ),
        clarity_justifies_added_duration_rate: booleanRate(
          tableRecords.map((record) => record.clarityJustifies),
        ),
        concise_table_test_yes_rate:
          tableRecords.length === 0
            ? null
            : tableRecords.filter((record) => record.conciseYes)
                .length / tableRecords.length,
      },
    },
    objective: input.objective,
    agreement: {
      comparisons: agreementDetails.length,
      agreements,
      contradictions,
      unresolved,
      contradiction_rate:
        comparable === 0 ? null : contradictions / comparable,
      details: agreementDetails,
    },
  };
  return {
    ...withoutHash,
    analysis_hash: hashAiValue(withoutHash),
  };
}

export interface AiBryceDecisionMetrics {
  validJudgeCount: number;
  correctedPairMajorityWins: number;
  totalPairCount: number;
  correctedOverallPreferenceRate: number | null;
  correctedMedianScores: Record<
    AiAudioScoreDimension,
    number | null
  >;
  baselineNaturalnessMedian: number | null;
  criticalPronunciationMaxJudgeCount: number;
  blockingAcousticDefects: readonly string[];
  correctedExcessivelySlowMajoritySampleIds: readonly string[];
  tableCorrectedClearerRate: number | null;
  tableAddedDurationAcceptedRate: number | null;
  tableOnlyRemainingIssue: boolean;
  semanticPauseStructurePass: boolean;
  segmentationPass: boolean;
  tableEfficiencyPass: boolean;
  voiceNaturalnessAcceptable: boolean;
  fatigueAcceptable: boolean;
  panelConfidence: number;
  decisiveEvidence: readonly string[];
  dissentingEvidence: readonly string[];
}

export interface DeriveBryceDecisionMetricsInput {
  analysis: AiPanelAnalysis;
  privateSamples: readonly AiPrivateSampleIdentity[];
  correctedCandidateId: string;
  baselineCandidateId: string;
}

/**
 * Converts the separated panel/objective report into the narrowly scoped
 * Bryce decision inputs. The raw analyses remain available and are not
 * replaced by this decision view.
 */
export function deriveBryceDecisionMetrics({
  analysis,
  privateSamples,
  correctedCandidateId,
  baselineCandidateId,
}: DeriveBryceDecisionMetricsInput): AiBryceDecisionMetrics {
  const corrected =
    analysis.perceptual.by_candidate[correctedCandidateId];
  const baseline =
    analysis.perceptual.by_candidate[baselineCandidateId];
  if (!corrected || !baseline) {
    throw new Error("Bryce candidate score summaries are missing");
  }
  const correctedMedianScores = Object.fromEntries(
    AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      corrected[dimension].median,
    ]),
  ) as Record<AiAudioScoreDimension, number | null>;
  const correctedSampleIds = new Set(
    privateSamples
      .filter(
        (sample) =>
          sample.candidateId === correctedCandidateId &&
          sample.pipeline === "corrected" &&
          sample.voice === "bryce",
      )
      .map((sample) => sample.sourceSampleId),
  );
  const criticalGroups = new Map<string, Set<string>>();
  for (const issue of analysis.perceptual.pronunciation_issues) {
    if (
      issue.candidateId !== correctedCandidateId ||
      issue.severity !== "critical"
    ) {
      continue;
    }
    /*
     * Free-text descriptions are not reliable grouping keys: two judges can
     * hear the same defect and phrase it differently. Group critical reports
     * conservatively by the exact blind source sample.
     */
    const key = issue.sampleId;
    const judges = criticalGroups.get(key) ?? new Set<string>();
    judges.add(issue.judgeId);
    criticalGroups.set(key, judges);
  }
  const criticalPronunciationMaxJudgeCount = Math.max(
    0,
    ...[...criticalGroups.values()].map((judges) => judges.size),
  );
  const correctedExcessivelySlowMajoritySampleIds = [
    ...correctedSampleIds,
  ]
    .filter(
      (sampleId) =>
        (analysis.perceptual.speed.too_slow_by_sample[sampleId] ??
          0) >
        analysis.valid_judge_count / 2,
    )
    .sort();
  const structuralFindings = [
    ...analysis.objective.blockingDefects,
    ...analysis.objective.regressions,
  ];
  const confirmedStructuralFindings = structuralFindings.filter(
    (finding) =>
      finding.severity === "blocking" ||
      !/(?:REVIEW_CANDIDATE|heuristic[-_ ]unverified)/iu.test(
        `${finding.code} ${finding.detail}`,
      ),
  );
  const semanticPauseStructurePass = !confirmedStructuralFindings.some(
    (finding) => {
      const searchable = `${finding.code} ${finding.detail}`.replace(
        /[_-]+/gu,
        " ",
      );
      return /\b(?:semantic|sentence|paragraph|heading|section|list|table.?row).?pause\b/iu.test(
        searchable,
      );
    },
  );
  const segmentationPass = !confirmedStructuralFindings.some(
    (finding) => {
      const searchable = `${finding.code} ${finding.detail}`.replace(
        /[_-]+/gu,
        " ",
      );
      return /\b(?:segment\w*|truncat\w*|duplicat\w*|stitch\w*|discontinuit\w*)\b/iu.test(
        searchable,
      );
    },
  );
  const table = analysis.perceptual.table;
  const tableEfficiencyPass =
    table.corrected_clearer_rate !== null &&
    table.corrected_clearer_rate > 0.5 &&
    !(
      table.corrected_duration_excessive_rate !== null &&
      table.corrected_duration_excessive_rate > 0.5
    );
  const correctedNaturalness =
    correctedMedianScores.naturalness;
  const baselineNaturalness = baseline.naturalness.median;
  const voiceNaturalnessAcceptable =
    correctedNaturalness !== null &&
    correctedNaturalness >=
      AI_BRYCE_DECISION_THRESHOLDS.naturalnessMedian &&
    baselineNaturalness !== null &&
    correctedNaturalness >=
      baselineNaturalness -
        AI_BRYCE_DECISION_THRESHOLDS.materialNaturalnessDrop;
  const fatigueAcceptable =
    (correctedMedianScores.listening_comfort ?? 0) >=
      AI_BRYCE_DECISION_THRESHOLDS.listeningComfortMedian &&
    (correctedMedianScores.long_form_suitability ?? 0) >=
      AI_BRYCE_DECISION_THRESHOLDS.longFormSuitabilityMedian;
  const nonTableCorePass =
    (correctedMedianScores.clarity ?? 0) >=
      AI_BRYCE_DECISION_THRESHOLDS.clarityMedian &&
    (correctedMedianScores.pronunciation ?? 0) >=
      AI_BRYCE_DECISION_THRESHOLDS.pronunciationMedian &&
    (correctedMedianScores.pause_quality ?? 0) >=
      AI_BRYCE_DECISION_THRESHOLDS.pauseQualityMedian &&
    (correctedMedianScores.professional_quality ?? 0) >=
      AI_BRYCE_DECISION_THRESHOLDS.professionalQualityMedian &&
    fatigueAcceptable &&
    semanticPauseStructurePass &&
    segmentationPass &&
    analysis.objective.blockingDefects.length === 0;
  return {
    validJudgeCount: analysis.valid_judge_count,
    correctedPairMajorityWins:
      analysis.perceptual.corrected_pair_majority_wins,
    totalPairCount: Object.keys(
      analysis.perceptual.pair_preferences,
    ).length,
    correctedOverallPreferenceRate:
      analysis.perceptual.corrected_overall_preference_rate,
    correctedMedianScores,
    baselineNaturalnessMedian: baselineNaturalness,
    criticalPronunciationMaxJudgeCount,
    blockingAcousticDefects:
      analysis.objective.blockingDefects.map(
        (finding) => `${finding.code}: ${finding.detail}`,
      ),
    correctedExcessivelySlowMajoritySampleIds,
    tableCorrectedClearerRate: table.corrected_clearer_rate,
    tableAddedDurationAcceptedRate:
      table.clarity_justifies_added_duration_rate,
    tableOnlyRemainingIssue:
      nonTableCorePass && !tableEfficiencyPass,
    semanticPauseStructurePass,
    segmentationPass,
    tableEfficiencyPass,
    voiceNaturalnessAcceptable,
    fatigueAcceptable,
    panelConfidence:
      analysis.perceptual.mean_confidence ?? 0,
    decisiveEvidence: [
      `Corrected pair wins: ${String(
        analysis.perceptual.corrected_pair_majority_wins,
      )} of ${String(
        Object.keys(analysis.perceptual.pair_preferences).length,
      )}.`,
      `Corrected overall preference rate: ${
        analysis.perceptual.corrected_overall_preference_rate === null
          ? "unavailable"
          : (
              analysis.perceptual.corrected_overall_preference_rate *
              100
            ).toFixed(1) + "%"
      }.`,
      `Objective improvements: ${String(
        analysis.objective.improvements.length,
      )}; regressions: ${String(
        analysis.objective.regressions.length,
      )}; blocking defects: ${String(
        analysis.objective.blockingDefects.length,
      )}.`,
    ],
    dissentingEvidence: [
      ...(analysis.agreement.contradictions > 0
        ? [
            `${String(
              analysis.agreement.contradictions,
            )} perceptual/objective comparison(s) conflict.`,
          ]
        : []),
      ...(analysis.perceptual.judge_agreement_mean !== null &&
      analysis.perceptual.judge_agreement_mean < 0.6
        ? ["Mean judge agreement is below 60%."]
        : []),
    ],
  };
}

export interface AiTuningBranchResult {
  status:
    | "NOT_RUN"
    | "NOT_EXECUTED_BUDGET"
    | "COMPLETED_NO_CLEAR_IMPROVEMENT"
    | "COMPLETED_SELECTED";
  selectedMetrics?: AiBryceDecisionMetrics;
  evidence?: readonly string[];
}

export interface AiVoiceCandidateMetrics {
  voice: AiLocalVoice;
  validJudgeCount: number;
  medianScores: Record<AiAudioScoreDimension, number | null>;
  blockingAcousticDefects: readonly string[];
  contentConsistency: number | null;
  failsPrimarilyVoiceNaturalnessOrFatigue: boolean;
  decisiveEvidence: readonly string[];
  dissentingEvidence: readonly string[];
}

export interface AiVoiceBranchResult {
  status:
    | "NOT_RUN"
    | "NOT_EXECUTED_BUDGET"
    | "INCOMPLETE"
    | "COMPLETE";
  candidates?: readonly AiVoiceCandidateMetrics[];
}

export interface DecideLocalNarrationInput {
  bryce: AiBryceDecisionMetrics;
  tuning?: AiTuningBranchResult;
  voices?: AiVoiceBranchResult;
}

export interface AiNarrationDecision {
  primaryDecision: AiAudioFinalDecision;
  confidence: number;
  decisiveEvidence: readonly string[];
  dissentingEvidence: readonly string[];
  limitations: readonly string[];
  exactRemainingRisk: string;
  recommendedNextEngineeringAction: string;
  engineeringBasisStatement: string;
  internalBranch:
    | "NONE"
    | "TUNING"
    | "OTHER_LOCAL_VOICES";
}

function scoreAtLeast(
  scores: Record<AiAudioScoreDimension, number | null>,
  dimension: AiAudioScoreDimension,
  threshold: number,
): boolean {
  const score = scores[dimension];
  return score !== null && score >= threshold;
}

function brycePasses(metrics: AiBryceDecisionMetrics): boolean {
  const scores = metrics.correctedMedianScores;
  const correctedNaturalness = scores.naturalness;
  const naturalnessNotWorse =
    correctedNaturalness !== null &&
    metrics.baselineNaturalnessMedian !== null &&
    correctedNaturalness >=
      metrics.baselineNaturalnessMedian -
        AI_BRYCE_DECISION_THRESHOLDS.materialNaturalnessDrop;
  return (
    metrics.validJudgeCount ===
      AI_BRYCE_DECISION_THRESHOLDS.requiredJudges &&
    metrics.totalPairCount ===
      AI_BRYCE_DECISION_THRESHOLDS.requiredPairs &&
    metrics.correctedPairMajorityWins >=
      AI_BRYCE_DECISION_THRESHOLDS.correctedPairWins &&
    metrics.correctedOverallPreferenceRate !== null &&
    metrics.correctedOverallPreferenceRate >=
      AI_BRYCE_DECISION_THRESHOLDS.correctedOverallPreferenceRate &&
    scoreAtLeast(
      scores,
      "clarity",
      AI_BRYCE_DECISION_THRESHOLDS.clarityMedian,
    ) &&
    scoreAtLeast(
      scores,
      "pause_quality",
      AI_BRYCE_DECISION_THRESHOLDS.pauseQualityMedian,
    ) &&
    scoreAtLeast(
      scores,
      "professional_quality",
      AI_BRYCE_DECISION_THRESHOLDS.professionalQualityMedian,
    ) &&
    scoreAtLeast(
      scores,
      "long_form_suitability",
      AI_BRYCE_DECISION_THRESHOLDS.longFormSuitabilityMedian,
    ) &&
    naturalnessNotWorse &&
    metrics.criticalPronunciationMaxJudgeCount < 2 &&
    metrics.blockingAcousticDefects.length === 0 &&
    metrics.correctedExcessivelySlowMajoritySampleIds.length === 0 &&
    metrics.tableCorrectedClearerRate !== null &&
    metrics.tableCorrectedClearerRate > 0.5 &&
    ((metrics.tableAddedDurationAcceptedRate !== null &&
      metrics.tableAddedDurationAcceptedRate > 0.5) ||
      metrics.tableOnlyRemainingIssue)
  );
}

function tuningBranchNeeded(metrics: AiBryceDecisionMetrics): boolean {
  const scores = metrics.correctedMedianScores;
  const clarityAndPronunciationPass =
    scoreAtLeast(scores, "clarity", 4) &&
    scoreAtLeast(scores, "pronunciation", 4) &&
    metrics.criticalPronunciationMaxJudgeCount < 2 &&
    metrics.blockingAcousticDefects.length === 0;
  const pacingOrStructureFails =
    !scoreAtLeast(scores, "pause_quality", 4) ||
    metrics.correctedExcessivelySlowMajoritySampleIds.length > 0 ||
    !metrics.semanticPauseStructurePass ||
    !metrics.segmentationPass ||
    !metrics.tableEfficiencyPass;
  return (
    clarityAndPronunciationPass &&
    pacingOrStructureFails &&
    metrics.voiceNaturalnessAcceptable &&
    metrics.fatigueAcceptable
  );
}

function voiceBranchNeeded(metrics: AiBryceDecisionMetrics): boolean {
  const scores = metrics.correctedMedianScores;
  return (
    scoreAtLeast(scores, "clarity", 4) &&
    scoreAtLeast(scores, "pronunciation", 4) &&
    scoreAtLeast(scores, "pause_quality", 4) &&
    metrics.semanticPauseStructurePass &&
    metrics.segmentationPass &&
    metrics.blockingAcousticDefects.length === 0 &&
    (!metrics.voiceNaturalnessAcceptable ||
      !metrics.fatigueAcceptable ||
      !scoreAtLeast(scores, "professional_quality", 3.8))
  );
}

export interface AiLocalVoiceSelection {
  decision:
    | "PASS_PIPER_BRYCE"
    | "PASS_PIPER_LINDA"
    | "PASS_PIPER_CORI"
    | "CONSIDER_ELEVENLABS"
    | "INCONCLUSIVE_AI_ONLY_EVALUATION";
  selectedVoice: AiLocalVoice | null;
  ranking: readonly {
    voice: AiLocalVoice;
    score: number;
    passesMinimums: boolean;
  }[];
  reasons: readonly string[];
}

export function selectBestLocalVoice(
  candidates: readonly AiVoiceCandidateMetrics[],
): AiLocalVoiceSelection {
  const expected = ["bryce", "cori", "linda"];
  if (
    candidates.length !== 3 ||
    [...candidates.map((candidate) => candidate.voice)]
      .sort()
      .join("\0") !== expected.join("\0")
  ) {
    return {
      decision: "INCONCLUSIVE_AI_ONLY_EVALUATION",
      selectedVoice: null,
      ranking: [],
      reasons: [
        "The Bryce, Linda, and Cori corrected-voice comparison is incomplete.",
      ],
    };
  }
  const ranking = candidates
    .map((candidate) => {
      const score = (dimension: AiAudioScoreDimension) =>
        candidate.medianScores[dimension] ?? 0;
      const passesMinimums =
        candidate.validJudgeCount >= 3 &&
        score("clarity") >= 4 &&
        score("pause_quality") >= 4 &&
        score("pronunciation") >= 4 &&
        score("professional_quality") >= 3.8 &&
        score("long_form_suitability") >= 3.8 &&
        candidate.blockingAcousticDefects.length === 0 &&
        candidate.contentConsistency !== null &&
        candidate.contentConsistency >= 0.6;
      const weightedScore =
        score("naturalness") * 0.2 +
        score("clarity") * 0.2 +
        score("pronunciation") * 0.15 +
        score("listening_comfort") * 0.15 +
        score("professional_quality") * 0.15 +
        score("long_form_suitability") * 0.15;
      return {
        voice: candidate.voice,
        score: weightedScore,
        passesMinimums,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.voice.localeCompare(right.voice),
    );
  const winner = ranking.find((candidate) => candidate.passesMinimums);
  if (winner) {
    const decision = {
      bryce: "PASS_PIPER_BRYCE",
      linda: "PASS_PIPER_LINDA",
      cori: "PASS_PIPER_CORI",
    }[winner.voice] as AiLocalVoiceSelection["decision"];
    return {
      decision,
      selectedVoice: winner.voice,
      ranking,
      reasons: [
        `${winner.voice} ranks highest among local voices that meet every minimum.`,
      ],
    };
  }
  if (
    candidates.every(
      (candidate) =>
        candidate.failsPrimarilyVoiceNaturalnessOrFatigue &&
        candidate.blockingAcousticDefects.length === 0,
    )
  ) {
    return {
      decision: "CONSIDER_ELEVENLABS",
      selectedVoice: null,
      ranking,
      reasons: [
        "All three local voices fail primarily on naturalness or fatigue after semantic and acoustic checks.",
      ],
    };
  }
  return {
    decision: "INCONCLUSIVE_AI_ONLY_EVALUATION",
    selectedVoice: null,
    ranking,
    reasons: [
      "No local voice meets every threshold and the failures are not uniformly voice-only.",
    ],
  };
}

const STANDARD_LIMITATIONS = Object.freeze([
  "Audio-capable AI judges are not a substitute for a representative human learner panel.",
  "Model judgments can share systematic biases even when conversations and blind labels are independent.",
  "Objective acoustic metrics can identify defects but cannot fully measure naturalness or listener fatigue.",
]);

function decisionResult(
  primaryDecision: AiAudioFinalDecision,
  metrics: AiBryceDecisionMetrics,
  input: {
    evidence?: readonly string[];
    dissent?: readonly string[];
    risk: string;
    action: string;
    branch: AiNarrationDecision["internalBranch"];
    confidenceDelta?: number;
  },
): AiNarrationDecision {
  if (!AI_AUDIO_FINAL_DECISIONS.includes(primaryDecision)) {
    throw new Error("Decision is outside the seven-result contract");
  }
  return {
    primaryDecision,
    confidence: Math.round(
      clamp(
        metrics.panelConfidence + (input.confidenceDelta ?? 0),
        0,
        100,
      ),
    ),
    decisiveEvidence: [
      ...metrics.decisiveEvidence,
      ...(input.evidence ?? []),
    ],
    dissentingEvidence: [
      ...metrics.dissentingEvidence,
      ...(input.dissent ?? []),
    ],
    limitations: STANDARD_LIMITATIONS,
    exactRemainingRisk: input.risk,
    recommendedNextEngineeringAction: input.action,
    engineeringBasisStatement:
      "Based on the automated audio-capable AI panel and objective acoustic checks, this is the strongest engineering decision available without a human listening study.",
    internalBranch: input.branch,
  };
}

export function decideLocalNarration(
  input: DecideLocalNarrationInput,
): AiNarrationDecision {
  const metrics = input.bryce;
  if (
    metrics.validJudgeCount !== 5 ||
    metrics.totalPairCount !== 5
  ) {
    return decisionResult(
      "INCONCLUSIVE_AI_ONLY_EVALUATION",
      metrics,
      {
        risk: "The required five-judge Bryce panel is incomplete.",
        action:
          "Resolve invalid or missing judge runs within the existing cap; do not infer a winner.",
        branch: "NONE",
        confidenceDelta: -30,
      },
    );
  }
  if (brycePasses(metrics)) {
    return decisionResult("PASS_PIPER_BRYCE", metrics, {
      evidence: [
        "Bryce meets every provisional perceptual and acoustic threshold.",
      ],
      risk:
        "AI-only evidence may not predict fatigue or preference in the real learner population.",
      action:
        "Keep the corrected Bryce pipeline and retain the evaluation artifacts for owner review.",
      branch: "NONE",
    });
  }
  if (tuningBranchNeeded(metrics)) {
    const tuning = input.tuning;
    if (tuning?.status === "NOT_EXECUTED_BUDGET") {
      return decisionResult(
        "TUNING_RECOMMENDED_BUT_NOT_EXECUTED",
        metrics,
        {
          evidence: tuning.evidence,
          risk:
            "A localized pacing or structure problem remains untested because the paid budget cannot cover a safe tuning comparison.",
          action:
            "Prepare the highest-ranked local tuning profiles for a future capped retest.",
          branch: "TUNING",
          confidenceDelta: -10,
        },
      );
    }
    if (
      tuning?.status === "COMPLETED_SELECTED" &&
      tuning.selectedMetrics &&
      brycePasses(tuning.selectedMetrics)
    ) {
      return decisionResult(
        "PASS_PIPER_BRYCE",
        tuning.selectedMetrics,
        {
          evidence: tuning.evidence,
          risk:
            "The selected one-round tuning improvement is supported only on the frozen evaluation excerpts.",
          action:
            "Freeze the selected local profile; do not regenerate the full library without a separate activation review.",
          branch: "TUNING",
        },
      );
    }
    return decisionResult("TUNE_PIPER_PIPELINE", metrics, {
      evidence: tuning?.evidence,
      risk:
        "Clarity and pronunciation pass, but a localized pacing, pause, segmentation, or table-efficiency failure remains.",
      action:
        "Apply at most one controlled tuning round using no more than two profiles.",
      branch: "TUNING",
      confidenceDelta: -5,
    });
  }
  if (voiceBranchNeeded(metrics)) {
    if (
      input.voices?.status !== "COMPLETE" ||
      !input.voices.candidates
    ) {
      return decisionResult(
        "INCONCLUSIVE_AI_ONLY_EVALUATION",
        metrics,
        {
          risk:
            "Bryce appears voice-limited, but the required corrected Bryce/Linda/Cori comparison is unavailable or incomplete.",
          action:
            "Run the three-voice blind branch only if it fits inside the approved cap.",
          branch: "OTHER_LOCAL_VOICES",
          confidenceDelta: -20,
        },
      );
    }
    const selection = selectBestLocalVoice(input.voices.candidates);
    return decisionResult(selection.decision, metrics, {
      evidence: selection.reasons,
      risk:
        selection.decision === "CONSIDER_ELEVENLABS"
          ? "All local voices appear voice-limited, but an external provider has not been evaluated or integrated."
          : "The local-voice ranking remains an AI-only proxy for actual learner preference.",
      action:
        selection.decision === "CONSIDER_ELEVENLABS"
          ? "Prepare a separate, explicitly authorized external-provider evaluation; do not integrate it automatically."
          : selection.selectedVoice
            ? `Freeze ${selection.selectedVoice} as the strongest local voice candidate without activating production audio.`
            : "Investigate incomplete or mixed local-voice failures.",
      branch: "OTHER_LOCAL_VOICES",
      confidenceDelta:
        selection.decision ===
        "INCONCLUSIVE_AI_ONLY_EVALUATION"
          ? -20
          : 0,
    });
  }
  return decisionResult(
    "INCONCLUSIVE_AI_ONLY_EVALUATION",
    metrics,
    {
      risk:
        "The Bryce result fails multiple categories or contains unresolved perceptual/objective disagreement.",
      action:
        "Review dissent and acoustic defects before authorizing any tuning or voice branch.",
      branch: "NONE",
      confidenceDelta: -20,
    },
  );
}

export interface AiTuningFailureSignal {
  dimension: AiAudioTuningDimension;
  direction:
    | "too_long"
    | "too_short"
    | "too_repetitive"
    | "too_fragmented"
    | "too_slow"
    | "too_fast";
  severity: number;
  evidence: readonly string[];
}

export interface AiTuningProfile {
  profileId: string;
  targetDimension: AiAudioTuningDimension;
  rank: 1 | 2;
  changes: Readonly<Record<string, string | number | boolean>>;
  rationale: string;
  evidence: readonly string[];
}

function tuningChange(
  signal: AiTuningFailureSignal,
  rank: 1 | 2,
): Readonly<Record<string, string | number | boolean>> {
  const conservative = rank === 1;
  if (signal.dimension.endsWith("_pause")) {
    return {
      pause_multiplier:
        signal.direction === "too_long"
          ? conservative
            ? 0.85
            : 0.75
          : conservative
            ? 1.15
            : 1.25,
    };
  }
  if (signal.dimension === "table_label_repetition") {
    return {
      table_label_repetition:
        conservative ? "reduce_redundant" : "minimal_necessary",
    };
  }
  if (signal.dimension === "short_table_field_grouping") {
    return {
      short_table_field_grouping:
        conservative ? "pair_short_fields" : "group_complete_row",
    };
  }
  return {
    speaking_rate_multiplier:
      signal.direction === "too_slow"
        ? conservative
          ? 1.05
          : 1.08
        : conservative
          ? 0.95
          : 0.92,
  };
}

/**
 * Selects one likely cause and at most two conservative alternatives. It does
 * not alter narration, generate audio, or execute a tuning round.
 */
export function selectTuningProfiles(
  signals: readonly AiTuningFailureSignal[],
): readonly AiTuningProfile[] {
  for (const signal of signals) {
    const pauseDimension = signal.dimension.endsWith("_pause");
    const validDirection =
      (pauseDimension &&
        ["too_long", "too_short"].includes(signal.direction)) ||
      (signal.dimension === "table_label_repetition" &&
        signal.direction === "too_repetitive") ||
      (signal.dimension === "short_table_field_grouping" &&
        signal.direction === "too_fragmented") ||
      (signal.dimension === "speaking_rate" &&
        ["too_slow", "too_fast"].includes(signal.direction));
    if (
      !AI_AUDIO_TUNING_DIMENSIONS.includes(signal.dimension) ||
      !Number.isFinite(signal.severity) ||
      signal.severity < 0 ||
      signal.severity > 1 ||
      !validDirection
    ) {
      throw new Error("Invalid tuning failure signal");
    }
  }
  const primary = [...signals].sort(
    (left, right) =>
      right.severity - left.severity ||
      left.dimension.localeCompare(right.dimension),
  )[0];
  if (!primary || primary.severity === 0) return [];
  return ([1, 2] as const).map((rank) => ({
    profileId: `tune-${primary.dimension}-${String(rank)}`,
    targetDimension: primary.dimension,
    rank,
    changes: tuningChange(primary, rank),
    rationale: `Test a ${
      rank === 1 ? "conservative" : "stronger"
    } adjustment to the single highest-severity ${primary.dimension} finding.`,
    evidence: primary.evidence,
  }));
}
