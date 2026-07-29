export interface NarrationPauseProfile {
  sentence: number;
  list: number;
  paragraph: number;
  tableRow: number;
  heading: number;
  section: number;
}

export const DEFAULT_NARRATION_PAUSE_PROFILE = {
  sentence: 220,
  list: 280,
  paragraph: 500,
  tableRow: 400,
  heading: 700,
  section: 900,
} as const satisfies NarrationPauseProfile;

export interface NarrationSourceLocation {
  /**
   * A deterministic semantic path. Unlike byte offsets, this remains useful
   * when a caller only has the rendered narration plan.
   */
  path: string;
  startOffset?: number;
  endOffset?: number;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

interface NarrationBlockBase {
  id: string;
  source?: NarrationSourceLocation;
}

export interface NarrationHeadingBlock extends NarrationBlockBase {
  type: "heading";
  visibleText: string;
  spokenText: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  pauseAfterMs: number;
}

export interface NarrationParagraphBlock extends NarrationBlockBase {
  type: "paragraph";
  visibleText: string;
  spokenText: string;
  pauseAfterMs: number;
}

export interface NarrationListItemBlock extends NarrationBlockBase {
  type: "listItem";
  visibleText: string;
  spokenText: string;
  index?: number;
  markerStyle?: "step" | "ordinal" | "plain";
  pauseAfterMs: number;
}

export interface NarrationTableCell {
  visibleLabel: string;
  visibleValue: string;
  spokenLabel: string;
  spokenValue: string;
}

export interface NarrationTableRowBlock extends NarrationBlockBase {
  type: "tableRow";
  cells: readonly NarrationTableCell[];
  pauseAfterMs: number;
}

export interface NarrationFormFieldBlock extends NarrationBlockBase {
  type: "formField";
  visibleLabel: string;
  spokenLabel: string;
  visibleDescription?: string;
  spokenDescription?: string;
  suppressDuplicateLabelInSpeech?: boolean;
  pauseAfterMs: number;
}

export interface NarrationCalloutBlock extends NarrationBlockBase {
  type: "callout";
  visibleText: string;
  spokenText: string;
  pauseAfterMs: number;
}

export interface NarrationSectionBreakBlock extends NarrationBlockBase {
  type: "sectionBreak";
  pauseAfterMs: number;
}

export type NarrationBlock =
  | NarrationHeadingBlock
  | NarrationParagraphBlock
  | NarrationListItemBlock
  | NarrationTableRowBlock
  | NarrationFormFieldBlock
  | NarrationCalloutBlock
  | NarrationSectionBreakBlock;

export type NarrationWarningSeverity = "info" | "warning" | "error";

export type NarrationWarningCode =
  | "BLOCK_OMITTED_BY_OVERRIDE"
  | "BLOCK_WITHOUT_TERMINAL_PUNCTUATION"
  | "CHUNK_LIMIT_EXCEEDED"
  | "DECORATIVE_ONLY_BLOCK"
  | "DUPLICATE_VISIBLE_TEXT"
  | "DUPLICATE_FORM_LABEL_REMOVED"
  | "EMPTY_BLOCK"
  | "EMPTY_DOCUMENT"
  | "EMPTY_FORM_DESCRIPTION"
  | "EMPTY_FORM_LABEL"
  | "EMPTY_HEADING"
  | "EMPTY_TABLE"
  | "EMPTY_TABLE_CELL"
  | "HEADING_PARAGRAPH_CONCATENATION"
  | "HTML_PARSE_RECOVERY"
  | "IMAGE_ALT_USED_AS_FORM_LABEL"
  | "INVALID_PAUSE_OVERRIDE"
  | "LONG_SPOKEN_BLOCK"
  | "MALFORMED_SPOKEN_PUNCTUATION"
  | "MEANINGFUL_VISUAL_OMITTED"
  | "MERGED_TABLE_CELL"
  | "MISSING_TABLE_HEADER"
  | "NARRATION_ALIGNMENT_INVALID_SEMANTIC_DRIFT"
  | "NARRATION_ALIGNMENT_REQUIRES_OWNER_REVIEW"
  | "OVERRIDE_TARGET_NOT_FOUND"
  | "PRONUNCIATION_REQUIRES_OWNER_REVIEW"
  | "SUSPICIOUS_VISIBLE_SPOKEN_DIFFERENCE"
  | "SYMBOL_HEAVY_CONTENT"
  | "UNNATURAL_URL"
  | "UNRECOGNIZED_ABBREVIATION"
  | "UNSAFE_PRONUNCIATION_RULE"
  | "UNSUPPORTED_ELEMENT"
  | "VISUAL_ONLY_CONTENT_OMITTED";

export interface NarrationWarning {
  code: NarrationWarningCode;
  severity: NarrationWarningSeverity;
  message: string;
  blockId?: string;
  source?: NarrationSourceLocation;
  details?: Readonly<Record<string, string | number | boolean>>;
}

export interface NarrationTableCellOverride {
  spokenLabel?: string;
  spokenValue?: string;
}

export interface NarrationBlockOverride {
  omit?: boolean;
  pauseAfterMs?: number;
  spokenText?: string;
  spokenLabel?: string;
  spokenDescription?: string;
  cells?: Readonly<Record<number, NarrationTableCellOverride>>;
}

/**
 * A deterministic pronunciation whose spoken form depends on its occurrence
 * within one rendered lesson. Counts always reset for a new narration
 * document and follow the actual semantic playback order.
 */
export interface NarrationLessonScopedPronunciation {
  firstOccurrence: string;
  subsequentOccurrences: string;
}

export interface NarrationOverrides {
  /**
   * A human-managed revision label for auditability. The actual override
   * payload is also hashed, so callers cannot accidentally reuse stale audio.
   */
  revision?: string;
  ownerApproval?: {
    reference: string;
    approved: true;
  };
  pauseProfile?: Partial<NarrationPauseProfile>;
  pronunciations?: Readonly<Record<string, string>>;
  lessonScopedPronunciations?: Readonly<
    Record<string, NarrationLessonScopedPronunciation>
  >;
  approvedUrls?: Readonly<Record<string, string>>;
  approvedEmails?: Readonly<Record<string, string>>;
  orderedListStyles?: Readonly<
    Record<string, "step" | "ordinal" | "plain">
  >;
  blocks?: Readonly<Record<string, NarrationBlockOverride>>;
}

export interface NormalizeSpokenTextOptions {
  pronunciations?: Readonly<Record<string, string>>;
  approvedUrls?: Readonly<Record<string, string>>;
  approvedEmails?: Readonly<Record<string, string>>;
  ensureTerminalPunctuation?: boolean;
}

export interface RenderNarrationDocumentInput {
  slug: string;
  title?: string;
  html: string;
  contentRevisionHash?: string;
  overrides?: NarrationOverrides;
}

export interface NarrationRecipeVersions {
  schema: string;
  renderer: string;
  contentRevision: string;
  normalization: string;
  pronunciation: string;
  pause: string;
  alignmentPolicy: string;
  segmentation: string;
}

export interface NarrationRecipe {
  versions: NarrationRecipeVersions;
  pauseProfile: NarrationPauseProfile;
  pronunciations: Readonly<Record<string, string>>;
  lessonScopedPronunciations: Readonly<
    Record<string, NarrationLessonScopedPronunciation>
  >;
  approvedUrls: Readonly<Record<string, string>>;
  approvedEmails: Readonly<Record<string, string>>;
  orderedListStyles: Readonly<
    Record<string, "step" | "ordinal" | "plain">
  >;
  overrideRevision: string;
  ownerApprovalReference: string;
  overridesHash: string;
}

export interface NarrationDocumentHashes {
  source: string;
  contentRevision: string;
  blocks: string;
  recipe: string;
  document: string;
}

export interface NarrationDocumentStats {
  blockCount: number;
  visibleCharacterCount: number;
  spokenCharacterCount: number;
  warningCount: number;
}

export interface NarrationDocument {
  schemaVersion: string;
  slug: string;
  title?: string;
  blocks: readonly NarrationBlock[];
  warnings: readonly NarrationWarning[];
  recipe: NarrationRecipe;
  hashes: NarrationDocumentHashes;
  stats: NarrationDocumentStats;
}

export interface NarrationChunk {
  index: number;
  blockIds: readonly string[];
  spokenText: string;
  characterCount: number;
}
