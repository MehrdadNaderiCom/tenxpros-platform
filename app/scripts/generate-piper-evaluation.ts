#!/usr/bin/env tsx

/**
 * Build the private, local-only Piper A/B evaluation package.
 *
 * Safety boundaries:
 * - canonical seed content is read only;
 * - PostgreSQL is queried only for before/after production-audio digests;
 * - synthesis runs in a separate --network none, read-only container;
 * - generated files are accepted only below scratch_academy/piper-evaluation;
 * - Prisma, production audio writers, the player, and the Range API are absent.
 */
import {
  createHash,
  randomBytes,
} from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import {
  basename,
  dirname,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import editorialLedgerJson from "../prisma/seed/academy/editorial-ledger.phase0.json";
import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import {
  createVisibleContentRevisionHash,
  reconstructOriginalHtml,
  type EditorialChange,
} from "../src/lib/academy/content-review";
import { sanitizeLessonHtml } from "../src/lib/academy/lesson-html";
import {
  ACADEMY_PRONUNCIATION_FREEZE_REVISION,
  ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
  FROZEN_ACADEMY_NARRATION_OVERRIDES,
} from "../src/lib/academy/narration/approved-pronunciations";
import { auditNarrationDocumentAlignment } from "../src/lib/academy/narration/alignment";
import {
  buildPiperEvaluationPackage,
  PIPER_EVALUATION_BRYCE_VOICE,
  type PiperEvaluationPackage,
  type PiperEvaluationPrivateManifest,
} from "../src/lib/academy/narration/piper-evaluation";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
const EVALUATION_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "piper-evaluation",
);
const DEFAULT_IMAGE = "tenxpros-piper-eval:local";
const DEFAULT_PACKAGE_ID = "piper-semantic-v1-bryce-20260726";
const RUNTIME_RESULT_PATH = "private/runtime-results.json";

const PRODUCTION_SNAPSHOT_SQL = `
SELECT json_build_object(
  'count', count(*),
  'bytes', COALESCE(sum(octet_length(data)), 0),
  'rowMd5Aggregate', md5(string_agg(id || ':' || md5(data), ',' ORDER BY id)),
  'rows', COALESCE(
    json_agg(
      json_build_object(
        'id', id,
        'bytes', octet_length(data),
        'md5', md5(data)
      )
      ORDER BY id
    ),
    '[]'::json
  )
)
FROM "AcademyLessonAudio";
`.trim();

const PRODUCTION_BINARY_COPY_SQL =
  'COPY (SELECT id, data FROM "AcademyLessonAudio" ORDER BY id) TO STDOUT WITH (FORMAT binary)';

interface ProductionAudioRowSnapshot {
  id: string;
  bytes: number;
  md5: string;
}

interface ProductionAudioSnapshot {
  count: number;
  bytes: number;
  rowMd5Aggregate: string;
  binaryCopySha256: string;
  rows: readonly ProductionAudioRowSnapshot[];
}

interface RuntimeSampleResult {
  pairId?: string;
  label?: string;
  fileName?: string;
  filename?: string;
  pipeline?: string;
  durationSeconds?: number;
  sizeBytes?: number;
  sha256?: string;
  passed?: boolean;
  qualityPassed?: boolean;
  eligibleForBlindReview?: boolean;
  nonBlockingQualityFindings?: readonly unknown[];
  audit?: unknown;
  [key: string]: unknown;
}

interface RuntimeResults {
  version?: string;
  passed?: boolean;
  allPassed?: boolean;
  summary?: {
    samples?: number;
    passed?: number;
    failed?: number;
    allPassed?: boolean;
    eligibleForBlindReview?: number;
    ineligibleForBlindReview?: number;
    allEligibleForBlindReview?: boolean;
    qualityPassed?: number;
    qualityFindings?: number;
    nonBlockingQualityFindings?: number;
  };
  tools?: unknown;
  audioSettings?: unknown;
  samples: readonly RuntimeSampleResult[];
  [key: string]: unknown;
}

interface ParsedOptions {
  outputDirectory: string;
  packageId: string;
  image: string;
  buildImage: boolean;
}

function usage(): string {
  return `Generate the isolated TenXPros Piper evaluation package

Usage:
  pnpm academy:piper-eval -- --output-dir <scratch-directory> [options]

Options:
  --package-id <id>       Private package id (default: ${DEFAULT_PACKAGE_ID})
  --image <tag>           Local evaluation image (default: ${DEFAULT_IMAGE})
  --skip-image-build      Reuse an already-built local evaluation image
  --help                  Show this help

The output directory must be a new child of:
  ${EVALUATION_ROOT}`;
}

function optionValue(
  args: readonly string[],
  option: string,
): string | undefined {
  const index = args.indexOf(option);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseOptions(args: readonly string[]): ParsedOptions {
  const normalizedArgs = args[0] === "--" ? args.slice(1) : args;
  if (normalizedArgs.includes("--help")) {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }

  const optionsWithValues = new Set([
    "--output-dir",
    "--package-id",
    "--image",
  ]);
  const flags = new Set(["--skip-image-build", "--help"]);
  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const argument = normalizedArgs[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    if (flags.has(argument)) continue;
    if (!optionsWithValues.has(argument)) {
      throw new Error(`Unknown option: ${argument}`);
    }
    index += 1;
  }

  const suppliedOutput = optionValue(normalizedArgs, "--output-dir");
  if (!suppliedOutput) {
    throw new Error("--output-dir is required");
  }
  const outputDirectory = resolve(process.cwd(), suppliedOutput);
  assertSafeNewOutputDirectory(outputDirectory);

  return {
    outputDirectory,
    packageId:
      optionValue(normalizedArgs, "--package-id") ??
      DEFAULT_PACKAGE_ID,
    image:
      optionValue(normalizedArgs, "--image") ?? DEFAULT_IMAGE,
    buildImage: !normalizedArgs.includes("--skip-image-build"),
  };
}

function assertSafeNewOutputDirectory(outputDirectory: string): void {
  const relativePath = relative(EVALUATION_ROOT, outputDirectory);
  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    resolve(EVALUATION_ROOT, relativePath) !== outputDirectory
  ) {
    throw new Error(
      `Evaluation output must be a child of ${EVALUATION_ROOT}`,
    );
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function runChecked(
  executable: string,
  args: readonly string[],
  options: {
    cwd?: string;
    stdio?: "inherit" | "pipe";
  } = {},
): string {
  const result = spawnSync(executable, [...args], {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    env: {
      PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr =
      typeof result.stderr === "string" ? result.stderr.trim() : "";
    throw new Error(
      `${executable} exited ${String(result.status)}${stderr ? `: ${stderr}` : ""}`,
    );
  }
  return typeof result.stdout === "string"
    ? result.stdout.trim()
    : "";
}

async function productionBinaryCopySha256(): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    const errors: Buffer[] = [];
    const child = spawn(
      "docker",
      [
        "exec",
        "tenxpros-db",
        "psql",
        "-U",
        "tenxpros",
        "-d",
        "tenxpros",
        "-q",
        "-c",
        PRODUCTION_BINARY_COPY_SQL,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
        },
      },
    );
    child.stdout.on("data", (chunk: Buffer) => hash.update(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Production audio binary snapshot failed (${String(code)}): ${Buffer.concat(errors).toString("utf8").trim()}`,
          ),
        );
        return;
      }
      resolvePromise(hash.digest("hex"));
    });
  });
}

async function productionAudioSnapshot(): Promise<ProductionAudioSnapshot> {
  const summaryJson = runChecked("docker", [
    "exec",
    "tenxpros-db",
    "psql",
    "-U",
    "tenxpros",
    "-d",
    "tenxpros",
    "-tA",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    PRODUCTION_SNAPSHOT_SQL,
  ]);
  const parsed = JSON.parse(summaryJson) as Omit<
    ProductionAudioSnapshot,
    "binaryCopySha256"
  >;
  return {
    ...parsed,
    binaryCopySha256: await productionBinaryCopySha256(),
  };
}

function productionSnapshotsMatch(
  before: ProductionAudioSnapshot,
  after: ProductionAudioSnapshot,
): boolean {
  return (
    before.count === after.count &&
    before.bytes === after.bytes &&
    before.rowMd5Aggregate === after.rowMd5Aggregate &&
    before.binaryCopySha256 === after.binaryCopySha256 &&
    JSON.stringify(before.rows) === JSON.stringify(after.rows)
  );
}

function buildNarrationCorpus() {
  const changes = editorialLedgerJson.changes as unknown as EditorialChange[];
  return ACADEMY_MODULES.map((module) => {
    const sourceHtml = module.bodyHtml ?? "";
    const sanitizedHtml = sanitizeLessonHtml(sourceHtml);
    const originalHtml = reconstructOriginalHtml(
      sourceHtml,
      changes.filter((change) => change.lessonSlug === module.slug),
    );
    const contentRevisionHash = createVisibleContentRevisionHash(
      originalHtml,
      sourceHtml,
    );
    const document = renderNarrationDocument({
      slug: module.slug,
      title: module.title,
      html: sanitizedHtml,
      contentRevisionHash,
      overrides: FROZEN_ACADEMY_NARRATION_OVERRIDES,
    });
    return {
      slug: module.slug,
      sanitizedHtml,
      document,
    };
  });
}

function alignmentFreezeAudit(
  corpus: ReturnType<typeof buildNarrationCorpus>,
) {
  const documents = corpus.map(({ document }) =>
    auditNarrationDocumentAlignment(document),
  );
  const totalBlocks = documents.reduce(
    (total, document) => total + document.summary.totalBlocks,
    0,
  );
  const requiresOwnerReview = documents.reduce(
    (total, document) =>
      total +
      document.summary.blocksByClassification.REQUIRES_OWNER_REVIEW,
    0,
  );
  const invalidSemanticDrift = documents.reduce(
    (total, document) =>
      total +
      document.summary.blocksByClassification.INVALID_SEMANTIC_DRIFT,
    0,
  );
  const pendingOwnerOccurrences = documents.reduce(
    (total, document) =>
      total + document.summary.pendingOwnerReviewOccurrenceCount,
    0,
  );
  const protectedFeatureDrifts = documents.reduce(
    (total, document) =>
      total + document.summary.protectedFeatureDriftCount,
    0,
  );
  const recipeReferencesMatch = corpus.every(
    ({ document }) =>
      document.recipe.overrideRevision ===
        ACADEMY_PRONUNCIATION_FREEZE_REVISION &&
      document.recipe.ownerApprovalReference ===
        ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
  );
  const frozen =
    requiresOwnerReview === 0 &&
    invalidSemanticDrift === 0 &&
    pendingOwnerOccurrences === 0 &&
    protectedFeatureDrifts === 0 &&
    recipeReferencesMatch;

  if (!frozen) {
    throw new Error(
      `Narration freeze gate failed: REQUIRES_OWNER_REVIEW=${String(requiresOwnerReview)} INVALID_SEMANTIC_DRIFT=${String(invalidSemanticDrift)} pending=${String(pendingOwnerOccurrences)} protected=${String(protectedFeatureDrifts)} references=${String(recipeReferencesMatch)}`,
    );
  }

  return {
    status: "FROZEN",
    frozen,
    totalBlocks,
    totalDocuments: documents.length,
    requiresOwnerReview,
    invalidSemanticDrift,
    pendingOwnerOccurrences,
    protectedFeatureDrifts,
    overrideRevision: ACADEMY_PRONUNCIATION_FREEZE_REVISION,
    ownerApprovalReference:
      ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
    recipeHashes: corpus.map(({ document }) => ({
      slug: document.slug,
      sha256: document.hashes.recipe,
    })),
  } as const;
}

function createRuntimePlan(evaluation: PiperEvaluationPackage) {
  return {
    version: "tenxpros-piper-evaluation-runtime-plan-v1",
    recipeHash: evaluation.plan.planHash,
    voice: {
      id: PIPER_EVALUATION_BRYCE_VOICE.id,
      modelPath: `/opt/piper/voices/${PIPER_EVALUATION_BRYCE_VOICE.modelFile}`,
      configPath: `/opt/piper/voices/${PIPER_EVALUATION_BRYCE_VOICE.modelFile}.json`,
      expectedModelSha256:
        PIPER_EVALUATION_BRYCE_VOICE.modelSha256,
    },
    sampleRate: PIPER_EVALUATION_BRYCE_VOICE.nativeSampleRateHz,
    format: {
      intermediate: "PCM signed 16-bit little-endian mono WAV",
      final: "MP3 mono 64 kbps CBR",
    },
    loudness: {
      method: "single constant gain after stitching; no compression or limiter",
      targetLufs: -19,
      truePeakDbtp: -2,
      maxPositiveGainDb: 6,
      integratedLufsMin: -22,
      integratedLufsMax: -18,
      truePeakMaxDbtp: -1.5,
      baselineIntegratedLufsMin: -32,
      baselineIntegratedLufsMax: -12,
      baselineTruePeakMaxDbtp: 1.5,
    },
    samples: evaluation.runtimeSamples,
  };
}

function runtimeResultKey(sample: RuntimeSampleResult): string {
  const file = sample.fileName ?? sample.filename;
  if (file) return basename(file);
  return `${sample.pairId ?? ""}-${sample.label ?? ""}`;
}

function plannedSampleKey(sample: {
  filename: string;
  pairId: string;
  blindLabel: string;
}): string {
  return sample.filename || `${sample.pairId}-${sample.blindLabel}`;
}

function finalizePrivateManifest(
  provisional: PiperEvaluationPrivateManifest,
  evaluation: PiperEvaluationPackage,
  runtime: RuntimeResults,
  metadata: {
    blindSeedSha256: string;
    alignment: ReturnType<typeof alignmentFreezeAudit>;
    productionBefore: ProductionAudioSnapshot;
    productionAfter: ProductionAudioSnapshot;
    productionUnchanged: boolean;
    outputDirectory: string;
  },
) {
  const results = new Map(
    runtime.samples.map((sample) => [runtimeResultKey(sample), sample]),
  );
  const pairs = provisional.pairs.map((pair) => ({
    ...pair,
    samples: pair.samples.map((sample) => {
      const result = results.get(plannedSampleKey(sample));
      if (!result) {
        throw new Error(`Runtime result missing for ${sample.filename}`);
      }
      const durationSeconds =
        typeof result.durationSeconds === "number"
          ? result.durationSeconds
          : null;
      const sizeBytes =
        typeof result.sizeBytes === "number" ? result.sizeBytes : null;
      const sha256 =
        typeof result.sha256 === "string" ? result.sha256 : null;
      return {
        ...sample,
        audio: {
          status: "generated",
          durationSeconds,
          sizeBytes,
          sha256,
        },
        audit: result,
      };
    }),
  }));

  return {
    ...provisional,
    createdAt: new Date().toISOString(),
    private: true,
    blindSeedSha256: metadata.blindSeedSha256,
    recipeFreeze: metadata.alignment,
    pauseProfile:
      evaluation.excerpts[0]?.pauseProfile ?? null,
    runtime,
    productionAudio: {
      before: metadata.productionBefore,
      after: metadata.productionAfter,
      byteForByteUnchanged: metadata.productionUnchanged,
    },
    isolation: {
      containerNetwork: "none",
      rootFilesystem: "read-only",
      productionDatabaseMounted: false,
      productionStorageMounted: false,
      externalApiCalls: 0,
      externalTtsRequests: 0,
      elevenLabsRequests: 0,
      outputDirectory: metadata.outputDirectory,
    },
    plan: evaluation.plan,
    pairs,
  };
}

function runtimeAllPassed(runtime: RuntimeResults): boolean {
  if (runtime.passed === false || runtime.allPassed === false) {
    return false;
  }
  if (
    runtime.summary?.allPassed !== true ||
    runtime.summary?.allEligibleForBlindReview !== true ||
    runtime.summary.samples !== runtime.samples.length ||
    runtime.samples.length === 0
  ) {
    return false;
  }
  return runtime.samples.every(
    (sample) =>
      sample.passed !== false &&
      sample.eligibleForBlindReview !== false &&
      !(
        typeof sample.audit === "object" &&
        sample.audit !== null &&
        "passed" in sample.audit &&
        (sample.audit as { passed?: boolean }).passed === false
      ),
  );
}

function sampleComparisonRows(runtime: RuntimeResults): string[] {
  return runtime.samples.map((sample) => {
    const filename =
      sample.fileName ?? sample.filename ?? runtimeResultKey(sample);
    const duration =
      typeof sample.durationSeconds === "number"
        ? sample.durationSeconds.toFixed(3)
        : "see runtime audit";
    const bytes =
      typeof sample.sizeBytes === "number"
        ? String(sample.sizeBytes)
        : "see runtime audit";
    const eligibility =
      sample.passed === false || sample.eligibleForBlindReview === false
        ? "INELIGIBLE"
        : sample.qualityPassed === false
          ? "ELIGIBLE; quality finding"
          : "PASS";
    return `| ${filename} | ${sample.pipeline ?? "private manifest"} | ${duration} | ${bytes} | ${eligibility} |`;
  });
}

function privateReportMarkdown(input: {
  evaluation: PiperEvaluationPackage;
  runtime: RuntimeResults;
  alignment: ReturnType<typeof alignmentFreezeAudit>;
  before: ProductionAudioSnapshot;
  after: ProductionAudioSnapshot;
  unchanged: boolean;
  outputDirectory: string;
  command: string;
}): string {
  const files = input.runtime.samples
    .map(
      (sample) =>
        `- \`listening/audio/${sample.fileName ?? sample.filename ?? runtimeResultKey(sample)}\``,
    )
    .join("\n");
  const manifestRows = input.evaluation.assignments
    .map(
      (assignment) =>
        `| ${assignment.fileName} | ${assignment.pipeline} | ${assignment.lessonSlug} | ${assignment.excerptId} |`,
    )
    .join("\n");

  return `# TenXPros Piper quality validation — private report

## 1. Pronunciation audit result

\`REQUIRES_OWNER_REVIEW = ${String(input.alignment.requiresOwnerReview)}\`; \`INVALID_SEMANTIC_DRIFT = ${String(input.alignment.invalidSemanticDrift)}\`; pending occurrences and protected-feature drift are also zero across ${String(input.alignment.totalBlocks)} blocks.

## 2. Narration recipe freeze

Status: **${input.alignment.status}**. Revision \`${input.alignment.overrideRevision}\`, owner approval \`${input.alignment.ownerApprovalReference}\`. The SME rule is lesson-scoped: first meaningful occurrence expands, later occurrences spell the initials.

## 3. Files created and modified

The implementation is contained in \`Dockerfile.piper-evaluation\`, \`scripts/generate-piper-evaluation.ts\`, \`scripts/piper-evaluation-runtime.cjs\`, the narration pronunciation/evaluation modules under \`src/lib/academy/narration/\`, the narration CLI, its focused tests, \`package.json\`, and \`docs/academy/phase1-narration-layer.md\`. This isolated package at \`${input.outputDirectory}\` contains the local listening page, exactly eight MP3 files, the private plan/manifests, runtime results, machine audit, and this report. No production audio, player, Range API, or visible lesson content is an evaluation output.

## 4. Semantic Piper generation architecture

Frozen semantic plan → one-sentence local Piper PCM segments → exact-zero trailing-frame trim → exact PCM silence insertion → deterministic PCM stitch → one constant-gain loudness adjustment → LAME mono 64 kbps CBR → decoded MP3 audit. Baseline uses one collapsed-text Piper request and the current 350 ms Piper sentence silence.

## 5. Segmentation strategy

Version \`${input.evaluation.plan.segmentationVersion}\`. Headings, paragraphs, list items, table rows, form fields, callouts, and sections remain distinct. Corrected requests are sentence units within those semantic blocks; table rows and form fields are never merged.

## 6. Pause and audio-processing settings

Sentence 220 ms; list item 280 ms; paragraph 500 ms; table row 400 ms; heading 700 ms; section 900 ms. Intermediate format is PCM16 mono at 22,050 Hz. Corrected loudness uses a single fixed gain targeting -19 LUFS while prioritizing a -2 dBTP ceiling, with positive gain capped at +6 dB; no compressor or limiter. The decoded MP3 acceptance window is -22 to -18 LUFS with true peak at or below -1.5 dBTP. The wider lower edge accommodates the peak-first safety cap without compressing speech. Baseline remains unnormalized; zero full-scale samples and an observational +1.5 dBTP ceiling are measured as non-blocking control-quality findings, while a clipping plateau remains blocking. MP3 is mono 64 kbps CBR.

The fixed excerpts exercise sentence and table-row pauses acoustically. The list-item, paragraph, heading, and section values remain frozen and covered by the plan/test contract but are not exercised by these four excerpts.

## 7. Exact generated sample files

${files}

## 8. Private baseline/corrected manifest

| Blind file | Pipeline | Lesson | Excerpt |
| --- | --- | --- | --- |
${manifestRows}

The authoritative mapping and hashes are in \`private/manifest.json\`; the public listening page contains none of these identities.

## 9. Duration and size comparison

| File | Pipeline | Duration seconds | Bytes | Audit |
| --- | --- | ---: | ---: | --- |
${sampleComparisonRows(input.runtime).join("\n")}

## 10. Automated audio audit

Runtime blind-review eligibility gate: **${runtimeAllPassed(input.runtime) ? "PASS" : "FAIL"}**. Per-file RIFF, decode, stream format, CBR, duration, loudness, true peak/clipping, segment/order, transcript reconstruction, exact inserted silence, hashes, and metadata checks are recorded in \`private/runtime-results.json\` and \`private/audit.json\`. Baseline isolated full-scale observations or an observational true-peak excursion remain explicit non-blocking control-quality findings because normalizing or retry-selecting the control would no longer reproduce the current pipeline; a baseline clipping plateau remains blocking. Corrected samples retain hard loudness, true-peak, zero-full-scale, and plateau gates.

A positive baseline intersample true peak can still pass the declared +1.5 dBTP observational control ceiling when decoded full-scale and plateau checks pass; such a value must be disclosed in the finalized report rather than normalized or retry-selected. Corrected samples retain the conservative negative true-peak gate.

## 11. Test, typecheck, and build results

Generation-time checks passed: the alignment freeze gate, isolated runtime self-test, eight-sample runtime audit, output-integrity checks, and production before/after snapshot. Repository \`test\`, \`typecheck\`, \`lint\`, \`lint:content\`, Prisma validation, and \`build\` are intentionally run after generation; their exact outcomes must be recorded in \`private/validation-results.md\` before hand-off.

## 12. External TTS / ElevenLabs

Zero external TTS calls and zero ElevenLabs calls. Synthesis ran with Docker \`--network none\` using only the pinned local Piper model.

## 13. Production audio safety

Before: ${String(input.before.count)} rows, ${String(input.before.bytes)} bytes, SHA-256 \`${input.before.binaryCopySha256}\`. After: ${String(input.after.count)} rows, ${String(input.after.bytes)} bytes, SHA-256 \`${input.after.binaryCopySha256}\`. Byte-for-byte unchanged: **${String(input.unchanged).toUpperCase()}** (also checked per row).

## 14. Exact regeneration command

\`${input.command}\`

Use a new output directory on each run; the command refuses to overwrite an existing review package.

## 15. Human-listening recommendation

${runtimeAllPassed(input.runtime) && input.unchanged ? "The corrected Piper pipeline is ready for the requested blinded human listening test. It is not activated for users and this result does not authorize a full regeneration." : "Not ready for listening: one or more fail-closed generation, audio, or production-safety checks did not pass."}
`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (await pathExists(options.outputDirectory)) {
    throw new Error(
      `Refusing to overwrite existing evaluation directory: ${options.outputDirectory}`,
    );
  }

  const before = await productionAudioSnapshot();
  if (before.count !== 51) {
    throw new Error(
      `Production safety gate expected 51 audio rows, found ${String(before.count)}`,
    );
  }

  await mkdir(resolve(options.outputDirectory, "private"), {
    recursive: true,
  });
  await mkdir(resolve(options.outputDirectory, "listening", "audio"), {
    recursive: true,
  });

  const corpus = buildNarrationCorpus();
  const alignment = alignmentFreezeAudit(corpus);
  const blindSeed = randomBytes(32).toString("hex");
  const evaluation = buildPiperEvaluationPackage({
    lessons: corpus
      .filter(({ slug }) =>
        ["mission", "journey", "conversation", "rules"].includes(
          slug,
        ),
      )
      .map(({ slug, sanitizedHtml, document }) => ({
        slug: slug as "mission" | "journey" | "conversation" | "rules",
        sanitizedHtml,
        document,
      })),
    blindSeed,
    packageId: options.packageId,
  });
  const runtimePlan = createRuntimePlan(evaluation);

  await Promise.all([
    writeFile(
      resolve(options.outputDirectory, "private", "runtime-plan.json"),
      `${JSON.stringify(runtimePlan, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      resolve(options.outputDirectory, "private", "manifest.pending.json"),
      `${JSON.stringify(
        {
          ...evaluation.privateManifest,
          plan: evaluation.plan,
          alignment,
        },
        null,
        2,
      )}\n`,
      "utf8",
    ),
    writeFile(
      resolve(options.outputDirectory, "listening", "index.html"),
      evaluation.listeningHtml,
      "utf8",
    ),
  ]);

  if (options.buildImage) {
    runChecked(
      "docker",
      [
        "build",
        "--file",
        resolve(APP_ROOT, "Dockerfile.piper-evaluation"),
        "--tag",
        options.image,
        APP_ROOT,
      ],
      { cwd: APP_ROOT, stdio: "inherit" },
    );
  }

  runChecked(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--read-only",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--pids-limit",
      "256",
      "--tmpfs",
      "/tmp:rw,nosuid,nodev,size=4g",
      "--mount",
      `type=bind,src=${options.outputDirectory},dst=/evaluation`,
      options.image,
      "--plan",
      "/evaluation/private/runtime-plan.json",
      "--output-dir",
      "/evaluation",
    ],
    { stdio: "inherit" },
  );

  const runtimeResultsPath = resolve(
    options.outputDirectory,
    RUNTIME_RESULT_PATH,
  );
  const runtime = JSON.parse(
    await readFile(runtimeResultsPath, "utf8"),
  ) as RuntimeResults;
  if (!Array.isArray(runtime.samples) || runtime.samples.length !== 8) {
    throw new Error(
      `Runtime returned ${String(runtime.samples?.length ?? 0)} samples; expected 8`,
    );
  }
  if (!runtimeAllPassed(runtime)) {
    throw new Error(
      `One or more generated samples failed the runtime quality audit; inspect ${runtimeResultsPath}`,
    );
  }

  for (const assignment of evaluation.assignments) {
    const audioPath = resolve(
      options.outputDirectory,
      "listening",
      "audio",
      assignment.fileName,
    );
    const audioStat = await stat(audioPath);
    if (!audioStat.isFile() || audioStat.size === 0) {
      throw new Error(`Generated audio is missing or empty: ${audioPath}`);
    }
  }

  const after = await productionAudioSnapshot();
  const productionUnchanged = productionSnapshotsMatch(before, after);
  if (!productionUnchanged) {
    throw new Error(
      "Production AcademyLessonAudio changed during isolated evaluation generation",
    );
  }

  const manifest = finalizePrivateManifest(
    evaluation.privateManifest,
    evaluation,
    runtime,
    {
      blindSeedSha256: createHash("sha256")
        .update(blindSeed)
        .digest("hex"),
      alignment,
      productionBefore: before,
      productionAfter: after,
      productionUnchanged,
      outputDirectory: options.outputDirectory,
    },
  );
  const command = `cd ${APP_ROOT} && pnpm academy:piper-eval -- --output-dir ${resolve(EVALUATION_ROOT, `${options.packageId}-rerun`)} --package-id ${options.packageId}-rerun`;
  const audit = {
    schemaVersion: "tenxpros-piper-evaluation-audit-v1",
    status: "PASS",
    createdAt: new Date().toISOString(),
    outputDirectory: options.outputDirectory,
    alignment,
    recipeFrozen: true,
    planHash: evaluation.plan.planHash,
    sampleCount: runtime.samples.length,
    allBlockingRuntimeChecksPassed: true,
    nonBlockingQualityFindingCount:
      runtime.summary?.nonBlockingQualityFindings ?? 0,
    runtime,
    productionAudio: {
      before,
      after,
      byteForByteUnchanged: true,
    },
    externalApiCalls: 0,
    externalTtsRequests: 0,
    elevenLabsRequests: 0,
    fullAcademyRegeneration: false,
    deployed: false,
    activePlayerChanged: false,
  };
  const report = privateReportMarkdown({
    evaluation,
    runtime,
    alignment,
    before,
    after,
    unchanged: productionUnchanged,
    outputDirectory: options.outputDirectory,
    command,
  });

  await Promise.all([
    writeFile(
      resolve(options.outputDirectory, "private", "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      resolve(options.outputDirectory, "private", "audit.json"),
      `${JSON.stringify(audit, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      resolve(options.outputDirectory, "private", "report.md"),
      report,
      "utf8",
    ),
  ]);

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "PASS",
        outputDirectory: options.outputDirectory,
        alignment: {
          REQUIRES_OWNER_REVIEW: alignment.requiresOwnerReview,
          INVALID_SEMANTIC_DRIFT: alignment.invalidSemanticDrift,
        },
        generatedSamples: runtime.samples.length,
        productionAudio: {
          count: after.count,
          bytes: after.bytes,
          sha256: after.binaryCopySha256,
          byteForByteUnchanged: true,
        },
        listeningPage: resolve(
          options.outputDirectory,
          "listening",
          "index.html",
        ),
        privateManifest: resolve(
          options.outputDirectory,
          "private",
          "manifest.json",
        ),
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
