import type {
  NarrationBlock,
  NarrationDocument,
  NarrationWarning,
} from "./contracts";

export interface NarrationPreviewOptions {
  includeHashes?: boolean;
  includeRecipe?: boolean;
  includeWarnings?: boolean;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function joinSpokenParts(parts: readonly (string | undefined)[]): string {
  return parts
    .map((part) => oneLine(part ?? ""))
    .filter(Boolean)
    .join(" ");
}

export function narrationBlockToSpokenText(block: NarrationBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return block.spokenText;
    case "tableRow":
      return block.cells
        .map((cell) => {
          const contextualNumberLabel = /^(?:week|module)$/i.test(
            cell.spokenLabel.trim(),
          );
          return joinSpokenParts([
            cell.spokenLabel
              ? `${cell.spokenLabel}${contextualNumberLabel ? "" : ":"}`
              : undefined,
            cell.spokenValue,
          ]);
        })
        .join(" ");
    case "formField":
      return block.suppressDuplicateLabelInSpeech
        ? joinSpokenParts([block.spokenDescription])
        : joinSpokenParts([
            block.spokenLabel ? `${block.spokenLabel}.` : undefined,
            block.spokenDescription,
          ]);
    case "sectionBreak":
      return "";
  }
}

export function formatNarrationSpokenScript(
  blocks: readonly NarrationBlock[],
): string {
  return blocks
    .map((block) => narrationBlockToSpokenText(block))
    .filter(Boolean)
    .join("\n\n");
}

function visibleBlockLines(block: NarrationBlock): readonly string[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return [`visible: ${oneLine(block.visibleText)}`];
    case "formField":
      return [
        `visible label: ${oneLine(block.visibleLabel)}`,
        ...(block.visibleDescription
          ? [`visible description: ${oneLine(block.visibleDescription)}`]
          : []),
      ];
    case "tableRow":
      return block.cells.map(
        (cell, index) =>
          `visible cell ${String(index + 1)}: ${oneLine(cell.visibleLabel)} = ${oneLine(cell.visibleValue)}`,
      );
    case "sectionBreak":
      return [];
  }
}

function spokenBlockLines(block: NarrationBlock): readonly string[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return [`spoken: ${oneLine(block.spokenText)}`];
    case "formField":
      return [
        `spoken label: ${oneLine(block.spokenLabel)}`,
        ...(block.spokenDescription
          ? [`spoken description: ${oneLine(block.spokenDescription)}`]
          : []),
      ];
    case "tableRow":
      return block.cells.map(
        (cell, index) =>
          `spoken cell ${String(index + 1)}: ${oneLine(cell.spokenLabel)} = ${oneLine(cell.spokenValue)}`,
      );
    case "sectionBreak":
      return [];
  }
}

function blockHeading(block: NarrationBlock, index: number): string {
  const metadata: string[] = [block.type];
  if (block.type === "heading") {
    metadata.push(`level ${String(block.level)}`);
  }
  if (block.type === "listItem" && block.index !== undefined) {
    metadata.push(`item ${String(block.index)}`);
  }
  return `${String(index + 1).padStart(3, "0")} [${metadata.join(", ")}] ${block.id}`;
}

function warningLine(warning: NarrationWarning): string {
  const location = warning.source?.path
    ? ` @ ${warning.source.path}`
    : warning.blockId
      ? ` @ ${warning.blockId}`
      : "";
  const details = warning.details
    ? ` ${JSON.stringify(warning.details)}`
    : "";
  return `- ${warning.severity.toUpperCase()} ${warning.code}${location}: ${warning.message}${details}`;
}

function formatBlocks(blocks: readonly NarrationBlock[]): string[] {
  const lines: string[] = [];

  blocks.forEach((block, index) => {
    if (index > 0) {
      lines.push("");
    }
    lines.push(blockHeading(block, index));
    lines.push(...visibleBlockLines(block).map((line) => `  ${line}`));
    lines.push(...spokenBlockLines(block).map((line) => `  ${line}`));
    lines.push(`  pause after: ${String(block.pauseAfterMs)} ms`);
    if (block.source) {
      const offset =
        block.source.startOffset === undefined
          ? ""
          : ` (offset ${String(block.source.startOffset)})`;
      lines.push(`  source: ${block.source.path}${offset}`);
    }
  });

  return lines;
}

export function formatNarrationPreview(
  documentOrBlocks: NarrationDocument | readonly NarrationBlock[],
  options: NarrationPreviewOptions = {},
): string {
  if (Array.isArray(documentOrBlocks)) {
    return [
      "Narration preview",
      `Blocks: ${String(documentOrBlocks.length)}`,
      "",
      ...formatBlocks(documentOrBlocks),
    ]
      .join("\n")
      .trimEnd();
  }

  const document = documentOrBlocks as NarrationDocument;
  const {
    includeHashes = true,
    includeRecipe = true,
    includeWarnings = true,
  } = options;
  const lines = [
    `Narration preview: ${document.slug}`,
    ...(document.title ? [`Title: ${document.title}`] : []),
    `Blocks: ${String(document.stats.blockCount)}`,
    `Warnings: ${String(document.stats.warningCount)}`,
  ];

  if (includeRecipe) {
    const versions = document.recipe.versions;
    lines.push(
      `Versions: schema=${versions.schema}; renderer=${versions.renderer}; content=${versions.contentRevision}; normalization=${versions.normalization}; pronunciation=${versions.pronunciation}; pause=${versions.pause}; alignment=${versions.alignmentPolicy}; segmentation=${versions.segmentation}`,
      `Override revision: ${document.recipe.overrideRevision || "(none)"}`,
      `Pause profile: sentence=${String(document.recipe.pauseProfile.sentence)}, list=${String(document.recipe.pauseProfile.list)}, paragraph=${String(document.recipe.pauseProfile.paragraph)}, tableRow=${String(document.recipe.pauseProfile.tableRow)}, heading=${String(document.recipe.pauseProfile.heading)}, section=${String(document.recipe.pauseProfile.section)} ms`,
    );
  }

  if (includeHashes) {
    lines.push(
      `Hashes: source=${document.hashes.source}; content=${document.hashes.contentRevision}; blocks=${document.hashes.blocks}; recipe=${document.hashes.recipe}; document=${document.hashes.document}`,
    );
  }

  lines.push("", ...formatBlocks(document.blocks));

  if (includeWarnings && document.warnings.length) {
    lines.push(
      "",
      "Warnings",
      ...document.warnings.map((warning) => warningLine(warning)),
    );
  }

  return lines.join("\n").trimEnd();
}
