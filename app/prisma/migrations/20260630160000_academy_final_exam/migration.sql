-- AlterTable
ALTER TABLE "AcademyExamSitting" ADD COLUMN     "isFinal" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "moduleId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AcademyExamSitting_partnerId_isFinal_idx" ON "AcademyExamSitting"("partnerId", "isFinal");

