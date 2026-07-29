-- CreateEnum
CREATE TYPE "CoachingInquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'DECLINED');

-- CreateEnum
CREATE TYPE "WeeklyGatheringStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "challenge" TEXT,
ADD COLUMN     "experienceYears" INTEGER,
ADD COLUMN     "goals" TEXT,
ADD COLUMN     "organization" VARCHAR(200),
ADD COLUMN     "weeklyCommitment" INTEGER;

ALTER TABLE "Application"
ADD CONSTRAINT "Application_experience_years_check"
CHECK ("experienceYears" IS NULL OR "experienceYears" BETWEEN 0 AND 70),
ADD CONSTRAINT "Application_weekly_commitment_check"
CHECK ("weeklyCommitment" IS NULL OR "weeklyCommitment" BETWEEN 1 AND 40);

-- CreateTable
CREATE TABLE "CoachingInquiry" (
    "id" TEXT NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "preferredSchedule" VARCHAR(500),
    "requestedMinutes" INTEGER NOT NULL DEFAULT 60,
    "hourlyRateToman" INTEGER NOT NULL DEFAULT 5000000,
    "status" "CoachingInquiryStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "contactedAt" TIMESTAMPTZ(3),
    "scheduledAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "requestedById" TEXT NOT NULL,
    "managedById" TEXT,

    CONSTRAINT "CoachingInquiry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CoachingInquiry_duration_check"
      CHECK ("requestedMinutes" = 60),
    CONSTRAINT "CoachingInquiry_rate_check"
      CHECK ("hourlyRateToman" = 5000000)
);

-- CreateTable
CREATE TABLE "WeeklyGathering" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "topic" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "timeZone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Tehran',
    "status" "WeeklyGatheringStatus" NOT NULL DEFAULT 'DRAFT',
    "capacity" INTEGER,
    "zoomMeetingId" VARCHAR(100),
    "zoomMeetingUuid" VARCHAR(200),
    "zoomJoinUrl" TEXT,
    "publishedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "WeeklyGathering_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WeeklyGathering_duration_check"
      CHECK ("endsAt" = "startsAt" + INTERVAL '90 minutes'),
    CONSTRAINT "WeeklyGathering_time_zone_check"
      CHECK ("timeZone" = 'Asia/Tehran'),
    CONSTRAINT "WeeklyGathering_capacity_check"
      CHECK ("capacity" IS NULL OR "capacity" > 0)
);

-- CreateTable
CREATE TABLE "WeeklyGatheringRegistration" (
    "id" TEXT NOT NULL,
    "registeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attendedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "userId" TEXT NOT NULL,
    "gatheringId" TEXT NOT NULL,

    CONSTRAINT "WeeklyGatheringRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachingInquiry_status_createdAt_idx" ON "CoachingInquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CoachingInquiry_requestedById_createdAt_idx" ON "CoachingInquiry"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "CoachingInquiry_managedById_idx" ON "CoachingInquiry"("managedById");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyGathering_zoomMeetingId_key" ON "WeeklyGathering"("zoomMeetingId");

-- CreateIndex
CREATE INDEX "WeeklyGathering_status_startsAt_idx" ON "WeeklyGathering"("status", "startsAt");

-- CreateIndex
CREATE INDEX "WeeklyGathering_createdById_idx" ON "WeeklyGathering"("createdById");

-- CreateIndex
CREATE INDEX "WeeklyGatheringRegistration_gatheringId_registeredAt_idx" ON "WeeklyGatheringRegistration"("gatheringId", "registeredAt");

-- CreateIndex
CREATE INDEX "WeeklyGatheringRegistration_userId_registeredAt_idx" ON "WeeklyGatheringRegistration"("userId", "registeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyGatheringRegistration_userId_gatheringId_key" ON "WeeklyGatheringRegistration"("userId", "gatheringId");

-- AddForeignKey
ALTER TABLE "CoachingInquiry" ADD CONSTRAINT "CoachingInquiry_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingInquiry" ADD CONSTRAINT "CoachingInquiry_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyGathering" ADD CONSTRAINT "WeeklyGathering_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyGatheringRegistration" ADD CONSTRAINT "WeeklyGatheringRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyGatheringRegistration" ADD CONSTRAINT "WeeklyGatheringRegistration_gatheringId_fkey" FOREIGN KEY ("gatheringId") REFERENCES "WeeklyGathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
