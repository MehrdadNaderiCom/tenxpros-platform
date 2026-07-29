import { createHash } from "node:crypto";
import { parseFragment } from "parse5";
import { htmlToPlainText } from "./lesson-html";

export const EDITORIAL_RULE_VERSION = "academy-readability-2026-07-26.v1";
export const CONTENT_REVISION_VERSION = "academy-visible-en-2026-07-26.v1";

export const EDITORIAL_REASON_CATEGORIES = [
  "unnecessarily formal",
  "long sentence",
  "ambiguous reference",
  "avoidable jargon",
  "complex noun phrase",
  "unnatural phrasing",
  "difficult transition",
  "unclear instruction",
  "grammar or punctuation",
  "inconsistent terminology",
  "no change required",
] as const;

export type EditorialReason = (typeof EDITORIAL_REASON_CATEGORIES)[number];
export type EditorialConfidence = "high" | "medium" | "requires owner review";
export type EditorialBlockType =
  | "heading"
  | "paragraph"
  | "listItem"
  | "tableCell"
  | "callout"
  | "formInstruction"
  | "other";

export interface EditorialChange {
  id: string;
  lessonSlug: string;
  contentLocation: string;
  blockType: EditorialBlockType;
  originalText: string;
  revisedText: string;
  reason: EditorialReason;
  readabilityIssue: string;
  meaningRemoved: false;
  confidence: EditorialConfidence;
}

export interface OwnerReviewItem {
  id: string;
  lessonSlug: string;
  contentLocation: string;
  category:
    | "legal"
    | "commercial policy"
    | "assessment"
    | "eligibility"
    | "ethical requirement"
    | "governance"
    | "intellectual property"
    | "core framework";
  retainedText: string;
  proposedRevision: string;
  reason: string;
  status: "requires owner review";
}

export interface ReadabilityStatistics {
  characters: number;
  words: number;
  sentences: number;
  averageWordsPerSentence: number;
  longSentences: number;
  difficultPhrases: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  approximateLevel: "B1" | "B1+" | "B2" | "C1";
}

export interface HtmlStructure {
  headings: number;
  paragraphs: number;
  lists: number;
  listItems: number;
  tables: number;
  tableRows: number;
  tableHeaders: number;
  tableCells: number;
  links: string[];
  images: number;
  callouts: number;
  formPreviews: number;
}

export interface SemanticPreservationResult {
  ok: boolean;
  warnings: string[];
  originalStructure: HtmlStructure;
  revisedStructure: HtmlStructure;
  originalReadability: ReadabilityStatistics;
  revisedReadability: ReadabilityStatistics;
  wordDifferencePercent: number;
}

export interface AcademyLessonForReview {
  slug: string;
  title: string;
  sourceLocation: string;
  bodyHtml: string;
}

export interface Phase0BaselineLesson {
  order: number;
  slug: string;
  title: string;
  sourceLocation: string;
  originalHash: string;
  readability: ReadabilityStatistics;
  retainedTerminology: string[];
  structure: HtmlStructure;
}

export interface Phase0BaselineInventory {
  schemaVersion: "1";
  capturedFromCommit: string;
  lessonCount: number;
  lessons: Phase0BaselineLesson[];
}

export interface LessonReview {
  slug: string;
  title: string;
  sourceLocation: string;
  originalHash: string;
  revisedHash: string;
  original: ReadabilityStatistics;
  revised: ReadabilityStatistics;
  wordDifferencePercent: number;
  changes: EditorialChange[];
  preservation: SemanticPreservationResult;
  retainedTerminology: string[];
  structure: HtmlStructure;
}

type HtmlNode = {
  nodeName?: string;
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: HtmlNode[];
};

const DIFFICULT_PATTERNS = [
  /\bprior to\b/gi,
  /\bsubsequent to\b/gi,
  /\bin order to\b/gi,
  /\bwith regard to\b/gi,
  /\bat this point in time\b/gi,
  /\bcommence(?:ment|d|s)?\b/gi,
  /\butili[sz](?:e|ed|es|ing|ation)\b/gi,
  /\bfacilitat(?:e|ed|es|ing|ion)\b/gi,
  /\boperationali[sz](?:e|ed|es|ing|ation)\b/gi,
  /\bleverage(?:d|s|ing)?\b/gi,
  /\bnotwithstanding\b/gi,
  /\bthereof\b/gi,
  /\bwhereby\b/gi,
  /\baforementioned\b/gi,
  /\bpursuant to\b/gi,
];

const PROTECTED_TERMS = [
  "Activation Gate",
  "Active Status",
  "Academy",
  "AI adoption",
  "B2B",
  "B2C",
  "Certified TenXPro Capstone Seal",
  "Closing",
  "Dossier",
  "Foresee",
  "Frame",
  "Living AI Solution Dossier",
  "Net Receipts",
  "Origination",
  "Partner Panel",
  "Prove",
  "Strong Draft",
  "TenXPro",
  "TenXPros",
  "Design",
  "governance",
  "rubric",
  "stakeholder",
] as const;

const MODALS = ["must", "should", "may", "cannot", "can", "will", "would"] as const;
const NEGATIONS = ["no", "not", "never", "cannot", "without"] as const;
const CONDITION_MARKERS = [
  "after",
  "before",
  "because",
  "except",
  "if",
  "only",
  "unless",
  "until",
  "when",
  "whether",
] as const;
const WARNING_MARKERS = [
  "do not",
  "never",
  "prohibited",
  "required",
  "risk",
  "warning",
] as const;

function round(value: number, places = 2): number {
  const multiplier = 10 ** places;
  return Math.round(value * multiplier) / multiplier;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function countWords(text: string): number {
  return text.match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?(?:-[A-Za-z0-9]+)*/g)?.length ?? 0;
}

export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function countSyllablesInWord(rawWord: string): number {
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (word.length <= 3) return 1;
  const withoutSilentEnding = word
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, "")
    .replace(/^y/i, "");
  return Math.max(1, withoutSilentEnding.match(/[aeiouy]{1,2}/g)?.length ?? 1);
}

export function analyzeReadability(input: string): ReadabilityStatistics {
  const text = input.replace(/\s+/g, " ").trim();
  const wordMatches = text.match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?(?:-[A-Za-z0-9]+)*/g) ?? [];
  const sentences = splitSentences(text);
  const words = wordMatches.length;
  const sentenceCount = Math.max(sentences.length, words > 0 ? 1 : 0);
  const syllables = wordMatches.reduce((total, word) => total + countSyllablesInWord(word), 0);
  const averageWordsPerSentence = sentenceCount ? words / sentenceCount : 0;
  const fleschReadingEase = words
    ? 206.835 - 1.015 * averageWordsPerSentence - 84.6 * (syllables / words)
    : 0;
  const fleschKincaidGrade = words
    ? 0.39 * averageWordsPerSentence + 11.8 * (syllables / words) - 15.59
    : 0;
  const difficultPhrases = DIFFICULT_PATTERNS.reduce(
    (total, pattern) => total + (text.match(pattern)?.length ?? 0),
    0,
  );
  const grade = fleschKincaidGrade;

  return {
    characters: text.length,
    words,
    sentences: sentenceCount,
    averageWordsPerSentence: round(averageWordsPerSentence),
    longSentences: sentences.filter((sentence) => countWords(sentence) > 30).length,
    difficultPhrases,
    fleschReadingEase: round(fleschReadingEase),
    fleschKincaidGrade: round(fleschKincaidGrade),
    approximateLevel: grade <= 8 ? "B1" : grade <= 9.5 ? "B1+" : grade <= 12 ? "B2" : "C1",
  };
}

function getAttribute(node: HtmlNode, name: string): string | undefined {
  return node.attrs?.find((attribute) => attribute.name === name)?.value;
}

export function inspectHtmlStructure(html: string): HtmlStructure {
  const structure: HtmlStructure = {
    headings: 0,
    paragraphs: 0,
    lists: 0,
    listItems: 0,
    tables: 0,
    tableRows: 0,
    tableHeaders: 0,
    tableCells: 0,
    links: [],
    images: 0,
    callouts: 0,
    formPreviews: 0,
  };
  const root = parseFragment(html) as unknown as HtmlNode;

  const visit = (node: HtmlNode): void => {
    const tag = node.tagName;
    if (tag && /^h[2-4]$/.test(tag)) structure.headings += 1;
    if (tag === "p") structure.paragraphs += 1;
    if (tag === "ul" || tag === "ol") structure.lists += 1;
    if (tag === "li") structure.listItems += 1;
    if (tag === "table") structure.tables += 1;
    if (tag === "tr") structure.tableRows += 1;
    if (tag === "th") structure.tableHeaders += 1;
    if (tag === "td") structure.tableCells += 1;
    if (tag === "img") structure.images += 1;
    if (tag === "a") {
      const href = getAttribute(node, "href");
      if (href) structure.links.push(href);
    }
    const classes = (getAttribute(node, "class") ?? "").split(/\s+/);
    if (classes.includes("callout")) structure.callouts += 1;
    if (classes.includes("form-preview")) structure.formPreviews += 1;
    for (const child of node.childNodes ?? []) visit(child);
  };

  visit(root);
  structure.links.sort();
  return structure;
}

function multiset(text: string, pattern: RegExp): Map<string, number> {
  const values = text.match(pattern) ?? [];
  const result = new Map<string, number>();
  for (const value of values) {
    const key = value.toLowerCase();
    result.set(key, (result.get(key) ?? 0) + 1);
  }
  return result;
}

function compareMultisets(label: string, original: Map<string, number>, revised: Map<string, number>): string[] {
  const warnings: string[] = [];
  for (const key of new Set([...original.keys(), ...revised.keys()])) {
    const before = original.get(key) ?? 0;
    const after = revised.get(key) ?? 0;
    if (before !== after) warnings.push(`${label} changed: ${key} (${before} -> ${after})`);
  }
  return warnings;
}

function compareMultisetsForLoss(
  label: string,
  original: Map<string, number>,
  revised: Map<string, number>,
): string[] {
  const warnings: string[] = [];
  for (const [key, before] of original) {
    const after = revised.get(key) ?? 0;
    if (after < before) {
      warnings.push(`${label} may have been lost: ${key} (${before} -> ${after})`);
    }
  }
  return warnings;
}

export function assessSemanticPreservation(originalHtml: string, revisedHtml: string): SemanticPreservationResult {
  const originalText = htmlToPlainText(originalHtml);
  const revisedText = htmlToPlainText(revisedHtml);
  const originalStructure = inspectHtmlStructure(originalHtml);
  const revisedStructure = inspectHtmlStructure(revisedHtml);
  const originalReadability = analyzeReadability(originalText);
  const revisedReadability = analyzeReadability(revisedText);
  const warnings: string[] = [];

  const structureFields: Array<Exclude<keyof HtmlStructure, "links">> = [
    "headings",
    "paragraphs",
    "lists",
    "listItems",
    "tables",
    "tableRows",
    "tableHeaders",
    "tableCells",
    "images",
    "callouts",
    "formPreviews",
  ];
  for (const field of structureFields) {
    if (originalStructure[field] !== revisedStructure[field]) {
      warnings.push(`HTML structure changed: ${field} (${originalStructure[field]} -> ${revisedStructure[field]})`);
    }
  }
  if (JSON.stringify(originalStructure.links) !== JSON.stringify(revisedStructure.links)) {
    warnings.push("Link targets changed");
  }

  warnings.push(
    ...compareMultisets(
      "number/percentage/currency",
      multiset(originalText, /(?:[$€£]\s*)?\b\d[\d,.]*(?:\s*%)?|[$€£]\s*\d[\d,.]*/g),
      multiset(revisedText, /(?:[$€£]\s*)?\b\d[\d,.]*(?:\s*%)?|[$€£]\s*\d[\d,.]*/g),
    ),
    ...compareMultisets(
      "negation",
      multiset(originalText, new RegExp(`\\b(?:${NEGATIONS.join("|")})\\b`, "gi")),
      multiset(revisedText, new RegExp(`\\b(?:${NEGATIONS.join("|")})\\b`, "gi")),
    ),
    ...compareMultisets(
      "modal verb",
      multiset(originalText, new RegExp(`\\b(?:${MODALS.join("|")})\\b`, "gi")),
      multiset(revisedText, new RegExp(`\\b(?:${MODALS.join("|")})\\b`, "gi")),
    ),
    ...compareMultisetsForLoss(
      "condition marker",
      multiset(
        originalText,
        new RegExp(`\\b(?:${CONDITION_MARKERS.join("|")})\\b`, "gi"),
      ),
      multiset(
        revisedText,
        new RegExp(`\\b(?:${CONDITION_MARKERS.join("|")})\\b`, "gi"),
      ),
    ),
    ...compareMultisetsForLoss(
      "warning marker",
      multiset(
        originalText,
        new RegExp(`\\b(?:${WARNING_MARKERS.join("|")})\\b`, "gi"),
      ),
      multiset(
        revisedText,
        new RegExp(`\\b(?:${WARNING_MARKERS.join("|")})\\b`, "gi"),
      ),
    ),
  );

  for (const term of PROTECTED_TERMS) {
    const before = originalText.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"))?.length ?? 0;
    const after = revisedText.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"))?.length ?? 0;
    if (before !== after) warnings.push(`Protected terminology changed: ${term} (${before} -> ${after})`);
  }

  const wordDifferencePercent = originalReadability.words
    ? ((revisedReadability.words - originalReadability.words) / originalReadability.words) * 100
    : 0;
  if (wordDifferencePercent < -3) {
    warnings.push(`Lesson became more than 3% shorter (${round(wordDifferencePercent)}%)`);
  }

  return {
    ok: warnings.length === 0,
    warnings,
    originalStructure,
    revisedStructure,
    originalReadability,
    revisedReadability,
    wordDifferencePercent: round(wordDifferencePercent, 3),
  };
}

function replaceExactlyOnce(input: string, from: string, to: string, context: string): string {
  const first = input.indexOf(from);
  if (first < 0) throw new Error(`${context}: expected text was not found`);
  if (input.indexOf(from, first + from.length) >= 0) {
    throw new Error(`${context}: expected text occurs more than once`);
  }
  return `${input.slice(0, first)}${to}${input.slice(first + from.length)}`;
}

function replaceExactlyOnceOrAlreadyApplied(
  input: string,
  from: string,
  to: string,
  context: string,
): string {
  const fromIndex = input.indexOf(from);
  if (fromIndex >= 0) {
    return replaceExactlyOnce(input, from, to, context);
  }

  const toIndex = input.indexOf(to);
  if (toIndex < 0) {
    throw new Error(`${context}: neither original nor revised text was found`);
  }
  if (input.indexOf(to, toIndex + to.length) >= 0) {
    throw new Error(`${context}: revised text occurs more than once`);
  }
  return input;
}

export function reconstructOriginalHtml(revisedHtml: string, changes: EditorialChange[]): string {
  return [...changes]
    .reverse()
    .reduce(
      (html, change) =>
        replaceExactlyOnceOrAlreadyApplied(
          html,
          change.revisedText,
          change.originalText,
          `${change.lessonSlug}/${change.id}`,
        ),
      revisedHtml,
    );
}

export function applyEditorialChanges(originalHtml: string, changes: EditorialChange[]): string {
  return changes.reduce(
    (html, change) =>
      replaceExactlyOnceOrAlreadyApplied(
        html,
        change.originalText,
        change.revisedText,
        `${change.lessonSlug}/${change.id}`,
      ),
    originalHtml,
  );
}

export function createVisibleContentRevisionHash(originalHtml: string, revisedHtml: string): string {
  return sha256(
    JSON.stringify({
      originalCanonicalContentHash: sha256(originalHtml),
      revisedCanonicalContentHash: sha256(revisedHtml),
      editorialRuleVersion: EDITORIAL_RULE_VERSION,
      approvedContentRevisionVersion: CONTENT_REVISION_VERSION,
    }),
  );
}

export function buildLessonReview(
  lesson: AcademyLessonForReview,
  allChanges: EditorialChange[],
): LessonReview {
  const changes = allChanges.filter((change) => change.lessonSlug === lesson.slug);
  const originalHtml = reconstructOriginalHtml(lesson.bodyHtml, changes);
  const preservation = assessSemanticPreservation(originalHtml, lesson.bodyHtml);
  const retainedTerminology = PROTECTED_TERMS.filter((term) =>
    new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
      htmlToPlainText(lesson.bodyHtml),
    ),
  );

  return {
    slug: lesson.slug,
    title: lesson.title,
    sourceLocation: lesson.sourceLocation,
    originalHash: sha256(originalHtml),
    revisedHash: sha256(lesson.bodyHtml),
    original: preservation.originalReadability,
    revised: preservation.revisedReadability,
    wordDifferencePercent: preservation.wordDifferencePercent,
    changes,
    preservation,
    retainedTerminology,
    structure: preservation.revisedStructure,
  };
}

export function validateEditorialLedger(
  lessons: AcademyLessonForReview[],
  changes: EditorialChange[],
): LessonReview[] {
  const lessonBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]));
  const ids = new Set<string>();
  for (const change of changes) {
    if (ids.has(change.id)) throw new Error(`Duplicate editorial change id: ${change.id}`);
    ids.add(change.id);
    const lesson = lessonBySlug.get(change.lessonSlug);
    if (!lesson) throw new Error(`${change.id}: unknown lesson ${change.lessonSlug}`);
    if (change.originalText === change.revisedText) throw new Error(`${change.id}: revision does not change text`);
    if (change.meaningRemoved !== false) throw new Error(`${change.id}: meaningRemoved must be false`);
    if (change.confidence === "requires owner review") {
      throw new Error(`${change.id}: owner-review changes must not be applied to canonical content`);
    }
  }

  const reviews = lessons.map((lesson) => buildLessonReview(lesson, changes));
  const warnings = reviews.flatMap((review) =>
    review.preservation.warnings.map((warning) => `${review.slug}: ${warning}`),
  );
  if (warnings.length) {
    throw new Error(`Semantic preservation check failed:\n - ${warnings.join("\n - ")}`);
  }
  return reviews;
}

/**
 * Pins the pre-edit canonical snapshot independently of the reversible ledger.
 *
 * Reversing a ledger is useful for producing a readable diff, but by itself it
 * cannot detect an unrelated edit made outside that ledger. These fixed hashes
 * and inventory values make any such drift fail the offline CLI and tests.
 */
export function validatePhase0BaselineInventory(
  lessons: AcademyLessonForReview[],
  changes: EditorialChange[],
  inventory: Phase0BaselineInventory,
): void {
  if (inventory.schemaVersion !== "1") {
    throw new Error(`Unsupported Phase 0 baseline schema: ${inventory.schemaVersion}`);
  }
  if (!/^[a-f0-9]{40}$/.test(inventory.capturedFromCommit)) {
    throw new Error("Phase 0 baseline must identify its source commit");
  }
  if (
    inventory.lessonCount !== lessons.length ||
    inventory.lessons.length !== lessons.length
  ) {
    throw new Error(
      `Phase 0 baseline lesson count changed (${inventory.lessons.length}/${inventory.lessonCount} -> ${lessons.length})`,
    );
  }

  const changeIds = new Set(changes.map((change) => change.id));
  if (changeIds.size !== changes.length) {
    throw new Error("Phase 0 baseline validation requires unique editorial change ids");
  }

  for (const [index, lesson] of lessons.entries()) {
    const baseline = inventory.lessons[index];
    if (
      baseline.order !== index + 1 ||
      baseline.slug !== lesson.slug ||
      baseline.title !== lesson.title ||
      baseline.sourceLocation !== lesson.sourceLocation
    ) {
      throw new Error(
        `Phase 0 baseline identity/order changed at lesson ${index + 1} (${baseline.slug} -> ${lesson.slug})`,
      );
    }

    const lessonChanges = changes.filter(
      (change) => change.lessonSlug === lesson.slug,
    );
    const originalHtml = reconstructOriginalHtml(
      lesson.bodyHtml,
      lessonChanges,
    );
    const originalText = htmlToPlainText(originalHtml);
    const originalHash = sha256(originalHtml);
    const readability = analyzeReadability(originalText);
    const structure = inspectHtmlStructure(originalHtml);
    const retainedTerminology = PROTECTED_TERMS.filter((term) =>
      new RegExp(
        `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      ).test(originalText),
    );

    if (originalHash !== baseline.originalHash) {
      throw new Error(
        `${lesson.slug}: reconstructed original hash does not match the fixed Phase 0 baseline`,
      );
    }
    if (JSON.stringify(readability) !== JSON.stringify(baseline.readability)) {
      throw new Error(`${lesson.slug}: original readability inventory changed`);
    }
    if (JSON.stringify(structure) !== JSON.stringify(baseline.structure)) {
      throw new Error(`${lesson.slug}: original HTML structure inventory changed`);
    }
    if (
      JSON.stringify(retainedTerminology) !==
      JSON.stringify(baseline.retainedTerminology)
    ) {
      throw new Error(`${lesson.slug}: protected terminology inventory changed`);
    }
  }
}

export function validateOwnerReviewItems(
  lessons: AcademyLessonForReview[],
  items: OwnerReviewItem[],
): void {
  const lessonBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]));
  const ids = new Set<string>();

  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`Duplicate owner-review id: ${item.id}`);
    }
    ids.add(item.id);

    const lesson = lessonBySlug.get(item.lessonSlug);
    if (!lesson) {
      throw new Error(`${item.id}: unknown lesson ${item.lessonSlug}`);
    }
    if (item.status !== "requires owner review") {
      throw new Error(`${item.id}: invalid owner-review status`);
    }
    if (item.retainedText === item.proposedRevision) {
      throw new Error(`${item.id}: proposal does not change text`);
    }

    const retainedFragments = item.retainedText
      .split(/\n+/)
      .map((fragment) => fragment.trim())
      .filter(Boolean);
    const lessonPlainText = htmlToPlainText(lesson.bodyHtml);
    for (const fragment of retainedFragments) {
      if (
        !lesson.bodyHtml.includes(fragment) &&
        !lessonPlainText.includes(fragment)
      ) {
        throw new Error(`${item.id}: retained canonical text was not found`);
      }
    }
    if (lesson.bodyHtml.includes(item.proposedRevision)) {
      throw new Error(`${item.id}: owner-review proposal was applied`);
    }
  }
}
