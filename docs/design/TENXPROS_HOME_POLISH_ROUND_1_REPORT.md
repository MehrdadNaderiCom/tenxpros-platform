# TenXPros — Home Polish Round 1 Report

**Sprint:** HOME POLISH ROUND 1 (post Home Rebuild Sprint 1)
**Scope:** Public Home page (`/`) only — polish pass. Structure, copy spine, and "The Instrument" direction preserved.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build all green. Visual QA captured.

---

## 1. Files changed

| File | Type | Purpose |
| --- | --- | --- |
| `app/src/components/marketing/home-instrument.tsx` | Modified | All five polish fixes (CTA wrapping, hero panel proof impact, grid readability, founder band presence). Only this Home component was touched. |

No other source files were changed. `page.tsx`, the shared nav/footer, UI primitives, and all other routes are untouched. (`home-instrument.tsx` shows as untracked in git because it was added in the prior sprint and not yet committed.)

---

## 2. Exact polish changes made

### Fix 1 — Hero CTA wrapping
- Added `whitespace-nowrap` to the shared `PRIMARY_CTA` / `SECONDARY_CTA` class constants, so every Instrument CTA stays on a single line on desktop. On mobile the buttons are `flex-col` full-width, so labels remain whole and readable.
- Shortened the two hero labels per the preferred copy:
  - Primary: `Apply for the Founding Charter` → **`Apply for Founding Charter`**
  - Secondary: `Preview a sample dossier` → **`Preview sample dossier`**
- The Sample Proof and Final CTA buttons inherited the `whitespace-nowrap` fix automatically (shared constants); their labels were left unchanged because they have more horizontal room.

### Fix 2 — Hero instrument panel proof impact
- **Cover enlarged** from `w-[116px] sm:w-[132px]` to `w-[150px] sm:w-[176px]` (~33% larger).
- **Mounted framing:** the cover now sits inside a `border + bg-white/[0.03] + p-2` "mount," reading as a real, framed proof object rather than a floating thumbnail, with a mono caption `Excerpt · 12 sections`.
- **Stronger hierarchy in the readout:** the method list became a real `<ul>`, each phase prefixed with a mono index (`01`–`04`), phase names raised to `text-slate-100`, week values to `text-slate-400`.
- **Status + verification emphasis:** the `Reviewed` chip is slightly larger with a brighter indigo (`indigo-200` on `bg-indigo-500/15`); the footer `Verified credential` now leads with a shield icon, and `Public review rubric` is brighter (`indigo-200/90`).
- Panel padding increased (`p-5` → `p-6 sm:p-7`) for a more premium, less cramped feel. No new effects, no fake screenshots — the only product-like visual remains the real sample-dossier cover.

### Fix 3 — Dense-grid readability
- **Eight Assets:** index numbers `indigo-300/70` → `indigo-300`; descriptions `slate-400` → `slate-300` (titles already white).
- **The TenX Method:** phase questions `slate-400` → `slate-300`.
- **Who it is for / Not for:** "For" items raised `slate-200` → `slate-100`; "Not for" items raised from low-contrast `slate-500` → `slate-400` with the minus icon `slate-600` → `slate-500`. The visual hierarchy between the two columns is preserved (positive = bright + indigo check; negative = dimmer + neutral minus), but the "Not for" text now clears AA.
- No size/padding inflation — density unchanged; only contrast moved.

### Fix 4 — Founder credibility band
- Promoted from an almost-invisible inline line to a **contained trust panel**: `rounded-xl border border-white/10 bg-[#0B1120]` with comfortable padding.
- Added a quiet circular **Award** icon badge (indigo, `aria-hidden`) as a credential cue.
- Text raised to `text-[0.95rem] text-slate-300` with the name in white; kept the `Designed by` mono label.
- Still **not** a headline, still proof-based and modest — no "founder-led" framing, no claim escalation. It now registers as a trust layer without competing with the section headers.

### Fix 5 — Nav / dark-home transition
- **Not implemented this sprint** (see §8). Directory and Radar remain out of the primary nav.

---

## 3. Before / after rationale

| Area | Before | After | Why |
| --- | --- | --- | --- |
| Hero CTAs | Primary and secondary labels wrapped to two lines on desktop, looking broken | Single-line on desktop, full-width on mobile | A wrapped primary CTA undercuts the premium read and weakens the click target hierarchy |
| Hero panel | Small cover, flat readout, easy to dismiss as decoration | Larger mounted cover + indexed readout + emphasized review/verification metadata | The panel is the page's first proof moment; it must feel like a real, reviewed artifact |
| Grids | Some body text at low contrast (`slate-400`/`slate-500`) | Raised to `slate-300`/`slate-400`/`slate-100` where weakest | Senior, often non-technical readers; legibility must not be traded for mood |
| Founder band | Nearly invisible inline sentence | Contained panel with a quiet icon | A credibility signal that no one notices provides no trust value |

---

## 4. Checklist against the feedback

- **CTA wrapping fixed?** ✅ Yes — single-line on desktop (nowrap + shorter labels), full-width and readable on mobile. Verified at 1440px and 390px (0px horizontal overflow).
- **Hero panel proof impact improved?** ✅ Yes — larger mounted cover, indexed method readout, stronger `Reviewed` / `Verified credential` / `Public review rubric` hierarchy.
- **Readability improvements?** ✅ Yes — contrast raised in Eight Assets, TenX Method, and the For/Not-for columns without adding bulk.
- **Founder band adjustment?** ✅ Yes — contained panel + quiet icon; still modest, still not a headline.
- **Nav touched?** ❌ No — proposal documented below, no risky shared change made.

---

## 5. Commands run and results

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ Pass (no errors) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/` builds static (`○`), 59/59 pages generated |
| `node scripts/home-rebuild-screenshots.mjs` (SHOT_OUT=home-polish-round-1) | ✅ Wrote 4 screenshots; mobile horizontal overflow measured at **0px** |

---

## 6. Screenshot paths

- `docs/design/home-polish-round-1/home-desktop.png` (1440px, full page)
- `docs/design/home-polish-round-1/home-hero-desktop.png` (1440px, hero above the fold)
- `docs/design/home-polish-round-1/home-sample-section.png` (1440px, sample-dossier proof)
- `docs/design/home-polish-round-1/home-mobile.png` (390px, full page)

---

## 7. Accessibility / mobile notes

- Contrast moved upward everywhere it was weakest; the dimmest remaining body text ("Not for") is now `slate-400` on `#0B1120`, which clears AA for normal text.
- Hero CTAs verified single-line on desktop and full-width on mobile; **0px** horizontal overflow at 390px with the larger cover.
- New founder icon and the panel mount are decorative and `aria-hidden`; semantics (one `<h1>`, section `<h2>`s, real lists) are unchanged. The method readout is now a semantic `<ul>`.

---

## 8. Nav / dark-home transition — proposal (not implemented)

The white sticky nav over the dark Home is functional and high-contrast but visually breaks the Instrument direction at the very top of the page.

**Recommended low-risk option (for a future sprint, with sign-off):** make `PublicNav` route-aware via a small client wrapper using `usePathname()` — on `/` only, render a transparent/dark variant (dark translucent background, light logo lockup, light links); on every other route, render exactly today's light nav. This is additive and gated on the home path, so other pages are untouched by default.

**Why not now:** `PublicNav` is a shared server component rendered on every public route. Converting it to a client component and branching its styling is a cross-page change that exceeds a Home-only polish pass and carries regression risk (logo color, focus states, mobile button, hydration). Per the brief, this is proposed rather than implemented. Directory and Radar remain out of the primary nav.

---

## 9. Backend / app-logic confirmation

No server actions, auth, database/Prisma/migrations, admin workflows, participant-portal workflows, application-form logic, or payment logic were changed. The sample-dossier PDF/HTML/cover content was not changed. The shared `SampleDossierPreview` component and all non-Home pages were not modified. The shared nav/footer were not modified in this round. No routes were added, removed, or broken. No new dependencies. No new claims, testimonials, or logos. All changes are confined to presentational classes and short label copy in `home-instrument.tsx`.
