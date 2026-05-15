-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('APPLICANT', 'PARTICIPANT', 'COACH', 'ADMIN');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REVISE_AND_REAPPLY', 'NOT_ACCEPTED', 'ENROLLED');

-- CreateEnum
CREATE TYPE "AIExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "DataSensitivity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TimeAvailability" AS ENUM ('HOURS_5', 'HOURS_8', 'HOURS_12_PLUS');

-- CreateEnum
CREATE TYPE "CharterTier" AS ENUM ('FOUNDING', 'EARLY', 'LATE', 'FINAL', 'STANDARD');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('ONBOARDING', 'DIAGNOSTIC_PENDING', 'ACTIVE', 'CAPSTONE', 'UNDER_REVIEW', 'CERTIFIED', 'CONDITIONALLY_CERTIFIED', 'COMPLETED_NOT_CERTIFIED', 'NOT_COMPLETED', 'PAUSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "StakeholderComplexity" AS ENUM ('SOLO', 'SMALL_TEAM', 'DEPARTMENT', 'MULTI_STAKEHOLDER');

-- CreateEnum
CREATE TYPE "RegulatoryWeight" AS ENUM ('LIGHT', 'MODERATE', 'HEAVY');

-- CreateEnum
CREATE TYPE "OutputType" AS ENUM ('INTERNAL', 'CLIENT_FACING', 'PUBLIC_FACING', 'REGULATED');

-- CreateEnum
CREATE TYPE "ProgramPhase" AS ENUM ('FRAME', 'DESIGN', 'PROVE', 'FORESEE');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'SUBMITTED', 'PASSED', 'REVISE', 'REMEDIAL', 'HOLD');

-- CreateEnum
CREATE TYPE "ModuleEmphasis" AS ENUM ('LIGHT', 'STANDARD', 'EXTENDED');

-- CreateEnum
CREATE TYPE "DossierSectionType" AS ENUM ('PROFESSIONAL_CONTEXT', 'PROBLEM_DEFINITION', 'AI_SUITABILITY', 'CONTEXT_STAKEHOLDER_FORESIGHT', 'DATA_EVIDENCE', 'WORKFLOW_BEFORE_AFTER', 'RISK_ETHICS_PRIVACY', 'RESPONSIBLE_SOLUTION_DESIGN', 'ADOPTION_COMMUNICATION', 'VALUE_ROADMAP_PROOF', 'PERSONAL_FORESIGHT_PLAN', 'FINAL_RECOMMENDATION');

-- CreateEnum
CREATE TYPE "DossierSectionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'REVISED', 'APPROVED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('MODULE_QUESTION', 'DOSSIER_HELP', 'AI_SUITABILITY', 'EVIDENCE', 'WORKFLOW', 'FORESIGHT', 'CAPSTONE', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'WAITING_RESPONSE', 'AWAITING_PARTICIPANT', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('MILESTONE', 'GENERAL', 'REVISION_REQUEST', 'APPROVAL');

-- CreateEnum
CREATE TYPE "CertificationOutcome" AS ENUM ('CERTIFIED', 'CONDITIONALLY_CERTIFIED', 'COMPLETED_NOT_CERTIFIED', 'NOT_COMPLETED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MODULE_UNLOCKED', 'COACH_FEEDBACK', 'REVISION_REQUESTED', 'TICKET_RESPONSE', 'CERTIFICATION_DECISION', 'DOSSIER_REVIEWED', 'BADGE_EARNED', 'ANNOUNCEMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('MODULE', 'RANK', 'CAPSTONE', 'SPECIAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'APPLICANT',
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "professionalRole" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "aiExperience" "AIExperienceLevel" NOT NULL,
    "whyTenXPros" TEXT NOT NULL,
    "realProblemBrief" TEXT NOT NULL,
    "dataSensitivity" "DataSensitivity" NOT NULL,
    "timeAvailability" "TimeAvailability" NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'English',
    "consentConfidentiality" BOOLEAN NOT NULL DEFAULT false,
    "consentTerms" BOOLEAN NOT NULL DEFAULT false,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "pricingTierAtApply" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "referrerUrl" TEXT,
    "landingPage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "CharterTier" NOT NULL,
    "cohortNumber" INTEGER,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expectedEndAt" TIMESTAMP(3) NOT NULL,
    "assignedCoachId" TEXT,
    "coachAssignedAt" TIMESTAMP(3),
    "starterPackCompletedAt" TIMESTAMP(3),
    "status" "ParticipantStatus" NOT NULL DEFAULT 'ONBOARDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticIntake" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "riskProfile" "DataSensitivity",
    "domainRecognition" TEXT,
    "solutionPatternHint" TEXT,
    "aiLiteracyLevel" "AIExperienceLevel",
    "stakeholderComplexity" "StakeholderComplexity",
    "industryRegulatoryWeight" "RegulatoryWeight",
    "timeAvailability" "TimeAvailability",
    "outputType" "OutputType",
    "problemContext" TEXT,
    "problemClarity" TEXT,
    "successCriteria" TEXT,
    "organizationalContext" TEXT,
    "goals" TEXT,
    "supportNeeds" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramPath" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "customizationNotes" TEXT,
    "generatedAt" TIMESTAMP(3),
    "approvedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "phase" "ProgramPhase" NOT NULL,
    "title" TEXT NOT NULL,
    "coreQuestion" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "learningObjectives" JSONB NOT NULL,
    "contentMaterials" JSONB NOT NULL,
    "exercises" JSONB NOT NULL,
    "artifactTemplate" TEXT NOT NULL,
    "passCriteria" TEXT NOT NULL,
    "badgeName" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantModule" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" "ModuleStatus" NOT NULL DEFAULT 'LOCKED',
    "unlockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "passedAt" TIMESTAMP(3),
    "artifactContent" TEXT,
    "artifactUrl" TEXT,
    "coachFeedback" TEXT,
    "feedbackAt" TIMESTAMP(3),
    "feedbackBy" TEXT,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "badgeEarned" BOOLEAN NOT NULL DEFAULT false,
    "customizationNotes" TEXT,
    "emphasisLevel" "ModuleEmphasis" NOT NULL DEFAULT 'STANDARD',
    "additionalReadings" JSONB,
    "moduleVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierSection" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "sectionType" "DossierSectionType" NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "DossierSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "lastEditedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DossierSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedToId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "dossierSectionId" TEXT,
    "type" "FeedbackType" NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationReview" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "outcome" "CertificationOutcome" NOT NULL,
    "rubricScores" JSONB NOT NULL,
    "reviewerNotes" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "badgeIssuedAt" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "photoUrl" TEXT,
    "location" TEXT,
    "languages" TEXT[],
    "availability" "AvailabilityStatus" NOT NULL DEFAULT 'NOT_AVAILABLE',
    "availableFor" TEXT[],
    "linkedinUrl" TEXT,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "CharterTier" NOT NULL,
    "price" INTEGER NOT NULL,
    "membersLimit" INTEGER NOT NULL,
    "membersCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "benefits" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "participantId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripeSessionId" TEXT,
    "stripeChargeId" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "url" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "iconUrl" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "contextType" TEXT,
    "contextRef" TEXT,

    CONSTRAINT "ParticipantBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_key" ON "Application"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantProfile_userId_key" ON "ParticipantProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticIntake_participantId_key" ON "DiagnosticIntake"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramPath_participantId_key" ON "ProgramPath"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_number_version_key" ON "Module"("number", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantModule_participantId_moduleId_key" ON "ParticipantModule"("participantId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_participantId_key" ON "Dossier"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "DossierSection_dossierId_sectionType_key" ON "DossierSection"("dossierId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationReview_participantId_key" ON "CertificationReview"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryProfile_userId_key" ON "DirectoryProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryProfile_slug_key" ON "DirectoryProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PricingTier_name_key" ON "PricingTier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_stripeSessionId_key" ON "PaymentRecord"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_stripeChargeId_key" ON "PaymentRecord"("stripeChargeId");

-- CreateIndex
CREATE INDEX "SiteEvent_eventType_idx" ON "SiteEvent"("eventType");

-- CreateIndex
CREATE INDEX "SiteEvent_userId_idx" ON "SiteEvent"("userId");

-- CreateIndex
CREATE INDEX "SiteEvent_createdAt_idx" ON "SiteEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantBadge_verificationCode_key" ON "ParticipantBadge"("verificationCode");

-- CreateIndex
CREATE INDEX "ParticipantBadge_verificationCode_idx" ON "ParticipantBadge"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantBadge_userId_badgeId_key" ON "ParticipantBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSetting_key_key" ON "AdminSetting"("key");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantProfile" ADD CONSTRAINT "ParticipantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantProfile" ADD CONSTRAINT "ParticipantProfile_assignedCoachId_fkey" FOREIGN KEY ("assignedCoachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticIntake" ADD CONSTRAINT "DiagnosticIntake_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ParticipantProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramPath" ADD CONSTRAINT "ProgramPath_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ParticipantProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantModule" ADD CONSTRAINT "ParticipantModule_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ParticipantProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantModule" ADD CONSTRAINT "ParticipantModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ParticipantProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierSection" ADD CONSTRAINT "DossierSection_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_dossierSectionId_fkey" FOREIGN KEY ("dossierSectionId") REFERENCES "DossierSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationReview" ADD CONSTRAINT "CertificationReview_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ParticipantProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryProfile" ADD CONSTRAINT "DirectoryProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ParticipantProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantBadge" ADD CONSTRAINT "ParticipantBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantBadge" ADD CONSTRAINT "ParticipantBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
