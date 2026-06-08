# TenXPros — Payment + Marketing Operations Plan (design only)

**Date:** 2026-06-08 · branch `deployment/production-deployment-sprint-a` (live `4dab8e8`)
**Status:** **Plan only — nothing implemented.** No schema/migration/code/env/DB/pricing/deploy changes were made. This document proposes the design for review before any coding sprint.

---

## 0. Email identity (locked — must not be lost)
- **`hello@tenxpros.com`** — the **only outgoing sender** for all system mail: application received, status update, **acceptance + payment instructions**, enrollment welcome. (= `EMAIL_FROM` / `SMTP_USER`, already live via SMTP.)
- **`support@tenxpros.com`** — **support/contact inbox** shown to users for help. Never used as a sending identity.
- Every payment email in the new design **sends from `hello@`** and **shows `support@`** as the help contact.

---

## 1. Current-state findings (inspected, read-only)

### 1.1 Payment data model
`PaymentRecord` (`prisma/schema.prisma:941`): `applicationId?`, `participantId?`, `amount Int`, `currency String @default("USD")`, `status PaymentStatus`, `stripeSessionId?`, `stripeChargeId?`, `paidAt?`, timestamps.
`PaymentStatus` enum (`:969`): **`PENDING | PAID | FAILED | REFUNDED`** only.
`PricingTier` (`:915`): `name`, `tier (CharterTier)`, `price Int`, `membersLimit`, `membersCount`, `isActive`, `openedAt/closedAt`, `benefits Json`. **No payment-method / link / instructions / due-window fields.**

### 1.2 How the acceptance email gets the payment link today
`updateApplicationStatus` → on `ACCEPTED` → `createPendingPaymentAndSendAcceptedEmail` (`src/lib/actions/applications.ts`):
- creates a **PENDING** `PaymentRecord` with `amount = activeTier.price ?? 997`;
- sends `application_accepted_payment_link` (via `safeSendEmail`, sender `hello@`) whose body interpolates **`paymentLinkForTier(tier)`**.
- `paymentLinkForTier` (`src/lib/services/payment-link.ts`) resolves **`PAYMENT_LINK_<TIER>` → `STRIPE_PAYMENT_LINK_<TIER>` → fallbacks → `"Manual payment link pending"`** from **environment variables**.

### 1.3 Can payment be customized per applicant today? **No.**
The link is a **global per-tier env var**; the amount is the tier price. There is **no** per-applicant amount, link, instructions, due date, discount, method, or note. Email templates are **inline text** in `applications.ts` (no template table).

### 1.4 Current admin gaps
- `/admin/payments`: **read-only list** of `PaymentRecord`s. The only mutation is `markPaymentReceivedAndEnroll` (PAID → enroll, from the application detail).
- `/admin/pricing`: now edits tier **price + member limit** (`updatePricingTier`, audited) — but **no payment terms** (method/link/instructions/due).
- No way to set or send **per-applicant** payment terms; no `INSTRUCTIONS_SENT / WAIVED / CANCELLED` statuses.

### 1.5 Analytics / marketing dashboard gaps
- `/admin/analytics`, `/admin/analytics/{cohorts,funnel,marketing}`, `/admin/reports` are **stubs (shells)**. No campaign tracking, outreach log, or funnel/pace dashboard.

### 1.6 Where application source / UTM is captured
**Already captured** at submit (`submitApplication`): `Application.utmSource/utmMedium/utmCampaign/utmTerm/utmContent`, `referrerUrl`, `landingPage`, plus a `SiteEvent` `APPLICATION_SUBMITTED`. **This data exists but is not aggregated/surfaced anywhere** — a marketing dashboard can read it directly (esp. `utmCampaign`).

---

## 2. Proposed Payment Management design

Goal: payment is **admin-managed and per-applicant customizable**, with **tier defaults** as the fallback — replacing the single static env link.

### 2.1 Schema proposal (additive, nullable → low-risk)
**New enums**
```prisma
enum PaymentMethod { WISE STRIPE MANUAL_INVOICE BANK_TRANSFER OTHER }
// extend PaymentStatus with three values (additive):
//   PENDING, INSTRUCTIONS_SENT, PAID, WAIVED, FAILED, CANCELLED   (REFUNDED kept)
```
**Tier defaults** — add to `PricingTier` (or a sibling `TierPaymentTerms`; prefer inline for simplicity):
```prisma
defaultPaymentMethod   PaymentMethod @default(MANUAL_INVOICE)
defaultCurrency        String        @default("USD")
defaultPaymentUrl      String?       // Wise/Stripe/manual checkout URL
defaultInstructions    String?       // manual bank/transfer instructions
defaultDueWindowDays   Int?          // e.g. 7
```
**Per-applicant overrides** — add to `PaymentRecord` (all nullable; fall back to tier defaults):
```prisma
method        PaymentMethod?
paymentUrl    String?
instructions  String?
dueDate       DateTime?
discountNote  String?   // scholarship / discount rationale (shown internally; optionally in email)
adminNote     String?   // internal only, never emailed
// status now uses the extended PaymentStatus enum
```
**Audit:** continue using `AuditLog` (`action: "UPDATE_TIER_PAYMENT_TERMS" | "UPSERT_APPLICATION_PAYMENT" | "SEND_PAYMENT_INSTRUCTIONS" | "UPDATE_PAYMENT_STATUS"`, with before/after in `changes`).

### 2.2 Resolution rule (per-applicant → tier default → safe placeholder)
A pure `resolvePaymentTerms(paymentRecord, tier)` returns the effective `{ method, amount, currency, paymentUrl, instructions, dueDate }`:
1. per-applicant field if set, else 2. tier default, else 3. a safe placeholder (`"Payment instructions will follow."` — never a broken link). Keep the legacy env `paymentLinkForTier` as a final fallback for backward compatibility.

### 2.3 Acceptance email change
`createPendingPaymentAndSendAcceptedEmail` builds the email body from `resolvePaymentTerms(...)` (amount + currency + method + link/instructions + due date), **sender `hello@`, support line `support@`**. If terms aren't set yet, it sends a "your acceptance is confirmed; payment instructions will follow" message and the admin sends instructions explicitly (status → `INSTRUCTIONS_SENT`). **No payment/enrollment logic is removed** — `markPaymentReceivedAndEnroll` stays the PAID→enroll path.

### 2.4 Admin UI
- **`/admin/pricing`** — add a "Default payment terms" section per tier (method, currency, default URL, instructions, due window).
- **`/admin/applications/[id]`** — a **Payment panel**: amount, currency, method, payment URL, manual instructions, due date, discount note, admin note, status dropdown (the 6 states), and buttons **"Send payment instructions"** (emails from `hello@`, sets `INSTRUCTIONS_SENT`) and **"Mark paid & enroll"** (existing).
- **`/admin/payments`** — enhance the list with method/status columns + filters; link each row to its application.

### 2.5 Server actions (all `requireAdmin()` + audited + validated)
`updateTierPaymentTerms`, `upsertApplicationPaymentTerms`, `sendPaymentInstructions`, `updatePaymentStatus`. Reuse `markPaymentReceivedAndEnroll`.

### 2.6 Validation rules (pure, testable)
amount = positive whole number `< 1,000,000`; currency = 3-letter ISO; `paymentUrl` must be `https://…` when present; `dueDate` must be in the future when set; status transitions constrained (e.g. can't go `PAID → PENDING`); a `WAIVED`/`CANCELLED` payment doesn't auto-enroll.

### 2.7 Tests needed
- pure `resolvePaymentTerms` (per-applicant overrides tier default overrides placeholder);
- pure `parsePaymentTerms` validators (amount/currency/url/dueDate);
- status-transition guard;
- source regression: each new action calls `requireAdmin` + writes `AuditLog` + revalidates the right paths.

### 2.8 Migration risk & deployment order
- **Risk: low.** All additions are **nullable columns + additive enum values**; no backfill. Caveat: Postgres `ALTER TYPE … ADD VALUE` (enum extension) can't run inside a transaction on older PG — Prisma migrate handles it, but review the generated migration.
- **Order:** (1) review/run additive migration; (2) deploy code that *reads* new fields with tier/env fallback (no behavior change yet); (3) ship admin UI; (4) switch acceptance email to `resolvePaymentTerms` (env link retained as last-resort fallback). Each step independently safe and reversible.

---

## 3. Proposed Marketing Dashboard design (simple, founder-run)

Goal: the founder defines a campaign with targets, logs daily outreach, and sees funnel + pace at a glance — **no CRM, no automation, no external analytics dependency.**

### 3.1 Schema proposal (2 new tables, additive)
```prisma
model Campaign {
  id String @id @default(cuid())
  name String
  startDate DateTime
  endDate   DateTime
  minTarget Int        // minimum acceptable paid enrollments (or applications) by endDate
  desiredTarget Int    // stretch goal
  targetMetric String @default("PAID")  // "PAID" | "APPLICATIONS" | "ACCEPTED"
  utmCampaign String?  // optional: auto-attribute applications by Application.utmCampaign
  pivotDecision String?  // free-text: pivot taken / not needed
  notes String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  outreach OutreachLog[]
}

model OutreachLog {
  id String @id @default(cuid())
  campaignId String
  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  date DateTime
  channel String        // e.g. LinkedIn, email, X, community, referral
  segment String?       // audience segment
  copyUsed String?      // message/copy used
  reached Int @default(0)
  replies Int @default(0)
  interestedLeads Int @default(0)
  notes String?         // lessons learned
  createdAt DateTime @default(now())
}
```
- **Top-of-funnel** (reached / replies / interested) is **manual** (it happens off-platform) → entered in `OutreachLog`.
- **Bottom-of-funnel** (applications / accepted / paid) is **auto-derived** from existing data: count `Application` (by `status`) and `PaymentRecord` (PAID) within `[startDate, endDate]`, optionally filtered by `utmCampaign`. No duplicate manual entry needed.

### 3.2 Metrics / formulas (pure, testable)
Let `current` = count of the `targetMetric` to date; `elapsedDays` / `totalDays` from the date range; `remainingDays = total - elapsed`.
- **Progress:** `current / minTarget`, `current / desiredTarget`.
- **Daily pace needed (to min):** `max(0, (minTarget - current) / max(1, remainingDays))`; same for desired.
- **Expected-by-now (linear):** `desiredTarget * (elapsed / total)`; **actual vs expected** = `current - expected`.
- **Funnel rates:** reach→reply = `replies/reached`; reply→application = `applications/replies`; application→acceptance = `accepted/applications`; acceptance→paid = `paid/accepted`. (Guard divide-by-zero → show "—".)
- **Status band:**
  - **BELOW_MINIMUM** if `current < minTarget * (elapsed/total)` (behind the minimum trajectory) → show warning + suggested daily pace + **"consider a pivot"** when behind for ≥ N consecutive days or by ≥ X%.
  - **ON_TRACK** between min and desired trajectories.
  - **AHEAD** if `current ≥ desiredTarget * (elapsed/total)` → encouragement.

### 3.3 Admin UI
- **`/admin/marketing`** (new nav item, or fill the existing `/admin/analytics/marketing` stub): campaign list + create/edit; a campaign detail page with the **daily outreach log** (add row) and a **scoreboard** (progress bars to min/desired, pace needed, actual-vs-expected, the four funnel rates, status band + pivot prompt). Reads the auto-derived application/payment counts.

### 3.4 Tests needed
- pure metric functions (pace, expected-by-now, funnel rates with zero guards, status band classification);
- source regression: campaign/outreach actions require admin + audit; dashboard reads counts correctly.

### 3.5 Migration risk & deployment order
- **Risk: low** — 2 brand-new tables, no changes to existing models. Order: (1) migration; (2) `/admin/marketing` pages + actions; (3) auto-derived funnel counts; (4) optional `utmCampaign` attribution toggle.

---

## 4. Audit / logging requirements
Every payment-terms write, payment-status change, instruction send, campaign create/edit, and outreach-log entry writes an `AuditLog` (`actorId`, `actorRole`, `action`, `entity`, `entityId`, `changes` before/after). Email sends already record `EmailEvent`. No secrets in logs.

## 5. Email identity rules (restated)
All payment/acceptance/instruction emails **send from `hello@tenxpros.com`** and **display `support@tenxpros.com`** as the help contact. Marketing outreach is **manual/off-platform** (the dashboard tracks it; it does not send marketing email from the app).

## 6. Tests (summary)
Pure unit tests for all resolvers/validators/metric formulas (no prisma/network, vitest-friendly), plus source-level regression tests asserting admin auth + audit on each new server action. Keep parity with the existing `pricing.test.ts` / `email-smtp.test.ts` style.

## 7. Deployment order (combined, safe)
1. **Payment migration** (additive) → 2. payment read-path + resolver (fallback to tier/env) → 3. payment admin UI + actions → 4. acceptance email uses resolver → 5. **Marketing migration** (2 tables) → 6. marketing admin UI + metrics. Each is independently deployable and reversible; no step changes auth, the application form/schema, or existing pricing behavior.

## 8. Risks & open questions
- **Multi-currency:** keep `amount` as integer minor-or-major units? Today it's whole USD. Decide units before adding `currency` (recommend: integer **major units** + ISO currency, matching current usage).
- **Refund/consumer-law wording** for per-applicant discounts/waivers — keep conservative; the existing Refund/Terms copy already covers the basics (legal review before multi-jurisdiction scaling).
- **Payment confirmation is manual** (admin marks PAID). No Stripe webhook automation yet — intentional; a future sprint can add it without changing this model.
- **Email deliverability:** SPF/DKIM/DMARC for `tenxpros.com` should be verified so acceptance/payment emails reach inboxes (carried over from the SMTP report).
- **Targets are founder-set;** the dashboard evaluates against them — no external benchmark is assumed.

## 9. Should we run Deep Research or ask other LLMs before implementation?
**Short answer: not required for the MVP of either feature.** Both designs are standard, internally-scoped, and build on models already in the schema.
- **Payment design — external best-practice review needed?** *Light/optional.* The per-applicant-override + tier-default pattern is well-understood. A brief external check is only worth it for **payment-terms legal wording** (refunds/waivers/discounts across jurisdictions) and, later, **Wise/Stripe payment-request flows** if/when automating confirmation — neither blocks the MVP.
- **Marketing dashboard — external best-practice review needed?** *No for build.* The funnel + pace formulas are standard. A short, optional look at **founder-led B2B outreach benchmarks** could help *set* `minTarget`/`desiredTarget`, but target-setting is the founder's call, not a coding blocker.
- **Recommended before coding:** a quick internal decision on (a) currency units, (b) which `targetMetric` the campaign judges by (paid vs applications), and (c) whether discount notes appear in the applicant email. These are product decisions, not research.
- **Verdict:** proceed to implementation when approved; reserve Deep Research / multi-LLM review for the *legal/refund wording* and *email deliverability (SPF/DKIM/DMARC)* only, which can run in parallel and don't gate the build.

---

**This is a plan only. Not implemented, not committed, not pushed.** Awaiting your go-ahead (and the product decisions in §8–§9) before any payment or marketing coding sprint.
