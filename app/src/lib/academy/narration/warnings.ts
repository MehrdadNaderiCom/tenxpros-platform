import type {
  NarrationBlock,
  NarrationLessonScopedPronunciation,
  NarrationSourceLocation,
  NarrationWarning,
  NarrationWarningCode,
  NarrationWarningSeverity,
} from "./contracts";
import {
  MAX_SAFE_NARRATION_CHUNK_CHARACTERS,
} from "./chunking";
import {
  integerToOrdinalWords,
  integerToSpokenWords,
  normalizeSpokenText,
} from "./normalization";
import {
  ownerReviewPronunciationOccurrencesIn,
  type PronunciationOwnerReviewItem,
} from "./policy";
import {
  applyLessonScopedPronunciationsToText,
  createNarrationScopedPronunciationState,
} from "./scoped-pronunciation";

export const LONG_SPOKEN_BLOCK_WARNING_CHARACTERS = 1_200;
export { MAX_SAFE_NARRATION_CHUNK_CHARACTERS } from "./chunking";

const UPPERCASE_EMPHASIS_WORDS = new Set([
  "AND",
  "AS",
  "AT",
  "BY",
  "COUNT",
  "DO",
  "FOR",
  "FROM",
  "IN",
  "IS",
  "NEW",
  "NO",
  "NOT",
  "OF",
  "ON",
  "OR",
  "OVER",
  "SEAT",
  "THE",
  "TO",
  "WITH",
]);

export interface CreateNarrationWarningInput {
  code: NarrationWarningCode;
  message: string;
  severity?: NarrationWarningSeverity;
  blockId?: string;
  source?: NarrationSourceLocation;
  details?: Readonly<Record<string, string | number | boolean>>;
}

export function createNarrationWarning({
  code,
  message,
  severity = "warning",
  blockId,
  source,
  details,
}: CreateNarrationWarningInput): NarrationWarning {
  return {
    code,
    severity,
    message,
    ...(blockId ? { blockId } : {}),
    ...(source ? { source } : {}),
    ...(details ? { details } : {}),
  };
}

function warningSortKey(warning: NarrationWarning): string {
  const offset = warning.source?.startOffset;
  const normalizedOffset =
    offset === undefined ? "999999999999" : String(offset).padStart(12, "0");
  return [
    normalizedOffset,
    warning.source?.path ?? "",
    warning.blockId ?? "",
    warning.code,
    warning.message,
  ].join("\u0000");
}

function warningIdentity(warning: NarrationWarning): string {
  return [
    warning.code,
    warning.severity,
    warning.blockId ?? "",
    warning.source?.path ?? "",
    warning.message,
    JSON.stringify(warning.details ?? {}),
  ].join("\u0000");
}

export function sortNarrationWarnings(
  warnings: readonly NarrationWarning[],
): NarrationWarning[] {
  return [...warnings].sort((left, right) =>
    warningSortKey(left).localeCompare(warningSortKey(right)),
  );
}

export function dedupeNarrationWarnings(
  warnings: readonly NarrationWarning[],
): NarrationWarning[] {
  const seen = new Set<string>();
  const unique: NarrationWarning[] = [];

  for (const warning of sortNarrationWarnings(warnings)) {
    const identity = warningIdentity(warning);
    if (!seen.has(identity)) {
      seen.add(identity);
      unique.push(warning);
    }
  }

  return unique;
}

interface NarrationTextPair {
  field: string;
  visible: string;
  spoken: string;
  ensureTerminalPunctuation: boolean;
}

function textPairs(block: NarrationBlock): readonly NarrationTextPair[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return [
        {
          field: "text",
          visible: block.visibleText,
          spoken: block.spokenText,
          ensureTerminalPunctuation: true,
        },
      ];
    case "formField":
      return [
        {
          field: "label",
          visible: block.visibleLabel,
          spoken: block.spokenLabel,
          ensureTerminalPunctuation: false,
        },
        {
          field: "description",
          visible: block.visibleDescription ?? "",
          spoken: block.spokenDescription ?? "",
          ensureTerminalPunctuation: true,
        },
      ];
    case "tableRow":
      return block.cells.flatMap((cell, index) => [
        {
          field: `cell.${String(index)}.label`,
          visible: cell.visibleLabel,
          spoken: cell.spokenLabel,
          ensureTerminalPunctuation: false,
        },
        {
          field: `cell.${String(index)}.value`,
          visible: cell.visibleValue,
          spoken: cell.spokenValue,
          ensureTerminalPunctuation: true,
        },
      ]);
    case "sectionBreak":
      return [];
  }
}

function visibleBlockText(block: NarrationBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return block.visibleText;
    case "formField":
      return [block.visibleLabel, block.visibleDescription]
        .filter(Boolean)
        .join(" ");
    case "tableRow":
      return block.cells
        .map((cell) => `${cell.visibleLabel}: ${cell.visibleValue}`)
        .join(" ");
    case "sectionBreak":
      return "";
  }
}

function spokenBlockText(block: NarrationBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return block.spokenText;
    case "formField":
      return block.suppressDuplicateLabelInSpeech
        ? block.spokenDescription ?? ""
        : [
            block.spokenLabel ? `${block.spokenLabel}.` : "",
            block.spokenDescription,
          ]
            .filter(Boolean)
            .join(" ");
    case "tableRow":
      return block.cells
        .map((cell) => `${cell.spokenLabel}: ${cell.spokenValue}`)
        .join(" ");
    case "sectionBreak":
      return "";
  }
}

function normalizedDuplicateKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsUnchangedTerm(value: string, term: string): boolean {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`,
    "u",
  ).test(value);
}

function semanticTokens(value: string): string[] {
  return (
    value
      .toLocaleLowerCase()
      .match(/\p{L}[\p{L}\p{M}'-]*/gu) ?? []
  ).filter((token) => token.length > 1);
}

function tokenCoverage(expected: string, actual: string): number {
  const expectedTokens = semanticTokens(expected);
  if (!expectedTokens.length) return 1;

  const available = new Map<string, number>();
  for (const token of semanticTokens(actual)) {
    available.set(token, (available.get(token) ?? 0) + 1);
  }

  let matched = 0;
  for (const token of expectedTokens) {
    const count = available.get(token) ?? 0;
    if (count > 0) {
      matched += 1;
      available.set(token, count - 1);
    }
  }
  return matched / expectedTokens.length;
}

function isExpectedFormLabelDeduplication(
  block: NarrationBlock,
  pair: NarrationTextPair,
): boolean {
  if (
    block.type !== "formField" ||
    pair.field !== "description" ||
    !block.visibleDescription ||
    !block.spokenDescription
  ) {
    return false;
  }

  const label = normalizedDuplicateKey(block.visibleLabel);
  const description = normalizedDuplicateKey(block.visibleDescription);
  return Boolean(label && description.startsWith(`${label} `));
}

export interface CollectNarrationBlockWarningsOptions {
  pronunciations?: Readonly<Record<string, string>>;
  lessonScopedPronunciations?: Readonly<
    Record<string, NarrationLessonScopedPronunciation>
  >;
  approvedUrls?: Readonly<Record<string, string>>;
  approvedEmails?: Readonly<Record<string, string>>;
  ownerApprovalReference?: string;
}

function hasApprovedOwnerPronunciation(
  item: PronunciationOwnerReviewItem,
  options: CollectNarrationBlockWarningsOptions,
): boolean {
  if (!options.ownerApprovalReference?.trim()) {
    return false;
  }

  const sources = [
    ...Object.entries(options.pronunciations ?? {})
      .filter(([, spoken]) => spoken.trim())
      .map(([source]) => source),
    ...Object.entries(options.lessonScopedPronunciations ?? {})
      .filter(
        ([, rule]) =>
          rule.firstOccurrence.trim() &&
          rule.subsequentOccurrences.trim(),
      )
      .map(([source]) => source),
    ...Object.entries(options.approvedUrls ?? {})
      .filter(([, spoken]) => spoken.trim())
      .map(([source]) => source),
    ...Object.entries(options.approvedEmails ?? {})
      .filter(([, spoken]) => spoken.trim())
      .map(([source]) => source),
  ];
  return sources.some((source) => item.matching.test(source));
}

export function collectNarrationBlockWarnings(
  blocks: readonly NarrationBlock[],
  options: CollectNarrationBlockWarningsOptions = {},
): NarrationWarning[] {
  const warnings: NarrationWarning[] = [];
  const duplicateSources = new Map<string, string>();
  const configuredPronunciations = new Set(
    [
      ...Object.keys(options.pronunciations ?? {}),
      ...Object.keys(options.lessonScopedPronunciations ?? {}),
    ].map((value) => value.toLocaleLowerCase()),
  );
  const scopedState = createNarrationScopedPronunciationState();

  if (!blocks.length) {
    warnings.push(
      createNarrationWarning({
        code: "EMPTY_DOCUMENT",
        severity: "error",
        message: "The source produced no narration blocks.",
      }),
    );
    return warnings;
  }

  for (const block of blocks) {
    const pairs = textPairs(block);
    if (
      block.type !== "sectionBreak" &&
      pairs.every(({ visible, spoken }) => !visible.trim() && !spoken.trim())
    ) {
      warnings.push(
        createNarrationWarning({
          code: "EMPTY_BLOCK",
          severity: "error",
          message: "A semantic block has no visible or spoken content.",
          blockId: block.id,
          source: block.source,
        }),
      );
    }

    const visibleText = visibleBlockText(block);
    const spokenText = spokenBlockText(block);

    for (const occurrence of ownerReviewPronunciationOccurrencesIn(visibleText)) {
      const { item } = occurrence;
      if (hasApprovedOwnerPronunciation(item, options)) {
        continue;
      }
      warnings.push(
        createNarrationWarning({
          code: "PRONUNCIATION_REQUIRES_OWNER_REVIEW",
          severity: "warning",
          message:
            "A pronunciation choice remains unchanged until the owner approves an exact spoken form.",
          blockId: block.id,
          source: block.source,
          details: {
            itemId: item.id,
            visible: item.visible,
            matchedText: occurrence.matchedText,
            occurrenceStart: occurrence.startOffset,
            recommendedOptions: item.recommendedOptions.join(" | "),
          },
        }),
      );
    }
    if (visibleText.trim() && !spokenText.trim()) {
      warnings.push(
        createNarrationWarning({
          code: "DECORATIVE_ONLY_BLOCK",
          severity: "info",
          message:
            "Visible content normalized to no spoken words and may be decorative-only.",
          blockId: block.id,
          source: block.source,
        }),
        createNarrationWarning({
          code: "SUSPICIOUS_VISIBLE_SPOKEN_DIFFERENCE",
          message:
            "Visible content produced an empty spoken representation and requires review.",
          blockId: block.id,
          source: block.source,
          details: { reason: "empty spoken representation" },
        }),
      );
    }

    const duplicateKey = normalizedDuplicateKey(visibleText);
    if (duplicateKey.length >= 20) {
      const firstBlockId = duplicateSources.get(duplicateKey);
      if (firstBlockId) {
        warnings.push(
          createNarrationWarning({
            code: "DUPLICATE_VISIBLE_TEXT",
            severity: "info",
            message:
              "The same visible text appears in more than one narration block.",
            blockId: block.id,
            source: block.source,
            details: { firstBlockId },
          }),
        );
      } else {
        duplicateSources.set(duplicateKey, block.id);
      }
    }

    if (
      spokenText &&
      !/[.!?](?:["')\]]+)?$/u.test(spokenText.trim())
    ) {
      warnings.push(
        createNarrationWarning({
          code: "BLOCK_WITHOUT_TERMINAL_PUNCTUATION",
          message: "The spoken block does not end with terminal punctuation.",
          blockId: block.id,
          source: block.source,
        }),
      );
    }

    if (/(?:[,;:]\s*){2,}|[.!?]\s*[,;:]/u.test(spokenText)) {
      warnings.push(
        createNarrationWarning({
          code: "MALFORMED_SPOKEN_PUNCTUATION",
          message:
            "The spoken block contains an unnatural adjacent punctuation sequence.",
          blockId: block.id,
          source: block.source,
        }),
      );
    }

    if (spokenText.length > LONG_SPOKEN_BLOCK_WARNING_CHARACTERS) {
      warnings.push(
        createNarrationWarning({
          code: "LONG_SPOKEN_BLOCK",
          message:
            "The spoken block is unusually long and should be reviewed for a natural break.",
          blockId: block.id,
          source: block.source,
          details: {
            characters: spokenText.length,
            threshold: LONG_SPOKEN_BLOCK_WARNING_CHARACTERS,
          },
        }),
      );
    }

    if (spokenText.length > MAX_SAFE_NARRATION_CHUNK_CHARACTERS) {
      warnings.push(
        createNarrationWarning({
          code: "CHUNK_LIMIT_EXCEEDED",
          severity: "error",
          message:
            "A single semantic block exceeds the safe future TTS chunk limit.",
          blockId: block.id,
          source: block.source,
          details: {
            characters: spokenText.length,
            threshold: MAX_SAFE_NARRATION_CHUNK_CHARACTERS,
          },
        }),
      );
    }

    const rawUrlMatch = visibleText.match(
      /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:[a-z0-9-]+\.)+(?:com|org|net|edu|gov|co|io|ai)(?:\/[^\s<>"']*)?/i,
    )?.[0];
    const rawUrl = rawUrlMatch?.replace(/[.,!?;:]+$/, "");
    const rawUrlIsApproved = Object.keys(
      options.approvedUrls ?? {},
    ).some(
      (source) =>
        source.trim().toLocaleLowerCase() ===
        rawUrl?.trim().toLocaleLowerCase(),
    );
    if (rawUrl && !rawUrlIsApproved) {
      warnings.push(
        createNarrationWarning({
          code: "UNNATURAL_URL",
          severity: "info",
          message:
            "A visible URL remains literal until an exact spoken form is owner-approved.",
          blockId: block.id,
          source: block.source,
          details: { url: rawUrl },
        }),
      );
    }

    const abbreviations = new Set(
      visibleText.match(/\b(?:[A-Z]{2,8}|[A-Z]\d[A-Z0-9]{1,6})s?\b/g) ?? [],
    );
    for (const abbreviation of abbreviations) {
      if (
        !UPPERCASE_EMPHASIS_WORDS.has(abbreviation) &&
        !configuredPronunciations.has(abbreviation.toLocaleLowerCase()) &&
        containsUnchangedTerm(spokenText, abbreviation)
      ) {
        warnings.push(
          createNarrationWarning({
            code: "UNRECOGNIZED_ABBREVIATION",
            severity: "info",
            message:
              "An uppercase abbreviation has no explicit pronunciation rule.",
            blockId: block.id,
            source: block.source,
            details: { abbreviation },
          }),
        );
      }
    }

    const compactVisibleText = visibleText.replace(/\s+/g, "");
    const symbolCount = (
      visibleText.match(
        /[^\p{L}\p{N}\s.,;:'"!?()\-\u2013\u2014]/gu,
      ) ?? []
    ).length;
    if (
      symbolCount >= 4 &&
      compactVisibleText.length > 0 &&
      symbolCount / compactVisibleText.length >= 0.1
    ) {
      warnings.push(
        createNarrationWarning({
          code: "SYMBOL_HEAVY_CONTENT",
          severity: "info",
          message:
            "The block contains enough symbols to merit a spoken-preview review.",
          blockId: block.id,
          source: block.source,
          details: {
            symbolCount,
            symbolRatio: Number(
              (symbolCount / compactVisibleText.length).toFixed(3),
            ),
          },
        }),
      );
    }

    for (const pair of pairs) {
      if (!pair.visible.trim() || !pair.spoken.trim()) continue;
      const expectedSource =
        block.type === "listItem" &&
        block.index !== undefined &&
        pair.field === "text"
          ? block.markerStyle === "step"
            ? `Step ${integerToSpokenWords(block.index)}: ${pair.visible}`
            : block.markerStyle === "ordinal"
              ? `${integerToOrdinalWords(block.index).replace(
                  /^\p{Ll}/u,
                  (letter) => letter.toLocaleUpperCase(),
                )}: ${pair.visible}`
              : pair.visible
          : pair.visible;
      const deterministicExpected = normalizeSpokenText(expectedSource, {
        pronunciations: options.pronunciations,
        approvedUrls: options.approvedUrls,
        approvedEmails: options.approvedEmails,
        ensureTerminalPunctuation: pair.ensureTerminalPunctuation,
      });
      const expected =
        block.type === "formField" &&
        block.suppressDuplicateLabelInSpeech &&
        pair.field === "label"
          ? deterministicExpected
          : applyLessonScopedPronunciationsToText(
              deterministicExpected,
              options.lessonScopedPronunciations,
              scopedState,
            );
      if (
        expected === pair.spoken ||
        isExpectedFormLabelDeduplication(block, pair)
      ) {
        continue;
      }

      const coverage = tokenCoverage(expected, pair.spoken);
      const lengthRatio = expected.length
        ? pair.spoken.length / expected.length
        : 1;
      if (
        expected.length >= 12 &&
        (coverage < 0.72 || lengthRatio < 0.55 || lengthRatio > 1.8)
      ) {
        warnings.push(
          createNarrationWarning({
            code: "SUSPICIOUS_VISIBLE_SPOKEN_DIFFERENCE",
            message:
              "The spoken wording differs materially from deterministic normalization and requires review.",
            blockId: block.id,
            source: block.source,
            details: {
              field: pair.field,
              tokenCoverage: Number(coverage.toFixed(3)),
              lengthRatio: Number(lengthRatio.toFixed(3)),
            },
          }),
        );
      }
    }

    if (block.type === "tableRow") {
      if (!block.cells.length) {
        warnings.push(
          createNarrationWarning({
            code: "EMPTY_TABLE",
            severity: "error",
            message: "A table row has no semantic cells.",
            blockId: block.id,
            source: block.source,
          }),
        );
      }

      block.cells.forEach((cell, index) => {
        if (!cell.visibleValue.trim() || !cell.spokenValue.trim()) {
          warnings.push(
            createNarrationWarning({
              code: "EMPTY_TABLE_CELL",
              message: "A table cell has no value to narrate.",
              blockId: block.id,
              source: block.source,
              details: { cellIndex: index },
            }),
          );
        }
      });
    }

    if (block.type === "formField") {
      if (!block.visibleLabel.trim() || !block.spokenLabel.trim()) {
        warnings.push(
          createNarrationWarning({
            code: "EMPTY_FORM_LABEL",
            severity: "error",
            message: "A form preview has no usable label.",
            blockId: block.id,
            source: block.source,
          }),
        );
      }

      if (
        !block.visibleDescription?.trim() ||
        !block.spokenDescription?.trim()
      ) {
        warnings.push(
          createNarrationWarning({
            code: "EMPTY_FORM_DESCRIPTION",
            severity: "info",
            message: "A form preview has no description to narrate.",
            blockId: block.id,
            source: block.source,
          }),
        );
      }
    }
  }

  return warnings;
}

export class NarrationWarningCollector {
  readonly #warnings: NarrationWarning[] = [];

  add(warning: NarrationWarning): void {
    this.#warnings.push(warning);
  }

  addInput(input: CreateNarrationWarningInput): void {
    this.add(createNarrationWarning(input));
  }

  addAll(warnings: readonly NarrationWarning[]): void {
    this.#warnings.push(...warnings);
  }

  list(): NarrationWarning[] {
    return dedupeNarrationWarnings(this.#warnings);
  }
}
