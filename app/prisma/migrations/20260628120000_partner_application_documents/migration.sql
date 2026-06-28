-- CreateEnum
CREATE TYPE "PartnerDocumentKind" AS ENUM ('RESUME', 'COVER_LETTER');

-- CreateTable
CREATE TABLE "PartnerApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" "PartnerDocumentKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerApplicationDocument_applicationId_kind_key" ON "PartnerApplicationDocument"("applicationId", "kind");

-- AddForeignKey
ALTER TABLE "PartnerApplicationDocument" ADD CONSTRAINT "PartnerApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

