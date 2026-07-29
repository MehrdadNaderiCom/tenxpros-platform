import { describe, expect, it } from "vitest";

import {
  FINAL_PIPER_RECIPE,
  FINAL_PIPER_RECIPE_HASH,
} from "../src/lib/academy/narration/final-piper-recipe";
import {
  SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
  buildSemanticBlockPlan,
} from "../src/lib/academy/narration/semantic-block-flow";

function unit(
  id: string,
  sourceBlockId: string,
  text: string,
  pauseAfterMs: number,
) {
  return {
    id,
    sourceBlockId,
    text,
    textSha256: "a".repeat(64),
    pauseAfterMs,
  };
}

describe("final frozen Piper recipe", () => {
  it("pins the immutable version, parent, and deterministic hash", () => {
    expect(FINAL_PIPER_RECIPE).toMatchObject({
      recipeVersion:
        "semantic-block-flow-v2-final",
      status: "FROZEN",
      parent: {
        recipeVersion:
          "semantic-block-flow-v1",
        planHash:
          "110fbd6db6d5a7c59f4d3d31c7e538e7a215d9dd9066c3ecea4dfb93a32ce599",
      },
      piper: {
        sentenceSilenceSeconds: 0.15,
        lengthScale: 1,
      },
      voice: { id: "bryce" },
    });
    expect(FINAL_PIPER_RECIPE_HASH).toBe(
      "0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe",
    );
  });

  it("changes only the approved paragraph and callout targets", () => {
    expect(
      SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
    ).toEqual({
      list: 300,
      tableRow: 270,
      paragraph: 800,
      callout: 700,
      heading: 900,
      section: 1_050,
    });
  });

  it("preserves semantic-block segmentation while applying final targets", () => {
    const blocks = buildSemanticBlockPlan(
      [
        unit(
          "p1-s1",
          "root/p[1]",
          "First.",
          220,
        ),
        unit(
          "p1-s2",
          "root/p[1]",
          "Second.",
          500,
        ),
        unit(
          "callout",
          "root/div[1]",
          "Notice.",
          500,
        ),
        unit(
          "heading",
          "root/h2[1]",
          "Next.",
          0,
        ),
      ],
      SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
    );
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({
      sentenceCount: 2,
      synthesisText: "First. Second.",
      effectivePauseTargetMilliseconds: 800,
    });
    expect(blocks[1]).toMatchObject({
      kind: "callout",
      effectivePauseTargetMilliseconds: 700,
    });
  });
});
