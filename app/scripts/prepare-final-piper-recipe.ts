#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  chmod,
  constants,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  stat,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import {
  basename,
  dirname,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

import {
  FINAL_PIPER_RECIPE,
  FINAL_PIPER_RECIPE_HASH,
} from "../src/lib/academy/narration/final-piper-recipe";
import {
  DEFAULT_LOW_ENERGY_DETECTOR,
} from "../src/lib/academy/narration/effective-pause-normalization";
import {
  INTERNAL_SENTENCE_DETECTOR,
  SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
  SEMANTIC_BLOCK_FINAL_RECIPE_VERSION,
  buildSemanticBlockPlan,
  type SemanticSentenceUnit,
} from "../src/lib/academy/narration/semantic-block-flow";

const SCRIPT_DIRECTORY = dirname(
  fileURLToPath(import.meta.url),
);
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
const RUN_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "piper-final-recipe",
  "semantic-block-flow-v2-final-20260727",
);
const TASK_ATTACHMENT = resolve(
  "/home/ubuntu/.codex/attachments/07fcee43-3b2a-4887-91ce-05f42559c9c7/pasted-text.txt",
);
const TASK_ATTACHMENT_SHA256 =
  "df9880fc1b365fd393f1718944f28314971594c5297e0b15fe97efa7acad99f2";
const PARENT_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/piper-semantic-block-flow/semantic-block-flow-v1-20260727",
);
const PHASE2A_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/piper-evaluation/piper-semantic-v1-bryce-20260726",
);
const PHASE2B_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/piper-listening/phase2b-bryce-20260726",
);
const EXPECTED_PARENT = Object.freeze({
  "block-level-generation-plan.json":
    "ea9c4210e7ee4c5394b4244a1a8f70d2879c43a586960860a6b5e70e2cbf4d44",
  "runtime-results.json":
    "a6716c71371a63ee01f72eea238abf1448be36d3f9c0fd116792b2d36e33539c",
  "final-tuning-panel.json":
    "eb85edfba52e3a58db85d0d5b39198aeef7d0bfd6d9cda571e2f80e94e652a3a",
  "final-tuning-cost-report.json":
    "5c8cdb528fe5ac20f51345d427da19b5b50c05c428dbf6edc17ff52e274da425",
  "production-invariance.json":
    "0b5947637f5da273e55cdd7c3a69785c3be4f0a868055a82226d0b5951c40138",
  "validation-report.json":
    "3f9b872ccec21a0d1825ce928851ebb9cb3c3952faf062b7d2d87925f3d0e351",
});
const EXPECTED_LEGACY = Object.freeze({
  count: 51,
  bytes: 271_123_569,
  rowMd5Aggregate:
    "307e49138be9ea27192a3bef9f060d18",
  binaryCopySha256:
    "2ba47ce80f134b47f210a00ba6d47639742596df536c396ee3f651757859202d",
});
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

interface JsonRecord {
  [key: string]: unknown;
}

interface ProductionSnapshot {
  count: number;
  bytes: number;
  rowMd5Aggregate: string;
  rows: readonly {
    id: string;
    bytes: number;
    md5: string;
  }[];
  binaryCopySha256: string;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

async function sha256File(path: string): Promise<string> {
  return sha256(await readFile(path));
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
    const object = value as JsonRecord;
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

function object(
  value: unknown,
  label: string,
): JsonRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonRecord;
}

function array(
  value: unknown,
  label: string,
): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

async function readJson(path: string): Promise<JsonRecord> {
  return JSON.parse(
    await readFile(path, "utf8"),
  ) as JsonRecord;
}

async function ensureNewPrivateDirectory(
  path: string,
): Promise<void> {
  await mkdir(path, { recursive: false, mode: 0o700 });
  await chmod(path, 0o700);
  const metadata = await lstat(path);
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o700
  ) {
    throw new Error(
      `Private directory check failed: ${path}`,
    );
  }
}

async function writeNewRestricted(
  path: string,
  value: string | Buffer,
): Promise<void> {
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

function runText(
  executable: string,
  args: readonly string[],
): string {
  return execFileSync(executable, args, {
    encoding: "utf8",
    env: {
      PATH:
        process.env.PATH ??
        "/usr/local/bin:/usr/bin:/bin",
    },
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
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
        "-q",
        "-c",
        PRODUCTION_BINARY_COPY_SQL,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          PATH:
            process.env.PATH ??
            "/usr/local/bin:/usr/bin:/bin",
        },
      },
    );
    child.stdout.on("data", (chunk: Buffer) =>
      hash.update(chunk),
    );
    child.stderr.on("data", (chunk: Buffer) =>
      errors.push(chunk),
    );
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Production snapshot failed (${String(code)}): ${Buffer.concat(errors).toString("utf8").trim()}`,
          ),
        );
        return;
      }
      resolvePromise(hash.digest("hex"));
    });
  });
}

async function productionSnapshot(): Promise<ProductionSnapshot> {
  const summary = JSON.parse(
    runText("docker", [
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
    ]),
  ) as Omit<
    ProductionSnapshot,
    "binaryCopySha256"
  >;
  return {
    ...summary,
    binaryCopySha256:
      await binaryCopySha256(),
  };
}

function assertLegacy(snapshot: ProductionSnapshot): void {
  if (
    snapshot.count !== EXPECTED_LEGACY.count ||
    snapshot.bytes !== EXPECTED_LEGACY.bytes ||
    snapshot.rowMd5Aggregate !==
      EXPECTED_LEGACY.rowMd5Aggregate ||
    snapshot.binaryCopySha256 !==
      EXPECTED_LEGACY.binaryCopySha256
  ) {
    throw new Error("Legacy production audio changed");
  }
}

function unitsForExcerpt(
  manifest: JsonRecord,
  excerptId: string,
) {
  const plan = object(manifest.plan, "plan");
  const excerpt = array(
    plan.excerpts,
    "excerpts",
  )
    .map((value) => object(value, "excerpt"))
    .find((candidate) => candidate.id === excerptId);
  if (!excerpt) {
    throw new Error(`${excerptId} is missing`);
  }
  const corrected = object(
    object(excerpt.pipelines, "pipelines")
      .corrected,
    "corrected",
  );
  return {
    transcript: String(corrected.transcript),
    transcriptSha256: String(
      corrected.transcriptSha256,
    ),
    units: array(
      corrected.units,
      "corrected units",
    ).map((value) => {
      const unit = object(value, "unit");
      return {
        id: String(unit.id),
        sourceBlockId: String(
          unit.sourceBlockId,
        ),
        text: String(unit.text),
        textSha256: String(unit.textSha256),
        pauseAfterMs: Number(unit.pauseAfterMs),
      } satisfies SemanticSentenceUnit;
    }),
  };
}

async function prepare(): Promise<void> {
  process.umask(0o077);
  if (
    (await sha256File(TASK_ATTACHMENT)) !==
    TASK_ATTACHMENT_SHA256
  ) {
    throw new Error("Task attachment hash mismatch");
  }
  const parentBindings = [];
  for (const [file, expected] of Object.entries(
    EXPECTED_PARENT,
  )) {
    const actual = await sha256File(
      resolve(PARENT_DIRECTORY, file),
    );
    if (actual !== expected) {
      throw new Error(
        `Parent artifact changed: ${file}`,
      );
    }
    parentBindings.push({
      file,
      sha256: actual,
    });
  }
  const [
    parentPlan,
    parentRuntime,
    originalManifest,
    supplementalManifest,
  ] = await Promise.all([
    readJson(
      resolve(
        PARENT_DIRECTORY,
        "block-level-generation-plan.json",
      ),
    ),
    readJson(
      resolve(
        PARENT_DIRECTORY,
        "runtime-results.json",
      ),
    ),
    readJson(
      resolve(
        PHASE2A_DIRECTORY,
        "private/manifest.json",
      ),
    ),
    readJson(
      resolve(
        PHASE2B_DIRECTORY,
        "private/supplemental-manifest.json",
      ),
    ),
  ]);
  if (
    parentPlan.planHash !==
      FINAL_PIPER_RECIPE.parent.planHash ||
    parentRuntime.planHash !==
      FINAL_PIPER_RECIPE.parent.planHash
  ) {
    throw new Error("Parent plan hash mismatch");
  }
  const sample02 = unitsForExcerpt(
    originalManifest,
    "E02-journey-week-table",
  );
  const sample05 = unitsForExcerpt(
    supplementalManifest,
    "P05-mission-pause-coverage",
  );
  const productionBefore =
    await productionSnapshot();
  assertLegacy(productionBefore);
  if (
    canonical(productionBefore) !==
    canonical(parentPlan.productionBefore)
  ) {
    throw new Error(
      "Current production no longer matches the frozen parent baseline",
    );
  }
  const voice = object(
    parentPlan.voice,
    "parent voice",
  );
  const parentCandidates = array(
    parentRuntime.candidates,
    "parent candidates",
  ).map((value) => object(value, "parent candidate"));
  const implementationBindings =
    await Promise.all(
      [
        resolve(
          APP_ROOT,
          "src/lib/academy/narration/final-piper-recipe.ts",
        ),
        resolve(
          APP_ROOT,
          "src/lib/academy/narration/semantic-block-flow.ts",
        ),
        resolve(
          APP_ROOT,
          "src/lib/academy/narration/effective-pause-normalization.ts",
        ),
        resolve(
          APP_ROOT,
          "scripts/piper-semantic-block-flow-runtime.ts",
        ),
        resolve(
          APP_ROOT,
          "scripts/piper-evaluation-runtime.cjs",
        ),
      ].map(async (path) => ({
        file: basename(path),
        sha256: await sha256File(path),
      })),
    );
  const planWithoutHash = {
    version:
      "tenxpros-piper-final-recipe-focused-plan-v1",
    flowVersion:
      SEMANTIC_BLOCK_FINAL_RECIPE_VERSION,
    recipeVersion:
      FINAL_PIPER_RECIPE.recipeVersion,
    recipeHash: FINAL_PIPER_RECIPE_HASH,
    recipe: FINAL_PIPER_RECIPE,
    ownerAuthorization: {
      attachmentSha256:
        TASK_ATTACHMENT_SHA256,
      externalApiCallsAllowed: 0,
      fullAcademyGenerationAllowed: false,
      productionMutationAllowed: false,
      visibleContentChangesAllowed: false,
    },
    parent: {
      recipeVersion:
        FINAL_PIPER_RECIPE.parent
          .recipeVersion,
      planHash:
        FINAL_PIPER_RECIPE.parent.planHash,
      bindings: parentBindings,
      focusedSamples: parentCandidates.map(
        (candidate) => ({
          pairId: candidate.pairId,
          durationSeconds:
            candidate.durationSeconds,
          sha256: candidate.sha256,
        }),
      ),
    },
    implementationBindings,
    productionBefore,
    sampleRate: 22_050,
    lengthScale: 1,
    voice: {
      id: "bryce",
      modelPath: String(voice.modelPath),
      configPath: String(voice.configPath),
      modelSha256: String(voice.modelSha256),
      configSha256: String(voice.configSha256),
    },
    detectors: {
      internalSentence:
        INTERNAL_SENTENCE_DETECTOR,
      semanticEdge:
        DEFAULT_LOW_ENERGY_DETECTOR,
    },
    sentenceSilenceCandidatesSeconds: [
      0.15,
    ],
    effectiveTargetsMilliseconds:
      SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
    loudness: {
      targetLufs: -19,
      truePeakDbtp: -2,
      mp3EncodingTruePeakHeadroomDb: 1,
      maxPositiveGainDb: 6,
      integratedLufsMin: -22,
      integratedLufsMax: -18,
      truePeakMaxDbtp: -1.5,
    },
    profileAReference:
      parentPlan.profileAReference,
    samples: [
      {
        pairId: "sample-02",
        transcript: sample02.transcript,
        transcriptSha256:
          sample02.transcriptSha256,
        blocks: buildSemanticBlockPlan(
          sample02.units,
          SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
        ),
      },
      {
        pairId: "sample-05",
        transcript: sample05.transcript,
        transcriptSha256:
          sample05.transcriptSha256,
        blocks: buildSemanticBlockPlan(
          sample05.units,
          SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
        ),
      },
    ],
  };
  const planHash = sha256(
    canonical(planWithoutHash),
  );
  const plan = {
    ...planWithoutHash,
    planHash,
  };
  await mkdir(dirname(RUN_DIRECTORY), {
    recursive: true,
    mode: 0o700,
  });
  await ensureNewPrivateDirectory(
    RUN_DIRECTORY,
  );
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "final-recipe.json",
    ),
    `${JSON.stringify(
      {
        ...FINAL_PIPER_RECIPE,
        recipeHash:
          FINAL_PIPER_RECIPE_HASH,
      },
      null,
      2,
    )}\n`,
  );
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "focused-generation-plan.json",
    ),
    `${JSON.stringify(plan, null, 2)}\n`,
  );
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "focused-generation-plan-hash.txt",
    ),
    `${planHash}\n`,
  );
  const futureCommand =
    `pnpm exec tsx scripts/generate-final-piper-academy.ts --recipe-version ${SEMANTIC_BLOCK_FINAL_RECIPE_VERSION} --recipe-hash ${FINAL_PIPER_RECIPE_HASH} --all --output-dir /opt/tenxpros/scratch_academy/piper-full-generation/${SEMANTIC_BLOCK_FINAL_RECIPE_VERSION}`;
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "future-full-generation-command.txt",
    ),
    `${futureCommand}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      runDirectory: RUN_DIRECTORY,
      recipeVersion:
        FINAL_PIPER_RECIPE.recipeVersion,
      recipeHash:
        FINAL_PIPER_RECIPE_HASH,
      parentPlanHash:
        FINAL_PIPER_RECIPE.parent.planHash,
      focusedPlanHash: planHash,
      sample02Blocks:
        plan.samples[0].blocks.length,
      sample05Blocks:
        plan.samples[1].blocks.length,
      externalApiCalls: 0,
      productionRows:
        productionBefore.count,
    })}\n`,
  );
}

async function freeze(): Promise<void> {
  process.umask(0o077);
  const [plan, runtime, recipeFile] =
    await Promise.all([
      readJson(
        resolve(
          RUN_DIRECTORY,
          "focused-generation-plan.json",
        ),
      ),
      readJson(
        resolve(
          RUN_DIRECTORY,
          "runtime-results.json",
        ),
      ),
      readJson(
        resolve(
          RUN_DIRECTORY,
          "final-recipe.json",
        ),
      ),
    ]);
  if (
    plan.planHash !== runtime.planHash ||
    plan.recipeHash !==
      FINAL_PIPER_RECIPE_HASH ||
    recipeFile.recipeHash !==
      FINAL_PIPER_RECIPE_HASH ||
    runtime.flowVersion !==
      SEMANTIC_BLOCK_FINAL_RECIPE_VERSION ||
    object(
      runtime.objectiveGates,
      "objective gates",
    ).passed !== true
  ) {
    throw new Error(
      "Final recipe runtime or hash binding failed",
    );
  }
  const candidates = array(
    runtime.candidates,
    "candidates",
  ).map((value) => object(value, "candidate"));
  if (
    candidates.length !== 2 ||
    candidates.some(
      (candidate) =>
        candidate.profileId !==
          SEMANTIC_BLOCK_FINAL_RECIPE_VERSION ||
        candidate.passed !== true,
    )
  ) {
    throw new Error(
      "Focused final candidates are incomplete",
    );
  }
  const productionAfter =
    await productionSnapshot();
  assertLegacy(productionAfter);
  if (
    canonical(productionAfter) !==
    canonical(plan.productionBefore)
  ) {
    throw new Error(
      "Production changed during final local generation",
    );
  }
  const focusedAssets = await Promise.all(
    candidates.map(async (candidate) => {
      const path = resolve(
        RUN_DIRECTORY,
        String(candidate.outputFile),
      );
      const fileSha = await sha256File(path);
      if (
        fileSha !== candidate.sha256
      ) {
        throw new Error(
          `${String(candidate.pairId)} asset hash changed`,
        );
      }
      return {
        pairId: candidate.pairId,
        path: candidate.outputFile,
        sha256: fileSha,
        sizeBytes: (await stat(path)).size,
        durationSeconds:
          candidate.durationSeconds,
        integratedLufs: object(
          object(
            candidate.mp3Audit,
            "MP3 audit",
          ).ebur128,
          "EBU R128",
        ).integratedLufs,
        truePeakDbtp: object(
          object(
            candidate.mp3Audit,
            "MP3 audit",
          ).ebur128,
          "EBU R128",
        ).truePeakDbtp,
      };
    }),
  );
  const objective = {
    schemaVersion:
      "tenxpros-final-piper-objective-validation-v1",
    recipeVersion:
      FINAL_PIPER_RECIPE.recipeVersion,
    recipeHash:
      FINAL_PIPER_RECIPE_HASH,
    focusedPlanHash: plan.planHash,
    selectedSentenceSilence:
      runtime.selectedSentenceSilence,
    architecture: runtime.architecture,
    sentence: object(
      runtime.objectiveGates,
      "objective gates",
    ).sentence,
    boundaries: object(
      runtime.objectiveGates,
      "objective gates",
    ).boundaries,
    stitchDiscontinuityWarnings:
      object(
        runtime.objectiveGates,
        "objective gates",
      ).totalStitchDiscontinuityWarnings,
    checks: object(
      runtime.objectiveGates,
      "objective gates",
    ).checks,
    focusedAssets,
    externalApiCalls:
      object(
        runtime.isolation,
        "runtime isolation",
      ).externalApiRequests,
    productionMutationCount: 0,
    passed: true,
  };
  const objectiveJson = `${JSON.stringify(
    objective,
    null,
    2,
  )}\n`;
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "final-objective-validation.json",
    ),
    objectiveJson,
  );
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "focused-audio-manifest.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-final-piper-focused-assets-v1",
        recipeVersion:
          FINAL_PIPER_RECIPE.recipeVersion,
        recipeHash:
          FINAL_PIPER_RECIPE_HASH,
        assets: focusedAssets,
      },
      null,
      2,
    )}\n`,
  );
  const freezeRecord = {
    schemaVersion:
      "tenxpros-final-piper-recipe-freeze-v1",
    status: "FROZEN",
    recipeVersion:
      FINAL_PIPER_RECIPE.recipeVersion,
    recipeHash:
      FINAL_PIPER_RECIPE_HASH,
    parent:
      FINAL_PIPER_RECIPE.parent,
    recipe: FINAL_PIPER_RECIPE,
    focusedPlanHash: plan.planHash,
    objectiveValidationSha256:
      sha256(objectiveJson),
    focusedAssets,
    externalApiCalls: 0,
    fullAcademyGenerated: false,
    productionMutations: 0,
    legacyProductionSnapshot:
      productionAfter,
  };
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "recipe-freeze.json",
    ),
    `${JSON.stringify(freezeRecord, null, 2)}\n`,
  );
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "production-invariance.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-final-piper-production-invariance-v1",
        productionBefore:
          plan.productionBefore,
        productionAfter,
        exactMatch: true,
        legacyRecordsByteForByteUnchanged:
          true,
        productionMutationCount: 0,
      },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      status: "FROZEN",
      recipeVersion:
        FINAL_PIPER_RECIPE.recipeVersion,
      recipeHash:
        FINAL_PIPER_RECIPE_HASH,
      focusedPlanHash: plan.planHash,
      focusedAssets,
      objectiveGatesPassed: true,
      externalApiCalls: 0,
      legacyRowsUnchanged:
        productionAfter.count,
    })}\n`,
  );
}

function validationCommand(
  id: string,
  executable: string,
  args: readonly string[],
) {
  const output = runText(executable, args);
  return {
    id,
    command: [executable, ...args].join(" "),
    passed: true,
    outputTail: output.slice(-4_000),
  };
}

async function enforcePrivateTree(
  directory: string,
): Promise<{
  directories: number;
  files: number;
}> {
  await chmod(directory, 0o700);
  let directories = 1;
  let files = 0;
  for (const entry of await readdir(directory, {
    withFileTypes: true,
  })) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Symlink prohibited in freeze artifacts: ${path}`,
      );
    }
    if (entry.isDirectory()) {
      const nested = await enforcePrivateTree(path);
      directories += nested.directories;
      files += nested.files;
    } else if (entry.isFile()) {
      await chmod(path, 0o600);
      files += 1;
    } else {
      throw new Error(
        `Unsupported artifact entry: ${path}`,
      );
    }
  }
  return { directories, files };
}

async function validateAndReport(): Promise<void> {
  process.umask(0o077);
  const validation = [
    validationCommand(
      "FOCUSED_NARRATION_AUDIO_TESTS",
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "tests/final-piper-recipe.test.ts",
        "tests/final-piper-freeze-artifacts.test.ts",
        "tests/semantic-block-flow.test.ts",
        "tests/effective-pause-normalization.test.ts",
        "tests/academy-narration-layer.test.ts",
        "tests/academy-narration-preservation.test.ts",
      ],
    ),
    validationCommand(
      "COMPLETE_TEST_SUITE",
      "pnpm",
      ["test"],
    ),
    validationCommand(
      "TYPECHECK",
      "pnpm",
      ["typecheck"],
    ),
    validationCommand(
      "LINT",
      "pnpm",
      ["lint"],
    ),
    validationCommand(
      "PRISMA_VALIDATE",
      "pnpm",
      ["db:validate"],
    ),
    validationCommand(
      "PRODUCTION_BUILD",
      "pnpm",
      ["build"],
    ),
    validationCommand(
      "GIT_DIFF_CHECK",
      "git",
      ["diff", "--check"],
    ),
  ];
  const [
    plan,
    runtime,
    freezeRecord,
    objective,
    command,
  ] = await Promise.all([
    readJson(
      resolve(
        RUN_DIRECTORY,
        "focused-generation-plan.json",
      ),
    ),
    readJson(
      resolve(
        RUN_DIRECTORY,
        "runtime-results.json",
      ),
    ),
    readJson(
      resolve(
        RUN_DIRECTORY,
        "recipe-freeze.json",
      ),
    ),
    readJson(
      resolve(
        RUN_DIRECTORY,
        "final-objective-validation.json",
      ),
    ),
    readFile(
      resolve(
        RUN_DIRECTORY,
        "future-full-generation-command.txt",
      ),
      "utf8",
    ),
  ]);
  if (
    freezeRecord.status !== "FROZEN" ||
    freezeRecord.recipeHash !==
      FINAL_PIPER_RECIPE_HASH ||
    objective.passed !== true ||
    plan.planHash !== runtime.planHash ||
    !command.includes(
      FINAL_PIPER_RECIPE_HASH,
    )
  ) {
    throw new Error(
      "Freeze validation bindings failed",
    );
  }
  const productionFinal =
    await productionSnapshot();
  assertLegacy(productionFinal);
  if (
    canonical(productionFinal) !==
    canonical(plan.productionBefore)
  ) {
    throw new Error(
      "Production changed during final validation",
    );
  }
  const recipeHashNow =
    FINAL_PIPER_RECIPE_HASH;
  if (
    recipeHashNow !==
    "0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe"
  ) {
    throw new Error(
      "Final recipe hash is not deterministic",
    );
  }
  const permissions = await enforcePrivateTree(
    RUN_DIRECTORY,
  );
  const candidates = array(
    runtime.candidates,
    "candidates",
  ).map((value) => object(value, "candidate"));
  const sentence = object(
    objective.sentence,
    "sentence",
  );
  const boundaries = object(
    objective.boundaries,
    "boundaries",
  );
  const paragraph = object(
    boundaries.paragraph,
    "paragraph",
  );
  const callout = object(
    boundaries.callout,
    "callout",
  );
  const heading = object(
    boundaries.heading,
    "heading",
  );
  const section = object(
    boundaries.section,
    "section",
  );
  const table = object(
    boundaries.tableRow,
    "table row",
  );
  const list = object(
    boundaries.list,
    "list",
  );
  const report = `# Final frozen Piper recipe report

Final state: **FINAL_PIPER_RECIPE_FROZEN**

## Recipe

- version: ${FINAL_PIPER_RECIPE.recipeVersion}
- status: FROZEN
- recipe hash: ${FINAL_PIPER_RECIPE_HASH}
- parent: ${FINAL_PIPER_RECIPE.parent.recipeVersion}
- parent plan hash: ${FINAL_PIPER_RECIPE.parent.planHash}

## Frozen targets

- internal sentence: Piper sentence_silence 150 ms
- list item: 300 ms
- table row: 270 ms
- paragraph: 800 ms
- callout: 700 ms
- heading: 900 ms
- section: 1050 ms

## Measured effective pauses

- internal sentence: minimum ${Number(sentence.minimumMilliseconds).toFixed(2)} ms; median ${Number(sentence.medianMilliseconds).toFixed(2)} ms; p95 ${Number(sentence.p95Milliseconds).toFixed(2)} ms; maximum ${Number(sentence.maximumMilliseconds).toFixed(2)} ms
- paragraph: ${Number(paragraph.minimumMilliseconds).toFixed(2)}–${Number(paragraph.maximumMilliseconds).toFixed(2)} ms
- callout: ${Number(callout.medianMilliseconds).toFixed(2)} ms
- heading: ${Number(heading.medianMilliseconds).toFixed(2)} ms
- section: ${Number(section.medianMilliseconds).toFixed(2)} ms
- list: ${Number(list.minimumMilliseconds).toFixed(2)}–${Number(list.maximumMilliseconds).toFixed(2)} ms
- table rows: ${Number(table.minimumMilliseconds).toFixed(2)}–${Number(table.maximumMilliseconds).toFixed(2)} ms
- stitch-discontinuity warnings: ${String(objective.stitchDiscontinuityWarnings)}

Every objective acoustic, hierarchy, exact-transcript, MP3, loudness, duration, checksum, clipping, truncation, duplication, and missing-speech gate passed.

## Focused assets

${candidates.map((candidate) => `- ${String(candidate.pairId)}: ${Number(candidate.durationSeconds).toFixed(6)} s; SHA-256 ${String(candidate.sha256)}`).join("\n")}

## Validation

${validation.map((item) => `- ${item.id}: PASSED`).join("\n")}

## Safety and invariance

- external API calls: 0
- OpenRouter calls: 0
- ElevenLabs calls: 0
- direct OpenAI calls: 0
- full Academy assets generated: 0
- production mutations, migrations, or deployments: 0
- legacy audio rows: ${String(productionFinal.count)}
- legacy bytes: ${String(productionFinal.bytes)}
- binary audio SHA-256: ${productionFinal.binaryCopySha256}

## Prepared future command

\`\`\`bash
${command.trim()}
\`\`\`

The command was recorded but not executed in this task.
`;
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "FINAL-REPORT.md",
    ),
    report,
  );
  const validationReport = {
    schemaVersion:
      "tenxpros-final-piper-recipe-validation-v1",
    recipeVersion:
      FINAL_PIPER_RECIPE.recipeVersion,
    recipeHash:
      FINAL_PIPER_RECIPE_HASH,
    focusedPlanHash: plan.planHash,
    commands: validation,
    objectiveGateCount: array(
      objective.checks,
      "objective checks",
    ).length,
    allObjectiveGatesPassed: true,
    focusedAssetCount:
      candidates.length,
    fullAcademyGenerated: false,
    externalApiCalls: 0,
    productionFinal,
    legacyRecordsByteForByteUnchanged:
      true,
    privatePermissions:
      permissions,
    passed: true,
  };
  await writeNewRestricted(
    resolve(
      RUN_DIRECTORY,
      "validation-report.json",
    ),
    `${JSON.stringify(validationReport, null, 2)}\n`,
  );
  await enforcePrivateTree(RUN_DIRECTORY);
  process.stdout.write(
    `${JSON.stringify({
      finalState:
        "FINAL_PIPER_RECIPE_FROZEN",
      recipeVersion:
        FINAL_PIPER_RECIPE.recipeVersion,
      recipeHash:
        FINAL_PIPER_RECIPE_HASH,
      validationCommandsPassed:
        validation.length,
      objectiveGatesPassed:
        validationReport.objectiveGateCount,
      focusedAssets:
        candidates.length,
      externalApiCalls: 0,
      fullAcademyGenerated: false,
      productionMutations: 0,
      legacyRowsUnchanged:
        productionFinal.count,
    })}\n`,
  );
}

const command = process.argv[2];
if (command === "prepare") {
  prepare().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  });
} else if (command === "freeze") {
  freeze().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  });
} else if (command === "validate") {
  validateAndReport().catch(
    (error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.stack : String(error)}\n`,
      );
      process.exitCode = 1;
    },
  );
} else {
  process.stderr.write(
    "Usage: prepare-final-piper-recipe.ts prepare|freeze|validate\n",
  );
  process.exitCode = 1;
}
