import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOW_ENERGY_DETECTOR,
  framesToMilliseconds,
  measureLowEnergyEdge,
  millisecondsToNearestFrames,
  planEffectivePauseBoundary,
  summarizeEffectivePauses,
} from "../src/lib/academy/narration/effective-pause-normalization";

function pcm(
  leadingFrames: number,
  speechFrames: number,
  trailingFrames: number,
): Int16Array {
  return Int16Array.from([
    ...Array<number>(leadingFrames).fill(8),
    ...Array<number>(speechFrames).fill(8_000),
    ...Array<number>(trailingFrames).fill(-8),
  ]);
}

describe("effective Piper pause normalization", () => {
  it("measures only contiguous low-energy segment edges", () => {
    const windowFrames = millisecondsToNearestFrames(
      DEFAULT_LOW_ENERGY_DETECTOR.windowMilliseconds,
    );
    const clip = pcm(
      windowFrames * 4,
      windowFrames * 2,
      windowFrames * 6,
    );
    expect(
      measureLowEnergyEdge(clip, "leading")
        .lowEnergyFrames,
    ).toBe(windowFrames * 4);
    expect(
      measureLowEnergyEdge(clip, "trailing")
        .lowEnergyFrames,
    ).toBe(windowFrames * 6);
  });

  it("inserts only the silence missing from an effective target", () => {
    const trailing = millisecondsToNearestFrames(90);
    const leading = millisecondsToNearestFrames(50);
    const plan = planEffectivePauseBoundary({
      targetMilliseconds: 700,
      trailingLowEnergyFrames: trailing,
      leadingLowEnergyFrames: leading,
    });
    expect(plan.normalizationMode).toBe(
      "INSERTION_ONLY",
    );
    expect(
      framesToMilliseconds(
        plan.predictedEffectivePauseFrames,
      ),
    ).toBeCloseTo(700, 1);
    expect(plan.insertedSilenceFrames).toBe(
      millisecondsToNearestFrames(700) -
        trailing -
        leading,
    );
  });

  it("trims only proven padding beyond both safety margins", () => {
    const plan = planEffectivePauseBoundary({
      targetMilliseconds: 180,
      trailingLowEnergyFrames:
        millisecondsToNearestFrames(200),
      leadingLowEnergyFrames:
        millisecondsToNearestFrames(70),
    });
    expect(plan.normalizationMode).toBe(
      "SAFE_TRIM_AND_INSERT",
    );
    expect(plan.safeTrimAvailable).toBe(true);
    expect(
      plan.requestedTrailingTrimFrames +
        plan.requestedLeadingTrimFrames,
    ).toBe(millisecondsToNearestFrames(90));
    expect(
      plan.predictedEffectivePauseFrames,
    ).toBe(millisecondsToNearestFrames(180));
  });

  it("falls back without trimming when safety margins cannot be preserved", () => {
    const plan = planEffectivePauseBoundary({
      targetMilliseconds: 20,
      trailingLowEnergyFrames:
        millisecondsToNearestFrames(40),
      leadingLowEnergyFrames:
        millisecondsToNearestFrames(40),
    });
    expect(plan.normalizationMode).toBe(
      "UNSAFE_TRIM_INSERTION_ONLY_FALLBACK",
    );
    expect(plan.requestedTrailingTrimFrames).toBe(0);
    expect(plan.requestedLeadingTrimFrames).toBe(0);
  });

  it("uses deterministic median and nearest-rank p95", () => {
    expect(
      summarizeEffectivePauses([100, 200, 300, 400]),
    ).toEqual({
      count: 4,
      minimumMilliseconds: 100,
      medianMilliseconds: 250,
      p95Milliseconds: 400,
      maximumMilliseconds: 400,
    });
    expect(summarizeEffectivePauses([]).count).toBe(0);
  });
});
