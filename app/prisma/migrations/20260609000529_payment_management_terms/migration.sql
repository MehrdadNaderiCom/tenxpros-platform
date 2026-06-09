-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('WISE', 'STRIPE', 'MANUAL_INVOICE', 'BANK_TRANSFER', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'INSTRUCTIONS_SENT';
ALTER TYPE "PaymentStatus" ADD VALUE 'WAIVED';
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "PricingTier" ADD COLUMN     "paymentCurrency" TEXT,
ADD COLUMN     "paymentDueDays" INTEGER,
ADD COLUMN     "paymentInstructions" TEXT,
ADD COLUMN     "paymentLink" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod";

-- AlterTable
ALTER TABLE "PaymentRecord" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "discountNote" TEXT,
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "instructionsSentAt" TIMESTAMP(3),
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "method" "PaymentMethod",
ADD COLUMN     "paymentInstructions" TEXT,
ADD COLUMN     "paymentLink" TEXT,
ADD COLUMN     "showDiscountNoteToApplicant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waivedAt" TIMESTAMP(3);

