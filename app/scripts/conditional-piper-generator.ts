import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  lstat,
  readFile,
  realpath,
} from "node:fs/promises";
import {
  dirname,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import {
  serializeConditionalPiperPlan,
  validateConditionalPiperRuntimeResult,
  type ConditionalPiperGeneratedRecord,
  type ConditionalPiperGenerationPlan,
  type ConditionalPiperRuntimeResult,
} from "../src/lib/academy/narration/conditional-piper-generation";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");

export const CONDITIONAL_PIPER_OUTPUT_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "ai-audio-evaluation",
);
export const CONDITIONAL_PIPER_RUNTIME_PATH = resolve(
  SCRIPT_DIRECTORY,
  "piper-evaluation-runtime.cjs",
);
export const DEFAULT_CONDITIONAL_PIPER_IMAGE =
  "tenxpros-piper-eval:local";

export interface ConditionalPiperDockerInvocation {
  command: "docker";
  args: readonly string[];
  environment: Readonly<Record<string, string>>;
  security: {
    network: "none";
    rootFilesystem: "read-only";
    capabilities: "none";
    noNewPrivileges: true;
    databaseEnvironmentForwarded: false;
    apiSecretForwarded: false;
    productionPathMounted: false;
  };
}

export interface ConditionalPiperCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type ConditionalPiperCommandRunner = (
  invocation: ConditionalPiperDockerInvocation,
) => Promise<ConditionalPiperCommandResult>;

interface ConditionalPiperGeneratorDependencies {
  run: ConditionalPiperCommandRunner;
  readUtf8(path: string): Promise<string>;
  lstat(path: string): ReturnType<typeof lstat>;
  realpath(path: string): Promise<string>;
}

const DEFAULT_DEPENDENCIES: ConditionalPiperGeneratorDependencies = {
  run: runConditionalPiperCommand,
  readUtf8: (path) => readFile(path, "utf8"),
  lstat,
  realpath,
};

function isStrictChild(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return Boolean(
    relativePath &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${sep}`) &&
      resolve(root, relativePath) === candidate,
  );
}

function assertMountSafe(path: string, label: string): void {
  if (/[\n\r,]/u.test(path)) {
    throw new Error(
      `${label} contains a character unsafe for Docker --mount`,
    );
  }
}

function assertSafeImage(image: string): void {
  if (
    !/^[a-z0-9][a-z0-9._/-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)?$/u.test(
      image,
    ) ||
    image.includes("..")
  ) {
    throw new Error("Conditional Piper image tag is unsafe");
  }
}

export function conditionalPiperResultPath(
  outputDirectory: string,
): string {
  return resolve(
    outputDirectory,
    "private",
    "runtime-results.json",
  );
}

export function buildConditionalPiperDockerInvocation(input: {
  outputDirectory: string;
  planPath: string;
  image?: string;
  runtimePath?: string;
}): ConditionalPiperDockerInvocation {
  const outputDirectory = resolve(input.outputDirectory);
  const planPath = resolve(input.planPath);
  const runtimePath = resolve(
    input.runtimePath ?? CONDITIONAL_PIPER_RUNTIME_PATH,
  );
  const image = input.image ?? DEFAULT_CONDITIONAL_PIPER_IMAGE;
  if (
    !isStrictChild(
      CONDITIONAL_PIPER_OUTPUT_ROOT,
      outputDirectory,
    )
  ) {
    throw new Error(
      `Conditional output must be below ${CONDITIONAL_PIPER_OUTPUT_ROOT}`,
    );
  }
  if (!isStrictChild(outputDirectory, planPath)) {
    throw new Error(
      "Conditional Piper plan must be inside its isolated output directory",
    );
  }
  if (
    planPath ===
    conditionalPiperResultPath(outputDirectory)
  ) {
    throw new Error(
      "Conditional Piper plan cannot replace the runtime result",
    );
  }
  assertMountSafe(outputDirectory, "outputDirectory");
  assertMountSafe(runtimePath, "runtimePath");
  assertSafeImage(image);
  return {
    command: "docker",
    args: [
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
      `type=bind,src=${outputDirectory},dst=/evaluation`,
      "--mount",
      `type=bind,src=${runtimePath},dst=/app/scripts/piper-evaluation-runtime.cjs,readonly`,
      "--entrypoint",
      "node",
      image,
      "/app/scripts/piper-evaluation-runtime.cjs",
      "--plan",
      `/evaluation/${relative(outputDirectory, planPath).split(sep).join("/")}`,
      "--output-dir",
      "/evaluation",
    ],
    environment: {
      LANG: "C",
      LC_ALL: "C",
      PATH:
        process.env.PATH ??
        "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    },
    security: {
      network: "none",
      rootFilesystem: "read-only",
      capabilities: "none",
      noNewPrivileges: true,
      databaseEnvironmentForwarded: false,
      apiSecretForwarded: false,
      productionPathMounted: false,
    },
  };
}

export async function runConditionalPiperCommand(
  invocation: ConditionalPiperDockerInvocation,
): Promise<ConditionalPiperCommandResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      invocation.command,
      [...invocation.args],
      {
        cwd: APP_ROOT,
        env: {
          ...invocation.environment,
          NODE_ENV: process.env.NODE_ENV ?? "production",
        },
        stdio: ["ignore", "pipe", "pipe"] as const,
      },
    );
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) =>
      stdout.push(chunk),
    );
    child.stderr.on("data", (chunk: Buffer) =>
      stderr.push(chunk),
    );
    child.once("error", reject);
    child.once("close", (exitCode: number | null) => {
      resolvePromise({
        exitCode: exitCode ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function assertRegularNonSymlink(
  path: string,
  label: string,
  dependencies: ConditionalPiperGeneratorDependencies,
): Promise<void> {
  const file = await dependencies.lstat(path);
  if (!file.isFile() || file.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
}

async function assertDirectoryNonSymlink(
  path: string,
  label: string,
  dependencies: ConditionalPiperGeneratorDependencies,
): Promise<void> {
  const directory = await dependencies.lstat(path);
  if (!directory.isDirectory() || directory.isSymbolicLink()) {
    throw new Error(
      `${label} must be a non-symlink directory`,
    );
  }
}

export async function executeConditionalPiperPlan(
  input: {
    plan: ConditionalPiperGenerationPlan;
    planPath: string;
    outputDirectory: string;
    image?: string;
    runtimePath?: string;
  },
  dependencyOverrides: Partial<ConditionalPiperGeneratorDependencies> = {},
): Promise<readonly ConditionalPiperGeneratedRecord[]> {
  const dependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...dependencyOverrides,
  };
  const outputDirectory = resolve(input.outputDirectory);
  const planPath = resolve(input.planPath);
  const runtimePath = resolve(
    input.runtimePath ?? CONDITIONAL_PIPER_RUNTIME_PATH,
  );
  const invocation = buildConditionalPiperDockerInvocation({
    outputDirectory,
    planPath,
    image: input.image,
    runtimePath,
  });
  await Promise.all([
    assertDirectoryNonSymlink(
      outputDirectory,
      "outputDirectory",
      dependencies,
    ),
    assertRegularNonSymlink(
      planPath,
      "planPath",
      dependencies,
    ),
    assertRegularNonSymlink(
      runtimePath,
      "runtimePath",
      dependencies,
    ),
  ]);
  const [realOutput, realPlan, realRuntime] = await Promise.all([
    dependencies.realpath(outputDirectory),
    dependencies.realpath(planPath),
    dependencies.realpath(runtimePath),
  ]);
  if (
    realOutput !== outputDirectory ||
    !isStrictChild(realOutput, realPlan) ||
    realRuntime !== runtimePath
  ) {
    throw new Error(
      "Conditional Piper paths changed after symlink resolution",
    );
  }
  const expectedPlanBytes =
    serializeConditionalPiperPlan(input.plan);
  const actualPlanBytes = await dependencies.readUtf8(planPath);
  if (actualPlanBytes !== expectedPlanBytes) {
    throw new Error(
      "On-disk conditional Piper plan differs from the authorized in-memory plan",
    );
  }
  const resultPath = conditionalPiperResultPath(outputDirectory);
  try {
    await dependencies.lstat(resultPath);
    throw new Error(
      `Refusing to overwrite conditional runtime result: ${resultPath}`,
    );
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String(error.code)
        : "";
    if (code !== "ENOENT") throw error;
  }
  const commandResult = await dependencies.run(invocation);
  if (commandResult.exitCode !== 0) {
    throw new Error(
      `Conditional Piper runtime exited ${String(
        commandResult.exitCode,
      )}: ${commandResult.stderr.trim()}`,
    );
  }
  await assertRegularNonSymlink(
    resultPath,
    "runtime result",
    dependencies,
  );
  const result = JSON.parse(
    await dependencies.readUtf8(resultPath),
  ) as ConditionalPiperRuntimeResult;
  return validateConditionalPiperRuntimeResult({
    plan: input.plan,
    runtimePlanBytesSha256: sha256(actualPlanBytes),
    result,
  });
}
