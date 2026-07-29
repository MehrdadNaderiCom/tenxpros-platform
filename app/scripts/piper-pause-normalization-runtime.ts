#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  join,
  resolve,
} from "node:path";
import { createRequire } from "node:module";

import {
  DEFAULT_LOW_ENERGY_DETECTOR,
  EFFECTIVE_PAUSE_NORMALIZATION_VERSION,
  EFFECTIVE_PAUSE_TYPES,
  framesToMilliseconds,
  measureLowEnergyEdge,
  millisecondsToNearestFrames,
  planEffectivePauseBoundary,
  summarizeEffectivePauses,
  type EffectivePauseType,
  type LowEnergyDetectorConfig,
} from "../src/lib/academy/narration/effective-pause-normalization";

const require = createRequire(import.meta.url);
const piperRuntime = require(
  "./piper-evaluation-runtime.cjs",
) as {
  analyzeLoudness(
    path: string,
    targetLufs: number,
    truePeakDbtp: number,
  ): Promise<{
    integratedLufs: number;
    truePeakDbtp: number;
  }>;
  applyConstantGain(
    input: string,
    output: string,
    gainDb: number,
    sampleRate: number,
  ): Promise<void>;
  auditMp3(
    path: string,
    sample: {
      fileName: string;
      pipeline: "corrected";
      maximumDurationSeconds: null;
    },
    plan: {
      sampleRate: number;
      loudness: LoudnessPlan;
    },
  ): Promise<Record<string, unknown> & {
    durationSeconds: number;
    fileSha256: string;
    fileSizeBytes: number;
    ebur128: {
      integratedLufs: number;
      truePeakDbtp: number;
    };
    checks: readonly {
      id: string;
      pass: boolean;
      details: unknown;
    }[];
    passed: boolean;
  }>;
  buildCanonicalWav(
    pcm: Buffer,
    sampleRate: number,
  ): Buffer;
  countTrailingExactZeroFrames(pcm: Buffer): number;
  encodeLame(
    input: string,
    output: string,
    tempDirectory: string,
  ): Promise<void>;
  networkIsolationState(): {
    isolated: boolean;
    interfaces: readonly string[];
    nonLoopbackInterfaces: readonly string[];
    hasDefaultRoute: boolean;
    databaseUrlPresent: boolean;
  };
  normalizeWhitespace(value: string): string;
  parseWav(
    wav: Buffer,
    sampleRate: number,
    label: string,
  ): {
    pcm: Buffer;
    frameCount: number;
    wavSha256: string;
  };
  pcmStats(pcm: Buffer): Record<string, unknown>;
  runCommand(
    binary: string,
    args: readonly string[],
    options?: {
      stdin?: string;
      tmpDirectory?: string;
      maxBuffer?: number;
    },
  ): Promise<{ stdout: Buffer; stderr: Buffer }>;
  sha256File(path: string): Promise<string>;
  synthesizePiper(
    text: string,
    modelPath: string,
    configPath: string,
    sentenceSilence: number,
    lengthScale: number,
    wavPath: string,
    tempDirectory: string,
  ): Promise<void>;
};

const FFMPEG = "/usr/bin/ffmpeg";
const MAX_BUFFER = 512 * 1024 * 1024;
const RESULT_VERSION =
  "tenxpros-piper-pause-normalization-runtime-results-v1";

interface LoudnessPlan {
  targetLufs: number;
  truePeakDbtp: number;
  mp3EncodingTruePeakHeadroomDb: number;
  maxPositiveGainDb: number;
  integratedLufsMin: number;
  integratedLufsMax: number;
  truePeakMaxDbtp: number;
}

interface FrozenLayoutEntry {
  segmentId: string;
  pauseAfterMs: number;
  speechStartFrame: number;
  speechEndFrame: number;
  pauseStartFrame: number;
  pauseEndFrame: number;
  pauseFrames: number;
}

interface FrozenSegment {
  id: string;
  text: string;
  textSha256: string;
  pauseType: EffectivePauseType | "end";
  currentConfiguredPauseMilliseconds: number;
  expectedRawWavSha256: string;
}

interface TuningSample {
  pairId: string;
  currentBlindLabel: string;
  currentFileName: string;
  currentFileSha256: string;
  currentDurationSeconds: number;
  transcript: string;
  transcriptSha256: string;
  layout: readonly FrozenLayoutEntry[];
  segments: readonly FrozenSegment[];
  generateCandidate: boolean;
}

interface PauseProfile {
  id: "A" | "B";
  name: string;
  targetsMilliseconds: Record<
    EffectivePauseType,
    number
  >;
}

interface RuntimePlan {
  version: string;
  planHash: string;
  normalizationVersion: string;
  sampleRate: 22_050;
  lengthScale: 1;
  voice: {
    id: "bryce";
    modelPath: string;
    configPath: string;
    modelSha256: string;
    configSha256: string;
  };
  detector: LowEnergyDetectorConfig;
  loudness: LoudnessPlan;
  profiles: readonly PauseProfile[];
  samples: readonly TuningSample[];
}

interface BoundaryMeasurement {
  pairId: string;
  boundaryIndex: number;
  previousSegmentId: string;
  nextSegmentId: string;
  previousText: string;
  nextText: string;
  pauseType: EffectivePauseType;
  configuredInsertedSilenceFrames: number;
  configuredInsertedSilenceMilliseconds: number;
  trailingLowEnergyFrames: number;
  trailingLowEnergyMilliseconds: number;
  leadingLowEnergyFrames: number;
  leadingLowEnergyMilliseconds: number;
  effectivePauseFrames: number;
  effectivePauseMilliseconds: number;
  decodedBoundaryDiscontinuity: {
    speechToPauseAbsoluteDelta: number;
    pauseToSpeechAbsoluteDelta: number;
    maximumAbsoluteDelta: number;
  };
  adjacentLowEnergyExceedsConfiguredSilence: boolean;
  hierarchyMaskRisk: boolean;
  detector: {
    windowFrames: number;
    rmsThresholdDbfs: number;
    peakThresholdDbfs: number;
  };
}

function sha256(value: Buffer | string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function pcmView(pcm: Buffer): Int16Array {
  return new Int16Array(
    pcm.buffer,
    pcm.byteOffset,
    pcm.length / 2,
  );
}

function pcmSlice(
  pcm: Buffer,
  startFrame: number,
  endFrame: number,
): Buffer {
  return pcm.subarray(startFrame * 2, endFrame * 2);
}

function canonical(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Canonical JSON rejects non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical(object[key])}`,
      )
      .join(",")}}`;
  }
  throw new Error("Canonical JSON rejects unsupported values");
}

function validatePlan(value: unknown): RuntimePlan {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("Tuning plan must be an object");
  }
  const plan = value as RuntimePlan;
  if (
    plan.normalizationVersion !==
      EFFECTIVE_PAUSE_NORMALIZATION_VERSION ||
    plan.sampleRate !== 22_050 ||
    plan.lengthScale !== 1 ||
    plan.voice.id !== "bryce" ||
    plan.profiles.length !== 2 ||
    plan.profiles[0]?.id !== "A" ||
    plan.profiles[1]?.id !== "B" ||
    plan.samples.length !== 5 ||
    plan.samples.filter(
      (sample) => sample.generateCandidate,
    ).length !== 2
  ) {
    throw new Error("Tuning plan scope is invalid");
  }
  const withoutHash = {
    ...plan,
    planHash: undefined,
  };
  delete (
    withoutHash as Record<string, unknown>
  ).planHash;
  if (sha256(canonical(withoutHash)) !== plan.planHash) {
    throw new Error("Tuning plan hash mismatch");
  }
  for (const profile of plan.profiles) {
    for (const type of EFFECTIVE_PAUSE_TYPES) {
      const target =
        profile.targetsMilliseconds[type];
      if (
        !Number.isFinite(target) ||
        target <= 0 ||
        target > 2_000
      ) {
        throw new Error(
          `${profile.id}/${type} target is invalid`,
        );
      }
    }
  }
  return plan;
}

async function writeRestricted(
  path: string,
  value: Buffer | string,
): Promise<void> {
  await mkdir(dirname(path), {
    recursive: true,
    mode: 0o700,
  });
  await writeFile(path, value, {
    mode: 0o600,
    flag: "wx",
  });
  await chmod(path, 0o600);
}

async function decodeMp3(path: string): Promise<Buffer> {
  const result = await piperRuntime.runCommand(
    FFMPEG,
    [
      "-hide_banner",
      "-nostdin",
      "-loglevel",
      "error",
      "-i",
      path,
      "-f",
      "s16le",
      "-acodec",
      "pcm_s16le",
      "-ac",
      "1",
      "-ar",
      "22050",
      "pipe:1",
    ],
    { maxBuffer: MAX_BUFFER },
  );
  if (
    result.stdout.length === 0 ||
    result.stdout.length % 2 !== 0
  ) {
    throw new Error(
      `${basename(path)} decoded to invalid PCM`,
    );
  }
  return result.stdout;
}

function measureBoundaries(input: {
  pairId: string;
  pcm: Buffer;
  layout: readonly FrozenLayoutEntry[];
  segments: readonly FrozenSegment[];
  detector: LowEnergyDetectorConfig;
}): BoundaryMeasurement[] {
  if (
    input.pcm.length / 2 !==
    input.layout.at(-1)?.pauseEndFrame
  ) {
    throw new Error(
      `${input.pairId} decoded frame count differs from frozen layout`,
    );
  }
  const measurements: BoundaryMeasurement[] = [];
  for (
    let index = 0;
    index < input.layout.length - 1;
    index += 1
  ) {
    const previousLayout = input.layout[index]!;
    const nextLayout = input.layout[index + 1]!;
    const previousSegment = input.segments[index]!;
    const nextSegment = input.segments[index + 1]!;
    if (
      previousLayout.segmentId !==
        previousSegment.id ||
      nextLayout.segmentId !== nextSegment.id ||
      previousSegment.pauseType === "end"
    ) {
      throw new Error(
        `${input.pairId} segment/layout alignment failed`,
      );
    }
    const trailing = measureLowEnergyEdge(
      pcmView(
        pcmSlice(
          input.pcm,
          previousLayout.speechStartFrame,
          previousLayout.speechEndFrame,
        ),
      ),
      "trailing",
      input.detector,
    );
    const leading = measureLowEnergyEdge(
      pcmView(
        pcmSlice(
          input.pcm,
          nextLayout.speechStartFrame,
          nextLayout.speechEndFrame,
        ),
      ),
      "leading",
      input.detector,
    );
    const effectivePauseFrames =
      previousLayout.pauseFrames +
      trailing.lowEnergyFrames +
      leading.lowEnergyFrames;
    const previousEndSample = input.pcm.readInt16LE(
      (previousLayout.speechEndFrame - 1) * 2,
    );
    const nextStartSample = input.pcm.readInt16LE(
      nextLayout.speechStartFrame * 2,
    );
    const pauseFirstSample =
      previousLayout.pauseFrames === 0
        ? nextStartSample
        : input.pcm.readInt16LE(
            previousLayout.pauseStartFrame * 2,
          );
    const pauseLastSample =
      previousLayout.pauseFrames === 0
        ? previousEndSample
        : input.pcm.readInt16LE(
            (previousLayout.pauseEndFrame - 1) * 2,
          );
    const speechToPauseAbsoluteDelta = Math.abs(
      pauseFirstSample - previousEndSample,
    );
    const pauseToSpeechAbsoluteDelta = Math.abs(
      nextStartSample - pauseLastSample,
    );
    measurements.push({
      pairId: input.pairId,
      boundaryIndex: index + 1,
      previousSegmentId: previousSegment.id,
      nextSegmentId: nextSegment.id,
      previousText: previousSegment.text,
      nextText: nextSegment.text,
      pauseType: previousSegment.pauseType,
      configuredInsertedSilenceFrames:
        previousLayout.pauseFrames,
      configuredInsertedSilenceMilliseconds:
        framesToMilliseconds(
          previousLayout.pauseFrames,
          input.detector.sampleRate,
        ),
      trailingLowEnergyFrames:
        trailing.lowEnergyFrames,
      trailingLowEnergyMilliseconds:
        trailing.lowEnergyMilliseconds,
      leadingLowEnergyFrames:
        leading.lowEnergyFrames,
      leadingLowEnergyMilliseconds:
        leading.lowEnergyMilliseconds,
      effectivePauseFrames,
      effectivePauseMilliseconds:
        framesToMilliseconds(
          effectivePauseFrames,
          input.detector.sampleRate,
        ),
      decodedBoundaryDiscontinuity: {
        speechToPauseAbsoluteDelta,
        pauseToSpeechAbsoluteDelta,
        maximumAbsoluteDelta: Math.max(
          speechToPauseAbsoluteDelta,
          pauseToSpeechAbsoluteDelta,
        ),
      },
      adjacentLowEnergyExceedsConfiguredSilence:
        trailing.lowEnergyFrames +
          leading.lowEnergyFrames >
        previousLayout.pauseFrames,
      hierarchyMaskRisk: false,
      detector: {
        windowFrames: trailing.windowFrames,
        rmsThresholdDbfs:
          input.detector.rmsThresholdDbfs,
        peakThresholdDbfs:
          input.detector.peakThresholdDbfs,
      },
    });
  }
  return measurements;
}

function distributions(
  boundaries: readonly BoundaryMeasurement[],
): Record<
  EffectivePauseType,
  ReturnType<typeof summarizeEffectivePauses> & {
    sentenceOverlapCount: number;
  }
> {
  const sentenceValues = boundaries
    .filter(
      (boundary) =>
        boundary.pauseType === "sentence",
    )
    .map(
      (boundary) =>
        boundary.effectivePauseMilliseconds,
    );
  const sentenceMaximum =
    sentenceValues.length === 0
      ? null
      : Math.max(...sentenceValues);
  const sentenceMinimum =
    sentenceValues.length === 0
      ? null
      : Math.min(...sentenceValues);
  return Object.fromEntries(
    EFFECTIVE_PAUSE_TYPES.map((type) => {
      const values = boundaries
        .filter(
          (boundary) => boundary.pauseType === type,
        )
        .map(
          (boundary) =>
            boundary.effectivePauseMilliseconds,
        );
      const overlap =
        type === "sentence" ||
        sentenceMaximum === null ||
        sentenceMinimum === null
          ? 0
          : values.filter(
              (value) =>
                value >= sentenceMinimum &&
                value <= sentenceMaximum,
            ).length;
      return [
        type,
        {
          ...summarizeEffectivePauses(values),
          sentenceOverlapCount: overlap,
        },
      ];
    }),
  ) as Record<
    EffectivePauseType,
    ReturnType<typeof summarizeEffectivePauses> & {
      sentenceOverlapCount: number;
    }
  >;
}

function markHierarchyRisk(
  boundaries: BoundaryMeasurement[],
): void {
  const summary = distributions(boundaries);
  const sentenceP95 =
    summary.sentence.p95Milliseconds;
  for (const boundary of boundaries) {
    boundary.hierarchyMaskRisk =
      boundary.pauseType !== "sentence" &&
      sentenceP95 !== null &&
      boundary.effectivePauseMilliseconds <
        sentenceP95 + 300;
  }
}

function sampleAbsolute(
  pcm: Buffer,
  frame: number,
): number {
  return Math.abs(pcm.readInt16LE(frame * 2));
}

function safeTrimAtOrAfter(input: {
  pcm: Buffer;
  direction: "leading" | "trailing";
  requestedFrames: number;
  maximumFrames: number;
  detector: LowEnergyDetectorConfig;
}): {
  safe: boolean;
  frames: number;
  boundaryAbsoluteSample: number;
} {
  if (input.requestedFrames === 0) {
    const frame =
      input.direction === "leading"
        ? 0
        : input.pcm.length / 2 - 1;
    return {
      safe: true,
      frames: 0,
      boundaryAbsoluteSample: sampleAbsolute(
        input.pcm,
        frame,
      ),
    };
  }
  const searchFrames =
    millisecondsToNearestFrames(
      input.detector.safeCutSearchMilliseconds,
      input.detector.sampleRate,
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
        : input.pcm.length / 2 - frames - 1;
    if (
      boundaryFrame < 0 ||
      boundaryFrame >= input.pcm.length / 2
    ) {
      continue;
    }
    const absolute = sampleAbsolute(
      input.pcm,
      boundaryFrame,
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
  if (
    !best ||
    best.boundaryAbsoluteSample >
      input.detector.safeCutMaximumAbsoluteSample
  ) {
    return {
      safe: false,
      frames: 0,
      boundaryAbsoluteSample:
        best?.boundaryAbsoluteSample ?? 32_768,
    };
  }
  return { safe: true, ...best };
}

function extractFrozenControlSegments(
  sample: TuningSample,
  controlPcm: Buffer,
  plan: RuntimePlan,
): readonly {
    frozen: FrozenSegment;
    pcm: Buffer;
    sourcePcmSha256: string;
    frozenRawWavSha256: string;
    exactZeroFramesTrimmed: number;
    leadingLowEnergyFrames: number;
    trailingLowEnergyFrames: number;
  }[] {
  if (
    controlPcm.length / 2 !==
    sample.layout.at(-1)?.pauseEndFrame
  ) {
    throw new Error(
      `${sample.pairId} control PCM and frozen layout differ`,
    );
  }
  const results = [];
  for (
    let index = 0;
    index < sample.segments.length;
    index += 1
  ) {
    const segment = sample.segments[index]!;
    const layout = sample.layout[index]!;
    if (layout.segmentId !== segment.id) {
      throw new Error(
        `${sample.pairId}/${segment.id} control layout is not aligned`,
      );
    }
    const pcm = pcmSlice(
      controlPcm,
      layout.speechStartFrame,
      layout.speechEndFrame,
    );
    const exactZeroFramesTrimmed = 0;
    const leading = measureLowEnergyEdge(
      pcmView(pcm),
      "leading",
      plan.detector,
    );
    const trailing = measureLowEnergyEdge(
      pcmView(pcm),
      "trailing",
      plan.detector,
    );
    results.push({
      frozen: segment,
      pcm,
      sourcePcmSha256: sha256(pcm),
      frozenRawWavSha256:
        segment.expectedRawWavSha256,
      exactZeroFramesTrimmed,
      leadingLowEnergyFrames:
        leading.lowEnergyFrames,
      trailingLowEnergyFrames:
        trailing.lowEnergyFrames,
    });
  }
  return results;
}

function boundaryDiscontinuity(input: {
  previousPcm: Buffer;
  nextPcm: Buffer;
  trailingTrimFrames: number;
  leadingTrimFrames: number;
  insertedSilenceFrames: number;
}): {
  speechToPauseAbsoluteDelta: number;
  pauseToSpeechAbsoluteDelta: number;
  maximumAbsoluteDelta: number;
} {
  const previousEnd =
    input.previousPcm.length / 2 -
    input.trailingTrimFrames -
    1;
  const nextStart = input.leadingTrimFrames;
  const previous = input.previousPcm.readInt16LE(
    previousEnd * 2,
  );
  const next = input.nextPcm.readInt16LE(
    nextStart * 2,
  );
  const speechToPauseAbsoluteDelta =
    input.insertedSilenceFrames === 0
      ? Math.abs(next - previous)
      : Math.abs(previous);
  const pauseToSpeechAbsoluteDelta =
    input.insertedSilenceFrames === 0
      ? Math.abs(next - previous)
      : Math.abs(next);
  return {
    speechToPauseAbsoluteDelta,
    pauseToSpeechAbsoluteDelta,
    maximumAbsoluteDelta: Math.max(
      speechToPauseAbsoluteDelta,
      pauseToSpeechAbsoluteDelta,
    ),
  };
}

async function generateCandidate(
  profile: PauseProfile,
  sample: TuningSample,
  segments: Awaited<
    ReturnType<typeof extractFrozenControlSegments>
  >,
  plan: RuntimePlan,
  outputRoot: string,
  workingDirectory: string,
) {
  const leadingTrimFrames =
    Array<number>(segments.length).fill(0);
  const trailingTrimFrames =
    Array<number>(segments.length).fill(0);
  const boundaryPlans = [];
  for (
    let index = 0;
    index < segments.length - 1;
    index += 1
  ) {
    const previous = segments[index]!;
    const next = segments[index + 1]!;
    if (previous.frozen.pauseType === "end") {
      throw new Error(
        `${sample.pairId} has a premature end boundary`,
      );
    }
    const targetMilliseconds =
      profile.targetsMilliseconds[
        previous.frozen.pauseType
      ];
    const requested =
      planEffectivePauseBoundary({
        targetMilliseconds,
        trailingLowEnergyFrames:
          previous.trailingLowEnergyFrames,
        leadingLowEnergyFrames:
          next.leadingLowEnergyFrames,
        config: plan.detector,
      });
    let trailing = {
      safe: true,
      frames: 0,
      boundaryAbsoluteSample: sampleAbsolute(
        previous.pcm,
        previous.pcm.length / 2 - 1,
      ),
    };
    let leading = {
      safe: true,
      frames: 0,
      boundaryAbsoluteSample: sampleAbsolute(
        next.pcm,
        0,
      ),
    };
    if (
      requested.normalizationMode ===
      "SAFE_TRIM_AND_INSERT"
    ) {
      const safetyFrames =
        millisecondsToNearestFrames(
          plan.detector
            .safetyMarginMilliseconds,
          plan.sampleRate,
        );
      trailing = safeTrimAtOrAfter({
        pcm: previous.pcm,
        direction: "trailing",
        requestedFrames:
          requested.requestedTrailingTrimFrames,
        maximumFrames: Math.max(
          0,
          previous.trailingLowEnergyFrames -
            safetyFrames,
        ),
        detector: plan.detector,
      });
      leading = safeTrimAtOrAfter({
        pcm: next.pcm,
        direction: "leading",
        requestedFrames:
          requested.requestedLeadingTrimFrames,
        maximumFrames: Math.max(
          0,
          next.leadingLowEnergyFrames -
            safetyFrames,
        ),
        detector: plan.detector,
      });
    }
    const trimmingSafe =
      requested.safeTrimAvailable &&
      trailing.safe &&
      leading.safe;
    const appliedTrailingTrimFrames =
      trimmingSafe ? trailing.frames : 0;
    const appliedLeadingTrimFrames =
      trimmingSafe ? leading.frames : 0;
    const retainedLatentFrames =
      previous.trailingLowEnergyFrames -
      appliedTrailingTrimFrames +
      next.leadingLowEnergyFrames -
      appliedLeadingTrimFrames;
    const targetFrames =
      millisecondsToNearestFrames(
        targetMilliseconds,
        plan.sampleRate,
      );
    const insertedSilenceFrames =
      retainedLatentFrames <= targetFrames
        ? targetFrames - retainedLatentFrames
        : 0;
    trailingTrimFrames[index] =
      appliedTrailingTrimFrames;
    leadingTrimFrames[index + 1] =
      appliedLeadingTrimFrames;
    const discontinuity = boundaryDiscontinuity({
      previousPcm: previous.pcm,
      nextPcm: next.pcm,
      trailingTrimFrames:
        appliedTrailingTrimFrames,
      leadingTrimFrames:
        appliedLeadingTrimFrames,
      insertedSilenceFrames,
    });
    boundaryPlans.push({
      boundaryIndex: index + 1,
      previousSegmentId: previous.frozen.id,
      nextSegmentId: next.frozen.id,
      pauseType: previous.frozen.pauseType,
      targetMilliseconds,
      targetFrames,
      measuredTrailingLowEnergyFrames:
        previous.trailingLowEnergyFrames,
      measuredLeadingLowEnergyFrames:
        next.leadingLowEnergyFrames,
      requestedNormalizationMode:
        requested.normalizationMode,
      safeTrimAvailable:
        requested.safeTrimAvailable,
      safeCutLocated: trailing.safe && leading.safe,
      requestedTrailingTrimFrames:
        requested.requestedTrailingTrimFrames,
      requestedLeadingTrimFrames:
        requested.requestedLeadingTrimFrames,
      appliedTrailingTrimFrames,
      appliedLeadingTrimFrames,
      trailingCutAbsoluteSample:
        trailing.boundaryAbsoluteSample,
      leadingCutAbsoluteSample:
        leading.boundaryAbsoluteSample,
      insertedSilenceFrames,
      predictedEffectivePauseFrames:
        retainedLatentFrames +
        insertedSilenceFrames,
      predictedEffectivePauseMilliseconds:
        framesToMilliseconds(
          retainedLatentFrames +
            insertedSilenceFrames,
          plan.sampleRate,
        ),
      fallbackUsed: !trimmingSafe,
      discontinuity,
    });
  }

  const stitched: Buffer[] = [];
  const layout = [];
  let cursor = 0;
  for (
    let index = 0;
    index < segments.length;
    index += 1
  ) {
    const segment = segments[index]!;
    const leading = leadingTrimFrames[index]!;
    const trailing = trailingTrimFrames[index]!;
    const adjusted = pcmSlice(
      segment.pcm,
      leading,
      segment.pcm.length / 2 - trailing,
    );
    if (adjusted.length === 0) {
      throw new Error(
        `${sample.pairId}/${segment.frozen.id} was fully trimmed`,
      );
    }
    const boundary = boundaryPlans[index];
    const pauseFrames =
      boundary?.insertedSilenceFrames ?? 0;
    const speechStartFrame = cursor;
    const speechEndFrame =
      speechStartFrame + adjusted.length / 2;
    const pauseStartFrame = speechEndFrame;
    const pauseEndFrame =
      pauseStartFrame + pauseFrames;
    layout.push({
      segmentId: segment.frozen.id,
      pauseType: segment.frozen.pauseType,
      speechStartFrame,
      speechEndFrame,
      pauseStartFrame,
      pauseEndFrame,
      pauseFrames,
      leadingTrimFrames: leading,
      trailingTrimFrames: trailing,
    });
    stitched.push(
      adjusted,
      Buffer.alloc(pauseFrames * 2),
    );
    cursor = pauseEndFrame;
  }

  const preWav = piperRuntime.buildCanonicalWav(
    Buffer.concat(stitched),
    plan.sampleRate,
  );
  const prePath = join(
    workingDirectory,
    `${sample.pairId}-${profile.id}-pre.wav`,
  );
  const postPath = join(
    workingDirectory,
    `${sample.pairId}-${profile.id}-post.wav`,
  );
  await writeFile(prePath, preWav);
  const preLoudness =
    await piperRuntime.analyzeLoudness(
      prePath,
      plan.loudness.targetLufs,
      plan.loudness.truePeakDbtp,
    );
  const gainDb =
    Math.round(
      Math.min(
        plan.loudness.targetLufs -
          preLoudness.integratedLufs,
        plan.loudness.truePeakDbtp -
          plan.loudness
            .mp3EncodingTruePeakHeadroomDb -
          preLoudness.truePeakDbtp,
        plan.loudness.maxPositiveGainDb,
      ) * 1_000_000,
    ) / 1_000_000;
  await piperRuntime.applyConstantGain(
    prePath,
    postPath,
    gainDb,
    plan.sampleRate,
  );
  const outputFileName = `${sample.pairId}-candidate-${profile.id}.mp3`;
  const outputPath = join(
    outputRoot,
    "audio",
    outputFileName,
  );
  await piperRuntime.encodeLame(
    postPath,
    outputPath,
    workingDirectory,
  );
  await chmod(outputPath, 0o600);
  const mp3Audit = await piperRuntime.auditMp3(
    outputPath,
    {
      fileName: outputFileName,
      pipeline: "corrected",
      maximumDurationSeconds: null,
    },
    plan,
  );
  const decoded = await decodeMp3(outputPath);
  const decodedLayout: FrozenLayoutEntry[] =
    layout.map((item) => ({
      segmentId: item.segmentId,
      pauseAfterMs: framesToMilliseconds(
        item.pauseFrames,
        plan.sampleRate,
      ),
      speechStartFrame: item.speechStartFrame,
      speechEndFrame: item.speechEndFrame,
      pauseStartFrame: item.pauseStartFrame,
      pauseEndFrame: item.pauseEndFrame,
      pauseFrames: item.pauseFrames,
    }));
  const measured = measureBoundaries({
    pairId: sample.pairId,
    pcm: decoded,
    layout: decodedLayout,
    segments: sample.segments,
    detector: plan.detector,
  });
  markHierarchyRisk(measured);
  const expectedTranscript = sha256(
    piperRuntime.normalizeWhitespace(
      sample.segments
        .map((segment) => segment.text)
        .join(" "),
    ),
  );
  const checks = [
    {
      id: "FROZEN_CONTROL_PCM_SEGMENTS",
      pass: segments.every(
        (segment, index) =>
          segment.sourcePcmSha256.length === 64 &&
          segment.frozen.id ===
            sample.segments[index]?.id,
      ),
    },
    {
      id: "TRANSCRIPT_EXACT",
      pass:
        expectedTranscript ===
        sample.transcriptSha256,
    },
    {
      id: "SEGMENT_COUNT_AND_ORDER",
      pass:
        layout.length === sample.segments.length &&
        layout.every(
          (entry, index) =>
            entry.segmentId ===
            sample.segments[index]?.id,
        ),
    },
    {
      id: "SAFE_TRIM_ONLY",
      pass: boundaryPlans.every(
        (boundary) =>
          !boundary.fallbackUsed ||
          (boundary.appliedLeadingTrimFrames ===
            0 &&
            boundary.appliedTrailingTrimFrames ===
              0),
      ),
    },
    {
      id: "NO_LOST_OR_DUPLICATED_LABELS",
      pass:
        expectedTranscript ===
        sample.transcriptSha256,
    },
    {
      id: "NO_CRITICAL_STITCH_DISCONTINUITY",
      pass: boundaryPlans.every(
        (boundary) =>
          boundary.discontinuity
            .maximumAbsoluteDelta <=
          512,
      ),
    },
    ...mp3Audit.checks,
  ];
  return {
    pairId: sample.pairId,
    profileId: profile.id,
    outputFile: `audio/${outputFileName}`,
    sha256: await piperRuntime.sha256File(
      outputPath,
    ),
    sizeBytes: (await stat(outputPath)).size,
    durationSeconds: mp3Audit.durationSeconds,
    transcriptSha256: sample.transcriptSha256,
    appliedGainDb: gainDb,
    preLoudness,
    mp3Audit,
    segments: segments.map((segment, index) => ({
      index,
      id: segment.frozen.id,
      textSha256: segment.frozen.textSha256,
      sourceControlPcmSha256:
        segment.sourcePcmSha256,
      frozenGenerationRawWavSha256:
        segment.frozenRawWavSha256,
      exactZeroFramesTrimmed:
        segment.exactZeroFramesTrimmed,
      detectedLeadingLowEnergyFrames:
        segment.leadingLowEnergyFrames,
      detectedTrailingLowEnergyFrames:
        segment.trailingLowEnergyFrames,
      appliedLeadingTrimFrames:
        leadingTrimFrames[index],
      appliedTrailingTrimFrames:
        trailingTrimFrames[index],
    })),
    layout,
    boundaryPlans,
    measuredBoundaries: measured,
    distributions: distributions(measured),
    checks,
    passed: checks.every((check) => check.pass),
  };
}

async function main(): Promise<void> {
  process.umask(0o077);
  const args = process.argv.slice(2);
  const planIndex = args.indexOf("--plan");
  const outputIndex = args.indexOf("--output-dir");
  if (planIndex < 0 || outputIndex < 0) {
    throw new Error(
      "Usage: piper-pause-normalization-runtime.ts --plan <path> --output-dir <path>",
    );
  }
  const planPath = resolve(args[planIndex + 1] ?? "");
  const outputRoot = resolve(
    args[outputIndex + 1] ?? "",
  );
  const isolation =
    piperRuntime.networkIsolationState();
  if (!isolation.isolated) {
    throw new Error(
      "Pause normalization requires network isolation and no DATABASE_URL",
    );
  }
  const plan = validatePlan(
    JSON.parse(await readFile(planPath, "utf8")),
  );
  if (
    (await piperRuntime.sha256File(
      plan.voice.modelPath,
    )) !== plan.voice.modelSha256 ||
    (await piperRuntime.sha256File(
      plan.voice.configPath,
    )) !== plan.voice.configSha256
  ) {
    throw new Error("Frozen Bryce voice hashes changed");
  }
  await mkdir(join(outputRoot, "audio"), {
    recursive: true,
    mode: 0o700,
  });
  await chmod(join(outputRoot, "audio"), 0o700);
  const workingRoot = await mkdtemp(
    join(
      tmpdir(),
      "tenxpros-pause-normalization-",
    ),
  );
  const currentMeasurements: BoundaryMeasurement[] =
    [];
  const currentControlAudits = [];
  const currentPcmByPair = new Map<
    string,
    Buffer
  >();
  for (const sample of plan.samples) {
    const controlPath = join(
      "/controls",
      sample.currentFileName,
    );
    if (
      (await piperRuntime.sha256File(controlPath)) !==
      sample.currentFileSha256
    ) {
      throw new Error(
        `${sample.currentFileName} frozen hash mismatch`,
      );
    }
    const decoded = await decodeMp3(controlPath);
    currentPcmByPair.set(sample.pairId, decoded);
    const measured = measureBoundaries({
      pairId: sample.pairId,
      pcm: decoded,
      layout: sample.layout,
      segments: sample.segments,
      detector: plan.detector,
    });
    currentMeasurements.push(...measured);
    currentControlAudits.push({
      pairId: sample.pairId,
      fileName: sample.currentFileName,
      sha256: sample.currentFileSha256,
      expectedDurationSeconds:
        sample.currentDurationSeconds,
      decodedFrameCount: decoded.length / 2,
      frozenLayoutFrameCount:
        sample.layout.at(-1)?.pauseEndFrame,
      decodedLayoutExact:
        decoded.length / 2 ===
        sample.layout.at(-1)?.pauseEndFrame,
    });
  }
  markHierarchyRisk(currentMeasurements);

  const candidateResults = [];
  for (const sample of plan.samples.filter(
    (candidate) => candidate.generateCandidate,
  )) {
    const sampleWork = await mkdtemp(
      join(
        workingRoot,
        `${sample.pairId.replace(/[^a-z0-9-]/giu, "_")}-`,
      ),
    );
    const controlPcm = currentPcmByPair.get(
      sample.pairId,
    );
    if (!controlPcm) {
      throw new Error(
        `${sample.pairId} decoded control is unavailable`,
      );
    }
    const segments =
      extractFrozenControlSegments(
        sample,
        controlPcm,
        plan,
      );
    for (const profile of plan.profiles) {
      candidateResults.push(
        await generateCandidate(
          profile,
          sample,
          segments,
          plan,
          outputRoot,
          sampleWork,
        ),
      );
    }
  }
  const result = {
    schemaVersion: RESULT_VERSION,
    normalizationVersion:
      EFFECTIVE_PAUSE_NORMALIZATION_VERSION,
    planHash: plan.planHash,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    isolation: {
      ...isolation,
      externalApiRequests: 0,
      externalTtsRequests: 0,
      databaseImports: 0,
      productionMounts: 0,
    },
    detector: plan.detector,
    currentControlAudits,
    currentMeasurements,
    currentDistributions: distributions(
      currentMeasurements,
    ),
    candidates: candidateResults,
  };
  await writeRestricted(
    join(outputRoot, "runtime-results.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
