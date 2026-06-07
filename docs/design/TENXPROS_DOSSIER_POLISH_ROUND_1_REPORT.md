# TenXPros — Dossier Page Polish Round 1 Report

**Sprint:** DOSSIER PAGE POLISH ROUND 1 (post Dossier Rebuild Sprint 1)
**Scope:** Public Dossier page (`/dossier`) only — polish pass. Structure, copy spine, and "The Instrument" direction preserved.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build all green. Visual QA captured (0px horizontal overflow at 1440px and 390px).

---

## 1. Files changed

| File | Type | Purpose |
| --- | --- | --- |
| `app/src/components/marketing/dossier-instrument.tsx` | Modified | All four polish fixes (anatomy rail, hero hierarchy, comparison wording, sample gallery). Only this Dossier component was touched. |

No other source files were changed. `page.tsx`, the shared nav/footer, UI primitives, `SampleDossierPreview`, `DossierSectionGrid`, and every other route are untouched. (`dossier-instrument.tsx` is untracked in git because it was added in the prior sprint and not yet committed.)

---

## 2. Exact polish changes made

### Fix 1 — 12-Section Anatomy (more elegant, no empty cells)
- Replaced the per-phase **2-column section grid** (which left an empty cell whenever a phase had an odd count — Frame had 3, Design had 5) with a **single-column numbered rail** using `divide-y divide-white/5` hairline dividers. No empty cells, even row rhythm, and the dense **Design** phase now reads as a clean list instead of a crowded 3×2 grid with a hole.
- Section rows now use a fixed-width `tabular-nums` index column (`01`–`12`) so every section name left-aligns, and the name size was nudged up to `text-[0.95rem]` for scanability.
- The phase label column gained a small **indigo rail marker dot** (`h-2 w-2` with a soft ring, desktop only) and a `Phase NN · Weeks …` mono line, giving the section a premium timeline feel.
- All 12 canonical sections, the Frame/Design/Prove/Foresee phase labels, and the week ranges are unchanged. Wider column gap (`md:gap-10`) and divider on the left rail improve separation.

### Fix 2 — Hero visual hierarchy (cover is clearly primary)
- Enlarged the cover from `w-150 sm:w-168` to `w-168 sm:w-196` and upgraded its mount to a rounded `border-indigo-400/25 + ring-indigo-400/10` frame, making it the unmistakable primary artifact.
- Re-captioned the cover `Cover · Primary artifact` (indigo) and grouped the two thumbnails under a new `Supporting excerpts` mono label, so Executive Snapshot and Eight Assets/Rubric clearly read as secondary.
- Increased the panel's inner gap (`gap-5` → `gap-6`) and vertically centered the supporting column against the taller cover. Only the real existing sample assets are used — no fake screenshots.

### Fix 3 — Comparison section (softer, not an attack)
- Headline: `A completion certificate is not a reviewed artifact.` → **`A reviewed artifact is different from a completion certificate.`**
- Left-column label: `A generic AI course` → **`Typical course experience`** (descriptive, not dismissive).
- The TenXPros side is unchanged and still strong; the column remains a neutral contrast (neutral minus icons vs indigo checks). No superiority claims over universities or other programs.

### Fix 4 — Sample Preview (curated proof gallery)
- Replaced the asymmetric "big cover on the left + 2 thumbs on the right" layout with a balanced **3-up gallery** (`sm:grid-cols-3`): **Cover** (featured with an indigo ring) + **Executive Snapshot** + **Eight Assets & Rubric**. All three sample images share the same 1000×1415 / 1680×2376 aspect ratio, so the columns are perfectly even.
- Each gallery item is a card with a framed image, a mono eyebrow, a short bold label, and a one-line note — a tidy, curated read.
- Moved both CTAs and the disclaimer into a single row **below a hairline** (`border-t pt-8`), with the disclaimer right-aligned on desktop and stacked on mobile — cleaner CTA/disclaimer spacing and balance. Both CTAs and the illustrative/fictional disclaimer are retained.

---

## 3. Before / after rationale

| Area | Before | After | Why |
| --- | --- | --- | --- |
| Anatomy | Per-phase 2-col grids; odd phases (3, 5) left an empty cell; Design felt crowded | Single-column numbered rail with hairline dividers + rail marker | A proof page must scan cleanly; empty grid cells and crowding read as unfinished |
| Hero | Cover and thumbnails close in visual weight | Cover enlarged + ringed + labeled "Primary artifact"; thumbs grouped under "Supporting excerpts" | The cover is the artifact; hierarchy should say so at a glance |
| Comparison | "A completion certificate is **not**…" / "A **generic** AI course" | "different from" / "Typical course experience" | Keep the distinction without sounding like an attack on other programs |
| Sample preview | Asymmetric cover + 2 thumbs; CTAs/disclaimer cramped under the right column | Even 3-up gallery + CTA/disclaimer row under a hairline | A "curated proof gallery" should be balanced and premium |

---

## 4. Anatomy layout improvements (detail)

- **No empty cells:** the rail renders exactly N rows per phase — 3 / 5 / 2 / 2 — with no placeholder gaps.
- **Even rhythm:** `divide-y` + consistent `py-3` rows; `first:pt-0 last:pb-0` trims the ends so each card is tight.
- **Alignment:** `w-7 tabular-nums` index keeps every section title on the same left edge.
- **Hierarchy:** left rail = phase identity (marker dot, `Phase NN · Weeks …`, phase name, count); right rail = the sections. Clear two-part read on desktop, clean stack on mobile.

---

## 5. Mobile notes (390px verified, 0px overflow)

- Anatomy phase cards stack; the left rail collapses above its section list (marker dot hidden on mobile to avoid a stray bullet); section rows remain a single readable column.
- Hero panel keeps the larger cover beside the supporting column and still fits with no overflow.
- Sample gallery collapses `sm:grid-cols-3` → single column (cover, then the two excerpts); the CTA/disclaimer row stacks vertically.
- Comparison columns stack; all other sections unchanged. Measured horizontal overflow: **0px**.

---

## 6. Commands run and results

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ Pass (no errors) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/dossier` builds static (`○`), 59/59 pages generated |
| `node scripts/dossier-rebuild-screenshots.mjs` (SHOT_OUT=dossier-polish-round-1) | ✅ Wrote 4 screenshots; overflow desktop **0px**, mobile **0px** |

---

## 7. Screenshot paths

- `docs/design/dossier-polish-round-1/dossier-desktop.png` (1440px, full page)
- `docs/design/dossier-polish-round-1/dossier-mobile.png` (390px, full page)
- `docs/design/dossier-polish-round-1/dossier-hero-desktop.png` (1440px, hero above the fold)
- `docs/design/dossier-polish-round-1/dossier-sample-section.png` (1440px, sample-dossier proof)

---

## 8. Caveats

- **Light shared nav/footer over a dark page** — unchanged intentional state; the route-aware-nav proposal remains deferred to a future shared-nav sprint.
- **Anatomy phase grouping is illustrative structure** (mapping the 12 sections to Frame/Design/Prove/Foresee and week ranges) — communicates structure, not a per-participant guarantee. Unchanged this round.
- The Sample Preview note copy was lightly rephrased into eyebrow/label/note triplets for the gallery (e.g., "The one-page read", "The mapping"); these are descriptive only and add no new claims. The illustrative/fictional disclaimer is unchanged and still present.
- Build prints the pre-existing Next.js `<img>` lint advisory (same as the shared proof component); non-blocking, and plain `<img>` is intentional for these static assets.

---

## 9. Backend / app-logic confirmation

No server actions, auth, database/Prisma/migrations, admin workflows, participant-portal workflows, application-form logic, or payment logic were changed. The sample-dossier PDF/HTML/cover/thumbnail content was not changed. The shared `SampleDossierPreview` and `DossierSectionGrid` components were not modified, and no other pages (Home, Pricing, Apply, Program, Certification, …) were touched. No routes were added, removed, or broken. No new dependencies. No new claims, testimonials, or logos, and no superiority/guaranteed-outcome claims. All changes are confined to presentational layout and short label copy in `dossier-instrument.tsx`.
