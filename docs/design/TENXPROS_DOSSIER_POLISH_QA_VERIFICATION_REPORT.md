# TenXPros — Dossier Polish QA Verification Report

**Task:** Verify whether the Dossier page renders all sections correctly (the earlier full-page screenshots showed large black blank regions) and regenerate a reliable visual-QA package.
**Page:** `/dossier`
**Date:** 2026-06-07
**Verdict:** ✅ **APPROVE — no layout bug.** The blank regions were a **full-page screenshot artifact** (extreme-aspect-ratio downscaling of a tall dark-theme page), not a page defect.

---

## 1. Was the blank area a screenshot artifact or a real page issue?

**It is a screenshot artifact.** The live page renders every section correctly, with content all the way to a flush footer. Evidence:

- **No trailing blank:** the footer ends exactly at `scrollHeight` on both viewports (`trailing blank after footer = 0px`). There is no empty band after the content.
- **No rogue tall element:** the only element taller than 3× the viewport on desktop is `<main>` itself (the page). On mobile the only extra tall elements are the **Sample Preview** `<section>` and its inner container — both genuinely full of the stacked 3-up sample gallery (real images), not empty space.
- **Every section heading is present, visible, and within the document** on both viewports (8/8).
- The largest inter-heading gaps map to **genuinely tall, content-filled sections** (Anatomy on desktop; the stacked Sample gallery on mobile), confirmed by segmented screenshots.

**Why the full-page PNG looked black:** the dark base is `#070B14`. A full-page capture at `deviceScaleFactor: 2` produces a very tall image — **desktop 2880 × 13640 px**, **mobile 780 × 23126 px**. When such a tall image is downscaled to fit a normal preview width, the near-black inter-section spacing compresses into what reads as large black bands. The pixels are correct; the *display* of an extreme-aspect-ratio dark image is misleading.

**Reliability call:** Full-page captures are retained for the record but are **marked unreliable for visual review**. The **segmented viewport screenshots are the source of truth**, and they show correct rendering of every section.

---

## 2. Screenshots

Folder: `docs/design/dossier-polish-round-1-verified/`

**Desktop (1440 × 900, DPR 2):**
- `dossier-desktop-full.png` — full page (2880×13640; **unreliable for visual review**, see §1)
- `dossier-desktop-top.png` — hero
- `dossier-desktop-anatomy.png` — 12-section anatomy
- `dossier-desktop-review-standard.png` — review standard (gold panel)
- `dossier-desktop-sample-section.png` — sample dossier gallery
- `dossier-desktop-bottom.png` — final CTA + footer

**Mobile (390 × 844, DPR 2):**
- `dossier-mobile-full.png` — full page (780×23126; **unreliable for visual review**)
- `dossier-mobile-top.png` — hero
- `dossier-mobile-anatomy.png` — 12-section anatomy
- `dossier-mobile-review-standard.png` — review standard
- `dossier-mobile-sample-section.png` — sample dossier gallery
- `dossier-mobile-bottom.png` — final CTA + footer

Raw metrics: `docs/design/dossier-polish-round-1-verified/qa-measurements.json`

---

## 3. Viewport sizes

| Viewport | Width | Height | DPR | isMobile |
| --- | --- | --- | --- | --- |
| Desktop | 1440 | 900 | 2 | no |
| Mobile | 390 | 844 | 2 | yes |

---

## 4. Page metrics

| Metric | Desktop | Mobile |
| --- | --- | --- |
| `document.documentElement.scrollHeight` | **6820px** | **11563px** |
| `document.body.scrollHeight` | 6820px | 11563px |
| `scrollWidth` | 1440 | 390 |
| **Horizontal overflow** (`scrollWidth − clientWidth`) | **0px** | **0px** |
| Footer band | top 6655 → bottom 6820 | top 11306 → bottom 11563 |
| **Trailing blank after footer** | **0px** | **0px** |
| Largest inter-heading gap | 1326px (Anatomy section) | 2533px (Sample gallery section) |
| Tall elements > 3× viewport | only `<main>` (6586px) | `<main>` (11237px) + Sample `<section>` (2534px) — all content |

`scrollHeight` equals `body.scrollHeight` on both viewports (no phantom over-tall body), and equals the footer bottom (no blank tail).

---

## 5. Section visibility checks (automated)

All eight major headings + the footer were located in the DOM, measured for visibility (non-zero box, not `display:none`/`visibility:hidden`/`opacity:0`), and confirmed within the document bounds.

| Section heading | Desktop y (vis / inDoc) | Mobile y (vis / inDoc) |
| --- | --- | --- |
| Hero — "The Living AI Solution Dossier is the work behind the credential." | 236 ✓/✓ | 190 ✓/✓ |
| What it Proves — "A dossier proves that your AI work can be understood, reviewed, and defended." | 942 ✓/✓ | 1535 ✓/✓ |
| 12-Section Anatomy — "Twelve sections, organized by the TenX Method." | 1566 ✓/✓ | 2584 ✓/✓ |
| Eight Assets — "Eight assets become one professional dossier." | 2892 ✓/✓ | 4254 ✓/✓ |
| Review Standard — "Review is part of the product." | 3805 ✓/✓ | 6165 ✓/✓ |
| Sample Preview — "Preview the artifact before you apply." | 4365 ✓/✓ | 7177 ✓/✓ |
| What's Different — "A reviewed artifact is different from a completion certificate." | 5600 ✓/✓ | 9710 ✓/✓ |
| Final CTA — "Bring one real problem. Leave with reviewed evidence." | 6296 ✓/✓ | 10791 ✓/✓ |
| Footer (`<footer>`) | present ✓ | present ✓ |

**Blank-gap analysis:** the biggest gap on each viewport corresponds to a content-dense section, verified visually:
- Desktop 1326px = the **12-Section Anatomy** (four phase rails with 12 numbered rows).
- Mobile 2533px = the **Sample Preview** gallery, which stacks three tall portrait artifacts (Cover, Executive Snapshot, Eight Assets & Rubric) plus CTAs and disclaimer. Confirmed in `dossier-mobile-sample-section.png` — filled with the gallery, not empty.

No unexpected massive blank gap exists between any two consecutive major sections.

**Visual confirmation (segmented captures):** hero, anatomy rail, review-standard gold panel, the 3-up sample gallery, and the final CTA + footer all render correctly at full fidelity on both desktop and mobile.

---

## 6. Was any code changed?

**No application code was changed.** No real layout bug was found, so per the task constraints nothing in the app was modified — not the Dossier page, components, server actions, auth, database, routes, admin, portal, application form, payment logic, or sample-dossier content.

The only file added is **QA tooling**: `app/scripts/dossier-qa-verify.mjs` (a Playwright script that captures segmented screenshots and runs the DOM sanity checks requested in task step 5). It is not part of the application bundle.

> Note: `git status` shows pre-existing `M` entries (e.g. `dossier/page.tsx`, `page.tsx`, `public-nav.tsx`, `admin.ts`, …). Those modifications predate this QA task (earlier sprints / session start) and were **not** touched here.

---

## 7. Commands run

| Command | Result |
| --- | --- |
| `pnpm build` | ✅ Compiled successfully; `/dossier` builds static (`○`), 59/59 pages |
| `next start -p 3010` | ✅ Served `/dossier` → HTTP 200 |
| `node scripts/dossier-qa-verify.mjs` | ✅ Exit 0 — wrote 12 screenshots + `qa-measurements.json` |

> One iteration note (kept transparent): the first script run hung because `settle()` awaited `load` on `loading="lazy"` images that never fire while parked at scroll 0. Fixed by stepping through the page to trigger lazy loads and capping each image wait with a timeout, then re-ran clean. This was a **test-script** fix, not an app change.

---

## 8. Final recommendation

**APPROVE.** The Dossier page renders all sections correctly on desktop (1440) and mobile (390): 8/8 headings present and visible, footer flush at the bottom, 0px horizontal overflow, 0px trailing blank, and no unexpected blank gaps. The earlier "black blank region" was an artifact of downscaling a very tall dark-theme full-page screenshot. **No fix required.** Use the segmented viewport screenshots in this folder as the reliable visual-QA package; treat `*-full.png` as record-only.

---

## 9. Screenshot-folder housekeeping

Per the standing instruction, previous screenshot folders under `docs/design/` were deleted and only the new latest folder is kept. `.md` reports were not deleted.

- **Deleted:** `dossier-polish-round-1/` (the prior screenshot folder)
- **Kept:** `dossier-polish-round-1-verified/` (this run)
