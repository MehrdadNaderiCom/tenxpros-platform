#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import {
  readFile,
  stat,
} from "node:fs/promises";
import { resolve } from "node:path";

import type { Prisma } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  ACADEMY_NARRATION_DEPLOYMENT_ID,
  FINAL_ELEVENLABS_NARRATION_RECIPE_HASH,
  FINAL_ELEVENLABS_NARRATION_RECIPE_VERSION,
  FINAL_ELEVENLABS_NARRATION_VOICE_ID,
  visibleLessonContentHash,
} from "../src/lib/academy/narration-release";

type JsonRecord = Record<string, unknown>;

const REPOSITORY_ROOT = resolve(
  __dirname,
  "../..",
);
const GENERATION_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/elevenlabs-final-migration/phase-e1-final-20260728/final-generation-runtime-v1",
);
const PLAN_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/elevenlabs-final-migration/phase-e1-final-20260728/final-generation-plan-v1",
);
const RELEASE_ID =
  "academy-elevenlabs-bella-final-d43797ae6555cedd";
const PIPER_RELEASE_ID =
  "academy-bryce-semantic-block-flow-v2-final-75b5f40bba75f58a";
const EXPECTED_PLAN_HASH =
  "ac1a1fb0ab2c9ec807cdc37c08b0e8d63cea730a8f075dc55534c10f77e6c147";
const EXPECTED_NARRATION_MANIFEST_HASH =
  "a99d64a45764c4fccebb96c1185c3ebf07acddab361873b31b6f3e4551041262";
const EXPECTED_RESULT_HASH =
  "703983cea8e5b48d2e1b85eba7d2c4ec4b6d314c9308bea9c6809bae437cfbf8";

function sha256(
  value: string | Buffer,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value
      .map(canonical)
      .join(",")}]`;
  }
  if (
    typeof value === "object" &&
    value !== null
  ) {
    const record = value as JsonRecord;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical(
            record[key],
          )}`,
      )
      .join(",")}}`;
  }
  throw new Error(
    `Unsupported canonical value: ${typeof value}`,
  );
}

async function readJson<T>(
  filePath: string,
): Promise<T> {
  return JSON.parse(
    await readFile(filePath, "utf8"),
  ) as T;
}

function stableId(
  namespace: string,
  ...parts: readonly string[]
): string {
  return `${namespace}_${sha256(
    parts.join("\u0000"),
  ).slice(0, 40)}`;
}

interface Plan {
  schemaVersion: string;
  planHash: string;
  releaseId: string;
  recipeVersion: string;
  recipeHash: string;
  narrationManifestHash: string;
  sourceContentManifestHash: string;
  expectedAssetCount: number;
  requestCount: number;
  submittedCharacters: number;
  selectedVoice: {
    id: string;
    name: string;
  };
}

interface NarrationManifest {
  manifestHash: string;
  lessonCount: number;
  semanticBlockCount: number;
  lessons: Array<{
    lessonId: string;
    slug: string;
    order: number;
    canonicalSanitizedHtmlHash: string;
    spokenScriptHash: string;
    rendererVersion: string;
    normalizationVersion: string;
    pronunciationVersion: string;
    semanticChunkingVersion: string;
    blocks: Array<{
      sequence: number;
    }>;
  }>;
}

interface ReleaseResult {
  schemaVersion: string;
  resultHash: string;
  releaseId: string;
  planHash: string;
  recipeVersion: string;
  recipeHash: string;
  sourceContentManifestHash: string;
  narrationManifestHash: string;
  generationStartedAt: string;
  generationCompletedAt: string;
  assetCount: number;
  generatedAssetCount: number;
  requestCount: number;
  submittedCharacters: number;
  authoritativeBilledCharacters: number;
  uncertainCharacters: number;
  automaticRetries: number;
  releaseChecksumSha256: string;
  auditManifestHash: string;
  passed: boolean;
}

interface AssetManifest {
  schemaVersion: string;
  manifestHash: string;
  passed: boolean;
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
  generationMetadata: Prisma.InputJsonValue;
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
  checks: Record<string, boolean>;
}

async function validatedLocalRelease() {
  const [plan, narration, release, audit] =
    await Promise.all([
      readJson<Plan>(
        resolve(
          PLAN_ROOT,
          "paid-generation-plan.json",
        ),
      ),
      readJson<NarrationManifest>(
        resolve(
          PLAN_ROOT,
          "final-narration-manifest.json",
        ),
      ),
      readJson<ReleaseResult>(
        resolve(
          GENERATION_ROOT,
          "release-manifest.json",
        ),
      ),
      readJson<
        JsonRecord & {
          auditManifestHash: string;
          passed: boolean;
        }
      >(
        resolve(
          GENERATION_ROOT,
          "release-audit.json",
        ),
      ),
    ]);
  const {
    planHash,
    ...planCore
  } = plan as unknown as JsonRecord;
  const {
    manifestHash,
    ...narrationCore
  } = narration as unknown as JsonRecord;
  const {
    resultHash,
    ...releaseCore
  } = release as unknown as JsonRecord;
  const {
    auditManifestHash,
    passed: auditPassed,
    ...auditCore
  } = audit;
  if (
    plan.planHash !==
      EXPECTED_PLAN_HASH ||
    sha256(canonical(planCore)) !==
      plan.planHash ||
    narration.manifestHash !==
      EXPECTED_NARRATION_MANIFEST_HASH ||
    sha256(canonical(narrationCore)) !==
      narration.manifestHash ||
    release.resultHash !==
      EXPECTED_RESULT_HASH ||
    sha256(canonical(releaseCore)) !==
      release.resultHash ||
    sha256(canonical(auditCore)) !==
      auditManifestHash ||
    !auditPassed ||
    !release.passed ||
    release.releaseId !== RELEASE_ID ||
    plan.releaseId !== RELEASE_ID ||
    release.planHash !==
      plan.planHash ||
    release.recipeVersion !==
      FINAL_ELEVENLABS_NARRATION_RECIPE_VERSION ||
    release.recipeHash !==
      FINAL_ELEVENLABS_NARRATION_RECIPE_HASH ||
    plan.recipeVersion !==
      release.recipeVersion ||
    plan.recipeHash !==
      release.recipeHash ||
    plan.selectedVoice.id !==
      FINAL_ELEVENLABS_NARRATION_VOICE_ID ||
    narration.lessonCount !== 17 ||
    narration.semanticBlockCount !==
      954 ||
    plan.expectedAssetCount !== 17 ||
    plan.requestCount !== 33 ||
    release.assetCount !== 17 ||
    release.generatedAssetCount !== 17 ||
    release.requestCount !== 33 ||
    release.submittedCharacters !==
      174_778 ||
    release.authoritativeBilledCharacters !==
      96_129 ||
    release.uncertainCharacters !== 0 ||
    release.automaticRetries !== 0
  ) {
    throw new Error(
      "ElevenLabs final release root validation failed",
    );
  }
  const assets = [];
  for (const lesson of narration.lessons) {
    const manifestPath = resolve(
      GENERATION_ROOT,
      "asset-manifests",
      `${lesson.slug}.json`,
    );
    const audioPath = resolve(
      GENERATION_ROOT,
      "assets",
      `${lesson.slug}.mp3`,
    );
    const asset =
      await readJson<AssetManifest>(
        manifestPath,
      );
    const {
      manifestHash:
        assetManifestHash,
      passed,
      ...assetCore
    } = asset;
    const audio = await readFile(audioPath);
    if (
      !passed ||
      sha256(canonical(assetCore)) !==
        assetManifestHash ||
      asset.releaseId !== RELEASE_ID ||
      asset.planHash !== plan.planHash ||
      asset.recipeVersion !==
        plan.recipeVersion ||
      asset.recipeHash !==
        plan.recipeHash ||
      asset.voiceId !==
        FINAL_ELEVENLABS_NARRATION_VOICE_ID ||
      asset.lessonId !==
        lesson.lessonId ||
      asset.lessonSlug !== lesson.slug ||
      asset.lessonOrder !==
        lesson.order ||
      asset.contentHash !==
        lesson.canonicalSanitizedHtmlHash ||
      asset.spokenScriptHash !==
        lesson.spokenScriptHash ||
      asset.mimeType !== "audio/mpeg" ||
      asset.sampleRate !== 24_000 ||
      asset.channels !== 1 ||
      asset.bitrateKbps !== 64 ||
      asset.sizeBytes !== audio.length ||
      asset.sizeBytes !==
        (await stat(audioPath)).size ||
      asset.checksumSha256 !==
        sha256(audio) ||
      asset.chunkRecords.length !==
        lesson.blocks.length ||
      asset.chunkRecords.some(
        (chunk, index) =>
          chunk.blockIndex !== index ||
          chunk.generationStatus !==
            "SUCCESS" ||
          chunk.retryCount !== 0,
      ) ||
      Object.values(asset.checks).some(
        (value) => !value,
      )
    ) {
      throw new Error(
        `${lesson.slug}: ElevenLabs final asset validation failed`,
      );
    }
    assets.push({
      lesson,
      asset,
      audio,
    });
  }
  if (
    assets.reduce(
      (sum, item) =>
        sum +
        item.asset.chunkRecords.length,
      0,
    ) !== 954
  ) {
    throw new Error(
      "Final block coverage is not exactly 954",
    );
  }
  return {
    plan,
    narration,
    release,
    auditManifestHash,
    assets,
  };
}

async function assertProductionContent(
  validated: Awaited<
    ReturnType<
      typeof validatedLocalRelease
    >
  >,
) {
  const production =
    await prisma.academyLesson.findMany({
      where: {
        id: {
          in: validated.narration.lessons.map(
            (lesson) =>
              lesson.lessonId,
          ),
        },
      },
      select: {
        id: true,
        bodyHtml: true,
      },
    });
  const byId = new Map(
    production.map((lesson) => [
      lesson.id,
      visibleLessonContentHash(
        lesson.bodyHtml,
      ),
    ]),
  );
  if (
    production.length !== 17 ||
    validated.narration.lessons.some(
      (lesson) =>
        byId.get(lesson.lessonId) !==
        lesson.canonicalSanitizedHtmlHash,
    )
  ) {
    throw new Error(
      "Production content changed after the final generation plan was frozen",
    );
  }
}

async function importRelease() {
  const validated =
    await validatedLocalRelease();
  await assertProductionContent(validated);
  const deployment =
    await prisma.academyNarrationDeployment.findUniqueOrThrow({
      where: {
        id: ACADEMY_NARRATION_DEPLOYMENT_ID,
      },
      select: {
        activeReleaseId: true,
      },
    });
  if (
    deployment.activeReleaseId !==
    PIPER_RELEASE_ID
  ) {
    throw new Error(
      "Piper is not the active release at inactive import",
    );
  }
  const existing =
    await prisma.academyNarrationRelease.findUnique({
      where: { id: RELEASE_ID },
      select: {
        id: true,
        recipeHash: true,
        releaseChecksumSha256: true,
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });
  if (!existing) {
    await prisma.$transaction(
      async (tx) => {
        const first =
          validated.narration.lessons[0]!;
        await tx.academyNarrationRelease.create({
          data: {
            id: RELEASE_ID,
            recipeVersion:
              validated.plan.recipeVersion,
            recipeHash:
              validated.plan.recipeHash,
            rendererVersion:
              first.rendererVersion,
            normalizationVersion:
              first.normalizationVersion,
            pronunciationVersion:
              first.pronunciationVersion,
            segmentationVersion:
              first.semanticChunkingVersion,
            voiceId:
              FINAL_ELEVENLABS_NARRATION_VOICE_ID,
            piperVersion:
              "elevenlabs/eleven_multilingual_v2",
            generationStatus:
              "COMPLETE",
            expectedAssetCount: 17,
            sourceContentManifestHash:
              validated.plan
                .sourceContentManifestHash,
            generationStartedAt: new Date(
              validated.release
                .generationStartedAt,
            ),
            generationCompletedAt: new Date(
              validated.release
                .generationCompletedAt,
            ),
            auditStatus: "PASSED",
            auditManifestHash:
              validated.auditManifestHash,
            releaseChecksumSha256:
              validated.release
                .releaseChecksumSha256,
          },
        });
        for (const {
          lesson,
          asset,
          audio,
        } of validated.assets) {
          const assetId = stableId(
            "ana",
            RELEASE_ID,
            lesson.lessonId,
          );
          await tx.academyNarrationAsset.create({
            data: {
              id: assetId,
              releaseId: RELEASE_ID,
              lessonId:
                lesson.lessonId,
              lessonSlug: lesson.slug,
              lessonOrder: lesson.order,
              contentHash:
                asset.contentHash,
              spokenScriptHash:
                asset.spokenScriptHash,
              data: audio,
              mimeType:
                asset.mimeType,
              durationSeconds:
                asset.durationSeconds,
              sampleRate:
                asset.sampleRate,
              channels:
                asset.channels,
              bitrateKbps:
                asset.bitrateKbps,
              sizeBytes:
                asset.sizeBytes,
              checksumSha256:
                asset.checksumSha256,
              integratedLufs:
                asset.integratedLufs,
              truePeakDbtp:
                asset.truePeakDbtp,
              generationMetadata:
                asset.generationMetadata,
              chunks: {
                create:
                  asset.chunkRecords.map(
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
                      resumed:
                        chunk.resumed,
                    })),
              },
            },
          });
        }
      },
      {
        maxWait: 30_000,
        timeout: 300_000,
      },
    );
  } else if (
    existing.recipeHash !==
      FINAL_ELEVENLABS_NARRATION_RECIPE_HASH ||
    existing.releaseChecksumSha256 !==
      validated.release
        .releaseChecksumSha256 ||
    existing._count.assets !== 17
  ) {
    throw new Error(
      "Existing ElevenLabs immutable release drift",
    );
  }
  const result =
    await deploymentState();
  if (
    result.deployment.activeReleaseId !==
      PIPER_RELEASE_ID ||
    result.elevenLabs?.assets !== 17 ||
    result.elevenLabs?.chunks !== 954
  ) {
    throw new Error(
      "Inactive ElevenLabs import verification failed",
    );
  }
  return {
    imported: !existing,
    ...result,
  };
}

async function deploymentState() {
  const [deployment, elevenLabs, piper] =
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
          activatedAt: true,
        },
      }),
      prisma.academyNarrationRelease.findUnique({
        where: { id: RELEASE_ID },
        select: {
          id: true,
          voiceId: true,
          recipeHash: true,
          auditStatus: true,
          generationStatus: true,
          _count: {
            select: {
              assets: true,
            },
          },
          assets: {
            select: {
              _count: {
                select: {
                  chunks: true,
                },
              },
            },
          },
        },
      }),
      prisma.academyNarrationRelease.findUnique({
        where: {
          id: PIPER_RELEASE_ID,
        },
        select: {
          id: true,
          _count: {
            select: {
              assets: true,
            },
          },
        },
      }),
    ]);
  return {
    deployment,
    elevenLabs: elevenLabs
      ? {
          id: elevenLabs.id,
          voiceId:
            elevenLabs.voiceId,
          recipeHash:
            elevenLabs.recipeHash,
          auditStatus:
            elevenLabs.auditStatus,
          generationStatus:
            elevenLabs.generationStatus,
          assets:
            elevenLabs._count.assets,
          chunks:
            elevenLabs.assets.reduce(
              (sum, asset) =>
                sum +
                asset._count.chunks,
              0,
            ),
        }
      : null,
    piper: piper
      ? {
          id: piper.id,
          assets:
            piper._count.assets,
        }
      : null,
  };
}

async function promote() {
  const validated =
    await validatedLocalRelease();
  await assertProductionContent(validated);
  const release =
    await prisma.academyNarrationRelease.findUniqueOrThrow({
      where: { id: RELEASE_ID },
      select: {
        generationStatus: true,
        auditStatus: true,
        expectedAssetCount: true,
        recipeVersion: true,
        recipeHash: true,
        voiceId: true,
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });
  if (
    release.generationStatus !==
      "COMPLETE" ||
    release.auditStatus !== "PASSED" ||
    release.expectedAssetCount !== 17 ||
    release._count.assets !== 17 ||
    release.recipeVersion !==
      FINAL_ELEVENLABS_NARRATION_RECIPE_VERSION ||
    release.recipeHash !==
      FINAL_ELEVENLABS_NARRATION_RECIPE_HASH ||
    release.voiceId !==
      FINAL_ELEVENLABS_NARRATION_VOICE_ID
  ) {
    throw new Error(
      "ElevenLabs promotion precondition failed",
    );
  }
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
        current.activeReleaseId !==
        PIPER_RELEASE_ID
      ) {
        throw new Error(
          "Atomic promotion requires Piper to be active",
        );
      }
      await tx.academyNarrationDeployment.update({
        where: {
          id: ACADEMY_NARRATION_DEPLOYMENT_ID,
        },
        data: {
          previousReleaseId:
            PIPER_RELEASE_ID,
          activeReleaseId:
            RELEASE_ID,
          rollbackReleaseId:
            PIPER_RELEASE_ID,
          rollbackReason: null,
          lastRolledBackAt: null,
          activatedAt: new Date(),
        },
      });
    },
    { timeout: 30_000 },
  );
  const state = await deploymentState();
  if (
    state.deployment.activeReleaseId !==
      RELEASE_ID ||
    state.deployment.previousReleaseId !==
      PIPER_RELEASE_ID ||
    state.piper?.assets !== 17
  ) {
    throw new Error(
      "Atomic ElevenLabs promotion verification failed",
    );
  }
  return state;
}

async function rollback(reason: string) {
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
      if (
        current.activeReleaseId !==
          RELEASE_ID ||
        current.previousReleaseId !==
          PIPER_RELEASE_ID
      ) {
        throw new Error(
          "Rollback requires active ElevenLabs and previous Piper",
        );
      }
      await tx.academyNarrationDeployment.update({
        where: {
          id: ACADEMY_NARRATION_DEPLOYMENT_ID,
        },
        data: {
          activeReleaseId:
            PIPER_RELEASE_ID,
          previousReleaseId:
            RELEASE_ID,
          rollbackReleaseId:
            RELEASE_ID,
          rollbackReason: reason,
          lastRolledBackAt: new Date(),
          activatedAt: new Date(),
        },
      });
    },
    { timeout: 30_000 },
  );
  return deploymentState();
}

async function main() {
  const [command, ...args] =
    process.argv.slice(2);
  if (command === "validate") {
    const validated =
      await validatedLocalRelease();
    process.stdout.write(
      `${JSON.stringify({
        validated: true,
        releaseId:
          validated.release.releaseId,
        assetCount:
          validated.assets.length,
        semanticBlockCount:
          validated.assets.reduce(
            (sum, asset) =>
              sum +
              asset.asset.chunkRecords
                .length,
            0,
          ),
        authoritativeBilledCharacters:
          validated.release
            .authoritativeBilledCharacters,
        resultHash:
          validated.release.resultHash,
      })}\n`,
    );
    return;
  }
  if (command === "import") {
    process.stdout.write(
      `${JSON.stringify(
        await importRelease(),
      )}\n`,
    );
    return;
  }
  if (command === "status") {
    process.stdout.write(
      `${JSON.stringify(
        await deploymentState(),
      )}\n`,
    );
    return;
  }
  if (command === "promote") {
    process.stdout.write(
      `${JSON.stringify(
        await promote(),
      )}\n`,
    );
    return;
  }
  if (command === "rollback") {
    const reason =
      args.join(" ").trim();
    if (!reason) {
      throw new Error(
        "rollback reason is required",
      );
    }
    process.stdout.write(
      `${JSON.stringify(
        await rollback(reason),
      )}\n`,
    );
    return;
  }
  throw new Error(
    "Usage: elevenlabs-final-rollout.ts validate|import|status|promote|rollback [reason]",
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${
        error instanceof Error
          ? error.stack
          : String(error)
      }\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
