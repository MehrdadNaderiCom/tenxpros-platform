# TenXPros — About Rebuild Round 1 Report

**Task:** Rebuild the public About page (`/about`) into the 9-section Instrument experience — a trust page where founder credibility is a layer, not the category.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build green. QA green on desktop (1440) and mobile (390) — 9/9 headings visible, footer flush, 0px horizontal overflow, 0px trailing blank, mobile menu verified, and the unsourced "19,000 hours" claim confirmed absent.

---

## 1. Files changed

| File | Type | Change |
| --- | --- | --- |
| `app/src/app/(public)/about/page.tsx` | Modified | Rebuilt as a dark Instrument composition of the 9 sections; metadata updated. Route `/about` unchanged. |
| `app/src/components/marketing/about-instrument.tsx` | **New** | All 9 presentational sections + local primitives, Instrument palette, restrained founder block. Self-contained, mirrors the other rebuilt pages. |
| `app/scripts/about-qa-verify.mjs` | **New** | QA + screenshot tooling (segmented captures + a claims guard that asserts "19,000" is absent + mobile menu + DOM sanity checks). Not part of the app bundle. |

Shared nav/footer reused unchanged. The previous page's light components (`PageHeader`, `Card`) are no longer used by `/about`; they remain intact for other consumers.

---

## 2. Existing About / founder claims inspected

| Source | Claim found | Decision |
| --- | --- | --- |
| Old `/about` page | Generic philosophy copy ("partnership not replacement," "selective by design," "adaptive not generic") — **no founder specifics, no numbers** | Replaced with the new structure; the spirit (partnership, selectivity, adaptiveness) is preserved across sections. |
| `home-instrument.tsx` `HomeFounderBand` (committed `75f5a7e`, **not rendered on any live page**) | "Mehrdad Naderi, an official DeepLearning.AI Ambassador with **19,000+ hours** of professional training and applied AI work across HealthTech, FinTech, EdTech, and PropTech." | Partially preserved — see §3/§4. |
| `docs/strategy/TenXPros_Final_Strategy_v3.md` | Extensive **"founder-led"** role copy (coaching tiers, "Founder-Led, Async-First…") | **Avoided** — the task forbids "founder-led" as the headline advantage; not used. |
| `marketing-sections.tsx`, terms/privacy/refund | "Founder-led launch cohort" / "Founder/legal review" (operational) | Out of scope; untouched. |

No testimonials, logos, client names, degrees, universities, or awards exist in the repo to draw from — none were invented.

## 3. Claims preserved (repo-verified)

- **"Created by Mehrdad Naderi"** + the generic scope from the task's suggested tone (AI training, AI adoption strategy, product thinking, professional education).
- **"An official DeepLearning.AI Ambassador"** and the four applied sectors **HealthTech, FinTech, EdTech, PropTech** — both exist in committed repo content (`home-instrument.tsx`, user-authored). Presented as a restrained trust layer, closed with "The standard — not the name behind it — is what the credential rests on."

## 4. Claims softened / omitted

- **"19,000+ hours" — OMITTED.** It is an exact, unsourced quantitative claim; this task explicitly says "Do not add unsupported exact numbers… if you cannot verify, omit or mark as a future TODO." It exists in the repo but cannot be independently verified, so it is **not published**. The QA claims-guard asserts the string "19,000" does not appear in the rendered page (confirmed `false`).
  - **TODO (before publishing):** verify the "19,000+ hours" figure (and the Ambassador status) against a citable source; only then consider adding the hours figure.
- **"Founder-led" framing — AVOIDED** entirely (QA confirms it is absent). Founder credibility is section 5 of 9, a single restrained panel, with no flattery and an explicit "the standard, not the name" close.
- No accreditation / university-equivalence / outcome-guarantee language anywhere (QA guard confirms none of "accredited / guaranteed job|income" appear).

---

## 5. Design decisions

- **Same Instrument system** as the other six rebuilt pages: base `#070B14`, panels `#0B1120`, hairline rules, indigo action accent, JetBrains-Mono labels, two restrained indigo glows.
- **Hero mission panel** reads the core thread as a readout (Expertise→you, AI method→TenXPros, Work→reviewed dossier, Credential→follows evidence).
- **Gold reserved for the standard/credential moment** — the "The standard is the product" panel (gold border/ring + gold shield icons). The founder block uses a quiet **indigo** avatar (not gold), keeping gold for the review/credential standard rather than the person.
- **Founder is visually secondary** — one centered panel mid-page, not a hero, not a grid of accolades.
- **Mobile typography/padding** match the other pages (H1 `text-[2.15rem] → sm:text-4xl → md:text-5xl`; `py-16`/`py-28`).

## 6. Copy decisions

- **Why it exists (5s):** H1 "AI adoption has become professional judgment work." + the "expertise + AI method" trust line.
- **Problem → answer → standard:** "Most AI training stops too early." → a 6-step method spine → "The standard is the product." (criteria, sample, outcomes, verification, confidentiality).
- **Principles (7):** evidence over attendance, human accountability over automation theatre, field-specific over generic prompts, confidentiality by design, review standards before credentials, practical value over hype, clear limits over exaggeration.
- **"What TenXPros is not" (6):** not a tools course / not a university degree or accreditation / not a prompt library / not a shortcut to guaranteed outcomes / not a place for confidential data / not certification by attendance.
- No certification-for-everyone promise; no income/job/promotion/business claims; core thread kept throughout.

---

## 7. CTA / link verification (served HTML)

| CTA / link | Target | Count |
| --- | --- | --- |
| Hero + Final — Apply for Founding Charter | `/apply` | 4 (incl. nav) |
| Hero + Final — See the method | `/program` | 4 (incl. nav + footer) |
| Trust — See the review standard | `/certification` | 3 (incl. nav + footer) |
| Trust — Preview sample dossier | `/samples/tenxpros-sample-dossier-excerpt.pdf` (new tab) | ✅ |
| Nav — The Method/The Dossier/Certification/Pricing/About | `/program` `/dossier` `/certification` `/pricing` `/about` | ✅ |

Route `/about` unchanged; no routes added/removed.

---

## 8. Commands run and results

| Command | Result |
| --- | --- |
| `git status --short` (pre-edit) | clean (HEAD `fe49689`) |
| `pnpm typecheck` | ✅ Pass (exit 0) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/about` static (`○`), 59/59 pages |
| `node scripts/about-qa-verify.mjs` | ✅ Exit 0 — 9/9 headings, 0px overflow, 0px trailing, footer flush, "19,000" absent, menu verified |

---

## 9. Screenshots generated

Folder: `docs/design/about-rebuild-round-1/` (12 required PNGs + `qa-measurements.json`)

- `about-desktop-top.png` — hero + mission panel
- `about-desktop-problem.png` — the problem
- `about-desktop-standard.png` — the standard (gold panel)
- `about-desktop-founder.png` — restrained founder block
- `about-desktop-principles.png` — principles
- `about-desktop-proof.png` — trust-before-applying
- `about-desktop-bottom.png` — final CTA + footer
- `about-mobile-top.png`, `-founder.png`, `-proof.png`, `-bottom.png`
- `about-mobile-menu-open.png` — full-screen hamburger menu

---

## 10. Mobile QA results (390px)

| Check | Result |
| --- | --- |
| Horizontal overflow | **0px** |
| Trailing blank after footer | **0px** |
| Footer flush | ✅ 8373 → 8658 (= scrollHeight) |
| Section headings visible + in-doc | ✅ 9/9 |
| Founder block stacks (restrained) | ✅ |
| Unsupported "19,000" claim | ✅ absent |
| Mobile menu covers viewport | ✅ `elementFromPoint(195,400)` = menu `<nav>` |

(Desktop: scrollHeight 5934px, 0px overflow, 0px trailing, footer flush 5769→5934, 9/9 headings, maxGap 814px — tight, content-filled.)

---

## 11. Was any app logic touched?

**No.** Only the About page and a new presentational marketing component were added/edited, plus QA tooling. No server actions, auth, Prisma/database/migrations, admin, participant portal, application/payment/enrollment logic, or routes. `git status` shows no changes under `app/src/lib`, `app/prisma`, `(admin)`, `(participant)`, or `api`.

## 12. Screenshot retention cleanup performed

Per "keep only the newest page's QA folder," after generating `about-rebuild-round-1/` I deleted the older `docs/design/program-rebuild-round-1/`. Result: `docs/design/` contains a single screenshot folder (`about-rebuild-round-1/`) plus the `.md` reports (none deleted). The deletion shows as `D` in `git status`; the folder remains recoverable from commit `fe49689`. No commit was made.

## 13. Caveats

- **"19,000+ hours" is intentionally unpublished** pending verification (see §4). If a citable source is confirmed, it can be added to the founder block.
- The **"DeepLearning.AI Ambassador"** descriptor and sector list are preserved from repo content; they should also be confirmed against a citable source during a content review (they were authored in the original Home spec, not independently verified here).
- **Shared nav/footer** unchanged and identical to the other rebuilt pages.
- **Full-page screenshots intentionally not generated** (tall dark-theme downscaling artifact); segmented shots are the source of truth.

---

## 14. Final `git status --short`

```
 M app/src/app/(public)/about/page.tsx
 D docs/design/program-rebuild-round-1/…  (12 files — retention cleanup)
?? app/scripts/about-qa-verify.mjs
?? app/src/components/marketing/about-instrument.tsx
?? docs/design/TENXPROS_ABOUT_REBUILD_ROUND_1_REPORT.md
?? docs/design/about-rebuild-round-1/
```
No commit was made. `about-instrument.tsx` is a new build-required file (imported by `/about`) to `git add` in the next checkpoint commit, alongside this report, the QA script, the new screenshot folder, and the `program-rebuild-round-1/` deletions.
