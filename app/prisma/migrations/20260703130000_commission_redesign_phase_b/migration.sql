-- AlterTable
ALTER TABLE "CommissionEntry" ADD COLUMN     "warmRelationshipAttested" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ClosedDeal_domain_idx" ON "ClosedDeal"("domain");

