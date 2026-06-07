# TenXPros — Trust & Conversion Patch Sprint 1 Report

**Scope:** Small, reviewable public-copy/trust patch addressing reviewer-flagged issues. Marketing/presentational + legal-copy only.
**Date:** 2026-06-07
**Base:** `ab1d73d` (live site unchanged — this patch is **not** deployed, committed, or pushed).
**Status:** Complete. typecheck / test / build green. Local build route-checked (9/9 routes 200). Production container untouched.

---

## 1. Files changed (11)

| File | Change |
| --- | --- |
| `app/src/components/marketing/home-instrument.tsx` | Pre-commit cleanup: the **unused** `HomeFounderBand` copy no longer contains "DeepLearning.AI Ambassador / 19,000+ hours / HealthTech·FinTech·EdTech·PropTech"; replaced with the safe public-standard line. Component kept (not rendered on any page). |
| `app/src/app/(public)/terms/page.tsx` | Removed placeholder section + "Founder-review-ready" description; added boundaries (private cert ≠ university/accreditation, pay-after-acceptance, responsible data use, no-guarantee). |
| `app/src/app/(public)/privacy/page.tsx` | Removed placeholder; strengthened the confidential-data boundary; neutral description. |
| `app/src/app/(public)/refund/page.tsx` | Removed placeholder; aligned outcomes to **Certified / Strong Draft / Completed**; neutral description. |
| `app/src/components/marketing/apply-instrument.tsx` | Added a static **"Before you apply"** block + **"What the form will ask"** preview + load-failure fallback (mailto). Form unchanged. |
| `app/src/components/marketing/certification-instrument.tsx` | Added **"How dossier review works"** section; reframed verification wording to operating-standard language. |
| `app/src/app/(public)/certification/page.tsx` | Composed the new `CertReviewMechanics` section. |
| `app/src/components/marketing/pricing-instrument.tsx` | Softened the university price; added charter-ladder fairness line; reframed seat CTA; added an international-applicants FAQ. |
| `app/src/components/marketing/program-instrument.tsx` | Added **"Format & commitment"** section; displayed module milestone instead of "Badge". |
| `app/src/app/(public)/program/page.tsx` | Composed the new `ProgramFormat` section. |
| `app/src/components/marketing/about-instrument.tsx` | Softened the founder block — removed the unsourced affiliation/sectors. |

No server actions, auth, Prisma/DB, admin, portal, payment/enrollment logic, routes, or the application form's fields/validation/submit were touched.

---

## 2. Exact public claims removed or softened

| Removed / old | Replaced with |
| --- | --- |
| `Often $10,000+` (Pricing comparison "Typical price", university column) | `often many thousands, depending on provider and format` |
| `Apply to hold a seat` (Pricing hero readout) | `Apply to be considered for a seat` |
| `An official DeepLearning.AI Ambassador, with applied AI work across HealthTech, FinTech, EdTech, and PropTech…` (About) | `The credential rests on the public standard — the sample dossier, the eight review criteria, the review outcomes, and verification — not on the name behind it.` |
| `Every credential has a public verification page.` (Certification) | `Each earned credential is issued with a public verification page.` |
| `Anyone can check the credential…` | `When a credential is issued, anyone can check it…` |
| `Each TenXPros credential is verifiable on a public page…` | `When a credential is earned, it is issued with a public verification page…` |
| Module chip `{badgeName}` e.g. "TenX Mindset Badge" (Program) | `Milestone · TenX Mindset` (display-only; canonical `badgeName` data unchanged) |

**Claims sweep (post-patch, local):** no `DeepLearning`, `19,000`, `founder-led`, `Founder/legal`, `Founder-review-ready`, `Often $10,000`, or `guaranteed certification/job/income` on any patched page. `accredited`/`university` appear **only in explicit negations**.

## 3. Legal placeholder cleanup performed

On `/terms`, `/privacy`, `/refund`:
- Removed every `"Founder/legal review required before production launch"` section and the `"Founder-review-ready…"` page descriptions (verified **absent** on all three).
- Replaced with calm, factual, public-safe copy. **No claim that a lawyer reviewed it.**
- Boundaries now present: TenXPros is a **private professional certification, not a university degree or academic accreditation**; **certification is not guaranteed**; **no job/income/promotion/business outcome is guaranteed**; **do not submit confidential client/employer/patient/regulated data**; **payment only after acceptance**; refund copy aligned to **Certified / Strong Draft / Completed**.
- (Internal note, not on the public page: independent legal review is still recommended before broad promotion.)

## 4. Apply form logic preserved

The existing `ApplicationForm` — its 14 fields, zod validation schema, and `submitApplication` action — were **not modified**. The patch only added a **server-rendered** pre-form block above the form, so it is visible **before hydration**:
- "Takes about 7–10 minutes," "No payment details are required," confidentiality warning (redacted/fictionalized examples), and the post-acceptance enrollment/onboarding note.
- A **static "What the form will ask"** preview (role/field, AI experience, time availability, why TenXPros, the real problem, consent) — so users see the questions even before the form hydrates.
- Load-failure fallback: "refresh… if it still fails, email **hello@tenxpros.com**" (the existing repo address in `email.ts`; not invented).

## 5. Review mechanics added (Certification)

New **"How dossier review works"** section: assessed against the eight public criteria; review by a **qualified human reviewer** using the TenXPros review standard; founding-cohort review handled **directly by the TenXPros review team and program architect** (no "panel"/"board" implied); outcomes Certified / Strong Draft / Completed; Strong Draft returns specific revision guidance; verification confirms metadata without exposing dossier contents; and a clear **"No certification outcome is guaranteed."**

## 6. Pricing comparison softened

- University "Typical price" → "often many thousands, depending on provider and format" (no exact figure, no institution named).
- Charter-ladder fairness line added: "The program structure stays the same; the entry price changes by charter window. No countdowns, no pressure mechanics — only the stated founding-seat limit (the first 10 accepted members)."

## 7. Time commitment added (Program)

New **"Format & commitment"** section: 12 guided weeks · 11 core modules + final dossier/capstone review · built for working professionals · **approximately 3–5 hours per week** (consistent with the canonical module `estimatedHours` totalling ~50h over 12 weeks) · async-first · checkpoints tied to the dossier, not video attendance · no coding required but serious professional judgment is.

## 8. International applicant note added

A conservative FAQ on `/pricing`: prices in USD; payment only after acceptance; async-friendly for international professionals; English review language; invoice/receipt available after acceptance and payment; no confidential/regulated data. **No** VAT-compliance, automated-invoice, or payment-method promises.

## 9. Founder claim handled

`/about` no longer depends on the unsourced **"official DeepLearning.AI Ambassador"** affiliation or the sector list (no source link exists in the repo). The founder block now leads with the safe generic line and closes on the public standard. As a pre-commit cleanup, the **unused `HomeFounderBand`** component in `home-instrument.tsx` (not rendered on any page) was **also cleaned** so the old "DeepLearning.AI Ambassador / 19,000+ hours / sector" copy cannot accidentally reappear. **Restore note:** the affiliation/sectors can be reinstated anywhere once a citable public source is added.

---

## 10. Tests run and results

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ Pass (exit 0) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Compiled successfully; all target routes static |
| Local `next start -p 3011` route check | ✅ `/`, `/program`, `/certification`, `/pricing`, `/apply`, `/about`, `/terms`, `/privacy`, `/refund` all **200** |
| Content verification (local) | ✅ all 9 patch items present/absent as intended; claims sweep clean |

The check used a **separate local server on port 3011**; the production `tenxpros-app` container on `:3003` was **not touched** (confirmed healthy).

## 11. Caveats

- **Legal pages remain light-themed** (content-only patch, not an Instrument restyle). Functional and consistent with the other secondary pages; a future pass can darken them.
- **Independent legal review is still advisable** before broad outreach — noted here (internal) only, not on the public pages.
- **`HomeFounderBand`** in `home-instrument.tsx` (unused, not rendered on any page) was **cleaned in this patch** — the old "DeepLearning.AI Ambassador / 19,000+ hours / sector" copy is gone, replaced with the safe public-standard line. The component is retained but carries no unsupported claim.
- The verification hero/illustrative panel (clearly labeled "Illustrative") was retained; only the explicit universal-claim *prose* was reframed.
- Seat CTA uses "Apply to be considered for a seat" (trimmed to fit the small hero readout); intent matches the requested "considered for a Founding Charter seat."
- **Not deployed, committed, or pushed** (per instructions).

## 12. Final `git status --short`

```
 M app/src/app/(public)/certification/page.tsx
 M app/src/app/(public)/privacy/page.tsx
 M app/src/app/(public)/program/page.tsx
 M app/src/app/(public)/refund/page.tsx
 M app/src/app/(public)/terms/page.tsx
 M app/src/components/marketing/about-instrument.tsx
 M app/src/components/marketing/apply-instrument.tsx
 M app/src/components/marketing/certification-instrument.tsx
 M app/src/components/marketing/home-instrument.tsx
 M app/src/components/marketing/pricing-instrument.tsx
 M app/src/components/marketing/program-instrument.tsx
?? docs/design/TENXPROS_TRUST_CONVERSION_PATCH_1_REPORT.md
```
11 source files modified (presentational/legal copy only) + 1 new report.
