# TenXPros — Home Rebuild Sprint 1 Report

**Sprint:** HOME REBUILD SPRINT 1 — "The Instrument" Direction
**Scope:** Public Home page (`/`) only. Marketing-only, presentational.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build all green. Visual QA captured.

---

## 1. Files changed

| File | Type | Purpose |
| --- | --- | --- |
| `app/src/app/(public)/page.tsx` | Modified | Rebuilt Home as a dark "Instrument" composition; updated metadata (title/description) to match locked positioning. |
| `app/src/components/marketing/home-instrument.tsx` | **New** | All nine Home sections as presentational server components, plus shared `MonoLabel` / `SectionShell` primitives and the Instrument palette. Reuses the existing sample-dossier public assets. |
| `app/src/components/shared/public-nav.tsx` | Modified (minimal) | De-promoted **Directory** and **Radar** from the primary nav per the locked nav strategy. Routes are untouched and still resolve. |
| `app/scripts/home-rebuild-screenshots.mjs` | **New** | Playwright screenshot helper used for visual QA (1440px desktop + 390px mobile). Tooling only — not shipped to users. |
| `docs/design/home-rebuild-sprint-1/*.png` | **New** | Visual QA screenshots (see §9). |
| `docs/design/TENXPROS_HOME_REBUILD_SPRINT_1_REPORT.md` | **New** | This report. |

> **Not changed by this sprint.** The `M` entries on `apply/page.tsx`, `dossier/page.tsx`, `pricing/page.tsx` in `git status` predate this sprint (sample-dossier sprint) and were **not** edited here. The shared `SampleDossierPreview` component was **not** modified.

---

## 2. Sections implemented

The Home page now renders, top to bottom, the full recommended structure:

1. **Premium Hero** (`HomeHero`) — eyebrow, H1/sub, primary + secondary CTA, trust line, quick-facts readout, and an "instrument panel" visual that frames the real sample-dossier cover with the four method phases, a `REVIEWED` status chip, and `VERIFIED CREDENTIAL · PUBLIC REVIEW RUBRIC` metadata.
2. **The Shift** (`HomeShift`).
3. **Eight Assets** (`HomeAssets`) — numbered 8-cell hairline grid.
4. **The TenX Method** (`HomeMethod`) — four phase cards with `NN / 04` indices, core question, and week ranges.
5. **Sample Dossier Proof** (`HomeSampleProof`) — Home-specific dark layout reusing the same `/samples` assets, both CTAs, and the **unchanged illustrative disclaimer**.
6. **Who It Is For / Not For** (`HomeAudience`) — two-panel split.
7. **Certification Standard** (`HomeCertification`) — 3 outcomes (gold-accented "Certified" seal moment) + 8 review criteria.
8. **Founder Credibility Band** (`HomeFounderBand`) — quiet, proof-based trust layer (not the headline claim).
9. **Founding Charter CTA** (`HomeFinalCta`) — apply-first/pay-after-acceptance close with Apply + View pricing.

---

## 3. Exact copy used

**Hero**
- Eyebrow: `You bring the expertise. We bring the AI method.`
- H1: `Lead AI adoption in your field. Don't just use AI.` ("Don't just use AI." is rendered in muted slate for emphasis.)
- Subheadline: `A selective 12-week certification for experienced professionals. Bring one real problem, apply the TenX Method, and finish with a reviewed Living AI Solution Dossier — evidence you can defend.`
- Primary CTA: `Apply for the Founding Charter` → `/apply`
- Secondary CTA: `Preview a sample dossier` → `/samples/tenxpros-sample-dossier-excerpt.pdf` (new tab)
- Trust line: `Apply first. Pay only after acceptance.`
- Quick facts: `12 guided weeks` · `4-phase method` · `1 reviewed dossier` · `Verifiable credential`
- Instrument panel readouts: `Living AI Solution Dossier`, `Reviewed`, `Frame / Weeks 1–4`, `Design / Weeks 5–8`, `Prove / Weeks 9–10`, `Foresee / Weeks 11–12`, `Verified credential`, `Public review rubric`

**The Shift**
- Headline: `Most professionals are using AI. Almost none are leading its adoption.`
- Body: `Using AI is typing a prompt and hoping. Leading adoption is knowing where AI creates value in your field, where it becomes a liability, and how to run the work so it holds up to review.`

**Eight Assets** — Headline: `Eight assets. One defensible dossier.`
1. Personal AI Strategy Brief — *Your stance, scope, and adoption thesis.*
2. AI Use-Case Portfolio — *Where AI earns its place in your work.*
3. Interaction & Decision Kit — *Prompts, checks, and human-in-the-loop rules.*
4. Grounded Domain Knowledge Pack — *The trusted sources your AI work stands on.*
5. AI Evaluation Rubric & Test Set — *How you measure whether it actually works.*
6. Custom Assistants & AI Workflows — *The working system — not a demo.*
7. AI Value & Economics Case — *The evidence that it is worth doing.*
8. Final Portfolio & 90-Day Roadmap — *What you ship next, and how you lead it.*

> The one-line descriptors are descriptive only — no outcome guarantees, no comparative claims. The eight asset **names** are verbatim from the brief.

**The TenX Method** — Headline: `Frame. Design. Prove. Foresee.`
- Frame — `Where does AI actually belong in my work?` · Weeks 1–4
- Design — `How do I build it responsibly?` · Weeks 5–8
- Prove — `Can I show the value with evidence?` · Weeks 9–10
- Foresee — `How do I lead what comes next?` · Weeks 11–12

**Sample Dossier Proof**
- Headline: `See what reviewed work looks like.`
- Body: `Preview an illustrative Living AI Solution Dossier — the artifact at the center of TenXPros. It shows the structure, reviewer notes, evidence gaps, and review standard behind the credential.`
- CTAs: `Preview a sample dossier` (PDF) · `Open HTML preview` (HTML)
- Disclaimer (unchanged): `Illustrative sample. Fictional participant. No real client data. Review labels are illustrative, not a certification decision.`

**Who It Is For** — Experienced professionals · Consultants and advisors · Managers and team leads · Researchers, educators, knowledge workers · Professionals in sensitive or high-stakes domains
**Who It Is Not For** — People who want a certificate for watching videos · People looking only for prompt tricks · People without a real problem to bring · People who cannot commit serious work · People expecting a guaranteed job, income, or business outcome

**Certification Standard** — Headline: `Earned through reviewed work — not attendance.`
- Outcomes: `Certified` / `Strong draft` (revision needed) / `Completed`
- Review criteria: Problem clearly defined · Risks and boundaries explicit · Use-cases chosen and prioritized · Evaluation rubric and test set exist · Workflow is usable · Value is shown with evidence · Governance and confidentiality respected · Roadmap is realistic

**Founder Credibility Band**
- `Designed by Mehrdad Naderi, an official DeepLearning.AI Ambassador with 19,000+ hours of professional training and applied AI work across HealthTech, FinTech, EdTech, and PropTech.`

**Founding Charter CTA**
- Headline: `Apply first. Pay only after acceptance.`
- Body: `The Founding Charter is open for the first 10 members. You apply with one real professional problem; payment happens only after acceptance.`
- CTAs: `Apply for the Founding Charter` → `/apply` · `View pricing` → `/pricing`

---

## 4. Design system decisions

**Direction: "The Instrument."** Home is intentionally darker and more premium than the rest of the (light) site. The shared light nav and footer are kept, producing a clean light → dark → light frame.

- **Base:** near-black deep navy `#070B14`; elevated panels `#0B1120`.
- **Hairlines:** `border-white/10` rules and 1px grid gaps (`gap-px` over a `bg-white/10` track) — engineered separation, no heavy borders.
- **Accent:** cool indigo (`indigo-500/400` for CTAs, `indigo-300` for mono labels and the readout chip).
- **Gold (`#C9A961`, the existing `gold-500` brand value):** used **only** in the Certification Standard section — the "Certified" outcome card (border + ring + seal icon) and the criteria indices — to reserve gold for the credential/seal moment.
- **Typography:** Inter for headings/body (existing); **JetBrains Mono** (existing `font-mono`) for eyebrows, metadata, week ranges, indices, and the trust line — the "metadata/instrument" texture.
- **Reuse:** existing `ButtonLink` primitive with dark-theme overrides via `className` (safe because `cn` uses `tailwind-merge`, so the override colors win cleanly). No new UI primitives added to the global system; Home-local primitives (`MonoLabel`, `SectionShell`) live in the marketing file.
- **No heavy dependencies added.** Only `lucide-react` icons already in the project.
- **Restraint:** two low-opacity indigo blur glows (hero, final CTA) are the only "effects" — no gradients-as-content, no AI stock imagery, no fake product screenshots. The only product-like visual is the real sample-dossier cover.

---

## 5. Sample dossier asset — used correctly?

**Yes.**
- Home links to the same public assets the rest of the site uses: `/samples/tenxpros-sample-dossier-excerpt.pdf`, `…-excerpt.html`, `…-cover.png`. No asset bytes, content, or the PDF/HTML were modified.
- The real cover image appears twice as a genuine artifact: framed inside the hero instrument panel, and as the focal object in the Sample Dossier Proof section.
- The **illustrative / fictional disclaimer is present and unchanged** in the proof section. Alt text retains the "illustrative … fictional participant Maya R." description.
- The shared `SampleDossierPreview` component was left untouched and continues to serve the Dossier / Pricing / Apply pages.

---

## 6. Accessibility notes

- **Contrast:** body copy is `slate-400` on `#070B14`/`#0B1120` (passes AA for normal text); headings/values are white or `slate-200`; "Not for" list uses `slate-500` which still meets AA for its size. The gold `#C9A961` is used on dark panels for large/secondary text and iconography.
- **Semantics:** one `<h1>` (hero), `<h2>` per section, `<h3>` for cards; quick facts use a `<dl>/<dt>/<dd>`; lists use real `<ul>/<li>`.
- **Focus:** all CTAs keep visible focus rings, retuned to indigo with a `#070B14` offset so they read on the dark base.
- **Decorative elements:** glow divs and inline icons are `aria-hidden`; the sample-cover link has an explicit `aria-label` noting the PDF opens in a new tab.
- **Links opening new tabs** carry `target="_blank" rel="noopener noreferrer"`.

---

## 7. Mobile notes (390px verified)

- Hero stacks to a single column; both CTAs go full-width; quick-facts readout is a 2×2 grid; the instrument panel still renders the cover + method readout legibly (`auto / 1fr`).
- Eight Assets collapse 4→2→1; method cards 4→2→1; audience panels stack; certification outcomes stack; criteria collapse to one column.
- Sample proof stacks cover-over-text with the cover centered.
- Section padding scales down (`py-20` mobile / `py-28` desktop). No horizontal overflow observed.
- Pre-existing nav behavior on mobile (logo + Apply button, no hamburger) is unchanged — out of scope for this sprint.

---

## 8. Commands run and results

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ Pass (no errors) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/` builds as static (`○`); all routes intact |
| `node scripts/home-rebuild-screenshots.mjs` | ✅ Wrote 4 screenshots (served from a local `next start` on :3010, now stopped) |

---

## 9. Screenshot paths

- `docs/design/home-rebuild-sprint-1/home-desktop.png` (1440px, full page)
- `docs/design/home-rebuild-sprint-1/home-hero-desktop.png` (1440px, hero above the fold)
- `docs/design/home-rebuild-sprint-1/home-sample-section.png` (1440px, sample-dossier proof)
- `docs/design/home-rebuild-sprint-1/home-mobile.png` (390px, full page)

---

## 10. Caveats

- **Light nav/footer over a dark page.** Intentional this sprint (Home-only direction). When the rest of the site is rebuilt, the shared nav/footer should be reconciled with the dark direction.
- **`MarketingHero` and `proofCards`** in `marketing-sections.tsx` are now unused (Home no longer imports them) but were left exported to avoid touching shared code out of scope; `JourneySteps`, `ModuleGrid`, `PricingGrid`, etc. remain in active use by other pages.
- **`next start` standalone warning.** The build uses `output: standalone`; `next start` prints a warning but still serves correctly for QA. Production serving is unaffected (uses the existing deploy path).
- **Nav change is intentional and minimal:** Directory/Radar removed from the primary nav only. Their routes (`/directory`, `/radar`) still build and resolve; they were not previously in the footer and were not added there.

---

## 11. Boundary confirmation

No server actions, auth, database/Prisma/migrations, admin workflows, participant-portal workflows, application-form logic, or payment logic were changed. The sample-dossier PDF/HTML content was not changed. The shared `SampleDossierPreview` component and the Dossier/Pricing/Apply pages were not rewritten. No routes were removed or broken. No heavy dependencies were introduced. Changes are confined to the public Home page, a new marketing-only component, a minimal nav de-promotion, and QA tooling/artifacts.
