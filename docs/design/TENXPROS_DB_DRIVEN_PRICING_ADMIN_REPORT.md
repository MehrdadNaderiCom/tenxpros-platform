# TenXPros — DB-Driven Pricing + Admin Price Management Report

**Date:** 2026-06-08
**Base:** `6bb159c` · branch `deployment/production-deployment-sprint-a`
**Status:** `typecheck` PASS · `test` **36/36** PASS · `build` PASS.
**Not committed, not pushed, not deployed.** No `.env.production` edit, no secrets printed, no emails, no applications, no payments. **No production DB mutation in this sprint** (the DB already held the correct values from the prior reconcile).

---

## 1. Source of truth
**The DB `PricingTier` rows are now the single source of truth.** The public `/pricing` page reads prices from the DB at request time, and `/admin/pricing` can edit those same rows. `program-data.ts` is kept only as a safe fallback if the DB query fails or returns nothing.

## 2. Files changed
| File | Change |
| --- | --- |
| `app/src/lib/pricing.ts` | **new** — pure, tested helpers: `parsePricingUpdate` (validation), `usd`/`usdPlain` (formatting), `LADDER_DESC`, `PricingTierView` type. No prisma/network. |
| `app/src/app/(public)/pricing/page.tsx` | Queries `prisma.pricingTier.findMany({ orderBy: { price: "asc" } })`, normalizes, and passes `founding`/`standard`/`tiers` into the instrument. `export const dynamic = "force-dynamic"`. program-data fallback. Metadata unchanged (SEO preserved). |
| `app/src/components/marketing/pricing-instrument.tsx` | `PricingHero`, `PricingCard`, `PricingLadder`, `PricingCompare` now take price props and render via `usd()`/`usdPlain()`. The hardcoded `LADDER` array and `COMPARE_ROWS` price literal are gone. Visual design + copy preserved. |
| `app/src/lib/actions/admin.ts` | **new** `updatePricingTier` server action (admin-only, validated, audited, revalidates `/admin/pricing` + `/pricing`). |
| `app/src/app/(admin)/admin/pricing/page.tsx` | Added an editable **price** and **member-limit** form per tier (calls `updatePricingTier`); kept the "Make active" button; description notes the public page reads these values. |
| `app/tests/pricing.test.ts` | **new** — 12 tests. |

## 3. Public pricing — DB-driven changes
- All five ladder rows render from DB tiers (name, `usd(price)`, status from `isActive`, description from `LADDER_DESC`).
- Hero headline price = DB Founding; hero "Future standard" = DB Standard.
- Main card price = DB Founding; struck-through "Future standard" = DB Standard.
- Comparison table "Typical price" = DB Founding.
- **Audit:** no `$2,497 / $1,247 / $1,497 / $1,747 / $997` literals remain in `pricing-instrument.tsx`; `/pricing` builds as **ƒ (dynamic)**. (The only static `$997` is in the page's SEO `metadata.description`, intentionally left.)

## 4. Admin price-editing changes
- `/admin/pricing` now shows, per tier: current price + capacity, an **edit form** (price, member limit), a **Save price & capacity** button, and the existing **Make active** toggle.
- Tier `name`/`tier` enum and the active/closed behavior are unchanged.
- Editing a price and saving updates the DB → revalidates `/pricing` → public page reflects the change.

## 5. Validation rules (`parsePricingUpdate`)
- `price` and `membersLimit` must be **positive whole numbers** (`Number.isInteger`, `> 0`).
- Sanity ceiling: both must be `< 100000` (guards against absurd values / fat-finger).
- Invalid input throws a clear, secret-free error; the action also verifies the `tierId` exists before updating.

## 6. Audit logging
`updatePricingTier` writes an `AuditLog` row: `action: "UPDATE_PRICING_TIER"`, `entity: "PricingTier"`, `entityId`, and `changes: { before: {price, membersLimit}, after: {price, membersLimit} }`, with `actorId`/`actorRole` from the authenticated admin. The whole thing runs in a single `prisma.$transaction`.

## 7. Tests run and results
`pnpm typecheck` PASS · `pnpm test` **8 files, 36/36** · `pnpm build` PASS.
New `pricing.test.ts` covers: `parsePricingUpdate` (accepts valid; rejects 0/negative/non-integer/NaN/≥100000 for price and membersLimit); `usd`/`usdPlain` formatting; and source regressions (instrument has no hardcoded tier prices; page reads `prisma.pricingTier` + passes props + is force-dynamic; `updatePricingTier` requires admin, validates, audits, and revalidates `/pricing`).

## 8. DB pricing verification (read-only)
```
FOUNDING | 997  | 10 | active
EARLY    | 1247 | 20 | closed
LATE     | 1497 | 30 | closed
FINAL    | 1747 | 40 | closed
STANDARD | 2497 | 99 | closed
```
Matches the desired public ladder ($997 → $2,497). `program-data.ts` Standard remains `2497` (fallback parity).

## 9. Production DB mutation performed
**None in this sprint.** (The earlier `Standard 1997 → 2497` reconcile was a prior task; the DB already holds correct values.) These code changes do not mutate the DB until an admin uses the new edit form.

## 10. Remaining caveats
- **`/pricing` is now dynamic (server-rendered per request)** instead of static, because it reads the DB. Slightly more work per request, but no longer cached stale; acceptable for a low-traffic pricing page.
- **Full runtime verification happens on deploy.** Because the page is DB-driven, the static build doesn't prerender prices; the data flow is validated by tests + build + DB values. After deploy I can confirm `/pricing` renders all five amounts live.
- **No payment/enrollment logic changed.** The acceptance flow already reads `PricingTier.price` from the DB for the payment amount, so it stays consistent automatically.
- Member counts (`membersCount`) are still informational; no auto-enforcement of limits was added (out of scope).

## 11. Final git status
```
 M app/src/app/(admin)/admin/pricing/page.tsx
 M app/src/app/(public)/pricing/page.tsx
 M app/src/components/marketing/pricing-instrument.tsx
 M app/src/lib/actions/admin.ts
?? app/src/lib/pricing.ts
?? app/tests/pricing.test.ts
?? docs/design/TENXPROS_DB_DRIVEN_PRICING_ADMIN_REPORT.md
```
Branch in sync with origin at `6bb159c`. **No commit. No push. No deploy** — awaiting review/approval.
