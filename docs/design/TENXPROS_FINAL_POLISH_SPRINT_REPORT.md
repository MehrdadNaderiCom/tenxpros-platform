# TenXPros — Final Product Polish Sprint Report

**Date:** 2026-06-08
**Branch:** `deployment/production-deployment-sprint-a`
**Working-tree base at start:** `fe20d2b` ("Polish TenXPros public site for early applications"). Live site deployed at `6bd2232`.
**Scope:** Presentational marketing copy/UX + one sample-asset (print-CSS + regenerated PDF). No backend/application logic.
**Status:** `typecheck` / `test` / `build` green. Local route + content + form + sample-asset checks pass. No fake proof, no unsupported claims, no fake social proof added.
**Not committed, not pushed, not deployed** (per instruction).

---

## 0. Context — two passes of the same sprint

The prior commit `fe20d2b` was an earlier pass of this "Final Product Polish Sprint." It already delivered most of the requested items (founder section, milestones/ranks section, Apply form moved up, deadline/refund/cooling-off policy copy, removal of the prominent "What it is not" sections, and the bulk of the "first 10 accepted members" → capacity-window rewrite). Critically, its own report noted the dossier print-CSS hardening was added **"for future PDF regenerations"** — i.e. the served PDF was never rebuilt.

This pass audited every requirement against the current state, then **fixed the genuinely-remaining gaps** and **verified the rest**. The table in §1 marks each file as **NEW this pass** or **pre-existing (verified)**.

---

## 1. Files changed (this pass: 5)

| File | Change | Item(s) |
| --- | --- | --- |
| `app/public/samples/tenxpros-sample-dossier-excerpt.pdf` | **Regenerated** from the hardened HTML (was stale: Chrome 148 / 2026-06-06, predating the orphan/widow + heading-break CSS). Now Chrome 149, 12 pages, valid. | 8 |
| `app/public/samples/tenxpros-sample-dossier-excerpt.html` | **+5 lines** of print CSS: keep a section heading's lead-in label with its body (`.sec-head + p{break-after:avoid}`, `.callout-quote{break-before:avoid}`) — fixes a real stranded "Problem Definition" heading. | 8 |
| `app/src/components/marketing/pricing-instrument.tsx` | Removed the last two seat references ("Limited founding seats" → "Limited review capacity"; "Apply to be considered for a seat" → "Open while founding review capacity remains"). Fixed the 7-item **"What you pay for" grid** that left 2 empty cells on the 3-col layout (final item now spans full width). | 1, 3 |
| `app/src/components/marketing/program-instrument.tsx` | Reframed the standalone "Generic AI tools course vs TenX" comparison into a positive **"What makes the work defensible."** list; the negative contrast is now a single quiet closing line. Dropped the now-unused `Minus` import. | 2 |
| `app/src/components/marketing/about-instrument.tsx` | Founder section made more human: "**creator and architect** of the TenX Method," a human motivation line ("…had no defensible way to show they could *lead* its adoption…"), and a warmer focus sentence. LinkedIn link retained. | 5 |

**Pre-existing and verified this pass (no change needed):**
`about/page.tsx`, `apply/page.tsx`, `certification/page.tsx`, `terms/page.tsx`, `refund/page.tsx`, `privacy/page.tsx`, `certification-instrument.tsx`, `apply-instrument.tsx`, `home-instrument.tsx`.

**Not touched (hard safety rules honored):** `application-form.tsx`, the zod schema (`validations/application.ts`), the `submitApplication` server action, auth, Prisma / DB / migrations, admin, participant portal, payment/enrollment logic, `program-data.ts`, and the cover/snapshot/rubric PNGs (cover PNG re-rendered byte-identical → git shows no change).

---

## 2. Design / UX fixes

- **Item 1 — incomplete grids.** Audited every rendered grid. The About "Principles" grid was already balanced (6 + 1 full-width). The remaining offender was Pricing **"What your Founding Charter builds"** — 7 items in a `sm:grid-cols-2 lg:grid-cols-3` grid left **2 empty trailing cells** on desktop. The final item now spans the full row (`sm:col-span-2 lg:col-span-3`), so the panel always reads as complete on every breakpoint. No empty grid blocks remain anywhere.
- **Item 9 — compression (verified).** Apply was already reduced to 5 sections (Hero → Form → After → Proof → CTA). The Program reframe also removes a two-column comparison in favor of a single list, a net reduction. Proof-critical content preserved everywhere.

## 3. Copy / positioning fixes (item 2)

- **Program — "What makes the work defensible."** The section that led with a "Generic AI tools course" negative column is now a positive, premium list of five defensibility points (real problem → responsible design → rubric testing → documented risk/value → reviewed evidence). A single quiet sentence retains the contrast without leading with it.
- The two prominent **"What TenXPros is not"** sections (About, Certification) were already unmounted from their routes in the prior pass; boundaries now live quietly in the About Trust footnote and in the Certification / Pricing FAQs. Verified still in place.
- High-conversion sections (Home hero, About hero, Certification "What the credential signals," Pricing "What your Founding Charter builds") lead positively. Verified.

## 4. "First 10 accepted members" / seats (item 3)

- Repo-wide grep for `first (10|ten)`, `accepted members`, `seats?`, `waitlist`, `considered for a seat` → **0 matches** in rendered source after this pass.
- The only remaining seat-flavored copy ("Limited founding seats", "Apply to be considered for a seat") was replaced with capacity-window language. The site now uses: "Limited review capacity," "Limited founding review-capacity window," and "Open while founding review capacity remains."
- **No seat counter, no countdown, no invented urgency.** The `$997 USD` Founding Charter price is unchanged.

## 5. Policy / refund / deadline changes (item 7) — verified, already in place

Confirmed in the prerendered HTML (no edits needed this pass):

- **Terms** — "Deadlines, extensions, and resubmission": participants expected to follow module/dossier deadlines; **one reasonable extension or resubmission** when justified; additional missed deadlines / repeated resubmissions / extra review cycles **may require an administrative or review fee** (capacity is reserved). Plus "No guaranteed outcome."
- **Refund** — "After program access" (refunds limited once access/materials/diagnostic/review begin because **capacity and review resources are reserved**); "Certification outcomes" (not guaranteed; Certified / Strong Draft / Completed); "**Statutory rights and cooling-off**" (statutory consumer rights may apply; EU/UK-style **14-day withdrawal** requires **explicit consent** to start service during the withdrawal period, acknowledging refund rights may be affected).
- Tone is conservative, not "no refunds ever," and suitable for later legal review (not presented as final legal advice).

## 6. Badge / rank visibility (item 4) — verified, already in place

- `/certification` renders **"Milestones, ranks, and the final credential."** — 11 module milestones (earned through submitted work), the three ranks across **Frame / Design / Prove / Foresee**, and the capstone **Certified TenXPro Capstone Seal** (earned only when the reviewed dossier meets the standard). It states verification confirms credential metadata **without exposing confidential work**.
- Rank names match the canonical `program-data.ts` ranks (AI-Ready Professional → Frame; AI Problem Solver & Solution Designer → Design; Future-Ready AI Solution Designer → Prove · Foresee).
- `/program` also surfaces a per-module "Milestone · {badge}" chip from the canonical module data. No promise of public directory visibility absent certification + opt-in.

## 7. About founder changes (item 5)

- Names **Mehrdad Naderi** as **creator and architect** of the TenX Method and the review standard.
- States why TenXPros was created (AI adoption is now professional judgment work) and adds a more human motivation line about the gap it answers.
- Professional focus retained: AI adoption, professional learning, human–AI collaboration, AI training, product thinking.
- Public **LinkedIn** link retained (`linkedin.com/in/mehrdad-naderi`).
- Founder remains a restrained trust layer ("the credential rests on the public standard… not on the name behind it"). **No** unsupported numbers, client logos, degrees, awards, or affiliations were added.

## 8. Apply page improvements (item 6) — verified, already in place

- Form sits **directly under the hero** (section 2 of 5). The compact "Before you apply" + "What the form asks" two-column panel is retained; the form is wrapped in a **premium indigo-tinted frame**.
- "No payment details required" / "pay only after acceptance" and the confidentiality (redacted/fictionalized examples) warning are clearly present.
- **Form unchanged:** all **14** user-facing fields (fullName, email, country, professionalRole, domain, linkedinUrl, aiExperience, dataSensitivity, timeAvailability, whyTenXPros, realProblemBrief, preferredLanguage, consentConfidentiality, consentTerms) + submit. Validation and the submit action are untouched.

## 9. Dossier PDF action taken (item 8) — regenerated + repaired

The generation workflow is clear and safe (`scripts/generate-sample-dossier-pdf.mjs`, headless Chromium present), so the PDF was **regenerated**, not faked.

1. **Diagnosis:** the served PDF was dated 2026-06-06 (Chrome 148) and **predated** the prior pass's print-CSS hardening — it was stale.
2. **Visual inspection** (all pages rendered to PNG): found exactly **one** genuine stranded heading — Section 2 "Problem Definition" sat at the foot of a page with its statement body overleaf, because `break-after:avoid` did not chain through the intervening "Problem statement." lead-in label.
3. **Fix:** added `.sec-head + p{break-after:avoid}` and `.callout-quote{break-before:avoid}` so the heading → lead-in → body travel together.
4. **Regenerated** → PDF is now **12 pages** (was 11; the fix pushed Section 2 to a clean page start), valid (`%PDF-1.4`, 465 KB, Chrome 149).
5. **Re-verified all 12 pages:** no stranded section headings, no orphan reviewer-note headers (note panels stay whole), no broken table rows (rows keep `break-inside:avoid`; long tables flow by design). Premium and readable. The cover PNG re-rendered **byte-identical** (no asset churn).

## 10. Tests run and results

| Command | Result |
| --- | --- |
| `pnpm typecheck` (`tsc --noEmit`) | **PASS** (exit 0) |
| `pnpm test` (vitest) | **PASS** — 5 files, 16/16 tests |
| `pnpm build` (`next build`) | **PASS** (exit 0) — all marketing routes prerendered static (`/`, `/about`, `/program`, `/dossier`, `/certification`, `/pricing`, `/apply`, `/privacy`, `/refund`, `/terms`) |

**Route / content checks (against prerendered `.next/server/app` HTML + served assets):**

- No empty-looking principle grids (About 6+1; Pricing now full-width final card). ✓
- No "first 10 accepted members" / no seat language; capacity-window language present (`Limited review capacity` ×3, `founding review capacity remains` ×6, `founding review-capacity window` on home). ✓
- About founder section improved (`creator and architect`, motivation line, LinkedIn). ✓
- Badges/ranks visible publicly (Certification milestones/ranks; Program per-module milestone chips). ✓
- Apply form intact: 14/14 fields + submit (client island, bundled at 30.4 kB on the static route). ✓
- No payment details requested before acceptance (form has no payment fields; copy reinforces pay-after-acceptance). ✓
- Policy pages include deadline / extension / resubmission / refund / cooling-off logic. ✓
- Certification proof-critical content retained (eight criteria, three outcomes, sample dossier, verification). ✓
- Sample assets served and valid: `…excerpt.html` (70.6 KB), `…excerpt.pdf` (12 pp, 465 KB, valid), `…verification.html` (4.6 KB). ✓
- No unsupported claims (accreditation / university equivalence / guaranteed outcomes / cryptographic verification / third-party recognition) added; no fake testimonials, logos, or counts added. ✓

## 11. Remaining caveats

- **Legal copy is conservative, not final advice.** Terms/Refund/Privacy are written for later legal review; jurisdiction-specific consumer-law wording should be confirmed by counsel before broad outreach.
- **Live verification routes** (`/verify/[code]`, `/certificate/[id]`) require real issued credentials; the on-page verification panel is explicitly labelled *Illustrative* and shows no real personal data.
- **Negative-section components remain defined but unmounted.** `AboutNot`, `CertNot`, `ApplyStrong`, `ApplyReassure`, `ApplyAudience` are exported but not rendered by any route (verified: no external imports). They were intentionally left in place (harmless, not on the live site) rather than deleted, to keep this pass's diff focused; they can be removed in a later cleanup if desired.
- **Report filename.** This file already existed from the prior pass (`fe20d2b`) and was **updated in place** to reflect the final state; the prior version remains recoverable in git history. (Surfaced because it was not authored in this pass.)
- The PDF/HTML changes affect only the **public sample asset**; the participant-facing dossier/certificate print output was not in scope and was not modified.

## 12. Final git status

```
 M app/public/samples/tenxpros-sample-dossier-excerpt.html
 M app/public/samples/tenxpros-sample-dossier-excerpt.pdf
 M app/src/components/marketing/about-instrument.tsx
 M app/src/components/marketing/pricing-instrument.tsx
 M app/src/components/marketing/program-instrument.tsx
 (+ docs/design/TENXPROS_FINAL_POLISH_SPRINT_REPORT.md — this report)
```

Diffstat (code/assets): 5 files changed, 74 insertions(+), 57 deletions(-); PDF binary 465633 → 465130 bytes.

**No commit. No push. No deploy.** Awaiting review/approval.
