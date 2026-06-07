# TenXPros — Program / Method Rebuild Round 1 Report

**Task:** Rebuild the public Program / Method page (`/program`) into the 10-section Instrument experience, rendering the canonical module path.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build green. QA green on desktop (1440) and mobile (390) — 10/10 headings visible, 11 canonical module cards rendered, footer flush, 0px horizontal overflow, 0px trailing blank, mobile menu verified.

---

## 1. Files changed

| File | Type | Change |
| --- | --- | --- |
| `app/src/app/(public)/program/page.tsx` | Modified | Rebuilt as a dark Instrument composition of the 10 sections; metadata updated. Route `/program` unchanged. |
| `app/src/components/marketing/program-instrument.tsx` | **New** | All 10 presentational sections. Imports `modules` from `program-data.ts` (**read-only**) to render the guided path. Self-contained, mirrors the other rebuilt pages. |
| `app/scripts/program-qa-verify.mjs` | **New** | QA + screenshot tooling (segmented captures + module-count integrity + mobile menu + DOM sanity checks). Not part of the app bundle. |

Shared nav/footer reused unchanged. The previous page's light components (`ModuleGrid`, `PageHeader`, `Card`) are no longer used by `/program`; they remain intact for other consumers.

---

## 2. Current program / module structure inspected

From `app/src/lib/program-data.ts` and `app/prisma/schema.prisma` (source of truth):

- **11 core modules** (`modules` array, count = 11), each with `number, phase, title, coreQuestion, description, badgeName, estimatedHours`.
- **4 phases** (Prisma `ProgramPhase` enum: `FRAME`, `DESIGN`, `PROVE`, `FORESEE`):
  - **FRAME** — modules 1–4 (AI Readiness & TenXPro Mindset · Practical AI Literacy & Hands-On Tool Fluency · Responsible AI & Professional Boundaries · Problem Discovery & Structured Framing)
  - **DESIGN** — modules 5–8 (Context, Stakeholder & Initial Foresight Mapping · Data, Evidence & Verification Discipline · Workflow, Task & Human-AI Allocation · Responsible AI Solution Design)
  - **PROVE** — modules 9–10 (Adoption, Communication & Change Design · Value, Roadmap & Proof Plan)
  - **FORESEE** — module 11 (AI Foresight, Scenario Planning & Future-Proofing)
- **Per-module badges** (11): TenX Mindset, AI Core, Responsible AI, Problem Framing, Context Mapper, Evidence Discipline, Workflow Designer, Responsible Solution, Adoption Designer, Value Proof, Foresight Strategist.
- **Capstone exists** (`badgeCatalog`): "Certified TenXPro Capstone Seal" — "Issued when a participant is certified after capstone review."
- **12-week framing** (`pricingTiers` benefits): "12-week TenXPros program."

## 3. Canonical data preserved

- `program-instrument.tsx` imports `modules` **read-only** and renders each module's real `number`, `title`, `coreQuestion` (as the guiding question), and `badgeName` (as the milestone badge). The QA run confirms **11 module cards** render on both viewports.
- **No edits** to `program-data.ts`, the Prisma schema, participant module/progression logic, server actions, or any app logic.

## 4. How the 11-module vs 12-week tension was handled

Resolved transparently in public copy, matching the code:

> **"12 guided weeks, organized into 4 phases, with 11 core modules plus a final dossier and capstone review."**

This wording appears verbatim in the "Guided path" section. The 11 modules occupy weeks 1–11; **week 12 is rendered as a distinct gold "Final dossier & capstone review" card** ("The eleven modules assemble into the Living AI Solution Dossier, which is reviewed against the public criteria — the capstone that earns the credential."). Phase week ranges follow the Instrument convention used across the other rebuilt pages (Frame 1–4, Design 5–8, Prove 9–10, Foresee 11–12). No invented modules; the tension is shown and explained, not hidden.

---

## 5. Design decisions

- **Same Instrument system** as the other five rebuilt pages: base `#070B14`, panels `#0B1120`, hairline rules, indigo action accent, JetBrains-Mono labels, two restrained indigo glows.
- **Hero method panel** is a four-phase readout (Frame/Design/Prove/Foresee + week ranges) with a "Living AI Solution Dossier" output line — no generic AI imagery.
- **Guided path** uses the Dossier-style phase-grouped rail: a left phase header (phase, weeks, module count) and a right `divide-y` list of real modules — no empty cells. The capstone is a separate gold card.
- **Gold reserved for review/credential moments**: the week-12 capstone card and the "Final dossier checkpoint" in the review section. No gold on any action CTA.
- **Mobile typography/padding** match the other pages (H1 `text-[2.15rem] → sm:text-4xl → md:text-5xl`; `py-16`/`py-28`).

## 6. Copy decisions

- **5-second method clarity:** H1 "Frame. Design. Prove. Foresee." + sub + trust line "12 guided weeks · 4 phases · 1 reviewed dossier."
- **Not a tools course:** dedicated contrast section "This is not a prompt library." (generic course: learns tools / copies prompts / attendance certificate / rarely touches governance — vs TenX: real problem / responsible design / tested outputs / documented risk & value / reviewed work).
- **Personal, not random:** "Field-specific, not improvised." with six personalization dimensions, while "the review standard stays the same for everyone."
- **Evidence over attendance:** the review-checkpoints section shows the dossier assembles gradually; certification is never promised to every participant. No income/job/promotion/business claims, no accreditation or "university-level" language, no "founder-led" framing. Core thread kept (expertise + AI method → reviewed AI adoption work).

---

## 7. CTA / link verification (served HTML)

| CTA / link | Target | Count |
| --- | --- | --- |
| Hero + Final — Apply for Founding Charter | `/apply` | 4 (incl. nav) |
| Hero + Proof + Final — Preview sample dossier | `/samples/tenxpros-sample-dossier-excerpt.pdf` (new tab) | ✅ (×8) |
| Proof — Open HTML preview | `/samples/tenxpros-sample-dossier-excerpt.html` (new tab) | ✅ |
| Nav — The Method/The Dossier/Certification/Pricing/About | `/program` `/dossier` `/certification` `/pricing` `/about` | ✅ |

Canonical content present in HTML: module titles (e.g. "AI Readiness &amp; TenXPro Mindset"), "Foresight Strategist Badge", the "11 core modules plus a final dossier…" copy, and "Final dossier &amp; capstone review". Route `/program` unchanged; no routes added/removed.

---

## 8. Commands run and results

| Command | Result |
| --- | --- |
| `git status --short` (pre-edit) | clean (HEAD `da6c21d`) |
| `pnpm typecheck` | ✅ Pass (exit 0) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/program` static (`○`), 59/59 pages |
| `node scripts/program-qa-verify.mjs` | ✅ Exit 0 — 10/10 headings, 11 module cards, 0px overflow, 0px trailing, footer flush, menu verified |

---

## 9. Screenshots generated

Folder: `docs/design/program-rebuild-round-1/` (12 required PNGs + `qa-measurements.json`)

- `program-desktop-top.png` — hero + method panel
- `program-desktop-phases.png` — the four phases
- `program-desktop-modules.png` — guided path (canonical 11 modules + capstone)
- `program-desktop-assets.png` — eight assets → dossier
- `program-desktop-review.png` — review checkpoints
- `program-desktop-proof.png` — sample dossier
- `program-desktop-bottom.png` — final CTA + footer
- `program-mobile-top.png`, `-modules.png`, `-proof.png`, `-bottom.png`
- `program-mobile-menu-open.png` — full-screen hamburger menu

---

## 10. Mobile QA results (390px)

| Check | Result |
| --- | --- |
| Horizontal overflow | **0px** |
| Trailing blank after footer | **0px** |
| Footer flush | ✅ 12829 → 13114 (= scrollHeight) |
| Section headings visible + in-doc | ✅ 10/10 |
| Canonical module cards rendered | ✅ 11 |
| Guided path stacks (phase header + module rail) | ✅ |
| Mobile menu covers viewport | ✅ `elementFromPoint(195,400)` = menu `<nav>` |

(Desktop: scrollHeight 8028px, 0px overflow, 0px trailing, footer flush 7863→8028, 10/10 headings, 11 module cards.) The largest heading gap is the guided-path module section — content-filled (11 modules + capstone), not blank.

---

## 11. Was any app logic touched?

**No.** Only the Program page and a new presentational marketing component were added/edited, plus QA tooling. No server actions, auth, Prisma/database/migrations, admin, participant portal, participant module logic, payment/enrollment logic, routes, or the canonical `program-data.ts`. The module data is rendered read-only.

## 12. Screenshot retention cleanup performed

Per "keep only the newest page's QA folder," after generating `program-rebuild-round-1/` I deleted the older `docs/design/certification-rebuild-round-1/`. Result: `docs/design/` contains a single screenshot folder (`program-rebuild-round-1/`) plus the `.md` reports (none deleted). The deletion shows as `D` in `git status`; the folder remains recoverable from commit `da6c21d`. No commit was made.

## 13. Caveats

- **Phase → week mapping** (Frame 1–4, Design 5–8, Prove 9–10, Foresee 11–12) is the cross-page Instrument convention; `program-data.ts` defines module→phase membership but not literal week numbers, so the week ranges are presentational. Week 12 is explicitly the final dossier/capstone review, consistent with the capstone seal in the data.
- **Per-module "expected artifact/output"** is not a field in the canonical data, so modules show the guiding question + milestone badge instead; the eight assets (section 5) cover the produced artifacts.
- **Shared nav/footer** unchanged and identical to the other rebuilt pages.
- **Full-page screenshots intentionally not generated** (tall dark-theme downscaling artifact); segmented shots are the source of truth.

---

## 14. Final `git status --short`

```
 M app/src/app/(public)/program/page.tsx
 D docs/design/certification-rebuild-round-1/…  (12 files — retention cleanup)
?? app/scripts/program-qa-verify.mjs
?? app/src/components/marketing/program-instrument.tsx
?? docs/design/TENXPROS_PROGRAM_REBUILD_ROUND_1_REPORT.md
?? docs/design/program-rebuild-round-1/
```
No commit was made. `program-instrument.tsx` is a new build-required file (imported by `/program`) to `git add` in the next checkpoint commit, alongside this report, the QA script, the new screenshot folder, and the `certification-rebuild-round-1/` deletions.
