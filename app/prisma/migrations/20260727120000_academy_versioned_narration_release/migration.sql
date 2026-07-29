-- Additive, versioned Academy narration storage. The legacy
-- "AcademyLessonAudio" table is intentionally not altered.

CREATE TABLE "AcademyNarrationRelease" (
    "id" TEXT NOT NULL,
    "recipeVersion" TEXT NOT NULL,
    "recipeHash" TEXT NOT NULL,
    "rendererVersion" TEXT NOT NULL,
    "normalizationVersion" TEXT NOT NULL,
    "pronunciationVersion" TEXT NOT NULL,
    "segmentationVersion" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "piperVersion" TEXT NOT NULL,
    "generationStatus" TEXT NOT NULL,
    "expectedAssetCount" INTEGER NOT NULL,
    "sourceContentManifestHash" TEXT NOT NULL,
    "generationStartedAt" TIMESTAMP(3) NOT NULL,
    "generationCompletedAt" TIMESTAMP(3) NOT NULL,
    "auditStatus" TEXT NOT NULL,
    "auditManifestHash" TEXT NOT NULL,
    "releaseChecksumSha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyNarrationRelease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademyNarrationAsset" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "lessonSlug" TEXT NOT NULL,
    "lessonOrder" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "spokenScriptHash" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/mpeg',
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "sampleRate" INTEGER NOT NULL,
    "channels" INTEGER NOT NULL,
    "bitrateKbps" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "integratedLufs" DOUBLE PRECISION NOT NULL,
    "truePeakDbtp" DOUBLE PRECISION NOT NULL,
    "generationMetadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyNarrationAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademyNarrationChunk" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "blockIndex" INTEGER NOT NULL,
    "semanticBlockId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "spokenHash" TEXT NOT NULL,
    "generationStatus" TEXT NOT NULL,
    "pcmChecksum" TEXT NOT NULL,
    "measuredLeadingSilenceMs" DOUBLE PRECISION,
    "measuredTrailingSilenceMs" DOUBLE PRECISION,
    "insertedSilenceMs" DOUBLE PRECISION NOT NULL,
    "effectiveBoundaryPauseMs" DOUBLE PRECISION,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "resumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyNarrationChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademyNarrationDeployment" (
    "id" TEXT NOT NULL,
    "activeReleaseId" TEXT,
    "previousReleaseId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "rollbackReleaseId" TEXT,
    "rollbackReason" TEXT,
    "lastRolledBackAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyNarrationDeployment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademyNarrationPending" (
    "lessonId" TEXT NOT NULL,
    "currentContentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyNarrationPending_pkey" PRIMARY KEY ("lessonId")
);

CREATE UNIQUE INDEX "AcademyNarrationRelease_recipeHash_sourceContentManifestHash_voiceId_key"
ON "AcademyNarrationRelease"("recipeHash", "sourceContentManifestHash", "voiceId");

CREATE INDEX "AcademyNarrationRelease_generationStatus_auditStatus_idx"
ON "AcademyNarrationRelease"("generationStatus", "auditStatus");

CREATE UNIQUE INDEX "AcademyNarrationAsset_releaseId_lessonId_key"
ON "AcademyNarrationAsset"("releaseId", "lessonId");

CREATE UNIQUE INDEX "AcademyNarrationAsset_releaseId_lessonSlug_key"
ON "AcademyNarrationAsset"("releaseId", "lessonSlug");

CREATE INDEX "AcademyNarrationAsset_releaseId_lessonOrder_idx"
ON "AcademyNarrationAsset"("releaseId", "lessonOrder");

CREATE INDEX "AcademyNarrationAsset_lessonId_idx"
ON "AcademyNarrationAsset"("lessonId");

CREATE UNIQUE INDEX "AcademyNarrationChunk_assetId_blockIndex_key"
ON "AcademyNarrationChunk"("assetId", "blockIndex");

CREATE INDEX "AcademyNarrationChunk_assetId_generationStatus_idx"
ON "AcademyNarrationChunk"("assetId", "generationStatus");

CREATE INDEX "AcademyNarrationDeployment_activeReleaseId_idx"
ON "AcademyNarrationDeployment"("activeReleaseId");

CREATE INDEX "AcademyNarrationPending_status_updatedAt_idx"
ON "AcademyNarrationPending"("status", "updatedAt");

ALTER TABLE "AcademyNarrationAsset"
ADD CONSTRAINT "AcademyNarrationAsset_releaseId_fkey"
FOREIGN KEY ("releaseId") REFERENCES "AcademyNarrationRelease"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AcademyNarrationAsset"
ADD CONSTRAINT "AcademyNarrationAsset_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "AcademyLesson"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AcademyNarrationChunk"
ADD CONSTRAINT "AcademyNarrationChunk_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "AcademyNarrationAsset"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademyNarrationDeployment"
ADD CONSTRAINT "AcademyNarrationDeployment_activeReleaseId_fkey"
FOREIGN KEY ("activeReleaseId") REFERENCES "AcademyNarrationRelease"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AcademyNarrationDeployment"
ADD CONSTRAINT "AcademyNarrationDeployment_previousReleaseId_fkey"
FOREIGN KEY ("previousReleaseId") REFERENCES "AcademyNarrationRelease"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AcademyNarrationPending"
ADD CONSTRAINT "AcademyNarrationPending_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "AcademyLesson"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
