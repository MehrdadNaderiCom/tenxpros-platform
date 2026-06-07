# Sample Dossier — Visual QA Report

**Scope:** Visual QA evidence pack for the sample-dossier proof asset integrated into Home, Dossier, Pricing, and Apply.
**Date:** 2026-06-06
**Code changed during QA:** **No.** (See §10.)
**Verdict:** ✅ Pass — the integration renders cleanly on desktop and mobile across all four pages. No blocking visual issues.

---

## 1. Screenshots created

All under `docs/design/sample-dossier-site-qa/` (12 PNGs):

| File | What it shows | Pixels |
|---|---|---|
| `home-desktop.png` | Home, full page | 2880 × 5882 |
| `home-mobile.png` | Home, full page | 780 × 11498 |
| `home-sample-block.png` | Home sample block (focused) | 2432 × 1004 |
| `dossier-desktop.png` | Dossier, full page | 2880 × 4840 |
| `dossier-mobile.png` | Dossier, full page | 780 × 7642 |
| `dossier-sample-block.png` | Dossier sample block (focused) | 2432 × 1814 |
| `pricing-desktop.png` | Pricing, full page | 2880 × 3262 |
| `pricing-mobile.png` | Pricing, full page | 780 × 7260 |
| `pricing-sample-block.png` | Pricing sample card (focused) | 2432 × 526 |
| `apply-desktop.png` | Apply, full page | 2880 × 5072 |
| `apply-mobile.png` | Apply, full page | 780 × 7328 |
| `apply-sample-block.png` | Apply sample card (focused) | 1664 × 566 |

---

## 2. Viewport sizes used

- **Desktop:** 1440 px CSS width (viewport 1440 × 900), `deviceScaleFactor: 2` → 2880 px-wide output. Full-page captures (`fullPage: true`).
- **Mobile:** 390 px CSS width (viewport 390 × 844), `deviceScaleFactor: 2`, `isMobile: true`, `hasTouch: true` → 780 px-wide output. Full-page captures.
- **Focused sample blocks:** captured at 1440 px desktop via element screenshot of the block's Card. For these (and only these) the sticky site header (`header.sticky`) was made `position: static` **at runtime in the browser session** so it would not overlay the top of taller-than-viewport elements during element capture. This is a screenshot-time DOM tweak only — no repo code was modified.

---

## 3. Sample block visible without awkward spacing?

**Yes, on all four pages.**
- **Home:** sits as its own band (`border-t`, `bg-neutral-50`) between the Journey steps and the closing Founding Charter CTA; padding matches the neighboring sections (`py-16`). No crowding.
- **Dossier:** sits immediately under the page header as the hero proof block, before the "Reviewed section by section" card; the page's `space-y-12` rhythm is preserved.
- **Pricing:** compact card directly under the header and above the pricing grid; consistent with the existing payment card spacing.
- **Apply:** compact card between the "Strong applications…" tip card and the form; small and unobtrusive.

---

## 4. Cover image sharp and not distorted?

**Yes.** The cover (`/samples/tenxpros-sample-dossier-cover.png`, 1680 × 2376) renders at its native aspect ratio with explicit `width`/`height` attributes, so there is no stretching or squashing. At `deviceScaleFactor: 2` the title text and the gold seal on the cover are crisp at both the home/dossier large size and the pricing/apply thumbnail size. The two supporting thumbnails on the Dossier page (Executive Snapshot, Eight Assets Map & Rubric) are legible.

---

## 5. CTAs clear?

**Yes.** Primary CTA is the site's navy filled button with a document icon:
- Home / Pricing / Apply: **"Preview a sample dossier"**
- Dossier: **"Preview the full sample"** + secondary outline button **"Open HTML preview"** with an up-right arrow.

Buttons use the existing button system (size `lg`), are high-contrast, and on mobile stack full-width as comfortable touch targets. All open in a new tab (`target="_blank" rel="noopener noreferrer"`).

---

## 6. Disclaimer visible but not visually dominant?

**Yes — correctly subordinate.** The microcopy ("Illustrative sample. Fictional participant. No real client data. Review labels are illustrative, not a certification decision.") renders as `text-xs` in muted `text-slate-500` directly under the CTAs on every variant. It is clearly readable on close inspection but does not compete with the headline or CTA — exactly the intended hierarchy.

---

## 7. Mobile layout acceptable?

**Yes.** At 390 px every variant collapses to a single column: cover image on top, then eyebrow → headline → body → full-width CTA(s) → disclaimer. No horizontal overflow, no clipped text, no overlapping elements. On the Dossier page the two supporting thumbnails remain a 2-up row — small but still readable as previews, with the full PDF one tap away. Compact cards (Pricing/Apply) center the cover thumbnail above the copy.

---

## 8. Does the Dossier page feel stronger than the other placements?

**Yes, clearly.** The Dossier placement is the deliberate "home" for the asset and reads as the strongest:
- Largest cover render (up to 320 px wide vs. compact ~120–136 px thumbnails on Pricing/Apply).
- The richest copy ("Preview the artifact the program is named for." + the 12-section / Eight Assets / reviewer-annotations / evidence-gap / rubric description).
- The only placement with **supporting page thumbnails** (Executive Snapshot + Eight Assets Map & Rubric) and the **secondary "Open HTML preview"** CTA.
- Positioned as the page hero proof, immediately under the header.

Home is a confident mid-page band; Pricing and Apply are intentionally compact and supportive. The visual weight ordering (Dossier > Home > Pricing ≈ Apply) matches the intended strategy.

---

## 9. Visual issues found

- **None blocking.** The integration renders correctly on all pages and breakpoints.
- **Capture-only note (not a site issue):** the sticky site header overlapped the top of the Dossier focused-block element on the first capture pass because that block sits high on the page. This is an artifact of element screenshots of tall elements under a sticky header; it was resolved at screenshot time by neutralizing `header.sticky` in the browser session. The live site is unaffected (the sticky header is correct site behavior).
- **Minor / optional (no action required):** on a 390 px viewport the two Dossier thumbnails are small; they are supporting previews only and the primary PDF CTA is adjacent, so this is acceptable. A future enhancement could stack them 1-up below ~420 px, but that is out of scope for this QA-only task.

---

## 10. Did you change any code?

**No.** No application code was modified for this QA task. `git diff --name-only` after QA is identical to before it: the only tracked changes are the four public marketing pages from the prior integration task, plus three pre-existing unrelated files (`portal/layout.tsx`, `lib/actions/admin.ts`, `lib/actions/applications.ts`) that were already modified at session start. QA added only:
- 12 PNG screenshots under `docs/design/sample-dossier-site-qa/`
- this report.

The only "tweak" was a **runtime, in-browser** `position: static` applied to the sticky header during focused-block capture — it lives in the throwaway screenshot script, never in the repo.

---

## 11. Commands run

```bash
# Tooling: Playwright present (@playwright/test); install its (unconfined) Chromium
cd app && npx playwright install chromium

# Serve the existing production build locally on an isolated port
pnpm start -p 3210            # build already produced by the prior task
# (health: curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3210/{,dossier,pricing,apply} -> 200)

# Capture: 4 pages × {desktop 1440, mobile 390} full-page + 4 focused sample blocks
node _qa-shots.mjs            # throwaway script (12 shots) — removed after run
node _qa-blocks.mjs           # re-capture focused blocks with sticky header neutralized — removed after run
# Output written directly to docs/design/sample-dossier-site-qa/ (Playwright Chromium is unconfined)

# Review (montages for inspection only)
montage *-sample-block.png -tile 2x2 ...   # ImageMagick
montage *-desktop.png      -tile 4x1 ...
montage *-mobile.png       -tile 4x1 ...

# Stop the local server (port 3210 only; the unrelated :3000 deployment left running)
fuser -k 3210/tcp
```

**Notes / caveats**
- The QA used **Playwright's own Chromium** (installed to `~/.cache/ms-playwright`, runs unconfined) rather than the AppArmor-confined snap Chromium, so full-page screenshots wrote straight into the repo with no staging needed.
- Screenshots were taken against the **production build** (`pnpm start`) for fidelity, not `next dev`.
- Screenshot scripts were temporary (created in `app/`, run, then deleted); they are not committed.
