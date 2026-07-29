import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import type {
  NarrationParagraphBlock,
} from "../src/lib/academy/narration/contracts";
import { normalizeSpokenText } from "../src/lib/academy/narration/normalization";
import {
  LONG_BLOCK_SEGMENTATION_POLICIES,
  segmentLongNarrationBlocks,
} from "../src/lib/academy/narration/segmentation";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";

function lessonDocument(slug: string) {
  const lesson = ACADEMY_MODULES.find((candidate) => candidate.slug === slug);
  if (!lesson) {
    throw new Error(`Missing Academy lesson: ${slug}`);
  }

  return renderNarrationDocument({
    slug,
    title: lesson.title,
    html: lesson.bodyHtml ?? "",
  });
}

describe("source-bound Academy long-block segmentation", () => {
  it.each([
    ["rules", 102],
    ["motions", 57],
  ] as const)(
    "segments the reviewed %s blocks without changing either text stream",
    (slug, finalBlockCount) => {
      const document = lessonDocument(slug);
      const policies = LONG_BLOCK_SEGMENTATION_POLICIES.filter(
        (policy) => policy.slug === slug,
      );

      expect(document.blocks).toHaveLength(finalBlockCount);
      expect(
        document.warnings.filter(
          (warning) =>
            warning.code ===
              "NARRATION_ALIGNMENT_INVALID_SEMANTIC_DRIFT" ||
            warning.code === "LONG_SPOKEN_BLOCK",
        ),
      ).toEqual([]);

      for (const policy of policies) {
        const segments = document.blocks.filter(
          (block): block is NarrationParagraphBlock =>
            block.type === "paragraph" &&
            block.source?.path === policy.sourcePath &&
            block.id.startsWith(`${policy.sourcePath}#segment[`),
        );
        expect(segments).toHaveLength(
          policy.breakAfterSentenceNumbers.length + 1,
        );
        const visibleText = segments
          .map((block) => block.visibleText)
          .join(" ");
        const spokenText = segments
          .map((block) => block.spokenText)
          .join(" ");
        expect(
          createHash("sha256").update(visibleText).digest("hex"),
        ).toBe(policy.visibleTextSha256);
        expect(spokenText).toBe(
          normalizeSpokenText(visibleText, {
            pronunciations: document.recipe.pronunciations,
            approvedUrls: document.recipe.approvedUrls,
            approvedEmails: document.recipe.approvedEmails,
          }),
        );
        expect(segments.at(-1)?.pauseAfterMs).toBe(
          document.recipe.pauseProfile.paragraph,
        );
        expect(
          segments
            .slice(0, -1)
            .every(
              (block) =>
                block.pauseAfterMs === document.recipe.pauseProfile.sentence,
            ),
        ).toBe(true);
      }

      const secondPass = segmentLongNarrationBlocks({
        slug,
        blocks: document.blocks,
        normalizeSpokenText: (visibleText) => visibleText,
        pauseProfile: document.recipe.pauseProfile,
      });
      expect(secondPass).toEqual({
        blocks: document.blocks,
        warnings: [],
      });
    },
  );

  it("fails closed when reviewed visible text changes", () => {
    const document = lessonDocument("motions");
    const targetPolicy = LONG_BLOCK_SEGMENTATION_POLICIES.find(
      (policy) => policy.slug === "motions",
    );
    const segments = document.blocks.filter(
      (block): block is NarrationParagraphBlock =>
        block.type === "paragraph" &&
        block.source?.path === targetPolicy?.sourcePath &&
        block.id.startsWith(`${targetPolicy?.sourcePath}#segment[`),
    );
    expect(segments.length).toBeGreaterThan(1);
    if (!targetPolicy || !segments.length) return;

    const lastSegment = segments.at(-1)!;
    const changed: NarrationParagraphBlock = {
      ...segments[0],
      id: targetPolicy.sourcePath,
      visibleText: `${segments.map((block) => block.visibleText).join(" ")} Changed.`,
      spokenText: `${segments.map((block) => block.spokenText).join(" ")} Changed.`,
      pauseAfterMs: lastSegment.pauseAfterMs,
    };
    const result = segmentLongNarrationBlocks({
      slug: "motions",
      blocks: [changed],
      normalizeSpokenText: (visibleText) => normalizeSpokenText(visibleText),
      pauseProfile: document.recipe.pauseProfile,
    });

    expect(result.blocks).toEqual([changed]);
    expect(
      result.blocks.some((block) =>
        block.id.startsWith(`${changed.id}#segment[`),
      ),
    ).toBe(false);
    expect(result.warnings).toMatchObject([
      {
        blockId: changed.id,
        code: "NARRATION_ALIGNMENT_INVALID_SEMANTIC_DRIFT",
        severity: "error",
        details: { reason: "visible-text-hash-mismatch" },
      },
    ]);
  });
});
