-- AlterTable
ALTER TABLE "ProgramConfig" ADD COLUMN     "deliveryPercentBp" INTEGER NOT NULL DEFAULT 800,
ADD COLUMN     "strongValueThresholdB2bCents" INTEGER NOT NULL DEFAULT 1500000,
ADD COLUMN     "strongValueThresholdB2cCents" INTEGER NOT NULL DEFAULT 500000;

-- AlterTable
ALTER TABLE "DealRegistration" ADD COLUMN     "domain" TEXT;

-- AlterTable
ALTER TABLE "RegisteredAccount" ADD COLUMN     "domain" TEXT;

-- AlterTable
ALTER TABLE "ClosedDeal" ADD COLUMN     "domain" TEXT;

-- AlterTable
ALTER TABLE "CommissionEntry" ADD COLUMN     "weightBp" INTEGER;

