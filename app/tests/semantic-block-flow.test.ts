import { describe, expect, it } from "vitest";

import {
  INTERNAL_SENTENCE_DETECTOR,
  SEMANTIC_BLOCK_REALIZATION_GUARD_MILLISECONDS,
  buildSemanticBlockPlan,
  findExactZeroRuns,
  locateSafeEdgeTrim,
  measureInternalSentencePauses,
  summarizeSemanticFlowPauses,
} from "../src/lib/academy/narration/semantic-block-flow";

function unit(
  id: string,
  block: string,
  text: string,
  pauseAfterMs: number,
) {
  return {
    id,
    sourceBlockId: block,
    text,
    textSha256: "a".repeat(64),
    pauseAfterMs,
  };
}

describe("semantic-block Piper flow", () => {
  it("uses measured realization guards for codec quantization", () => {
    expect(
      SEMANTIC_BLOCK_REALIZATION_GUARD_MILLISECONDS,
    ).toEqual({ default: 1, tableRow: 25 });
  });

  it("measures internal flow at one-millisecond resolution", () => {
    expect(
      INTERNAL_SENTENCE_DETECTOR.windowMilliseconds,
    ).toBe(1);
  });

  it("uses one request per paragraph, not one per sentence", () => {
    const blocks = buildSemanticBlockPlan([
      unit("p1-s1", "root/p[1]", "First.", 220),
      unit("p1-s2", "root/p[1]", "Second.", 500),
      unit("h1", "root/h2[1]", "Heading.", 0),
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({
      kind: "paragraph",
      synthesisText: "First. Second.",
      sentenceCount: 2,
      pauseType: "paragraph",
      effectivePauseTargetMilliseconds: 700,
    });
    expect(blocks[0]?.sentenceUnitIds).toEqual([
      "p1-s1",
      "p1-s2",
    ]);
  });

  it("keeps internal sentence boundaries inside the block", () => {
    const [paragraph] = buildSemanticBlockPlan([
      unit("one", "root/p[1]", "One.", 220),
      unit("two", "root/p[1]", "Two.", 220),
      unit("three", "root/p[1]", "Three.", 500),
    ]);
    expect(paragraph?.sentenceCount).toBe(3);
    expect(paragraph?.pauseType).toBe("paragraph");
    expect(
      paragraph?.sentenceUnitIds.length,
    ).toBe(3);
  });

  it("measures energy around internal Piper zero anchors", () => {
    const configured = 3_307;
    const pcm = Int16Array.from([
      ...Array<number>(2_000).fill(8_000),
      ...Array<number>(220).fill(4),
      ...Array<number>(configured).fill(0),
      ...Array<number>(220).fill(-4),
      ...Array<number>(2_000).fill(-8_000),
      ...Array<number>(configured).fill(0),
    ]);
    expect(
      findExactZeroRuns(pcm, configured - 2),
    ).toHaveLength(2);
    const pauses = measureInternalSentencePauses(
      pcm,
      {
        sentenceCount: 2,
        sentenceSilenceSeconds: 0.15,
        detector: INTERNAL_SENTENCE_DETECTOR,
      },
    );
    expect(pauses).toHaveLength(1);
    expect(
      pauses[0]!.effectivePauseMilliseconds,
    ).toBeGreaterThan(150);
    expect(
      pauses[0]!.effectivePauseMilliseconds,
    ).toBeLessThan(300);
  });

  it("preserves heading and section hierarchy and controlled row targets", () => {
    const blocks = buildSemanticBlockPlan([
      unit(
        "heading",
        "root/h2[1]",
        "Heading.",
        700,
      ),
      unit(
        "callout",
        "root/div[1]",
        "Callout.",
        900,
      ),
      unit(
        "row",
        "root/table[1]/tbody[1]/tr[1]",
        "Row.",
        0,
      ),
    ]);
    expect(
      blocks[0]?.effectivePauseTargetMilliseconds,
    ).toBe(900);
    expect(
      blocks[1]?.effectivePauseTargetMilliseconds,
    ).toBe(1_050);
    expect(
      blocks[1]!.effectivePauseTargetMilliseconds -
        blocks[0]!
          .effectivePauseTargetMilliseconds,
    ).toBeLessThanOrEqual(250);
  });

  it("cannot trim beyond a proven low-amplitude edge", () => {
    const unsafe = Int16Array.from([
      ...Array<number>(100).fill(8_000),
      ...Array<number>(100).fill(2_000),
    ]);
    expect(
      locateSafeEdgeTrim({
        pcm: unsafe,
        direction: "trailing",
        requestedFrames: 20,
        maximumFrames: 80,
      }).safe,
    ).toBe(false);
    const safe = Int16Array.from([
      ...Array<number>(100).fill(8_000),
      ...Array<number>(100).fill(0),
    ]);
    expect(
      locateSafeEdgeTrim({
        pcm: safe,
        direction: "trailing",
        requestedFrames: 20,
        maximumFrames: 80,
      }).safe,
    ).toBe(true);
  });

  it("keeps focused-panel p95 distinct from the maximum", () => {
    const summary = summarizeSemanticFlowPauses([
      210, 220, 225, 240, 245, 250, 275, 285, 285, 300,
      320, 369,
    ]);
    expect(summary.medianMilliseconds).toBe(262.5);
    expect(summary.p95Milliseconds).toBeCloseTo(342.05, 5);
    expect(summary.maximumMilliseconds).toBe(369);
  });
});
