#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import {
  chmod,
  constants,
  mkdir,
  open,
  readFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";

type Mode = "legacy" | "preview" | "active";

interface GenerationPlan {
  releaseId: string;
  recipeHash: string;
  voiceId: string;
  lessons: Array<{
    slug: string;
    order: number;
  }>;
}

interface AssetManifest {
  lessonSlug: string;
  sizeBytes: number;
  checksumSha256: string;
  durationSeconds: number;
  contentHash: string;
  recipeHash: string;
}

function option(
  args: readonly string[],
  name: string,
) {
  const index = args.indexOf(name);
  const value =
    index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalOption(
  args: readonly string[],
  name: string,
) {
  const index = args.indexOf(name);
  const value =
    index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--")
    ? value
    : undefined;
}

async function writeExclusive(
  path: string,
  value: string,
) {
  await mkdir(dirname(path), {
    recursive: true,
    mode: 0o700,
  });
  await chmod(dirname(path), 0o700);
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

async function readJson<T>(path: string) {
  return JSON.parse(
    await readFile(path, "utf8"),
  ) as T;
}

async function loadGenerationPlan(
  generationDirectory: string,
  planDirectory: string,
): Promise<GenerationPlan> {
  try {
    const legacy =
      await readJson<
        Omit<GenerationPlan, "voiceId"> & {
          voiceId?: string;
          voice?: { id?: string };
        }
      >(
        resolve(
          generationDirectory,
          "generation-plan.json",
        ),
      );
    return {
      ...legacy,
      voiceId:
        legacy.voiceId ??
        legacy.voice?.id ??
        "bryce",
    };
  } catch (error: unknown) {
    if (
      !(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      )
    ) {
      throw error;
    }
  }
  const [paid, narration] =
    await Promise.all([
      readJson<{
        releaseId: string;
        recipeHash: string;
        selectedVoice: { id: string };
      }>(
        resolve(
          planDirectory,
          "paid-generation-plan.json",
        ),
      ),
      readJson<{
        lessons: Array<{
          slug: string;
          order: number;
        }>;
      }>(
        resolve(
          planDirectory,
          "final-narration-manifest.json",
        ),
      ),
    ]);
  return {
    releaseId: paid.releaseId,
    recipeHash: paid.recipeHash,
    voiceId: paid.selectedVoice.id,
    lessons: narration.lessons,
  };
}

function cookieHeader(cookieFile: string) {
  const lines = cookieFile
    .split(/\r?\n/gu)
    .filter(
      (line) =>
        line.trim() &&
        !line.startsWith("#"),
    );
  return lines
    .map((line) => {
      const fields = line.split("\t");
      const name = fields.at(-2);
      const value = fields.at(-1);
      if (!name || !value) {
        throw new Error(
          "Smoke cookie file is malformed",
        );
      }
      return `${name}=${value}`;
    })
    .join("; ");
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256")
    .update(bytes)
    .digest("hex");
}

async function request(
  url: string,
  cookie: string | null,
  range?: string,
) {
  const response = await fetch(url, {
    redirect: "manual",
    cache: "no-store",
    headers: {
      ...(cookie
        ? { Cookie: cookie }
        : {}),
      ...(range ? { Range: range } : {}),
    },
  });
  const bytes = new Uint8Array(
    await response.arrayBuffer(),
  );
  return {
    status: response.status,
    headers: Object.fromEntries(
      [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "x-academy-narration-source",
        "x-academy-narration-release",
        "x-academy-narration-recipe",
        "x-academy-content-hash",
      ].map((name) => [
        name,
        response.headers.get(name),
      ]),
    ),
    bytes,
    sha256: sha256(bytes),
  };
}

async function main() {
  process.umask(0o077);
  const args = process.argv.slice(2);
  const mode = option(args, "--mode") as Mode;
  if (
    mode !== "legacy" &&
    mode !== "preview" &&
    mode !== "active"
  ) {
    throw new Error(
      "--mode must be legacy, preview, or active",
    );
  }
  const baseUrl = option(
    args,
    "--base-url",
  ).replace(/\/$/u, "");
  const generationDirectory = resolve(
    option(args, "--generation-dir"),
  );
  const planDirectory = resolve(
    optionalOption(args, "--plan-dir") ??
      generationDirectory,
  );
  const outputPath = resolve(
    option(args, "--output"),
  );
  const cookie = cookieHeader(
    await readFile(
      option(args, "--cookie-file"),
      "utf8",
    ),
  );
  const plan = await loadGenerationPlan(
    generationDirectory,
    planDirectory,
  );
  const assets = new Map(
    await Promise.all(
      plan.lessons.map(async (lesson) => {
        const manifest =
          await readJson<AssetManifest>(
            resolve(
              generationDirectory,
              "asset-manifests",
              `${lesson.slug}.json`,
            ),
          );
        return [lesson.slug, manifest] as const;
      }),
    ),
  );
  const unauthenticated = {
    learnerStatus: await request(
      `${baseUrl}/api/partner/academy/audio/mission`,
      null,
    ),
    learnerBytes: await request(
      `${baseUrl}/api/partner/academy/audio/mission/${encodeURIComponent(plan.voiceId)}`,
      null,
      "bytes=0-1",
    ),
    adminPreview: await request(
      `${baseUrl}/api/admin/academy/narration-preview/${encodeURIComponent(plan.releaseId)}/mission`,
      null,
      "bytes=0-1",
    ),
  };
  const results = [];
  for (const lesson of plan.lessons) {
    const asset = assets.get(lesson.slug)!;
    const bytesUrl =
      mode === "preview"
        ? `${baseUrl}/api/admin/academy/narration-preview/${encodeURIComponent(plan.releaseId)}/${encodeURIComponent(lesson.slug)}`
        : `${baseUrl}/api/partner/academy/audio/${encodeURIComponent(lesson.slug)}/${encodeURIComponent(plan.voiceId)}`;
    const status =
      mode === "preview"
        ? null
        : await request(
            `${baseUrl}/api/partner/academy/audio/${encodeURIComponent(lesson.slug)}`,
            cookie,
          );
    let statusJson: Record<string, unknown> | null =
      null;
    if (status) {
      try {
        statusJson = JSON.parse(
          new TextDecoder().decode(
            status.bytes,
          ),
        ) as Record<string, unknown>;
      } catch {
        statusJson = null;
      }
    }
    const full = await request(
      bytesUrl,
      cookie,
    );
    const deliverySize =
      mode === "legacy"
        ? full.bytes.length
        : asset.sizeBytes;
    const probe = await request(
      bytesUrl,
      cookie,
      "bytes=0-1",
    );
    const seekStart = Math.floor(
      deliverySize / 2,
    );
    const seek = await request(
      bytesUrl,
      cookie,
      `bytes=${String(seekStart)}-${String(Math.min(deliverySize - 1, seekStart + 1023))}`,
    );
    const invalid = await request(
      bytesUrl,
      cookie,
      `bytes=${String(deliverySize)}-`,
    );
    const statusPass =
      mode === "preview" ||
      (status?.status === 200 &&
        statusJson?.narration === true &&
        (mode === "active"
          ? statusJson.releaseMode ===
              "versioned" &&
            (
              statusJson.activeRelease as
                | { id?: string }
                | undefined
            )?.id === plan.releaseId &&
            Array.isArray(
              statusJson.voices,
            ) &&
            statusJson.voices.length === 1 &&
            statusJson.defaultVoice ===
              plan.voiceId
          : statusJson.releaseMode ===
              "legacy" &&
            statusJson.activeRelease === null));
    const pass =
      statusPass &&
      full.status === 200 &&
      (mode === "legacy"
        ? full.bytes.length > 0
        : full.bytes.length ===
            asset.sizeBytes &&
          full.sha256 ===
            asset.checksumSha256) &&
      full.headers["content-type"] ===
        "audio/mpeg" &&
      full.headers["content-length"] ===
        String(deliverySize) &&
      probe.status === 206 &&
      probe.bytes.length === 2 &&
      probe.headers["content-range"] ===
        `bytes 0-1/${String(deliverySize)}` &&
      seek.status === 206 &&
      seek.headers["content-range"] ===
        `bytes ${String(seekStart)}-${String(
          Math.min(
            deliverySize - 1,
            seekStart + 1023,
          ),
        )}/${String(deliverySize)}` &&
      invalid.status === 416 &&
      invalid.headers["content-range"] ===
        `bytes */${String(deliverySize)}` &&
      (mode === "legacy"
        ? full.headers[
            "x-academy-narration-source"
          ] === "legacy"
        : full.headers[
              "x-academy-narration-release"
            ] === plan.releaseId &&
          full.headers[
            "x-academy-narration-recipe"
          ] === plan.recipeHash &&
          full.headers[
            "x-academy-content-hash"
          ] === asset.contentHash);
    results.push({
      slug: lesson.slug,
      order: lesson.order,
      expectedDurationSeconds:
        asset.durationSeconds,
      status: status
        ? {
            http: status.status,
            body: statusJson,
          }
        : null,
      full: {
        http: full.status,
        headers: full.headers,
        bytes: full.bytes.length,
        sha256: full.sha256,
      },
      rangeProbe: {
        http: probe.status,
        headers: probe.headers,
        bytes: probe.bytes.length,
      },
      seek: {
        http: seek.status,
        headers: seek.headers,
        bytes: seek.bytes.length,
      },
      invalidRange: {
        http: invalid.status,
        headers: invalid.headers,
      },
      pass,
    });
  }
  const page = await request(
    `${baseUrl}/partner/academy/mission`,
    cookie,
  );
  const report = {
    schemaVersion:
      "tenxpros-academy-narration-http-smoke-v1",
    mode,
    runAt: new Date().toISOString(),
    baseUrl,
    releaseId: plan.releaseId,
    recipeHash: plan.recipeHash,
    unauthenticated: {
      learnerStatus:
        unauthenticated.learnerStatus.status,
      learnerBytes:
        unauthenticated.learnerBytes.status,
      adminPreview:
        unauthenticated.adminPreview.status,
    },
    lessonPageHttp: page.status,
    results,
    summary: {
      lessons: results.length,
      passed: results.filter(
        (result) => result.pass,
      ).length,
      failed: results.filter(
        (result) => !result.pass,
      ).map((result) => result.slug),
      unauthenticatedPass:
        unauthenticated.learnerStatus
          .status === 401 &&
        unauthenticated.learnerBytes
          .status === 401 &&
        unauthenticated.adminPreview
          .status === 401,
      pagePass: page.status === 200,
    },
  };
  const passed =
    report.summary.lessons === 17 &&
    report.summary.passed === 17 &&
    report.summary.failed.length === 0 &&
    report.summary.unauthenticatedPass &&
    report.summary.pagePass;
  await writeExclusive(
    outputPath,
    `${JSON.stringify(
      { ...report, passed },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      mode,
      passed,
      outputPath,
      summary: report.summary,
    })}\n`,
  );
  if (!passed) process.exitCode = 2;
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
