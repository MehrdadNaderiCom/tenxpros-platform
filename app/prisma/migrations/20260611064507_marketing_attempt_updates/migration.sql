-- CreateTable
CREATE TABLE "MarketingAttemptUpdate" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingAttemptUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingAttemptUpdate_attemptId_at_idx" ON "MarketingAttemptUpdate"("attemptId", "at");

-- AddForeignKey
ALTER TABLE "MarketingAttemptUpdate" ADD CONSTRAINT "MarketingAttemptUpdate_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "MarketingAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

