-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PROFESSIONAL', 'EMPLOYER', 'ADMIN', 'REVIEWER', 'INSTRUCTOR');

-- CreateEnum
CREATE TYPE "VisibilityStatus" AS ENUM ('PRIVATE', 'REVIEWERS_ONLY', 'EMPLOYER_VISIBLE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "CertificateLevel" AS ENUM ('L1_AI_READY', 'L2_AI_ADOPTED', 'L3_AI_AUGMENTED', 'L4_AI_IMPLEMENTER', 'L5_AI_LEADER');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ISSUED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('HUMAN_LED', 'AI_ASSISTED', 'RULES_BASED', 'AUTOMATED', 'AI_TOOL_CHAIN', 'ESCALATE', 'NOT_SUITABLE');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('BEFORE_AFTER_ARTIFACT', 'PROMPT_CHAIN', 'AI_WORKFLOW', 'REPORT', 'PRESENTATION', 'DOC_IMPROVEMENT', 'JOB_APPLICATION_IMPROVEMENT', 'AUTOMATION_DESIGN', 'SCENARIO_RESPONSE', 'DECISION_LOG', 'PORTFOLIO_LINK', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'NEEDS_REVISION', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'NEEDS_REVISION', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "EmployerRequestStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'FULFILLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RoleNeedStatus" AS ENUM ('OPEN', 'ON_HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('OFFERED', 'INTRODUCED', 'INTERVIEWING', 'DECLINED_BY_PRO', 'DECLINED_BY_EMPLOYER', 'CLOSED');

-- CreateEnum
CREATE TYPE "AIRunPurpose" AS ENUM ('DIAGNOSTIC_REPORT', 'TASK_CLASSIFICATION', 'LEARNING_RECOMMENDATION', 'SCENARIO_GENERATION', 'INTERVIEW_QUESTIONS', 'EVIDENCE_SUMMARY', 'CERTIFICATE_SUMMARY', 'CANDIDATE_SUMMARY', 'GENERIC');

-- CreateEnum
CREATE TYPE "AIRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "TaskFrequency" AS ENUM ('AD_HOC', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConfidentialityLevel" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PROFESSIONAL',
    "name" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ip" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT,
    "currentRole" TEXT,
    "targetRole" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "remotePreference" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workExperience" JSONB,
    "education" JSONB,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiToolsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "careerGoals" TEXT,
    "portfolioLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resumeUrl" TEXT,
    "linkedinUrl" TEXT,
    "githubUrl" TEXT,
    "websiteUrl" TEXT,
    "visibility" "VisibilityStatus" NOT NULL DEFAULT 'PRIVATE',
    "publicReady" BOOLEAN NOT NULL DEFAULT false,
    "readinessScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT,
    "size" TEXT,
    "location" TEXT,
    "website" TEXT,
    "description" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIReadinessDiagnostic" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "aiLiteracy" INTEGER NOT NULL,
    "toolFamiliarity" INTEGER NOT NULL,
    "prompting" INTEGER NOT NULL,
    "automationAwareness" INTEGER NOT NULL,
    "riskAwareness" INTEGER NOT NULL,
    "outputEvaluation" INTEGER NOT NULL,
    "roleSpecificUse" INTEGER NOT NULL,
    "englishComm" INTEGER NOT NULL,
    "jobSearchStatus" TEXT NOT NULL,
    "dailyTasks" TEXT NOT NULL,
    "painPoints" TEXT NOT NULL,
    "targetOutcomes" TEXT NOT NULL,
    "computedScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIReadinessDiagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIReadinessReport" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT[],
    "gaps" TEXT[],
    "recommendedTracks" TEXT[],
    "recommendedCertificate" "CertificateLevel" NOT NULL,
    "recommendedWorkflows" TEXT[],
    "recommendedArtifacts" TEXT[],
    "generatedByAI" BOOLEAN NOT NULL DEFAULT false,
    "aiRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIReadinessReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalTask" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "roleContext" TEXT,
    "frequency" "TaskFrequency" NOT NULL DEFAULT 'WEEKLY',
    "businessValue" INTEGER NOT NULL DEFAULT 3,
    "complexity" INTEGER NOT NULL DEFAULT 3,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "confidentiality" "ConfidentialityLevel" NOT NULL DEFAULT 'INTERNAL',
    "humanJudgment" INTEGER NOT NULL DEFAULT 3,
    "aiSuitability" INTEGER NOT NULL DEFAULT 3,
    "automationPotential" INTEGER NOT NULL DEFAULT 3,
    "recommendedMode" "WorkMode" NOT NULL DEFAULT 'AI_ASSISTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAIClassification" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "mode" "WorkMode" NOT NULL,
    "rationale" TEXT NOT NULL,
    "generatedByAI" BOOLEAN NOT NULL DEFAULT false,
    "aiRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAIClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningTrack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "audience" TEXT,
    "estimatedHours" INTEGER NOT NULL DEFAULT 4,
    "level" "CertificateLevel" NOT NULL DEFAULT 'L1_AI_READY',
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningModule" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 60,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "objectives" TEXT[],
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "certificateLevel" "CertificateLevel" NOT NULL DEFAULT 'L1_AI_READY',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeTask" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedDeliverable" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCompletion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "context" TEXT,
    "roleFocus" TEXT,
    "certificateLevel" "CertificateLevel" NOT NULL DEFAULT 'L1_AI_READY',
    "rubricId" TEXT,
    "lessonId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioSubmission" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "humanSteps" TEXT NOT NULL,
    "aiSteps" TEXT NOT NULL,
    "toolsUsed" TEXT[],
    "promptOutline" TEXT NOT NULL,
    "riskControls" TEXT NOT NULL,
    "reviewProcess" TEXT NOT NULL,
    "finalOutput" TEXT NOT NULL,
    "workModeChoice" "WorkMode" NOT NULL,
    "workModeReason" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScenarioSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceArtifact" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "description" TEXT NOT NULL,
    "roleContext" TEXT,
    "associatedTaskId" TEXT,
    "associatedScenarioId" TEXT,
    "aiToolsUsed" TEXT[],
    "humanContribution" TEXT NOT NULL,
    "aiContribution" TEXT NOT NULL,
    "risksConsidered" TEXT NOT NULL,
    "reviewNotes" TEXT,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "visibility" "VisibilityStatus" NOT NULL DEFAULT 'PRIVATE',
    "status" "EvidenceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceReview" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL DEFAULT 'APPROVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "level" "CertificateLevel" NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "evidenceSummary" TEXT,
    "assessmentScore" INTEGER,
    "roleFocus" TEXT,
    "reviewerNotes" TEXT,
    "revocationReason" TEXT,
    "verifyUrl" TEXT,
    "issuedByReviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publicProfileId" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateRequirement" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "satisfied" BOOLEAN NOT NULL DEFAULT false,
    "evidenceRef" TEXT,
    "notes" TEXT,

    CONSTRAINT "CertificateRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateReview" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicProfile" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "showContact" BOOLEAN NOT NULL DEFAULT false,
    "showCertificates" BOOLEAN NOT NULL DEFAULT true,
    "showEvidence" BOOLEAN NOT NULL DEFAULT true,
    "showSkills" BOOLEAN NOT NULL DEFAULT true,
    "workModesMastered" "WorkMode"[] DEFAULT ARRAY[]::"WorkMode"[],
    "featuredEvidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerRoleNeed" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "department" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "engagementType" TEXT,
    "budgetRange" TEXT,
    "skillsRequired" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiWorkModes" "WorkMode"[] DEFAULT ARRAY[]::"WorkMode"[],
    "taskExamples" TEXT,
    "aiAdoptionExpectations" TEXT,
    "minCertificateLevel" "CertificateLevel" NOT NULL DEFAULT 'L1_AI_READY',
    "status" "RoleNeedStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerRoleNeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleNeedId" TEXT,
    "professionalId" TEXT,
    "handledById" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "EmployerRequestStatus" NOT NULL DEFAULT 'NEW',
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerMatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleNeedId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'OFFERED',
    "score" DOUBLE PRECISION,
    "rationale" TEXT,
    "visibleToEmployer" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRunLog" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT,
    "purpose" "AIRunPurpose" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "promptInput" JSONB,
    "outputJson" JSONB,
    "outputText" TEXT,
    "status" "AIRunStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "costUsd" DECIMAL(10,4),
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_slug_key" ON "ProfessionalProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_userId_key" ON "OrganizationProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_slug_key" ON "OrganizationProfile"("slug");

-- CreateIndex
CREATE INDEX "AIReadinessDiagnostic_professionalId_idx" ON "AIReadinessDiagnostic"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "AIReadinessReport_diagnosticId_key" ON "AIReadinessReport"("diagnosticId");

-- CreateIndex
CREATE INDEX "AIReadinessReport_professionalId_idx" ON "AIReadinessReport"("professionalId");

-- CreateIndex
CREATE INDEX "ProfessionalTask_professionalId_idx" ON "ProfessionalTask"("professionalId");

-- CreateIndex
CREATE INDEX "TaskAIClassification_taskId_idx" ON "TaskAIClassification"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningTrack_slug_key" ON "LearningTrack"("slug");

-- CreateIndex
CREATE INDEX "LearningModule_trackId_idx" ON "LearningModule"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningModule_trackId_slug_key" ON "LearningModule"("trackId", "slug");

-- CreateIndex
CREATE INDEX "Lesson_moduleId_idx" ON "Lesson"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_moduleId_slug_key" ON "Lesson"("moduleId", "slug");

-- CreateIndex
CREATE INDEX "PracticeTask_lessonId_idx" ON "PracticeTask"("lessonId");

-- CreateIndex
CREATE INDEX "LessonCompletion_professionalId_idx" ON "LessonCompletion"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCompletion_lessonId_professionalId_key" ON "LessonCompletion"("lessonId", "professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_slug_key" ON "Scenario"("slug");

-- CreateIndex
CREATE INDEX "Scenario_rubricId_idx" ON "Scenario"("rubricId");

-- CreateIndex
CREATE INDEX "ScenarioSubmission_scenarioId_idx" ON "ScenarioSubmission"("scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioSubmission_professionalId_idx" ON "ScenarioSubmission"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Rubric_slug_key" ON "Rubric"("slug");

-- CreateIndex
CREATE INDEX "RubricCriterion_rubricId_idx" ON "RubricCriterion"("rubricId");

-- CreateIndex
CREATE INDEX "AssessmentReview_submissionId_idx" ON "AssessmentReview"("submissionId");

-- CreateIndex
CREATE INDEX "AssessmentReview_reviewerId_idx" ON "AssessmentReview"("reviewerId");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_professionalId_idx" ON "EvidenceArtifact"("professionalId");

-- CreateIndex
CREATE INDEX "EvidenceReview_evidenceId_idx" ON "EvidenceReview"("evidenceId");

-- CreateIndex
CREATE INDEX "EvidenceReview_reviewerId_idx" ON "EvidenceReview"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_publicId_key" ON "Certificate"("publicId");

-- CreateIndex
CREATE INDEX "Certificate_professionalId_idx" ON "Certificate"("professionalId");

-- CreateIndex
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");

-- CreateIndex
CREATE INDEX "CertificateRequirement_certificateId_idx" ON "CertificateRequirement"("certificateId");

-- CreateIndex
CREATE INDEX "CertificateReview_certificateId_idx" ON "CertificateReview"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicProfile_professionalId_key" ON "PublicProfile"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicProfile_slug_key" ON "PublicProfile"("slug");

-- CreateIndex
CREATE INDEX "EmployerRoleNeed_organizationId_idx" ON "EmployerRoleNeed"("organizationId");

-- CreateIndex
CREATE INDEX "EmployerRequest_organizationId_idx" ON "EmployerRequest"("organizationId");

-- CreateIndex
CREATE INDEX "EmployerMatch_organizationId_idx" ON "EmployerMatch"("organizationId");

-- CreateIndex
CREATE INDEX "EmployerMatch_professionalId_idx" ON "EmployerMatch"("professionalId");

-- CreateIndex
CREATE INDEX "AIRunLog_purpose_idx" ON "AIRunLog"("purpose");

-- CreateIndex
CREATE INDEX "AIRunLog_status_idx" ON "AIRunLog"("status");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReadinessDiagnostic" ADD CONSTRAINT "AIReadinessDiagnostic_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReadinessReport" ADD CONSTRAINT "AIReadinessReport_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "AIReadinessDiagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReadinessReport" ADD CONSTRAINT "AIReadinessReport_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalTask" ADD CONSTRAINT "ProfessionalTask_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAIClassification" ADD CONSTRAINT "TaskAIClassification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProfessionalTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningModule" ADD CONSTRAINT "LearningModule_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "LearningTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTask" ADD CONSTRAINT "PracticeTask_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioSubmission" ADD CONSTRAINT "ScenarioSubmission_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioSubmission" ADD CONSTRAINT "ScenarioSubmission_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentReview" ADD CONSTRAINT "AssessmentReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ScenarioSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentReview" ADD CONSTRAINT "AssessmentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceArtifact" ADD CONSTRAINT "EvidenceArtifact_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceReview" ADD CONSTRAINT "EvidenceReview_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceReview" ADD CONSTRAINT "EvidenceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_issuedByReviewerId_fkey" FOREIGN KEY ("issuedByReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_publicProfileId_fkey" FOREIGN KEY ("publicProfileId") REFERENCES "PublicProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateRequirement" ADD CONSTRAINT "CertificateRequirement_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateReview" ADD CONSTRAINT "CertificateReview_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateReview" ADD CONSTRAINT "CertificateReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicProfile" ADD CONSTRAINT "PublicProfile_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerRoleNeed" ADD CONSTRAINT "EmployerRoleNeed_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerRequest" ADD CONSTRAINT "EmployerRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerRequest" ADD CONSTRAINT "EmployerRequest_roleNeedId_fkey" FOREIGN KEY ("roleNeedId") REFERENCES "EmployerRoleNeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerRequest" ADD CONSTRAINT "EmployerRequest_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerRequest" ADD CONSTRAINT "EmployerRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerMatch" ADD CONSTRAINT "EmployerMatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerMatch" ADD CONSTRAINT "EmployerMatch_roleNeedId_fkey" FOREIGN KEY ("roleNeedId") REFERENCES "EmployerRoleNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerMatch" ADD CONSTRAINT "EmployerMatch_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRunLog" ADD CONSTRAINT "AIRunLog_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
