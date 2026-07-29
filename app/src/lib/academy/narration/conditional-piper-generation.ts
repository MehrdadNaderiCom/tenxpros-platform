import { createHash } from "node:crypto";

import {
  hashAiValue,
  type AiTuningProfile,
} from "./ai-audio-evaluation";
import type {
  AiConditionalAudioClip,
  AiConditionalBranchDraft,
} from "./ai-audio-conditional-evaluation";

export const CONDITIONAL_PIPER_PLAN_SCHEMA_VERSION =
  "tenxpros-phase2c-conditional-piper-plan-v1";
export const CONDITIONAL_PIPER_RUNTIME_PLAN_VERSION =
  "tenxpros-piper-evaluation-runtime-plan-v1";
/**
 * A generated conditional clip is never allowed to be more than twice the
 * duration of the exact frozen corrected-Bryce excerpt whose wording it
 * preserves. This is an admission ceiling, not a prediction of voice speed:
 * local generation fails closed if Piper exceeds it, so a larger clip can
 * never be bound into a paid conditional request.
 */
export const CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO =
  2 as const;

export type ConditionalPiperVoice = "bryce" | "linda" | "cori";

export type ConditionalPauseType =
  | "sentence"
  | "paragraph"
  | "heading"
  | "tableRow"
  | "list"
  | "section"
  | "sampleEnd";

export interface ConditionalPiperVoiceAsset {
  id: ConditionalPiperVoice;
  modelPath: string;
  configPath: string;
  modelSha256: string;
  configSha256: string;
  nativeSampleRateHz: 22_050;
}

export const CONDITIONAL_PIPER_VOICE_ASSETS = Object.freeze({
  bryce: {
    id: "bryce",
    modelPath: "/opt/piper/voices/en_US-bryce-medium.onnx",
    configPath:
      "/opt/piper/voices/en_US-bryce-medium.onnx.json",
    modelSha256:
      "dc9caa6c313199ffb5ac698b6e542fa6cba388aeaf2731e25262e33b9810aef1",
    configSha256:
      "7ceb1bc4af6d4e41b6d1edbb86c67e91e01eaa71f66db4cd0ae92ac704d415be",
    nativeSampleRateHz: 22_050,
  },
  linda: {
    id: "linda",
    modelPath: "/opt/piper/voices/en_US-ljspeech-high.onnx",
    configPath:
      "/opt/piper/voices/en_US-ljspeech-high.onnx.json",
    modelSha256:
      "5d4f08ba6a2a48c44592eed3ce56bf85e9de3dd4e20df90541ae68a8310c029a",
    configSha256:
      "7e1f4634af596d83cca997fb7a931ba80b70f8a316a2655ee69c55365e0ace14",
    nativeSampleRateHz: 22_050,
  },
  cori: {
    id: "cori",
    modelPath: "/opt/piper/voices/en_GB-cori-high.onnx",
    configPath:
      "/opt/piper/voices/en_GB-cori-high.onnx.json",
    modelSha256:
      "470b4dd634c98f8a4850d7626ffc3dfc90774628eeef6605a6dd8f88f30a5903",
    configSha256:
      "9e7fb5b5671612c22f3c81cbe46c1ae87b031a4632bcb509e499dad6f1e2adec",
    nativeSampleRateHz: 22_050,
  },
} satisfies Record<
  ConditionalPiperVoice,
  ConditionalPiperVoiceAsset
>);

export interface FrozenCorrectedPiperSegment {
  id: string;
  sourceBlockId: string;
  text: string;
  textSha256: string;
  pauseAfterMs: number;
  pauseReason: string;
  pauseType: ConditionalPauseType;
}

export interface FrozenCorrectedPiperExcerpt {
  excerptId: string;
  sourceSampleId: string;
  sourceAudioSha256: string;
  sourceAudioDurationSeconds: number;
  sourceRecipeHash: string;
  transcript: string;
  transcriptSha256: string;
  segments: readonly FrozenCorrectedPiperSegment[];
}

interface ConditionalRuntimeSegment {
  id: string;
  text: string;
  pauseAfterMs: number;
}

interface ConditionalRuntimeSample {
  pairId: string;
  label: string;
  fileName: string;
  pipeline: "corrected";
  transcript: string;
  sentenceSilenceSeconds: 0;
  maximumDurationSeconds: number;
  segments: readonly ConditionalRuntimeSegment[];
}

interface ConditionalSourceAudit {
  excerptId: string;
  sourceSampleId: string;
  sourceAudioSha256: string;
  sourceAudioDurationSeconds: number;
  sourceRecipeHash: string;
  transcriptSha256: string;
  sourceSegmentHashes: readonly {
    id: string;
    sourceBlockId: string;
    textSha256: string;
    pauseAfterMs: number;
    pauseReason: string;
    pauseType: ConditionalPauseType;
  }[];
}

export interface ConditionalPiperGenerationPlanWithoutHash {
  version: typeof CONDITIONAL_PIPER_RUNTIME_PLAN_VERSION;
  schemaVersion: typeof CONDITIONAL_PIPER_PLAN_SCHEMA_VERSION;
  correctedOnly: true;
  branchKind: "LOCAL_VOICES" | "TUNING";
  basePlanHash: string;
  branchDraftHash: string;
  phase2BManifestSha256: string;
  candidateId: string;
  voice: ConditionalPiperVoiceAsset & {
    expectedModelSha256: string;
  };
  tuningProfile: AiTuningProfile | null;
  sourceRecipeSetHash: string;
  recipeHash: string;
  sampleRate: 22_050;
  lengthScale: number;
  durationLimit: {
    basis: "frozen_corrected_bryce_excerpt_duration";
    maximumGeneratedToSourceRatio: typeof CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO;
    enforcementCheck: "CONDITIONAL_DURATION_LIMIT";
    enforcedBeforeConditionalApi: true;
  };
  format: {
    intermediate: "PCM signed 16-bit little-endian mono WAV";
    final: "MP3 mono 64 kbps CBR";
  };
  loudness: {
    method: "single constant gain after stitching; no compression or limiter";
    targetLufs: -19;
    truePeakDbtp: -2;
    maxPositiveGainDb: 6;
    integratedLufsMin: -22;
    integratedLufsMax: -18;
    truePeakMaxDbtp: -1.5;
  };
  preservation: {
    visibleAcademyContentChanged: false;
    substantiveSpokenWordingChanged: false;
    transcriptMustMatchSourceExactly: true;
    baselineSamplesGenerated: false;
    fullAcademyRegenerated: false;
    productionWrites: false;
  };
  sourceAudit: readonly ConditionalSourceAudit[];
  samples: readonly ConditionalRuntimeSample[];
}

export interface ConditionalPiperGenerationPlan
  extends ConditionalPiperGenerationPlanWithoutHash {
  planHash: string;
}

export interface ConditionalPiperGeneratedRecord {
  excerptId: string;
  candidateId: string;
  voice: ConditionalPiperVoice;
  fileName: string;
  outputFile: string;
  audioSha256: string;
  audioSizeBytes: number;
  durationSeconds: number;
  transcriptSha256: string;
  objectiveIntegrityPass: true;
  contentConsistency: 1;
  modelSha256: string;
  configSha256: string;
  sourceRecipeHash: string;
  sourceRecipeSetHash: string;
  generationRecipeHash: string;
  planHash: string;
  runtimePlanBytesSha256: string;
}

export interface ConditionalPiperRuntimeResult {
  version: string;
  runtimeVersion: string;
  plan: {
    version: string;
    recipeHash: string;
    sha256: string;
    sampleCount: number;
    correctedOnly: boolean;
    lengthScale?: number;
  };
  isolation: {
    isolated: boolean;
    externalApiRequests: number;
    databaseImports: number;
    prismaImports: number;
  };
  voice: {
    id: string;
    modelSha256: string;
    expectedModelSha256Matched: boolean;
    configSha256: string;
    nativeSampleRate: number;
  };
  audioRecipe?: {
    lengthScale?: number;
  };
  summary: {
    samples: number;
    passed: number;
    failed: number;
    allPassed: boolean;
    allEligibleForBlindReview: boolean;
    qualityPassed: number;
  };
  samples: readonly {
    pairId: string;
    fileName: string;
    outputFile: string;
    durationSeconds: number | null;
    sizeBytes: number | null;
    sha256: string | null;
    transcriptSha256: string;
    passed: boolean;
    published: boolean;
    qualityPassed: boolean;
    eligibleForBlindReview: boolean;
    checks: readonly {
      id: string;
      pass: boolean;
    }[];
  }[];
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const REQUIRED_RUNTIME_CHECKS = Object.freeze([
  "TRANSCRIPT_RECONSTRUCTION",
  "SEGMENT_ORDER",
  "NETWORK_ISOLATED",
  "NO_DATABASE_RUNTIME",
  "OUTPUT_ISOLATED_FROM_PRODUCTION",
  "SEGMENT_COUNT",
  "INSERTED_SILENCE_EXACT",
  "POST_NORMALIZATION_SILENCE_EXACT",
  "FRAME_COUNT_PRESERVED",
  "MP3_DECODABLE",
  "MP3_CODEC",
  "SAMPLE_RATE",
  "MONO_CHANNEL",
  "CBR_64K",
  "CONDITIONAL_DURATION_LIMIT",
  "INTEGRATED_LOUDNESS_RANGE",
  "TRUE_PEAK_LIMIT",
  "NO_FULL_SCALE_SAMPLES",
  "NO_CLIPPING_PLATEAU",
  "PUBLISHED_COPY_INTEGRITY",
] as const);

const LOUDNESS_RECIPE = Object.freeze({
  method:
    "single constant gain after stitching; no compression or limiter",
  targetLufs: -19,
  truePeakDbtp: -2,
  maxPositiveGainDb: 6,
  integratedLufsMin: -22,
  integratedLufsMax: -18,
  truePeakMaxDbtp: -1.5,
} as const);

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertSha256(value: string, label: string): void {
  if (!SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256`);
  }
}

function assertSafeId(value: string, label: string): void {
  if (!SAFE_ID_PATTERN.test(value)) {
    throw new Error(`${label} must be a safe non-empty identifier`);
  }
}

function exactPauseFrames(pauseAfterMs: number): number {
  return (22_050 * pauseAfterMs) / 1_000;
}

export function maximumConditionalGeneratedDurationSeconds(
  sourceAudioDurationSeconds: number,
): number {
  if (
    !Number.isFinite(sourceAudioDurationSeconds) ||
    sourceAudioDurationSeconds <= 0
  ) {
    throw new Error(
      "Frozen corrected source duration must be positive",
    );
  }
  return (
    sourceAudioDurationSeconds *
    CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO
  );
}

function assertFrozenExcerpt(
  excerpt: FrozenCorrectedPiperExcerpt,
): void {
  assertSafeId(excerpt.excerptId, "excerptId");
  assertSafeId(excerpt.sourceSampleId, "sourceSampleId");
  assertSha256(
    excerpt.sourceAudioSha256,
    `${excerpt.excerptId} sourceAudioSha256`,
  );
  assertSha256(
    excerpt.sourceRecipeHash,
    `${excerpt.excerptId} sourceRecipeHash`,
  );
  assertSha256(
    excerpt.transcriptSha256,
    `${excerpt.excerptId} transcriptSha256`,
  );
  if (
    !Number.isFinite(excerpt.sourceAudioDurationSeconds) ||
    excerpt.sourceAudioDurationSeconds <= 0
  ) {
    throw new Error(
      `${excerpt.excerptId} source duration must be positive`,
    );
  }
  if (excerpt.segments.length === 0) {
    throw new Error(`${excerpt.excerptId} has no synthesis segments`);
  }
  const segmentIds = new Set<string>();
  for (const segment of excerpt.segments) {
    if (
      !segment.id.trim() ||
      /[\u0000-\u001f\u007f]/u.test(segment.id)
    ) {
      throw new Error(
        `${excerpt.excerptId} segment id must be non-empty and contain no control characters`,
      );
    }
    if (segmentIds.has(segment.id)) {
      throw new Error(
        `${excerpt.excerptId} has duplicate segment ${segment.id}`,
      );
    }
    segmentIds.add(segment.id);
    if (!segment.sourceBlockId.trim() || !segment.text.trim()) {
      throw new Error(
        `${excerpt.excerptId}/${segment.id} source block and text are required`,
      );
    }
    assertSha256(
      segment.textSha256,
      `${excerpt.excerptId}/${segment.id} textSha256`,
    );
    if (
      sha256Text(segment.text) !== segment.textSha256 &&
      sha256Text(segment.text.trim()) !== segment.textSha256
    ) {
      throw new Error(
        `${excerpt.excerptId}/${segment.id} source text hash mismatch`,
      );
    }
    if (
      !Number.isInteger(segment.pauseAfterMs) ||
      segment.pauseAfterMs < 0 ||
      segment.pauseAfterMs > 5_000 ||
      !Number.isInteger(exactPauseFrames(segment.pauseAfterMs))
    ) {
      throw new Error(
        `${excerpt.excerptId}/${segment.id} pause must map to exact 22.05 kHz PCM frames`,
      );
    }
  }
  if (excerpt.segments.at(-1)?.pauseAfterMs !== 0) {
    throw new Error(
      `${excerpt.excerptId} final synthesis segment must have no trailing pause`,
    );
  }
  const reconstructed = normalizeWhitespace(
    excerpt.segments.map((segment) => segment.text).join(" "),
  );
  if (reconstructed !== normalizeWhitespace(excerpt.transcript)) {
    throw new Error(
      `${excerpt.excerptId} segments do not reconstruct the frozen transcript`,
    );
  }
  if (
    sha256Text(excerpt.transcript) !== excerpt.transcriptSha256 &&
    sha256Text(normalizeWhitespace(excerpt.transcript)) !==
      excerpt.transcriptSha256
  ) {
    throw new Error(
      `${excerpt.excerptId} frozen transcript hash mismatch`,
    );
  }
}

function sortedFrozenExcerpts(
  excerpts: readonly FrozenCorrectedPiperExcerpt[],
  expectedIds: readonly string[],
): readonly FrozenCorrectedPiperExcerpt[] {
  const expected = [...expectedIds].sort();
  const sorted = [...excerpts].sort((left, right) =>
    left.excerptId.localeCompare(right.excerptId),
  );
  if (
    sorted.length !== expected.length ||
    sorted.map((excerpt) => excerpt.excerptId).join("\0") !==
      expected.join("\0")
  ) {
    throw new Error(
      "Conditional Piper excerpts must exactly match the branch excerpt set",
    );
  }
  for (const excerpt of sorted) assertFrozenExcerpt(excerpt);
  return sorted;
}

function roundPauseToExactFrames(value: number): number {
  const bounded = Math.max(0, Math.min(5_000, value));
  return Math.round(bounded / 20) * 20;
}

function pauseTypeForTuningDimension(
  dimension: AiTuningProfile["targetDimension"],
): ConditionalPauseType | null {
  const pauseTypes: Record<
    AiTuningProfile["targetDimension"],
    ConditionalPauseType | null
  > = {
    sentence_pause: "sentence",
    paragraph_pause: "paragraph",
    heading_pause: "heading",
    table_row_pause: "tableRow",
    list_item_pause: "list",
    section_pause: "section",
    table_label_repetition: null,
    short_table_field_grouping: null,
    speaking_rate: null,
  };
  return pauseTypes[dimension];
}

function applyPauseProfile(
  excerpt: FrozenCorrectedPiperExcerpt,
  profile: AiTuningProfile,
): readonly ConditionalRuntimeSegment[] {
  const pauseType = pauseTypeForTuningDimension(
    profile.targetDimension,
  );
  const multiplier = profile.changes.pause_multiplier;
  if (
    pauseType === null ||
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier)
  ) {
    throw new Error(
      `${profile.profileId} is not a valid pause profile`,
    );
  }
  let changed = 0;
  const segments = excerpt.segments.map((segment) => {
    if (
      segment.pauseType !== pauseType ||
      segment.pauseAfterMs === 0
    ) {
      return {
        id: segment.id,
        text: segment.text,
        pauseAfterMs: segment.pauseAfterMs,
      };
    }
    const adjusted = roundPauseToExactFrames(
      segment.pauseAfterMs * multiplier,
    );
    if (adjusted !== segment.pauseAfterMs) changed += 1;
    return {
      id: segment.id,
      text: segment.text,
      pauseAfterMs: adjusted,
    };
  });
  if (changed === 0) {
    throw new Error(
      `${profile.profileId} does not affect ${excerpt.excerptId}`,
    );
  }
  return segments;
}

function groupTableSegments(
  excerpt: FrozenCorrectedPiperExcerpt,
  profile: AiTuningProfile,
): readonly ConditionalRuntimeSegment[] {
  const mode = profile.changes.short_table_field_grouping;
  if (
    mode !== "pair_short_fields" &&
    mode !== "group_complete_row"
  ) {
    throw new Error(
      `${profile.profileId} has an unsupported table grouping mode`,
    );
  }
  const grouped: ConditionalRuntimeSegment[] = [];
  const rows = new Map<string, FrozenCorrectedPiperSegment[]>();
  for (const segment of excerpt.segments) {
    const row = rows.get(segment.sourceBlockId) ?? [];
    row.push(segment);
    rows.set(segment.sourceBlockId, row);
  }
  if (rows.size === excerpt.segments.length) {
    throw new Error(
      `${profile.profileId} found no multi-field table row in ${excerpt.excerptId}`,
    );
  }
  for (const row of rows.values()) {
    if (mode === "group_complete_row") {
      grouped.push({
        id: `group:${row.map((segment) => segment.id).join("+")}`,
        text: row.map((segment) => segment.text).join(" "),
        pauseAfterMs: row.at(-1)?.pauseAfterMs ?? 0,
      });
      continue;
    }
    for (let index = 0; index < row.length; index += 2) {
      const pair = row.slice(index, index + 2);
      grouped.push({
        id: `group:${pair.map((segment) => segment.id).join("+")}`,
        text: pair.map((segment) => segment.text).join(" "),
        pauseAfterMs: pair.at(-1)?.pauseAfterMs ?? 0,
      });
    }
  }
  return grouped;
}

function applyTuningProfile(
  excerpt: FrozenCorrectedPiperExcerpt,
  profile: AiTuningProfile,
): {
  segments: readonly ConditionalRuntimeSegment[];
  lengthScale: number;
} {
  if (profile.targetDimension.endsWith("_pause")) {
    return {
      segments: applyPauseProfile(excerpt, profile),
      lengthScale: 1,
    };
  }
  if (
    profile.targetDimension === "short_table_field_grouping"
  ) {
    return {
      segments: groupTableSegments(excerpt, profile),
      lengthScale: 1,
    };
  }
  if (profile.targetDimension === "speaking_rate") {
    const multiplier =
      profile.changes.speaking_rate_multiplier;
    if (
      typeof multiplier !== "number" ||
      !Number.isFinite(multiplier) ||
      multiplier <= 0
    ) {
      throw new Error(
        `${profile.profileId} has an invalid speaking-rate multiplier`,
      );
    }
    const lengthScale =
      Math.round((1 / multiplier) * 1_000_000) / 1_000_000;
    if (lengthScale < 0.75 || lengthScale > 1.25) {
      throw new Error(
        `${profile.profileId} requires an unsafe Piper length scale`,
      );
    }
    return {
      segments: excerpt.segments.map((segment) => ({
        id: segment.id,
        text: segment.text,
        pauseAfterMs: segment.pauseAfterMs,
      })),
      lengthScale,
    };
  }
  throw new Error(
    `${profile.profileId} would alter the frozen transcript; table-label removal is fail-closed until an owner-approved non-substantive transcript is plan-bound`,
  );
}

function neutralRuntimeIdentity(input: {
  branchDraftHash: string;
  candidateId: string;
  excerptId: string;
}): {
  pairId: string;
  label: string;
  fileName: string;
} {
  const digest = hashAiValue([
    "conditional-piper-neutral-file-v1",
    input.branchDraftHash,
    input.candidateId,
    input.excerptId,
  ]).toUpperCase();
  return {
    pairId: `set-${digest.slice(0, 12)}`,
    label: `ALT-${digest.slice(12, 24)}`,
    fileName: `clip-${digest.slice(24, 44)}.mp3`,
  };
}

function sourceAudit(
  excerpt: FrozenCorrectedPiperExcerpt,
): ConditionalSourceAudit {
  return {
    excerptId: excerpt.excerptId,
    sourceSampleId: excerpt.sourceSampleId,
    sourceAudioSha256: excerpt.sourceAudioSha256,
    sourceAudioDurationSeconds:
      excerpt.sourceAudioDurationSeconds,
    sourceRecipeHash: excerpt.sourceRecipeHash,
    transcriptSha256: excerpt.transcriptSha256,
    sourceSegmentHashes: excerpt.segments.map((segment) => ({
      id: segment.id,
      sourceBlockId: segment.sourceBlockId,
      textSha256: segment.textSha256,
      pauseAfterMs: segment.pauseAfterMs,
      pauseReason: segment.pauseReason,
      pauseType: segment.pauseType,
    })),
  };
}

function finalizePlan(
  withoutHash: ConditionalPiperGenerationPlanWithoutHash,
): ConditionalPiperGenerationPlan {
  return {
    ...withoutHash,
    planHash: hashAiValue(withoutHash),
  };
}

function commonPlan(input: {
  draft: AiConditionalBranchDraft;
  phase2BManifestSha256: string;
  candidateId: string;
  voice: ConditionalPiperVoice;
  profile: AiTuningProfile | null;
  excerpts: readonly FrozenCorrectedPiperExcerpt[];
  runtimeSamples: readonly ConditionalRuntimeSample[];
  lengthScale: number;
}): ConditionalPiperGenerationPlan {
  assertSha256(input.draft.basePlanHash, "basePlanHash");
  assertSha256(input.draft.draftHash, "branchDraftHash");
  assertSha256(
    input.phase2BManifestSha256,
    "phase2BManifestSha256",
  );
  if (input.excerpts.length === 0) {
    throw new Error("At least one frozen excerpt is required");
  }
  const sourceRecipes = input.excerpts.map((excerpt) => ({
    excerptId: excerpt.excerptId,
    sourceRecipeHash: excerpt.sourceRecipeHash,
  }));
  const sourceRecipeSetHash = hashAiValue(sourceRecipes);
  const voice = CONDITIONAL_PIPER_VOICE_ASSETS[input.voice];
  const recipeMaterial = {
    schemaVersion:
      "tenxpros-phase2c-conditional-generation-recipe-v1",
    sourceRecipeSetHash,
    sourceRecipes,
    branchKind: input.draft.branchKind,
    candidateId: input.candidateId,
    voice: {
      id: voice.id,
      modelSha256: voice.modelSha256,
      configSha256: voice.configSha256,
    },
    tuningProfile: input.profile,
    lengthScale: input.lengthScale,
    durationLimit: {
      basis: "frozen_corrected_bryce_excerpt_duration",
      maximumGeneratedToSourceRatio:
        CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO,
      enforcementCheck: "CONDITIONAL_DURATION_LIMIT",
    },
    samples: input.runtimeSamples.map((sample) => ({
      pairId: sample.pairId,
      transcriptSha256: hashAiValue(
        normalizeWhitespace(sample.transcript),
      ),
      maximumDurationSeconds:
        sample.maximumDurationSeconds,
      segments: sample.segments.map((segment) => ({
        id: segment.id,
        textSha256: hashAiValue(
          normalizeWhitespace(segment.text),
        ),
        pauseAfterMs: segment.pauseAfterMs,
      })),
    })),
    loudness: LOUDNESS_RECIPE,
  };
  const recipeHash = hashAiValue(recipeMaterial);
  return finalizePlan({
    version: CONDITIONAL_PIPER_RUNTIME_PLAN_VERSION,
    schemaVersion: CONDITIONAL_PIPER_PLAN_SCHEMA_VERSION,
    correctedOnly: true,
    branchKind: input.draft.branchKind,
    basePlanHash: input.draft.basePlanHash,
    branchDraftHash: input.draft.draftHash,
    phase2BManifestSha256: input.phase2BManifestSha256,
    candidateId: input.candidateId,
    voice: {
      ...voice,
      expectedModelSha256: voice.modelSha256,
    },
    tuningProfile: input.profile,
    sourceRecipeSetHash,
    recipeHash,
    sampleRate: 22_050,
    lengthScale: input.lengthScale,
    format: {
      intermediate:
        "PCM signed 16-bit little-endian mono WAV",
      final: "MP3 mono 64 kbps CBR",
    },
    loudness: LOUDNESS_RECIPE,
    durationLimit: {
      basis: "frozen_corrected_bryce_excerpt_duration",
      maximumGeneratedToSourceRatio:
        CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO,
      enforcementCheck: "CONDITIONAL_DURATION_LIMIT",
      enforcedBeforeConditionalApi: true,
    },
    preservation: {
      visibleAcademyContentChanged: false,
      substantiveSpokenWordingChanged: false,
      transcriptMustMatchSourceExactly: true,
      baselineSamplesGenerated: false,
      fullAcademyRegenerated: false,
      productionWrites: false,
    },
    sourceAudit: input.excerpts.map(sourceAudit),
    samples: input.runtimeSamples,
  });
}

export function buildLocalVoicePiperPlan(input: {
  draft: AiConditionalBranchDraft;
  phase2BManifestSha256: string;
  voice: "linda" | "cori";
  excerpts: readonly FrozenCorrectedPiperExcerpt[];
}): ConditionalPiperGenerationPlan {
  if (input.draft.branchKind !== "LOCAL_VOICES") {
    throw new Error("A local-voice draft is required");
  }
  if (
    input.draft.affectedExcerptIds.length !== 5 ||
    input.excerpts.length !== 5
  ) {
    throw new Error(
      "Linda/Cori generation requires the same five frozen excerpts",
    );
  }
  const candidateId = `voice-${input.voice}`;
  if (
    !input.draft.candidates.some(
      (candidate) =>
        candidate.candidateId === candidateId &&
        candidate.voice === input.voice,
    )
  ) {
    throw new Error(
      `${candidateId} is not authorized by the conditional draft`,
    );
  }
  const excerpts = sortedFrozenExcerpts(
    input.excerpts,
    input.draft.affectedExcerptIds,
  );
  const samples = excerpts.map((excerpt) => {
    const neutral = neutralRuntimeIdentity({
      branchDraftHash: input.draft.draftHash,
      candidateId,
      excerptId: excerpt.excerptId,
    });
    return {
      ...neutral,
      pipeline: "corrected" as const,
      transcript: excerpt.transcript,
      sentenceSilenceSeconds: 0 as const,
      maximumDurationSeconds:
        maximumConditionalGeneratedDurationSeconds(
          excerpt.sourceAudioDurationSeconds,
        ),
      segments: excerpt.segments.map((segment) => ({
        id: segment.id,
        text: segment.text,
        pauseAfterMs: segment.pauseAfterMs,
      })),
    };
  });
  return commonPlan({
    draft: input.draft,
    phase2BManifestSha256: input.phase2BManifestSha256,
    candidateId,
    voice: input.voice,
    profile: null,
    excerpts,
    runtimeSamples: samples,
    lengthScale: 1,
  });
}

export function buildTunedBrycePiperPlan(input: {
  draft: AiConditionalBranchDraft;
  phase2BManifestSha256: string;
  profileId: string;
  excerpts: readonly FrozenCorrectedPiperExcerpt[];
}): ConditionalPiperGenerationPlan {
  if (input.draft.branchKind !== "TUNING") {
    throw new Error("A tuning draft is required");
  }
  if (
    input.draft.maximumProfiles !== 2 ||
    input.draft.profiles.length < 1 ||
    input.draft.profiles.length > 2
  ) {
    throw new Error("Tuning is limited to at most two profiles");
  }
  const profile = input.draft.profiles.find(
    (candidate) => candidate.profileId === input.profileId,
  );
  if (!profile) {
    throw new Error(
      `${input.profileId} is not authorized by the tuning draft`,
    );
  }
  const candidate = input.draft.candidates.find(
    (item) => item.candidateId === profile.profileId,
  );
  if (
    !candidate ||
    candidate.role !== "TUNED_PROFILE" ||
    candidate.voice !== "bryce"
  ) {
    throw new Error(
      `${profile.profileId} has no authorized Bryce candidate`,
    );
  }
  const excerpts = sortedFrozenExcerpts(
    input.excerpts,
    input.draft.affectedExcerptIds,
  );
  const adjusted = excerpts.map((excerpt) => ({
    excerpt,
    ...applyTuningProfile(excerpt, profile),
  }));
  const lengthScales = new Set(
    adjusted.map((item) => item.lengthScale),
  );
  if (lengthScales.size !== 1) {
    throw new Error(
      "One tuned candidate must use one deterministic speaking-rate setting",
    );
  }
  const samples = adjusted.map(({ excerpt, segments }) => {
    const neutral = neutralRuntimeIdentity({
      branchDraftHash: input.draft.draftHash,
      candidateId: profile.profileId,
      excerptId: excerpt.excerptId,
    });
    const transcript = normalizeWhitespace(
      segments.map((segment) => segment.text).join(" "),
    );
    if (transcript !== normalizeWhitespace(excerpt.transcript)) {
      throw new Error(
        `${profile.profileId} changed substantive spoken wording for ${excerpt.excerptId}`,
      );
    }
    return {
      ...neutral,
      pipeline: "corrected" as const,
      transcript: excerpt.transcript,
      sentenceSilenceSeconds: 0 as const,
      maximumDurationSeconds:
        maximumConditionalGeneratedDurationSeconds(
          excerpt.sourceAudioDurationSeconds,
        ),
      segments,
    };
  });
  return commonPlan({
    draft: input.draft,
    phase2BManifestSha256: input.phase2BManifestSha256,
    candidateId: profile.profileId,
    voice: "bryce",
    profile,
    excerpts,
    runtimeSamples: samples,
    lengthScale: [...lengthScales][0] ?? 1,
  });
}

export function serializeConditionalPiperPlan(
  plan: ConditionalPiperGenerationPlan,
): string {
  assertConditionalPiperPlanIntegrity(plan);
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export function assertConditionalPiperPlanIntegrity(
  plan: ConditionalPiperGenerationPlan,
): void {
  const { planHash, ...withoutHash } = plan;
  assertSha256(planHash, "planHash");
  if (hashAiValue(withoutHash) !== planHash) {
    throw new Error("Conditional Piper plan hash mismatch");
  }
  if (!plan.correctedOnly) {
    throw new Error("Conditional generation must be corrected-only");
  }
  if (
    plan.preservation.baselineSamplesGenerated ||
    plan.preservation.productionWrites ||
    plan.preservation.fullAcademyRegenerated ||
    plan.preservation.visibleAcademyContentChanged ||
    plan.preservation.substantiveSpokenWordingChanged
  ) {
    throw new Error("Conditional generation crossed a safety boundary");
  }
  if (
    plan.samples.some(
      (sample, index) =>
        sample.pipeline !== "corrected" ||
        sample.sentenceSilenceSeconds !== 0 ||
        sample.maximumDurationSeconds !==
          maximumConditionalGeneratedDurationSeconds(
            plan.sourceAudit[index]!
              .sourceAudioDurationSeconds,
          ),
    )
  ) {
    throw new Error("Conditional plan contains a non-corrected sample");
  }
  if (
    plan.durationLimit.basis !==
      "frozen_corrected_bryce_excerpt_duration" ||
    plan.durationLimit.maximumGeneratedToSourceRatio !==
      CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO ||
    plan.durationLimit.enforcementCheck !==
      "CONDITIONAL_DURATION_LIMIT" ||
    plan.durationLimit.enforcedBeforeConditionalApi !== true
  ) {
    throw new Error(
      "Conditional plan duration ceiling changed",
    );
  }
}

function assertRuntimeCheckCoverage(
  checks: readonly { id: string; pass: boolean }[],
  excerptId: string,
): void {
  const byId = new Map(checks.map((check) => [check.id, check.pass]));
  const missingOrFailed = REQUIRED_RUNTIME_CHECKS.filter(
    (id) => byId.get(id) !== true,
  );
  if (missingOrFailed.length > 0) {
    throw new Error(
      `${excerptId} failed or omitted runtime checks: ${missingOrFailed.join(", ")}`,
    );
  }
}

export function validateConditionalPiperRuntimeResult(input: {
  plan: ConditionalPiperGenerationPlan;
  runtimePlanBytesSha256: string;
  result: ConditionalPiperRuntimeResult;
}): readonly ConditionalPiperGeneratedRecord[] {
  assertConditionalPiperPlanIntegrity(input.plan);
  assertSha256(
    input.runtimePlanBytesSha256,
    "runtimePlanBytesSha256",
  );
  const { plan, result } = input;
  if (
    result.plan.version !== plan.version ||
    result.plan.recipeHash !== plan.recipeHash ||
    result.plan.sha256 !== input.runtimePlanBytesSha256 ||
    result.plan.sampleCount !== plan.samples.length ||
    result.plan.correctedOnly !== true
  ) {
    throw new Error("Runtime result is not bound to the exact plan");
  }
  const observedLengthScale =
    result.plan.lengthScale ??
    result.audioRecipe?.lengthScale;
  if (observedLengthScale !== plan.lengthScale) {
    throw new Error("Runtime result length scale does not match plan");
  }
  if (
    !result.isolation.isolated ||
    result.isolation.externalApiRequests !== 0 ||
    result.isolation.databaseImports !== 0 ||
    result.isolation.prismaImports !== 0
  ) {
    throw new Error(
      "Conditional Piper runtime was not locally isolated",
    );
  }
  if (
    result.voice.id !== plan.voice.id ||
    result.voice.modelSha256 !== plan.voice.modelSha256 ||
    result.voice.configSha256 !== plan.voice.configSha256 ||
    !result.voice.expectedModelSha256Matched ||
    result.voice.nativeSampleRate !== 22_050
  ) {
    throw new Error(
      "Conditional Piper voice model/config identity mismatch",
    );
  }
  if (
    !result.summary.allPassed ||
    !result.summary.allEligibleForBlindReview ||
    result.summary.failed !== 0 ||
    result.summary.passed !== plan.samples.length ||
    result.summary.qualityPassed !== plan.samples.length ||
    result.samples.length !== plan.samples.length
  ) {
    throw new Error(
      "One or more conditional Piper samples failed integrity or loudness audit",
    );
  }
  const sourceByPairId = new Map(
    plan.samples.map((sample, index) => [
      sample.pairId,
      {
        sample,
        source: plan.sourceAudit[index]!,
      },
    ]),
  );
  return result.samples.map((sample) => {
    const expected = sourceByPairId.get(sample.pairId);
    if (!expected) {
      throw new Error(
        `Runtime returned unexpected set ${sample.pairId}`,
      );
    }
    sourceByPairId.delete(sample.pairId);
    if (
      sample.fileName !== expected.sample.fileName ||
      sample.outputFile !==
        `listening/audio/${expected.sample.fileName}` ||
      sample.transcriptSha256 !==
        expected.source.transcriptSha256 ||
      sample.passed !== true ||
      sample.published !== true ||
      sample.qualityPassed !== true ||
      sample.eligibleForBlindReview !== true
    ) {
      throw new Error(
        `${expected.source.excerptId} runtime identity or audit mismatch`,
      );
    }
    if (
      typeof sample.sha256 !== "string" ||
      typeof sample.sizeBytes !== "number" ||
      typeof sample.durationSeconds !== "number" ||
      sample.sizeBytes <= 0 ||
      sample.durationSeconds <= 0
    ) {
      throw new Error(
        `${expected.source.excerptId} has no valid published MP3`,
      );
    }
    if (
      sample.durationSeconds >
      expected.sample.maximumDurationSeconds + 1e-9
    ) {
      throw new Error(
        `${expected.source.excerptId} exceeds the hash-bound conditional duration limit`,
      );
    }
    assertSha256(
      sample.sha256,
      `${expected.source.excerptId} audioSha256`,
    );
    assertRuntimeCheckCoverage(
      sample.checks,
      expected.source.excerptId,
    );
    return {
      excerptId: expected.source.excerptId,
      candidateId: plan.candidateId,
      voice: plan.voice.id,
      fileName: sample.fileName,
      outputFile: sample.outputFile,
      audioSha256: sample.sha256,
      audioSizeBytes: sample.sizeBytes,
      durationSeconds: sample.durationSeconds,
      transcriptSha256: sample.transcriptSha256,
      objectiveIntegrityPass: true,
      contentConsistency: 1,
      modelSha256: plan.voice.modelSha256,
      configSha256: plan.voice.configSha256,
      sourceRecipeHash:
        expected.source.sourceRecipeHash,
      sourceRecipeSetHash: plan.sourceRecipeSetHash,
      generationRecipeHash: plan.recipeHash,
      planHash: plan.planHash,
      runtimePlanBytesSha256:
        input.runtimePlanBytesSha256,
    };
  });
}

export function assembleConditionalAudioClips(input: {
  draft: AiConditionalBranchDraft;
  sourceClips: readonly AiConditionalAudioClip[];
  generated: readonly ConditionalPiperGeneratedRecord[];
}): readonly AiConditionalAudioClip[] {
  const generatedClips: AiConditionalAudioClip[] =
    input.generated.map((record) => ({
      excerptId: record.excerptId,
      candidateId: record.candidateId,
      audioSha256: record.audioSha256,
      durationSeconds: record.durationSeconds,
      objectiveIntegrityPass:
        record.objectiveIntegrityPass,
      contentConsistency: record.contentConsistency,
    }));
  const all = [...input.sourceClips, ...generatedClips].sort(
    (left, right) =>
      left.excerptId.localeCompare(right.excerptId) ||
      left.candidateId.localeCompare(right.candidateId),
  );
  const expected = input.draft.affectedExcerptIds
    .flatMap((excerptId) =>
      input.draft.candidates.map((candidate) => ({
        excerptId,
        candidateId: candidate.candidateId,
      })),
    )
    .sort(
      (left, right) =>
        left.excerptId.localeCompare(right.excerptId) ||
        left.candidateId.localeCompare(right.candidateId),
    );
  if (
    all.length !== expected.length ||
    all.some(
      (clip, index) =>
        clip.excerptId !== expected[index]?.excerptId ||
        clip.candidateId !== expected[index]?.candidateId,
    )
  ) {
    throw new Error(
      "Conditional audio inputs do not form the required excerpt/candidate cross-product",
    );
  }
  for (const clip of all) {
    assertSha256(
      clip.audioSha256,
      `${clip.excerptId}/${clip.candidateId} audioSha256`,
    );
    if (
      !Number.isFinite(clip.durationSeconds) ||
      clip.durationSeconds <= 0 ||
      !clip.objectiveIntegrityPass ||
      clip.contentConsistency < 0 ||
      clip.contentConsistency > 1
    ) {
      throw new Error(
        `${clip.excerptId}/${clip.candidateId} failed conditional audio integrity`,
      );
    }
  }
  return all;
}
