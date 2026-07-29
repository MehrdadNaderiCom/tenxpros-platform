import { createHash, createHmac } from "node:crypto";

import { htmlToPlainText } from "../lesson-html";
import type {
  NarrationBlock,
  NarrationDocument,
  NarrationPauseProfile,
} from "./contracts";
import { narrationBlockToSpokenText } from "./preview";
import {
  hashNarrationBlocks,
  hashNarrationDocument,
  hashNarrationRecipe,
  hashNarrationSource,
  stableNarrationHash,
} from "./recipe";

export const PIPER_EVALUATION_PLAN_SCHEMA_VERSION =
  "academy-piper-evaluation-plan-v1";
export const PIPER_EVALUATION_MANIFEST_SCHEMA_VERSION =
  "academy-piper-evaluation-private-manifest-v1";
export const PIPER_EVALUATION_PUBLIC_INDEX_SCHEMA_VERSION =
  "academy-piper-evaluation-public-index-v1";
export const PIPER_EVALUATION_SELECTION_VERSION =
  "academy-representative-excerpts-v1";
export const PIPER_EVALUATION_SEGMENTATION_VERSION =
  "spoken-sentences-with-semantic-pauses-v1";
export const PIPER_EVALUATION_BLINDING_VERSION =
  "hmac-sha256-counterbalanced-pair-label-v2";

export const PIPER_EVALUATION_BASELINE_PIPELINE_VERSION =
  "production-flat-piper-v1";
export const PIPER_EVALUATION_CORRECTED_PIPELINE_VERSION =
  "semantic-piper-evaluation-v1";

export const PIPER_EVALUATION_PAUSE_PROFILE = Object.freeze({
  sentence: 220,
  list: 280,
  paragraph: 500,
  tableRow: 400,
  heading: 700,
  section: 900,
} as const satisfies NarrationPauseProfile);

export const PIPER_EVALUATION_BRYCE_VOICE = Object.freeze({
  id: "bryce",
  label: "Bryce (US male)",
  modelFile: "en_US-bryce-medium.onnx",
  modelSha256:
    "dc9caa6c313199ffb5ac698b6e542fa6cba388aeaf2731e25262e33b9810aef1",
  nativeSampleRateHz: 22_050,
});

export const PIPER_EVALUATION_SCORE_FIELDS = Object.freeze([
  {
    id: "naturalness",
    label: "Naturalness",
  },
  {
    id: "pauses",
    label: "Pauses",
  },
  {
    id: "pronunciation",
    label: "Pronunciation",
  },
  {
    id: "clarity",
    label: "Clarity",
  },
  {
    id: "listeningFatigue",
    label: "Listening fatigue (5 = effortless)",
  },
  {
    id: "professionalQuality",
    label: "Professional quality",
  },
] as const);

export type PiperEvaluationLessonSlug =
  | "mission"
  | "journey"
  | "conversation"
  | "rules";

export type PiperEvaluationPipeline = "baseline" | "corrected";
export type PiperEvaluationBlindLabel = "A" | "B";
export type PiperEvaluationPauseReason =
  | "sentence-boundary"
  | "semantic-block-boundary"
  | "section-boundary"
  | "sample-end";

interface PiperEvaluationExcerptSelection {
  id: string;
  lessonSlug: PiperEvaluationLessonSlug;
  description: string;
  sourcePath: string;
  fragmentMode: "block-source" | "table";
  blockIds: readonly string[];
  blockTypes: readonly NarrationBlock["type"][];
  blockPauseAfterMs: readonly number[];
  sourceFragmentSha256: string;
  baselineTranscriptSha256: string;
  correctedTranscriptSha256: string;
}

const JOURNEY_TABLE_BLOCK_IDS = Object.freeze(
  Array.from(
    { length: 12 },
    (_, index) => `root/table[1]/tbody[1]/tr[${String(index + 1)}]`,
  ),
);

const RULES_DENSE_BLOCK_IDS = Object.freeze(
  Array.from(
    { length: 5 },
    (_, index) => `root/p[11]#segment[${String(index + 1)}]`,
  ),
);

/**
 * These selections are locked to reviewed source fragments and both expected
 * transcript streams. A source edit, path move, renderer drift, or
 * pronunciation change must be reviewed and versioned rather than silently
 * changing an evaluation sample.
 */
export const PIPER_EVALUATION_EXCERPT_SELECTIONS = Object.freeze<
  readonly PiperEvaluationExcerptSelection[]
>([
  {
    id: "E01-mission-brand-ai",
    lessonSlug: "mission",
    description:
      "Normal explanatory paragraph containing AI and TenXPros terminology.",
    sourcePath: "root/p[7]",
    fragmentMode: "block-source",
    blockIds: Object.freeze(["root/p[7]"]),
    blockTypes: Object.freeze(["paragraph"]),
    blockPauseAfterMs: Object.freeze([500]),
    sourceFragmentSha256:
      "786dd91a7f58486604063913e36a5e55a3d8b1e85585d10c2dd333b5a3abe23d",
    baselineTranscriptSha256:
      "c46597641421c72218d8ba98535122638e444045b2288539c794d407af885177",
    correctedTranscriptSha256:
      "8256f8bf734142ecff090b7ae168f464675ab29f04c9b39415f934a59fea0d01",
  },
  {
    id: "E02-journey-week-table",
    lessonSlug: "journey",
    description:
      "The complete twelve-row week, focus, deliverable, and badge table.",
    sourcePath: "root/table[1]",
    fragmentMode: "table",
    blockIds: JOURNEY_TABLE_BLOCK_IDS,
    blockTypes: Object.freeze(
      Array.from({ length: 12 }, () => "tableRow" as const),
    ),
    blockPauseAfterMs: Object.freeze(Array.from({ length: 12 }, () => 400)),
    sourceFragmentSha256:
      "f3a3e3f6b419fc40e36200b9df5e67e1b2089ab1e5e39b8f694cfcdf3bfd013d",
    baselineTranscriptSha256:
      "95830ad305c3e4bad164d26922c3b2807910211a526c097f5c966d0c34d8950b",
    correctedTranscriptSha256:
      "27ece3d50f42eb377eb78672835605ba4f90a8a75df1f3ff16b72119eb186bf3",
  },
  {
    id: "E03-conversation-application-form",
    lessonSlug: "conversation",
    description:
      "Application-screen form preview with exact duplicate-label suppression.",
    sourcePath: "root/div[4]",
    fragmentMode: "block-source",
    blockIds: Object.freeze(["root/div[4]"]),
    blockTypes: Object.freeze(["formField"]),
    blockPauseAfterMs: Object.freeze([500]),
    sourceFragmentSha256:
      "4a664d8d4915dc1fe9647ff36aefebbb072a7adfe4125ac4da2abbcfe8726638",
    baselineTranscriptSha256:
      "98d1d259dd9d665634ff90fda453bdd7271554fab10b229244b4cd74914e6ed2",
    correctedTranscriptSha256:
      "5d8e1d207aabba1271333e8495c5e3df6df112cd7f196cdafc359b5292a9304b",
  },
  {
    id: "E04-rules-cap-stacking",
    lessonSlug: "rules",
    description:
      "The complete previously long cap-and-stacking paragraph.",
    sourcePath: "root/p[11]",
    fragmentMode: "block-source",
    blockIds: RULES_DENSE_BLOCK_IDS,
    blockTypes: Object.freeze(
      Array.from({ length: 5 }, () => "paragraph" as const),
    ),
    blockPauseAfterMs: Object.freeze([220, 220, 220, 220, 500]),
    sourceFragmentSha256:
      "2402e1219434eb84fa31f77eb61e23b599a37d32eb03eb59c7c988262f28fd7a",
    baselineTranscriptSha256:
      "0efbbc8df0cb528aefe68b87082535cd4c7d627a772e00c57317e154d3084e0c",
    correctedTranscriptSha256:
      "90fbbaf0f3ffdea99c8c0da172a21a64f232b803daabbec4a8344e7cde1bdfe1",
  },
]);

export type PiperEvaluationPlanErrorCode =
  | "ALIGNMENT_NOT_FROZEN"
  | "ALIGNMENT_WARNING_PRESENT"
  | "BLOCK_SELECTION_MISMATCH"
  | "CORRECTED_TRANSCRIPT_MISMATCH"
  | "INVALID_BLIND_SEED"
  | "INVALID_PAIR_OFFSET"
  | "INVALID_PACKAGE_ID"
  | "MISSING_LESSON"
  | "PAUSE_PROFILE_MISMATCH"
  | "RENDERED_DOCUMENT_HASH_MISMATCH"
  | "SOURCE_FRAGMENT_MISMATCH"
  | "SOURCE_HTML_MISMATCH"
  | "SPOKEN_SENTENCE_SPLIT_FAILED";

export class PiperEvaluationPlanError extends Error {
  readonly code: PiperEvaluationPlanErrorCode;
  readonly details: Readonly<Record<string, string | number | boolean>>;

  constructor(
    code: PiperEvaluationPlanErrorCode,
    message: string,
    details: Readonly<Record<string, string | number | boolean>> = {},
  ) {
    super(message);
    this.name = "PiperEvaluationPlanError";
    this.code = code;
    this.details = details;
  }
}

export interface PiperEvaluationLessonInput {
  /**
   * The exact sanitized HTML supplied to renderNarrationDocument. Source
   * offsets in the document are interpreted against this string.
   */
  html: string;
  document: NarrationDocument;
}

export interface PiperEvaluationSynthesisUnit {
  id: string;
  sourceBlockId?: string;
  sentenceNumber?: number;
  text: string;
  textSha256: string;
  characterCount: number;
  wordCount: number;
  pauseAfterMs: number;
  pauseReason: PiperEvaluationPauseReason;
}

export interface PiperEvaluationPipelinePlan {
  pipeline: PiperEvaluationPipeline;
  pipelineVersion: string;
  piperSentenceSilenceMs: number;
  transcript: string;
  transcriptSha256: string;
  characterCount: number;
  wordCount: number;
  units: readonly PiperEvaluationSynthesisUnit[];
}

export interface PiperEvaluationExcerptPlan {
  id: string;
  order: number;
  lessonSlug: PiperEvaluationLessonSlug;
  description: string;
  sourcePath: string;
  sourceFragmentSha256: string;
  sourceFragmentCharacterCount: number;
  blockIds: readonly string[];
  contentRevisionHash: string;
  recipeHash: string;
  documentHash: string;
  pauseProfile: NarrationPauseProfile;
  pipelines: Readonly<{
    baseline: PiperEvaluationPipelinePlan;
    corrected: PiperEvaluationPipelinePlan;
  }>;
}

export interface PiperEvaluationPlan {
  schemaVersion: string;
  selectionVersion: string;
  segmentationVersion: string;
  planHash: string;
  excerpts: readonly PiperEvaluationExcerptPlan[];
}

export interface PiperEvaluationVoiceManifest {
  id: string;
  label: string;
  modelFile: string;
  modelSha256: string;
  nativeSampleRateHz: number;
}

export interface PiperEvaluationPrivateSample {
  blindSampleId: string;
  blindLabel: PiperEvaluationBlindLabel;
  filename: string;
  pairId: string;
  pipeline: PiperEvaluationPipeline;
  pipelineVersion: string;
  voice: PiperEvaluationVoiceManifest;
  lessonSlug: PiperEvaluationLessonSlug;
  excerptId: string;
  sourcePath: string;
  blockIds: readonly string[];
  contentRevisionHash: string;
  recipeHash: string;
  pauseProfile: NarrationPauseProfile;
  piperSentenceSilenceMs: number;
  transcript: string;
  transcriptSha256: string;
  transcriptCharacterCount: number;
  transcriptWordCount: number;
  synthesisUnits: readonly PiperEvaluationSynthesisUnit[];
  audio: {
    status: "pending";
    durationSeconds: null;
    sizeBytes: null;
    sha256: null;
  };
  audit: {
    status: "pending";
  };
}

export interface PiperEvaluationPrivatePair {
  pairId: string;
  excerptId: string;
  samples: readonly [
    PiperEvaluationPrivateSample,
    PiperEvaluationPrivateSample,
  ];
}

export interface PiperEvaluationPrivateManifest {
  schemaVersion: string;
  packageId: string;
  planHash: string;
  selectionVersion: string;
  segmentationVersion: string;
  blindingVersion: string;
  blindSeedSha256: string;
  private: true;
  pairs: readonly PiperEvaluationPrivatePair[];
}

export interface PiperEvaluationPublicSample {
  blindSampleId: string;
  blindLabel: PiperEvaluationBlindLabel;
  filename: string;
}

export interface PiperEvaluationPublicPair {
  pairId: string;
  samples: readonly [
    PiperEvaluationPublicSample,
    PiperEvaluationPublicSample,
  ];
}

export interface PiperEvaluationPublicIndex {
  schemaVersion: string;
  packageId: string;
  pairs: readonly PiperEvaluationPublicPair[];
}

export interface CreatePiperEvaluationPrivateManifestInput {
  plan: PiperEvaluationPlan;
  blindSeed: string;
  packageId?: string;
  voice?: PiperEvaluationVoiceManifest;
  pairNumberOffset?: number;
}

export interface PiperEvaluationPackageLessonInput {
  slug: PiperEvaluationLessonSlug;
  sanitizedHtml: string;
  document: NarrationDocument;
}

export interface BuildPiperEvaluationPackageInput {
  lessons: readonly PiperEvaluationPackageLessonInput[];
  blindSeed: string;
  packageId?: string;
  voice?: PiperEvaluationVoiceManifest;
}

export interface PiperEvaluationRuntimeSegment {
  id: string;
  text: string;
  pauseAfterMs: number;
}

/**
 * Minimal private execution contract consumed by the local Piper orchestrator.
 * Public review artifacts must be derived through createPiperEvaluationPublicIndex
 * instead; this structure intentionally discloses the assignment.
 */
export interface PiperEvaluationRuntimeSample {
  pairId: string;
  label: PiperEvaluationBlindLabel;
  fileName: string;
  pipeline: PiperEvaluationPipeline;
  transcript: string;
  segments: readonly PiperEvaluationRuntimeSegment[];
  sentenceSilenceSeconds: number;
}

export interface PiperEvaluationAssignment {
  pairId: string;
  label: PiperEvaluationBlindLabel;
  fileName: string;
  pipeline: PiperEvaluationPipeline;
  excerptId: string;
  lessonSlug: PiperEvaluationLessonSlug;
}

export interface PiperEvaluationPackage {
  plan: PiperEvaluationPlan;
  excerpts: readonly PiperEvaluationExcerptPlan[];
  assignments: readonly PiperEvaluationAssignment[];
  runtimeSamples: readonly PiperEvaluationRuntimeSample[];
  privateManifest: PiperEvaluationPrivateManifest;
  publicIndex: PiperEvaluationPublicIndex;
  listeningHtml: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

function assertPauseProfile(
  document: NarrationDocument,
  excerptId: string,
): void {
  for (const key of Object.keys(
    PIPER_EVALUATION_PAUSE_PROFILE,
  ) as (keyof NarrationPauseProfile)[]) {
    const expected = PIPER_EVALUATION_PAUSE_PROFILE[key];
    const actual = document.recipe.pauseProfile[key];
    if (actual !== expected) {
      throw new PiperEvaluationPlanError(
        "PAUSE_PROFILE_MISMATCH",
        `${excerptId}: the frozen pause profile no longer matches the evaluation policy.`,
        {
          excerptId,
          pauseType: key,
          expected,
          actual,
        },
      );
    }
  }
}

function assertFrozenDocument(
  lesson: PiperEvaluationLessonInput,
  selection: PiperEvaluationExcerptSelection,
): void {
  const { document, html } = lesson;
  if (document.slug !== selection.lessonSlug) {
    throw new PiperEvaluationPlanError(
      "MISSING_LESSON",
      `${selection.id}: expected ${selection.lessonSlug}, received ${document.slug}.`,
      {
        excerptId: selection.id,
        expectedSlug: selection.lessonSlug,
        actualSlug: document.slug,
      },
    );
  }

  if (
    !document.recipe.ownerApprovalReference.trim() ||
    !document.recipe.overrideRevision.trim()
  ) {
    throw new PiperEvaluationPlanError(
      "ALIGNMENT_NOT_FROZEN",
      `${selection.id}: the narration document has no frozen owner-approved recipe.`,
      { excerptId: selection.id },
    );
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
      `${selection.id}: the frozen document still contains a blocking alignment warning.`,
      {
        excerptId: selection.id,
        warningCode: blockingWarning.code,
        warningSeverity: blockingWarning.severity,
      },
    );
  }

  const actualSourceHash = hashNarrationSource({
    slug: document.slug,
    title: document.title,
    html,
  });
  if (actualSourceHash !== document.hashes.source) {
    throw new PiperEvaluationPlanError(
      "SOURCE_HTML_MISMATCH",
      `${selection.id}: supplied HTML is not the HTML used to render the document.`,
      {
        excerptId: selection.id,
        expectedSourceHash: document.hashes.source,
        actualSourceHash,
      },
    );
  }

  const actualRecipeHash = hashNarrationRecipe(document.recipe);
  const actualBlocksHash = hashNarrationBlocks(document.blocks);
  const partialDocumentHashes = {
    source: document.hashes.source,
    contentRevision: document.hashes.contentRevision,
    blocks: document.hashes.blocks,
    recipe: document.hashes.recipe,
  };
  const actualDocumentHash = hashNarrationDocument({
    schemaVersion: document.schemaVersion,
    slug: document.slug,
    ...(document.title ? { title: document.title } : {}),
    blocks: document.blocks,
    warnings: document.warnings,
    recipe: document.recipe,
    stats: document.stats,
    hashes: partialDocumentHashes,
  });
  if (
    actualRecipeHash !== document.hashes.recipe ||
    actualBlocksHash !== document.hashes.blocks ||
    actualDocumentHash !== document.hashes.document
  ) {
    throw new PiperEvaluationPlanError(
      "RENDERED_DOCUMENT_HASH_MISMATCH",
      `${selection.id}: rendered recipe or block hashes no longer verify.`,
      {
        excerptId: selection.id,
        expectedRecipeHash: document.hashes.recipe,
        actualRecipeHash,
        expectedBlocksHash: document.hashes.blocks,
        actualBlocksHash,
        expectedDocumentHash: document.hashes.document,
        actualDocumentHash,
      },
    );
  }

  assertPauseProfile(document, selection.id);
}

function selectedBlocks(
  document: NarrationDocument,
  selection: PiperEvaluationExcerptSelection,
): NarrationBlock[] {
  const byId = new Map(document.blocks.map((block) => [block.id, block]));
  const blocks = selection.blockIds.map((id, index) => {
    const block = byId.get(id);
    if (!block) {
      throw new PiperEvaluationPlanError(
        "BLOCK_SELECTION_MISMATCH",
        `${selection.id}: required narration block ${id} is missing.`,
        { excerptId: selection.id, blockId: id },
      );
    }

    const expectedType = selection.blockTypes[index];
    const expectedPauseAfterMs = selection.blockPauseAfterMs[index];
    const expectedSourcePath =
      selection.fragmentMode === "table"
        ? id
        : selection.sourcePath;
    if (
      block.type !== expectedType ||
      block.pauseAfterMs !== expectedPauseAfterMs ||
      block.source?.path !== expectedSourcePath
    ) {
      throw new PiperEvaluationPlanError(
        "BLOCK_SELECTION_MISMATCH",
        `${selection.id}: selected block metadata no longer matches the locked excerpt.`,
        {
          excerptId: selection.id,
          blockId: id,
          expectedType: expectedType ?? "",
          actualType: block.type,
          expectedPauseAfterMs: expectedPauseAfterMs ?? -1,
          actualPauseAfterMs: block.pauseAfterMs,
          expectedSourcePath,
          actualSourcePath: block.source?.path ?? "",
        },
      );
    }
    return block;
  });

  if (new Set(blocks.map((block) => block.id)).size !== blocks.length) {
    throw new PiperEvaluationPlanError(
      "BLOCK_SELECTION_MISMATCH",
      `${selection.id}: the excerpt contains duplicate block identifiers.`,
      { excerptId: selection.id },
    );
  }

  return blocks;
}

function blockSourceFragment(
  html: string,
  blocks: readonly NarrationBlock[],
  selection: PiperEvaluationExcerptSelection,
): string {
  const first = blocks[0];
  const last = blocks.at(-1);
  if (!first || !last) {
    throw new PiperEvaluationPlanError(
      "BLOCK_SELECTION_MISMATCH",
      `${selection.id}: the excerpt selected no narration blocks.`,
      { excerptId: selection.id },
    );
  }

  const firstStart = first.source?.startOffset;
  const firstEnd = first.source?.endOffset;
  const lastEnd = last.source?.endOffset;
  if (
    firstStart === undefined ||
    firstEnd === undefined ||
    lastEnd === undefined
  ) {
    throw new PiperEvaluationPlanError(
      "BLOCK_SELECTION_MISMATCH",
      `${selection.id}: source offsets are required for baseline extraction.`,
      { excerptId: selection.id },
    );
  }

  if (selection.fragmentMode === "block-source") {
    for (const block of blocks) {
      if (
        block.source?.startOffset !== firstStart ||
        block.source?.endOffset !== firstEnd
      ) {
        throw new PiperEvaluationPlanError(
          "BLOCK_SELECTION_MISMATCH",
          `${selection.id}: segmented blocks no longer share one source element.`,
          {
            excerptId: selection.id,
            blockId: block.id,
          },
        );
      }
    }
    return html.slice(firstStart, firstEnd);
  }

  const tableStart = html.lastIndexOf("<table", firstStart);
  const closingTableStart = html.indexOf("</table>", lastEnd);
  if (
    tableStart < 0 ||
    closingTableStart < 0 ||
    tableStart >= firstStart ||
    closingTableStart < lastEnd
  ) {
    throw new PiperEvaluationPlanError(
      "BLOCK_SELECTION_MISMATCH",
      `${selection.id}: the selected table boundary could not be reconstructed.`,
      { excerptId: selection.id },
    );
  }

  return html.slice(tableStart, closingTableStart + "</table>".length);
}

function flatBaselineTranscript(fragment: string): string {
  return htmlToPlainText(fragment).replace(/\s+/gu, " ").trim();
}

/**
 * Split only at terminal sentence punctuation followed by one ASCII space.
 * Joining the result with one ASCII space must reconstruct the input exactly.
 */
export function splitPiperEvaluationSentences(value: string): readonly string[] {
  const sentences: string[] = [];
  let sentenceStart = 0;
  const terminalPunctuation = /[.!?](?:["')\u005d\u007d])*(?= |$)/gu;

  for (const match of value.matchAll(terminalPunctuation)) {
    const matchStart = match.index;
    if (matchStart === undefined) {
      break;
    }
    const sentenceEnd = matchStart + match[0].length;
    sentences.push(value.slice(sentenceStart, sentenceEnd));
    if (sentenceEnd < value.length) {
      if (value[sentenceEnd] !== " ") {
        throw new PiperEvaluationPlanError(
          "SPOKEN_SENTENCE_SPLIT_FAILED",
          "Spoken text has a non-ASCII or missing sentence separator.",
        );
      }
      sentenceStart = sentenceEnd + 1;
    } else {
      sentenceStart = sentenceEnd;
    }
  }

  if (sentenceStart < value.length) {
    sentences.push(value.slice(sentenceStart));
  }
  if (
    sentences.length === 0 ||
    sentences.some((sentence) => !sentence) ||
    sentences.join(" ") !== value
  ) {
    throw new PiperEvaluationPlanError(
      "SPOKEN_SENTENCE_SPLIT_FAILED",
      "Spoken text could not be split and reconstructed without a text change.",
      {
        spokenTextSha256: sha256(value),
      },
    );
  }

  return sentences;
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

function baselinePipelinePlan(
  transcript: string,
): PiperEvaluationPipelinePlan {
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

function correctedPipelinePlan(
  blocks: readonly NarrationBlock[],
  transcript: string,
  sentencePauseMs: number,
): PiperEvaluationPipelinePlan {
  const units: PiperEvaluationSynthesisUnit[] = [];

  blocks.forEach((block, blockIndex) => {
    const blockText = narrationBlockToSpokenText(block);
    const sentences = splitPiperEvaluationSentences(blockText);
    sentences.forEach((sentence, sentenceIndex) => {
      const isLastSentence = sentenceIndex === sentences.length - 1;
      const isLastBlock = blockIndex === blocks.length - 1;
      const pauseAfterMs = !isLastSentence
        ? sentencePauseMs
        : isLastBlock
          ? 0
          : block.pauseAfterMs;
      const pauseReason: PiperEvaluationPauseReason = !isLastSentence
        ? "sentence-boundary"
        : isLastBlock
          ? "sample-end"
          : "semantic-block-boundary";
      units.push(
        synthesisUnit({
          id: `semantic:${block.id}:sentence[${String(sentenceIndex + 1)}]`,
          sourceBlockId: block.id,
          sentenceNumber: sentenceIndex + 1,
          text: sentence,
          pauseAfterMs,
          pauseReason,
        }),
      );
    });
  });

  if (units.map((unit) => unit.text).join(" ") !== transcript) {
    throw new PiperEvaluationPlanError(
      "SPOKEN_SENTENCE_SPLIT_FAILED",
      "Sentence units do not reconstruct the approved excerpt transcript.",
      {
        expectedTranscriptSha256: sha256(transcript),
        reconstructedTranscriptSha256: sha256(
          units.map((unit) => unit.text).join(" "),
        ),
      },
    );
  }

  return {
    pipeline: "corrected",
    pipelineVersion: PIPER_EVALUATION_CORRECTED_PIPELINE_VERSION,
    // Each request contains exactly one sentence. All intended silence is
    // inserted as audited PCM between the returned WAV units.
    piperSentenceSilenceMs: 0,
    transcript,
    transcriptSha256: sha256(transcript),
    characterCount: transcript.length,
    wordCount: wordCount(transcript),
    units,
  };
}

export function buildPiperEvaluationPlan(
  lessons: Readonly<
    Record<PiperEvaluationLessonSlug, PiperEvaluationLessonInput>
  >,
): PiperEvaluationPlan {
  const excerpts = PIPER_EVALUATION_EXCERPT_SELECTIONS.map(
    (selection, index): PiperEvaluationExcerptPlan => {
      const lesson = lessons[selection.lessonSlug];
      if (!lesson) {
        throw new PiperEvaluationPlanError(
          "MISSING_LESSON",
          `${selection.id}: missing ${selection.lessonSlug} narration document.`,
          {
            excerptId: selection.id,
            lessonSlug: selection.lessonSlug,
          },
        );
      }

      assertFrozenDocument(lesson, selection);
      const blocks = selectedBlocks(lesson.document, selection);
      const fragment = blockSourceFragment(lesson.html, blocks, selection);
      const actualFragmentSha256 = sha256(fragment);
      if (actualFragmentSha256 !== selection.sourceFragmentSha256) {
        throw new PiperEvaluationPlanError(
          "SOURCE_FRAGMENT_MISMATCH",
          `${selection.id}: source fragment changed; evaluation selection requires review.`,
          {
            excerptId: selection.id,
            expectedSourceFragmentSha256: selection.sourceFragmentSha256,
            actualSourceFragmentSha256: actualFragmentSha256,
          },
        );
      }

      const baselineTranscript = flatBaselineTranscript(fragment);
      const correctedTranscript = blocks
        .map((block) => narrationBlockToSpokenText(block))
        .join(" ");
      const actualBaselineTranscriptSha256 = sha256(baselineTranscript);
      const actualCorrectedTranscriptSha256 = sha256(correctedTranscript);
      if (
        actualBaselineTranscriptSha256 !==
        selection.baselineTranscriptSha256
      ) {
        throw new PiperEvaluationPlanError(
          "SOURCE_FRAGMENT_MISMATCH",
          `${selection.id}: production-style flat transcript changed.`,
          {
            excerptId: selection.id,
            expectedBaselineTranscriptSha256:
              selection.baselineTranscriptSha256,
            actualBaselineTranscriptSha256,
          },
        );
      }
      if (
        actualCorrectedTranscriptSha256 !==
        selection.correctedTranscriptSha256
      ) {
        throw new PiperEvaluationPlanError(
          "CORRECTED_TRANSCRIPT_MISMATCH",
          `${selection.id}: approved semantic transcript changed.`,
          {
            excerptId: selection.id,
            expectedCorrectedTranscriptSha256:
              selection.correctedTranscriptSha256,
            actualCorrectedTranscriptSha256,
          },
        );
      }

      return {
        id: selection.id,
        order: index + 1,
        lessonSlug: selection.lessonSlug,
        description: selection.description,
        sourcePath: selection.sourcePath,
        sourceFragmentSha256: actualFragmentSha256,
        sourceFragmentCharacterCount: fragment.length,
        blockIds: [...selection.blockIds],
        contentRevisionHash: lesson.document.hashes.contentRevision,
        recipeHash: lesson.document.hashes.recipe,
        documentHash: lesson.document.hashes.document,
        pauseProfile: { ...lesson.document.recipe.pauseProfile },
        pipelines: {
          baseline: baselinePipelinePlan(baselineTranscript),
          corrected: correctedPipelinePlan(
            blocks,
            correctedTranscript,
            lesson.document.recipe.pauseProfile.sentence,
          ),
        },
      };
    },
  );

  const planWithoutHash = {
    schemaVersion: PIPER_EVALUATION_PLAN_SCHEMA_VERSION,
    selectionVersion: PIPER_EVALUATION_SELECTION_VERSION,
    segmentationVersion: PIPER_EVALUATION_SEGMENTATION_VERSION,
    excerpts,
  };
  return {
    ...planWithoutHash,
    planHash: stableNarrationHash(
      planWithoutHash,
      PIPER_EVALUATION_PLAN_SCHEMA_VERSION,
    ),
  };
}

function assertBlindSeed(seed: string): string {
  const normalized = seed.trim();
  if (Buffer.byteLength(normalized, "utf8") < 16) {
    throw new PiperEvaluationPlanError(
      "INVALID_BLIND_SEED",
      "Blind-label seed must contain at least 16 UTF-8 bytes.",
    );
  }
  return normalized;
}

function blindAssignmentDigest(
  seed: string,
  excerptId: string,
): string {
  return createHmac("sha256", seed)
    .update(PIPER_EVALUATION_BLINDING_VERSION, "utf8")
    .update("\0", "utf8")
    .update(excerptId, "utf8")
    .digest("hex");
}

/**
 * Randomize with the private seed while counterbalancing label position.
 * This prevents the legitimate but experimentally poor 4×A or 4×B outcome
 * that an independent coin flip can produce in such a small listening set.
 */
function counterbalancedCorrectedLabels(
  seed: string,
  excerpts: readonly PiperEvaluationExcerptPlan[],
): ReadonlyMap<string, PiperEvaluationBlindLabel> {
  const ranked = excerpts
    .map((excerpt) => ({
      id: excerpt.id,
      digest: blindAssignmentDigest(seed, excerpt.id),
    }))
    .sort(
      (left, right) =>
        left.digest.localeCompare(right.digest) ||
        left.id.localeCompare(right.id),
    );
  const oddExtraGoesToA =
    ranked.length % 2 === 1 &&
    Number.parseInt(ranked[0]?.digest.slice(-1) ?? "0", 16) % 2 === 0;
  const aCount =
    Math.floor(ranked.length / 2) + (oddExtraGoesToA ? 1 : 0);
  return new Map(
    ranked.map(({ id }, index) => [
      id,
      index < aCount ? ("A" as const) : ("B" as const),
    ]),
  );
}

function assertPackageId(value: string): string {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(value)) {
    throw new PiperEvaluationPlanError(
      "INVALID_PACKAGE_ID",
      "Package id must be a lowercase filesystem-safe identifier.",
      { packageId: value },
    );
  }
  return value;
}

function privateSample(
  excerpt: PiperEvaluationExcerptPlan,
  pairId: string,
  label: PiperEvaluationBlindLabel,
  pipeline: PiperEvaluationPipeline,
  voice: PiperEvaluationVoiceManifest,
): PiperEvaluationPrivateSample {
  const pipelinePlan = excerpt.pipelines[pipeline];
  const blindSampleId = `${pairId}-${label}`;
  return {
    blindSampleId,
    blindLabel: label,
    filename: `${blindSampleId}.mp3`,
    pairId,
    pipeline,
    pipelineVersion: pipelinePlan.pipelineVersion,
    voice: { ...voice },
    lessonSlug: excerpt.lessonSlug,
    excerptId: excerpt.id,
    sourcePath: excerpt.sourcePath,
    blockIds: [...excerpt.blockIds],
    contentRevisionHash: excerpt.contentRevisionHash,
    recipeHash: excerpt.recipeHash,
    pauseProfile: { ...excerpt.pauseProfile },
    piperSentenceSilenceMs: pipelinePlan.piperSentenceSilenceMs,
    transcript: pipelinePlan.transcript,
    transcriptSha256: pipelinePlan.transcriptSha256,
    transcriptCharacterCount: pipelinePlan.characterCount,
    transcriptWordCount: pipelinePlan.wordCount,
    synthesisUnits: pipelinePlan.units.map((unit) => ({ ...unit })),
    audio: {
      status: "pending",
      durationSeconds: null,
      sizeBytes: null,
      sha256: null,
    },
    audit: {
      status: "pending",
    },
  };
}

export function createPiperEvaluationPrivateManifest({
  plan,
  blindSeed,
  packageId = `piper-eval-${plan.planHash.slice(0, 12)}`,
  voice = PIPER_EVALUATION_BRYCE_VOICE,
  pairNumberOffset = 0,
}: CreatePiperEvaluationPrivateManifestInput): PiperEvaluationPrivateManifest {
  const normalizedSeed = assertBlindSeed(blindSeed);
  const normalizedPackageId = assertPackageId(packageId);
  if (
    !Number.isSafeInteger(pairNumberOffset) ||
    pairNumberOffset < 0 ||
    pairNumberOffset > 9_998
  ) {
    throw new PiperEvaluationPlanError(
      "INVALID_PAIR_OFFSET",
      "Pair-number offset must be an integer from 0 through 9,998.",
      { pairNumberOffset },
    );
  }
  const correctedLabels = counterbalancedCorrectedLabels(
    normalizedSeed,
    plan.excerpts,
  );
  const pairs = plan.excerpts.map(
    (excerpt, index): PiperEvaluationPrivatePair => {
      const pairId = `sample-${String(
        index + 1 + pairNumberOffset,
      ).padStart(2, "0")}`;
      const correctedLabel = correctedLabels.get(excerpt.id);
      if (!correctedLabel) {
        throw new PiperEvaluationPlanError(
          "INVALID_BLIND_SEED",
          `No blind assignment was produced for ${excerpt.id}.`,
          { excerptId: excerpt.id },
        );
      }
      const baselineLabel: PiperEvaluationBlindLabel =
        correctedLabel === "A" ? "B" : "A";
      const byLabel = {
        A:
          correctedLabel === "A"
            ? privateSample(excerpt, pairId, "A", "corrected", voice)
            : privateSample(excerpt, pairId, "A", "baseline", voice),
        B:
          baselineLabel === "B"
            ? privateSample(excerpt, pairId, "B", "baseline", voice)
            : privateSample(excerpt, pairId, "B", "corrected", voice),
      } as const;
      return {
        pairId,
        excerptId: excerpt.id,
        samples: [byLabel.A, byLabel.B],
      };
    },
  );

  return {
    schemaVersion: PIPER_EVALUATION_MANIFEST_SCHEMA_VERSION,
    packageId: normalizedPackageId,
    planHash: plan.planHash,
    selectionVersion: plan.selectionVersion,
    segmentationVersion: plan.segmentationVersion,
    blindingVersion: PIPER_EVALUATION_BLINDING_VERSION,
    blindSeedSha256: sha256(normalizedSeed),
    private: true,
    pairs,
  };
}

export function createPiperEvaluationPublicIndex(
  manifest: PiperEvaluationPrivateManifest,
): PiperEvaluationPublicIndex {
  const publicPackageId = `blind-review-${sha256(
    `${manifest.planHash}:${manifest.blindSeedSha256}`,
  ).slice(0, 16)}`;
  return {
    schemaVersion: PIPER_EVALUATION_PUBLIC_INDEX_SCHEMA_VERSION,
    packageId: publicPackageId,
    pairs: manifest.pairs.map((pair) => ({
      pairId: pair.pairId,
      samples: pair.samples.map((sample) => ({
        blindSampleId: sample.blindSampleId,
        blindLabel: sample.blindLabel,
        filename: sample.filename,
      })) as [
        PiperEvaluationPublicSample,
        PiperEvaluationPublicSample,
      ],
    })),
  };
}

/**
 * Convenience facade for the evaluation CLI. It validates the complete lesson
 * set, builds the fail-closed excerpt plan, creates private blind assignments,
 * and returns both the exact runtime synthesis contract and a public-only
 * listening page.
 */
export function buildPiperEvaluationPackage({
  lessons,
  blindSeed,
  packageId,
  voice,
}: BuildPiperEvaluationPackageInput): PiperEvaluationPackage {
  const lessonRecord: Partial<
    Record<PiperEvaluationLessonSlug, PiperEvaluationLessonInput>
  > = {};
  for (const lesson of lessons) {
    if (lessonRecord[lesson.slug]) {
      throw new PiperEvaluationPlanError(
        "MISSING_LESSON",
        `Duplicate evaluation lesson: ${lesson.slug}.`,
        { lessonSlug: lesson.slug },
      );
    }
    lessonRecord[lesson.slug] = {
      html: lesson.sanitizedHtml,
      document: lesson.document,
    };
  }
  for (const slug of [
    "mission",
    "journey",
    "conversation",
    "rules",
  ] as const) {
    if (!lessonRecord[slug]) {
      throw new PiperEvaluationPlanError(
        "MISSING_LESSON",
        `Missing evaluation lesson: ${slug}.`,
        { lessonSlug: slug },
      );
    }
  }

  const plan = buildPiperEvaluationPlan(
    lessonRecord as Record<
      PiperEvaluationLessonSlug,
      PiperEvaluationLessonInput
    >,
  );
  const privateManifest = createPiperEvaluationPrivateManifest({
    plan,
    blindSeed,
    ...(packageId ? { packageId } : {}),
    ...(voice ? { voice } : {}),
  });
  const publicIndex = createPiperEvaluationPublicIndex(privateManifest);
  const privateSamples = privateManifest.pairs.flatMap(
    (pair) => pair.samples,
  );
  const assignments = privateSamples.map(
    (sample): PiperEvaluationAssignment => ({
      pairId: sample.pairId,
      label: sample.blindLabel,
      fileName: sample.filename,
      pipeline: sample.pipeline,
      excerptId: sample.excerptId,
      lessonSlug: sample.lessonSlug,
    }),
  );
  const runtimeSamples = privateSamples.map(
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
      sentenceSilenceSeconds: sample.piperSentenceSilenceMs / 1_000,
    }),
  );

  return {
    plan,
    excerpts: plan.excerpts,
    assignments,
    runtimeSamples,
    privateManifest,
    publicIndex,
    listeningHtml: renderPiperEvaluationListeningHtml(publicIndex),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function scoreControls(sampleId: string): string {
  return PIPER_EVALUATION_SCORE_FIELDS.map(
    (field) => `<fieldset>
      <legend>${escapeHtml(field.label)}</legend>
      <div class="score-options">
        ${[1, 2, 3, 4, 5]
          .map(
            (score) =>
              `<label><input type="radio" name="${escapeHtml(
                `${sampleId}-${field.id}`,
              )}" data-score data-sample="${escapeHtml(
                sampleId,
              )}" data-metric="${escapeHtml(
                field.id,
              )}" value="${String(score)}"> ${String(score)}</label>`,
          )
          .join("")}
      </div>
    </fieldset>`,
  ).join("");
}

/**
 * Build a self-contained, local-only listening page. It receives only the
 * public index, so neither its markup nor its JavaScript can reveal lesson,
 * transcript, recipe, or pipeline identities.
 */
export function renderPiperEvaluationListeningHtml(
  index: PiperEvaluationPublicIndex,
): string {
  const cards = index.pairs
    .flatMap((pair) =>
      pair.samples.map(
        (sample) => `<article class="sample-card" data-sample-card="${escapeHtml(
          sample.blindSampleId,
        )}">
          <h2>${escapeHtml(sample.blindSampleId)}</h2>
          <audio controls preload="metadata" data-audio="${escapeHtml(
            sample.blindSampleId,
          )}" src="audio/${escapeHtml(sample.filename)}"></audio>
          <label class="speed">Playback speed
            <select data-rate="${escapeHtml(sample.blindSampleId)}">
              <option value="1" selected>1.0x</option>
              <option value="1.25">1.25x</option>
            </select>
          </label>
          <div class="score-grid">${scoreControls(
            sample.blindSampleId,
          )}</div>
          <label class="notes">Notes
            <textarea rows="3" data-notes="${escapeHtml(
              sample.blindSampleId,
            )}"></textarea>
          </label>
        </article>`,
      ),
    )
    .join("");
  const sampleIds = index.pairs.flatMap((pair) =>
    pair.samples.map((sample) => sample.blindSampleId),
  );
  const packageIdJson = JSON.stringify(index.packageId);
  const sampleIdsJson = JSON.stringify(sampleIds);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: file:; media-src 'self' file:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
  <title>TenXPros local listening review</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, sans-serif; background: #f3f5f7; color: #17202a; }
    body { margin: 0 auto; max-width: 1040px; padding: 24px; }
    header, .sample-card { background: white; border: 1px solid #dce2e8; border-radius: 12px; padding: 20px; }
    header { margin-bottom: 20px; }
    .sample-card { margin: 16px 0; }
    audio { display: block; margin: 12px 0; width: 100%; }
    .speed, .notes { display: block; margin: 14px 0; }
    select { margin-left: 8px; }
    .score-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    fieldset { border: 1px solid #dce2e8; border-radius: 8px; }
    legend { font-weight: 600; }
    .score-options { display: flex; justify-content: space-between; }
    textarea { box-sizing: border-box; display: block; margin-top: 6px; width: 100%; }
    button { background: #153c66; border: 0; border-radius: 8px; color: white; cursor: pointer; padding: 10px 16px; }
    .saved { color: #40604a; margin-left: 10px; }
  </style>
</head>
<body>
  <header>
    <h1>Local listening review</h1>
    <p>Use 1 for poor and 5 for excellent. For listening fatigue, 5 means effortless to listen to. Identities remain hidden until results are exported and reviewed against the private manifest.</p>
    <button type="button" id="export-scores">Export blind scores</button>
    <span class="saved" id="save-status" aria-live="polite"></span>
  </header>
  <main>${cards}</main>
  <script>
    (() => {
      "use strict";
      const packageId = ${packageIdJson};
      const sampleIds = ${sampleIdsJson};
      const storageKey = "tenxpros-local-listening:" + packageId;
      const emptyState = () => ({
        schemaVersion: "academy-blind-listening-scores-v1",
        packageId,
        samples: Object.fromEntries(sampleIds.map((id) => [id, { scores: {}, notes: "" }]))
      });
      const readState = () => {
        try {
          const raw = localStorage.getItem(storageKey);
          return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
        } catch {
          return emptyState();
        }
      };
      let state = readState();
      const status = document.getElementById("save-status");
      const save = () => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(state));
          if (status) status.textContent = "Saved locally";
        } catch {
          if (status) status.textContent = "Local save unavailable; export before closing";
        }
      };

      for (const sampleId of sampleIds) {
        const audio = document.querySelector('[data-audio="' + sampleId + '"]');
        const rate = document.querySelector('[data-rate="' + sampleId + '"]');
        if (audio instanceof HTMLAudioElement) {
          audio.defaultPlaybackRate = 1;
          audio.playbackRate = 1;
        }
        if (rate instanceof HTMLSelectElement) {
          rate.value = "1";
          rate.addEventListener("change", () => {
            if (audio instanceof HTMLAudioElement) {
              audio.playbackRate = Number(rate.value);
            }
          });
        }
        const saved = state.samples?.[sampleId] ?? { scores: {}, notes: "" };
        document.querySelectorAll('[data-score][data-sample="' + sampleId + '"]').forEach((node) => {
          if (!(node instanceof HTMLInputElement)) return;
          if (String(saved.scores?.[node.dataset.metric ?? ""]) === node.value) {
            node.checked = true;
          }
          node.addEventListener("change", () => {
            const metric = node.dataset.metric;
            if (!metric || !node.checked) return;
            state.samples[sampleId] ??= { scores: {}, notes: "" };
            state.samples[sampleId].scores[metric] = Number(node.value);
            save();
          });
        });
        const notes = document.querySelector('[data-notes="' + sampleId + '"]');
        if (notes instanceof HTMLTextAreaElement) {
          notes.value = saved.notes ?? "";
          notes.addEventListener("input", () => {
            state.samples[sampleId] ??= { scores: {}, notes: "" };
            state.samples[sampleId].notes = notes.value;
            save();
          });
        }
      }

      document.getElementById("export-scores")?.addEventListener("click", () => {
        const payload = { ...state, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(payload, null, 2) + "\\n"], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = packageId + "-blind-scores.json";
        link.click();
        URL.revokeObjectURL(link.href);
      });
    })();
  </script>
</body>
</html>
`;
}
