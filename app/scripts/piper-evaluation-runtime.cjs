#!/usr/bin/env node
"use strict";

/**
 * Isolated Piper evaluation runtime.
 *
 * This executable deliberately has no application, Prisma, database, HTTP, or
 * network imports. It consumes a fully materialized evaluation plan, invokes
 * only local audio binaries, and writes blind MP3s plus a private audit result.
 *
 * Expected invocation (inside the dedicated evaluation image):
 *
 *   node /app/scripts/piper-evaluation-runtime.cjs \
 *     --plan /evaluation/private/evaluation-plan.json \
 *     --output-dir /evaluation
 */

const { execFile } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const { promises: fsp } = fs;
const { tmpdir } = require("node:os");
const path = require("node:path");

const RUNTIME_VERSION = "piper-corrected-evaluation-runtime-v1";
const RESULT_VERSION = "piper-corrected-evaluation-results-v1";
const PIPER_BIN = "/opt/piper/piper";
const FFMPEG_BIN = "/usr/bin/ffmpeg";
const FFPROBE_BIN = "/usr/bin/ffprobe";
const LAME_BIN = "/usr/bin/lame";
const MAX_COMMAND_BUFFER = 512 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 15 * 60 * 1000;
const TARGET_LRA = 11;
const LAME_ENCODER_OPTIONS = Object.freeze(["--quiet", "-m", "m", "-b", "64", "--cbr"]);
const BASELINE_LOUDNESS_RANGE = Object.freeze({
  integratedLufsMin: -32,
  integratedLufsMax: -12,
  truePeakMaxDbtp: 1.5,
});
const ACOUSTIC_QUALITY_CHECKS = new Set([
  "INTEGRATED_LOUDNESS_RANGE",
  "TRUE_PEAK_LIMIT",
  "NO_FULL_SCALE_SAMPLES",
  "NO_CLIPPING_PLATEAU",
]);
const BASELINE_NON_BLOCKING_QUALITY_CHECKS = new Set([
  "INTEGRATED_LOUDNESS_RANGE",
  "TRUE_PEAK_LIMIT",
  "NO_FULL_SCALE_SAMPLES",
]);
const SAFE_OUTPUT_DENYLIST = Object.freeze([
  "/",
  "/app",
  "/opt/piper",
  "/var/lib/docker",
  "/var/lib/postgresql",
]);

function usage() {
  return [
    "Usage:",
    "  piper-evaluation-runtime.cjs --plan <plan.json> --output-dir <directory> [--force]",
    "  piper-evaluation-runtime.cjs --self-test",
    "",
    "The generation command must run in the dedicated evaluation container with",
    "--network none and a read-only root filesystem. Blind audio is written to",
    "<output-dir>/listening/audio and private results to",
    "<output-dir>/private/runtime-results.json.",
  ].join("\n");
}

function parseArgs(argv) {
  const parsed = {
    force: false,
    help: false,
    selfTest: false,
    planPath: "",
    outputDir: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--force") {
      parsed.force = true;
    } else if (value === "--help" || value === "-h") {
      parsed.help = true;
    } else if (value === "--self-test") {
      parsed.selfTest = true;
    } else if (value === "--plan") {
      parsed.planPath = argv[index + 1] ?? "";
      index += 1;
    } else if (value.startsWith("--plan=")) {
      parsed.planPath = value.slice("--plan=".length);
    } else if (value === "--output-dir") {
      parsed.outputDir = argv[index + 1] ?? "";
      index += 1;
    } else if (value.startsWith("--output-dir=")) {
      parsed.outputDir = value.slice("--output-dir=".length);
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }

  if (!parsed.help && !parsed.selfTest) {
    if (!parsed.planPath) throw new Error("--plan is required");
    if (!parsed.outputDir) throw new Error("--output-dir is required");
  }
  return parsed;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertFiniteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function assertExactNumber(value, expected, label) {
  assertFiniteNumber(value, label);
  if (Math.abs(value - expected) > 1e-9) {
    throw new Error(`${label} must be ${expected}; received ${value}`);
  }
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function assertSafeVoicePath(filePath, extension, label) {
  if (typeof filePath !== "string" || !filePath) {
    throw new Error(`${label} must be a non-empty path`);
  }
  const resolved = path.resolve(filePath);
  const voiceRoot = `${path.resolve("/opt/piper/voices")}${path.sep}`;
  if (!resolved.startsWith(voiceRoot) || !resolved.endsWith(extension)) {
    throw new Error(`${label} must be a ${extension} file below /opt/piper/voices`);
  }
  return resolved;
}

function validatePlan(plan) {
  assertObject(plan, "plan");
  if (typeof plan.version !== "string" || !plan.version.trim()) {
    throw new Error("plan.version must be a non-empty string");
  }
  if (typeof plan.recipeHash !== "string" || !/^[a-f0-9]{64}$/u.test(plan.recipeHash)) {
    throw new Error("plan.recipeHash must be a lowercase SHA-256 hash");
  }

  assertObject(plan.voice, "plan.voice");
  if (typeof plan.voice.id !== "string" || !plan.voice.id.trim()) {
    throw new Error("plan.voice.id must be a non-empty string");
  }
  const modelPath = assertSafeVoicePath(plan.voice.modelPath, ".onnx", "plan.voice.modelPath");
  const configPath = assertSafeVoicePath(
    plan.voice.configPath,
    ".onnx.json",
    "plan.voice.configPath",
  );
  if (configPath !== `${modelPath}.json`) {
    throw new Error("plan.voice.configPath must be the selected model path plus .json");
  }
  if (
    plan.voice.expectedModelSha256 !== undefined &&
    (typeof plan.voice.expectedModelSha256 !== "string" ||
      !/^[a-f0-9]{64}$/u.test(plan.voice.expectedModelSha256))
  ) {
    throw new Error("plan.voice.expectedModelSha256 must be a lowercase SHA-256 hash");
  }

  assertExactNumber(plan.sampleRate, 22_050, "plan.sampleRate");
  if (
    plan.lengthScale !== undefined &&
    (typeof plan.lengthScale !== "number" ||
      !Number.isFinite(plan.lengthScale) ||
      plan.lengthScale < 0.75 ||
      plan.lengthScale > 1.25)
  ) {
    throw new Error("plan.lengthScale must be from 0.75 to 1.25 when supplied");
  }
  assertObject(plan.loudness, "plan.loudness");
  assertExactNumber(plan.loudness.targetLufs, -19, "plan.loudness.targetLufs");
  assertExactNumber(plan.loudness.truePeakDbtp, -2, "plan.loudness.truePeakDbtp");
  assertExactNumber(
    plan.loudness.maxPositiveGainDb,
    6,
    "plan.loudness.maxPositiveGainDb",
  );
  assertExactNumber(
    plan.loudness.integratedLufsMin,
    -22,
    "plan.loudness.integratedLufsMin",
  );
  assertExactNumber(
    plan.loudness.integratedLufsMax,
    -18,
    "plan.loudness.integratedLufsMax",
  );
  assertExactNumber(
    plan.loudness.truePeakMaxDbtp,
    -1.5,
    "plan.loudness.truePeakMaxDbtp",
  );

  if (!Array.isArray(plan.samples) || plan.samples.length === 0) {
    throw new Error("plan.samples must be a non-empty array");
  }

  if (
    plan.correctedOnly !== undefined &&
    typeof plan.correctedOnly !== "boolean"
  ) {
    throw new Error("plan.correctedOnly must be a boolean when supplied");
  }
  const correctedOnly = plan.correctedOnly === true;
  const conditionalDurationBounded =
    plan.schemaVersion ===
    "tenxpros-phase2c-conditional-piper-plan-v1";
  if (conditionalDurationBounded) {
    assertObject(
      plan.durationLimit,
      "plan.durationLimit",
    );
    if (
      plan.durationLimit.basis !==
        "frozen_corrected_bryce_excerpt_duration" ||
      plan.durationLimit.maximumGeneratedToSourceRatio !==
        2 ||
      plan.durationLimit.enforcementCheck !==
        "CONDITIONAL_DURATION_LIMIT" ||
      plan.durationLimit.enforcedBeforeConditionalApi !==
        true
    ) {
      throw new Error(
        "Conditional plan requires the fixed 2x generated-duration ceiling",
      );
    }
  }
  const pairLabels = new Set();
  const fileNames = new Set();
  const pairPipelines = new Map();
  const normalizedSamples = plan.samples.map((sample, sampleIndex) => {
    const sampleLabel = `plan.samples[${sampleIndex}]`;
    assertObject(sample, sampleLabel);
    for (const field of ["pairId", "label", "fileName", "pipeline", "transcript"]) {
      if (typeof sample[field] !== "string" || !sample[field].trim()) {
        throw new Error(`${sampleLabel}.${field} must be a non-empty string`);
      }
    }
    if (!["baseline", "corrected"].includes(sample.pipeline)) {
      throw new Error(`${sampleLabel}.pipeline must be baseline or corrected`);
    }
    if (correctedOnly && sample.pipeline !== "corrected") {
      throw new Error(`${sampleLabel} must be corrected in corrected-only mode`);
    }
    if (/(?:baseline|semantic|corrected|current)/iu.test(sample.label)) {
      throw new Error(`${sampleLabel}.label reveals the pipeline`);
    }

    const fileName = path.basename(sample.fileName);
    if (
      fileName !== sample.fileName &&
      fileName !== path.basename(sample.fileName.replaceAll("\\", "/"))
    ) {
      throw new Error(`${sampleLabel}.fileName must resolve to one filename`);
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.mp3$/u.test(fileName)) {
      throw new Error(`${sampleLabel}.fileName must be a safe .mp3 filename`);
    }
    if (/(?:baseline|semantic|corrected|current)/iu.test(fileName)) {
      throw new Error(`${sampleLabel}.fileName reveals the pipeline`);
    }
    const pairLabelKey = `${sample.pairId}:${sample.label}`;
    if (pairLabels.has(pairLabelKey)) {
      throw new Error(`Duplicate blind label within pair: ${pairLabelKey}`);
    }
    if (fileNames.has(fileName)) throw new Error(`Duplicate MP3 filename: ${fileName}`);
    pairLabels.add(pairLabelKey);
    fileNames.add(fileName);

    if (!Array.isArray(sample.segments) || sample.segments.length === 0) {
      throw new Error(`${sampleLabel}.segments must be a non-empty array`);
    }
    const segmentIds = new Set();
    const segments = sample.segments.map((segment, segmentIndex) => {
      const segmentLabel = `${sampleLabel}.segments[${segmentIndex}]`;
      assertObject(segment, segmentLabel);
      if (typeof segment.id !== "string" || !segment.id.trim()) {
        throw new Error(`${segmentLabel}.id must be a non-empty string`);
      }
      if (segmentIds.has(segment.id)) {
        throw new Error(`${sampleLabel} has duplicate segment id ${segment.id}`);
      }
      segmentIds.add(segment.id);
      if (typeof segment.text !== "string" || !segment.text.trim()) {
        throw new Error(`${segmentLabel}.text must be non-empty`);
      }
      if (
        !Number.isInteger(segment.pauseAfterMs) ||
        segment.pauseAfterMs < 0 ||
        segment.pauseAfterMs > 5_000
      ) {
        throw new Error(`${segmentLabel}.pauseAfterMs must be an integer from 0 to 5000`);
      }
      const exactFrames = (plan.sampleRate * segment.pauseAfterMs) / 1_000;
      if (!Number.isInteger(exactFrames)) {
        throw new Error(`${segmentLabel}.pauseAfterMs does not map to exact PCM frames`);
      }
      return {
        id: segment.id,
        text: segment.text.trim(),
        pauseAfterMs: segment.pauseAfterMs,
      };
    });

    const lastSegment = segments.at(-1);
    if (lastSegment.pauseAfterMs !== 0) {
      throw new Error(`${sampleLabel} final segment pauseAfterMs must be 0`);
    }
    if (sample.pipeline === "baseline") {
      assertExactNumber(
        sample.sentenceSilenceSeconds,
        0.35,
        `${sampleLabel}.sentenceSilenceSeconds`,
      );
      if (segments.length !== 1 || segments[0].pauseAfterMs !== 0) {
        throw new Error(`${sampleLabel} baseline must contain exactly one zero-pause segment`);
      }
    } else {
      assertExactNumber(
        sample.sentenceSilenceSeconds,
        0,
        `${sampleLabel}.sentenceSilenceSeconds`,
      );
    }
    if (
      conditionalDurationBounded &&
      (typeof sample.maximumDurationSeconds !== "number" ||
        !Number.isFinite(sample.maximumDurationSeconds) ||
        sample.maximumDurationSeconds <= 0)
    ) {
      throw new Error(
        `${sampleLabel}.maximumDurationSeconds must be a positive finite number`,
      );
    }

    const reconstructedTranscript = normalizeWhitespace(
      segments.map((segment) => segment.text).join(" "),
    );
    const transcript = normalizeWhitespace(sample.transcript);
    if (reconstructedTranscript !== transcript) {
      throw new Error(`${sampleLabel} segment reconstruction does not equal transcript`);
    }

    const pipelineSet = pairPipelines.get(sample.pairId) ?? new Set();
    if (pipelineSet.has(sample.pipeline)) {
      throw new Error(`Pair ${sample.pairId} has duplicate ${sample.pipeline} pipeline`);
    }
    pipelineSet.add(sample.pipeline);
    pairPipelines.set(sample.pairId, pipelineSet);

    return {
      pairId: sample.pairId,
      label: sample.label,
      fileName,
      pipeline: sample.pipeline,
      transcript,
      sentenceSilenceSeconds: sample.sentenceSilenceSeconds,
      maximumDurationSeconds: conditionalDurationBounded
        ? sample.maximumDurationSeconds
        : null,
      segments,
    };
  });

  for (const [pairId, pipelines] of pairPipelines) {
    if (
      correctedOnly
        ? pipelines.size !== 1 || !pipelines.has("corrected")
        : !pipelines.has("baseline") || !pipelines.has("corrected")
    ) {
      throw new Error(`Pair ${pairId} must have one baseline and one corrected sample`);
    }
  }

  return {
    version: plan.version,
    recipeHash: plan.recipeHash,
    correctedOnly,
    voice: {
      id: plan.voice.id,
      modelPath,
      configPath,
      expectedModelSha256: plan.voice.expectedModelSha256 ?? null,
    },
    sampleRate: plan.sampleRate,
    lengthScale: plan.lengthScale ?? 1,
    durationLimit: conditionalDurationBounded
      ? { ...plan.durationLimit }
      : null,
    loudness: { ...plan.loudness },
    samples: normalizedSamples,
  };
}

function parseWav(wav, expectedSampleRate, label) {
  if (!Buffer.isBuffer(wav) || wav.length < 44) {
    throw new Error(`${label} is not a valid RIFF WAV`);
  }
  if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`${label} is not a RIFF/WAVE file`);
  }

  let fmt = null;
  let pcm = null;
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const chunkId = wav.toString("ascii", offset, offset + 4);
    const chunkSize = wav.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkSize;
    if (dataEnd > wav.length) throw new Error(`${label} contains a truncated ${chunkId} chunk`);
    if (chunkId === "fmt ") {
      if (chunkSize < 16) throw new Error(`${label} has an invalid fmt chunk`);
      fmt = {
        audioFormat: wav.readUInt16LE(dataStart),
        channels: wav.readUInt16LE(dataStart + 2),
        sampleRate: wav.readUInt32LE(dataStart + 4),
        byteRate: wav.readUInt32LE(dataStart + 8),
        blockAlign: wav.readUInt16LE(dataStart + 12),
        bitsPerSample: wav.readUInt16LE(dataStart + 14),
      };
    } else if (chunkId === "data") {
      pcm = Buffer.from(wav.subarray(dataStart, dataEnd));
    }
    offset = dataEnd + (chunkSize % 2);
  }

  if (!fmt || !pcm) throw new Error(`${label} must contain fmt and data chunks`);
  if (fmt.audioFormat !== 1) throw new Error(`${label} must be integer PCM`);
  if (fmt.channels !== 1) throw new Error(`${label} must be mono`);
  if (fmt.sampleRate !== expectedSampleRate) {
    throw new Error(`${label} sample rate ${fmt.sampleRate} is not ${expectedSampleRate}`);
  }
  if (fmt.bitsPerSample !== 16 || fmt.blockAlign !== 2) {
    throw new Error(`${label} must be signed 16-bit mono PCM`);
  }
  if (fmt.byteRate !== expectedSampleRate * 2) {
    throw new Error(`${label} has an invalid PCM byte rate`);
  }
  if (pcm.length === 0 || pcm.length % fmt.blockAlign !== 0) {
    throw new Error(`${label} contains empty or misaligned PCM data`);
  }

  return {
    ...fmt,
    pcm,
    frameCount: pcm.length / fmt.blockAlign,
    wavBytes: wav.length,
    wavSha256: sha256(wav),
  };
}

function buildCanonicalWav(pcm, sampleRate) {
  if (!Buffer.isBuffer(pcm) || pcm.length === 0 || pcm.length % 2 !== 0) {
    throw new Error("PCM payload must be a non-empty, frame-aligned Buffer");
  }
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(36 + pcm.length, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(pcm.length, 40);
  pcm.copy(wav, 44);
  return wav;
}

function countTrailingExactZeroFrames(pcm) {
  let frames = 0;
  for (let offset = pcm.length - 2; offset >= 0; offset -= 2) {
    if (pcm.readInt16LE(offset) !== 0) break;
    frames += 1;
  }
  return frames;
}

function pcmStats(pcm) {
  let maxAbsoluteSample = 0;
  let fullScaleSampleCount = 0;
  let consecutiveFullScaleSamples = 0;
  let maxConsecutiveFullScaleSamples = 0;
  let zeroFrameCount = 0;
  let sumSquares = 0;
  for (let offset = 0; offset < pcm.length; offset += 2) {
    const sample = pcm.readInt16LE(offset);
    const absolute = Math.abs(sample);
    if (absolute > maxAbsoluteSample) maxAbsoluteSample = absolute;
    if (sample === -32_768 || sample === 32_767) {
      fullScaleSampleCount += 1;
      consecutiveFullScaleSamples += 1;
      maxConsecutiveFullScaleSamples = Math.max(
        maxConsecutiveFullScaleSamples,
        consecutiveFullScaleSamples,
      );
    } else {
      consecutiveFullScaleSamples = 0;
    }
    if (sample === 0) zeroFrameCount += 1;
    const scaled = sample / 32_768;
    sumSquares += scaled * scaled;
  }
  const frameCount = pcm.length / 2;
  const rms = Math.sqrt(sumSquares / frameCount);
  return {
    frameCount,
    pcmBytes: pcm.length,
    pcmSha256: sha256(pcm),
    maxAbsoluteSample,
    samplePeakDbfs:
      maxAbsoluteSample === 0 ? null : 20 * Math.log10(maxAbsoluteSample / 32_768),
    rmsDbfs: rms === 0 ? null : 20 * Math.log10(rms),
    fullScaleSampleCount,
    maxConsecutiveFullScaleSamples,
    zeroFrameCount,
  };
}

function isAllZeroPcm(pcm) {
  for (let offset = 0; offset < pcm.length; offset += 1) {
    if (pcm[offset] !== 0) return false;
  }
  return true;
}

function runCommand(binary, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      binary,
      args,
      {
        cwd: options.cwd,
        encoding: null,
        env: {
          LANG: "C",
          LC_ALL: "C",
          PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          TMPDIR: options.tmpDirectory ?? "/tmp",
        },
        maxBuffer: options.maxBuffer ?? MAX_COMMAND_BUFFER,
        timeout: options.timeout ?? COMMAND_TIMEOUT_MS,
      },
      (error, stdout, stderr) => {
        if (error) {
          const details = Buffer.isBuffer(stderr) ? stderr.toString("utf8").trim() : "";
          reject(
            new Error(
              `${path.basename(binary)} failed (${error.code ?? error.signal ?? "unknown"}): ${details}`,
            ),
          );
          return;
        }
        resolve({
          stdout: Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout ?? ""),
          stderr: Buffer.isBuffer(stderr) ? stderr : Buffer.from(stderr ?? ""),
        });
      },
    );
    if (options.stdin !== undefined && child.stdin) {
      child.stdin.on("error", () => {});
      child.stdin.end(options.stdin);
    }
  });
}

async function binaryInfo(binary, versionArgs) {
  const stat = await fsp.stat(binary);
  const versionResult = await runCommand(binary, versionArgs);
  const versionText = `${versionResult.stdout.toString("utf8")}\n${versionResult.stderr.toString(
    "utf8",
  )}`.trim();
  return {
    path: binary,
    sizeBytes: stat.size,
    sha256: await sha256File(binary),
    version: versionText.split(/\r?\n/u).find((line) => line.trim())?.trim() ?? "",
  };
}

function networkIsolationState() {
  const interfaces = fs.existsSync("/sys/class/net")
    ? fs.readdirSync("/sys/class/net").sort()
    : [];
  const nonLoopbackInterfaces = interfaces.filter((name) => name !== "lo");
  let hasDefaultRoute = false;
  if (fs.existsSync("/proc/net/route")) {
    const rows = fs.readFileSync("/proc/net/route", "utf8").trim().split(/\r?\n/u).slice(1);
    hasDefaultRoute = rows.some((row) => {
      const columns = row.trim().split(/\s+/u);
      return columns[1] === "00000000";
    });
  }
  return {
    interfaces,
    nonLoopbackInterfaces,
    hasDefaultRoute,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    isolated:
      nonLoopbackInterfaces.length === 0 &&
      !hasDefaultRoute &&
      !process.env.DATABASE_URL,
  };
}

async function synthesizePiper(
  text,
  modelPath,
  configPath,
  sentenceSilence,
  lengthScale,
  wavPath,
  tempDir,
) {
  await runCommand(
    PIPER_BIN,
    [
      "-q",
      "--model",
      modelPath,
      "--config",
      configPath,
      "--output_file",
      wavPath,
      "--sentence_silence",
      String(sentenceSilence),
      "--length_scale",
      String(lengthScale),
    ],
    {
      stdin: normalizeWhitespace(text),
      tmpDirectory: tempDir,
    },
  );
}

function parseLoudnormJson(stderr, label) {
  const candidates = stderr.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/gu) ?? [];
  if (candidates.length === 0) throw new Error(`${label} did not produce loudnorm JSON`);
  const parsed = JSON.parse(candidates.at(-1));
  const numeric = {};
  for (const key of [
    "input_i",
    "input_tp",
    "input_lra",
    "input_thresh",
    "output_i",
    "output_tp",
    "output_lra",
    "output_thresh",
    "target_offset",
  ]) {
    const value = Number(parsed[key]);
    numeric[key] = Number.isFinite(value) ? value : null;
  }
  if (numeric.input_i === null || numeric.input_tp === null) {
    throw new Error(`${label} has non-finite integrated loudness or true peak`);
  }
  return {
    integratedLufs: numeric.input_i,
    truePeakDbtp: numeric.input_tp,
    loudnessRangeLu: numeric.input_lra,
    thresholdLufs: numeric.input_thresh,
    analysisOutput: {
      integratedLufs: numeric.output_i,
      truePeakDbtp: numeric.output_tp,
      loudnessRangeLu: numeric.output_lra,
      thresholdLufs: numeric.output_thresh,
      targetOffsetDb: numeric.target_offset,
      normalizationType: parsed.normalization_type ?? null,
    },
  };
}

async function analyzeLoudness(filePath, targetLufs, truePeakDbtp) {
  const result = await runCommand(FFMPEG_BIN, [
    "-hide_banner",
    "-nostdin",
    "-i",
    filePath,
    "-af",
    `loudnorm=I=${targetLufs}:TP=${truePeakDbtp}:LRA=${TARGET_LRA}:print_format=json`,
    "-f",
    "null",
    "-",
  ]);
  return parseLoudnormJson(result.stderr.toString("utf8"), path.basename(filePath));
}

function parseEbur128(stderr, label) {
  const integratedMatches = [
    ...stderr.matchAll(/\bI:\s*(-?(?:\d+(?:\.\d+)?|inf))\s+LUFS/giu),
  ];
  const lraMatches = [
    ...stderr.matchAll(/\bLRA:\s*(-?(?:\d+(?:\.\d+)?|inf))\s+LU/giu),
  ];
  const peakMatches = [
    ...stderr.matchAll(/\bPeak:\s*(-?(?:\d+(?:\.\d+)?|inf))\s+dBFS/giu),
  ];
  const integratedLufs = Number(integratedMatches.at(-1)?.[1]);
  const loudnessRangeLu = Number(lraMatches.at(-1)?.[1]);
  const truePeakDbtp = Number(peakMatches.at(-1)?.[1]);
  if (!Number.isFinite(integratedLufs) || !Number.isFinite(truePeakDbtp)) {
    throw new Error(`${label} did not produce finite EBU R128 metrics`);
  }
  return {
    integratedLufs,
    loudnessRangeLu: Number.isFinite(loudnessRangeLu) ? loudnessRangeLu : null,
    truePeakDbtp,
  };
}

async function analyzeEbur128(filePath) {
  const result = await runCommand(FFMPEG_BIN, [
    "-hide_banner",
    "-nostdin",
    "-i",
    filePath,
    "-filter_complex",
    "ebur128=peak=true",
    "-f",
    "null",
    "-",
  ]);
  return parseEbur128(result.stderr.toString("utf8"), path.basename(filePath));
}

async function applyConstantGain(inputPath, outputPath, gainDb, sampleRate) {
  await runCommand(FFMPEG_BIN, [
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "error",
    "-y",
    "-i",
    inputPath,
    "-af",
    `volume=${gainDb.toFixed(6)}dB`,
    "-map_metadata",
    "-1",
    "-ac",
    "1",
    "-ar",
    String(sampleRate),
    "-sample_fmt",
    "s16",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);
}

async function encodeLame(inputPath, outputPath, tempDir) {
  await runCommand(
    LAME_BIN,
    [...LAME_ENCODER_OPTIONS, inputPath, outputPath],
    { tmpDirectory: tempDir },
  );
}

async function probeMp3(filePath) {
  const result = await runCommand(FFPROBE_BIN, [
    "-v",
    "error",
    "-show_entries",
    "stream=index,codec_name,codec_type,sample_fmt,sample_rate,channels,channel_layout,bit_rate,duration:stream_tags=title,comment,description,artist,album,encoder:format=format_name,duration,size,bit_rate:format_tags=title,comment,description,artist,album,encoder",
    "-of",
    "json",
    filePath,
  ]);
  return JSON.parse(result.stdout.toString("utf8"));
}

async function decodedPcmAudit(filePath, sampleRate) {
  const result = await runCommand(
    FFMPEG_BIN,
    [
      "-hide_banner",
      "-nostdin",
      "-loglevel",
      "error",
      "-i",
      filePath,
      "-f",
      "s16le",
      "-acodec",
      "pcm_s16le",
      "-ac",
      "1",
      "-ar",
      String(sampleRate),
      "pipe:1",
    ],
    { maxBuffer: MAX_COMMAND_BUFFER },
  );
  if (result.stdout.length === 0 || result.stdout.length % 2 !== 0) {
    throw new Error(`${path.basename(filePath)} decoded to empty or misaligned PCM`);
  }
  return pcmStats(result.stdout);
}

function createCheck(id, pass, details) {
  return { id, pass: Boolean(pass), details };
}

function blockingCheckFailures(sample, checks) {
  return checks.filter(
    (check) =>
      !check.pass &&
      !(
        sample.pipeline === "baseline" &&
        BASELINE_NON_BLOCKING_QUALITY_CHECKS.has(check.id)
      ),
  );
}

function nonBlockingQualityFindings(sample, checks) {
  return checks.filter(
    (check) =>
      !check.pass &&
      sample.pipeline === "baseline" &&
      BASELINE_NON_BLOCKING_QUALITY_CHECKS.has(check.id),
  );
}

function acousticQualityFailures(checks) {
  return checks.filter(
    (check) => !check.pass && ACOUSTIC_QUALITY_CHECKS.has(check.id),
  );
}

async function auditMp3(filePath, sample, plan) {
  const stat = await fsp.stat(filePath);
  const probe = await probeMp3(filePath);
  const stream = probe.streams?.find((candidate) => candidate.codec_type === "audio");
  if (!stream) throw new Error(`${sample.fileName} has no audio stream`);
  const decoded = await decodedPcmAudit(filePath, plan.sampleRate);
  const ebur128 = await analyzeEbur128(filePath);
  const durationSeconds = Number(stream.duration ?? probe.format?.duration);
  const bitRate = Number(stream.bit_rate ?? probe.format?.bit_rate);
  const metadata = {
    streamTags: probe.streams?.map((candidate) => candidate.tags ?? {}) ?? [],
    formatTags: probe.format?.tags ?? {},
  };
  const revealsPipeline = /(?:baseline|corrected|semantic|current)/iu.test(
    JSON.stringify(metadata),
  );
  const loudnessRange =
    sample.pipeline === "corrected"
      ? {
          integratedLufsMin: plan.loudness.integratedLufsMin,
          integratedLufsMax: plan.loudness.integratedLufsMax,
          truePeakMaxDbtp: plan.loudness.truePeakMaxDbtp,
        }
      : BASELINE_LOUDNESS_RANGE;

  const checks = [
    createCheck("FILE_EXISTS", stat.isFile(), { sizeBytes: stat.size }),
    createCheck("FILE_NON_ZERO", stat.size > 0, { sizeBytes: stat.size }),
    createCheck("MP3_DECODABLE", decoded.frameCount > 0, {
      decodedFrameCount: decoded.frameCount,
    }),
    createCheck("MP3_CODEC", stream.codec_name === "mp3", {
      codecName: stream.codec_name,
    }),
    createCheck("DURATION_VALID", Number.isFinite(durationSeconds) && durationSeconds > 0, {
      durationSeconds,
    }),
    ...(sample.maximumDurationSeconds === null
      ? []
      : [
          createCheck(
            "CONDITIONAL_DURATION_LIMIT",
            Number.isFinite(durationSeconds) &&
              durationSeconds <=
                sample.maximumDurationSeconds + 1e-9,
            {
              maximumDurationSeconds:
                sample.maximumDurationSeconds,
              actualDurationSeconds: durationSeconds,
              maximumGeneratedToSourceRatio:
                plan.durationLimit
                  ?.maximumGeneratedToSourceRatio ?? null,
            },
          ),
        ]),
    createCheck("SAMPLE_RATE", Number(stream.sample_rate) === plan.sampleRate, {
      expected: plan.sampleRate,
      actual: Number(stream.sample_rate),
    }),
    createCheck("MONO_CHANNEL", Number(stream.channels) === 1, {
      expected: 1,
      actual: Number(stream.channels),
      layout: stream.channel_layout ?? null,
    }),
    createCheck("CBR_64K", Number.isFinite(bitRate) && bitRate >= 60_000 && bitRate <= 68_000, {
      expectedNominal: 64_000,
      actual: bitRate,
    }),
    createCheck("BLIND_METADATA", !revealsPipeline, {
      pipelineTermsPresent: revealsPipeline,
      tags: metadata,
    }),
    createCheck(
      "INTEGRATED_LOUDNESS_RANGE",
      ebur128.integratedLufs >= loudnessRange.integratedLufsMin &&
        ebur128.integratedLufs <= loudnessRange.integratedLufsMax,
      {
        expectedMin: loudnessRange.integratedLufsMin,
        expectedMax: loudnessRange.integratedLufsMax,
        actual: ebur128.integratedLufs,
      },
    ),
    createCheck(
      "TRUE_PEAK_LIMIT",
      ebur128.truePeakDbtp <= loudnessRange.truePeakMaxDbtp,
      {
        expectedMax: loudnessRange.truePeakMaxDbtp,
        actual: ebur128.truePeakDbtp,
      },
    ),
    createCheck("NO_FULL_SCALE_SAMPLES", decoded.fullScaleSampleCount === 0, {
      fullScaleSampleCount: decoded.fullScaleSampleCount,
      maxAbsoluteSample: decoded.maxAbsoluteSample,
    }),
    createCheck(
      "NO_CLIPPING_PLATEAU",
      decoded.maxConsecutiveFullScaleSamples < 3,
      {
        maximumAllowedConsecutiveFullScaleSamples: 2,
        actualMaxConsecutiveFullScaleSamples:
          decoded.maxConsecutiveFullScaleSamples,
      },
    ),
  ];

  return {
    fileSizeBytes: stat.size,
    fileSha256: await sha256File(filePath),
    durationSeconds,
    bitRate,
    probe,
    decodedPcm: decoded,
    ebur128,
    appliedAuditRange: loudnessRange,
    checks,
    passed: checks.every((check) => check.pass),
  };
}

function verifySilenceLayout(pcm, layout) {
  return layout.map((unit) => {
    const silence = pcm.subarray(unit.pauseStartFrame * 2, unit.pauseEndFrame * 2);
    const actualFrames = silence.length / 2;
    return {
      segmentId: unit.segmentId,
      pauseAfterMs: unit.pauseAfterMs,
      expectedZeroFrames: unit.pauseFrames,
      actualFrames,
      allZero: actualFrames === unit.pauseFrames && isAllZeroPcm(silence),
      pcmSha256: sha256(silence),
    };
  });
}

async function synthesizeSample(sample, plan, sampleWorkDir) {
  const segmentResults = [];
  const stitchedParts = [];
  const layout = [];
  const synthesisInputTexts = [];
  let baselineSourceWav = null;
  let frameCursor = 0;

  for (let index = 0; index < sample.segments.length; index += 1) {
    const segment = sample.segments[index];
    const wavPath = path.join(sampleWorkDir, `segment-${String(index + 1).padStart(3, "0")}.wav`);
    const sourceText =
      sample.pipeline === "baseline" ? normalizeWhitespace(sample.transcript) : segment.text;
    synthesisInputTexts.push(normalizeWhitespace(sourceText));
    await synthesizePiper(
      sourceText,
      plan.voice.modelPath,
      plan.voice.configPath,
      sample.sentenceSilenceSeconds,
      plan.lengthScale,
      wavPath,
      sampleWorkDir,
    );

    const rawWav = await fsp.readFile(wavPath);
    if (sample.pipeline === "baseline") baselineSourceWav = rawWav;
    const parsed = parseWav(rawWav, plan.sampleRate, `${sample.label}/${segment.id}`);
    const trailingExactZeroFrames = countTrailingExactZeroFrames(parsed.pcm);
    const trimFrames = sample.pipeline === "corrected" ? trailingExactZeroFrames : 0;
    const speechPcm =
      trimFrames > 0 ? parsed.pcm.subarray(0, parsed.pcm.length - trimFrames * 2) : parsed.pcm;
    if (speechPcm.length === 0) {
      throw new Error(`${sample.label}/${segment.id} contains no speech PCM after exact-zero trim`);
    }

    const pauseFrames =
      sample.pipeline === "corrected"
        ? (plan.sampleRate * segment.pauseAfterMs) / 1_000
        : 0;
    const silencePcm = Buffer.alloc(pauseFrames * 2);
    const speechStartFrame = frameCursor;
    const speechEndFrame = speechStartFrame + speechPcm.length / 2;
    const pauseStartFrame = speechEndFrame;
    const pauseEndFrame = pauseStartFrame + pauseFrames;
    frameCursor = pauseEndFrame;
    stitchedParts.push(speechPcm, silencePcm);
    layout.push({
      segmentId: segment.id,
      pauseAfterMs: segment.pauseAfterMs,
      speechStartFrame,
      speechEndFrame,
      pauseStartFrame,
      pauseEndFrame,
      pauseFrames,
    });
    segmentResults.push({
      index,
      id: segment.id,
      textSha256: sha256(segment.text),
      synthesisInputTextSha256: sha256(normalizeWhitespace(sourceText)),
      requestedSentenceSilenceSeconds: sample.sentenceSilenceSeconds,
      requestedPauseAfterMs: segment.pauseAfterMs,
      rawWavBytes: parsed.wavBytes,
      rawWavSha256: parsed.wavSha256,
      rawPcm: pcmStats(parsed.pcm),
      observedTrailingExactZeroFrames: trailingExactZeroFrames,
      trimmedTrailingExactZeroFrames: trimFrames,
      speechPcm: pcmStats(speechPcm),
      insertedPauseFrames: pauseFrames,
      insertedPauseBytes: silencePcm.length,
      insertedPausePcmSha256: sha256(silencePcm),
    });
  }

  const stitchedPcm = Buffer.concat(stitchedParts);
  const silenceAudit = verifySilenceLayout(stitchedPcm, layout);
  if (silenceAudit.some((entry) => !entry.allZero)) {
    throw new Error(`${sample.label} failed exact inserted-silence verification`);
  }
  return {
    segmentResults,
    layout,
    stitchedPcm,
    silenceAudit,
    baselineSourceWav,
    synthesisTranscriptSha256: sha256(
      normalizeWhitespace(synthesisInputTexts.join(" ")),
    ),
  };
}

async function copyFileAtomically(sourcePath, destinationPath, force) {
  await fsp.mkdir(path.dirname(destinationPath), { recursive: true });
  if (!force && fs.existsSync(destinationPath)) {
    throw new Error(`Refusing to overwrite existing evaluation file: ${destinationPath}`);
  }
  const temporaryPath = path.join(
    path.dirname(destinationPath),
    `.${path.basename(destinationPath)}.${process.pid}.tmp`,
  );
  await fsp.copyFile(sourcePath, temporaryPath);
  await fsp.rename(temporaryPath, destinationPath);
}

async function processSample(sample, plan, tempRoot, outputRoot, force) {
  const sampleWorkDir = await fsp.mkdtemp(
    path.join(tempRoot, `${sample.label.replace(/[^A-Za-z0-9_-]/gu, "_")}-`),
  );
  const outputRelativePath = path.posix.join("listening", "audio", sample.fileName);
  const outputPath = path.join(outputRoot, "listening", "audio", sample.fileName);
  if (force) {
    await fsp.rm(outputPath, { force: true });
  } else if (fs.existsSync(outputPath)) {
    throw new Error(`Refusing to overwrite existing evaluation file: ${outputPath}`);
  }

  try {
    const synthesis = await synthesizeSample(sample, plan, sampleWorkDir);
    const plannedSegmentIds = sample.segments.map((segment) => segment.id);
    const synthesizedSegmentIds = synthesis.segmentResults.map((segment) => segment.id);
    const expectedTranscriptSha256 = sha256(sample.transcript);
    const currentIsolation = networkIsolationState();
    const baseChecks = [
      createCheck(
        "TRANSCRIPT_RECONSTRUCTION",
        synthesis.synthesisTranscriptSha256 === expectedTranscriptSha256,
        {
          expectedTranscriptSha256,
          actualSynthesisTranscriptSha256: synthesis.synthesisTranscriptSha256,
        },
      ),
      createCheck(
        "SEGMENT_ORDER",
        JSON.stringify(synthesizedSegmentIds) === JSON.stringify(plannedSegmentIds),
        {
          planned: plannedSegmentIds,
          synthesized: synthesizedSegmentIds,
        },
      ),
      createCheck("NETWORK_ISOLATED", currentIsolation.isolated, currentIsolation),
      createCheck("NO_DATABASE_RUNTIME", !currentIsolation.databaseUrlPresent, {
        databaseUrlPresent: currentIsolation.databaseUrlPresent,
        databaseImports: 0,
        prismaImports: 0,
      }),
      createCheck(
        "OUTPUT_ISOLATED_FROM_PRODUCTION",
        !SAFE_OUTPUT_DENYLIST.some(
          (denied) =>
            outputPath === denied || outputPath.startsWith(`${denied}${path.sep}`),
        ),
        { outputRelativePath },
      ),
    ];
    const preWav =
      sample.pipeline === "baseline"
        ? synthesis.baselineSourceWav
        : buildCanonicalWav(synthesis.stitchedPcm, plan.sampleRate);
    if (!Buffer.isBuffer(preWav)) {
      throw new Error(`${sample.label} baseline source WAV was not retained`);
    }
    const preWavPath = path.join(sampleWorkDir, "stitched-pre.wav");
    await fsp.writeFile(preWavPath, preWav);
    const preParsed = parseWav(preWav, plan.sampleRate, `${sample.label}/stitched-pre`);
    const preLoudness = await analyzeLoudness(
      preWavPath,
      plan.loudness.targetLufs,
      plan.loudness.truePeakDbtp,
    );

    let gainDb = 0;
    let postWavPath = preWavPath;
    let postParsed = preParsed;
    let postSilenceAudit = synthesis.silenceAudit;
    if (sample.pipeline === "corrected") {
      gainDb = Math.min(
        plan.loudness.targetLufs - preLoudness.integratedLufs,
        plan.loudness.truePeakDbtp - preLoudness.truePeakDbtp,
        plan.loudness.maxPositiveGainDb,
      );
      if (!Number.isFinite(gainDb)) throw new Error(`${sample.label} has non-finite gain`);
      gainDb = Math.round(gainDb * 1_000_000) / 1_000_000;
      postWavPath = path.join(sampleWorkDir, "stitched-normalized.wav");
      await applyConstantGain(preWavPath, postWavPath, gainDb, plan.sampleRate);
      const postWav = await fsp.readFile(postWavPath);
      postParsed = parseWav(postWav, plan.sampleRate, `${sample.label}/stitched-normalized`);
      if (postParsed.frameCount !== preParsed.frameCount) {
        throw new Error(`${sample.label} normalization changed the PCM frame count`);
      }
      postSilenceAudit = verifySilenceLayout(postParsed.pcm, synthesis.layout);
      if (postSilenceAudit.some((entry) => !entry.allZero)) {
        throw new Error(`${sample.label} normalization changed an inserted zero-pause region`);
      }
    }

    const postLoudness = await analyzeLoudness(
      postWavPath,
      plan.loudness.targetLufs,
      plan.loudness.truePeakDbtp,
    );
    const temporaryMp3 = path.join(sampleWorkDir, "encoded.mp3");
    await encodeLame(postWavPath, temporaryMp3, sampleWorkDir);
    const mp3Audit = await auditMp3(temporaryMp3, sample, plan);

    const runtimeChecks = [
      ...baseChecks,
      createCheck(
        "SEGMENT_COUNT",
        synthesis.segmentResults.length === sample.segments.length,
        {
          planned: sample.segments.length,
          synthesized: synthesis.segmentResults.length,
        },
      ),
      createCheck(
        "INSERTED_SILENCE_EXACT",
        synthesis.silenceAudit.every((entry) => entry.allZero),
        synthesis.silenceAudit,
      ),
      createCheck(
        "POST_NORMALIZATION_SILENCE_EXACT",
        postSilenceAudit.every((entry) => entry.allZero),
        postSilenceAudit,
      ),
      createCheck(
        "FRAME_COUNT_PRESERVED",
        preParsed.frameCount === postParsed.frameCount,
        {
          before: preParsed.frameCount,
          after: postParsed.frameCount,
        },
      ),
      ...mp3Audit.checks,
    ];
    let passed = blockingCheckFailures(sample, runtimeChecks).length === 0;
    let publishedIntegrity = null;
    if (passed) {
      await copyFileAtomically(temporaryMp3, outputPath, false);
      const publishedStat = await fsp.stat(outputPath);
      const publishedSha256 = await sha256File(outputPath);
      publishedIntegrity = {
        expectedSizeBytes: mp3Audit.fileSizeBytes,
        actualSizeBytes: publishedStat.size,
        expectedSha256: mp3Audit.fileSha256,
        actualSha256: publishedSha256,
      };
      runtimeChecks.push(
        createCheck(
          "PUBLISHED_COPY_INTEGRITY",
          publishedStat.size === mp3Audit.fileSizeBytes &&
            publishedSha256 === mp3Audit.fileSha256,
          publishedIntegrity,
        ),
      );
      passed =
        blockingCheckFailures(sample, runtimeChecks).length === 0;
      if (!passed) {
        await fsp.rm(outputPath, { force: true });
        publishedIntegrity.removedAfterFailedIntegrityCheck = true;
      }
    } else {
      runtimeChecks.push(
        createCheck("FAILED_SAMPLE_NOT_PUBLISHED", !fs.existsSync(outputPath), {
          outputRelativePath,
        }),
      );
    }

    return {
      pairId: sample.pairId,
      label: sample.label,
      pipeline: sample.pipeline,
      fileName: sample.fileName,
      outputFile: outputRelativePath,
      durationSeconds: mp3Audit.durationSeconds,
      sizeBytes: mp3Audit.fileSizeBytes,
      sha256: mp3Audit.fileSha256,
      transcriptSha256: sha256(sample.transcript),
      plannedSegmentIds,
      synthesizedSegmentIds,
      sentenceSilenceSeconds: sample.sentenceSilenceSeconds,
      segments: synthesis.segmentResults,
      layout: synthesis.layout,
      stitchedWav: {
        preNormalization: {
          ...pcmStats(preParsed.pcm),
          wavBytes: preParsed.wavBytes,
          wavSha256: preParsed.wavSha256,
          loudness: preLoudness,
        },
        processing: {
          mode: sample.pipeline === "corrected" ? "constant-gain" : "none",
          targetIntegratedLufs:
            sample.pipeline === "corrected" ? plan.loudness.targetLufs : null,
          targetTruePeakDbtp:
            sample.pipeline === "corrected" ? plan.loudness.truePeakDbtp : null,
          maximumPositiveGainDb:
            sample.pipeline === "corrected" ? plan.loudness.maxPositiveGainDb : null,
          appliedGainDb: gainDb,
        },
        postNormalization: {
          ...pcmStats(postParsed.pcm),
          wavBytes: postParsed.wavBytes,
          wavSha256: postParsed.wavSha256,
          loudness: postLoudness,
        },
        insertedSilenceBeforeNormalization: synthesis.silenceAudit,
        insertedSilenceAfterNormalization: postSilenceAudit,
      },
      mp3: {
        ...mp3Audit,
        encoder: {
          binary: LAME_BIN,
          arguments: [...LAME_ENCODER_OPTIONS, "<input.wav>", "<output.mp3>"],
        },
        publishedIntegrity,
      },
      checks: runtimeChecks,
      nonBlockingQualityFindings: nonBlockingQualityFindings(
        sample,
        runtimeChecks,
      ),
      qualityPassed: acousticQualityFailures(runtimeChecks).length === 0,
      eligibleForBlindReview: passed,
      passed,
      published: passed,
      error: passed ? null : "One or more automated audio checks failed",
    };
  } finally {
    await fsp.rm(sampleWorkDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function prepareOutputRoot(outputDir) {
  const resolved = path.resolve(outputDir);
  if (
    SAFE_OUTPUT_DENYLIST.some(
      (denied) => resolved === denied || resolved.startsWith(`${denied}${path.sep}`),
    )
  ) {
    throw new Error(`Unsafe evaluation output directory: ${resolved}`);
  }
  await fsp.mkdir(resolved, { recursive: true });
  const real = await fsp.realpath(resolved);
  if (
    SAFE_OUTPUT_DENYLIST.some(
      (denied) => real === denied || real.startsWith(`${denied}${path.sep}`),
    )
  ) {
    throw new Error(`Evaluation output resolves into a protected directory: ${real}`);
  }
  return real;
}

async function writeJsonAtomically(filePath, value, force) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  if (!force && fs.existsSync(filePath)) {
    throw new Error(`Refusing to overwrite existing result file: ${filePath}`);
  }
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await fsp.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  await fsp.rename(temporaryPath, filePath);
}

async function loadAndValidateVoice(plan) {
  const [modelStat, configRaw] = await Promise.all([
    fsp.stat(plan.voice.modelPath),
    fsp.readFile(plan.voice.configPath, "utf8"),
  ]);
  if (!modelStat.isFile() || modelStat.size === 0) throw new Error("Piper model is empty");
  const config = JSON.parse(configRaw);
  if (config.audio?.sample_rate !== plan.sampleRate) {
    throw new Error(
      `Voice native sample rate ${config.audio?.sample_rate} does not match ${plan.sampleRate}`,
    );
  }
  if (config.num_speakers !== 1) {
    throw new Error("Evaluation runtime supports only a single-speaker Piper model");
  }
  const modelSha256 = await sha256File(plan.voice.modelPath);
  if (
    plan.voice.expectedModelSha256 &&
    modelSha256 !== plan.voice.expectedModelSha256
  ) {
    throw new Error(
      `Piper model checksum mismatch: expected ${plan.voice.expectedModelSha256}, received ${modelSha256}`,
    );
  }
  return {
    id: plan.voice.id,
    modelPath: plan.voice.modelPath,
    modelSizeBytes: modelStat.size,
    modelSha256,
    expectedModelSha256: plan.voice.expectedModelSha256,
    expectedModelSha256Matched:
      plan.voice.expectedModelSha256 === null ||
      modelSha256 === plan.voice.expectedModelSha256,
    configPath: plan.voice.configPath,
    configSha256: sha256(configRaw),
    nativeSampleRate: config.audio.sample_rate,
    quality: config.audio.quality ?? null,
    inference: config.inference ?? null,
  };
}

async function main(args) {
  const isolation = networkIsolationState();
  if (!isolation.isolated) {
    throw new Error(
      `Evaluation runtime requires --network none and no DATABASE_URL: ${JSON.stringify(
        isolation,
      )}`,
    );
  }

  const outputRoot = await prepareOutputRoot(args.outputDir);
  const resultPath = path.join(outputRoot, "private", "runtime-results.json");
  if (!args.force && fs.existsSync(resultPath)) {
    throw new Error(`Refusing to overwrite existing result file: ${resultPath}`);
  }

  const rawPlan = await fsp.readFile(path.resolve(args.planPath));
  const plan = validatePlan(JSON.parse(rawPlan.toString("utf8")));
  const [voice, piper, ffmpeg, ffprobe, lame] = await Promise.all([
    loadAndValidateVoice(plan),
    binaryInfo(PIPER_BIN, ["--version"]),
    binaryInfo(FFMPEG_BIN, ["-version"]),
    binaryInfo(FFPROBE_BIN, ["-version"]),
    binaryInfo(LAME_BIN, ["--version"]),
  ]);

  const tempRoot = await fsp.mkdtemp(path.join(tmpdir(), "tenxpros-piper-evaluation-"));
  const startedAt = new Date().toISOString();
  const sampleResults = [];
  try {
    for (const sample of plan.samples) {
      try {
        sampleResults.push(
          await processSample(sample, plan, tempRoot, outputRoot, args.force),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sampleResults.push({
          pairId: sample.pairId,
          label: sample.label,
          pipeline: sample.pipeline,
          fileName: sample.fileName,
          outputFile: path.posix.join("listening", "audio", sample.fileName),
          durationSeconds: null,
          sizeBytes: null,
          sha256: null,
          passed: false,
          published: false,
          error: message,
          checks: [
            createCheck("RUNTIME_EXECUTION", false, {
              error: message,
            }),
          ],
        });
      }
    }
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }

  const failed = sampleResults.filter((sample) => !sample.passed);
  const qualityFindingCount = sampleResults.reduce(
    (count, sample) =>
      count + (sample.nonBlockingQualityFindings?.length ?? 0),
    0,
  );
  const qualityPassedCount = sampleResults.filter(
    (sample) => sample.qualityPassed === true,
  ).length;
  const result = {
    version: RESULT_VERSION,
    runtimeVersion: RUNTIME_VERSION,
    startedAt,
    completedAt: new Date().toISOString(),
    plan: {
      version: plan.version,
      recipeHash: plan.recipeHash,
      sha256: sha256(rawPlan),
      sampleCount: plan.samples.length,
      correctedOnly: plan.correctedOnly,
      lengthScale: plan.lengthScale,
    },
    isolation: {
      ...isolation,
      externalApiRequests: 0,
      databaseImports: 0,
      prismaImports: 0,
      childProcessAllowlist: [PIPER_BIN, FFMPEG_BIN, FFPROBE_BIN, LAME_BIN],
      outputRoot,
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      sourceSha256: await sha256File(__filename),
      tools: { piper, ffmpeg, ffprobe, lame },
    },
    voice,
    audioRecipe: {
      sampleRate: plan.sampleRate,
      channels: 1,
      lengthScale: plan.lengthScale,
      intermediateCodec: "pcm_s16le",
      finalCodec: "mp3",
      finalBitRate: 64_000,
      finalBitRateMode: "CBR",
      correctedTrailingSilenceTrim: "contiguous exact-zero PCM frames only",
      correctedPauseInsertion: "exact zero PCM frames",
      correctedLoudnessProcessing: "measured constant gain; no compressor or limiter",
      correctedLoudness: plan.loudness,
      baselineLoudnessObservationRange: BASELINE_LOUDNESS_RANGE,
      baselinePipeline: {
        invocationsPerSample: 1,
        sentenceSilenceSeconds: 0.35,
        textMode: "all whitespace collapsed to one stdin line",
        normalization: "none",
      },
      lameEncodingArguments: [...LAME_ENCODER_OPTIONS, "<input.wav>", "<output.mp3>"],
    },
    summary: {
      samples: sampleResults.length,
      passed: sampleResults.length - failed.length,
      failed: failed.length,
      allPassed: failed.length === 0,
      eligibleForBlindReview: sampleResults.length - failed.length,
      ineligibleForBlindReview: failed.length,
      allEligibleForBlindReview: failed.length === 0,
      qualityPassed: qualityPassedCount,
      qualityFindings: sampleResults.length - qualityPassedCount,
      nonBlockingQualityFindings: qualityFindingCount,
    },
    samples: sampleResults,
  };
  await writeJsonAtomically(resultPath, result, args.force);
  process.stdout.write(`${JSON.stringify({ resultPath, summary: result.summary })}\n`);
  if (failed.length > 0) process.exitCode = 1;
}

function runSelfTest() {
  const sampleRate = 22_050;
  const speechFrames = Buffer.alloc(8);
  speechFrames.writeInt16LE(100, 0);
  speechFrames.writeInt16LE(-200, 2);
  speechFrames.writeInt16LE(300, 4);
  speechFrames.writeInt16LE(-400, 6);
  const trailingZeros = Buffer.alloc(20);
  const wav = buildCanonicalWav(Buffer.concat([speechFrames, trailingZeros]), sampleRate);
  const parsed = parseWav(wav, sampleRate, "self-test");
  if (countTrailingExactZeroFrames(parsed.pcm) !== 10) {
    throw new Error("Self-test trailing-zero counter failed");
  }
  const trimmed = parsed.pcm.subarray(0, parsed.pcm.length - 20);
  if (sha256(trimmed) !== sha256(speechFrames)) {
    throw new Error("Self-test exact-zero trim changed speech PCM");
  }
  const pauseFrames = (sampleRate * 220) / 1_000;
  if (pauseFrames !== 4_851) throw new Error("Self-test pause frame calculation failed");
  const pause = Buffer.alloc(pauseFrames * 2);
  if (!isAllZeroPcm(pause)) throw new Error("Self-test silence is not exact zero PCM");
  const reconstructed = parseWav(
    buildCanonicalWav(Buffer.concat([trimmed, pause]), sampleRate),
    sampleRate,
    "self-test reconstructed",
  );
  if (reconstructed.frameCount !== 4 + pauseFrames) {
    throw new Error("Self-test reconstructed frame count failed");
  }
  const plateauFixture = Buffer.alloc(8);
  plateauFixture.writeInt16LE(32_767, 0);
  plateauFixture.writeInt16LE(32_767, 2);
  plateauFixture.writeInt16LE(32_767, 4);
  plateauFixture.writeInt16LE(1, 6);
  if (
    pcmStats(plateauFixture).maxConsecutiveFullScaleSamples !== 3
  ) {
    throw new Error("Self-test clipping-plateau counter failed");
  }

  const loudnormFixture = [
    "[Parsed_loudnorm_0]",
    "{",
    '  "input_i" : "-23.40",',
    '  "input_tp" : "-5.10",',
    '  "input_lra" : "2.00",',
    '  "input_thresh" : "-33.40",',
    '  "output_i" : "-19.00",',
    '  "output_tp" : "-0.70",',
    '  "output_lra" : "2.00",',
    '  "output_thresh" : "-29.00",',
    '  "normalization_type" : "linear",',
    '  "target_offset" : "0.00"',
    "}",
  ].join("\n");
  const loudness = parseLoudnormJson(loudnormFixture, "self-test");
  if (loudness.integratedLufs !== -23.4 || loudness.truePeakDbtp !== -5.1) {
    throw new Error("Self-test loudnorm parser failed");
  }
  const eburFixture = [
    "Integrated loudness:",
    "  I:         -19.1 LUFS",
    "Loudness range:",
    "  LRA:         2.4 LU",
    "True peak:",
    "  Peak:       -2.1 dBFS",
  ].join("\n");
  const ebur = parseEbur128(eburFixture, "self-test");
  if (
    ebur.integratedLufs !== -19.1 ||
    ebur.loudnessRangeLu !== 2.4 ||
    ebur.truePeakDbtp !== -2.1
  ) {
    throw new Error("Self-test EBU R128 parser failed");
  }

  const recipeHash = "a".repeat(64);
  const modelHash = "b".repeat(64);
  const validatedPlan = validatePlan({
    version: "self-test-plan-v1",
    recipeHash,
    voice: {
      id: "bryce",
      modelPath: "/opt/piper/voices/en_US-bryce-medium.onnx",
      configPath: "/opt/piper/voices/en_US-bryce-medium.onnx.json",
      expectedModelSha256: modelHash,
    },
    sampleRate,
    loudness: {
      targetLufs: -19,
      truePeakDbtp: -2,
      maxPositiveGainDb: 6,
      integratedLufsMin: -22,
      integratedLufsMax: -18,
      truePeakMaxDbtp: -1.5,
    },
    samples: [
      {
        pairId: "pair-1",
        label: "A",
        fileName: "audio/sample-01-A.mp3",
        pipeline: "baseline",
        transcript: "Baseline text.",
        sentenceSilenceSeconds: 0.35,
        segments: [{ id: "flat", text: "Baseline text.", pauseAfterMs: 0 }],
      },
      {
        pairId: "pair-1",
        label: "B",
        fileName: "sample-01-B.mp3",
        pipeline: "corrected",
        transcript: "First sentence. Second sentence.",
        sentenceSilenceSeconds: 0,
        segments: [
          { id: "one", text: "First sentence.", pauseAfterMs: 220 },
          { id: "two", text: "Second sentence.", pauseAfterMs: 0 },
        ],
      },
      {
        pairId: "pair-2",
        label: "A",
        fileName: "sample-02-A.mp3",
        pipeline: "corrected",
        transcript: "Another corrected sample.",
        sentenceSilenceSeconds: 0,
        segments: [{ id: "one", text: "Another corrected sample.", pauseAfterMs: 0 }],
      },
      {
        pairId: "pair-2",
        label: "B",
        fileName: "sample-02-B.mp3",
        pipeline: "baseline",
        transcript: "Another baseline sample.",
        sentenceSilenceSeconds: 0.35,
        segments: [{ id: "flat", text: "Another baseline sample.", pauseAfterMs: 0 }],
      },
    ],
  });
  if (
    validatedPlan.samples.length !== 4 ||
    validatedPlan.voice.expectedModelSha256 !== modelHash ||
    validatedPlan.samples.filter((sample) => sample.pipeline === "corrected").length !== 2
  ) {
    throw new Error("Self-test corrected-plan validation failed");
  }
  const correctedOnlyPlan = validatePlan({
    version: "self-test-corrected-only-plan-v1",
    schemaVersion:
      "tenxpros-phase2c-conditional-piper-plan-v1",
    recipeHash,
    correctedOnly: true,
    durationLimit: {
      basis:
        "frozen_corrected_bryce_excerpt_duration",
      maximumGeneratedToSourceRatio: 2,
      enforcementCheck: "CONDITIONAL_DURATION_LIMIT",
      enforcedBeforeConditionalApi: true,
    },
    voice: {
      id: "linda",
      modelPath: "/opt/piper/voices/en_US-ljspeech-high.onnx",
      configPath: "/opt/piper/voices/en_US-ljspeech-high.onnx.json",
      expectedModelSha256: modelHash,
    },
    sampleRate,
    lengthScale: 0.95,
    loudness: {
      targetLufs: -19,
      truePeakDbtp: -2,
      maxPositiveGainDb: 6,
      integratedLufsMin: -22,
      integratedLufsMax: -18,
      truePeakMaxDbtp: -1.5,
    },
    samples: [
      {
        pairId: "excerpt-1",
        label: "X",
        fileName: "clip-X.mp3",
        pipeline: "corrected",
        transcript: "A corrected-only conditional clip.",
        sentenceSilenceSeconds: 0,
        maximumDurationSeconds: 42,
        segments: [
          {
            id: "one",
            text: "A corrected-only conditional clip.",
            pauseAfterMs: 0,
          },
        ],
      },
    ],
  });
  if (
    correctedOnlyPlan.correctedOnly !== true ||
    correctedOnlyPlan.samples.length !== 1 ||
    correctedOnlyPlan.lengthScale !== 0.95 ||
    correctedOnlyPlan.samples[0].maximumDurationSeconds !==
      42 ||
    correctedOnlyPlan.durationLimit
      .maximumGeneratedToSourceRatio !== 2
  ) {
    throw new Error("Self-test corrected-only validation failed");
  }
  const baselineQualityChecks = [
    createCheck("TRUE_PEAK_LIMIT", false, { actual: 1.6 }),
    createCheck("NO_FULL_SCALE_SAMPLES", false, {
      fullScaleSampleCount: 1,
    }),
    createCheck("NO_CLIPPING_PLATEAU", true, {
      actualMaxConsecutiveFullScaleSamples: 1,
    }),
  ];
  if (
    blockingCheckFailures(
      { pipeline: "baseline" },
      baselineQualityChecks,
    ).length !== 0 ||
    nonBlockingQualityFindings(
      { pipeline: "baseline" },
      baselineQualityChecks,
    ).length !== 2
  ) {
    throw new Error("Self-test baseline quality classification failed");
  }
  if (
    blockingCheckFailures(
      { pipeline: "corrected" },
      baselineQualityChecks,
    ).length !== 2
  ) {
    throw new Error("Self-test corrected quality classification failed");
  }

  process.stdout.write(
    `${JSON.stringify({
      runtimeVersion: RUNTIME_VERSION,
      passed: true,
      assertions: 13,
      sampleRate,
      pause220MsFrames: pauseFrames,
    })}\n`,
  );
}

if (require.main === module) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    if (args.help) {
      process.stdout.write(`${usage()}\n`);
    } else if (args.selfTest) {
      runSelfTest();
    } else {
      main(args).catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
        process.exitCode = 1;
      });
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage()}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  BASELINE_LOUDNESS_RANGE,
  RUNTIME_VERSION,
  analyzeEbur128,
  analyzeLoudness,
  applyConstantGain,
  auditMp3,
  binaryInfo,
  buildCanonicalWav,
  countTrailingExactZeroFrames,
  decodedPcmAudit,
  encodeLame,
  loadAndValidateVoice,
  networkIsolationState,
  normalizeWhitespace,
  parseEbur128,
  parseLoudnormJson,
  parseWav,
  pcmStats,
  probeMp3,
  runCommand,
  sha256File,
  synthesizePiper,
  validatePlan,
  verifySilenceLayout,
};
