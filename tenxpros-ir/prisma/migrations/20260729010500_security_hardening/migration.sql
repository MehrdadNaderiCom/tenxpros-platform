-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmailVerificationToken_expiry_check" CHECK ("expiresAt" > "createdAt")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key"
ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx"
ON "EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_consumedAt_idx"
ON "EmailVerificationToken"("expiresAt", "consumedAt");

-- Prevent two current receipts for one application even under concurrent
-- requests or future code changes.
CREATE UNIQUE INDEX "PaymentReceipt_one_active_per_application"
ON "PaymentReceipt" ("applicationId")
WHERE "status" IN (
  'SUBMITTED'::"PaymentReceiptStatus",
  'PENDING_REVIEW'::"PaymentReceiptStatus",
  'APPROVED'::"PaymentReceiptStatus"
);

-- A 30-minute grid plus unique startsAt prevents overlapping Office Hour
-- intervals while retaining simple administrator input.
ALTER TABLE "OfficeHourSlot"
ADD CONSTRAINT "OfficeHourSlot_tehran_half_hour_grid_check" CHECK (
  EXTRACT(SECOND FROM ("startsAt" AT TIME ZONE 'Asia/Tehran')) = 0
  AND EXTRACT(MINUTE FROM ("startsAt" AT TIME ZONE 'Asia/Tehran')) IN (0, 30)
);

-- AddForeignKey
ALTER TABLE "EmailVerificationToken"
ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
