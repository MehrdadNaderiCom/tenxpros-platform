import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  NarrationBlock,
  NarrationDocument,
} from "../src/lib/academy/narration/contracts";
import { normalizeSpokenText } from "../src/lib/academy/narration/normalization";
import { formatNarrationPreview } from "../src/lib/academy/narration/preview";
import {
  DEFAULT_NARRATION_PRONUNCIATIONS,
  stableNarrationHash,
  stableNarrationStringify,
} from "../src/lib/academy/narration/recipe";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";

/**
 * Phase 0/1 contract for the pure narration layer.
 *
 * These tests intentionally stop at a deterministic semantic document. They do
 * not synthesize audio, touch Prisma, read an API key, or call a TTS provider.
 * Provider integration belongs to a later, separately approved phase.
 */

const SAMPLE_HTML = `
  <h2>How it works</h2>
  <p>First paragraph.</p>
  <ul>
    <li>Use AI safely.</li>
    <li>Keep a human reviewer.</li>
  </ul>
  <table>
    <thead>
      <tr><th>Week</th><th>Focus</th><th>Badge</th></tr>
    </thead>
    <tbody>
      <tr><td>1</td><td>AI readiness</td><td>AI Core</td></tr>
    </tbody>
  </table>
  <div class="form-preview">
    <div class="form-preview-label">The application screen</div>
    <p>The prospect describes the problem.</p>
  </div>
  <div class="callout callout-warning">
    <p><strong>Do not say this:</strong> AI guarantees a result.</p>
  </div>
  <script>this must never be narrated</script>
  <style>.also-not-narration { display: none; }</style>
`;

function render(html = SAMPLE_HTML): NarrationDocument {
  return renderNarrationDocument({
    slug: "contract-fixture",
    title: "Contract fixture",
    html,
    contentRevisionHash: "content-revision-fixture-v1",
  });
}

function spokenTextOfBlock(block: NarrationBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "listItem":
    case "callout":
      return block.spokenText;
    case "tableRow":
      return block.cells
        .map((cell) => `${cell.spokenLabel}: ${cell.spokenValue}`)
        .join(" ");
    case "formField":
      return [block.spokenLabel, block.spokenDescription].filter(Boolean).join(". ");
    case "sectionBreak":
      return "";
  }
}

function textOf(document: NarrationDocument): string {
  return document.blocks.map(spokenTextOfBlock).filter(Boolean).join("\n");
}

function warningCodes(document: NarrationDocument): string[] {
  return document.warnings.map((warning) => warning.code.toUpperCase());
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeSpokenText", () => {
  it("normalizes approved high-risk terms while leaving owner-review brands unchanged", () => {
    const normalized = normalizeSpokenText(
      "TenXPros teaches AI for B2B and B2C teams. USD 1,200 is 28%.",
      { pronunciations: DEFAULT_NARRATION_PRONUNCIATIONS },
    );

    expect(normalized).toContain("TenXPros");
    expect(normalized).toContain("A I");
    expect(normalized).toContain("B to B");
    expect(normalized).toContain("B to C");
    expect(normalized).toContain("U S dollars");
    expect(normalized).toContain("twenty-eight percent");
    expect(normalized).not.toMatch(/\b(?:AI|B2B|B2C|USD)\b/);
    expect(normalized).not.toContain("%");
  });

  it("is deterministic and idempotent", () => {
    const source = "AI supports B2B teams at TenXPros. Progress is 28%.";
    const options = { pronunciations: DEFAULT_NARRATION_PRONUNCIATIONS };
    const once = normalizeSpokenText(source, options);

    expect(normalizeSpokenText(source, options)).toBe(once);
    expect(normalizeSpokenText(once, options)).toBe(once);
  });

  it("uses whole-term matching and preserves unrelated words and punctuation", () => {
    const source = "The paid airfare and AIM method remain unchanged; AI changes.";
    const normalized = normalizeSpokenText(source, {
      pronunciations: DEFAULT_NARRATION_PRONUNCIATIONS,
    });

    expect(normalized).toContain("paid airfare");
    expect(normalized).toContain("AIM method");
    expect(normalized).toContain("; A I changes.");
    expect(normalized).not.toMatch(/\s{2,}/);
  });

  it("supports audited pronunciation overrides and optional terminal punctuation", () => {
    expect(
      normalizeSpokenText("CRM review", {
        pronunciations: { CRM: "customer relationship management" },
        ensureTerminalPunctuation: true,
      }),
    ).toBe("customer relationship management review.");
  });
});

describe("renderNarrationDocument semantic structure", () => {
  it("returns a versioned, hashed, self-describing document", () => {
    const document = render();

    for (const [field, version] of Object.entries(document.recipe.versions)) {
      expect(version, field).toEqual(expect.any(String));
      expect(version.length, field).toBeGreaterThan(0);
    }
    expect(document.schemaVersion).toMatch(/\S/);
    expect(document.recipe.versions.contentRevision).toBe("content-revision-fixture-v1");
    expect(document.hashes.source).toMatch(/^[a-f0-9]{64}$/);
    expect(document.hashes.document).toMatch(/^[a-f0-9]{64}$/);
    expect(document.blocks.length).toBeGreaterThan(0);
    expect(Array.isArray(document.warnings)).toBe(true);
    expect(document.stats.blockCount).toBe(document.blocks.length);
    expect(document.stats.warningCount).toBe(document.warnings.length);
  });

  it("keeps headings, paragraphs, list items, table rows, form previews, and callouts semantic", () => {
    const document = render();
    const heading = document.blocks.find(
      (block) => block.type === "heading" && block.spokenText.includes("How it works"),
    );
    const paragraph = document.blocks.find(
      (block) => block.type === "paragraph" && block.spokenText.includes("First paragraph"),
    );
    const listItems = document.blocks.filter((block) => block.type === "listItem");
    const tableRow = document.blocks.find(
      (block) =>
        block.type === "tableRow" &&
        block.cells.some((cell) => cell.spokenValue.includes("A I readiness")),
    );
    const formPreview = document.blocks.find((block) => block.type === "formField");
    const callout = document.blocks.find((block) => block.type === "callout");

    expect(heading).toBeDefined();
    expect(paragraph).toBeDefined();
    expect(
      listItems.map((block) => (block.type === "listItem" ? block.spokenText : "")),
    ).toEqual([
      expect.stringContaining("Use A I safely"),
      expect.stringContaining("Keep a human reviewer"),
    ]);
    expect(tableRow?.type).toBe("tableRow");
    if (tableRow?.type === "tableRow") {
      expect(
        tableRow.cells.map((cell) => [cell.spokenLabel, cell.spokenValue]),
      ).toEqual([
        ["Week", "one."],
        ["Focus", "A I readiness."],
        ["Badge", "A I Core."],
      ]);
    }
    expect(formPreview?.type).toBe("formField");
    if (formPreview?.type === "formField") {
      expect(formPreview.spokenLabel).toContain("The application screen");
      expect(formPreview.spokenDescription).toContain("The prospect describes the problem");
    }
    expect(callout?.type).toBe("callout");
    if (callout?.type === "callout") {
      expect(callout.spokenText).toContain("Do not say this");
      expect(callout.spokenText).toContain("A I guarantees a result");
    }

    const spoken = textOf(document);
    expect(spoken).not.toContain("WeekFocus");
    expect(spoken).not.toContain("FocusBadge");
    expect(spoken).not.toContain("screenThe prospect");
    expect(spoken).not.toContain("this must never be narrated");
    expect(spoken).not.toContain("also-not-narration");
  });

  it("assigns stable unique ids, clean text, and controlled pauses to every block", () => {
    const document = render();
    const ids = document.blocks.map((block) => block.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const block of document.blocks) {
      const spokenText = spokenTextOfBlock(block);
      expect(block.id).toMatch(/\S/);
      expect(spokenText).toBe(spokenText.trim());
      expect(spokenText).not.toMatch(/<[^>]+>/);
      expect(Number.isInteger(block.pauseAfterMs)).toBe(true);
      expect(block.pauseAfterMs).toBeGreaterThanOrEqual(0);
    }

    const headingPause = document.blocks.find((block) => block.type === "heading")?.pauseAfterMs;
    const paragraphPause = document.blocks.find((block) => block.type === "paragraph")?.pauseAfterMs;
    const listPause = document.blocks.find((block) => block.type === "listItem")?.pauseAfterMs;
    expect(headingPause).toBeGreaterThan(paragraphPause ?? -1);
    expect(paragraphPause).toBeGreaterThan(listPause ?? -1);
  });

  it("preserves visible information and its source order after spoken normalization", () => {
    const spoken = textOf(render());
    const orderedPhrases = [
      "How it works",
      "First paragraph",
      "Use A I safely",
      "Keep a human reviewer",
      "Week: one",
      "Focus: A I readiness",
      "Badge: A I Core",
      "The application screen",
      "The prospect describes the problem",
      "Do not say this",
    ];

    let previous = -1;
    for (const phrase of orderedPhrases) {
      const at = spoken.indexOf(phrase);
      expect(at, phrase).toBeGreaterThan(previous);
      previous = at;
    }
  });
});

describe("narration hashes and warnings", () => {
  it("canonicalizes object keys for hashes while preserving meaningful array order", () => {
    expect(stableNarrationStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(stableNarrationHash({ b: 2, a: 1 }, "contract")).toBe(
      stableNarrationHash({ a: 1, b: 2 }, "contract"),
    );
    expect(stableNarrationHash(["first", "second"], "contract")).not.toBe(
      stableNarrationHash(["second", "first"], "contract"),
    );
    expect(() => stableNarrationHash({ invalid: Number.NaN })).toThrow(/finite/i);
  });

  it("is byte-for-byte deterministic and changes both hashes when visible source changes", () => {
    const first = render();
    const second = render();
    const changed = render(SAMPLE_HTML.replace("First paragraph.", "Changed paragraph."));

    expect(second).toEqual(first);
    expect(changed.hashes.source).not.toBe(first.hashes.source);
    expect(changed.hashes.document).not.toBe(first.hashes.document);

    const firstHeading = first.blocks.find((block) => block.type === "heading");
    const changedHeading = changed.blocks.find((block) => block.type === "heading");
    expect(changedHeading?.id).toBe(firstHeading?.id);
  });

  it("invalidates the recipe/document, but not source/blocks, for a content-revision-only change", () => {
    const first = renderNarrationDocument({
      slug: "revision-fixture",
      html: "<p>Identical visible content.</p>",
      contentRevisionHash: "revision-one",
    });
    const second = renderNarrationDocument({
      slug: "revision-fixture",
      html: "<p>Identical visible content.</p>",
      contentRevisionHash: "revision-two",
    });

    expect(second.hashes.source).toBe(first.hashes.source);
    expect(second.hashes.blocks).toBe(first.hashes.blocks);
    expect(second.hashes.contentRevision).not.toBe(first.hashes.contentRevision);
    expect(second.hashes.recipe).not.toBe(first.hashes.recipe);
    expect(second.hashes.document).not.toBe(first.hashes.document);
  });

  it("includes pronunciation and pause overrides in blocks, recipe hashes, and document hashes", () => {
    const baseline = renderNarrationDocument({
      slug: "override-fixture",
      html: "<h2>CRM review</h2>",
      contentRevisionHash: "same-content",
    });
    const overridden = renderNarrationDocument({
      slug: "override-fixture",
      html: "<h2>CRM review</h2>",
      contentRevisionHash: "same-content",
      overrides: {
        revision: "owner-approved-v2",
        pronunciations: { CRM: "customer relationship management" },
        pauseProfile: { heading: 1_200 },
      },
    });
    const heading = overridden.blocks.find((block) => block.type === "heading");

    expect(overridden.hashes.source).toBe(baseline.hashes.source);
    expect(overridden.hashes.recipe).not.toBe(baseline.hashes.recipe);
    expect(overridden.hashes.blocks).not.toBe(baseline.hashes.blocks);
    expect(overridden.hashes.document).not.toBe(baseline.hashes.document);
    expect(heading?.type).toBe("heading");
    if (heading?.type === "heading") {
      expect(heading.spokenText).toContain("customer relationship management");
      expect(heading.pauseAfterMs).toBe(1_200);
    }
  });

  it("emits deterministic, actionable warnings for missing table semantics", () => {
    const html = `
      <table><tbody><tr><td>orphan value</td></tr></tbody></table>
    `;
    const first = render(html);
    const second = render(html);
    const codes = warningCodes(first);

    expect(first.warnings).toEqual(second.warnings);
    expect(codes).toContain("MISSING_TABLE_HEADER");
    for (const warning of first.warnings) {
      expect(warning.code).toMatch(/^[A-Z0-9_:-]+$/i);
      expect(warning.message.trim().length).toBeGreaterThan(0);
      expect(warning.message.length).toBeLessThan(500);
    }
  });

  it("warns when a manual block override cannot be applied", () => {
    const document = renderNarrationDocument({
      slug: "missing-override-fixture",
      html: "<p>Visible content.</p>",
      overrides: {
        revision: "bad-target-v1",
        blocks: {
          "block-that-does-not-exist": { spokenText: "Must not be silently used." },
        },
      },
    });

    expect(warningCodes(document)).toContain("OVERRIDE_TARGET_NOT_FOUND");
    expect(textOf(document)).not.toContain("Must not be silently used");
  });

  it("reports empty narration instead of silently creating a contentless document", () => {
    const document = renderNarrationDocument({
      slug: "empty-fixture",
      html: "  <!-- no visible content -->  ",
      contentRevisionHash: "empty-v1",
    });

    expect(document.blocks).toEqual([]);
    expect(warningCodes(document)).toContain("EMPTY_DOCUMENT");
  });
});

describe("formatNarrationPreview", () => {
  it("produces a deterministic, human-auditable preview with blocks and pauses", () => {
    const document = render();
    const preview = formatNarrationPreview(document);

    expect(formatNarrationPreview(document)).toBe(preview);
    expect(preview).toContain("How it works");
    expect(preview).toContain("Week = 1");
    expect(preview).toMatch(/heading/i);
    expect(preview).toMatch(/table\s*row/i);
    expect(preview).toMatch(/(?:pause|ms)/i);
    expect(preview).not.toMatch(/<script|<table|<td/i);
  });
});

describe("Phase 0/1 provider isolation", () => {
  it("does not call fetch while normalizing, rendering, hashing, or formatting a preview", () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("The pure narration layer must not call an external API.");
    });
    vi.stubGlobal("fetch", fetchSpy);

    normalizeSpokenText("AI at TenXPros.");
    const document = render();
    formatNarrationPreview(document);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
