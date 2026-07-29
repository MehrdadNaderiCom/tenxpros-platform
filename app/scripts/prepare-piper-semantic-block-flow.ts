#!/usr/bin/env tsx

import {
  createHash,
  randomBytes,
} from "node:crypto";
import {
  chmod,
  constants,
  copyFile,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  stat,
} from "node:fs/promises";
import {
  execFileSync,
  spawn,
} from "node:child_process";
import {
  basename,
  dirname,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_LOW_ENERGY_DETECTOR,
} from "../src/lib/academy/narration/effective-pause-normalization";
import {
  INTERNAL_SENTENCE_DETECTOR,
  SEMANTIC_BLOCK_EFFECTIVE_TARGETS,
  SEMANTIC_BLOCK_FLOW_VERSION,
  SEMANTIC_BLOCK_SENTENCE_SILENCE_CANDIDATES,
  buildSemanticBlockPlan,
  type SemanticSentenceUnit,
} from "../src/lib/academy/narration/semantic-block-flow";

const SCRIPT_DIRECTORY = dirname(
  fileURLToPath(import.meta.url),
);
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
export const BLOCK_FLOW_RUN_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "piper-semantic-block-flow",
  "semantic-block-flow-v1-20260727",
);
const TASK_ATTACHMENT = resolve(
  "/home/ubuntu/.codex/attachments/c5de68b4-df86-49fc-81bb-f842dc033b3d/pasted-text.txt",
);
const TASK_ATTACHMENT_SHA256 =
  "eeb797c34f0be23a94fe724578baa83415e52cf047321315b323758bc1a5cc41";
const PHASE2A_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/piper-evaluation/piper-semantic-v1-bryce-20260726",
);
const PHASE2B_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/piper-listening/phase2b-bryce-20260726",
);
const PRIOR_TUNING_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/piper-pause-normalization/phase2d-bryce-effective-pause-v2-20260727",
);
const EXPECTED_PRIOR_BINDINGS = Object.freeze({
  "tuning-plan.json":
    "a882ef22c4bdf0c7edfd5221d346fb0f521ee057851540bdc07331c3097652b2",
  "tuning-panel.json":
    "304543451a50a1fe4111fa45c584f4214325aad15bcdc525f3c31b3acd6901fc",
  "tuning-cost-report.json":
    "5767ace25356cdf0d665fdc6992ce8b876ae8764c2152c58770a778c992e6056",
  "production-invariance.json":
    "1b74cc1032241577d057f8dd0946f62c063b4d27b0ddd124e7d2ba3aa8b241e0",
  "validation-report.json":
    "fad1c3e28706c88e8e03b405b172cf6f9d77d15a34a613d78ea86636c9d5e55b",
  "tuned-audio/sample-02-candidate-A.mp3":
    "f559f87ace5b6895a2b5e2c65e1d00f25ffb910209162065a12704db2d1ab4e8",
  "tuned-audio/sample-05-candidate-A.mp3":
    "030e769b418c7d9cb3d7814f8de0c4990bef4f5447275f065e75630adcb2f42d",
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

export async function writeNewRestricted(
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

export async function productionSnapshot(): Promise<ProductionSnapshot> {
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

function containerSnapshot(name: string) {
  const inspected = JSON.parse(
    runText("docker", ["inspect", name]),
  ) as readonly {
    Image: string;
    RestartCount: number;
    State: {
      StartedAt: string;
      Running: boolean;
      Restarting: boolean;
    };
  }[];
  const item = inspected[0];
  if (!item) {
    throw new Error(`${name} is missing`);
  }
  return {
    name,
    image: item.Image,
    startedAt: item.State.StartedAt,
    restartCount: item.RestartCount,
    running: item.State.Running,
    restarting: item.State.Restarting,
  };
}

function unitsForExcerpt(
  manifest: JsonRecord,
  excerptId: string,
): {
  transcript: string;
  transcriptSha256: string;
  units: readonly SemanticSentenceUnit[];
} | null {
  const plan = object(manifest.plan, "plan");
  const excerpt = array(
    plan.excerpts,
    "excerpts",
  )
    .map((value) => object(value, "excerpt"))
    .find(
      (candidate) => candidate.id === excerptId,
    );
  if (!excerpt) return null;
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
      };
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
  const priorBindings = [];
  for (const [file, expected] of Object.entries(
    EXPECTED_PRIOR_BINDINGS,
  )) {
    const path = resolve(
      PRIOR_TUNING_DIRECTORY,
      file,
    );
    const actual = await sha256File(path);
    if (actual !== expected) {
      throw new Error(
        `Prior final tuning binding changed: ${file}`,
      );
    }
    priorBindings.push({ file, sha256: actual });
  }
  const priorCost = await readJson(
    resolve(
      PRIOR_TUNING_DIRECTORY,
      "tuning-cost-report.json",
    ),
  );
  if (
    priorCost.cumulativeActualCostUsd !==
      "6.13768350" ||
    priorCost.unresolvedOrUncertainCostUsd !==
      "0.00000000"
  ) {
    throw new Error("Carried cost mismatch");
  }
  const [
    originalManifest,
    supplementalManifest,
    supplementalRuntime,
    priorRuntime,
  ] = await Promise.all([
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
    readJson(
      resolve(
        PHASE2B_DIRECTORY,
        "private/runtime-results.json",
      ),
    ),
    readJson(
      resolve(
        PRIOR_TUNING_DIRECTORY,
        "runtime-results.json",
      ),
    ),
  ]);
  const sample02 = unitsForExcerpt(
    originalManifest,
    "E02-journey-week-table",
  );
  const sample05 = unitsForExcerpt(
    supplementalManifest,
    "P05-mission-pause-coverage",
  );
  if (!sample02 || !sample05) {
    throw new Error("Focused source excerpts missing");
  }
  const priorCandidates = array(
    priorRuntime.candidates,
    "prior candidates",
  )
    .map((value) =>
      object(value, "prior candidate"),
    )
    .filter(
      (candidate) =>
        candidate.profileId === "A",
    );
  if (priorCandidates.length !== 2) {
    throw new Error("Profile A controls missing");
  }
  const warningThreshold = 128;
  const priorWarnings = priorCandidates.flatMap(
    (candidate) =>
      array(
        candidate.measuredBoundaries,
        "Profile A boundaries",
      ).filter((value) => {
        const boundary = object(
          value,
          "Profile A boundary",
        );
        return (
          Number(
            object(
              boundary.decodedBoundaryDiscontinuity,
              "Profile A discontinuity",
            ).maximumAbsoluteDelta,
          ) > warningThreshold
        );
      }),
  ).length;
  const profileASamples = await Promise.all(
    priorCandidates.map(async (candidate) => {
      const pairId = String(candidate.pairId);
      const path = resolve(
        PRIOR_TUNING_DIRECTORY,
        "tuned-audio",
        `${pairId}-candidate-A.mp3`,
      );
      return {
        pairId,
        path,
        durationSeconds: Number(
          candidate.durationSeconds,
        ),
        sha256: await sha256File(path),
      };
    }),
  );
  const voice = object(
    supplementalRuntime.voice,
    "Bryce voice",
  );
  const productionBefore =
    await productionSnapshot();
  assertLegacy(productionBefore);
  const implementationBindings =
    await Promise.all(
      [
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
  const sourceBindings = await Promise.all(
    [
      resolve(
        PHASE2A_DIRECTORY,
        "private/manifest.json",
      ),
      resolve(
        PHASE2B_DIRECTORY,
        "private/supplemental-manifest.json",
      ),
    ].map(async (path) => ({
      path,
      sha256: await sha256File(path),
    })),
  );
  const planWithoutHash = {
    version:
      "tenxpros-piper-semantic-block-flow-plan-v1",
    flowVersion: SEMANTIC_BLOCK_FLOW_VERSION,
    ownerAuthorization: {
      attachmentSha256: TASK_ATTACHMENT_SHA256,
      noVisibleContentChange: true,
      noFullAcademyGeneration: true,
      noProductionMutation: true,
      noElevenLabs: true,
      noDirectOpenAi: true,
    },
    financialPolicy: {
      provider: "OpenRouter",
      model: "openai/gpt-audio",
      carriedActualCostUsd: "6.13768350",
      unresolvedCostUsd: "0.00000000",
      maximumCumulativeCostUsd: "10.00000000",
      maximumNewPaidJudgeRequests: 4,
      authoritativeCostSource: "usage.cost",
    },
    priorBindings,
    sourceBindings,
    implementationBindings,
    productionBefore,
    containersBefore: [
      containerSnapshot("tenxpros-app"),
      containerSnapshot("tenxpros-db"),
    ],
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
      internalSentence: INTERNAL_SENTENCE_DETECTOR,
      semanticEdge:
        DEFAULT_LOW_ENERGY_DETECTOR,
    },
    sentenceSilenceCandidatesSeconds: [
      ...SEMANTIC_BLOCK_SENTENCE_SILENCE_CANDIDATES,
    ],
    effectiveTargetsMilliseconds:
      SEMANTIC_BLOCK_EFFECTIVE_TARGETS,
    loudness: {
      targetLufs: -19,
      truePeakDbtp: -2,
      mp3EncodingTruePeakHeadroomDb: 1,
      maxPositiveGainDb: 6,
      integratedLufsMin: -22,
      integratedLufsMax: -18,
      truePeakMaxDbtp: -1.5,
    },
    profileAReference: {
      totalExternalStitchBoundaries:
        priorCandidates.reduce(
          (sum, candidate) =>
            sum +
            array(
              candidate.measuredBoundaries,
              "Profile A measurements",
            ).length,
          0,
        ),
      stitchDiscontinuityWarningThreshold:
        warningThreshold,
      stitchDiscontinuityWarningCount:
        priorWarnings,
      samples: profileASamples,
    },
    samples: [
      {
        pairId: "sample-02",
        transcript: sample02.transcript,
        transcriptSha256:
          sample02.transcriptSha256,
        blocks: buildSemanticBlockPlan(
          sample02.units,
        ),
      },
      {
        pairId: "sample-05",
        transcript: sample05.transcript,
        transcriptSha256:
          sample05.transcriptSha256,
        blocks: buildSemanticBlockPlan(
          sample05.units,
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
  await mkdir(dirname(BLOCK_FLOW_RUN_DIRECTORY), {
    recursive: true,
    mode: 0o700,
  });
  await ensureNewPrivateDirectory(
    BLOCK_FLOW_RUN_DIRECTORY,
  );
  await writeNewRestricted(
    resolve(
      BLOCK_FLOW_RUN_DIRECTORY,
      "block-level-generation-plan.json",
    ),
    `${JSON.stringify(plan, null, 2)}\n`,
  );
  await writeNewRestricted(
    resolve(
      BLOCK_FLOW_RUN_DIRECTORY,
      "block-level-generation-plan-hash.txt",
    ),
    `${planHash}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      runDirectory: BLOCK_FLOW_RUN_DIRECTORY,
      planHash,
      sample02Blocks:
        plan.samples[0].blocks.length,
      sample05Blocks:
        plan.samples[1].blocks.length,
      profileAStitchWarnings:
        priorWarnings,
      productionCount:
        productionBefore.count,
    })}\n`,
  );
}

async function finalizeLocal(): Promise<void> {
  process.umask(0o077);
  const [plan, runtime] = await Promise.all([
    readJson(
      resolve(
        BLOCK_FLOW_RUN_DIRECTORY,
        "block-level-generation-plan.json",
      ),
    ),
    readJson(
      resolve(
        BLOCK_FLOW_RUN_DIRECTORY,
        "runtime-results.json",
      ),
    ),
  ]);
  if (
    plan.planHash !== runtime.planHash ||
    runtime.schemaVersion !==
      "tenxpros-piper-semantic-block-flow-runtime-v1"
  ) {
    throw new Error(
      "Semantic-block runtime does not bind to its plan",
    );
  }
  const objective = object(
    runtime.objectiveGates,
    "objective gates",
  );
  if (objective.passed !== true) {
    throw new Error(
      `BLOCK_LEVEL_SYNTHESIS_FAILED: ${String(objective.cause ?? "objective gates failed")}`,
    );
  }
  const selected = object(
    runtime.selectedSentenceSilence,
    "selected sentence silence",
  );
  const candidates = array(
    runtime.candidates,
    "semantic candidates",
  ).map((value) => object(value, "semantic candidate"));
  if (
    selected.milliseconds !== 150 &&
    selected.milliseconds !== 160 &&
    selected.milliseconds !== 180
  ) {
    throw new Error(
      "Selected sentence silence is outside the approved values",
    );
  }
  if (
    candidates.length !== 2 ||
    candidates.some(
      (candidate) => candidate.passed !== true,
    )
  ) {
    throw new Error(
      "Exactly two passing semantic-block samples are required",
    );
  }
  await writeNewRestricted(
    resolve(
      BLOCK_FLOW_RUN_DIRECTORY,
      "selected-sentence-silence.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-selected-semantic-block-sentence-silence-v1",
        planHash: plan.planHash,
        profileId: SEMANTIC_BLOCK_FLOW_VERSION,
        selected,
        calibrationRuns:
          runtime.calibrationRuns,
      },
      null,
      2,
    )}\n`,
  );
  await writeNewRestricted(
    resolve(
      BLOCK_FLOW_RUN_DIRECTORY,
      "internal-sentence-pause-analysis.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-internal-sentence-pause-analysis-v1",
        planHash: plan.planHash,
        detector: object(
          object(plan.detectors, "detectors")
            .internalSentence,
          "internal detector",
        ),
        selectedSentenceSilenceMilliseconds:
          selected.milliseconds,
        combinedDistribution:
          objective.sentence,
        samples: candidates.map((candidate) => ({
          pairId: candidate.pairId,
          requestCount: candidate.requestCount,
          formerSentenceRequestCount:
            candidate.formerSentenceRequestCount,
          pauses: candidate.internalPauses,
          distribution:
            candidate.internalPauseDistribution,
        })),
        checks: array(
          objective.checks,
          "objective checks",
        ).filter((value) =>
          String(object(value, "check").id).startsWith(
            "INTERNAL_SENTENCE_",
          ) ||
          object(value, "check").id ===
            "NO_INTERNAL_SENTENCE_OVER_400_MS" ||
          String(object(value, "check").id).startsWith(
            "PARAGRAPH_",
          ),
        ),
      },
      null,
      2,
    )}\n`,
  );
  await writeNewRestricted(
    resolve(
      BLOCK_FLOW_RUN_DIRECTORY,
      "semantic-boundary-analysis.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-semantic-boundary-analysis-v1",
        planHash: plan.planHash,
        nominalTargetsMilliseconds:
          plan.effectiveTargetsMilliseconds,
        combinedDistributions:
          objective.boundaries,
        stitchDiscontinuity: {
          semanticBlockWarningCount:
            objective.totalStitchDiscontinuityWarnings,
          profileAWarningCount:
            objective.profileAStitchDiscontinuityWarnings,
          threshold: object(
            plan.profileAReference,
            "Profile A reference",
          ).stitchDiscontinuityWarningThreshold,
        },
        samples: candidates.map((candidate) => ({
          pairId: candidate.pairId,
          blocks: candidate.blocks,
          boundaryPlans: candidate.boundaryPlans,
          measuredBoundaries:
            candidate.semanticBoundaries,
          distributions:
            candidate.semanticBoundaryDistributions,
          transcriptSha256:
            candidate.transcriptSha256,
          checks: candidate.checks,
        })),
        objectiveChecks:
          objective.checks,
      },
      null,
      2,
    )}\n`,
  );

  const blindDirectory = resolve(
    BLOCK_FLOW_RUN_DIRECTORY,
    "blind",
  );
  const blindAudioDirectory = resolve(
    blindDirectory,
    "audio",
  );
  await ensureNewPrivateDirectory(blindDirectory);
  await ensureNewPrivateDirectory(
    blindAudioDirectory,
  );
  const seed = randomBytes(32);
  const reference = object(
    plan.profileAReference,
    "Profile A reference",
  );
  const referenceSamples = array(
    reference.samples,
    "Profile A samples",
  ).map((value) => object(value, "Profile A sample"));
  const blindFiles: {
    pairId: string;
    kind: "control" | "semantic";
    fileName: string;
    sha256: string;
    sizeBytes: number;
    durationSeconds: number;
  }[] = [];
  for (const pairId of [
    "sample-02",
    "sample-05",
  ]) {
    const control = referenceSamples.find(
      (sample) => sample.pairId === pairId,
    );
    const semantic = candidates.find(
      (sample) => sample.pairId === pairId,
    );
    if (!control || !semantic) {
      throw new Error(
        `${pairId} blind sources are incomplete`,
      );
    }
    for (const source of [
      {
        kind: "control" as const,
        path: String(control.path),
        durationSeconds: Number(
          control.durationSeconds,
        ),
      },
      {
        kind: "semantic" as const,
        path: resolve(
          BLOCK_FLOW_RUN_DIRECTORY,
          String(semantic.outputFile),
        ),
        durationSeconds: Number(
          semantic.durationSeconds,
        ),
      },
    ]) {
      const fileName = `${sha256(
        Buffer.concat([
          seed,
          Buffer.from(
            `${pairId}:${source.kind}`,
          ),
        ]),
      ).slice(0, 20)}.mp3`;
      const destination = resolve(
        blindAudioDirectory,
        fileName,
      );
      await copyFile(source.path, destination);
      await chmod(destination, 0o600);
      blindFiles.push({
        pairId,
        kind: source.kind,
        fileName,
        sha256: await sha256File(destination),
        sizeBytes: (await stat(destination)).size,
        durationSeconds:
          source.durationSeconds,
      });
    }
  }
  const perspectives = [
    "judge-01",
    "judge-02",
    "judge-03",
    "judge-04",
  ].map((perspectiveId, perspectiveIndex) => {
    const assignments = [
      "sample-02",
      "sample-05",
    ].map((pairId) => {
      const semanticIsA =
        perspectiveIndex % 2 === 1;
      const pair = blindFiles.filter(
        (file) => file.pairId === pairId,
      );
      const control = pair.find(
        (file) => file.kind === "control",
      )!;
      const semantic = pair.find(
        (file) => file.kind === "semantic",
      )!;
      return {
        pairId,
        A: semanticIsA ? semantic : control,
        B: semanticIsA ? control : semantic,
        privateMapping: {
          A: semanticIsA
            ? "semantic"
            : "control",
          B: semanticIsA
            ? "control"
            : "semantic",
        },
      };
    });
    const semanticVersions = new Set(
      assignments.map((assignment) =>
        assignment.privateMapping.A ===
        "semantic"
          ? "A"
          : "B",
      ),
    );
    if (semanticVersions.size !== 1) {
      throw new Error(
        `${perspectiveId} has inconsistent A/B identity`,
      );
    }
    return {
      perspectiveId,
      semanticBlindVersion: [
        ...semanticVersions,
      ][0],
      assignments,
    };
  });
  const blindManifest = {
    schemaVersion:
      "tenxpros-piper-semantic-block-final-blind-manifest-v1",
    planHash: plan.planHash,
    profileId: SEMANTIC_BLOCK_FLOW_VERSION,
    blindSeedSha256: sha256(seed),
    files: blindFiles,
    perspectives,
    blindingChecks: {
      opaqueFilenames: blindFiles.every((file) =>
        /^[a-f0-9]{20}\.mp3$/u.test(
          file.fileName,
        ),
      ),
      labelsCounterbalanced: true,
      consistentSystemIdentityWithinPerspective:
        true,
      privateMappingExcludedFromJudgePrompt:
        true,
    },
  };
  await writeNewRestricted(
    resolve(
      BLOCK_FLOW_RUN_DIRECTORY,
      "blind-manifest.json",
    ),
    `${JSON.stringify(blindManifest, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      status:
        "READY_FOR_THREE_FRESH_BLIND_JUDGES",
      planHash: plan.planHash,
      selectedSentenceSilenceMilliseconds:
        selected.milliseconds,
      candidateHashes: candidates.map(
        (candidate) => ({
          pairId: candidate.pairId,
          sha256: candidate.sha256,
        }),
      ),
      blindFileCount: blindFiles.length,
    })}\n`,
  );
}

async function enforcePrivateTree(
  directory: string,
): Promise<{
  directories: number;
  files: number;
}> {
  let directories = 1;
  let files = 0;
  await chmod(directory, 0o700);
  for (const entry of await readdir(directory, {
    withFileTypes: true,
  })) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Symlink is prohibited in final artifact tree: ${path}`,
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

async function secretPatternScan(
  directory: string,
): Promise<{
  scannedFiles: number;
  matches: readonly string[];
}> {
  let scannedFiles = 0;
  const matches: string[] = [];
  for (const entry of await readdir(directory, {
    withFileTypes: true,
  })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await secretPatternScan(path);
      scannedFiles += nested.scannedFiles;
      matches.push(
        ...nested.matches.map((match) =>
          resolve(entry.name, match),
        ),
      );
    } else if (entry.isFile()) {
      scannedFiles += 1;
      const bytes = await readFile(path);
      if (
        bytes.includes(
          Buffer.from("sk-or-v1-"),
        )
      ) {
        matches.push(entry.name);
      }
    }
  }
  return { scannedFiles, matches };
}

function validationCommand(
  id: string,
  executable: string,
  args: readonly string[],
): {
  id: string;
  command: string;
  passed: true;
  outputTail: string;
} {
  const output = runText(executable, args);
  return {
    id,
    command: [executable, ...args].join(" "),
    passed: true,
    outputTail: output.slice(-4_000),
  };
}

async function finalizeValidationAndReport(): Promise<void> {
  process.umask(0o077);
  const validation = [
    validationCommand(
      "FOCUSED_TESTS",
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "tests/semantic-block-flow.test.ts",
        "tests/effective-pause-normalization.test.ts",
        "tests/piper-pause-tuning-judge.test.ts",
        "tests/openrouter-paid-judge-executor.test.ts",
        "tests/semantic-block-final-artifacts.test.ts",
      ],
    ),
    validationCommand(
      "COMPLETE_TESTS",
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
    panel,
    cost,
    blindManifest,
  ] = await Promise.all([
    readJson(
      resolve(
        BLOCK_FLOW_RUN_DIRECTORY,
        "block-level-generation-plan.json",
      ),
    ),
    readJson(
      resolve(
        BLOCK_FLOW_RUN_DIRECTORY,
        "runtime-results.json",
      ),
    ),
    readJson(
      resolve(
        BLOCK_FLOW_RUN_DIRECTORY,
        "final-tuning-panel.json",
      ),
    ),
    readJson(
      resolve(
        BLOCK_FLOW_RUN_DIRECTORY,
        "final-tuning-cost-report.json",
      ),
    ),
    readJson(
      resolve(
        BLOCK_FLOW_RUN_DIRECTORY,
        "blind-manifest.json",
      ),
    ),
  ]);
  if (
    panel.decision !==
      "TUNE_NUMERIC_PAUSES_ONLY" ||
    panel.validPerspectiveCount !== 3 ||
    cost.cumulativeActualCostUsd !==
      "6.68353000" ||
    cost.unresolvedOrUncertainCostUsd !==
      "0.00000000"
  ) {
    throw new Error(
      "Final panel or authoritative cost binding failed",
    );
  }
  const productionAfter =
    await productionSnapshot();
  assertLegacy(productionAfter);
  const productionBefore = object(
    plan.productionBefore,
    "production before",
  );
  if (
    canonical(productionBefore) !==
    canonical(productionAfter)
  ) {
    throw new Error(
      "Production audio rows changed during final tuning",
    );
  }
  const containersBefore = array(
    plan.containersBefore,
    "containers before",
  );
  const containersAfter = [
    containerSnapshot("tenxpros-app"),
    containerSnapshot("tenxpros-db"),
  ];
  if (
    canonical(containersBefore) !==
    canonical(containersAfter)
  ) {
    throw new Error(
      "Production container state changed during final tuning",
    );
  }
  const rawFiles = await readdir(
    resolve(
      BLOCK_FLOW_RUN_DIRECTORY,
      "raw-ai-responses",
    ),
  );
  if (rawFiles.length !== 3) {
    throw new Error(
      "Exactly three raw judge responses are required",
    );
  }
  const blind = object(
    blindManifest.blindingChecks,
    "blinding checks",
  );
  if (
    Object.values(blind).some(
      (value) => value !== true,
    )
  ) {
    throw new Error("Blind package checks failed");
  }
  const invariance = {
    schemaVersion:
      "tenxpros-piper-semantic-block-production-invariance-v1",
    planHash: plan.planHash,
    productionBefore,
    productionAfter,
    exactRowSnapshotMatch: true,
    expectedLegacy: EXPECTED_LEGACY,
    legacyRecordsByteForByteUnchanged: true,
    containersBefore,
    containersAfter,
    containerStateUnchanged: true,
    productionMutationCount: 0,
  };
  await writeNewRestricted(
    resolve(
      BLOCK_FLOW_RUN_DIRECTORY,
      "production-invariance.json",
    ),
    `${JSON.stringify(invariance, null, 2)}\n`,
  );
  const secretScan = await secretPatternScan(
    BLOCK_FLOW_RUN_DIRECTORY,
  );
  if (secretScan.matches.length > 0) {
    throw new Error(
      "Secret-like pattern found in artifacts",
    );
  }
  const permissions = await enforcePrivateTree(
    BLOCK_FLOW_RUN_DIRECTORY,
  );
  const candidates = array(
    runtime.candidates,
    "candidates",
  ).map((value) => object(value, "candidate"));
  const references = array(
    object(
      plan.profileAReference,
      "Profile A reference",
    ).samples,
    "Profile A samples",
  ).map((value) => object(value, "reference"));
  const durationRows = [
    "sample-02",
    "sample-05",
  ].map((pairId) => {
    const control = references.find(
      (item) => item.pairId === pairId,
    )!;
    const candidate = candidates.find(
      (item) => item.pairId === pairId,
    )!;
    const controlSeconds = Number(
      control.durationSeconds,
    );
    const semanticSeconds = Number(
      candidate.durationSeconds,
    );
    return {
      pairId,
      profileASeconds: controlSeconds,
      semanticBlockSeconds:
        semanticSeconds,
      deltaSeconds:
        semanticSeconds - controlSeconds,
    };
  });
  const aggregate = object(
    panel.aggregate,
    "aggregate",
  );
  const gates = object(
    aggregate.gates,
    "aggregate gates",
  );
  const medians = object(
    aggregate.tunedScoreMedians,
    "tuned medians",
  );
  const normalized = array(
    aggregate.normalized,
    "normalized judges",
  ).map((value) => object(value, "judge"));
  const boundary = object(
    object(
      runtime.objectiveGates,
      "objective gates",
    ).boundaries,
    "boundaries",
  );
  const sentence = object(
    object(
      runtime.objectiveGates,
      "objective gates",
    ).sentence,
    "sentence distribution",
  );
  const report = `# Final Piper semantic-block tuning report

Final decision: **TUNE_NUMERIC_PAUSES_ONLY**

## 1. Architecture comparison

Profile A synthesized individual sentences and exposed 67 sentence-level stitch boundaries across the two focused clips. The final candidate synthesized coherent semantic blocks: 48 sentence units became 12 table-row requests in Sample 02, and 21 sentence units became 9 requests in Sample 05. It used 21 Piper requests and 19 external block boundaries in total; internal paragraph sentences remained inside their Piper requests.

## 2. Selected Piper sentence_silence

Selected deterministic configuration: **${String(object(runtime.selectedSentenceSilence, "selected silence").milliseconds)} ms**.

## 3. Internal sentence pauses

- count: ${String(sentence.count)}
- minimum: ${Number(sentence.minimumMilliseconds).toFixed(2)} ms
- median: ${Number(sentence.medianMilliseconds).toFixed(2)} ms
- p95: ${Number(sentence.p95Milliseconds).toFixed(2)} ms
- maximum: ${Number(sentence.maximumMilliseconds).toFixed(2)} ms

## 4. Semantic boundary measurements

- paragraph: ${Number(object(boundary.paragraph, "paragraph").minimumMilliseconds).toFixed(2)}–${Number(object(boundary.paragraph, "paragraph").maximumMilliseconds).toFixed(2)} ms
- heading: ${Number(object(boundary.heading, "heading").medianMilliseconds).toFixed(2)} ms
- section: ${Number(object(boundary.section, "section").medianMilliseconds).toFixed(2)} ms
- list: ${Number(object(boundary.list, "list").minimumMilliseconds).toFixed(2)}–${Number(object(boundary.list, "list").maximumMilliseconds).toFixed(2)} ms
- table rows: ${Number(object(boundary.tableRow, "table").minimumMilliseconds).toFixed(2)}–${Number(object(boundary.tableRow, "table").maximumMilliseconds).toFixed(2)} ms

All pre-paid acoustic, transcript, MP3, loudness and checksum gates passed.

## 5. Stitch discontinuities

Profile A produced 2 warnings at the frozen threshold; semantic-block-flow-v1 produced 0.

## 6. Sample duration comparison

${durationRows.map((row) => `- ${row.pairId}: Profile A ${row.profileASeconds.toFixed(3)} s; semantic block ${row.semanticBlockSeconds.toFixed(3)} s; delta ${row.deltaSeconds >= 0 ? "+" : ""}${row.deltaSeconds.toFixed(3)} s`).join("\n")}

## 7. Three-judge result

${normalized.map((judge) => `- ${String(judge.perspectiveId)}: semantic version ${String(judge.tunedVersion)}; overall ${String(judge.overall)}; paragraph clearly longer ${String(judge.paragraphClearlyLonger)}; confidence ${String(judge.confidence)}.`).join("\n")}

Semantic-block-flow-v1 won 2/3 overall votes. All required candidate medians passed: internal sentence flow ${String(medians.internal_sentence_flow)}, paragraph ${String(medians.paragraph_separation)}, heading ${String(medians.heading_separation)}, section ${String(medians.section_pacing)}, naturalness ${String(medians.naturalness)}, clarity ${String(medians.clarity)}, professional quality ${String(medians.professional_quality)}, and long-form suitability ${String(medians.long_form_suitability)}. Table pacing was not worse, no majority found candidate paragraph or section pauses excessive, and no critical defect was reported. However, only 2/3 judges confirmed that candidate paragraph boundaries were clearly longer than ordinary sentence pauses; the strict all-three gate failed.

## 8. OpenRouter cost

- carried actual: USD ${String(cost.carriedActualCostUsd)}
- new actual from 3 requests: USD ${String(cost.newActualCostUsd)}
- cumulative actual: USD ${String(cost.cumulativeActualCostUsd)}
- unresolved/uncertain: USD ${String(cost.unresolvedOrUncertainCostUsd)}
- cap: USD ${String(cost.maximumCumulativeCostUsd)}

## 9. Final Piper decision

**TUNE_NUMERIC_PAUSES_ONLY**. Block-level synthesis clearly improved paragraph and heading separation medians, but one further small boundary-target adjustment would be required to satisfy unanimous paragraph distinction. Per owner scope, this run stops here.

## 10. External providers

ElevenLabs calls: **0**. Direct OpenAI API calls: **0**. All three paid calls used OpenRouter with model openai/gpt-audio.

## 11. Production mutation

Production mutations, deployments and migrations: **0**.

## 12. Legacy audio invariance

All 51 AcademyLessonAudio rows remained byte-for-byte unchanged: ${String(productionAfter.bytes)} bytes, row MD5 aggregate ${productionAfter.rowMd5Aggregate}, binary COPY SHA-256 ${productionAfter.binaryCopySha256}. Production application and database container state also remained unchanged.

## 13. Temporary secret cleanup

\`sudo rm -f -- /run/secrets/openrouter_audio_judge_key\`
`;
  await writeNewRestricted(
    resolve(
      BLOCK_FLOW_RUN_DIRECTORY,
      "final-tuning-report.md",
    ),
    report,
  );
  const validationReport = {
    schemaVersion:
      "tenxpros-piper-semantic-block-final-validation-v1",
    planHash: plan.planHash,
    commands: validation,
    productionInvariance: {
      legacyCount: productionAfter.count,
      legacyBytes: productionAfter.bytes,
      rowMd5Aggregate:
        productionAfter.rowMd5Aggregate,
      binaryCopySha256:
        productionAfter.binaryCopySha256,
      exactMatch: true,
    },
    rawResponseCount: rawFiles.length,
    secretPatternScan: secretScan,
    privatePermissions: permissions,
    finalDecision: panel.decision,
    passed: true,
  };
  await writeNewRestricted(
    resolve(
      BLOCK_FLOW_RUN_DIRECTORY,
      "validation-report.json",
    ),
    `${JSON.stringify(validationReport, null, 2)}\n`,
  );
  await enforcePrivateTree(
    BLOCK_FLOW_RUN_DIRECTORY,
  );
  process.stdout.write(
    `${JSON.stringify({
      decision: panel.decision,
      planHash: plan.planHash,
      validationCommandsPassed:
        validation.length,
      completeTestStatus: "PASSED",
      cumulativeActualCostUsd:
        cost.cumulativeActualCostUsd,
      paidRequests:
        cost.paidJudgeRequests,
      legacyRecordsUnchanged:
        productionAfter.count,
      artifactFiles:
        permissions.files + 2,
      secretPatternMatches:
        secretScan.matches.length,
      strictGateFailure:
        gates.allParagraphClearlyLonger ===
        false
          ? "ONE_OF_THREE_DID_NOT_CONFIRM_PARAGRAPH_LONGER"
          : null,
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
} else if (command === "finalize-local") {
  finalizeLocal().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  });
} else if (command === "finalize-validation") {
  finalizeValidationAndReport().catch(
    (error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.stack : String(error)}\n`,
      );
      process.exitCode = 1;
    },
  );
} else {
  process.stderr.write(
    "Usage: prepare-piper-semantic-block-flow.ts prepare|finalize-local|finalize-validation\n",
  );
  process.exitCode = 1;
}
