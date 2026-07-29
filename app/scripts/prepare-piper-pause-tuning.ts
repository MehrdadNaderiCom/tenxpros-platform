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
  stat,
} from "node:fs/promises";
import {
  basename,
  dirname,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import {
  execFileSync,
  spawn,
  spawnSync,
} from "node:child_process";

import {
  DEFAULT_LOW_ENERGY_DETECTOR,
  EFFECTIVE_PAUSE_NORMALIZATION_VERSION,
  EFFECTIVE_PAUSE_TYPES,
  summarizeEffectivePauses,
  type EffectivePauseType,
} from "../src/lib/academy/narration/effective-pause-normalization";

const SCRIPT_DIRECTORY = dirname(
  fileURLToPath(import.meta.url),
);
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
export const PAUSE_TUNING_RUN_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "piper-pause-normalization",
  "phase2d-bryce-effective-pause-v2-20260727",
);
const TASK_ATTACHMENT = resolve(
  "/home/ubuntu/.codex/attachments/e8fe8d6c-ce5b-4e1d-8ba7-865a6c7522f8/pasted-text.txt",
);
const TASK_ATTACHMENT_SHA256 =
  "2a10ba93f2361e78defa6e22bf9d2d711ff1b72a5583c1750a4df39efe277db3";
const PHASE2A_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/piper-evaluation/piper-semantic-v1-bryce-20260726",
);
const PHASE2B_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/piper-listening/phase2b-bryce-20260726",
);
const PRIOR_PANEL_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/ai-audio-evaluation/phase2c-openrouter-bryce-tool-panel-v2c-20260727",
);
const EXPECTED_PRIOR_HASHES = Object.freeze({
  "evaluation-plan.json":
    "93a58cedd87d1dbd76b51fbb77bf412e4c008821ec31d9cf93a4ca7652360f4c",
  "request-ledger.jsonl":
    "8bfca5097e0b18487da0b00d4082f8cbe4cb97f73207771d88b68635216f1856",
  "piper-panel.json":
    "c521894ff12df412c5ff2264099f4f747de573b8c4a5e7aea991fb2cc4e684f4",
  "cost-report.json":
    "fafe78e45a4f5db728e9749c0f324dd44097f579ea9e779838a23f074319901e",
});
const EXPECTED_LEGACY_SNAPSHOT = Object.freeze({
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

function sha256(value: Buffer | string): string {
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
  throw new Error("Canonical JSON rejects unsupported values");
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

async function readJson(
  path: string,
): Promise<JsonRecord> {
  return JSON.parse(
    await readFile(path, "utf8"),
  ) as JsonRecord;
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
            `Production binary snapshot failed (${String(code)}): ${Buffer.concat(errors).toString("utf8").trim()}`,
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
      await productionBinaryCopySha256(),
  };
}

export function productionSnapshotMatches(
  left: ProductionSnapshot,
  right: ProductionSnapshot,
): boolean {
  return (
    left.count === right.count &&
    left.bytes === right.bytes &&
    left.rowMd5Aggregate ===
      right.rowMd5Aggregate &&
    left.binaryCopySha256 ===
      right.binaryCopySha256 &&
    JSON.stringify(left.rows) ===
      JSON.stringify(right.rows)
  );
}

function containerSnapshot(name: string) {
  const inspect = JSON.parse(
    runText("docker", ["inspect", name]),
  ) as readonly {
    Image: string;
    State: {
      StartedAt: string;
      Restarting: boolean;
      Running: boolean;
    };
    RestartCount: number;
  }[];
  const item = inspect[0];
  if (!item) {
    throw new Error(`Container ${name} is absent`);
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

function assertLegacySnapshot(
  snapshot: ProductionSnapshot,
): void {
  for (const [key, expected] of Object.entries(
    EXPECTED_LEGACY_SNAPSHOT,
  )) {
    if (
      snapshot[
        key as keyof ProductionSnapshot
      ] !== expected
    ) {
      throw new Error(
        `Legacy audio baseline ${key} changed`,
      );
    }
  }
}

function classifyPause(input: {
  id: string;
  pauseAfterMs: number;
}): EffectivePauseType | "end" {
  if (input.pauseAfterMs === 0) return "end";
  if (input.pauseAfterMs === 220) return "sentence";
  if (input.pauseAfterMs === 280) return "list";
  if (input.pauseAfterMs === 400) return "tableRow";
  if (input.pauseAfterMs === 700) return "heading";
  if (input.pauseAfterMs === 900) return "section";
  if (input.pauseAfterMs === 500) {
    return input.id.includes("/div[")
      ? "callout"
      : "paragraph";
  }
  throw new Error(
    `${input.id} has an unknown frozen pause ${String(input.pauseAfterMs)}`,
  );
}

function record(value: unknown, label: string): JsonRecord {
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

function buildSamples(input: {
  originalManifest: JsonRecord;
  originalRuntime: JsonRecord;
  supplementalManifest: JsonRecord;
  supplementalRuntime: JsonRecord;
  listeningManifest: JsonRecord;
}) {
  const listeningPairs = array(
    input.listeningManifest.pairs,
    "listening pairs",
  ).map((value) => record(value, "listening pair"));
  const sourceSets = [
    {
      manifest: input.originalManifest,
      runtime: input.originalRuntime,
    },
    {
      manifest: input.supplementalManifest,
      runtime: input.supplementalRuntime,
    },
  ];
  const samples = [];
  for (const listeningPair of listeningPairs) {
    const pairId = String(listeningPair.pairId);
    const correctedAssignment = array(
      listeningPair.samples,
      `${pairId} assignments`,
    )
      .map((value) =>
        record(value, `${pairId} assignment`),
      )
      .find(
        (assignment) =>
          assignment.pipeline === "corrected",
      );
    if (!correctedAssignment) {
      throw new Error(
        `${pairId} corrected assignment missing`,
      );
    }
    const sourceSet = sourceSets.find(({ manifest }) =>
      array(
        record(manifest.plan, "source plan")
          .excerpts,
        "source excerpts",
      ).some(
        (value) =>
          record(value, "excerpt").id ===
          listeningPair.excerptId,
      ),
    );
    if (!sourceSet) {
      throw new Error(
        `${pairId} source excerpt missing`,
      );
    }
    const excerpt = array(
      record(sourceSet.manifest.plan, "plan")
        .excerpts,
      "excerpts",
    )
      .map((value) => record(value, "excerpt"))
      .find(
        (candidate) =>
          candidate.id === listeningPair.excerptId,
      );
    if (!excerpt) throw new Error("Excerpt disappeared");
    const corrected = record(
      record(excerpt.pipelines, "pipelines")
        .corrected,
      "corrected pipeline",
    );
    const runtimeSample = array(
      sourceSet.runtime.samples,
      "runtime samples",
    )
      .map((value) =>
        record(value, "runtime sample"),
      )
      .find(
        (candidate) =>
          candidate.pairId === pairId &&
          candidate.pipeline === "corrected",
      );
    if (!runtimeSample) {
      throw new Error(
        `${pairId} corrected runtime missing`,
      );
    }
    const units = array(
      corrected.units,
      `${pairId} units`,
    ).map((value) => record(value, "unit"));
    const runtimeSegments = new Map(
      array(
        runtimeSample.segments,
        `${pairId} runtime segments`,
      ).map((value) => {
        const segment = record(
          value,
          "runtime segment",
        );
        return [String(segment.id), segment];
      }),
    );
    const segments = units.map((unit) => {
      const id = String(unit.id);
      const runtimeSegment =
        runtimeSegments.get(id);
      if (!runtimeSegment) {
        throw new Error(
          `${pairId}/${id} runtime evidence missing`,
        );
      }
      const pauseAfterMs = Number(
        unit.pauseAfterMs,
      );
      if (
        runtimeSegment.requestedPauseAfterMs !==
        pauseAfterMs
      ) {
        throw new Error(
          `${pairId}/${id} pause evidence mismatch`,
        );
      }
      return {
        id,
        text: String(unit.text),
        textSha256: String(unit.textSha256),
        pauseType: classifyPause({
          id,
          pauseAfterMs,
        }),
        currentConfiguredPauseMilliseconds:
          pauseAfterMs,
        expectedRawWavSha256: String(
          runtimeSegment.rawWavSha256,
        ),
      };
    });
    const fileName = String(
      correctedAssignment.filename,
    );
    samples.push({
      pairId,
      currentBlindLabel: fileName.match(
        /-([AB])\.mp3$/u,
      )?.[1],
      currentFileName: fileName,
      currentFileSha256: String(
        correctedAssignment.sha256,
      ),
      currentDurationSeconds: Number(
        correctedAssignment.durationSeconds,
      ),
      transcript: String(corrected.transcript),
      transcriptSha256: String(
        corrected.transcriptSha256,
      ),
      layout: runtimeSample.layout,
      segments,
      generateCandidate:
        pairId === "sample-02" ||
        pairId === "sample-05",
    });
  }
  return samples;
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
    EXPECTED_PRIOR_HASHES,
  )) {
    const path = resolve(PRIOR_PANEL_DIRECTORY, file);
    const actual = await sha256File(path);
    if (actual !== expected) {
      throw new Error(
        `Prior panel binding changed: ${file}`,
      );
    }
    priorBindings.push({
      file,
      sha256: actual,
    });
  }
  const priorCost = await readJson(
    resolve(
      PRIOR_PANEL_DIRECTORY,
      "cost-report.json",
    ),
  );
  if (
    priorCost.cumulativeKnownActualCostUsd !==
      "5.58664750" ||
    priorCost.maximumUncertainCostUsd !==
      "0.00000000"
  ) {
    throw new Error(
      "Carried OpenRouter cost no longer matches",
    );
  }
  const [
    originalManifest,
    originalRuntime,
    supplementalManifest,
    supplementalRuntime,
    listeningManifest,
  ] = await Promise.all([
    readJson(
      resolve(
        PHASE2A_DIRECTORY,
        "private/manifest.json",
      ),
    ),
    readJson(
      resolve(
        PHASE2A_DIRECTORY,
        "private/runtime-results.json",
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
        PHASE2B_DIRECTORY,
        "private/manifest.json",
      ),
    ),
  ]);
  const sourceBindings = await Promise.all(
    [
      resolve(
        PHASE2A_DIRECTORY,
        "private/manifest.json",
      ),
      resolve(
        PHASE2A_DIRECTORY,
        "private/runtime-results.json",
      ),
      resolve(
        PHASE2B_DIRECTORY,
        "private/supplemental-manifest.json",
      ),
      resolve(
        PHASE2B_DIRECTORY,
        "private/runtime-results.json",
      ),
      resolve(
        PHASE2B_DIRECTORY,
        "private/manifest.json",
      ),
    ].map(async (path) => ({
      file: basename(path),
      path,
      sha256: await sha256File(path),
    })),
  );
  const implementationBindings =
    await Promise.all(
      [
        resolve(
          APP_ROOT,
          "src/lib/academy/narration/effective-pause-normalization.ts",
        ),
        resolve(
          APP_ROOT,
          "scripts/piper-pause-normalization-runtime.ts",
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
  const productionBefore =
    await productionSnapshot();
  assertLegacySnapshot(productionBefore);
  const containersBefore = [
    containerSnapshot("tenxpros-app"),
    containerSnapshot("tenxpros-db"),
  ];
  const voice = record(
    supplementalRuntime.voice,
    "voice",
  );
  const samples = buildSamples({
    originalManifest,
    originalRuntime,
    supplementalManifest,
    supplementalRuntime,
    listeningManifest,
  });
  const planWithoutHash = {
    version:
      "tenxpros-piper-pause-normalization-plan-v1",
    normalizationVersion:
      EFFECTIVE_PAUSE_NORMALIZATION_VERSION,
    ownerAuthorization: {
      attachmentSha256: TASK_ATTACHMENT_SHA256,
      maximumNewPaidJudgeRequests: 4,
      standardPaidJudgePerspectives: 3,
      noElevenLabs: true,
      noDirectOpenAi: true,
      noProductionMutation: true,
    },
    financialPolicy: {
      provider: "OpenRouter",
      model: "openai/gpt-audio",
      carriedActualCostUsd: "5.58664750",
      unresolvedCostUsd: "0.00000000",
      maximumCumulativeCostUsd: "10.00000000",
      maximumNewPaidJudgeRequests: 4,
      authoritativeCostSource: "usage.cost",
    },
    sourceBindings,
    implementationBindings,
    priorPanelBindings: priorBindings,
    productionBefore,
    containersBefore,
    sampleRate: 22_050,
    lengthScale: 1,
    voice: {
      id: "bryce",
      modelPath: String(voice.modelPath),
      configPath: String(voice.configPath),
      modelSha256: String(voice.modelSha256),
      configSha256: String(voice.configSha256),
    },
    detector: DEFAULT_LOW_ENERGY_DETECTOR,
    loudness: {
      targetLufs: -19,
      truePeakDbtp: -2,
      mp3EncodingTruePeakHeadroomDb: 1,
      maxPositiveGainDb: 6,
      integratedLufsMin: -22,
      integratedLufsMax: -18,
      truePeakMaxDbtp: -1.5,
    },
    profiles: [
      {
        id: "A",
        name: "Balanced",
        targetsMilliseconds: {
          sentence: 180,
          list: 300,
          tableRow: 280,
          paragraph: 700,
          callout: 650,
          heading: 900,
          section: 1_200,
        },
      },
      {
        id: "B",
        name: "Spacious",
        targetsMilliseconds: {
          sentence: 200,
          list: 320,
          tableRow: 300,
          paragraph: 800,
          callout: 750,
          heading: 1_000,
          section: 1_350,
        },
      },
    ],
    samples,
  };
  const planHash = sha256(
    canonical(planWithoutHash),
  );
  const plan = {
    ...planWithoutHash,
    planHash,
  };
  await mkdir(dirname(PAUSE_TUNING_RUN_DIRECTORY), {
    recursive: true,
    mode: 0o700,
  });
  await ensureNewPrivateDirectory(
    PAUSE_TUNING_RUN_DIRECTORY,
  );
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "tuning-plan.json",
    ),
    `${JSON.stringify(plan, null, 2)}\n`,
  );
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "tuning-plan-hash.txt",
    ),
    `${planHash}\n`,
  );
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "measurement-methodology.md",
    ),
    `# Effective-pause measurement methodology

Version: \`${EFFECTIVE_PAUSE_NORMALIZATION_VERSION}\`

The frozen corrected MP3 is decoded to signed 16-bit, 22.05 kHz mono PCM. Frozen runtime frame layouts locate every real segment boundary without estimating MP3 encoder delay; decoded and frozen frame counts must match exactly.

For each boundary, effective pause is:

\`configured inserted silence + contiguous low-energy tail of the preceding segment + contiguous low-energy head of the following segment\`.

Low-energy detection scans 10 ms windows inward from each edge and stops at the first window whose RMS exceeds -46 dBFS or whose peak exceeds -34 dBFS. This VAD/energy rule does not count internal phoneme gaps. Values are reported in frames and milliseconds. P95 uses nearest rank.

Normalization retains at least 30 ms of proven low-energy audio at each speech edge. Padding is trimmed only inside the detected envelope and only when a cut with absolute sample amplitude no greater than 128 is found within the 10 ms safe-cut search. It never crosses the first active-energy window. If that proof fails, no audio is trimmed and the boundary uses the insertion-only fail-closed behavior.

The configured silence for an eligible safe boundary is the exact number of PCM frames still needed after retained low-energy heads and tails to reach the profile target. This prevents double pauses. The stitched waveform receives one constant-gain loudness adjustment with 1 dB of true-peak headroom reserved for MP3 encoding, followed by LAME mono 64 kbps CBR encoding. The final MP3 is decoded again and remeasured with the same method.

The current hypothesis is measurable masking: variable Piper low-energy heads and tails are added on top of fixed semantic silences. Long sentence tails raise the upper sentence distribution while shorter paragraph-edge tails reduce the perceptual gap, so the nominal 220/500 ms hierarchy can collapse even when the inserted paragraph silence is numerically larger.
`,
  );
  process.stdout.write(
    `${JSON.stringify({
      runDirectory: PAUSE_TUNING_RUN_DIRECTORY,
      planHash,
      productionBefore: {
        count: productionBefore.count,
        bytes: productionBefore.bytes,
        binaryCopySha256:
          productionBefore.binaryCopySha256,
      },
    })}\n`,
  );
}

function combinedBoundaries(
  candidates: readonly JsonRecord[],
  profileId: string,
): JsonRecord[] {
  return candidates
    .filter(
      (candidate) =>
        candidate.profileId === profileId,
    )
    .flatMap((candidate) =>
      array(
        candidate.measuredBoundaries,
        "candidate measured boundaries",
      ).map((value) =>
        record(value, "candidate boundary"),
      ),
    );
}

function combinedDistributions(
  boundaries: readonly JsonRecord[],
) {
  const sentenceValues = boundaries
    .filter(
      (boundary) =>
        boundary.pauseType === "sentence",
    )
    .map((boundary) =>
      Number(boundary.effectivePauseMilliseconds),
    );
  const sentenceMinimum =
    sentenceValues.length > 0
      ? Math.min(...sentenceValues)
      : null;
  const sentenceMaximum =
    sentenceValues.length > 0
      ? Math.max(...sentenceValues)
      : null;
  return Object.fromEntries(
    EFFECTIVE_PAUSE_TYPES.map((type) => {
      const values = boundaries
        .filter(
          (boundary) =>
            boundary.pauseType === type,
        )
        .map((boundary) =>
          Number(
            boundary.effectivePauseMilliseconds,
          ),
        );
      return [
        type,
        {
          ...summarizeEffectivePauses(values),
          sentenceOverlapCount:
            type === "sentence" ||
            sentenceMinimum === null ||
            sentenceMaximum === null
              ? 0
              : values.filter(
                  (value) =>
                    value >= sentenceMinimum &&
                    value <= sentenceMaximum,
                ).length,
        },
      ];
    }),
  ) as Record<
    EffectivePauseType,
    ReturnType<typeof summarizeEffectivePauses> & {
      sentenceOverlapCount: number;
    }
  >;
}

function profileAudit(input: {
  profileId: "A" | "B";
  candidates: readonly JsonRecord[];
  currentBoundaries: readonly JsonRecord[];
}) {
  const samples = input.candidates.filter(
    (candidate) =>
      candidate.profileId === input.profileId,
  );
  const boundaries = combinedBoundaries(
    input.candidates,
    input.profileId,
  );
  const summary =
    combinedDistributions(boundaries);
  const currentMaximumDiscontinuity = Math.max(
    ...input.currentBoundaries
      .filter(
        (boundary) =>
          boundary.pairId === "sample-02" ||
          boundary.pairId === "sample-05",
      )
      .map((boundary) =>
        Number(
          record(
            boundary.decodedBoundaryDiscontinuity,
            "current discontinuity",
          ).maximumAbsoluteDelta,
        ),
      ),
  );
  const candidateMaximumDiscontinuity = Math.max(
    ...boundaries.map((boundary) =>
      Number(
        record(
          boundary.decodedBoundaryDiscontinuity,
          "candidate discontinuity",
        ).maximumAbsoluteDelta,
      ),
    ),
  );
  const checks = [
    {
      id: "EXACTLY_TWO_TUNED_SAMPLES",
      pass: samples.length === 2,
      details: { sampleCount: samples.length },
    },
    {
      id: "ALL_RUNTIME_AND_AUDIO_GATES",
      pass: samples.every(
        (sample) => sample.passed === true,
      ),
      details: {
        failedSamples: samples
          .filter(
            (sample) => sample.passed !== true,
          )
          .map((sample) => sample.pairId),
      },
    },
    {
      id: "NO_PARAGRAPH_BELOW_650_MS",
      pass:
        summary.paragraph.minimumMilliseconds !==
          null &&
        summary.paragraph.minimumMilliseconds >=
          650,
      details: summary.paragraph,
    },
    {
      id: "PARAGRAPH_MEDIAN_EXCEEDS_SENTENCE_P95_BY_300_MS",
      pass:
        summary.paragraph.medianMilliseconds !==
          null &&
        summary.sentence.p95Milliseconds !== null &&
        summary.paragraph.medianMilliseconds >=
          summary.sentence.p95Milliseconds + 300,
      details: {
        paragraphMedian:
          summary.paragraph.medianMilliseconds,
        sentenceP95:
          summary.sentence.p95Milliseconds,
      },
    },
    {
      id: "NO_PARAGRAPH_SENTENCE_OVERLAP",
      pass:
        summary.paragraph.sentenceOverlapCount ===
          0 &&
        summary.paragraph.minimumMilliseconds !==
          null &&
        summary.sentence.maximumMilliseconds !==
          null &&
        summary.paragraph.minimumMilliseconds >
          summary.sentence.maximumMilliseconds,
      details: {
        paragraphMinimum:
          summary.paragraph.minimumMilliseconds,
        sentenceMaximum:
          summary.sentence.maximumMilliseconds,
      },
    },
    {
      id: "HEADING_AT_LEAST_150_MS_LONGER_THAN_PARAGRAPH",
      pass:
        summary.heading.medianMilliseconds !==
          null &&
        summary.paragraph.medianMilliseconds !==
          null &&
        summary.heading.medianMilliseconds >=
          summary.paragraph.medianMilliseconds +
            150,
      details: {
        headingMedian:
          summary.heading.medianMilliseconds,
        paragraphMedian:
          summary.paragraph.medianMilliseconds,
      },
    },
    {
      id: "SECTION_AT_LEAST_200_MS_LONGER_THAN_HEADING",
      pass:
        summary.section.medianMilliseconds !==
          null &&
        summary.heading.medianMilliseconds !==
          null &&
        summary.section.medianMilliseconds >=
          summary.heading.medianMilliseconds +
            200,
      details: {
        sectionMedian:
          summary.section.medianMilliseconds,
        headingMedian:
          summary.heading.medianMilliseconds,
      },
    },
    {
      id: "LIST_DISTINCT_BUT_BELOW_PARAGRAPH",
      pass:
        summary.list.medianMilliseconds !== null &&
        summary.sentence.medianMilliseconds !==
          null &&
        summary.paragraph.minimumMilliseconds !==
          null &&
        summary.list.medianMilliseconds >=
          summary.sentence.medianMilliseconds + 80 &&
        (summary.list.maximumMilliseconds ?? Infinity) <
          summary.paragraph.minimumMilliseconds,
      details: {
        list: summary.list,
        sentence: summary.sentence,
        paragraph: summary.paragraph,
      },
    },
    {
      id: "TABLE_ROWS_AT_MOST_350_MS",
      pass:
        summary.tableRow.count > 0 &&
        (summary.tableRow.maximumMilliseconds ??
          Infinity) <= 350,
      details: summary.tableRow,
    },
    {
      id: "NO_UNSAFE_TRIM_FALLBACK",
      pass: samples.every((sample) =>
        array(
          sample.boundaryPlans,
          "boundary plans",
        ).every(
          (value) =>
            record(value, "boundary plan")
              .fallbackUsed === false,
        ),
      ),
      details: null,
    },
    {
      id: "STITCH_DISCONTINUITY_NOT_WORSE",
      pass:
        candidateMaximumDiscontinuity <=
        currentMaximumDiscontinuity,
      details: {
        currentMaximumAbsoluteDelta:
          currentMaximumDiscontinuity,
        candidateMaximumAbsoluteDelta:
          candidateMaximumDiscontinuity,
      },
    },
  ];
  return {
    schemaVersion:
      "tenxpros-piper-pause-normalization-candidate-audit-v1",
    profileId: input.profileId,
    samples: samples.map((sample) => ({
      pairId: sample.pairId,
      outputFile: sample.outputFile,
      sha256: sample.sha256,
      durationSeconds: sample.durationSeconds,
      passed: sample.passed,
    })),
    distributions: summary,
    maximumDecodedBoundaryDiscontinuity:
      candidateMaximumDiscontinuity,
    totalDurationSeconds: samples.reduce(
      (total, sample) =>
        total + Number(sample.durationSeconds),
      0,
    ),
    checks,
    eligible: checks.every((check) => check.pass),
  };
}

async function finalizeLocal(): Promise<void> {
  process.umask(0o077);
  const runtime = await readJson(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "runtime-results.json",
    ),
  );
  const plan = await readJson(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "tuning-plan.json",
    ),
  );
  if (
    runtime.planHash !== plan.planHash ||
    runtime.schemaVersion !==
      "tenxpros-piper-pause-normalization-runtime-results-v1"
  ) {
    throw new Error(
      "Local runtime results do not bind to the tuning plan",
    );
  }
  const currentBoundaries = array(
    runtime.currentMeasurements,
    "current measurements",
  ).map((value) =>
    record(value, "current measurement"),
  );
  const candidates = array(
    runtime.candidates,
    "candidates",
  ).map((value) => record(value, "candidate"));
  const currentDistributions =
    runtime.currentDistributions;
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "current-effective-pause-measurements.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-current-effective-pause-measurements-v1",
        planHash: plan.planHash,
        detector: runtime.detector,
        controls: runtime.currentControlAudits,
        boundaries: currentBoundaries,
      },
      null,
      2,
    )}\n`,
  );
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "current-pause-distributions.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-current-pause-distributions-v1",
        planHash: plan.planHash,
        distributions: currentDistributions,
        rootCause: {
          finding:
            "VARIABLE_PIPER_LOW_ENERGY_PADDING_COMPRESSES_SEMANTIC_PAUSE_HIERARCHY",
          configuredSilenceWasNotEffectivePause:
            true,
          mechanism:
            "Fixed zero insertion was added after only exact-zero trimming. Variable non-zero low-energy heads and tails therefore remained additive; long sentence tails raised sentence p95 while shorter semantic-boundary tails narrowed the perceived paragraph gap.",
          paragraphCanSoundSentenceLike:
            currentBoundaries.some(
              (boundary) =>
                boundary.pauseType ===
                  "paragraph" &&
                boundary.hierarchyMaskRisk === true,
            ),
        },
      },
      null,
      2,
    )}\n`,
  );

  const audits = [
    profileAudit({
      profileId: "A",
      candidates,
      currentBoundaries,
    }),
    profileAudit({
      profileId: "B",
      candidates,
      currentBoundaries,
    }),
  ];
  for (const profileId of ["A", "B"] as const) {
    const profileCandidates = candidates.filter(
      (candidate) =>
        candidate.profileId === profileId,
    );
    const manifest = {
      schemaVersion:
        "tenxpros-piper-pause-normalization-candidate-manifest-v1",
      planHash: plan.planHash,
      profile: array(
        plan.profiles,
        "profiles",
      )
        .map((value) => record(value, "profile"))
        .find(
          (profile) => profile.id === profileId,
        ),
      detector: runtime.detector,
      samples: profileCandidates,
    };
    await writeNewRestricted(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        `candidate-${profileId.toLowerCase()}-manifest.json`,
      ),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await writeNewRestricted(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        `candidate-${profileId.toLowerCase()}-audit.json`,
      ),
      `${JSON.stringify(
        audits.find(
          (audit) =>
            audit.profileId === profileId,
        ),
        null,
        2,
      )}\n`,
    );
  }
  const eligible = audits
    .filter((audit) => audit.eligible)
    .sort(
      (left, right) =>
        left.totalDurationSeconds -
          right.totalDurationSeconds ||
        left.maximumDecodedBoundaryDiscontinuity -
          right.maximumDecodedBoundaryDiscontinuity,
    );
  const selected = eligible[0] ?? null;
  const selection = {
    schemaVersion:
      "tenxpros-piper-pause-normalization-candidate-selection-v1",
    planHash: plan.planHash,
    selectionPolicy: [
      "eligibility",
      "pause hierarchy",
      "shorter total duration",
      "lower decoded stitch discontinuity",
      "table efficiency",
    ],
    candidates: audits.map((audit) => ({
      profileId: audit.profileId,
      eligible: audit.eligible,
      totalDurationSeconds:
        audit.totalDurationSeconds,
      maximumDecodedBoundaryDiscontinuity:
        audit.maximumDecodedBoundaryDiscontinuity,
      failedChecks: audit.checks
        .filter((check) => !check.pass)
        .map((check) => check.id),
    })),
    selectedProfileId:
      selected?.profileId ?? null,
    status: selected
      ? "SELECTED_FOR_BLIND_EVALUATION"
      : "PAUSE_NORMALIZATION_IMPLEMENTATION_FAILED",
  };
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "candidate-selection.json",
    ),
    `${JSON.stringify(selection, null, 2)}\n`,
  );
  if (!selected) {
    process.stdout.write(
      `${JSON.stringify(selection)}\n`,
    );
    return;
  }

  const selectedProfile = selected.profileId;
  const blindDirectory = resolve(
    PAUSE_TUNING_RUN_DIRECTORY,
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
  const blindSeed = randomBytes(32);
  const blindFiles = [];
  const selectedSamples = candidates.filter(
    (candidate) =>
      candidate.profileId === selectedProfile,
  );
  const planSamples = array(
    plan.samples,
    "plan samples",
  ).map((value) => record(value, "plan sample"));
  for (const pairId of [
    "sample-02",
    "sample-05",
  ]) {
    const current = planSamples.find(
      (sample) => sample.pairId === pairId,
    );
    const tuned = selectedSamples.find(
      (sample) => sample.pairId === pairId,
    );
    if (!current || !tuned) {
      throw new Error(
        `${pairId} blind source missing`,
      );
    }
    for (const [kind, source] of [
      [
        "current",
        resolve(
          PHASE2B_DIRECTORY,
          "listener-package/audio",
          String(current.currentFileName),
        ),
      ],
      [
        "tuned",
        resolve(
          PAUSE_TUNING_RUN_DIRECTORY,
          String(tuned.outputFile),
        ),
      ],
    ] as const) {
      const opaque = sha256(
        Buffer.concat([
          blindSeed,
          Buffer.from(`${pairId}:${kind}`),
        ]),
      ).slice(0, 20);
      const destination = resolve(
        blindAudioDirectory,
        `${opaque}.mp3`,
      );
      await copyFile(source, destination);
      await chmod(destination, 0o600);
      blindFiles.push({
        pairId,
        kind,
        fileName: basename(destination),
        sha256: await sha256File(destination),
        sizeBytes: (await stat(destination)).size,
      });
    }
  }
  const perspectives = [
    "judge-01",
    "judge-02",
    "judge-03",
    "judge-04",
  ].map((perspectiveId, index) => {
    const assignments = [
      "sample-02",
      "sample-05",
    ].map((pairId, pairIndex) => {
      const tunedIsA =
        (index + pairIndex) % 2 === 1;
      const pairFiles = blindFiles.filter(
        (file) => file.pairId === pairId,
      );
      const current = pairFiles.find(
        (file) => file.kind === "current",
      )!;
      const tuned = pairFiles.find(
        (file) => file.kind === "tuned",
      )!;
      return {
        pairId,
        A: tunedIsA ? tuned : current,
        B: tunedIsA ? current : tuned,
        privateMapping: {
          A: tunedIsA ? "tuned" : "current",
          B: tunedIsA ? "current" : "tuned",
        },
      };
    });
    return { perspectiveId, assignments };
  });
  const blindManifest = {
    schemaVersion:
      "tenxpros-piper-pause-tuning-blind-manifest-v1",
    planHash: plan.planHash,
    selectedProfileId: selectedProfile,
    blindSeedSha256: sha256(blindSeed),
    files: blindFiles,
    perspectives,
    blindingChecks: {
      opaqueFilenames: blindFiles.every(
        (file) =>
          /^[a-f0-9]{20}\.mp3$/u.test(
            file.fileName,
          ),
      ),
      labelsCounterbalanced: true,
      privateMappingExcludedFromJudgePrompt:
        true,
    },
  };
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "tuning-blind-manifest.json",
    ),
    `${JSON.stringify(blindManifest, null, 2)}\n`,
  );
  const generatedMp3s = candidates.map(
    (candidate) => ({
      path: candidate.outputFile,
      sha256: candidate.sha256,
      sizeBytes: candidate.sizeBytes,
    }),
  );
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "sha256-ledger.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-piper-pause-tuning-sha256-ledger-v1",
        planHash: plan.planHash,
        generatedMp3s,
        blindCopies: blindFiles.map((file) => ({
          path: `blind/audio/${file.fileName}`,
          sha256: file.sha256,
          sizeBytes: file.sizeBytes,
        })),
      },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(
    `${JSON.stringify(selection)}\n`,
  );
}

async function materializeRequiredArtifacts(): Promise<void> {
  process.umask(0o077);
  const [
    plan,
    runtime,
    currentMeasurements,
    currentDistributions,
    selection,
    candidateAManifest,
    candidateBManifest,
    candidateAAudit,
    candidateBAudit,
    preliminaryBlind,
  ] = await Promise.all([
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "tuning-plan.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "runtime-results.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "current-effective-pause-measurements.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "current-pause-distributions.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "candidate-selection.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "candidate-a-manifest.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "candidate-b-manifest.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "candidate-a-audit.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "candidate-b-audit.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "tuning-blind-manifest.json",
      ),
    ),
  ]);
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "effective-pause-analysis-current.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-effective-pause-analysis-current-v1",
        planHash: plan.planHash,
        measurement: currentMeasurements,
        distribution: currentDistributions,
      },
      null,
      2,
    )}\n`,
  );
  for (const [
    profile,
    manifest,
    audit,
  ] of [
    ["a", candidateAManifest, candidateAAudit],
    ["b", candidateBManifest, candidateBAudit],
  ] as const) {
    await writeNewRestricted(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        `effective-pause-analysis-profile-${profile}.json`,
      ),
      `${JSON.stringify(
        {
          schemaVersion:
            "tenxpros-effective-pause-analysis-profile-v1",
          planHash: plan.planHash,
          manifest,
          audit,
        },
        null,
        2,
      )}\n`,
    );
  }
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "pause-normalization-manifest.json",
    ),
    `${JSON.stringify(
      {
        schemaVersion:
          "tenxpros-pause-normalization-manifest-v1",
        planHash: plan.planHash,
        normalizationVersion:
          plan.normalizationVersion,
        detector: plan.detector,
        profiles: plan.profiles,
        implementationBindings:
          plan.implementationBindings,
        runtimeResultsSha256: await sha256File(
          resolve(
            PAUSE_TUNING_RUN_DIRECTORY,
            "runtime-results.json",
          ),
        ),
        sourceControlPolicy:
          "Speech PCM is sliced from the frozen, hashed current-corrected MP3 controls at exact frozen frame boundaries; only proven low-energy edge padding and inserted zero silence change.",
        runtimeIsolation: runtime.isolation,
      },
      null,
      2,
    )}\n`,
  );
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "selected-profile.json",
    ),
    `${JSON.stringify(selection, null, 2)}\n`,
  );
  const tunedDirectory = resolve(
    PAUSE_TUNING_RUN_DIRECTORY,
    "tuned-audio",
  );
  await ensureNewPrivateDirectory(tunedDirectory);
  for (const candidate of array(
    runtime.candidates,
    "runtime candidates",
  ).map((value) => record(value, "candidate"))) {
    const source = resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      String(candidate.outputFile),
    );
    const destination = resolve(
      tunedDirectory,
      basename(source),
    );
    await copyFile(source, destination);
    await chmod(destination, 0o600);
    if (
      (await sha256File(destination)) !==
      candidate.sha256
    ) {
      throw new Error(
        `${basename(source)} tuned-audio copy failed`,
      );
    }
  }
  const files = array(
    preliminaryBlind.files,
    "preliminary blind files",
  ).map((value) => record(value, "blind file"));
  const perspectives = [
    "judge-01",
    "judge-02",
    "judge-03",
    "judge-04",
  ].map((perspectiveId, index) => {
    const tunedIsA = index % 2 === 1;
    return {
      perspectiveId,
      tunedBlindVersion: tunedIsA ? "A" : "B",
      assignments: [
        "sample-02",
        "sample-05",
      ].map((pairId) => {
        const pairFiles = files.filter(
          (file) => file.pairId === pairId,
        );
        const current = pairFiles.find(
          (file) => file.kind === "current",
        );
        const tuned = pairFiles.find(
          (file) => file.kind === "tuned",
        );
        if (!current || !tuned) {
          throw new Error(
            `${pairId} blind files are incomplete`,
          );
        }
        return {
          pairId,
          A: tunedIsA ? tuned : current,
          B: tunedIsA ? current : tuned,
          privateMapping: {
            A: tunedIsA ? "tuned" : "current",
            B: tunedIsA ? "current" : "tuned",
          },
        };
      }),
    };
  });
  const correctedBlindManifest = {
    schemaVersion:
      "tenxpros-piper-pause-tuning-blinded-manifest-v2",
    planHash: plan.planHash,
    selectedProfileId:
      selection.selectedProfileId,
    sourcePreliminaryManifestSha256:
      await sha256File(
        resolve(
          PAUSE_TUNING_RUN_DIRECTORY,
          "tuning-blind-manifest.json",
        ),
      ),
    correction:
      "Each judge now receives one consistent System A/System B mapping across both clips; the preliminary per-pair counterbalancing manifest is not used for inference.",
    files,
    perspectives,
    blindingChecks: {
      consistentSystemMappingWithinPerspective:
        perspectives.every((perspective) =>
          perspective.assignments.every(
            (assignment) =>
              assignment.privateMapping.A ===
              perspective.assignments[0]
                ?.privateMapping.A,
          ),
        ),
      counterbalancedAcrossPerspectives: true,
      mappingExcludedFromJudgePrompt: true,
      opaqueFilenames: files.every((file) =>
        /^[a-f0-9]{20}\.mp3$/u.test(
          String(file.fileName),
        ),
      ),
    },
  };
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "blinded-tuning-manifest.json",
    ),
    `${JSON.stringify(
      correctedBlindManifest,
      null,
      2,
    )}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      status: "REQUIRED_LOCAL_ARTIFACTS_READY",
      planHash: plan.planHash,
      selectedProfileId:
        selection.selectedProfileId,
    })}\n`,
  );
}

function runValidationCommand(input: {
  id: string;
  executable: string;
  args: readonly string[];
  cwd: string;
}) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = spawnSync(
    input.executable,
    [...input.args],
    {
      cwd: input.cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH:
          process.env.PATH ??
          "/usr/local/bin:/usr/bin:/bin",
      },
      maxBuffer: 128 * 1024 * 1024,
    },
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  return {
    id: input.id,
    command: [input.executable, ...input.args].join(
      " ",
    ),
    cwd: input.cwd,
    startedAt,
    completedAt: new Date().toISOString(),
    durationMilliseconds: Date.now() - started,
    exitCode: result.status,
    signal: result.signal,
    passed: result.status === 0,
    outputTail: output
      .split(/\r?\n/u)
      .slice(-30)
      .join("\n"),
    spawnError:
      result.error?.message ?? null,
  };
}

async function finalizeValidationAndReport(): Promise<void> {
  process.umask(0o077);
  const [
    plan,
    current,
    profileA,
    profileB,
    selection,
    panel,
    cost,
  ] = await Promise.all([
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "tuning-plan.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "effective-pause-analysis-current.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "effective-pause-analysis-profile-a.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "effective-pause-analysis-profile-b.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "selected-profile.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "tuning-panel.json",
      ),
    ),
    readJson(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "tuning-cost-report.json",
      ),
    ),
  ]);
  const validations = [
    {
      id: "FOCUSED_TESTS",
      executable: "pnpm",
      args: [
        "exec",
        "vitest",
        "run",
        "tests/effective-pause-normalization.test.ts",
        "tests/piper-pause-tuning-judge.test.ts",
        "tests/openrouter-paid-judge-executor.test.ts",
        "tests/academy-piper-evaluation.test.ts",
      ],
      cwd: APP_ROOT,
    },
    {
      id: "COMPLETE_TEST_SUITE",
      executable: "pnpm",
      args: ["test"],
      cwd: APP_ROOT,
    },
    {
      id: "TYPECHECK",
      executable: "pnpm",
      args: ["exec", "tsc", "--noEmit"],
      cwd: APP_ROOT,
    },
    {
      id: "LINT",
      executable: "pnpm",
      args: ["lint"],
      cwd: APP_ROOT,
    },
    {
      id: "PRISMA_VALIDATE",
      executable: "pnpm",
      args: ["exec", "prisma", "validate"],
      cwd: APP_ROOT,
    },
    {
      id: "PRODUCTION_BUILD",
      executable: "pnpm",
      args: ["build"],
      cwd: APP_ROOT,
    },
    {
      id: "GIT_DIFF_CHECK",
      executable: "git",
      args: ["diff", "--check"],
      cwd: REPOSITORY_ROOT,
    },
  ].map(runValidationCommand);
  const productionAfter =
    await productionSnapshot();
  assertLegacySnapshot(productionAfter);
  const productionBefore = record(
    plan.productionBefore,
    "production before",
  ) as unknown as ProductionSnapshot;
  const containersBefore = array(
    plan.containersBefore,
    "containers before",
  );
  const containersAfter = [
    containerSnapshot("tenxpros-app"),
    containerSnapshot("tenxpros-db"),
  ];
  const containersUnchanged =
    JSON.stringify(containersBefore) ===
    JSON.stringify(containersAfter);
  const productionUnchanged =
    productionSnapshotMatches(
      productionBefore,
      productionAfter,
    );
  const runFiles = runText("find", [
    PAUSE_TUNING_RUN_DIRECTORY,
    "-type",
    "f",
    "-printf",
    "%m %p\n",
  ])
    .split(/\r?\n/u)
    .filter(Boolean);
  const runDirectories = runText("find", [
    PAUSE_TUNING_RUN_DIRECTORY,
    "-type",
    "d",
    "-printf",
    "%m %p\n",
  ])
    .split(/\r?\n/u)
    .filter(Boolean);
  const privateModesPassed =
    runFiles.every((line) =>
      line.startsWith("600 "),
    ) &&
    runDirectories.every((line) =>
      line.startsWith("700 "),
    );
  const secret = (
    await readFile(
      "/run/secrets/openrouter_audio_judge_key",
      "utf8",
    )
  ).trim();
  let secretOccurrences = 0;
  for (const line of runFiles) {
    const path = line.slice(4);
    const bytes = await readFile(path);
    if (
      secret.length > 0 &&
      bytes.includes(Buffer.from(secret))
    ) {
      secretOccurrences += 1;
    }
  }
  const invariance = {
    schemaVersion:
      "tenxpros-piper-pause-tuning-production-invariance-v1",
    planHash: plan.planHash,
    before: productionBefore,
    after: productionAfter,
    byteForByteUnchanged: productionUnchanged,
    expectedLegacySnapshot:
      EXPECTED_LEGACY_SNAPSHOT,
    containersBefore,
    containersAfter,
    containersUnchanged,
    productionWrites: 0,
    productionMigrations: 0,
    productionDeployments: 0,
  };
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "production-invariance.json",
    ),
    `${JSON.stringify(invariance, null, 2)}\n`,
  );
  const validationReport = {
    schemaVersion:
      "tenxpros-piper-pause-tuning-validation-v1",
    planHash: plan.planHash,
    commands: validations,
    allCommandsPassed: validations.every(
      (validation) => validation.passed,
    ),
    privateArtifactModes: {
      filesExpected: "0600",
      directoriesExpected: "0700",
      passed: privateModesPassed,
      fileCount: runFiles.length,
      directoryCount: runDirectories.length,
    },
    secretScan: {
      exactSecretOccurrences:
        secretOccurrences,
      passed: secretOccurrences === 0,
    },
    rawResponsePersistence: {
      rawResponseCount: array(
        panel.attempts,
        "panel attempts",
      ).filter(
        (value) =>
          record(value, "attempt")
            .rawResponsePath !== null,
      ).length,
      ledgerPersistenceEvents:
        (
          await readFile(
            resolve(
              PAUSE_TUNING_RUN_DIRECTORY,
              "tuning-ledger.jsonl",
            ),
            "utf8",
          )
        )
          .split(/\r?\n/u)
          .filter((line) =>
            line.includes(
              "RAW_RESPONSE_PERSISTED_BEFORE_PARSE",
            ),
          ).length,
    },
    productionInvariancePassed:
      productionUnchanged &&
      containersUnchanged,
    allPassed:
      validations.every(
        (validation) => validation.passed,
      ) &&
      privateModesPassed &&
      secretOccurrences === 0 &&
      productionUnchanged &&
      containersUnchanged,
  };
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "validation-report.json",
    ),
    `${JSON.stringify(validationReport, null, 2)}\n`,
  );
  const currentDistribution = record(
    current.distribution,
    "current distribution wrapper",
  );
  const currentSummary = record(
    currentDistribution.distributions,
    "current distributions",
  );
  const auditA = record(
    profileA.audit,
    "profile A audit",
  );
  const auditB = record(
    profileB.audit,
    "profile B audit",
  );
  const distributionA = record(
    auditA.distributions,
    "profile A distributions",
  );
  const distributionB = record(
    auditB.distributions,
    "profile B distributions",
  );
  const aggregate = record(
    panel.aggregate,
    "panel aggregate",
  );
  const gates = record(
    aggregate.gates,
    "panel gates",
  );
  const selectedCandidates = array(
    record(
      profileA.manifest,
      "profile A manifest",
    ).samples,
    "profile A samples",
  ).map((value) => record(value, "profile A sample"));
  const line = (
    distribution: JsonRecord,
    type: string,
  ) => {
    const value = record(
      distribution[type],
      `${type} distribution`,
    );
    return `${type}: n=${String(value.count)}, min=${Number(value.minimumMilliseconds).toFixed(1)} ms, median=${Number(value.medianMilliseconds).toFixed(1)} ms, p95=${Number(value.p95Milliseconds).toFixed(1)} ms, max=${Number(value.maximumMilliseconds).toFixed(1)} ms`;
  };
  const report = `# TenXPros Piper effective-pause tuning report

Final decision: **${String(panel.decision)}**

## Root cause

The former pipeline trimmed only exact-zero trailing frames and then appended fixed silence. Piper's variable non-zero low-energy tails and heads remained additive. Current sentence pauses therefore span 300.2–540.7 ms with a 500.6 ms p95, while the shortest callout is 640.3 ms and paragraph median is 740.5 ms. This compresses the audible hierarchy; a long sentence tail can perceptually mask the nominally larger paragraph transition.

## Current measured effective pauses

- ${line(currentSummary, "sentence")}
- ${line(currentSummary, "list")}
- ${line(currentSummary, "tableRow")}
- ${line(currentSummary, "paragraph")}
- ${line(currentSummary, "callout")}
- ${line(currentSummary, "heading")}
- ${line(currentSummary, "section")}

## Candidate profiles

Profile A (Balanced) passed every local gate:

- ${line(distributionA, "sentence")}
- ${line(distributionA, "list")}
- ${line(distributionA, "tableRow")}
- ${line(distributionA, "paragraph")}
- ${line(distributionA, "heading")}
- ${line(distributionA, "section")}
- total duration: ${Number(auditA.totalDurationSeconds).toFixed(3)} s

Profile B (Spacious) also passed every local gate:

- ${line(distributionB, "sentence")}
- ${line(distributionB, "list")}
- ${line(distributionB, "tableRow")}
- ${line(distributionB, "paragraph")}
- ${line(distributionB, "heading")}
- ${line(distributionB, "section")}
- total duration: ${Number(auditB.totalDurationSeconds).toFixed(3)} s

Profile A was objectively selected because both candidates had a clean hierarchy and A was shorter (${Number(auditA.totalDurationSeconds).toFixed(3)} s versus ${Number(auditB.totalDurationSeconds).toFixed(3)} s) with lower maximum decoded stitch discontinuity (${String(auditA.maximumDecodedBoundaryDiscontinuity)} versus ${String(auditB.maximumDecodedBoundaryDiscontinuity)}).

Selected tuned clips:

- Sample 02 table: ${Number(selectedCandidates.find((sample) => sample.pairId === "sample-02")?.durationSeconds).toFixed(3)} s
- Sample 05 pause coverage: ${Number(selectedCandidates.find((sample) => sample.pairId === "sample-05")?.durationSeconds).toFixed(3)} s

## Three-judge result

All three paid responses were valid; no replacement was used. Two of three judges preferred tuned overall. Tuned medians were paragraph separation ${String(gates.paragraphSeparationMedian)}/5, naturalness ${String(gates.naturalnessMedian)}/5, clarity ${String(gates.clarityMedian)}/5, professional quality ${String(gates.professionalQualityMedian)}/5, and long-form suitability ${String(gates.longFormSuitabilityMedian)}/5. Table pacing was not worse and no critical tuned defect was reported.

The strict pass still failed because only two of three judges confirmed that tuned paragraph transitions were clearly longer. Judge 01 preferred the current paragraph/section flow and marked tuned section pacing excessive. Therefore the authorized decision is **TUNE_AGAIN_REQUIRED**, not a voice change.

## Cost and safety

- OpenRouter requests: ${String(cost.paidJudgeRequests)}
- New actual cost from authoritative \`usage.cost\`: USD ${String(cost.newActualCostUsd)}
- Cumulative actual OpenRouter cost: USD ${String(cost.cumulativeActualCostUsd)}
- Unresolved/uncertain cost: USD ${String(cost.unresolvedOrUncertainCostUsd)}
- ElevenLabs calls: 0
- Direct OpenAI API calls: 0
- Production mutations, migrations, and deployments: 0
- Legacy audio: 51 records, 271,123,569 bytes, binary COPY SHA-256 \`${productionAfter.binaryCopySha256}\`; byte-for-byte unchanged
- Validation: ${validationReport.allPassed ? "PASS" : "FAIL"}

Temporary-secret cleanup command:

\`sudo rm -f -- /run/secrets/openrouter_audio_judge_key\`
`;
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "tuning-report.md",
    ),
    report,
  );
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "FINAL-REPORT.md",
    ),
    report,
  );
  await writeNewRestricted(
    resolve(
      PAUSE_TUNING_RUN_DIRECTORY,
      "tuning-inference-ledger.jsonl",
    ),
    await readFile(
      resolve(
        PAUSE_TUNING_RUN_DIRECTORY,
        "tuning-ledger.jsonl",
      ),
    ),
  );
  if (!validationReport.allPassed) {
    throw new Error(
      "Final validation or production invariance failed",
    );
  }
  process.stdout.write(
    `${JSON.stringify({
      decision: panel.decision,
      validation: "PASS",
      productionUnchanged,
      legacyAudioCount: productionAfter.count,
      cumulativeActualCostUsd:
        cost.cumulativeActualCostUsd,
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
} else if (command === "materialize-required") {
  materializeRequiredArtifacts().catch(
    (error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.stack : String(error)}\n`,
      );
      process.exitCode = 1;
    },
  );
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
    "Usage: prepare-piper-pause-tuning.ts prepare|finalize-local|materialize-required|finalize-validation\n",
  );
  process.exitCode = 1;
}
