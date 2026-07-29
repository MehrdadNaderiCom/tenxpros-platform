import { randomUUID } from "node:crypto";
import type { AcademyLessonResume } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activeAcademyNarrationRelease,
  resolveVersionedNarrationAsset,
} from "@/lib/academy/narration-release";
import { narrationVoice } from "@/lib/academy/voices";
import {
  decideAcademyResumeCas,
  type AcademyResumePayload,
} from "@/lib/academy/resume-contract";
import {
  academyAudioResumeKey,
  academyReadingContentKey,
} from "@/lib/academy/resume-core";

export {
  academyAudioResumeKey,
  academyAudioResumeShadowScope,
  academyReadingContentKey,
  isSameOriginAcademyResumeRequest,
} from "@/lib/academy/resume-core";

export type AcademyReadingResumeSnapshot = {
  contentKey: string;
  blockKey: string | null;
  blockIndex: number | null;
  offsetRatio: number | null;
  progressPct: number | null;
  revision: number;
};

export type AcademyAudioResumeSnapshot = {
  resumeKey: string | null;
  positionSeconds: number | null;
  durationSeconds: number | null;
  updatedAt: number | null;
  revision: number;
};

export type AcademyLessonResumeSnapshot = {
  reading: AcademyReadingResumeSnapshot;
  audio: AcademyAudioResumeSnapshot;
};

type ResumeLesson = {
  id: string;
  body: string;
  bodyHtml: string | null;
};

export async function getAcademyLessonResumeSnapshot(input: {
  userId: string;
  partnerId: string;
  lesson: ResumeLesson;
}): Promise<AcademyLessonResumeSnapshot> {
  const contentKey = academyReadingContentKey(input.lesson);
  const row = await prisma.academyLessonResume.findFirst({
    where: {
      userId: input.userId,
      partnerId: input.partnerId,
      lessonId: input.lesson.id,
    },
  });

  const readingCurrent = row?.readingContentKey === contentKey;
  return {
    reading: {
      contentKey,
      blockKey: readingCurrent ? row?.readingBlockKey ?? null : null,
      blockIndex: readingCurrent ? row?.readingBlockIndex ?? null : null,
      offsetRatio: readingCurrent ? row?.readingOffsetRatio ?? null : null,
      progressPct: readingCurrent ? row?.readingProgressPct ?? null : null,
      // Keep the stored revision even when the content key changed. The first
      // save for the new content then advances the same concurrency lane.
      revision: row?.readingRevision ?? 0,
    },
    audio: {
      // AudioReader compares this immutable key with the currently selected
      // asset before seeking, so a release swap can never apply a stale time.
      resumeKey: row?.audioResumeKey ?? null,
      positionSeconds: row?.audioPositionSeconds ?? null,
      durationSeconds: row?.audioDurationSeconds ?? null,
      updatedAt: row?.audioUpdatedAt?.getTime() ?? null,
      revision: row?.audioRevision ?? 0,
    },
  };
}

/**
 * Resolve the published lesson and repeat the same sequential unlock check as
 * the page. This deliberately loads no exercises or answers: it is the small
 * authorization query used by frequent bookmark writes.
 */
export async function resolveAcademyResumeLesson(
  partnerId: string,
  slug: string,
): Promise<
  | { state: "missing" }
  | { state: "locked" }
  | {
      state: "ready";
      moduleId: string;
      slug: string;
      lesson: ResumeLesson;
    }
> {
  const academyModule = await prisma.academyModule.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      slug: true,
      order: true,
      isInformational: true,
      lessons: {
        orderBy: { order: "asc" },
        take: 1,
        select: {
          id: true,
          body: true,
          bodyHtml: true,
        },
      },
    },
  });
  const lesson = academyModule?.lessons[0];
  if (!academyModule || !lesson) return { state: "missing" };

  if (!academyModule.isInformational && academyModule.order > 1) {
    const previous = await prisma.academyModule.findFirst({
      where: {
        order: { lt: academyModule.order },
        isPublished: true,
        isInformational: false,
      },
      orderBy: { order: "desc" },
      select: { id: true },
    });
    if (previous) {
      const progress = await prisma.academyProgress.findUnique({
        where: {
          partnerId_moduleId: {
            partnerId,
            moduleId: previous.id,
          },
        },
        select: { examPassed: true },
      });
      if (!progress?.examPassed) return { state: "locked" };
    }
  }

  return {
    state: "ready",
    moduleId: academyModule.id,
    slug: academyModule.slug,
    lesson,
  };
}

export type AcademyAudioResumeSource = {
  resumeKey: string;
  voiceId: string;
  durationSeconds: number;
};

function validAcademyAudioDuration(
  durationSeconds: number,
): boolean {
  return (
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0 &&
    durationSeconds <= 86_400
  );
}

/**
 * Resolve the authoritative audio asset behind the current player. Bookmark
 * writes never trust a client duration or asset key.
 */
export async function resolveAcademyAudioResumeSource(input: {
  lesson: ResumeLesson;
  lessonSlug: string;
  requestedVoiceId: string;
}): Promise<AcademyAudioResumeSource | null> {
  const active = await activeAcademyNarrationRelease();
  if (active.release) {
    if (input.requestedVoiceId !== active.release.voiceId) return null;
    const asset = await resolveVersionedNarrationAsset({
      lessonId: input.lesson.id,
      lessonSlug: input.lessonSlug,
      bodyHtml: input.lesson.bodyHtml,
      releaseId: active.release.id,
    });
    if (
      !asset ||
      !validAcademyAudioDuration(asset.durationSeconds)
    ) {
      return null;
    }
    return {
      resumeKey: academyAudioResumeKey({
        source: "versioned",
        assetId: asset.id,
        identityHash: asset.checksumSha256,
        voiceId: asset.voiceId,
      }),
      voiceId: asset.voiceId,
      durationSeconds: asset.durationSeconds,
    };
  }

  const voice = narrationVoice(input.requestedVoiceId);
  if (!voice) return null;
  const asset = await prisma.academyLessonAudio.findUnique({
    where: {
      lessonId_voice: {
        lessonId: input.lesson.id,
        voice: voice.id,
      },
    },
    select: {
      id: true,
      textHash: true,
      voice: true,
      durationSeconds: true,
    },
  });
  if (
    !asset ||
    !validAcademyAudioDuration(asset.durationSeconds)
  ) {
    return null;
  }
  return {
    resumeKey: academyAudioResumeKey({
      source: "legacy",
      assetId: asset.id,
      identityHash: asset.textHash,
      voiceId: asset.voice,
    }),
    voiceId: asset.voice,
    durationSeconds: asset.durationSeconds,
  };
}

type ResumeWriteResult = {
  outcome: "accepted" | "duplicate" | "conflict";
  revision: number;
};

function laneState(
  row: AcademyLessonResume,
  kind: AcademyResumePayload["kind"],
) {
  return kind === "reading"
    ? {
        revision: row.readingRevision,
        clientId: row.readingClientId,
        clientSeq: row.readingClientSeq,
      }
    : {
        revision: row.audioRevision,
        clientId: row.audioClientId,
        clientSeq: row.audioClientSeq,
      };
}

/**
 * Atomic compare-and-set update. Same-client sequence numbers make a pagehide
 * flush safely supersede an older in-flight request; another tab must present
 * the current revision before it may write.
 */
export async function writeAcademyLessonResume(input: {
  userId: string;
  partnerId: string;
  lessonId: string;
  payload: AcademyResumePayload;
  readingContentKey?: string;
  audioSource?: AcademyAudioResumeSource;
}): Promise<ResumeWriteResult> {
  let row =
    await prisma.academyLessonResume.findUnique({
      where: {
        userId_lessonId: {
          userId: input.userId,
          lessonId: input.lessonId,
        },
      },
    });

  if (!row) {
    const createdAt = new Date();
    // createMany(skipDuplicates) maps to INSERT ... ON CONFLICT DO NOTHING in
    // PostgreSQL. Reading and audio may both create the first checkpoint; this
    // lets the loser continue with the winner without emitting a handled
    // unique-constraint error into production logs.
    await prisma.academyLessonResume.createMany({
      data: [
        {
          id: randomUUID(),
          userId: input.userId,
          partnerId: input.partnerId,
          lessonId: input.lessonId,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      skipDuplicates: true,
    });
    row = await prisma.academyLessonResume.findUnique({
      where: {
        userId_lessonId: {
          userId: input.userId,
          lessonId: input.lessonId,
        },
      },
    });
    if (!row) {
      // A conflicting partner+lesson row would violate the current one-to-one
      // User↔Partner invariant. Fail closed and report the lane revision
      // without ever reassigning that row.
      const invariantConflict =
        await prisma.academyLessonResume.findUnique({
          where: {
            partnerId_lessonId: {
              partnerId: input.partnerId,
              lessonId: input.lessonId,
            },
          },
        });
      if (invariantConflict) {
        return {
          outcome: "conflict",
          revision:
            input.payload.kind === "reading"
              ? invariantConflict.readingRevision
              : invariantConflict.audioRevision,
        };
      }
      throw new Error(
        "Academy resume row was not created.",
      );
    }
  }

  // This should be impossible because User↔Partner is one-to-one and Partner
  // deletion cascades, but refusing is safer than silently reassigning a row.
  if (row.partnerId !== input.partnerId) {
    return {
      outcome: "conflict",
      revision:
        input.payload.kind === "reading"
          ? row.readingRevision
          : row.audioRevision,
    };
  }

  const p = input.payload;
  const casWhere =
    p.kind === "reading"
      ? {
          OR: [
            {
              readingClientId: p.clientId,
              readingClientSeq: { lt: p.clientSeq },
            },
            {
              readingClientId: null,
              readingRevision: p.expectedRevision,
            },
            {
              readingClientId: { not: p.clientId },
              readingRevision: p.expectedRevision,
            },
          ],
        }
      : {
          OR: [
            {
              audioClientId: p.clientId,
              audioClientSeq: { lt: p.clientSeq },
            },
            {
              audioClientId: null,
              audioRevision: p.expectedRevision,
            },
            {
              audioClientId: { not: p.clientId },
              audioRevision: p.expectedRevision,
            },
          ],
        };

  const now = new Date();
  const updated =
    p.kind === "reading"
      ? await prisma.academyLessonResume.updateMany({
          where: {
            id: row.id,
            ...casWhere,
          },
          data: {
            readingContentKey: input.readingContentKey!,
            readingBlockKey: p.blockKey,
            readingBlockIndex: p.blockIndex,
            readingOffsetRatio: p.offsetRatio,
            readingProgressPct: p.progressPct,
            readingRevision: { increment: 1 },
            readingClientId: p.clientId,
            readingClientSeq: p.clientSeq,
            readingUpdatedAt: now,
          },
        })
      : await prisma.academyLessonResume.updateMany({
          where: {
            id: row.id,
            ...casWhere,
          },
          data: {
            audioResumeKey: input.audioSource!.resumeKey,
            audioPositionSeconds: Math.min(
              p.positionSeconds,
              input.audioSource!.durationSeconds,
            ),
            audioDurationSeconds: input.audioSource!.durationSeconds,
            audioRevision: { increment: 1 },
            audioClientId: p.clientId,
            audioClientSeq: p.clientSeq,
            audioUpdatedAt: now,
          },
        });

  const latest = await prisma.academyLessonResume.findUniqueOrThrow({
    where: { id: row.id },
  });
  const latestLane = laneState(latest, p.kind);
  if (updated.count === 1) {
    return {
      outcome: "accepted",
      revision: latestLane.revision,
    };
  }

  const decision = decideAcademyResumeCas(latestLane, p);
  return {
    outcome:
      decision === "duplicate"
        ? "duplicate"
        : "conflict",
    revision: latestLane.revision,
  };
}
