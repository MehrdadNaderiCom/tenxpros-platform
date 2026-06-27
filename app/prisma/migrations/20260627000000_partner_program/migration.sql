-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('APPLICANT', 'PILOT', 'TIER1', 'TIER2', 'TIER3', 'INACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PartnerTier" AS ENUM ('TIER1', 'TIER2', 'TIER3');

-- CreateEnum
CREATE TYPE "PartnerApplicationStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('B2C', 'B2B');

-- CreateEnum
CREATE TYPE "OfferingType" AS ENUM ('B2C_CHARTER', 'B2B_ENGAGEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DealProductLine" AS ENUM ('TENXPROS', 'TENXOPS');

-- CreateEnum
CREATE TYPE "DealRegStatus" AS ENUM ('SUBMITTED', 'CONFIRMED', 'DECLINED', 'LAPSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PartnerFunction" AS ENUM ('BASIC_INTRO', 'QUALIFIED_ORIGINATION', 'STRONG_ORIGINATION', 'CLOSING', 'DELIVERY', 'OVERRIDE', 'FOCUS_BONUS', 'GROWTH_BONUS');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('ACCRUED', 'PAYABLE', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('PENDING', 'PAID_COLLECTED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "FocusGrantStatus" AS ENUM ('ACTIVE', 'LAPSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ScorecardDay" AS ENUM ('DAY_14', 'DAY_30', 'DAY_60', 'DAY_90');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('FIXED_FEE', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "RefundEventType" AS ENUM ('REFUND', 'CHARGEBACK', 'CANCELLATION', 'CREDIT', 'REVERSAL');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PARTNER';

-- CreateTable
CREATE TABLE "PartnerApplication" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "linkedinUrl" TEXT,
    "background" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "targetMarkets" TEXT NOT NULL,
    "accountJustification" TEXT NOT NULL,
    "heardFrom" TEXT,
    "consentNoEquity" BOOLEAN NOT NULL DEFAULT false,
    "status" "PartnerApplicationStatus" NOT NULL DEFAULT 'NEW',
    "reviewerNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referrerUrl" TEXT,
    "landingPage" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "applicationId" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'APPLICANT',
    "tier" "PartnerTier" NOT NULL DEFAULT 'TIER1',
    "displayName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "country" TEXT,
    "pilotStartDate" TIMESTAMP(3),
    "activationGatePassedAt" TIMESTAMP(3),
    "activeStatus" BOOLEAN NOT NULL DEFAULT false,
    "lastActivityAt" TIMESTAMP(3),
    "recognitionTitle" TEXT,
    "qualityFlagged" BOOLEAN NOT NULL DEFAULT false,
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "basicIntroductionBp" INTEGER NOT NULL DEFAULT 500,
    "qualifiedOriginationB2cBp" INTEGER NOT NULL DEFAULT 1000,
    "qualifiedOriginationB2bBp" INTEGER NOT NULL DEFAULT 800,
    "strongOriginationB2cBp" INTEGER NOT NULL DEFAULT 1500,
    "strongOriginationB2bBp" INTEGER NOT NULL DEFAULT 1200,
    "strongOriginationUnlockSeats" INTEGER NOT NULL DEFAULT 40,
    "closingB2cBp" INTEGER NOT NULL DEFAULT 500,
    "closingB2bBp" INTEGER NOT NULL DEFAULT 1000,
    "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'PERCENTAGE',
    "deliveryPercentMinBp" INTEGER NOT NULL DEFAULT 500,
    "deliveryPercentMaxBp" INTEGER NOT NULL DEFAULT 800,
    "capB2cBp" INTEGER NOT NULL DEFAULT 2500,
    "capB2bBp" INTEGER NOT NULL DEFAULT 3000,
    "tier3FocusHardCeilingBp" INTEGER NOT NULL DEFAULT 3500,
    "originationWindowMonths" INTEGER NOT NULL DEFAULT 12,
    "overrideShareBp" INTEGER NOT NULL DEFAULT 5000,
    "majorNewEngagementMinSeats" INTEGER NOT NULL DEFAULT 15,
    "trailPeriodMonths" INTEGER NOT NULL DEFAULT 12,
    "tierQualifyingWindowMonths" INTEGER NOT NULL DEFAULT 12,
    "tier2SeatThreshold" INTEGER NOT NULL DEFAULT 40,
    "tier3FocusSeatThreshold" INTEGER NOT NULL DEFAULT 15,
    "focusBonusStartBp" INTEGER NOT NULL DEFAULT 100,
    "focusBonusAnnualIncrementBp" INTEGER NOT NULL DEFAULT 100,
    "focusBonusCeilingBp" INTEGER NOT NULL DEFAULT 3500,
    "growthBonusOrgThreshold" INTEGER NOT NULL DEFAULT 3,
    "growthBonusBp" INTEGER NOT NULL DEFAULT 100,
    "maxOpenAccountsTier1" INTEGER NOT NULL DEFAULT 3,
    "maxOpenAccountsTier2" INTEGER NOT NULL DEFAULT 5,
    "maxOpenAccountsTier3" INTEGER NOT NULL DEFAULT 10,
    "pilotFirst30DaysMaxAccountsTier1" INTEGER NOT NULL DEFAULT 2,
    "pipelineProtectionDaysTier1" INTEGER NOT NULL DEFAULT 120,
    "pipelineProtectionDaysTier2" INTEGER NOT NULL DEFAULT 150,
    "pipelineProtectionDaysTier3" INTEGER NOT NULL DEFAULT 180,
    "quietAccountLapseDaysTier1" INTEGER NOT NULL DEFAULT 30,
    "quietAccountLapseDaysTier2" INTEGER NOT NULL DEFAULT 45,
    "quietAccountLapseDaysTier3" INTEGER NOT NULL DEFAULT 60,
    "firstRightHours" INTEGER NOT NULL DEFAULT 48,
    "dealConfirmationWindowBusinessDays" INTEGER NOT NULL DEFAULT 5,
    "activeStatusResponseBusinessDays" INTEGER NOT NULL DEFAULT 5,
    "activeStatusCureDaysTier1" INTEGER NOT NULL DEFAULT 30,
    "activeStatusCureDaysTier2" INTEGER NOT NULL DEFAULT 45,
    "activeStatusCureDaysTier3" INTEGER NOT NULL DEFAULT 60,
    "transitionDays" INTEGER NOT NULL DEFAULT 30,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentBusinessDays" INTEGER NOT NULL DEFAULT 30,
    "smallPayoutThresholdCents" INTEGER NOT NULL DEFAULT 2500,
    "smallPayoutCarryForward" BOOLEAN NOT NULL DEFAULT true,
    "clawbackDays" INTEGER NOT NULL DEFAULT 120,
    "pilotDays" INTEGER NOT NULL DEFAULT 90,
    "pilotTerminationNoticeDays" INTEGER NOT NULL DEFAULT 7,
    "postPilotTerminationNoticeDays" INTEGER NOT NULL DEFAULT 30,
    "materialBreachCureDays" INTEGER NOT NULL DEFAULT 15,
    "windDownDays" INTEGER NOT NULL DEFAULT 30,
    "programAmendmentNoticeDays" INTEGER NOT NULL DEFAULT 30,
    "nonCircumventionMonths" INTEGER NOT NULL DEFAULT 24,
    "nonSolicitationMonths" INTEGER NOT NULL DEFAULT 12,
    "lateStageTailDays" INTEGER NOT NULL DEFAULT 90,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "ProgramConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerConfig" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "basicIntroductionBp" INTEGER,
    "qualifiedOriginationB2cBp" INTEGER,
    "qualifiedOriginationB2bBp" INTEGER,
    "strongOriginationB2cBp" INTEGER,
    "strongOriginationB2bBp" INTEGER,
    "strongOriginationUnlockSeats" INTEGER,
    "closingB2cBp" INTEGER,
    "closingB2bBp" INTEGER,
    "deliveryMode" "DeliveryMode",
    "deliveryPercentMinBp" INTEGER,
    "deliveryPercentMaxBp" INTEGER,
    "capB2cBp" INTEGER,
    "capB2bBp" INTEGER,
    "tier3FocusHardCeilingBp" INTEGER,
    "originationWindowMonths" INTEGER,
    "overrideShareBp" INTEGER,
    "majorNewEngagementMinSeats" INTEGER,
    "trailPeriodMonths" INTEGER,
    "tierQualifyingWindowMonths" INTEGER,
    "tier2SeatThreshold" INTEGER,
    "tier3FocusSeatThreshold" INTEGER,
    "focusBonusStartBp" INTEGER,
    "focusBonusAnnualIncrementBp" INTEGER,
    "focusBonusCeilingBp" INTEGER,
    "growthBonusOrgThreshold" INTEGER,
    "growthBonusBp" INTEGER,
    "maxOpenAccountsTier1" INTEGER,
    "maxOpenAccountsTier2" INTEGER,
    "maxOpenAccountsTier3" INTEGER,
    "pilotFirst30DaysMaxAccountsTier1" INTEGER,
    "pipelineProtectionDaysTier1" INTEGER,
    "pipelineProtectionDaysTier2" INTEGER,
    "pipelineProtectionDaysTier3" INTEGER,
    "quietAccountLapseDaysTier1" INTEGER,
    "quietAccountLapseDaysTier2" INTEGER,
    "quietAccountLapseDaysTier3" INTEGER,
    "firstRightHours" INTEGER,
    "dealConfirmationWindowBusinessDays" INTEGER,
    "activeStatusResponseBusinessDays" INTEGER,
    "activeStatusCureDaysTier1" INTEGER,
    "activeStatusCureDaysTier2" INTEGER,
    "activeStatusCureDaysTier3" INTEGER,
    "transitionDays" INTEGER,
    "currency" TEXT,
    "paymentBusinessDays" INTEGER,
    "smallPayoutThresholdCents" INTEGER,
    "smallPayoutCarryForward" BOOLEAN,
    "clawbackDays" INTEGER,
    "pilotDays" INTEGER,
    "pilotTerminationNoticeDays" INTEGER,
    "postPilotTerminationNoticeDays" INTEGER,
    "materialBreachCureDays" INTEGER,
    "windDownDays" INTEGER,
    "programAmendmentNoticeDays" INTEGER,
    "nonCircumventionMonths" INTEGER,
    "nonSolicitationMonths" INTEGER,
    "lateStageTailDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationGateItem" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationGateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorecardCheckpoint" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "day" "ScorecardDay" NOT NULL,
    "requiredEvidence" TEXT NOT NULL,
    "met" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScorecardCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealRegistration" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "productLine" "DealProductLine" NOT NULL DEFAULT 'TENXPROS',
    "offering" "OfferingType" NOT NULL DEFAULT 'B2B_ENGAGEMENT',
    "legalEntity" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "businessUnit" TEXT,
    "contactName" TEXT,
    "contactTitle" TEXT,
    "estSeats" INTEGER,
    "estValueCents" INTEGER,
    "functionsIntended" TEXT[],
    "justification" TEXT NOT NULL,
    "widerScopeRequested" TEXT,
    "status" "DealRegStatus" NOT NULL DEFAULT 'SUBMITTED',
    "confirmedScope" TEXT,
    "firstRightExpiresAt" TIMESTAMP(3),
    "pipelineProtectionExpiresAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "declineReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegisteredAccount" (
    "id" TEXT NOT NULL,
    "dealRegistrationId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "legalEntity" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "businessUnit" TEXT,
    "offering" "OfferingType" NOT NULL,
    "scope" TEXT NOT NULL,
    "isHouseAccount" BOOLEAN NOT NULL DEFAULT false,
    "isDirectRegistration" BOOLEAN NOT NULL DEFAULT false,
    "managed" BOOLEAN NOT NULL DEFAULT true,
    "protectionExpiresAt" TIMESTAMP(3),
    "lastMeaningfulUpdateAt" TIMESTAMP(3),
    "lapsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegisteredAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseAccount" (
    "id" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "domain" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosedDeal" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "registeredAccountId" TEXT,
    "dealType" "DealType" NOT NULL,
    "productLine" "DealProductLine" NOT NULL DEFAULT 'TENXPROS',
    "netReceiptsCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "deliveredAt" TIMESTAMP(3),
    "paymentClearedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "originationRateBpAtOpen" INTEGER,
    "originationWindowStart" TIMESTAMP(3),
    "trailPeriodEnd" TIMESTAMP(3),
    "isMajorNewEngagement" BOOLEAN NOT NULL DEFAULT false,
    "conversionRate" DOUBLE PRECISION,
    "conversionDate" TIMESTAMP(3),
    "industryOrRegion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosedDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatRecord" (
    "id" TEXT NOT NULL,
    "closedDealId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "status" "SeatStatus" NOT NULL DEFAULT 'PENDING',
    "industryOrRegion" TEXT,
    "sourcedByPartner" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionEntry" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "closedDealId" TEXT NOT NULL,
    "function" "PartnerFunction" NOT NULL,
    "rateBp" INTEGER NOT NULL,
    "baseAmountCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'ACCRUED',
    "payableOn" TIMESTAMP(3),
    "paidOn" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "conversionRate" DOUBLE PRECISION,
    "conversionDate" TIMESTAMP(3),
    "queryFlag" BOOLEAN NOT NULL DEFAULT false,
    "queryNote" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenXOpsEngagement" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "registeredAccountId" TEXT,
    "closedDealId" TEXT,
    "organisation" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "EngagementStatus" NOT NULL DEFAULT 'REQUESTED',
    "confirmedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenXOpsEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusGrant" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "industryOrRegion" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "continuouslyHeldSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentBonusBp" INTEGER NOT NULL DEFAULT 100,
    "status" "FocusGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FocusGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundEvent" (
    "id" TEXT NOT NULL,
    "closedDealId" TEXT NOT NULL,
    "type" "RefundEventType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withinWindow" BOOLEAN NOT NULL DEFAULT true,
    "reversedCommissionCents" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityFlag" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "closedDealId" TEXT,
    "reason" TEXT NOT NULL,
    "disregardForTargets" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerApplication_status_idx" ON "PartnerApplication"("status");

-- CreateIndex
CREATE INDEX "PartnerApplication_email_idx" ON "PartnerApplication"("email");

-- CreateIndex
CREATE INDEX "PartnerApplication_createdAt_idx" ON "PartnerApplication"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_applicationId_key" ON "Partner"("applicationId");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerConfig_partnerId_key" ON "PartnerConfig"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationGateItem_partnerId_key_key" ON "ActivationGateItem"("partnerId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ScorecardCheckpoint_partnerId_day_key" ON "ScorecardCheckpoint"("partnerId", "day");

-- CreateIndex
CREATE INDEX "DealRegistration_partnerId_status_idx" ON "DealRegistration"("partnerId", "status");

-- CreateIndex
CREATE INDEX "DealRegistration_status_submittedAt_idx" ON "DealRegistration"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredAccount_dealRegistrationId_key" ON "RegisteredAccount"("dealRegistrationId");

-- CreateIndex
CREATE INDEX "RegisteredAccount_partnerId_idx" ON "RegisteredAccount"("partnerId");

-- CreateIndex
CREATE INDEX "HouseAccount_entityName_idx" ON "HouseAccount"("entityName");

-- CreateIndex
CREATE INDEX "ClosedDeal_partnerId_idx" ON "ClosedDeal"("partnerId");

-- CreateIndex
CREATE INDEX "SeatRecord_closedDealId_idx" ON "SeatRecord"("closedDealId");

-- CreateIndex
CREATE INDEX "SeatRecord_status_idx" ON "SeatRecord"("status");

-- CreateIndex
CREATE INDEX "CommissionEntry_partnerId_status_idx" ON "CommissionEntry"("partnerId", "status");

-- CreateIndex
CREATE INDEX "CommissionEntry_closedDealId_idx" ON "CommissionEntry"("closedDealId");

-- CreateIndex
CREATE UNIQUE INDEX "TenXOpsEngagement_closedDealId_key" ON "TenXOpsEngagement"("closedDealId");

-- CreateIndex
CREATE INDEX "TenXOpsEngagement_partnerId_status_idx" ON "TenXOpsEngagement"("partnerId", "status");

-- CreateIndex
CREATE INDEX "FocusGrant_partnerId_status_idx" ON "FocusGrant"("partnerId", "status");

-- CreateIndex
CREATE INDEX "RefundEvent_closedDealId_idx" ON "RefundEvent"("closedDealId");

-- CreateIndex
CREATE INDEX "QualityFlag_partnerId_idx" ON "QualityFlag"("partnerId");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnerApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerConfig" ADD CONSTRAINT "PartnerConfig_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationGateItem" ADD CONSTRAINT "ActivationGateItem_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardCheckpoint" ADD CONSTRAINT "ScorecardCheckpoint_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealRegistration" ADD CONSTRAINT "DealRegistration_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisteredAccount" ADD CONSTRAINT "RegisteredAccount_dealRegistrationId_fkey" FOREIGN KEY ("dealRegistrationId") REFERENCES "DealRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisteredAccount" ADD CONSTRAINT "RegisteredAccount_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosedDeal" ADD CONSTRAINT "ClosedDeal_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosedDeal" ADD CONSTRAINT "ClosedDeal_registeredAccountId_fkey" FOREIGN KEY ("registeredAccountId") REFERENCES "RegisteredAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatRecord" ADD CONSTRAINT "SeatRecord_closedDealId_fkey" FOREIGN KEY ("closedDealId") REFERENCES "ClosedDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_closedDealId_fkey" FOREIGN KEY ("closedDealId") REFERENCES "ClosedDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenXOpsEngagement" ADD CONSTRAINT "TenXOpsEngagement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenXOpsEngagement" ADD CONSTRAINT "TenXOpsEngagement_registeredAccountId_fkey" FOREIGN KEY ("registeredAccountId") REFERENCES "RegisteredAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenXOpsEngagement" ADD CONSTRAINT "TenXOpsEngagement_closedDealId_fkey" FOREIGN KEY ("closedDealId") REFERENCES "ClosedDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusGrant" ADD CONSTRAINT "FocusGrant_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundEvent" ADD CONSTRAINT "RefundEvent_closedDealId_fkey" FOREIGN KEY ("closedDealId") REFERENCES "ClosedDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityFlag" ADD CONSTRAINT "QualityFlag_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityFlag" ADD CONSTRAINT "QualityFlag_closedDealId_fkey" FOREIGN KEY ("closedDealId") REFERENCES "ClosedDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Seed the singleton ProgramConfig row (idempotent). All program defaults come
-- from column DEFAULTs, so every environment that runs this migration gets the
-- baseline config without a separate prod seed step. The app resolver also
-- self-heals this row if it is ever missing.
INSERT INTO "ProgramConfig" ("id", "updatedAt") VALUES ('singleton', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
