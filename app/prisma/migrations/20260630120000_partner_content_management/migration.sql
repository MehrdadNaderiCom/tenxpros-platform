-- AlterTable
ALTER TABLE "AcademyModule" ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "AcademyLesson" ADD COLUMN     "bodyHtml" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "updatedByEmail" TEXT;

-- AlterTable
ALTER TABLE "AcademyProgress" ADD COLUMN     "passedContentVersion" INTEGER;

-- CreateTable
CREATE TABLE "PartnerNotification" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyLessonVersion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "audioText" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "editedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyLessonVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerNotification_partnerId_isRead_idx" ON "PartnerNotification"("partnerId", "isRead");

-- CreateIndex
CREATE INDEX "AcademyLessonVersion_lessonId_version_idx" ON "AcademyLessonVersion"("lessonId", "version");

-- CreateIndex
CREATE INDEX "AcademyLessonVersion_moduleId_idx" ON "AcademyLessonVersion"("moduleId");

-- AddForeignKey
ALTER TABLE "PartnerNotification" ADD CONSTRAINT "PartnerNotification_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyLessonVersion" ADD CONSTRAINT "AcademyLessonVersion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "AcademyLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

