import { createHash } from "node:crypto";

import { prisma } from "../prisma";

export const ACADEMY_NARRATION_DEPLOYMENT_ID =
  "academy-production";
export const ACTIVE_ACADEMY_NARRATION_VOICE_ID =
  "bryce";
export const ACTIVE_ACADEMY_NARRATION_VOICE_LABEL =
  "Bryce (US male)";
export const FINAL_ACADEMY_NARRATION_RECIPE_VERSION =
  "semantic-block-flow-v2-final";
export const FINAL_ACADEMY_NARRATION_RECIPE_HASH =
  "0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe";
export const FINAL_ELEVENLABS_NARRATION_VOICE_ID =
  "hpp4J3VqNfWAUOO0d1Us";
export const FINAL_ELEVENLABS_NARRATION_VOICE_LABEL =
  "Bella (professional warm)";
export const FINAL_ELEVENLABS_NARRATION_RECIPE_VERSION =
  "elevenlabs-bella-multilingual-v2-final-v1";
export const FINAL_ELEVENLABS_NARRATION_RECIPE_HASH =
  "d43797ae6555cedd6cc1061abe71c89ac41a611c400029503f0e267e77b4edb3";

function approvedReleaseIdentity(release: {
  voiceId: string;
  recipeVersion: string;
  recipeHash: string;
}): boolean {
  return (
    (release.voiceId ===
      ACTIVE_ACADEMY_NARRATION_VOICE_ID &&
      release.recipeVersion ===
        FINAL_ACADEMY_NARRATION_RECIPE_VERSION &&
      release.recipeHash ===
        FINAL_ACADEMY_NARRATION_RECIPE_HASH) ||
    (release.voiceId ===
      FINAL_ELEVENLABS_NARRATION_VOICE_ID &&
      release.recipeVersion ===
        FINAL_ELEVENLABS_NARRATION_RECIPE_VERSION &&
      release.recipeHash ===
        FINAL_ELEVENLABS_NARRATION_RECIPE_HASH)
  );
}

export function academyNarrationVoiceLabel(
  voiceId: string,
): string {
  return voiceId ===
    FINAL_ELEVENLABS_NARRATION_VOICE_ID
    ? FINAL_ELEVENLABS_NARRATION_VOICE_LABEL
    : ACTIVE_ACADEMY_NARRATION_VOICE_LABEL;
}

export function visibleLessonContentHash(
  bodyHtml: string | null | undefined,
): string {
  return createHash("sha256")
    .update(bodyHtml ?? "")
    .digest("hex");
}

export type VersionedNarrationAssetMetadata = {
  source: "versioned";
  id: string;
  releaseId: string;
  lessonId: string;
  lessonSlug: string;
  contentHash: string;
  spokenScriptHash: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  checksumSha256: string;
  recipeVersion: string;
  recipeHash: string;
  voiceId: string;
  audioStatus: "CURRENT" | "STALE";
};

export type AcademyNarrationAudioStatus =
  | "CURRENT"
  | "STALE"
  | "MISSING"
  | "GENERATING"
  | "FAILED";

export function academyNarrationAudioStatus(input: {
  currentContentHash: string;
  activeAudioSourceContentHash?: string | null;
  pendingStatus?: string | null;
}): AcademyNarrationAudioStatus {
  if (input.pendingStatus === "GENERATING") {
    return "GENERATING";
  }
  if (input.pendingStatus === "FAILED") {
    return "FAILED";
  }
  if (!input.activeAudioSourceContentHash) {
    return "MISSING";
  }
  return input.currentContentHash ===
    input.activeAudioSourceContentHash
    ? "CURRENT"
    : "STALE";
}

const releaseSelect = {
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
} as const;

export async function activeAcademyNarrationRelease() {
  const deployment =
    await prisma.academyNarrationDeployment.findUnique({
      where: {
        id: ACADEMY_NARRATION_DEPLOYMENT_ID,
      },
      select: {
        activeReleaseId: true,
        previousReleaseId: true,
        activatedAt: true,
        activeRelease: {
          select: releaseSelect,
        },
      },
    });
  if (!deployment?.activeReleaseId) {
    return {
      deployment,
      release: null,
    };
  }
  const release = deployment.activeRelease;
  if (
    !release ||
    release.generationStatus !== "COMPLETE" ||
    release.auditStatus !== "PASSED" ||
    release.expectedAssetCount !== 17 ||
    !approvedReleaseIdentity(release)
  ) {
    throw new Error(
      "Active Academy narration release failed its immutable release gate",
    );
  }
  return {
    deployment,
    release,
  };
}

export async function resolveVersionedNarrationAsset(input: {
  lessonId: string;
  lessonSlug: string;
  bodyHtml: string | null | undefined;
  releaseId?: string;
}): Promise<VersionedNarrationAssetMetadata | null> {
  const releaseId =
    input.releaseId ??
    (
      await activeAcademyNarrationRelease()
    ).release?.id;
  if (!releaseId) return null;
  const asset =
    await prisma.academyNarrationAsset.findUnique({
      where: {
        releaseId_lessonId: {
          releaseId,
          lessonId: input.lessonId,
        },
      },
      select: {
        id: true,
        releaseId: true,
        lessonId: true,
        lessonSlug: true,
        contentHash: true,
        spokenScriptHash: true,
        mimeType: true,
        sizeBytes: true,
        durationSeconds: true,
        checksumSha256: true,
        release: {
          select: releaseSelect,
        },
      },
    });
  if (
    !asset ||
    asset.lessonSlug !== input.lessonSlug ||
    asset.release.generationStatus !==
      "COMPLETE" ||
    asset.release.auditStatus !== "PASSED" ||
    asset.release.expectedAssetCount !== 17 ||
    !approvedReleaseIdentity(asset.release)
  ) {
    return null;
  }
  return {
    source: "versioned",
    id: asset.id,
    releaseId: asset.releaseId,
    lessonId: asset.lessonId,
    lessonSlug: asset.lessonSlug,
    contentHash: asset.contentHash,
    spokenScriptHash: asset.spokenScriptHash,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    durationSeconds: asset.durationSeconds,
    checksumSha256: asset.checksumSha256,
    recipeVersion:
      asset.release.recipeVersion,
    recipeHash: asset.release.recipeHash,
    voiceId: asset.release.voiceId,
    audioStatus:
      asset.contentHash ===
      visibleLessonContentHash(input.bodyHtml)
        ? "CURRENT"
        : "STALE",
  };
}

export async function academyNarrationAttention() {
  const active =
    await activeAcademyNarrationRelease();
  const lessons =
    await prisma.academyLesson.findMany({
      orderBy: [
        { module: { order: "asc" } },
        { order: "asc" },
      ],
      select: {
        id: true,
        title: true,
        bodyHtml: true,
        module: {
          select: {
            slug: true,
            contentVersion: true,
          },
        },
        narrationPending: {
          select: {
            status: true,
          },
        },
      },
    });
  const assets = active.release
    ? await prisma.academyNarrationAsset.findMany({
        where: {
          releaseId: active.release.id,
        },
        select: {
          lessonId: true,
          contentHash: true,
          createdAt: true,
        },
      })
    : [];
  const byLesson = new Map(
    assets.map((asset) => [
      asset.lessonId,
      asset,
    ]),
  );
  const rows = lessons.map((lesson) => {
    const asset = byLesson.get(lesson.id);
    const currentContentHash =
      visibleLessonContentHash(
        lesson.bodyHtml,
      );
    return {
      lessonId: lesson.id,
      title: lesson.title,
      slug: lesson.module.slug,
      contentVersion:
        lesson.module.contentVersion,
      status: academyNarrationAudioStatus({
        currentContentHash,
        activeAudioSourceContentHash:
          asset?.contentHash,
        pendingStatus:
          lesson.narrationPending?.status,
      }),
      activeReleaseId:
        active.release?.id ?? null,
      audioGeneratedAt:
        asset?.createdAt ?? null,
    };
  });
  return {
    activeRelease: active.release,
    rows,
    attention: rows.filter(
      (row) => row.status !== "CURRENT",
    ),
  };
}
