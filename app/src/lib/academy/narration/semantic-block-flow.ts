import {
  DEFAULT_LOW_ENERGY_DETECTOR,
  framesToMilliseconds,
  millisecondsToNearestFrames,
  type EffectivePauseDistribution,
  type EffectivePauseType,
  type LowEnergyDetectorConfig,
} from "./effective-pause-normalization";

export const SEMANTIC_BLOCK_FLOW_VERSION =
  "semantic-block-flow-v1";
export const SEMANTIC_BLOCK_FINAL_RECIPE_VERSION =
  "semantic-block-flow-v2-final";

export const SEMANTIC_BLOCK_SENTENCE_SILENCE_CANDIDATES =
  [0.15, 0.16, 0.18] as const;

// Realize nominal targets slightly inside their limits. Table-row boundaries
// need a measured 25 ms compensation because MP3 decoding expands the
// low-energy interval around these very short blocks; other boundaries need
// only a one-millisecond frame-rounding guard.
export const SEMANTIC_BLOCK_REALIZATION_GUARD_MILLISECONDS =
  Object.freeze({
    default: 1,
    tableRow: 25,
  });

export const SEMANTIC_BLOCK_EFFECTIVE_TARGETS =
  Object.freeze({
    list: 300,
    tableRow: 270,
    paragraph: 700,
    callout: 650,
    heading: 900,
    section: 1_050,
  }) satisfies Readonly<
    Omit<Record<EffectivePauseType, number>, "sentence">
  >;

export const SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS =
  Object.freeze({
    list: 300,
    tableRow: 270,
    paragraph: 800,
    callout: 700,
    heading: 900,
    section: 1_050,
  }) satisfies Readonly<
    Omit<Record<EffectivePauseType, number>, "sentence">
  >;

export const INTERNAL_SENTENCE_DETECTOR =
  Object.freeze({
    ...DEFAULT_LOW_ENERGY_DETECTOR,
    windowMilliseconds: 1,
    rmsThresholdDbfs: -60,
    peakThresholdDbfs: -48,
  }) satisfies LowEnergyDetectorConfig;

function percentileLinear(
  sorted: readonly number[],
  percentile: number,
): number {
  const index = (sorted.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lower = sorted[lowerIndex]!;
  const upper = sorted[upperIndex]!;
  return lower + (upper - lower) * (index - lowerIndex);
}

/**
 * Uses linear interpolation for p95. For a small focused panel this preserves
 * the intended distinction between the p95 and maximum gates.
 */
export function summarizeSemanticFlowPauses(
  valuesMilliseconds: readonly number[],
): EffectivePauseDistribution {
  if (
    valuesMilliseconds.some(
      (value) => !Number.isFinite(value) || value < 0,
    )
  ) {
    throw new Error(
      "Semantic-flow pauses must be finite non-negative values",
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
  return {
    count: sorted.length,
    minimumMilliseconds: sorted[0]!,
    medianMilliseconds: percentileLinear(sorted, 0.5),
    p95Milliseconds: percentileLinear(sorted, 0.95),
    maximumMilliseconds: sorted.at(-1)!,
  };
}

export interface SemanticSentenceUnit {
  id: string;
  sourceBlockId: string;
  text: string;
  textSha256: string;
  pauseAfterMs: number;
}

export interface SemanticBlockPlan {
  id: string;
  sourceBlockId: string;
  kind:
    | "paragraph"
    | "heading"
    | "listItem"
    | "tableRow"
    | "formField"
    | "callout"
    | "section";
  synthesisText: string;
  sentenceCount: number;
  sentenceUnitIds: readonly string[];
  sentenceTextSha256: readonly string[];
  pauseType: Exclude<
    EffectivePauseType,
    "sentence"
  > | "end";
  effectivePauseTargetMilliseconds: number;
}

function blockKind(
  sourceBlockId: string,
): SemanticBlockPlan["kind"] {
  if (/\/h[1-6]\[\d+\]$/u.test(sourceBlockId)) {
    return "heading";
  }
  if (/\/(?:ol|ul)\[\d+\]\/li\[\d+\]$/u.test(sourceBlockId)) {
    return "listItem";
  }
  if (/\/table\[\d+\].*\/tr\[\d+\]$/u.test(sourceBlockId)) {
    return "tableRow";
  }
  if (/\/div\[\d+\]$/u.test(sourceBlockId)) {
    return "callout";
  }
  if (/\/p\[\d+\]$/u.test(sourceBlockId)) {
    return "paragraph";
  }
  if (/\/(?:label|field|dd)\[\d+\]$/u.test(sourceBlockId)) {
    return "formField";
  }
  throw new Error(
    `Unsupported semantic block ${sourceBlockId}`,
  );
}

function pauseType(
  block: {
    kind: SemanticBlockPlan["kind"];
    sourceBlockId: string;
  },
  finalPauseAfterMs: number,
): SemanticBlockPlan["pauseType"] {
  if (finalPauseAfterMs === 0) return "end";
  if (finalPauseAfterMs === 900) return "section";
  if (block.kind === "paragraph") return "paragraph";
  if (block.kind === "heading") return "heading";
  if (block.kind === "listItem") return "list";
  if (block.kind === "tableRow") return "tableRow";
  if (block.kind === "callout") return "callout";
  if (block.kind === "formField") return "callout";
  return "section";
}

/**
 * Coalesces contiguous sentence units into one Piper request per semantic
 * source block. Sentence boundaries remain inside synthesisText and never
 * become external stitch boundaries.
 */
export function buildSemanticBlockPlan(
  units: readonly SemanticSentenceUnit[],
  targets: Readonly<
    Omit<Record<EffectivePauseType, number>, "sentence">
  > = SEMANTIC_BLOCK_EFFECTIVE_TARGETS,
): readonly SemanticBlockPlan[] {
  if (units.length === 0) {
    throw new Error("Semantic block planning requires units");
  }
  const groups: SemanticSentenceUnit[][] = [];
  for (const unit of units) {
    if (
      !unit.id ||
      !unit.sourceBlockId ||
      !unit.text.trim() ||
      !Number.isInteger(unit.pauseAfterMs) ||
      unit.pauseAfterMs < 0
    ) {
      throw new Error("Semantic sentence unit is invalid");
    }
    const previous = groups.at(-1);
    if (
      previous?.[0]?.sourceBlockId ===
      unit.sourceBlockId
    ) {
      previous.push(unit);
    } else {
      if (
        groups.some(
          (group) =>
            group[0]?.sourceBlockId ===
            unit.sourceBlockId,
        )
      ) {
        throw new Error(
          `${unit.sourceBlockId} is not contiguous`,
        );
      }
      groups.push([unit]);
    }
  }
  return groups.map((group, index) => {
    const first = group[0]!;
    const last = group.at(-1)!;
    const kind = blockKind(first.sourceBlockId);
    const semanticPauseType = pauseType(
      {
        kind,
        sourceBlockId: first.sourceBlockId,
      },
      last.pauseAfterMs,
    );
    const target =
      semanticPauseType === "end"
        ? 0
        : targets[semanticPauseType];
    return {
      id: `block-${String(index + 1).padStart(3, "0")}:${first.sourceBlockId}`,
      sourceBlockId: first.sourceBlockId,
      kind,
      synthesisText: group
        .map((unit) => unit.text.trim())
        .join(" "),
      sentenceCount: group.length,
      sentenceUnitIds: group.map((unit) => unit.id),
      sentenceTextSha256: group.map(
        (unit) => unit.textSha256,
      ),
      pauseType: semanticPauseType,
      effectivePauseTargetMilliseconds:
        target,
    };
  });
}

export interface ExactZeroRun {
  startFrame: number;
  endFrame: number;
  frameCount: number;
  atEnd: boolean;
}

export function findExactZeroRuns(
  pcm: Int16Array,
  minimumFrames: number,
): readonly ExactZeroRun[] {
  if (
    !(pcm instanceof Int16Array) ||
    pcm.length === 0 ||
    !Number.isInteger(minimumFrames) ||
    minimumFrames <= 0
  ) {
    throw new Error("Exact-zero run input is invalid");
  }
  const runs: ExactZeroRun[] = [];
  let start: number | null = null;
  for (
    let frame = 0;
    frame <= pcm.length;
    frame += 1
  ) {
    const zero =
      frame < pcm.length && pcm[frame] === 0;
    if (zero && start === null) {
      start = frame;
    } else if (!zero && start !== null) {
      if (frame - start >= minimumFrames) {
        runs.push({
          startFrame: start,
          endFrame: frame,
          frameCount: frame - start,
          atEnd: frame === pcm.length,
        });
      }
      start = null;
    }
  }
  return runs;
}

function windowLowEnergy(
  pcm: Int16Array,
  startFrame: number,
  endFrame: number,
  detector: LowEnergyDetectorConfig,
): boolean {
  let sumSquares = 0;
  let maximum = 0;
  for (
    let frame = startFrame;
    frame < endFrame;
    frame += 1
  ) {
    const value = pcm[frame] ?? 0;
    const normalized = value / 32_768;
    sumSquares += normalized * normalized;
    maximum = Math.max(maximum, Math.abs(value));
  }
  const rms = Math.sqrt(
    sumSquares / Math.max(1, endFrame - startFrame),
  );
  const rmsDbfs =
    rms === 0 ? -Infinity : 20 * Math.log10(rms);
  const peakDbfs =
    maximum === 0
      ? -Infinity
      : 20 * Math.log10(maximum / 32_768);
  return (
    rmsDbfs <= detector.rmsThresholdDbfs &&
    peakDbfs <= detector.peakThresholdDbfs
  );
}

export interface InternalSentencePauseMeasurement {
  anchorStartFrame: number;
  anchorEndFrame: number;
  lowEnergyStartFrame: number;
  lowEnergyEndFrame: number;
  configuredZeroFrames: number;
  effectivePauseFrames: number;
  configuredZeroMilliseconds: number;
  effectivePauseMilliseconds: number;
}

/**
 * Exact-zero runs locate Piper's configured sentence separators, while an
 * independent conservative energy scan measures the full acoustic gap around
 * each anchor. The final trailing sentence silence is deliberately excluded.
 */
export function measureInternalSentencePauses(
  pcm: Int16Array,
  input: {
    sentenceCount: number;
    sentenceSilenceSeconds: number;
    detector?: LowEnergyDetectorConfig;
    expectedAnchors?: readonly {
      startFrame: number;
      endFrame: number;
    }[];
  },
): readonly InternalSentencePauseMeasurement[] {
  const detector =
    input.detector ?? INTERNAL_SENTENCE_DETECTOR;
  if (
    !Number.isInteger(input.sentenceCount) ||
    input.sentenceCount <= 0 ||
    input.sentenceSilenceSeconds < 0.15 ||
    input.sentenceSilenceSeconds > 0.18
  ) {
    throw new Error(
      "Internal sentence measurement configuration is invalid",
    );
  }
  const configuredFrames =
    millisecondsToNearestFrames(
      input.sentenceSilenceSeconds * 1_000,
      detector.sampleRate,
    );
  const anchors =
    input.expectedAnchors ??
    findExactZeroRuns(
      pcm,
      Math.max(
        1,
        configuredFrames -
          millisecondsToNearestFrames(
            2,
            detector.sampleRate,
          ),
      ),
    )
      .filter((run) => !run.atEnd)
      .map((run) => ({
        startFrame: run.startFrame,
        endFrame: run.endFrame,
      }));
  if (
    anchors.length !==
    Math.max(0, input.sentenceCount - 1)
  ) {
    throw new Error(
      `Expected ${String(input.sentenceCount - 1)} internal Piper sentence anchors; found ${String(anchors.length)}`,
    );
  }
  const windowFrames = Math.max(
    1,
    millisecondsToNearestFrames(
      detector.windowMilliseconds,
      detector.sampleRate,
    ),
  );
  return anchors.map((anchor) => {
    let start = Math.floor(
      anchor.startFrame / windowFrames,
    );
    let end = Math.ceil(
      anchor.endFrame / windowFrames,
    );
    while (
      start > 0 &&
      windowLowEnergy(
        pcm,
        (start - 1) * windowFrames,
        start * windowFrames,
        detector,
      )
    ) {
      start -= 1;
    }
    while (
      end * windowFrames < pcm.length &&
      windowLowEnergy(
        pcm,
        end * windowFrames,
        Math.min(
          pcm.length,
          (end + 1) * windowFrames,
        ),
        detector,
      )
    ) {
      end += 1;
    }
    const lowEnergyStartFrame =
      start * windowFrames;
    const lowEnergyEndFrame = Math.min(
      pcm.length,
      end * windowFrames,
    );
    const effectivePauseFrames =
      lowEnergyEndFrame - lowEnergyStartFrame;
    return {
      anchorStartFrame: anchor.startFrame,
      anchorEndFrame: anchor.endFrame,
      lowEnergyStartFrame,
      lowEnergyEndFrame,
      configuredZeroFrames:
        anchor.endFrame - anchor.startFrame,
      effectivePauseFrames,
      configuredZeroMilliseconds:
        framesToMilliseconds(
          anchor.endFrame - anchor.startFrame,
          detector.sampleRate,
        ),
      effectivePauseMilliseconds:
        framesToMilliseconds(
          effectivePauseFrames,
          detector.sampleRate,
        ),
    };
  });
}

export function locateSafeEdgeTrim(input: {
  pcm: Int16Array;
  direction: "leading" | "trailing";
  requestedFrames: number;
  maximumFrames: number;
  detector?: LowEnergyDetectorConfig;
}): {
  safe: boolean;
  frames: number;
  boundaryAbsoluteSample: number;
} {
  const detector =
    input.detector ?? DEFAULT_LOW_ENERGY_DETECTOR;
  if (
    input.requestedFrames === 0
  ) {
    const frame =
      input.direction === "leading"
        ? 0
        : input.pcm.length - 1;
    return {
      safe: true,
      frames: 0,
      boundaryAbsoluteSample: Math.abs(
        input.pcm[frame] ?? 0,
      ),
    };
  }
  const searchFrames =
    millisecondsToNearestFrames(
      detector.safeCutSearchMilliseconds,
      detector.sampleRate,
    );
  const maximum = Math.min(
    input.maximumFrames,
    input.requestedFrames + searchFrames,
  );
  let best:
    | {
        frames: number;
        boundaryAbsoluteSample: number;
      }
    | undefined;
  for (
    let frames = input.requestedFrames;
    frames <= maximum;
    frames += 1
  ) {
    const boundaryFrame =
      input.direction === "leading"
        ? frames
        : input.pcm.length - frames - 1;
    if (
      boundaryFrame < 0 ||
      boundaryFrame >= input.pcm.length
    ) {
      continue;
    }
    const absolute = Math.abs(
      input.pcm[boundaryFrame] ?? 0,
    );
    if (
      !best ||
      absolute < best.boundaryAbsoluteSample ||
      (absolute === best.boundaryAbsoluteSample &&
        frames < best.frames)
    ) {
      best = {
        frames,
        boundaryAbsoluteSample: absolute,
      };
    }
  }
  return !best ||
    best.boundaryAbsoluteSample >
      detector.safeCutMaximumAbsoluteSample
    ? {
        safe: false,
        frames: 0,
        boundaryAbsoluteSample:
          best?.boundaryAbsoluteSample ?? 32_768,
      }
    : { safe: true, ...best };
}
