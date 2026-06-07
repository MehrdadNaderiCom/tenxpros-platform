# TenXPros — Post-Patch Public QA Report (Live)

**Target:** `https://tenxpros.com` (live)
**Deployed commit:** `7d3299a` (Trust & Conversion Patch Sprint 1)
**Date:** 2026-06-07
**Type:** Read-only live QA. No code/deploy/restart/env changes.
**Verdict:** ✅ **GO** for limited reviewer sharing and early applications. No Critical/High/Medium issues; one benign Low (Next.js `/login` prefetch abort).

---

## 1. Routes tested
`/`, `/program`, `/dossier`, `/certification`, `/pricing`, `/apply`, `/about`, `/terms`, `/privacy`, `/refund`, plus `/samples/…excerpt.pdf` and `/samples/…excerpt.html`.

## 2. Status summary

| Route | Status | Redirects | Content-Type | Bytes |
| --- | --- | --- | --- | --- |
| `/` | 200 | 0 | text/html | 70,648 |
| `/program` | 200 | 0 | text/html | 115,946 |
| `/dossier` | 200 | 0 | text/html | 92,715 |
| `/certification` | 200 | 0 | text/html | 110,186 |
| `/pricing` | 200 | 0 | text/html | 121,959 |
| `/apply` | 200 | 0 | text/html | 77,721 |
| `/about` | 200 | 0 | text/html | 70,268 |
| `/terms` | 200 | 0 | text/html | 18,500 |
| `/privacy` | 200 | 0 | text/html | 17,048 |
| `/refund` | 200 | 0 | text/html | 17,822 |
| `…excerpt.pdf` | 200 | 0 | application/pdf | 465,633 |
| `…excerpt.html` | 200 | 0 | text/html | 70,090 |

All **200**, **zero redirects → no redirect loops**. Sample **PDF** valid (`%PDF-1.4`, 465 KB, non-empty); sample **HTML** opens ("Illustrative Sample Excerpt").

## 3. Patch-specific verification (live)

| Check | Result |
| --- | --- |
| `/apply` contains "Before you apply" | ✅ present |
| `/apply` contains "What the form will ask" (static preview) | ✅ present |
| `/certification` contains "How dossier review works" | ✅ present |
| `/program` contains "Approximately 3–5 hours per week" | ✅ present |
| `/pricing` contains "often many thousands, depending on provider and format" | ✅ present |
| `/about` contains "DeepLearning.AI" | ✅ absent |
| `/about` contains "19,000" | ✅ absent |
| `/terms` `/privacy` `/refund` contain "Founder/legal review" | ✅ absent (all 3) |
| `/terms` `/privacy` `/refund` contain "Founder-review-ready" | ✅ absent (all 3) |
| "Often $10,000+" anywhere | ✅ absent |
| "founder-led" anywhere | ✅ absent |

## 4. Apply form verification (live, post-hydration)

| Check | Result |
| --- | --- |
| Form hydrates | ✅ |
| Fields present | ✅ **14 / 14** (fullName, email, country, professionalRole, domain, linkedinUrl, aiExperience, dataSensitivity, timeAvailability, whyTenXPros, realProblemBrief, preferredLanguage, consentConfidentiality, consentTerms) |
| Submit button ("Submit application") | ✅ present |
| Static "Before you apply" block visible | ✅ |
| Static "What the form will ask" preview visible | ✅ |

No real application was submitted (production).

## 5. Mobile QA (390px, all 10 pages)

| Check | Result |
| --- | --- |
| Horizontal overflow | ✅ **0px on all 10** |
| Footer flush (trailing blank) | ✅ **0px on all 10** |
| Broken images | ✅ **0 on all 10** |
| Mobile menu opens (covers viewport) | ✅ all 10 (incl. legal pages) |
| Mobile menu closes | ✅ all 10 |

(Desktop: 0px overflow, 0px trailing, 0 broken images on all 10.)

## 6. Claims-safety sweep

| Phrase | Finding |
| --- | --- |
| DeepLearning / 19,000 / founder-led / Often $10,000 | ✅ none |
| best in the world / world's first / guaranteed income / guaranteed certification | ✅ none |
| "guaranteed job" | ⚠️ negation only — Home & Apply "not for / not a fit" disclaimers ("People expecting a guaranteed job, income, or business outcome"). Safe. |
| "accredited" | ⚠️ negation only — Certification & Pricing ("Not a university degree or accreditation", "not a university degree or an accredited academic program"). Safe. |

No risky claims; every match is an explicit disclaimer. The new Terms boundary ("It is not a university degree, academic accreditation…") is present.

## 7. Console / network findings

- **Console errors: 0** across all 10 pages × desktop + mobile.
- **Page errors: 0.** **Broken images: 0.**
- **4xx/5xx asset failures: 0.**
- **Only non-2xx events:** `net::ERR_ABORTED` on `https://tenxpros.com/login?_rsc=…` (3 instances: home desktop, program mobile, pricing mobile) — benign Next.js RSC prefetch cancellation for the nav "Login" link; `/login` itself returns 200. Informational/Low.

## 8. Remaining issues

- **None blocking.** Low/optional, unchanged from prior QA:
  1. `/login` prefetch `ERR_ABORTED` (cosmetic; optional `prefetch={false}` on the nav Login link).
  2. Legal pages (`/terms`, `/privacy`, `/refund`) and the shared nav/footer remain light-themed — functional, out of the dark-Instrument scope; a future pass could unify them.

## 9. Final go / no-go

✅ **GO for limited reviewer sharing and early applications.** All availability, patch-specific, Apply-form, mobile, claims-safety, and console/network checks pass on the live site at `7d3299a`. The only finding is a benign prefetch abort.

---

*Method: live `curl` (status/redirects/content/claims/asset bytes) + headless Chromium via Playwright (console/network capture, overflow/footer metrics, mobile menu open/close, broken-image detection, Apply-form post-hydration integrity) at 1440px and 390px. No screenshots were written; no code, deploy, or container action.*
