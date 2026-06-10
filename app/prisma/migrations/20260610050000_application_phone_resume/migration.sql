-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "ApplicationResume" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationResume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationResume_applicationId_key" ON "ApplicationResume"("applicationId");

-- AddForeignKey
ALTER TABLE "ApplicationResume" ADD CONSTRAINT "ApplicationResume_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

