-- AlterTable
ALTER TABLE "ProgramConfig" ADD COLUMN     "strongSeatThresholdB2b" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "strongSeatThresholdB2c" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "PartnerConfig" ADD COLUMN     "deliveryPercentBp" INTEGER,
ADD COLUMN     "strongSeatThresholdB2b" INTEGER,
ADD COLUMN     "strongSeatThresholdB2c" INTEGER,
ADD COLUMN     "strongValueThresholdB2bCents" INTEGER,
ADD COLUMN     "strongValueThresholdB2cCents" INTEGER;

-- AlterTable
ALTER TABLE "RegisteredAccount" ADD COLUMN     "classificationOverride" TEXT,
ADD COLUMN     "classificationOverrideReason" TEXT;

-- CreateTable
CREATE TABLE "DealFunctionClaim" (
    "id" TEXT NOT NULL,
    "dealRegistrationId" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "contactName" TEXT,
    "relationshipDescription" TEXT,
    "introDescription" TEXT,
    "involvementStatement" TEXT,
    "warmRelationshipAttested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealFunctionClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealFunctionClaim_dealRegistrationId_idx" ON "DealFunctionClaim"("dealRegistrationId");

-- CreateIndex
CREATE UNIQUE INDEX "DealFunctionClaim_dealRegistrationId_function_key" ON "DealFunctionClaim"("dealRegistrationId", "function");

-- AddForeignKey
ALTER TABLE "DealFunctionClaim" ADD CONSTRAINT "DealFunctionClaim_dealRegistrationId_fkey" FOREIGN KEY ("dealRegistrationId") REFERENCES "DealRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

