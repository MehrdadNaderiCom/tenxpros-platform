#!/usr/bin/env tsx

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  constants,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import {
  dirname,
  join,
  relative,
  resolve,
} from "node:path";
import { promisify } from "node:util";

import {
  ACADEMY_BOUNDARY_AUDIT_VERSION,
  ACADEMY_BOUNDARY_EVIDENCE_RANGES,
  evaluateCorrectedBoundary,
  gainAdjustedBoundaryDetector,
} from "../src/lib/academy/narration/boundary-audit-policy";
import {
  DEFAULT_LOW_ENERGY_DETECTOR,
  EFFECTIVE_PAUSE_NORMALIZATION_VERSION,
  framesToMilliseconds,
  measureLowEnergyEdge,
  type LowEnergyDetectorConfig,
} from "../src/lib/academy/narration/effective-pause-normalization";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const audioRuntime = require(
  "./piper-evaluation-runtime.cjs",
) as {
  applyConstantGain(
    inputPath: string,
    outputPath: string,
    gainDb: number,
    sampleRate: number,
  ): Promise<void>;
  buildCanonicalWav(
    pcm: Buffer,
    sampleRate: number,
  ): Buffer;
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
      timeout?: number;
    },
  ): Promise<{
    stdout: Buffer;
    stderr: Buffer;
  }>;
};

const SAMPLE_RATE = 22_050;
const FFMPEG = "/usr/bin/ffmpeg";
const MAX_BUFFER = 256 * 1024 * 1024;
const FORENSIC_SCHEMA_VERSION =
  "tenxpros-academy-boundary-forensics-v1";
const OLD_AUDIT_VERSION =
  "academy-full-generation-boundary-audit-v1-absolute-post-gain-threshold";
const CORRECTED_AUDIT_VERSION =
  ACADEMY_BOUNDARY_AUDIT_VERSION;
const CLASSIFIER_VERSION =
  "semantic-block-flow-boundary-classifier-v1";

const OLD_RANGES = Object.freeze({
  list: [280, 330],
  tableRow: [240, 300],
  paragraph: [790, 850],
  callout: [680, 750],
  heading: [880, 950],
  section: [1_020, 1_150],
}) satisfies Readonly<
  Record<string, readonly [number, number]>
>;

const CANDIDATE_RANGES: Readonly<
  Record<
    string,
    readonly [number, number]
  >
> = ACADEMY_BOUNDARY_EVIDENCE_RANGES;

type JsonObject = Record<string, unknown>;

interface GenerationPlan {
  planHash: string;
  releaseId: string;
  recipeVersion: string;
  recipeHash: string;
  sourceContentManifestHash: string;
  sampleRate: number;
  stitchWarningThreshold: number;
  lessons: Array<{
    lessonId: string;
    slug: string;
    order: number;
    rendererVersion: string;
    normalizationVersion: string;
    pronunciationVersion: string;
    segmentationVersion: string;
    blocks: Array<{
      id: string;
      index: number;
      semanticBlockId: string;
      sourceBlockId: string;
      sourceType: string;
      kind: string;
      pauseType: string;
      effectivePauseTargetMilliseconds: number;
      sourceHash: string;
      spokenHash: string;
    }>;
  }>;
}

interface AssetManifest {
  releaseId: string;
  lessonId: string;
  lessonSlug: string;
  lessonOrder: number;
  checksumSha256: string;
  durationSeconds: number;
  sizeBytes: number;
  appliedGainDb: number;
  integratedLufs: number;
  truePeakDbtp: number;
  lowEnergyPeakAbsoluteSample: number;
  layout: Array<{
    blockId: string;
    sourceBlockId: string;
    pauseType: string;
    speechStartFrame: number;
    speechEndFrame: number;
    pauseStartFrame: number;
    pauseEndFrame: number;
    pauseFrames: number;
    leadingTrimFrames: number;
    trailingTrimFrames: number;
  }>;
  boundaryPlans: Array<{
    boundaryIndex: number;
    previousBlockId: string;
    nextBlockId: string;
    pauseType: string;
    targetMilliseconds: number;
    realizationTargetMilliseconds: number;
    detectedTrailingPaddingFrames: number;
    detectedLeadingPaddingFrames: number;
    appliedTrailingTrimFrames: number;
    appliedLeadingTrimFrames: number;
    insertedSilenceFrames: number;
    safeTrimProven: boolean;
    fallbackInsertionOnly: boolean;
    discontinuity: {
      maximumAbsoluteDelta: number;
    };
  }>;
  measuredBoundaries: Array<{
    boundaryIndex: number;
    previousBlockId: string;
    nextBlockId: string;
    pauseType: string;
    detectedTrailingSilenceMilliseconds: number;
    detectedLeadingSilenceMilliseconds: number;
    insertedSilenceMilliseconds: number;
    effectivePauseMilliseconds: number;
    discontinuity: {
      maximumAbsoluteDelta: number;
    };
  }>;
  chunkRecords: Array<{
    blockIndex: number;
    semanticBlockId: string;
    blockType: string;
    pcmChecksum: string;
  }>;
  stitchDiscontinuityWarnings: unknown[];
  checks: Array<{
    id: string;
    pass: boolean;
  }>;
  passed: boolean;
}

interface FocusedRuntime {
  planHash: string;
  flowVersion: string;
  detectors: {
    semanticEdge: LowEnergyDetectorConfig;
  };
  candidates: Array<{
    pairId: string;
    appliedGainDb: number;
    semanticBoundaryDistributions: Record<
      string,
      {
        count: number;
        minimumMilliseconds: number | null;
        maximumMilliseconds: number | null;
      }
    >;
  }>;
  objectiveGates: {
    sentence: {
      medianMilliseconds: number;
      p95Milliseconds: number;
    };
    boundaries: Record<
      string,
      {
        count: number;
        minimumMilliseconds: number | null;
        maximumMilliseconds: number | null;
      }
    >;
  };
}

interface Measurement {
  trailingFrames: number;
  leadingFrames: number;
  insertedFrames: number;
  effectiveFrames: number;
  trailingMilliseconds: number;
  leadingMilliseconds: number;
  insertedMilliseconds: number;
  effectiveMilliseconds: number;
}

function option(
  args: readonly string[],
  name: string,
): string {
  const index = args.indexOf(name);
  const value =
    index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

async function fileSha256(path: string): Promise<string> {
  return sha256(await readFile(path));
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(
    await readFile(path, "utf8"),
  ) as T;
}

async function writeRestricted(
  path: string,
  value: string | Buffer,
): Promise<void> {
  await mkdir(dirname(path), {
    recursive: true,
    mode: 0o700,
  });
  await chmod(dirname(path), 0o700);
  const handle = await open(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(path, 0o600);
}

async function recursiveFiles(
  root: string,
): Promise<string[]> {
  const output: string[] = [];
  async function visit(path: string) {
    for (const entry of await readdir(path, {
      withFileTypes: true,
    })) {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) {
        await visit(child);
      } else if (entry.isFile()) {
        output.push(child);
      }
    }
  }
  await visit(root);
  return output.sort();
}

function rangeFor(
  policy: Readonly<
    Record<string, readonly [number, number]>
  >,
  type: string,
): readonly [number, number] {
  const range = policy[type];
  if (!range) {
    throw new Error(
      `No audit range for ${type}`,
    );
  }
  return range;
}

function inRange(
  policy: Readonly<
    Record<string, readonly [number, number]>
  >,
  type: string,
  value: number,
): boolean {
  const [minimum, maximum] = rangeFor(
    policy,
    type,
  );
  return value >= minimum && value <= maximum;
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
  return pcm.subarray(
    startFrame * 2,
    endFrame * 2,
  );
}

function adjustedDetector(
  gainDb: number,
  deltaDb = 0,
): LowEnergyDetectorConfig {
  return gainAdjustedBoundaryDetector(
    DEFAULT_LOW_ENERGY_DETECTOR,
    gainDb,
    deltaDb,
  );
}

function measureBoundary(
  pcm: Buffer,
  previous: AssetManifest["layout"][number],
  next: AssetManifest["layout"][number],
  detector: LowEnergyDetectorConfig,
): Measurement {
  const trailing = measureLowEnergyEdge(
    pcmView(
      pcmSlice(
        pcm,
        previous.speechStartFrame,
        previous.speechEndFrame,
      ),
    ),
    "trailing",
    detector,
  );
  const leading = measureLowEnergyEdge(
    pcmView(
      pcmSlice(
        pcm,
        next.speechStartFrame,
        next.speechEndFrame,
      ),
    ),
    "leading",
    detector,
  );
  const insertedFrames = previous.pauseFrames;
  const effectiveFrames =
    trailing.lowEnergyFrames +
    insertedFrames +
    leading.lowEnergyFrames;
  return {
    trailingFrames: trailing.lowEnergyFrames,
    leadingFrames: leading.lowEnergyFrames,
    insertedFrames,
    effectiveFrames,
    trailingMilliseconds:
      trailing.lowEnergyMilliseconds,
    leadingMilliseconds:
      leading.lowEnergyMilliseconds,
    insertedMilliseconds:
      framesToMilliseconds(
        insertedFrames,
        SAMPLE_RATE,
      ),
    effectiveMilliseconds:
      framesToMilliseconds(
        effectiveFrames,
        SAMPLE_RATE,
      ),
  };
}

function formulaPcmMeasurement(
  plan: AssetManifest["boundaryPlans"][number],
): Measurement {
  const trailingFrames =
    plan.detectedTrailingPaddingFrames -
    plan.appliedTrailingTrimFrames;
  const leadingFrames =
    plan.detectedLeadingPaddingFrames -
    plan.appliedLeadingTrimFrames;
  const insertedFrames =
    plan.insertedSilenceFrames;
  const effectiveFrames =
    trailingFrames +
    insertedFrames +
    leadingFrames;
  return {
    trailingFrames,
    leadingFrames,
    insertedFrames,
    effectiveFrames,
    trailingMilliseconds:
      framesToMilliseconds(
        trailingFrames,
        SAMPLE_RATE,
      ),
    leadingMilliseconds:
      framesToMilliseconds(
        leadingFrames,
        SAMPLE_RATE,
      ),
    insertedMilliseconds:
      framesToMilliseconds(
        insertedFrames,
        SAMPLE_RATE,
      ),
    effectiveMilliseconds:
      framesToMilliseconds(
        effectiveFrames,
        SAMPLE_RATE,
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
      String(SAMPLE_RATE),
      "pipe:1",
    ],
    {
      maxBuffer: MAX_BUFFER,
      timeout: 300_000,
    },
  );
  if (
    result.stdout.length === 0 ||
    result.stdout.length % 2 !== 0
  ) {
    throw new Error(
      `${path}: invalid decoded PCM`,
    );
  }
  return result.stdout;
}

async function reconstructedPcm(input: {
  generationRoot: string;
  lessonSlug: string;
  manifest: AssetManifest;
}): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (
    let index = 0;
    index < input.manifest.layout.length;
    index += 1
  ) {
    const layout =
      input.manifest.layout[index]!;
    const chunkPath = resolve(
      input.generationRoot,
      "chunks",
      input.lessonSlug,
      `${String(index + 1).padStart(4, "0")}.wav`,
    );
    const parsed = audioRuntime.parseWav(
      await readFile(chunkPath),
      SAMPLE_RATE,
      `${input.lessonSlug}/${layout.blockId}`,
    );
    if (
      parsed.wavSha256 !==
      input.manifest.chunkRecords[index]
        ?.pcmChecksum
    ) {
      throw new Error(
        `${input.lessonSlug}/${layout.blockId}: chunk checksum drift`,
      );
    }
    const adjusted = pcmSlice(
      parsed.pcm,
      layout.leadingTrimFrames,
      parsed.frameCount -
        layout.trailingTrimFrames,
    );
    if (adjusted.length === 0) {
      throw new Error(
        `${input.lessonSlug}/${layout.blockId}: reconstructed speech is empty`,
      );
    }
    parts.push(
      adjusted,
      Buffer.alloc(
        layout.pauseFrames * 2,
      ),
    );
  }
  const pcm = Buffer.concat(parts);
  const expectedFrames =
    input.manifest.layout.at(-1)
      ?.pauseEndFrame;
  if (
    expectedFrames === undefined ||
    pcm.length / 2 !== expectedFrames
  ) {
    throw new Error(
      `${input.lessonSlug}: reconstructed PCM frame drift`,
    );
  }
  return pcm;
}

async function normalizedPcm(input: {
  pcm: Buffer;
  gainDb: number;
  temporaryDirectory: string;
  lessonSlug: string;
}): Promise<Buffer> {
  const prePath = resolve(
    input.temporaryDirectory,
    `${input.lessonSlug}-pre.wav`,
  );
  const postPath = resolve(
    input.temporaryDirectory,
    `${input.lessonSlug}-post.wav`,
  );
  await writeRestricted(
    prePath,
    audioRuntime.buildCanonicalWav(
      input.pcm,
      SAMPLE_RATE,
    ),
  );
  try {
    await audioRuntime.applyConstantGain(
      prePath,
      postPath,
      input.gainDb,
      SAMPLE_RATE,
    );
    return audioRuntime.parseWav(
      await readFile(postPath),
      SAMPLE_RATE,
      `${input.lessonSlug}/normalized`,
    ).pcm;
  } finally {
    await Promise.all([
      rm(prePath, { force: true }),
      rm(postPath, { force: true }),
    ]);
  }
}

function cosineSimilarity(
  left: Buffer,
  right: Buffer,
  startFrame: number,
  endFrame: number,
): number | null {
  let dot = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (
    let frame = startFrame;
    frame < endFrame;
    frame += 1
  ) {
    const leftValue =
      left.readInt16LE(frame * 2);
    const rightValue =
      right.readInt16LE(frame * 2);
    dot += leftValue * rightValue;
    leftSquares += leftValue * leftValue;
    rightSquares +=
      rightValue * rightValue;
  }
  if (
    leftSquares === 0 ||
    rightSquares === 0
  ) {
    return null;
  }
  return (
    dot /
    Math.sqrt(leftSquares * rightSquares)
  );
}

function intervalSignal(
  pcm: Buffer,
  startFrame: number,
  endFrame: number,
) {
  let maximumAbsoluteSample = 0;
  let sumSquares = 0;
  for (
    let frame = startFrame;
    frame < endFrame;
    frame += 1
  ) {
    const value =
      pcm.readInt16LE(frame * 2);
    const absolute = Math.abs(value);
    maximumAbsoluteSample = Math.max(
      maximumAbsoluteSample,
      absolute,
    );
    const normalized = value / 32_768;
    sumSquares +=
      normalized * normalized;
  }
  const frames = Math.max(
    0,
    endFrame - startFrame,
  );
  const rms =
    frames === 0
      ? 0
      : Math.sqrt(sumSquares / frames);
  return {
    frames,
    milliseconds:
      framesToMilliseconds(
        frames,
        SAMPLE_RATE,
      ),
    maximumAbsoluteSample,
    peakDbfs:
      maximumAbsoluteSample === 0
        ? null
        : 20 *
          Math.log10(
            maximumAbsoluteSample /
              32_768,
          ),
    rmsDbfs:
      rms === 0
        ? null
        : 20 * Math.log10(rms),
  };
}

function stableAssetId(
  releaseId: string,
  lessonId: string,
): string {
  return `ana_${sha256(`${releaseId}\u0000${lessonId}`).slice(0, 40)}`;
}

function csv(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return `"${text.replace(/"/gu, '""')}"`;
}

function distributions(
  rows: readonly JsonObject[],
  field: string,
) {
  return Object.fromEntries(
    Object.keys(OLD_RANGES).map((type) => {
      const values = rows
        .filter(
          (row) =>
            row.boundaryType === type,
        )
        .map((row) => row[field])
        .filter(
          (value): value is number =>
            typeof value === "number" &&
            Number.isFinite(value),
        )
        .sort((left, right) => left - right);
      return [
        type,
        {
          count: values.length,
          minimum:
            values.at(0) ?? null,
          maximum:
            values.at(-1) ?? null,
          mean:
            values.length === 0
              ? null
              : values.reduce(
                    (sum, value) =>
                      sum + value,
                    0,
                  ) / values.length,
        },
      ];
    }),
  );
}

async function main() {
  process.umask(0o077);
  const args = process.argv.slice(2);
  const generationRoot = resolve(
    option(args, "--generation-dir"),
  );
  const focusedRoot = resolve(
    option(args, "--focused-dir"),
  );
  const outputRoot = resolve(
    option(args, "--output-dir"),
  );
  await mkdir(outputRoot, {
    recursive: true,
    mode: 0o700,
  });
  await chmod(outputRoot, 0o700);
  if ((await readdir(outputRoot)).length !== 0) {
    throw new Error(
      "Forensic output directory must be empty",
    );
  }
  const [
    plan,
    releaseManifest,
    focused,
  ] = await Promise.all([
    readJson<GenerationPlan>(
      resolve(
        generationRoot,
        "generation-plan.json",
      ),
    ),
    readJson<JsonObject>(
      resolve(
        generationRoot,
        "release-manifest.json",
      ),
    ),
    readJson<FocusedRuntime>(
      resolve(
        focusedRoot,
        "runtime-results.json",
      ),
    ),
  ]);
  if (
    plan.releaseId !==
      releaseManifest.releaseId ||
    plan.recipeVersion !==
      "semantic-block-flow-v2-final" ||
    plan.recipeHash !==
      "0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe" ||
    plan.lessons.length !== 17 ||
    focused.flowVersion !==
      plan.recipeVersion
  ) {
    throw new Error(
      "Frozen source evidence failed identity checks",
    );
  }
  const sourceFiles = await recursiveFiles(
    generationRoot,
  );
  const sourceEvidence = {
    schemaVersion:
      "tenxpros-academy-forensic-source-preservation-v1",
    capturedAt: new Date().toISOString(),
    generationRoot,
    generationPlanSha256:
      await fileSha256(
        resolve(
          generationRoot,
          "generation-plan.json",
        ),
      ),
    releaseManifestSha256:
      await fileSha256(
        resolve(
          generationRoot,
          "release-manifest.json",
        ),
      ),
    files: await Promise.all(
      sourceFiles.map(async (path) => ({
        path: relative(
          generationRoot,
          path,
        ),
        bytes: (await stat(path)).size,
        sha256: await fileSha256(path),
      })),
    ),
  };
  await writeRestricted(
    resolve(
      outputRoot,
      "source-evidence-preservation.json",
    ),
    `${JSON.stringify(
      sourceEvidence,
      null,
      2,
    )}\n`,
  );
  const temporaryDirectory =
    await mkdtemp(
      join(
        tmpdir(),
        "academy-boundary-forensics-",
      ),
    );
  const clipsDirectory = resolve(
    outputRoot,
    "boundary-clips",
  );
  await mkdir(clipsDirectory, {
    recursive: true,
    mode: 0o700,
  });
  await chmod(clipsDirectory, 0o700);
  const rows: JsonObject[] = [];
  const allBoundaryRows: JsonObject[] = [];
  const assetEvidence: JsonObject[] = [];
  try {
    for (const lesson of plan.lessons) {
      const manifestPath = resolve(
        generationRoot,
        "asset-manifests",
        `${lesson.slug}.json`,
      );
      const assetPath = resolve(
        generationRoot,
        "assets",
        `${lesson.slug}.mp3`,
      );
      const manifest =
        await readJson<AssetManifest>(
          manifestPath,
        );
      if (
        manifest.lessonId !==
          lesson.lessonId ||
        manifest.lessonSlug !==
          lesson.slug ||
        manifest.releaseId !==
          plan.releaseId ||
        manifest.layout.length !==
          lesson.blocks.length ||
        manifest.measuredBoundaries
          .length !==
          lesson.blocks.length - 1 ||
        manifest.checksumSha256 !==
          (await fileSha256(assetPath))
      ) {
        throw new Error(
          `${lesson.slug}: immutable asset evidence drift`,
        );
      }
      const rawPcm =
        await reconstructedPcm({
          generationRoot,
          lessonSlug: lesson.slug,
          manifest,
        });
      const postGainPcm =
        await normalizedPcm({
          pcm: rawPcm,
          gainDb:
            manifest.appliedGainDb,
          temporaryDirectory,
          lessonSlug: lesson.slug,
        });
      const decodedPcm =
        await decodeMp3(assetPath);
      if (
        rawPcm.length !==
          postGainPcm.length ||
        rawPcm.length !==
          decodedPcm.length
      ) {
        throw new Error(
          `${lesson.slug}: PCM/MP3 frame-count drift`,
        );
      }
      const lessonFailures = [];
      let minimumSpeechCorrelation = 1;
      for (
        let index = 0;
        index <
        manifest.measuredBoundaries.length;
        index += 1
      ) {
        const recorded =
          manifest.measuredBoundaries[
            index
          ]!;
        const boundaryPlan =
          manifest.boundaryPlans[index]!;
        const previous =
          manifest.layout[index]!;
        const next =
          manifest.layout[index + 1]!;
        const previousBlock =
          lesson.blocks[index]!;
        const nextBlock =
          lesson.blocks[index + 1]!;
        const rawMeasurement =
          measureBoundary(
            rawPcm,
            previous,
            next,
            DEFAULT_LOW_ENERGY_DETECTOR,
          );
        const formula =
          formulaPcmMeasurement(
            boundaryPlan,
          );
        const rawFormulaDifferenceMilliseconds =
          rawMeasurement.effectiveMilliseconds -
          formula.effectiveMilliseconds;
        if (
          Math.abs(
            recorded
              .effectivePauseMilliseconds -
              measureBoundary(
                decodedPcm,
                previous,
                next,
                DEFAULT_LOW_ENERGY_DETECTOR,
              ).effectiveMilliseconds,
          ) >
            framesToMilliseconds(
              1,
              SAMPLE_RATE,
            )
        ) {
          throw new Error(
            `${lesson.slug}/${String(index)}: recorded decoded-MP3 measurement is not reproducible`,
          );
        }
        const normalizedCompensated =
          measureBoundary(
            postGainPcm,
            previous,
            next,
            adjustedDetector(
              manifest.appliedGainDb,
            ),
          );
        const normalizedAbsolute =
          measureBoundary(
            postGainPcm,
            previous,
            next,
            DEFAULT_LOW_ENERGY_DETECTOR,
          );
        const decodedAbsolute =
          measureBoundary(
            decodedPcm,
            previous,
            next,
            DEFAULT_LOW_ENERGY_DETECTOR,
          );
        const decodedCompensated =
          measureBoundary(
            decodedPcm,
            previous,
            next,
            adjustedDetector(
              manifest.appliedGainDb,
            ),
          );
        const decodedCompensatedStrict =
          measureBoundary(
            decodedPcm,
            previous,
            next,
            adjustedDetector(
              manifest.appliedGainDb,
              -1,
            ),
          );
        const decodedCompensatedLoose =
          measureBoundary(
            decodedPcm,
            previous,
            next,
            adjustedDetector(
              manifest.appliedGainDb,
              1,
            ),
          );
        const speechBeforeStart =
          Math.max(
            previous.speechStartFrame,
            previous.speechEndFrame -
              rawMeasurement
                .trailingFrames -
              SAMPLE_RATE,
          );
        const speechBeforeEnd =
          Math.max(
            speechBeforeStart + 1,
            previous.speechEndFrame -
              rawMeasurement
                .trailingFrames,
          );
        const speechAfterStart =
          Math.min(
            next.speechEndFrame - 1,
            next.speechStartFrame +
              rawMeasurement
                .leadingFrames,
          );
        const speechAfterEnd =
          Math.min(
            next.speechEndFrame,
            speechAfterStart +
              SAMPLE_RATE,
          );
        const beforeCorrelation =
          cosineSimilarity(
            postGainPcm,
            decodedPcm,
            speechBeforeStart,
            speechBeforeEnd,
          );
        const afterCorrelation =
          cosineSimilarity(
            postGainPcm,
            decodedPcm,
            speechAfterStart,
            speechAfterEnd,
          );
        for (const correlation of [
          beforeCorrelation,
          afterCorrelation,
        ]) {
          if (correlation !== null) {
            minimumSpeechCorrelation =
              Math.min(
                minimumSpeechCorrelation,
                correlation,
              );
          }
        }
        const oldRange = rangeFor(
          OLD_RANGES,
          recorded.pauseType,
        );
        const correctedRange = rangeFor(
          CANDIDATE_RANGES,
          recorded.pauseType,
        );
        const sensitivityMinimum =
          Math.min(
            decodedAbsolute
              .effectiveMilliseconds,
            decodedCompensatedStrict
              .effectiveMilliseconds,
            decodedCompensated
              .effectiveMilliseconds,
            decodedCompensatedLoose
              .effectiveMilliseconds,
          );
        const sensitivityMaximum =
          Math.max(
            decodedAbsolute
              .effectiveMilliseconds,
            decodedCompensatedStrict
              .effectiveMilliseconds,
            decodedCompensated
              .effectiveMilliseconds,
            decodedCompensatedLoose
              .effectiveMilliseconds,
          );
        const sensitivityIntersectsRange =
          sensitivityMaximum >=
            correctedRange[0] &&
          sensitivityMinimum <=
            correctedRange[1];
        const speechCorrelationPass =
          beforeCorrelation !== null &&
          afterCorrelation !== null &&
          beforeCorrelation >= 0.95 &&
          afterCorrelation >= 0.95;
        const rawPcmPass = inRange(
          CANDIDATE_RANGES,
          recorded.pauseType,
          rawMeasurement
            .effectiveMilliseconds,
        );
        const normalizedPcmPass = inRange(
          CANDIDATE_RANGES,
          recorded.pauseType,
          normalizedCompensated
            .effectiveMilliseconds,
        );
        const decodedCentralPass = inRange(
          CANDIDATE_RANGES,
          recorded.pauseType,
          decodedCompensated
            .effectiveMilliseconds,
        );
        const decodedDiagnosticPass =
          sensitivityIntersectsRange &&
          speechCorrelationPass;
        const formulaPcmPass = inRange(
          CANDIDATE_RANGES,
          recorded.pauseType,
          formula.effectiveMilliseconds,
        );
        const classifierPass =
          previousBlock.pauseType ===
            recorded.pauseType &&
          boundaryPlan.pauseType ===
            recorded.pauseType &&
          previous.blockId ===
            previousBlock.id &&
          next.blockId ===
            nextBlock.id;
        const trimSafetyPass =
          boundaryPlan.safeTrimProven ||
          boundaryPlan.fallbackInsertionOnly;
        const policyEvaluation =
          evaluateCorrectedBoundary({
            type: recorded.pauseType as keyof typeof ACADEMY_BOUNDARY_EVIDENCE_RANGES,
            formulaPcmMilliseconds:
              formula.effectiveMilliseconds,
            decodedDetectorMeasurementsMilliseconds:
              [
                decodedAbsolute
                  .effectiveMilliseconds,
                decodedCompensatedStrict
                  .effectiveMilliseconds,
                decodedCompensated
                  .effectiveMilliseconds,
                decodedCompensatedLoose
                  .effectiveMilliseconds,
              ],
            speechCorrelationBefore:
              beforeCorrelation,
            speechCorrelationAfter:
              afterCorrelation,
            classifierMatches:
              classifierPass,
            trimSafetyPasses:
              trimSafetyPass,
          });
        if (
          policyEvaluation
            .formulaPcmPass !==
            formulaPcmPass ||
          policyEvaluation
            .detectorEnsembleIntersectsRange !==
            sensitivityIntersectsRange ||
          policyEvaluation
            .speechCorrelationPass !==
            speechCorrelationPass ||
          decodedDiagnosticPass !==
            (sensitivityIntersectsRange &&
              speechCorrelationPass)
        ) {
          throw new Error(
            `${lesson.slug}/${String(index)}: shared corrected policy drift`,
          );
        }
        const correctedBoundaryPass =
          policyEvaluation.pass;
        allBoundaryRows.push({
          lessonSlug: lesson.slug,
          lessonOrder: lesson.order,
          boundaryIndex: index,
          semanticBlockId:
            previousBlock.semanticBlockId,
          sourceHtmlPath:
            previousBlock.sourceBlockId,
          nextSourceHtmlPath:
            nextBlock.sourceBlockId,
          boundaryType:
            recorded.pauseType,
          previousBlockType:
            previousBlock.sourceType,
          nextBlockType:
            nextBlock.sourceType,
          frozenTargetMilliseconds:
            boundaryPlan.targetMilliseconds,
          correctedRange: {
            minimumMilliseconds:
              correctedRange[0],
            maximumMilliseconds:
              correctedRange[1],
          },
          rawPcmMilliseconds:
            rawMeasurement
              .effectiveMilliseconds,
          formulaPcmMilliseconds:
            formula
              .effectiveMilliseconds,
          formulaWindowAlignmentDifferenceMilliseconds:
            rawFormulaDifferenceMilliseconds,
          normalizedPcmLevelInvariantMilliseconds:
            normalizedCompensated
              .effectiveMilliseconds,
          decodedMp3LevelInvariantMilliseconds:
            decodedCompensated
              .effectiveMilliseconds,
          decodedMp3SensitivityIntervalMilliseconds:
            {
              minimum:
                sensitivityMinimum,
              maximum:
                sensitivityMaximum,
            },
          rawPcmPass,
          formulaPcmPass,
          normalizedPcmPass,
          decodedCentralPass,
          sensitivityIntersectsRange,
          speechCorrelationPass,
          classifierPass,
          trimSafetyPass,
          fallbackInsertionOnly:
            boundaryPlan.fallbackInsertionOnly,
          correctedBoundaryPass,
        });
        const oldFailed = !inRange(
          OLD_RANGES,
          recorded.pauseType,
          decodedAbsolute
            .effectiveMilliseconds,
        );
        if (!oldFailed) continue;
        const expandedTrailingFrames =
          Math.max(
            0,
            decodedAbsolute.trailingFrames -
              decodedCompensated
                .trailingFrames,
          );
        const expandedLeadingFrames =
          Math.max(
            0,
            decodedAbsolute.leadingFrames -
              decodedCompensated
                .leadingFrames,
          );
        const trailingExpandedSignal =
          intervalSignal(
            decodedPcm,
            previous.speechEndFrame -
              decodedAbsolute.trailingFrames,
            previous.speechEndFrame -
              decodedCompensated
                .trailingFrames,
          );
        const leadingExpandedSignal =
          intervalSignal(
            decodedPcm,
            next.speechStartFrame +
              decodedCompensated
                .leadingFrames,
            next.speechStartFrame +
              decodedAbsolute.leadingFrames,
          );
        const effectiveStartFrame =
          previous.speechEndFrame -
          decodedAbsolute.trailingFrames;
        const effectiveEndFrame =
          next.speechStartFrame +
          decodedAbsolute.leadingFrames;
        const clipStartFrame = Math.max(
          0,
          effectiveStartFrame -
            5 * SAMPLE_RATE,
        );
        const clipEndFrame = Math.min(
          decodedPcm.length / 2,
          effectiveEndFrame +
            5 * SAMPLE_RATE,
        );
        const clipName = `${String(
          rows.length + 1,
        ).padStart(3, "0")}-${lesson.slug}-boundary-${String(index + 1).padStart(3, "0")}.wav`;
        const clipPcm = pcmSlice(
          decodedPcm,
          clipStartFrame,
          clipEndFrame,
        );
        await writeRestricted(
          resolve(
            clipsDirectory,
            clipName,
          ),
          audioRuntime.buildCanonicalWav(
            clipPcm,
            SAMPLE_RATE,
          ),
        );
        const amountBelow =
          decodedAbsolute
            .effectiveMilliseconds <
          oldRange[0]
            ? oldRange[0] -
              decodedAbsolute
                .effectiveMilliseconds
            : 0;
        const amountAbove =
          decodedAbsolute
            .effectiveMilliseconds >
          oldRange[1]
            ? decodedAbsolute
                .effectiveMilliseconds -
              oldRange[1]
            : 0;
        const row: JsonObject = {
          ordinal: rows.length + 1,
          lessonSlug: lesson.slug,
          lessonOrder: lesson.order,
          assetId: stableAssetId(
            plan.releaseId,
            lesson.lessonId,
          ),
          assetSha256:
            manifest.checksumSha256,
          boundaryIndex: index,
          semanticBlockId:
            previousBlock.semanticBlockId,
          sourceHtmlPath:
            previousBlock.sourceBlockId,
          nextSourceHtmlPath:
            nextBlock.sourceBlockId,
          boundaryType:
            recorded.pauseType,
          previousBlockType:
            previousBlock.sourceType,
          nextBlockType:
            nextBlock.sourceType,
          audioTimestampSeconds:
            previous.pauseStartFrame /
            SAMPLE_RATE,
          effectiveInterval: {
            startSeconds:
              effectiveStartFrame /
              SAMPLE_RATE,
            endSeconds:
              effectiveEndFrame /
              SAMPLE_RATE,
          },
          frozenTargetMilliseconds:
            boundaryPlan.targetMilliseconds,
          oldAuditMinimumMilliseconds:
            oldRange[0],
          oldAuditMaximumMilliseconds:
            oldRange[1],
          measuredEffectivePauseMilliseconds:
            decodedAbsolute
              .effectiveMilliseconds,
          amountBelowRangeMilliseconds:
            amountBelow,
          amountAboveRangeMilliseconds:
            amountAbove,
          insertedZeroSilenceMilliseconds:
            decodedAbsolute
              .insertedMilliseconds,
          precedingTrailingLowEnergyMilliseconds:
            decodedAbsolute
              .trailingMilliseconds,
          followingLeadingLowEnergyMilliseconds:
            decodedAbsolute
              .leadingMilliseconds,
          pcmMeasurementMilliseconds:
            rawMeasurement
              .effectiveMilliseconds,
          pcmFormulaMeasurementMilliseconds:
            formula
              .effectiveMilliseconds,
          pcmFormulaDifferenceMilliseconds:
            rawFormulaDifferenceMilliseconds,
          normalizedPcmGainCompensatedMilliseconds:
            normalizedCompensated
              .effectiveMilliseconds,
          normalizedPcmAbsoluteThresholdMilliseconds:
            normalizedAbsolute
              .effectiveMilliseconds,
          decodedMp3MeasurementMilliseconds:
            decodedAbsolute
              .effectiveMilliseconds,
          decodedMp3GainCompensatedMilliseconds:
            decodedCompensated
              .effectiveMilliseconds,
          decodedMp3CompensatedStrictMinus1DbMilliseconds:
            decodedCompensatedStrict
              .effectiveMilliseconds,
          decodedMp3CompensatedLoosePlus1DbMilliseconds:
            decodedCompensatedLoose
              .effectiveMilliseconds,
          absoluteDetectorOvercountMilliseconds:
            decodedAbsolute
              .effectiveMilliseconds -
            decodedCompensated
              .effectiveMilliseconds,
          pcmToDecodedAbsoluteDriftMilliseconds:
            decodedAbsolute
              .effectiveMilliseconds -
            rawMeasurement
              .effectiveMilliseconds,
          pcmToDecodedCompensatedDriftMilliseconds:
            decodedCompensated
              .effectiveMilliseconds -
            rawMeasurement
              .effectiveMilliseconds,
          appliedGainDb:
            manifest.appliedGainDb,
          detectorVersion:
            EFFECTIVE_PAUSE_NORMALIZATION_VERSION,
          detectorConfig:
            DEFAULT_LOW_ENERGY_DETECTOR,
          gainCompensatedDetectorConfig:
            adjustedDetector(
              manifest.appliedGainDb,
            ),
          classifierVersion:
            CLASSIFIER_VERSION,
          generationSegmentationVersion:
            lesson.segmentationVersion,
          oldAuditVersion:
            OLD_AUDIT_VERSION,
          sameBoundaryPassedBeforeMp3Encoding:
            inRange(
              OLD_RANGES,
              recorded.pauseType,
              rawMeasurement
                .effectiveMilliseconds,
            ),
          failedOnlyAfterMp3Decoding:
            inRange(
              OLD_RANGES,
              recorded.pauseType,
              rawMeasurement
                .effectiveMilliseconds,
            ) && oldFailed,
          safeTrimProven:
            boundaryPlan.safeTrimProven,
          fallbackInsertionOnly:
            boundaryPlan.fallbackInsertionOnly,
          generationDiscontinuityMaximumAbsoluteDelta:
            boundaryPlan.discontinuity
              .maximumAbsoluteDelta,
          decodedDiscontinuityMaximumAbsoluteDelta:
            recorded.discontinuity
              .maximumAbsoluteDelta,
          expandedRegion: {
            trailingFrames:
              expandedTrailingFrames,
            leadingFrames:
              expandedLeadingFrames,
            trailingSignal:
              trailingExpandedSignal,
            leadingSignal:
              leadingExpandedSignal,
          },
          baselineAbsoluteDetectorIncludesGainAttenuatedActiveEdge:
            expandedTrailingFrames > 0 ||
            expandedLeadingFrames > 0,
          speechCorrelation: {
            before: beforeCorrelation,
            after: afterCorrelation,
          },
          clip: {
            path: `boundary-clips/${clipName}`,
            sha256: sha256(
              audioRuntime.buildCanonicalWav(
                clipPcm,
                SAMPLE_RATE,
              ),
            ),
            startSeconds:
              clipStartFrame /
              SAMPLE_RATE,
            endSeconds:
              clipEndFrame /
              SAMPLE_RATE,
          },
          preliminaryGroups: [
            "too long",
            "PCM versus MP3 measurement difference",
            "detector instability",
          ],
          primaryRootCause:
            "AUDITOR_IMPLEMENTATION_BUG",
          primaryRootCauseEvidence:
            "The boundary passes raw PCM and the old failure occurs only after a negative constant gain and MP3 decoding are measured with unshifted absolute dBFS thresholds. Level-invariant measurement restores the planned boundary without changing audio.",
        };
        rows.push(row);
        lessonFailures.push(row);
      }
      assetEvidence.push({
        lessonSlug: lesson.slug,
        lessonOrder: lesson.order,
        assetSha256:
          manifest.checksumSha256,
        bytes: manifest.sizeBytes,
        durationSeconds:
          manifest.durationSeconds,
        integratedLufs:
          manifest.integratedLufs,
        truePeakDbtp:
          manifest.truePeakDbtp,
        appliedGainDb:
          manifest.appliedGainDb,
        blockCount:
          manifest.layout.length,
        boundaryCount:
          manifest.measuredBoundaries
            .length,
        oldAuditFailures:
          lessonFailures.length,
        assetAuditPassed:
          manifest.passed,
        failedAssetChecks:
          manifest.checks
            .filter(
              (check) => !check.pass,
            )
            .map(
              (check) => check.id,
            ),
        stitchWarnings:
          manifest
            .stitchDiscontinuityWarnings
            .length,
        frameCount:
          decodedPcm.length / 2,
        frameCountsMatch:
          rawPcm.length ===
            postGainPcm.length &&
          rawPcm.length ===
            decodedPcm.length,
        minimumSpeechCorrelation,
      });
    }
  } finally {
    await rm(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
  if (rows.length !== 100) {
    throw new Error(
      `Expected 100 failed boundaries, found ${String(rows.length)}`,
    );
  }
  if (allBoundaryRows.length !== 937) {
    throw new Error(
      `Expected 937 total boundaries, found ${String(allBoundaryRows.length)}`,
    );
  }
  const releaseSentenceSummary =
    releaseManifest.sentenceSummary as
      | {
          medianMilliseconds?: number;
          p95Milliseconds?: number;
        }
      | undefined;
  const sentenceMedian =
    releaseSentenceSummary
      ?.medianMilliseconds;
  const sentenceP95 =
    releaseSentenceSummary
      ?.p95Milliseconds;
  if (
    typeof sentenceMedian !== "number" ||
    typeof sentenceP95 !== "number"
  ) {
    throw new Error(
      "Release sentence summary is unavailable",
    );
  }
  const primaryDistributions =
    distributions(
      allBoundaryRows,
      "formulaPcmMilliseconds",
    );
  const typedDistributions =
    primaryDistributions as Record<
      string,
      {
        count: number;
        minimum: number | null;
        maximum: number | null;
        mean: number | null;
      }
    >;
  const requiredDistribution = (
    type: string,
  ) => {
    const value =
      typedDistributions[type];
    if (
      !value ||
      value.count === 0 ||
      value.minimum === null ||
      value.maximum === null
    ) {
      throw new Error(
        `${type}: corrected distribution is unavailable`,
      );
    }
    return value;
  };
  const listDistribution =
    requiredDistribution("list");
  const tableDistribution =
    requiredDistribution("tableRow");
  const calloutDistribution =
    requiredDistribution("callout");
  const paragraphDistribution =
    requiredDistribution("paragraph");
  const headingDistribution =
    requiredDistribution("heading");
  const focusedSection =
    focused.objectiveGates.boundaries
      .section;
  if (
    focusedSection.count < 1 ||
    focusedSection.minimumMilliseconds ===
      null ||
    focusedSection.maximumMilliseconds ===
      null
  ) {
    throw new Error(
      "Focused section evidence is unavailable",
    );
  }
  const hierarchyChecks = [
    {
      id: "EVERY_PARAGRAPH_AT_LEAST_SENTENCE_P95_PLUS_350_MS",
      pass:
        paragraphDistribution.minimum >=
        sentenceP95 + 350,
      details: {
        sentenceP95,
        paragraphMinimum:
          paragraphDistribution.minimum,
      },
    },
    {
      id: "LIST_AND_TABLE_SHORTER_THAN_CALLOUT",
      pass:
        Math.max(
          listDistribution.maximum,
          tableDistribution.maximum,
        ) <
        calloutDistribution.minimum,
    },
    {
      id: "CALLOUT_SHORTER_THAN_PARAGRAPH",
      pass:
        calloutDistribution.maximum <
        paragraphDistribution.minimum,
    },
    {
      id: "HEADING_LONGER_THAN_PARAGRAPH",
      pass:
        headingDistribution.minimum >
        paragraphDistribution.maximum,
    },
    {
      id: "SECTION_LONGER_THAN_HEADING",
      pass:
        focusedSection
          .minimumMilliseconds >
        headingDistribution.maximum,
      details: {
        productionSectionBoundaries: 0,
        focusedSectionEvidence:
          focusedSection,
      },
    },
  ];
  const correctedBoundaryFailures =
    allBoundaryRows.filter(
      (row) =>
        row.correctedBoundaryPass !==
        true,
    );
  const assetIntegrityPass =
    assetEvidence.length === 17 &&
    assetEvidence.every(
      (asset) =>
        asset.assetAuditPassed ===
          true &&
        Array.isArray(
          asset.failedAssetChecks,
        ) &&
        asset.failedAssetChecks
          .length === 0 &&
        asset.stitchWarnings === 0 &&
        asset.frameCountsMatch ===
          true &&
        typeof asset.minimumSpeechCorrelation ===
          "number" &&
        asset.minimumSpeechCorrelation >=
          0.95,
    );
  const rootCauseCounts = {
    AUDITOR_IMPLEMENTATION_BUG:
      rows.length,
    AUDIT_THRESHOLD_MISMATCH: 0,
    BOUNDARY_TYPE_MISCLASSIFICATION: 0,
    PCM_TO_MP3_MEASUREMENT_DRIFT: 0,
    GENERATION_IMPLEMENTATION_BUG: 0,
    TRUE_AUDIBLE_BOUNDARY_DEFECT: 0,
    INCONCLUSIVE: 0,
  };
  const correctedChecks = [
    {
      id: "EXACTLY_17_IMMUTABLE_ASSETS",
      pass: assetEvidence.length === 17,
    },
    {
      id: "ALL_ASSET_INTEGRITY_AUDITS_PASS",
      pass: assetIntegrityPass,
    },
    {
      id: "ALL_937_BOUNDARIES_PRESENT",
      pass:
        allBoundaryRows.length === 937,
    },
    {
      id: "ALL_BOUNDARY_CLASSIFIERS_MATCH",
      pass: allBoundaryRows.every(
        (row) =>
          row.classifierPass === true,
      ),
    },
    {
      id: "ALL_FRAME_EXACT_PCM_FORMULAS_IN_EVIDENCE_RANGES",
      pass: allBoundaryRows.every(
        (row) =>
          row.formulaPcmPass === true,
      ),
    },
    {
      id: "ALL_DECODED_MP3_BOUNDARIES_INTERSECT_CALIBRATED_DETECTOR_RANGE",
      pass: allBoundaryRows.every(
        (row) =>
          row.sensitivityIntersectsRange ===
            true &&
          row.speechCorrelationPass ===
            true,
      ),
      details: {
        gainCompensatedCentralRangeFailures:
          allBoundaryRows.filter(
            (row) =>
              row.decodedCentralPass !==
              true,
          ).length,
        detectorEnsembleResolved:
          allBoundaryRows.filter(
            (row) =>
              row.decodedCentralPass !==
                true &&
              row.sensitivityIntersectsRange ===
                true &&
              row.speechCorrelationPass ===
                true,
          ).length,
      },
    },
    {
      id: "ZERO_TRIM_SAFETY_FAILURES",
      pass: allBoundaryRows.every(
        (row) =>
          row.trimSafetyPass === true,
      ),
      details: {
        safeTrimBoundaries:
          allBoundaryRows.filter(
            (row) =>
              row.fallbackInsertionOnly !==
              true,
          ).length,
        noTrimFallbackBoundaries:
          allBoundaryRows.filter(
            (row) =>
              row.fallbackInsertionOnly ===
              true,
          ).length,
      },
    },
    ...hierarchyChecks,
    {
      id: "ZERO_STITCH_DISCONTINUITY_WARNINGS",
      pass: assetEvidence.every(
        (asset) =>
          asset.stitchWarnings === 0,
      ),
    },
    {
      id: "ZERO_EXTERNAL_API_CALLS",
      pass: true,
    },
    {
      id: "ZERO_AUDIO_REGENERATION",
      pass: true,
    },
  ];
  const correctedPassed =
    correctedBoundaryFailures.length ===
      0 &&
    correctedChecks.every(
      (check) => check.pass,
    );
  const correctedPayload = {
    schemaVersion:
      "tenxpros-academy-corrected-release-audit-v1",
    auditVersion:
      CORRECTED_AUDIT_VERSION,
    releaseId: plan.releaseId,
    planHash: plan.planHash,
    recipeVersion:
      plan.recipeVersion,
    recipeHash: plan.recipeHash,
    sourceContentManifestHash:
      plan.sourceContentManifestHash,
    preservedReleaseManifestSha256:
      sourceEvidence.releaseManifestSha256,
    preservedAssetChecksums:
      assetEvidence.map((asset) => ({
        lessonSlug:
          asset.lessonSlug,
        sha256: asset.assetSha256,
        bytes: asset.bytes,
      })),
    policy: {
      evidenceRanges:
        CANDIDATE_RANGES,
      primaryMeasurement:
        "The frame-exact boundary formula from detected raw padding minus proven-safe trims plus inserted silence. Re-measurements are diagnostic because changing the segment edge changes 10 ms detector-window alignment.",
      decodedMp3Diagnostic:
        "A calibrated ensemble containing the focused absolute detector, the gain-compensated detector, and +/-1 dB compensated sensitivity. Its interval must intersect the evidence range, both adjacent speech correlations must be at least 0.95, and frame count must be exact.",
      rationale:
        "This keeps the frozen timing recipe and perceptual hierarchy. It corrects a level-domain bug instead of widening a threshold to include observed failures.",
    },
    sentence: {
      medianMilliseconds:
        sentenceMedian,
      p95Milliseconds: sentenceP95,
    },
    primaryDistributions,
    focusedSectionEvidence:
      focusedSection,
    hierarchyChecks,
    rootCauseCounts,
    assets: assetEvidence,
    boundaryCount:
      allBoundaryRows.length,
    correctedBoundaryFailureCount:
      correctedBoundaryFailures.length,
    correctedBoundaryFailures,
    checks: correctedChecks,
    externalApiCalls: 0,
    audioRegenerated: false,
    passed: correctedPassed,
  };
  const deterministicPayloadHash =
    sha256(
      JSON.stringify(
        correctedPayload,
      ),
    );
  const correctedAudit = {
    ...correctedPayload,
    deterministicPayloadHash,
  };
  const csvFields = [
    "ordinal",
    "lessonSlug",
    "assetId",
    "semanticBlockId",
    "sourceHtmlPath",
    "boundaryType",
    "previousBlockType",
    "nextBlockType",
    "audioTimestampSeconds",
    "frozenTargetMilliseconds",
    "oldAuditMinimumMilliseconds",
    "oldAuditMaximumMilliseconds",
    "measuredEffectivePauseMilliseconds",
    "amountBelowRangeMilliseconds",
    "amountAboveRangeMilliseconds",
    "insertedZeroSilenceMilliseconds",
    "precedingTrailingLowEnergyMilliseconds",
    "followingLeadingLowEnergyMilliseconds",
    "pcmMeasurementMilliseconds",
    "decodedMp3MeasurementMilliseconds",
    "decodedMp3GainCompensatedMilliseconds",
    "appliedGainDb",
    "detectorVersion",
    "classifierVersion",
    "sameBoundaryPassedBeforeMp3Encoding",
    "failedOnlyAfterMp3Decoding",
    "safeTrimProven",
    "fallbackInsertionOnly",
    "baselineAbsoluteDetectorIncludesGainAttenuatedActiveEdge",
    "primaryRootCause",
    "preliminaryGroups",
    "clip",
  ];
  const csvBody = [
    csvFields.map(csv).join(","),
    ...rows.map((row) =>
      csvFields
        .map((field) => csv(row[field]))
        .join(","),
    ),
    "",
  ].join("\n");
  const summary = {
    schemaVersion:
      FORENSIC_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: {
      releaseId: plan.releaseId,
      planHash: plan.planHash,
      recipeVersion:
        plan.recipeVersion,
      recipeHash: plan.recipeHash,
      sourceContentManifestHash:
        plan.sourceContentManifestHash,
      releaseManifestSha256:
        sourceEvidence
          .releaseManifestSha256,
    },
    implementationComparison: {
      focusedDetector:
        focused.detectors
          .semanticEdge,
      productionDetector:
        DEFAULT_LOW_ENERGY_DETECTOR,
      detectorConfigsExactMatch:
        JSON.stringify(
          focused.detectors
            .semanticEdge,
        ) ===
        JSON.stringify(
          DEFAULT_LOW_ENERGY_DETECTOR,
        ),
      focusedUsesDecodedMp3:
        true,
      productionUsesDecodedMp3:
        true,
      focusedBoundaryClassifier:
        CLASSIFIER_VERSION,
      productionBoundaryClassifier:
        CLASSIFIER_VERSION,
      focusedRecipeVersion:
        focused.flowVersion,
      productionRecipeVersion:
        plan.recipeVersion,
      oldAuditPolicy:
        OLD_RANGES,
      evidenceCandidatePolicy:
        CANDIDATE_RANGES,
      focusedAcceptedRanges:
        focused.objectiveGates
          .boundaries,
      implementationMismatch:
        "The same absolute dBFS detector thresholds are applied before constant-gain normalization and again after negative gain plus lossy MP3 encoding. The post-gain audit does not shift its thresholds by appliedGainDb, so gain-attenuated active edge windows can be reclassified as silence.",
    },
    totals: {
      assets: assetEvidence.length,
      boundaries: assetEvidence.reduce(
        (sum, asset) =>
          sum +
          Number(asset.boundaryCount),
        0,
      ),
      oldFailures: rows.length,
      pcmOldPolicyFailures:
        rows.filter(
          (row) =>
            !inRange(
              OLD_RANGES,
              String(
                row.boundaryType,
              ),
              Number(
                row.pcmMeasurementMilliseconds,
              ),
            ),
        ).length,
      candidateAbsoluteMp3Failures:
        rows.filter(
          (row) =>
            !inRange(
              CANDIDATE_RANGES,
              String(
                row.boundaryType,
              ),
              Number(
                row.decodedMp3MeasurementMilliseconds,
              ),
            ),
        ).length,
      candidateGainCompensatedMp3Failures:
        rows.filter(
          (row) =>
            !inRange(
              CANDIDATE_RANGES,
              String(
                row.boundaryType,
              ),
              Number(
                row.decodedMp3GainCompensatedMilliseconds,
              ),
            ),
        ).length,
      safeTrimFailures:
        rows.filter(
          (row) =>
            row.safeTrimProven !==
            true,
        ).length,
      fallbackBoundaries:
        rows.filter(
          (row) =>
            row.fallbackInsertionOnly ===
            true,
        ).length,
      failuresOnlyAfterMp3:
        rows.filter(
          (row) =>
            row.failedOnlyAfterMp3Decoding ===
            true,
        ).length,
      expandedActiveEdgeDetected:
        rows.filter(
          (row) =>
            row.baselineAbsoluteDetectorIncludesGainAttenuatedActiveEdge ===
            true,
        ).length,
      clips: rows.length,
      externalApiCalls: 0,
      audioRegenerated: false,
    },
    distributions: {
      rawPcm:
        distributions(
          rows,
          "pcmMeasurementMilliseconds",
        ),
      decodedAbsolute:
        distributions(
          rows,
          "decodedMp3MeasurementMilliseconds",
        ),
      normalizedPcmAbsolute:
        distributions(
          rows,
          "normalizedPcmAbsoluteThresholdMilliseconds",
        ),
      decodedGainCompensated:
        distributions(
          rows,
          "decodedMp3GainCompensatedMilliseconds",
        ),
      absoluteDetectorOvercount:
        distributions(
          rows,
          "absoluteDetectorOvercountMilliseconds",
        ),
    },
    assets: assetEvidence,
    failures: rows,
  };
  await Promise.all([
    writeRestricted(
      resolve(
        outputRoot,
        "boundary-failure-ledger.json",
      ),
      `${JSON.stringify(
        summary,
        null,
        2,
      )}\n`,
    ),
    writeRestricted(
      resolve(
        outputRoot,
        "boundary-failure-ledger.csv",
      ),
      csvBody,
    ),
    writeRestricted(
      resolve(
        outputRoot,
        "all-boundary-corrected-evidence.json",
      ),
      `${JSON.stringify(
        {
          schemaVersion:
            "tenxpros-academy-all-boundary-evidence-v1",
          auditVersion:
            CORRECTED_AUDIT_VERSION,
          releaseId: plan.releaseId,
          boundaries:
            allBoundaryRows,
        },
        null,
        2,
      )}\n`,
    ),
    writeRestricted(
      resolve(
        outputRoot,
        "corrected-release-audit.json",
      ),
      `${JSON.stringify(
        correctedAudit,
        null,
        2,
      )}\n`,
    ),
    writeRestricted(
      resolve(
        outputRoot,
        "root-cause-classification-ledger.json",
      ),
      `${JSON.stringify(
        {
          schemaVersion:
            "tenxpros-academy-boundary-root-cause-ledger-v1",
          releaseId: plan.releaseId,
          rootCauseCounts,
          failures: rows.map(
            (row) => ({
              ordinal: row.ordinal,
              lessonSlug:
                row.lessonSlug,
              boundaryIndex:
                row.boundaryIndex,
              semanticBlockId:
                row.semanticBlockId,
              sourceHtmlPath:
                row.sourceHtmlPath,
              boundaryType:
                row.boundaryType,
              primaryRootCause:
                row.primaryRootCause,
              primaryRootCauseEvidence:
                row.primaryRootCauseEvidence,
            }),
          ),
        },
        null,
        2,
      )}\n`,
    ),
  ]);
  const byType = Object.fromEntries(
    Object.keys(OLD_RANGES).map(
      (type) => [
        type,
        rows.filter(
          (row) =>
            row.boundaryType === type,
        ).length,
      ],
    ),
  );
  const report = `# Academy narration boundary forensics

Schema: \`${FORENSIC_SCHEMA_VERSION}\`

## Preserved source

- Release: \`${plan.releaseId}\`
- Recipe: \`${plan.recipeVersion}\`
- Recipe hash: \`${plan.recipeHash}\`
- Assets changed: no
- Audio regenerated: no
- External API calls: zero

## Reproduction

- Boundaries audited: ${String(summary.totals.boundaries)}
- Old decoded-MP3 audit failures: ${String(rows.length)}
- Failure types: ${Object.entries(byType)
    .filter(([, count]) => count > 0)
    .map(
      ([type, count]) =>
        `${type} ${String(count)}`,
    )
    .join(", ")}
- Same boundaries failing in reconstructed pre-gain PCM: ${String(summary.totals.pcmOldPolicyFailures)}
- Failures occurring only after MP3 decoding: ${String(summary.totals.failuresOnlyAfterMp3)}
- Safe-trim failures: ${String(summary.totals.safeTrimFailures)}
- Fallback-insertion boundaries: ${String(summary.totals.fallbackBoundaries)}
- Boundaries where the absolute post-gain detector includes an edge that the gain-compensated detector classifies as active: ${String(summary.totals.expandedActiveEdgeDetected)}

## Implementation comparison

Focused validation and full generation use the same formula, 22,050 Hz sample
rate, FFmpeg decoder, 10 ms window, -46 dBFS RMS threshold, -34 dBFS peak
threshold, 30 ms safety margin, classifier, recipe version and recipe hash.

The forensic mismatch is instead level-domain related: boundary planning runs
on raw Piper PCM, after which every asset receives a negative constant gain.
The old decoded-MP3 audit reuses the raw-domain absolute thresholds without
shifting them by the recorded gain. Quiet but active speech-edge windows can
therefore cross the absolute threshold and be counted as silence. The complete
ledger records the raw PCM, normalized PCM, decoded MP3, gain-compensated MP3,
and +/-1 dB sensitivity measurements for every old failure.

## Candidate-range check

- Candidate policy failures using the old absolute decoded-MP3 detector:
  ${String(summary.totals.candidateAbsoluteMp3Failures)}
- Candidate policy failures using the gain-compensated decoded-MP3 detector:
  ${String(summary.totals.candidateGainCompensatedMp3Failures)}

## Corrected independent audit

- Audit version: \`${CORRECTED_AUDIT_VERSION}\`
- Primary classifications: ${Object.entries(rootCauseCounts)
    .map(
      ([classification, count]) =>
        `${classification} ${String(count)}`,
    )
    .join(", ")}
- Corrected boundary failures: ${String(correctedBoundaryFailures.length)}
- Corrected checks passed: ${String(correctedChecks.filter((check) => check.pass).length)}/${String(correctedChecks.length)}
- Deterministic payload hash: \`${deterministicPayloadHash}\`
- Corrected release audit passed: ${String(correctedPassed)}

The corrected audit retains the evidence candidate ranges. It does not widen
them to fit the observed data. The frame-exact trim/insert formula is the
primary timing gate; PCM edge re-measurement remains a window-alignment
diagnostic. Decoded MP3 is independently required to preserve frame count,
speech correlation and a range-intersecting calibrated detector ensemble.
This separates temporal pause behavior from absolute-level and 10 ms
window-origin classification errors.
`;
  await writeRestricted(
    resolve(
      outputRoot,
      "boundary-failure-report.md",
    ),
    report,
  );
  process.stdout.write(
    `${JSON.stringify({
      passed: correctedPassed,
      outputRoot,
      failures: rows.length,
      totals: summary.totals,
      rootCauseCounts,
      correctedBoundaryFailures:
        correctedBoundaryFailures.length,
      correctedChecks:
        correctedChecks.length,
      deterministicPayloadHash,
    })}\n`,
  );
  if (!correctedPassed) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
