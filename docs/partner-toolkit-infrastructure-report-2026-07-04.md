# Partner Toolkit infrastructure upgrade, report for review

**Date:** 2026-07-04
**Status:** built locally, all quality gates green, committed on the branch, not pushed and not deployed. Waiting for your review.
**Companion document:** the precise plan is in `docs/partner-toolkit-infrastructure-plan-2026-07-04.md`.

This report is written for a non engineer. It explains what the Partner Toolkit is now, what you can do with it from the website, and exactly what was and was not changed.

---

## 1. In one paragraph

The Partner Toolkit used to be a simple blog with a free text category typed on each post. It is now a proper, self serve content system organized around the partner's journey. You, as the primary admin, can build and reorganize the whole thing from the website forever, with no further code changes: create and reorder categories, publish or hide them, write posts with rich text, upload files, and add links or embeds including video and slide decks. Partners see a clean, journey based library with three clear entry points and honest framing that it keeps growing. Everything is additive. Nothing else on the site was changed except one small "New" badge on the partner menu.

---

## 2. What the infrastructure is now, and how it changed

**Before:** a post had a title, a body, and a category that was just typed text (so two posts could drift into "Generic assets" and "generic assets"). Posts could carry uploaded files. That was it.

**Now, three things were added, all additive:**

1. **Managed categories.** Categories are real, editable objects with a title, a one line description, an order, and a published switch. Posts belong to a category chosen from a dropdown, so categories can never drift again. The old typed category text is still kept on each post for safety, but the managed category is what drives everything you see.

2. **Links and embeds.** A post can now carry external links and embeds in addition to its text and files. This is how video and large slide decks are supported without stuffing big files into the database.

3. **A journey based layout.** Partners now see categories in the order you set, each with its description, plus a simple "three paths" chooser at the top. The admin side groups posts by category and adds a category manager.

The five existing posts were preserved and moved under the right new categories. No content was lost.

---

## 3. What you can now do from the website, with no code

All of this is available to the primary admin in the Partner panel admin area, under Partner Program then Partner Toolkit.

**Categories** (Partner Toolkit then "Manage categories"):
- Create a new category with a title and a one line description.
- Rename a category, change its description, or change its web address (slug).
- Reorder categories with Up and Down.
- Publish or hide a category. A hidden category and everything in it disappears from the partner view immediately.
- Delete a category. This is deliberately blocked while the category still has posts, so you can never delete content by accident. Move or remove the posts first.

**Posts** (Partner Toolkit then "New post" or Edit):
- Write a rich text body (headings, lists, quotes, tables, images, and colored callout boxes), the same editor used for academy lessons.
- Pick the category from a dropdown.
- Set the order, and publish or keep it as a draft.
- Upload files (up to ten per save, fifteen megabytes each).
- Add external links or embeds: paste a link, give it a label, and mark it as Link, Video, Slide deck, or Document.
- Remove any single file or link, or delete the whole post.

The result: from the website you can compose one post that mixes text, images, an embedded or linked video, a slide deck, and downloadable PDFs.

---

## 4. How each media type is supported, and the size limits

| Media | How to add it | Where it lives | Limit |
|---|---|---|---|
| Rich text | The post body editor | In the post | None meaningful |
| Images | Inside the body, or as an uploaded file | Body, or database | 15 MB per uploaded file |
| PDF | Upload as a file | Database | 15 MB per file, up to 10 per save |
| Documents | Upload as a file, or add as a link marked Document | Database, or the external host | 15 MB if uploaded; no limit if linked |
| Slide deck | Upload the exported PDF, or add a Google Slides or Drive link marked Slide deck | Database, or Google | 15 MB if uploaded; no limit if linked or embedded |
| Video | Add a YouTube, Vimeo, Loom, or Google Drive link marked Video | The video host | No limit; it streams from the host |
| Any link | Add it as a Link | The external site | No limit |

**Why 15 MB stays the upload limit, and why video is a link.** Uploaded files are stored inside the database and are loaded fully into memory when a partner downloads them. That is fine for images, PDFs, and slide decks exported to PDF, but it is the wrong place for video or very large media. Video belongs on a streaming host (YouTube, Vimeo, Loom) or on Drive, so the toolkit carries a link or an inline embed instead. This keeps the site fast and the database healthy while letting you attach or embed video, slides, images, PDFs, and text in a single post.

**How embeds stay safe.** When you mark a link as Video or Slide deck and it is from YouTube, Vimeo, Loom, Google Slides, or Google Drive, it plays inline on the post page. For safety the system never trusts pasted web code: it recognizes the provider, pulls out only the video or file identifier, and builds the player from a fixed, trusted address. Anything it does not recognize is shown as a normal, safe "open in a new tab" link. An independent security review specifically tried to break this (including lookalike web addresses and code injection through a link) and could not.

---

## 5. The eight categories and what each is for

These are seeded and live. You can rename, reorder, or hide any of them.

1. **Start Here.** What the toolkit is, how to use it, and the fastest path to a first good conversation.
2. **Positioning and Brand.** How to describe TenXPros truthfully and on brand, including what to say and what to avoid.
3. **Qualification and Discovery.** How to tell a real Pro from a beginner, and the discovery questions that surface a real problem.
4. **Outreach Templates.** Approved outreach and objection templates to personalize, never scripts to send blindly.
5. **Institutional Assets.** Materials for approaching an institution, where you sell a capability to a team rather than one person.
6. **Industry Packs.** Templates tailored to a sector or role, from universities to hospitals to owners and CEOs.
7. **Proof and Dossier.** How to use the reviewed dossier and the public sample as honest proof of what the program produces.
8. **Compliance and Conduct.** The guardrails: no price or discount outside approved materials, no promised outcomes, honest conduct.

---

## 6. Real content versus placeholders

I did not invent industry marketing content, because fake sector messaging would hurt the brand. Everything I wrote is assembled only from wording already verified in the academy.

**Real, published posts (seven):**
- Start Here: **"What TenXPros is, for partners"** (new). Built from the verified academy definitions of Pro and TenXPro, the multiplier idea, and detection not persuasion.
- Positioning and Brand: **"Say this, not this"** (new). Built from the verified "say this" and "do not say this" lines and the honest objection answers already in the academy.
- Outreach Templates: **"Outreach and objection templates"** (existing, moved here).
- Industry Packs: **four existing posts**, moved here: universities and schools, hospitals and clinics, an individual expert, and an owner or CEO.

**Placeholders (five), which are drafts, so partners never see them.** Each is clearly marked and carries a one or two sentence guide telling you what to write. Open each in the admin, replace the placeholder text with real content, and publish.

| Category | Placeholder guide, what to write there |
|---|---|
| Qualification and Discovery | The discovery questions and the Pro qualification checklist, drawn from Module 2 and Module 14, as a short checklist a partner can run in their head. |
| Institutional Assets | The institution facing one page summary and the pilot framing, for selling a capability to a team. No price and no promised outcomes. |
| Proof and Dossier | Point to the public sample dossier and explain how to use it as honest proof of what the program produces, never as a guarantee. |
| Compliance and Conduct | The guardrails: no price or discount outside approved materials, no promised results, and redacted or fictionalized examples for regulated data. Draw from the Module 14 guardrails. |
| Industry Packs (more sectors) | Add sector packs beyond the current four as you write them, one post per sector, each with a short honest outreach template and nothing that promises a result. |

A published category that has no published posts yet (for example Qualification and Discovery until you fill it) shows its title and description with a short, honest "we are adding resources here" line, so the journey looks intentional rather than broken.

---

## 7. The three paths partner experience

At the top of the partner toolkit, partners choose one of three entry points, each of which jumps to the most relevant category:

- **I found an individual** goes to Qualification and Discovery.
- **I found an institution** goes to Institutional Assets.
- **I want to promote** goes to Positioning and Brand.

If a target category is ever renamed or hidden, that path quietly points to the next best category instead of breaking. Below the chooser, the categories are listed in your order, each with its description and its posts. A "More resources" section catches any older published post that has not been filed into a category yet, so nothing published is ever hidden.

---

## 8. The "New" badge and the living resource framing

- **The "New" badge** is a small gold pill next to "Partner Toolkit" in the partner side menu, so partners notice the expanded toolkit. It is the only change made outside the toolkit feature, and it does not change the menu in any other way. The partner dashboard does not link to the toolkit today, so there was no second place to badge, and the academy modules that mention the toolkit are content I was asked not to touch (they already point partners to it).
- **The living resource framing** is in the toolkit's own header: "A growing library of approved resources ... It is useful now, and we add to it regularly, so it is worth a look often." A small "Living resource" note at the bottom reinforces it. The message is honest in the TenXPros voice: it is valuable now and it keeps getting better, so partners should revisit rather than expect it to be finished.

---

## 9. Confirmation that nothing outside the toolkit was harmed

- The only file changed outside the toolkit feature is the partner menu, for the single "New" badge.
- The two shared files that were touched (the database schema and the validation rules) were changed only in their toolkit sections, and only by adding things.
- The academy lessons and exams, the commission engine, the program configuration, pricing, the public marketing site, and the narration were not touched. This was confirmed two ways: by listing every changed file, and by running the content validation that checks the academy content is intact (all seventeen academy modules validated unchanged).
- No commercial number was added or hardcoded anywhere; the toolkit contains no prices or rates, by design.

---

## 10. Every file and migration changed

New files:
- `app/prisma/migrations/20260708090000_partner_toolkit_categories_links/migration.sql` (the additive database migration)
- `app/src/app/(admin)/admin/partners/toolkit/categories/page.tsx` (the category manager)
- `app/src/lib/toolkit/embeds.ts` (safe link and embed handling)
- `app/src/components/portal/toolkit-embeds.tsx` (renders links and embeds)
- `docs/partner-toolkit-infrastructure-plan-2026-07-04.md` (the plan)
- `docs/partner-toolkit-infrastructure-report-2026-07-04.md` (this report)

Changed files (all within the toolkit feature except the nav badge):
- `app/prisma/schema.prisma` (added two models and three fields to the post; nothing removed)
- `app/src/lib/validations/partner.ts` (added category and link validation; toolkit section only)
- `app/src/lib/actions/toolkit.ts` (post save plus the new category and link actions)
- `app/src/app/(admin)/admin/partners/toolkit/page.tsx` (grouped admin list)
- `app/src/app/(admin)/admin/partners/toolkit/[id]/page.tsx` (category dropdown and links section)
- `app/src/app/(partner)/partner/toolkit/page.tsx` (journey layout, three paths, framing)
- `app/src/app/(partner)/partner/toolkit/[slug]/page.tsx` (embeds and category gating)
- `app/src/app/api/toolkit/files/[id]/route.ts` (download respects category publishing)
- `app/prisma/seed/toolkit/seed-toolkit.ts` (categories, reorganization, real posts, placeholders)
- `app/src/components/shared/partner-nav.tsx` (the one out of feature change: the "New" badge)
- `app/tests/partner-auth-status.test.ts` (updated to match the strengthened download gate)

Total: 16 files, about 1,264 lines added and 125 changed.

---

## 11. Quality gates, all green

Run on the final committed state:

| Gate | Result |
|---|---|
| Type check (tsc) | Passed |
| Content dash lint | Passed (no forbidden dash characters) |
| Full test suite (vitest) | Passed, 432 of 432 |
| Content dump validation | Passed, 17 academy modules validated unchanged |
| Production build (next build) | Compiled successfully, all 6 toolkit routes built |

---

## 12. The adversarial review, what was found and fixed

Two independent reviewers were run in a refute first manner, each trying to break specific claims, plus my own review. Findings were fixed and the gates re run until green with no remaining in scope findings.

**Security review of links and embeds:** no exploitable issues. Attempts to inject code through a pasted link, to point an embedded player at an attacker's site, or to use lookalike web addresses all failed safely.

**Correctness and scope review, three genuine findings, all fixed:**

1. **A published post with no category would vanish from the partner list** (it stayed reachable by direct link). This mattered for any older post whose typed category was not one of the two the migration maps. Fixed by adding the "More resources" section that lists published posts not yet filed into a category, so nothing published is ever hidden. All three partner surfaces now agree.
2. **The file download link did not respect a hidden category.** A file on a published post under a hidden category could still be downloaded. Fixed so the download is hidden exactly when the post page is, and the existing safety test was updated to match the stronger rule.
3. **The seed could fail on re run if a category web address had been renamed.** Fixed by keying the seed on a stable internal identifier instead of the web address, so re running is always safe.

**One finding was deliberately not fixed, and is flagged here for you.** The security reviewer found a pre existing weakness in the shared academy content sanitizer (`lesson-html.ts`), where a very carefully crafted link inside a post body could carry a script. It is pre existing, it was not introduced or touched by this work, and it can only be triggered by the primary admin's own authored content, so it is a defense in depth gap rather than a way for a partner to attack the site. Because that file is shared academy infrastructure that this task was scoped not to touch, I did not change it. It is worth a small, separate follow up to harden that sanitizer (validate the link scheme the same way the new toolkit code does). I can do that as its own change whenever you want.

---

## 13. What you should do next to fill the toolkit from the website

1. **Apply the database migration on the server.** Because there is no database in this working environment, the migration is written and verified but not yet applied. On deploy, run the standard migrate step (`prisma migrate deploy`). It creates the new tables, adds the eight categories, and files the existing five posts. It changes nothing else.
2. **Run the toolkit seed once** (optional but recommended) to add the two new real posts and the placeholders: `pnpm tsx prisma/seed/toolkit/seed-toolkit.ts`. It is safe to run more than once and never overwrites your edits.
3. **Fill the five placeholders.** Open each one in the admin (they are drafts), replace the placeholder text using the guide in section 6, and publish.
4. **Add your first video and slide deck.** Edit any post, paste a Loom or YouTube link marked Video and a Google Slides link marked Slide deck, and save. Open the post as a partner would to see them play inline.
5. **Tune the journey.** Rename, reorder, describe, publish, or hide categories until the three paths and the ordering feel right for how partners actually work.
6. **Consider the separate sanitizer hardening** noted in section 12 when convenient.

---

## 14. Commits, not pushed and not deployed

Eight local commits on the current branch, in clean separated units:

1. the plan document
2. additive schema and migration
3. validation and superadmin actions plus the safe embed library
4. admin category manager and post editor
5. journey based partner view with safe embeds and framing
6. the "New" nav badge
7. the seed (categories, reorganization, real posts, placeholders)
8. the adversarial review hardening

Nothing was pushed and nothing was deployed. Ready for your review.
