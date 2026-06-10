-- CreateTable
CREATE TABLE "MarketingCoachAdvice" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "advice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingCoachAdvice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingCoachAdvice_campaignId_createdAt_idx" ON "MarketingCoachAdvice"("campaignId", "createdAt");

