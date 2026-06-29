-- Idempotency timestamps for the accepted-but-unpaid payment reminder flow.
-- Additive and nullable; no destructive operations.
ALTER TABLE "PaymentRecord" ADD COLUMN     "expiryNoticeSentAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
