-- Per-recipient newsletter delivery history. Additive; no destructive operations.
ALTER TABLE "NewsletterCampaign" ADD COLUMN     "recipientCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "NewsletterDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NewsletterDelivery_campaignId_idx" ON "NewsletterDelivery"("campaignId");
CREATE INDEX "NewsletterDelivery_email_idx" ON "NewsletterDelivery"("email");

ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NewsletterCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
