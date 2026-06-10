-- CreateEnum
CREATE TYPE "ProspectStage" AS ENUM ('LIST', 'APPROACHED', 'REPLIED', 'CALL_BOOKED', 'CALL_HELD', 'APPLIED', 'PAID', 'LOST', 'DROPPED');

-- CreateEnum
CREATE TYPE "ProspectWarmth" AS ENUM ('WARM', 'REFERRAL', 'COLD_ENGAGED', 'COLD');

-- CreateEnum
CREATE TYPE "FollowupStatus" AS ENUM ('ACTIVE', 'PARKED', 'DROPPED');

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetBreakEven" INTEGER NOT NULL DEFAULT 2,
    "targetIdeal" INTEGER NOT NULL DEFAULT 3,
    "targetStretch" INTEGER NOT NULL DEFAULT 5,
    "targetPipeline" INTEGER NOT NULL DEFAULT 30,
    "pivotMessagesThreshold" INTEGER NOT NULL DEFAULT 150,
    "pivotCallsThreshold" INTEGER NOT NULL DEFAULT 10,
    "offPlatformPaid" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingChannel" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "dailyMin" INTEGER NOT NULL DEFAULT 5,
    "dailyMax" INTEGER NOT NULL DEFAULT 15,
    "weeklyCap" INTEGER NOT NULL DEFAULT 70,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MarketingChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "context" TEXT,
    "warmth" "ProspectWarmth" NOT NULL DEFAULT 'COLD',
    "pain" INTEGER NOT NULL DEFAULT 3,
    "authority" INTEGER NOT NULL DEFAULT 3,
    "icpFit" INTEGER NOT NULL DEFAULT 3,
    "stage" "ProspectStage" NOT NULL DEFAULT 'LIST',
    "lostReason" TEXT,
    "email" TEXT,
    "linkedin" TEXT,
    "whatsapp" TEXT,
    "phone" TEXT,
    "telegram" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "assetsSent" TEXT,
    "followupStatus" "FollowupStatus" NOT NULL DEFAULT 'ACTIVE',
    "followupStep" INTEGER NOT NULL DEFAULT 0,
    "followupNextDue" TIMESTAMP(3),
    "followupDropReason" TEXT,
    "applicationId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectTouch" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT,
    "summary" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectTouch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingDailyLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "MarketingDailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingChannel_campaignId_channel_key" ON "MarketingChannel"("campaignId", "channel");

-- CreateIndex
CREATE INDEX "Prospect_campaignId_stage_idx" ON "Prospect"("campaignId", "stage");

-- CreateIndex
CREATE INDEX "ProspectTouch_prospectId_at_idx" ON "ProspectTouch"("prospectId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingDailyLog_campaignId_date_channel_key" ON "MarketingDailyLog"("campaignId", "date", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingTemplate_key_key" ON "MarketingTemplate"("key");

-- AddForeignKey
ALTER TABLE "MarketingChannel" ADD CONSTRAINT "MarketingChannel_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectTouch" ADD CONSTRAINT "ProspectTouch_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingDailyLog" ADD CONSTRAINT "MarketingDailyLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

