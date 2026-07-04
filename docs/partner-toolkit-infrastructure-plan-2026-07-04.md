# Partner Toolkit infrastructure upgrade, precise plan

**Date:** 2026-07-04
**Scope owner decision this implements:** two independent expert reviews converged on organizing the toolkit around the partner journey, quality over quantity, prominent brand and compliance guardrails, and clear top level categories. The hard requirement: the superadmin must be able to grow and reorganize the toolkit from the website forever, with no future code change.

## Strict scope (what this plan will and will not touch)

In scope, the Partner Toolkit feature only:

- Data: `ToolkitPost`, `ToolkitFile`, and two new additive models `ToolkitCategory` and `ToolkitLink`.
- Admin pages under `src/app/(admin)/admin/partners/toolkit/**`.
- Partner view under `src/app/(partner)/partner/toolkit/**`.
- Toolkit server actions in `src/lib/actions/toolkit.ts` and toolkit validations in `src/lib/validations/partner.ts` (only the toolkit section).
- The toolkit seed `prisma/seed/toolkit/seed-toolkit.ts`.
- The file API route `src/app/api/toolkit/files/[id]/route.ts` (only if strictly needed; expected untouched).
- One new safe render component for embeds under `src/components/portal/`.

The single allowed change outside the toolkit feature: a small, additive "New" badge on the Partner Toolkit entry in the partner portal navigation (`src/components/shared/partner-nav.tsx`). Nothing else outside the toolkit will be modified. If anything appears to require a change outside this list, I will stop and record it in the report rather than do it.

Explicitly not touched: academy lessons and exams (including the two academy modules that already mention the toolkit in their content), the commission engine, program config, pricing, the public marketing site, and any other admin or partner page.

## Current state (verified by reading the code)

- `ToolkitPost` fields: `id, slug (unique), title, bodyHtml (Text), category (String, default "General"), isPublished (default true), authorEmail, order, files, createdAt, updatedAt`, index on `(isPublished, order)`.
- `ToolkitFile` fields: `id, postId (nullable), post (cascade), filename, mimeType, size, data (Bytes), createdAt`, index on `postId`. Bytes are stored in Postgres.
- Category today is a free text string. The only consumers of `ToolkitPost.category` in the whole codebase are the toolkit admin and partner pages (list grouping, a badge, the editor input). Nothing outside the toolkit reads it, so replacing the free text with a managed reference stays inside the feature.
- Seed has 5 posts in 2 free text categories: "Generic assets" (1 post: outreach and objection templates, extracted verbatim from academy Module 14) and "Industry and role templates" (4 posts: universities, hospitals, individual expert, owner or CEO).
- Body HTML is sanitized on save by the shared `sanitizeLessonHtml` allowlist. That allowlist does not include `iframe`, `video`, `embed`, or `object`. Raw embeds pasted into a body would be stripped. This is the key constraint behind the embed design below.
- Guards: admin pages call `requireAdminUser` then check `isSuperAdmin(email)`; server actions call `requireSuperAdmin()`. Every write is audited through `recordAudit` (free string action, shared `AuditLog`) and revalidates `/admin/partners/toolkit` and `/partner/toolkit`.
- File download route: admin gets any file; a non admin must be an ACTIVE partner and the parent post must be published.
- Gate tooling: `pnpm typecheck` (tsc), `pnpm lint:content` (forbids only U+2014 em dash, U+2013 en dash, U+2015 horizontal bar, U+2212 minus sign, across `src` and `prisma/seed`), `pnpm test` (vitest, 32 unit test files, no DB needed), the content dump validation `pnpm exec tsx scripts/dump-content.ts` (validates academy modules, terms, newsletter groups only, the toolkit is not part of it), and `pnpm build` (runs the dash lint then `next build`).
- Environment note: no database is reachable in this working environment (`localhost:5433` is down) and the Prisma client is not generated. Consequences for the build: the migration will be hand authored to match the schema exactly (standard Prisma practice, and it is a brand new migration so no applied migration is edited), `prisma generate` will be run offline so tsc sees the new models, and `prisma migrate deploy` is left for a reachable database at the owner's deploy step. This is called out in the final report.

## Design decisions

### 1. Managed categories (`ToolkitCategory`)

New additive model:

```
model ToolkitCategory {
  id          String        @id @default(cuid())
  slug        String        @unique
  title       String
  description String?        @db.Text
  order       Int           @default(0)
  isPublished Boolean       @default(true)
  posts       ToolkitPost[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  @@index([isPublished, order])
}
```

`ToolkitPost` gains an additive nullable reference. The existing free text `category` column stays (never dropped, so nothing breaks and no data is lost); it becomes a legacy label kept in sync on save:

```
categoryId  String?
categoryRef ToolkitCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
@@index([categoryId])
```

On post save, `categoryId` is set from the dropdown and the legacy `category` string is set to the chosen category title, so any code still reading `.category` keeps working and stays consistent. Deleting a category sets posts' `categoryId` to null rather than deleting posts (SetNull), and the admin delete action additionally guards against deleting a category that still has posts.

The superadmin can create, rename, describe, reorder, publish or unpublish, and delete categories from the admin UI, and pick a category from a dropdown when editing a post.

### 2. Rich attachments, external links and embeds, and video (`ToolkitLink`)

Confirmed today: images and PDFs and documents and slide decks exported to PDF already work as `ToolkitFile` uploads (15 MB each, up to 10 per save, bytes in Postgres). What is missing is a first class way to carry external links and embeds, above all video, without pushing large media through the database blob column.

New additive model, mirroring the `ToolkitFile` shape so the admin UX is consistent (add or remove rows):

```
model ToolkitLink {
  id        String       @id @default(cuid())
  postId    String
  post      ToolkitPost  @relation(fields: [postId], references: [id], onDelete: Cascade)
  title     String
  url       String
  kind      String       @default("LINK")   // LINK | VIDEO | SLIDES | DOC, validated in the app
  order     Int          @default(0)
  createdAt DateTime     @default(now())
  @@index([postId])
}
```

`kind` is a plain string validated by a zod enum in the app, rather than a Prisma enum, to keep the migration small and additive.

Embed safety (this is the core of the design): embeds are never raw HTML in the body. They are structured records rendered by a dedicated component `ToolkitEmbeds`. For a short allowlist of known providers the component builds a sanitized iframe whose `src` is assembled from an id it extracts with a strict character class, never from the raw user string:

- YouTube (`youtube.com/watch?v=`, `youtu.be/`, `/embed/`) to `https://www.youtube-nocookie.com/embed/{id}`, id `[A-Za-z0-9_-]{11}`.
- Vimeo to `https://player.vimeo.com/video/{id}`, id `\d+`.
- Loom (`/share/{id}` or `/embed/{id}`) to `https://www.loom.com/embed/{id}`, id `[A-Za-z0-9]+`.
- Google Slides to `https://docs.google.com/presentation/d/{id}/embed`, id `[A-Za-z0-9_-]+`.
- Google Drive file to `https://drive.google.com/file/d/{id}/preview`.

Anything not matched renders as a plain, safe link card (opens in a new tab, `rel="noopener noreferrer"`). Every URL is validated server side on save (`new URL()`, https only, host checked for embeds). Because the iframe `src` is a template built only from a validated id, there is no path for script injection, and the shared academy sanitizer is not touched.

File size limit decision: keep 15 MB per uploaded file, and route video and very large decks to the link or embed field. Rationale kept honest and simple: the upload column is a Postgres `Bytes` blob that is read fully into memory on download, which is the wrong tier for video and large media, while 15 MB comfortably covers images, PDFs, and slide decks exported to PDF. Video and big decks belong on a streaming or document host (YouTube, Vimeo, Loom, Drive, Google Slides) and ride in through the new link and embed field. Net result: from the website the superadmin can compose a single post that mixes rich text, images, an embedded or linked video, a slide deck, and downloadable PDFs.

### 3. The eight seeded categories

Seeded as the initial managed set, each with a clear one line description written in the honest TenXPros voice:

1. Start Here
2. Positioning and Brand
3. Qualification and Discovery
4. Outreach Templates
5. Institutional Assets
6. Industry Packs
7. Proof and Dossier
8. Compliance and Conduct

The exact descriptions are authored in the seed, dash clean, no hype.

### 4. Partner facing view, reorganized around the journey

- A short "three paths" entry at the top: I found an individual, I found an institution, I want to promote. Each is a card that jumps (anchor link) to the categories most relevant to that path. Clean, not a wall of links.
- Categories in sorted order, each with its title and description, then the posts inside it as cards. Only published categories and, within them, only published posts are shown.
- A published category with no published posts yet shows its description and one honest line that resources are being added, so the journey structure is visible and the toolkit reads as a living resource rather than a set of dead ends.
- Living resource framing in the page header, honest voice: valuable now, and it keeps getting better, we add to it regularly, revisit often.
- On a post page: the body, then a downloads section for files, then a watch and view section that renders the links and embeds through `ToolkitEmbeds`. A post is reachable only if it is published and its category is either null (legacy) or published, so an unpublished category never leaks a post.

### 5. Admin category management UI

New superadmin only page `src/app/(admin)/admin/partners/toolkit/categories/page.tsx`, reusing existing admin form patterns (Card, Field, Input, Textarea, Button, ConfirmDialog), offering: create, rename, describe, set order via move up and move down (swap the order value with the adjacent category, deterministic, no drag and drop dependency), publish or unpublish, and delete with a guard that refuses while the category still has posts and explains why. The main toolkit admin page groups posts by managed category in order (with an ungrouped bucket if any legacy post is still unmapped) and links to the category manager. The post editor swaps the free text category input for a dropdown of managed categories and adds a links and embeds section.

### 6. Seed content policy, real content versus placeholders

Real content only from existing verified sources, no invented sector messaging:

- Reorganize the existing 5 posts onto managed categories: the outreach post to Outreach Templates, the four industry posts to Industry Packs. Backfilled by the migration and re asserted idempotently by the seed, only when a post is not already mapped, so a later superadmin re categorization is never overwritten.
- Add a small number (two) of genuinely safe on brand posts, assembled only from content already verified in the academy:
  1. "What TenXPros is, for partners" in Start Here, built from the existing Pro versus TenXPro definition and the detection not persuasion language already in the academy.
  2. "Say this, not this" in Positioning and Brand, built from the existing objection one liners and the say this and do not say this guardrail language already in the academy.
- For every category whose real content is the owner's to write, create one clearly marked placeholder post that is a draft (isPublished false), so partners never see it, while the owner sees it in admin with a one or two sentence guide on exactly what to put there. Placeholders carry an unmistakable marker in the title and a warning callout in the body so they can never be mistaken for finished content. Categories receiving a placeholder: Qualification and Discovery, Institutional Assets, Proof and Dossier, Compliance and Conduct (and Industry Packs gets a "more sectors" placeholder to invite expansion).

### 7. Prominence and the living resource feel

- A tasteful, additive "New" badge on the Partner Toolkit entry in the partner nav. It does not restructure the nav; it renders a small pill next to that one label. This is the only edit outside the toolkit feature. The partner dashboard does not currently link the toolkit, so there is no dashboard entry to badge, and the academy modules that mention the toolkit are content I must not touch (they already point partners to it). Both facts are recorded in the report.
- Honest living resource framing in the toolkit partner header and on the post pages.

## Migration strategy

One new migration directory named to sort after every existing migration: `20260708090000_partner_toolkit_categories_links`. It is additive and hand authored to match the schema, and being new it edits no applied migration. Contents:

1. Create table `ToolkitCategory` with its unique slug and the `(isPublished, order)` index.
2. Alter `ToolkitPost` to add the nullable `categoryId`, its index, and a foreign key to `ToolkitCategory` with `ON DELETE SET NULL ON UPDATE CASCADE`.
3. Create table `ToolkitLink` with its `postId` index and a foreign key to `ToolkitPost` with `ON DELETE CASCADE`.
4. Insert the eight categories with deterministic fixed ids (for example `tkcat_start_here`) using `ON CONFLICT (slug) DO NOTHING`, so it is idempotent and safe to re run.
5. Backfill existing posts, only where `categoryId` is null: `category = 'Generic assets'` to `tkcat_outreach_templates`, `category = 'Industry and role templates'` to `tkcat_industry_packs`. Nothing is deleted and no other row is touched.

The seed re asserts the same category set by slug (idempotent) and maps the 5 posts by slug, again only when not already mapped, so both a fresh database and the existing production database converge without clobbering later edits.

## File by file change list

New files (all in scope):

- `prisma/migrations/20260708090000_partner_toolkit_categories_links/migration.sql`
- `src/app/(admin)/admin/partners/toolkit/categories/page.tsx`
- `src/components/portal/toolkit-embeds.tsx`

Modified files (in scope):

- `prisma/schema.prisma` (add two models, add three fields and two indexes to `ToolkitPost`; no field removed or renamed).
- `src/lib/validations/partner.ts` (add `toolkitCategorySchema`, link kinds enum, link and embed URL validation; extend `toolkitPostSchema` with `categoryId` and links; existing fields unchanged).
- `src/lib/actions/toolkit.ts` (add `saveToolkitCategory`, `deleteToolkitCategory`, `moveToolkitCategory`, `toggleToolkitCategoryPublished`, `deleteToolkitLink`; extend `saveToolkitPost` to persist `categoryId`, keep `category` in sync, and create links).
- `src/app/(admin)/admin/partners/toolkit/page.tsx` (group by managed category, link to the category manager).
- `src/app/(admin)/admin/partners/toolkit/[id]/page.tsx` (category dropdown, links and embeds section).
- `src/app/(partner)/partner/toolkit/page.tsx` (journey reorg, three paths, living resource framing, published category and post gating).
- `src/app/(partner)/partner/toolkit/[slug]/page.tsx` (managed category label, embeds section, category publish gating).
- `prisma/seed/toolkit/seed-toolkit.ts` (seed categories, remap posts, add two real posts and the placeholders).

Modified file (the single allowed out of scope edit):

- `src/components/shared/partner-nav.tsx` (add the small "New" badge next to the Partner Toolkit entry only).

## Gates and adversarial review plan

Run in a loop until green and until the review returns zero findings:

- `pnpm db:generate` then `pnpm typecheck`, `pnpm lint:content`, `pnpm test`, the content dump validation, and `pnpm build`.
- Refute first adversarial review across these lenses, each stated as a claim I will try to break: the migration is additive and loses no existing post or category; the superadmin guard holds on every new action; the partner view never exposes an unpublished post or an unpublished category; the link and embed field cannot inject script and is validated; nothing outside the toolkit is broken or altered except the one additive nav badge; academy, commission engine, config, and narration content are byte unchanged (proved by the content dump and by diff); every commercial number still comes from config and none is hardcoded (the toolkit introduces no commercial numbers).

## Commit plan (local only, no push, no deploy)

Clean separated commits, staged by explicit path so unrelated untracked docs are not swept in:

1. docs: save this plan.
2. schema and migration.
3. validations and server actions.
4. admin UI (category manager and post editor and grouped list).
5. partner view (reorg, three paths, embeds component, framing).
6. partner nav "New" badge.
7. seed (categories, remap, real posts, placeholders).
8. docs: the final advisor report.

## Risks and notes carried into the report

- No reachable database here, so the migration is authored and validated but applied later with `prisma migrate deploy`; the client is generated offline for typechecking.
- The legacy `category` string column is intentionally kept for safety and back compatibility rather than dropped.
- The academy modules that reference the toolkit are left untouched by design; the living resource framing lives in the toolkit itself.
