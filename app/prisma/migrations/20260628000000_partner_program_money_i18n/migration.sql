-- DropForeignKey
ALTER TABLE "ClosedDeal" DROP CONSTRAINT "ClosedDeal_partnerId_fkey";

-- DropForeignKey
ALTER TABLE "CommissionEntry" DROP CONSTRAINT "CommissionEntry_partnerId_fkey";

-- AlterTable
ALTER TABLE "CommissionEntry" ADD COLUMN     "isFlat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reversedCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PartnerConfig" ADD COLUMN     "pilotFirst30DaysWindowDays" INTEGER;

-- AlterTable
ALTER TABLE "ProgramConfig" ADD COLUMN     "pilotFirst30DaysWindowDays" INTEGER NOT NULL DEFAULT 30;

-- AddForeignKey
ALTER TABLE "ClosedDeal" ADD CONSTRAINT "ClosedDeal_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

