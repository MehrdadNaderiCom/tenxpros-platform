# TenXPros — Sample Dossier Site Integration Report

**Scope:** Narrow, safe, no-regression frontend/content integration of the standalone sample dossier proof asset into the public marketing site.
**Date:** 2026-06-06
**Result:** ✅ typecheck, build, and tests all pass. No application logic, server actions, auth, database, routes, admin, portal, or pricing logic changed.

---

## 1. Files changed / added

### Added
| File | Purpose |
|---|---|
| `app/src/components/marketing/sample-dossier-preview.tsx` | Reusable presentational server component with `home` / `dossier` / `pricing` / `apply` variants. |
| `app/public/samples/tenxpros-sample-dossier-snapshot.png` | Optional supporting thumbnail (Executive Snapshot, PDF p.3). Generated with `pdftoppm` (no new deps). |
| `app/public/samples/tenxpros-sample-dossier-assets-rubric.png` | Optional supporting thumbnail (Eight Assets Map / Rubric, PDF p.10). |
| `docs/design/TENXPROS_SAMPLE_DOSSIER_SITE_INTEGRATION_REPORT.md` | This report. |

### Modified (additive only — one import + one component placement each)
| File | Change |
|---|---|
| `app/src/app/(public)/page.tsx` | Added a proof band (`variant="home"`) after `JourneySteps`, before the final Founding Charter CTA. |
| `app/src/app/(public)/dossier/page.tsx` | Added the strongest preview (`variant="dossier"`) directly under the page header — the asset's main home. |
| `app/src/app/(public)/pricing/page.tsx` | Added a compact trust card (`variant="pricing"`) before `PricingGrid`. |
| `app/src/app/(public)/apply/page.tsx` | Added a small reassurance block (`variant="apply"`) above the application form. |

> The pre-existing modified files (`portal/layout.tsx`, `lib/actions/admin.ts`, `lib/actions/applications.ts`) were already modified at session start (unrelated security-hardening work) and were **not** touched by this task — verified: their diffs contain no reference to the sample dossier.

---

## 2. Where the asset was added

- **Home (`/`)** — full-width proof band between the journey steps and the closing charter CTA. Concise; single primary CTA.
- **Dossier (`/dossier`)** — the primary home for the proof asset: large cover, the strongest copy, both supporting thumbnails (Executive Snapshot, Eight Assets Map & Rubric), and a secondary "Open HTML preview" CTA.
- **Pricing (`/pricing`)** — compact card (small cover thumbnail + copy) placed before the pricing grid.
- **Apply (`/apply`)** — small reassurance card above the form, intentionally low-distraction.

---

## 3. Exact public URLs

| Asset | URL |
|---|---|
| PDF (primary preview) | `/samples/tenxpros-sample-dossier-excerpt.pdf` |
| HTML preview (secondary) | `/samples/tenxpros-sample-dossier-excerpt.html` |
| Cover image | `/samples/tenxpros-sample-dossier-cover.png` |
| Snapshot thumbnail | `/samples/tenxpros-sample-dossier-snapshot.png` |
| Assets/Rubric thumbnail | `/samples/tenxpros-sample-dossier-assets-rubric.png` |

Served by Next.js static handling from `app/public/samples/`. The primary CTA opens the PDF; the secondary CTA (dossier only) opens the HTML. All sample links use `target="_blank" rel="noopener noreferrer"`.

---

## 4. Copy used on each page

**Home** (`variant="home"`)
- Eyebrow: `Proof asset`
- Headline: `See what “reviewed work” looks like.`
- Body: `Preview an illustrative Living AI Solution Dossier — the artifact at the center of TenXPros. It shows the structure, reviewer notes, evidence gaps, and review standard behind the credential.`
- CTA: `Preview a sample dossier`

**Dossier** (`variant="dossier"`)
- Eyebrow: `Illustrative sample`
- Headline: `Preview the artifact the program is named for.`
- Body: `This fictional sample shows how one professional problem becomes a structured, reviewed Living AI Solution Dossier. You’ll see the 12-section structure, the Eight Assets Map, reviewer annotations, the intentional evidence gap, and the rubric mapping.`
- Primary CTA: `Preview the full sample` · Secondary CTA: `Open HTML preview`

**Pricing** (`variant="pricing"`)
- Eyebrow: `See the standard`
- Headline: `Not sure what you’re paying for? Preview the work.`
- Body: `You’re not buying a video course. You’re earning a reviewed professional asset built around your own real problem. The sample dossier shows the standard before you apply.`
- CTA: `Preview a sample dossier`

**Apply** (`variant="apply"`)
- Eyebrow: `Before you apply`
- Headline: `Want to see where this leads?`
- Body: `Preview an illustrative sample dossier before you apply. Your application starts with the one real problem you would carry through to an artifact like this.`
- CTA: `Preview a sample dossier`

**Shared microcopy disclaimer (all variants):**
`Illustrative sample. Fictional participant. No real client data. Review labels are illustrative, not a certification decision.`

---

## 5. Accessibility notes

- **Cover alt text** (exactly as specified): `Illustrative TenXPros Living AI Solution Dossier cover for fictional participant Maya R.`
- Supporting thumbnails have descriptive alt text identifying them as illustrative sample pages for fictional participant Maya R.
- Decorative CTA icons are marked `aria-hidden="true"`.
- The cover link carries an explicit `aria-label` ("… opens PDF in a new tab").
- All interactive links are keyboard-focusable with a visible focus ring (`focus:ring-navy-500`), reusing the site's existing focus convention.
- Each placement uses a single `<h2>`, preserving heading order under the page's `<h1>` (`PageHeader` / `MarketingHero`).
- Copy uses curly typographic quotes/apostrophes consistent with the rest of the marketing site.
- Images set explicit `width`/`height` (intrinsic ratio) and `loading="lazy"` to limit layout shift and defer offscreen loads.

---

## 6. Verification commands and results

```bash
cd app
pnpm typecheck   # ✅ tsc --noEmit, exit 0
pnpm build       # ✅ exit 0 — /, /dossier, /pricing, /apply still prerender as static (○)
pnpm test        # ✅ vitest: 5 files, 16 tests passed
```

Content / safety checks:

```bash
# Asset URLs referenced correctly  → all 5 present in component, all 5 files exist & non-empty
grep -nE "/samples/tenxpros-sample-dossier" app/src/components/marketing/sample-dossier-preview.tsx

# No internal production notes referenced anywhere in public src  → clean (none)
grep -rniE "INTERNAL PRODUCTION|END OF PUBLIC ARTIFACT|Website excerpt copy|Final quality checklist" app/src/

# No overclaiming language introduced  → only match is the pre-existing terms page,
#   which is an ANTI-claim ("No guaranteed outcome … does not guarantee employment …")
grep -rniE "real graduate|certified sample|guaranteed (value|results|business|outcome|roi)|proven roi|officially accredited|better than (hbs|mit|stanford|universit)" app/src/

# "illustrative" used consistently in the new component  → 7 occurrences
# rel="noopener noreferrer" on every sample link        → present
```

Live render check (production server on port 3210, `curl`):

- `/dossier` output contains the PDF href, HTML href, `rel="noopener noreferrer"`, the exact cover alt text, the disclaimer microcopy, the `Preview the full sample` CTA, and both supporting thumbnails.
- `/`, `/pricing`, `/apply` each render the cover image, PDF CTA, and disclaimer microcopy.

---

## 7. Confirmation: no app logic / server / auth / database / routes changed

- **Only the four public marketing pages were modified**, each with a single import line and a single `<SampleDossierPreview …/>` placement (additive — verified via `git diff`).
- No changes to: server actions (`lib/actions/*`), auth, Prisma schema/migrations, middleware, route handlers, the participant portal workflows, admin workflows, pricing logic, or the application form.
- No changes to the sample dossier content itself (HTML/PDF/cover untouched; the two thumbnails are newly rendered *from* the existing PDF, not edits to it).
- The component is a pure presentational server component — no client state, no data fetching, no new dependencies.

---

## 8. Public-overclaiming guard (explicitly avoided)

The integration never states the sample is a real graduate case, certified, accredited, or guaranteed; it does not claim proven ROI, guaranteed business outcomes, or superiority over universities. The word **illustrative** is used consistently, the participant is consistently labeled **fictional (Maya R.)**, and the fictional/illustrative disclaimer is present on every placement.

---

## 9. Caveats

- The cover and thumbnails are served as plain `<img>` from `/public` (the repo uses no `next/image` and has no image config) — the safest no-regression choice; if `next/image` optimization is later desired it can be swapped in without copy changes.
- The two supporting thumbnails are an optional enhancement (used only on the Dossier page). They were generated with `pdftoppm` (already present); if the PDF is regenerated, re-run the two `pdftoppm`/`convert` commands to refresh them. The cover alone is sufficient if they are ever removed.
- `ButtonLink` (Next `<Link>`) is reused for the CTAs with `target="_blank"`; because these point at static `/samples` files opened in a new tab, the browser performs a normal document request — confirmed working via the live `curl` render.
- No metadata/OG-image changes were made (kept out of scope to stay narrow); a future task could add an OG preview image for `/dossier` using the cover.
