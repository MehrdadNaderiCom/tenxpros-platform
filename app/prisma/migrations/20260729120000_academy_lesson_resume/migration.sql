-- Durable, per-person and per-lesson Academy bookmarks. This is additive:
-- completion, exam gating, engagement analytics, and narration assets are
-- untouched. Reading and audio have independent optimistic-concurrency lanes.

CREATE TABLE "AcademyLessonResume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "readingContentKey" CHAR(64),
    "readingBlockKey" VARCHAR(96),
    "readingBlockIndex" INTEGER,
    "readingOffsetRatio" DOUBLE PRECISION,
    "readingProgressPct" DOUBLE PRECISION,
    "readingRevision" INTEGER NOT NULL DEFAULT 0,
    "readingClientId" VARCHAR(36),
    "readingClientSeq" INTEGER NOT NULL DEFAULT 0,
    "readingUpdatedAt" TIMESTAMP(3),
    "audioResumeKey" CHAR(64),
    "audioPositionSeconds" DOUBLE PRECISION,
    "audioDurationSeconds" DOUBLE PRECISION,
    "audioRevision" INTEGER NOT NULL DEFAULT 0,
    "audioClientId" VARCHAR(36),
    "audioClientSeq" INTEGER NOT NULL DEFAULT 0,
    "audioUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyLessonResume_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AcademyLessonResume_readingRevision_check"
      CHECK ("readingRevision" >= 0),
    CONSTRAINT "AcademyLessonResume_readingClientSeq_check"
      CHECK ("readingClientSeq" >= 0),
    CONSTRAINT "AcademyLessonResume_readingBlockIndex_check"
      CHECK ("readingBlockIndex" IS NULL OR ("readingBlockIndex" >= 0 AND "readingBlockIndex" <= 100000)),
    CONSTRAINT "AcademyLessonResume_readingOffsetRatio_check"
      CHECK ("readingOffsetRatio" IS NULL OR ("readingOffsetRatio" >= 0 AND "readingOffsetRatio" <= 1)),
    CONSTRAINT "AcademyLessonResume_readingProgressPct_check"
      CHECK ("readingProgressPct" IS NULL OR ("readingProgressPct" >= 0 AND "readingProgressPct" <= 100)),
    CONSTRAINT "AcademyLessonResume_audioRevision_check"
      CHECK ("audioRevision" >= 0),
    CONSTRAINT "AcademyLessonResume_audioClientSeq_check"
      CHECK ("audioClientSeq" >= 0),
    CONSTRAINT "AcademyLessonResume_audioPositionSeconds_check"
      CHECK ("audioPositionSeconds" IS NULL OR ("audioPositionSeconds" >= 0 AND "audioPositionSeconds" <= 86400)),
    CONSTRAINT "AcademyLessonResume_audioDurationSeconds_check"
      CHECK ("audioDurationSeconds" IS NULL OR ("audioDurationSeconds" > 0 AND "audioDurationSeconds" <= 86400)),
    CONSTRAINT "AcademyLessonResume_audioWithinDuration_check"
      CHECK (
        "audioPositionSeconds" IS NULL OR
        "audioDurationSeconds" IS NULL OR
        "audioPositionSeconds" <= "audioDurationSeconds"
      )
);

CREATE UNIQUE INDEX "AcademyLessonResume_userId_lessonId_key"
ON "AcademyLessonResume"("userId", "lessonId");

CREATE UNIQUE INDEX "AcademyLessonResume_partnerId_lessonId_key"
ON "AcademyLessonResume"("partnerId", "lessonId");

CREATE INDEX "AcademyLessonResume_userId_updatedAt_idx"
ON "AcademyLessonResume"("userId", "updatedAt");

ALTER TABLE "AcademyLessonResume"
ADD CONSTRAINT "AcademyLessonResume_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademyLessonResume"
ADD CONSTRAINT "AcademyLessonResume_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "Partner"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademyLessonResume"
ADD CONSTRAINT "AcademyLessonResume_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "AcademyLesson"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
