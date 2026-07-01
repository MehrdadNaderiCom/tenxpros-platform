-- CreateEnum
CREATE TYPE "AccountStage" AS ENUM ('REGISTERED', 'CONTACTED', 'MEETING', 'PROPOSAL', 'CONVERTING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "SpecialDealStatus" AS ENUM ('PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SpecialDealItemStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DiscussionStatus" AS ENUM ('PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnerSupportStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AlumniGroupKind" AS ENUM ('GENERAL', 'SPECIALIZED');

-- AlterEnum
ALTER TYPE "DealRegStatus" ADD VALUE 'NEEDS_REVISION';

-- AlterTable
ALTER TABLE "ParticipantProfile" ADD COLUMN     "alumniB2bIntroOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alumniPublicIntroOptIn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CertificationReview" ADD COLUMN     "field" TEXT,
ADD COLUMN     "specialization" TEXT;

-- AlterTable
ALTER TABLE "DealRegistration" ADD COLUMN     "revisionRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RegisteredAccount" ADD COLUMN     "stage" "AccountStage" NOT NULL DEFAULT 'REGISTERED';

-- AlterTable
ALTER TABLE "CommissionEntry" ADD COLUMN     "evidenceNote" TEXT;

-- AlterTable
ALTER TABLE "AcademyModule" ADD COLUMN     "isInformational" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DealMessage" (
    "id" TEXT NOT NULL,
    "dealRegistrationId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorRole" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountActivity" (
    "id" TEXT NOT NULL,
    "registeredAccountId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "stageAfter" "AccountStage",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDealRequest" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "dealRegistrationId" TEXT,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "status" "SpecialDealStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialDealRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDealRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SpecialDealItemStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpecialDealRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolkitPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "authorEmail" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolkitPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolkitFile" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolkitFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionPost" (
    "id" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorPartnerId" TEXT,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "category" TEXT,
    "status" "DiscussionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "moderatedByEmail" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSupportTicket" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "PartnerSupportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerSupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AlumniGroupKind" NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumniGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniMembership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumniMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniEvent" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumniEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealMessage_dealRegistrationId_idx" ON "DealMessage"("dealRegistrationId");

-- CreateIndex
CREATE INDEX "AccountActivity_registeredAccountId_idx" ON "AccountActivity"("registeredAccountId");

-- CreateIndex
CREATE INDEX "SpecialDealRequest_partnerId_status_idx" ON "SpecialDealRequest"("partnerId", "status");

-- CreateIndex
CREATE INDEX "SpecialDealRequestItem_requestId_idx" ON "SpecialDealRequestItem"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolkitPost_slug_key" ON "ToolkitPost"("slug");

-- CreateIndex
CREATE INDEX "ToolkitPost_isPublished_order_idx" ON "ToolkitPost"("isPublished", "order");

-- CreateIndex
CREATE INDEX "ToolkitFile_postId_idx" ON "ToolkitFile"("postId");

-- CreateIndex
CREATE INDEX "DiscussionPost_status_publishedAt_idx" ON "DiscussionPost"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "DiscussionComment_postId_idx" ON "DiscussionComment"("postId");

-- CreateIndex
CREATE INDEX "PartnerSupportTicket_partnerId_status_idx" ON "PartnerSupportTicket"("partnerId", "status");

-- CreateIndex
CREATE INDEX "AlumniMembership_participantId_idx" ON "AlumniMembership"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniMembership_groupId_participantId_key" ON "AlumniMembership"("groupId", "participantId");

-- AddForeignKey
ALTER TABLE "DealMessage" ADD CONSTRAINT "DealMessage_dealRegistrationId_fkey" FOREIGN KEY ("dealRegistrationId") REFERENCES "DealRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountActivity" ADD CONSTRAINT "AccountActivity_registeredAccountId_fkey" FOREIGN KEY ("registeredAccountId") REFERENCES "RegisteredAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDealRequest" ADD CONSTRAINT "SpecialDealRequest_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDealRequestItem" ADD CONSTRAINT "SpecialDealRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SpecialDealRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolkitFile" ADD CONSTRAINT "ToolkitFile_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ToolkitPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionComment" ADD CONSTRAINT "DiscussionComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "DiscussionPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSupportTicket" ADD CONSTRAINT "PartnerSupportTicket_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniMembership" ADD CONSTRAINT "AlumniMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AlumniGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniMembership" ADD CONSTRAINT "AlumniMembership_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ParticipantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniEvent" ADD CONSTRAINT "AlumniEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AlumniGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

