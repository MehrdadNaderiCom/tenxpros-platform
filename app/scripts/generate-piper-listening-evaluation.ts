#!/usr/bin/env tsx

/**
 * Build the local-only Phase 2B blind listening package.
 *
 * This command is deliberately separate from the Phase 2A generator:
 * - the authoritative Phase 2A manifest and eight MP3s are read and copied;
 * - only the supplemental sample-05 A/B pair is synthesized;
 * - synthesis runs in the existing network-disabled Piper container;
 * - the production database is queried only for before/after audio snapshots;
 * - no production writer, Prisma client, learner player, or Range API is used.
 */
import {
  createHash,
  randomBytes,
} from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  access,
  constants as fsConstants,
  copyFile,
  lstat,
  mkdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import {
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
  buildPhase2BPauseCoveragePlan,
  buildPhase2BSupplementalManifest,
  createPhase2BPackageManifests,
  phase2BRuntimeSamples,
  type Phase2BOriginalManifestInput,
  type Phase2BPrivateAnalysisManifest,
  type Phase2BPublicPackage,
} from "../src/lib/academy/narration/piper-listening-evaluation";
import {
  assertPhase2BPublicPackageSafe,
  PHASE2B_LISTENER_HTML_FILENAME,
  PHASE2B_LISTENER_INSTRUCTIONS_FILENAME,
  renderPhase2BListenerInstructions,
  renderPhase2BListeningHtml,
  type Phase2BPublicFile,
} from "../src/lib/academy/narration/piper-listener-package";
import { writeDeterministicZip } from "../src/lib/academy/narration/deterministic-zip";
import {
  PIPER_EVALUATION_BRYCE_VOICE,
  type PiperEvaluationPrivateManifest,
} from "../src/lib/academy/narration/piper-evaluation";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
const PHASE2A_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "piper-evaluation",
);
const PHASE2B_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "piper-listening",
);
const DEFAULT_SOURCE_PACKAGE = resolve(
  PHASE2A_ROOT,
  "piper-semantic-v1-bryce-20260726",
);
const DEFAULT_IMAGE = "tenxpros-piper-eval:local";
const DEFAULT_PRIVATE_PACKAGE_ID =
  "phase2b-pause-coverage-bryce-20260726";
const EXPECTED_ORIGINAL_MANIFEST_SHA256 =
  "577c053ffdd9bc225f142b76dc1e98d35cb8db1529051c93285362fe69f0b75a";
const EXPECTED_PRODUCTION_AUDIO_ROWS = 51;
const RUNTIME_RESULT_RELATIVE_PATH =
  "private/runtime-results.json";

const ORIGINAL_AUDIO_SHA256 = Object.freeze({
  "sample-01-A.mp3":
    "380903a8a0309558c5557a48ff9d5c6a9bb509e371b4bc65598d2bcab6233ac8",
  "sample-01-B.mp3":
    "f222795ba82507671de97a8148982502998fe8182deddd4a437b2e4f0be0c30d",
  "sample-02-A.mp3":
    "cd077f907f9278ab19de899dc735236a01aeb5bd6d057ec571a15231e70fd663",
  "sample-02-B.mp3":
    "1fb5bdb8765ee86bd668a00b9b2dc27de4d25d527df5a74ef8074a83511625bf",
  "sample-03-A.mp3":
    "a535ece5552168882d88ac714217b3358bd2e28ab6ea3e774280b05a7d6abc9c",
  "sample-03-B.mp3":
    "cccb2be94bdbb5633de2a280d6c1858a4dcb0bbae76e689823cf99d6a5471f7e",
  "sample-04-A.mp3":
    "d6b1a45c933d753b23cf3ff7f292062b4ad98c68a2c18e03c5de402023f2c199",
  "sample-04-B.mp3":
    "2dddc7577c831c44c0d429db6359e7655f50212344b8b56e454098706bfa58bb",
} as const);

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
  pipeline?: "baseline" | "corrected";
  fileName?: string;
  filename?: string;
  durationSeconds?: number;
  sizeBytes?: number;
  sha256?: string;
  passed?: boolean;
  qualityPassed?: boolean;
  eligibleForBlindReview?: boolean;
  segments?: readonly {
    requestedPauseAfterMs?: number;
    insertedPauseFrames?: number;
  }[];
  [key: string]: unknown;
}

interface RuntimeResults {
  version?: string;
  runtimeVersion?: string;
  passed?: boolean;
  allPassed?: boolean;
  plan?: {
    version?: string;
    recipeHash?: string;
    sha256?: string;
    sampleCount?: number;
  };
  summary?: {
    samples?: number;
    passed?: number;
    failed?: number;
    allPassed?: boolean;
    eligibleForBlindReview?: number;
    allEligibleForBlindReview?: boolean;
    nonBlockingQualityFindings?: number;
  };
  isolation?: {
    isolated?: boolean;
    externalApiRequests?: number;
    databaseImports?: number;
    prismaImports?: number;
  };
  runtime?: {
    sourceSha256?: string;
  };
  samples: readonly RuntimeSampleResult[];
  [key: string]: unknown;
}

interface ParsedOptions {
  sourcePackage: string;
  outputDirectory: string;
  privatePackageId: string;
  image: string;
}

interface OriginalPackage {
  manifestPath: string;
  manifestSha256: string;
  manifest: Phase2BOriginalManifestInput;
  audio: readonly {
    filename: keyof typeof ORIGINAL_AUDIO_SHA256;
    sourcePath: string;
    sha256: string;
    sizeBytes: number;
  }[];
  tableDurations: {
    baselineSeconds: number;
    correctedSeconds: number;
  };
}

interface ListenerArtifactResult {
  listenerDirectory: string;
  zipPath: string;
  zipSha256: string;
  publicFiles: readonly string[];
  scan: unknown;
}

interface AudioValidationResult {
  filesDecoded: readonly string[];
  allDecoded: true;
  metadataScan: "PASS";
  prohibitedMetadataTokensFound: readonly [];
  externalNetwork: "none";
}

interface GenerationContext {
  alignment: ReturnType<typeof alignmentFreezeAudit>;
  original: OriginalPackage;
  planHash: string;
  supplementalManifest: PiperEvaluationPrivateManifest;
  runtimeSelfTest: unknown;
  runtime: RuntimeResults;
  privateManifest: Phase2BPrivateAnalysisManifest;
  publicPackage: Phase2BPublicPackage;
  listenerArtifacts: ListenerArtifactResult;
  audioValidation: AudioValidationResult;
  pauseCoverage: ReturnType<typeof assertSupplementalPauseCoverage>;
}

function usage(): string {
  return `Prepare the Phase 2B local blind listening package

Usage:
  tsx scripts/generate-piper-listening-evaluation.ts \\
    --output-dir <new-directory> [options]

Options:
  --source-package <dir>   Authoritative Phase 2A package
                           (default: ${DEFAULT_SOURCE_PACKAGE})
  --package-id <id>        Private supplemental package id
                           (default: ${DEFAULT_PRIVATE_PACKAGE_ID})
  --image <tag>            Local Piper evaluation image
                           (default: ${DEFAULT_IMAGE})
  --skip-image-build       Compatibility flag; Phase 2B always reuses the
                           already-built local image to avoid network access
  --help                   Show this help

The output must be a new immediate child of:
  ${PHASE2B_ROOT}

The source manifest must match the locked authoritative SHA-256:
  ${EXPECTED_ORIGINAL_MANIFEST_SHA256}`;
}

function normalizeArgs(args: readonly string[]): readonly string[] {
  const withoutSeparator = args[0] === "--" ? args.slice(1) : args;
  return withoutSeparator[0] === "phase2b"
    ? withoutSeparator.slice(1)
    : withoutSeparator;
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
  const normalized = normalizeArgs(args);
  if (normalized.includes("--help")) {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }
  const optionsWithValues = new Set([
    "--source-package",
    "--output-dir",
    "--package-id",
    "--image",
  ]);
  const flags = new Set(["--skip-image-build", "--help"]);
  for (let index = 0; index < normalized.length; index += 1) {
    const argument = normalized[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    if (flags.has(argument)) continue;
    if (!optionsWithValues.has(argument)) {
      throw new Error(`Unknown option: ${argument}`);
    }
    index += 1;
  }
  const suppliedOutput = optionValue(normalized, "--output-dir");
  if (!suppliedOutput) throw new Error("--output-dir is required");
  return {
    sourcePackage: resolve(
      process.cwd(),
      optionValue(normalized, "--source-package") ??
        DEFAULT_SOURCE_PACKAGE,
    ),
    outputDirectory: resolve(process.cwd(), suppliedOutput),
    privatePackageId:
      optionValue(normalized, "--package-id") ??
      DEFAULT_PRIVATE_PACKAGE_ID,
    image:
      optionValue(normalized, "--image") ?? DEFAULT_IMAGE,
  };
}

function assertImmediateChild(
  root: string,
  candidate: string,
  label: string,
): void {
  const relativePath = relative(root, candidate);
  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath.includes(sep) ||
    resolve(root, relativePath) !== candidate
  ) {
    throw new Error(`${label} must be a direct child of ${root}`);
  }
}

function assertSourcePackagePath(sourcePackage: string): void {
  assertImmediateChild(
    PHASE2A_ROOT,
    sourcePackage,
    "Phase 2A source package",
  );
}

function assertOutputDirectoryPath(outputDirectory: string): void {
  assertImmediateChild(
    PHASE2B_ROOT,
    outputDirectory,
    "Phase 2B output",
  );
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/u.test(
      basenamePortable(outputDirectory),
    )
  ) {
    throw new Error(
      "Phase 2B output directory name must use only letters, numbers, dots, underscores, and hyphens",
    );
  }
}

function basenamePortable(path: string): string {
  const parts = path.split(/[\\/]/u);
  return parts.at(-1) ?? "";
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function assertRegularNonSymlinkFile(
  path: string,
  label: string,
): Promise<void> {
  const fileStat = await lstat(path);
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file: ${path}`);
  }
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(path: string): Promise<string> {
  return sha256(await readFile(path));
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
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
      `${executable} exited ${String(result.status)}${
        stderr ? `: ${stderr}` : ""
      }`,
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
            `Production binary snapshot failed (${String(
              code,
            )}): ${Buffer.concat(errors)
              .toString("utf8")
              .trim()}`,
          ),
        );
        return;
      }
      resolvePromise(hash.digest("hex"));
    });
  });
}

async function productionAudioSnapshot(): Promise<ProductionAudioSnapshot> {
  const raw = runChecked("docker", [
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
  const parsed = JSON.parse(raw) as Omit<
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
  const changes =
    editorialLedgerJson.changes as unknown as EditorialChange[];
  return ACADEMY_MODULES.map((module) => {
    const sourceHtml = module.bodyHtml ?? "";
    const sanitizedHtml = sanitizeLessonHtml(sourceHtml);
    const originalHtml = reconstructOriginalHtml(
      sourceHtml,
      changes.filter(
        (change) => change.lessonSlug === module.slug,
      ),
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
      document.summary.blocksByClassification
        .REQUIRES_OWNER_REVIEW,
    0,
  );
  const invalidSemanticDrift = documents.reduce(
    (total, document) =>
      total +
      document.summary.blocksByClassification
        .INVALID_SEMANTIC_DRIFT,
    0,
  );
  const pendingOwnerOccurrences = documents.reduce(
    (total, document) =>
      total +
      document.summary.pendingOwnerReviewOccurrenceCount,
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
      `Narration freeze gate failed: REQUIRES_OWNER_REVIEW=${String(
        requiresOwnerReview,
      )} INVALID_SEMANTIC_DRIFT=${String(
        invalidSemanticDrift,
      )} pending=${String(
        pendingOwnerOccurrences,
      )} protected=${String(
        protectedFeatureDrifts,
      )} references=${String(recipeReferencesMatch)}`,
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
  } as const;
}

function originalManifestSampleLookup(
  manifest: Phase2BOriginalManifestInput,
): Map<string, Phase2BOriginalManifestInput["pairs"][number]["samples"][number]> {
  return new Map(
    manifest.pairs.flatMap((pair) =>
      pair.samples.map((sample) => [sample.filename, sample] as const),
    ),
  );
}

async function loadAuthoritativeOriginalPackage(
  sourcePackage: string,
): Promise<OriginalPackage> {
  assertSourcePackagePath(sourcePackage);
  await assertRegularNonSymlinkFile(
    resolve(sourcePackage, "private", "manifest.json"),
    "Authoritative manifest",
  );
  const sourceRealPath = await realpath(sourcePackage);
  if (sourceRealPath !== sourcePackage) {
    throw new Error(
      `Phase 2A package may not resolve through a symlink: ${sourcePackage}`,
    );
  }
  const manifestPath = resolve(
    sourcePackage,
    "private",
    "manifest.json",
  );
  const manifestSha256 = await sha256File(manifestPath);
  if (manifestSha256 !== EXPECTED_ORIGINAL_MANIFEST_SHA256) {
    throw new Error(
      `Authoritative manifest SHA-256 mismatch: expected ${EXPECTED_ORIGINAL_MANIFEST_SHA256}, received ${manifestSha256}`,
    );
  }
  const manifest =
    await readJson<
      Phase2BOriginalManifestInput & {
        pairs: readonly {
          pairId: string;
          excerptId: string;
          samples: readonly (Phase2BOriginalManifestInput["pairs"][number]["samples"][number] & {
            audit?: RuntimeSampleResult;
          })[];
        }[];
      }
    >(manifestPath);
  if (
    manifest.planHash !==
      "7b2037b352ea71a8077aaf5a397710afe99ec2155fad36b10d9ed27ddf94a882" ||
    manifest.pairs.length !== 4
  ) {
    throw new Error(
      "Authoritative Phase 2A manifest plan or pair count changed",
    );
  }
  const sampleLookup = originalManifestSampleLookup(manifest);
  const expectedNames = Object.keys(
    ORIGINAL_AUDIO_SHA256,
  ) as (keyof typeof ORIGINAL_AUDIO_SHA256)[];
  if (
    sampleLookup.size !== expectedNames.length ||
    expectedNames.some((name) => !sampleLookup.has(name))
  ) {
    throw new Error(
      "Authoritative Phase 2A sample filename set changed",
    );
  }
  const audio = await Promise.all(
    expectedNames.map(async (filename) => {
      const sourcePath = resolve(
        sourcePackage,
        "listening",
        "audio",
        filename,
      );
      await assertRegularNonSymlinkFile(
        sourcePath,
        `Original sample ${filename}`,
      );
      const [actualSha256, fileStat] = await Promise.all([
        sha256File(sourcePath),
        stat(sourcePath),
      ]);
      const expectedSha256 = ORIGINAL_AUDIO_SHA256[filename];
      const manifestSha256 =
        sampleLookup.get(filename)?.audio?.sha256;
      if (
        actualSha256 !== expectedSha256 ||
        manifestSha256 !== expectedSha256 ||
        fileStat.size <= 0
      ) {
        throw new Error(
          `${filename}: original audio does not match its locked file and manifest hashes`,
        );
      }
      return {
        filename,
        sourcePath,
        sha256: actualSha256,
        sizeBytes: fileStat.size,
      };
    }),
  );
  for (const pair of manifest.pairs) {
    if (
      pair.samples.length !== 2 ||
      pair.samples[0]?.blindLabel !== "A" ||
      pair.samples[1]?.blindLabel !== "B"
    ) {
      throw new Error(
        `${pair.pairId}: authoritative A/B order changed`,
      );
    }
  }
  const tablePair = manifest.pairs.find(
    (pair) => pair.pairId === "sample-02",
  );
  const tableBaseline = tablePair?.samples.find(
    (sample) => sample.pipeline === "baseline",
  )?.audio?.durationSeconds;
  const tableCorrectedSeconds = tablePair?.samples.find(
    (sample) => sample.pipeline === "corrected",
  )?.audio?.durationSeconds;
  if (
    typeof tableBaseline !== "number" ||
    typeof tableCorrectedSeconds !== "number" ||
    Math.abs(tableBaseline - 97.8) > 0.25 ||
    Math.abs(tableCorrectedSeconds - 151.5) > 0.25
  ) {
    throw new Error(
      "Authoritative table durations no longer match the 97.8s/151.5s evaluation premise",
    );
  }
  const runtimeAuditedManifest = manifest as unknown as {
    pairs: readonly {
      pairId: string;
      samples: readonly {
        pipeline: "baseline" | "corrected";
        audit?: RuntimeSampleResult;
      }[];
    }[];
  };
  const correctedOriginalSamples =
    runtimeAuditedManifest.pairs.flatMap((pair) =>
      pair.samples.filter(
        (sample) => sample.pipeline === "corrected",
      ),
    );
  const hasVerifiedSentencePause = correctedOriginalSamples.some(
    (sample) =>
      sample.audit?.segments?.some(
        (segment) =>
          segment.requestedPauseAfterMs === 220 &&
          segment.insertedPauseFrames === 4_851,
      ),
  );
  const tableCorrectedSample =
    runtimeAuditedManifest.pairs
      .find((pair) => pair.pairId === "sample-02")
      ?.samples.find(
        (sample) => sample.pipeline === "corrected",
      );
  const verifiedTablePauseCount =
    tableCorrectedSample?.audit?.segments?.filter(
      (segment) =>
        segment.requestedPauseAfterMs === 400 &&
        segment.insertedPauseFrames === 8_820,
    ).length ?? 0;
  if (!hasVerifiedSentencePause || verifiedTablePauseCount < 11) {
    throw new Error(
      "Authoritative Phase 2A runtime audit no longer proves sentence and table-row pause insertion",
    );
  }
  return {
    manifestPath,
    manifestSha256,
    manifest,
    audio,
    tableDurations: {
      baselineSeconds: tableBaseline,
      correctedSeconds: tableCorrectedSeconds,
    },
  };
}

async function assertOriginalPackageStillUnchanged(
  original: OriginalPackage,
): Promise<void> {
  if (
    (await sha256File(original.manifestPath)) !==
    original.manifestSha256
  ) {
    throw new Error(
      "Authoritative Phase 2A manifest changed during Phase 2B generation",
    );
  }
  for (const sample of original.audio) {
    if ((await sha256File(sample.sourcePath)) !== sample.sha256) {
      throw new Error(
        `${sample.filename}: authoritative Phase 2A audio changed during generation`,
      );
    }
  }
}

async function copyOriginalAudio(
  original: OriginalPackage,
  audioDirectory: string,
): Promise<void> {
  for (const sample of original.audio) {
    const destination = resolve(
      audioDirectory,
      sample.filename,
    );
    await copyFile(
      sample.sourcePath,
      destination,
      fsConstants.COPYFILE_EXCL,
    );
    const [copiedSha256, copiedStat] = await Promise.all([
      sha256File(destination),
      stat(destination),
    ]);
    if (
      copiedSha256 !== sample.sha256 ||
      copiedStat.size !== sample.sizeBytes
    ) {
      throw new Error(
        `${sample.filename}: copied Phase 2A audio failed byte-preservation check`,
      );
    }
  }
}

function createRuntimePlan(
  planHash: string,
  samples: ReturnType<typeof phase2BRuntimeSamples>,
) {
  return {
    version: "tenxpros-piper-evaluation-runtime-plan-v1",
    recipeHash: planHash,
    voice: {
      id: PIPER_EVALUATION_BRYCE_VOICE.id,
      modelPath: `/opt/piper/voices/${PIPER_EVALUATION_BRYCE_VOICE.modelFile}`,
      configPath: `/opt/piper/voices/${PIPER_EVALUATION_BRYCE_VOICE.modelFile}.json`,
      expectedModelSha256:
        PIPER_EVALUATION_BRYCE_VOICE.modelSha256,
    },
    sampleRate: PIPER_EVALUATION_BRYCE_VOICE.nativeSampleRateHz,
    format: {
      intermediate:
        "PCM signed 16-bit little-endian mono WAV",
      final: "MP3 mono 64 kbps CBR",
    },
    loudness: {
      method:
        "single constant gain after stitching; no compression or limiter",
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
    samples,
  };
}

function runtimeAllPassed(runtime: RuntimeResults): boolean {
  return (
    runtime.version === "piper-corrected-evaluation-results-v1" &&
    runtime.runtimeVersion ===
      "piper-corrected-evaluation-runtime-v1" &&
    runtime.passed !== false &&
    runtime.allPassed !== false &&
    runtime.summary?.samples === 2 &&
    runtime.summary.passed === 2 &&
    runtime.summary.failed === 0 &&
    runtime.summary.allPassed === true &&
    runtime.summary.allEligibleForBlindReview === true &&
    runtime.samples.length === 2 &&
    runtime.isolation?.isolated === true &&
    runtime.isolation.externalApiRequests === 0 &&
    runtime.isolation.databaseImports === 0 &&
    runtime.isolation.prismaImports === 0 &&
    runtime.samples.every(
      (sample) =>
        sample.passed === true &&
        sample.eligibleForBlindReview === true,
    )
  );
}

async function assertRuntimeArtifactIntegrity(
  runtime: RuntimeResults,
  runtimePlanPath: string,
  planHash: string,
): Promise<void> {
  const [expectedPlanSha256, expectedRuntimeSourceSha256] =
    await Promise.all([
      sha256File(runtimePlanPath),
      sha256File(
        resolve(SCRIPT_DIRECTORY, "piper-evaluation-runtime.cjs"),
      ),
    ]);
  if (
    runtime.plan?.version !==
      "tenxpros-piper-evaluation-runtime-plan-v1" ||
    runtime.plan.recipeHash !== planHash ||
    runtime.plan.sampleCount !== 2 ||
    runtime.plan.sha256 !== expectedPlanSha256 ||
    runtime.runtime?.sourceSha256 !== expectedRuntimeSourceSha256
  ) {
    throw new Error(
      "The local runtime image, executed plan, or result contract does not match the checked-in Phase 2B inputs",
    );
  }
}

function runtimeResultKey(sample: RuntimeSampleResult): string {
  return sample.fileName ?? sample.filename ?? "";
}

function finalizeSupplementalManifest(
  provisional: PiperEvaluationPrivateManifest,
  runtime: RuntimeResults,
): PiperEvaluationPrivateManifest {
  const runtimeByFilename = new Map(
    runtime.samples.map((sample) => [
      runtimeResultKey(sample),
      sample,
    ]),
  );
  const finalizeSample = (
    sample: PiperEvaluationPrivateManifest["pairs"][number]["samples"][number],
  ) => {
    const result = runtimeByFilename.get(sample.filename);
    if (
      !result ||
      typeof result.durationSeconds !== "number" ||
      typeof result.sizeBytes !== "number" ||
      typeof result.sha256 !== "string" ||
      result.pairId !== sample.pairId ||
      result.label !== sample.blindLabel ||
      result.pipeline !== sample.pipeline
    ) {
      throw new Error(
        `Runtime result is incomplete for ${sample.filename}`,
      );
    }
    return {
      ...sample,
      audio: {
        status: "generated",
        durationSeconds: result.durationSeconds,
        sizeBytes: result.sizeBytes,
        sha256: result.sha256,
      },
      audit: result,
    };
  };
  return {
    ...provisional,
    pairs: provisional.pairs.map((pair) => ({
      ...pair,
      samples: [
        finalizeSample(pair.samples[0]),
        finalizeSample(pair.samples[1]),
      ],
    })),
  } as unknown as PiperEvaluationPrivateManifest;
}

function assertSupplementalPauseCoverage(
  plan: ReturnType<typeof buildPhase2BPauseCoveragePlan>,
  runtime: RuntimeResults,
) {
  const correctedPlan = plan.excerpts[0]?.pipelines.corrected;
  const correctedRuntime = runtime.samples.find(
    (sample) => sample.pipeline === "corrected",
  );
  if (!correctedPlan || !correctedRuntime) {
    throw new Error("Supplemental corrected sample is missing");
  }
  const plannedPauseCounts = new Map<number, number>();
  for (const unit of correctedPlan.units) {
    plannedPauseCounts.set(
      unit.pauseAfterMs,
      (plannedPauseCounts.get(unit.pauseAfterMs) ?? 0) + 1,
    );
  }
  const observedPauseCounts = new Map<number, number>();
  for (const segment of correctedRuntime.segments ?? []) {
    const milliseconds = segment.requestedPauseAfterMs;
    if (
      typeof milliseconds === "number" &&
      segment.insertedPauseFrames ===
        (PIPER_EVALUATION_BRYCE_VOICE.nativeSampleRateHz *
          milliseconds) /
          1_000
    ) {
      observedPauseCounts.set(
        milliseconds,
        (observedPauseCounts.get(milliseconds) ?? 0) + 1,
      );
    }
  }
  const required = {
    list: 280,
    paragraph: 500,
    heading: 700,
    section: 900,
  } as const;
  for (const [pauseType, milliseconds] of Object.entries(
    required,
  )) {
    if (
      (plannedPauseCounts.get(milliseconds) ?? 0) < 1 ||
      (observedPauseCounts.get(milliseconds) ?? 0) < 1
    ) {
      throw new Error(
        `${pauseType} pause ${String(milliseconds)}ms was not acoustically exercised`,
      );
    }
  }
  if ((plannedPauseCounts.get(280) ?? 0) < 3) {
    throw new Error(
      "Supplemental plan must exercise at least three ordered-list pauses",
    );
  }
  return {
    sentence: {
      milliseconds: 220,
      exercisedBy: ["sample-01", "sample-02", "sample-03", "sample-04", "sample-05"],
    },
    tableRow: {
      milliseconds: 400,
      exercisedBy: ["sample-02"],
    },
    list: {
      milliseconds: 280,
      exercisedBy: ["sample-05"],
      plannedOccurrences: plannedPauseCounts.get(280) ?? 0,
      runtimeOccurrences: observedPauseCounts.get(280) ?? 0,
    },
    paragraph: {
      milliseconds: 500,
      exercisedBy: ["sample-05"],
      plannedOccurrences: plannedPauseCounts.get(500) ?? 0,
      runtimeOccurrences: observedPauseCounts.get(500) ?? 0,
    },
    heading: {
      milliseconds: 700,
      exercisedBy: ["sample-05"],
      plannedOccurrences: plannedPauseCounts.get(700) ?? 0,
      runtimeOccurrences: observedPauseCounts.get(700) ?? 0,
    },
    section: {
      milliseconds: 900,
      exercisedBy: ["sample-05"],
      plannedOccurrences: plannedPauseCounts.get(900) ?? 0,
      runtimeOccurrences: observedPauseCounts.get(900) ?? 0,
      note:
        "Evaluation-only source-locked transition fixture after the second callout and before the following H2; the current corpus has no native sectionBreak block.",
    },
  } as const;
}

async function assertAllAudioPresent(
  outputDirectory: string,
  privateManifest: Phase2BPrivateAnalysisManifest,
): Promise<void> {
  const expectedFiles = privateManifest.pairs.flatMap((pair) =>
    pair.samples.map((sample) => sample),
  );
  if (expectedFiles.length !== 10) {
    throw new Error(
      `Phase 2B must contain exactly ten audio files; received ${String(
        expectedFiles.length,
      )}`,
    );
  }
  for (const sample of expectedFiles) {
    const path = resolve(
      outputDirectory,
      "listener-package",
      "audio",
      sample.filename,
    );
    await assertRegularNonSymlinkFile(
      path,
      `Listener audio ${sample.filename}`,
    );
    const fileStat = await stat(path);
    const actualSha256 = await sha256File(path);
    if (
      fileStat.size <= 0 ||
      !sample.sha256 ||
      !/^[a-f0-9]{64}$/u.test(sample.sha256) ||
      actualSha256 !== sample.sha256
    ) {
      throw new Error(
        `${sample.filename}: listener audio integrity check failed`,
      );
    }
  }
}

function validateListenerAudioWithIsolatedTools(
  image: string,
  listenerDirectory: string,
  publicPackage: Phase2BPublicPackage,
): AudioValidationResult {
  const filenames = publicPackage.pairs
    .flatMap((pair) =>
      pair.samples.map((sample) => sample.filename),
    )
    .sort();
  if (
    filenames.length !== 10 ||
    new Set(filenames).size !== filenames.length ||
    filenames.some(
      (filename) =>
        !/^sample-(?:0[1-5])-[AB]\.mp3$/u.test(filename),
    )
  ) {
    throw new Error(
      "Listener audio decode allowlist is not the expected ten blind files",
    );
  }
  const metadataOutput = runChecked("docker", [
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
    "64",
    "--tmpfs",
    "/tmp:rw,nosuid,nodev,size=64m",
    "--mount",
    `type=bind,src=${listenerDirectory},dst=/listener,readonly`,
    "--entrypoint",
    "/bin/sh",
    image,
    "-eu",
    "-c",
    [
      "for name do",
      '  /usr/bin/ffmpeg -v error -nostdin -i "/listener/audio/$name" -map 0:a:0 -f null -',
      '  test "$(/usr/bin/ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "/listener/audio/$name")" = mp3',
      '  test "$(/usr/bin/ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1 "/listener/audio/$name")" = 22050',
      '  test "$(/usr/bin/ffprobe -v error -select_streams a:0 -show_entries stream=channels -of default=noprint_wrappers=1:nokey=1 "/listener/audio/$name")" = 1',
      '  /usr/bin/ffprobe -v error -show_entries format_tags:stream_tags -of json "/listener/audio/$name"',
      "done",
    ].join("\n"),
    "phase2b-audio-validation",
    ...filenames,
  ]);
  const normalizedMetadata = metadataOutput
    .normalize("NFKC")
    .toLowerCase();
  const prohibitedMetadataTokens = [
    "baseline",
    "corrected",
    "semantic",
    "piper",
    "bryce",
    "en_us-bryce",
    ".onnx",
    "mission",
    "journey",
    "conversation",
    "rules",
    "recipe",
    "manifest",
    "/opt/",
    "scratch_academy",
  ];
  const found = prohibitedMetadataTokens.filter((token) =>
    normalizedMetadata.includes(token),
  );
  if (found.length > 0) {
    throw new Error(
      `Listener MP3 metadata exposes prohibited token(s): ${found.join(
        ", ",
      )}`,
    );
  }
  return {
    filesDecoded: filenames,
    allDecoded: true,
    metadataScan: "PASS",
    prohibitedMetadataTokensFound: [],
    externalNetwork: "none",
  };
}

function assertLocalImageAvailable(image: string): string {
  const imageId = runChecked("docker", [
    "image",
    "inspect",
    "--format",
    "{{.Id}}",
    image,
  ]);
  if (!/^sha256:[a-f0-9]{64}$/u.test(imageId)) {
    throw new Error(
      `Unexpected local evaluation image id for ${image}`,
    );
  }
  return imageId;
}

function runRuntimeSelfTest(image: string): unknown {
  const raw = runChecked("docker", [
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
    "64",
    "--tmpfs",
    "/tmp:rw,nosuid,nodev,size=64m",
    image,
    "--self-test",
  ]);
  const result = JSON.parse(raw) as {
    passed?: boolean;
    assertions?: number;
  };
  if (result.passed !== true || (result.assertions ?? 0) < 1) {
    throw new Error("Local evaluation runtime self-test failed");
  }
  return result;
}

function runSupplementalRuntime(options: ParsedOptions): void {
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
}

async function readRuntimeResults(
  outputDirectory: string,
): Promise<RuntimeResults> {
  return readJson<RuntimeResults>(
    resolve(outputDirectory, RUNTIME_RESULT_RELATIVE_PATH),
  );
}

async function copySupplementalRuntimeAudio(
  outputDirectory: string,
  listenerAudioDirectory: string,
  runtime: RuntimeResults,
): Promise<void> {
  for (const sample of runtime.samples) {
    const filename = runtimeResultKey(sample);
    if (
      !/^sample-05-[AB]\.mp3$/u.test(filename) ||
      typeof sample.sha256 !== "string" ||
      typeof sample.sizeBytes !== "number"
    ) {
      throw new Error(
        `Unexpected supplemental runtime output: ${filename || "(missing filename)"}`,
      );
    }
    const source = resolve(
      outputDirectory,
      "listening",
      "audio",
      filename,
    );
    const destination = resolve(listenerAudioDirectory, filename);
    await assertRegularNonSymlinkFile(
      source,
      `Supplemental runtime sample ${filename}`,
    );
    await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
    const [actualSha256, copiedStat] = await Promise.all([
      sha256File(destination),
      stat(destination),
    ]);
    if (
      actualSha256 !== sample.sha256 ||
      copiedStat.size !== sample.sizeBytes
    ) {
      throw new Error(
        `${filename}: supplemental listener copy failed integrity verification`,
      );
    }
  }
}

async function createListenerArtifacts(
  outputDirectory: string,
  publicPackage: Phase2BPublicPackage,
  _image: string,
): Promise<ListenerArtifactResult> {
  const listenerDirectory = resolve(
    outputDirectory,
    "listener-package",
  );
  const html = renderPhase2BListeningHtml(publicPackage);
  const instructions = renderPhase2BListenerInstructions();
  await Promise.all([
    writeFile(
      resolve(listenerDirectory, PHASE2B_LISTENER_HTML_FILENAME),
      html,
      { encoding: "utf8", mode: 0o644, flag: "wx" },
    ),
    writeFile(
      resolve(
        listenerDirectory,
        PHASE2B_LISTENER_INSTRUCTIONS_FILENAME,
      ),
      instructions,
      { encoding: "utf8", mode: 0o644, flag: "wx" },
    ),
  ]);
  const audioFiles = await Promise.all(
    publicPackage.pairs.flatMap((pair) =>
      pair.samples.map(async (sample): Promise<Phase2BPublicFile> => {
        const path = resolve(
          listenerDirectory,
          "audio",
          sample.filename,
        );
        await assertRegularNonSymlinkFile(
          path,
          `Public audio ${sample.filename}`,
        );
        return {
          path: `audio/${sample.filename}`,
          data: await readFile(path),
        };
      }),
    ),
  );
  const files: Phase2BPublicFile[] = [
    {
      path: PHASE2B_LISTENER_HTML_FILENAME,
      data: html,
    },
    {
      path: PHASE2B_LISTENER_INSTRUCTIONS_FILENAME,
      data: instructions,
    },
    ...audioFiles,
  ];
  const scan = assertPhase2BPublicPackageSafe({
    publicPackage,
    files,
  });
  const archiveRoot = `blind-audio-review-${publicPackage.evaluation_package_id.slice(
    -16,
  )}`;
  const zipPath = resolve(outputDirectory, `${archiveRoot}.zip`);
  const zip = await writeDeterministicZip(
    zipPath,
    files.map((file) => ({
      path: `${archiveRoot}/${file.path}`,
      data: file.data,
    })),
  );
  const zipListing = runChecked("busybox", ["unzip", "-l", zipPath]);
  if (
    zip.entries.some(
      (entry) => !zipListing.includes(entry),
    )
  ) {
    throw new Error("ZIP central-directory validation failed");
  }
  return {
    listenerDirectory,
    zipPath,
    zipSha256: zip.sha256,
    publicFiles: files.map((file) => file.path).sort(),
    scan,
  };
}

async function generateCore(
  options: ParsedOptions,
  original: OriginalPackage,
): Promise<GenerationContext> {
  const privateDirectory = resolve(
    options.outputDirectory,
    "private",
  );
  const listenerAudioDirectory = resolve(
    options.outputDirectory,
    "listener-package",
    "audio",
  );
  await Promise.all([
    mkdir(privateDirectory, { recursive: true, mode: 0o700 }),
    mkdir(listenerAudioDirectory, {
      recursive: true,
      mode: 0o755,
    }),
  ]);
  await copyOriginalAudio(original, listenerAudioDirectory);

  const corpus = buildNarrationCorpus();
  const alignment = alignmentFreezeAudit(corpus);
  const mission = corpus.find(({ slug }) => slug === "mission");
  if (!mission) throw new Error("Mission lesson is missing");
  const plan = buildPhase2BPauseCoveragePlan({
    html: mission.sanitizedHtml,
    document: mission.document,
  });
  const blindSeed = randomBytes(32).toString("hex");
  const provisionalSupplemental =
    buildPhase2BSupplementalManifest(
      plan,
      blindSeed,
      options.privatePackageId,
    );
  const runtimePlan = createRuntimePlan(
    plan.planHash,
    phase2BRuntimeSamples(provisionalSupplemental),
  );
  const runtimePlanPath = resolve(
    privateDirectory,
    "runtime-plan.json",
  );
  await Promise.all([
    writeJson(
      runtimePlanPath,
      runtimePlan,
    ),
    writeJson(
      resolve(privateDirectory, "supplemental-manifest.pending.json"),
      {
        ...provisionalSupplemental,
        plan,
        alignment,
      },
    ),
  ]);

  const imageId = assertLocalImageAvailable(options.image);
  const runtimeSelfTest = runRuntimeSelfTest(options.image);
  await writeJson(
    resolve(privateDirectory, "runtime-self-test.json"),
    {
      image: options.image,
      imageId,
      network: "none",
      result: runtimeSelfTest,
    },
  );
  runSupplementalRuntime(options);
  const runtime = await readRuntimeResults(options.outputDirectory);
  await assertRuntimeArtifactIntegrity(
    runtime,
    runtimePlanPath,
    plan.planHash,
  );
  if (!runtimeAllPassed(runtime)) {
    throw new Error(
      `Supplemental runtime did not pass all isolation/audio gates: ${resolve(
        options.outputDirectory,
        RUNTIME_RESULT_RELATIVE_PATH,
      )}`,
    );
  }
  await copySupplementalRuntimeAudio(
    options.outputDirectory,
    listenerAudioDirectory,
    runtime,
  );
  const supplementalManifest = finalizeSupplementalManifest(
    provisionalSupplemental,
    runtime,
  );
  const manifests = createPhase2BPackageManifests({
    originalManifest: original.manifest,
    originalManifestPath: original.manifestPath,
    originalManifestSha256: original.manifestSha256,
    supplementalManifest,
  });
  const pauseCoverage = assertSupplementalPauseCoverage(
    plan,
    runtime,
  );
  await Promise.all([
    writeJson(
      resolve(privateDirectory, "supplemental-manifest.json"),
      {
        ...supplementalManifest,
        plan,
        createdAt: new Date().toISOString(),
      },
    ),
    writeJson(
      resolve(privateDirectory, "manifest.json"),
      manifests.privateManifest,
    ),
    writeJson(
      resolve(privateDirectory, "public-package.json"),
      manifests.publicPackage,
    ),
    writeJson(
      resolve(privateDirectory, "pause-coverage.json"),
      pauseCoverage,
    ),
  ]);

  const listenerArtifacts = await createListenerArtifacts(
    options.outputDirectory,
    manifests.publicPackage,
    options.image,
  );
  await assertAllAudioPresent(
    options.outputDirectory,
    manifests.privateManifest,
  );
  const audioValidation = validateListenerAudioWithIsolatedTools(
    options.image,
    listenerArtifacts.listenerDirectory,
    manifests.publicPackage,
  );
  await assertOriginalPackageStillUnchanged(original);
  return {
    alignment,
    original,
    planHash: plan.planHash,
    supplementalManifest,
    runtimeSelfTest,
    runtime,
    privateManifest: manifests.privateManifest,
    publicPackage: manifests.publicPackage,
    listenerArtifacts,
    audioValidation,
    pauseCoverage,
  };
}

async function initializeOutput(
  options: ParsedOptions,
): Promise<void> {
  assertOutputDirectoryPath(options.outputDirectory);
  await mkdir(PHASE2B_ROOT, { recursive: true, mode: 0o775 });
  if ((await realpath(PHASE2B_ROOT)) !== PHASE2B_ROOT) {
    throw new Error(
      `Phase 2B root may not be a symlink: ${PHASE2B_ROOT}`,
    );
  }
  if (await pathExists(options.outputDirectory)) {
    throw new Error(
      `Refusing to overwrite existing Phase 2B directory: ${options.outputDirectory}`,
    );
  }
  await mkdir(options.outputDirectory, {
    recursive: false,
    mode: 0o775,
  });
  await mkdir(resolve(options.outputDirectory, "private"), {
    recursive: false,
    mode: 0o700,
  });
}

function buildAudit(
  options: ParsedOptions,
  context: GenerationContext,
  before: ProductionAudioSnapshot,
  after: ProductionAudioSnapshot,
) {
  return {
    schemaVersion: "academy-blind-listening-generation-audit-v1",
    status: "PASS",
    createdAt: new Date().toISOString(),
    outputDirectory: options.outputDirectory,
    authoritativePhase2A: {
      packageDirectory: options.sourcePackage,
      manifestPath: context.original.manifestPath,
      manifestSha256: context.original.manifestSha256,
      expectedManifestSha256:
        EXPECTED_ORIGINAL_MANIFEST_SHA256,
      originalSampleCount: context.original.audio.length,
      samples: context.original.audio.map((sample) => ({
        filename: sample.filename,
        sha256: sample.sha256,
        sizeBytes: sample.sizeBytes,
        byteForBytePreserved: true,
      })),
    },
    supplemental: {
      pairCount: 1,
      sampleCount: 2,
      pairId: "sample-05",
      planHash: context.planHash,
      runtimeSelfTest: context.runtimeSelfTest,
      runtime: context.runtime,
    },
    pauseCoverage: context.pauseCoverage,
    tableEfficiency: {
      dimension: "table_efficiency",
      pairId: "sample-02",
      baselineDurationSeconds:
        context.original.tableDurations.baselineSeconds,
      correctedDurationSeconds:
        context.original.tableDurations.correctedSeconds,
      narrationWasNotChanged: true,
    },
    listenerPackage: {
      evaluationPackageId:
        context.publicPackage.evaluation_package_id,
      directory: context.listenerArtifacts.listenerDirectory,
      zipPath: context.listenerArtifacts.zipPath,
      zipSha256: context.listenerArtifacts.zipSha256,
      publicFiles: context.listenerArtifacts.publicFiles,
      unblindingScan: context.listenerArtifacts.scan,
    },
    audioValidation: context.audioValidation,
    isolation: {
      containerNetwork: "none",
      rootFilesystem: "read-only",
      productionDatabaseMounted: false,
      productionStorageMounted: false,
      externalApiCalls: 0,
      externalTtsRequests: 0,
      elevenLabsRequests: 0,
      fullAcademyRegeneration: false,
      deployed: false,
      activePlayerChanged: false,
    },
    productionAudio: {
      before,
      after,
      byteForByteUnchanged: true,
    },
  };
}

export async function generatePhase2BListeningPackage(
  rawArgs: readonly string[],
): Promise<void> {
  const options = parseOptions(rawArgs);
  assertSourcePackagePath(options.sourcePackage);
  const original = await loadAuthoritativeOriginalPackage(
    options.sourcePackage,
  );
  const before = await productionAudioSnapshot();
  if (before.count !== EXPECTED_PRODUCTION_AUDIO_ROWS) {
    throw new Error(
      `Production safety gate expected ${String(
        EXPECTED_PRODUCTION_AUDIO_ROWS,
      )} audio rows, found ${String(before.count)}`,
    );
  }
  await initializeOutput(options);
  await writeJson(
    resolve(options.outputDirectory, "private", "production-before.json"),
    before,
  );

  let context: GenerationContext | undefined;
  let generationError: unknown;
  try {
    context = await generateCore(options, original);
  } catch (error) {
    generationError = error;
  }

  const after = await productionAudioSnapshot();
  const productionUnchanged = productionSnapshotsMatch(before, after);
  await writeJson(
    resolve(
      options.outputDirectory,
      "private",
      "production-after.json",
    ),
    {
      ...after,
      byteForByteUnchanged: productionUnchanged,
    },
  );
  if (!productionUnchanged) {
    throw new Error(
      "Production AcademyLessonAudio changed during isolated Phase 2B generation",
      { cause: generationError },
    );
  }
  if (generationError) throw generationError;
  if (!context) {
    throw new Error("Phase 2B generation produced no context");
  }
  await assertOriginalPackageStillUnchanged(original);
  const audit = buildAudit(options, context, before, after);
  await writeJson(
    resolve(options.outputDirectory, "private", "audit.json"),
    audit,
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "PASS",
        outputDirectory: options.outputDirectory,
        evaluationPackageId:
          context.publicPackage.evaluation_package_id,
        originalSamplesPreserved: 8,
        supplementalSamplesGenerated: 2,
        totalListenerSamples: 10,
        listenerDirectory:
          context.listenerArtifacts.listenerDirectory,
        zipPath: context.listenerArtifacts.zipPath,
        zipSha256: context.listenerArtifacts.zipSha256,
        privateManifest: resolve(
          options.outputDirectory,
          "private",
          "manifest.json",
        ),
        pauseCoverage: context.pauseCoverage,
        productionAudio: {
          count: after.count,
          bytes: after.bytes,
          sha256: after.binaryCopySha256,
          byteForByteUnchanged: true,
        },
        externalTtsRequests: 0,
        elevenLabsRequests: 0,
      },
      null,
      2,
    )}\n`,
  );
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && resolve(entry) === fileURLToPath(import.meta.url));
}

if (isDirectExecution()) {
  generatePhase2BListeningPackage(process.argv.slice(2)).catch(
    (error: unknown) => {
      const message =
        error instanceof Error
          ? error.stack ?? error.message
          : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    },
  );
}
