#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import {
  access,
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import {
  aggregatePhase2BResponses,
  renderPhase2BAnalysisMarkdown,
  renderPhase2BDecisionSummary,
  type Phase2BResponseSubmission,
} from "../src/lib/academy/narration/piper-listening-aggregation";
import type {
  Phase2BPrivateAnalysisManifest,
  Phase2BPublicPackage,
} from "../src/lib/academy/narration/piper-listening-evaluation";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
const PHASE2B_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "piper-listening",
);

function usage(): string {
  return `TenXPros local audio-evaluation commands

Usage:
  pnpm academy:piper-eval -- --output-dir <phase-2a-output> [options]
  pnpm academy:piper-eval -- phase2b --output-dir <phase-2b-output> [options]
  pnpm academy:piper-eval -- aggregate --manifest <private-manifest> \\
    --responses <response-directory> --output <new-analysis-directory>
  pnpm academy:piper-eval -- serve --root <listener-package> [options]

The default command remains the original Phase 2A generator. Phase 2B
generation and aggregation are local-only. The serving command is
authenticated and binds to 127.0.0.1 unless explicitly configured otherwise.`;
}

function normalizedArgs(): string[] {
  const args = process.argv.slice(2);
  return args[0] === "--" ? args.slice(1) : args;
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

function assertOnlyOptions(
  args: readonly string[],
  valueOptions: ReadonlySet<string>,
  flags: ReadonlySet<string>,
): void {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument?.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument ?? ""}`);
    }
    if (flags.has(argument)) continue;
    if (!valueOptions.has(argument)) {
      throw new Error(`Unknown option: ${argument}`);
    }
    index += 1;
  }
}

function isInside(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return Boolean(
    relativePath &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${sep}`) &&
      resolve(root, relativePath) === candidate,
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(path: string): Promise<T> {
  const file = await lstat(path);
  if (!file.isFile() || file.isSymbolicLink()) {
    throw new Error(`Expected a regular non-symlink JSON file: ${path}`);
  }
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
}

async function aggregate(args: readonly string[]): Promise<void> {
  if (args.includes("--help")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  assertOnlyOptions(
    args,
    new Set([
      "--manifest",
      "--public-package",
      "--responses",
      "--output",
    ]),
    new Set(["--help"]),
  );
  const manifestArgument = optionValue(args, "--manifest");
  const responsesArgument = optionValue(args, "--responses");
  const outputArgument = optionValue(args, "--output");
  if (!manifestArgument || !responsesArgument || !outputArgument) {
    throw new Error(
      "aggregate requires --manifest, --responses, and --output",
    );
  }
  const manifestPath = resolve(process.cwd(), manifestArgument);
  const responsesDirectory = resolve(
    process.cwd(),
    responsesArgument,
  );
  const outputDirectory = resolve(process.cwd(), outputArgument);
  if (
    !isInside(PHASE2B_ROOT, manifestPath) ||
    !isInside(PHASE2B_ROOT, outputDirectory)
  ) {
    throw new Error(
      `Private manifest and analysis output must be below ${PHASE2B_ROOT}`,
    );
  }
  if (await pathExists(outputDirectory)) {
    throw new Error(
      `Refusing to overwrite analysis output: ${outputDirectory}`,
    );
  }
  const responseDirectoryStat = await lstat(responsesDirectory);
  if (
    !responseDirectoryStat.isDirectory() ||
    responseDirectoryStat.isSymbolicLink()
  ) {
    throw new Error(
      `Responses must be a non-symlink directory: ${responsesDirectory}`,
    );
  }
  const publicPackagePath = resolve(
    process.cwd(),
    optionValue(args, "--public-package") ??
      resolve(dirname(manifestPath), "public-package.json"),
  );
  const [manifest, publicPackage, responseEntries] = await Promise.all([
    readJson<Phase2BPrivateAnalysisManifest>(manifestPath),
    readJson<Phase2BPublicPackage>(publicPackagePath),
    readdir(responsesDirectory, { withFileTypes: true }),
  ]);
  const unexpected = responseEntries.filter(
    (entry) =>
      entry.isSymbolicLink() ||
      (!entry.name.startsWith(".") &&
        (!entry.isFile() || !entry.name.endsWith(".json"))),
  );
  if (unexpected.length > 0) {
    throw new Error(
      `Responses directory contains unsupported entries: ${unexpected
        .map((entry) => entry.name)
        .join(", ")}`,
    );
  }
  const jsonNames = responseEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.name.startsWith(".") &&
        entry.name.endsWith(".json"),
    )
    .map((entry) => entry.name)
    .sort();
  const submissions: Phase2BResponseSubmission[] = await Promise.all(
    jsonNames.map(async (name) => ({
      source: name,
      value: await readJson<unknown>(
        resolve(responsesDirectory, name),
      ),
    })),
  );
  const analysis = aggregatePhase2BResponses({
    manifest,
    publicPackage,
    submissions,
  });
  await mkdir(outputDirectory, {
    recursive: true,
    mode: 0o700,
  });
  await Promise.all([
    writeJson(resolve(outputDirectory, "analysis.json"), analysis),
    writeJson(
      resolve(outputDirectory, "invalid-responses.json"),
      analysis.invalid_responses,
    ),
    writeFile(
      resolve(outputDirectory, "report.md"),
      renderPhase2BAnalysisMarkdown(analysis),
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    ),
    writeFile(
      resolve(outputDirectory, "decision-summary.md"),
      renderPhase2BDecisionSummary(analysis),
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    ),
  ]);
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "COMPLETED",
        outputDirectory,
        responseFiles: submissions.length,
        validListeners:
          analysis.submissions.complete_valid_listeners,
        invalidResponses:
          analysis.submissions.invalid_response_count,
        recommendation: analysis.decision.recommendation,
        files: [
          "analysis.json",
          "report.md",
          "decision-summary.md",
          "invalid-responses.json",
        ],
      },
      null,
      2,
    )}\n`,
  );
}

function runChild(
  executable: string,
  args: readonly string[],
): void {
  const result = spawnSync(executable, [...args], {
    cwd: APP_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.signal) {
    if (
      result.signal === "SIGINT" ||
      result.signal === "SIGTERM"
    ) {
      return;
    }
    throw new Error(
      `${executable} terminated by signal ${result.signal}`,
    );
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
}

async function main(): Promise<void> {
  const args = normalizedArgs();
  const command = args[0];
  if (command === "help" || command === "--help") {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (command === "phase2b") {
    const { generatePhase2BListeningPackage } = await import(
      "./generate-piper-listening-evaluation"
    );
    await generatePhase2BListeningPackage(args.slice(1));
    return;
  }
  if (command === "aggregate") {
    await aggregate(args.slice(1));
    return;
  }
  if (command === "serve") {
    runChild(process.execPath, [
      resolve(SCRIPT_DIRECTORY, "piper-listening-server.cjs"),
      ...args.slice(1),
    ]);
    return;
  }
  runChild("tsx", [
    resolve(SCRIPT_DIRECTORY, "generate-piper-evaluation.ts"),
    ...args,
  ]);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
