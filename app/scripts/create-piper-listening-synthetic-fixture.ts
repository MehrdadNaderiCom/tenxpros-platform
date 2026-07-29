#!/usr/bin/env tsx

/**
 * Create five clearly marked, non-human Phase 2B responses for an end-to-end
 * aggregation smoke test. This helper is private-only and never enters the
 * listener ZIP.
 */
import {
  access,
  lstat,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  computePhase2BCompletion,
  PHASE2B_RESPONSE_SCHEMA_VERSION,
  type Phase2BPrivateAnalysisManifest,
  type Phase2BPublicPackage,
  type Phase2BResponse,
} from "../src/lib/academy/narration/piper-listening-evaluation";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PHASE2B_ROOT = resolve(
  SCRIPT_DIRECTORY,
  "..",
  "..",
  "scratch_academy",
  "piper-listening",
);
const LISTENER_IDS = [
  "L-SYNTHETIC2",
  "L-SYNTHETIC3",
  "L-SYNTHETIC4",
  "L-SYNTHETIC5",
  "L-SYNTHETIC6",
] as const;

function optionValue(
  args: readonly string[],
  option: string,
): string {
  const index = args.indexOf(option);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} is required`);
  }
  return resolve(process.cwd(), value);
}

async function readJson<T>(path: string): Promise<T> {
  const file = await lstat(path);
  if (!file.isFile() || file.isSymbolicLink()) {
    throw new Error(`Expected a regular non-symlink file: ${path}`);
  }
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function assertPrivateOutput(path: string): void {
  const relativePath = relative(PHASE2B_ROOT, path);
  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    resolve(PHASE2B_ROOT, relativePath) !== path ||
    !path.split(sep).includes("private")
  ) {
    throw new Error(
      `Synthetic responses must be a new private directory below ${PHASE2B_ROOT}`,
    );
  }
}

function syntheticResponse(
  listenerId: (typeof LISTENER_IDS)[number],
  manifest: Phase2BPrivateAnalysisManifest,
  publicPackage: Phase2BPublicPackage,
): Phase2BResponse {
  const timestamp = "2026-07-26T12:00:00.000Z";
  const privateByPair = new Map(
    manifest.pairs.map((pair) => [pair.pairId, pair]),
  );
  const files: Phase2BResponse["files"] = Object.fromEntries(
    publicPackage.pairs.flatMap((pair) => {
      const privatePair = privateByPair.get(pair.pair_id);
      if (!privatePair) throw new Error(`Missing ${pair.pair_id}`);
      const privateBySample = new Map(
        privatePair.samples.map((sample) => [
          sample.sampleId,
          sample,
        ]),
      );
      return pair.samples.map((sample) => {
        const assignment = privateBySample.get(sample.sample_id);
        if (!assignment) throw new Error(`Missing ${sample.sample_id}`);
        const corrected = assignment.pipeline === "corrected";
        return [
          sample.sample_id,
          {
            scores: {
              naturalness: corrected ? 4 : 3,
              pause_quality: corrected ? 4 : 3,
              pronunciation: corrected ? 5 : 3,
              clarity: corrected ? 5 : 3,
              listening_comfort: corrected ? 4 : 3,
              professional_quality: corrected ? 4 : 3,
            },
            one_x_recorded_at: timestamp,
            optional_1_25x_used: false,
            comment: "Synthetic validation response; not a human rating.",
          },
        ];
      });
    }),
  );
  const pairs: Phase2BResponse["pairs"] = Object.fromEntries(
    publicPackage.pairs.map((pair) => {
      const privatePair = privateByPair.get(pair.pair_id);
      const corrected = privatePair?.samples.find(
        (sample) => sample.pipeline === "corrected",
      );
      const correctedLabel = pair.samples.find(
        (sample) => sample.sample_id === corrected?.sampleId,
      )?.label;
      if (!correctedLabel) {
        throw new Error(`${pair.pair_id}: corrected label is missing`);
      }
      return [
        pair.pair_id,
        {
          preferences: {
            overall_preference: correctedLabel,
            easier_to_understand: correctedLabel,
            more_natural: correctedLabel,
            long_lesson_preference: correctedLabel,
            too_slow: "neither",
            too_fast: "neither",
            strange_pronunciation: "neither",
          },
          pronunciation_issues: [],
          table_efficiency: pair.table_efficiency
            ? {
                easier_to_understand: correctedLabel,
                repeated_labels_usefulness: 5,
                excessively_slow: "neither",
                pauses_excessive: "neither",
                prefer_longer_clearer: "yes",
                test_more_concise_format: "no",
              }
            : null,
          comments:
            "Synthetic validation response; not a human preference.",
        },
      ];
    }),
  );
  const withoutCompletion: Omit<Phase2BResponse, "completion"> = {
    schema_version: PHASE2B_RESPONSE_SCHEMA_VERSION,
    evaluation_package_id: publicPackage.evaluation_package_id,
    listener_id: listenerId,
    timestamps: {
      started_at: timestamp,
      updated_at: timestamp,
      exported_at: timestamp,
    },
    files,
    pairs,
  };
  return {
    ...withoutCompletion,
    completion: computePhase2BCompletion(
      withoutCompletion,
      publicPackage,
    ),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const manifestPath = optionValue(args, "--manifest");
  const publicPackagePath = optionValue(args, "--public-package");
  const outputDirectory = optionValue(args, "--output");
  assertPrivateOutput(outputDirectory);
  if (await exists(outputDirectory)) {
    throw new Error(`Refusing to overwrite ${outputDirectory}`);
  }
  const [manifest, publicPackage] = await Promise.all([
    readJson<Phase2BPrivateAnalysisManifest>(manifestPath),
    readJson<Phase2BPublicPackage>(publicPackagePath),
  ]);
  if (
    manifest.evaluationPackageId !==
    publicPackage.evaluation_package_id
  ) {
    throw new Error("Private and public package ids do not match");
  }
  await mkdir(outputDirectory, {
    recursive: true,
    mode: 0o700,
  });
  await Promise.all([
    ...LISTENER_IDS.map((listenerId, index) =>
      writeFile(
        resolve(
          outputDirectory,
          `synthetic-response-${String(index + 1)}.json`,
        ),
        `${JSON.stringify(
          syntheticResponse(listenerId, manifest, publicPackage),
          null,
          2,
        )}\n`,
        { encoding: "utf8", mode: 0o600, flag: "wx" },
      ),
    ),
  ]);
  process.stdout.write(
    `${JSON.stringify({
      status: "PASS",
      synthetic: true,
      responses: LISTENER_IDS.length,
      outputDirectory,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
