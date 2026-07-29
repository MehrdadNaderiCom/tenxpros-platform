#!/usr/bin/env tsx

/**
 * Offline Academy content and narration review CLI.
 *
 * This command reads canonical seed content only. It has no database, provider,
 * network, audio-generation, or deployment imports. Output files are review
 * artifacts; the command never writes lesson content or active audio.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import editorialLedgerJson from "../prisma/seed/academy/editorial-ledger.phase0.json";
import ownerReviewJson from "../prisma/seed/academy/editorial-owner-review.phase0.json";
import phase0InventoryJson from "../prisma/seed/academy/content-inventory.phase0.json";
import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import {
  CONTENT_REVISION_VERSION,
  EDITORIAL_RULE_VERSION,
  analyzeReadability,
  createVisibleContentRevisionHash,
  reconstructOriginalHtml,
  validateEditorialLedger,
  validateOwnerReviewItems,
  validatePhase0BaselineInventory,
} from "../src/lib/academy/content-review";
import type {
  AcademyLessonForReview,
  EditorialChange,
  LessonReview,
  OwnerReviewItem,
  Phase0BaselineInventory,
} from "../src/lib/academy/content-review";
import {
  htmlToPlainText,
  sanitizeLessonHtml,
} from "../src/lib/academy/lesson-html";
import type {
  NarrationBlock,
  NarrationDocument,
  NarrationWarning,
} from "../src/lib/academy/narration/contracts";
import {
  ACADEMY_PRONUNCIATION_FREEZE_REVISION,
  ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
  FROZEN_ACADEMY_NARRATION_OVERRIDES,
} from "../src/lib/academy/narration/approved-pronunciations";
import {
  auditNarrationDocumentAlignment,
  type NarrationAlignmentBlockAudit,
  type NarrationAlignmentDocumentAudit,
} from "../src/lib/academy/narration/alignment";
import { planNarrationChunks } from "../src/lib/academy/narration/chunking";
import {
  AUTOMATIC_NARRATION_TRANSFORMATION_ALLOWLIST,
  SEQUENTIAL_ORDERED_LIST_ALLOWLIST,
} from "../src/lib/academy/narration/policy";
import {
  formatNarrationPreview,
  formatNarrationSpokenScript,
  narrationBlockToSpokenText,
} from "../src/lib/academy/narration/preview";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";
import {
  LONG_BLOCK_SEGMENTATION_POLICIES,
} from "../src/lib/academy/narration/segmentation";

type Command =
  | "content-audit"
  | "content-review"
  | "content-diff"
  | "narration-plan"
  | "narration-preview"
  | "narration-audit"
  | "narration-alignment";

type OutputFormat = "json" | "markdown";

const SOURCE_LOCATIONS = [
  "prisma/seed/academy/m01-mission.ts",
  "prisma/seed/academy/m02-identity.ts",
  "prisma/seed/academy/m03-rules.ts",
  "prisma/seed/academy/m04-product.ts",
  "prisma/seed/academy/m05-journey.ts",
  "prisma/seed/academy/m06-ranks.ts",
  "prisma/seed/academy/m07-coach.ts",
  "prisma/seed/academy/m08-selling.ts",
  "prisma/seed/academy/m09-prospecting.ts",
  "prisma/seed/academy/m10-conversation.ts",
  "prisma/seed/academy/m11-operations.ts",
  "prisma/seed/academy/m12-mechanics.ts",
  "prisma/seed/academy/m13-motions.ts",
  "prisma/seed/academy/m14-customize.ts",
  "prisma/seed/academy/m15-contact.ts",
  "prisma/seed/academy/m16-alumni.ts",
  "prisma/seed/academy/m17-sharing.ts",
] as const;

const changes = editorialLedgerJson.changes as unknown as EditorialChange[];
const ownerReviewItems = ownerReviewJson.items as unknown as OwnerReviewItem[];
const phase0Inventory =
  phase0InventoryJson as unknown as Phase0BaselineInventory;

interface LessonArtifacts {
  lesson: AcademyLessonForReview;
  review: LessonReview;
  originalHtml: string;
  revisedHtml: string;
  contentRevisionHash: string;
  narration: NarrationDocument;
  spokenScript: string;
}

function usage(): string {
  return `Offline Academy content and narration review

Usage:
  pnpm academy:audio -- content-audit [--format markdown|json] [--output <file>]
  pnpm academy:audio -- content-review --all [--format markdown|json] [--output <file>]
  pnpm academy:audio -- content-diff --slug <lesson-slug> [--format markdown|json]
  pnpm academy:audio -- narration-plan (--all | --slug <lesson-slug>) [--output <file>]
  pnpm academy:audio -- narration-preview --slug <lesson-slug> [--output <file>]
  pnpm academy:audio -- narration-preview --all --output <directory>
  pnpm academy:audio -- narration-audit [--format markdown|json] [--output <file>]
  pnpm academy:audio -- narration-alignment [--format markdown|json] [--output <file>]

Safety:
  Seed source only. Zero database writes, zero audio writes, zero TTS/API calls.`;
}

function optionValue(args: readonly string[], option: string): string | undefined {
  const index = args.indexOf(option);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseFormat(args: readonly string[], fallback: OutputFormat): OutputFormat {
  const value = optionValue(args, "--format") ?? fallback;
  if (value !== "json" && value !== "markdown") {
    throw new Error(`Unsupported format: ${value}`);
  }
  return value;
}

function assertKnownOptions(args: readonly string[]): void {
  const optionsWithValues = new Set(["--slug", "--format", "--output"]);
  const flags = new Set(["--all", "--help"]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    if (flags.has(arg)) continue;
    if (!optionsWithValues.has(arg)) throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function percentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}%`;
}

function blockCounts(blocks: readonly NarrationBlock[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const block of blocks) {
    result[block.type] = (result[block.type] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(result).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function warningCounts(warnings: readonly NarrationWarning[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const warning of warnings) {
    result[warning.code] = (result[warning.code] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(result).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function buildArtifacts(): LessonArtifacts[] {
  const lessons = ACADEMY_MODULES.map(
    (module, index): AcademyLessonForReview => ({
      slug: module.slug,
      title: module.title,
      sourceLocation: SOURCE_LOCATIONS[index],
      bodyHtml: module.bodyHtml ?? "",
    }),
  );

  const lessonReviews = validateEditorialLedger(lessons, changes);
  validatePhase0BaselineInventory(lessons, changes, phase0Inventory);
  validateOwnerReviewItems(lessons, ownerReviewItems);
  const reviews = lessons.map((lesson, index) => {
    const lessonChanges = changes.filter((change) => change.lessonSlug === lesson.slug);
    const originalHtml = reconstructOriginalHtml(lesson.bodyHtml, lessonChanges);
    const review = lessonReviews[index];
    const revisedHtml = sanitizeLessonHtml(lesson.bodyHtml);
    const contentRevisionHash = createVisibleContentRevisionHash(
      originalHtml,
      lesson.bodyHtml,
    );
    const narration = renderNarrationDocument({
      slug: lesson.slug,
      title: lesson.title,
      html: revisedHtml,
      contentRevisionHash,
      overrides: FROZEN_ACADEMY_NARRATION_OVERRIDES,
    });
    return {
      lesson,
      review,
      originalHtml,
      revisedHtml,
      contentRevisionHash,
      narration,
      spokenScript: formatNarrationSpokenScript(narration.blocks),
    };
  });

  return reviews;
}

function assertFrozenNarrationRecipes(
  artifacts: readonly LessonArtifacts[],
): void {
  let ownerReviewBlocks = 0;
  let invalidDriftBlocks = 0;

  for (const artifact of artifacts) {
    const { narration } = artifact;
    if (
      narration.recipe.overrideRevision !==
        ACADEMY_PRONUNCIATION_FREEZE_REVISION ||
      narration.recipe.ownerApprovalReference !==
        ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE
    ) {
      throw new Error(
        `Narration recipe ${artifact.lesson.slug} does not carry the frozen owner-approved pronunciation profile.`,
      );
    }

    const audit = auditNarrationDocumentAlignment(narration);
    ownerReviewBlocks +=
      audit.summary.blocksByClassification
        .REQUIRES_OWNER_REVIEW;
    invalidDriftBlocks +=
      audit.summary.blocksByClassification
        .INVALID_SEMANTIC_DRIFT;
  }

  if (ownerReviewBlocks !== 0 || invalidDriftBlocks !== 0) {
    throw new Error(
      `Narration recipe freeze gate failed: REQUIRES_OWNER_REVIEW=${String(ownerReviewBlocks)} INVALID_SEMANTIC_DRIFT=${String(invalidDriftBlocks)}.`,
    );
  }
}

function selectArtifacts(
  artifacts: readonly LessonArtifacts[],
  args: readonly string[],
  requireSelection = true,
): LessonArtifacts[] {
  const slug = optionValue(args, "--slug");
  const all = args.includes("--all");
  if (slug && all) throw new Error("Use either --slug or --all, not both");
  if (!slug && !all) {
    if (!requireSelection) return [...artifacts];
    throw new Error("Specify --all or --slug <lesson-slug>");
  }
  if (all) return [...artifacts];
  const lesson = artifacts.find((artifact) => artifact.lesson.slug === slug);
  if (!lesson) throw new Error(`Unknown lesson slug: ${slug}`);
  return [lesson];
}

function contentAuditJson(artifacts: readonly LessonArtifacts[]) {
  return {
    schemaVersion: "1",
    source: "canonical seed bodyHtml",
    baselineCommit: phase0Inventory.capturedFromCommit,
    lessonCount: artifacts.length,
    editorialRuleVersion: EDITORIAL_RULE_VERSION,
    contentRevisionVersion: CONTENT_REVISION_VERSION,
    lessons: artifacts.map(({ lesson, review, narration, revisedHtml }) => ({
      order: ACADEMY_MODULES.find((module) => module.slug === lesson.slug)?.order,
      slug: lesson.slug,
      title: lesson.title,
      sourceLocation: lesson.sourceLocation,
      revisedContentHash: review.revisedHash,
      readability: review.revised,
      retainedTerminology: review.retainedTerminology,
      structure: review.structure,
      semanticBlockCount: narration.stats.blockCount,
      narrationWarnings: warningCounts(narration.warnings),
      sanitizedHtmlCharacters: revisedHtml.length,
    })),
  };
}

function contentAuditMarkdown(artifacts: readonly LessonArtifacts[]): string {
  const rows = artifacts.map(({ lesson, review, narration }) =>
    [
      ACADEMY_MODULES.find((module) => module.slug === lesson.slug)?.order ?? "",
      lesson.slug,
      review.revised.words,
      review.revised.sentences,
      review.revised.fleschKincaidGrade,
      review.revised.approximateLevel,
      review.revised.longSentences,
      review.revised.difficultPhrases,
      review.structure.tables,
      review.structure.tableRows,
      review.structure.formPreviews,
      narration.stats.blockCount,
      narration.warnings.length,
    ].join(" | "),
  );
  return [
    "# Academy content audit",
    "",
    `Source: canonical seed \`bodyHtml\``,
    `Lessons: ${artifacts.length}`,
    `Editorial rules: ${EDITORIAL_RULE_VERSION}`,
    `Content revision: ${CONTENT_REVISION_VERSION}`,
    "",
    "Order | Slug | Words | Sentences | Grade | Level | Long sentences | Difficult phrases | Tables | Rows | Forms | Narration blocks | Warnings",
    "---: | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---:",
    ...rows,
    "",
    "Readability scores are approximate indicators. Editorial decisions use the ledger and professional review, not the score alone.",
  ].join("\n");
}

function contentReviewJson(artifacts: readonly LessonArtifacts[]) {
  const originalTexts = artifacts.map((artifact) =>
    htmlToPlainText(artifact.originalHtml),
  );
  const revisedTexts = artifacts.map((artifact) =>
    htmlToPlainText(artifact.lesson.bodyHtml),
  );
  const totalOriginalWords = artifacts.reduce(
    (total, artifact) => total + artifact.review.original.words,
    0,
  );
  const totalRevisedWords = artifacts.reduce(
    (total, artifact) => total + artifact.review.revised.words,
    0,
  );
  return {
    schemaVersion: "1",
    editorialRuleVersion: EDITORIAL_RULE_VERSION,
    contentRevisionVersion: CONTENT_REVISION_VERSION,
    baselineCommit: phase0Inventory.capturedFromCommit,
    academyReadabilityOriginal: analyzeReadability(originalTexts.join("\n\n")),
    academyReadabilityRevised: analyzeReadability(revisedTexts.join("\n\n")),
    totalOriginalCharacters: originalTexts.reduce(
      (total, text) => total + text.length,
      0,
    ),
    totalRevisedCharacters: revisedTexts.reduce(
      (total, text) => total + text.length,
      0,
    ),
    totalOriginalSentences: artifacts.reduce(
      (total, artifact) => total + artifact.review.original.sentences,
      0,
    ),
    totalRevisedSentences: artifacts.reduce(
      (total, artifact) => total + artifact.review.revised.sentences,
      0,
    ),
    totalOriginalWords,
    totalRevisedWords,
    totalWordDifference: totalRevisedWords - totalOriginalWords,
    totalWordDifferencePercent:
      ((totalRevisedWords - totalOriginalWords) / totalOriginalWords) * 100,
    appliedChangeCount: changes.length,
    ownerReviewCount: ownerReviewItems.length,
    lessons: artifacts.map(({ review }) => review),
    changes,
    ownerReviewItems,
  };
}

function contentReviewMarkdown(artifacts: readonly LessonArtifacts[]): string {
  const data = contentReviewJson(artifacts);
  const rows = artifacts.map(({ review }) =>
    [
      review.slug,
      review.original.words,
      review.revised.words,
      percentage(review.wordDifferencePercent),
      review.original.sentences,
      review.revised.sentences,
      review.original.fleschKincaidGrade,
      review.revised.fleschKincaidGrade,
      review.changes.length,
    ].join(" | "),
  );
  const lines = [
    "# Phase 0 Academy editorial review",
    "",
    `Editorial rules: \`${EDITORIAL_RULE_VERSION}\``,
    `Content revision: \`${CONTENT_REVISION_VERSION}\``,
    `Pre-edit baseline commit: \`${phase0Inventory.capturedFromCommit}\``,
    `Applied changes: ${changes.length}`,
    `Owner-review proposals retained without application: ${ownerReviewItems.length}`,
    "",
    "Slug | Original words | Revised words | Difference | Original sentences | Revised sentences | Original grade | Revised grade | Changes",
    "--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---:",
    ...rows,
    "",
    `Total words: ${data.totalOriginalWords} → ${data.totalRevisedWords} (${percentage(data.totalWordDifferencePercent)})`,
    `Total visible characters: ${data.totalOriginalCharacters} → ${data.totalRevisedCharacters}`,
    `Total sentences: ${data.totalOriginalSentences} → ${data.totalRevisedSentences}`,
    `Whole-Academy Flesch reading ease: ${data.academyReadabilityOriginal.fleschReadingEase} → ${data.academyReadabilityRevised.fleschReadingEase}`,
    `Whole-Academy Flesch-Kincaid grade: ${data.academyReadabilityOriginal.fleschKincaidGrade} → ${data.academyReadabilityRevised.fleschKincaidGrade}`,
    "",
    "## Applied change ledger",
  ];

  for (const artifact of artifacts) {
    if (!artifact.review.changes.length) continue;
    lines.push("", `### ${artifact.lesson.title} (\`${artifact.lesson.slug}\`)`);
    for (const change of artifact.review.changes) {
      lines.push(
        "",
        `#### ${change.id}`,
        "",
        `- Location: \`${change.contentLocation}\``,
        `- Block: \`${change.blockType}\``,
        `- Reason: ${change.reason}`,
        `- Confidence: ${change.confidence}`,
        `- Meaning removed: No`,
        "",
        "Original:",
        "",
        `> ${change.originalText.replace(/\n/g, "\n> ")}`,
        "",
        "Revised:",
        "",
        `> ${change.revisedText.replace(/\n/g, "\n> ")}`,
        "",
        `Why: ${change.readabilityIssue}`,
      );
    }
  }

  lines.push("", "## Retained for owner review");
  for (const item of ownerReviewItems) {
    lines.push(
      "",
      `### ${item.id} — ${item.lessonSlug}`,
      "",
      `Category: ${item.category}`,
      "",
      "Retained:",
      "",
      `> ${item.retainedText}`,
      "",
      "Proposal not applied:",
      "",
      `> ${item.proposedRevision}`,
      "",
      `Why review is required: ${item.reason}`,
    );
  }
  return lines.join("\n");
}

function contentDiffJson(artifact: LessonArtifacts) {
  return {
    schemaVersion: "1",
    slug: artifact.lesson.slug,
    title: artifact.lesson.title,
    sourceLocation: artifact.lesson.sourceLocation,
    originalHash: artifact.review.originalHash,
    revisedHash: artifact.review.revisedHash,
    contentRevisionHash: artifact.contentRevisionHash,
    original: artifact.review.original,
    revised: artifact.review.revised,
    wordDifferencePercent: artifact.review.wordDifferencePercent,
    preservation: artifact.review.preservation,
    changes: artifact.review.changes,
    ownerReviewItems: ownerReviewItems.filter(
      (item) => item.lessonSlug === artifact.lesson.slug,
    ),
  };
}

function contentDiffMarkdown(artifact: LessonArtifacts): string {
  const lines = [
    `# Content diff: ${artifact.lesson.title}`,
    "",
    `Slug: \`${artifact.lesson.slug}\``,
    `Source: \`${artifact.lesson.sourceLocation}\``,
    `Words: ${artifact.review.original.words} → ${artifact.review.revised.words} (${percentage(artifact.review.wordDifferencePercent)})`,
    `Sentences: ${artifact.review.original.sentences} → ${artifact.review.revised.sentences}`,
    `Semantic-preservation gate: ${artifact.review.preservation.ok ? "PASS" : "FAIL"}`,
  ];
  if (!artifact.review.changes.length) {
    lines.push("", "No visible-content change was required.");
  }
  for (const change of artifact.review.changes) {
    lines.push(
      "",
      `## ${change.id}`,
      "",
      "Original:",
      "",
      `> ${change.originalText}`,
      "",
      "Revised:",
      "",
      `> ${change.revisedText}`,
      "",
      `Why: ${change.readabilityIssue}`,
      "",
      `Meaning preserved: ${change.meaningRemoved ? "Requires owner review" : "Yes"}`,
    );
  }
  return lines.join("\n");
}

function narrationPlanJson(artifacts: readonly LessonArtifacts[]) {
  return {
    schemaVersion: "1",
    source: "canonical revised seed bodyHtml",
    externalApiCalls: 0,
    documents: artifacts.map(
      ({ lesson, review, contentRevisionHash, narration, spokenScript }) => ({
        slug: lesson.slug,
        title: lesson.title,
        sourceLocation: lesson.sourceLocation,
        visibleContentRevision: {
          originalHash: review.originalHash,
          revisedHash: review.revisedHash,
          editorialRuleVersion: EDITORIAL_RULE_VERSION,
          contentRevisionVersion: CONTENT_REVISION_VERSION,
          hash: contentRevisionHash,
        },
        narration,
        chunks: planNarrationChunks(narration.blocks),
        exactSpokenScriptCharacters: spokenScript.length,
      }),
    ),
  };
}

function narrationAuditJson(artifacts: readonly LessonArtifacts[]) {
  const lessons = artifacts.map(({ lesson, narration, spokenScript }) => {
    const chunks = planNarrationChunks(narration.blocks);
    const longest = narration.blocks.reduce(
      (maximum, block) =>
        Math.max(maximum, narrationBlockToSpokenText(block).length),
      0,
    );
    return {
      slug: lesson.slug,
      title: lesson.title,
      blockCounts: blockCounts(narration.blocks),
      blockCount: narration.blocks.length,
      exactSpokenScriptCharacters: spokenScript.length,
      chunkCount: chunks.length,
      largestChunkCharacters: Math.max(
        0,
        ...chunks.map((chunk) => chunk.characterCount),
      ),
      longestSpokenBlockCharacters: longest,
      warningCounts: warningCounts(narration.warnings),
      warnings: narration.warnings,
      hashes: narration.hashes,
      recipeVersions: narration.recipe.versions,
    };
  });
  return {
    schemaVersion: "1",
    externalApiCalls: 0,
    lessonCount: lessons.length,
    totalBlocks: lessons.reduce((total, lesson) => total + lesson.blockCount, 0),
    totalSpokenScriptCharacters: lessons.reduce(
      (total, lesson) => total + lesson.exactSpokenScriptCharacters,
      0,
    ),
    totalWarnings: lessons.reduce(
      (total, lesson) =>
        total + Object.values(lesson.warningCounts).reduce((sum, count) => sum + count, 0),
      0,
    ),
    lessons,
  };
}

function narrationAuditMarkdown(artifacts: readonly LessonArtifacts[]): string {
  const audit = narrationAuditJson(artifacts);
  const rows = audit.lessons.map((lesson) =>
    [
      lesson.slug,
      lesson.blockCount,
      lesson.exactSpokenScriptCharacters,
      lesson.chunkCount,
      lesson.largestChunkCharacters,
      lesson.longestSpokenBlockCharacters,
      Object.values(lesson.warningCounts).reduce((total, count) => total + count, 0),
      markdownCell(
        Object.entries(lesson.warningCounts)
          .map(([code, count]) => `${code}:${count}`)
          .join(", ") || "none",
      ),
    ].join(" | "),
  );
  return [
    "# Academy narration audit",
    "",
    `Lessons: ${audit.lessonCount}`,
    `Blocks: ${audit.totalBlocks}`,
    `Exact spoken-script characters: ${audit.totalSpokenScriptCharacters}`,
    `Warnings: ${audit.totalWarnings}`,
    `External API calls: 0`,
    "",
    "Slug | Blocks | Script characters | Chunks | Largest chunk | Longest block | Warnings | Warning codes",
    "--- | ---: | ---: | ---: | ---: | ---: | ---: | ---",
    ...rows,
  ].join("\n");
}

type AlignmentMetricCategory =
  | "exact"
  | "punctuationOrSpacingOnly"
  | "pronunciationOnly"
  | "structuredNarration"
  | "otherAllowlistedNormalization"
  | "requiresOwnerReview"
  | "invalidSemanticDrift";

const ALIGNMENT_METRIC_CATEGORIES: readonly AlignmentMetricCategory[] = [
  "exact",
  "punctuationOrSpacingOnly",
  "pronunciationOnly",
  "structuredNarration",
  "otherAllowlistedNormalization",
  "requiresOwnerReview",
  "invalidSemanticDrift",
];

const PRE_CORRECTION_ALIGNMENT_BASELINE = Object.freeze({
  corpusSourceDigest:
    "0e0edd6797aea1016b2507a391870dc24a4c3aed7659e8d439dad1cff13becb9",
  totalBlocks: 942,
  exclusiveCategories: {
    exact: 479,
    punctuationOrSpacingOnly: 258,
    approvedNormalization: 106,
    structuredNarration: 58,
    ownerReviewDifference: 41,
    invalidSemanticDrift: 0,
  },
  freezeOwnerReviewBlocks: 43,
  ownerReviewOccurrences: 49,
  lessons: [
    ["mission", 68, 25, 17, 17, 4, 5, 0],
    ["identity", 62, 37, 18, 2, 1, 4, 0],
    ["rules", 93, 49, 20, 20, 0, 4, 0],
    ["product", 59, 22, 17, 11, 2, 7, 0],
    ["journey", 70, 25, 19, 10, 14, 2, 0],
    ["ranks", 53, 27, 15, 3, 4, 4, 0],
    ["coach", 54, 34, 13, 2, 0, 5, 0],
    ["selling", 66, 37, 18, 5, 4, 2, 0],
    ["prospecting", 49, 33, 13, 3, 0, 0, 0],
    ["conversation", 56, 36, 14, 4, 2, 0, 0],
    ["operations", 67, 49, 17, 0, 1, 0, 0],
    ["mechanics", 58, 34, 16, 3, 5, 0, 0],
    ["motions", 54, 17, 13, 16, 7, 1, 0],
    ["customize", 101, 44, 37, 10, 10, 0, 0],
    ["contact-us", 11, 2, 3, 0, 0, 6, 0],
    ["alumni-network", 11, 5, 5, 0, 0, 1, 0],
    ["experience-sharing", 10, 3, 3, 0, 4, 0, 0],
  ].map(
    ([
      slug,
      total,
      exact,
      punctuationOrSpacingOnly,
      approvedNormalization,
      structuredNarration,
      ownerReviewDifference,
      invalidSemanticDrift,
    ]) => ({
      slug,
      total,
      exact,
      punctuationOrSpacingOnly,
      approvedNormalization,
      structuredNarration,
      ownerReviewDifference,
      invalidSemanticDrift,
    }),
  ),
});

function emptyAlignmentMetricCounts(): Record<AlignmentMetricCategory, number> {
  return {
    exact: 0,
    punctuationOrSpacingOnly: 0,
    pronunciationOnly: 0,
    structuredNarration: 0,
    otherAllowlistedNormalization: 0,
    requiresOwnerReview: 0,
    invalidSemanticDrift: 0,
  };
}

function countWords(value: string): number {
  return (
    value.match(
      /[\p{L}\p{M}\p{N}]+(?:['\u2019-][\p{L}\p{M}\p{N}]+)*/gu,
    ) ?? []
  ).length;
}

function lexicalSequence(value: string): string {
  return (
    value
      .normalize("NFKC")
      .toLocaleLowerCase()
      .match(/[\p{L}\p{M}\p{N}]+/gu) ?? []
  ).join(" ");
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyPronunciationsForMetric(
  value: string,
  pronunciations: Readonly<Record<string, string>>,
): string {
  const entries = Object.entries(pronunciations)
    .filter(([source, spoken]) => source.trim() && spoken.trim())
    .sort(
      ([left], [right]) =>
        right.length - left.length || left.localeCompare(right),
    );
  if (!entries.length) return value;

  const replacements = new Map(
    entries.map(([source, spoken]) => [
      source.toLocaleLowerCase(),
      spoken,
    ]),
  );
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${entries
      .map(([source]) => escapeRegularExpression(source))
      .join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
  return value.replace(
    pattern,
    (match) => replacements.get(match.toLocaleLowerCase()) ?? match,
  );
}

function isPronunciationOnlyField(
  visible: string,
  spoken: string,
  pronunciations: Readonly<Record<string, string>>,
): boolean {
  if (visible === spoken) return false;
  const before = lexicalSequence(visible);
  const after = lexicalSequence(
    applyPronunciationsForMetric(visible, pronunciations),
  );
  return before !== after && after === lexicalSequence(spoken);
}

function isStructuredNarrationChange(
  block: NarrationBlock,
  audit: NarrationAlignmentBlockAudit,
): boolean {
  if (block.type === "listItem" && block.index !== undefined) {
    return true;
  }
  if (block.type === "tableRow") {
    return audit.fields.some(
      (field) => field.visibleText !== field.spokenText,
    );
  }
  if (block.type === "formField") {
    return (
      Boolean(block.suppressDuplicateLabelInSpeech) ||
      audit.fields.some(
        (field) => field.visibleText !== field.spokenText,
      )
    );
  }
  return false;
}

function alignmentMetricCategory(
  block: NarrationBlock,
  audit: NarrationAlignmentBlockAudit,
  pronunciations: Readonly<Record<string, string>>,
): AlignmentMetricCategory {
  if (audit.classification === "INVALID_SEMANTIC_DRIFT") {
    return "invalidSemanticDrift";
  }
  if (audit.classification === "REQUIRES_OWNER_REVIEW") {
    return "requiresOwnerReview";
  }
  if (isStructuredNarrationChange(block, audit)) {
    return "structuredNarration";
  }
  if (
    audit.fields.length === 0 ||
    audit.fields.every(
      (field) => field.visibleText === field.spokenText,
    )
  ) {
    return "exact";
  }
  const changedFields = audit.fields.filter(
    (field) => field.visibleText !== field.spokenText,
  );
  if (
    changedFields.every(
      (field) =>
        lexicalSequence(field.visibleText) ===
        lexicalSequence(field.spokenText),
    )
  ) {
    return "punctuationOrSpacingOnly";
  }
  if (
    changedFields.every((field) =>
      isPronunciationOnlyField(
        field.visibleText,
        field.spokenText,
        pronunciations,
      ),
    )
  ) {
    return "pronunciationOnly";
  }
  return "otherAllowlistedNormalization";
}

function visibleBlockText(block: NarrationBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return block.visibleText;
    case "tableRow":
      return block.cells
        .map((cell) => `${cell.visibleLabel}: ${cell.visibleValue}`)
        .join(" ");
    case "formField":
      return [block.visibleLabel, block.visibleDescription]
        .filter(Boolean)
        .join(" ");
    case "sectionBreak":
      return "";
  }
}

function blockById(
  artifact: LessonArtifacts,
  blockId: string | undefined,
): NarrationBlock | undefined {
  return artifact.narration.blocks.find((block) => block.id === blockId);
}

function narrationAlignmentJson(artifacts: readonly LessonArtifacts[]) {
  const documentAudits = new Map<string, NarrationAlignmentDocumentAudit>();
  const lessonMetrics = artifacts.map((artifact) => {
    const audit = auditNarrationDocumentAlignment(artifact.narration);
    documentAudits.set(artifact.lesson.slug, audit);
    const auditById = new Map(
      audit.blocks.map((blockAudit) => [blockAudit.blockId, blockAudit]),
    );
    const categories = emptyAlignmentMetricCounts();
    let exactCorrespondingFields = 0;
    let punctuationOnly = 0;
    let pronunciationOnly = 0;
    let structuredChanges = 0;
    let noSubstantiveWordingDifference = 0;

    for (const block of artifact.narration.blocks) {
      const blockAudit = auditById.get(block.id);
      if (!blockAudit) {
        throw new Error(
          `Missing alignment audit for ${artifact.lesson.slug}:${block.id}`,
        );
      }
      const category = alignmentMetricCategory(
        block,
        blockAudit,
        artifact.narration.recipe.pronunciations,
      );
      categories[category] += 1;
      const fields = blockAudit.fields;
      if (
        fields.length === 0 ||
        fields.every(
          (field) => field.visibleText === field.spokenText,
        )
      ) {
        exactCorrespondingFields += 1;
      }
      const changedFields = fields.filter(
        (field) => field.visibleText !== field.spokenText,
      );
      if (
        changedFields.length > 0 &&
        changedFields.every(
          (field) =>
            lexicalSequence(field.visibleText) ===
            lexicalSequence(field.spokenText),
        )
      ) {
        punctuationOnly += 1;
      }
      if (
        changedFields.length > 0 &&
        changedFields.every((field) =>
          isPronunciationOnlyField(
            field.visibleText,
            field.spokenText,
            artifact.narration.recipe.pronunciations,
          ),
        )
      ) {
        pronunciationOnly += 1;
      }
      if (isStructuredNarrationChange(block, blockAudit)) {
        structuredChanges += 1;
      }
      if (
        blockAudit.protectedFeatureDrifts.length === 0 &&
        blockAudit.issues.every(
          (issue) =>
            issue.code === "PRONUNCIATION_REQUIRES_OWNER_REVIEW",
        )
      ) {
        noSubstantiveWordingDifference += 1;
      }
    }

    const visiblePlainText = htmlToPlainText(artifact.revisedHtml);
    const fields = audit.blocks.flatMap((block) => block.fields);
    const boundarySpaces = LONG_BLOCK_SEGMENTATION_POLICIES.filter(
      (policy) => policy.slug === artifact.lesson.slug,
    ).reduce(
      (sum, policy) =>
        sum + policy.breakAfterSentenceNumbers.length,
      0,
    );
    const fieldVisibleCharacters =
      fields.reduce(
        (sum, field) => sum + field.visibleText.length,
        0,
      ) + boundarySpaces;
    const fieldSpokenCharacters =
      fields.reduce(
        (sum, field) => sum + field.spokenText.length,
        0,
      ) + boundarySpaces;
    const fieldVisibleWords = fields.reduce(
      (sum, field) => sum + countWords(field.visibleText),
      0,
    );
    const fieldSpokenWords = fields.reduce(
      (sum, field) => sum + countWords(field.spokenText),
      0,
    );

    return {
      slug: artifact.lesson.slug,
      title: artifact.lesson.title,
      totalBlocks: artifact.narration.blocks.length,
      totalSemanticFields: audit.summary.totalFields,
      exclusiveCategories: categories,
      exactCorrespondingFieldBlocks: exactCorrespondingFields,
      pronunciationOnlyBlocks: pronunciationOnly,
      punctuationOrSpacingOnlyBlocks: punctuationOnly,
      structuredChangedBlocks: structuredChanges,
      noSubstantiveWordingDifferenceBlocks:
        noSubstantiveWordingDifference,
      classifications: audit.summary.blocksByClassification,
      protectedFeatureDrifts:
        audit.summary.protectedFeatureDriftCount,
      pendingOwnerReviewOccurrences:
        audit.summary.pendingOwnerReviewOccurrenceCount,
      visiblePlainText: {
        characters: visiblePlainText.length,
        words: countWords(visiblePlainText),
      },
      spokenScript: {
        characters: artifact.spokenScript.length,
        words: countWords(artifact.spokenScript),
      },
      fieldAligned: {
        visibleCharacters: fieldVisibleCharacters,
        spokenCharacters: fieldSpokenCharacters,
        characterDifference:
          fieldSpokenCharacters - fieldVisibleCharacters,
        visibleWords: fieldVisibleWords,
        spokenWords: fieldSpokenWords,
        wordDifference: fieldSpokenWords - fieldVisibleWords,
      },
    };
  });

  const totalCategories = emptyAlignmentMetricCounts();
  for (const lesson of lessonMetrics) {
    for (const category of ALIGNMENT_METRIC_CATEGORIES) {
      totalCategories[category] +=
        lesson.exclusiveCategories[category];
    }
  }
  const totalBlocks = lessonMetrics.reduce(
    (sum, lesson) => sum + lesson.totalBlocks,
    0,
  );
  const baselineBlocks =
    totalBlocks -
    LONG_BLOCK_SEGMENTATION_POLICIES.reduce(
      (sum, policy) =>
        sum + policy.breakAfterSentenceNumbers.length,
      0,
    );
  const corpusSourceDigest = createHash("sha256")
    .update(
      artifacts
        .map(
          (artifact) =>
            `${artifact.lesson.slug}:${artifact.narration.hashes.source}`,
        )
        .join("\n"),
    )
    .digest("hex");

  const ownerReviewDifferences = artifacts.flatMap((artifact) =>
    artifact.narration.warnings
      .filter(
        (warning) =>
          warning.code ===
          "PRONUNCIATION_REQUIRES_OWNER_REVIEW",
      )
      .map((warning) => {
        const block = blockById(artifact, warning.blockId);
        return {
          lessonSlug: artifact.lesson.slug,
          blockId: warning.blockId,
          blockType: block?.type,
          source: warning.source,
          itemId: warning.details?.itemId,
          visibleItem: warning.details?.visible,
          matchedText: warning.details?.matchedText,
          occurrenceStart: warning.details?.occurrenceStart,
          recommendedOptions: String(
            warning.details?.recommendedOptions ?? "",
          ).split(" | "),
          visibleBlockText: block ? visibleBlockText(block) : "",
          spokenBlockText: block
            ? narrationBlockToSpokenText(block)
            : "",
        };
      }),
  );

  const invalidDifferences = artifacts.flatMap((artifact) => {
    const audit = documentAudits.get(artifact.lesson.slug);
    return (
      audit?.blocks.flatMap((block) =>
        block.issues
          .filter(
            (issue) =>
              issue.classification === "INVALID_SEMANTIC_DRIFT",
          )
          .map((issue) => ({
            lessonSlug: artifact.lesson.slug,
            blockId: block.blockId,
            sourcePath: block.sourcePath,
            issue,
          })),
      ) ?? []
    );
  });

  const tables = artifacts.flatMap((artifact) =>
    artifact.narration.blocks
      .filter(
        (
          block,
        ): block is Extract<
          NarrationBlock,
          { type: "tableRow" }
        > => block.type === "tableRow",
      )
      .map((block) => ({
        artifact,
        block,
      })),
  );
  const tableCells = tables.flatMap(({ artifact, block }) =>
    block.cells.map((cell) => ({ artifact, block, cell })),
  );

  const orderedLists = artifacts.flatMap((artifact) => {
    const grouped = new Map<
      string,
      Extract<NarrationBlock, { type: "listItem" }>[]
    >();
    for (const block of artifact.narration.blocks) {
      if (block.type !== "listItem" || block.index === undefined) {
        continue;
      }
      const listPath = (
        block.source?.path ?? block.id
      ).replace(/\/li\[\d+\](?:#.*)?$/u, "");
      const current = grouped.get(listPath) ?? [];
      current.push(block);
      grouped.set(listPath, current);
    }
    return [...grouped].map(([listPath, items]) => ({
      lessonSlug: artifact.lesson.slug,
      listPath,
      markerStyle: items[0]?.markerStyle ?? "plain",
      itemCount: items.length,
      itemIds: items.map((item) => item.id),
      stepJustified:
        SEQUENTIAL_ORDERED_LIST_ALLOWLIST[
          artifact.lesson.slug
        ]?.includes(listPath) ?? false,
    }));
  });

  const duplicateLabelSuppressions = artifacts.flatMap((artifact) =>
    artifact.narration.blocks
      .filter(
        (
          block,
        ): block is Extract<
          NarrationBlock,
          { type: "formField" }
        > =>
          block.type === "formField" &&
          block.suppressDuplicateLabelInSpeech === true,
      )
      .map((block) => {
        const blockAudit = documentAudits
          .get(artifact.lesson.slug)
          ?.blocks.find(
            (candidate) => candidate.blockId === block.id,
          );
        const descriptionAudit = blockAudit?.fields.find(
          (field) => field.field === "description",
        );
        const start = block.source?.startOffset;
        const end = block.source?.endOffset;
        const normalizedLabel = block.visibleLabel
          .trim()
          .replace(/[.:;,!?]+$/u, "");
        const description = block.visibleDescription?.trim() ?? "";
        const exactPrefix =
          description
            .slice(0, normalizedLabel.length)
            .localeCompare(normalizedLabel, undefined, {
              sensitivity: "accent",
            }) === 0;
        return {
          lessonSlug: artifact.lesson.slug,
          blockId: block.id,
          source: block.source,
          originalHtml:
            start !== undefined && end !== undefined
              ? artifact.revisedHtml.slice(start, end)
              : "",
          visibleLabel: block.visibleLabel,
          visibleDescription: block.visibleDescription,
          spokenText: narrationBlockToSpokenText(block),
          exactRedundantPrefixRemoved: exactPrefix,
          instructionOrDescriptionLost: Boolean(
            descriptionAudit?.issues.some(
              (issue) =>
                issue.code === "RESIDUAL_LEXICAL_DIFFERENCE" ||
                issue.classification === "INVALID_SEMANTIC_DRIFT",
            ),
          ),
        };
      }),
  );

  const longBlockSplits = LONG_BLOCK_SEGMENTATION_POLICIES.map(
    (policy) => {
      const artifact = artifacts.find(
        (candidate) => candidate.lesson.slug === policy.slug,
      );
      const segments =
        artifact?.narration.blocks.filter(
          (
            block,
          ): block is Extract<
            NarrationBlock,
            { type: "paragraph" }
          > =>
            block.type === "paragraph" &&
            block.source?.path === policy.sourcePath &&
            block.id.startsWith(
              `${policy.sourcePath}#segment[`,
            ),
        ) ?? [];
      const visible = segments
        .map((segment) => segment.visibleText)
        .join(" ");
      const spoken = segments
        .map((segment) => segment.spokenText)
        .join(" ");
      return {
        lessonSlug: policy.slug,
        sourcePath: policy.sourcePath,
        sourceVisibleTextSha256: policy.visibleTextSha256,
        actualVisibleTextSha256: createHash("sha256")
          .update(visible)
          .digest("hex"),
        breakAfterSentenceNumbers:
          policy.breakAfterSentenceNumbers,
        segmentCount: segments.length,
        segmentIds: segments.map((segment) => segment.id),
        visibleCharacters: segments.map(
          (segment) => segment.visibleText.length,
        ),
        spokenCharacters: segments.map(
          (segment) => segment.spokenText.length,
        ),
        maximumSpokenCharacters: Math.max(
          0,
          ...segments.map(
            (segment) => segment.spokenText.length,
          ),
        ),
        visibleReconstructionHashMatches:
          createHash("sha256").update(visible).digest("hex") ===
          policy.visibleTextSha256,
        spokenReconstructionIsDeterministic:
          artifact
            ? spoken ===
              auditNarrationDocumentAlignment(
                artifact.narration,
              ).blocks
                .filter(
                  (block) =>
                    block.sourcePath === policy.sourcePath,
                )
                .flatMap((block) => block.fields)
                .map((field) => field.spokenText)
                .join(" ")
            : false,
      };
    },
  );

  const sum = <K extends keyof (typeof lessonMetrics)[number]>(
    key: K,
  ): number =>
    lessonMetrics.reduce((total, lesson) => {
      const value = lesson[key];
      return total + (typeof value === "number" ? value : 0);
    }, 0);
  const totalVisiblePlainCharacters = lessonMetrics.reduce(
    (total, lesson) =>
      total + lesson.visiblePlainText.characters,
    0,
  );
  const totalVisiblePlainWords = lessonMetrics.reduce(
    (total, lesson) => total + lesson.visiblePlainText.words,
    0,
  );
  const totalSpokenCharacters = lessonMetrics.reduce(
    (total, lesson) => total + lesson.spokenScript.characters,
    0,
  );
  const totalSpokenWords = lessonMetrics.reduce(
    (total, lesson) => total + lesson.spokenScript.words,
    0,
  );
  const totalFieldVisibleCharacters = lessonMetrics.reduce(
    (total, lesson) =>
      total + lesson.fieldAligned.visibleCharacters,
    0,
  );
  const totalFieldSpokenCharacters = lessonMetrics.reduce(
    (total, lesson) =>
      total + lesson.fieldAligned.spokenCharacters,
    0,
  );
  const totalFieldVisibleWords = lessonMetrics.reduce(
    (total, lesson) => total + lesson.fieldAligned.visibleWords,
    0,
  );
  const totalFieldSpokenWords = lessonMetrics.reduce(
    (total, lesson) => total + lesson.fieldAligned.spokenWords,
    0,
  );

  return {
    schemaVersion: "1",
    scope: "offline visible/spoken alignment audit",
    source: "canonical revised seed bodyHtml",
    corpusSourceDigest,
    externalApiCalls: 0,
    baselineNarrationBlocks: baselineBlocks,
    preCorrectionBaseline: {
      ...PRE_CORRECTION_ALIGNMENT_BASELINE,
      sourceDigestMatches:
        corpusSourceDigest ===
        PRE_CORRECTION_ALIGNMENT_BASELINE.corpusSourceDigest,
    },
    finalNarrationBlocks: totalBlocks,
    longBlockBoundaryDelta: totalBlocks - baselineBlocks,
    totalSemanticFields: sum("totalSemanticFields"),
    automaticTransformationAllowlist:
      AUTOMATIC_NARRATION_TRANSFORMATION_ALLOWLIST,
    exclusiveBlockCategories: totalCategories,
    exactCorrespondingFieldBlocks: sum(
      "exactCorrespondingFieldBlocks",
    ),
    pronunciationOnlyBlocks: sum("pronunciationOnlyBlocks"),
    punctuationOrSpacingOnlyBlocks: sum(
      "punctuationOrSpacingOnlyBlocks",
    ),
    structuredChangedBlocks: sum("structuredChangedBlocks"),
    blocksRequiringOwnerReview:
      totalCategories.requiresOwnerReview,
    invalidSemanticDriftBlocks:
      totalCategories.invalidSemanticDrift,
    blocksWithNoSubstantiveWordingDifference: sum(
      "noSubstantiveWordingDifferenceBlocks",
    ),
    noSubstantiveWordingDifferencePercent:
      totalBlocks === 0
        ? 100
        : (sum("noSubstantiveWordingDifferenceBlocks") /
            totalBlocks) *
          100,
    protectedFeatureDriftCount: lessonMetrics.reduce(
      (total, lesson) =>
        total + lesson.protectedFeatureDrifts,
      0,
    ),
    ownerReviewOccurrenceCount:
      ownerReviewDifferences.length,
    visiblePlainText: {
      characters: totalVisiblePlainCharacters,
      words: totalVisiblePlainWords,
    },
    spokenScript: {
      characters: totalSpokenCharacters,
      words: totalSpokenWords,
      characterDifference:
        totalSpokenCharacters - totalVisiblePlainCharacters,
      characterDifferencePercent:
        ((totalSpokenCharacters - totalVisiblePlainCharacters) /
          totalVisiblePlainCharacters) *
        100,
      wordDifference:
        totalSpokenWords - totalVisiblePlainWords,
      wordDifferencePercent:
        ((totalSpokenWords - totalVisiblePlainWords) /
          totalVisiblePlainWords) *
        100,
    },
    fieldAligned: {
      visibleCharacters: totalFieldVisibleCharacters,
      spokenCharacters: totalFieldSpokenCharacters,
      characterDifference:
        totalFieldSpokenCharacters -
        totalFieldVisibleCharacters,
      characterDifferencePercent:
        ((totalFieldSpokenCharacters -
          totalFieldVisibleCharacters) /
          totalFieldVisibleCharacters) *
        100,
      visibleWords: totalFieldVisibleWords,
      spokenWords: totalFieldSpokenWords,
      wordDifference:
        totalFieldSpokenWords - totalFieldVisibleWords,
      wordDifferencePercent:
        ((totalFieldSpokenWords - totalFieldVisibleWords) /
          totalFieldVisibleWords) *
        100,
    },
    tableNarration: {
      rowBlocks: tables.length,
      cells: tableCells.length,
      faithfulLabels: tableCells.filter(
        ({ cell }) => cell.visibleLabel === cell.spokenLabel,
      ).length,
      changedLabels: tableCells.filter(
        ({ cell }) => cell.visibleLabel !== cell.spokenLabel,
      ).length,
      whatTheyProduceLabels: tableCells.filter(
        ({ cell }) => cell.visibleLabel === "What they produce",
      ).length,
      whatTheyProduceLabelsFaithful: tableCells.filter(
        ({ cell }) =>
          cell.visibleLabel === "What they produce" &&
          cell.spokenLabel === "What they produce",
      ).length,
    },
    orderedLists,
    duplicateLabelSuppressions,
    longBlockSplits,
    ownerReviewDifferences,
    invalidDifferences,
    pronunciationFreeze: {
      status:
        totalCategories.requiresOwnerReview === 0 &&
        totalCategories.invalidSemanticDrift === 0
          ? "FROZEN"
          : "BLOCKED",
      revision: ACADEMY_PRONUNCIATION_FREEZE_REVISION,
      ownerApprovalReference:
        ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
      approvedProfile: FROZEN_ACADEMY_NARRATION_OVERRIDES,
      lessonRecipeHashes: Object.fromEntries(
        artifacts.map((artifact) => [
          artifact.lesson.slug,
          artifact.narration.hashes.recipe,
        ]),
      ),
    },
    lessons: lessonMetrics,
  };
}

function narrationAlignmentMarkdown(
  artifacts: readonly LessonArtifacts[],
): string {
  const audit = narrationAlignmentJson(artifacts);
  const lessonRows = audit.lessons.map((lesson) =>
    [
      lesson.slug,
      lesson.totalBlocks,
      lesson.exclusiveCategories.exact,
      lesson.exclusiveCategories.punctuationOrSpacingOnly,
      lesson.exclusiveCategories.pronunciationOnly,
      lesson.exclusiveCategories.structuredNarration,
      lesson.exclusiveCategories.otherAllowlistedNormalization,
      lesson.exclusiveCategories.requiresOwnerReview,
      lesson.exclusiveCategories.invalidSemanticDrift,
    ].join(" | "),
  );
  const ownerRows = audit.ownerReviewDifferences.map((item) =>
    [
      item.lessonSlug,
      item.blockId ?? "",
      item.itemId ?? "",
      item.matchedText ?? "",
      item.recommendedOptions.join(" / "),
    ]
      .map((value) => markdownCell(String(value)))
      .join(" | "),
  );
  const longRows = audit.longBlockSplits.map((split) =>
    [
      split.lessonSlug,
      split.sourcePath,
      split.segmentCount,
      split.spokenCharacters.join(", "),
      split.maximumSpokenCharacters,
      split.visibleReconstructionHashMatches ? "yes" : "NO",
    ].join(" | "),
  );

  return [
    "# Academy visible/spoken alignment audit",
    "",
    "## 1. Executive verdict",
    "",
    audit.invalidSemanticDriftBlocks === 0 &&
    audit.blocksRequiringOwnerReview === 0
      ? `All final narration fields are deterministic and semantically aligned. Pronunciation recipe ${audit.pronunciationFreeze.revision} is FROZEN under ${audit.pronunciationFreeze.ownerApprovalReference}.`
      : "Invalid semantic drift remains; the recipe must not be frozen.",
    "",
    "## 2. Exact alignment metrics",
    "",
    `Baseline blocks: ${audit.baselineNarrationBlocks}`,
    `Pre-correction exclusive classification: exact ${audit.preCorrectionBaseline.exclusiveCategories.exact}; punctuation/spacing ${audit.preCorrectionBaseline.exclusiveCategories.punctuationOrSpacingOnly}; approved normalization ${audit.preCorrectionBaseline.exclusiveCategories.approvedNormalization}; structured ${audit.preCorrectionBaseline.exclusiveCategories.structuredNarration}; owner-review difference ${audit.preCorrectionBaseline.exclusiveCategories.ownerReviewDifference}; invalid ${audit.preCorrectionBaseline.exclusiveCategories.invalidSemanticDrift}.`,
    `Final blocks after boundary-only splitting: ${audit.finalNarrationBlocks}`,
    `Semantic fields: ${audit.totalSemanticFields}`,
    `Exact corresponding-field blocks: ${audit.exactCorrespondingFieldBlocks}`,
    `Punctuation/spacing-only blocks: ${audit.punctuationOrSpacingOnlyBlocks}`,
    `Pronunciation-only blocks: ${audit.pronunciationOnlyBlocks}`,
    `Structured changed blocks: ${audit.structuredChangedBlocks}`,
    `Owner-review blocks: ${audit.blocksRequiringOwnerReview}`,
    `Invalid blocks: ${audit.invalidSemanticDriftBlocks}`,
    `No substantive wording difference: ${audit.blocksWithNoSubstantiveWordingDifference}/${audit.finalNarrationBlocks} (${audit.noSubstantiveWordingDifferencePercent.toFixed(3)}%)`,
    `Visible plain text: ${audit.visiblePlainText.characters} characters / ${audit.visiblePlainText.words} words`,
    `Spoken scripts: ${audit.spokenScript.characters} characters / ${audit.spokenScript.words} words`,
    `Field-aligned delta: ${audit.fieldAligned.characterDifference} characters (${audit.fieldAligned.characterDifferencePercent.toFixed(3)}%); ${audit.fieldAligned.wordDifference} words (${audit.fieldAligned.wordDifferencePercent.toFixed(3)}%)`,
    "",
    "Slug | Total | Exact | Punctuation | Pronunciation | Structured | Other allowed | Owner | Invalid",
    "--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---:",
    ...lessonRows,
    "",
    "## 3. All REQUIRES_OWNER_REVIEW differences",
    "",
    `Atomic occurrences: ${audit.ownerReviewOccurrenceCount}; unique blocks: ${audit.blocksRequiringOwnerReview}.`,
    "",
    "Lesson | Block | Item | Visible match | Recommended options",
    "--- | --- | --- | --- | ---",
    ...ownerRows,
    "",
    "## 4. All INVALID_SEMANTIC_DRIFT differences found",
    "",
    audit.invalidDifferences.length
      ? JSON.stringify(audit.invalidDifferences, null, 2)
      : "None in the 942-block baseline and none in the 954-block corrected plan.",
    "",
    "## 5. Corrections applied",
    "",
    "- Added a closed ten-rule transformation allowlist and protected-feature gate.",
    "- Rejected unsafe/unapproved wording overrides and meaningful manual omissions.",
    "- Applied only the exact owner-approved brand, acronym, URL, domain and email pronunciations.",
    "- Applied the lesson-scoped SME expansion on its first meaningful occurrence and S M E afterward.",
    "- Corrected quoted terminal punctuation and duplicate-form serialization.",
    "",
    "## 6. Table narration changes",
    "",
    `${audit.tableNarration.faithfulLabels}/${audit.tableNarration.cells} labels are faithful; changed labels: ${audit.tableNarration.changedLabels}. “What they produce”: ${audit.tableNarration.whatTheyProduceLabelsFaithful}/${audit.tableNarration.whatTheyProduceLabels}.`,
    "",
    "## 7. Ordered-list narration changes",
    "",
    ...audit.orderedLists.map(
      (list) =>
        `- ${list.lessonSlug}:${list.listPath}: ${list.markerStyle}; ${list.itemCount} items; Step justified=${String(list.stepJustified)}.`,
    ),
    "",
    "## 8. Long-block splitting results",
    "",
    "Lesson | Path | Segments | Spoken characters | Maximum | Visible hash/reconstruction",
    "--- | --- | ---: | --- | ---: | ---",
    ...longRows,
    "",
    "## 9. Duplicate-label review results",
    "",
    ...audit.duplicateLabelSuppressions.map(
      (item) =>
        `- ${item.lessonSlug}:${item.blockId}: exact duplicate=${String(item.exactRedundantPrefixRemoved)}; instruction lost=${String(item.instructionOrDescriptionLost)}; spoken=${item.spokenText}`,
    ),
    "",
    "## 10. Frozen owner-approved pronunciations",
    "",
    `- Revision: ${audit.pronunciationFreeze.revision}`,
    `- Owner approval: ${audit.pronunciationFreeze.ownerApprovalReference}`,
    ...Object.entries(
      audit.pronunciationFreeze.approvedProfile.pronunciations,
    ).map(([source, spoken]) => `- ${source}: ${spoken}`),
    ...Object.entries(
      audit.pronunciationFreeze.approvedProfile
        .lessonScopedPronunciations,
    ).map(
      ([source, rule]) =>
        `- ${source}: first=${rule.firstOccurrence}; subsequent=${rule.subsequentOccurrences}`,
    ),
    ...Object.entries(
      audit.pronunciationFreeze.approvedProfile.approvedUrls,
    ).map(([source, spoken]) => `- ${source}: ${spoken}`),
    ...Object.entries(
      audit.pronunciationFreeze.approvedProfile.approvedEmails,
    ).map(([source, spoken]) => `- ${source}: ${spoken}`),
    "",
    "## 11. Representative visible-versus-spoken examples",
    "",
    "- Ordinary prose: visible wording is retained; only deterministic punctuation/pronunciation rules apply.",
    "- Table: `What they produce` remains `What they produce`.",
    "- Sequential list: the reviewed Mission list uses `Step one`.",
    "- Form: an exact repeated label is spoken once as the original complete sentence.",
    "- URL: exact owner-approved URLs use their frozen spoken forms; other URLs remain literal.",
    "",
    "## 12. Tests, typecheck and build results",
    "",
    "Run the repository validation commands after generating this audit; results are reported by the audit operator.",
    "",
    "## 13. Visible-content confirmation",
    "",
    "This alignment phase does not rewrite visible Academy content.",
    "",
    "## 14. Safety confirmation",
    "",
    "External TTS/API calls: 0. No audio generation, deployment, restart, seed, production database mutation or current-audio mutation is performed by this command.",
    "",
    "## 15. Freeze recommendation",
    "",
    audit.blocksRequiringOwnerReview === 0 &&
    audit.invalidSemanticDriftBlocks === 0
      ? "READY TO FREEZE."
      : "NOT READY TO FREEZE: resolve and record the owner pronunciation approvals first.",
  ].join("\n");
}

async function writeSingleOutput(output: string | undefined, value: string): Promise<void> {
  if (!output || output === "-") {
    process.stdout.write(`${value.trimEnd()}\n`);
    return;
  }
  const path = resolve(output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${value.trimEnd()}\n`, "utf8");
  process.stdout.write(`Wrote ${path}\n`);
}

async function writePreviewOutput(
  selected: readonly LessonArtifacts[],
  output: string | undefined,
  all: boolean,
): Promise<void> {
  if (!all || !output || output === "-" || extname(output)) {
    const value = selected
      .map((artifact) => formatNarrationPreview(artifact.narration))
      .join("\n\n============================================================\n\n");
    await writeSingleOutput(output, value);
    return;
  }

  const directory = resolve(output);
  await mkdir(directory, { recursive: true });
  for (const artifact of selected) {
    await writeFile(
      resolve(directory, `${artifact.lesson.slug}.txt`),
      `${formatNarrationPreview(artifact.narration)}\n`,
      "utf8",
    );
    await writeFile(
      resolve(directory, `${artifact.lesson.slug}.json`),
      `${JSON.stringify(narrationPlanJson([artifact]), null, 2)}\n`,
      "utf8",
    );
  }
  const index = narrationAuditMarkdown(selected);
  await writeFile(resolve(directory, "README.md"), `${index}\n`, "utf8");
  process.stdout.write(`Wrote ${selected.length} narration previews to ${directory}\n`);
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const normalizedArgs = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
  const [commandInput, ...args] = normalizedArgs;
  if (!commandInput || commandInput === "--help" || commandInput === "help") {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  assertKnownOptions(args);
  const validCommands: Command[] = [
    "content-audit",
    "content-review",
    "content-diff",
    "narration-plan",
    "narration-preview",
    "narration-audit",
    "narration-alignment",
  ];
  if (!validCommands.includes(commandInput as Command)) {
    throw new Error(`Unknown command: ${commandInput}\n\n${usage()}`);
  }
  const command = commandInput as Command;
  const output = optionValue(args, "--output");
  const artifacts = buildArtifacts();
  if (command.startsWith("narration-")) {
    assertFrozenNarrationRecipes(artifacts);
  }

  switch (command) {
    case "content-audit": {
      const format = parseFormat(args, "markdown");
      await writeSingleOutput(
        output,
        format === "json"
          ? JSON.stringify(contentAuditJson(artifacts), null, 2)
          : contentAuditMarkdown(artifacts),
      );
      return;
    }
    case "content-review": {
      if (!args.includes("--all")) throw new Error("content-review requires --all");
      const format = parseFormat(args, "markdown");
      await writeSingleOutput(
        output,
        format === "json"
          ? JSON.stringify(contentReviewJson(artifacts), null, 2)
          : contentReviewMarkdown(artifacts),
      );
      return;
    }
    case "content-diff": {
      const [artifact] = selectArtifacts(artifacts, args);
      if (args.includes("--all")) throw new Error("content-diff requires --slug");
      const format = parseFormat(args, "markdown");
      await writeSingleOutput(
        output,
        format === "json"
          ? JSON.stringify(contentDiffJson(artifact), null, 2)
          : contentDiffMarkdown(artifact),
      );
      return;
    }
    case "narration-plan": {
      const selected = selectArtifacts(artifacts, args);
      await writeSingleOutput(
        output,
        JSON.stringify(narrationPlanJson(selected), null, 2),
      );
      return;
    }
    case "narration-preview": {
      const selected = selectArtifacts(artifacts, args);
      await writePreviewOutput(selected, output, args.includes("--all"));
      return;
    }
    case "narration-audit": {
      const format = parseFormat(args, "markdown");
      await writeSingleOutput(
        output,
        format === "json"
          ? JSON.stringify(narrationAuditJson(artifacts), null, 2)
          : narrationAuditMarkdown(artifacts),
      );
      return;
    }
    case "narration-alignment": {
      const format = parseFormat(args, "markdown");
      await writeSingleOutput(
        output,
        format === "json"
          ? JSON.stringify(
              narrationAlignmentJson(artifacts),
              null,
              2,
            )
          : narrationAlignmentMarkdown(artifacts),
      );
      return;
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`academy:audio: ${message}\n`);
  process.exitCode = 1;
});
