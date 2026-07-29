#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import {
  chmod,
  constants,
  copyFile,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rename,
  stat,
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
} from "../src/lib/academy/narration/effective-pause-normalization";
import {
  FINAL_PIPER_RECIPE,
  FINAL_PIPER_RECIPE_HASH,
} from "../src/lib/academy/narration/final-piper-recipe";
import {
  FROZEN_ACADEMY_NARRATION_OVERRIDES,
} from "../src/lib/academy/narration/approved-pronunciations";
import {
  auditNarrationDocumentAlignment,
} from "../src/lib/academy/narration/alignment";
import {
  formatNarrationSpokenScript,
  narrationBlockToSpokenText,
} from "../src/lib/academy/narration/preview";
import {
  renderNarrationDocument,
} from "../src/lib/academy/narration/semantic-renderer";
import {
  buildSemanticBlockPlan,
  INTERNAL_SENTENCE_DETECTOR,
  locateSafeEdgeTrim,
  measureInternalSentencePauses,
  SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
  SEMANTIC_BLOCK_FINAL_RECIPE_VERSION,
  SEMANTIC_BLOCK_REALIZATION_GUARD_MILLISECONDS,
  summarizeSemanticFlowPauses,
  type InternalSentencePauseMeasurement,
  type SemanticBlockPlan,
  type SemanticSentenceUnit,
} from "../src/lib/academy/narration/semantic-block-flow";
import {
  splitPiperEvaluationSentences,
} from "../src/lib/academy/narration/piper-evaluation";
import type {
  NarrationBlock,
} from "../src/lib/academy/narration/contracts";

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
  ): Promise<{
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
    [key: string]: unknown;
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
const PIPER = "/opt/piper/piper";
const MAX_BUFFER = 512 * 1024 * 1024;
const PLAN_SCHEMA =
  "tenxpros-final-piper-academy-generation-plan-v1";
const RESULT_SCHEMA =
  "tenxpros-final-piper-academy-generation-result-v1";
const RECIPE_VERSION =
  "semantic-block-flow-v2-final";
const RECIPE_HASH =
  "0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe";
const VOICE = Object.freeze({
  id: "bryce",
  modelPath:
    "/opt/piper/voices/en_US-bryce-medium.onnx",
  configPath:
    "/opt/piper/voices/en_US-bryce-medium.onnx.json",
  modelSha256:
    "dc9caa6c313199ffb5ac698b6e542fa6cba388aeaf2731e25262e33b9810aef1",
  configSha256:
    "7ceb1bc4af6d4e41b6d1edbb86c67e91e01eaa71f66db4cd0ae92ac704d415be",
});
const LOUDNESS = Object.freeze({
  targetLufs: -19,
  truePeakDbtp: -2,
  mp3EncodingTruePeakHeadroomDb: 1,
  maxPositiveGainDb: 6,
  integratedLufsMin: -22,
  integratedLufsMax: -18,
  truePeakMaxDbtp: -1.5,
});
const STITCH_WARNING_THRESHOLD = 128;

interface LoudnessPlan {
  targetLufs: number;
  truePeakDbtp: number;
  mp3EncodingTruePeakHeadroomDb: number;
  maxPositiveGainDb: number;
  integratedLufsMin: number;
  integratedLufsMax: number;
  truePeakMaxDbtp: number;
}

interface GenerationBlock extends SemanticBlockPlan {
  index: number;
  semanticBlockId: string;
  sourceType: string;
  sourceHash: string;
  spokenHash: string;
}

interface GenerationLesson {
  lessonId: string;
  slug: string;
  order: number;
  title: string;
  contentHash: string;
  spokenScriptHash: string;
  transcriptHash: string;
  transcript: string;
  narrationDocumentHash: string;
  rendererVersion: string;
  normalizationVersion: string;
  pronunciationVersion: string;
  segmentationVersion: string;
  blocks: GenerationBlock[];
}

interface GenerationPlan {
  schemaVersion: typeof PLAN_SCHEMA;
  planHash: string;
  releaseId: string;
  recipeVersion: typeof RECIPE_VERSION;
  recipeHash: typeof RECIPE_HASH;
  parentPlanHash: string;
  recipe: typeof FINAL_PIPER_RECIPE;
  contentReconciliationManifestHash: string;
  sourceContentManifestHash: string;
  expectedAssetCount: 17;
  sampleRate: 22050;
  channels: 1;
  bitrateKbps: 64;
  sentenceSilenceSeconds: 0.15;
  lengthScale: 1;
  voice: typeof VOICE;
  loudness: typeof LOUDNESS;
  stitchWarningThreshold: 128;
  lessons: GenerationLesson[];
}

interface BlockAudio {
  block: GenerationBlock;
  pcm: Buffer;
  wavSha256: string;
  rawFrameCount: number;
  internalPauses: readonly InternalSentencePauseMeasurement[];
  resumed: boolean;
}

interface LayoutEntry {
  blockId: string;
  sourceBlockId: string;
  pauseType: GenerationBlock["pauseType"];
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

interface ReconciliationManifest {
  schemaVersion: string;
  manifestHash: string;
  passed: boolean;
  lessons: Array<{
    lessonId: string;
    moduleSlug: string;
    moduleOrder: number;
    title: string;
    mergedBodyHtml: string;
    mergedBodyHtmlSha256: string;
  }>;
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
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical(record[key])}`,
      )
      .join(",")}}`;
  }
  throw new Error("Canonical JSON rejects unsupported value");
}

async function writeExclusive(
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

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(
    await readFile(path, "utf8"),
  ) as T;
}

function option(
  args: readonly string[],
  name: string,
): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function assertRecipe(
  recipeVersion: string,
  recipeHash: string,
) {
  if (
    recipeVersion !== RECIPE_VERSION ||
    recipeHash !== RECIPE_HASH ||
    FINAL_PIPER_RECIPE.recipeVersion !==
      RECIPE_VERSION ||
    FINAL_PIPER_RECIPE_HASH !== RECIPE_HASH
  ) {
    throw new Error("Frozen recipe identity mismatch");
  }
}

function spokenBlocks(
  blocks: readonly NarrationBlock[],
) {
  return blocks.filter(
    (block) =>
      block.type !== "sectionBreak" &&
      narrationBlockToSpokenText(block).trim().length > 0,
  );
}

function generationBlocks(
  blocks: readonly NarrationBlock[],
): GenerationBlock[] {
  const sourceBlocks = spokenBlocks(blocks);
  const units: SemanticSentenceUnit[] = [];
  const sourceByFlowId = new Map<
    string,
    NarrationBlock
  >();
  for (const [blockIndex, block] of sourceBlocks.entries()) {
    const flowSourceId =
      /\/(?:h[1-6]|p|div|label|field|dd)\[\d+\]$/u.test(
        block.id,
      ) ||
      /\/(?:ol|ul)\[\d+\]\/li\[\d+\]$/u.test(
        block.id,
      ) ||
      /\/table\[\d+\].*\/tr\[\d+\]$/u.test(
        block.id,
      )
        ? block.id
        : block.type === "heading"
          ? `/synthetic/h2[${String(blockIndex + 1)}]`
          : block.type === "paragraph"
            ? `/synthetic/p[${String(blockIndex + 1)}]`
            : block.type === "listItem"
              ? `/synthetic/ul[1]/li[${String(blockIndex + 1)}]`
              : block.type === "tableRow"
                ? `/synthetic/table[1]/tbody[1]/tr[${String(blockIndex + 1)}]`
                : block.type === "formField"
                  ? `/synthetic/label[${String(blockIndex + 1)}]`
                  : `/synthetic/div[${String(blockIndex + 1)}]`;
    if (sourceByFlowId.has(flowSourceId)) {
      throw new Error(
        `Duplicate normalized semantic source ${flowSourceId}`,
      );
    }
    sourceByFlowId.set(flowSourceId, block);
    const text =
      narrationBlockToSpokenText(block);
    const sentences =
      splitPiperEvaluationSentences(text);
    if (sentences.length === 0) {
      throw new Error(
        `Narration block ${block.id} has no sentences`,
      );
    }
    for (const [index, sentence] of sentences.entries()) {
      units.push({
        id: `semantic:${block.id}:sentence[${String(index + 1)}]`,
        sourceBlockId: flowSourceId,
        text: sentence,
        textSha256: sha256(sentence),
        pauseAfterMs:
          index === sentences.length - 1
            ? block.pauseAfterMs
            : 150,
      });
    }
  }
  units.at(-1)!.pauseAfterMs = 0;
  const plans = buildSemanticBlockPlan(
    units,
    SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
  );
  return plans.map((plan, index) => {
    const source = sourceByFlowId.get(
      plan.sourceBlockId,
    );
    if (!source) {
      throw new Error(
        `Missing source block ${plan.sourceBlockId}`,
      );
    }
    return {
      ...plan,
      index,
      semanticBlockId: source.id,
      sourceType: source.type,
      sourceHash: sha256(canonical(source)),
      spokenHash: sha256(
        narrationBlockToSpokenText(source),
      ),
    };
  });
}

async function prepare(
  reconciliationPath: string,
  outputDirectory: string,
  recipeVersion: string,
  recipeHash: string,
) {
  process.umask(0o077);
  assertRecipe(recipeVersion, recipeHash);
  const reconciliation =
    await readJson<ReconciliationManifest>(
      resolve(reconciliationPath),
    );
  if (
    reconciliation.schemaVersion !==
      "tenxpros-academy-content-reconciliation-v1" ||
    !reconciliation.passed ||
    reconciliation.lessons.length !== 17
  ) {
    throw new Error(
      "Content reconciliation is not an approved 17-lesson manifest",
    );
  }
  const lessonPlans =
    reconciliation.lessons
      .sort((left, right) =>
        left.moduleOrder - right.moduleOrder)
      .map((lesson): GenerationLesson => {
        if (
          sha256(lesson.mergedBodyHtml) !==
          lesson.mergedBodyHtmlSha256
        ) {
          throw new Error(
            `${lesson.moduleSlug}: merged content hash drift`,
          );
        }
        const document =
          renderNarrationDocument({
            slug: lesson.moduleSlug,
            title: lesson.title,
            html: lesson.mergedBodyHtml,
            contentRevisionHash:
              lesson.mergedBodyHtmlSha256,
            overrides:
              FROZEN_ACADEMY_NARRATION_OVERRIDES,
          });
        const alignment =
          auditNarrationDocumentAlignment(document);
        if (
          alignment.summary.blocksByClassification
            .REQUIRES_OWNER_REVIEW !== 0 ||
          alignment.summary.blocksByClassification
            .INVALID_SEMANTIC_DRIFT !== 0 ||
          document.warnings.some(
            (warning) =>
              warning.severity === "error",
          )
        ) {
          throw new Error(
            `${lesson.moduleSlug}: narration alignment failed`,
          );
        }
        const transcript =
          audioRuntime.normalizeWhitespace(
            formatNarrationSpokenScript(
              document.blocks,
            ),
          );
        const blocks = generationBlocks(
          document.blocks,
        );
        const reconstructed =
          audioRuntime.normalizeWhitespace(
            blocks
              .map(
                (block) =>
                  block.synthesisText,
              )
              .join(" "),
          );
        if (
          !transcript ||
          reconstructed !== transcript
        ) {
          throw new Error(
            `${lesson.moduleSlug}: exact transcript reconstruction failed`,
          );
        }
        return {
          lessonId: lesson.lessonId,
          slug: lesson.moduleSlug,
          order: lesson.moduleOrder,
          title: lesson.title,
          contentHash:
            lesson.mergedBodyHtmlSha256,
          spokenScriptHash: sha256(
            formatNarrationSpokenScript(
              document.blocks,
            ),
          ),
          transcriptHash: sha256(transcript),
          transcript,
          narrationDocumentHash: sha256(
            canonical(document),
          ),
          rendererVersion:
            document.recipe.versions.renderer,
          normalizationVersion:
            document.recipe.versions
              .normalization,
          pronunciationVersion:
            document.recipe.versions
              .pronunciation,
          segmentationVersion:
            document.recipe.versions
              .segmentation,
          blocks,
        };
      });
  if (
    new Set(
      lessonPlans.map((lesson) => lesson.slug),
    ).size !== 17 ||
    lessonPlans.some(
      (lesson, index) =>
        lesson.order !== index + 1,
    )
  ) {
    throw new Error(
      "Lesson identity/order is not exactly 1..17",
    );
  }
  const sourceContentManifestHash = sha256(
    canonical(
      lessonPlans.map((lesson) => ({
        lessonId: lesson.lessonId,
        slug: lesson.slug,
        order: lesson.order,
        contentHash: lesson.contentHash,
        spokenScriptHash:
          lesson.spokenScriptHash,
      })),
    ),
  );
  const releaseId =
    `academy-bryce-${RECIPE_VERSION}-${sourceContentManifestHash.slice(0, 16)}`;
  const withoutHash = {
    schemaVersion: PLAN_SCHEMA,
    releaseId,
    recipeVersion: RECIPE_VERSION,
    recipeHash: RECIPE_HASH,
    parentPlanHash:
      FINAL_PIPER_RECIPE.parent.planHash,
    recipe: FINAL_PIPER_RECIPE,
    contentReconciliationManifestHash:
      reconciliation.manifestHash,
    sourceContentManifestHash,
    expectedAssetCount: 17,
    sampleRate: 22_050,
    channels: 1,
    bitrateKbps: 64,
    sentenceSilenceSeconds: 0.15,
    lengthScale: 1,
    voice: VOICE,
    loudness: LOUDNESS,
    stitchWarningThreshold:
      STITCH_WARNING_THRESHOLD,
    lessons: lessonPlans,
  } as const;
  const plan: GenerationPlan = {
    ...withoutHash,
    planHash: sha256(canonical(withoutHash)),
  };
  const output = resolve(outputDirectory);
  await mkdir(output, {
    recursive: true,
    mode: 0o700,
  });
  await chmod(output, 0o700);
  const planPath = resolve(
    output,
    "generation-plan.json",
  );
  try {
    const existing =
      await readJson<GenerationPlan>(planPath);
    if (canonical(existing) !== canonical(plan)) {
      throw new Error(
        "An immutable generation plan already exists with different content",
      );
    }
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code ===
      "ENOENT"
    ) {
      await writeExclusive(
        planPath,
        `${JSON.stringify(plan, null, 2)}\n`,
      );
    } else {
      throw error;
    }
  }
  process.stdout.write(
    `${JSON.stringify({
      planPath,
      planHash: plan.planHash,
      releaseId,
      lessons: lessonPlans.length,
      blocks: lessonPlans.reduce(
        (sum, lesson) =>
          sum + lesson.blocks.length,
        0,
      ),
      sourceContentManifestHash,
    })}\n`,
  );
}

function validatePlan(
  plan: GenerationPlan,
): GenerationPlan {
  assertRecipe(
    plan.recipeVersion,
    plan.recipeHash,
  );
  const {
    planHash,
    ...withoutHash
  } = plan;
  if (
    plan.schemaVersion !== PLAN_SCHEMA ||
    sha256(canonical(withoutHash)) !==
      planHash ||
    plan.expectedAssetCount !== 17 ||
    plan.lessons.length !== 17 ||
    plan.sampleRate !== 22_050 ||
    plan.channels !== 1 ||
    plan.bitrateKbps !== 64 ||
    plan.sentenceSilenceSeconds !== 0.15 ||
    plan.lengthScale !== 1 ||
    plan.voice.id !== "bryce" ||
    plan.stitchWarningThreshold !== 128
  ) {
    throw new Error(
      "Generation plan scope/hash is invalid",
    );
  }
  for (const [index, lesson] of plan.lessons.entries()) {
    if (
      lesson.order !== index + 1 ||
      lesson.blocks.length === 0 ||
      sha256(
        audioRuntime.normalizeWhitespace(
          lesson.blocks
            .map((block) => block.synthesisText)
            .join(" "),
        ),
      ) !== lesson.transcriptHash
    ) {
      throw new Error(
        `${lesson.slug}: generation plan lesson is invalid`,
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
  return pcm.subarray(
    startFrame * 2,
    endFrame * 2,
  );
}

async function loadOrSynthesizeBlock(input: {
  lesson: GenerationLesson;
  block: GenerationBlock;
  plan: GenerationPlan;
  outputDirectory: string;
  temporaryDirectory: string;
}): Promise<BlockAudio> {
  const chunkDirectory = resolve(
    input.outputDirectory,
    "chunks",
    input.lesson.slug,
  );
  await mkdir(chunkDirectory, {
    recursive: true,
    mode: 0o700,
  });
  await chmod(chunkDirectory, 0o700);
  const prefix = String(
    input.block.index + 1,
  ).padStart(4, "0");
  const wavPath = resolve(
    chunkDirectory,
    `${prefix}.wav`,
  );
  const recordPath = resolve(
    chunkDirectory,
    `${prefix}.json`,
  );
  let resumed = false;
  let parsed:
    | ReturnType<
        typeof audioRuntime.parseWav
      >
    | undefined;
  try {
    const record = await readJson<{
      planHash: string;
      lessonSlug: string;
      blockId: string;
      sourceHash: string;
      spokenHash: string;
      wavSha256: string;
      frameCount: number;
    }>(recordPath);
    const bytes = await readFile(wavPath);
    parsed = audioRuntime.parseWav(
      bytes,
      input.plan.sampleRate,
      `${input.lesson.slug}/${input.block.id}`,
    );
    if (
      record.planHash !== input.plan.planHash ||
      record.lessonSlug !==
        input.lesson.slug ||
      record.blockId !== input.block.id ||
      record.sourceHash !==
        input.block.sourceHash ||
      record.spokenHash !==
        input.block.spokenHash ||
      record.wavSha256 !==
        parsed.wavSha256 ||
      record.frameCount !==
        parsed.frameCount
    ) {
      throw new Error(
        `${input.lesson.slug}/${input.block.id}: completed chunk drift`,
      );
    }
    resumed = true;
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code !==
      "ENOENT"
    ) {
      throw error;
    }
    const temporaryWav = resolve(
      input.temporaryDirectory,
      `${input.lesson.slug}-${prefix}.wav`,
    );
    await audioRuntime.synthesizePiper(
      input.block.synthesisText,
      input.plan.voice.modelPath,
      input.plan.voice.configPath,
      input.plan.sentenceSilenceSeconds,
      input.plan.lengthScale,
      temporaryWav,
      input.temporaryDirectory,
    );
    parsed = audioRuntime.parseWav(
      await readFile(temporaryWav),
      input.plan.sampleRate,
      `${input.lesson.slug}/${input.block.id}`,
    );
    const temporaryPersisted = resolve(
      chunkDirectory,
      `.${prefix}.${process.pid}.wav`,
    );
    await copyFile(
      temporaryWav,
      temporaryPersisted,
      constants.COPYFILE_EXCL,
    );
    await chmod(temporaryPersisted, 0o600);
    await rename(temporaryPersisted, wavPath);
    await writeExclusive(
      recordPath,
      `${JSON.stringify(
        {
          schemaVersion:
            "tenxpros-final-piper-chunk-progress-v1",
          planHash: input.plan.planHash,
          lessonSlug: input.lesson.slug,
          blockIndex: input.block.index,
          blockId: input.block.id,
          blockType: input.block.sourceType,
          sourceHash: input.block.sourceHash,
          spokenHash: input.block.spokenHash,
          generationStatus: "COMPLETE",
          wavSha256: parsed.wavSha256,
          frameCount: parsed.frameCount,
          generatedAt:
            new Date().toISOString(),
          retryCount: 0,
          resumed: false,
        },
        null,
        2,
      )}\n`,
    );
  }
  const internalPauses =
    measureInternalSentencePauses(
      pcmView(parsed.pcm),
      {
        sentenceCount:
          input.block.sentenceCount,
        sentenceSilenceSeconds:
          input.plan
            .sentenceSilenceSeconds,
        detector:
          INTERNAL_SENTENCE_DETECTOR,
      },
    );
  return {
    block: input.block,
    pcm: parsed.pcm,
    wavSha256: parsed.wavSha256,
    rawFrameCount: parsed.frameCount,
    internalPauses,
    resumed,
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
  const nextValue =
    input.next.readInt16LE(
      input.leadingTrimFrames * 2,
    );
  return {
    speechToPauseAbsoluteDelta:
      input.pauseFrames === 0
        ? Math.abs(nextValue - previousValue)
        : Math.abs(previousValue),
    pauseToSpeechAbsoluteDelta:
      input.pauseFrames === 0
        ? Math.abs(nextValue - previousValue)
        : Math.abs(nextValue),
    maximumAbsoluteDelta:
      input.pauseFrames === 0
        ? Math.abs(nextValue - previousValue)
        : Math.max(
            Math.abs(previousValue),
            Math.abs(nextValue),
          ),
  };
}

async function decodeMp3(
  path: string,
): Promise<Buffer> {
  const result =
    await audioRuntime.runCommand(
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

function decodedBoundaryMeasurements(input: {
  pcm: Buffer;
  layout: readonly LayoutEntry[];
}) {
  return input.layout
    .slice(0, -1)
    .map((previous, index) => {
      const next = input.layout[index + 1]!;
      const trailing = measureLowEnergyEdge(
        pcmView(
          pcmSlice(
            input.pcm,
            previous.speechStartFrame,
            previous.speechEndFrame,
          ),
        ),
        "trailing",
        DEFAULT_LOW_ENERGY_DETECTOR,
      );
      const leading = measureLowEnergyEdge(
        pcmView(
          pcmSlice(
            input.pcm,
            next.speechStartFrame,
            next.speechEndFrame,
          ),
        ),
        "leading",
        DEFAULT_LOW_ENERGY_DETECTOR,
      );
      const effectiveFrames =
        trailing.lowEnergyFrames +
        previous.pauseFrames +
        leading.lowEnergyFrames;
      const previousValue =
        input.pcm.readInt16LE(
          (previous.speechEndFrame - 1) * 2,
        );
      const nextValue =
        input.pcm.readInt16LE(
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
              (previous.pauseEndFrame - 1) *
                2,
            );
      return {
        boundaryIndex: index,
        previousBlockId:
          previous.blockId,
        nextBlockId: next.blockId,
        pauseType: previous.pauseType,
        detectedTrailingSilenceMilliseconds:
          trailing.lowEnergyMilliseconds,
        detectedLeadingSilenceMilliseconds:
          leading.lowEnergyMilliseconds,
        insertedSilenceMilliseconds:
          framesToMilliseconds(
            previous.pauseFrames,
            22_050,
          ),
        effectivePauseMilliseconds:
          framesToMilliseconds(
            effectiveFrames,
            22_050,
          ),
        discontinuity: {
          speechToPauseAbsoluteDelta:
            Math.abs(
              pauseFirst - previousValue,
            ),
          pauseToSpeechAbsoluteDelta:
            Math.abs(
              nextValue - pauseLast,
            ),
          maximumAbsoluteDelta: Math.max(
            Math.abs(
              pauseFirst - previousValue,
            ),
            Math.abs(nextValue - pauseLast),
          ),
        },
      };
    });
}

async function existingAsset(
  lesson: GenerationLesson,
  plan: GenerationPlan,
  outputDirectory: string,
) {
  const assetPath = resolve(
    outputDirectory,
    "assets",
    `${lesson.slug}.mp3`,
  );
  const manifestPath = resolve(
    outputDirectory,
    "asset-manifests",
    `${lesson.slug}.json`,
  );
  try {
    const manifest =
      await readJson<Record<string, unknown>>(
        manifestPath,
      );
    if (
      manifest.planHash !== plan.planHash ||
      manifest.releaseId !==
        plan.releaseId ||
      manifest.lessonId !==
        lesson.lessonId ||
      manifest.lessonSlug !== lesson.slug ||
      manifest.contentHash !==
        lesson.contentHash ||
      manifest.spokenScriptHash !==
        lesson.spokenScriptHash ||
      manifest.checksumSha256 !==
        (await audioRuntime.sha256File(
          assetPath,
        )) ||
      manifest.passed !== true
    ) {
      throw new Error(
        `${lesson.slug}: immutable completed asset drift`,
      );
    }
    return manifest;
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code ===
      "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

async function generateLesson(input: {
  lesson: GenerationLesson;
  plan: GenerationPlan;
  outputDirectory: string;
  temporaryRoot: string;
}) {
  const completed = await existingAsset(
    input.lesson,
    input.plan,
    input.outputDirectory,
  );
  if (completed) {
    return {
      manifest: completed,
      generated: false,
      synthesizedChunks: 0,
    };
  }
  const lessonTemporary = await mkdtemp(
    join(
      input.temporaryRoot,
      `${input.lesson.slug}-`,
    ),
  );
  const blocks: BlockAudio[] = [];
  for (const block of input.lesson.blocks) {
    blocks.push(
      await loadOrSynthesizeBlock({
        lesson: input.lesson,
        block,
        plan: input.plan,
        outputDirectory:
          input.outputDirectory,
        temporaryDirectory:
          lessonTemporary,
      }),
    );
  }
  const leadingTrims =
    Array<number>(blocks.length).fill(0);
  const trailingTrims =
    Array<number>(blocks.length).fill(0);
  const boundaryPlans = [];
  for (
    let index = 0;
    index < blocks.length - 1;
    index += 1
  ) {
    const previous = blocks[index]!;
    const next = blocks[index + 1]!;
    if (previous.block.pauseType === "end") {
      throw new Error(
        `${input.lesson.slug}: premature end block`,
      );
    }
    const trailing = measureLowEnergyEdge(
      pcmView(previous.pcm),
      "trailing",
      DEFAULT_LOW_ENERGY_DETECTOR,
    );
    const leading = measureLowEnergyEdge(
      pcmView(next.pcm),
      "leading",
      DEFAULT_LOW_ENERGY_DETECTOR,
    );
    const realizationTargetMilliseconds =
      previous.block
        .effectivePauseTargetMilliseconds -
      (previous.block.pauseType ===
      "tableRow"
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
          DEFAULT_LOW_ENERGY_DETECTOR,
      });
    const safetyFrames =
      millisecondsToNearestFrames(
        DEFAULT_LOW_ENERGY_DETECTOR
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
        DEFAULT_LOW_ENERGY_DETECTOR,
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
        DEFAULT_LOW_ENERGY_DETECTOR,
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
      boundaryIndex: index,
      previousBlockId:
        previous.block.id,
      nextBlockId: next.block.id,
      pauseType:
        previous.block.pauseType,
      targetMilliseconds:
        previous.block
          .effectivePauseTargetMilliseconds,
      realizationTargetMilliseconds,
      detectedTrailingPaddingFrames:
        trailing.lowEnergyFrames,
      detectedLeadingPaddingFrames:
        leading.lowEnergyFrames,
      appliedTrailingTrimFrames:
        trailingTrim,
      appliedLeadingTrimFrames:
        leadingTrim,
      insertedSilenceFrames: pauseFrames,
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
  const layout: LayoutEntry[] = [];
  let cursor = 0;
  for (
    let index = 0;
    index < blocks.length;
    index += 1
  ) {
    const block = blocks[index]!;
    const leading = leadingTrims[index]!;
    const trailing = trailingTrims[index]!;
    const adjusted = pcmSlice(
      block.pcm,
      leading,
      block.pcm.length / 2 - trailing,
    );
    if (adjusted.length === 0) {
      throw new Error(
        `${input.lesson.slug}/${block.block.id}: speech was truncated`,
      );
    }
    const boundary = boundaryPlans[index];
    const pauseFrames =
      boundary?.insertedSilenceFrames ?? 0;
    const speechStartFrame = cursor;
    const speechEndFrame =
      cursor + adjusted.length / 2;
    const pauseStartFrame =
      speechEndFrame;
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
        block.internalPauses.map(
          (pause) => ({
            startFrame:
              speechStartFrame +
              pause.anchorStartFrame -
              leading,
            endFrame:
              speechStartFrame +
              pause.anchorEndFrame -
              leading,
          }),
        ),
    });
    parts.push(
      adjusted,
      Buffer.alloc(pauseFrames * 2),
    );
    cursor = pauseEndFrame;
  }
  const prePath = resolve(
    lessonTemporary,
    "stitched-pre.wav",
  );
  const postPath = resolve(
    lessonTemporary,
    "stitched-post.wav",
  );
  await writeExclusive(
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
        input.plan.loudness
          .maxPositiveGainDb,
      ) * 1_000_000,
    ) / 1_000_000;
  await audioRuntime.applyConstantGain(
    prePath,
    postPath,
    gainDb,
    input.plan.sampleRate,
  );
  const assetsDirectory = resolve(
    input.outputDirectory,
    "assets",
  );
  await mkdir(assetsDirectory, {
    recursive: true,
    mode: 0o700,
  });
  await chmod(assetsDirectory, 0o700);
  const temporaryMp3 = resolve(
    lessonTemporary,
    `${input.lesson.slug}.mp3`,
  );
  await audioRuntime.encodeLame(
    postPath,
    temporaryMp3,
    lessonTemporary,
  );
  let selectedMp3 = temporaryMp3;
  let effectiveGainDb = gainDb;
  let mp3Audit =
    await audioRuntime.auditMp3(
      temporaryMp3,
      {
        fileName:
          `${input.lesson.slug}.mp3`,
        pipeline: "corrected",
        maximumDurationSeconds: null,
      },
      {
        sampleRate: input.plan.sampleRate,
        loudness: input.plan.loudness,
      },
    );
  // Constant-gain normalization reserves the frozen 1 dB MP3 headroom. Very
  // long files can land a few tenths below the approved LUFS window after
  // psychoacoustic encoding. A single measured correction pass is allowed
  // only inside the existing loudness and true-peak gates; it does not change
  // speech rate, pauses, segmentation, wording, or recipe targets.
  if (
    mp3Audit.ebur128.integratedLufs < -22 ||
    mp3Audit.ebur128.integratedLufs > -18
  ) {
    const desiredIntegratedLufs = -20.5;
    const requestedCorrection =
      desiredIntegratedLufs -
      mp3Audit.ebur128.integratedLufs;
    const peakLimitedCorrection =
      requestedCorrection > 0
        ? Math.min(
            requestedCorrection,
            input.plan.loudness
              .truePeakMaxDbtp -
              0.2 -
              mp3Audit.ebur128.truePeakDbtp,
          )
        : requestedCorrection;
    if (Math.abs(peakLimitedCorrection) >= 0.05) {
      effectiveGainDb =
        Math.round(
          (gainDb + peakLimitedCorrection) *
            1_000_000,
        ) / 1_000_000;
      const correctedPostPath = resolve(
        lessonTemporary,
        "stitched-post-corrected.wav",
      );
      const correctedMp3Path = resolve(
        lessonTemporary,
        `${input.lesson.slug}-corrected.mp3`,
      );
      await audioRuntime.applyConstantGain(
        prePath,
        correctedPostPath,
        effectiveGainDb,
        input.plan.sampleRate,
      );
      await audioRuntime.encodeLame(
        correctedPostPath,
        correctedMp3Path,
        lessonTemporary,
      );
      selectedMp3 = correctedMp3Path;
      mp3Audit =
        await audioRuntime.auditMp3(
          selectedMp3,
          {
            fileName:
              `${input.lesson.slug}.mp3`,
            pipeline: "corrected",
            maximumDurationSeconds: null,
          },
          {
            sampleRate:
              input.plan.sampleRate,
            loudness:
              input.plan.loudness,
          },
        );
    }
  }
  const decoded =
    await decodeMp3(selectedMp3);
  if (
    decoded.length / 2 !==
    layout.at(-1)!.pauseEndFrame
  ) {
    throw new Error(
      `${input.lesson.slug}: decoded layout/frame count drift`,
    );
  }
  const measuredBoundaries =
    decodedBoundaryMeasurements({
      pcm: decoded,
      layout,
    });
  const internalPauses =
    layout.flatMap((entry, index) => {
      const block = blocks[index]!;
      return measureInternalSentencePauses(
        pcmView(
          pcmSlice(
            decoded,
            entry.speechStartFrame,
            entry.speechEndFrame,
          ),
        ),
        {
          sentenceCount:
            block.block.sentenceCount,
          sentenceSilenceSeconds:
            input.plan
              .sentenceSilenceSeconds,
          detector:
            INTERNAL_SENTENCE_DETECTOR,
          expectedAnchors:
            entry.internalAnchors.map(
              (anchor) => ({
                startFrame:
                  anchor.startFrame -
                  entry.speechStartFrame,
                endFrame:
                  anchor.endFrame -
                  entry.speechStartFrame,
              }),
            ),
        },
      ).map((pause) => ({
        blockId: block.block.id,
        ...pause,
      }));
    });
  const referenceThresholdObservations =
    measuredBoundaries.filter(
      (boundary) =>
        boundary.discontinuity
          .maximumAbsoluteDelta >
        input.plan.stitchWarningThreshold,
    );
  const lowEnergyPeakAbsoluteSample =
    Math.round(
      32_768 *
        10 **
          (DEFAULT_LOW_ENERGY_DETECTOR
            .peakThresholdDbfs /
            20),
    );
  const stitchWarnings =
    referenceThresholdObservations.filter(
      (boundary) =>
        boundary.discontinuity
          .maximumAbsoluteDelta >
        Math.max(
          input.plan.stitchWarningThreshold,
          lowEnergyPeakAbsoluteSample,
        ),
    );
  const reconstructed =
    audioRuntime.normalizeWhitespace(
      blocks
        .map(
          (block) =>
            block.block.synthesisText,
        )
        .join(" "),
    );
  const blockIds = blocks.map(
    (block) => block.block.id,
  );
  const checks = [
    {
      id: "NON_ZERO_MP3",
      pass: mp3Audit.fileSizeBytes > 0,
    },
    {
      id: "MP3_DECODES",
      pass: decoded.length > 0,
    },
    {
      id: "EXACT_BLOCK_COUNT",
      pass:
        blocks.length ===
        input.lesson.blocks.length,
    },
    {
      id: "EXACT_BLOCK_ORDER",
      pass:
        canonical(blockIds) ===
        canonical(
          input.lesson.blocks.map(
            (block) => block.id,
          ),
        ),
    },
    {
      id: "NO_DUPLICATED_BLOCK",
      pass:
        new Set(blockIds).size ===
        blockIds.length,
    },
    {
      id: "EXACT_TRANSCRIPT_RECONSTRUCTION",
      pass:
        sha256(reconstructed) ===
        input.lesson.transcriptHash,
    },
    {
      id: "NO_TRUNCATED_BLOCK",
      pass: layout.every(
        (entry) =>
          entry.speechEndFrame >
          entry.speechStartFrame,
      ),
    },
    {
      id: "ZERO_STITCH_DISCONTINUITY_WARNINGS",
      pass: stitchWarnings.length === 0,
    },
    {
      id: "SAFE_TRIM_OR_INSERTION_ONLY",
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
  const passed = checks.every(
    (check) => check.pass,
  );
  if (!passed) {
    await writeExclusive(
      resolve(
        input.outputDirectory,
        "failures",
        `${input.lesson.slug}-${new Date()
          .toISOString()
          .replace(/[:.]/gu, "-")}.json`,
      ),
      `${JSON.stringify(
        {
          schemaVersion:
            "tenxpros-final-piper-asset-failure-v1",
          planHash: input.plan.planHash,
          lessonSlug: input.lesson.slug,
          preLoudness,
          appliedGainDb: effectiveGainDb,
          mp3Audit,
          boundaryPlans,
          measuredBoundaries,
          internalPauses,
          referenceThresholdObservations,
          lowEnergyPeakAbsoluteSample,
          stitchWarnings,
          checks,
        },
        null,
        2,
      )}\n`,
    );
    throw new Error(
      `${input.lesson.slug}: asset audit failed (${checks
        .filter((check) => !check.pass)
        .map((check) => check.id)
        .join(", ")})`,
    );
  }
  const finalPath = resolve(
    assetsDirectory,
    `${input.lesson.slug}.mp3`,
  );
  await copyFile(
    selectedMp3,
    finalPath,
    constants.COPYFILE_EXCL,
  );
  await chmod(finalPath, 0o600);
  const checksumSha256 =
    await audioRuntime.sha256File(finalPath);
  const chunkRecords = blocks.map(
    (block, index) => {
      const boundary =
        measuredBoundaries[index];
      return {
        blockIndex: index,
        semanticBlockId:
          block.block.semanticBlockId,
        blockType:
          block.block.sourceType,
        sourceHash:
          block.block.sourceHash,
        spokenHash:
          block.block.spokenHash,
        generationStatus: "COMPLETE",
        pcmChecksum: block.wavSha256,
        measuredLeadingSilenceMs:
          boundary
            ?.detectedLeadingSilenceMilliseconds ??
          null,
        measuredTrailingSilenceMs:
          boundary
            ?.detectedTrailingSilenceMilliseconds ??
          null,
        insertedSilenceMs:
          boundary
            ?.insertedSilenceMilliseconds ??
          0,
        effectiveBoundaryPauseMs:
          boundary
            ?.effectivePauseMilliseconds ??
          null,
        retryCount: 0,
        resumed: block.resumed,
      };
    },
  );
  const manifest = {
    schemaVersion:
      "tenxpros-final-piper-academy-asset-v1",
    planHash: input.plan.planHash,
    releaseId: input.plan.releaseId,
    recipeVersion:
      input.plan.recipeVersion,
    recipeHash: input.plan.recipeHash,
    voiceId: input.plan.voice.id,
    lessonId: input.lesson.lessonId,
    lessonSlug: input.lesson.slug,
    lessonOrder: input.lesson.order,
    contentHash: input.lesson.contentHash,
    spokenScriptHash:
      input.lesson.spokenScriptHash,
    transcriptHash:
      input.lesson.transcriptHash,
    mimeType: "audio/mpeg",
    durationSeconds:
      mp3Audit.durationSeconds,
    sampleRate: input.plan.sampleRate,
    channels: input.plan.channels,
    bitrateKbps:
      input.plan.bitrateKbps,
    sizeBytes: mp3Audit.fileSizeBytes,
    checksumSha256,
    integratedLufs:
      mp3Audit.ebur128.integratedLufs,
    truePeakDbtp:
      mp3Audit.ebur128.truePeakDbtp,
    appliedGainDb: effectiveGainDb,
    preLoudness,
    generatedAt: new Date().toISOString(),
    generationMetadata: {
      piperBinary: PIPER,
      sentenceSilenceSeconds:
        input.plan.sentenceSilenceSeconds,
      lengthScale:
        input.plan.lengthScale,
      rawChunkCount: blocks.length,
      resumedChunkCount: blocks.filter(
        (block) => block.resumed,
      ).length,
      externalApiCalls: 0,
    },
    mp3Audit,
    layout,
    boundaryPlans,
    measuredBoundaries,
    referenceThresholdObservations,
    lowEnergyPeakAbsoluteSample,
    internalPauses,
    stitchDiscontinuityWarnings:
      stitchWarnings,
    chunkRecords,
    checks,
    passed,
  };
  await writeExclusive(
    resolve(
      input.outputDirectory,
      "asset-manifests",
      `${input.lesson.slug}.json`,
    ),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return {
    manifest,
    generated: true,
    synthesizedChunks: blocks.filter(
      (block) => !block.resumed,
    ).length,
  };
}

function pauseGate(
  type: string,
  value: number,
) {
  if (type === "paragraph") {
    return value >= 790 && value <= 850;
  }
  if (type === "callout") {
    return value >= 680 && value <= 750;
  }
  if (type === "heading") {
    return value >= 880 && value <= 950;
  }
  if (type === "section") {
    return value >= 1_020 && value <= 1_150;
  }
  if (type === "list") {
    return value >= 280 && value <= 330;
  }
  if (type === "tableRow") {
    return value >= 240 && value <= 300;
  }
  return false;
}

async function listFiles(
  path: string,
  suffix: string,
) {
  try {
    return (await readdir(path))
      .filter((file) => file.endsWith(suffix))
      .sort();
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code ===
      "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
}

async function generate(
  planPath: string,
  outputDirectory: string,
) {
  process.umask(0o077);
  const isolation =
    audioRuntime.networkIsolationState();
  if (!isolation.isolated) {
    throw new Error(
      "Full Piper generation requires --network none and no DATABASE_URL",
    );
  }
  const plan = validatePlan(
    await readJson<GenerationPlan>(
      resolve(planPath),
    ),
  );
  if (
    (await audioRuntime.sha256File(
      plan.voice.modelPath,
    )) !== plan.voice.modelSha256 ||
    (await audioRuntime.sha256File(
      plan.voice.configPath,
    )) !== plan.voice.configSha256
  ) {
    throw new Error(
      "Pinned Bryce model/config hashes changed",
    );
  }
  const output = resolve(outputDirectory);
  await mkdir(output, {
    recursive: true,
    mode: 0o700,
  });
  await chmod(output, 0o700);
  const startedAt = new Date();
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "tenxpros-final-piper-"),
  );
  const generated = [];
  for (const lesson of plan.lessons) {
    process.stdout.write(
      `Generating/auditing ${String(lesson.order).padStart(2, "0")}/17 ${lesson.slug}\n`,
    );
    generated.push(
      await generateLesson({
        lesson,
        plan,
        outputDirectory: output,
        temporaryRoot,
      }),
    );
  }
  const assetFiles = await listFiles(
    resolve(output, "assets"),
    ".mp3",
  );
  const manifestFiles = await listFiles(
    resolve(output, "asset-manifests"),
    ".json",
  );
  const expectedFiles = plan.lessons.map(
    (lesson) => `${lesson.slug}.mp3`,
  );
  const manifests = generated.map(
    (result) =>
      result.manifest as {
        lessonSlug: string;
        lessonOrder: number;
        checksumSha256: string;
        sizeBytes: number;
        durationSeconds: number;
        integratedLufs: number;
        truePeakDbtp: number;
        contentHash: string;
        spokenScriptHash: string;
        recipeHash: string;
        measuredBoundaries: Array<{
          pauseType: string;
          effectivePauseMilliseconds: number;
        }>;
        internalPauses: Array<{
          effectivePauseMilliseconds: number;
        }>;
        stitchDiscontinuityWarnings: unknown[];
        chunkRecords: unknown[];
        passed: boolean;
      },
  );
  const sentenceSummary =
    summarizeSemanticFlowPauses(
      manifests.flatMap((manifest) =>
        manifest.internalPauses.map(
          (pause) =>
            pause.effectivePauseMilliseconds,
        ),
      ),
    );
  const boundaries = manifests.flatMap(
    (manifest) =>
      manifest.measuredBoundaries,
  );
  const chunkFiles = (
    await Promise.all(
      plan.lessons.map(async (lesson) => ({
        slug: lesson.slug,
        wav: await listFiles(
          resolve(
            output,
            "chunks",
            lesson.slug,
          ),
          ".wav",
        ),
        json: await listFiles(
          resolve(
            output,
            "chunks",
            lesson.slug,
          ),
          ".json",
        ),
      })),
    )
  );
  const checks = [
    {
      id: "EXACTLY_17_ASSETS",
      pass:
        assetFiles.length === 17 &&
        manifestFiles.length === 17,
      details: {
        assetFiles: assetFiles.length,
        manifestFiles:
          manifestFiles.length,
      },
    },
    {
      id: "EXACT_EXPECTED_SLUGS_AND_ORDER",
      pass:
        canonical(assetFiles) ===
        canonical(
          [...expectedFiles].sort(),
        ) &&
        manifests
          .sort(
            (left, right) =>
              left.lessonOrder -
              right.lessonOrder,
          )
          .every(
            (manifest, index) =>
              manifest.lessonSlug ===
              plan.lessons[index]!.slug,
          ),
    },
    {
      id: "ALL_ASSET_AUDITS_PASS",
      pass: manifests.every(
        (manifest) => manifest.passed,
      ),
    },
    {
      id: "EXACT_RECIPE_AND_CONTENT_HASHES",
      pass: manifests.every(
        (manifest) => {
          const lesson = plan.lessons.find(
            (candidate) =>
              candidate.slug ===
              manifest.lessonSlug,
          )!;
          return (
            manifest.recipeHash ===
              plan.recipeHash &&
            manifest.contentHash ===
              lesson.contentHash &&
            manifest.spokenScriptHash ===
              lesson.spokenScriptHash
          );
        },
      ),
    },
    {
      id: "LOUDNESS_AND_TRUE_PEAK_PASS",
      pass: manifests.every(
        (manifest) =>
          manifest.integratedLufs >= -22 &&
          manifest.integratedLufs <= -18 &&
          manifest.truePeakDbtp <= -1.5,
      ),
    },
    {
      id: "INTERNAL_SENTENCE_MEDIAN_180_TO_300_MS",
      pass:
        sentenceSummary.medianMilliseconds !==
          null &&
        sentenceSummary.medianMilliseconds >=
          180 &&
        sentenceSummary.medianMilliseconds <=
          300,
      details: sentenceSummary,
    },
    {
      id: "INTERNAL_SENTENCE_P95_AT_MOST_375_MS",
      pass:
        sentenceSummary.p95Milliseconds !==
          null &&
        sentenceSummary.p95Milliseconds <=
          375,
      details: sentenceSummary,
    },
    {
      id: "ALL_EFFECTIVE_BOUNDARIES_PASS",
      pass:
        boundaries.length > 0 &&
        boundaries.every((boundary) =>
          pauseGate(
            boundary.pauseType,
            boundary.effectivePauseMilliseconds,
          ),
        ),
      details: {
        count: boundaries.length,
        failed: boundaries.filter(
          (boundary) =>
            !pauseGate(
              boundary.pauseType,
              boundary.effectivePauseMilliseconds,
            ),
        ),
      },
    },
    {
      id: "ZERO_STITCH_WARNINGS",
      pass: manifests.every(
        (manifest) =>
          manifest
            .stitchDiscontinuityWarnings
            .length === 0,
      ),
    },
    {
      id: "ZERO_UNRESOLVED_OR_ORPHAN_CHUNKS",
      pass: chunkFiles.every((lesson) => {
        const expected =
          plan.lessons.find(
            (candidate) =>
              candidate.slug === lesson.slug,
          )!.blocks.length;
        return (
          lesson.wav.length === expected &&
          lesson.json.length === expected
        );
      }),
      details: chunkFiles.map((lesson) => ({
        slug: lesson.slug,
        wav: lesson.wav.length,
        records: lesson.json.length,
      })),
    },
    {
      id: "ZERO_EXTERNAL_API_CALLS",
      pass:
        isolation.isolated &&
        !isolation.hasDefaultRoute &&
        !isolation.databaseUrlPresent,
      details: isolation,
    },
  ];
  const passed = checks.every(
    (check) => check.pass,
  );
  const completedAt = new Date();
  const releaseManifestWithoutHash = {
    schemaVersion: RESULT_SCHEMA,
    releaseId: plan.releaseId,
    planHash: plan.planHash,
    recipeVersion: plan.recipeVersion,
    recipeHash: plan.recipeHash,
    sourceContentManifestHash:
      plan.sourceContentManifestHash,
    generationStartedAt:
      startedAt.toISOString(),
    generationCompletedAt:
      completedAt.toISOString(),
    generationDurationSeconds:
      (completedAt.getTime() -
        startedAt.getTime()) /
      1_000,
    isolation: {
      ...isolation,
      externalApiCalls: 0,
      externalTtsCalls: 0,
      databaseAccess: 0,
    },
    generatedAssetCount:
      generated.filter(
        (result) => result.generated,
      ).length,
    resumedAssetCount:
      generated.filter(
        (result) => !result.generated,
      ).length,
    synthesizedChunkCount:
      generated.reduce(
        (sum, result) =>
          sum + result.synthesizedChunks,
        0,
      ),
    assetCount: manifests.length,
    assetChecksums: manifests
      .sort(
        (left, right) =>
          left.lessonOrder -
          right.lessonOrder,
      )
      .map((manifest) => ({
        lessonSlug: manifest.lessonSlug,
        lessonOrder: manifest.lessonOrder,
        checksumSha256:
          manifest.checksumSha256,
        sizeBytes: manifest.sizeBytes,
        durationSeconds:
          manifest.durationSeconds,
      })),
    totalBytes: manifests.reduce(
      (sum, manifest) =>
        sum + manifest.sizeBytes,
      0,
    ),
    totalDurationSeconds:
      manifests.reduce(
        (sum, manifest) =>
          sum + manifest.durationSeconds,
        0,
      ),
    sentenceSummary,
    checks,
    passed,
  };
  const releaseManifest = {
    ...releaseManifestWithoutHash,
    releaseChecksumSha256: sha256(
      canonical(
        releaseManifestWithoutHash
          .assetChecksums,
      ),
    ),
    auditManifestHash: sha256(
      canonical(releaseManifestWithoutHash),
    ),
  };
  const canonicalPath = resolve(
    output,
    "release-manifest.json",
  );
  try {
    const existing =
      await readJson<{
        releaseId: string;
        planHash: string;
        releaseChecksumSha256: string;
      }>(canonicalPath);
    if (
      existing.releaseId !== plan.releaseId ||
      existing.planHash !== plan.planHash ||
      existing.releaseChecksumSha256 !==
        releaseManifest
          .releaseChecksumSha256
    ) {
      throw new Error(
        "Immutable release manifest drift",
      );
    }
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code ===
      "ENOENT"
    ) {
      await writeExclusive(
        canonicalPath,
        `${JSON.stringify(
          releaseManifest,
          null,
          2,
        )}\n`,
      );
    } else {
      throw error;
    }
  }
  const runPath = resolve(
    output,
    "runs",
    `run-${completedAt.toISOString().replace(/[:.]/gu, "-")}.json`,
  );
  await writeExclusive(
    runPath,
    `${JSON.stringify(
      releaseManifest,
      null,
      2,
    )}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      passed,
      releaseId: plan.releaseId,
      assetCount: manifests.length,
      generatedAssetCount:
        releaseManifest.generatedAssetCount,
      synthesizedChunkCount:
        releaseManifest.synthesizedChunkCount,
      totalBytes:
        releaseManifest.totalBytes,
      totalDurationSeconds:
        releaseManifest
          .totalDurationSeconds,
      releaseChecksumSha256:
        releaseManifest
          .releaseChecksumSha256,
      auditManifestHash:
        releaseManifest.auditManifestHash,
      releaseManifest: canonicalPath,
      runPath,
      failedChecks: checks
        .filter((check) => !check.pass)
        .map((check) => check.id),
    })}\n`,
  );
  if (!passed) process.exitCode = 2;
}

async function main() {
  const [command, ...args] =
    process.argv.slice(2);
  const recipeVersion = option(
    args,
    "--recipe-version",
  );
  const recipeHash = option(
    args,
    "--recipe-hash",
  );
  if (command === "prepare") {
    await prepare(
      option(args, "--reconciliation"),
      option(args, "--output-dir"),
      recipeVersion,
      recipeHash,
    );
    return;
  }
  if (command === "generate") {
    assertRecipe(
      recipeVersion,
      recipeHash,
    );
    await generate(
      option(args, "--plan"),
      option(args, "--output-dir"),
    );
    return;
  }
  throw new Error(
    "Usage: generate-final-piper-academy.ts prepare --recipe-version <v> --recipe-hash <h> --reconciliation <json> --output-dir <dir> | generate --recipe-version <v> --recipe-hash <h> --plan <json> --output-dir <dir>",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
