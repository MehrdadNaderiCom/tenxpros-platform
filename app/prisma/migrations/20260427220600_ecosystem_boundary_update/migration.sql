-- CreateEnum
CREATE TYPE "TalentPoolStatus" AS ENUM ('NOT_VISIBLE', 'ELIGIBLE', 'VISIBLE', 'SHORTLISTED', 'INTRODUCED', 'INTERVIEWING', 'OFFER_DISCUSSION', 'HIRED', 'PAUSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmployerRequestStatus" ADD VALUE 'DISCOVERY';
ALTER TYPE "EmployerRequestStatus" ADD VALUE 'ROLE_DEFINED';
ALTER TYPE "EmployerRequestStatus" ADD VALUE 'SHORTLIST_PREPARING';
ALTER TYPE "EmployerRequestStatus" ADD VALUE 'SHORTLIST_SENT';
ALTER TYPE "EmployerRequestStatus" ADD VALUE 'INTERVIEWS_ACTIVE';
ALTER TYPE "EmployerRequestStatus" ADD VALUE 'CLOSED_HIRED';
ALTER TYPE "EmployerRequestStatus" ADD VALUE 'CLOSED_NO_FIT';
ALTER TYPE "EmployerRequestStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "talentPoolStatus" "TalentPoolStatus" NOT NULL DEFAULT 'NOT_VISIBLE';

-- CreateTable
CREATE TABLE "TenXRoleConnection" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "tenxroleUserId" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "shareReadiness" BOOLEAN NOT NULL DEFAULT true,
    "shareCertificate" BOOLEAN NOT NULL DEFAULT true,
    "shareWorkModes" BOOLEAN NOT NULL DEFAULT true,
    "sharePromptPacks" BOOLEAN NOT NULL DEFAULT false,
    "shareCoaching" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenXRoleConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptPack" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "audience" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prompts" JSONB NOT NULL DEFAULT '[]',
    "global" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptPack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenXRoleConnection_professionalId_key" ON "TenXRoleConnection"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptPack_slug_key" ON "PromptPack"("slug");

-- CreateIndex
CREATE INDEX "PromptPack_professionalId_idx" ON "PromptPack"("professionalId");

-- CreateIndex
CREATE INDEX "PromptPack_category_idx" ON "PromptPack"("category");

-- AddForeignKey
ALTER TABLE "TenXRoleConnection" ADD CONSTRAINT "TenXRoleConnection_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptPack" ADD CONSTRAINT "PromptPack_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
