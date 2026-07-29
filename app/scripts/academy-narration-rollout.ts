#!/usr/bin/env tsx

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  constants,
  mkdir,
  open,
  readFile,
  stat,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import editorialLedgerJson from "../prisma/seed/academy/editorial-ledger.phase0.json";
import phase0InventoryJson from "../prisma/seed/academy/content-inventory.phase0.json";
import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import {
  applyEditorialChanges,
  assessSemanticPreservation,
  inspectHtmlStructure,
  reconstructOriginalHtml,
  sha256,
  validateEditorialLedger,
  validatePhase0BaselineInventory,
  type AcademyLessonForReview,
  type EditorialChange,
  type Phase0BaselineInventory,
} from "../src/lib/academy/content-review";
import {
  htmlToPlainText,
  sanitizeLessonHtml,
} from "../src/lib/academy/lesson-html";
import { prisma } from "../src/lib/prisma";
import {
  ACADEMY_NARRATION_DEPLOYMENT_ID,
  FINAL_ACADEMY_NARRATION_RECIPE_HASH,
  FINAL_ACADEMY_NARRATION_RECIPE_VERSION,
  visibleLessonContentHash,
} from "../src/lib/academy/narration-release";
import {
  ACADEMY_BOUNDARY_AUDIT_VERSION,
} from "../src/lib/academy/narration/boundary-audit-policy";

const execFileAsync = promisify(execFile);
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "../..");
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const EXPECTED_LEGACY = Object.freeze({
  rows: 51,
  bytes: 271_123_569,
  rowMd5Aggregate:
    "307e49138be9ea27192a3bef9f060d18",
  binaryCopySha256:
    "2ba47ce80f134b47f210a00ba6d47639742596df536c396ee3f651757859202d",
  recordAggregateSha256:
    "a51ddc5550e8643739939d35858717824dedb086a1750541c74178307688f8aa",
});
const SOURCE_LOCATIONS = [
  "prisma/seed/academy/m01-mission.ts",
  "prisma/seed/academy/m02-identity.ts",
  "prisma/seed/academy/m03-rules.ts",
  "prisma/seed/academy/m04-product.ts",
  "prisma/seed/academy/m05-journey.ts",
  "prisma/seed/academy/m06-ranks.ts",
  "prisma/seed/academy/m07-coach.ts",
  "prisma/seed/academy/m08-selling.ts",
  "prisma/seed/academy/m09-prospecting.ts",
  "prisma/seed/academy/m10-conversation.ts",
  "prisma/seed/academy/m11-operations.ts",
  "prisma/seed/academy/m12-mechanics.ts",
  "prisma/seed/academy/m13-motions.ts",
  "prisma/seed/academy/m14-customize.ts",
  "prisma/seed/academy/m15-contact.ts",
  "prisma/seed/academy/m16-alumni.ts",
  "prisma/seed/academy/m17-sharing.ts",
] as const;
const CLASSIFICATIONS = [
  "APPROVED_PHASE0_EDIT",
  "PREEXISTING_PRODUCTION_ONLY_CONTENT",
  "SANITIZATION_OR_SERIALIZATION_DIFFERENCE",
  "STRUCTURAL_EQUIVALENCE",
  "PROTECTED_CONTENT_DIFFERENCE",
  "UNEXPLAINED_CONFLICT",
] as const;
type Classification = (typeof CLASSIFICATIONS)[number];
type JsonObject = Record<string, unknown>;

interface ContentReconciliationManifest {
  schemaVersion: string;
  manifestHash: string;
  passed: boolean;
  summary: {
    approvedEditCount: number;
    unresolvedConflicts: number;
    protectedConflicts: number;
  };
  lessons: Array<{
    moduleId: string;
    moduleSlug: string;
    moduleOrder: number;
    contentVersion: number;
    lessonId: string;
    lessonOrder: number;
    title: string;
    productionBodyHtmlSha256: string;
    mergedBodyHtmlSha256: string;
    mergedAudioTextSha256: string;
    mergedBodyHtml: string;
    mergedAudioText: string;
  }>;
}

interface FullGenerationPlan {
  planHash: string;
  releaseId: string;
  recipeVersion: string;
  recipeHash: string;
  sourceContentManifestHash: string;
  expectedAssetCount: number;
  voice: {
    id: string;
  };
  lessons: Array<{
    lessonId: string;
    slug: string;
    order: number;
    contentHash: string;
    spokenScriptHash: string;
    rendererVersion: string;
    normalizationVersion: string;
    pronunciationVersion: string;
    segmentationVersion: string;
    blocks: Array<{
      index: number;
      semanticBlockId: string;
      sourceType: string;
      sourceHash: string;
      spokenHash: string;
    }>;
  }>;
}

interface FullGenerationReleaseManifest {
  schemaVersion: string;
  releaseId: string;
  planHash: string;
  recipeVersion: string;
  recipeHash: string;
  sourceContentManifestHash: string;
  generationStartedAt: string;
  generationCompletedAt: string;
  assetCount: number;
  generatedAssetCount: number;
  assetChecksums: Array<{
    lessonSlug: string;
    lessonOrder: number;
    checksumSha256: string;
    sizeBytes: number;
  }>;
  checks: Array<{
    id: string;
    pass: boolean;
  }>;
  releaseChecksumSha256: string;
  auditManifestHash: string;
  passed: boolean;
}

interface CorrectedReleaseAudit {
  schemaVersion: string;
  auditVersion: string;
  releaseId: string;
  planHash: string;
  recipeVersion: string;
  recipeHash: string;
  sourceContentManifestHash: string;
  preservedReleaseManifestSha256: string;
  preservedAssetChecksums: Array<{
    lessonSlug: string;
    sha256: string;
    bytes: number;
  }>;
  rootCauseCounts: {
    AUDITOR_IMPLEMENTATION_BUG: number;
    AUDIT_THRESHOLD_MISMATCH: number;
    BOUNDARY_TYPE_MISCLASSIFICATION: number;
    PCM_TO_MP3_MEASUREMENT_DRIFT: number;
    GENERATION_IMPLEMENTATION_BUG: number;
    TRUE_AUDIBLE_BOUNDARY_DEFECT: number;
    INCONCLUSIVE: number;
  };
  assets: Array<{
    lessonSlug: string;
    assetSha256: string;
    bytes: number;
    assetAuditPassed: boolean;
    failedAssetChecks: unknown[];
    stitchWarnings: number;
    frameCountsMatch: boolean;
    minimumSpeechCorrelation: number;
  }>;
  boundaryCount: number;
  correctedBoundaryFailureCount: number;
  correctedBoundaryFailures: unknown[];
  checks: Array<{
    id: string;
    pass: boolean;
  }>;
  externalApiCalls: number;
  audioRegenerated: boolean;
  passed: boolean;
  deterministicPayloadHash: string;
}

interface FullGenerationAssetManifest {
  releaseId: string;
  planHash: string;
  recipeVersion: string;
  recipeHash: string;
  voiceId: string;
  lessonId: string;
  lessonSlug: string;
  lessonOrder: number;
  contentHash: string;
  spokenScriptHash: string;
  mimeType: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  bitrateKbps: number;
  sizeBytes: number;
  checksumSha256: string;
  integratedLufs: number;
  truePeakDbtp: number;
  generationMetadata: JsonObject;
  chunkRecords: Array<{
    blockIndex: number;
    semanticBlockId: string;
    blockType: string;
    sourceHash: string;
    spokenHash: string;
    generationStatus: string;
    pcmChecksum: string;
    measuredLeadingSilenceMs: number | null;
    measuredTrailingSilenceMs: number | null;
    insertedSilenceMs: number;
    effectiveBoundaryPauseMs: number | null;
    retryCount: number;
    resumed: boolean;
  }>;
  passed: boolean;
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
    const record = value as JsonObject;
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

async function writeRestricted(
  path: string,
  value: string | Buffer,
  exclusive = true,
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
      (exclusive ? constants.O_EXCL : constants.O_TRUNC) |
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

function option(args: readonly string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function command(
  executable: string,
  args: readonly string[],
  cwd = REPOSITORY_ROOT,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execFileAsync(executable, [...args], {
      cwd,
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
      env: {
        PATH:
          process.env.PATH ??
          "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      },
    });
    return {
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      exitCode: 0,
    };
  } catch (error) {
    const failure = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    return {
      stdout: failure.stdout?.trim() ?? "",
      stderr: failure.stderr?.trim() ?? String(error),
      exitCode:
        typeof failure.code === "number" ? failure.code : 1,
    };
  }
}

async function binaryCopySha256(): Promise<string> {
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
        "-X",
        "-q",
        "-c",
        'COPY (SELECT id, data FROM "AcademyLessonAudio" ORDER BY id) TO STDOUT WITH (FORMAT binary)',
      ],
      {
        cwd: REPOSITORY_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.stdout.on("data", (chunk: Buffer) => hash.update(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Legacy binary COPY failed (${String(code)}): ${Buffer.concat(errors).toString("utf8")}`,
          ),
        );
        return;
      }
      resolvePromise(hash.digest("hex"));
    });
  });
}

async function legacySnapshot() {
  const rows = await prisma.academyLessonAudio.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      lessonId: true,
      voice: true,
      textHash: true,
      engine: true,
      mimeType: true,
      sizeBytes: true,
      durationSeconds: true,
      createdAt: true,
      updatedAt: true,
      data: true,
    },
  });
  const perRow = rows.map((row) => {
    const data = Buffer.from(row.data);
    return {
      id: row.id,
      lessonId: row.lessonId,
      voice: row.voice,
      textHash: row.textHash,
      engine: row.engine,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      durationSeconds: row.durationSeconds,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      dataMd5: createHash("md5").update(data).digest("hex"),
      dataSha256: createHash("sha256").update(data).digest("hex"),
    };
  });
  const rowMd5Aggregate = createHash("md5")
    .update(
      perRow
        .map((row) => `${row.id}:${row.dataMd5}`)
        .join(","),
    )
    .digest("hex");
  const snapshot = {
    rows: rows.length,
    bytes: rows.reduce(
      (total, row) => total + Buffer.byteLength(row.data),
      0,
    ),
    rowMd5Aggregate,
    binaryCopySha256: await binaryCopySha256(),
    recordAggregateSha256: sha256(
      canonical(perRow),
    ),
    perRow,
  };
  if (
    snapshot.rows !== EXPECTED_LEGACY.rows ||
    snapshot.bytes !== EXPECTED_LEGACY.bytes ||
    snapshot.rowMd5Aggregate !==
      EXPECTED_LEGACY.rowMd5Aggregate ||
    snapshot.binaryCopySha256 !==
      EXPECTED_LEGACY.binaryCopySha256 ||
    snapshot.recordAggregateSha256 !==
      EXPECTED_LEGACY.recordAggregateSha256
  ) {
    throw new Error(
      `IMMUTABLE_LEGACY_MISMATCH: ${JSON.stringify({
        actual: {
          rows: snapshot.rows,
          bytes: snapshot.bytes,
          rowMd5Aggregate:
            snapshot.rowMd5Aggregate,
          binaryCopySha256:
            snapshot.binaryCopySha256,
        },
        expected: EXPECTED_LEGACY,
      })}`,
    );
  }
  return snapshot;
}

async function fileSha256(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(
    await readFile(path, "utf8"),
  ) as T;
}

function stableId(
  namespace: string,
  ...parts: readonly string[]
): string {
  return `${namespace}_${sha256(parts.join("\u0000")).slice(0, 40)}`;
}

async function snapshot(outputDirectory: string, label: string) {
  process.umask(0o077);
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true, mode: 0o700 });
  await chmod(output, 0o700);
  const startedAt = new Date().toISOString();
  const [
    legacy,
    lessons,
    gitHead,
    gitStatus,
    image,
    containers,
    migrationStatus,
    disk,
    rootHealth,
    appHealth,
    statusUnauthenticated,
    rangeUnauthenticated,
  ] = await Promise.all([
    legacySnapshot(),
    prisma.academyModule.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        order: true,
        title: true,
        contentVersion: true,
        updatedAt: true,
        lessons: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            title: true,
            body: true,
            bodyHtml: true,
            audioText: true,
            updatedAt: true,
            updatedByEmail: true,
          },
        },
      },
    }),
    command("git", ["rev-parse", "HEAD"]),
    command("git", ["status", "--short"]),
    command("docker", [
      "inspect",
      "tenxpros-app",
      "--format",
      "{{json .Config.Image}} {{json .Image}} {{json .State.Health.Status}} {{json .State.StartedAt}}",
    ]),
    command("docker", [
      "compose",
      "ps",
      "--format",
      "json",
    ]),
    command("docker", [
      "exec",
      "tenxpros-app",
      "pnpm",
      "prisma",
      "migrate",
      "status",
    ]),
    command("df", ["-B1", REPOSITORY_ROOT]),
    command("curl", [
      "-fsS",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "http://172.17.0.1:3003/",
    ]),
    command("curl", [
      "-fsS",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "http://172.17.0.1:3003/api/health",
    ]),
    command("curl", [
      "-sS",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "http://172.17.0.1:3003/api/partner/academy/audio/mission",
    ]),
    command("curl", [
      "-sS",
      "-H",
      "Range: bytes=0-1",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "http://172.17.0.1:3003/api/partner/academy/audio/mission/bryce",
    ]),
  ]);
  const lessonManifest = lessons.flatMap((module) =>
    module.lessons.map((lesson) => {
      const bodyHtml = lesson.bodyHtml ?? "";
      return {
        moduleId: module.id,
        moduleSlug: module.slug,
        moduleOrder: module.order,
        moduleTitle: module.title,
        contentVersion: module.contentVersion,
        moduleUpdatedAt: module.updatedAt.toISOString(),
        lessonId: lesson.id,
        lessonOrder: lesson.order,
        lessonTitle: lesson.title,
        bodySha256: sha256(lesson.body),
        bodyHtmlSha256: sha256(bodyHtml),
        audioTextSha256: sha256(lesson.audioText),
        body: lesson.body,
        bodyHtml,
        audioText: lesson.audioText,
        lessonUpdatedAt:
          lesson.updatedAt?.toISOString() ?? null,
        updatedByEmail:
          lesson.updatedByEmail ?? null,
      };
    }),
  );
  const schemaPath = resolve(APP_ROOT, "prisma/schema.prisma");
  const migrationFiles = (
    await command("find", [
      "prisma/migrations",
      "-type",
      "f",
      "-name",
      "migration.sql",
      "-print",
    ], APP_ROOT)
  ).stdout
    .split("\n")
    .filter(Boolean)
    .sort();
  const evidence = {
    schemaVersion:
      "tenxpros-academy-narration-production-snapshot-v1",
    label,
    startedAt,
    completedAt: new Date().toISOString(),
    expectedLegacy: EXPECTED_LEGACY,
    legacy,
    production: {
      gitHead,
      gitStatus,
      image,
      containers,
      migrationStatus,
      disk,
      rootHealth,
      appHealth,
      databaseBytes: await prisma.$queryRaw<
        Array<{ bytes: bigint }>
      >`SELECT pg_database_size(current_database()) AS bytes`,
      lessonCount: lessonManifest.length,
      lessons: lessonManifest,
      lessonManifestSha256: sha256(
        canonical(lessonManifest),
      ),
      schemaSha256: await fileSha256(schemaPath),
      migrationFiles: await Promise.all(
        migrationFiles.map(async (file) => ({
          file,
          sha256: await fileSha256(
            resolve(APP_ROOT, file),
          ),
        })),
      ),
      resolverBehavior: {
        unauthenticatedStatusHttp:
          statusUnauthenticated,
        unauthenticatedRangeHttp:
          rangeUnauthenticated,
      },
      player: {
        sourceSha256: await fileSha256(
          resolve(
            APP_ROOT,
            "src/components/academy/audio-reader.tsx",
          ),
        ),
        voicePreferenceKey:
          "txp-narration-voice",
        playbackRatePreferenceKey:
          "txp-narration-rate",
        supportedRates: [0.75, 1, 1.25, 1.5],
        preservesPitch: true,
        webkitPreservesPitch: true,
      },
    },
  };
  const serialized = `${JSON.stringify(
    evidence,
    (_key, value) =>
      typeof value === "bigint"
        ? value.toString()
        : value,
    2,
  )}\n`;
  const path = resolve(output, `${label}.json`);
  await writeRestricted(path, serialized);
  const summary = {
    path,
    sha256: await fileSha256(path),
    legacy: {
      rows: legacy.rows,
      bytes: legacy.bytes,
      binaryCopySha256:
        legacy.binaryCopySha256,
    },
    lessons: lessonManifest.length,
    lessonManifestSha256:
      evidence.production.lessonManifestSha256,
    appHealthHttp: appHealth.stdout,
  };
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

function occurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let cursor = 0;
  while (true) {
    const found = haystack.indexOf(needle, cursor);
    if (found < 0) return count;
    count += 1;
    cursor = found + needle.length;
  }
}

function protectedFeatures(value: string) {
  const plain = htmlToPlainText(value);
  const collect = (pattern: RegExp) =>
    [...plain.matchAll(pattern)]
      .map((match) => match[0].toLowerCase())
      .sort();
  return {
    numbers: collect(
      /(?:[$€£]\s*)?\b\d+(?:[.,]\d+)*(?:\s*%)?\b/gu,
    ),
    links: [
      ...value.matchAll(
        /\bhref\s*=\s*["']([^"']+)["']/giu,
      ),
    ]
      .map((match) => match[1] ?? "")
      .sort(),
    modals: collect(
      /\b(?:must|should|may|cannot|can|will|would)\b/giu,
    ),
    negations: collect(
      /\b(?:no|not|never|cannot|without)\b/giu,
    ),
    commercialTerms: collect(
      /\b(?:commission|pricing|price|eligibility|eligible|governance|consent|confidentiality|net receipts|activation gate|active status|assessment|pass mark)\b/giu,
    ),
  };
}

function protectedComparison(before: string, after: string) {
  const beforeFeatures = protectedFeatures(before);
  const afterFeatures = protectedFeatures(after);
  return {
    before: beforeFeatures,
    after: afterFeatures,
    equal:
      canonical(beforeFeatures) ===
      canonical(afterFeatures),
  };
}

async function reconcile(outputDirectory: string) {
  process.umask(0o077);
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true, mode: 0o700 });
  await chmod(output, 0o700);
  const changes =
    editorialLedgerJson.changes as EditorialChange[];
  const inventory =
    phase0InventoryJson as Phase0BaselineInventory;
  const workspaceLessons =
    ACADEMY_MODULES.map(
      (module, index): AcademyLessonForReview => ({
        slug: module.slug,
        title: module.title,
        sourceLocation: SOURCE_LOCATIONS[index]!,
        bodyHtml: module.bodyHtml ?? "",
      }),
    );
  validateEditorialLedger(workspaceLessons, changes);
  validatePhase0BaselineInventory(
    workspaceLessons,
    changes,
    inventory,
  );
  const production = await prisma.academyModule.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      order: true,
      title: true,
      contentVersion: true,
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          bodyHtml: true,
          audioText: true,
        },
      },
    },
  });
  if (
    production.length !== 17 ||
    workspaceLessons.length !== 17
  ) {
    throw new Error(
      `Academy lesson count mismatch: production=${String(production.length)} workspace=${String(workspaceLessons.length)}`,
    );
  }
  const ledger: JsonObject[] = [];
  const mergedLessons: JsonObject[] = [];
  let unresolvedConflicts = 0;
  let protectedConflicts = 0;
  let appliedEdits = 0;
  let retainedEdits = 0;
  let productionOnlyDifferences = 0;
  for (const [index, module] of production.entries()) {
    const workspace = workspaceLessons[index]!;
    const lesson = module.lessons[0];
    if (
      !lesson ||
      module.order !== index + 1 ||
      module.slug !== workspace.slug ||
      module.title !== workspace.title ||
      lesson.order !== 1 ||
      lesson.title !== workspace.title
    ) {
      unresolvedConflicts += 1;
      ledger.push({
        lessonSlug: module.slug,
        sourceLocation: "lesson identity/order",
        baselineValue: {
          order: index + 1,
          slug: workspace.slug,
          title: workspace.title,
        },
        baselineHash: sha256(
          canonical({
            order: index + 1,
            slug: workspace.slug,
            title: workspace.title,
          }),
        ),
        productionValue: {
          moduleOrder: module.order,
          moduleSlug: module.slug,
          moduleTitle: module.title,
          lessonOrder: lesson?.order ?? null,
          lessonTitle: lesson?.title ?? null,
        },
        productionHash: sha256(
          canonical({
            moduleOrder: module.order,
            moduleSlug: module.slug,
            moduleTitle: module.title,
            lessonOrder: lesson?.order ?? null,
            lessonTitle: lesson?.title ?? null,
          }),
        ),
        workspaceValue: {
          order: index + 1,
          slug: workspace.slug,
          title: workspace.title,
        },
        workspaceHash: sha256(
          canonical({
            order: index + 1,
            slug: workspace.slug,
            title: workspace.title,
          }),
        ),
        classification:
          "UNEXPLAINED_CONFLICT" satisfies Classification,
        mergedResult: null,
        protectedFeatureComparison: null,
        decision: "STOP",
      });
      continue;
    }
    const lessonChanges = changes.filter(
      (change) => change.lessonSlug === module.slug,
    );
    const baselineHtml = reconstructOriginalHtml(
      workspace.bodyHtml,
      lessonChanges,
    );
    const productionHtml = lesson.bodyHtml ?? "";
    let mergedHtml = productionHtml;
    const exactBaseline =
      sha256(productionHtml) ===
      inventory.lessons[index]!.originalHash;
    for (const change of lessonChanges) {
      const originalCount = occurrences(
        mergedHtml,
        change.originalText,
      );
      const revisedCount = occurrences(
        mergedHtml,
        change.revisedText,
      );
      let classification: Classification =
        "UNEXPLAINED_CONFLICT";
      let decision = "STOP";
      let mergedResult: string | null = null;
      if (originalCount === 1 && revisedCount === 0) {
        mergedHtml = mergedHtml.replace(
          change.originalText,
          change.revisedText,
        );
        classification = "APPROVED_PHASE0_EDIT";
        decision = "APPLIED";
        mergedResult = change.revisedText;
        appliedEdits += 1;
      } else if (
        originalCount === 0 &&
        revisedCount === 1
      ) {
        classification = "APPROVED_PHASE0_EDIT";
        decision = "RETAINED_ALREADY_APPLIED";
        mergedResult = change.revisedText;
        retainedEdits += 1;
      } else {
        unresolvedConflicts += 1;
      }
      const comparison = protectedComparison(
        change.originalText,
        change.revisedText,
      );
      if (!comparison.equal) {
        protectedConflicts += 1;
        classification =
          "PROTECTED_CONTENT_DIFFERENCE";
        decision = "STOP";
      }
      ledger.push({
        changeId: change.id,
        lessonSlug: module.slug,
        sourceLocation: change.contentLocation,
        baselineValue: change.originalText,
        baselineHash: sha256(change.originalText),
        productionValue:
          originalCount === 1
            ? change.originalText
            : revisedCount === 1
              ? change.revisedText
              : null,
        productionHash:
          originalCount === 1
            ? sha256(change.originalText)
            : revisedCount === 1
              ? sha256(change.revisedText)
              : null,
        workspaceValue: change.revisedText,
        workspaceHash: sha256(change.revisedText),
        classification,
        mergedResult,
        mergedResultHash:
          mergedResult === null
            ? null
            : sha256(mergedResult),
        protectedFeatureComparison: comparison,
        decision,
      });
    }
    const residualProductionDifference =
      !exactBaseline &&
      sha256(productionHtml) !==
        sha256(workspace.bodyHtml);
    if (residualProductionDifference) {
      const sanitizedBaseline =
        sanitizeLessonHtml(baselineHtml);
      const sanitizedProduction =
        sanitizeLessonHtml(productionHtml);
      const structurallyEquivalent =
        canonical(inspectHtmlStructure(baselineHtml)) ===
        canonical(
          inspectHtmlStructure(productionHtml),
        );
      const serializationOnly =
        sanitizedBaseline === sanitizedProduction;
      const classification: Classification =
        serializationOnly
          ? "SANITIZATION_OR_SERIALIZATION_DIFFERENCE"
          : structurallyEquivalent &&
              htmlToPlainText(baselineHtml) ===
                htmlToPlainText(productionHtml)
            ? "STRUCTURAL_EQUIVALENCE"
            : "UNEXPLAINED_CONFLICT";
      if (
        classification ===
        "UNEXPLAINED_CONFLICT"
      ) {
        unresolvedConflicts += 1;
      } else {
        productionOnlyDifferences += 1;
      }
      ledger.push({
        lessonSlug: module.slug,
        sourceLocation:
          "production bodyHtml outside approved Phase-0 edit anchors",
        baselineValue: baselineHtml,
        baselineHash: sha256(baselineHtml),
        productionValue: productionHtml,
        productionHash: sha256(productionHtml),
        workspaceValue: workspace.bodyHtml,
        workspaceHash: sha256(workspace.bodyHtml),
        classification,
        mergedResult:
          classification ===
          "UNEXPLAINED_CONFLICT"
            ? null
            : mergedHtml,
        mergedResultHash:
          classification ===
          "UNEXPLAINED_CONFLICT"
            ? null
            : sha256(mergedHtml),
        protectedFeatureComparison:
          protectedComparison(
            productionHtml,
            mergedHtml,
          ),
        decision:
          classification ===
          "UNEXPLAINED_CONFLICT"
            ? "STOP"
            : "RETAIN_PRODUCTION_STARTING_DOCUMENT",
      });
    } else {
      ledger.push({
        lessonSlug: module.slug,
        sourceLocation:
          "complete lesson structure and non-edited content",
        baselineValueHash: sha256(baselineHtml),
        productionValueHash:
          sha256(productionHtml),
        workspaceValueHash:
          sha256(workspace.bodyHtml),
        classification:
          "STRUCTURAL_EQUIVALENCE" satisfies Classification,
        mergedResultHash: sha256(mergedHtml),
        protectedFeatureComparison:
          protectedComparison(
            productionHtml,
            mergedHtml,
          ),
        decision:
          "RETAIN_PRODUCTION_STARTING_DOCUMENT",
      });
    }
    const expectedMerged = applyEditorialChanges(
      baselineHtml,
      lessonChanges,
    );
    if (
      exactBaseline &&
      mergedHtml !== expectedMerged
    ) {
      unresolvedConflicts += 1;
    }
    const preservation =
      assessSemanticPreservation(
        productionHtml,
        mergedHtml,
      );
    const protectedPreservation =
      protectedComparison(
        productionHtml,
        mergedHtml,
      );
    if (
      !preservation.ok ||
      !protectedPreservation.equal
    ) {
      if (!protectedPreservation.equal) {
        protectedConflicts += 1;
      } else {
        unresolvedConflicts += 1;
      }
    }
    const sanitizedMerged =
      sanitizeLessonHtml(mergedHtml);
    if (sanitizedMerged !== mergedHtml) {
      unresolvedConflicts += 1;
    }
    mergedLessons.push({
      moduleId: module.id,
      moduleSlug: module.slug,
      moduleOrder: module.order,
      contentVersion: module.contentVersion,
      lessonId: lesson.id,
      lessonOrder: lesson.order,
      title: lesson.title,
      productionBodyHtmlSha256:
        sha256(productionHtml),
      baselineBodyHtmlSha256:
        sha256(baselineHtml),
      workspaceBodyHtmlSha256:
        sha256(workspace.bodyHtml),
      mergedBodyHtmlSha256:
        sha256(mergedHtml),
      mergedAudioTextSha256: sha256(
        htmlToPlainText(mergedHtml),
      ),
      mergedBodyHtml: mergedHtml,
      mergedAudioText:
        htmlToPlainText(mergedHtml),
      exactBaseline,
      preservation,
      protectedPreservation,
      structure:
        inspectHtmlStructure(mergedHtml),
    });
  }
  const summary = {
    lessonCount: mergedLessons.length,
    approvedEditCount: changes.length,
    appliedEdits,
    retainedEdits,
    productionOnlyDifferences,
    unresolvedConflicts,
    protectedConflicts,
    classifications: Object.fromEntries(
      CLASSIFICATIONS.map((classification) => [
        classification,
        ledger.filter(
          (entry) =>
            entry.classification === classification,
        ).length,
      ]),
    ),
  };
  const passed =
    mergedLessons.length === 17 &&
    appliedEdits + retainedEdits === 24 &&
    unresolvedConflicts === 0 &&
    protectedConflicts === 0 &&
    mergedLessons.every(
      (lesson) =>
        (lesson.preservation as {
          ok: boolean;
        }).ok === true &&
        (lesson.protectedPreservation as {
          equal: boolean;
        }).equal === true,
    );
  const manifestWithoutHash = {
    schemaVersion:
      "tenxpros-academy-content-reconciliation-v1",
    createdAt: new Date().toISOString(),
    baselineCommit: inventory.capturedFromCommit,
    productionIsStartingDocument: true,
    classifications: CLASSIFICATIONS,
    summary,
    passed,
    ledger,
    lessons: mergedLessons,
  };
  const manifest = {
    ...manifestWithoutHash,
    manifestHash: sha256(
      canonical(manifestWithoutHash),
    ),
  };
  const manifestPath = resolve(
    output,
    "content-reconciliation.json",
  );
  await writeRestricted(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const reportPath = resolve(
    output,
    "content-reconciliation-report.md",
  );
  await writeRestricted(
    reportPath,
    [
      "# Academy content reconciliation",
      "",
      `- Result: ${passed ? "PASS" : "STOP"}`,
      `- Lessons: ${String(summary.lessonCount)}/17`,
      `- Approved edits: ${String(appliedEdits + retainedEdits)}/24`,
      `- Newly applied: ${String(appliedEdits)}`,
      `- Already retained: ${String(retainedEdits)}`,
      `- Production-only differences: ${String(productionOnlyDifferences)}`,
      `- Unexplained conflicts: ${String(unresolvedConflicts)}`,
      `- Protected-content conflicts: ${String(protectedConflicts)}`,
      `- Manifest hash: ${manifest.manifestHash}`,
      "",
    ].join("\n"),
  );
  process.stdout.write(
    `${JSON.stringify({
      passed,
      summary,
      manifestPath,
      manifestHash: manifest.manifestHash,
      reportPath,
    })}\n`,
  );
  if (!passed) process.exitCode = 2;
}

async function validatedReconciliation(
  path: string,
): Promise<ContentReconciliationManifest> {
  const manifest =
    await readJson<ContentReconciliationManifest>(
      resolve(path),
    );
  if (
    manifest.schemaVersion !==
      "tenxpros-academy-content-reconciliation-v1" ||
    !manifest.passed ||
    manifest.lessons.length !== 17 ||
    manifest.summary.approvedEditCount !== 24 ||
    manifest.summary.unresolvedConflicts !== 0 ||
    manifest.summary.protectedConflicts !== 0
  ) {
    throw new Error(
      "Content reconciliation manifest failed its production gate",
    );
  }
  return manifest;
}

async function applyContent(
  reconciliationPath: string,
) {
  process.umask(0o077);
  await legacySnapshot();
  const manifest =
    await validatedReconciliation(
      reconciliationPath,
    );
  const current =
    await prisma.academyLesson.findMany({
      where: {
        id: {
          in: manifest.lessons.map(
            (lesson) => lesson.lessonId,
          ),
        },
      },
      select: {
        id: true,
        bodyHtml: true,
        moduleId: true,
      },
    });
  const byId = new Map(
    current.map((lesson) => [
      lesson.id,
      lesson,
    ]),
  );
  for (const lesson of manifest.lessons) {
    const row = byId.get(lesson.lessonId);
    if (
      !row ||
      row.moduleId !== lesson.moduleId
    ) {
      throw new Error(
        `${lesson.moduleSlug}: production lesson identity drift`,
      );
    }
    const currentHash =
      visibleLessonContentHash(
        row.bodyHtml,
      );
    if (
      currentHash !==
        lesson.productionBodyHtmlSha256 &&
      currentHash !==
        lesson.mergedBodyHtmlSha256
    ) {
      throw new Error(
        `${lesson.moduleSlug}: production content changed after reconciliation`,
      );
    }
  }
  const changed = manifest.lessons.filter(
    (lesson) =>
      lesson.productionBodyHtmlSha256 !==
      lesson.mergedBodyHtmlSha256 &&
      visibleLessonContentHash(
        byId.get(lesson.lessonId)?.bodyHtml,
      ) !== lesson.mergedBodyHtmlSha256,
  );
  await prisma.$transaction(
    async (tx) => {
      for (const lesson of changed) {
        const module =
          await tx.academyModule.update({
            where: {
              id: lesson.moduleId,
            },
            data: {
              contentVersion: {
                increment: 1,
              },
            },
            select: {
              contentVersion: true,
            },
          });
        await tx.academyLesson.update({
          where: {
            id: lesson.lessonId,
          },
          data: {
            bodyHtml: lesson.mergedBodyHtml,
            audioText:
              lesson.mergedAudioText,
            updatedByEmail:
              "academy-narration-rollout@tenxpros.local",
          },
        });
        await tx.academyLessonVersion.create({
          data: {
            id: stableId(
              "alv",
              manifest.manifestHash,
              lesson.lessonId,
            ),
            lessonId: lesson.lessonId,
            moduleId: lesson.moduleId,
            version:
              module.contentVersion,
            title: lesson.title,
            bodyHtml:
              lesson.mergedBodyHtml,
            audioText:
              lesson.mergedAudioText,
            note:
              "Approved Phase 0 readability reconciliation for the versioned Bryce narration release.",
            editedByEmail:
              "academy-narration-rollout@tenxpros.local",
          },
        });
      }
    },
    {
      maxWait: 30_000,
      timeout: 120_000,
    },
  );
  const after =
    await prisma.academyLesson.findMany({
      where: {
        id: {
          in: manifest.lessons.map(
            (lesson) => lesson.lessonId,
          ),
        },
      },
      select: {
        id: true,
        bodyHtml: true,
        audioText: true,
      },
    });
  const afterById = new Map(
    after.map((lesson) => [
      lesson.id,
      lesson,
    ]),
  );
  for (const lesson of manifest.lessons) {
    const row = afterById.get(
      lesson.lessonId,
    );
    if (
      !row ||
      visibleLessonContentHash(
        row.bodyHtml,
      ) !== lesson.mergedBodyHtmlSha256 ||
      sha256(row.audioText) !==
        lesson.mergedAudioTextSha256
    ) {
      throw new Error(
        `${lesson.moduleSlug}: reconciled content write verification failed`,
      );
    }
  }
  const legacy = await legacySnapshot();
  process.stdout.write(
    `${JSON.stringify({
      applied: true,
      changedLessons: changed.map(
        (lesson) => lesson.moduleSlug,
      ),
      changedLessonCount:
        changed.length,
      approvedEdits: 24,
      reconciliationManifestHash:
        manifest.manifestHash,
      legacy: {
        rows: legacy.rows,
        bytes: legacy.bytes,
        binaryCopySha256:
          legacy.binaryCopySha256,
      },
    })}\n`,
  );
}

async function validatedGeneration(
  generationDirectory: string,
  correctedAuditPath: string,
) {
  const root = resolve(generationDirectory);
  const correctedAuditFile = resolve(
    correctedAuditPath,
  );
  const [plan, release, correctedAudit, releaseManifestSha256, correctedAuditFileSha256] =
    await Promise.all([
    readJson<FullGenerationPlan>(
      resolve(root, "generation-plan.json"),
    ),
    readJson<FullGenerationReleaseManifest>(
      resolve(root, "release-manifest.json"),
    ),
    readJson<CorrectedReleaseAudit>(
      correctedAuditFile,
    ),
    fileSha256(
      resolve(root, "release-manifest.json"),
    ),
    fileSha256(correctedAuditFile),
  ]);
  const failedOriginalChecks =
    release.checks.filter(
      (check) => !check.pass,
    );
  if (
    release.schemaVersion !==
      "tenxpros-final-piper-academy-generation-result-v1" ||
    release.releaseId !== plan.releaseId ||
    release.planHash !== plan.planHash ||
    release.passed !== false ||
    failedOriginalChecks.length !== 1 ||
    failedOriginalChecks[0]?.id !==
      "ALL_EFFECTIVE_BOUNDARIES_PASS" ||
    release.checks.some(
      (check) =>
        check.id !==
          "ALL_EFFECTIVE_BOUNDARIES_PASS" &&
        !check.pass,
    ) ||
    release.assetCount !== 17 ||
    release.assetChecksums.length !== 17 ||
    plan.expectedAssetCount !== 17 ||
    plan.lessons.length !== 17 ||
    plan.recipeVersion !==
      FINAL_ACADEMY_NARRATION_RECIPE_VERSION ||
    plan.recipeHash !==
      FINAL_ACADEMY_NARRATION_RECIPE_HASH ||
    release.recipeVersion !==
      plan.recipeVersion ||
    release.recipeHash !== plan.recipeHash ||
    release.sourceContentManifestHash !==
      plan.sourceContentManifestHash
  ) {
    throw new Error(
      "Full generation release failed its immutable import gate",
    );
  }
  const {
    deterministicPayloadHash,
    ...correctedAuditPayload
  } = correctedAudit;
  const expectedCorrectedChecks = [
    "EXACTLY_17_IMMUTABLE_ASSETS",
    "ALL_ASSET_INTEGRITY_AUDITS_PASS",
    "ALL_937_BOUNDARIES_PRESENT",
    "ALL_BOUNDARY_CLASSIFIERS_MATCH",
    "ALL_FRAME_EXACT_PCM_FORMULAS_IN_EVIDENCE_RANGES",
    "ALL_DECODED_MP3_BOUNDARIES_INTERSECT_CALIBRATED_DETECTOR_RANGE",
    "ZERO_TRIM_SAFETY_FAILURES",
    "EVERY_PARAGRAPH_AT_LEAST_SENTENCE_P95_PLUS_350_MS",
    "LIST_AND_TABLE_SHORTER_THAN_CALLOUT",
    "CALLOUT_SHORTER_THAN_PARAGRAPH",
    "HEADING_LONGER_THAN_PARAGRAPH",
    "SECTION_LONGER_THAN_HEADING",
    "ZERO_STITCH_DISCONTINUITY_WARNINGS",
    "ZERO_EXTERNAL_API_CALLS",
    "ZERO_AUDIO_REGENERATION",
  ].sort();
  const actualCorrectedChecks =
    correctedAudit.checks
      .map((check) => check.id)
      .sort();
  const expectedRootCauseCounts = {
    AUDITOR_IMPLEMENTATION_BUG: 100,
    AUDIT_THRESHOLD_MISMATCH: 0,
    BOUNDARY_TYPE_MISCLASSIFICATION: 0,
    PCM_TO_MP3_MEASUREMENT_DRIFT: 0,
    GENERATION_IMPLEMENTATION_BUG: 0,
    TRUE_AUDIBLE_BOUNDARY_DEFECT: 0,
    INCONCLUSIVE: 0,
  };
  if (
    correctedAudit.schemaVersion !==
      "tenxpros-academy-corrected-release-audit-v1" ||
    correctedAudit.auditVersion !==
      ACADEMY_BOUNDARY_AUDIT_VERSION ||
    correctedAudit.releaseId !==
      plan.releaseId ||
    correctedAudit.planHash !==
      plan.planHash ||
    correctedAudit.recipeVersion !==
      plan.recipeVersion ||
    correctedAudit.recipeHash !==
      plan.recipeHash ||
    correctedAudit.sourceContentManifestHash !==
      plan.sourceContentManifestHash ||
    correctedAudit.preservedReleaseManifestSha256 !==
      releaseManifestSha256 ||
    correctedAudit.preservedAssetChecksums.length !==
      17 ||
    correctedAudit.assets.length !== 17 ||
    correctedAudit.boundaryCount !== 937 ||
    correctedAudit.correctedBoundaryFailureCount !==
      0 ||
    correctedAudit.correctedBoundaryFailures.length !==
      0 ||
    correctedAudit.externalApiCalls !== 0 ||
    correctedAudit.audioRegenerated !== false ||
    correctedAudit.passed !== true ||
    correctedAudit.checks.some(
      (check) => !check.pass,
    ) ||
    JSON.stringify(actualCorrectedChecks) !==
      JSON.stringify(expectedCorrectedChecks) ||
    JSON.stringify(
      correctedAudit.rootCauseCounts,
    ) !==
      JSON.stringify(
        expectedRootCauseCounts,
      ) ||
    deterministicPayloadHash !==
      sha256(
        JSON.stringify(
          correctedAuditPayload,
        ),
      ) ||
    correctedAudit.assets.some(
      (asset) =>
        !asset.assetAuditPassed ||
        asset.failedAssetChecks.length !==
          0 ||
        asset.stitchWarnings !== 0 ||
        !asset.frameCountsMatch ||
        !Number.isFinite(
          asset.minimumSpeechCorrelation,
        ) ||
        asset.minimumSpeechCorrelation <
          0.95,
    )
  ) {
    throw new Error(
      "Corrected independent boundary audit failed its immutable import gate",
    );
  }
  const assets =
    await Promise.all(
      plan.lessons.map(async (lesson) => {
        const manifest =
          await readJson<FullGenerationAssetManifest>(
            resolve(
              root,
              "asset-manifests",
              `${lesson.slug}.json`,
            ),
          );
        const audioPath = resolve(
          root,
          "assets",
          `${lesson.slug}.mp3`,
        );
        if (
          !manifest.passed ||
          manifest.releaseId !==
            plan.releaseId ||
          manifest.planHash !==
            plan.planHash ||
          manifest.lessonId !==
            lesson.lessonId ||
          manifest.lessonSlug !==
            lesson.slug ||
          manifest.lessonOrder !==
            lesson.order ||
          manifest.contentHash !==
            lesson.contentHash ||
          manifest.spokenScriptHash !==
            lesson.spokenScriptHash ||
          manifest.recipeVersion !==
            plan.recipeVersion ||
          manifest.recipeHash !==
            plan.recipeHash ||
          manifest.voiceId !== "bryce" ||
          manifest.sampleRate !== 22_050 ||
          manifest.channels !== 1 ||
          manifest.bitrateKbps !== 64 ||
          manifest.sizeBytes !==
            (await stat(audioPath)).size ||
          manifest.checksumSha256 !==
            (await fileSha256(audioPath)) ||
          manifest.chunkRecords.length !==
            lesson.blocks.length
        ) {
          throw new Error(
            `${lesson.slug}: generation asset import gate failed`,
          );
        }
        const releaseChecksum =
          release.assetChecksums.find(
            (entry) =>
              entry.lessonSlug ===
              lesson.slug,
          );
        const correctedChecksum =
          correctedAudit.preservedAssetChecksums.find(
            (entry) =>
              entry.lessonSlug ===
              lesson.slug,
          );
        const correctedAsset =
          correctedAudit.assets.find(
            (entry) =>
              entry.lessonSlug ===
              lesson.slug,
          );
        if (
          !releaseChecksum ||
          releaseChecksum.lessonOrder !==
            lesson.order ||
          releaseChecksum.checksumSha256 !==
            manifest.checksumSha256 ||
          releaseChecksum.sizeBytes !==
            manifest.sizeBytes ||
          !correctedChecksum ||
          correctedChecksum.sha256 !==
            manifest.checksumSha256 ||
          correctedChecksum.bytes !==
            manifest.sizeBytes ||
          !correctedAsset ||
          correctedAsset.assetSha256 !==
            manifest.checksumSha256 ||
          correctedAsset.bytes !==
            manifest.sizeBytes
        ) {
          throw new Error(
            `${lesson.slug}: corrected audit asset preservation gate failed`,
          );
        }
        return {
          lesson,
          manifest,
          audioPath,
        };
      }),
    );
  return {
    root,
    plan,
    release,
    correctedAudit,
    correctedAuditFile,
    correctedAuditFileSha256,
    assets,
  };
}

async function verifyProductionRelease(
  generationDirectory: string,
  correctedAuditPath: string,
  expectedActive: string,
) {
  process.umask(0o077);
  if (
    expectedActive !== "null" &&
    expectedActive !== "release"
  ) {
    throw new Error(
      "--expect-active must be null or release",
    );
  }
  const legacy = await legacySnapshot();
  const generation =
    await validatedGeneration(
      generationDirectory,
      correctedAuditPath,
    );
  const [release, deployment, lessons, migrationRows] =
    await Promise.all([
      prisma.academyNarrationRelease.findUnique({
        where: {
          id: generation.plan.releaseId,
        },
        select: {
          id: true,
          recipeVersion: true,
          recipeHash: true,
          voiceId: true,
          generationStatus: true,
          expectedAssetCount: true,
          sourceContentManifestHash: true,
          auditStatus: true,
          auditManifestHash: true,
          releaseChecksumSha256: true,
          assets: {
            orderBy: {
              lessonOrder: "asc",
            },
            select: {
              lessonId: true,
              lessonSlug: true,
              lessonOrder: true,
              contentHash: true,
              spokenScriptHash: true,
              data: true,
              mimeType: true,
              durationSeconds: true,
              sampleRate: true,
              channels: true,
              bitrateKbps: true,
              sizeBytes: true,
              checksumSha256: true,
              _count: {
                select: {
                  chunks: true,
                },
              },
            },
          },
        },
      }),
      prisma.academyNarrationDeployment.findUnique({
        where: {
          id: ACADEMY_NARRATION_DEPLOYMENT_ID,
        },
        select: {
          activeReleaseId: true,
          previousReleaseId: true,
          rollbackReleaseId: true,
        },
      }),
      prisma.academyLesson.findMany({
        where: {
          id: {
            in: generation.plan.lessons.map(
              (lesson) =>
                lesson.lessonId,
            ),
          },
        },
        select: {
          id: true,
          bodyHtml: true,
        },
      }),
      prisma.$queryRaw<
        Array<{ count: number }>
      >`SELECT count(*)::int AS count
         FROM "_prisma_migrations"
        WHERE migration_name = '20260727120000_academy_versioned_narration_release'
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL`,
    ]);
  const expectedActiveReleaseId =
    expectedActive === "release"
      ? generation.plan.releaseId
      : null;
  if (
    !release ||
    !deployment ||
    migrationRows[0]?.count !== 1 ||
    release.id !== generation.plan.releaseId ||
    release.recipeVersion !==
      generation.plan.recipeVersion ||
    release.recipeHash !==
      generation.plan.recipeHash ||
    release.voiceId !== "bryce" ||
    release.generationStatus !==
      "COMPLETE" ||
    release.expectedAssetCount !== 17 ||
    release.sourceContentManifestHash !==
      generation.plan
        .sourceContentManifestHash ||
    release.auditStatus !== "PASSED" ||
    release.auditManifestHash !==
      generation.correctedAuditFileSha256 ||
    release.releaseChecksumSha256 !==
      generation.release
        .releaseChecksumSha256 ||
    release.assets.length !== 17 ||
    deployment.activeReleaseId !==
      expectedActiveReleaseId
  ) {
    throw new Error(
      "Production release metadata, migration, or deployment pointer verification failed",
    );
  }
  const lessonContentById = new Map(
    lessons.map((lesson) => [
      lesson.id,
      visibleLessonContentHash(
        lesson.bodyHtml,
      ),
    ]),
  );
  const databaseAssetBySlug = new Map(
    release.assets.map((asset) => [
      asset.lessonSlug,
      asset,
    ]),
  );
  const verifiedAssets =
    generation.assets.map(
      ({ lesson, manifest }) => {
        const asset =
          databaseAssetBySlug.get(
            lesson.slug,
          );
        if (
          !asset ||
          asset.lessonId !==
            lesson.lessonId ||
          asset.lessonOrder !==
            lesson.order ||
          asset.contentHash !==
            lesson.contentHash ||
          asset.contentHash !==
            manifest.contentHash ||
          lessonContentById.get(
            lesson.lessonId,
          ) !== lesson.contentHash ||
          asset.spokenScriptHash !==
            manifest.spokenScriptHash ||
          asset.mimeType !==
            "audio/mpeg" ||
          asset.durationSeconds !==
            manifest.durationSeconds ||
          asset.sampleRate !== 22_050 ||
          asset.channels !== 1 ||
          asset.bitrateKbps !== 64 ||
          asset.sizeBytes !==
            manifest.sizeBytes ||
          Buffer.byteLength(asset.data) !==
            manifest.sizeBytes ||
          asset.checksumSha256 !==
            manifest.checksumSha256 ||
          sha256(
            Buffer.from(asset.data),
          ) !== manifest.checksumSha256 ||
          asset._count.chunks !==
            manifest.chunkRecords.length
        ) {
          throw new Error(
            `${lesson.slug}: production release asset, content, or checksum drift`,
          );
        }
        return {
          lessonSlug: lesson.slug,
          lessonOrder: lesson.order,
          sizeBytes:
            manifest.sizeBytes,
          checksumSha256:
            manifest.checksumSha256,
          contentHash:
            manifest.contentHash,
          chunks:
            asset._count.chunks,
        };
      },
    );
  process.stdout.write(
    `${JSON.stringify({
      verified: true,
      migrationApplied: true,
      release: {
        id: release.id,
        recipeVersion:
          release.recipeVersion,
        recipeHash:
          release.recipeHash,
        auditStatus:
          release.auditStatus,
        auditManifestHash:
          release.auditManifestHash,
        assets:
          verifiedAssets.length,
        chunks: verifiedAssets.reduce(
          (total, asset) =>
            total + asset.chunks,
          0,
        ),
        totalBytes:
          verifiedAssets.reduce(
            (total, asset) =>
              total +
              asset.sizeBytes,
            0,
          ),
      },
      deployment,
      assets: verifiedAssets,
      legacy: {
        rows: legacy.rows,
        bytes: legacy.bytes,
        binaryCopySha256:
          legacy.binaryCopySha256,
        recordAggregateSha256:
          legacy.recordAggregateSha256,
      },
    })}\n`,
  );
}

async function importRelease(
  generationDirectory: string,
  correctedAuditPath: string,
) {
  process.umask(0o077);
  await legacySnapshot();
  const generation =
    await validatedGeneration(
      generationDirectory,
      correctedAuditPath,
    );
  const production =
    await prisma.academyLesson.findMany({
      where: {
        id: {
          in: generation.plan.lessons.map(
            (lesson) => lesson.lessonId,
          ),
        },
      },
      select: {
        id: true,
        bodyHtml: true,
      },
    });
  const contentById = new Map(
    production.map((lesson) => [
      lesson.id,
      visibleLessonContentHash(
        lesson.bodyHtml,
      ),
    ]),
  );
  for (const lesson of generation.plan.lessons) {
    if (
      contentById.get(lesson.lessonId) !==
      lesson.contentHash
    ) {
      throw new Error(
        `${lesson.slug}: deployed visible content does not match generated narration`,
      );
    }
  }
  const existing =
    await prisma.academyNarrationRelease.findUnique({
      where: {
        id: generation.plan.releaseId,
      },
      select: {
        id: true,
        recipeHash: true,
        sourceContentManifestHash: true,
        releaseChecksumSha256: true,
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });
  if (existing) {
    if (
      existing.recipeHash !==
        generation.plan.recipeHash ||
      existing.sourceContentManifestHash !==
        generation.plan.sourceContentManifestHash ||
      existing.releaseChecksumSha256 !==
        generation.release.releaseChecksumSha256 ||
      existing._count.assets !== 17
    ) {
      throw new Error(
        "Existing immutable release drift",
      );
    }
  } else {
    await prisma.$transaction(
      async (tx) => {
        const firstLesson =
          generation.plan.lessons[0]!;
        await tx.academyNarrationRelease.create({
          data: {
            id: generation.plan.releaseId,
            recipeVersion:
              generation.plan.recipeVersion,
            recipeHash:
              generation.plan.recipeHash,
            rendererVersion:
              firstLesson.rendererVersion,
            normalizationVersion:
              firstLesson.normalizationVersion,
            pronunciationVersion:
              firstLesson.pronunciationVersion,
            segmentationVersion:
              firstLesson.segmentationVersion,
            voiceId:
              generation.plan.voice.id,
            piperVersion:
              "piper-2023.11.14-2",
            generationStatus: "COMPLETE",
            expectedAssetCount: 17,
            sourceContentManifestHash:
              generation.plan
                .sourceContentManifestHash,
            generationStartedAt: new Date(
              generation.release
                .generationStartedAt,
            ),
            generationCompletedAt: new Date(
              generation.release
                .generationCompletedAt,
            ),
            auditStatus: "PASSED",
            auditManifestHash:
              generation
                .correctedAuditFileSha256,
            releaseChecksumSha256:
              generation.release
                .releaseChecksumSha256,
          },
        });
        for (const {
          lesson,
          manifest,
          audioPath,
        } of generation.assets) {
          const assetId = stableId(
            "ana",
            generation.plan.releaseId,
            lesson.lessonId,
          );
          await tx.academyNarrationAsset.create({
            data: {
              id: assetId,
              releaseId:
                generation.plan.releaseId,
              lessonId: lesson.lessonId,
              lessonSlug: lesson.slug,
              lessonOrder: lesson.order,
              contentHash:
                manifest.contentHash,
              spokenScriptHash:
                manifest.spokenScriptHash,
              data: await readFile(audioPath),
              mimeType: manifest.mimeType,
              durationSeconds:
                manifest.durationSeconds,
              sampleRate:
                manifest.sampleRate,
              channels: manifest.channels,
              bitrateKbps:
                manifest.bitrateKbps,
              sizeBytes:
                manifest.sizeBytes,
              checksumSha256:
                manifest.checksumSha256,
              integratedLufs:
                manifest.integratedLufs,
              truePeakDbtp:
                manifest.truePeakDbtp,
              generationMetadata:
                manifest.generationMetadata,
              chunks: {
                create:
                  manifest.chunkRecords.map(
                    (chunk) => ({
                      id: stableId(
                        "anc",
                        assetId,
                        String(
                          chunk.blockIndex,
                        ),
                      ),
                      blockIndex:
                        chunk.blockIndex,
                      semanticBlockId:
                        chunk.semanticBlockId,
                      blockType:
                        chunk.blockType,
                      sourceHash:
                        chunk.sourceHash,
                      spokenHash:
                        chunk.spokenHash,
                      generationStatus:
                        chunk.generationStatus,
                      pcmChecksum:
                        chunk.pcmChecksum,
                      measuredLeadingSilenceMs:
                        chunk.measuredLeadingSilenceMs,
                      measuredTrailingSilenceMs:
                        chunk.measuredTrailingSilenceMs,
                      insertedSilenceMs:
                        chunk.insertedSilenceMs,
                      effectiveBoundaryPauseMs:
                        chunk.effectiveBoundaryPauseMs,
                      retryCount:
                        chunk.retryCount,
                      resumed: chunk.resumed,
                    })),
              },
            },
          });
        }
        await tx.academyNarrationDeployment.create({
          data: {
            id: ACADEMY_NARRATION_DEPLOYMENT_ID,
            activeReleaseId: null,
            previousReleaseId: null,
          },
        });
      },
      {
        maxWait: 30_000,
        timeout: 300_000,
      },
    );
  }
  const [release, deployment, legacy] =
    await Promise.all([
      prisma.academyNarrationRelease.findUniqueOrThrow({
        where: {
          id: generation.plan.releaseId,
        },
        select: {
          id: true,
          auditStatus: true,
          generationStatus: true,
          _count: {
            select: {
              assets: true,
            },
          },
          assets: {
            orderBy: {
              lessonOrder: "asc",
            },
            select: {
              lessonSlug: true,
              lessonOrder: true,
              checksumSha256: true,
              sizeBytes: true,
              _count: {
                select: {
                  chunks: true,
                },
              },
            },
          },
        },
      }),
      prisma.academyNarrationDeployment.findUniqueOrThrow({
        where: {
          id: ACADEMY_NARRATION_DEPLOYMENT_ID,
        },
        select: {
          activeReleaseId: true,
          previousReleaseId: true,
        },
      }),
      legacySnapshot(),
    ]);
  if (
    release._count.assets !== 17 ||
    deployment.activeReleaseId !== null
  ) {
    throw new Error(
      "Inactive imported release verification failed",
    );
  }
  process.stdout.write(
    `${JSON.stringify({
      imported: !existing,
      release,
      deployment,
      legacy: {
        rows: legacy.rows,
        bytes: legacy.bytes,
        binaryCopySha256:
          legacy.binaryCopySha256,
      },
    })}\n`,
  );
}

async function deploymentState() {
  const deployment =
    await prisma.academyNarrationDeployment.findUnique({
      where: {
        id: ACADEMY_NARRATION_DEPLOYMENT_ID,
      },
      select: {
        id: true,
        activeReleaseId: true,
        previousReleaseId: true,
        activatedAt: true,
        rollbackReleaseId: true,
        rollbackReason: true,
        lastRolledBackAt: true,
        updatedAt: true,
      },
    });
  process.stdout.write(
    `${JSON.stringify({ deployment })}\n`,
  );
}

async function promoteRelease(releaseId: string) {
  process.umask(0o077);
  await legacySnapshot();
  const release =
    await prisma.academyNarrationRelease.findUniqueOrThrow({
      where: { id: releaseId },
      select: {
        id: true,
        generationStatus: true,
        auditStatus: true,
        expectedAssetCount: true,
        recipeVersion: true,
        recipeHash: true,
        assets: {
          select: {
            lessonId: true,
            lessonSlug: true,
            contentHash: true,
            lesson: {
              select: {
                bodyHtml: true,
              },
            },
          },
        },
      },
    });
  if (
    release.generationStatus !==
      "COMPLETE" ||
    release.auditStatus !== "PASSED" ||
    release.expectedAssetCount !== 17 ||
    release.assets.length !== 17 ||
    release.recipeVersion !==
      FINAL_ACADEMY_NARRATION_RECIPE_VERSION ||
    release.recipeHash !==
      FINAL_ACADEMY_NARRATION_RECIPE_HASH ||
    release.assets.some(
      (asset) =>
        visibleLessonContentHash(
          asset.lesson.bodyHtml,
        ) !== asset.contentHash,
    )
  ) {
    throw new Error(
      "Promotion precondition failed",
    );
  }
  const result =
    await prisma.$transaction(
      async (tx) => {
        const current =
          await tx.academyNarrationDeployment.findUniqueOrThrow({
            where: {
              id: ACADEMY_NARRATION_DEPLOYMENT_ID,
            },
            select: {
              activeReleaseId: true,
            },
          });
        if (
          current.activeReleaseId &&
          current.activeReleaseId !==
            releaseId
        ) {
          throw new Error(
            "A different narration release is already active",
          );
        }
        if (
          current.activeReleaseId ===
          releaseId
        ) {
          return {
            changed: false,
            previousReleaseId: null,
          };
        }
        await tx.academyNarrationDeployment.update({
          where: {
            id: ACADEMY_NARRATION_DEPLOYMENT_ID,
          },
          data: {
            previousReleaseId:
              current.activeReleaseId,
            activeReleaseId: releaseId,
            activatedAt: new Date(),
            rollbackReleaseId:
              current.activeReleaseId,
            rollbackReason: null,
            lastRolledBackAt: null,
          },
        });
        return {
          changed: true,
          previousReleaseId:
            current.activeReleaseId,
        };
      },
      {
        timeout: 30_000,
      },
    );
  const [deployment, legacy] =
    await Promise.all([
      prisma.academyNarrationDeployment.findUniqueOrThrow({
        where: {
          id: ACADEMY_NARRATION_DEPLOYMENT_ID,
        },
        select: {
          activeReleaseId: true,
          previousReleaseId: true,
          activatedAt: true,
        },
      }),
      legacySnapshot(),
    ]);
  if (
    deployment.activeReleaseId !==
    releaseId
  ) {
    throw new Error(
      "Atomic promotion verification failed",
    );
  }
  process.stdout.write(
    `${JSON.stringify({
      promoted: true,
      result,
      deployment,
      legacy: {
        rows: legacy.rows,
        bytes: legacy.bytes,
        binaryCopySha256:
          legacy.binaryCopySha256,
      },
    })}\n`,
  );
}

async function rollbackRelease(reason: string) {
  process.umask(0o077);
  const result =
    await prisma.$transaction(
      async (tx) => {
        const current =
          await tx.academyNarrationDeployment.findUniqueOrThrow({
            where: {
              id: ACADEMY_NARRATION_DEPLOYMENT_ID,
            },
            select: {
              activeReleaseId: true,
              previousReleaseId: true,
            },
          });
        await tx.academyNarrationDeployment.update({
          where: {
            id: ACADEMY_NARRATION_DEPLOYMENT_ID,
          },
          data: {
            activeReleaseId:
              current.previousReleaseId,
            previousReleaseId:
              current.activeReleaseId,
            rollbackReleaseId:
              current.activeReleaseId,
            rollbackReason: reason,
            lastRolledBackAt: new Date(),
            activatedAt:
              current.previousReleaseId
                ? new Date()
                : null,
          },
        });
        return current;
      },
      {
        timeout: 30_000,
      },
    );
  const [deployment, legacy] =
    await Promise.all([
      prisma.academyNarrationDeployment.findUniqueOrThrow({
        where: {
          id: ACADEMY_NARRATION_DEPLOYMENT_ID,
        },
        select: {
          activeReleaseId: true,
          previousReleaseId: true,
          rollbackReleaseId: true,
          rollbackReason: true,
          lastRolledBackAt: true,
        },
      }),
      legacySnapshot(),
    ]);
  if (
    deployment.activeReleaseId !==
    result.previousReleaseId
  ) {
    throw new Error(
      "Atomic rollback verification failed",
    );
  }
  process.stdout.write(
    `${JSON.stringify({
      rolledBack: true,
      before: result,
      deployment,
      legacy: {
        rows: legacy.rows,
        bytes: legacy.bytes,
        binaryCopySha256:
          legacy.binaryCopySha256,
      },
    })}\n`,
  );
}

async function main() {
  const [commandName, ...args] =
    process.argv.slice(2);
  if (commandName === "snapshot") {
    await snapshot(
      option(args, "--output-dir"),
      option(args, "--label"),
    );
    return;
  }
  if (commandName === "reconcile") {
    await reconcile(
      option(args, "--output-dir"),
    );
    return;
  }
  if (commandName === "apply-content") {
    await applyContent(
      option(args, "--reconciliation"),
    );
    return;
  }
  if (commandName === "validate-generation") {
    const generation =
      await validatedGeneration(
        option(args, "--generation-dir"),
        option(args, "--corrected-audit"),
      );
    process.stdout.write(
      `${JSON.stringify({
        validated: true,
        releaseId:
          generation.plan.releaseId,
        assetCount:
          generation.assets.length,
        correctedAuditVersion:
          generation.correctedAudit
            .auditVersion,
        correctedAuditFileSha256:
          generation
            .correctedAuditFileSha256,
        deterministicPayloadHash:
          generation.correctedAudit
            .deterministicPayloadHash,
      })}\n`,
    );
    return;
  }
  if (commandName === "verify-production-release") {
    await verifyProductionRelease(
      option(args, "--generation-dir"),
      option(args, "--corrected-audit"),
      option(args, "--expect-active"),
    );
    return;
  }
  if (commandName === "import-release") {
    await importRelease(
      option(args, "--generation-dir"),
      option(args, "--corrected-audit"),
    );
    return;
  }
  if (commandName === "deployment-state") {
    await deploymentState();
    return;
  }
  if (commandName === "promote") {
    await promoteRelease(
      option(args, "--release-id"),
    );
    return;
  }
  if (commandName === "rollback") {
    await rollbackRelease(
      option(args, "--reason"),
    );
    return;
  }
  throw new Error(
    "Usage: academy-narration-rollout.ts snapshot|reconcile|apply-content|validate-generation|verify-production-release|import-release|deployment-state|promote|rollback [options]",
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
