# TenXPros — Certification Rebuild Round 1 Report

**Task:** Rebuild the public Certification page (`/certification`) into the 10-section Instrument experience as a trust-and-proof page.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build green. QA green on desktop (1440) and mobile (390) — 10/10 headings visible, footer flush, 0px horizontal overflow, 0px trailing blank, mobile menu verified.

---

## 1. Files changed

| File | Type | Change |
| --- | --- | --- |
| `app/src/app/(public)/certification/page.tsx` | Modified | Rebuilt as a dark Instrument composition of the 10 sections; metadata updated. Route `/certification` unchanged. |
| `app/src/components/marketing/certification-instrument.tsx` | **New** | All 10 presentational sections + local primitives, Instrument palette, sample-asset constants, and the **illustrative** verification panel. Self-contained, mirrors Home/Dossier/Pricing/Apply. |
| `app/scripts/certification-qa-verify.mjs` | **New** | QA + screenshot tooling (segmented captures + mobile menu + DOM sanity checks). Not part of the app bundle. |

Shared nav/footer reused unchanged. The previous page's light components (`PageHeader`, `Card`, `BadgeGallery`) are no longer used by `/certification`; they remain intact for other consumers.

---

## 2. Existing certification/badge/verification routes inspected — and preserved

Inspected before editing; **none modified or broken** (this task touches only the public `/certification` marketing page):

| Route / module | Purpose | Status |
| --- | --- | --- |
| `app/src/app/(verify)/verify/[code]/page.tsx` | Public badge verification (shows recipient, credential, earned date, code, status via `verifyBadge()`) | **Untouched** |
| `app/src/app/(verify)/certificate/[id]/page.tsx` | Certificate page by id | **Untouched** |
| `app/src/app/api/verify/[code]/route.ts` | Verification API | **Untouched** |
| `app/src/lib/services/badges.ts` (`verifyBadge`) | Verification service | **Untouched** |
| `app/src/app/(admin)/admin/{certifications,badges}` | Admin review/issuance | **Untouched** |
| `app/src/app/(participant)/portal/certification` | Participant credential view | **Untouched** |

**Key constraint observed:** there is **no `/verify` index** — only `/verify/[code]`, which 404s without a real code. So the page does **not** link to a verification route (a link would require inventing a real code/recipient). Instead it uses a **non-clickable, clearly-labeled illustrative verification panel**. Verified: the served `/certification` HTML contains **0** `/verify` and **0** `/certificate` links.

---

## 3. What was preserved

- All real verification/badge/certificate routes, the `verifyBadge` service, admin and portal certification logic, and every server action/auth/DB module — **byte-for-byte unchanged**.
- No real personal data invented: the illustrative panel uses the established fictional sample participant ("Illustrative · Maya R."), a zeroed code (`TENX-0000-0000`), and an "Illustrative" tag + footnote ("not a real record").

---

## 4. Design decisions

- **Same Instrument system** as the other four rebuilt pages: base `#070B14`, panels `#0B1120`, hairline rules, indigo action accent, JetBrains-Mono labels, two restrained indigo glows.
- **Gold reserved for credential/review/seal moments** — used on: the hero credential panel's "Certified" seal + "earned through reviewed work" mark, the **eight-criteria panel** (gold border/ring + gold numbered badges, the visual centerpiece), the "Certified" outcome card, the "Status: Active" chip in the verification panel, and the gold index on the "Earn certification" path step. No gold on any action CTA.
- **Outcomes are not failure-coded:** "Certified" (gold), "Strong Draft" (indigo), "Completed" (neutral, equal card weight) with explicit copy "A real, professional outcome — not a failure."
- **Verification panel is illustrative and non-interactive** (a `<dl>`, not a link), with an "Illustrative" badge and a footnote pointing to the real public verification model without exposing it.
- **Mobile typography/padding** match the other pages (H1 `text-[2.15rem] → sm:text-4xl → md:text-5xl`; `py-16`/`py-28`).

## 5. Copy decisions

- **5-second clarity:** H1 "Certification is earned, not attended." + sub + trust line "Reviewed dossier · Public criteria · Verifiable badge."
- **No university imitation / no accreditation claims:** a dedicated "What it is not" section ("Not a university degree," "Not academic accreditation," "Not a certificate for watching videos," "Not a guarantee of employment/income/promotion/business results," "Not proof that AI can safely replace human judgment").
- **No outcome promises:** the FAQ explicitly answers "Does certification guarantee career or business outcomes?" → "No… we make no income, job, promotion, or business guarantees," and certification is never promised to every participant.
- **Credibility framed as transparency:** reviewed artifact + public criteria + clear outcomes + verifiable badge. Core thread kept (expertise + AI method → reviewed AI adoption work). No "founder-led" framing.

---

## 6. CTA / link verification (served HTML)

| CTA / link | Target | Count |
| --- | --- | --- |
| Hero + Final — Apply for Founding Charter | `/apply` | 4 (incl. nav) |
| Hero + Dossier + Final — Preview sample dossier | `/samples/tenxpros-sample-dossier-excerpt.pdf` (new tab) | ✅ |
| Dossier — Open HTML preview | `/samples/tenxpros-sample-dossier-excerpt.html` (new tab) | ✅ |
| Verification panel | none (illustrative, non-clickable) | `/verify` = 0, `/certificate` = 0 ✅ |
| Nav — The Method/The Dossier/Certification/Pricing/About | `/program` `/dossier` `/certification` `/pricing` `/about` | ✅ |

Route `/certification` unchanged; no routes added/removed.

---

## 7. Commands run and results

| Command | Result |
| --- | --- |
| `git status --short` (pre-edit) | clean (HEAD `d79ca26`) |
| `pnpm typecheck` | ✅ Pass (exit 0) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/certification` static (`○`), 59/59 pages |
| `node scripts/certification-qa-verify.mjs` | ✅ Exit 0 — 10/10 headings, 0px overflow, 0px trailing, footer flush, menu verified |

---

## 8. Screenshots generated

Folder: `docs/design/certification-rebuild-round-1/` (11 required PNGs + `qa-measurements.json`)

- `certification-desktop-top.png` — hero + credential panel (gold seal)
- `certification-desktop-criteria.png` — eight review criteria (gold panel)
- `certification-desktop-outcomes.png` — three outcomes
- `certification-desktop-proof.png` — sample dossier
- `certification-desktop-verification.png` — illustrative verification panel
- `certification-desktop-bottom.png` — FAQ + final CTA + footer
- `certification-mobile-top.png`, `-criteria.png`, `-proof.png`, `-bottom.png`
- `certification-mobile-menu-open.png` — full-screen hamburger menu

---

## 9. Mobile QA results (390px)

| Check | Result |
| --- | --- |
| Horizontal overflow | **0px** |
| Trailing blank after footer | **0px** |
| Footer flush | ✅ 10361 → 10646 (= scrollHeight) |
| Section headings visible + in-doc | ✅ 10/10 |
| Gold criteria panel stacks (single column) | ✅ |
| Mobile menu covers viewport | ✅ `elementFromPoint(195,400)` = menu `<nav>` |

(Desktop: scrollHeight 7055px, 0px overflow, 0px trailing, footer flush 6890→7055, 10/10 headings, maxGap 953px — tight, content-filled.)

---

## 10. Was any app logic touched?

**No.** Only the Certification page and a new presentational marketing component were added/edited, plus QA tooling. No server actions, auth, Prisma/database/migrations, admin, participant portal, payment/enrollment logic, routes, or any verification/badge/certificate route or service. The real verification model is described and illustrated, never re-implemented.

---

## 11. Screenshot retention cleanup performed

Per the rule "keep only the newest page's QA folder," after generating `certification-rebuild-round-1/` I deleted the older `docs/design/apply-rebuild-round-1/`. Result: `docs/design/` now contains a single screenshot folder (`certification-rebuild-round-1/`) plus the 13 `.md` reports (none deleted). The `apply-rebuild-round-1/` deletion shows as `D` in `git status`; it remains recoverable from commit `d79ca26`. No commit was made.

---

## 12. Caveats

- **Illustrative verification panel** intentionally does not link to `/verify/[code]` (no public, code-free demo exists, and inventing a real code/recipient is disallowed). If a stable public demo credential is created later, the panel can be wired to it.
- **Shared nav/footer** unchanged and identical to the other rebuilt pages.
- **Full-page screenshots intentionally not generated** (tall dark-theme downscaling artifact); segmented shots are the source of truth.
- The deleted `apply-rebuild-round-1/` folder is a tracked deletion not yet committed (per the no-commit rule).

---

## 13. Final `git status --short`

```
 M app/src/app/(public)/certification/page.tsx
 D docs/design/apply-rebuild-round-1/…  (11 files — retention cleanup)
?? app/scripts/certification-qa-verify.mjs
?? app/src/components/marketing/certification-instrument.tsx
?? docs/design/TENXPROS_CERTIFICATION_REBUILD_ROUND_1_REPORT.md
?? docs/design/certification-rebuild-round-1/
```
No commit was made. `certification-instrument.tsx` is a new build-required file (imported by `/certification`) to `git add` in the next checkpoint commit, alongside this report, the QA script, the new screenshot folder, and the `apply-rebuild-round-1/` deletions.
