-- CreateEnum
CREATE TYPE "DiagnosticStatus" AS ENUM (
  'IN_PROGRESS',
  'SUBMITTED',
  'REVIEWED'
);

-- CreateEnum
CREATE TYPE "ProgramModuleStatus" AS ENUM (
  'IN_PROGRESS',
  'COMPLETED'
);

-- CreateEnum
CREATE TYPE "DossierStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED'
);

-- CreateEnum
CREATE TYPE "DossierReviewDecision" AS ENUM (
  'APPROVE',
  'REQUEST_CHANGES'
);

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM (
  'ISSUED',
  'REVOKED'
);

-- CreateTable
CREATE TABLE "Diagnostic" (
  "id" TEXT NOT NULL,
  "status" "DiagnosticStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "strategyScore" INTEGER,
  "workflowScore" INTEGER,
  "dataScore" INTEGER,
  "deliveryScore" INTEGER,
  "governanceScore" INTEGER,
  "primaryGoal" TEXT,
  "coreChallenge" TEXT,
  "evidenceContext" TEXT,
  "overallScore" INTEGER,
  "submittedAt" TIMESTAMPTZ(3),
  "reviewedAt" TIMESTAMPTZ(3),
  "reviewerNote" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "memberId" TEXT NOT NULL,
  "reviewedById" TEXT,

  CONSTRAINT "Diagnostic_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Diagnostic_scores_check" CHECK (
    ("strategyScore" IS NULL OR "strategyScore" BETWEEN 1 AND 5)
    AND ("workflowScore" IS NULL OR "workflowScore" BETWEEN 1 AND 5)
    AND ("dataScore" IS NULL OR "dataScore" BETWEEN 1 AND 5)
    AND ("deliveryScore" IS NULL OR "deliveryScore" BETWEEN 1 AND 5)
    AND ("governanceScore" IS NULL OR "governanceScore" BETWEEN 1 AND 5)
    AND ("overallScore" IS NULL OR "overallScore" BETWEEN 20 AND 100)
  ),
  CONSTRAINT "Diagnostic_overall_score_check" CHECK (
    "overallScore" IS NULL
    OR (
      "strategyScore" IS NOT NULL
      AND "workflowScore" IS NOT NULL
      AND "dataScore" IS NOT NULL
      AND "deliveryScore" IS NOT NULL
      AND "governanceScore" IS NOT NULL
      AND "overallScore" = (
        "strategyScore"
        + "workflowScore"
        + "dataScore"
        + "deliveryScore"
        + "governanceScore"
      ) * 4
    )
  ),
  CONSTRAINT "Diagnostic_submission_check" CHECK (
    "status" = 'IN_PROGRESS'::"DiagnosticStatus"
    OR (
      "strategyScore" IS NOT NULL
      AND "workflowScore" IS NOT NULL
      AND "dataScore" IS NOT NULL
      AND "deliveryScore" IS NOT NULL
      AND "governanceScore" IS NOT NULL
      AND "overallScore" IS NOT NULL
      AND "submittedAt" IS NOT NULL
      AND "primaryGoal" IS NOT NULL
      AND "coreChallenge" IS NOT NULL
      AND "evidenceContext" IS NOT NULL
      AND char_length(btrim("primaryGoal")) >= 40
      AND char_length(btrim("coreChallenge")) >= 40
      AND char_length(btrim("evidenceContext")) >= 30
    )
  ),
  CONSTRAINT "Diagnostic_review_check" CHECK (
    (
      "status" = 'REVIEWED'::"DiagnosticStatus"
      AND "reviewedAt" IS NOT NULL
      AND "reviewedById" IS NOT NULL
      AND "reviewerNote" IS NOT NULL
      AND char_length(btrim("reviewerNote")) >= 20
    )
    OR (
      "status" <> 'REVIEWED'::"DiagnosticStatus"
      AND "reviewedAt" IS NULL
      AND "reviewedById" IS NULL
    )
  )
);

-- CreateTable
CREATE TABLE "ProgramModuleProgress" (
  "id" TEXT NOT NULL,
  "moduleNumber" INTEGER NOT NULL,
  "status" "ProgramModuleStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "reflection" TEXT,
  "evidenceUrl" VARCHAR(500),
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "memberId" TEXT NOT NULL,

  CONSTRAINT "ProgramModuleProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProgramModuleProgress_number_check" CHECK (
    "moduleNumber" BETWEEN 1 AND 11
  ),
  CONSTRAINT "ProgramModuleProgress_completion_check" CHECK (
    (
      "status" = 'IN_PROGRESS'::"ProgramModuleStatus"
      AND "completedAt" IS NULL
    )
    OR (
      "status" = 'COMPLETED'::"ProgramModuleStatus"
      AND "completedAt" IS NOT NULL
      AND "completedAt" >= "startedAt"
      AND "reflection" IS NOT NULL
      AND char_length(btrim("reflection")) >= 40
    )
  )
);

-- CreateTable
CREATE TABLE "Dossier" (
  "id" TEXT NOT NULL,
  "status" "DossierStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMPTZ(3),
  "approvedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "memberId" TEXT NOT NULL,

  CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Dossier_status_dates_check" CHECK (
    (
      "status" = 'DRAFT'::"DossierStatus"
      AND "submittedAt" IS NULL
      AND "approvedAt" IS NULL
    )
    OR (
      "status" IN (
        'SUBMITTED'::"DossierStatus",
        'CHANGES_REQUESTED'::"DossierStatus"
      )
      AND "submittedAt" IS NOT NULL
      AND "approvedAt" IS NULL
    )
    OR (
      "status" = 'APPROVED'::"DossierStatus"
      AND "submittedAt" IS NOT NULL
      AND "approvedAt" IS NOT NULL
      AND "approvedAt" >= "submittedAt"
    )
  )
);

-- CreateTable
CREATE TABLE "DossierSection" (
  "id" TEXT NOT NULL,
  "sectionNumber" INTEGER NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "evidenceUrl" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "dossierId" TEXT NOT NULL,

  CONSTRAINT "DossierSection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DossierSection_number_check" CHECK (
    "sectionNumber" BETWEEN 1 AND 12
  ),
  CONSTRAINT "DossierSection_content_length_check" CHECK (
    char_length("content") <= 12000
  )
);

-- CreateTable
CREATE TABLE "DossierReview" (
  "id" TEXT NOT NULL,
  "decision" "DossierReviewDecision" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dossierId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,

  CONSTRAINT "DossierReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DossierReview_note_check" CHECK (
    "decision" = 'APPROVE'::"DossierReviewDecision"
    OR (
      "note" IS NOT NULL
      AND char_length(btrim("note")) >= 20
    )
  )
);

-- CreateTable
CREATE TABLE "Credential" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "recipientName" VARCHAR(200) NOT NULL,
  "certificationTitle" VARCHAR(200) NOT NULL,
  "status" "CredentialStatus" NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMPTZ(3),
  "revocationReason" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "memberId" TEXT NOT NULL,
  "dossierId" TEXT NOT NULL,
  "issuedById" TEXT NOT NULL,

  CONSTRAINT "Credential_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Credential_code_check" CHECK (
    "code" ~ '^DBC-IR-[0-9]{4}-[A-F0-9]{12}$'
  ),
  CONSTRAINT "Credential_status_check" CHECK (
    (
      "status" = 'ISSUED'::"CredentialStatus"
      AND "revokedAt" IS NULL
      AND "revocationReason" IS NULL
    )
    OR (
      "status" = 'REVOKED'::"CredentialStatus"
      AND "revokedAt" IS NOT NULL
      AND "revokedAt" >= "issuedAt"
      AND "revocationReason" IS NOT NULL
      AND char_length(btrim("revocationReason")) >= 20
    )
  )
);

-- CreateIndex
CREATE UNIQUE INDEX "Diagnostic_memberId_key"
ON "Diagnostic"("memberId");

-- CreateIndex
CREATE INDEX "Diagnostic_status_submittedAt_idx"
ON "Diagnostic"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "Diagnostic_reviewedById_idx"
ON "Diagnostic"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramModuleProgress_memberId_moduleNumber_key"
ON "ProgramModuleProgress"("memberId", "moduleNumber");

-- CreateIndex
CREATE INDEX "ProgramModuleProgress_memberId_status_idx"
ON "ProgramModuleProgress"("memberId", "status");

-- CreateIndex
CREATE INDEX "ProgramModuleProgress_status_completedAt_idx"
ON "ProgramModuleProgress"("status", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_memberId_key"
ON "Dossier"("memberId");

-- CreateIndex
CREATE INDEX "Dossier_status_updatedAt_idx"
ON "Dossier"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DossierSection_dossierId_sectionNumber_key"
ON "DossierSection"("dossierId", "sectionNumber");

-- CreateIndex
CREATE INDEX "DossierSection_dossierId_updatedAt_idx"
ON "DossierSection"("dossierId", "updatedAt");

-- CreateIndex
CREATE INDEX "DossierReview_dossierId_createdAt_idx"
ON "DossierReview"("dossierId", "createdAt");

-- CreateIndex
CREATE INDEX "DossierReview_reviewerId_createdAt_idx"
ON "DossierReview"("reviewerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_code_key"
ON "Credential"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_memberId_key"
ON "Credential"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_dossierId_key"
ON "Credential"("dossierId");

-- CreateIndex
CREATE INDEX "Credential_status_issuedAt_idx"
ON "Credential"("status", "issuedAt");

-- CreateIndex
CREATE INDEX "Credential_issuedById_issuedAt_idx"
ON "Credential"("issuedById", "issuedAt");

-- AddForeignKey
ALTER TABLE "Diagnostic"
ADD CONSTRAINT "Diagnostic_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic"
ADD CONSTRAINT "Diagnostic_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramModuleProgress"
ADD CONSTRAINT "ProgramModuleProgress_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier"
ADD CONSTRAINT "Dossier_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierSection"
ADD CONSTRAINT "DossierSection_dossierId_fkey"
FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierReview"
ADD CONSTRAINT "DossierReview_dossierId_fkey"
FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierReview"
ADD CONSTRAINT "DossierReview_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential"
ADD CONSTRAINT "Credential_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential"
ADD CONSTRAINT "Credential_dossierId_fkey"
FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential"
ADD CONSTRAINT "Credential_issuedById_fkey"
FOREIGN KEY ("issuedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
