-- CreateEnum
CREATE TYPE "AcademyQuestionPool" AS ENUM ('EXERCISE', 'EXAM');

-- CreateTable
CREATE TABLE "AcademyModule" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "passMark" INTEGER NOT NULL DEFAULT 80,
    "examSize" INTEGER NOT NULL DEFAULT 10,
    "examCooldownHours" INTEGER NOT NULL DEFAULT 24,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audioText" TEXT NOT NULL,

    CONSTRAINT "AcademyLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyQuestion" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "pool" "AcademyQuestionPool" NOT NULL,
    "order" INTEGER NOT NULL,
    "stem" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "AcademyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyProgress" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "lessonReadAt" TIMESTAMP(3),
    "exercisesDone" BOOLEAN NOT NULL DEFAULT false,
    "examPassed" BOOLEAN NOT NULL DEFAULT false,
    "bestExamScore" INTEGER NOT NULL DEFAULT 0,
    "examAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyExerciseAttempt" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "selected" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyExerciseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyExamSitting" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "questionIds" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "AcademyExamSitting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAcademyBadge" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serial" TEXT NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "PartnerAcademyBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermsVersion" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3) NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "changelog" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermsVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'subscribed',
    "source" TEXT NOT NULL DEFAULT 'homepage',
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "unsubToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterGroupOnSubscriber" (
    "subscriberId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "NewsletterGroupOnSubscriber_pkey" PRIMARY KEY ("subscriberId","groupId")
);

-- CreateTable
CREATE TABLE "NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "targetGroupIds" JSONB NOT NULL,
    "targetSubscriberIds" JSONB NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademyModule_slug_key" ON "AcademyModule"("slug");

-- CreateIndex
CREATE INDEX "AcademyModule_order_idx" ON "AcademyModule"("order");

-- CreateIndex
CREATE INDEX "AcademyLesson_moduleId_order_idx" ON "AcademyLesson"("moduleId", "order");

-- CreateIndex
CREATE INDEX "AcademyQuestion_moduleId_pool_idx" ON "AcademyQuestion"("moduleId", "pool");

-- CreateIndex
CREATE INDEX "AcademyProgress_partnerId_idx" ON "AcademyProgress"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyProgress_partnerId_moduleId_key" ON "AcademyProgress"("partnerId", "moduleId");

-- CreateIndex
CREATE INDEX "AcademyExerciseAttempt_partnerId_questionId_idx" ON "AcademyExerciseAttempt"("partnerId", "questionId");

-- CreateIndex
CREATE INDEX "AcademyExamSitting_partnerId_moduleId_idx" ON "AcademyExamSitting"("partnerId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAcademyBadge_partnerId_key" ON "PartnerAcademyBadge"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAcademyBadge_serial_key" ON "PartnerAcademyBadge"("serial");

-- CreateIndex
CREATE INDEX "TermsVersion_audience_isCurrent_idx" ON "TermsVersion"("audience", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "TermsVersion_year_audience_key" ON "TermsVersion"("year", "audience");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubToken_key" ON "NewsletterSubscriber"("unsubToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterGroup_name_key" ON "NewsletterGroup"("name");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_status_idx" ON "NewsletterCampaign"("status");

-- AddForeignKey
ALTER TABLE "AcademyLesson" ADD CONSTRAINT "AcademyLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "AcademyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyQuestion" ADD CONSTRAINT "AcademyQuestion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "AcademyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyProgress" ADD CONSTRAINT "AcademyProgress_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyProgress" ADD CONSTRAINT "AcademyProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "AcademyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyExerciseAttempt" ADD CONSTRAINT "AcademyExerciseAttempt_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyExerciseAttempt" ADD CONSTRAINT "AcademyExerciseAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AcademyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyExamSitting" ADD CONSTRAINT "AcademyExamSitting_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyExamSitting" ADD CONSTRAINT "AcademyExamSitting_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "AcademyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAcademyBadge" ADD CONSTRAINT "PartnerAcademyBadge_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterGroupOnSubscriber" ADD CONSTRAINT "NewsletterGroupOnSubscriber_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterGroupOnSubscriber" ADD CONSTRAINT "NewsletterGroupOnSubscriber_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "NewsletterGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

