import { createHash } from "node:crypto";

import { z } from "zod";

import {
  AI_AUDIO_JUDGE_LENSES,
  AI_AUDIO_SCORE_DIMENSIONS,
  canonicalAiJson,
  hashAiValue,
  selectTuningProfiles,
  type AiAudioScoreDimension,
  type AiLocalVoice,
  type AiTuningFailureSignal,
  type AiTuningProfile,
  type AiVoiceCandidateMetrics,
} from "./ai-audio-evaluation";

export const AI_AUDIO_CONDITIONAL_PLAN_SCHEMA_VERSION =
  "tenxpros-phase2c-openrouter-conditional-plan-v2";
export const AI_AUDIO_CONDITIONAL_RESPONSE_SCHEMA_VERSION =
  "tenxpros-phase2c-conditional-judge-response-v2";
export const AI_AUDIO_CONDITIONAL_TOOL_NAME =
  "submit_audio_evaluation";
export const AI_AUDIO_OPENROUTER_MODEL =
  "openai/gpt-audio";
export const AI_AUDIO_OPENROUTER_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_ATTRIBUTION_HEADERS = Object.freeze({
  "HTTP-Referer": "https://tenxpros.com",
  "X-OpenRouter-Title":
    "TenXPros Academy Audio Evaluation",
  "X-OpenRouter-Metadata": "enabled",
});

export type AiConditionalBranchKind =
  | "TUNING"
  | "LOCAL_VOICES";

interface AiConditionalCandidate {
  candidateId: string;
  role:
    | "FROZEN_BASELINE"
    | "SOURCE"
    | "TUNED_PROFILE"
    | "LOCAL_VOICE";
  voice: AiLocalVoice;
  tuningProfileId: string | null;
}

export interface AiConditionalBranchDraft {
  schemaVersion: typeof AI_AUDIO_CONDITIONAL_PLAN_SCHEMA_VERSION;
  basePlanHash: string;
  branchKind: AiConditionalBranchKind;
  maximumRounds: 1;
  maximumProfiles: 2;
  primaryJudgeCalls: 3;
  maximumValidationRetriesPerJudge: 1;
  cause: {
    dimension: AiTuningFailureSignal["dimension"];
    direction: AiTuningFailureSignal["direction"];
    severity: number;
    evidence: readonly string[];
  } | null;
  profiles: readonly AiTuningProfile[];
  affectedExcerptIds: readonly string[];
  candidates: readonly AiConditionalCandidate[];
  draftHash: string;
}

export interface AiConditionalAudioClip {
  excerptId: string;
  candidateId: string;
  audioSha256: string;
  durationSeconds: number;
  objectiveIntegrityPass: boolean;
  contentConsistency: number;
}

export interface AiConditionalBlindClip {
  neutralLabel: string;
  excerptId: string;
  candidateId: string;
  audioSha256: string;
  presentationOrder: number;
}

export interface AiConditionalBlindSet {
  neutralSetLabel: string;
  excerptId: string;
  presentationOrder: number;
  clips: readonly AiConditionalBlindClip[];
}

export interface AiConditionalJudgeAssignment {
  assignmentId: string;
  judgeId: `conditional-judge-0${1 | 2 | 3}`;
  lensId: (typeof AI_AUDIO_JUDGE_LENSES)[number]["id"];
  lensTitle: string;
  lensFocus: string;
  sets: readonly AiConditionalBlindSet[];
  assignmentHash: string;
}

export interface AiBoundConditionalSubplan {
  schemaVersion: typeof AI_AUDIO_CONDITIONAL_PLAN_SCHEMA_VERSION;
  basePlanHash: string;
  branchKind: AiConditionalBranchKind;
  draftHash: string;
  maximumRounds: 1;
  maximumProfiles: 2;
  primaryJudgeCalls: 3;
  maximumValidationRetriesPerJudge: 1;
  cause: AiConditionalBranchDraft["cause"];
  profiles: readonly AiTuningProfile[];
  candidates: readonly AiConditionalCandidate[];
  affectedExcerptIds: readonly string[];
  audioInputs: readonly AiConditionalAudioClip[];
  assignments: readonly AiConditionalJudgeAssignment[];
  prompts: readonly {
    judgeId: string;
    prompt: string;
    promptSha256: string;
    retryCompositePromptSha256: string;
  }[];
  subplanHash: string;
}

const RETRY_INSTRUCTION =
  "This is the one permitted validation retry. Listen again and return one complete function call matching every required field.";

function assertSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256`);
  }
}

function sortedUnique(
  values: readonly string[],
  label: string,
): readonly string[] {
  const sorted = [...values].sort();
  if (
    sorted.length === 0 ||
    sorted.some((value) => !value.trim()) ||
    new Set(sorted).size !== sorted.length
  ) {
    throw new Error(`${label} must contain unique non-empty values`);
  }
  return sorted;
}

function withHash<
  T extends object,
  F extends "draftHash" | "assignmentHash" | "subplanHash",
>(
  value: T,
  field: F,
): T & Record<F, string> {
  return {
    ...value,
    [field]: hashAiValue(value),
  } as T & Record<F, string>;
}

export function createTuningConditionalDraft(input: {
  basePlanHash: string;
  signals: readonly AiTuningFailureSignal[];
  affectedExcerptIdsByDimension: Readonly<
    Partial<
      Record<
        AiTuningFailureSignal["dimension"],
        readonly string[]
      >
    >
  >;
}): AiConditionalBranchDraft {
  assertSha256(input.basePlanHash, "basePlanHash");
  const profiles = selectTuningProfiles(input.signals);
  if (profiles.length < 1 || profiles.length > 2) {
    throw new Error(
      "A tuning branch requires one cause and at most two profiles",
    );
  }
  const primary = [...input.signals].sort(
    (left, right) =>
      right.severity - left.severity ||
      left.dimension.localeCompare(right.dimension),
  )[0];
  if (!primary || primary.severity <= 0) {
    throw new Error("A positive tuning failure signal is required");
  }
  const affectedExcerptIds = sortedUnique(
    input.affectedExcerptIdsByDimension[primary.dimension] ?? [],
    `${primary.dimension} affected excerpts`,
  );
  const withoutHash = {
    schemaVersion: AI_AUDIO_CONDITIONAL_PLAN_SCHEMA_VERSION,
    basePlanHash: input.basePlanHash,
    branchKind: "TUNING",
    maximumRounds: 1,
    maximumProfiles: 2,
    primaryJudgeCalls: 3,
    maximumValidationRetriesPerJudge: 1,
    cause: {
      dimension: primary.dimension,
      direction: primary.direction,
      severity: primary.severity,
      evidence: [...primary.evidence],
    },
    profiles,
    affectedExcerptIds,
    candidates: [
      {
        candidateId: "source-baseline",
        role: "FROZEN_BASELINE",
        voice: "bryce",
        tuningProfileId: null,
      },
      {
        candidateId: "source-corrected",
        role: "SOURCE",
        voice: "bryce",
        tuningProfileId: null,
      },
      ...profiles.map((profile) => ({
        candidateId: profile.profileId,
        role: "TUNED_PROFILE" as const,
        voice: "bryce" as const,
        tuningProfileId: profile.profileId,
      })),
    ],
  } as const;
  return withHash(withoutHash, "draftHash");
}

export function createLocalVoiceConditionalDraft(input: {
  basePlanHash: string;
  excerptIds: readonly string[];
}): AiConditionalBranchDraft {
  assertSha256(input.basePlanHash, "basePlanHash");
  const excerptIds = sortedUnique(
    input.excerptIds,
    "local-voice excerpts",
  );
  if (excerptIds.length !== 5) {
    throw new Error(
      "The local-voice branch requires the same five frozen excerpts",
    );
  }
  const withoutHash = {
    schemaVersion: AI_AUDIO_CONDITIONAL_PLAN_SCHEMA_VERSION,
    basePlanHash: input.basePlanHash,
    branchKind: "LOCAL_VOICES",
    maximumRounds: 1,
    maximumProfiles: 2,
    primaryJudgeCalls: 3,
    maximumValidationRetriesPerJudge: 1,
    cause: null,
    profiles: [],
    affectedExcerptIds: excerptIds,
    candidates: (["bryce", "linda", "cori"] as const).map(
      (voice) => ({
        candidateId: `voice-${voice}`,
        role: "LOCAL_VOICE" as const,
        voice,
        tuningProfileId: null,
      }),
    ),
  } as const;
  return withHash(withoutHash, "draftHash");
}

function derivedHex(
  seed: string,
  ...parts: readonly string[]
): string {
  return hashAiValue([seed, ...parts]);
}

function neutralLabel(
  prefix: "ALT" | "SET",
  digest: string,
): string {
  return `${prefix}-${digest.slice(0, 10).toUpperCase()}`;
}

function buildConditionalPrompt(
  assignment: AiConditionalJudgeAssignment,
): string {
  const sets = assignment.sets
    .map(
      (set) =>
        `- ${set.neutralSetLabel}: ${set.clips
          .map((clip) => clip.neutralLabel)
          .join(", ")}`,
    )
    .join("\n");
  const prompt = `You are an independent judge in a blind audio listening study.

Review lens:
${assignment.lensTitle}
${assignment.lensFocus}

Listen to every attached clip at exactly 1.0x normal playback speed; do not
speed up or slow down any clip. Do not infer identities, origin,
implementation, expected winners, or technical properties. Do not score the
subject matter. Use the same 1-to-5 rubric for naturalness, pause quality,
pronunciation, clarity, listening comfort, professional quality, and long-form
suitability. Also score semantic faithfulness from 1 to 5 based only on whether
the heard delivery appears complete, ordered, and internally coherent.

For each set, rank every neutral clip, select exactly one neutral clip as the
clearest and easiest to follow, report any heard pronunciation issue, identify
the longer clip (or similar duration), judge whether any added duration is
excessive and whether clarity justifies it, mark each clip separately as too
slow and/or too fast, give confidence from 0 to 100, describe whether the
distinction is clear, subtle, or inaudible, and give concise audio-grounded
evidence.

Sets:
${sets}

Submit exactly one call to the supplied conditional-evaluation function using
assignment id ${assignment.assignmentId} and judge id ${assignment.judgeId}.`;
  if (
    /\b(?:baseline|corrected|piper|bryce|linda|cori|elevenlabs|provider|pipeline|filename|metadata)\b/iu.test(
      prompt,
    )
  ) {
    throw new Error("Conditional prompt failed its blinding scan");
  }
  return prompt;
}

function validateDraftHash(draft: AiConditionalBranchDraft): void {
  const { draftHash, ...withoutHash } = draft;
  assertSha256(draftHash, "draftHash");
  if (hashAiValue(withoutHash) !== draftHash) {
    throw new Error("Conditional draft hash mismatch");
  }
}

export function bindConditionalSubplan(input: {
  draft: AiConditionalBranchDraft;
  audioInputs: readonly AiConditionalAudioClip[];
}): AiBoundConditionalSubplan {
  validateDraftHash(input.draft);
  const expectedKeys = input.draft.affectedExcerptIds.flatMap(
    (excerptId) =>
      input.draft.candidates.map(
        (candidate) => `${excerptId}\0${candidate.candidateId}`,
      ),
  );
  const actualKeys = input.audioInputs.map(
    (clip) => `${clip.excerptId}\0${clip.candidateId}`,
  );
  if (
    expectedKeys.length !== actualKeys.length ||
    new Set(actualKeys).size !== actualKeys.length ||
    [...expectedKeys].sort().join("\n") !==
      [...actualKeys].sort().join("\n")
  ) {
    throw new Error(
      "Conditional audio inputs do not match the exact excerpt/candidate cross-product",
    );
  }
  for (const clip of input.audioInputs) {
    assertSha256(clip.audioSha256, "conditional audio hash");
    if (
      !Number.isFinite(clip.durationSeconds) ||
      clip.durationSeconds <= 0 ||
      !Number.isFinite(clip.contentConsistency) ||
      clip.contentConsistency < 0 ||
      clip.contentConsistency > 1
    ) {
      throw new Error("Invalid conditional audio identity");
    }
  }
  if (
    new Set(input.audioInputs.map((clip) => clip.audioSha256))
      .size !== input.audioInputs.length
  ) {
    throw new Error(
      "Every conditional candidate audio payload must have a unique hash",
    );
  }
  const audioInputs = [...input.audioInputs].sort(
    (left, right) =>
      left.excerptId.localeCompare(right.excerptId) ||
      left.candidateId.localeCompare(right.candidateId),
  );
  const assignments = AI_AUDIO_JUDGE_LENSES.slice(0, 3).map(
    (lens, index) => {
      const judgeNumber = (index + 1) as 1 | 2 | 3;
      const judgeId = (
        {
          1: "conditional-judge-01",
          2: "conditional-judge-02",
          3: "conditional-judge-03",
        } as const
      )[judgeNumber];
      const orderedExcerptIds = [
        ...input.draft.affectedExcerptIds,
      ].sort((left, right) =>
        derivedHex(
          input.draft.draftHash,
          judgeId,
          left,
          "set-order",
        ).localeCompare(
          derivedHex(
            input.draft.draftHash,
            judgeId,
            right,
            "set-order",
          ),
        ),
      );
      const sets = orderedExcerptIds.map(
        (excerptId, setIndex) => {
          const clips = audioInputs
            .filter((clip) => clip.excerptId === excerptId)
            .sort((left, right) =>
              derivedHex(
                input.draft.draftHash,
                judgeId,
                excerptId,
                left.candidateId,
                "clip-order",
              ).localeCompare(
                derivedHex(
                  input.draft.draftHash,
                  judgeId,
                  excerptId,
                  right.candidateId,
                  "clip-order",
                ),
              ),
            )
            .map((clip, clipIndex) => ({
              neutralLabel: neutralLabel(
                "ALT",
                derivedHex(
                  input.draft.draftHash,
                  judgeId,
                  excerptId,
                  clip.candidateId,
                  "clip-label",
                ),
              ),
              excerptId,
              candidateId: clip.candidateId,
              audioSha256: clip.audioSha256,
              presentationOrder: clipIndex + 1,
            }));
          return {
            neutralSetLabel: neutralLabel(
              "SET",
              derivedHex(
                input.draft.draftHash,
                judgeId,
                excerptId,
                "set-label",
              ),
            ),
            excerptId,
            presentationOrder: setIndex + 1,
            clips,
          };
        },
      );
      const withoutHash = {
        assignmentId: `conditional-run-${derivedHex(
          input.draft.draftHash,
          judgeId,
          "assignment",
        ).slice(0, 16)}`,
        judgeId,
        lensId: lens.id,
        lensTitle: lens.title,
        lensFocus: lens.focus,
        sets,
      } as const;
      return withHash(withoutHash, "assignmentHash");
    },
  );
  const prompts = assignments.map((assignment) => {
    const prompt = buildConditionalPrompt(assignment);
    return {
      judgeId: assignment.judgeId,
      prompt,
      promptSha256: hashAiValue(prompt),
      retryCompositePromptSha256: hashAiValue(
        `${prompt}\n\n${RETRY_INSTRUCTION}`,
      ),
    };
  });
  const withoutHash = {
    schemaVersion: AI_AUDIO_CONDITIONAL_PLAN_SCHEMA_VERSION,
    basePlanHash: input.draft.basePlanHash,
    branchKind: input.draft.branchKind,
    draftHash: input.draft.draftHash,
    maximumRounds: 1,
    maximumProfiles: 2,
    primaryJudgeCalls: 3,
    maximumValidationRetriesPerJudge: 1,
    cause: input.draft.cause,
    profiles: input.draft.profiles,
    candidates: input.draft.candidates,
    affectedExcerptIds: input.draft.affectedExcerptIds,
    audioInputs,
    assignments,
    prompts,
  } as const;
  return withHash(withoutHash, "subplanHash");
}

export function assertConditionalSubplanIntegrity(
  subplan: AiBoundConditionalSubplan,
  currentAudioInputs: readonly AiConditionalAudioClip[],
): void {
  const { subplanHash, ...withoutHash } = subplan;
  assertSha256(subplanHash, "conditional subplan hash");
  if (hashAiValue(withoutHash) !== subplanHash) {
    throw new Error("Conditional subplan hash mismatch");
  }
  const rebound = bindConditionalSubplan({
    draft: {
      schemaVersion: subplan.schemaVersion,
      basePlanHash: subplan.basePlanHash,
      branchKind: subplan.branchKind,
      maximumRounds: subplan.maximumRounds,
      maximumProfiles: subplan.maximumProfiles,
      primaryJudgeCalls: subplan.primaryJudgeCalls,
      maximumValidationRetriesPerJudge:
        subplan.maximumValidationRetriesPerJudge,
      cause: subplan.cause,
      profiles: subplan.profiles,
      affectedExcerptIds: subplan.affectedExcerptIds,
      candidates: subplan.candidates,
      draftHash: subplan.draftHash,
    },
    audioInputs: currentAudioInputs,
  });
  if (
    canonicalAiJson(rebound) !== canonicalAiJson(subplan)
  ) {
    throw new Error(
      "Conditional audio or prompt hashes changed after binding",
    );
  }
}

export function conditionalSubplanLedgerBinding(
  subplan: AiBoundConditionalSubplan,
): Readonly<Record<string, unknown>> {
  return {
    event: "CONDITIONAL_SUBPLAN_BOUND",
    data: {
      branchKind: subplan.branchKind,
      draftHash: subplan.draftHash,
      subplanHash: subplan.subplanHash,
      audioInputCount: subplan.audioInputs.length,
      audioHashes: subplan.audioInputs.map(
        (clip) => clip.audioSha256,
      ),
      promptHashes: subplan.prompts.map((prompt) => ({
        judgeId: prompt.judgeId,
        primarySha256: prompt.promptSha256,
        retryCompositeSha256:
          prompt.retryCompositePromptSha256,
      })),
      primaryJudgeCalls: 3,
      maximumCallsIncludingValidationRetries: 4,
      boundBeforeExternalRequest: true,
    },
  };
}

const scoreSchema = z.number().int().min(1).max(5);
const scoresSchema = z
  .object(
    Object.fromEntries(
      AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
        dimension,
        scoreSchema,
      ]),
    ) as Record<AiAudioScoreDimension, typeof scoreSchema>,
  )
  .strict();
const neutralClipLabelSchema = z
  .string()
  .regex(/^ALT-[A-F0-9]{10}$/u);
const neutralSetLabelSchema = z
  .string()
  .regex(/^SET-[A-F0-9]{10}$/u);

const conditionalJudgeResponseSchema = z
  .object({
    schema_version: z.literal(
      AI_AUDIO_CONDITIONAL_RESPONSE_SCHEMA_VERSION,
    ),
    assignment_id: z.string().min(1).max(100),
    judge_id: z
      .string()
      .regex(/^conditional-judge-0[1-3]$/u),
    evidence_basis: z.literal("AUDIO_ONLY"),
    clips: z.array(
      z
        .object({
          clip_label: neutralClipLabelSchema,
          scores: scoresSchema,
          semantic_faithfulness: scoreSchema,
          too_slow: z.boolean(),
          too_fast: z.boolean(),
          evidence_note: z.string().trim().min(5).max(1_000),
        })
        .strict(),
    ),
    sets: z.array(
      z
        .object({
          set_label: neutralSetLabelSchema,
          ranking: z.array(neutralClipLabelSchema),
          clearest_clip: neutralClipLabelSchema,
          pronunciation_issues: z.array(
            z
              .object({
                clip_label: neutralClipLabelSchema,
                severity: z.enum([
                  "minor",
                  "major",
                  "critical",
                ]),
                description: z.string().trim().min(1).max(500),
              })
              .strict(),
          ),
          duration_judgment: z
            .object({
              longer_clip: z.union([
                neutralClipLabelSchema,
                z.literal("SIMILAR_DURATION"),
              ]),
              longer_duration_excessive: z.enum([
                "yes",
                "no",
                "uncertain",
              ]),
              clarity_justifies_longer_duration: z.enum([
                "yes",
                "no",
                "not_applicable",
              ]),
            })
            .strict(),
          audible_distinction: z.enum([
            "CLEAR",
            "SUBTLE",
            "NONE",
          ]),
          confidence: z.number().int().min(0).max(100),
          concise_reason: z.string().trim().min(5).max(1_000),
        })
        .strict(),
    ),
    overall_notes: z.string().trim().min(5).max(1_000),
  })
  .strict();

export type AiConditionalJudgeResponse = z.infer<
  typeof conditionalJudgeResponseSchema
>;

export const AI_AUDIO_CONDITIONAL_TOOL = Object.freeze({
  type: "function",
  name: AI_AUDIO_CONDITIONAL_TOOL_NAME,
  description:
    "Submit a complete blind multi-candidate audio comparison.",
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
      "sets",
      "overall_notes",
    ],
    properties: {
      schema_version: {
        type: "string",
        enum: [AI_AUDIO_CONDITIONAL_RESPONSE_SCHEMA_VERSION],
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
          required: [
            "clip_label",
            "scores",
            "semantic_faithfulness",
            "too_slow",
            "too_fast",
            "evidence_note",
          ],
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
            semantic_faithfulness: {
              type: "integer",
              minimum: 1,
              maximum: 5,
            },
            too_slow: { type: "boolean" },
            too_fast: { type: "boolean" },
            evidence_note: { type: "string" },
          },
        },
      },
      sets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "set_label",
            "ranking",
            "clearest_clip",
            "pronunciation_issues",
            "duration_judgment",
            "audible_distinction",
            "confidence",
            "concise_reason",
          ],
          properties: {
            set_label: { type: "string" },
            ranking: {
              type: "array",
              items: { type: "string" },
            },
            clearest_clip: { type: "string" },
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
                    enum: ["minor", "major", "critical"],
                  },
                  description: { type: "string" },
                },
              },
            },
            duration_judgment: {
              type: "object",
              additionalProperties: false,
              required: [
                "longer_clip",
                "longer_duration_excessive",
                "clarity_justifies_longer_duration",
              ],
              properties: {
                longer_clip: { type: "string" },
                longer_duration_excessive: {
                  type: "string",
                  enum: ["yes", "no", "uncertain"],
                },
                clarity_justifies_longer_duration: {
                  type: "string",
                  enum: ["yes", "no", "not_applicable"],
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
          },
        },
      },
      overall_notes: { type: "string" },
    },
  },
} as const);

export type AiConditionalValidationResult =
  | {
      valid: true;
      response: AiConditionalJudgeResponse;
      responseHash: string;
      retryAllowed: false;
      issues: readonly [];
    }
  | {
      valid: false;
      response: null;
      responseHash: string | null;
      retryAllowed: boolean;
      issues: readonly {
        code: string;
        path: string;
        message: string;
      }[];
    };

function exactSet(
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

function allText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(allText).join("\n");
  if (value && typeof value === "object") {
    return Object.values(value).map(allText).join("\n");
  }
  return "";
}

export function validateConditionalJudgeResponse(
  value: unknown,
  assignment: AiConditionalJudgeAssignment,
  attempt: 1 | 2 = 1,
): AiConditionalValidationResult {
  let candidate = value;
  if (typeof value === "string") {
    try {
      candidate = JSON.parse(value) as unknown;
    } catch {
      return {
        valid: false,
        response: null,
        responseHash: null,
        retryAllowed: attempt === 1,
        issues: [
          {
            code: "INVALID_JSON",
            path: "$",
            message: "Conditional response is not valid JSON",
          },
        ],
      };
    }
  }
  const parsed = conditionalJudgeResponseSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      valid: false,
      response: null,
      responseHash: null,
      retryAllowed: attempt === 1,
      issues: parsed.error.issues.map((issue) => ({
        code: "SCHEMA_INVALID",
        path: issue.path.join(".") || "$",
        message: issue.message,
      })),
    };
  }
  const response = parsed.data;
  const issues: {
    code: string;
    path: string;
    message: string;
  }[] = [];
  if (
    response.assignment_id !== assignment.assignmentId ||
    response.judge_id !== assignment.judgeId
  ) {
    issues.push({
      code: "ASSIGNMENT_MISMATCH",
      path: "$",
      message: "Response does not match the blind assignment",
    });
  }
  const expectedClipLabels = assignment.sets.flatMap((set) =>
    set.clips.map((clip) => clip.neutralLabel),
  );
  const expectedSetLabels = assignment.sets.map(
    (set) => set.neutralSetLabel,
  );
  if (
    !exactSet(
      response.clips.map((clip) => clip.clip_label),
      expectedClipLabels,
    ) ||
    !exactSet(
      response.sets.map((set) => set.set_label),
      expectedSetLabels,
    )
  ) {
    issues.push({
      code: "INCOMPLETE_SET",
      path: "$",
      message: "Clip or set coverage is incomplete or duplicated",
    });
  }
  for (const set of assignment.sets) {
    const responseSet = response.sets.find(
      (candidateSet) =>
        candidateSet.set_label === set.neutralSetLabel,
    );
    const labels = set.clips.map((clip) => clip.neutralLabel);
    if (
      !responseSet ||
      !exactSet(responseSet.ranking, labels) ||
      !labels.includes(responseSet.clearest_clip) ||
      !(
        responseSet.duration_judgment.longer_clip ===
          "SIMILAR_DURATION" ||
        labels.includes(
          responseSet.duration_judgment.longer_clip,
        )
      ) ||
      responseSet.pronunciation_issues.some(
        (issue) => !labels.includes(issue.clip_label),
      )
    ) {
      issues.push({
        code: "INCOMPLETE_SET",
        path: set.neutralSetLabel,
        message:
          "Ranking, direct clarity choice, or pronunciation evidence does not match its assigned clips",
      });
    }
    if (
      responseSet &&
      labels.includes(responseSet.clearest_clip)
    ) {
      const chosenClarity = response.clips.find(
        (clip) =>
          clip.clip_label === responseSet.clearest_clip,
      )?.scores.clarity;
      const otherClarityScores = response.clips
        .filter(
          (clip) =>
            labels.includes(clip.clip_label) &&
            clip.clip_label !== responseSet.clearest_clip,
        )
        .map((clip) => clip.scores.clarity);
      if (
        chosenClarity !== undefined &&
        otherClarityScores.some(
          (clarity) => clarity > chosenClarity,
        )
      ) {
        issues.push({
          code: "INTERNAL_CONTRADICTION",
          path: `${set.neutralSetLabel}.clearest_clip`,
          message:
            "The direct clarity choice cannot have a lower clarity score than another assigned clip",
        });
      }
    }
  }
  const text = allText(response);
  if (
    /\b(?:baseline|corrected|piper|bryce|linda|cori|elevenlabs|provider|pipeline)\b/iu.test(
      text,
    )
  ) {
    issues.push({
      code: "UNBLINDING_CLAIM",
      path: "$",
      message: "Response claims or guesses a hidden identity",
    });
  }
  if (
    /\b(?:filename|metadata|codec|bitrate|hash|mp3|attachment name|transcript|written text|text-only)\b/iu.test(
      text,
    )
  ) {
    issues.push({
      code: "NON_AUDIO_EVIDENCE",
      path: "$",
      message: "Response relies on hidden text, file, or metadata evidence",
    });
  }
  const heardEvidence =
    /\b(?:heard|voice|delivery|pause|pace|pacing|rhythm|pronunciation|articulation|intonation|timing|comfort|natural|silence|tempo|cadence|pitch|tone)\w*/iu;
  if (
    response.clips.some(
      (clip) => !heardEvidence.test(clip.evidence_note),
    ) ||
    response.sets.some(
      (set) => !heardEvidence.test(set.concise_reason),
    )
  ) {
    issues.push({
      code: "NON_AUDIO_EVIDENCE",
      path: "$",
      message: "Every note must cite something heard",
    });
  }
  if (
    response.clips.some(
      (clip) => clip.too_slow && clip.too_fast,
    )
  ) {
    issues.push({
      code: "INTERNAL_CONTRADICTION",
      path: "$.clips",
      message:
        "One clip cannot be marked both too slow and too fast",
    });
  }
  if (
    assignment.sets.length > 1 &&
    new Set(
      response.sets.map((set) =>
        set.concise_reason
          .toLocaleLowerCase("en-US")
          .replace(/(?:ALT|SET)-[A-F0-9]{10}/gu, "<label>")
          .replace(/\s+/gu, " ")
          .trim(),
      ),
    ).size === 1
  ) {
    issues.push({
      code: "IDENTICAL_BOILERPLATE",
      path: "$.sets",
      message: "Set reasons are identical boilerplate",
    });
  }
  return issues.length === 0
    ? {
        valid: true,
        response,
        responseHash: hashAiValue(response),
        retryAllowed: false,
        issues: [],
      }
    : {
        valid: false,
        response: null,
        responseHash: hashAiValue(response),
        retryAllowed: attempt === 1,
        issues,
      };
}

export interface AiValidatedConditionalJudgeRun {
  assignment: AiConditionalJudgeAssignment;
  response: AiConditionalJudgeResponse;
  responseHash: string;
}

export interface AiConditionalCandidateSummary {
  candidateId: string;
  validJudgeCount: number;
  medianScores: Record<AiAudioScoreDimension, number | null>;
  semanticFaithfulnessMedian: number | null;
  firstPlaceVotes: number;
  firstPlaceVotesByExcerpt: Readonly<Record<string, number>>;
  aheadOfCandidateVotesByExcerpt: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  clearerThanCandidateVotesByExcerpt: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  meanConfidence: number | null;
  criticalPronunciationJudgeCount: number;
  tooSlowJudgeCountByExcerpt: Readonly<Record<string, number>>;
  tooFastJudgeCountByExcerpt: Readonly<Record<string, number>>;
  heardAsLongerCount: number;
  longerDurationExcessiveRate: number | null;
  clarityJustifiesLongerDurationRate: number | null;
  objectiveIntegrityPass: boolean;
  contentConsistency: number | null;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function aggregateConditionalPanel(input: {
  subplan: AiBoundConditionalSubplan;
  runs: readonly AiValidatedConditionalJudgeRun[];
}): {
  validJudgeCount: number;
  candidates: readonly AiConditionalCandidateSummary[];
  panelHash: string;
} {
  assertConditionalSubplanIntegrity(
    input.subplan,
    input.subplan.audioInputs,
  );
  const expectedAssignments = new Map(
    input.subplan.assignments.map((assignment) => [
      assignment.judgeId,
      assignment,
    ]),
  );
  const judgeIds = new Set<string>();
  for (const run of input.runs) {
    if (
      judgeIds.has(run.assignment.judgeId) ||
      expectedAssignments.get(run.assignment.judgeId)
        ?.assignmentHash !== run.assignment.assignmentHash ||
      hashAiValue(run.response) !== run.responseHash ||
      !validateConditionalJudgeResponse(
        run.response,
        run.assignment,
        2,
      ).valid
    ) {
      throw new Error(
        "Conditional panel contains a duplicate or invalid run",
      );
    }
    judgeIds.add(run.assignment.judgeId);
  }
  const summaries = input.subplan.candidates.map((candidate) => {
    const scores = Object.fromEntries(
      AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
        dimension,
        [] as number[],
      ]),
    ) as Record<AiAudioScoreDimension, number[]>;
    const faithfulness: number[] = [];
    const confidences: number[] = [];
    let firstPlaceVotes = 0;
    const firstPlaceVotesByExcerpt: Record<string, number> = {};
    const aheadOfCandidateVotesByExcerpt: Record<
      string,
      Record<string, number>
    > = {};
    const clearerThanCandidateVotesByExcerpt: Record<
      string,
      Record<string, number>
    > = {};
    const criticalJudges = new Set<string>();
    const tooSlowJudgeCountByExcerpt: Record<string, number> = {};
    const tooFastJudgeCountByExcerpt: Record<string, number> = {};
    let heardAsLongerCount = 0;
    let longerExcessiveYes = 0;
    let longerExcessiveKnown = 0;
    let longerClarityYes = 0;
    let longerClarityKnown = 0;
    for (const run of input.runs) {
      for (const set of run.assignment.sets) {
        const assignedClip = set.clips.find(
          (clip) => clip.candidateId === candidate.candidateId,
        );
        if (!assignedClip) continue;
        const scored = run.response.clips.find(
          (clip) => clip.clip_label === assignedClip.neutralLabel,
        );
        if (!scored) {
          throw new Error("Validated conditional score disappeared");
        }
        for (const dimension of AI_AUDIO_SCORE_DIMENSIONS) {
          scores[dimension].push(scored.scores[dimension]);
        }
        faithfulness.push(scored.semantic_faithfulness);
        if (scored.too_slow) {
          tooSlowJudgeCountByExcerpt[set.excerptId] =
            (tooSlowJudgeCountByExcerpt[set.excerptId] ?? 0) + 1;
        }
        if (scored.too_fast) {
          tooFastJudgeCountByExcerpt[set.excerptId] =
            (tooFastJudgeCountByExcerpt[set.excerptId] ?? 0) + 1;
        }
        const responseSet = run.response.sets.find(
          (candidateSet) =>
            candidateSet.set_label === set.neutralSetLabel,
        );
        if (!responseSet) {
          throw new Error("Validated conditional set disappeared");
        }
        confidences.push(responseSet.confidence);
        if (responseSet.ranking[0] === assignedClip.neutralLabel) {
          firstPlaceVotes += 1;
          firstPlaceVotesByExcerpt[set.excerptId] =
            (firstPlaceVotesByExcerpt[set.excerptId] ?? 0) + 1;
        }
        const candidateRank = responseSet.ranking.indexOf(
          assignedClip.neutralLabel,
        );
        for (const otherClip of set.clips) {
          if (otherClip.candidateId === candidate.candidateId) {
            continue;
          }
          const otherRank = responseSet.ranking.indexOf(
            otherClip.neutralLabel,
          );
          if (candidateRank < otherRank) {
            const byExcerpt =
              aheadOfCandidateVotesByExcerpt[
                otherClip.candidateId
              ] ?? {};
            byExcerpt[set.excerptId] =
              (byExcerpt[set.excerptId] ?? 0) + 1;
            aheadOfCandidateVotesByExcerpt[
              otherClip.candidateId
            ] = byExcerpt;
          }
        }
        if (
          responseSet.audible_distinction !== "NONE" &&
          responseSet.clearest_clip ===
          assignedClip.neutralLabel
        ) {
          for (const otherClip of set.clips) {
            if (
              otherClip.candidateId === candidate.candidateId
            ) {
              continue;
            }
            const byExcerpt =
              clearerThanCandidateVotesByExcerpt[
                otherClip.candidateId
              ] ?? {};
            byExcerpt[set.excerptId] =
              (byExcerpt[set.excerptId] ?? 0) + 1;
            clearerThanCandidateVotesByExcerpt[
              otherClip.candidateId
            ] = byExcerpt;
          }
        }
        if (
          responseSet.pronunciation_issues.some(
            (issue) =>
              issue.clip_label === assignedClip.neutralLabel &&
              issue.severity === "critical",
          )
        ) {
          criticalJudges.add(run.assignment.judgeId);
        }
        if (
          responseSet.duration_judgment.longer_clip ===
          assignedClip.neutralLabel
        ) {
          heardAsLongerCount += 1;
          const excessive =
            responseSet.duration_judgment
              .longer_duration_excessive;
          if (excessive !== "uncertain") {
            longerExcessiveKnown += 1;
            if (excessive === "yes") {
              longerExcessiveYes += 1;
            }
          }
          const justified =
            responseSet.duration_judgment
              .clarity_justifies_longer_duration;
          if (justified !== "not_applicable") {
            longerClarityKnown += 1;
            if (justified === "yes") {
              longerClarityYes += 1;
            }
          }
        }
      }
    }
    const objectiveClips = input.subplan.audioInputs.filter(
      (clip) => clip.candidateId === candidate.candidateId,
    );
    return {
      candidateId: candidate.candidateId,
      validJudgeCount: judgeIds.size,
      medianScores: Object.fromEntries(
        AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
          dimension,
          median(scores[dimension]),
        ]),
      ) as Record<AiAudioScoreDimension, number | null>,
      semanticFaithfulnessMedian: median(faithfulness),
      firstPlaceVotes,
      firstPlaceVotesByExcerpt,
      aheadOfCandidateVotesByExcerpt,
      clearerThanCandidateVotesByExcerpt,
      meanConfidence:
        confidences.length === 0
          ? null
          : confidences.reduce((sum, value) => sum + value, 0) /
            confidences.length,
      criticalPronunciationJudgeCount: criticalJudges.size,
      tooSlowJudgeCountByExcerpt,
      tooFastJudgeCountByExcerpt,
      heardAsLongerCount,
      longerDurationExcessiveRate:
        longerExcessiveKnown === 0
          ? null
          : longerExcessiveYes / longerExcessiveKnown,
      clarityJustifiesLongerDurationRate:
        longerClarityKnown === 0
          ? null
          : longerClarityYes / longerClarityKnown,
      objectiveIntegrityPass: objectiveClips.every(
        (clip) => clip.objectiveIntegrityPass,
      ),
      contentConsistency:
        objectiveClips.length === 0
          ? null
          : objectiveClips.reduce(
              (sum, clip) => sum + clip.contentConsistency,
              0,
            ) / objectiveClips.length,
    };
  });
  const material = {
    validJudgeCount: judgeIds.size,
    candidates: summaries,
    subplanHash: input.subplan.subplanHash,
    responseHashes: input.runs.map((run) => run.responseHash).sort(),
  };
  return {
    ...material,
    panelHash: hashAiValue(material),
  };
}

function targetScoreDimension(
  dimension: AiTuningFailureSignal["dimension"],
): AiAudioScoreDimension {
  return dimension === "speaking_rate"
    ? "listening_comfort"
    : "pause_quality";
}

export function selectTunedConditionalCandidate(input: {
  draft: AiConditionalBranchDraft;
  summaries: readonly AiConditionalCandidateSummary[];
}): {
  status:
    | "INCOMPLETE"
    | "COMPLETED_NO_CLEAR_IMPROVEMENT"
    | "COMPLETED_SELECTED";
  selectedCandidateId: string | null;
  evidence: readonly string[];
} {
  if (
    input.draft.branchKind !== "TUNING" ||
    !input.draft.cause
  ) {
    throw new Error("Expected a tuning conditional draft");
  }
  const source = input.summaries.find(
    (summary) => summary.candidateId === "source-corrected",
  );
  const draftCandidateIds = input.draft.candidates.map(
    (candidate) => candidate.candidateId,
  );
  const tunedCandidateIds = new Set(
    input.draft.candidates
      .filter((candidate) => candidate.role === "TUNED_PROFILE")
      .map((candidate) => candidate.candidateId),
  );
  if (
    input.summaries.length !== input.draft.candidates.length ||
    !exactSet(
      input.summaries.map((summary) => summary.candidateId),
      draftCandidateIds,
    ) ||
    !source ||
    tunedCandidateIds.size === 0 ||
    input.summaries.some(
      (summary) => summary.validJudgeCount !== 3,
    )
  ) {
    return {
      status: "INCOMPLETE",
      selectedCandidateId: null,
      evidence: [
        "The three-judge tuning comparison is incomplete.",
      ],
    };
  }
  const target = targetScoreDimension(
    input.draft.cause.dimension,
  );
  const sourceTarget = source.medianScores[target];
  if (sourceTarget === null) {
    return {
      status: "INCOMPLETE",
      selectedCandidateId: null,
      evidence: ["The source target score is unavailable."],
    };
  }
  const eligible = input.summaries
    .filter((summary) =>
      tunedCandidateIds.has(summary.candidateId),
    )
    .map((summary) => {
      const score = summary.medianScores[target];
      const safeDimensions = [
        "clarity",
        "pronunciation",
        "naturalness",
      ] as const;
      const safeguardsPass = safeDimensions.every((dimension) => {
        const baseline = source.medianScores[dimension];
        const candidate = summary.medianScores[dimension];
        return (
          baseline !== null &&
          candidate !== null &&
          candidate >= baseline - 0.25
        );
      });
      const improvement =
        score === null ? Number.NEGATIVE_INFINITY : score - sourceTarget;
      return {
        summary,
        improvement,
        eligible:
          improvement >= 0.5 &&
          input.draft.affectedExcerptIds.every(
            (excerptId) =>
              (summary.firstPlaceVotesByExcerpt[excerptId] ?? 0) >=
              2,
          ) &&
          safeguardsPass &&
          (summary.semanticFaithfulnessMedian ?? 0) >= 4 &&
          summary.criticalPronunciationJudgeCount < 2 &&
          input.draft.affectedExcerptIds.every(
            (excerptId) =>
              (summary.tooSlowJudgeCountByExcerpt[excerptId] ??
                0) <= 1 &&
              (summary.tooFastJudgeCountByExcerpt[excerptId] ??
                0) <= 1,
          ) &&
          summary.objectiveIntegrityPass &&
          (summary.contentConsistency ?? 0) >= 0.95,
      };
    })
    .filter((candidate) => candidate.eligible)
    .sort(
      (left, right) =>
        right.improvement - left.improvement ||
        right.summary.firstPlaceVotes -
          left.summary.firstPlaceVotes ||
        left.summary.candidateId.localeCompare(
          right.summary.candidateId,
        ),
    );
  const selected = eligible[0];
  return selected
    ? {
        status: "COMPLETED_SELECTED",
        selectedCandidateId: selected.summary.candidateId,
        evidence: [
          `${selected.summary.candidateId} improved ${target} by ${selected.improvement.toFixed(
            2,
          )} median point(s), won a majority in every affected excerpt, and passed the clarity, pronunciation, naturalness, semantic-faithfulness, and objective-integrity safeguards.`,
        ],
      }
    : {
        status: "COMPLETED_NO_CLEAR_IMPROVEMENT",
        selectedCandidateId: null,
        evidence: [
          "Neither one-round profile clearly improved the failed dimension without a material safeguard regression.",
        ],
      };
}

export function voiceMetricsFromConditionalPanel(input: {
  draft: AiConditionalBranchDraft;
  summaries: readonly AiConditionalCandidateSummary[];
}): readonly AiVoiceCandidateMetrics[] {
  if (input.draft.branchKind !== "LOCAL_VOICES") {
    throw new Error("Expected a local-voice conditional draft");
  }
  return input.draft.candidates.map((candidate) => {
    const summary = input.summaries.find(
      (item) => item.candidateId === candidate.candidateId,
    );
    if (!summary) {
      throw new Error(
        `Missing conditional summary for ${candidate.candidateId}`,
      );
    }
    const score = (dimension: AiAudioScoreDimension) =>
      summary.medianScores[dimension] ?? 0;
    const structuralMinimumsPass =
      score("clarity") >= 4 &&
      score("pause_quality") >= 4 &&
      score("pronunciation") >= 4 &&
      score("professional_quality") >= 3.8 &&
      summary.objectiveIntegrityPass &&
      (summary.contentConsistency ?? 0) >= 0.6;
    const voiceOrFatigueFails =
      score("naturalness") < 3.8 ||
      score("listening_comfort") < 3.8 ||
      score("long_form_suitability") < 3.8;
    return {
      voice: candidate.voice,
      validJudgeCount: summary.validJudgeCount,
      medianScores: summary.medianScores,
      blockingAcousticDefects: summary.objectiveIntegrityPass
        ? []
        : ["CONDITIONAL_OBJECTIVE_INTEGRITY_FAILED"],
      contentConsistency: summary.contentConsistency,
      failsPrimarilyVoiceNaturalnessOrFatigue:
        structuralMinimumsPass && voiceOrFatigueFails,
      decisiveEvidence: [
        `${candidate.voice} received ${String(
          summary.firstPlaceVotes,
        )} first-place excerpt ranking(s) across three blind judges.`,
      ],
      dissentingEvidence:
        summary.criticalPronunciationJudgeCount > 0
          ? [
              `${String(
                summary.criticalPronunciationJudgeCount,
              )} judge(s) reported a critical pronunciation issue.`,
            ]
          : [],
    };
  });
}

interface AiConditionalFetchResponse {
  ok: boolean;
  status: number;
  headers?: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
}

interface AiConditionalUsage {
  promptTokens: number;
  audioInputTokens: number | null;
  textInputTokens: number | null;
  completionTokens: number;
  openRouterCostUsd: number;
}

export interface AiConditionalExecutionHooks {
  bindSubplanBeforeRequests(
    binding: Readonly<Record<string, unknown>>,
  ): Promise<void>;
  reserveRequest(input: {
    subplanHash: string;
    judgeId: string;
    attempt: 1 | 2;
  }): Promise<number>;
  settleRequest(input: {
    requestIndex: number;
    subplanHash: string;
    judgeId: string;
    attempt: 1 | 2;
    status:
      | "ACCEPTED"
      | "REJECTED"
      | "UNCERTAIN_PAID"
      | "FAILED_NOT_BILLED";
    usage: AiConditionalUsage | null;
    actualCostUsd: number | null;
    openRouterRequestId: string | null;
    latencyMs: number;
    responseSha256: string | null;
    issueCodes: readonly string[];
    retryPermitted: boolean;
  }): Promise<void>;
  persistPrivateRecord?(input: {
    requestIndex: number;
    kind: "REQUEST" | "RESPONSE" | "UNCERTAIN";
    record: Readonly<Record<string, unknown>>;
  }): Promise<void>;
}

export interface ExecuteConditionalPanelWithFetchInput {
  subplan: AiBoundConditionalSubplan;
  currentAudioInputs: readonly AiConditionalAudioClip[];
  readAudio(
    clip: AiConditionalAudioClip,
  ): Promise<Uint8Array>;
  secret: string;
  hooks: AiConditionalExecutionHooks;
  fetchImpl: (
    url: string,
    init: {
      method: "POST";
      headers: Readonly<Record<string, string>>;
      body: string;
      signal: AbortSignal;
    },
  ) => Promise<AiConditionalFetchResponse>;
  endpoint?: string;
  model?: string;
  maximumExternalRequests?: number;
  requestTimeoutMs?: number;
}

export interface AiConditionalExecutionResult {
  status:
    | "COMPLETE"
    | "INCOMPLETE_INVALID"
    | "STOPPED_CAP"
    | "STOPPED_HTTP"
    | "STOPPED_UNCERTAIN";
  runs: readonly AiValidatedConditionalJudgeRun[];
  rejected: readonly {
    judgeId: string;
    attempt: 1 | 2;
    requestIndex: number | null;
    issueCodes: readonly string[];
  }[];
  externalRequests: number;
}

function sha256Bytes(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function conditionalUsage(value: unknown): AiConditionalUsage | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }
  const usage = value as Record<string, unknown>;
  const details = usage.prompt_tokens_details;
  const promptTokens = usage.prompt_tokens;
  const completionTokens = usage.completion_tokens;
  const cost = usage.cost;
  const audioTokens =
    details &&
    typeof details === "object" &&
    !Array.isArray(details)
      ? (details as Record<string, unknown>).audio_tokens
      : undefined;
  if (
    typeof promptTokens !== "number" ||
    !Number.isInteger(promptTokens) ||
    promptTokens < 0 ||
    typeof completionTokens !== "number" ||
    !Number.isInteger(completionTokens) ||
    completionTokens < 0 ||
    typeof cost !== "number" ||
    !Number.isFinite(cost) ||
    cost < 0 ||
    (audioTokens !== undefined &&
      (typeof audioTokens !== "number" ||
        !Number.isInteger(audioTokens) ||
        audioTokens < 0 ||
        audioTokens > promptTokens))
  ) {
    return null;
  }
  const reportedAudioTokens =
    typeof audioTokens === "number" ? audioTokens : null;
  return {
    promptTokens,
    audioInputTokens: reportedAudioTokens,
    textInputTokens:
      reportedAudioTokens === null
        ? null
        : promptTokens - reportedAudioTokens,
    completionTokens,
    openRouterCostUsd:
      Math.ceil(cost * 100_000_000) /
      100_000_000,
  };
}

function conditionalToolArguments(value: unknown): unknown {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return undefined;
  }
  const choices = (value as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length !== 1) {
    return undefined;
  }
  const choice = choices[0];
  if (
    !choice ||
    typeof choice !== "object" ||
    Array.isArray(choice)
  ) {
    return undefined;
  }
  const message = (choice as Record<string, unknown>).message;
  if (
    !message ||
    typeof message !== "object" ||
    Array.isArray(message)
  ) {
    return undefined;
  }
  const calls = (message as Record<string, unknown>).tool_calls;
  if (!Array.isArray(calls) || calls.length !== 1) {
    return undefined;
  }
  const call = calls[0];
  if (!call || typeof call !== "object" || Array.isArray(call)) {
    return undefined;
  }
  const fn = (call as Record<string, unknown>).function;
  if (!fn || typeof fn !== "object" || Array.isArray(fn)) {
    return undefined;
  }
  const functionRecord = fn as Record<string, unknown>;
  if (
    functionRecord.name !== AI_AUDIO_CONDITIONAL_TOOL_NAME ||
    typeof functionRecord.arguments !== "string"
  ) {
    return undefined;
  }
  return functionRecord.arguments;
}

async function conditionalRequestBody(input: {
  subplan: AiBoundConditionalSubplan;
  assignment: AiConditionalJudgeAssignment;
  prompt: string;
  attempt: 1 | 2;
  audioByKey: ReadonlyMap<string, AiConditionalAudioClip>;
  readAudio(
    clip: AiConditionalAudioClip,
  ): Promise<Uint8Array>;
  model: string;
}): Promise<{
  body: Readonly<Record<string, unknown>>;
  requestRecord: Readonly<Record<string, unknown>>;
}> {
  const content: Record<string, unknown>[] = [
    {
      type: "text",
      text:
        input.attempt === 1
          ? input.prompt
          : `${input.prompt}\n\n${RETRY_INSTRUCTION}`,
    },
  ];
  const redactedClips: Record<string, unknown>[] = [];
  for (const set of input.assignment.sets) {
    content.push({
      type: "text",
      text: `Listen to ${set.neutralSetLabel}.`,
    });
    for (const assigned of set.clips) {
      const key = `${assigned.excerptId}\0${assigned.candidateId}`;
      const identity = input.audioByKey.get(key);
      if (
        !identity ||
        identity.audioSha256 !== assigned.audioSha256
      ) {
        throw new Error(
          "Conditional assignment no longer matches its bound audio",
        );
      }
      const bytes = await input.readAudio(identity);
      const payloadHash = sha256Bytes(bytes);
      if (payloadHash !== assigned.audioSha256) {
        throw new Error(
          "Conditional audio payload changed after subplan binding",
        );
      }
      content.push({
        type: "text",
        text: `Neutral clip label: ${assigned.neutralLabel}`,
      });
      content.push({
        type: "input_audio",
        input_audio: {
          data: Buffer.from(bytes).toString("base64"),
          format: "mp3",
        },
      });
      redactedClips.push({
        setLabel: set.neutralSetLabel,
        clipLabel: assigned.neutralLabel,
        audioSha256: payloadHash,
        bytes: bytes.byteLength,
      });
    }
  }
  const body = {
    model: input.model,
    provider: {
      allow_fallbacks: false,
      require_parameters: true,
    },
    store: false,
    stream: false,
    max_tokens: 5_000,
    messages: [
      {
        role: "system",
        content:
          "Perform a fresh independent blind audio evaluation at exactly 1.0x normal playback speed. Return only the required function call.",
      },
      {
        role: "user",
        content,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: AI_AUDIO_CONDITIONAL_TOOL.name,
          description: AI_AUDIO_CONDITIONAL_TOOL.description,
          parameters: AI_AUDIO_CONDITIONAL_TOOL.parameters,
          strict: AI_AUDIO_CONDITIONAL_TOOL.strict,
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: AI_AUDIO_CONDITIONAL_TOOL.name },
    },
  } as const;
  return {
    body,
    requestRecord: {
      schemaVersion:
        "tenxpros-phase2c-openrouter-conditional-redacted-request-v2",
      provider: "openrouter",
      endpoint: "/chat/completions",
      model: input.model,
      providerRouting: {
        allowFallbacks: false,
        requireParameters: true,
      },
      authoritativeUsageCostRequired: true,
      maximumOutputRequestField: "max_tokens",
      stream: false,
      promptLoggingRequested: false,
      dataUseOptInRequested: false,
      subplanHash: input.subplan.subplanHash,
      judgeId: input.assignment.judgeId,
      attempt: input.attempt,
      promptSha256: hashAiValue(
        input.attempt === 1
          ? input.prompt
          : `${input.prompt}\n\n${RETRY_INSTRUCTION}`,
      ),
      clips: redactedClips,
      requestBodySha256: sha256Bytes(JSON.stringify(body)),
      secretStored: false,
      audioPayloadStored: false,
      completeRequestBodyStored: false,
    },
  };
}

/**
 * Executes the already-generated and hash-bound conditional audio panel.
 *
 * Cost/request enforcement and append-only persistence are mandatory hooks so
 * the one-off CLI remains the single accounting authority. The executor never
 * retries a network ambiguity or clear HTTP failure; only a machine-invalid
 * judge response receives one new-conversation retry.
 */
export async function executeConditionalPanelWithFetch(
  input: ExecuteConditionalPanelWithFetchInput,
): Promise<AiConditionalExecutionResult> {
  if (!input.secret.trim()) {
    throw new Error("Conditional execution requires the secret");
  }
  const endpoint =
    input.endpoint ?? AI_AUDIO_OPENROUTER_ENDPOINT;
  const model = input.model ?? AI_AUDIO_OPENROUTER_MODEL;
  if (
    endpoint !== AI_AUDIO_OPENROUTER_ENDPOINT ||
    model !== AI_AUDIO_OPENROUTER_MODEL
  ) {
    throw new Error(
      "Conditional execution is pinned to OpenRouter openai/gpt-audio with no alternate endpoint or model",
    );
  }
  const maximumExternalRequests =
    input.maximumExternalRequests ?? 4;
  if (
    !Number.isInteger(maximumExternalRequests) ||
    maximumExternalRequests < 3 ||
    maximumExternalRequests > 4
  ) {
    throw new Error(
      "Conditional execution permits exactly three primary calls and at most one task-wide validation retry",
    );
  }
  assertConditionalSubplanIntegrity(
    input.subplan,
    input.currentAudioInputs,
  );
  await input.hooks.bindSubplanBeforeRequests(
    conditionalSubplanLedgerBinding(input.subplan),
  );
  const audioByKey = new Map(
    input.currentAudioInputs.map((clip) => [
      `${clip.excerptId}\0${clip.candidateId}`,
      clip,
    ]),
  );
  const runs: AiValidatedConditionalJudgeRun[] = [];
  const rejected: {
    judgeId: string;
    attempt: 1 | 2;
    requestIndex: number | null;
    issueCodes: readonly string[];
  }[] = [];
  let externalRequests = 0;
  let taskWideRetryScheduled = false;
  const workItems: {
    assignment: AiConditionalJudgeAssignment;
    attempt: 1 | 2;
  }[] = input.subplan.assignments.map((assignment) => ({
    assignment,
    attempt: 1,
  }));
  /*
   * A retry is appended to this queue only after its retry-eligible primary
   * settles. Because all three attempt-1 items are seeded first, every primary
   * is dispatched before the single possible task-wide retry.
   */
  for (
    let workIndex = 0;
    workIndex < workItems.length;
    workIndex += 1
  ) {
    const workItem = workItems[workIndex];
    if (!workItem) {
      throw new Error("Conditional work queue is incomplete");
    }
    const { assignment, attempt } = workItem;
    const prompt = input.subplan.prompts.find(
      (candidate) => candidate.judgeId === assignment.judgeId,
    );
    if (!prompt) {
      throw new Error("Conditional prompt is missing");
    }
      if (externalRequests >= maximumExternalRequests) {
        rejected.push({
          judgeId: assignment.judgeId,
          attempt,
          requestIndex: null,
          issueCodes: ["CAP_REACHED_BEFORE_REQUEST"],
        });
        return {
          status: "STOPPED_CAP",
          runs,
          rejected,
          externalRequests,
        };
      }
      /*
       * Re-read and hash every payload before reserving a paid request. A
       * missing or changed local input therefore cannot consume a ledger
       * request slot or be mistaken for an external dispatch.
       */
      const { body, requestRecord } =
        await conditionalRequestBody({
          subplan: input.subplan,
          assignment,
          prompt: prompt.prompt,
          attempt,
          audioByKey,
          readAudio: input.readAudio,
          model,
        });
      let requestIndex: number;
      try {
        requestIndex = await input.hooks.reserveRequest({
          subplanHash: input.subplan.subplanHash,
          judgeId: assignment.judgeId,
          attempt,
        });
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            /request cap|spending cap|CAP_REACHED_BEFORE_REQUEST/iu.test(
              error.message,
            )
          )
        ) {
          throw error;
        }
        rejected.push({
          judgeId: assignment.judgeId,
          attempt,
          requestIndex: null,
          issueCodes: ["CAP_REACHED_BEFORE_REQUEST"],
        });
        return {
          status: "STOPPED_CAP",
          runs,
          rejected,
          externalRequests,
        };
      }
      await input.hooks.persistPrivateRecord?.({
        requestIndex,
        kind: "REQUEST",
        record: {
          ...requestRecord,
          requestIndex,
        },
      });
      externalRequests += 1;
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        input.requestTimeoutMs ?? 10 * 60 * 1_000,
      );
      const startedAt = Date.now();
      let response!: AiConditionalFetchResponse;
      let text!: string;
      try {
        response = await input.fetchImpl(
          endpoint,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${input.secret}`,
              "Content-Type": "application/json",
              ...OPENROUTER_ATTRIBUTION_HEADERS,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          },
        );
        text = await response.text();
      } catch (error) {
        await input.hooks.settleRequest({
          requestIndex,
          subplanHash: input.subplan.subplanHash,
          judgeId: assignment.judgeId,
          attempt,
          status: "UNCERTAIN_PAID",
          usage: null,
          actualCostUsd: null,
          openRouterRequestId: null,
          latencyMs: Date.now() - startedAt,
          responseSha256: null,
          issueCodes: [
            error instanceof Error
              ? error.name
              : "AMBIGUOUS_NETWORK_FAILURE",
          ],
          retryPermitted: false,
        });
        await input.hooks.persistPrivateRecord?.({
          requestIndex,
          kind: "UNCERTAIN",
          record: {
            schemaVersion:
              "tenxpros-phase2c-conditional-uncertain-v1",
            requestIndex,
            judgeId: assignment.judgeId,
            attempt,
            retryPermitted: false,
          },
        });
        rejected.push({
          judgeId: assignment.judgeId,
          attempt,
          requestIndex,
          issueCodes: ["UNCERTAIN_PAID"],
        });
        return {
          status: "STOPPED_UNCERTAIN",
          runs,
          rejected,
          externalRequests,
        };
      } finally {
        clearTimeout(timeout);
      }
      const latencyMs = Date.now() - startedAt;
      const responseSha256 = sha256Bytes(text);
      let envelope: unknown;
      try {
        envelope = JSON.parse(text) as unknown;
      } catch {
        envelope = undefined;
      }
      const usage =
        envelope &&
        typeof envelope === "object" &&
        !Array.isArray(envelope)
          ? conditionalUsage(
              (envelope as Record<string, unknown>).usage,
            )
          : null;
      const openRouterRequestId =
        envelope &&
        typeof envelope === "object" &&
        !Array.isArray(envelope) &&
        typeof (envelope as Record<string, unknown>).id ===
          "string"
          ? String(
              (envelope as Record<string, unknown>).id,
            )
          : response.headers?.get("x-request-id") ?? null;
      await input.hooks.persistPrivateRecord?.({
        requestIndex,
        kind: "RESPONSE",
        record: {
          schemaVersion:
            "tenxpros-phase2c-conditional-private-response-v1",
          requestIndex,
          judgeId: assignment.judgeId,
          attempt,
          httpStatus: response.status,
          responseSha256,
          openRouterRequestId,
          latencyMs,
          usage,
          rawResponseStored: false,
          secretStored: false,
          requestAudioStored: false,
        },
      });
      if (response.status === 402) {
        await input.hooks.settleRequest({
          requestIndex,
          subplanHash: input.subplan.subplanHash,
          judgeId: assignment.judgeId,
          attempt,
          status: usage
            ? "REJECTED"
            : "FAILED_NOT_BILLED",
          usage,
          actualCostUsd: usage?.openRouterCostUsd ?? 0,
          openRouterRequestId,
          latencyMs,
          responseSha256,
          issueCodes: ["HTTP_402"],
          retryPermitted: false,
        });
        rejected.push({
          judgeId: assignment.judgeId,
          attempt,
          requestIndex,
          issueCodes: ["HTTP_402"],
        });
        return {
          status: "STOPPED_HTTP",
          runs,
          rejected,
          externalRequests,
        };
      }
      if (!usage && response.status === 429) {
        const scheduleRetry =
          attempt === 1 && !taskWideRetryScheduled;
        await input.hooks.settleRequest({
          requestIndex,
          subplanHash: input.subplan.subplanHash,
          judgeId: assignment.judgeId,
          attempt,
          status: "FAILED_NOT_BILLED",
          usage: null,
          actualCostUsd: 0,
          openRouterRequestId,
          latencyMs,
          responseSha256,
          issueCodes: ["HTTP_429_NOT_BILLED"],
          retryPermitted: scheduleRetry,
        });
        rejected.push({
          judgeId: assignment.judgeId,
          attempt,
          requestIndex,
          issueCodes: ["HTTP_429_NOT_BILLED"],
        });
        if (scheduleRetry) {
          taskWideRetryScheduled = true;
          workItems.push({ assignment, attempt: 2 });
          continue;
        }
        return {
          status: "STOPPED_HTTP",
          runs,
          rejected,
          externalRequests,
        };
      }
      if (!usage) {
        await input.hooks.settleRequest({
          requestIndex,
          subplanHash: input.subplan.subplanHash,
          judgeId: assignment.judgeId,
          attempt,
          status: "UNCERTAIN_PAID",
          usage: null,
          actualCostUsd: null,
          openRouterRequestId,
          latencyMs,
          responseSha256,
          issueCodes: ["MISSING_OPENROUTER_USAGE_COST"],
          retryPermitted: false,
        });
        rejected.push({
          judgeId: assignment.judgeId,
          attempt,
          requestIndex,
          issueCodes: ["MISSING_OPENROUTER_USAGE_COST"],
        });
        return {
          status: "STOPPED_UNCERTAIN",
          runs,
          rejected,
          externalRequests,
        };
      }
      if (!response.ok) {
        await input.hooks.settleRequest({
          requestIndex,
          subplanHash: input.subplan.subplanHash,
          judgeId: assignment.judgeId,
          attempt,
          status: "REJECTED",
          usage,
          actualCostUsd: usage.openRouterCostUsd,
          openRouterRequestId,
          latencyMs,
          responseSha256,
          issueCodes: [`HTTP_${String(response.status)}`],
          retryPermitted: false,
        });
        rejected.push({
          judgeId: assignment.judgeId,
          attempt,
          requestIndex,
          issueCodes: [`HTTP_${String(response.status)}`],
        });
        return {
          status: "STOPPED_HTTP",
          runs,
          rejected,
          externalRequests,
        };
      }
      const validation = validateConditionalJudgeResponse(
        conditionalToolArguments(envelope),
        assignment,
        attempt,
      );
      if (!validation.valid) {
        const issueCodes = validation.issues.map(
          (issue) => issue.code,
        );
        const scheduleRetry =
          validation.retryAllowed &&
          attempt === 1 &&
          !taskWideRetryScheduled;
        await input.hooks.settleRequest({
          requestIndex,
          subplanHash: input.subplan.subplanHash,
          judgeId: assignment.judgeId,
          attempt,
          status: "REJECTED",
          usage,
          actualCostUsd: usage.openRouterCostUsd,
          openRouterRequestId,
          latencyMs,
          responseSha256,
          issueCodes,
          retryPermitted: scheduleRetry,
        });
        rejected.push({
          judgeId: assignment.judgeId,
          attempt,
          requestIndex,
          issueCodes,
        });
        if (scheduleRetry) {
          taskWideRetryScheduled = true;
          workItems.push({ assignment, attempt: 2 });
        }
        continue;
      }
      await input.hooks.settleRequest({
        requestIndex,
        subplanHash: input.subplan.subplanHash,
        judgeId: assignment.judgeId,
        attempt,
        status: "ACCEPTED",
        usage,
        actualCostUsd: usage.openRouterCostUsd,
        openRouterRequestId,
        latencyMs,
        responseSha256,
        issueCodes: [],
        retryPermitted: false,
      });
      runs.push({
        assignment,
        response: validation.response,
        responseHash: validation.responseHash,
      });
  }
  return {
    status:
      runs.length === 3 ? "COMPLETE" : "INCOMPLETE_INVALID",
    runs,
    rejected,
    externalRequests,
  };
}
