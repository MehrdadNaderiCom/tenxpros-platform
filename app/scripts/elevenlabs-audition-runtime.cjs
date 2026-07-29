#!/usr/bin/env node
"use strict";

const { execFile } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const { promises: fsp } = fs;
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const API_ROOT = "https://api.elevenlabs.io";
const SECRET_PATH = "/run/secrets/elevenlabs_tts_key";
const SAMPLE_RATE = 24_000;
const MAX_BUFFER = 512 * 1024 * 1024;
const LOUDNESS = Object.freeze({
  targetLufs: -19,
  truePeakDbtp: -2,
  maxPositiveGainDb: 6,
  integratedLufsMin: -24,
  integratedLufsMax: -18,
  truePeakMaxDbtp: -1.5,
});

function parseArguments(values) {
  const result = {
    plan: "",
    outputDirectory: "",
    resume: false,
    resumeAttempt: 1,
  };
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--plan") {
      result.plan = path.resolve(values[index + 1] || "");
      index += 1;
    } else if (values[index] === "--output-dir") {
      result.outputDirectory = path.resolve(values[index + 1] || "");
      index += 1;
    } else if (values[index] === "--resume") {
      result.resume = true;
    } else if (values[index] === "--resume-attempt") {
      result.resumeAttempt = Number(values[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${values[index]}`);
    }
  }
  if (!result.plan || !result.outputDirectory) {
    throw new Error("--plan and --output-dir are required");
  }
  if (
    !Number.isInteger(result.resumeAttempt) ||
    result.resumeAttempt < 1
  ) {
    throw new Error("--resume-attempt must be a positive integer");
  }
  return result;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  throw new Error(`Unsupported canonical value: ${typeof value}`);
}

async function writeExclusive(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), {
    recursive: true,
    mode: 0o700,
  });
  const handle = await fsp.open(filePath, "wx", 0o600);
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsp.chmod(filePath, 0o600);
}

async function appendLedger(filePath, event, data) {
  const line = `${JSON.stringify({
    schemaVersion: "tenxpros-elevenlabs-paid-ledger-event-v1",
    event,
    occurredAt: new Date().toISOString(),
    data,
  })}\n`;
  const handle = await fsp.open(filePath, "a", 0o600);
  try {
    await handle.write(line);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsp.chmod(filePath, 0o600);
}

async function readSecret() {
  const metadata = await fsp.lstat(SECRET_PATH);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.uid !== process.getuid() ||
    (metadata.mode & 0o777) !== 0o400 ||
    metadata.size <= 0
  ) {
    throw new Error("ElevenLabs secret isolation gate failed");
  }
  return (await fsp.readFile(SECRET_PATH, "utf8")).replace(/[\r\n]+$/u, "");
}

function buildWav(pcm, sampleRate) {
  if (pcm.length === 0 || pcm.length % 2 !== 0) {
    throw new Error("PCM response must contain non-empty aligned s16le frames");
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function lowEnergyEdges(pcm) {
  const windowFrames = Math.round(SAMPLE_RATE * 0.01);
  const windows = [];
  for (
    let startFrame = 0;
    startFrame < pcm.length / 2;
    startFrame += windowFrames
  ) {
    const endFrame = Math.min(
      pcm.length / 2,
      startFrame + windowFrames,
    );
    let sumSquares = 0;
    let peak = 0;
    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const sample = pcm.readInt16LE(frame * 2);
      sumSquares += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    const count = Math.max(1, endFrame - startFrame);
    const rms = Math.sqrt(sumSquares / count);
    const rmsDbfs = rms > 0 ? 20 * Math.log10(rms / 32768) : -Infinity;
    const peakDbfs = peak > 0 ? 20 * Math.log10(peak / 32768) : -Infinity;
    windows.push(rmsDbfs <= -50 && peakDbfs <= -38);
  }
  let leading = 0;
  while (leading < windows.length && windows[leading]) leading += 1;
  let trailing = 0;
  while (
    trailing < windows.length - leading &&
    windows[windows.length - 1 - trailing]
  ) {
    trailing += 1;
  }
  return {
    windowMilliseconds: 10,
    leadingLowEnergyMilliseconds: leading * 10,
    trailingLowEnergyMilliseconds: trailing * 10,
    audibleFrames:
      pcm.length / 2 -
      (leading + trailing) * windowFrames,
  };
}

async function ffmpeg(arguments_, input) {
  return execFileAsync("/usr/bin/ffmpeg", arguments_, {
    input,
    encoding: "buffer",
    maxBuffer: MAX_BUFFER,
    timeout: 10 * 60 * 1000,
  });
}

function loudnorm(stderr) {
  const text = Buffer.isBuffer(stderr)
    ? stderr.toString("utf8")
    : stderr;
  const matches =
    text.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/gu) || [];
  if (!matches.length) throw new Error("loudnorm analysis JSON is missing");
  const parsed = JSON.parse(matches.at(-1));
  const integratedLufs = Number(parsed.input_i);
  const truePeakDbtp = Number(parsed.input_tp);
  if (!Number.isFinite(integratedLufs) || !Number.isFinite(truePeakDbtp)) {
    throw new Error("loudness analysis is non-finite");
  }
  return { integratedLufs, truePeakDbtp };
}

async function processPcm(pcm, workDirectory, destination) {
  const sourceWav = path.join(workDirectory, "source.wav");
  const normalizedWav = path.join(workDirectory, "normalized.wav");
  await writeExclusive(sourceWav, buildWav(pcm, SAMPLE_RATE));
  const analysis = await ffmpeg([
    "-hide_banner",
    "-nostdin",
    "-i",
    sourceWav,
    "-af",
    `loudnorm=I=${LOUDNESS.targetLufs}:TP=${LOUDNESS.truePeakDbtp}:LRA=11:print_format=json`,
    "-f",
    "null",
    "-",
  ]);
  const before = loudnorm(analysis.stderr);
  const gainDb = Math.min(
    LOUDNESS.targetLufs - before.integratedLufs,
    LOUDNESS.truePeakDbtp - 0.2 - before.truePeakDbtp,
    LOUDNESS.maxPositiveGainDb,
  );
  await ffmpeg([
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "error",
    "-y",
    "-i",
    sourceWav,
    "-af",
    `volume=${gainDb.toFixed(6)}dB`,
    "-map_metadata",
    "-1",
    "-ac",
    "1",
    "-ar",
    String(SAMPLE_RATE),
    "-sample_fmt",
    "s16",
    "-c:a",
    "pcm_s16le",
    normalizedWav,
  ]);
  await execFileAsync(
    "/usr/bin/lame",
    ["--quiet", "-m", "m", "-b", "64", "--cbr", normalizedWav, destination],
    {
      maxBuffer: MAX_BUFFER,
      timeout: 10 * 60 * 1000,
    },
  );
  await fsp.chmod(destination, 0o600);
  const probeResult = await execFileAsync(
    "/usr/bin/ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_name,sample_rate,channels,bit_rate,duration:format=duration,size,bit_rate",
      "-of",
      "json",
      destination,
    ],
    { maxBuffer: MAX_BUFFER },
  );
  const probe = JSON.parse(probeResult.stdout);
  const decoded = await ffmpeg([
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "error",
    "-i",
    destination,
    "-f",
    "s16le",
    "-ac",
    "1",
    "-ar",
    String(SAMPLE_RATE),
    "-",
  ]);
  const decodedPcm = decoded.stdout;
  const postAnalysis = await ffmpeg([
    "-hide_banner",
    "-nostdin",
    "-i",
    destination,
    "-filter_complex",
    "ebur128=peak=true",
    "-f",
    "null",
    "-",
  ]);
  const integratedMatches = [
    ...postAnalysis.stderr.toString("utf8").matchAll(
      /\bI:\s*(-?(?:\d+(?:\.\d+)?|inf))\s+LUFS/giu,
    ),
  ];
  const peakMatches = [
    ...postAnalysis.stderr.toString("utf8").matchAll(
      /\bPeak:\s*(-?(?:\d+(?:\.\d+)?|inf))\s+dBFS/giu,
    ),
  ];
  const integratedLufs = Number(integratedMatches.at(-1)?.[1]);
  const truePeakDbtp = Number(peakMatches.at(-1)?.[1]);
  let maxAbsoluteSample = 0;
  let fullScaleSamples = 0;
  for (let offset = 0; offset < decodedPcm.length; offset += 2) {
    const absolute = Math.abs(decodedPcm.readInt16LE(offset));
    maxAbsoluteSample = Math.max(maxAbsoluteSample, absolute);
    if (absolute >= 32767) fullScaleSamples += 1;
  }
  const file = await fsp.readFile(destination);
  const stream = probe.streams?.[0] || {};
  const checks = {
    decodes: decodedPcm.length > 0,
    codec: stream.codec_name === "mp3",
    sampleRate: Number(stream.sample_rate) === SAMPLE_RATE,
    channels: Number(stream.channels) === 1,
    bitRate: Number(stream.bit_rate) === 64_000,
    duration: Number(stream.duration) > 0,
    integratedLoudness:
      integratedLufs >= LOUDNESS.integratedLufsMin &&
      integratedLufs <= LOUDNESS.integratedLufsMax,
    truePeak: truePeakDbtp <= LOUDNESS.truePeakMaxDbtp,
    noClipping: fullScaleSamples === 0,
  };
  if (Object.values(checks).some((pass) => !pass)) {
    throw new Error(
      `Audio processing audit failed: ${JSON.stringify(checks)}`,
    );
  }
  return {
    fileBytes: file.length,
    fileSha256: sha256(file),
    rawPcmBytes: pcm.length,
    rawPcmSha256: sha256(pcm),
    decodedPcmBytes: decodedPcm.length,
    decodedPcmSha256: sha256(decodedPcm),
    durationSeconds: Number(stream.duration),
    integratedLufs,
    truePeakDbtp,
    maxAbsoluteSample,
    fullScaleSamples,
    appliedGainDb: gainDb,
    lowEnergyEdges: lowEnergyEdges(pcm),
    checks,
  };
}

function boundaryTargetMilliseconds(value) {
  if (value === "heading") return 900;
  if (value === "section") return 1_200;
  if (value === "paragraph") return 800;
  if (value === "callout") return 700;
  if (
    value === "list" ||
    value === "tableRow"
  ) {
    return 350;
  }
  return 600;
}

async function runFinalGeneration(
  arguments_,
  plan,
) {
  const { planHash, ...planWithoutHash } =
    plan;
  if (
    plan.schemaVersion !==
      "tenxpros-elevenlabs-final-paid-generation-plan-v1" ||
    sha256(canonical(planWithoutHash)) !==
      planHash ||
    plan.status !== "FROZEN" ||
    plan.provider !== "ElevenLabs" ||
    plan.model !== "eleven_multilingual_v2" ||
    plan.outputFormat !== "pcm_24000" ||
    plan.selectedVoice?.id !==
      "hpp4J3VqNfWAUOO0d1Us" ||
    plan.expectedAssetCount !== 17 ||
    plan.requestCount !==
      plan.requests.length ||
    plan.requestCount !== 33 ||
    plan.submittedCharacters >
      plan.maximumCharacterExposure ||
    plan.maximumCharacterExposure >
      220_000
  ) {
    throw new Error(
      "Immutable final paid generation plan validation failed",
    );
  }
  const exactCharacters = plan.requests.reduce(
    (sum, request) =>
      sum + request.text.length,
    0,
  );
  if (
    exactCharacters !==
      plan.submittedCharacters ||
    plan.requests.some(
      (request) =>
        request.characters !==
          request.text.length ||
        request.textSha256 !==
          sha256(request.text),
    )
  ) {
    throw new Error(
      "Final request text/hash/character validation failed",
    );
  }
  const manifestPath = path.resolve(
    path.dirname(arguments_.plan),
    "final-narration-manifest.json",
  );
  const recipePath = path.resolve(
    path.dirname(arguments_.plan),
    "final-recipe.json",
  );
  const manifest = JSON.parse(
    await fsp.readFile(
      manifestPath,
      "utf8",
    ),
  );
  const recipe = JSON.parse(
    await fsp.readFile(
      recipePath,
      "utf8",
    ),
  );
  const {
    manifestHash,
    ...manifestWithoutHash
  } = manifest;
  const {
    recipeHash,
    recipeVersion,
    releaseId,
    ...recipeWithoutIdentity
  } = recipe;
  if (
    sha256(canonical(manifestWithoutHash)) !==
      manifestHash ||
    manifestHash !==
      plan.narrationManifestHash ||
    sha256(
      canonical(recipeWithoutIdentity),
    ) !== recipeHash ||
    recipeHash !== plan.recipeHash ||
    recipeVersion !==
      plan.recipeVersion ||
    releaseId !== plan.releaseId ||
    manifest.lessonCount !== 17 ||
    manifest.semanticBlockCount !== 954 ||
    manifest.requestChunkCount !== 33 ||
    manifest.invalidSemanticDrift !== 0 ||
    manifest.errorWarnings !== 0
  ) {
    throw new Error(
      "Final narration manifest or recipe drift",
    );
  }
  if (!arguments_.resume) {
    await fsp.mkdir(
      arguments_.outputDirectory,
      {
        recursive: false,
        mode: 0o700,
      },
    );
    await fsp.chmod(
      arguments_.outputDirectory,
      0o700,
    );
    for (const name of [
      "raw-responses",
      "assets",
      "asset-manifests",
      "work",
    ]) {
      await fsp.mkdir(
        path.resolve(
          arguments_.outputDirectory,
          name,
        ),
        {
          recursive: false,
          mode: 0o700,
        },
      );
      await fsp.chmod(
        path.resolve(
          arguments_.outputDirectory,
          name,
        ),
        0o700,
      );
    }
  }
  const ledgerPath = path.resolve(
    arguments_.outputDirectory,
    "paid-generation-ledger.jsonl",
  );
  if (!arguments_.resume) {
    await writeExclusive(ledgerPath, "");
    await writeExclusive(
      path.resolve(
        arguments_.outputDirectory,
        "frozen-input-bindings.json",
      ),
      `${JSON.stringify(
        {
          planHash,
          planFileSha256: sha256(
            await fsp.readFile(
              arguments_.plan,
            ),
          ),
          narrationManifestHash:
            manifestHash,
          narrationManifestFileSha256:
            sha256(
              await fsp.readFile(
                manifestPath,
              ),
            ),
          recipeHash,
          recipeFileSha256: sha256(
            await fsp.readFile(recipePath),
          ),
        },
        null,
        2,
      )}\n`,
    );
  } else if (
    !fs.existsSync(ledgerPath)
  ) {
    throw new Error(
      "Final generation resume ledger is missing",
    );
  }
  const secret = await readSecret();
  const requestResults = [];
  let billedCharacters = 0;
  const continuityByLesson = new Map();
  const generationStartedAt =
    new Date().toISOString();
  for (
    let index = 0;
    index < plan.requests.length;
    index += 1
  ) {
    const request = plan.requests[index];
    const ordinal = index + 1;
    const stem = `${String(
      ordinal,
    ).padStart(2, "0")}-${request.id}`;
    const rawPath = path.resolve(
      arguments_.outputDirectory,
      "raw-responses",
      `${stem}.pcm`,
    );
    const headersPath = path.resolve(
      arguments_.outputDirectory,
      "raw-responses",
      `${stem}.headers.json`,
    );
    const rawExists =
      fs.existsSync(rawPath);
    const headersExist =
      fs.existsSync(headersPath);
    if (rawExists !== headersExist) {
      throw new Error(
        `Incomplete persisted final response ${ordinal}; retry prohibited`,
      );
    }
    let raw;
    let headerRecord;
    if (rawExists) {
      if (!arguments_.resume) {
        throw new Error(
          `Unexpected final response evidence ${ordinal}`,
        );
      }
      raw = await fsp.readFile(rawPath);
      headerRecord = JSON.parse(
        await fsp.readFile(
          headersPath,
          "utf8",
        ),
      );
      if (
        headerRecord.ordinal !==
          ordinal ||
        headerRecord.httpStatus < 200 ||
        headerRecord.httpStatus >= 300 ||
        headerRecord.rawBytes !==
          raw.length ||
        headerRecord.rawSha256 !==
          sha256(raw)
      ) {
        throw new Error(
          `Persisted final response validation failed ${ordinal}`,
        );
      }
      await appendLedger(
        ledgerPath,
        "RECOVERED_FROM_PERSISTED_RAW_NO_PROVIDER_REQUEST",
        {
          ordinal,
          requestId: request.id,
          providerRequestId:
            headerRecord.requestId,
          rawSha256:
            headerRecord.rawSha256,
          automaticRetry: false,
        },
      );
    } else {
      const priorIds = [
        ...(continuityByLesson.get(
          request.lessonSlug,
        ) || []),
      ].slice(-3);
      await appendLedger(
        ledgerPath,
        "FINAL_REQUEST_INTENT",
        {
          ordinal,
          requestId: request.id,
          lessonSlug:
            request.lessonSlug,
          chunkIndex:
            request.chunkIndex,
          characters:
            request.characters,
          cumulativeBilledBefore:
            billedCharacters,
          previousRequestIdCount:
            priorIds.length,
          maximumPlanExposure:
            plan.maximumCharacterExposure,
          automaticRetry: false,
        },
      );
      let response;
      try {
        response = await fetch(
          `${API_ROOT}/v1/text-to-speech/${encodeURIComponent(
            plan.selectedVoice.id,
          )}?output_format=${encodeURIComponent(
            plan.outputFormat,
          )}`,
          {
            method: "POST",
            headers: {
              Accept: "audio/pcm",
              "Content-Type":
                "application/json",
              "xi-api-key": secret,
            },
            body: JSON.stringify({
              text: request.text,
              model_id: plan.model,
              voice_settings:
                plan.voiceSettings,
              seed: plan.seed,
              pronunciation_dictionary_locators:
                plan.pronunciationDictionaryLocators,
              apply_text_normalization:
                "on",
              ...(priorIds.length > 0
                ? {
                    previous_request_ids:
                      priorIds,
                  }
                : {}),
            }),
            redirect: "error",
            signal: AbortSignal.timeout(
              10 * 60 * 1000,
            ),
          },
        );
      } catch (error) {
        await appendLedger(
          ledgerPath,
          "UNCERTAIN_PAID",
          {
            ordinal,
            requestId: request.id,
            reservedCharacters:
              request.characters,
            reason:
              error instanceof Error
                ? error.message
                : String(error),
            automaticRetry: false,
          },
        );
        throw new Error(
          `Ambiguous potentially billed final request ${ordinal}; no retry attempted`,
        );
      }
      raw = Buffer.from(
        await response.arrayBuffer(),
      );
      await writeExclusive(rawPath, raw);
      headerRecord = {
        ordinal,
        requestId:
          response.headers.get(
            "request-id",
          ) ||
          response.headers.get(
            "x-request-id",
          ),
        httpStatus: response.status,
        contentType:
          response.headers.get(
            "content-type",
          ),
        characterCost:
          response.headers.get(
            "character-cost",
          ),
        historyItemId:
          response.headers.get(
            "history-item-id",
          ),
        rawBytes: raw.length,
        rawSha256: sha256(raw),
      };
      await writeExclusive(
        headersPath,
        `${JSON.stringify(
          headerRecord,
          null,
          2,
        )}\n`,
      );
      await appendLedger(
        ledgerPath,
        "FINAL_RAW_RESPONSE_PERSISTED_BEFORE_PARSE",
        {
          ...headerRecord,
          rawRelativePath:
            path.relative(
              arguments_.outputDirectory,
              rawPath,
            ),
        },
      );
      if (!response.ok) {
        throw new Error(
          `ElevenLabs final request ${ordinal} failed HTTP ${response.status}; no retry attempted`,
        );
      }
    }
    const characterCost = Number(
      headerRecord.characterCost,
    );
    if (
      !Number.isFinite(characterCost) ||
      characterCost < 0 ||
      !headerRecord.requestId ||
      raw.length === 0 ||
      raw.length % 2 !== 0
    ) {
      throw new Error(
        `Final request ${ordinal} response metadata or PCM is invalid`,
      );
    }
    billedCharacters += characterCost;
    if (
      billedCharacters >
      plan.maximumCharacterExposure
    ) {
      throw new Error(
        "Final authoritative billed characters exceeded the frozen cap",
      );
    }
    const prior = [
      ...(continuityByLesson.get(
        request.lessonSlug,
      ) || []),
      headerRecord.requestId,
    ].slice(-3);
    continuityByLesson.set(
      request.lessonSlug,
      prior,
    );
    const edges = lowEnergyEdges(raw);
    requestResults.push({
      ordinal,
      ...request,
      providerRequestId:
        headerRecord.requestId,
      characterCost,
      rawRelativePath:
        path.relative(
          arguments_.outputDirectory,
          rawPath,
        ),
      rawBytes: raw.length,
      rawSha256: sha256(raw),
      lowEnergyEdges: edges,
    });
    await appendLedger(
      ledgerPath,
      "FINAL_REQUEST_ACCEPTED",
      {
        ordinal,
        requestId: request.id,
        providerRequestId:
          headerRecord.requestId,
        characterCost,
        cumulativeBilledCharacters:
          billedCharacters,
        rawSha256: sha256(raw),
      },
    );
    process.stdout.write(
      `${JSON.stringify({
        progress: `${ordinal}/${plan.requests.length}`,
        lessonSlug:
          request.lessonSlug,
        chunkIndex:
          request.chunkIndex,
        characterCost,
        cumulativeBilledCharacters:
          billedCharacters,
      })}\n`,
    );
  }
  const assets = [];
  for (const lesson of manifest.lessons) {
    const lessonRequests =
      requestResults
        .filter(
          (request) =>
            request.lessonSlug ===
            lesson.slug,
        )
        .sort(
          (left, right) =>
            left.chunkIndex -
            right.chunkIndex,
        );
    if (
      lessonRequests.length !==
      lesson.chunks.length
    ) {
      throw new Error(
        `${lesson.slug}: final chunk coverage failed`,
      );
    }
    const pcmParts = [];
    const boundaries = [];
    for (
      let index = 0;
      index < lessonRequests.length;
      index += 1
    ) {
      const request =
        lessonRequests[index];
      const pcm = await fsp.readFile(
        path.resolve(
          arguments_.outputDirectory,
          request.rawRelativePath,
        ),
      );
      if (index > 0) {
        const previous =
          lessonRequests[index - 1];
        const target =
          boundaryTargetMilliseconds(
            request.boundaryClassBefore,
          );
        const measured =
          previous.lowEnergyEdges
            .trailingLowEnergyMilliseconds +
          request.lowEnergyEdges
            .leadingLowEnergyMilliseconds;
        const inserted = Math.max(
          0,
          target - measured,
        );
        const silence = Buffer.alloc(
          Math.round(
            (SAMPLE_RATE *
              inserted *
              2) /
              1_000,
          ),
        );
        pcmParts.push(silence);
        boundaries.push({
          chunkIndex: index,
          targetMilliseconds: target,
          measuredMilliseconds:
            measured,
          insertedMilliseconds:
            inserted,
          effectiveMilliseconds:
            measured + inserted,
        });
      }
      pcmParts.push(pcm);
    }
    const combinedPcm =
      Buffer.concat(pcmParts);
    const workDirectory = path.resolve(
      arguments_.outputDirectory,
      "work",
      lesson.slug,
    );
    await fsp.mkdir(workDirectory, {
      recursive: false,
      mode: 0o700,
    });
    const destination = path.resolve(
      arguments_.outputDirectory,
      "assets",
      `${lesson.slug}.mp3`,
    );
    const audit = await processPcm(
      combinedPcm,
      workDirectory,
      destination,
    );
    const requestByBlock =
      new Map();
    for (const request of lessonRequests) {
      for (const sequence of request.blockSequences) {
        requestByBlock.set(
          sequence,
          request,
        );
      }
    }
    const chunkRecords =
      lesson.blocks.map((block) => {
        const request =
          requestByBlock.get(
            block.sequence,
          );
        if (!request) {
          throw new Error(
            `${lesson.slug}: block ${block.sequence} missing request binding`,
          );
        }
        const boundary =
          boundaries.find(
            (item) =>
              item.chunkIndex ===
                request.chunkIndex &&
              block.sequence ===
                request.firstBlockSequence,
          );
        return {
          blockIndex:
            block.sequence,
          semanticBlockId:
            block.semanticBlockId,
          blockType: block.blockType,
          sourceHash: block.sourceHash,
          spokenHash: block.spokenHash,
          generationStatus: "SUCCESS",
          pcmChecksum:
            request.rawSha256,
          measuredLeadingSilenceMs:
            block.sequence ===
            request.firstBlockSequence
              ? request.lowEnergyEdges
                  .leadingLowEnergyMilliseconds
              : null,
          measuredTrailingSilenceMs:
            block.sequence ===
            request.lastBlockSequence
              ? request.lowEnergyEdges
                  .trailingLowEnergyMilliseconds
              : null,
          insertedSilenceMs:
            boundary?.insertedMilliseconds ??
            0,
          effectiveBoundaryPauseMs:
            boundary?.effectiveMilliseconds ??
            null,
          retryCount: 0,
          resumed:
            arguments_.resume,
        };
      });
    const assetCore = {
      schemaVersion:
        "tenxpros-elevenlabs-final-asset-v1",
      releaseId: plan.releaseId,
      planHash,
      recipeVersion:
        plan.recipeVersion,
      recipeHash: plan.recipeHash,
      voiceId:
        plan.selectedVoice.id,
      lessonId: lesson.lessonId,
      lessonSlug: lesson.slug,
      lessonOrder: lesson.order,
      contentHash:
        lesson.canonicalSanitizedHtmlHash,
      spokenScriptHash:
        lesson.spokenScriptHash,
      mimeType: "audio/mpeg",
      durationSeconds:
        audit.durationSeconds,
      sampleRate: SAMPLE_RATE,
      channels: 1,
      bitrateKbps: 64,
      sizeBytes: audit.fileBytes,
      checksumSha256:
        audit.fileSha256,
      integratedLufs:
        audit.integratedLufs,
      truePeakDbtp:
        audit.truePeakDbtp,
      generationMetadata: {
        provider: "ElevenLabs",
        model: plan.model,
        voiceId:
          plan.selectedVoice.id,
        voiceName:
          plan.selectedVoice.name,
        voiceSettings:
          plan.voiceSettings,
        seed: plan.seed,
        pronunciationDictionaryLocators:
          plan.pronunciationDictionaryLocators,
        continuityStrategy:
          plan.continuityStrategy,
        audioProcessingVersion:
          "elevenlabs-constant-gain-v1-0.2db-mp3-headroom-ebu-conservative",
        chunkBoundaryPolicy:
          "measured-minimum-v1",
        providerRequests:
          lessonRequests.map(
            (request) => ({
              requestId:
                request.providerRequestId,
              chunkIndex:
                request.chunkIndex,
              textSha256:
                request.textSha256,
              characterCost:
                request.characterCost,
              rawPcmSha256:
                request.rawSha256,
            }),
          ),
        boundaries,
      },
      chunkRecords,
      audit,
      checks: {
        exactBlockCount:
          chunkRecords.length ===
          lesson.blocks.length,
        allBlocksSuccessful:
          chunkRecords.every(
            (record) =>
              record.generationStatus ===
              "SUCCESS",
          ),
        noRetries:
          chunkRecords.every(
            (record) =>
              record.retryCount === 0,
          ),
        audioChecksPass:
          Object.values(
            audit.checks,
          ).every(Boolean),
      },
    };
    const passed =
      Object.values(
        assetCore.checks,
      ).every(Boolean);
    const assetManifest = {
      ...assetCore,
      passed,
      manifestHash: sha256(
        canonical(assetCore),
      ),
    };
    if (!passed) {
      throw new Error(
        `${lesson.slug}: final asset audit failed`,
      );
    }
    await writeExclusive(
      path.resolve(
        arguments_.outputDirectory,
        "asset-manifests",
        `${lesson.slug}.json`,
      ),
      `${JSON.stringify(
        assetManifest,
        null,
        2,
      )}\n`,
    );
    assets.push(assetManifest);
  }
  const releaseChecksumSha256 =
    sha256(
      canonical(
        assets.map((asset) => ({
          lessonSlug:
            asset.lessonSlug,
          lessonOrder:
            asset.lessonOrder,
          checksumSha256:
            asset.checksumSha256,
          sizeBytes: asset.sizeBytes,
        })),
      ),
    );
  const auditCore = {
    schemaVersion:
      "tenxpros-elevenlabs-final-release-audit-v1",
    releaseId: plan.releaseId,
    planHash,
    recipeHash: plan.recipeHash,
    narrationManifestHash:
      plan.narrationManifestHash,
    assetCount: assets.length,
    semanticBlockCount:
      assets.reduce(
        (sum, asset) =>
          sum +
          asset.chunkRecords.length,
        0,
      ),
    providerRequestCount:
      requestResults.length,
    submittedCharacters:
      plan.submittedCharacters,
    authoritativeBilledCharacters:
      billedCharacters,
    uncertainCharacters: 0,
    automaticRetries: 0,
    orphanAssets: 0,
    unresolvedChunks: 0,
    checks: {
      exactly17Assets:
        assets.length === 17,
      exactly954Blocks:
        assets.reduce(
          (sum, asset) =>
            sum +
            asset.chunkRecords.length,
          0,
        ) === 954,
      allExpectedSlugs:
        assets.every(
          (asset, index) =>
            asset.lessonSlug ===
            manifest.lessons[index]
              .slug,
        ),
      allAssetAuditsPass:
        assets.every(
          (asset) => asset.passed,
        ),
      zeroRetries: true,
      zeroUncertainCharacters: true,
      zeroOrphans: true,
      zeroUnresolvedChunks: true,
    },
    releaseChecksumSha256,
  };
  const auditManifestHash = sha256(
    canonical(auditCore),
  );
  const passed = Object.values(
    auditCore.checks,
  ).every(Boolean);
  const generationCompletedAt =
    new Date().toISOString();
  const releaseCore = {
    schemaVersion:
      "tenxpros-elevenlabs-final-generation-result-v1",
    releaseId: plan.releaseId,
    planHash,
    recipeVersion:
      plan.recipeVersion,
    recipeHash: plan.recipeHash,
    sourceContentManifestHash:
      plan.sourceContentManifestHash,
    narrationManifestHash:
      plan.narrationManifestHash,
    generationStartedAt,
    generationCompletedAt,
    assetCount: assets.length,
    generatedAssetCount:
      assets.length,
    requestCount:
      requestResults.length,
    submittedCharacters:
      plan.submittedCharacters,
    authoritativeBilledCharacters:
      billedCharacters,
    uncertainCharacters: 0,
    automaticRetries: 0,
    assetChecksums:
      assets.map((asset) => ({
        lessonSlug:
          asset.lessonSlug,
        lessonOrder:
          asset.lessonOrder,
        checksumSha256:
          asset.checksumSha256,
        sizeBytes: asset.sizeBytes,
      })),
    releaseChecksumSha256,
    auditManifestHash,
    passed,
  };
  const releaseResult = {
    ...releaseCore,
    resultHash: sha256(
      canonical(releaseCore),
    ),
  };
  await writeExclusive(
    path.resolve(
      arguments_.outputDirectory,
      "release-audit.json",
    ),
    `${JSON.stringify(
      {
        ...auditCore,
        auditManifestHash,
        passed,
      },
      null,
      2,
    )}\n`,
  );
  await writeExclusive(
    path.resolve(
      arguments_.outputDirectory,
      "release-manifest.json",
    ),
    `${JSON.stringify(
      releaseResult,
      null,
      2,
    )}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      completed: true,
      releaseId: plan.releaseId,
      resultHash:
        releaseResult.resultHash,
      assetCount: assets.length,
      requestCount:
        requestResults.length,
      submittedCharacters:
        plan.submittedCharacters,
      authoritativeBilledCharacters:
        billedCharacters,
      uncertainCharacters: 0,
      automaticRetries: 0,
      passed,
    })}\n`,
  );
}

async function main() {
  process.umask(0o077);
  const arguments_ = parseArguments(process.argv.slice(2));
  if (
    fs.existsSync(arguments_.outputDirectory) &&
    !arguments_.resume
  ) {
    throw new Error("Refusing to overwrite an existing audition output directory");
  }
  if (
    !fs.existsSync(arguments_.outputDirectory) &&
    arguments_.resume
  ) {
    throw new Error("Cannot resume a missing audition output directory");
  }
  const plan = JSON.parse(await fsp.readFile(arguments_.plan, "utf8"));
  if (
    plan.schemaVersion ===
    "tenxpros-elevenlabs-final-paid-generation-plan-v1"
  ) {
    await runFinalGeneration(
      arguments_,
      plan,
    );
    return;
  }
  const { manifestHash, ...withoutHash } = plan;
  if (
    plan.schemaVersion !== "tenxpros-elevenlabs-paid-audition-plan-v1" ||
    sha256(canonical(withoutHash)) !== manifestHash ||
    plan.status !== "FROZEN" ||
    plan.provider !== "ElevenLabs" ||
    plan.model !== "eleven_multilingual_v2" ||
    plan.outputFormat !== "pcm_24000" ||
    plan.requestCount !== plan.requests.length ||
    plan.requestCount !== 12 ||
    plan.submittedCharacters > 15_000 ||
    plan.candidates.length !== 3
  ) {
    throw new Error("Immutable paid audition plan validation failed");
  }
  const exactCharacters = plan.requests.reduce(
    (sum, request) => sum + request.text.length,
    0,
  );
  if (
    exactCharacters !== plan.submittedCharacters ||
    plan.requests.some(
      (request) =>
        request.characters !== request.text.length ||
        request.textSha256 !== sha256(request.text),
    )
  ) {
    throw new Error("Audition request text/hash/character validation failed");
  }
  if (!arguments_.resume) {
    await fsp.mkdir(arguments_.outputDirectory, {
      recursive: false,
      mode: 0o700,
    });
    await fsp.chmod(arguments_.outputDirectory, 0o700);
  }
  const ledgerPath = path.join(
    arguments_.outputDirectory,
    "paid-generation-ledger.jsonl",
  );
  if (!arguments_.resume) {
    await writeExclusive(ledgerPath, "");
  } else if (!fs.existsSync(ledgerPath)) {
    throw new Error("Resume ledger is missing");
  }
  const mapping = plan.candidates
    .map((voice) => ({
      ...voice,
      rank: sha256(`${manifestHash}:${voice.voiceId}`),
    }))
    .sort((left, right) => left.rank.localeCompare(right.rank))
    .map((voice, index) => ({
      neutralLabel: `Voice ${String.fromCharCode(65 + index)}`,
      voiceId: voice.voiceId,
      voiceName: voice.name,
    }));
  const mappingPath = path.join(
    arguments_.outputDirectory,
    "private-voice-mapping.json",
  );
  const mappingDocument = {
    schemaVersion: "tenxpros-elevenlabs-private-voice-map-v1",
    planHash: manifestHash,
    mapping,
  };
  if (!arguments_.resume) {
    await writeExclusive(
      mappingPath,
      `${JSON.stringify(mappingDocument, null, 2)}\n`,
    );
  } else {
    const existingMapping = JSON.parse(
      await fsp.readFile(mappingPath, "utf8"),
    );
    if (canonical(existingMapping) !== canonical(mappingDocument)) {
      throw new Error("Resume voice mapping drift");
    }
  }
  const labelById = new Map(
    mapping.map((item) => [item.voiceId, item.neutralLabel]),
  );
  const secret = await readSecret();
  const results = [];
  let billedCharacters = 0;
  for (let index = 0; index < plan.requests.length; index += 1) {
    const request = plan.requests[index];
    const ordinal = index + 1;
    const neutralLabel = labelById.get(request.voiceId);
    if (!neutralLabel) throw new Error("Missing private voice mapping");
    const safeLabel = neutralLabel.toLowerCase().replace(/\s+/gu, "-");
    const baseName =
      request.kind === "GOLDEN_AUDITION"
        ? "golden-audition"
        : `ai-${request.aliasId}`;
    const rawPath = path.join(
      arguments_.outputDirectory,
      "raw-responses",
      `${String(ordinal).padStart(2, "0")}-${safeLabel}-${baseName}.bin`,
    );
    const headersPath = path.join(
      arguments_.outputDirectory,
      "raw-responses",
      `${String(ordinal).padStart(2, "0")}-${safeLabel}-${baseName}.headers.json`,
    );
    const rawExists = fs.existsSync(rawPath);
    const headersExist = fs.existsSync(headersPath);
    if (rawExists !== headersExist) {
      throw new Error(
        `Incomplete persisted response evidence for request ${ordinal}; refusing retry`,
      );
    }
    let raw;
    let headerRecord;
    if (rawExists && headersExist) {
      if (!arguments_.resume) {
        throw new Error(`Unexpected existing response evidence for request ${ordinal}`);
      }
      raw = await fsp.readFile(rawPath);
      headerRecord = JSON.parse(
        await fsp.readFile(headersPath, "utf8"),
      );
      if (
        headerRecord.ordinal !== ordinal ||
        headerRecord.httpStatus < 200 ||
        headerRecord.httpStatus >= 300 ||
        headerRecord.rawBytes !== raw.length ||
        headerRecord.rawSha256 !== sha256(raw)
      ) {
        throw new Error(`Persisted response validation failed for request ${ordinal}`);
      }
      await appendLedger(
        ledgerPath,
        "RECOVERED_FROM_PERSISTED_RAW_NO_PROVIDER_REQUEST",
        {
          ordinal,
          providerRequestId: headerRecord.requestId,
          rawSha256: headerRecord.rawSha256,
          automaticRetry: false,
          providerRequestSentDuringRecovery: false,
        },
      );
    } else {
      await appendLedger(ledgerPath, "REQUEST_INTENT", {
        ordinal,
        requestId: request.id,
        voiceId: request.voiceId,
        kind: request.kind,
        characters: request.characters,
        cumulativeBilledBefore: billedCharacters,
        maximumPlanExposure: plan.maximumCharacterExposure,
      });
      let response;
      try {
        response = await fetch(
        `${API_ROOT}/v1/text-to-speech/${encodeURIComponent(
          request.voiceId,
        )}?output_format=${encodeURIComponent(plan.outputFormat)}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/pcm",
            "Content-Type": "application/json",
            "xi-api-key": secret,
          },
          body: JSON.stringify({
            text: request.text,
            model_id: plan.model,
            voice_settings: plan.voiceSettings,
            seed: plan.seed,
            pronunciation_dictionary_locators:
              plan.pronunciationDictionaryLocators,
            apply_text_normalization: "on",
          }),
          redirect: "error",
          signal: AbortSignal.timeout(10 * 60 * 1000),
        },
        );
      } catch (error) {
        await appendLedger(ledgerPath, "UNCERTAIN_PAID", {
          ordinal,
          requestId: request.id,
          reservedCharacters: request.characters,
          reason:
            error instanceof Error ? error.message : String(error),
          automaticRetry: false,
        });
        throw new Error(
          `Ambiguous potentially billed request ${ordinal}; no retry was attempted`,
        );
      }
      raw = Buffer.from(await response.arrayBuffer());
      await writeExclusive(rawPath, raw);
      headerRecord = {
        ordinal,
        httpStatus: response.status,
        contentType: response.headers.get("content-type"),
        requestId:
          response.headers.get("request-id") ||
          response.headers.get("x-request-id"),
        characterCost: response.headers.get("character-cost"),
        historyItemId: response.headers.get("history-item-id"),
        rawBytes: raw.length,
        rawSha256: sha256(raw),
      };
      await writeExclusive(
        headersPath,
        `${JSON.stringify(headerRecord, null, 2)}\n`,
      );
      await appendLedger(ledgerPath, "RAW_RESPONSE_PERSISTED_BEFORE_PARSE", {
        ...headerRecord,
        rawRelativePath: path.relative(arguments_.outputDirectory, rawPath),
      });
      if (!response.ok) {
        await appendLedger(ledgerPath, "REQUEST_FAILED_NO_RETRY", {
          ordinal,
          httpStatus: response.status,
          rawSha256: headerRecord.rawSha256,
        });
        throw new Error(
          `ElevenLabs request ${ordinal} failed with HTTP ${response.status}`,
        );
      }
    }
    const characterCost = Number(headerRecord.characterCost);
    if (
      !Number.isFinite(characterCost) ||
      characterCost < 0 ||
      !headerRecord.requestId
    ) {
      throw new Error(
        `ElevenLabs request ${ordinal} omitted authoritative cost/request metadata`,
      );
    }
    billedCharacters += characterCost;
    if (billedCharacters > plan.maximumCharacterExposure) {
      throw new Error("Authoritative billed characters exceeded the frozen cap");
    }
    const outputDirectory = path.join(
      arguments_.outputDirectory,
      arguments_.resume
        ? `listening-resumed-${arguments_.resumeAttempt}`
        : "listening",
      safeLabel,
    );
    await fsp.mkdir(outputDirectory, {
      recursive: true,
      mode: 0o700,
    });
    const mp3Path = path.join(outputDirectory, `${baseName}.mp3`);
    const workDirectory = path.join(
      arguments_.outputDirectory,
      arguments_.resume
        ? `work-resumed-${arguments_.resumeAttempt}`
        : "work",
      `${String(ordinal).padStart(2, "0")}`,
    );
    await fsp.mkdir(workDirectory, {
      recursive: true,
      mode: 0o700,
    });
    const audit = await processPcm(raw, workDirectory, mp3Path);
    results.push({
      ordinal,
      planRequestId: request.id,
      providerRequestId: headerRecord.requestId,
      kind: request.kind,
      neutralLabel,
      privateVoiceId: request.voiceId,
      aliasId: request.aliasId || null,
      aliasSpoken: request.aliasSpoken || null,
      transcript: request.text,
      transcriptSha256: request.textSha256,
      submittedCharacters: request.characters,
      characterCost,
      outputRelativePath: path.relative(
        arguments_.outputDirectory,
        mp3Path,
      ),
      generatedAudioChecksum: audit.fileSha256,
      audit,
    });
    await appendLedger(ledgerPath, "REQUEST_ACCEPTED", {
      ordinal,
      providerRequestId: headerRecord.requestId,
      characterCost,
      cumulativeBilledCharacters: billedCharacters,
      outputRelativePath: path.relative(arguments_.outputDirectory, mp3Path),
      generatedAudioChecksum: audit.fileSha256,
    });
    process.stdout.write(
      `${JSON.stringify({
        progress: `${ordinal}/${plan.requests.length}`,
        kind: request.kind,
        neutralLabel,
        characterCost,
        cumulativeBilledCharacters: billedCharacters,
      })}\n`,
    );
  }
  const resultWithoutHash = {
    schemaVersion: "tenxpros-elevenlabs-audition-result-v1",
    planHash: manifestHash,
    provider: "ElevenLabs",
    model: plan.model,
    outputFormat: plan.outputFormat,
    audioProcessingVersion:
      "elevenlabs-constant-gain-v1-0.2db-mp3-headroom-ebu-conservative",
    voiceSettings: plan.voiceSettings,
    seed: plan.seed,
    requestCount: results.length,
    submittedCharacters: plan.submittedCharacters,
    authoritativeBilledCharacters: billedCharacters,
    uncertainCharacters: 0,
    ambiguousRequests: 0,
    automaticRetries: 0,
    fullLessonGenerations: 0,
    productionMutations: 0,
    results,
  };
  const result = {
    ...resultWithoutHash,
    resultHash: sha256(canonical(resultWithoutHash)),
  };
  await writeExclusive(
    path.join(arguments_.outputDirectory, "audition-result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      completed: true,
      resultHash: result.resultHash,
      requestCount: results.length,
      submittedCharacters: plan.submittedCharacters,
      authoritativeBilledCharacters: billedCharacters,
      uncertainCharacters: 0,
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
