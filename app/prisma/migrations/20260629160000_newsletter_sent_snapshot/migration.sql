-- Immutable snapshot of a campaign frozen at send time. Additive; no destructive ops.
ALTER TABLE "NewsletterCampaign" ADD COLUMN     "sentBodyHtml" TEXT,
ADD COLUMN     "sentFromAddress" TEXT,
ADD COLUMN     "sentGroupIds" JSONB,
ADD COLUMN     "sentSubject" TEXT,
ADD COLUMN     "sentTemplateVersion" TEXT,
ADD COLUMN     "sentText" TEXT,
ADD COLUMN     "sentUnsubVersion" TEXT;
