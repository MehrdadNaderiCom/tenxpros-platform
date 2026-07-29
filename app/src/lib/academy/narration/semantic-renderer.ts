import { parseFragment } from "parse5";

import {
  auditNarrationBlockAlignment,
  auditNarrationBlocksAlignment,
  type NarrationAlignmentContext,
} from "./alignment";
import type {
  NarrationBlock,
  NarrationBlockOverride,
  NarrationDocument,
  NarrationFormFieldBlock,
  NarrationLessonScopedPronunciation,
  NarrationPauseProfile,
  NarrationSourceLocation,
  NarrationTableCell,
  NarrationWarning,
  RenderNarrationDocumentInput,
} from "./contracts";
import {
  findUnsafePronunciationRules,
  integerToOrdinalWords,
  integerToSpokenWords,
  normalizeSpokenText,
} from "./normalization";
import {
  resolveOrderedListStyle,
  type NarrationOrderedListStyle,
} from "./policy";
import {
  NARRATION_SCHEMA_VERSION,
  createNarrationRecipe,
  hashNarrationBlocks,
  hashNarrationDocument,
  hashNarrationRecipe,
  hashNarrationSource,
} from "./recipe";
import {
  applyLessonScopedPronunciationsToBlocks,
} from "./scoped-pronunciation";
import { segmentLongNarrationBlocks } from "./segmentation";
import {
  NarrationWarningCollector,
  collectNarrationBlockWarnings,
} from "./warnings";

interface HtmlAttribute {
  name: string;
  value: string;
}

interface HtmlSourceLocation {
  startLine?: number;
  startCol?: number;
  startOffset?: number;
  endLine?: number;
  endCol?: number;
  endOffset?: number;
}

interface HtmlNode {
  nodeName: string;
  tagName?: string;
  value?: string;
  attrs?: readonly HtmlAttribute[];
  childNodes?: readonly HtmlNode[];
  sourceCodeLocation?: HtmlSourceLocation | null;
}

interface HtmlNodeWithPath {
  node: HtmlNode;
  path: string;
}

interface HtmlParseError {
  code: string;
  startLine?: number;
  startCol?: number;
  startOffset?: number;
  endLine?: number;
  endCol?: number;
  endOffset?: number;
}

interface RendererContext {
  slug: string;
  pauses: NarrationPauseProfile;
  pronunciations: Readonly<Record<string, string>>;
  lessonScopedPronunciations: Readonly<
    Record<string, NarrationLessonScopedPronunciation>
  >;
  approvedUrls: Readonly<Record<string, string>>;
  approvedEmails: Readonly<Record<string, string>>;
  orderedListStyles: Readonly<Record<string, NarrationOrderedListStyle>>;
  warnings: NarrationWarningCollector;
}

const IGNORED_TAGS = new Set([
  "script",
  "style",
  "template",
  "noscript",
  "svg",
]);

const INLINE_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "br",
  "cite",
  "code",
  "del",
  "em",
  "i",
  "ins",
  "kbd",
  "mark",
  "q",
  "s",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
]);

const CONTAINER_TAGS = new Set([
  "article",
  "aside",
  "div",
  "footer",
  "header",
  "main",
  "nav",
  "section",
]);

const RECOGNIZED_BLOCK_TAGS = new Set([
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "label",
  "ol",
  "p",
  "table",
  "ul",
]);

function isElement(node: HtmlNode): boolean {
  return Boolean(node.tagName);
}

function tagName(node: HtmlNode): string {
  return node.tagName?.toLowerCase() ?? "";
}

function getAttribute(node: HtmlNode, name: string): string | undefined {
  const normalizedName = name.toLowerCase();
  return node.attrs?.find(
    (attribute) => attribute.name.toLowerCase() === normalizedName,
  )?.value;
}

function classNames(node: HtmlNode): readonly string[] {
  return (getAttribute(node, "class") ?? "")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function hasClass(node: HtmlNode, className: string): boolean {
  return classNames(node).includes(className);
}

function isHiddenNode(node: HtmlNode): boolean {
  return (
    getAttribute(node, "hidden") !== undefined ||
    getAttribute(node, "aria-hidden")?.toLocaleLowerCase() === "true"
  );
}

function isCallout(node: HtmlNode): boolean {
  return classNames(node).some(
    (className) => className === "callout" || className.startsWith("callout-"),
  );
}

function childrenWithPaths(node: HtmlNode, parentPath: string): HtmlNodeWithPath[] {
  const counts = new Map<string, number>();

  return (node.childNodes ?? []).map((child) => {
    const name = child.tagName?.toLowerCase() ?? child.nodeName.replace(/^#/, "");
    const index = (counts.get(name) ?? 0) + 1;
    counts.set(name, index);
    return {
      node: child,
      path: `${parentPath}/${name}[${index}]`,
    };
  });
}

function sourceLocation(
  node: HtmlNode,
  path: string,
): NarrationSourceLocation {
  const location = node.sourceCodeLocation;
  return {
    path,
    ...(location?.startOffset !== undefined
      ? { startOffset: location.startOffset }
      : {}),
    ...(location?.endOffset !== undefined
      ? { endOffset: location.endOffset }
      : {}),
    ...(location?.startLine !== undefined
      ? { startLine: location.startLine }
      : {}),
    ...(location?.startCol !== undefined
      ? { startColumn: location.startCol }
      : {}),
    ...(location?.endLine !== undefined ? { endLine: location.endLine } : {}),
    ...(location?.endCol !== undefined
      ? { endColumn: location.endCol }
      : {}),
  };
}

function normalizeVisibleText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function extractText(
  node: HtmlNode,
  options: { excludeNestedLists?: boolean } = {},
): string {
  if (node.nodeName === "#text") {
    return node.value ?? "";
  }

  const tag = tagName(node);
  if (IGNORED_TAGS.has(tag) || tag === "img" || isHiddenNode(node)) {
    return "";
  }
  if (tag === "br") {
    return ". ";
  }
  if (
    options.excludeNestedLists &&
    (tag === "ul" || tag === "ol")
  ) {
    return "";
  }

  return (node.childNodes ?? [])
    .map((child) => extractText(child, options))
    .filter(Boolean)
    .join(" ");
}

function findDescendants(
  node: HtmlNode,
  path: string,
  predicate: (candidate: HtmlNode) => boolean,
  options: { stopAtNestedTable?: boolean } = {},
): HtmlNodeWithPath[] {
  const matches: HtmlNodeWithPath[] = [];

  for (const child of childrenWithPaths(node, path)) {
    if (
      options.stopAtNestedTable &&
      tagName(child.node) === "table" &&
      child.node !== node
    ) {
      continue;
    }

    if (predicate(child.node)) {
      matches.push(child);
    }
    matches.push(
      ...findDescendants(child.node, child.path, predicate, options),
    );
  }

  return matches;
}

function warnForOmittedMeaningfulImages(
  node: HtmlNode,
  path: string,
  context: RendererContext,
): void {
  for (const image of findDescendants(
    node,
    path,
    (candidate) => tagName(candidate) === "img",
  )) {
    const altText = normalizeVisibleText(
      getAttribute(image.node, "alt") ?? "",
    );
    if (altText) {
      context.warnings.addInput({
        code: "MEANINGFUL_VISUAL_OMITTED",
        message:
          "An inline image has meaningful alt text that is not part of the spoken block.",
        source: sourceLocation(image.node, image.path),
        details: { altText },
      });
    }
  }
}

function directElementChildren(
  node: HtmlNode,
  path: string,
  allowedTags?: ReadonlySet<string>,
): HtmlNodeWithPath[] {
  return childrenWithPaths(node, path).filter(
    (child) =>
      isElement(child.node) &&
      (!allowedTags || allowedTags.has(tagName(child.node))),
  );
}

function spokenText(
  visibleText: string,
  context: RendererContext,
  ensureTerminalPunctuation = true,
): string {
  return normalizeSpokenText(visibleText, {
    pronunciations: context.pronunciations,
    approvedUrls: context.approvedUrls,
    approvedEmails: context.approvedEmails,
    ensureTerminalPunctuation,
  });
}

function isValidPause(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 10_000
  );
}

function stripRepeatedFormLabel(
  description: string,
  label: string,
): { removed: boolean } {
  const normalizedDescription = description.trim();
  const normalizedLabel = label.trim().replace(/[.:;,!?]+$/, "");

  if (!normalizedDescription || !normalizedLabel) {
    return { removed: false };
  }

  const prefix = normalizedDescription.slice(0, normalizedLabel.length);
  const boundary = normalizedDescription[normalizedLabel.length] ?? "";
  if (
    prefix.localeCompare(normalizedLabel, undefined, {
      sensitivity: "accent",
    }) === 0 &&
    (!boundary || /[\s.:;,!?\-\u2013\u2014]/.test(boundary))
  ) {
    return { removed: true };
  }

  return { removed: false };
}

function applyBlockOverride(
  block: NarrationBlock,
  override: NarrationBlockOverride | undefined,
  context: RendererContext,
): NarrationBlock | undefined {
  if (!override) {
    return block;
  }

  if (override.omit) {
    if (block.type !== "sectionBreak") {
      context.warnings.addInput({
        code: "NARRATION_ALIGNMENT_INVALID_SEMANTIC_DRIFT",
        severity: "error",
        message:
          "A manual omission of meaningful visible content was rejected; decorative omissions are handled automatically.",
        blockId: block.id,
        source: block.source,
        details: { issueCode: "MEANINGFUL_OVERRIDE_OMISSION_REJECTED" },
      });
      return block;
    }
    context.warnings.addInput({
      code: "BLOCK_OMITTED_BY_OVERRIDE",
      severity: "info",
      message: "A decorative section break was intentionally omitted by an override.",
      blockId: block.id,
      source: block.source,
    });
    return undefined;
  }

  let pauseAfterMs = block.pauseAfterMs;
  if (override.pauseAfterMs !== undefined) {
    if (isValidPause(override.pauseAfterMs)) {
      pauseAfterMs = Math.round(override.pauseAfterMs);
    } else {
      context.warnings.addInput({
        code: "INVALID_PAUSE_OVERRIDE",
        message: "An invalid block pause override was ignored.",
        blockId: block.id,
        source: block.source,
        details: { suppliedPauseMs: String(override.pauseAfterMs) },
      });
    }
  }

  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return {
        ...block,
        spokenText:
          override.spokenText === undefined
            ? block.spokenText
            : spokenText(override.spokenText, context),
        pauseAfterMs,
      };
    case "formField":
      return {
        ...block,
        spokenLabel:
          override.spokenLabel === undefined
            ? block.spokenLabel
            : spokenText(override.spokenLabel, context, false),
        spokenDescription:
          override.spokenDescription === undefined
            ? block.spokenDescription
            : spokenText(override.spokenDescription, context),
        pauseAfterMs,
      };
    case "tableRow":
      return {
        ...block,
        cells: block.cells.map((cell, index) => {
          const cellOverride = override.cells?.[index];
          return {
            ...cell,
            spokenLabel:
              cellOverride?.spokenLabel === undefined
                ? cell.spokenLabel
                : spokenText(cellOverride.spokenLabel, context, false),
            spokenValue:
              cellOverride?.spokenValue === undefined
                ? cell.spokenValue
                : spokenText(cellOverride.spokenValue, context),
          };
        }),
        pauseAfterMs,
      };
    case "sectionBreak":
      return { ...block, pauseAfterMs };
  }
}

function renderHeading(
  node: HtmlNode,
  path: string,
  context: RendererContext,
): NarrationBlock | undefined {
  const visibleText = normalizeVisibleText(extractText(node));
  if (!visibleText) {
    context.warnings.addInput({
      code: "EMPTY_HEADING",
      message: "An empty heading was omitted.",
      source: sourceLocation(node, path),
    });
    return undefined;
  }

  warnForOmittedMeaningfulImages(node, path, context);
  const nestedBlock = findDescendants(node, path, (candidate) => {
    const nestedTag = tagName(candidate);
    return (
      nestedTag === "p" ||
      nestedTag === "table" ||
      nestedTag === "ol" ||
      nestedTag === "ul" ||
      nestedTag === "blockquote" ||
      nestedTag === "figure" ||
      nestedTag === "pre" ||
      CONTAINER_TAGS.has(nestedTag) ||
      /^h[1-6]$/.test(nestedTag)
    );
  })[0];
  if (nestedBlock) {
    context.warnings.addInput({
      code: "HEADING_PARAGRAPH_CONCATENATION",
      message:
        "A block-level element was nested in a heading and may be concatenated during speech.",
      source: sourceLocation(node, path),
      details: { nestedPath: nestedBlock.path },
    });
  }

  const parsedLevel = Number.parseInt(tagName(node).slice(1), 10);
  const level = Math.min(6, Math.max(1, parsedLevel)) as 1 | 2 | 3 | 4 | 5 | 6;
  return {
    type: "heading",
    id: path,
    visibleText,
    spokenText: spokenText(visibleText, context),
    level,
    pauseAfterMs: context.pauses.heading,
    source: sourceLocation(node, path),
  };
}

function renderParagraph(
  node: HtmlNode,
  path: string,
  context: RendererContext,
): NarrationBlock | undefined {
  const visibleText = normalizeVisibleText(extractText(node));
  if (!visibleText) {
    const image = findDescendants(
      node,
      path,
      (candidate) => tagName(candidate) === "img",
    )[0];
    if (image) {
      context.warnings.addInput({
        code: "VISUAL_ONLY_CONTENT_OMITTED",
        severity: "info",
        message: "An image-only paragraph was omitted from narration.",
        source: sourceLocation(node, path),
      });
    }
    return undefined;
  }

  warnForOmittedMeaningfulImages(node, path, context);
  return {
    type: "paragraph",
    id: path,
    visibleText,
    spokenText: spokenText(visibleText, context),
    pauseAfterMs: context.pauses.paragraph,
    source: sourceLocation(node, path),
  };
}

function renderCallout(
  node: HtmlNode,
  path: string,
  context: RendererContext,
): NarrationBlock | undefined {
  const visibleText = normalizeVisibleText(extractText(node));
  if (!visibleText) {
    context.warnings.addInput({
      code: "EMPTY_BLOCK",
      message: "An empty callout was omitted.",
      source: sourceLocation(node, path),
    });
    return undefined;
  }

  warnForOmittedMeaningfulImages(node, path, context);
  return {
    type: "callout",
    id: path,
    visibleText,
    spokenText: spokenText(visibleText, context),
    pauseAfterMs: context.pauses.paragraph,
    source: sourceLocation(node, path),
  };
}

function renderFormField(
  node: HtmlNode,
  path: string,
  context: RendererContext,
): NarrationFormFieldBlock {
  const labelNode = findDescendants(
    node,
    path,
    (candidate) => hasClass(candidate, "form-preview-label"),
  )[0];
  const imageNode = findDescendants(
    node,
    path,
    (candidate) => tagName(candidate) === "img",
  )[0];
  const paragraphNodes = findDescendants(
    node,
    path,
    (candidate) => tagName(candidate) === "p",
  );

  let visibleLabel = normalizeVisibleText(
    labelNode ? extractText(labelNode.node) : "",
  );
  const imageAlt = normalizeVisibleText(
    imageNode ? getAttribute(imageNode.node, "alt") ?? "" : "",
  );

  if (!visibleLabel && imageAlt) {
    visibleLabel = imageAlt;
    context.warnings.addInput({
      code: "IMAGE_ALT_USED_AS_FORM_LABEL",
      severity: "info",
      message: "The form image alt text was used because no visible label exists.",
      blockId: path,
      source: sourceLocation(node, path),
    });
  }

  const visibleDescription = normalizeVisibleText(
    paragraphNodes.map(({ node: paragraph }) => extractText(paragraph)).join(" "),
  );
  const deduplicated = stripRepeatedFormLabel(
    visibleDescription,
    visibleLabel,
  );

  if (deduplicated.removed) {
    context.warnings.addInput({
      code: "DUPLICATE_FORM_LABEL_REMOVED",
      severity: "info",
      message:
        "A repeated form label was removed from the spoken description.",
      blockId: path,
      source: sourceLocation(node, path),
    });
  }

  return {
    type: "formField",
    id: path,
    visibleLabel,
    spokenLabel: spokenText(visibleLabel, context, false),
    ...(visibleDescription ? { visibleDescription } : {}),
    ...(visibleDescription
      ? {
          spokenDescription: spokenText(visibleDescription, context),
        }
      : {}),
    ...(deduplicated.removed
      ? { suppressDuplicateLabelInSpeech: true }
      : {}),
    pauseAfterMs: context.pauses.paragraph,
    source: sourceLocation(node, path),
  };
}

function renderGenericFormField(
  labelNode: HtmlNode,
  labelPath: string,
  descriptionNode: HtmlNode | undefined,
  context: RendererContext,
): NarrationFormFieldBlock {
  const visibleLabel = normalizeVisibleText(extractText(labelNode));
  const visibleDescription = normalizeVisibleText(
    descriptionNode ? extractText(descriptionNode) : "",
  );
  const deduplicated = stripRepeatedFormLabel(
    visibleDescription,
    visibleLabel,
  );

  if (deduplicated.removed) {
    context.warnings.addInput({
      code: "DUPLICATE_FORM_LABEL_REMOVED",
      severity: "info",
      message:
        "A repeated form label was removed from the spoken description.",
      blockId: labelPath,
      source: sourceLocation(labelNode, labelPath),
    });
  }

  return {
    type: "formField",
    id: labelPath,
    visibleLabel,
    spokenLabel: spokenText(visibleLabel, context, false),
    ...(visibleDescription ? { visibleDescription } : {}),
    ...(visibleDescription
      ? {
          spokenDescription: spokenText(visibleDescription, context),
        }
      : {}),
    ...(deduplicated.removed
      ? { suppressDuplicateLabelInSpeech: true }
      : {}),
    pauseAfterMs: context.pauses.paragraph,
    source: sourceLocation(labelNode, labelPath),
  };
}

function renderList(
  node: HtmlNode,
  path: string,
  context: RendererContext,
): NarrationBlock[] {
  const ordered = tagName(node) === "ol";
  const markerStyle = ordered
    ? resolveOrderedListStyle(
        context.slug,
        path,
        context.orderedListStyles,
      )
    : undefined;
  const parsedStart = Number.parseInt(getAttribute(node, "start") ?? "1", 10);
  let nextIndex = Number.isFinite(parsedStart) ? parsedStart : 1;
  const blocks: NarrationBlock[] = [];
  const listItems = directElementChildren(node, path, new Set(["li"]));

  for (const item of listItems) {
    const explicitValue = Number.parseInt(
      getAttribute(item.node, "value") ?? "",
      10,
    );
    const itemIndex = ordered
      ? Number.isFinite(explicitValue)
        ? explicitValue
        : nextIndex
      : undefined;
    if (ordered) {
      nextIndex = (itemIndex ?? nextIndex) + 1;
    }

    const visibleText = normalizeVisibleText(
      extractText(item.node, { excludeNestedLists: true }),
    );
    if (visibleText) {
      warnForOmittedMeaningfulImages(item.node, item.path, context);
      const spokenSource =
        itemIndex === undefined
          ? visibleText
          : markerStyle === "step"
            ? `Step ${integerToSpokenWords(itemIndex)}: ${visibleText}`
            : markerStyle === "ordinal"
              ? `${integerToOrdinalWords(itemIndex).replace(
                  /^\p{Ll}/u,
                  (letter) => letter.toLocaleUpperCase(),
                )}: ${visibleText}`
              : visibleText;
      blocks.push({
        type: "listItem",
        id: item.path,
        visibleText,
        spokenText: spokenText(spokenSource, context),
        ...(itemIndex !== undefined ? { index: itemIndex } : {}),
        ...(markerStyle ? { markerStyle } : {}),
        pauseAfterMs: context.pauses.list,
        source: sourceLocation(item.node, item.path),
      });
    }

    for (const nestedList of directElementChildren(
      item.node,
      item.path,
      new Set(["ol", "ul"]),
    )) {
      blocks.push(...renderList(nestedList.node, nestedList.path, context));
    }
  }

  if (!listItems.length) {
    context.warnings.addInput({
      code: "EMPTY_BLOCK",
      message: "An empty list was omitted.",
      source: sourceLocation(node, path),
    });
  }

  return blocks;
}

interface TableRow {
  node: HtmlNode;
  path: string;
  cells: HtmlNodeWithPath[];
  isHeaderSection: boolean;
}

interface PositionedTableCell {
  cell: HtmlNodeWithPath;
  columnIndex: number;
  columnSpan: number;
  rowSpan: number;
}

function tableSpan(cell: HtmlNode, attribute: "colspan" | "rowspan"): number {
  const value = Number.parseInt(getAttribute(cell, attribute) ?? "1", 10);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 100) : 1;
}

function combinedHeader(
  headers: readonly string[],
  columnIndex: number,
  columnSpan: number,
): string {
  const labels = headers
    .slice(columnIndex, columnIndex + columnSpan)
    .filter(Boolean);
  return [...new Set(labels)].join(" / ");
}

function contextualTableSpokenValue(
  visibleLabel: string,
  visibleValue: string,
  context: RendererContext,
): string {
  if (
    /^(?:week|module)$/i.test(visibleLabel.trim()) &&
    /^\d{1,3}$/.test(visibleValue.trim())
  ) {
    return `${integerToSpokenWords(Number(visibleValue.trim()))}.`;
  }
  return spokenText(visibleValue, context);
}

function positionTableCells(
  rows: readonly TableRow[],
): PositionedTableCell[][] {
  const occupiedUntilRow = new Map<number, number>();

  return rows.map((row, rowIndex) => {
    let columnIndex = 0;
    return row.cells.map((cell) => {
      while ((occupiedUntilRow.get(columnIndex) ?? 0) > rowIndex) {
        columnIndex += 1;
      }

      const columnSpan = tableSpan(cell.node, "colspan");
      const rowSpan = tableSpan(cell.node, "rowspan");
      const positioned = {
        cell,
        columnIndex,
        columnSpan,
        rowSpan,
      };

      if (rowSpan > 1) {
        for (
          let spannedColumn = columnIndex;
          spannedColumn < columnIndex + columnSpan;
          spannedColumn += 1
        ) {
          occupiedUntilRow.set(
            spannedColumn,
            Math.max(
              occupiedUntilRow.get(spannedColumn) ?? 0,
              rowIndex + rowSpan,
            ),
          );
        }
      }
      columnIndex += columnSpan;
      return positioned;
    });
  });
}

function tableRows(node: HtmlNode, path: string): TableRow[] {
  return findDescendants(
    node,
    path,
    (candidate) => tagName(candidate) === "tr",
    { stopAtNestedTable: true },
  ).map((row) => ({
    node: row.node,
    path: row.path,
    cells: directElementChildren(
      row.node,
      row.path,
      new Set(["td", "th"]),
    ),
    isHeaderSection: row.path.includes("/thead["),
  }));
}

function renderTable(
  node: HtmlNode,
  path: string,
  context: RendererContext,
): NarrationBlock[] {
  const rows = tableRows(node, path);
  if (!rows.length) {
    context.warnings.addInput({
      code: "EMPTY_TABLE",
      severity: "error",
      message: "A table with no rows was omitted.",
      source: sourceLocation(node, path),
    });
    return [];
  }

  rows.forEach((row, rowIndex) => {
    row.cells.forEach((cell, cellIndex) => {
      const columnSpan = tableSpan(cell.node, "colspan");
      const rowSpan = tableSpan(cell.node, "rowspan");
      if (columnSpan > 1 || rowSpan > 1) {
        context.warnings.addInput({
          code: "MERGED_TABLE_CELL",
          severity: "info",
          message:
            "A merged table cell was preserved and mapped to its semantic column labels.",
          blockId: row.path,
          source: sourceLocation(cell.node, cell.path),
          details: { rowIndex, cellIndex, columnSpan, rowSpan },
        });
      }
    });
  });

  const positionedRows = positionTableCells(rows);
  const headerRowIndices = new Set(
    rows.flatMap((row, rowIndex) =>
      row.isHeaderSection ||
      (row.cells.length > 0 &&
        row.cells.every((cell) => tagName(cell.node) === "th"))
        ? [rowIndex]
        : [],
    ),
  );
  const headerLayers: string[][] = [];
  for (const headerRowIndex of headerRowIndices) {
    for (const positioned of positionedRows[headerRowIndex] ?? []) {
      const label = normalizeVisibleText(extractText(positioned.cell.node));
      for (
        let column = positioned.columnIndex;
        column < positioned.columnIndex + positioned.columnSpan;
        column += 1
      ) {
        const layers = headerLayers[column] ?? [];
        if (label && !layers.includes(label)) {
          layers.push(label);
        }
        headerLayers[column] = layers;
      }
    }
  }
  const headers = headerLayers.map((layers) => layers.join(" / "));

  if (!headerRowIndices.size || !headers.some(Boolean)) {
    context.warnings.addInput({
      code: "MISSING_TABLE_HEADER",
      message:
        "A table has no semantic header row; generic column labels were generated.",
      source: sourceLocation(node, path),
    });
  } else if (headers.some((header) => !header)) {
    context.warnings.addInput({
      code: "MISSING_TABLE_HEADER",
      message:
        "At least one table header is empty; a generic column label was generated.",
      source: sourceLocation(node, path),
      details: {
        emptyHeaderCount: headers.filter((header) => !header).length,
      },
    });
  }

  const blocks: NarrationBlock[] = [];
  rows.forEach((row, rowIndex) => {
    if (headerRowIndices.has(rowIndex)) {
      return;
    }

    const cells: NarrationTableCell[] = (
      positionedRows[rowIndex] ?? []
    ).map((positioned, cellIndex) => {
      const visibleLabel =
        combinedHeader(
          headers,
          positioned.columnIndex,
          positioned.columnSpan,
        ) || `Column ${String(positioned.columnIndex + 1)}`;
      const visibleValue = normalizeVisibleText(
        extractText(positioned.cell.node),
      );
      if (!visibleValue) {
        context.warnings.addInput({
          code: "EMPTY_TABLE_CELL",
          message: "An empty table cell will have no spoken value.",
          blockId: row.path,
          source: sourceLocation(positioned.cell.node, positioned.cell.path),
          details: { cellIndex },
        });
      }

      return {
        visibleLabel,
        visibleValue,
        spokenLabel: spokenText(visibleLabel, context, false),
        spokenValue: contextualTableSpokenValue(
          visibleLabel,
          visibleValue,
          context,
        ),
      };
    });

    if (cells.length) {
      blocks.push({
        type: "tableRow",
        id: row.path,
        cells,
        pauseAfterMs: context.pauses.tableRow,
        source: sourceLocation(row.node, row.path),
      });
    }
  });

  if (!blocks.length) {
    context.warnings.addInput({
      code: "EMPTY_TABLE",
      message: "A table has headers but no data rows to narrate.",
      source: sourceLocation(node, path),
    });
  }

  return blocks;
}

function isInlineNode(node: HtmlNode): boolean {
  return node.nodeName === "#text" || INLINE_TAGS.has(tagName(node));
}

function renderInlineRun(
  nodes: readonly HtmlNodeWithPath[],
  context: RendererContext,
): NarrationBlock | undefined {
  const visibleText = normalizeVisibleText(
    nodes.map(({ node }) => extractText(node)).join(" "),
  );
  if (!visibleText) {
    return undefined;
  }

  const first = nodes[0];
  if (!first) {
    return undefined;
  }

  return {
    type: "paragraph",
    id: first.path,
    visibleText,
    spokenText: spokenText(visibleText, context),
    pauseAfterMs: context.pauses.paragraph,
    source: sourceLocation(first.node, first.path),
  };
}

function renderContainer(
  node: HtmlNode,
  path: string,
  context: RendererContext,
): NarrationBlock[] {
  const blocks: NarrationBlock[] = [];
  let inlineRun: HtmlNodeWithPath[] = [];
  const children = childrenWithPaths(node, path);

  const flushInlineRun = () => {
    const block = renderInlineRun(inlineRun, context);
    if (block) {
      blocks.push(block);
    }
    inlineRun = [];
  };

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) continue;

    if (tagName(child.node) === "label" && !isHiddenNode(child.node)) {
      flushInlineRun();
      const next = children[index + 1];
      const description =
        next && tagName(next.node) === "p" && !isHiddenNode(next.node)
          ? next.node
          : undefined;
      blocks.push(
        renderGenericFormField(
          child.node,
          child.path,
          description,
          context,
        ),
      );
      if (description) {
        index += 1;
      }
      continue;
    }

    if (isInlineNode(child.node)) {
      inlineRun.push(child);
      continue;
    }

    flushInlineRun();
    blocks.push(...renderNode(child.node, child.path, context));
  }

  flushInlineRun();
  return blocks;
}

function renderNode(
  node: HtmlNode,
  path: string,
  context: RendererContext,
): NarrationBlock[] {
  if (node.nodeName === "#comment") {
    return [];
  }

  if (node.nodeName === "#text") {
    const block = renderParagraph(node, path, context);
    return block ? [block] : [];
  }

  const tag = tagName(node);
  if (!tag) {
    return renderContainer(node, path, context);
  }

  if (isHiddenNode(node)) {
    context.warnings.addInput({
      code: "VISUAL_ONLY_CONTENT_OMITTED",
      severity: "info",
      message: "Content marked as hidden was omitted from narration.",
      source: sourceLocation(node, path),
    });
    return [];
  }

  if (IGNORED_TAGS.has(tag)) {
    if (tag === "svg") {
      context.warnings.addInput({
        code: "VISUAL_ONLY_CONTENT_OMITTED",
        severity: "info",
        message: "An inline SVG was omitted from narration.",
        source: sourceLocation(node, path),
      });
    }
    return [];
  }

  if (hasClass(node, "form-preview")) {
    return [renderFormField(node, path, context)];
  }

  if (isCallout(node) || tag === "blockquote") {
    const block = renderCallout(node, path, context);
    return block ? [block] : [];
  }

  if (/^h[1-6]$/.test(tag)) {
    const block = renderHeading(node, path, context);
    return block ? [block] : [];
  }

  if (tag === "p") {
    const block = renderParagraph(node, path, context);
    return block ? [block] : [];
  }

  if (tag === "ol" || tag === "ul") {
    return renderList(node, path, context);
  }

  if (tag === "table") {
    return renderTable(node, path, context);
  }

  if (tag === "hr") {
    return [
      {
        type: "sectionBreak",
        id: path,
        pauseAfterMs: context.pauses.section,
        source: sourceLocation(node, path),
      },
    ];
  }

  if (tag === "img") {
    const altText = normalizeVisibleText(getAttribute(node, "alt") ?? "");
    context.warnings.addInput(
      altText
        ? {
            code: "MEANINGFUL_VISUAL_OMITTED",
            message:
              "A standalone image has meaningful alt text that was omitted from narration.",
            source: sourceLocation(node, path),
            details: { altText },
          }
        : {
            code: "VISUAL_ONLY_CONTENT_OMITTED",
            severity: "info",
            message: "A standalone decorative image was omitted from narration.",
            source: sourceLocation(node, path),
            details: { hasAltText: false },
          },
    );
    return [];
  }

  if (CONTAINER_TAGS.has(tag)) {
    return renderContainer(node, path, context);
  }

  if (INLINE_TAGS.has(tag)) {
    const block = renderParagraph(node, path, context);
    return block ? [block] : [];
  }

  if (!RECOGNIZED_BLOCK_TAGS.has(tag)) {
    context.warnings.addInput({
      code: "UNSUPPORTED_ELEMENT",
      severity: "info",
      message: `The <${tag}> element used generic semantic rendering.`,
      source: sourceLocation(node, path),
      details: { tag },
    });
  }

  return renderContainer(node, path, context);
}

function visibleCharacterCount(block: NarrationBlock): number {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return block.visibleText.length;
    case "formField":
      return (
        block.visibleLabel.length + (block.visibleDescription?.length ?? 0)
      );
    case "tableRow":
      return block.cells.reduce(
        (total, cell) =>
          total + cell.visibleLabel.length + cell.visibleValue.length,
        0,
      );
    case "sectionBreak":
      return 0;
  }
}

function spokenCharacterCount(block: NarrationBlock): number {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return block.spokenText.length;
    case "formField":
      return (
        (block.suppressDuplicateLabelInSpeech ? 0 : block.spokenLabel.length) +
        (block.spokenDescription?.length ?? 0)
      );
    case "tableRow":
      return block.cells.reduce(
        (total, cell) =>
          total + cell.spokenLabel.length + cell.spokenValue.length,
        0,
      );
    case "sectionBreak":
      return 0;
  }
}

function collectInvalidPauseWarnings(
  pauseProfile: Partial<NarrationPauseProfile> | undefined,
): NarrationWarning[] {
  if (!pauseProfile) {
    return [];
  }

  return Object.entries(pauseProfile)
    .filter(([, value]) => !isValidPause(value))
    .map(([pauseType, value]) => ({
      code: "INVALID_PAUSE_OVERRIDE" as const,
      severity: "warning" as const,
      message: "An invalid pause-profile value was ignored.",
      details: {
        pauseType,
        suppliedPauseMs: String(value),
      },
    }));
}

export function renderNarrationDocument({
  slug,
  title,
  html,
  contentRevisionHash,
  overrides,
}: RenderNarrationDocumentInput): NarrationDocument {
  const sourceHash = hashNarrationSource({ slug, title, html });
  const resolvedContentRevisionHash = contentRevisionHash?.trim() || sourceHash;
  const recipe = createNarrationRecipe({
    contentRevisionHash: resolvedContentRevisionHash,
    overrides,
  });
  const warnings = new NarrationWarningCollector();
  const context: RendererContext = {
    slug,
    pauses: recipe.pauseProfile,
    pronunciations: recipe.pronunciations,
    lessonScopedPronunciations:
      recipe.lessonScopedPronunciations,
    approvedUrls: recipe.approvedUrls,
    approvedEmails: recipe.approvedEmails,
    orderedListStyles: recipe.orderedListStyles,
    warnings,
  };

  warnings.addAll(collectInvalidPauseWarnings(overrides?.pauseProfile));

  for (const source of findUnsafePronunciationRules(recipe.pronunciations)) {
    warnings.addInput({
      code: "UNSAFE_PRONUNCIATION_RULE",
      message:
        "A pronunciation override was ignored because it would not be idempotent.",
      details: { source },
    });
  }

  const parseErrors: HtmlParseError[] = [];
  const fragment = parseFragment(html, {
    sourceCodeLocationInfo: true,
    onParseError(error) {
      parseErrors.push(error);
    },
  }) as unknown as HtmlNode;

  for (const error of parseErrors) {
    warnings.addInput({
      code: "HTML_PARSE_RECOVERY",
      severity: "info",
      message: `The HTML parser recovered from ${error.code}.`,
      source: {
        path: "root",
        ...(error.startOffset !== undefined
          ? { startOffset: error.startOffset }
          : {}),
        ...(error.endOffset !== undefined ? { endOffset: error.endOffset } : {}),
        ...(error.startLine !== undefined ? { startLine: error.startLine } : {}),
        ...(error.startCol !== undefined
          ? { startColumn: error.startCol }
          : {}),
        ...(error.endLine !== undefined ? { endLine: error.endLine } : {}),
        ...(error.endCol !== undefined ? { endColumn: error.endCol } : {}),
      },
    });
  }

  let blocks = renderContainer(fragment, "root", context);
  const visibleTitle = normalizeVisibleText(title ?? "");
  if (
    visibleTitle &&
    !(
      blocks[0]?.type === "heading" &&
      blocks[0].visibleText.localeCompare(visibleTitle, undefined, {
        sensitivity: "accent",
      }) === 0
    )
  ) {
    blocks.unshift({
      type: "heading",
      id: "title",
      visibleText: visibleTitle,
      spokenText: spokenText(visibleTitle, context),
      level: 1,
      pauseAfterMs: context.pauses.heading,
      source: { path: "title" },
    });
  }

  const segmented = segmentLongNarrationBlocks({
    slug,
    blocks,
    normalizeSpokenText: (visibleText) => spokenText(visibleText, context),
    pauseProfile: context.pauses,
  });
  blocks = segmented.blocks;
  warnings.addAll(segmented.warnings);

  const alignmentContext: NarrationAlignmentContext = {
    slug,
    pronunciations: recipe.pronunciations,
    lessonScopedPronunciations:
      recipe.lessonScopedPronunciations,
    approvedUrls: recipe.approvedUrls,
    approvedEmails: recipe.approvedEmails,
    orderedListStyles: recipe.orderedListStyles,
    ownerApprovalReference: recipe.ownerApprovalReference,
  };
  const addAlignmentWarnings = (
    block: NarrationBlock,
    audit: ReturnType<typeof auditNarrationBlockAlignment>,
  ): void => {
    for (const issue of audit.issues) {
      if (issue.code === "PRONUNCIATION_REQUIRES_OWNER_REVIEW") {
        // The occurrence-aware warning collector emits the actionable term,
        // source and recommended options for this case.
        continue;
      }
      warnings.addInput({
        code:
          issue.classification === "INVALID_SEMANTIC_DRIFT"
            ? "NARRATION_ALIGNMENT_INVALID_SEMANTIC_DRIFT"
            : "NARRATION_ALIGNMENT_REQUIRES_OWNER_REVIEW",
        severity:
          issue.classification === "INVALID_SEMANTIC_DRIFT"
            ? "error"
            : "warning",
        message: issue.message,
        blockId: block.id,
        source: block.source,
        details: {
          issueCode: issue.code,
          ...(issue.feature ? { feature: issue.feature } : {}),
          ...(issue.expected ? { expected: issue.expected } : {}),
          ...(issue.actual ? { actual: issue.actual } : {}),
        },
      });
    }
  };

  const usedOverrideIds = new Set<string>();
  blocks = blocks.flatMap((block) => {
    const override = overrides?.blocks?.[block.id];
    if (override) {
      usedOverrideIds.add(block.id);
    }
    const overridden = applyBlockOverride(block, override, context);
    if (!overridden || !override) {
      return overridden ? [overridden] : [];
    }

    const audit = auditNarrationBlockAlignment(
      overridden,
      alignmentContext,
    );
    const invalid = audit.issues.some(
      (issue) => issue.classification === "INVALID_SEMANTIC_DRIFT",
    );
    const unapprovedLexicalChange =
      !recipe.ownerApprovalReference &&
      audit.issues.some(
        (issue) =>
          issue.classification === "REQUIRES_OWNER_REVIEW" &&
          issue.code !== "PRONUNCIATION_REQUIRES_OWNER_REVIEW",
      );
    if (invalid || unapprovedLexicalChange) {
      addAlignmentWarnings(overridden, audit);
      return [
        {
          ...block,
          // A valid pause is allowlisted metadata and may survive rejection of
          // an unsafe or unapproved wording override.
          pauseAfterMs: overridden.pauseAfterMs,
        },
      ];
    }
    return [overridden];
  });

  for (const overrideId of Object.keys(overrides?.blocks ?? {}).sort()) {
    if (!usedOverrideIds.has(overrideId)) {
      warnings.addInput({
        code: "OVERRIDE_TARGET_NOT_FOUND",
        message: "A block override did not match any rendered semantic path.",
        blockId: overrideId,
      });
    }
  }

  blocks = applyLessonScopedPronunciationsToBlocks(
    blocks,
    recipe.lessonScopedPronunciations,
  );

  const finalAlignmentAudits = auditNarrationBlocksAlignment(
    blocks,
    alignmentContext,
  );
  blocks.forEach((block, index) => {
    const audit = finalAlignmentAudits[index];
    if (audit) {
      addAlignmentWarnings(block, audit);
    }
  });

  warnings.addAll(
    collectNarrationBlockWarnings(blocks, {
      pronunciations: recipe.pronunciations,
      lessonScopedPronunciations:
        recipe.lessonScopedPronunciations,
      approvedUrls: recipe.approvedUrls,
      approvedEmails: recipe.approvedEmails,
      ownerApprovalReference: recipe.ownerApprovalReference,
    }),
  );
  const finalWarnings = warnings.list();
  const stats = {
    blockCount: blocks.length,
    visibleCharacterCount: blocks.reduce(
      (total, block) => total + visibleCharacterCount(block),
      0,
    ),
    spokenCharacterCount: blocks.reduce(
      (total, block) => total + spokenCharacterCount(block),
      0,
    ),
    warningCount: finalWarnings.length,
  };
  const blocksHash = hashNarrationBlocks(blocks);
  const recipeHash = hashNarrationRecipe(recipe);
  const partialHashes = {
    source: sourceHash,
    contentRevision: resolvedContentRevisionHash,
    blocks: blocksHash,
    recipe: recipeHash,
  };
  const documentWithoutFinalHash = {
    schemaVersion: NARRATION_SCHEMA_VERSION,
    slug,
    ...(visibleTitle ? { title: visibleTitle } : {}),
    blocks,
    warnings: finalWarnings,
    recipe,
    stats,
    hashes: partialHashes,
  };
  const documentHash = hashNarrationDocument(documentWithoutFinalHash);

  return {
    ...documentWithoutFinalHash,
    hashes: {
      ...partialHashes,
      document: documentHash,
    },
  };
}
