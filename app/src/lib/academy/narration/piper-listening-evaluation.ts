import { createHash } from "node:crypto";

import { z } from "zod";

import {
  htmlToPlainText,
} from "../lesson-html";
import type {
  NarrationBlock,
  NarrationPauseProfile,
} from "./contracts";
import {
  createPiperEvaluationPrivateManifest,
  PIPER_EVALUATION_BASELINE_PIPELINE_VERSION,
  PIPER_EVALUATION_BRYCE_VOICE,
  PIPER_EVALUATION_CORRECTED_PIPELINE_VERSION,
  PIPER_EVALUATION_PAUSE_PROFILE,
  PIPER_EVALUATION_SEGMENTATION_VERSION,
  PiperEvaluationPlanError,
  splitPiperEvaluationSentences,
  type PiperEvaluationExcerptPlan,
  type PiperEvaluationLessonInput,
  type PiperEvaluationPipeline,
  type PiperEvaluationPipelinePlan,
  type PiperEvaluationPlan,
  type PiperEvaluationPrivateManifest,
  type PiperEvaluationRuntimeSample,
  type PiperEvaluationSynthesisUnit,
} from "./piper-evaluation";
import { narrationBlockToSpokenText } from "./preview";
import {
  hashNarrationBlocks,
  hashNarrationDocument,
  hashNarrationRecipe,
  hashNarrationSource,
  stableNarrationHash,
} from "./recipe";

export const PHASE2B_PLAN_SCHEMA_VERSION =
  "academy-blind-pause-coverage-plan-v1";
export const PHASE2B_SELECTION_VERSION =
  "academy-blind-pause-coverage-selection-v1";
export const PHASE2B_PRIVATE_MANIFEST_SCHEMA_VERSION =
  "academy-blind-listening-private-manifest-v1";
export const PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION =
  "academy-blind-listening-package-v2";
export const PHASE2B_RESPONSE_SCHEMA_VERSION =
  "academy-blind-listening-response-v2";
export const PHASE2B_ANALYSIS_SCHEMA_VERSION =
  "academy-blind-listening-analysis-v1";

export const PHASE2B_SCORE_DIMENSIONS = Object.freeze([
  "naturalness",
  "pause_quality",
  "pronunciation",
  "clarity",
  "listening_comfort",
  "professional_quality",
] as const);

export type Phase2BScoreDimension =
  (typeof PHASE2B_SCORE_DIMENSIONS)[number];

export const PHASE2B_PAUSE_COVERAGE_SELECTION = Object.freeze({
  id: "P05-mission-pause-coverage",
  lessonSlug: "mission",
  description:
    "Source-locked opening sequence with paragraphs, heading, ordered steps, callouts, and a coverage-only section transition.",
  sourcePath: "root/p[1]..root/h2[2]",
  blockIds: Object.freeze([
    "root/p[1]",
    "root/h2[1]",
    "root/p[2]",
    "root/ol[1]/li[1]",
    "root/ol[1]/li[2]",
    "root/ol[1]/li[3]",
    "root/div[1]",
    "root/div[2]",
    "root/h2[2]",
  ]),
  blockTypes: Object.freeze([
    "paragraph",
    "heading",
    "paragraph",
    "listItem",
    "listItem",
    "listItem",
    "callout",
    "callout",
    "heading",
  ] as const satisfies readonly NarrationBlock["type"][]),
  blockPauseAfterMs: Object.freeze([
    500, 700, 500, 280, 280, 280, 500, 500, 700,
  ]),
  sourceFragmentSha256:
    "44dc2b20814fc8ed56aecb81b0e192b108aea8c0ab00320203400ebbfdca546a",
  sourceFragmentCharacterCount: 1_863,
  baselineTranscriptSha256:
    "ca2bcdfdb6bc648e5594ca8a165a7dbe61a8b7ad00e1ba29c8ec4377a170d80b",
  correctedTranscriptSha256:
    "1a5c7132839d5aa7caf5d4d4367b1bdd41e10ca0df394fb835ba051e8528dced",
  sectionBoundaryAfterBlockId: "root/div[2]",
  sectionBoundaryBeforeBlockId: "root/h2[2]",
} as const);

export type Phase2BPauseType =
  | "sentence"
  | "tableRow"
  | "list"
  | "paragraph"
  | "heading"
  | "section";

export interface Phase2BPrivateSampleMapping {
  sampleId: string;
  filename: string;
  pipeline: PiperEvaluationPipeline;
  pairId: string;
  durationSeconds: number | null;
  sha256: string | null;
}

export interface Phase2BPrivatePairMapping {
  pairId: string;
  cohort: "original" | "pause_coverage";
  excerptId: string;
  pauseTypesExercised: readonly Phase2BPauseType[];
  samples: readonly [
    Phase2BPrivateSampleMapping,
    Phase2BPrivateSampleMapping,
  ];
}

export interface Phase2BPrivateAnalysisManifest {
  schemaVersion: typeof PHASE2B_PRIVATE_MANIFEST_SCHEMA_VERSION;
  evaluationPackageId: string;
  originalManifest: {
    path: string;
    sha256: string;
  };
  originalPairIds: readonly [string, string, string, string];
  tablePairId: string;
  allLocalVoicesFailedVoiceOnlyCriteria: boolean;
  voicesEvaluated: readonly string[];
  pairs: readonly Phase2BPrivatePairMapping[];
}

export interface Phase2BOriginalManifestInput {
  planHash: string;
  pairs: readonly {
    pairId: string;
    excerptId: string;
    samples: readonly {
      blindSampleId: string;
      blindLabel: "A" | "B";
      filename: string;
      pipeline: PiperEvaluationPipeline;
      audio?: {
        durationSeconds?: number | null;
        sha256?: string | null;
      };
    }[];
  }[];
}

export interface Phase2BPublicSample {
  sample_id: string;
  label: "A" | "B";
  filename: string;
}

export interface Phase2BPublicPair {
  pair_id: string;
  table_efficiency: boolean;
  samples: readonly [Phase2BPublicSample, Phase2BPublicSample];
}

export interface Phase2BPublicPackage {
  schema_version: typeof PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION;
  evaluation_package_id: string;
  pairs: readonly Phase2BPublicPair[];
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

function synthesisUnit(
  input: Omit<
    PiperEvaluationSynthesisUnit,
    "textSha256" | "characterCount" | "wordCount"
  >,
): PiperEvaluationSynthesisUnit {
  return {
    ...input,
    textSha256: sha256(input.text),
    characterCount: input.text.length,
    wordCount: wordCount(input.text),
  };
}

function assertFrozenMission(lesson: PiperEvaluationLessonInput): void {
  const { document, html } = lesson;
  if (document.slug !== "mission") {
    throw new PiperEvaluationPlanError(
      "MISSING_LESSON",
      "Phase 2B pause coverage requires the mission narration document.",
      { actualSlug: document.slug },
    );
  }
  for (const key of Object.keys(
    PIPER_EVALUATION_PAUSE_PROFILE,
  ) as (keyof NarrationPauseProfile)[]) {
    if (
      document.recipe.pauseProfile[key] !==
      PIPER_EVALUATION_PAUSE_PROFILE[key]
    ) {
      throw new PiperEvaluationPlanError(
        "PAUSE_PROFILE_MISMATCH",
        `Frozen pause value changed for ${key}.`,
        {
          pauseType: key,
          expected: PIPER_EVALUATION_PAUSE_PROFILE[key],
          actual: document.recipe.pauseProfile[key],
        },
      );
    }
  }
  const blockingWarning = document.warnings.find(
    (warning) =>
      warning.severity === "error" ||
      warning.code === "PRONUNCIATION_REQUIRES_OWNER_REVIEW" ||
      warning.code === "NARRATION_ALIGNMENT_REQUIRES_OWNER_REVIEW" ||
      warning.code === "NARRATION_ALIGNMENT_INVALID_SEMANTIC_DRIFT",
  );
  if (blockingWarning) {
    throw new PiperEvaluationPlanError(
      "ALIGNMENT_WARNING_PRESENT",
      "The mission narration document has a blocking warning.",
      { warningCode: blockingWarning.code },
    );
  }
  if (
    hashNarrationSource({
      slug: document.slug,
      title: document.title,
      html,
    }) !== document.hashes.source ||
    hashNarrationRecipe(document.recipe) !== document.hashes.recipe ||
    hashNarrationBlocks(document.blocks) !== document.hashes.blocks ||
    hashNarrationDocument({
      schemaVersion: document.schemaVersion,
      slug: document.slug,
      ...(document.title ? { title: document.title } : {}),
      blocks: document.blocks,
      warnings: document.warnings,
      recipe: document.recipe,
      stats: document.stats,
      hashes: {
        source: document.hashes.source,
        contentRevision: document.hashes.contentRevision,
        blocks: document.hashes.blocks,
        recipe: document.hashes.recipe,
      },
    }) !== document.hashes.document
  ) {
    throw new PiperEvaluationPlanError(
      "RENDERED_DOCUMENT_HASH_MISMATCH",
      "The mission narration document no longer verifies.",
    );
  }
}

function selectedCoverageBlocks(
  lesson: PiperEvaluationLessonInput,
): NarrationBlock[] {
  const { blockIds, blockTypes, blockPauseAfterMs } =
    PHASE2B_PAUSE_COVERAGE_SELECTION;
  const byId = new Map(
    lesson.document.blocks.map((block, index) => [
      block.id,
      { block, index },
    ]),
  );
  const selected = blockIds.map((id, index) => {
    const found = byId.get(id);
    if (!found) {
      throw new PiperEvaluationPlanError(
        "BLOCK_SELECTION_MISMATCH",
        `Phase 2B source block is missing: ${id}.`,
        { blockId: id },
      );
    }
    if (
      found.block.type !== blockTypes[index] ||
      found.block.pauseAfterMs !== blockPauseAfterMs[index] ||
      found.block.source?.path !== id
    ) {
      throw new PiperEvaluationPlanError(
        "BLOCK_SELECTION_MISMATCH",
        `Phase 2B source block metadata changed: ${id}.`,
        { blockId: id },
      );
    }
    return found;
  });
  const firstIndex = selected[0]?.index;
  const lastIndex = selected.at(-1)?.index;
  if (firstIndex === undefined || lastIndex === undefined) {
    throw new PiperEvaluationPlanError(
      "BLOCK_SELECTION_MISMATCH",
      "Phase 2B selected no source blocks.",
    );
  }
  const contiguousIds = lesson.document.blocks
    .slice(firstIndex, lastIndex + 1)
    .map((block) => block.id);
  if (JSON.stringify(contiguousIds) !== JSON.stringify(blockIds)) {
    throw new PiperEvaluationPlanError(
      "BLOCK_SELECTION_MISMATCH",
      "Phase 2B source blocks are no longer contiguous.",
    );
  }
  return selected.map(({ block }) => block);
}

function baselinePlan(transcript: string): PiperEvaluationPipelinePlan {
  return {
    pipeline: "baseline",
    pipelineVersion: PIPER_EVALUATION_BASELINE_PIPELINE_VERSION,
    piperSentenceSilenceMs: 350,
    transcript,
    transcriptSha256: sha256(transcript),
    characterCount: transcript.length,
    wordCount: wordCount(transcript),
    units: [
      synthesisUnit({
        id: "baseline-flat",
        text: transcript,
        pauseAfterMs: 0,
        pauseReason: "sample-end",
      }),
    ],
  };
}

function correctedCoveragePlan(
  blocks: readonly NarrationBlock[],
  transcript: string,
): PiperEvaluationPipelinePlan {
  const units: PiperEvaluationSynthesisUnit[] = [];
  blocks.forEach((block, blockIndex) => {
    const sentences = splitPiperEvaluationSentences(
      narrationBlockToSpokenText(block),
    );
    sentences.forEach((sentence, sentenceIndex) => {
      const lastSentence = sentenceIndex === sentences.length - 1;
      const lastBlock = blockIndex === blocks.length - 1;
      const sectionBoundary =
        lastSentence &&
        !lastBlock &&
        block.id ===
          PHASE2B_PAUSE_COVERAGE_SELECTION.sectionBoundaryAfterBlockId &&
        blocks[blockIndex + 1]?.id ===
          PHASE2B_PAUSE_COVERAGE_SELECTION.sectionBoundaryBeforeBlockId;
      units.push(
        synthesisUnit({
          id: `semantic:${block.id}:sentence[${String(
            sentenceIndex + 1,
          )}]`,
          sourceBlockId: block.id,
          sentenceNumber: sentenceIndex + 1,
          text: sentence,
          pauseAfterMs: !lastSentence
            ? PIPER_EVALUATION_PAUSE_PROFILE.sentence
            : lastBlock
              ? 0
              : sectionBoundary
                ? PIPER_EVALUATION_PAUSE_PROFILE.section
                : block.pauseAfterMs,
          pauseReason: !lastSentence
            ? "sentence-boundary"
            : lastBlock
              ? "sample-end"
              : sectionBoundary
                ? "section-boundary"
                : "semantic-block-boundary",
        }),
      );
    });
  });
  if (units.map((unit) => unit.text).join(" ") !== transcript) {
    throw new PiperEvaluationPlanError(
      "SPOKEN_SENTENCE_SPLIT_FAILED",
      "Phase 2B sentence units do not reconstruct the frozen transcript.",
    );
  }
  return {
    pipeline: "corrected",
    pipelineVersion: PIPER_EVALUATION_CORRECTED_PIPELINE_VERSION,
    piperSentenceSilenceMs: 0,
    transcript,
    transcriptSha256: sha256(transcript),
    characterCount: transcript.length,
    wordCount: wordCount(transcript),
    units,
  };
}

export function buildPhase2BPauseCoveragePlan(
  mission: PiperEvaluationLessonInput,
): PiperEvaluationPlan {
  assertFrozenMission(mission);
  const blocks = selectedCoverageBlocks(mission);
  const firstStart = blocks[0]?.source?.startOffset;
  const lastEnd = blocks.at(-1)?.source?.endOffset;
  if (firstStart === undefined || lastEnd === undefined) {
    throw new PiperEvaluationPlanError(
      "BLOCK_SELECTION_MISMATCH",
      "Phase 2B source offsets are missing.",
    );
  }
  const fragment = mission.html.slice(firstStart, lastEnd);
  const baselineTranscript = htmlToPlainText(fragment)
    .replace(/\s+/gu, " ")
    .trim();
  const correctedTranscript = blocks
    .map((block) => narrationBlockToSpokenText(block))
    .join(" ");
  const selection = PHASE2B_PAUSE_COVERAGE_SELECTION;
  if (
    fragment.length !== selection.sourceFragmentCharacterCount ||
    sha256(fragment) !== selection.sourceFragmentSha256 ||
    sha256(baselineTranscript) !== selection.baselineTranscriptSha256 ||
    sha256(correctedTranscript) !== selection.correctedTranscriptSha256
  ) {
    throw new PiperEvaluationPlanError(
      "SOURCE_FRAGMENT_MISMATCH",
      "Phase 2B locked source or transcript changed.",
      {
        sourceFragmentSha256: sha256(fragment),
        baselineTranscriptSha256: sha256(baselineTranscript),
        correctedTranscriptSha256: sha256(correctedTranscript),
      },
    );
  }
  const excerpt: PiperEvaluationExcerptPlan = {
    id: selection.id,
    order: 1,
    lessonSlug: "mission",
    description: selection.description,
    sourcePath: selection.sourcePath,
    sourceFragmentSha256: selection.sourceFragmentSha256,
    sourceFragmentCharacterCount: fragment.length,
    blockIds: [...selection.blockIds],
    contentRevisionHash: mission.document.hashes.contentRevision,
    recipeHash: mission.document.hashes.recipe,
    documentHash: mission.document.hashes.document,
    pauseProfile: { ...mission.document.recipe.pauseProfile },
    pipelines: {
      baseline: baselinePlan(baselineTranscript),
      corrected: correctedCoveragePlan(
        blocks,
        correctedTranscript,
      ),
    },
  };
  const withoutHash = {
    schemaVersion: PHASE2B_PLAN_SCHEMA_VERSION,
    selectionVersion: PHASE2B_SELECTION_VERSION,
    segmentationVersion: PIPER_EVALUATION_SEGMENTATION_VERSION,
    excerpts: [excerpt],
  };
  return {
    ...withoutHash,
    planHash: stableNarrationHash(
      withoutHash,
      PHASE2B_PLAN_SCHEMA_VERSION,
    ),
  };
}

export function buildPhase2BSupplementalManifest(
  plan: PiperEvaluationPlan,
  blindSeed: string,
  packageId: string,
): PiperEvaluationPrivateManifest {
  return createPiperEvaluationPrivateManifest({
    plan,
    blindSeed,
    packageId,
    voice: PIPER_EVALUATION_BRYCE_VOICE,
    pairNumberOffset: 4,
  });
}

export function phase2BRuntimeSamples(
  manifest: PiperEvaluationPrivateManifest,
): readonly PiperEvaluationRuntimeSample[] {
  return manifest.pairs.flatMap((pair) =>
    pair.samples.map(
      (sample): PiperEvaluationRuntimeSample => ({
        pairId: sample.pairId,
        label: sample.blindLabel,
        fileName: sample.filename,
        pipeline: sample.pipeline,
        transcript: sample.transcript,
        segments: sample.synthesisUnits.map((unit) => ({
          id: unit.id,
          text: unit.text,
          pauseAfterMs: unit.pauseAfterMs,
        })),
        sentenceSilenceSeconds:
          sample.piperSentenceSilenceMs / 1_000,
      }),
    ),
  );
}

function privatePairMapping(
  pair: Phase2BOriginalManifestInput["pairs"][number],
  cohort: Phase2BPrivatePairMapping["cohort"],
  pauseTypesExercised: readonly Phase2BPauseType[],
): Phase2BPrivatePairMapping {
  if (
    pair.samples.length !== 2 ||
    pair.samples[0]?.blindLabel !== "A" ||
    pair.samples[1]?.blindLabel !== "B"
  ) {
    throw new Error(`${pair.pairId}: expected exactly ordered A/B samples`);
  }
  const samples = pair.samples.map(
    (sample): Phase2BPrivateSampleMapping => ({
      sampleId: sample.blindSampleId,
      filename: sample.filename,
      pipeline: sample.pipeline,
      pairId: pair.pairId,
      durationSeconds: sample.audio?.durationSeconds ?? null,
      sha256: sample.audio?.sha256 ?? null,
    }),
  ) as [
    Phase2BPrivateSampleMapping,
    Phase2BPrivateSampleMapping,
  ];
  if (
    new Set(samples.map((sample) => sample.pipeline)).size !== 2
  ) {
    throw new Error(
      `${pair.pairId}: pair must contain one sample per pipeline`,
    );
  }
  return {
    pairId: pair.pairId,
    cohort,
    excerptId: pair.excerptId,
    pauseTypesExercised,
    samples,
  };
}

const ORIGINAL_PAUSE_COVERAGE = Object.freeze<
  Readonly<Record<string, readonly Phase2BPauseType[]>>
>({
  "sample-01": Object.freeze(["sentence"]),
  "sample-02": Object.freeze(["sentence", "tableRow"]),
  "sample-03": Object.freeze(["sentence"]),
  "sample-04": Object.freeze(["sentence"]),
});

/**
 * Join the authoritative Phase 2A assignment with the one Phase 2B
 * supplemental pair. Only the private result contains pipeline identity.
 */
export function createPhase2BPackageManifests(input: {
  originalManifest: Phase2BOriginalManifestInput;
  originalManifestPath: string;
  originalManifestSha256: string;
  supplementalManifest: PiperEvaluationPrivateManifest;
}): {
  privateManifest: Phase2BPrivateAnalysisManifest;
  publicPackage: Phase2BPublicPackage;
} {
  const originalPairIds = input.originalManifest.pairs.map(
    (pair) => pair.pairId,
  );
  if (
    JSON.stringify(originalPairIds) !==
    JSON.stringify([
      "sample-01",
      "sample-02",
      "sample-03",
      "sample-04",
    ])
  ) {
    throw new Error(
      "The authoritative package must contain the four frozen pairs",
    );
  }
  if (
    input.supplementalManifest.pairs.length !== 1 ||
    input.supplementalManifest.pairs[0]?.pairId !== "sample-05"
  ) {
    throw new Error("Phase 2B must add exactly one sample-05 pair");
  }
  const originalPairs = input.originalManifest.pairs.map((pair) =>
    privatePairMapping(
      pair,
      "original",
      ORIGINAL_PAUSE_COVERAGE[pair.pairId] ?? [],
    ),
  );
  const supplementalPairs = input.supplementalManifest.pairs.map(
    (pair) =>
      privatePairMapping(
        pair,
        "pause_coverage",
        [
          "sentence",
          "list",
          "paragraph",
          "heading",
          "section",
        ],
      ),
  );
  const pairs = [...originalPairs, ...supplementalPairs];
  const packageDigest = sha256(
    [
      input.originalManifest.planHash,
      input.originalManifestSha256,
      input.supplementalManifest.planHash,
      input.supplementalManifest.blindSeedSha256,
    ].join("\0"),
  );
  const evaluationPackageId = `blind-review-${packageDigest.slice(
    0,
    16,
  )}`;
  const privateManifest: Phase2BPrivateAnalysisManifest = {
    schemaVersion: PHASE2B_PRIVATE_MANIFEST_SCHEMA_VERSION,
    evaluationPackageId,
    originalManifest: {
      path: input.originalManifestPath,
      sha256: input.originalManifestSha256,
    },
    originalPairIds: [
      "sample-01",
      "sample-02",
      "sample-03",
      "sample-04",
    ],
    tablePairId: "sample-02",
    allLocalVoicesFailedVoiceOnlyCriteria: false,
    voicesEvaluated: ["bryce"],
    pairs,
  };
  const publicPackage: Phase2BPublicPackage = {
    schema_version: PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION,
    evaluation_package_id: evaluationPackageId,
    pairs: pairs.map((pair) => ({
      pair_id: pair.pairId,
      table_efficiency: pair.pairId === privateManifest.tablePairId,
      samples: pair.samples.map((sample, index) => ({
        sample_id: sample.sampleId,
        label: index === 0 ? ("A" as const) : ("B" as const),
        filename: sample.filename,
      })) as [Phase2BPublicSample, Phase2BPublicSample],
    })),
  };
  return { privateManifest, publicPackage };
}

const scoreSchema = z.number().int().min(1).max(5);
const optionalScoreSchema = z.object(
  Object.fromEntries(
    PHASE2B_SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      scoreSchema.optional(),
    ]),
  ) as Record<Phase2BScoreDimension, z.ZodOptional<typeof scoreSchema>>,
).strict();
const blindLabelSchema = z.enum(["A", "B"]);
const isoTimestampSchema = z.string().datetime({ offset: true });
const optionalTextSchema = z.string().trim().max(2_000);

export const phase2BResponseSchema = z
  .object({
    schema_version: z.literal(PHASE2B_RESPONSE_SCHEMA_VERSION),
    evaluation_package_id: z
      .string()
      .regex(/^blind-review-[a-f0-9]{16}$/u),
    listener_id: z.string().regex(/^L-[A-Z2-9]{8,16}$/u),
    timestamps: z
      .object({
        started_at: isoTimestampSchema,
        updated_at: isoTimestampSchema,
        exported_at: isoTimestampSchema,
      })
      .strict(),
    files: z.record(
      z.string(),
      z
        .object({
          scores: optionalScoreSchema,
          one_x_recorded_at: isoTimestampSchema.nullable(),
          optional_1_25x_used: z.boolean(),
          comment: optionalTextSchema.optional(),
        })
        .strict(),
    ),
    pairs: z.record(
      z.string(),
      z
        .object({
          preferences: z
            .object({
              overall_preference: z
                .enum(["A", "B", "no_preference"])
                .optional(),
              easier_to_understand: z
                .enum(["A", "B", "same"])
                .optional(),
              more_natural: z
                .enum(["A", "B", "same"])
                .optional(),
              long_lesson_preference: z
                .enum(["A", "B", "neither", "no_preference"])
                .optional(),
              too_slow: z
                .enum(["A", "B", "both", "neither"])
                .optional(),
              too_fast: z
                .enum(["A", "B", "both", "neither"])
                .optional(),
              strange_pronunciation: z
                .enum(["A", "B", "both", "neither"])
                .optional(),
            })
            .strict(),
          pronunciation_issues: z.array(
            z
              .object({
                version: blindLabelSchema,
                severity: z.enum(["minor", "major", "critical"]),
                description: z.string().trim().min(1).max(500),
              })
              .strict(),
          ),
          table_efficiency: z
            .object({
              easier_to_understand: z
                .enum(["A", "B", "same"])
                .optional(),
              repeated_labels_usefulness: scoreSchema.optional(),
              excessively_slow: z
                .enum(["A", "B", "both", "neither"])
                .optional(),
              pauses_excessive: z
                .enum(["A", "B", "both", "neither"])
                .optional(),
              prefer_longer_clearer: z
                .enum(["yes", "no", "not_applicable"])
                .optional(),
              test_more_concise_format: z
                .enum(["yes", "no", "unsure"])
                .optional(),
            })
            .strict()
            .nullable(),
          comments: optionalTextSchema.optional(),
        })
        .strict(),
    ),
    completion: z
      .object({
        status: z.enum(["incomplete", "complete"]),
        answered_required: z.number().int().min(0),
        required_total: z.number().int().positive(),
        percent: z.number().min(0).max(100),
        completed_at: isoTimestampSchema.nullable(),
        errors: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export type Phase2BResponse = z.infer<typeof phase2BResponseSchema>;

export interface Phase2BCompletion {
  status: "incomplete" | "complete";
  answered_required: number;
  required_total: number;
  percent: number;
  completed_at: string | null;
  errors: readonly string[];
}

function sameStringSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    [...actual].sort().join("\0") ===
      [...expected].sort().join("\0")
  );
}

export function computePhase2BCompletion(
  response: Omit<Phase2BResponse, "completion">,
  publicPackage: Phase2BPublicPackage,
): Phase2BCompletion {
  let answered = 0;
  let total = 0;
  const errors: string[] = [];
  for (const pair of publicPackage.pairs) {
    for (const sample of pair.samples) {
      const file = response.files[sample.sample_id];
      for (const dimension of PHASE2B_SCORE_DIMENSIONS) {
        total += 1;
        if (file?.scores[dimension] !== undefined) answered += 1;
      }
      total += 1;
      if (file?.one_x_recorded_at) answered += 1;
      if (!file) errors.push(`missing file ${sample.sample_id}`);
    }
    const pairResponse = response.pairs[pair.pair_id];
    for (const field of [
      "overall_preference",
      "easier_to_understand",
      "more_natural",
      "long_lesson_preference",
      "too_slow",
      "too_fast",
      "strange_pronunciation",
    ] as const) {
      total += 1;
      if (pairResponse?.preferences[field] !== undefined) {
        answered += 1;
      }
    }
    if (
      pairResponse?.preferences.strange_pronunciation &&
      pairResponse.preferences.strange_pronunciation !== "neither" &&
      pairResponse.pronunciation_issues.length === 0
    ) {
      errors.push(
        `${pair.pair_id}: pronunciation details are required`,
      );
    }
    if (pair.table_efficiency) {
      for (const field of [
        "easier_to_understand",
        "repeated_labels_usefulness",
        "excessively_slow",
        "pauses_excessive",
        "prefer_longer_clearer",
        "test_more_concise_format",
      ] as const) {
        total += 1;
        if (pairResponse?.table_efficiency?.[field] !== undefined) {
          answered += 1;
        }
      }
    }
    if (!pairResponse) errors.push(`missing pair ${pair.pair_id}`);
  }
  const complete = answered === total && errors.length === 0;
  return {
    status: complete ? "complete" : "incomplete",
    answered_required: answered,
    required_total: total,
    percent: Number(((answered / total) * 100).toFixed(2)),
    completed_at: complete
      ? response.timestamps.exported_at
      : null,
    errors,
  };
}

export function parsePhase2BResponse(
  value: unknown,
  publicPackage: Phase2BPublicPackage,
): Phase2BResponse {
  const parsed = phase2BResponseSchema.parse(value);
  if (
    parsed.evaluation_package_id !==
    publicPackage.evaluation_package_id
  ) {
    throw new Error("Response package id does not match");
  }
  const expectedFiles = publicPackage.pairs.flatMap((pair) =>
    pair.samples.map((sample) => sample.sample_id),
  );
  const expectedPairs = publicPackage.pairs.map(
    (pair) => pair.pair_id,
  );
  if (
    !sameStringSet(Object.keys(parsed.files), expectedFiles) ||
    !sameStringSet(Object.keys(parsed.pairs), expectedPairs)
  ) {
    throw new Error("Response sample or pair set does not match");
  }
  const startedAt = Date.parse(parsed.timestamps.started_at);
  const updatedAt = Date.parse(parsed.timestamps.updated_at);
  const exportedAt = Date.parse(parsed.timestamps.exported_at);
  if (startedAt > updatedAt || updatedAt > exportedAt) {
    throw new Error("Response timestamps are not chronological");
  }
  for (const [sampleId, file] of Object.entries(parsed.files)) {
    if (file.optional_1_25x_used && !file.one_x_recorded_at) {
      throw new Error(
        `${sampleId}: optional 1.25x use requires a recorded 1.0x score`,
      );
    }
    if (
      file.one_x_recorded_at &&
      (Date.parse(file.one_x_recorded_at) < startedAt ||
        Date.parse(file.one_x_recorded_at) > exportedAt)
    ) {
      throw new Error(`${sampleId}: 1.0x timestamp is out of range`);
    }
  }
  for (const pair of publicPackage.pairs) {
    const pairResponse = parsed.pairs[pair.pair_id];
    if (!pairResponse) throw new Error(`Missing ${pair.pair_id}`);
    if (
      pair.table_efficiency !==
      (pairResponse.table_efficiency !== null)
    ) {
      throw new Error(
        `${pair.pair_id}: table-efficiency shape does not match`,
      );
    }
    const noticed =
      pairResponse.preferences.strange_pronunciation;
    const affected = new Set(
      pairResponse.pronunciation_issues.map(
        (issue) => issue.version,
      ),
    );
    if (noticed === "neither" && affected.size > 0) {
      throw new Error(
        `${pair.pair_id}: pronunciation answer conflicts with issues`,
      );
    }
    if (!noticed && affected.size > 0) {
      throw new Error(
        `${pair.pair_id}: pronunciation issues require a pair answer`,
      );
    }
    if (
      noticed &&
      noticed !== "neither" &&
      pairResponse.pronunciation_issues.length === 0
    ) {
      throw new Error(
        `${pair.pair_id}: pronunciation issue details are required`,
      );
    }
    if (
      noticed === "A" &&
      [...affected].some((label) => label !== "A")
    ) {
      throw new Error(`${pair.pair_id}: unexpected B issue`);
    }
    if (
      noticed === "B" &&
      [...affected].some((label) => label !== "B")
    ) {
      throw new Error(`${pair.pair_id}: unexpected A issue`);
    }
    if (
      noticed === "both" &&
      (!affected.has("A") || !affected.has("B"))
    ) {
      throw new Error(
        `${pair.pair_id}: both versions require A and B issue details`,
      );
    }
  }
  const { completion: suppliedCompletion, ...withoutCompletion } =
    parsed;
  const computed = computePhase2BCompletion(
    withoutCompletion,
    publicPackage,
  );
  if (
    suppliedCompletion.status !== computed.status ||
    suppliedCompletion.answered_required !==
      computed.answered_required ||
    suppliedCompletion.required_total !== computed.required_total ||
    suppliedCompletion.percent !== computed.percent ||
    suppliedCompletion.completed_at !== computed.completed_at ||
    JSON.stringify(suppliedCompletion.errors) !==
      JSON.stringify(computed.errors)
  ) {
    throw new Error("Response completion summary is not canonical");
  }
  return parsed;
}
