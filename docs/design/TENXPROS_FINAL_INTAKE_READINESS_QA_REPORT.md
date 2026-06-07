# TenXPros — Final Live Intake Readiness QA Report

**Target:** `https://tenxpros.com` (live) · **Deployed commit:** `6bd2232`
**Date:** 2026-06-07 · **Type:** Read-only live + read-only operator inspection. No code/deploy/restart/env changes; **no production application submitted**.
**Recommendation:** ✅ **Ready for selected early applications** — with one operational item to complete before collecting payment (Stripe Payment Links in env). See §10.

---

## 1. Route & asset status (live)

| Route | Status | Redirects |
| --- | --- | --- |
| `/`, `/program`, `/dossier`, `/certification`, `/pricing`, `/apply`, `/about` | 200 | 0 |
| `/terms`, `/privacy`, `/refund` | 200 | 0 |
| `/samples/tenxpros-sample-verification.html` | 200 | 0 |
| `/samples/tenxpros-sample-dossier-excerpt.html` | 200 | 0 |
| `/samples/tenxpros-sample-dossier-excerpt.pdf` (application/pdf) | 200 | 0 |

All **13/13 = 200**, no redirect loops.

## 2. Conversion-path check

| Check | Result |
| --- | --- |
| Home primary CTA "Apply for Founding Charter" → `/apply` | ✅ (`/apply`) |
| Pricing primary CTA "Apply for Founding Charter" → `/apply` | ✅ (`/apply`) |
| Home `/apply` links / Pricing `/apply` links | 4 / 5 |

## 3. Apply form check (live, post-hydration)

| Check | Result |
| --- | --- |
| Form hydrates | ✅ |
| Application fields present | ✅ **14 / 14** |
| Submit button ("Submit application") | ✅ present |
| "Before you apply" block visible | ✅ |
| "What the form will ask" preview visible | ✅ |
| No payment details requested on Apply | ✅ ("no payment details required") |
| Confidential-data warning present | ✅ ("redacted or fictionalized examples") |

## 4. Controlled application submission test — **SKIPPED (by design)**

**No production application was submitted.** A read-only inspection of the submit path showed:
- `submitApplication` writes **real production data** (upserts a `user` with role `APPLICANT`, creates an `application` row + a `siteEvent`) **and sends a "TenXPros application received" email** to the applicant via Resend.
- It is **dedup-guarded** (an active application for an email blocks re-application), so a test record would persist and block that email.
- **No safe test mode and no documented cleanup tool** for deleting test applications were found (`ALLOW_DEMO_USERS` governs demo *login*, not an application test/cleanup path).

Per the task's branch for "no safe test/cleanup path," the form was instead **filled client-side up to the submit step and NOT submitted**:
- All fields filled with clearly-marked test data (Full name: `QA TEST — DO NOT PROCESS`; brief marked TEST; `whyTenXPros` = 140 chars; both consents checked).
- Submit button present; **`submit` was not clicked** (`submitted: false`). No server action fired; no DB write; no email sent.

**Recommendation:** production submission testing should be done by an operator (with a chosen test email) only after a documented cleanup path exists, or accepted as a real first application.

## 5. Admin / operator readiness (read-only)

| Capability | Finding |
| --- | --- |
| Admin login | `/login` (auth route), role-gated to `ADMIN`; admin server actions use the `requireAdminUser` guard. |
| See applications | ✅ `app/(admin)/admin/applications` (list) + `applications/[id]` (detail). |
| Acceptance flow | ✅ `updateApplicationStatus` action (SUBMITTED → UNDER_REVIEW → ACCEPTED / REVISE_AND_REAPPLY / NOT_ACCEPTED). |
| Payment + enrollment flow | ✅ `markPaymentReceivedAndEnroll` action + `app/(admin)/admin/payments`. |
| Certification flow | ✅ `app/(admin)/admin/certifications` + `[id]`. |

An admin **can** see and review applications, and the accept → payment → enrollment workflow exists. No data was mutated.

## 6. Payment readiness (read-only)

- **Model:** manual Stripe Payment Links (Checkout/webhook automation intentionally out of scope for launch). Operator workflow (per `docs/deployment/STRIPE_PAYMENT_LINKS.md`): applicant applies → admin reviews → **acceptance email includes the manual payment link** → applicant pays → admin confirms in Stripe → `markPaymentReceivedAndEnroll`.
- **Pricing page says payment happens only after acceptance** ✅ and **no user is asked to pay before acceptance** ✅ ("no payment details required to apply").
- **Operator path to send payment after acceptance exists** ✅ (manual link + admin confirm).
- **⚠️ Gap:** `STRIPE_PAYMENT_LINK_*` are **not configured** in `.env.production`. This does **not** block *accepting* applications, but the payment links must be added before sending the payment step to an accepted applicant.

No payment was triggered; no Stripe test performed.

## 7. Mobile QA (390px)

| Page | Overflow | Footer flush | Menu open/close | Apply CTA tappable |
| --- | --- | --- | --- | --- |
| `/` | 0px | ✅ | ✅ / ✅ | ✅ |
| `/pricing` | 0px | ✅ | ✅ / ✅ | ✅ |
| `/apply` | 0px | ✅ | ✅ / ✅ | ✅ |
| `/certification` | 0px | ✅ | ✅ / ✅ | ✅ |
| `/dossier` | 0px | ✅ | ✅ / ✅ | ✅ |

Form is usable on mobile (14 fields render; CTA tappable).

## 8. Claims & trust check (live)

| Phrase | Finding |
| --- | --- |
| DeepLearning.AI / 19,000 / founder-led / Often $10,000+ / guaranteed income / best in the world / blockchain | ✅ **none** |
| "guaranteed job" | ✅ negation only (Home & Apply "not for / not a fit" disclaimers) |
| "accredited / accreditation" | ✅ negation only (Certification "Not academic accreditation"; Pricing "not… an accredited academic program"; FAQ "not from an accreditation body") |
| Fake testimonials / logos / application counts | ✅ none present |

The only proof anchors are the public LinkedIn profile link (About), the public review criteria, the illustrative sample dossier, and the **clearly-labeled illustrative** verification example — no fabricated proof.

## 9. Remaining blockers

- **None blocking the start of early applications.** The apply → DB → applicant-email → admin-review path is live and works; admins can review/accept.
- **One operational item before the payment step:** configure the manual `STRIPE_PAYMENT_LINK_*` env values so an accepted applicant can be sent a working payment link. (Payment is post-acceptance, so this can be completed before the first acceptance email.)
- **Low/cosmetic:** `/login` RSC prefetch `ERR_ABORTED` (benign); tablet 768–1023px uses the hamburger menu (functional); legal pages light-themed. None block intake.

## 10. Final recommendation

✅ **Ready for selected early applications.**

The public site, conversion path, application form, claims safety, and mobile experience all pass on the live build (`6bd2232`), and the admin review workflow is in place. The site can begin accepting early applications from selected serious professionals now. **Before sending a payment link to the first accepted applicant**, configure the manual Stripe Payment Links in the production environment (the one operational item). It is also "ready for limited public review."

---

*Method: live `curl` (status/redirects/CTA/claims) + headless Chromium (form hydration + client-side fill without submit, mobile overflow/footer/menu, CTA hrefs) + read-only source/doc inspection of the application action, admin routes, and payment workflow. No screenshots written; no code, commit, deploy, container, or env change; no application submitted.*
