-- Partner Toolkit: managed categories and external links/embeds.
--
-- Additive only. Nothing is dropped or renamed. Existing ToolkitPost rows keep
-- their free-text "category" string; a new nullable "categoryId" reference is
-- added and backfilled from that string, so no post loses its category. The
-- eight managed categories are inserted idempotently with deterministic ids so
-- this migration and the toolkit seed converge without clobbering later edits.

-- CreateTable
CREATE TABLE "ToolkitCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolkitCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolkitLink" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'LINK',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolkitLink_pkey" PRIMARY KEY ("id")
);

-- AlterTable (additive nullable reference; existing rows are unaffected)
ALTER TABLE "ToolkitPost" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ToolkitCategory_slug_key" ON "ToolkitCategory"("slug");

-- CreateIndex
CREATE INDEX "ToolkitCategory_isPublished_order_idx" ON "ToolkitCategory"("isPublished", "order");

-- CreateIndex
CREATE INDEX "ToolkitLink_postId_idx" ON "ToolkitLink"("postId");

-- CreateIndex
CREATE INDEX "ToolkitPost_categoryId_idx" ON "ToolkitPost"("categoryId");

-- AddForeignKey
ALTER TABLE "ToolkitPost" ADD CONSTRAINT "ToolkitPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ToolkitCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolkitLink" ADD CONSTRAINT "ToolkitLink_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ToolkitPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the eight managed categories with deterministic ids. Idempotent: a
-- re-run inserts nothing new, and it never overwrites a title the owner edited.
INSERT INTO "ToolkitCategory" ("id", "slug", "title", "description", "order", "isPublished", "createdAt", "updatedAt") VALUES
  ('tkcat_start_here',              'start-here',              'Start Here',                'What the toolkit is, how to use it, and the fastest path to your first good conversation.',          0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tkcat_positioning_brand',       'positioning-and-brand',   'Positioning and Brand',     'How to describe TenXPros truthfully and on brand, including what to say and what to avoid.',          1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tkcat_qualification_discovery', 'qualification-and-discovery', 'Qualification and Discovery', 'How to tell a real Pro from a beginner, and the discovery questions that surface a real problem.',  2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tkcat_outreach_templates',      'outreach-templates',      'Outreach Templates',        'Approved outreach and objection templates you personalize, never scripts to send blindly.',          3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tkcat_institutional_assets',    'institutional-assets',    'Institutional Assets',      'Materials for approaching an institution, where you sell a capability to a team rather than one person.', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tkcat_industry_packs',          'industry-packs',          'Industry Packs',            'Templates tailored to a sector or role, from universities to hospitals to owners and CEOs.',          5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tkcat_proof_dossier',           'proof-and-dossier',       'Proof and Dossier',         'How to use the reviewed dossier and the public sample as honest proof of what the program produces.', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tkcat_compliance_conduct',      'compliance-and-conduct',  'Compliance and Conduct',    'The guardrails: no price or discount outside approved materials, no promised outcomes, honest conduct.', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Backfill existing posts onto managed categories, only where not already set.
-- The two seeded free-text categories map cleanly; nothing else is touched.
UPDATE "ToolkitPost" SET "categoryId" = 'tkcat_outreach_templates'
  WHERE "category" = 'Generic assets' AND "categoryId" IS NULL;
UPDATE "ToolkitPost" SET "categoryId" = 'tkcat_industry_packs'
  WHERE "category" = 'Industry and role templates' AND "categoryId" IS NULL;
