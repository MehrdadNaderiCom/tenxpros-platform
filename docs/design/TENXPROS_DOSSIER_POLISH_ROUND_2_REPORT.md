# TenXPros — Dossier Polish Round 2 Report

**Task:** A narrow polish patch (message consistency, nav labels, mobile nav, accent consistency, mobile typography) + QA re-verification, before moving to Home/Pricing/Apply.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build green. QA re-run green on desktop (1440) and mobile (390).

---

## 1. Files changed

| File | Type | Change |
| --- | --- | --- |
| `app/src/components/shared/public-nav.tsx` | Modified | Primary nav relabeled to locked positioning; "How it works" removed from primary nav; indigo CTA accent; premium full-screen mobile menu (hamburger) + compact mobile "Apply". Converted to a client component for the menu state. |
| `app/src/components/shared/footer.tsx` | Modified | Brand line "domain" → "expertise"; footer labels aligned ("The Method", "The Dossier"); added "How it works" to the footer. |
| `app/src/components/marketing/dossier-instrument.tsx` | Modified | Mobile typography tuning (hero H1/body scale, section vertical padding). |
| `app/src/components/marketing/marketing-sections.tsx` | Modified | Brand-line eyebrow "domain" → "expertise". |
| `app/src/app/(public)/about/page.tsx` | Modified | Brand-line title "domain" → "expertise". |
| `app/src/app/(public)/program/page.tsx` | Modified | Brand-line H2 "domain" → "expertise". |
| `app/scripts/dossier-qa-verify.mjs` | Existing | Reused for QA (unchanged). |

> Nav and footer are shared across all public pages, so the message/label/accent changes intentionally propagate site-wide for consistency (that is the point of items 1, 2, 4). Routes are unchanged — only labels changed (e.g. "The Method" still links to `/program`).

---

## 2. Patch detail (against the requested scope)

### 1 — Public message consistency
Replaced the main marketing line **"You bring the domain. We bring the AI method."** → **"You bring the expertise. We bring the AI method."** in all four public surfaces where it appears: the footer, the (currently unused) `MarketingHero` eyebrow, the About page title, and the Program page H2. Methodologically-specific uses of "domain" were **left intact** (e.g. "Grounded Domain Knowledge Pack", the application form's "Professional domain" field, "domain, risk, stakeholders…").

### 2 — Primary nav label alignment
Primary nav is now: **The Method** (`/program`), **The Dossier** (`/dossier`), **Certification**, **Pricing**, **About**. **"How it works" was removed from the primary nav** and now lives in the footer and the mobile menu (so it stays discoverable without breaking the route). Directory/Radar remain out of the primary nav.

### 3 — Mobile nav polish (preferred option implemented)
The mobile header no longer relies on a large wrapped CTA. It now shows **logo + compact "Apply" + a hamburger button**. The hamburger opens a **full-screen mobile menu** (white, premium, consistent on light and dark pages) with the nav links, How it works, Login, and a full-width indigo "Apply for Founding Charter". Escape-to-close and body-scroll-lock are included; every link closes the menu.

> **Bug found & fixed (real layout bug):** the menu was initially rendered inside `<header>`, which uses `backdrop-blur`. `backdrop-filter` makes an element a containing block for `position: fixed` descendants, so `inset-0` filled only the ~68px nav bar and the menu links bled over the page. Fixed by moving the menu **outside** `<header>` (sibling in a fragment) so `fixed inset-0` is relative to the viewport. Verified by DOM probe: `document.elementFromPoint(195, 400)` returns the menu `<nav>`, not the page hero.

### 4 — Accent consistency
The primary action accent is now **cool indigo** everywhere: the nav CTA (desktop full + mobile compact + the menu CTA) and all Dossier-page primary CTAs (hero, sample preview, final CTA). **Gold stays reserved** for the Review Standard / credential moment only — no gold on any action.

### 5 — Mobile typography tuning
Reduced mobile vertical sprawl while keeping the premium feel:
- Hero **H1**: mobile `text-4xl` (36px) → `text-[2.05rem]` (≈32.8px, ~9% smaller); `sm:text-4xl md:text-5xl` preserve the larger desktop scale.
- Hero **body**: mobile `text-lg` → `text-base` (`sm:text-lg` keeps desktop).
- **Section vertical padding**: mobile `py-20` → `py-16` (still generous; `md:py-28` unchanged) in `SectionShell`, the hero, and the final CTA.

Net effect: mobile `scrollHeight` dropped **11563px → 11227px** (~336px less sprawl) with no change to the desktop layout and no loss of the large, premium headings.

---

## 3. QA results (re-run after the patch)

| Check | Desktop (1440×900) | Mobile (390×844) |
| --- | --- | --- |
| All 8 section headings present + visible + in-doc | ✅ 8/8 | ✅ 8/8 |
| Footer present & flush | ✅ top 6655 → bottom 6820 | ✅ top 10942 → bottom 11227 |
| **Horizontal overflow** | ✅ **0px** | ✅ **0px** |
| **Trailing blank after footer** | ✅ **0px** | ✅ **0px** |
| `scrollHeight` (= `body.scrollHeight`) | 6820px | 11227px (was 11563px) |
| Rogue tall/blank element | none (only `<main>`) | none (only `<main>`) |
| Mobile menu covers viewport (no bleed-through) | n/a | ✅ verified (elementFromPoint = menu nav) |
| Nav labels in DOM | The Method · The Dossier · Certification · Pricing · About | + How it works · Login in the menu |

Raw metrics: `docs/design/dossier-polish-round-2/qa-measurements.json`.

---

## 4. Screenshots generated

Folder: `docs/design/dossier-polish-round-2/` (previous screenshot folder `dossier-polish-round-1-verified/` deleted per the standing cleanup rule; `.md` reports preserved).

**Desktop (1440, DPR 2):** `dossier-desktop-top.png`, `-anatomy.png`, `-review-standard.png`, `-sample-section.png`, `-bottom.png`, `-full.png` (full-page = record-only; tall dark-theme captures downscale into apparent black bands — segmented shots are the source of truth).

**Mobile (390, DPR 2):** `dossier-mobile-top.png`, `-anatomy.png`, `-review-standard.png`, `-sample-section.png`, `-bottom.png`, `-full.png`, plus **`dossier-mobile-header-closed.png`** (compact header) and **`dossier-mobile-menu-open.png`** (full-screen hamburger menu).

---

## 5. Was any app logic touched?

**No.** Changes are limited to presentational components and public copy. No server actions, auth, database/Prisma/migrations, routes, admin workflows, participant-portal workflows, application flow, payment flow, or sample-dossier content were modified. `public-nav.tsx` became a client component to hold the menu open/close state — a presentational concern only; it is still rendered by the same server layout and links to the same routes.

`git status` shows no changes under `app/src/lib/actions`, `auth`, `app/prisma`, or `app/src/app/api` attributable to this patch (the untracked `authz.ts` and the `admin.ts`/`applications.ts` modifications predate this task).

---

## 6. Commands run

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ Pass |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/dossier` static, 59/59 pages |
| `node scripts/dossier-qa-verify.mjs` (→ dossier-polish-round-2) | ✅ Exit 0 — 8/8 headings, 0px overflow, 0px trailing, footer flush, both viewports |
| mobile menu capture + DOM probe | ✅ Menu covers viewport; new labels confirmed |

---

## 7. Caveats

- **Shared-component reach:** nav/footer changes appear on every public page, not just Dossier (intended for consistency). The other pages (Pricing/Apply/Program/Certification/About) are still on the older light page bodies; they now inherit the new nav labels, indigo nav CTA, mobile menu, and "expertise" brand line. Their own page rebuilds are the next sprints.
- **Mobile menu is light** (white) to stay consistent across both the dark Instrument pages and the still-light pages. When the rest of the site moves to the dark direction, revisit whether the menu should darken.
- **Full-page screenshots remain record-only** — the tall dark-theme aspect ratio downscales into apparent black bands (confirmed a capture artifact in the prior QA round). Use the segmented shots for review.
- **`MarketingHero`** (where one brand-line edit landed) is currently unused by any page; the edit keeps the string correct if it is ever reused.
