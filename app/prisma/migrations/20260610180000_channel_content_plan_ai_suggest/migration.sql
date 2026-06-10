-- AlterTable
ALTER TABLE "MarketingChannel" ADD COLUMN     "contentNote" TEXT,
ADD COLUMN     "engagePerDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "postsPerDay" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MarketingDailyLog" ADD COLUMN     "engagements" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "posts" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MarketingAiSuggestion" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingAiSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingAiSuggestion_campaignId_area_createdAt_idx" ON "MarketingAiSuggestion"("campaignId", "area", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketingAiSuggestion" ADD CONSTRAINT "MarketingAiSuggestion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

