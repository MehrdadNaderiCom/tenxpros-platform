-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'PENDING_PAYMENT', 'ACTIVE', 'SUSPENDED', 'GRADUATED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'PENDING_REVIEW', 'ACCEPTED_AWAITING_PAYMENT', 'PAYMENT_UNDER_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PaymentReceiptStatus" AS ENUM ('SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AiExperienceLevel" AS ENUM ('BEGINNER', 'PRACTICAL', 'ADVANCED');

-- CreateEnum
CREATE TYPE "WeeklyAvailability" AS ENUM ('THREE_TO_FIVE', 'FIVE_TO_SEVEN', 'SEVEN_PLUS');

-- CreateEnum
CREATE TYPE "OfficeHourSlotStatus" AS ENUM ('OPEN', 'RESERVED', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OfficeHourBookingStatus" AS ENUM ('RESERVED', 'ZOOM_PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED_BY_MEMBER', 'CANCELLED_BY_ADMIN', 'NO_SHOW', 'NEEDS_ATTENTION');

-- CreateEnum
CREATE TYPE "SiteSettingType" AS ENUM ('STRING', 'INTEGER', 'BOOLEAN', 'JSON');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(32),
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "passwordHash" TEXT,
    "accessCodeHash" TEXT,
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "lastSignedInAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "ipHash" CHAR(64),
    "userAgent" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_expiry_after_creation_check" CHECK ("expiresAt" > "createdAt")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "referenceCode" VARCHAR(40) NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "professionalRole" VARCHAR(200) NOT NULL,
    "domain" VARCHAR(200) NOT NULL,
    "linkedinUrl" VARCHAR(500),
    "aiExperience" "AiExperienceLevel" NOT NULL,
    "motivation" TEXT NOT NULL,
    "realProblem" TEXT NOT NULL,
    "weeklyAvailability" "WeeklyAvailability" NOT NULL,
    "applicantNote" TEXT,
    "standardPriceToman" INTEGER NOT NULL DEFAULT 90000000,
    "offeredPriceToman" INTEGER NOT NULL DEFAULT 60000000,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "termsVersion" VARCHAR(40) NOT NULL,
    "termsAcceptedAt" TIMESTAMPTZ(3) NOT NULL,
    "privacyAcceptedAt" TIMESTAMPTZ(3),
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "acceptedAt" TIMESTAMPTZ(3),
    "activatedAt" TIMESTAMPTZ(3),
    "suspendedAt" TIMESTAMPTZ(3),
    "graduatedAt" TIMESTAMPTZ(3),
    "reviewerNote" TEXT,
    "source" VARCHAR(120),
    "utmSource" VARCHAR(120),
    "utmMedium" VARCHAR(120),
    "utmCampaign" VARCHAR(160),
    "ipHash" CHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewedById" TEXT,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Application_prices_check" CHECK (
        "standardPriceToman" > 0
        AND "offeredPriceToman" > 0
        AND "offeredPriceToman" <= "standardPriceToman"
    )
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "amountToman" INTEGER NOT NULL DEFAULT 60000000,
    "payerName" VARCHAR(200) NOT NULL,
    "paidAt" TIMESTAMPTZ(3) NOT NULL,
    "bankReference" VARCHAR(100) NOT NULL,
    "sourceLastFour" CHAR(4) NOT NULL,
    "applicantNote" TEXT,
    "storageKey" VARCHAR(500) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "status" "PaymentReceiptStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewerNote" TEXT,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "submittedById" TEXT,
    "reviewedById" TEXT,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentReceipt_amount_check" CHECK ("amountToman" > 0),
    CONSTRAINT "PaymentReceipt_size_check" CHECK ("byteSize" > 0),
    CONSTRAINT "PaymentReceipt_source_last_four_check" CHECK ("sourceLastFour" ~ '^[0-9]{4}$')
);

-- CreateTable
CREATE TABLE "OfficeHourSlot" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "OfficeHourSlotStatus" NOT NULL DEFAULT 'OPEN',
    "note" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "OfficeHourSlot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OfficeHourSlot_duration_check" CHECK (
        "endsAt" = "startsAt" + INTERVAL '30 minutes'
    )
);

-- CreateTable
CREATE TABLE "OfficeHourBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "iranWeekStartAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "OfficeHourBookingStatus" NOT NULL DEFAULT 'RESERVED',
    "zoomMeetingId" VARCHAR(100),
    "zoomMeetingUuid" VARCHAR(200),
    "zoomJoinUrl" TEXT,
    "zoomCreatedAt" TIMESTAMPTZ(3),
    "confirmationSentAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OfficeHourBooking_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OfficeHourBooking_iran_week_start_check" CHECK (
        EXTRACT(ISODOW FROM ("iranWeekStartAt" AT TIME ZONE 'Asia/Tehran')) = 6
        AND ("iranWeekStartAt" AT TIME ZONE 'Asia/Tehran')
            = date_trunc('day', "iranWeekStartAt" AT TIME ZONE 'Asia/Tehran')
    )
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "scope" VARCHAR(100) NOT NULL,
    "subjectHash" CHAR(64) NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "windowEnd" TIMESTAMPTZ(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "blockedUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RateLimitBucket_window_check" CHECK ("windowEnd" > "windowStart"),
    CONSTRAINT "RateLimitBucket_hit_count_check" CHECK ("hitCount" >= 0)
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" VARCHAR(160) NOT NULL,
    "value" TEXT NOT NULL,
    "type" "SiteSettingType" NOT NULL DEFAULT 'STRING',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_membershipStatus_idx" ON "User"("role", "membershipStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_revokedAt_idx" ON "Session"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_referenceCode_key" ON "Application"("referenceCode");

-- CreateIndex
CREATE INDEX "Application_email_createdAt_idx" ON "Application"("email", "createdAt");

-- CreateIndex
CREATE INDEX "Application_status_submittedAt_idx" ON "Application"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE INDEX "Application_reviewedById_idx" ON "Application"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_storageKey_key" ON "PaymentReceipt"("storageKey");

-- CreateIndex
CREATE INDEX "PaymentReceipt_applicationId_status_idx" ON "PaymentReceipt"("applicationId", "status");

-- CreateIndex
CREATE INDEX "PaymentReceipt_status_submittedAt_idx" ON "PaymentReceipt"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "PaymentReceipt_sha256_idx" ON "PaymentReceipt"("sha256");

-- CreateIndex
CREATE INDEX "PaymentReceipt_submittedById_idx" ON "PaymentReceipt"("submittedById");

-- CreateIndex
CREATE INDEX "PaymentReceipt_reviewedById_idx" ON "PaymentReceipt"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeHourSlot_startsAt_key" ON "OfficeHourSlot"("startsAt");

-- CreateIndex
CREATE INDEX "OfficeHourSlot_status_startsAt_idx" ON "OfficeHourSlot"("status", "startsAt");

-- CreateIndex
CREATE INDEX "OfficeHourSlot_createdById_idx" ON "OfficeHourSlot"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeHourBooking_slotId_key" ON "OfficeHourBooking"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeHourBooking_zoomMeetingId_key" ON "OfficeHourBooking"("zoomMeetingId");

-- CreateIndex
CREATE INDEX "OfficeHourBooking_iranWeekStartAt_status_idx" ON "OfficeHourBooking"("iranWeekStartAt", "status");

-- CreateIndex
CREATE INDEX "OfficeHourBooking_userId_status_idx" ON "OfficeHourBooking"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeHourBooking_userId_iranWeekStartAt_key" ON "OfficeHourBooking"("userId", "iranWeekStartAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_windowEnd_idx" ON "RateLimitBucket"("windowEnd");

-- CreateIndex
CREATE INDEX "RateLimitBucket_blockedUntil_idx" ON "RateLimitBucket"("blockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_scope_subjectHash_windowStart_key" ON "RateLimitBucket"("scope", "subjectHash", "windowStart");

-- CreateIndex
CREATE INDEX "SiteSetting_isPublic_idx" ON "SiteSetting"("isPublic");

-- CreateIndex
CREATE INDEX "SiteSetting_updatedById_idx" ON "SiteSetting"("updatedById");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeHourSlot" ADD CONSTRAINT "OfficeHourSlot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeHourBooking" ADD CONSTRAINT "OfficeHourBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeHourBooking" ADD CONSTRAINT "OfficeHourBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "OfficeHourSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSetting" ADD CONSTRAINT "SiteSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
