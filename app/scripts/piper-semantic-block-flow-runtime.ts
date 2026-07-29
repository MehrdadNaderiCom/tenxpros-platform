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
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  join,
  resolve,
} from "node:path";

import {
  DEFAULT_LOW_ENERGY_DETECTOR,
  framesToMilliseconds,
  measureLowEnergyEdge,
  millisecondsToNearestFrames,
  planEffectivePauseBoundary,
  type EffectivePauseType,
  type LowEnergyDetectorConfig,
} from "../src/lib/academy/narration/effective-pause-normalization";
import {
  INTERNAL_SENTENCE_DETECTOR,
  SEMANTIC_BLOCK_FINAL_RECIPE_VERSION,
  SEMANTIC_BLOCK_FLOW_VERSION,
  SEMANTIC_BLOCK_REALIZATION_GUARD_MILLISECONDS,
  locateSafeEdgeTrim,
  measureInternalSentencePauses,
  summarizeSemanticFlowPauses,
  type InternalSentencePauseMeasurement,
  type SemanticBlockPlan,
} from "../src/lib/academy/narration/semantic-block-flow";

const require = createRequire(import.meta.url);
const audioRuntime = require(
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
  encodeLame(
    input: string,
    output: string,
    temporaryDirectory: string,
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
  runCommand(
    binary: string,
    args: readonly string[],
    options?: {
      maxBuffer?: number;
      stdin?: string;
      tmpDirectory?: string;
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
    temporaryDirectory: string,
  ): Promise<void>;
};

const FFMPEG = "/usr/bin/ffmpeg";
const MAX_BUFFER = 512 * 1024 * 1024;
const RESULT_VERSION =
  "tenxpros-piper-semantic-block-flow-runtime-v1";

interface LoudnessPlan {
  targetLufs: number;
  truePeakDbtp: number;
  mp3EncodingTruePeakHeadroomDb: number;
  maxPositiveGainDb: number;
  integratedLufsMin: number;
  integratedLufsMax: number;
  truePeakMaxDbtp: number;
}

interface FlowSample {
  pairId: "sample-02" | "sample-05";
  transcript: string;
  transcriptSha256: string;
  blocks: readonly SemanticBlockPlan[];
}

interface RuntimePlan {
  version: string;
  planHash: string;
  flowVersion:
    | typeof SEMANTIC_BLOCK_FLOW_VERSION
    | typeof SEMANTIC_BLOCK_FINAL_RECIPE_VERSION;
  sampleRate: 22_050;
  lengthScale: 1;
  voice: {
    id: "bryce";
    modelPath: string;
    configPath: string;
    modelSha256: string;
    configSha256: string;
  };
  detectors: {
    internalSentence: LowEnergyDetectorConfig;
    semanticEdge: LowEnergyDetectorConfig;
  };
  sentenceSilenceCandidatesSeconds: readonly number[];
  loudness: LoudnessPlan;
  profileAReference: {
    totalExternalStitchBoundaries: number;
    stitchDiscontinuityWarningThreshold: number;
    stitchDiscontinuityWarningCount: number;
    samples: readonly {
      pairId: string;
      durationSeconds: number;
      sha256: string;
    }[];
  };
  samples: readonly FlowSample[];
}

interface BlockAudio {
  block: SemanticBlockPlan;
  pcm: Buffer;
  wavSha256: string;
  rawFrameCount: number;
  internalPauses: readonly InternalSentencePauseMeasurement[];
}

interface CandidateLayout {
  blockId: string;
  sourceBlockId: string;
  pauseType: SemanticBlockPlan["pauseType"];
  speechStartFrame: number;
  speechEndFrame: number;
  pauseStartFrame: number;
  pauseEndFrame: number;
  pauseFrames: number;
  leadingTrimFrames: number;
  trailingTrimFrames: number;
  internalAnchors: readonly {
    startFrame: number;
    endFrame: number;
  }[];
}

function sha256(value: string | Buffer): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
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
  throw new Error("Canonical JSON rejects unsupported value");
}

function validatePlan(value: unknown): RuntimePlan {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("Block-flow plan must be an object");
  }
  const plan = value as RuntimePlan;
  const expectedSentenceSilence =
    plan.flowVersion ===
    SEMANTIC_BLOCK_FINAL_RECIPE_VERSION
      ? [0.15]
      : [0.15, 0.16, 0.18];
  if (
    (plan.flowVersion !==
      SEMANTIC_BLOCK_FLOW_VERSION &&
      plan.flowVersion !==
        SEMANTIC_BLOCK_FINAL_RECIPE_VERSION) ||
    plan.sampleRate !== 22_050 ||
    plan.lengthScale !== 1 ||
    plan.voice.id !== "bryce" ||
    plan.samples.length !== 2 ||
    plan.samples.map((sample) => sample.pairId).sort().join(",") !==
      "sample-02,sample-05" ||
    JSON.stringify(
      plan.sentenceSilenceCandidatesSeconds,
    ) !== JSON.stringify(expectedSentenceSilence)
  ) {
    throw new Error("Block-flow plan scope is invalid");
  }
  const withoutHash = {
    ...plan,
    planHash: undefined,
  };
  delete (
    withoutHash as Record<string, unknown>
  ).planHash;
  if (
    sha256(canonical(withoutHash)) !==
    plan.planHash
  ) {
    throw new Error("Block-flow plan hash mismatch");
  }
  for (const sample of plan.samples) {
    if (
      sample.blocks.length === 0 ||
      sample.blocks.some(
        (block) =>
          block.sentenceCount <= 0 ||
          block.sentenceUnitIds.length !==
            block.sentenceCount ||
          !block.synthesisText.trim(),
      ) ||
      sha256(
        audioRuntime.normalizeWhitespace(
          sample.blocks
            .map((block) => block.synthesisText)
            .join(" "),
        ),
      ) !== sample.transcriptSha256
    ) {
      throw new Error(
        `${sample.pairId} block transcript is invalid`,
      );
    }
  }
  return plan;
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

async function writeRestricted(
  path: string,
  value: string | Buffer,
): Promise<void> {
  await mkdir(dirname(path), {
    recursive: true,
    mode: 0o700,
  });
  await writeFile(path, value, {
    flag: "wx",
    mode: 0o600,
  });
  await chmod(path, 0o600);
}

async function synthesizeBlocks(
  sample: FlowSample,
  sentenceSilenceSeconds: number,
  plan: RuntimePlan,
  temporaryDirectory: string,
): Promise<readonly BlockAudio[]> {
  const result: BlockAudio[] = [];
  for (
    let index = 0;
    index < sample.blocks.length;
    index += 1
  ) {
    const block = sample.blocks[index]!;
    const wavPath = join(
      temporaryDirectory,
      `${sample.pairId}-${String(sentenceSilenceSeconds).replace(".", "_")}-${String(index + 1).padStart(3, "0")}.wav`,
    );
    await audioRuntime.synthesizePiper(
      block.synthesisText,
      plan.voice.modelPath,
      plan.voice.configPath,
      sentenceSilenceSeconds,
      plan.lengthScale,
      wavPath,
      temporaryDirectory,
    );
    const parsed = audioRuntime.parseWav(
      await readFile(wavPath),
      plan.sampleRate,
      `${sample.pairId}/${block.id}`,
    );
    const internalPauses =
      measureInternalSentencePauses(
        pcmView(parsed.pcm),
        {
          sentenceCount: block.sentenceCount,
          sentenceSilenceSeconds,
          detector:
            plan.detectors.internalSentence,
        },
      );
    result.push({
      block,
      pcm: parsed.pcm,
      wavSha256: parsed.wavSha256,
      rawFrameCount: parsed.frameCount,
      internalPauses,
    });
  }
  return result;
}

function distribution(
  values: readonly number[],
) {
  return summarizeSemanticFlowPauses(values);
}

function calibration(
  sentenceSilenceSeconds: number,
  blocks: readonly BlockAudio[],
  finalRecipe: boolean,
) {
  const pauses = blocks.flatMap((block) =>
    block.internalPauses.map((pause) => ({
      blockId: block.block.id,
      sourceBlockId: block.block.sourceBlockId,
      configuredZeroMilliseconds:
        pause.configuredZeroMilliseconds,
      effectivePauseMilliseconds:
        pause.effectivePauseMilliseconds,
      effectivePauseFrames:
        pause.effectivePauseFrames,
    })),
  );
  const summary = distribution(
    pauses.map(
      (pause) =>
        pause.effectivePauseMilliseconds,
    ),
  );
  const eligible = finalRecipe
    ? summary.count > 0 &&
      summary.medianMilliseconds !== null &&
      summary.medianMilliseconds >= 180 &&
      summary.medianMilliseconds <= 300 &&
      summary.p95Milliseconds !== null &&
      summary.p95Milliseconds <= 375
    : summary.count > 0 &&
      summary.medianMilliseconds !== null &&
      summary.medianMilliseconds >= 150 &&
      summary.medianMilliseconds <= 300 &&
      summary.p95Milliseconds !== null &&
      summary.p95Milliseconds <= 350 &&
      summary.maximumMilliseconds !== null &&
      summary.maximumMilliseconds <= 400;
  return {
    sentenceSilenceSeconds,
    sentenceSilenceMilliseconds:
      sentenceSilenceSeconds * 1_000,
    requestCount: blocks.length,
    internalPauseCount: pauses.length,
    totalRawDurationSeconds:
      blocks.reduce(
        (sum, block) =>
          sum +
          block.rawFrameCount / 22_050,
        0,
      ),
    pauses,
    distribution: summary,
    eligible,
  };
}

function discontinuity(input: {
  previous: Buffer;
  next: Buffer;
  trailingTrimFrames: number;
  leadingTrimFrames: number;
  pauseFrames: number;
}) {
  const previousValue =
    input.previous.readInt16LE(
      (input.previous.length / 2 -
        input.trailingTrimFrames -
        1) *
        2,
    );
  const nextValue = input.next.readInt16LE(
    input.leadingTrimFrames * 2,
  );
  const speechToPause =
    input.pauseFrames === 0
      ? Math.abs(nextValue - previousValue)
      : Math.abs(previousValue);
  const pauseToSpeech =
    input.pauseFrames === 0
      ? Math.abs(nextValue - previousValue)
      : Math.abs(nextValue);
  return {
    speechToPauseAbsoluteDelta: speechToPause,
    pauseToSpeechAbsoluteDelta: pauseToSpeech,
    maximumAbsoluteDelta: Math.max(
      speechToPause,
      pauseToSpeech,
    ),
  };
}

async function decodeMp3(path: string): Promise<Buffer> {
  const result = await audioRuntime.runCommand(
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

function measureDecodedBoundaries(input: {
  pairId: string;
  pcm: Buffer;
  layout: readonly CandidateLayout[];
  detector: LowEnergyDetectorConfig;
}) {
  const measurements = [];
  for (
    let index = 0;
    index < input.layout.length - 1;
    index += 1
  ) {
    const previous = input.layout[index]!;
    const next = input.layout[index + 1]!;
    if (previous.pauseType === "end") {
      throw new Error("Premature final block");
    }
    const tail = measureLowEnergyEdge(
      pcmView(
        pcmSlice(
          input.pcm,
          previous.speechStartFrame,
          previous.speechEndFrame,
        ),
      ),
      "trailing",
      input.detector,
    );
    const head = measureLowEnergyEdge(
      pcmView(
        pcmSlice(
          input.pcm,
          next.speechStartFrame,
          next.speechEndFrame,
        ),
      ),
      "leading",
      input.detector,
    );
    const effective =
      tail.lowEnergyFrames +
      previous.pauseFrames +
      head.lowEnergyFrames;
    const previousValue =
      input.pcm.readInt16LE(
        (previous.speechEndFrame - 1) * 2,
      );
    const nextValue = input.pcm.readInt16LE(
      next.speechStartFrame * 2,
    );
    const pauseFirst =
      previous.pauseFrames === 0
        ? nextValue
        : input.pcm.readInt16LE(
            previous.pauseStartFrame * 2,
          );
    const pauseLast =
      previous.pauseFrames === 0
        ? previousValue
        : input.pcm.readInt16LE(
            (previous.pauseEndFrame - 1) * 2,
          );
    measurements.push({
      pairId: input.pairId,
      boundaryIndex: index + 1,
      previousBlockId: previous.blockId,
      nextBlockId: next.blockId,
      pauseType: previous.pauseType,
      detectedTrailingPaddingFrames:
        tail.lowEnergyFrames,
      detectedTrailingPaddingMilliseconds:
        tail.lowEnergyMilliseconds,
      insertedSilenceFrames:
        previous.pauseFrames,
      insertedSilenceMilliseconds:
        framesToMilliseconds(
          previous.pauseFrames,
          input.detector.sampleRate,
        ),
      detectedLeadingPaddingFrames:
        head.lowEnergyFrames,
      detectedLeadingPaddingMilliseconds:
        head.lowEnergyMilliseconds,
      effectivePauseFrames: effective,
      effectivePauseMilliseconds:
        framesToMilliseconds(
          effective,
          input.detector.sampleRate,
        ),
      decodedDiscontinuity: {
        speechToPauseAbsoluteDelta: Math.abs(
          pauseFirst - previousValue,
        ),
        pauseToSpeechAbsoluteDelta: Math.abs(
          nextValue - pauseLast,
        ),
        maximumAbsoluteDelta: Math.max(
          Math.abs(
            pauseFirst - previousValue,
          ),
          Math.abs(nextValue - pauseLast),
        ),
      },
    });
  }
  return measurements;
}

function decodedInternalPauses(input: {
  pcm: Buffer;
  layout: readonly CandidateLayout[];
  blocks: readonly BlockAudio[];
  sentenceSilenceSeconds: number;
  detector: LowEnergyDetectorConfig;
}) {
  return input.layout.flatMap((layout, index) => {
    const block = input.blocks[index]!;
    const blockPcm = pcmSlice(
      input.pcm,
      layout.speechStartFrame,
      layout.speechEndFrame,
    );
    const measurements =
      measureInternalSentencePauses(
        pcmView(blockPcm),
        {
          sentenceCount:
            block.block.sentenceCount,
          sentenceSilenceSeconds:
            input.sentenceSilenceSeconds,
          detector: input.detector,
          expectedAnchors:
            layout.internalAnchors.map(
              (anchor) => ({
                startFrame:
                  anchor.startFrame -
                  layout.speechStartFrame,
                endFrame:
                  anchor.endFrame -
                  layout.speechStartFrame,
              }),
            ),
        },
      );
    return measurements.map((measurement) => ({
      blockId: block.block.id,
      sourceBlockId:
        block.block.sourceBlockId,
      sentenceCount:
        block.block.sentenceCount,
      ...measurement,
    }));
  });
}

function boundaryDistributions(
  measurements: readonly {
    pauseType: SemanticBlockPlan["pauseType"];
    effectivePauseMilliseconds: number;
  }[],
) {
  const types: Exclude<
    EffectivePauseType,
    "sentence"
  >[] = [
    "list",
    "tableRow",
    "paragraph",
    "callout",
    "heading",
    "section",
  ];
  return Object.fromEntries(
    types.map((type) => [
      type,
      distribution(
        measurements
          .filter(
            (measurement) =>
              measurement.pauseType === type,
          )
          .map(
            (measurement) =>
              measurement.effectivePauseMilliseconds,
          ),
      ),
    ]),
  ) as Record<
    Exclude<EffectivePauseType, "sentence">,
    ReturnType<typeof distribution>
  >;
}

async function generateSample(input: {
  sample: FlowSample;
  blocks: readonly BlockAudio[];
  sentenceSilenceSeconds: number;
  plan: RuntimePlan;
  outputRoot: string;
  temporaryDirectory: string;
}) {
  const leadingTrims =
    Array<number>(input.blocks.length).fill(0);
  const trailingTrims =
    Array<number>(input.blocks.length).fill(0);
  const boundaryPlans = [];
  for (
    let index = 0;
    index < input.blocks.length - 1;
    index += 1
  ) {
    const previous = input.blocks[index]!;
    const next = input.blocks[index + 1]!;
    if (previous.block.pauseType === "end") {
      throw new Error("Premature end block");
    }
    const trailing = measureLowEnergyEdge(
      pcmView(previous.pcm),
      "trailing",
      input.plan.detectors.semanticEdge,
    );
    const leading = measureLowEnergyEdge(
      pcmView(next.pcm),
      "leading",
      input.plan.detectors.semanticEdge,
    );
    const realizationTargetMilliseconds =
      previous.block.effectivePauseTargetMilliseconds -
      (previous.block.pauseType === "tableRow"
        ? SEMANTIC_BLOCK_REALIZATION_GUARD_MILLISECONDS
            .tableRow
        : SEMANTIC_BLOCK_REALIZATION_GUARD_MILLISECONDS
            .default);
    const requested =
      planEffectivePauseBoundary({
        targetMilliseconds:
          realizationTargetMilliseconds,
        trailingLowEnergyFrames:
          trailing.lowEnergyFrames,
        leadingLowEnergyFrames:
          leading.lowEnergyFrames,
        config:
          input.plan.detectors.semanticEdge,
      });
    const safetyFrames =
      millisecondsToNearestFrames(
        input.plan.detectors.semanticEdge
          .safetyMarginMilliseconds,
        input.plan.sampleRate,
      );
    const trailingCut = locateSafeEdgeTrim({
      pcm: pcmView(previous.pcm),
      direction: "trailing",
      requestedFrames:
        requested.requestedTrailingTrimFrames,
      maximumFrames: Math.max(
        0,
        trailing.lowEnergyFrames -
          safetyFrames,
      ),
      detector:
        input.plan.detectors.semanticEdge,
    });
    const leadingCut = locateSafeEdgeTrim({
      pcm: pcmView(next.pcm),
      direction: "leading",
      requestedFrames:
        requested.requestedLeadingTrimFrames,
      maximumFrames: Math.max(
        0,
        leading.lowEnergyFrames -
          safetyFrames,
      ),
      detector:
        input.plan.detectors.semanticEdge,
    });
    const safe =
      requested.safeTrimAvailable &&
      trailingCut.safe &&
      leadingCut.safe;
    const trailingTrim = safe
      ? trailingCut.frames
      : 0;
    const leadingTrim = safe
      ? leadingCut.frames
      : 0;
    const retained =
      trailing.lowEnergyFrames -
      trailingTrim +
      leading.lowEnergyFrames -
      leadingTrim;
    const targetFrames =
      millisecondsToNearestFrames(
        realizationTargetMilliseconds,
        input.plan.sampleRate,
      );
    const pauseFrames =
      retained <= targetFrames
        ? targetFrames - retained
        : 0;
    trailingTrims[index] = trailingTrim;
    leadingTrims[index + 1] = leadingTrim;
    boundaryPlans.push({
      boundaryIndex: index + 1,
      previousBlockId: previous.block.id,
      nextBlockId: next.block.id,
      pauseType: previous.block.pauseType,
      targetMilliseconds:
        previous.block
          .effectivePauseTargetMilliseconds,
      realizationTargetMilliseconds,
      targetFrames,
      detectedTrailingPaddingFrames:
        trailing.lowEnergyFrames,
      detectedLeadingPaddingFrames:
        leading.lowEnergyFrames,
      requestedTrailingTrimFrames:
        requested.requestedTrailingTrimFrames,
      requestedLeadingTrimFrames:
        requested.requestedLeadingTrimFrames,
      appliedTrailingTrimFrames:
        trailingTrim,
      appliedLeadingTrimFrames:
        leadingTrim,
      insertedSilenceFrames: pauseFrames,
      predictedEffectivePauseFrames:
        retained + pauseFrames,
      predictedEffectivePauseMilliseconds:
        framesToMilliseconds(
          retained + pauseFrames,
          input.plan.sampleRate,
        ),
      safeTrimProven: safe,
      fallbackInsertionOnly: !safe,
      discontinuity: discontinuity({
        previous: previous.pcm,
        next: next.pcm,
        trailingTrimFrames: trailingTrim,
        leadingTrimFrames: leadingTrim,
        pauseFrames,
      }),
    });
  }
  const parts: Buffer[] = [];
  const layout: CandidateLayout[] = [];
  let cursor = 0;
  for (
    let index = 0;
    index < input.blocks.length;
    index += 1
  ) {
    const block = input.blocks[index]!;
    const leading = leadingTrims[index]!;
    const trailing = trailingTrims[index]!;
    const adjusted = pcmSlice(
      block.pcm,
      leading,
      block.pcm.length / 2 - trailing,
    );
    const boundary = boundaryPlans[index];
    const pauseFrames =
      boundary?.insertedSilenceFrames ?? 0;
    const speechStartFrame = cursor;
    const speechEndFrame =
      cursor + adjusted.length / 2;
    const pauseStartFrame = speechEndFrame;
    const pauseEndFrame =
      pauseStartFrame + pauseFrames;
    layout.push({
      blockId: block.block.id,
      sourceBlockId:
        block.block.sourceBlockId,
      pauseType: block.block.pauseType,
      speechStartFrame,
      speechEndFrame,
      pauseStartFrame,
      pauseEndFrame,
      pauseFrames,
      leadingTrimFrames: leading,
      trailingTrimFrames: trailing,
      internalAnchors:
        block.internalPauses.map((pause) => ({
          startFrame:
            speechStartFrame +
            pause.anchorStartFrame -
            leading,
          endFrame:
            speechStartFrame +
            pause.anchorEndFrame -
            leading,
        })),
    });
    parts.push(
      adjusted,
      Buffer.alloc(pauseFrames * 2),
    );
    cursor = pauseEndFrame;
  }
  const prePath = join(
    input.temporaryDirectory,
    `${input.sample.pairId}-semantic-pre.wav`,
  );
  const postPath = join(
    input.temporaryDirectory,
    `${input.sample.pairId}-semantic-post.wav`,
  );
  await writeFile(
    prePath,
    audioRuntime.buildCanonicalWav(
      Buffer.concat(parts),
      input.plan.sampleRate,
    ),
  );
  const preLoudness =
    await audioRuntime.analyzeLoudness(
      prePath,
      input.plan.loudness.targetLufs,
      input.plan.loudness.truePeakDbtp,
    );
  const gainDb =
    Math.round(
      Math.min(
        input.plan.loudness.targetLufs -
          preLoudness.integratedLufs,
        input.plan.loudness.truePeakDbtp -
          input.plan.loudness
            .mp3EncodingTruePeakHeadroomDb -
          preLoudness.truePeakDbtp,
        input.plan.loudness.maxPositiveGainDb,
      ) * 1_000_000,
    ) / 1_000_000;
  await audioRuntime.applyConstantGain(
    prePath,
    postPath,
    gainDb,
    input.plan.sampleRate,
  );
  const fileName = `${input.sample.pairId}-${input.plan.flowVersion}.mp3`;
  const outputPath = join(
    input.outputRoot,
    "tuned-audio",
    fileName,
  );
  await audioRuntime.encodeLame(
    postPath,
    outputPath,
    input.temporaryDirectory,
  );
  await chmod(outputPath, 0o600);
  const mp3Audit = await audioRuntime.auditMp3(
    outputPath,
    {
      fileName,
      pipeline: "corrected",
      maximumDurationSeconds: null,
    },
    input.plan,
  );
  const decoded = await decodeMp3(outputPath);
  if (
    decoded.length / 2 !==
    layout.at(-1)?.pauseEndFrame
  ) {
    throw new Error(
      `${input.sample.pairId} MP3 frame layout changed`,
    );
  }
  const semanticBoundaries =
    measureDecodedBoundaries({
      pairId: input.sample.pairId,
      pcm: decoded,
      layout,
      detector:
        input.plan.detectors.semanticEdge,
    });
  const internalPauses = decodedInternalPauses({
    pcm: decoded,
    layout,
    blocks: input.blocks,
    sentenceSilenceSeconds:
      input.sentenceSilenceSeconds,
    detector:
      input.plan.detectors.internalSentence,
  });
  const reconstructed = sha256(
    audioRuntime.normalizeWhitespace(
      input.blocks
        .map((block) => block.block.synthesisText)
        .join(" "),
    ),
  );
  const warningThreshold =
    input.plan.profileAReference
      .stitchDiscontinuityWarningThreshold;
  const warnings = semanticBoundaries.filter(
    (boundary) =>
      boundary.decodedDiscontinuity
        .maximumAbsoluteDelta >
      warningThreshold,
  );
  const checks = [
    {
      id: "ONE_REQUEST_PER_SEMANTIC_BLOCK",
      pass:
        input.blocks.length ===
        input.sample.blocks.length,
    },
    {
      id: "NO_INTERNAL_EXTERNAL_STITCHES",
      pass:
        semanticBoundaries.length ===
        input.blocks.length - 1,
    },
    {
      id: "EXACT_TRANSCRIPT_RECONSTRUCTION",
      pass:
        reconstructed ===
        input.sample.transcriptSha256,
    },
    {
      id: "NO_DUPLICATED_BLOCK",
      pass:
        new Set(
          input.blocks.map(
            (block) => block.block.id,
          ),
        ).size === input.blocks.length,
    },
    {
      id: "SAFE_EDGE_TRIM_OR_INSERTION_ONLY",
      pass: boundaryPlans.every(
        (boundary) =>
          boundary.safeTrimProven ||
          (boundary.appliedLeadingTrimFrames ===
            0 &&
            boundary.appliedTrailingTrimFrames ===
              0),
      ),
    },
    ...mp3Audit.checks,
  ];
  return {
    pairId: input.sample.pairId,
    profileId: input.plan.flowVersion,
    outputFile: `tuned-audio/${fileName}`,
    sha256: await audioRuntime.sha256File(
      outputPath,
    ),
    sizeBytes: (await stat(outputPath)).size,
    durationSeconds: mp3Audit.durationSeconds,
    transcriptSha256:
      input.sample.transcriptSha256,
    sentenceSilenceSeconds:
      input.sentenceSilenceSeconds,
    requestCount: input.blocks.length,
    formerSentenceRequestCount:
      input.sample.blocks.reduce(
        (sum, block) =>
          sum + block.sentenceCount,
        0,
      ),
    externalStitchBoundaryCount:
      semanticBoundaries.length,
    appliedGainDb: gainDb,
    preLoudness,
    mp3Audit,
    blocks: input.blocks.map((block, index) => ({
      index,
      id: block.block.id,
      sourceBlockId:
        block.block.sourceBlockId,
      kind: block.block.kind,
      sentenceCount:
        block.block.sentenceCount,
      synthesisTextSha256: sha256(
        block.block.synthesisText,
      ),
      rawWavSha256: block.wavSha256,
      rawFrameCount: block.rawFrameCount,
      appliedLeadingTrimFrames:
        leadingTrims[index],
      appliedTrailingTrimFrames:
        trailingTrims[index],
    })),
    layout,
    boundaryPlans,
    internalPauses,
    internalPauseDistribution: distribution(
      internalPauses.map(
        (pause) =>
          pause.effectivePauseMilliseconds,
      ),
    ),
    semanticBoundaries,
    semanticBoundaryDistributions:
      boundaryDistributions(
        semanticBoundaries,
      ),
    stitchDiscontinuityWarningThreshold:
      warningThreshold,
    stitchDiscontinuityWarnings: warnings,
    stitchDiscontinuityWarningCount:
      warnings.length,
    checks,
    passed: checks.every((check) => check.pass),
  };
}

function objectiveGates(input: {
  candidates: readonly Awaited<
    ReturnType<typeof generateSample>
  >[];
  plan: RuntimePlan;
}) {
  const internal = input.candidates.flatMap(
    (candidate) => candidate.internalPauses,
  );
  const sentence = distribution(
    internal.map(
      (pause) =>
        pause.effectivePauseMilliseconds,
    ),
  );
  const semantic = input.candidates.flatMap(
    (candidate) =>
      candidate.semanticBoundaries,
  );
  const boundaries =
    boundaryDistributions(semantic);
  const valueList = (
    type: SemanticBlockPlan["pauseType"],
  ) =>
    semantic
      .filter(
        (boundary) =>
          boundary.pauseType === type,
      )
      .map(
        (boundary) =>
          boundary.effectivePauseMilliseconds,
      );
  const paragraphs = valueList("paragraph");
  const callouts = valueList("callout");
  const headings = valueList("heading");
  const sections = valueList("section");
  const tableRows = valueList("tableRow");
  const listItems = valueList("list");
  const totalWarnings = input.candidates.reduce(
    (sum, candidate) =>
      sum +
      candidate.stitchDiscontinuityWarningCount,
    0,
  );
  const checks =
    input.plan.flowVersion ===
    SEMANTIC_BLOCK_FINAL_RECIPE_VERSION
      ? [
          {
            id: "INTERNAL_SENTENCE_MEDIAN_180_TO_300_MS",
            pass:
              sentence.medianMilliseconds !== null &&
              sentence.medianMilliseconds >= 180 &&
              sentence.medianMilliseconds <= 300,
            details: sentence,
          },
          {
            id: "INTERNAL_SENTENCE_P95_AT_MOST_375_MS",
            pass:
              sentence.p95Milliseconds !== null &&
              sentence.p95Milliseconds <= 375,
            details: sentence,
          },
          {
            id: "EVERY_PARAGRAPH_790_TO_850_MS",
            pass:
              paragraphs.length > 0 &&
              paragraphs.every(
                (value) =>
                  value >= 790 && value <= 850,
              ),
            details: paragraphs,
          },
          {
            id: "EVERY_PARAGRAPH_AT_LEAST_SENTENCE_MEDIAN_PLUS_400_MS",
            pass:
              paragraphs.length > 0 &&
              sentence.medianMilliseconds !== null &&
              paragraphs.every(
                (value) =>
                  value >=
                  sentence.medianMilliseconds + 400,
              ),
            details: {
              paragraphs,
              sentenceMedian:
                sentence.medianMilliseconds,
            },
          },
          {
            id: "EVERY_PARAGRAPH_AT_LEAST_SENTENCE_P95_PLUS_350_MS",
            pass:
              paragraphs.length > 0 &&
              sentence.p95Milliseconds !== null &&
              paragraphs.every(
                (value) =>
                  value >=
                  sentence.p95Milliseconds + 350,
              ),
            details: {
              paragraphs,
              sentenceP95:
                sentence.p95Milliseconds,
            },
          },
          {
            id: "CALLOUT_680_TO_750_MS",
            pass:
              callouts.length > 0 &&
              callouts.every(
                (value) =>
                  value >= 680 && value <= 750,
              ),
            details: callouts,
          },
          {
            id: "HEADING_880_TO_950_MS",
            pass:
              headings.length > 0 &&
              headings.every(
                (value) =>
                  value >= 880 && value <= 950,
              ),
            details: headings,
          },
          {
            id: "SECTION_1020_TO_1150_MS",
            pass:
              sections.length > 0 &&
              sections.every(
                (value) =>
                  value >= 1_020 &&
                  value <= 1_150,
              ),
            details: sections,
          },
          {
            id: "HEADING_LONGER_THAN_PARAGRAPH",
            pass:
              headings.length > 0 &&
              paragraphs.length > 0 &&
              Math.min(...headings) >
                Math.max(...paragraphs),
            details: { paragraphs, headings },
          },
          {
            id: "SECTION_LONGER_THAN_HEADING",
            pass:
              sections.length > 0 &&
              headings.length > 0 &&
              Math.min(...sections) >
                Math.max(...headings),
            details: { headings, sections },
          },
          {
            id: "TABLE_ROWS_240_TO_300_MS",
            pass:
              tableRows.length > 0 &&
              tableRows.every(
                (value) =>
                  value >= 240 && value <= 300,
              ),
            details: tableRows,
          },
          {
            id: "LIST_ITEMS_280_TO_330_MS",
            pass:
              listItems.length > 0 &&
              listItems.every(
                (value) =>
                  value >= 280 && value <= 330,
              ),
            details: listItems,
          },
          {
            id: "ZERO_STITCH_DISCONTINUITY_WARNINGS",
            pass: totalWarnings === 0,
            details: {
              semanticBlockWarningCount:
                totalWarnings,
            },
          },
          {
            id: "ALL_SAMPLE_AUDIO_AND_TRANSCRIPT_GATES",
            pass: input.candidates.every(
              (candidate) => candidate.passed,
            ),
            details: input.candidates.map(
              (candidate) => ({
                pairId: candidate.pairId,
                passed: candidate.passed,
                failedChecks: candidate.checks
                  .filter((check) => !check.pass)
                  .map((check) => check.id),
              }),
            ),
          },
        ]
      : [
    {
      id: "INTERNAL_SENTENCE_MEDIAN_150_TO_300_MS",
      pass:
        sentence.medianMilliseconds !== null &&
        sentence.medianMilliseconds >= 150 &&
        sentence.medianMilliseconds <= 300,
      details: sentence,
    },
    {
      id: "INTERNAL_SENTENCE_P95_AT_MOST_350_MS",
      pass:
        sentence.p95Milliseconds !== null &&
        sentence.p95Milliseconds <= 350,
      details: sentence,
    },
    {
      id: "NO_INTERNAL_SENTENCE_OVER_400_MS",
      pass:
        sentence.maximumMilliseconds !== null &&
        sentence.maximumMilliseconds <= 400,
      details: sentence,
    },
    {
      id: "EVERY_PARAGRAPH_AT_LEAST_650_MS",
      pass:
        paragraphs.length > 0 &&
        paragraphs.every((value) => value >= 650),
      details: paragraphs,
    },
    {
      id: "PARAGRAPH_MIN_AT_LEAST_SENTENCE_P95_PLUS_250_MS",
      pass:
        paragraphs.length > 0 &&
        sentence.p95Milliseconds !== null &&
        Math.min(...paragraphs) >=
          sentence.p95Milliseconds + 250,
      details: {
        paragraphMinimum:
          paragraphs.length > 0
            ? Math.min(...paragraphs)
            : null,
        sentenceP95:
          sentence.p95Milliseconds,
      },
    },
    {
      id: "PARAGRAPH_MEDIAN_AT_LEAST_SENTENCE_MEDIAN_PLUS_350_MS",
      pass:
        boundaries.paragraph
          .medianMilliseconds !== null &&
        sentence.medianMilliseconds !== null &&
        boundaries.paragraph
          .medianMilliseconds >=
          sentence.medianMilliseconds + 350,
      details: {
        paragraphMedian:
          boundaries.paragraph
            .medianMilliseconds,
        sentenceMedian:
          sentence.medianMilliseconds,
      },
    },
    {
      id: "HEADING_850_TO_1000_MS",
      pass:
        headings.length > 0 &&
        headings.every(
          (value) =>
            value >= 850 && value <= 1_000,
        ),
      details: headings,
    },
    {
      id: "SECTION_950_TO_1150_MS",
      pass:
        sections.length > 0 &&
        sections.every(
          (value) =>
            value >= 950 && value <= 1_150,
        ),
      details: sections,
    },
    {
      id: "SECTION_GREATER_THAN_HEADING_BY_AT_MOST_250_MS",
      pass:
        sections.length > 0 &&
        headings.length > 0 &&
        Math.min(...sections) >
          Math.max(...headings) &&
        Math.max(...sections) -
          Math.min(...headings) <=
          250,
      details: { headings, sections },
    },
    {
      id: "TABLE_ROWS_240_TO_300_MS",
      pass:
        tableRows.length > 0 &&
        tableRows.every(
          (value) =>
            value >= 240 && value <= 300,
        ),
      details: tableRows,
    },
    {
      id: "LIST_ITEMS_280_TO_330_MS",
      pass:
        listItems.length > 0 &&
        listItems.every(
          (value) =>
            value >= 280 && value <= 330,
        ),
      details: listItems,
    },
    {
      id: "FEWER_STITCH_WARNINGS_THAN_PROFILE_A",
      pass:
        totalWarnings <
        input.plan.profileAReference
          .stitchDiscontinuityWarningCount,
      details: {
        semanticBlockWarningCount:
          totalWarnings,
        profileAWarningCount:
          input.plan.profileAReference
            .stitchDiscontinuityWarningCount,
      },
    },
    {
      id: "ALL_SAMPLE_AUDIO_AND_TRANSCRIPT_GATES",
      pass: input.candidates.every(
        (candidate) => candidate.passed,
      ),
      details: input.candidates.map(
        (candidate) => ({
          pairId: candidate.pairId,
          passed: candidate.passed,
          failedChecks: candidate.checks
            .filter((check) => !check.pass)
            .map((check) => check.id),
        }),
      ),
    },
        ];
  return {
    sentence,
    boundaries,
    totalStitchDiscontinuityWarnings:
      totalWarnings,
    profileAStitchDiscontinuityWarnings:
      input.plan.profileAReference
        .stitchDiscontinuityWarningCount,
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
      "Usage: piper-semantic-block-flow-runtime.ts --plan <path> --output-dir <path>",
    );
  }
  const planPath = resolve(args[planIndex + 1] ?? "");
  const outputRoot = resolve(
    args[outputIndex + 1] ?? "",
  );
  const isolation =
    audioRuntime.networkIsolationState();
  if (!isolation.isolated) {
    throw new Error(
      "Block-flow runtime requires --network none and no DATABASE_URL",
    );
  }
  const plan = validatePlan(
    JSON.parse(await readFile(planPath, "utf8")),
  );
  if (
    (await audioRuntime.sha256File(
      plan.voice.modelPath,
    )) !== plan.voice.modelSha256 ||
    (await audioRuntime.sha256File(
      plan.voice.configPath,
    )) !== plan.voice.configSha256
  ) {
    throw new Error("Frozen Bryce voice hashes changed");
  }
  await mkdir(join(outputRoot, "tuned-audio"), {
    recursive: true,
    mode: 0o700,
  });
  await chmod(
    join(outputRoot, "tuned-audio"),
    0o700,
  );
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "tenxpros-block-flow-"),
  );
  const sample05 = plan.samples.find(
    (sample) => sample.pairId === "sample-05",
  )!;
  const calibrationRuns = [];
  const blockAudioBySilence = new Map<
    number,
    readonly BlockAudio[]
  >();
  for (const seconds of plan
    .sentenceSilenceCandidatesSeconds) {
    const blocks = await synthesizeBlocks(
      sample05,
      seconds,
      plan,
      temporaryRoot,
    );
    blockAudioBySilence.set(seconds, blocks);
    calibrationRuns.push(
      calibration(
        seconds,
        blocks,
        plan.flowVersion ===
          SEMANTIC_BLOCK_FINAL_RECIPE_VERSION,
      ),
    );
  }
  const selectedCalibration = calibrationRuns
    .filter((candidate) => candidate.eligible)
    .sort(
      (left, right) =>
        left.sentenceSilenceSeconds -
          right.sentenceSilenceSeconds ||
        (left.distribution.p95Milliseconds ??
          Infinity) -
          (right.distribution
            .p95Milliseconds ?? Infinity) ||
        left.totalRawDurationSeconds -
          right.totalRawDurationSeconds,
    )[0];
  if (!selectedCalibration) {
    const result = {
      schemaVersion: RESULT_VERSION,
      planHash: plan.planHash,
      flowVersion: plan.flowVersion,
      isolation,
      calibrationRuns,
      selectedSentenceSilence: null,
      objectiveGates: {
        passed: false,
        cause:
          "NO_SENTENCE_SILENCE_CANDIDATE_PASSED_INTERNAL_FLOW_GATES",
      },
      candidates: [],
    };
    await writeRestricted(
      join(outputRoot, "runtime-results.json"),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    return;
  }
  const selectedSeconds =
    selectedCalibration.sentenceSilenceSeconds;
  const selectedSample05Blocks =
    blockAudioBySilence.get(selectedSeconds)!;
  const sample02 = plan.samples.find(
    (sample) => sample.pairId === "sample-02",
  )!;
  const sample02Blocks = await synthesizeBlocks(
    sample02,
    selectedSeconds,
    plan,
    temporaryRoot,
  );
  const candidates = [
    await generateSample({
      sample: sample05,
      blocks: selectedSample05Blocks,
      sentenceSilenceSeconds: selectedSeconds,
      plan,
      outputRoot,
      temporaryDirectory: temporaryRoot,
    }),
    await generateSample({
      sample: sample02,
      blocks: sample02Blocks,
      sentenceSilenceSeconds: selectedSeconds,
      plan,
      outputRoot,
      temporaryDirectory: temporaryRoot,
    }),
  ];
  const gates = objectiveGates({
    candidates,
    plan,
  });
  const result = {
    schemaVersion: RESULT_VERSION,
    planHash: plan.planHash,
    flowVersion: plan.flowVersion,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    isolation: {
      ...isolation,
      externalApiRequests: 0,
      externalTtsRequests: 0,
      productionMounts: 0,
      databaseImports: 0,
    },
    detectors: plan.detectors,
    architecture: {
      formerSentenceRequestCount:
        plan.samples.reduce(
          (sum, sample) =>
            sum +
            sample.blocks.reduce(
              (blockSum, block) =>
                blockSum +
                block.sentenceCount,
              0,
            ),
          0,
        ),
      semanticBlockRequestCount:
        plan.samples.reduce(
          (sum, sample) =>
            sum + sample.blocks.length,
          0,
        ),
      internalSentenceExternalStitches: 0,
    },
    calibrationRuns,
    selectedSentenceSilence: {
      seconds: selectedSeconds,
      milliseconds: selectedSeconds * 1_000,
      selectionPolicy:
        "eligible internal-flow gates, then lowest configured silence, then lowest p95, then duration",
      calibration:
        selectedCalibration,
    },
    candidates,
    objectiveGates: gates,
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
