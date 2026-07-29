import { describe, expect, it } from "vitest";

import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import { sanitizeLessonHtml } from "../src/lib/academy/lesson-html";
import { auditNarrationDocumentAlignment } from "../src/lib/academy/narration/alignment";
import { FROZEN_ACADEMY_NARRATION_OVERRIDES } from "../src/lib/academy/narration/approved-pronunciations";
import {
  MAX_SAFE_NARRATION_CHUNK_CHARACTERS,
  planNarrationChunks,
} from "../src/lib/academy/narration/chunking";
import type { NarrationDocument } from "../src/lib/academy/narration/contracts";
import {
  formatNarrationSpokenScript,
  narrationBlockToSpokenText,
} from "../src/lib/academy/narration/preview";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";

function renderCorpus(): NarrationDocument[] {
  return ACADEMY_MODULES.map((module) =>
    renderNarrationDocument({
      slug: module.slug,
      title: module.title,
      html: sanitizeLessonHtml(module.bodyHtml ?? ""),
      contentRevisionHash: `corpus-${module.slug}-phase1`,
      overrides: FROZEN_ACADEMY_NARRATION_OVERRIDES,
    }),
  );
}

describe("the revised 17-lesson Academy narration corpus", () => {
  it("freezes with zero owner-review and invalid-drift blocks", () => {
    const audits = renderCorpus().map((document) =>
      auditNarrationDocumentAlignment(document),
    );

    expect(
      audits.reduce(
        (total, audit) =>
          total +
          audit.summary.blocksByClassification
            .REQUIRES_OWNER_REVIEW,
        0,
      ),
    ).toBe(0);
    expect(
      audits.reduce(
        (total, audit) =>
          total +
          audit.summary.blocksByClassification
            .INVALID_SEMANTIC_DRIFT,
        0,
      ),
    ).toBe(0);
    expect(
      audits.reduce(
        (total, audit) =>
          total +
          audit.summary.pendingOwnerReviewOccurrenceCount,
        0,
      ),
    ).toBe(0);
  });

  it("renders every canonical lesson in order with no blocking narration warning", () => {
    const documents = renderCorpus();

    expect(documents).toHaveLength(17);
    expect(documents.map((document) => document.slug)).toEqual(
      ACADEMY_MODULES.map((module) => module.slug),
    );
    for (const document of documents) {
      expect(document.blocks.length, document.slug).toBeGreaterThan(0);
      expect(
        document.warnings.filter((warning) => warning.severity === "error"),
        document.slug,
      ).toEqual([]);
    }
  });

  it("renders the introductory Mission as separated semantic content", () => {
    const mission = renderCorpus().find(
      (document) => document.slug === "mission",
    )!;

    expect(mission.blocks[0]?.type).toBe("heading");
    expect(mission.blocks.some((block) => block.type === "paragraph")).toBe(
      true,
    );
    expect(mission.blocks.some((block) => block.type === "listItem")).toBe(
      true,
    );
    expect(mission.blocks.some((block) => block.type === "tableRow")).toBe(
      true,
    );
  });

  it("speaks the Module 5 table as Week one instead of a raw numeric cell", () => {
    const journey = renderCorpus().find(
      (document) => document.slug === "journey",
    )!;
    const weekOneRow = journey.blocks.find(
      (block) =>
        block.type === "tableRow" &&
        block.cells.some(
          (cell) =>
            cell.visibleLabel === "Week" && cell.visibleValue === "1",
        ),
    );

    expect(weekOneRow?.type).toBe("tableRow");
    expect(narrationBlockToSpokenText(weekOneRow!)).toContain("Week one.");
    expect(narrationBlockToSpokenText(weekOneRow!)).not.toContain("Week: 1.");
  });

  it("keeps Module 10 objections and application previews semantic", () => {
    const conversation = renderCorpus().find(
      (document) => document.slug === "conversation",
    )!;
    const script = formatNarrationSpokenScript(conversation.blocks);

    expect(
      conversation.blocks.filter((block) => block.type === "formField").length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      conversation.blocks.some((block) => block.type === "tableRow"),
    ).toBe(true);
    expect(script).toMatch(/application/i);
    expect(script).toMatch(/objection|cost|discount/i);
  });

  it("identifies the dense Rules lesson and safely plans every lesson below the chunk limit", () => {
    const documents = renderCorpus();
    const lengths = documents.map((document) => ({
      slug: document.slug,
      characters: formatNarrationSpokenScript(document.blocks).length,
    }));
    const longest = lengths.reduce((left, right) =>
      right.characters > left.characters ? right : left,
    );

    expect(longest.slug).toBe("rules");
    for (const document of documents) {
      const chunks = planNarrationChunks(document.blocks);
      expect(chunks.length, document.slug).toBeGreaterThan(0);
      expect(
        Math.max(...chunks.map((chunk) => chunk.characterCount)),
        document.slug,
      ).toBeLessThanOrEqual(MAX_SAFE_NARRATION_CHUNK_CHARACTERS);
    }
  });
});
