-- CreateTable
CREATE TABLE "MarketingAttempt" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT,
    "prospectId" TEXT,
    "summary" TEXT NOT NULL,
    "outcome" TEXT,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "satisfaction" INTEGER NOT NULL DEFAULT 3,
    "learnings" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingAttempt_campaignId_at_idx" ON "MarketingAttempt"("campaignId", "at");

-- AddForeignKey
ALTER TABLE "MarketingAttempt" ADD CONSTRAINT "MarketingAttempt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingAttempt" ADD CONSTRAINT "MarketingAttempt_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

