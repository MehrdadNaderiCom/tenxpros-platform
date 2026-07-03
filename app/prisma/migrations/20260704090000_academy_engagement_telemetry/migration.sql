-- CreateTable
CREATE TABLE "AcademyEngagement" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "readSeconds" INTEGER NOT NULL DEFAULT 0,
    "audioSeconds" INTEGER NOT NULL DEFAULT 0,
    "lessonViews" INTEGER NOT NULL DEFAULT 0,
    "maxScrollPct" INTEGER NOT NULL DEFAULT 0,
    "firstViewedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "lastBeatAt" TIMESTAMP(3),
    "lastViewAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyEvent" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "moduleId" TEXT,
    "kind" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademyEngagement_partnerId_idx" ON "AcademyEngagement"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyEngagement_partnerId_moduleId_key" ON "AcademyEngagement"("partnerId", "moduleId");

-- CreateIndex
CREATE INDEX "AcademyEvent_partnerId_createdAt_idx" ON "AcademyEvent"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "AcademyEvent_moduleId_kind_idx" ON "AcademyEvent"("moduleId", "kind");

-- AddForeignKey
ALTER TABLE "AcademyEngagement" ADD CONSTRAINT "AcademyEngagement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEngagement" ADD CONSTRAINT "AcademyEngagement_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "AcademyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEvent" ADD CONSTRAINT "AcademyEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEvent" ADD CONSTRAINT "AcademyEvent_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "AcademyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

