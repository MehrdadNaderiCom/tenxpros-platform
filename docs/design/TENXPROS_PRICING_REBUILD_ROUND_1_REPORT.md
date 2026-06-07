# TenXPros — Pricing Rebuild Round 1 Report

**Task:** Rebuild the public Pricing page (`/pricing`) into the 9-section structure using the same "The Instrument" visual language as Home and Dossier.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build green. QA green on desktop (1440) and mobile (390) — 8/8 headings visible, footer flush, 0px horizontal overflow, 0px trailing blank, mobile menu verified.

---

## 1. Files changed

| File | Type | Change |
| --- | --- | --- |
| `app/src/app/(public)/pricing/page.tsx` | Modified | Rebuilt as a dark Instrument composition of the 9 pricing sections; metadata updated. Route `/pricing` unchanged. |
| `app/src/components/marketing/pricing-instrument.tsx` | **New** | All 9 presentational sections + local `MonoLabel`/`SectionShell` primitives, Instrument palette, and the sample-asset constants. Self-contained (mirrors the Home/Dossier pattern). |
| `app/scripts/pricing-qa-verify.mjs` | **New** | QA + screenshot tooling (segmented captures incl. the no-heading card section and the mobile menu, plus DOM sanity checks). Not part of the app bundle. |

**Shared nav/footer reused unchanged.** No other source files were touched. The previous page's light-theme imports (`PricingGrid`, `SampleDossierPreview`, `PageHeader`, `Card`) are no longer used by `/pricing`; those components remain intact for their other consumers.

---

## 2. Design decisions

- **Same Instrument system as Home/Dossier:** base `#070B14`, panels `#0B1120`, hairline `border-white/10`, indigo action accent, JetBrains-Mono labels, two restrained indigo glows (hero + final CTA). Reads as the same premium product.
- **The Founding Charter card is visually dominant (acceptance criterion):** centered `max-w-3xl`, indigo border + ring, an inner indigo glow, `$997` at `text-6xl`, the 10-item inclusion checklist, and a full-width indigo CTA. It is the largest, brightest object on the page.
- **The ladder is clearly secondary:** a compact hairline rail; the Founding row is indigo-highlighted, the four later tiers are muted with neutral "Preview" chips. Prices read as a rising progression, not a discount table.
- **Gold used only as a charter seal:** a single small gold "Charter 01" marker on the Founding card. No gold on any action — indigo owns all CTAs.
- **No loud SaaS pricing-table clichés, no fake scarcity:** no countdowns, no "X seats left" ticker. The only stated limit is "first 10 accepted members," repeated honestly, with an explicit "No countdowns" note under the ladder.
- **Comparison is responsive and honest:** a 4-column grid table on desktop; on mobile it becomes three stacked cards (one per offer) so there is **no horizontal scroll**. The TenXPros column is indigo-highlighted.
- **FAQ uses native `<details>/<summary>`** — accessible, keyboard-operable, no client JS, with a `+` that rotates on open.
- **Mobile typography matches the other rebuilt pages** (H1 `text-[2.15rem] → sm:text-4xl → md:text-5xl`; section padding `py-16` mobile / `py-28` desktop).

## 3. Pricing / copy decisions

- **Premium, not cheap; no discount language, no apology.** The frame is "what you are paying for is not a video course" and "a reviewed professional asset, not watched lessons." `$997` is presented as the **lowest founding entry point**, not a sale.
- **Apply-first / pay-after-acceptance is everywhere:** hero H1, hero readout ("Before acceptance $0 · Payment Only after acceptance"), card footnote ("No payment details required to apply"), the 4-step "How payment works" flow, and the FAQ.
- **Ladder copy (verbatim):** "The price increases as the founding window closes. The program structure remains the same; the Founding Charter is the lowest available entry point for the first cohort." Tiers: Founding $997 (Open now) · Early $1,247 · Late $1,497 · Final $1,747 · Standard $1,997 (all Preview).
- **University framing is respectful and non-competitive:** headline "Different by design — not a replacement for university executive education," plus the suggested paragraph ("Universities are strongest for institutional perspective…"). **No university is named**, and there is **no claim of being better** than HBS/MIT/Stanford/Wharton/Oxford. The comparison's "Typical price" uses safe generic benchmarks (Tools: "Free – ~$500"; University: "Often $10,000+"; TenXPros: "$997 (Founding Charter)").
- **FAQ answers are honest and non-hype:** e.g. "Is the credential recognized?" → "a verifiable credential backed by a public review rubric and a reviewed dossier… its weight comes from the evidence behind it, not from an accreditation body." No guaranteed outcomes; the 12-week answer says "certification is based on the work, not the clock."

---

## 4. CTA / link verification (served HTML)

| CTA / link | Target | Present |
| --- | --- | --- |
| Hero primary, Card, Payment step, Final CTA — Apply for Founding Charter | `/apply` | ✅ (×5 incl. nav) |
| Hero secondary, Proof, Final CTA — Preview sample dossier | `/samples/tenxpros-sample-dossier-excerpt.pdf` (new tab) | ✅ |
| Proof — Open HTML preview | `/samples/tenxpros-sample-dossier-excerpt.html` (new tab) | ✅ |
| Proof — cover + 2 thumbnails | sample PDF | ✅ |
| Nav — The Method/The Dossier/Certification/Pricing/About | `/program` `/dossier` `/certification` `/pricing` `/about` | ✅ |

Route `/pricing` unchanged; no routes added/removed.

---

## 5. Commands run and results

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ Pass (exit 0) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/pricing` static (`○`), 59/59 pages |
| `node scripts/pricing-qa-verify.mjs` | ✅ Exit 0 — 8/8 headings, 0px overflow, 0px trailing, footer flush, menu verified |

---

## 6. Screenshots generated

Folder: `docs/design/pricing-rebuild-round-1/` (11 required PNGs + `qa-measurements.json`)

- `pricing-desktop-top.png` — hero + price readout
- `pricing-desktop-card.png` — Founding Charter card (dominant)
- `pricing-desktop-ladder.png` — charter ladder
- `pricing-desktop-proof.png` — sample dossier proof
- `pricing-desktop-bottom.png` — FAQ + final CTA + footer
- `pricing-mobile-top.png`, `-card.png`, `-ladder.png`, `-proof.png`, `-bottom.png`
- `pricing-mobile-menu-open.png` — full-screen hamburger menu

Folders **preserved** (not deleted): `docs/design/dossier-polish-round-2/`, `docs/design/home-rebuild-round-1/`.

---

## 7. Mobile QA results (390px)

| Check | Result |
| --- | --- |
| Horizontal overflow | **0px** |
| Trailing blank after footer | **0px** |
| Footer flush | ✅ 10572 → 10857 (= scrollHeight) |
| Section headings visible + in-doc | ✅ 8/8 |
| Mobile menu covers viewport (no bleed-through) | ✅ `elementFromPoint(195,400)` = menu `<nav>` |
| Founding card stacks (10 items, full-width CTA) | ✅ |
| Comparison stacks to 3 cards (no horizontal scroll) | ✅ |

(Desktop: scrollHeight 7286px, 0px overflow, 0px trailing, footer flush 7121→7286, 8/8 headings.) The largest heading gaps correspond to content-filled sections with no `<h2>` — the Founding card (desktop) and the stacked comparison (mobile) — not blank space.

---

## 8. Was any app logic touched?

**No.** Only the Pricing page and a new presentational marketing component were added/edited, plus QA tooling. No server actions, auth, Prisma/database/migrations, admin, participant portal, application/payment/enrollment logic, or routes. Payment timing is **described**, not implemented; the CTA links to the existing `/apply` route. `git status` shows no changes under `app/src/lib/actions`, `auth`, `app/prisma`, `app/src/app/api`, or `(participant)`.

---

## 9. Caveats

- **Shared nav/footer reach:** the nav/footer are shared, so they look identical to Home/Dossier here (intended). The still-light Apply/Program/Certification/About pages remain pending their own rebuilds.
- **Comparison "Typical price" benchmarks are generic ranges**, not sourced figures, and no institution is named — deliberately conservative to avoid unverifiable or comparative claims.
- **Full-page screenshots intentionally not generated** (tall dark-theme downscaling artifact, confirmed in the Dossier QA round); segmented shots are the source of truth.
- The Founding-card section has no `<h2>` (it is a card), so it is anchored for QA on the unique string "First 10 accepted members" rather than a heading.

---

## 10. Final `git status --short`

```
 M app/src/app/(public)/pricing/page.tsx
?? app/scripts/pricing-qa-verify.mjs
?? app/src/components/marketing/pricing-instrument.tsx
?? docs/design/TENXPROS_PRICING_REBUILD_ROUND_1_REPORT.md
?? docs/design/pricing-rebuild-round-1/
```
No commit was made (not instructed). `pricing-instrument.tsx` is a new build-required file (imported by `/pricing`) and should be `git add`-ed before the next merge/deploy, alongside this report, the QA script, and the screenshot folder.
