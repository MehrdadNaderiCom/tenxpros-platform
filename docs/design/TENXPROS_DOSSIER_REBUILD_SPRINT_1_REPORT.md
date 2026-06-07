# TenXPros — Dossier Page Rebuild Sprint 1 Report

**Sprint:** DOSSIER PAGE REBUILD SPRINT 1
**Scope:** Public Dossier page (`/dossier`) only. Marketing-only, presentational. The site's primary proof / trust page.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build all green. Visual QA captured (0px horizontal overflow at 1440px and 390px).

---

## 1. Files changed

| File | Type | Purpose |
| --- | --- | --- |
| `app/src/app/(public)/dossier/page.tsx` | Modified | Rebuilt the Dossier page as a dark "Instrument" composition; updated metadata description to match the proof-page role. |
| `app/src/components/marketing/dossier-instrument.tsx` | **New** | All eight Dossier sections as presentational server components, plus local `MonoLabel` / `SectionShell` primitives and the Instrument palette. Reuses the existing `/samples` proof assets via shared constants. |
| `app/scripts/dossier-rebuild-screenshots.mjs` | **New** | Playwright screenshot helper (1440px desktop + 390px mobile) used for visual QA. Tooling only. |
| `docs/design/dossier-rebuild-sprint-1/*.png` | **New** | Visual QA screenshots (see §9). |
| `docs/design/TENXPROS_DOSSIER_REBUILD_SPRINT_1_REPORT.md` | **New** | This report. |

> The previous Dossier page used light-theme shared components (`PageHeader`, `Card`, `SampleDossierPreview` "dossier" variant, `DossierSectionGrid`). Those shared components were **not** modified — the Dossier page simply no longer imports them. They remain available and intact for any other page. The dark proof section is a Dossier-specific layout (`DossierSample`) so the page matches the Instrument direction without altering `SampleDossierPreview`.

---

## 2. Sections implemented

Top to bottom, the full recommended structure:

1. **Premium Dossier Hero** (`DossierHero`) — eyebrow, H1/sub, PDF-preview primary CTA + Apply secondary, trust microcopy, and a hero "instrument" visual built from the **real** cover plus the **Executive Snapshot** and **Eight Assets & Rubric** excerpt thumbnails, with a `Reviewed` chip and `12 sections / public review rubric` metadata.
2. **What the Dossier Proves** (`DossierProves`) — three proof pillars.
3. **The 12-Section Anatomy** (`DossierAnatomy`) — the canonical 12 sections, numbered `01`–`12`, grouped into Frame / Design / Prove / Foresee phase bands with week ranges.
4. **Eight Assets Map** (`DossierAssetsMap`) — the 8 assets + an "assembled into one dossier" closing note.
5. **Reviewer Notes / Review Standard** (`DossierReviewStandard`) — review rationale + the 8 review criteria in a **gold-accented** panel (the credential/seal moment).
6. **Sample Dossier Preview** (`DossierSample`) — the strongest sample placement: large cover, both excerpt thumbnails with notes, PDF + HTML CTAs, and the illustrative disclaimer.
7. **What Makes It Different** (`DossierDifference`) — honest two-column comparison (generic course vs TenXPros dossier), no attacks on other programs.
8. **Final CTA** (`DossierFinalCta`) — apply-first / pay-after-acceptance close with Apply + View pricing.

---

## 3. Exact copy used

**Hero**
- Eyebrow: `The proof artifact`
- H1: `The Living AI Solution Dossier is the work behind the credential.`
- Sub: `Participants do not simply complete lessons. They turn one real professional problem into a structured, reviewed dossier: context, boundaries, workflow, evaluation, value, governance, and a 90-day path forward.`
- Primary CTA: `Preview the sample dossier` → `/samples/tenxpros-sample-dossier-excerpt.pdf` (new tab)
- Secondary CTA: `Apply for Founding Charter` → `/apply`
- Trust microcopy: `Illustrative sample. Fictional participant. No real client data. Review labels are illustrative, not a certification decision.`
- Visual metadata: `Living AI Solution Dossier`, `Reviewed`, `Cover · Excerpt`, `Executive Snapshot`, `Eight Assets & Rubric`, `12 sections`, `Public review rubric`

**What the Dossier Proves** — Headline: `A dossier proves that your AI work can be understood, reviewed, and defended.`
- Clear problem framing — *One real professional problem, scoped and defined precisely enough that someone else could review it.*
- Responsible solution design — *An AI-enabled workflow with explicit boundaries, governance, and the judgment calls left to a human.*
- Evidence-based value case — *An evaluation rubric, a test set, and a value argument — not a claim that it simply works.*

**The 12-Section Anatomy** — Headline: `Twelve sections, organized by the TenX Method.` Sub: `Each section moves the work forward through Frame, Design, Prove, and Foresee — from defining the problem to leading what comes next.`
- **Frame · Weeks 1–4:** 01 Professional Context · 02 Problem Definition · 03 AI Suitability Assessment
- **Design · Weeks 5–8:** 04 Context, Stakeholder & Initial Foresight Analysis · 05 Data & Evidence Review · 06 Workflow Before / After · 07 Risk, Ethics, Privacy & Compliance Review · 08 Responsible AI Solution Design
- **Prove · Weeks 9–10:** 09 Adoption & Communication Plan · 10 Value, Roadmap & Proof Plan
- **Foresee · Weeks 11–12:** 11 Personal AI Foresight Plan · 12 Final Recommendation

**Eight Assets Map** — Headline: `Eight assets become one professional dossier.` Sub: `Each asset is built during the program and assembled into the Living AI Solution Dossier — so the final artifact is the sum of reviewed, real work.` Closing note: `Assembled together, the eight assets form the reviewed Living AI Solution Dossier — the artifact at the center of the credential.`
- Personal AI Strategy Brief · AI Use-Case Portfolio · Interaction & Decision Kit · Grounded Domain Knowledge Pack · AI Evaluation Rubric & Test Set · Custom Assistants & AI Workflows · AI Value & Economics Case · Final Portfolio & 90-Day Roadmap (with the same short, non-overclaiming descriptors used on Home)

**Review Standard** — Headline: `Review is part of the product.` Body: `A dossier is not graded for effort or attendance. It is reviewed against explicit criteria — for clarity, boundaries, prioritization, evaluation, usability, value evidence, governance, and roadmap realism.`
- The eight review criteria: Problem clearly defined · Risks and boundaries explicit · Use-cases chosen and prioritized · Evaluation rubric and test set exist · Workflow is usable · Value is shown with evidence · Governance and confidentiality respected · Roadmap is realistic

**Sample Dossier Preview** — Headline: `Preview the artifact before you apply.` Body: `The sample dossier is fictional, but the structure and review standard are real. It shows a professional problem moving through the TenX Method, including reviewer notes, an intentional evidence gap, and the rubric mapping.`
- Thumb notes: Executive Snapshot — *The one-page read of the problem, approach, and result.* · Eight Assets & Rubric — *How the assets map to the dossier and the review criteria.*
- CTAs: `Preview the full sample` (PDF) · `Open HTML preview` (HTML); disclaimer repeated.

**What Makes It Different** — Headline: `A completion certificate is not a reviewed artifact.`
- *A generic AI course:* Watches lessons · Learns tools · Receives a completion certificate · No reviewed professional artifact
- *The TenXPros dossier:* Starts from one real problem · Builds a structured AI adoption system · Includes evaluation and governance · Reviewed against explicit criteria · Becomes a professional proof asset

**Final CTA** — Headline: `Bring one real problem. Leave with reviewed evidence.` Body: `Apply for the Founding Charter with a serious professional problem. Payment happens only after acceptance.` CTAs: `Apply for Founding Charter` → `/apply` · `View pricing` → `/pricing`

---

## 4. Design system decisions

Aligned 1:1 with the approved Home Instrument language so the two pages read as one system:

- **Base** `#070B14`; **panels** `#0B1120`; **hover** `#0E1424`.
- **Hairlines** `border-white/10` with `gap-px` over `bg-white/10` tracks for grid separation.
- **Accent** cool indigo (`indigo-500/400` CTAs, `indigo-300` mono labels/indices, indigo `Reviewed` chip).
- **Gold (`#C9A961`)** used **only** in the Review Standard section — the section label, the criteria panel border/ring, and the criteria check icons — reserving gold for the review-standard / credential moment. The "What's different" and anatomy sections deliberately stay indigo/neutral.
- **Typography** Inter for headings/body; **JetBrains Mono** (`font-mono`) for eyebrows, section indices, week ranges, and metadata.
- **CTAs** reuse the existing `ButtonLink` primitive with dark-theme overrides via `className` (safe — `cn` uses `tailwind-merge`), with `whitespace-nowrap` so labels stay single-line on desktop and full-width on mobile.
- **Restraint** two low-opacity indigo glows (hero, final CTA) only; no AI stock imagery, no fake screenshots — the only product visuals are the real sample-dossier assets.
- **Maintainability** the Dossier sections live in their own `dossier-instrument.tsx`; the file is self-contained (local `MonoLabel`/`SectionShell`) to isolate it from the approved Home component and avoid cross-file coupling.

---

## 5. How the sample dossier assets were used

All five public assets are referenced; none were modified:

- `…-cover.png` — hero instrument panel (mounted) **and** the large focal object in the Sample Preview section.
- `…-snapshot.png` (Executive Snapshot) — hero thumbnail **and** a captioned card in the Sample Preview section.
- `…-assets-rubric.png` (Eight Assets & Rubric) — hero thumbnail **and** a captioned card in the Sample Preview section.
- `…-excerpt.pdf` — every primary/preview CTA and every cover/thumbnail link (opens in a new tab).
- `…-excerpt.html` — the "Open HTML preview" CTA.

The **illustrative/fictional disclaimer** appears twice (hero trust microcopy and the Sample Preview section), and all alt text retains the "illustrative … fictional participant Maya R." description. The Sample Preview is the strongest placement on the site (cover + both excerpt thumbnails + both CTAs + disclaimer).

---

## 6. Accessibility notes

- **Contrast:** body copy is `slate-300` on `#070B14`/`#0B1120` (AA for normal text); headings/section names are white/`slate-100`; the dimmest text (comparison "generic course" column, captions) is `slate-400`/`slate-500` used only for secondary/large text.
- **Semantics:** one `<h1>` (hero), `<h2>` per section, `<h3>` for cards/phase names; the anatomy and asset lists are real `<ul>/<li>`; review criteria and comparison columns are lists.
- **Focus:** all CTAs and every image link keep visible focus rings, retuned to indigo with a dark ring-offset so they read on the dark base.
- **Links/new tabs:** every PDF/HTML link uses `target="_blank" rel="noopener noreferrer"`; the cover/thumbnail links carry descriptive `aria-label`s noting the PDF opens in a new tab. Decorative glows and inline icons are `aria-hidden`.

---

## 7. Mobile notes (390px verified, 0px overflow)

- Hero stacks to one column; CTAs go full-width and single-line; the instrument panel keeps the cover beside its two thumbnails and still fits.
- Proof pillars 3→1; anatomy phase bands stack (phase label above its section grid, which collapses 2→1); eight assets 4→2→1.
- Review Standard stacks the intro above the gold criteria panel; criteria collapse to one column.
- Sample Preview stacks cover-over-thumbnails-over-CTAs; comparison columns stack.
- Section padding scales `py-20` (mobile) / `py-28` (desktop). Measured horizontal overflow: **0px**.

---

## 8. Commands run and results

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ Pass (no errors) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/dossier` builds static (`○`), 59/59 pages generated |
| `node scripts/dossier-rebuild-screenshots.mjs` | ✅ Wrote 4 screenshots; overflow desktop **0px**, mobile **0px** |

> Build note: the build prints the existing Next.js `<img>` lint hint for `dossier-instrument.tsx` and `sample-dossier-preview.tsx` (same advisory already present on the shared component). It is a non-blocking warning; the build succeeds. Plain `<img>` is intentional and consistent with the existing proof-asset components.

---

## 9. Screenshot paths

- `docs/design/dossier-rebuild-sprint-1/dossier-desktop.png` (1440px, full page)
- `docs/design/dossier-rebuild-sprint-1/dossier-mobile.png` (390px, full page)
- `docs/design/dossier-rebuild-sprint-1/dossier-hero-desktop.png` (1440px, hero above the fold)
- `docs/design/dossier-rebuild-sprint-1/dossier-sample-section.png` (1440px, sample-dossier proof)

---

## 10. Caveats

- **Light shared nav/footer over a dark page.** Same intentional state as Home; the route-aware-nav proposal from Home Polish Round 1 still applies and is deferred to a future shared-nav sprint.
- **Anatomy phase grouping is illustrative structure.** The mapping of the 12 sections to Frame/Design/Prove/Foresee and the week ranges mirror the program's method and Home page; it communicates structure and is not a per-participant guarantee.
- **`DossierSectionGrid`** (in `marketing-sections.tsx`) is no longer used by the Dossier page but remains exported and intact for any other consumer; it was not modified.
- A small amount of presentational markup (mono labels, CTA classes, asset descriptors) is intentionally consistent with `home-instrument.tsx` rather than shared, to keep the approved Home component untouched. If a third Instrument page is built, extracting shared primitives into one file would be the natural cleanup.

---

## 11. Boundary confirmation

No server actions, auth, database/Prisma/migrations, admin workflows, participant-portal workflows, application-form logic, or payment logic were changed. The sample-dossier PDF/HTML/cover/thumbnail content was not changed. The shared `SampleDossierPreview` and `DossierSectionGrid` components were not modified, and no other pages were touched. No routes were added, removed, or broken. No heavy dependencies were introduced. No fake testimonials or logos, no guaranteed-outcome or comparative ("better than HBS/MIT/…") claims, and the product is not positioned as founder-led. Changes are confined to the public Dossier page, a new Dossier-only marketing component, and QA tooling/artifacts.
