-- Structured editor document (TipTap JSON) as the source of truth for the body.
-- Additive and nullable; no destructive operations.
ALTER TABLE "NewsletterCampaign" ADD COLUMN     "bodyJson" TEXT;
