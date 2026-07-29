export const EFFECTIVE_PAUSE_NORMALIZATION_VERSION =
  "academy-effective-pause-normalization-v1";

export const EFFECTIVE_PAUSE_TYPES = [
  "sentence",
  "list",
  "tableRow",
  "paragraph",
  "callout",
  "heading",
  "section",
] as const;

export type EffectivePauseType =
  (typeof EFFECTIVE_PAUSE_TYPES)[number];

export interface LowEnergyDetectorConfig {
  sampleRate: number;
  windowMilliseconds: number;
  rmsThresholdDbfs: number;
  peakThresholdDbfs: number;
  safetyMarginMilliseconds: number;
  safeCutSearchMilliseconds: number;
  safeCutMaximumAbsoluteSample: number;
}

export const DEFAULT_LOW_ENERGY_DETECTOR =
  Object.freeze({
    sampleRate: 22_050,
    windowMilliseconds: 10,
    rmsThresholdDbfs: -46,
    peakThresholdDbfs: -34,
    safetyMarginMilliseconds: 30,
    safeCutSearchMilliseconds: 10,
    safeCutMaximumAbsoluteSample: 128,
  }) satisfies LowEnergyDetectorConfig;

export interface LowEnergyWindow {
  startFrame: number;
  endFrame: number;
  rmsDbfs: number | null;
  peakDbfs: number | null;
  maximumAbsoluteSample: number;
  lowEnergy: boolean;
}

export interface LowEnergyEdgeMeasurement {
  direction: "leading" | "trailing";
  lowEnergyFrames: number;
  lowEnergyMilliseconds: number;
  windowFrames: number;
  windows: readonly LowEnergyWindow[];
}

export interface EffectivePauseBoundaryPlan {
  targetFrames: number;
  targetMilliseconds: number;
  trailingLowEnergyFrames: number;
  leadingLowEnergyFrames: number;
  requestedTrailingTrimFrames: number;
  requestedLeadingTrimFrames: number;
  insertedSilenceFrames: number;
  predictedEffectivePauseFrames: number;
  predictedEffectivePauseMilliseconds: number;
  normalizationMode:
    | "INSERTION_ONLY"
    | "SAFE_TRIM_AND_INSERT"
    | "UNSAFE_TRIM_INSERTION_ONLY_FALLBACK";
  safeTrimAvailable: boolean;
}

export interface EffectivePauseDistribution {
  count: number;
  minimumMilliseconds: number | null;
  medianMilliseconds: number | null;
  p95Milliseconds: number | null;
  maximumMilliseconds: number | null;
}

function assertPcm(
  pcm: Int16Array,
  config: LowEnergyDetectorConfig,
): void {
  if (!(pcm instanceof Int16Array) || pcm.length === 0) {
    throw new Error("PCM must be a non-empty Int16Array");
  }
  for (const [field, value] of Object.entries(config)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Detector ${field} must be finite`);
    }
  }
  if (
    !Number.isInteger(config.sampleRate) ||
    config.sampleRate <= 0 ||
    config.windowMilliseconds <= 0 ||
    config.safetyMarginMilliseconds < 0 ||
    config.safeCutSearchMilliseconds < 0 ||
    !Number.isInteger(
      config.safeCutMaximumAbsoluteSample,
    ) ||
    config.safeCutMaximumAbsoluteSample < 0 ||
    config.safeCutMaximumAbsoluteSample > 32_768
  ) {
    throw new Error("Detector configuration is outside safe bounds");
  }
}

export function millisecondsToNearestFrames(
  milliseconds: number,
  sampleRate = 22_050,
): number {
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds < 0 ||
    !Number.isInteger(sampleRate) ||
    sampleRate <= 0
  ) {
    throw new Error(
      "Milliseconds and sample rate must be non-negative and valid",
    );
  }
  return Math.round(
    (milliseconds * sampleRate) / 1_000,
  );
}

export function framesToMilliseconds(
  frames: number,
  sampleRate = 22_050,
): number {
  if (
    !Number.isInteger(frames) ||
    frames < 0 ||
    !Number.isInteger(sampleRate) ||
    sampleRate <= 0
  ) {
    throw new Error(
      "Frames and sample rate must be non-negative integers",
    );
  }
  return (frames * 1_000) / sampleRate;
}

function amplitudeDbfs(value: number): number | null {
  return value === 0
    ? null
    : 20 * Math.log10(value / 32_768);
}

function analyzeWindow(
  pcm: Int16Array,
  startFrame: number,
  endFrame: number,
  config: LowEnergyDetectorConfig,
): LowEnergyWindow {
  let maximumAbsoluteSample = 0;
  let sumSquares = 0;
  for (
    let frame = startFrame;
    frame < endFrame;
    frame += 1
  ) {
    const sample = pcm[frame] ?? 0;
    const absolute = Math.abs(sample);
    maximumAbsoluteSample = Math.max(
      maximumAbsoluteSample,
      absolute,
    );
    const normalized = sample / 32_768;
    sumSquares += normalized * normalized;
  }
  const frameCount = endFrame - startFrame;
  const rms =
    frameCount === 0
      ? 0
      : Math.sqrt(sumSquares / frameCount);
  const rmsDbfs =
    rms === 0 ? null : 20 * Math.log10(rms);
  const peakDbfs = amplitudeDbfs(
    maximumAbsoluteSample,
  );
  const lowEnergy =
    (rmsDbfs === null ||
      rmsDbfs <= config.rmsThresholdDbfs) &&
    (peakDbfs === null ||
      peakDbfs <= config.peakThresholdDbfs);
  return {
    startFrame,
    endFrame,
    rmsDbfs,
    peakDbfs,
    maximumAbsoluteSample,
    lowEnergy,
  };
}

/**
 * Measures only the contiguous low-energy envelope touching a segment edge.
 * A louder window terminates the scan, so internal phoneme gaps cannot be
 * mistaken for removable boundary padding.
 */
export function measureLowEnergyEdge(
  pcm: Int16Array,
  direction: "leading" | "trailing",
  config: LowEnergyDetectorConfig =
    DEFAULT_LOW_ENERGY_DETECTOR,
): LowEnergyEdgeMeasurement {
  assertPcm(pcm, config);
  const windowFrames = Math.max(
    1,
    millisecondsToNearestFrames(
      config.windowMilliseconds,
      config.sampleRate,
    ),
  );
  const windows: LowEnergyWindow[] = [];
  let lowEnergyFrames = 0;

  if (direction === "leading") {
    for (
      let startFrame = 0;
      startFrame < pcm.length;
      startFrame += windowFrames
    ) {
      const window = analyzeWindow(
        pcm,
        startFrame,
        Math.min(
          pcm.length,
          startFrame + windowFrames,
        ),
        config,
      );
      windows.push(window);
      if (!window.lowEnergy) break;
      lowEnergyFrames +=
        window.endFrame - window.startFrame;
    }
  } else {
    for (
      let endFrame = pcm.length;
      endFrame > 0;
      endFrame -= windowFrames
    ) {
      const window = analyzeWindow(
        pcm,
        Math.max(0, endFrame - windowFrames),
        endFrame,
        config,
      );
      windows.push(window);
      if (!window.lowEnergy) break;
      lowEnergyFrames +=
        window.endFrame - window.startFrame;
    }
  }

  return {
    direction,
    lowEnergyFrames,
    lowEnergyMilliseconds: framesToMilliseconds(
      lowEnergyFrames,
      config.sampleRate,
    ),
    windowFrames,
    windows,
  };
}

function allocateSafeTrim(
  requiredFrames: number,
  trailingAvailableFrames: number,
  leadingAvailableFrames: number,
): {
  trailingFrames: number;
  leadingFrames: number;
} {
  if (requiredFrames === 0) {
    return { trailingFrames: 0, leadingFrames: 0 };
  }
  const available =
    trailingAvailableFrames + leadingAvailableFrames;
  const proportionalTrailing = Math.min(
    trailingAvailableFrames,
    Math.floor(
      (requiredFrames * trailingAvailableFrames) /
        available,
    ),
  );
  let trailingFrames = proportionalTrailing;
  let leadingFrames = Math.min(
    leadingAvailableFrames,
    requiredFrames - trailingFrames,
  );
  trailingFrames += Math.min(
    trailingAvailableFrames - trailingFrames,
    requiredFrames -
      trailingFrames -
      leadingFrames,
  );
  leadingFrames +=
    requiredFrames -
    trailingFrames -
    leadingFrames;
  return { trailingFrames, leadingFrames };
}

/**
 * Produces a frame-exact target while retaining a low-energy safety margin on
 * both sides. If the target would require trimming outside the proven
 * low-energy envelopes, it fails closed to an insertion-only plan.
 */
export function planEffectivePauseBoundary(input: {
  targetMilliseconds: number;
  trailingLowEnergyFrames: number;
  leadingLowEnergyFrames: number;
  config?: LowEnergyDetectorConfig;
}): EffectivePauseBoundaryPlan {
  const config =
    input.config ?? DEFAULT_LOW_ENERGY_DETECTOR;
  const targetFrames = millisecondsToNearestFrames(
    input.targetMilliseconds,
    config.sampleRate,
  );
  const safetyFrames = millisecondsToNearestFrames(
    config.safetyMarginMilliseconds,
    config.sampleRate,
  );
  const latentFrames =
    input.trailingLowEnergyFrames +
    input.leadingLowEnergyFrames;
  const requiredTrimFrames = Math.max(
    0,
    latentFrames - targetFrames,
  );
  const trailingAvailableFrames = Math.max(
    0,
    input.trailingLowEnergyFrames - safetyFrames,
  );
  const leadingAvailableFrames = Math.max(
    0,
    input.leadingLowEnergyFrames - safetyFrames,
  );
  const safeTrimAvailable =
    requiredTrimFrames <=
    trailingAvailableFrames + leadingAvailableFrames;

  if (!safeTrimAvailable) {
    return {
      targetFrames,
      targetMilliseconds: input.targetMilliseconds,
      trailingLowEnergyFrames:
        input.trailingLowEnergyFrames,
      leadingLowEnergyFrames:
        input.leadingLowEnergyFrames,
      requestedTrailingTrimFrames: 0,
      requestedLeadingTrimFrames: 0,
      insertedSilenceFrames: 0,
      predictedEffectivePauseFrames: latentFrames,
      predictedEffectivePauseMilliseconds:
        framesToMilliseconds(
          latentFrames,
          config.sampleRate,
        ),
      normalizationMode:
        "UNSAFE_TRIM_INSERTION_ONLY_FALLBACK",
      safeTrimAvailable: false,
    };
  }

  const trim = allocateSafeTrim(
    requiredTrimFrames,
    trailingAvailableFrames,
    leadingAvailableFrames,
  );
  const retainedLatentFrames =
    latentFrames -
    trim.trailingFrames -
    trim.leadingFrames;
  const insertedSilenceFrames = Math.max(
    0,
    targetFrames - retainedLatentFrames,
  );
  const predictedEffectivePauseFrames =
    retainedLatentFrames + insertedSilenceFrames;
  return {
    targetFrames,
    targetMilliseconds: input.targetMilliseconds,
    trailingLowEnergyFrames:
      input.trailingLowEnergyFrames,
    leadingLowEnergyFrames:
      input.leadingLowEnergyFrames,
    requestedTrailingTrimFrames:
      trim.trailingFrames,
    requestedLeadingTrimFrames: trim.leadingFrames,
    insertedSilenceFrames,
    predictedEffectivePauseFrames,
    predictedEffectivePauseMilliseconds:
      framesToMilliseconds(
        predictedEffectivePauseFrames,
        config.sampleRate,
      ),
    normalizationMode:
      requiredTrimFrames === 0
        ? "INSERTION_ONLY"
        : "SAFE_TRIM_AND_INSERT",
    safeTrimAvailable: true,
  };
}

function percentileNearestRank(
  sorted: readonly number[],
  percentile: number,
): number {
  const rank = Math.max(
    1,
    Math.ceil(percentile * sorted.length),
  );
  return sorted[rank - 1]!;
}

export function summarizeEffectivePauses(
  valuesMilliseconds: readonly number[],
): EffectivePauseDistribution {
  if (
    valuesMilliseconds.some(
      (value) =>
        !Number.isFinite(value) || value < 0,
    )
  ) {
    throw new Error(
      "Effective pauses must be finite non-negative values",
    );
  }
  if (valuesMilliseconds.length === 0) {
    return {
      count: 0,
      minimumMilliseconds: null,
      medianMilliseconds: null,
      p95Milliseconds: null,
      maximumMilliseconds: null,
    };
  }
  const sorted = [...valuesMilliseconds].sort(
    (left, right) => left - right,
  );
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1]! + sorted[middle]!) / 2
      : sorted[middle]!;
  return {
    count: sorted.length,
    minimumMilliseconds: sorted[0]!,
    medianMilliseconds: median,
    p95Milliseconds: percentileNearestRank(
      sorted,
      0.95,
    ),
    maximumMilliseconds: sorted.at(-1)!,
  };
}
