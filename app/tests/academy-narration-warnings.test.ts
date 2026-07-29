import { describe, expect, it } from "vitest";

import { sanitizeLessonHtml } from "../src/lib/academy/lesson-html";
import {
  MAX_SAFE_NARRATION_CHUNK_CHARACTERS,
  planNarrationChunks,
} from "../src/lib/academy/narration/chunking";
import type { NarrationBlock } from "../src/lib/academy/narration/contracts";
import {
  normalizeSpokenText,
} from "../src/lib/academy/narration/normalization";
import {
  formatNarrationSpokenScript,
} from "../src/lib/academy/narration/preview";
import {
  DEFAULT_NARRATION_PRONUNCIATIONS,
} from "../src/lib/academy/narration/recipe";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";
import {
  LONG_SPOKEN_BLOCK_WARNING_CHARACTERS,
  collectNarrationBlockWarnings,
} from "../src/lib/academy/narration/warnings";

function render(html: string) {
  return renderNarrationDocument({
    slug: "warning-fixture",
    title: "Warning fixture",
    html,
    contentRevisionHash: "warning-fixture-v1",
  });
}

function codes(html: string): string[] {
  return render(html).warnings.map((warning) => warning.code);
}

describe("spoken-language normalization coverage", () => {
  it("normalizes approved terms while preserving unapproved URLs and email verbatim", () => {
    const value = normalizeSpokenText(
      "HR starts Module 5 in Week 1 at $300 and 10%. Visit https://example.com/a-b or email team@example.com & confirm ✅.",
      { pronunciations: DEFAULT_NARRATION_PRONUNCIATIONS },
    );

    expect(value).toContain("H R");
    expect(value).toContain("Module five");
    expect(value).toContain("Week one");
    expect(value).toContain("three hundred dollars");
    expect(value).toContain("ten percent");
    expect(value).toContain("https://example.com/a-b");
    expect(value).toContain("team@example.com");
    expect(value).toContain("and confirm");
    expect(value).not.toContain("✅");
    expect(value).not.toContain("$300");
    expect(value).not.toContain("10%");
  });

  it("keeps normalization idempotent after URL and number expansion", () => {
    const once = normalizeSpokenText(
      "Week 12: contact owner@example.com at https://example.com/help.",
      { pronunciations: DEFAULT_NARRATION_PRONUNCIATIONS },
    );

    expect(
      normalizeSpokenText(once, {
        pronunciations: DEFAULT_NARRATION_PRONUNCIATIONS,
      }),
    ).toBe(once);
  });
});

describe("semantic edge cases", () => {
  it("keeps nested lists separate and uses neutral ordinals for non-allowlisted ordered lists", () => {
    const document = render(`
      <ol>
        <li>Frame the problem.
          <ul><li>Record the evidence.</li></ul>
        </li>
        <li>Identify the stakeholders.</li>
      </ol>
    `);
    const items = document.blocks.filter(
      (block): block is Extract<NarrationBlock, { type: "listItem" }> =>
        block.type === "listItem",
    );

    expect(items.map((item) => item.visibleText)).toEqual([
      "Frame the problem.",
      "Record the evidence.",
      "Identify the stakeholders.",
    ]);
    expect(items.map((item) => item.index)).toEqual([1, undefined, 2]);
    expect(items.map((item) => item.spokenText)).toEqual([
      "First: Frame the problem.",
      "Record the evidence.",
      "Second: Identify the stakeholders.",
    ]);
  });

  it("preserves merged table values, maps colspan labels, and warns on rowspan/colspan", () => {
    const document = render(`
      <table>
        <thead>
          <tr><th colspan="2">Assignment</th></tr>
          <tr><th>Q1</th><th>Q2</th></tr>
        </thead>
        <tbody>
          <tr><td rowspan="2">Week 1</td><td>Frame</td></tr>
          <tr><td>Prove</td></tr>
        </tbody>
      </table>
    `);
    const rows = document.blocks.filter(
      (block): block is Extract<NarrationBlock, { type: "tableRow" }> =>
        block.type === "tableRow",
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].cells.map((cell) => cell.visibleValue)).toEqual([
      "Week 1",
      "Frame",
    ]);
    expect(rows[1].cells.map((cell) => cell.visibleValue)).toEqual(["Prove"]);
    expect(rows[0].cells.map((cell) => cell.visibleLabel)).toEqual([
      "Assignment / Q1",
      "Assignment / Q2",
    ]);
    expect(rows[1].cells[0]?.visibleLabel).toBe("Assignment / Q2");
    expect(formatNarrationSpokenScript(rows)).toContain("Week one");
    expect(document.warnings.filter((warning) => warning.code === "MERGED_TABLE_CELL"))
      .toHaveLength(2);
  });

  it("warns for empty headings, missing headers, empty cells, and decorative-only content", () => {
    const document = render(`
      <h2> </h2>
      <table><tbody><tr><td></td><td>Value</td></tr></tbody></table>
      <img src="/decorative.svg" alt="" />
    `);
    const warningCodes = document.warnings.map((warning) => warning.code);

    expect(warningCodes).toContain("EMPTY_HEADING");
    expect(warningCodes).toContain("MISSING_TABLE_HEADER");
    expect(warningCodes).toContain("EMPTY_TABLE_CELL");
    expect(warningCodes).toContain("VISUAL_ONLY_CONTENT_OMITTED");
  });

  it("omits hidden content and reports meaningful inline visuals", () => {
    const document = render(sanitizeLessonHtml(`
      <p>Visible explanation <span hidden>private draft</span>
        <img src="/chart.svg" alt="A rising evidence curve" />
      </p>
      <p aria-hidden="true">screen-reader duplicate</p>
    `));
    const script = formatNarrationSpokenScript(document.blocks);

    expect(script).toContain("Visible explanation");
    expect(script).not.toContain("private draft");
    expect(script).not.toContain("screen-reader duplicate");
    expect(document.warnings.map((warning) => warning.code)).toContain(
      "MEANINGFUL_VISUAL_OMITTED",
    );
    expect(document.warnings.map((warning) => warning.code)).toContain(
      "VISUAL_ONLY_CONTENT_OMITTED",
    );
  });

  it("preserves and pairs a generic label with its description through sanitize and render", () => {
    const document = render(
      sanitizeLessonHtml(
        "<label>Current role</label><p>Describe your current professional responsibilities.</p>",
      ),
    );
    const fields = document.blocks.filter(
      (block): block is Extract<NarrationBlock, { type: "formField" }> =>
        block.type === "formField",
    );

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      visibleLabel: "Current role",
      spokenLabel: "Current role",
      visibleDescription: "Describe your current professional responsibilities.",
      spokenDescription:
        "Describe your current professional responsibilities.",
    });
  });

  it("keeps headings and paragraphs as separate narration blocks", () => {
    const document = render(
      "<h2>The Application Screen</h2><p>The prospect completes it first.</p>",
    );
    const semanticBlocks = document.blocks.filter(
      (block) => block.id !== "title",
    );

    expect(semanticBlocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
    ]);
    expect(formatNarrationSpokenScript(semanticBlocks)).toBe(
      "The Application Screen.\n\nThe prospect completes it first.",
    );
    expect(document.warnings.map((warning) => warning.code)).not.toContain(
      "HEADING_PARAGRAPH_CONCATENATION",
    );
  });

  it("warns when malformed HTML nests paragraph content inside a heading", () => {
    expect(
      codes("<h2>Heading<div>Nested paragraph.</div></h2>"),
    ).toContain("HEADING_PARAGRAPH_CONCATENATION");
  });
});

describe("narration quality warnings", () => {
  it("plans long lessons into reproducible chunks without splitting semantic blocks", () => {
    const document = render(
      ["alpha", "beta", "gamma"]
        .map(
          (word) =>
            `<p>${`${word} sentence. `.repeat(210)}</p>`,
        )
        .join(""),
    );
    const first = planNarrationChunks(document.blocks, 6_000);
    const second = planNarrationChunks(document.blocks, 6_000);

    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(1);
    expect(first.every((chunk) => chunk.characterCount <= 6_000)).toBe(true);
    expect(first.flatMap((chunk) => chunk.blockIds)).toEqual(
      document.blocks.map((block) => block.id),
    );
    expect(first.map((chunk) => chunk.spokenText).join("\n\n")).toBe(
      formatNarrationSpokenScript(document.blocks),
    );
  });

  it("detects repeated visible text, raw URLs, unknown abbreviations, and symbol-heavy content", () => {
    const document = render(`
      <p>This exact professional instruction appears twice for review.</p>
      <p>This exact professional instruction appears twice for review.</p>
      <p>Ask XYZ to review https://example.com/a/b?x=1&amp;y=2 with ✓ ✓ ✓ ✓.</p>
    `);
    const warningCodes = document.warnings.map((warning) => warning.code);

    expect(warningCodes).toContain("DUPLICATE_VISIBLE_TEXT");
    expect(warningCodes).toContain("UNNATURAL_URL");
    expect(warningCodes).toContain("UNRECOGNIZED_ABBREVIATION");
    expect(warningCodes).toContain("SYMBOL_HEAVY_CONTENT");
  });

  it("detects a long block and a single block that exceeds the future 9,000-character limit", () => {
    const longDocument = render(
      `<p>${"clear sentence. ".repeat(
        Math.ceil(LONG_SPOKEN_BLOCK_WARNING_CHARACTERS / 15) + 2,
      )}</p>`,
    );
    const oversizedDocument = render(
      `<p>${"meaningful narration. ".repeat(
        Math.ceil(MAX_SAFE_NARRATION_CHUNK_CHARACTERS / 21) + 2,
      )}</p>`,
    );

    expect(longDocument.warnings.map((warning) => warning.code)).toContain(
      "LONG_SPOKEN_BLOCK",
    );
    expect(oversizedDocument.warnings.map((warning) => warning.code)).toContain(
      "CHUNK_LIMIT_EXCEEDED",
    );
  });

  it("detects missing terminal punctuation in a manually supplied semantic block", () => {
    const blocks: NarrationBlock[] = [
      {
        type: "paragraph",
        id: "manual",
        visibleText: "Visible sentence.",
        spokenText: "Spoken sentence",
        pauseAfterMs: 500,
      },
    ];

    expect(
      collectNarrationBlockWarnings(blocks).map((warning) => warning.code),
    ).toContain("BLOCK_WITHOUT_TERMINAL_PUNCTUATION");
  });

  it("detects decorative-only spoken output and malformed punctuation", () => {
    const decorative = render("<p>✓ ✓ ✓</p>");
    const malformedBlocks: NarrationBlock[] = [
      {
        type: "paragraph",
        id: "malformed",
        visibleText: "Review this.",
        spokenText: "Review this,: now.",
        pauseAfterMs: 500,
      },
    ];

    expect(decorative.warnings.map((warning) => warning.code)).toContain(
      "DECORATIVE_ONLY_BLOCK",
    );
    expect(
      collectNarrationBlockWarnings(malformedBlocks).map(
        (warning) => warning.code,
      ),
    ).toContain("MALFORMED_SPOKEN_PUNCTUATION");
  });

  it("rejects and reports narration overrides that drift from visible meaning", () => {
    const document = renderNarrationDocument({
      slug: "override-warning",
      html: "<p>The reviewer must verify the evidence before approval.</p>",
      overrides: {
        revision: "deliberately-different-fixture",
        blocks: {
          "root/p[1]": {
            spokenText: "Everything is approved automatically.",
          },
        },
      },
    });

    expect(document.warnings.map((warning) => warning.code)).toContain(
      "NARRATION_ALIGNMENT_INVALID_SEMANTIC_DRIFT",
    );
    expect(formatNarrationSpokenScript(document.blocks)).toContain(
      "The reviewer must verify the evidence before approval.",
    );
    expect(formatNarrationSpokenScript(document.blocks)).not.toContain(
      "Everything is approved automatically.",
    );
  });

  it("does not flag configured Academy pronunciations as unknown abbreviations", () => {
    const warningCodes = codes(
      "<p>AI supports HR teams in B2B and B2C work at TenXPros.</p>",
    );

    expect(warningCodes).not.toContain("UNRECOGNIZED_ABBREVIATION");
  });
});
