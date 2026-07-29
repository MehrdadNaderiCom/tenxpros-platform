#!/usr/bin/env tsx

/**
 * Re-render only the public listener HTML/instructions/ZIP from an already
 * generated Phase 2B package. Audio and every private assignment stay intact.
 */
import { createHash } from "node:crypto";
import {
  access,
  lstat,
  readFile,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import { createDeterministicZip } from "../src/lib/academy/narration/deterministic-zip";
import {
  assertPhase2BPublicPackageSafe,
  PHASE2B_LISTENER_HTML_FILENAME,
  PHASE2B_LISTENER_INSTRUCTIONS_FILENAME,
  renderPhase2BListenerInstructions,
  renderPhase2BListeningHtml,
  type Phase2BPublicFile,
} from "../src/lib/academy/narration/piper-listener-package";
import type { Phase2BPublicPackage } from "../src/lib/academy/narration/piper-listening-evaluation";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PHASE2B_ROOT = resolve(
  SCRIPT_DIRECTORY,
  "..",
  "..",
  "scratch_academy",
  "piper-listening",
);

async function readJson<T>(path: string): Promise<T> {
  const file = await lstat(path);
  if (!file.isFile() || file.isSymbolicLink()) {
    throw new Error(`Expected a regular non-symlink file: ${path}`);
  }
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function readOptionalJson(
  path: string,
): Promise<Record<string, unknown> | null> {
  try {
    await access(path);
  } catch {
    return null;
  }
  return readJson<Record<string, unknown>>(path);
}

async function main(): Promise<void> {
  const rootIndex = process.argv.indexOf("--root");
  const rawRoot = rootIndex >= 0 ? process.argv[rootIndex + 1] : undefined;
  if (!rawRoot) throw new Error("--root is required");
  const root = resolve(process.cwd(), rawRoot);
  const relativePath = relative(PHASE2B_ROOT, root);
  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath.includes(sep) ||
    resolve(PHASE2B_ROOT, relativePath) !== root
  ) {
    throw new Error(
      `--root must be an existing direct child of ${PHASE2B_ROOT}`,
    );
  }
  const publicPackagePath = resolve(
    root,
    "private",
    "public-package.json",
  );
  const auditPath = resolve(root, "private", "audit.json");
  const [publicPackage, audit] = await Promise.all([
    readJson<Phase2BPublicPackage>(publicPackagePath),
    readJson<Record<string, unknown>>(auditPath),
  ]);
  const [browserValidation, syntheticAnalysis] = await Promise.all([
    readOptionalJson(
      resolve(root, "private", "browser-validation.json"),
    ),
    readOptionalJson(
      resolve(
        root,
        "private",
        "synthetic-analysis",
        "analysis.json",
      ),
    ),
  ]);
  const listenerDirectory = resolve(root, "listener-package");
  const html = renderPhase2BListeningHtml(publicPackage);
  const instructions = renderPhase2BListenerInstructions();
  const audioFiles = await Promise.all(
    publicPackage.pairs.flatMap((pair) =>
      pair.samples.map(async (sample): Promise<Phase2BPublicFile> => {
        const path = resolve(
          listenerDirectory,
          "audio",
          sample.filename,
        );
        const file = await lstat(path);
        if (!file.isFile() || file.isSymbolicLink()) {
          throw new Error(`Unsafe listener audio: ${path}`);
        }
        return {
          path: `audio/${sample.filename}`,
          data: await readFile(path),
        };
      }),
    ),
  );
  const files: Phase2BPublicFile[] = [
    { path: PHASE2B_LISTENER_HTML_FILENAME, data: html },
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
  const zipPath = resolve(root, `${archiveRoot}.zip`);
  const archive = createDeterministicZip(
    files.map((file) => ({
      path: `${archiveRoot}/${file.path}`,
      data: file.data,
    })),
  );
  const zipSha256 = createHash("sha256")
    .update(archive)
    .digest("hex");
  const existingListenerPackage =
    typeof audit.listenerPackage === "object" &&
    audit.listenerPackage !== null
      ? (audit.listenerPackage as Record<string, unknown>)
      : {};
  const refreshedAudit = {
    ...audit,
    listenerPackage: {
      ...existingListenerPackage,
      directory: listenerDirectory,
      zipPath,
      zipSha256,
      publicFiles: files.map((file) => file.path).sort(),
      unblindingScan: scan,
      publicArtifactsRefreshedAt: new Date().toISOString(),
      audioAndPrivateAssignmentChanged: false,
    },
    validation: {
      browser: browserValidation,
      syntheticAggregation: syntheticAnalysis
        ? {
            explicitlySynthetic: true,
            completeValidListeners:
              (
                syntheticAnalysis.submissions as
                  | Record<string, unknown>
                  | undefined
              )?.complete_valid_listeners ?? null,
            recommendation:
              (
                syntheticAnalysis.decision as
                  | Record<string, unknown>
                  | undefined
              )?.recommendation ?? null,
            analysisPath: resolve(
              root,
              "private",
              "synthetic-analysis",
              "analysis.json",
            ),
          }
        : null,
    },
  };
  await Promise.all([
    writeFile(
      resolve(listenerDirectory, PHASE2B_LISTENER_HTML_FILENAME),
      html,
      { encoding: "utf8", mode: 0o644 },
    ),
    writeFile(
      resolve(
        listenerDirectory,
        PHASE2B_LISTENER_INSTRUCTIONS_FILENAME,
      ),
      instructions,
      { encoding: "utf8", mode: 0o644 },
    ),
    writeFile(zipPath, archive, { mode: 0o600 }),
    writeFile(
      auditPath,
      `${JSON.stringify(refreshedAudit, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    ),
  ]);
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "PASS",
        publicArtifactsOnly: true,
        audioAndPrivateAssignmentChanged: false,
        listenerDirectory,
        zipPath,
        zipSha256,
        scan,
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
