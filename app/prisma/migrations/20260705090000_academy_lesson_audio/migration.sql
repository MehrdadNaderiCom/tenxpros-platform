-- CreateTable
CREATE TABLE "AcademyLessonAudio" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/mpeg',
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyLessonAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademyLessonAudio_lessonId_voice_key" ON "AcademyLessonAudio"("lessonId", "voice");

-- AddForeignKey
ALTER TABLE "AcademyLessonAudio" ADD CONSTRAINT "AcademyLessonAudio_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "AcademyLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

