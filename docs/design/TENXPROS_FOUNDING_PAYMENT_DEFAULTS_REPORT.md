# TenXPros — Founding Charter Default Payment Terms (Production Config)

**Date:** 2026-06-09 · branch `deployment/production-deployment-sprint-a` (HEAD `f17b811`)
**Scope:** Set operational **default payment terms** on the active `FOUNDING` PricingTier in the production DB, plus one audit-log entry. **No code, deploy, env, email, application, or payment change.**
**Outcome:** ✅ Applied and verified. `UPDATE 1`, `INSERT 0 1`, `COMMIT`.

---

## 1. Before state
```
id                        | name             | tier     | price | paymentMethod | paymentCurrency | paymentLink | paymentDueDays | paymentInstructions
cmp722qpx0001w1z3oy0svb8t | Founding Charter | FOUNDING | 997   | (null)        | (null)          | (null)      | (null)         | (null)
```
All payment-terms fields were unset; price was `997`.

## 2. After state
```
name             | tier     | price | paymentMethod  | paymentCurrency | paymentLink | paymentDueDays
Founding Charter | FOUNDING | 997   | MANUAL_INVOICE | USD             | (null)      | 2
```
`paymentInstructions`:
```text
Your TenXPros application has been accepted.

To complete your enrollment, please follow the payment instructions provided by the TenXPros team. The current Founding Charter fee is USD 997.

If you have questions or need assistance, contact us at support@tenxpros.com.
```

## 3. Exact fields updated (FOUNDING only)
| Field | Before | After |
|---|---|---|
| `paymentMethod` | null | `MANUAL_INVOICE` |
| `paymentCurrency` | null | `USD` |
| `paymentLink` | null | **null** (intentionally — manual invoice, no fake link, no `PAYMENT_LINK_FOUNDING`) |
| `paymentDueDays` | null | `2` |
| `paymentInstructions` | null | (text above) |

**Not changed:** `price` (997), `membersLimit` (10), `isActive` (true), `name`, `tier`. **No other tier touched** — EARLY/LATE/FINAL/STANDARD retain their prices (1247/1497/1747/2497), member limits (20/30/40/99), `isActive=false`, and null payment method.

## 4. Audit log confirmation
A single `AuditLog` row was written inside the same transaction:
```
action='UPDATE_PRICING_TIER_PAYMENT_TERMS'  entity='PricingTier'
entityId='cmp722qpx0001w1z3oy0svb8t'  actorId='cmq4w30ym00003t0zw3ztku2k' (mail@mehrdadnaderi.com)
actorRole='ADMIN'  createdAt='2026-06-09 01:16:16'
changes = { before: {all payment fields null}, after: {method/currency/dueDays/instructions, link null} }
```
The `AuditLog.id` was generated with `gen_random_uuid()::text` (the column has no DB default); `createdAt` used the DB `CURRENT_TIMESTAMP` default.

## 5. Route smoke check (read-only)
```
/admin/pricing   307   (auth redirect, unauthenticated — expected)
/admin/payments  307   (auth redirect, unauthenticated — expected)
/pricing         200
/api/health      200
```

## 6. How this is consumed
On acceptance, `resolvePaymentTerms` now resolves the FOUNDING tier defaults: amount `997` USD, method MANUAL_INVOICE, due in 2 days, and the manual instructions above. Because `paymentLink` is null and no `PAYMENT_LINK_FOUNDING`/`STRIPE_PAYMENT_LINK_FOUNDING` env var is set, the resolved link falls back to the safe placeholder `"Manual payment link pending"` — the applicant is directed to follow the team's manual instructions and to contact `support@tenxpros.com`. Outgoing system emails remain from `hello@tenxpros.com`.

## 7. Confirmations
- **Only DB mutation:** the `FOUNDING` tier payment-terms `UPDATE` (1 row) + one `AuditLog` `INSERT`, in one committed transaction.
- **No email sent. No application submitted. No payment triggered. No deploy/rebuild. No `.env.production` edit. No code change. No pricing amount or member-limit change. No other tier touched. Nothing committed or pushed.**

## 8. Remaining next steps
1. **Manual admin UI check (founder):** log in to `/admin/pricing` → confirm the Founding "Default payment terms" show MANUAL_INVOICE / USD / due 2 / instructions, link blank. Optionally review `/admin/payments`.
2. **Test acceptance (optional, only with a test email):** accept a *test* application to confirm the accepted-email renders the resolved terms (amount 997 USD, due date, instructions, support@ contact). Use a throwaway address — this dispatches a real SMTP email.
3. **Marketing dashboard:** deferred to a later sprint (explicitly out of scope here).
