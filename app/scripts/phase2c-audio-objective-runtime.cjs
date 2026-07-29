#!/usr/bin/env node
"use strict";

/**
 * Deterministic, local-only objective audio analysis for Academy Phase 2C.
 *
 * This runtime:
 * - reads MP3 files without modifying them;
 * - invokes only ffmpeg and ffprobe;
 * - downloads no model and performs no network request;
 * - does not claim ASR, forced alignment, pronunciation, naturalness, or
 *   perceptual quality conclusions;
 * - writes one new JSON result outside the Phase 2B package tree.
 */

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const PLAN_SCHEMA =
  "tenxpros-phase2c-objective-audio-plan-v1";
const OUTPUT_SCHEMA =
  "tenxpros-phase2c-objective-audio-analysis-v1";
const RECIPE_VERSION =
  "tenxpros-phase2c-objective-audio-recipe-v1";
const ANALYSIS_SAMPLE_RATE = 22_050;
const MAX_COMMAND_BUFFER = 512 * 1024 * 1024;
const MAX_PLAN_BYTES = 5 * 1024 * 1024;
const MAX_SAMPLES = 1_000;
const PHASE2B_ROOT = path.resolve(
  __dirname,
  "..",
  "..",
  "scratch_academy",
  "piper-listening",
);

const PAUSE_TYPES = new Set([
  "sentence",
  "tableRow",
  "list",
  "paragraph",
  "heading",
  "section",
]);

const THRESHOLDS = Object.freeze({
  silenceWindowMs: 20,
  pauseCoverageWindowMs: 10,
  silenceThresholdDbfs: -40,
  minimumSilenceEventMs: 80,
  shortSilenceMaximumMs: 180,
  longSilenceMinimumMs: 1_200,
  excessiveSilenceRatio: 0.35,
  clippingSampleAbsoluteThreshold: 32_760,
  clippingRatioFlag: 0.0001,
  clippingConsecutiveSamplesFlag: 3,
  edgeWindowMs: 50,
  edgeActiveThresholdDbfs: -35,
  edgeEndpointAbsoluteRatio: 0.02,
  edgeSilenceMinimumMs: 40,
  duplicateWindowMs: 1_000,
  duplicateHopMs: 500,
  duplicateSilenceFloorDbfs: -45,
  stitchSpeechWindowMs: 80,
  stitchEnergyDeltaFlagDb: 8,
  stitchSpectralCentroidDeltaFlagHz: 1_500,
  stitchPitchDeltaFlagSemitones: 5,
  pitchMinimumHz: 60,
  pitchMaximumHz: 400,
  pitchMinimumConfidence: 0.35,
  pauseBoundaryToleranceMs: 30,
  pauseCoverageMinimumRatio: 0.8,
  pauseContiguousMinimumRatio: 0.75,
});

const LIMITATIONS = Object.freeze([
  {
    code: "NO_ASR",
    statement:
      "No speech recognition was run; transcript correctness, omissions, repeated words, and pronunciation cannot be established.",
  },
  {
    code: "NO_FORCED_ALIGNMENT",
    statement:
      "Reference word count and stitch boundaries are supplied by the plan, not independently aligned to decoded speech.",
  },
  {
    code: "NO_PERCEPTUAL_JUDGMENT",
    statement:
      "Naturalness, intelligibility, fatigue, professionalism, and whether a pause sounds appropriate require perceptual listening (human or genuinely audio-capable judging); this objective runtime does neither.",
  },
  {
    code: "AMPLITUDE_SILENCE_HEURISTIC",
    statement:
      "Silence and semantic-pause coverage use a fixed decoded-amplitude threshold; codec residue and naturally quiet speech can affect results.",
  },
  {
    code: "DUPLICATE_HEURISTIC",
    statement:
      "Duplicate-window matches are exact-PCM or coarse acoustic-fingerprint candidates, not proof of duplicated linguistic content.",
  },
  {
    code: "EDGE_AND_STITCH_HEURISTICS",
    statement:
      "Edge, truncation, energy, spectral, and pitch flags identify review candidates only; normal phonetic transitions can trigger them.",
  },
]);

function usage() {
  return [
    "Deterministic local Phase 2C objective audio analysis",
    "",
    "Usage:",
    "  node scripts/phase2c-audio-objective-runtime.cjs \\",
    "    --plan <plan.json> --output <new-result.json>",
    "  node scripts/phase2c-audio-objective-runtime.cjs --self-test",
    "",
    `Plan schema: ${PLAN_SCHEMA}`,
    "",
    "Each sample supplies: id, path, referenceWordCount, optional",
    "expectedSha256, and stitchBoundaries. Each boundary supplies:",
    "id, seconds (pause end), expectedPauseMs, and pauseType.",
    "",
    "Minimal plan example:",
    JSON.stringify(
      {
        schemaVersion: PLAN_SCHEMA,
        analysisId: "phase2c-local-review",
        samples: [
          {
            id: "sample-01-A",
            path: "./audio/sample-01-A.mp3",
            referenceWordCount: 120,
            stitchBoundaries: [
              {
                id: "boundary-001",
                seconds: 12.34,
                expectedPauseMs: 500,
                pauseType: "paragraph",
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
  ].join("\n");
}

function round(value, digits = 6) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      path.resolve(root, relative) === candidate)
  );
}

function assertExactKeys(value, allowed, label) {
  const unexpected = Object.keys(value).filter(
    (key) => !allowed.has(key),
  );
  if (unexpected.length > 0) {
    throw new Error(
      `${label} contains unsupported field(s): ${unexpected.join(", ")}`,
    );
  }
}

function assertObject(value, label) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object`);
  }
}

function assertIdentifier(value, label) {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value)
  ) {
    throw new Error(`${label} is not a safe identifier`);
  }
  return value;
}

function normalizePlan(value, planDirectory) {
  assertObject(value, "plan");
  assertExactKeys(
    value,
    new Set(["schemaVersion", "analysisId", "samples"]),
    "plan",
  );
  if (value.schemaVersion !== PLAN_SCHEMA) {
    throw new Error(`Unsupported plan schema: ${value.schemaVersion}`);
  }
  const analysisId = assertIdentifier(
    value.analysisId,
    "plan.analysisId",
  );
  if (
    !Array.isArray(value.samples) ||
    value.samples.length === 0 ||
    value.samples.length > MAX_SAMPLES
  ) {
    throw new Error(
      `plan.samples must contain 1 through ${MAX_SAMPLES} samples`,
    );
  }
  const sampleIds = new Set();
  const samples = value.samples.map((sample, sampleIndex) => {
    const label = `plan.samples[${sampleIndex}]`;
    assertObject(sample, label);
    assertExactKeys(
      sample,
      new Set([
        "id",
        "path",
        "expectedSha256",
        "referenceWordCount",
        "stitchBoundaries",
      ]),
      label,
    );
    const id = assertIdentifier(sample.id, `${label}.id`);
    if (sampleIds.has(id)) {
      throw new Error(`Duplicate sample id: ${id}`);
    }
    sampleIds.add(id);
    if (
      typeof sample.path !== "string" ||
      !sample.path ||
      !sample.path.toLowerCase().endsWith(".mp3") ||
      sample.path.includes("\0")
    ) {
      throw new Error(`${label}.path must name an MP3 file`);
    }
    if (
      sample.expectedSha256 !== undefined &&
      (typeof sample.expectedSha256 !== "string" ||
        !/^[a-f0-9]{64}$/u.test(sample.expectedSha256))
    ) {
      throw new Error(
        `${label}.expectedSha256 must be a lowercase SHA-256`,
      );
    }
    if (
      !Number.isSafeInteger(sample.referenceWordCount) ||
      sample.referenceWordCount < 0 ||
      sample.referenceWordCount > 10_000_000
    ) {
      throw new Error(
        `${label}.referenceWordCount must be a non-negative integer`,
      );
    }
    if (!Array.isArray(sample.stitchBoundaries)) {
      throw new Error(`${label}.stitchBoundaries must be an array`);
    }
    const boundaryIds = new Set();
    const stitchBoundaries = sample.stitchBoundaries.map(
      (boundary, boundaryIndex) => {
        const boundaryLabel = `${label}.stitchBoundaries[${boundaryIndex}]`;
        assertObject(boundary, boundaryLabel);
        assertExactKeys(
          boundary,
          new Set([
            "id",
            "seconds",
            "expectedPauseMs",
            "pauseType",
          ]),
          boundaryLabel,
        );
        const boundaryId = assertIdentifier(
          boundary.id,
          `${boundaryLabel}.id`,
        );
        if (boundaryIds.has(boundaryId)) {
          throw new Error(
            `${label} has duplicate boundary id ${boundaryId}`,
          );
        }
        boundaryIds.add(boundaryId);
        if (
          typeof boundary.seconds !== "number" ||
          !Number.isFinite(boundary.seconds) ||
          boundary.seconds <= 0 ||
          boundary.seconds > 86_400
        ) {
          throw new Error(
            `${boundaryLabel}.seconds must be in (0, 86400]`,
          );
        }
        if (
          !Number.isInteger(boundary.expectedPauseMs) ||
          boundary.expectedPauseMs <= 0 ||
          boundary.expectedPauseMs > 5_000
        ) {
          throw new Error(
            `${boundaryLabel}.expectedPauseMs must be an integer from 1 through 5000`,
          );
        }
        if (!PAUSE_TYPES.has(boundary.pauseType)) {
          throw new Error(
            `${boundaryLabel}.pauseType is unsupported`,
          );
        }
        return {
          id: boundaryId,
          seconds: boundary.seconds,
          expectedPauseMs: boundary.expectedPauseMs,
          pauseType: boundary.pauseType,
        };
      },
    );
    stitchBoundaries.sort(
      (left, right) =>
        left.seconds - right.seconds ||
        left.id.localeCompare(right.id),
    );
    return {
      id,
      inputPath: sample.path,
      resolvedPath: path.resolve(planDirectory, sample.path),
      expectedSha256: sample.expectedSha256 ?? null,
      referenceWordCount: sample.referenceWordCount,
      stitchBoundaries,
    };
  });
  return {
    schemaVersion: PLAN_SCHEMA,
    analysisId,
    samples,
  };
}

function parseArguments(argv) {
  const options = {
    plan: "",
    output: "",
    help: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--self-test") {
      options.selfTest = true;
    } else if (argument === "--plan" || argument === "--output") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value`);
      }
      index += 1;
      if (argument === "--plan") options.plan = value;
      else options.output = value;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (options.help || options.selfTest) return options;
  if (!options.plan || !options.output) {
    throw new Error("--plan and --output are required");
  }
  return options;
}

function runBinary(binary, args, label) {
  const result = spawnSync(binary, args, {
    encoding: null,
    maxBuffer: MAX_COMMAND_BUFFER,
    windowsHide: true,
    env: {
      PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
    },
  });
  if (result.error) throw result.error;
  if (result.signal) {
    throw new Error(`${label} terminated by ${result.signal}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${label} exited ${String(result.status)}: ${result.stderr
        .toString("utf8")
        .trim()
        .slice(-2_000)}`,
    );
  }
  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function toolVersion(binary) {
  const result = runBinary(binary, ["-version"], `${binary} version`);
  return (
    result.stdout
      .toString("utf8")
      .split(/\r?\n/u)
      .find((line) => line.trim())?.trim() ?? ""
  );
}

function probeMp3(filePath) {
  const result = runBinary(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=format_name,duration,size,bit_rate:stream=index,codec_name,codec_type,sample_rate,channels,duration,bit_rate",
      "-of",
      "json",
      filePath,
    ],
    `ffprobe ${path.basename(filePath)}`,
  );
  const parsed = JSON.parse(result.stdout.toString("utf8"));
  const audioStream = parsed.streams?.find(
    (stream) => stream.codec_type === "audio",
  );
  if (!audioStream || audioStream.codec_name !== "mp3") {
    throw new Error(`${filePath} does not contain an MP3 audio stream`);
  }
  const durationSeconds = Number(
    audioStream.duration ?? parsed.format?.duration,
  );
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`${filePath} has no finite positive duration`);
  }
  return {
    formatName: parsed.format?.format_name ?? null,
    durationSeconds,
    sizeBytes: Number(parsed.format?.size),
    bitRate: Number(
      audioStream.bit_rate ?? parsed.format?.bit_rate,
    ),
    sourceSampleRateHz: Number(audioStream.sample_rate),
    sourceChannels: Number(audioStream.channels),
  };
}

function decodeMp3(filePath) {
  const result = runBinary(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-i",
      filePath,
      "-map",
      "0:a:0",
      "-vn",
      "-ac",
      "1",
      "-ar",
      String(ANALYSIS_SAMPLE_RATE),
      "-acodec",
      "pcm_s16le",
      "-f",
      "s16le",
      "pipe:1",
    ],
    `ffmpeg decode ${path.basename(filePath)}`,
  );
  if (
    result.stdout.length === 0 ||
    result.stdout.length % 2 !== 0
  ) {
    throw new Error(`${filePath} decoded to empty or misaligned PCM`);
  }
  const samples = new Int16Array(result.stdout.length / 2);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = result.stdout.readInt16LE(index * 2);
  }
  return { buffer: result.stdout, samples };
}

function parseEbur128(stderr, label) {
  const integratedMatches = [
    ...stderr.matchAll(
      /\bI:\s*(-?(?:\d+(?:\.\d+)?|inf))\s+LUFS/giu,
    ),
  ];
  const lraMatches = [
    ...stderr.matchAll(
      /\bLRA:\s*(-?(?:\d+(?:\.\d+)?|inf))\s+LU/giu,
    ),
  ];
  const peakMatches = [
    ...stderr.matchAll(
      /\bPeak:\s*(-?(?:\d+(?:\.\d+)?|inf))\s+dBFS/giu,
    ),
  ];
  const integratedLufs = Number(integratedMatches.at(-1)?.[1]);
  const loudnessRangeLu = Number(lraMatches.at(-1)?.[1]);
  const truePeakDbtp = Number(peakMatches.at(-1)?.[1]);
  if (
    !Number.isFinite(integratedLufs) ||
    !Number.isFinite(truePeakDbtp)
  ) {
    throw new Error(`${label} produced no finite EBU R128 summary`);
  }
  return {
    integratedLufs: round(integratedLufs, 3),
    loudnessRangeLu: Number.isFinite(loudnessRangeLu)
      ? round(loudnessRangeLu, 3)
      : null,
    truePeakDbtp: round(truePeakDbtp, 3),
  };
}

function analyzeLoudness(filePath) {
  const result = runBinary(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostdin",
      "-i",
      filePath,
      "-filter_complex",
      "ebur128=peak=true",
      "-f",
      "null",
      "-",
    ],
    `ffmpeg loudness ${path.basename(filePath)}`,
  );
  return parseEbur128(
    result.stderr.toString("utf8"),
    path.basename(filePath),
  );
}

function rms(samples, start = 0, end = samples.length) {
  const boundedStart = Math.max(0, Math.min(samples.length, start));
  const boundedEnd = Math.max(
    boundedStart,
    Math.min(samples.length, end),
  );
  if (boundedEnd <= boundedStart) return 0;
  let sumSquares = 0;
  for (let index = boundedStart; index < boundedEnd; index += 1) {
    const normalized = samples[index] / 32_768;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / (boundedEnd - boundedStart));
}

function dbfs(linear) {
  if (!Number.isFinite(linear) || linear <= 0) return -120;
  return Math.max(-120, 20 * Math.log10(linear));
}

function quantile(sortedValues, probability) {
  if (sortedValues.length === 0) return null;
  const position = (sortedValues.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  const fraction = position - lower;
  return (
    sortedValues[lower] * (1 - fraction) +
    sortedValues[upper] * fraction
  );
}

function durationDistribution(durationsMs) {
  const sorted = [...durationsMs].sort((left, right) => left - right);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    count: sorted.length,
    minimumMs: round(sorted[0] ?? null, 3),
    p25Ms: round(quantile(sorted, 0.25), 3),
    medianMs: round(quantile(sorted, 0.5), 3),
    p75Ms: round(quantile(sorted, 0.75), 3),
    p90Ms: round(quantile(sorted, 0.9), 3),
    maximumMs: round(sorted.at(-1) ?? null, 3),
    meanMs:
      sorted.length > 0 ? round(sum / sorted.length, 3) : null,
    buckets: {
      short: sorted.filter(
        (value) => value <= THRESHOLDS.shortSilenceMaximumMs,
      ).length,
      medium: sorted.filter(
        (value) =>
          value > THRESHOLDS.shortSilenceMaximumMs &&
          value < THRESHOLDS.longSilenceMinimumMs,
      ).length,
      long: sorted.filter(
        (value) => value >= THRESHOLDS.longSilenceMinimumMs,
      ).length,
    },
  };
}

function analyzeSilence(samples, sampleRate) {
  const windowFrames = Math.max(
    1,
    Math.round(
      (sampleRate * THRESHOLDS.silenceWindowMs) / 1_000,
    ),
  );
  const minimumFrames = Math.round(
    (sampleRate * THRESHOLDS.minimumSilenceEventMs) / 1_000,
  );
  const candidates = [];
  let candidateStart = null;
  let candidateEnd = null;
  for (
    let start = 0;
    start < samples.length;
    start += windowFrames
  ) {
    const end = Math.min(samples.length, start + windowFrames);
    const silent =
      dbfs(rms(samples, start, end)) <=
      THRESHOLDS.silenceThresholdDbfs;
    if (silent) {
      if (candidateStart === null) candidateStart = start;
      candidateEnd = end;
    } else if (candidateStart !== null) {
      candidates.push([candidateStart, candidateEnd]);
      candidateStart = null;
      candidateEnd = null;
    }
  }
  if (candidateStart !== null) {
    candidates.push([candidateStart, candidateEnd]);
  }
  const qualifying = candidates.filter(
    ([start, end]) => end - start >= minimumFrames,
  );
  const events = qualifying.map(([start, end], index) => {
    const durationMs = ((end - start) / sampleRate) * 1_000;
    return {
      index,
      startSeconds: round(start / sampleRate),
      endSeconds: round(end / sampleRate),
      durationMs: round(durationMs, 3),
      leading: start === 0,
      trailing: end === samples.length,
      short:
        durationMs <= THRESHOLDS.shortSilenceMaximumMs,
      long: durationMs >= THRESHOLDS.longSilenceMinimumMs,
    };
  });
  const silentFrames = qualifying.reduce(
    (total, [start, end]) => total + (end - start),
    0,
  );
  const ratio =
    samples.length === 0 ? 0 : silentFrames / samples.length;
  const durations = events.map((event) => event.durationMs);
  return {
    method: "non-overlapping decoded-PCM RMS windows",
    thresholdDbfs: THRESHOLDS.silenceThresholdDbfs,
    windowMs: THRESHOLDS.silenceWindowMs,
    minimumEventMs: THRESHOLDS.minimumSilenceEventMs,
    ratio: round(ratio),
    totalSeconds: round(silentFrames / sampleRate),
    eventCount: events.length,
    eventsPerMinute: round(
      events.length / (samples.length / sampleRate / 60),
      3,
    ),
    distribution: durationDistribution(durations),
    flags: {
      hasShortSilence: events.some((event) => event.short),
      hasLongSilence: events.some((event) => event.long),
      excessiveSilenceRatio:
        ratio > THRESHOLDS.excessiveSilenceRatio,
      noDetectedSilence: events.length === 0,
    },
    events,
  };
}

function analyzeClipping(samples) {
  let clippingSampleCount = 0;
  let maximumConsecutive = 0;
  let consecutive = 0;
  let peakAbsolute = 0;
  for (const sample of samples) {
    const absolute = Math.abs(sample);
    peakAbsolute = Math.max(peakAbsolute, absolute);
    if (
      absolute >= THRESHOLDS.clippingSampleAbsoluteThreshold
    ) {
      clippingSampleCount += 1;
      consecutive += 1;
      maximumConsecutive = Math.max(maximumConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }
  const ratio =
    samples.length === 0 ? 0 : clippingSampleCount / samples.length;
  return {
    sampleAbsoluteThreshold:
      THRESHOLDS.clippingSampleAbsoluteThreshold,
    clippingSampleCount,
    clippingSampleRatio: round(ratio, 9),
    maximumConsecutiveClippingSamples: maximumConsecutive,
    decodedPeakAbsoluteSample: peakAbsolute,
    decodedPeakDbfs: round(dbfs(peakAbsolute / 32_768), 3),
    possibleClipping:
      ratio >= THRESHOLDS.clippingRatioFlag ||
      maximumConsecutive >=
        THRESHOLDS.clippingConsecutiveSamplesFlag,
  };
}

function contiguousSilentEdgeMs(
  samples,
  sampleRate,
  fromStart,
) {
  const windowFrames = Math.max(
    1,
    Math.round(
      (sampleRate * THRESHOLDS.silenceWindowMs) / 1_000,
    ),
  );
  let frames = 0;
  if (fromStart) {
    for (
      let start = 0;
      start < samples.length;
      start += windowFrames
    ) {
      const end = Math.min(samples.length, start + windowFrames);
      if (
        dbfs(rms(samples, start, end)) >
        THRESHOLDS.silenceThresholdDbfs
      ) {
        break;
      }
      frames += end - start;
    }
  } else {
    for (
      let end = samples.length;
      end > 0;
      end -= windowFrames
    ) {
      const start = Math.max(0, end - windowFrames);
      if (
        dbfs(rms(samples, start, end)) >
        THRESHOLDS.silenceThresholdDbfs
      ) {
        break;
      }
      frames += end - start;
    }
  }
  return (frames / sampleRate) * 1_000;
}

function analyzeEdges(samples, sampleRate) {
  const edgeFrames = Math.max(
    1,
    Math.round((sampleRate * THRESHOLDS.edgeWindowMs) / 1_000),
  );
  const startRmsDbfs = dbfs(
    rms(samples, 0, Math.min(samples.length, edgeFrames)),
  );
  const endRmsDbfs = dbfs(
    rms(
      samples,
      Math.max(0, samples.length - edgeFrames),
      samples.length,
    ),
  );
  const leadingSilenceMs = contiguousSilentEdgeMs(
    samples,
    sampleRate,
    true,
  );
  const trailingSilenceMs = contiguousSilentEdgeMs(
    samples,
    sampleRate,
    false,
  );
  const firstAbsoluteRatio =
    Math.abs(samples[0] ?? 0) / 32_768;
  const lastAbsoluteRatio =
    Math.abs(samples.at(-1) ?? 0) / 32_768;
  const possibleStartTruncation =
    startRmsDbfs > THRESHOLDS.edgeActiveThresholdDbfs &&
    leadingSilenceMs < THRESHOLDS.edgeSilenceMinimumMs &&
    firstAbsoluteRatio >=
      THRESHOLDS.edgeEndpointAbsoluteRatio;
  const possibleEndTruncation =
    endRmsDbfs > THRESHOLDS.edgeActiveThresholdDbfs &&
    trailingSilenceMs < THRESHOLDS.edgeSilenceMinimumMs &&
    lastAbsoluteRatio >= THRESHOLDS.edgeEndpointAbsoluteRatio;
  return {
    method:
      "decoded edge RMS, endpoint amplitude, and contiguous low-energy windows",
    confidence: "low",
    leadingSilenceMs: round(leadingSilenceMs, 3),
    trailingSilenceMs: round(trailingSilenceMs, 3),
    startWindowRmsDbfs: round(startRmsDbfs, 3),
    endWindowRmsDbfs: round(endRmsDbfs, 3),
    firstSampleAbsoluteRatio: round(firstAbsoluteRatio, 9),
    lastSampleAbsoluteRatio: round(lastAbsoluteRatio, 9),
    possibleStartTruncation,
    possibleEndTruncation,
    requiresPerceptualOrAlignmentReview:
      possibleStartTruncation || possibleEndTruncation,
  };
}

function zeroCrossingRate(samples, start, end) {
  if (end - start < 2) return 0;
  let crossings = 0;
  let previous = samples[start];
  for (let index = start + 1; index < end; index += 1) {
    const current = samples[index];
    if (
      (previous < 0 && current >= 0) ||
      (previous >= 0 && current < 0)
    ) {
      crossings += 1;
    }
    previous = current;
  }
  return crossings / (end - start - 1);
}

function nextPowerOfTwo(value) {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

function spectralCentroid(samples, start, end, sampleRate) {
  const length = end - start;
  if (length < 16 || rms(samples, start, end) === 0) return null;
  const fftSize = Math.min(4_096, nextPowerOfTwo(length));
  const real = new Float64Array(fftSize);
  const imaginary = new Float64Array(fftSize);
  const used = Math.min(length, fftSize);
  let mean = 0;
  for (let index = 0; index < used; index += 1) {
    mean += samples[start + index] / 32_768;
  }
  mean /= used;
  for (let index = 0; index < used; index += 1) {
    const hann =
      used === 1
        ? 1
        : 0.5 -
          0.5 *
            Math.cos((2 * Math.PI * index) / (used - 1));
    real[index] =
      (samples[start + index] / 32_768 - mean) * hann;
  }
  for (
    let index = 1, reversed = 0;
    index < fftSize;
    index += 1
  ) {
    let bit = fftSize >> 1;
    for (; reversed & bit; bit >>= 1) reversed ^= bit;
    reversed ^= bit;
    if (index < reversed) {
      [real[index], real[reversed]] = [
        real[reversed],
        real[index],
      ];
      [imaginary[index], imaginary[reversed]] = [
        imaginary[reversed],
        imaginary[index],
      ];
    }
  }
  for (let size = 2; size <= fftSize; size *= 2) {
    const angle = (-2 * Math.PI) / size;
    const phaseStepReal = Math.cos(angle);
    const phaseStepImaginary = Math.sin(angle);
    for (let offset = 0; offset < fftSize; offset += size) {
      let phaseReal = 1;
      let phaseImaginary = 0;
      for (let index = 0; index < size / 2; index += 1) {
        const evenIndex = offset + index;
        const oddIndex = evenIndex + size / 2;
        const oddReal =
          real[oddIndex] * phaseReal -
          imaginary[oddIndex] * phaseImaginary;
        const oddImaginary =
          real[oddIndex] * phaseImaginary +
          imaginary[oddIndex] * phaseReal;
        const evenReal = real[evenIndex];
        const evenImaginary = imaginary[evenIndex];
        real[evenIndex] = evenReal + oddReal;
        imaginary[evenIndex] = evenImaginary + oddImaginary;
        real[oddIndex] = evenReal - oddReal;
        imaginary[oddIndex] = evenImaginary - oddImaginary;
        const nextPhaseReal =
          phaseReal * phaseStepReal -
          phaseImaginary * phaseStepImaginary;
        phaseImaginary =
          phaseReal * phaseStepImaginary +
          phaseImaginary * phaseStepReal;
        phaseReal = nextPhaseReal;
      }
    }
  }
  let weighted = 0;
  let magnitudeSum = 0;
  for (let bin = 1; bin <= fftSize / 2; bin += 1) {
    const magnitude = Math.hypot(real[bin], imaginary[bin]);
    const frequency = (bin * sampleRate) / fftSize;
    weighted += frequency * magnitude;
    magnitudeSum += magnitude;
  }
  return magnitudeSum > 0 ? weighted / magnitudeSum : null;
}

function estimatePitch(samples, start, end, sampleRate) {
  const length = end - start;
  const minimumLag = Math.max(
    1,
    Math.floor(sampleRate / THRESHOLDS.pitchMaximumHz),
  );
  const maximumLag = Math.min(
    length - 2,
    Math.ceil(sampleRate / THRESHOLDS.pitchMinimumHz),
  );
  if (
    maximumLag <= minimumLag ||
    dbfs(rms(samples, start, end)) <=
      THRESHOLDS.silenceThresholdDbfs
  ) {
    return { hz: null, confidence: 0, voiced: false };
  }
  let mean = 0;
  for (let index = start; index < end; index += 1) {
    mean += samples[index] / 32_768;
  }
  mean /= length;
  let bestLag = null;
  let bestCorrelation = -1;
  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let numerator = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    for (
      let offset = 0;
      offset < length - lag;
      offset += 1
    ) {
      const left = samples[start + offset] / 32_768 - mean;
      const right =
        samples[start + offset + lag] / 32_768 - mean;
      numerator += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }
    const denominator = Math.sqrt(leftEnergy * rightEnergy);
    const correlation =
      denominator > 0 ? numerator / denominator : 0;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }
  const voiced =
    bestLag !== null &&
    bestCorrelation >= THRESHOLDS.pitchMinimumConfidence;
  return {
    hz: voiced ? round(sampleRate / bestLag, 3) : null,
    confidence: round(Math.max(0, bestCorrelation), 6),
    voiced,
  };
}

function acousticFingerprint(samples, start, end, sampleRate) {
  const slices = 8;
  const vector = [];
  for (let slice = 0; slice < slices; slice += 1) {
    const sliceStart =
      start + Math.floor(((end - start) * slice) / slices);
    const sliceEnd =
      start +
      Math.floor(((end - start) * (slice + 1)) / slices);
    vector.push(
      Math.round(dbfs(rms(samples, sliceStart, sliceEnd)) / 2),
      Math.round(
        zeroCrossingRate(samples, sliceStart, sliceEnd) / 0.02,
      ),
    );
  }
  const centroid = spectralCentroid(
    samples,
    start,
    end,
    sampleRate,
  );
  vector.push(
    centroid === null ? null : Math.round(centroid / 250),
  );
  return sha256(JSON.stringify(vector)).slice(0, 16);
}

function duplicateGroupsFromMap(groups, windowFrames, sampleRate) {
  return [...groups.entries()]
    .map(([fingerprint, starts]) => {
      const unique = [...new Set(starts)].sort(
        (left, right) => left - right,
      );
      const hasSeparatedPair = unique.some((left, index) =>
        unique
          .slice(index + 1)
          .some((right) => right - left >= windowFrames),
      );
      return hasSeparatedPair
        ? {
            fingerprint,
            occurrences: unique.length,
            startSeconds: unique.map((start) =>
              round(start / sampleRate),
            ),
          }
        : null;
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.occurrences - left.occurrences ||
        left.fingerprint.localeCompare(right.fingerprint),
    )
    .slice(0, 100);
}

function analyzeDuplicates(samples, pcmBuffer, sampleRate) {
  const windowFrames = Math.round(
    (sampleRate * THRESHOLDS.duplicateWindowMs) / 1_000,
  );
  const hopFrames = Math.round(
    (sampleRate * THRESHOLDS.duplicateHopMs) / 1_000,
  );
  const exact = new Map();
  const coarse = new Map();
  let analyzed = 0;
  for (
    let start = 0;
    start + windowFrames <= samples.length;
    start += hopFrames
  ) {
    const end = start + windowFrames;
    if (
      dbfs(rms(samples, start, end)) <=
      THRESHOLDS.duplicateSilenceFloorDbfs
    ) {
      continue;
    }
    analyzed += 1;
    const exactHash = sha256(
      pcmBuffer.subarray(start * 2, end * 2),
    ).slice(0, 16);
    const coarseHash = acousticFingerprint(
      samples,
      start,
      end,
      sampleRate,
    );
    const exactStarts = exact.get(exactHash) ?? [];
    exactStarts.push(start);
    exact.set(exactHash, exactStarts);
    const coarseStarts = coarse.get(coarseHash) ?? [];
    coarseStarts.push(start);
    coarse.set(coarseHash, coarseStarts);
  }
  const exactGroups = duplicateGroupsFromMap(
    exact,
    windowFrames,
    sampleRate,
  );
  const fingerprintGroups = duplicateGroupsFromMap(
    coarse,
    windowFrames,
    sampleRate,
  );
  return {
    method:
      "one-second exact decoded-PCM hashes plus coarse eight-slice acoustic fingerprints",
    windowMs: THRESHOLDS.duplicateWindowMs,
    hopMs: THRESHOLDS.duplicateHopMs,
    analyzedNonSilentWindows: analyzed,
    exactDuplicateGroupCount: exactGroups.length,
    fingerprintDuplicateGroupCount: fingerprintGroups.length,
    exactGroups,
    fingerprintGroups,
    possibleDuplicateWindow:
      exactGroups.length > 0 || fingerprintGroups.length > 0,
    requiresAsrOrHumanConfirmation: true,
  };
}

function featureWindow(samples, start, end, sampleRate) {
  const boundedStart = Math.max(0, Math.min(samples.length, start));
  const boundedEnd = Math.max(
    boundedStart,
    Math.min(samples.length, end),
  );
  const pitch = estimatePitch(
    samples,
    boundedStart,
    boundedEnd,
    sampleRate,
  );
  return {
    startSeconds: round(boundedStart / sampleRate),
    endSeconds: round(boundedEnd / sampleRate),
    rmsDbfs: round(
      dbfs(rms(samples, boundedStart, boundedEnd)),
      3,
    ),
    spectralCentroidHz: round(
      spectralCentroid(
        samples,
        boundedStart,
        boundedEnd,
        sampleRate,
      ),
      3,
    ),
    pitch,
  };
}

function silentCoverageEndingAt(
  samples,
  sampleRate,
  boundaryFrame,
  expectedFrames,
) {
  const smallWindow = Math.max(
    1,
    Math.round(
      (sampleRate * THRESHOLDS.pauseCoverageWindowMs) / 1_000,
    ),
  );
  const toleranceFrames = Math.round(
    (sampleRate * THRESHOLDS.pauseBoundaryToleranceMs) / 1_000,
  );
  let best = null;
  for (
    let offset = -toleranceFrames;
    offset <= toleranceFrames;
    offset += smallWindow
  ) {
    const end = Math.max(
      0,
      Math.min(samples.length, boundaryFrame + offset),
    );
    const start = Math.max(0, end - expectedFrames);
    let silentFrames = 0;
    for (
      let windowStart = start;
      windowStart < end;
      windowStart += smallWindow
    ) {
      const windowEnd = Math.min(end, windowStart + smallWindow);
      if (
        dbfs(rms(samples, windowStart, windowEnd)) <=
        THRESHOLDS.silenceThresholdDbfs
      ) {
        silentFrames += windowEnd - windowStart;
      }
    }
    let contiguousFrames = 0;
    const maximumScanFrames = Math.max(
      expectedFrames * 3,
      Math.round(sampleRate * 2),
    );
    for (
      let windowEnd = end;
      windowEnd > Math.max(0, end - maximumScanFrames);
      windowEnd -= smallWindow
    ) {
      const windowStart = Math.max(
        0,
        windowEnd - smallWindow,
        end - maximumScanFrames,
      );
      if (
        dbfs(rms(samples, windowStart, windowEnd)) >
        THRESHOLDS.silenceThresholdDbfs
      ) {
        break;
      }
      contiguousFrames += windowEnd - windowStart;
    }
    const candidate = {
      offsetFrames: offset,
      silentFrames,
      intervalFrames: end - start,
      contiguousFrames,
    };
    if (
      !best ||
      candidate.contiguousFrames > best.contiguousFrames ||
      (candidate.contiguousFrames === best.contiguousFrames &&
        candidate.silentFrames > best.silentFrames) ||
      (candidate.contiguousFrames === best.contiguousFrames &&
        candidate.silentFrames === best.silentFrames &&
        Math.abs(candidate.offsetFrames) <
          Math.abs(best.offsetFrames))
    ) {
      best = candidate;
    }
  }
  return best;
}

function analyzeStitchBoundaries(
  samples,
  sampleRate,
  boundaries,
) {
  const speechWindowFrames = Math.round(
    (sampleRate * THRESHOLDS.stitchSpeechWindowMs) / 1_000,
  );
  return boundaries.map((boundary) => {
    const boundaryFrame = Math.round(
      boundary.seconds * sampleRate,
    );
    const expectedFrames = Math.round(
      (boundary.expectedPauseMs * sampleRate) / 1_000,
    );
    if (
      boundaryFrame <= expectedFrames ||
      boundaryFrame >= samples.length
    ) {
      throw new Error(
        `${boundary.id}: stitch boundary is outside decoded audio`,
      );
    }
    const pauseStartFrame = boundaryFrame - expectedFrames;
    const coverage = silentCoverageEndingAt(
      samples,
      sampleRate,
      boundaryFrame,
      expectedFrames,
    );
    const coverageRatio =
      coverage.intervalFrames > 0
        ? coverage.silentFrames / coverage.intervalFrames
        : 0;
    const contiguousMs =
      (coverage.contiguousFrames / sampleRate) * 1_000;
    const covered =
      coverageRatio >= THRESHOLDS.pauseCoverageMinimumRatio &&
      contiguousMs >=
        boundary.expectedPauseMs *
          THRESHOLDS.pauseContiguousMinimumRatio;
    const before = featureWindow(
      samples,
      pauseStartFrame - speechWindowFrames,
      pauseStartFrame,
      sampleRate,
    );
    const after = featureWindow(
      samples,
      boundaryFrame,
      boundaryFrame + speechWindowFrames,
      sampleRate,
    );
    const energyDeltaDb = after.rmsDbfs - before.rmsDbfs;
    const centroidDelta =
      before.spectralCentroidHz === null ||
      after.spectralCentroidHz === null
        ? null
        : after.spectralCentroidHz -
          before.spectralCentroidHz;
    const pitchDeltaSemitones =
      before.pitch.hz === null || after.pitch.hz === null
        ? null
        : 12 * Math.log2(after.pitch.hz / before.pitch.hz);
    const flags = {
      energyDiscontinuity:
        Math.abs(energyDeltaDb) >=
        THRESHOLDS.stitchEnergyDeltaFlagDb,
      spectralDiscontinuity:
        centroidDelta !== null &&
        Math.abs(centroidDelta) >=
          THRESHOLDS.stitchSpectralCentroidDeltaFlagHz,
      pitchDiscontinuity:
        pitchDeltaSemitones !== null &&
        Math.abs(pitchDeltaSemitones) >=
          THRESHOLDS.stitchPitchDeltaFlagSemitones,
    };
    return {
      id: boundary.id,
      pauseType: boundary.pauseType,
      suppliedPauseEndSeconds: round(boundary.seconds),
      expectedPauseMs: boundary.expectedPauseMs,
      measuredPause: {
        thresholdDbfs: THRESHOLDS.silenceThresholdDbfs,
        matchedBoundaryOffsetMs: round(
          (coverage.offsetFrames / sampleRate) * 1_000,
          3,
        ),
        expectedIntervalLowEnergyRatio: round(coverageRatio),
        contiguousLowEnergyBeforeBoundaryMs: round(
          contiguousMs,
          3,
        ),
        deltaFromExpectedMs: round(
          contiguousMs - boundary.expectedPauseMs,
          3,
        ),
        covered,
        shorterThanExpected:
          contiguousMs <
          boundary.expectedPauseMs *
            THRESHOLDS.pauseContiguousMinimumRatio,
        longerThanExpected:
          contiguousMs > boundary.expectedPauseMs + 250,
      },
      crossSpeechStitchFeatures: {
        method:
          "pre-pause speech window versus post-pause speech window",
        before,
        after,
        energyDeltaDb: round(energyDeltaDb, 3),
        spectralCentroidDeltaHz: round(centroidDelta, 3),
        pitchDeltaSemitones: round(pitchDeltaSemitones, 3),
        flags,
        anyDiscontinuityCandidate: Object.values(flags).some(
          Boolean,
        ),
        requiresPerceptualReview: true,
      },
    };
  });
}

function aggregatePauseCoverage(boundaries) {
  const byType = {};
  for (const pauseType of [...PAUSE_TYPES].sort()) {
    const matching = boundaries.filter(
      (boundary) => boundary.pauseType === pauseType,
    );
    if (matching.length === 0) continue;
    const observed = matching
      .map(
        (boundary) =>
          boundary.measuredPause
            .contiguousLowEnergyBeforeBoundaryMs,
      )
      .sort((left, right) => left - right);
    const deltas = matching
      .map(
        (boundary) =>
          boundary.measuredPause.deltaFromExpectedMs,
      )
      .sort((left, right) => left - right);
    const coveredCount = matching.filter(
      (boundary) => boundary.measuredPause.covered,
    ).length;
    byType[pauseType] = {
      expectedCount: matching.length,
      acousticallyCoveredCount: coveredCount,
      coverageRate: round(coveredCount / matching.length),
      expectedDurationMs: matching.reduce(
        (total, boundary) => total + boundary.expectedPauseMs,
        0,
      ),
      medianObservedContiguousMs: round(
        quantile(observed, 0.5),
        3,
      ),
      medianDeltaMs: round(quantile(deltas, 0.5), 3),
    };
  }
  const coveredCount = boundaries.filter(
    (boundary) => boundary.measuredPause.covered,
  ).length;
  return {
    expectedBoundaryCount: boundaries.length,
    acousticallyCoveredBoundaryCount: coveredCount,
    coverageRate:
      boundaries.length === 0
        ? null
        : round(coveredCount / boundaries.length),
    allExpectedPausesCovered:
      boundaries.length > 0 && coveredCount === boundaries.length,
    noBoundariesSupplied: boundaries.length === 0,
    byPauseType: byType,
    interpretation:
      "Coverage means low decoded energy around a supplied synthesis boundary, not independently aligned semantic correctness.",
  };
}

function signalStatistics(samples, sampleRate) {
  const windowFrames = Math.max(1, Math.round(sampleRate * 0.1));
  const windowDbfs = [];
  for (
    let start = 0;
    start < samples.length;
    start += windowFrames
  ) {
    windowDbfs.push(
      dbfs(
        rms(
          samples,
          start,
          Math.min(samples.length, start + windowFrames),
        ),
      ),
    );
  }
  windowDbfs.sort((left, right) => left - right);
  return {
    overallRmsDbfs: round(dbfs(rms(samples)), 3),
    windowMs: 100,
    windowRmsDbfs: {
      p10: round(quantile(windowDbfs, 0.1), 3),
      median: round(quantile(windowDbfs, 0.5), 3),
      p90: round(quantile(windowDbfs, 0.9), 3),
      p90MinusP10Db: round(
        quantile(windowDbfs, 0.9) -
          quantile(windowDbfs, 0.1),
        3,
      ),
    },
  };
}

async function snapshotSource(filePath) {
  const fileStat = await fsp.lstat(filePath);
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error(
      `Audio source must be a regular non-symlink file: ${filePath}`,
    );
  }
  return {
    sizeBytes: fileStat.size,
    mode: fileStat.mode,
    mtimeMs: fileStat.mtimeMs,
    sha256: await sha256File(filePath),
  };
}

function sourceSnapshotsMatch(before, after) {
  return (
    before.sizeBytes === after.sizeBytes &&
    before.mode === after.mode &&
    before.mtimeMs === after.mtimeMs &&
    before.sha256 === after.sha256
  );
}

async function analyzeSample(sample) {
  const before = await snapshotSource(sample.resolvedPath);
  if (
    sample.expectedSha256 !== null &&
    before.sha256 !== sample.expectedSha256
  ) {
    throw new Error(
      `${sample.id}: source SHA-256 does not match the plan`,
    );
  }
  const probe = probeMp3(sample.resolvedPath);
  const decoded = decodeMp3(sample.resolvedPath);
  const decodedDurationSeconds =
    decoded.samples.length / ANALYSIS_SAMPLE_RATE;
  for (const boundary of sample.stitchBoundaries) {
    if (
      boundary.seconds >= decodedDurationSeconds ||
      boundary.seconds -
        boundary.expectedPauseMs / 1_000 <=
        0
    ) {
      throw new Error(
        `${sample.id}/${boundary.id}: boundary is outside the decoded duration`,
      );
    }
  }
  const silence = analyzeSilence(
    decoded.samples,
    ANALYSIS_SAMPLE_RATE,
  );
  const clipping = analyzeClipping(decoded.samples);
  const edges = analyzeEdges(
    decoded.samples,
    ANALYSIS_SAMPLE_RATE,
  );
  const duplicates = analyzeDuplicates(
    decoded.samples,
    decoded.buffer,
    ANALYSIS_SAMPLE_RATE,
  );
  const boundaries = analyzeStitchBoundaries(
    decoded.samples,
    ANALYSIS_SAMPLE_RATE,
    sample.stitchBoundaries,
  );
  const loudness = analyzeLoudness(sample.resolvedPath);
  const after = await snapshotSource(sample.resolvedPath);
  if (!sourceSnapshotsMatch(before, after)) {
    throw new Error(
      `${sample.id}: source MP3 changed during objective analysis`,
    );
  }
  return {
    id: sample.id,
    source: {
      planPath: sample.inputPath,
      resolvedPath: sample.resolvedPath,
      sha256: before.sha256,
      sizeBytes: before.sizeBytes,
      expectedSha256Provided: sample.expectedSha256 !== null,
      expectedSha256Matched:
        sample.expectedSha256 === null
          ? null
          : sample.expectedSha256 === before.sha256,
      byteForBytePreserved: true,
      metadataPreserved: true,
    },
    duration: {
      ffprobeSeconds: round(probe.durationSeconds),
      decodedSeconds: round(decodedDurationSeconds),
      decodedFrameCount: decoded.samples.length,
      ffprobeMinusDecodedSeconds: round(
        probe.durationSeconds - decodedDurationSeconds,
      ),
    },
    stream: {
      codec: "mp3",
      formatName: probe.formatName,
      sourceSampleRateHz: probe.sourceSampleRateHz,
      sourceChannels: probe.sourceChannels,
      bitRate: Number.isFinite(probe.bitRate)
        ? probe.bitRate
        : null,
      analysisSampleRateHz: ANALYSIS_SAMPLE_RATE,
      analysisChannels: 1,
      decodedFormat: "pcm_s16le",
    },
    speakingRate: {
      referenceWordCount: sample.referenceWordCount,
      wordsPerMinute:
        sample.referenceWordCount === 0
          ? null
          : round(
              (sample.referenceWordCount * 60) /
                decodedDurationSeconds,
              3,
            ),
      basis:
        "supplied reference word count divided by decoded duration; no ASR or forced alignment",
      estimatedVoicedSeconds: round(
        Math.max(0, decodedDurationSeconds - silence.totalSeconds),
      ),
      estimatedActiveSpeechWordsPerMinute:
        sample.referenceWordCount === 0 ||
        decodedDurationSeconds - silence.totalSeconds <= 0
          ? null
          : round(
              (sample.referenceWordCount * 60) /
                (decodedDurationSeconds - silence.totalSeconds),
              3,
            ),
      activeSpeechEstimateBasis:
        "decoded duration minus fixed-threshold silence events; this amplitude-derived estimate is not voice activity detection or forced alignment",
    },
    silence,
    loudness,
    clipping,
    signal: signalStatistics(
      decoded.samples,
      ANALYSIS_SAMPLE_RATE,
    ),
    edgeAndTruncationHeuristic: edges,
    duplicateWindowHeuristic: duplicates,
    stitchBoundaries: boundaries,
    semanticPauseCoverage: aggregatePauseCoverage(boundaries),
    cannotEstablish: [
      "spoken-word accuracy",
      "pronunciation correctness",
      "semantic pause appropriateness",
      "naturalness",
      "listener comfort",
      "professional quality",
    ],
  };
}

async function readPlan(planPath) {
  const resolved = path.resolve(planPath);
  const fileStat = await fsp.lstat(resolved);
  if (
    !fileStat.isFile() ||
    fileStat.isSymbolicLink() ||
    fileStat.size <= 0 ||
    fileStat.size > MAX_PLAN_BYTES
  ) {
    throw new Error(
      `Plan must be a regular JSON file no larger than ${MAX_PLAN_BYTES} bytes`,
    );
  }
  const raw = await fsp.readFile(resolved);
  return {
    path: resolved,
    raw,
    plan: normalizePlan(
      JSON.parse(raw.toString("utf8")),
      path.dirname(resolved),
    ),
  };
}

async function assertOutputPath(outputArgument, planPath, samples) {
  const outputPath = path.resolve(outputArgument);
  if (!outputPath.toLowerCase().endsWith(".json")) {
    throw new Error("--output must end in .json");
  }
  if (isInside(PHASE2B_ROOT, outputPath)) {
    throw new Error(
      `Phase 2C output may not be written inside ${PHASE2B_ROOT}`,
    );
  }
  if (
    outputPath === planPath ||
    samples.some((sample) => sample.resolvedPath === outputPath)
  ) {
    throw new Error("Output may not overwrite an input");
  }
  try {
    await fsp.access(outputPath);
    throw new Error(`Refusing to overwrite existing output: ${outputPath}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const parent = path.dirname(outputPath);
  const parentStat = await fsp.lstat(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error("Output parent must be a real existing directory");
  }
  if ((await fsp.realpath(parent)) !== parent) {
    throw new Error("Output parent must use its canonical path");
  }
  return outputPath;
}

async function executePlan(planRecord, outputArgument) {
  const outputPath = await assertOutputPath(
    outputArgument,
    planRecord.path,
    planRecord.plan.samples,
  );
  const sourcePaths = new Set();
  for (const sample of planRecord.plan.samples) {
    if (sourcePaths.has(sample.resolvedPath)) {
      throw new Error(
        `Multiple sample ids point to ${sample.resolvedPath}`,
      );
    }
    sourcePaths.add(sample.resolvedPath);
  }
  const tools = {
    ffmpeg: toolVersion("ffmpeg"),
    ffprobe: toolVersion("ffprobe"),
  };
  const samples = [];
  for (const sample of planRecord.plan.samples) {
    samples.push(await analyzeSample(sample));
  }
  const pauseTypes = {};
  for (const pauseType of [...PAUSE_TYPES].sort()) {
    const boundaries = samples.flatMap((sample) =>
      sample.stitchBoundaries.filter(
        (boundary) => boundary.pauseType === pauseType,
      ),
    );
    if (boundaries.length === 0) continue;
    const covered = boundaries.filter(
      (boundary) => boundary.measuredPause.covered,
    ).length;
    pauseTypes[pauseType] = {
      expectedCount: boundaries.length,
      acousticallyCoveredCount: covered,
      coverageRate: round(covered / boundaries.length),
    };
  }
  const output = {
    schemaVersion: OUTPUT_SCHEMA,
    recipeVersion: RECIPE_VERSION,
    analysisId: planRecord.plan.analysisId,
    plan: {
      schemaVersion: PLAN_SCHEMA,
      sha256: sha256(planRecord.raw),
      sampleCount: samples.length,
    },
    deterministicRecipe: {
      analysisSampleRateHz: ANALYSIS_SAMPLE_RATE,
      thresholds: THRESHOLDS,
      subprocessAllowlist: ["ffmpeg", "ffprobe"],
    },
    tools,
    isolation: {
      externalNetworkRequests: 0,
      externalApiRequests: 0,
      ttsRequests: 0,
      modelDownloads: 0,
      asrModelsLoaded: 0,
      sourceFilesOpenedReadOnly: true,
      phase2BOutputWrites: 0,
    },
    limitations: LIMITATIONS,
    summary: {
      sampleCount: samples.length,
      allSourcesPreserved: samples.every(
        (sample) => sample.source.byteForBytePreserved,
      ),
      suppliedStitchBoundaryCount: samples.reduce(
        (total, sample) =>
          total + sample.stitchBoundaries.length,
        0,
      ),
      semanticPauseCoverageByType: pauseTypes,
      samplesWithClippingCandidate: samples
        .filter((sample) => sample.clipping.possibleClipping)
        .map((sample) => sample.id),
      samplesWithEdgeCandidate: samples
        .filter(
          (sample) =>
            sample.edgeAndTruncationHeuristic
              .requiresPerceptualOrAlignmentReview,
        )
        .map((sample) => sample.id),
      samplesWithDuplicateWindowCandidate: samples
        .filter(
          (sample) =>
            sample.duplicateWindowHeuristic
              .possibleDuplicateWindow,
        )
        .map((sample) => sample.id),
      samplesWithStitchDiscontinuityCandidate: samples
        .filter((sample) =>
          sample.stitchBoundaries.some(
            (boundary) =>
              boundary.crossSpeechStitchFeatures
                .anyDiscontinuityCandidate,
          ),
        )
        .map((sample) => sample.id),
    },
    samples,
  };
  await fsp.writeFile(
    outputPath,
    `${JSON.stringify(output, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  return { outputPath, output };
}

function sineWave(samples, sampleRate, start, end, frequency, amplitude) {
  for (let index = start; index < end; index += 1) {
    samples[index] = Math.round(
      Math.sin((2 * Math.PI * frequency * index) / sampleRate) *
        amplitude,
    );
  }
}

function runSelfTest() {
  let assertions = 0;
  const check = (condition, message) => {
    assert.ok(condition, message);
    assertions += 1;
  };
  const sampleRate = 4_000;
  const samples = new Int16Array(sampleRate * 6);
  sineWave(samples, sampleRate, 0, 2_000, 200, 12_000);
  sineWave(samples, sampleRate, 3_200, 5_200, 200, 12_000);
  sineWave(samples, sampleRate, 6_400, 8_400, 320, 12_000);
  samples[100] = 32_767;
  samples[101] = 32_767;
  samples[102] = 32_767;
  samples.set(samples.subarray(0, sampleRate), sampleRate * 4);
  const pcmBuffer = Buffer.alloc(samples.length * 2);
  for (let index = 0; index < samples.length; index += 1) {
    pcmBuffer.writeInt16LE(samples[index], index * 2);
  }
  const silence = analyzeSilence(samples, sampleRate);
  check(silence.eventCount >= 2, "silence events");
  check(silence.ratio > 0.2, "silence ratio");
  check(
    analyzeClipping(samples).possibleClipping,
    "clipping candidate",
  );
  const pitch200 = estimatePitch(
    samples,
    0,
    1_600,
    sampleRate,
  );
  check(
    pitch200.hz !== null &&
      Math.abs(pitch200.hz - 200) < 15,
    "pitch estimate",
  );
  const centroid = spectralCentroid(
    samples,
    0,
    1_600,
    sampleRate,
  );
  check(
    centroid !== null && centroid > 100 && centroid < 500,
    "spectral centroid",
  );
  const duplicates = analyzeDuplicates(
    samples,
    pcmBuffer,
    sampleRate,
  );
  check(
    duplicates.exactDuplicateGroupCount >= 1,
    "exact duplicate detection",
  );
  const boundarySamples = new Int16Array(sampleRate * 2);
  sineWave(
    boundarySamples,
    sampleRate,
    0,
    2_000,
    200,
    10_000,
  );
  sineWave(
    boundarySamples,
    sampleRate,
    3_200,
    boundarySamples.length,
    200,
    10_000,
  );
  const boundary = analyzeStitchBoundaries(
    boundarySamples,
    sampleRate,
    [
      {
        id: "self-test-boundary",
        seconds: 0.8,
        expectedPauseMs: 300,
        pauseType: "paragraph",
      },
    ],
  )[0];
  check(boundary.measuredPause.covered, "pause coverage");
  check(
    Math.abs(
      boundary.measuredPause.contiguousLowEnergyBeforeBoundaryMs -
        300,
    ) <= 40,
    "pause duration",
  );
  check(
    boundary.crossSpeechStitchFeatures.before.pitch.hz !== null &&
      boundary.crossSpeechStitchFeatures.after.pitch.hz !== null,
    "stitch pitch",
  );
  check(
    LIMITATIONS.some((entry) => entry.code === "NO_ASR"),
    "ASR limitation",
  );
  process.stdout.write(
    `${JSON.stringify({
      schemaVersion:
        "tenxpros-phase2c-objective-audio-self-test-v1",
      passed: true,
      assertions,
      networkRequests: 0,
      modelDownloads: 0,
    })}\n`,
  );
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (options.selfTest) {
    runSelfTest();
    return;
  }
  const plan = await readPlan(options.plan);
  const result = await executePlan(plan, options.output);
  process.stdout.write(
    `${JSON.stringify({
      status: "COMPLETED",
      output: result.outputPath,
      samples: result.output.summary.sampleCount,
      stitchBoundaries:
        result.output.summary.suppliedStitchBoundaryCount,
      allSourcesPreserved:
        result.output.summary.allSourcesPreserved,
      externalNetworkRequests: 0,
      modelDownloads: 0,
    })}\n`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `Phase 2C objective analysis failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    process.exitCode = 1;
  });
}

module.exports = {
  ANALYSIS_SAMPLE_RATE,
  LIMITATIONS,
  OUTPUT_SCHEMA,
  PLAN_SCHEMA,
  RECIPE_VERSION,
  THRESHOLDS,
  aggregatePauseCoverage,
  analyzeClipping,
  analyzeDuplicates,
  analyzeEdges,
  analyzeSilence,
  analyzeStitchBoundaries,
  estimatePitch,
  normalizePlan,
  parseEbur128,
  spectralCentroid,
};
