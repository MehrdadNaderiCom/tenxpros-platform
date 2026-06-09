# TenXPros — Payment Management Sprint 2: Implementation Report

**Date:** 2026-06-09 · branch `deployment/production-deployment-sprint-a` (HEAD `b93da5e`)
**Scope:** Resolver + validators, admin tier-default & per-application payment UI, audited server actions, and acceptance/payment-email integration. **Marketing dashboard out of scope.**
**Outcome:** ✅ Implemented and QA-clean (typecheck + 61 tests + build). **Nothing committed, pushed, or deployed. No production DB mutation. No real emails. No `.env.production` edit.**

---

## 1. What was built

The Sprint-1 schema fields (already live in the production DB) are now used by code: admins can set **default payment terms per tier** and **customize payment per application**, drive a **manual payment lifecycle** with audited status actions, and the **acceptance email** is built from resolved terms.

### Files
| File | Change |
|---|---|
| `app/src/lib/payment-terms.ts` | **New.** Pure resolver + validators + status-transition model + label formatters. No prisma/network → unit-testable. |
| `app/src/lib/actions/admin.ts` | **+** `updatePricingTierPaymentTerms` (tier defaults; never touches price/capacity). |
| `app/src/lib/actions/applications.ts` | Acceptance email now resolver-driven; **+** `upsertApplicationPaymentTerms`, `markPaymentInstructionsSent`, `markPaymentWaived`, `markPaymentFailed`, `markPaymentCancelled`; enrollment core extracted to a shared `enrollAcceptedApplication`. |
| `app/src/app/(admin)/admin/pricing/page.tsx` | **+** per-tier "Default payment terms" form (method, currency, link, instructions, due-days). |
| `app/src/app/(admin)/admin/applications/[id]/page.tsx` | **+** "Payment management" panel: customization form + status-action buttons + history. |
| `app/src/app/(admin)/admin/payments/page.tsx` | Enhanced table (method, due date, timeline, app link, status badges) + status filter chips. |
| `app/tests/payment-terms.test.ts` | **New.** 25 tests: resolver precedence, validators, discount-note visibility, transitions, source-regression. |

## 2. Resolver — `resolvePaymentTerms({ record, tier, now })`
Precedence (most specific wins), returning `amount, currency, method, paymentLink, paymentInstructions, dueAt, dueDays, discountNote, showDiscountNoteToApplicant, publicDiscountNote, supportEmail`:

1. **Per-application override** — `PaymentRecord` payment* fields
2. **Tier default** — `PricingTier` payment* fields
3. **Env fallback** — `paymentLinkForTier()` (link only; `PAYMENT_LINK_<TIER>` → legacy `STRIPE_PAYMENT_LINK_*` → `*_FOUNDING`)
4. **Safe defaults** — link placeholder `"Manual payment link pending"`, amount `997`, currency `USD`, `supportEmail = support@tenxpros.com`

- `dueAt`: the record's explicit date always wins; otherwise a tier `dueDays` default + `now` is materialized into a concrete date (pure — `now` is passed in, never read inside).
- **Discount note is internal by default.** `publicDiscountNote` is `null` unless `showDiscountNoteToApplicant === true`; the raw `discountNote` is retained for admin/audit but never emailed unless explicitly marked public.
- Unknown methods normalize to `null`. Currency normalizes to upper-case.

## 3. Validators (pure, throw clear errors)
`parseAmount` (positive int < 100000), `parseCurrency` (3-letter ISO, default USD), `parsePaymentMethod` (enum or null), `parseOptionalUrl` (http(s) or empty), `parseDueDays` (1–365 or empty), `parseDueDate` (valid, not past relative to `now`), `parseNote` (trim, ≤2000 chars). Composed into `parseTierPaymentDefaults` and `parseApplicationPaymentOverride` (accept any `FormData`-like source).

## 4. Audited server actions
All require admin, write an `AuditLog`, and revalidate affected paths.

| Action | Audit action | Notes |
|---|---|---|
| `updatePricingTierPaymentTerms` | `UPDATE_TIER_PAYMENT_TERMS` | Tier defaults only; **price/capacity untouched.** Revalidates `/admin/pricing`, `/pricing`, `/admin/payments`. |
| `upsertApplicationPaymentTerms` | `UPDATE_PAYMENT_TERMS` | Saves override onto the `pending-<id>` record (creates it only for accepted/enrolled apps). **Sends no email.** |
| `markPaymentInstructionsSent` | `PAYMENT_STATUS_CHANGE` | → `INSTRUCTIONS_SENT` + `instructionsSentAt`; (re)sends resolved instructions email via `safeSendEmail`. |
| `markPaymentReceivedAndEnroll` | `ENROLL` (existing) | The PAID→enroll path (unchanged behavior; now a thin wrapper over the shared enroll core). |
| `markPaymentWaived` | `PAYMENT_STATUS_CHANGE` | → `WAIVED` + `waivedAt`; enrolls **only** if admin ticks "enroll" **and** app is ACCEPTED (waived record stays WAIVED — enroll flips PENDING only). |
| `markPaymentFailed` / `markPaymentCancelled` | `PAYMENT_STATUS_CHANGE` | → `FAILED` / `CANCELLED` (+`cancelledAt`). No enroll. |

Status transitions are guarded by `assertPaymentTransition` (e.g. `WAIVED`/`REFUNDED` terminal; `PAID`→`PENDING` blocked; stuck `FAILED`/`CANCELLED` can reopen to `PENDING`). Stripe fields (`stripeSessionId`/`stripeChargeId`) are preserved.

## 5. Acceptance / payment email
`createPendingPaymentAndSendAcceptedEmail` now seeds amount/currency/dueAt onto the PENDING record from tier defaults, re-reads any admin override, resolves final terms, and sends through the shared `sendPaymentInstructionsEmail`:
- **Sender `hello@tenxpros.com`** (email-service default — unchanged).
- **Support copy `support@tenxpros.com`** ("Questions about payment? Contact …") from the resolver.
- Includes amount, due date, payment link, instructions; **discount note only when `publicDiscountNote` is set**.
- Uses `safeSendEmail` (non-throwing). The legacy direct `paymentLinkForTier()` call in the action is removed — the resolver now owns link fallback.

## 6. QA results
| Command | Result |
|---|---|
| `pnpm prisma generate` | PASS |
| `pnpm typecheck` | PASS — 0 errors |
| `pnpm test` | PASS — 9 files, **61/61** (was 36; +25 new) |
| `pnpm build` | PASS — "Compiled successfully"; admin routes compiled. Only pre-existing `<img>` LCP warnings in unrelated marketing files. |

## 7. Explicit confirmations
- **No `.env.production` edit. No secrets printed. No real email sent. No application submitted. No payment triggered. No production DB mutation** (QA used pure functions + mocked/in-memory `Map` form data only). **No pricing amounts changed. No public marketing copy changed. No marketing dashboard. No deploy/rebuild. Nothing committed or pushed.**
- Locked email identity honored: `hello@tenxpros.com` sender, `support@tenxpros.com` in payment instructions.
- Locked decisions honored: integer USD amounts; discount note internal by default (public only via `showDiscountNoteToApplicant`).

## 8. Final git status (uncommitted)
```
 M app/src/app/(admin)/admin/applications/[id]/page.tsx
 M app/src/app/(admin)/admin/payments/page.tsx
 M app/src/app/(admin)/admin/pricing/page.tsx
 M app/src/lib/actions/admin.ts
 M app/src/lib/actions/applications.ts
?? app/src/lib/payment-terms.ts
?? app/tests/payment-terms.test.ts
```

## 9. Next steps (future sub-sprint, on approval)
Review → commit/push → deploy (`docker compose up -d --build tenxpros-app`) → live-verify the admin payment flows. Optionally configure `PAYMENT_LINK_<TIER>` env values (or set per-tier links in the admin UI) before outreach.
