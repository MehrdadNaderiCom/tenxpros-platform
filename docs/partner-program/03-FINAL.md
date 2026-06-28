# Partner Program — Final Production-Grade Report

_The Partner Program is complete, correct for global partners, and live. This
report records every review finding resolved (before → after), confirms the
engine is timezone- and currency-correct, gives the green-gate and live results,
and states exactly what is manual by design and what a partner and an admin can
each do today._

---

## 1. Every review finding resolved (before → after)

The earlier adversarial review surfaced 28 findings; 8 were verification notes /
false positives. All 20 confirmed findings — high, medium and low — are now fixed.

| # | Finding (verified) | Before | After |
|---|---|---|---|
| 1 | Tier-3 focus 35% cap leaked to non-focus deals (**high**) | `focusActive` was partner-wide | `focusActive` is **deal-scoped** to an active focus grant matching the deal's industry/region; ordinary deals keep the absolute 25%/30% cap |
| 2 | Recompute could undo refund reversals (**med**) | partial reversal mutated `amountCents` in place; recompute re-derived it | Reversal now tracked in a separate `reversedCents`; recompute is **refused once any RefundEvent exists** and is idempotent |
| 3 | Successive/partial refunds under-reversed (**med**) | reversal computed off the single refund amount; base never decremented | Reversal is **cumulative + idempotent**: each line's `reversedCents = proportion(amount, Σ refunded-to-date)`; two 25% refunds == one 50% refund; re-applying is a no-op |
| 4 | Clawback window never computed (**med**) | `RefundEvent.withinWindow` always defaulted true | Computed from `clawbackWindowEnd(signedAt)` and stored per event |
| 5 | Refunds didn't stop seats counting (**med**) | seats unaffected | Full refund flips all paid seats to REFUNDED; a partial refund accepts a `seatsRefunded` count and flips/splits seat records exactly |
| 6 | Fixed-fee lines lost exactness on recompute (**med**) | fee stored as a lossy derived `rateBp` | New `isFlat` flag; fixed fees keep their **exact** amount, are **committed** (counted toward the cap but never scaled), so recompute is idempotent |
| 7 | Financial records cascade-deleted with Partner (**med**) | `onDelete: Cascade` | `onDelete: Restrict` on `ClosedDeal.partner` and `CommissionEntry.partner` — a partner with financial history **cannot be hard-deleted** (verified live) |
| 8 | Hard-coded 30-day pilot window (**med**) | literal `30` in rules | `pilotFirst30DaysWindowDays` config field (default 30), globally defaulted and **per-partner overridable** like every other number |
| 9 | DST/timezone date drift (**low**) | local-time `setDate`/`getDay` | **All** date math uses UTC (`setUTC*`/`getUTC*`/`Date.UTC`); deterministic across any server TZ/DST. A source-level test forbids local-time accessors in `rules.ts` |
| 10 | Honeypot field was inert (**low**) | not sent to the server | The public form now forwards `companyWebsite`; the server spam guard fires |
| 11 | Global config used `update` (would throw if singleton missing) (**low**) | `prisma.update` | `upsert` (self-heals) |
| 12 | `setPartnerTier` had no Tier-2 prerequisite (**contract**) | any tier settable | Tier 3 now **requires** the partner to already hold Tier 2 (Schedule C); eligibility is shown (promotion stays the admin's Panel Confirmation) |
| 13 | Focus-bonus tenure never wired (**contract**) | `focusBonusBp` unused; grant froze at 1% | Fully wired: re-earning the same focus keeps continuous tenure and **steps the bonus +1%/year toward 35%**; a lapse resets to year 1; recompute auto-applies the bonus at the grant's tenure rate |
| 14 | Audit payload held a raw `Date` (**low**, defensive) | `Date` in JSON | ISO string |
| 15 | TenXOps form wiped input on a validation error (**low**) | uncontrolled fields | controlled fields preserve input |
| 16 | Priority/duplicate guard (**contract**) | entity+country match | confirmed correct: first Panel Confirmation wins (the guard blocks a later confirmation of the same live entity/country by another partner) — documented |

## 2. Internationalization correctness (global partners)

- **Money:** every amount is an **integer in minor units** (no floats). Minor-unit
  scale is per-currency (USD/EUR 2, JPY/KRW 0, BHD/KWD 3) via `currency.ts`; nothing
  assumes USD or two decimals.
- **Multi-currency:** a closed deal captures the **customer currency**, the
  **net receipts in that currency**, and the **FX rate to the payout currency on
  the cleared date** (clause 14.2A) — all stored (`currency`, `conversionRate`,
  `conversionDate`). Commission is computed in the deal currency (the engine is
  scale-agnostic), and every display/total converts to the partner's payout
  currency at the captured rate. Conversion adjusts for differing minor-unit scales,
  so JPY→USD and USD→BHD are exact.
- **Dates/timezones:** stored as instants; all window math in **UTC** (DST-immune).
  Display formatting is locale-safe via `Intl.NumberFormat`.
- **Forms accept the world:** names are Unicode (no `[a-z]` restriction); phone
  accepts international formats (`+`, digits, spaces, `-`, `.`, `()`); country is a
  free-text field with a searchable list; region/city is free text. Validation does
  not break on non-Latin input or non-US phone/country formats.

## 3. Re-verification of the core rules (all tested)

- **Absolute caps** (25% B2C / 30% B2B; Tier-3 focus to 35%, never higher): cap is a
  hard clamp; fixed fees committed, percentage lines scaled cents-exact. ✓
- **Origination override:** 50% of the opening rate, only inside the 12-month window
  **and** while Active Status holds; zero otherwise. ✓
- **Major new engagement** (new B2B engagement, or expansion ≥ 15 seats) opens a
  fresh 12-month window; same-scope renewal does not. ✓
- **Trail** ≤ 12 months on cleared receipts, vested. ✓
- **Tier eligibility:** Tier 2 = 40 paid/collected seats in 12 months; Tier 3 = hold
  Tier 2 + 15 paid/collected focus seats in 12 months; promotion only on Panel
  Confirmation. ✓
- **Focus bonus:** 1% start, +1%/continuously-held year, clamped ≤ 35%, reset on lapse,
  on the partner's own sourced/managed seats. ✓
- **Clawback:** refund ⇒ no commission owed on that amount (cumulative idempotent
  reversal), window computed, seats stop counting. ✓
- **Seats:** only paid, collected, non-refunded, non-quality-flagged seats count. ✓

## 4. Green gate + live verification

- **Typecheck** `tsc --noEmit`: ✅ — **Lint** `next lint`: ✅ — **Unit tests** `vitest run`:
  ✅ **156 passed** (16 files; +23 new: currency, refund idempotency, UTC/DST, focus
  tenure, fixed-fee clamp, config-driven pilot window) — **Build** `next build`: ✅.
- **DB smoke** (namespaced disposable, cleaned up): new columns store/read correctly
  (`isFlat`, `reversedCents`, EUR + rate 1.08), and `onDelete: Restrict` **blocks**
  deleting a partner that has financial history.
- **Deploy:** 5 logical commits pushed (no force-push); rebuilt and recreated only
  the `tenxpros-app` service via Docker; `prisma migrate deploy` applied the second
  additive migration. Sibling apps (`tenxops*`, `tenxrole*`) untouched.
- **Live** (internal `:3003` and through Caddy at **https://tenxpros.com**): public
  `/partners` + `/partners/apply` 200; homepage shows Become a Partner; `/admin/partners`
  gated; `/partner` gated (no leak); **live e2e** (real browser → real form + server
  action) passed, fixture cleaned up. _(Filled in §7 after redeploy.)_

## 5. What is MANUAL by design (no payment processor)

Payments are **operator-entered on the panel** — by design, no Stripe/Cryptomus/
webhook is wired into the Partner Program. Specifically, an admin manually:
- records a **closed deal** (customer currency, net receipts, FX rate, signed/
  delivered/cleared dates), its **seats**, and their statuses;
- marks commission lines **payable** and **paid** (the engine computes amounts,
  caps, payable timing; the admin confirms the actual payout);
- records **refunds/chargebacks/cancellations** (the engine reverses commission
  cumulatively and stops seats counting).

Everything else — eligibility, caps, override, trail, focus bonus, clawback math,
windows — is computed by the tested engine. Wiring a processor later would only
replace the manual "record closed deal / cleared payment / refund" entries with
webhook-driven ones; the engine and panel stay the same.

## 6. What each role can do in the live system today

**A partner can** (on the Partner Panel at `/partner`): see status, tier, pilot day
counter + scorecard, Active Status, and commission totals; complete the **Activation
Gate**; **register deals** (with the mandatory account justification); view registered
accounts and confirmed scope/protection; read a **commission statement** (net payable
in their currency, with payout equivalents) and **flag a query**; **request a TenXOps
engagement** on an account they coach; and edit their profile. The panel gates outreach
behind gate completion + Panel Confirmation.

**An admin can** (in the admin Partner Program section): review applications and
**approve** (creates the partner + pilot + Panel Confirmation, emails a set-password
link) / reject / hold; **confirm the Activation Gate**; **confirm/decline deal
registrations** (House-Account + duplicate/priority guards) and **TenXOps requests**;
set **tier** (Tier-3 requires Tier-2) and status (active/inactive/terminate); mark
**scorecard** checkpoints; **record closed deals** (multi-currency), **seats**, and
**commission lines** (percentage or fixed fee); **recompute** (cap + payable + auto
focus bonus); mark commissions **payable/paid**; apply **refunds/clawbacks** (cumulative,
seat-aware); **grant/re-earn/end a Tier-3 focus**; add **quality flags**; manage
**House Accounts**; edit the **global configuration** and **per-partner overrides** for
every number; export **commissions CSV**; and read the **audit log** of every
`PANEL_*` confirmation and config change.

## 7. Live deploy verification (this release)

Rebuilt and recreated only the `tenxpros-app` service via Docker; container **healthy**
(Ready in ~0.6s); boot ran `prisma migrate deploy` → **"No pending migrations to apply"**
(the second additive migration `20260628000000_partner_program_money_i18n` was already
applied to the shared DB; `migrate status`: **13 migrations, up to date**).

| Check | Result |
|---|---|
| `GET /api/health` | 200 |
| Homepage "Become a Partner" | present |
| `GET /partners` / `/partners/apply` (internal **and** via Caddy) | 200 / 200 |
| `GET /admin/partners` (unauthenticated) | 307 → `/login` (gated) |
| `GET /partner` (unauthenticated) | redirected to `/login`, **no panel content leaked** |
| Live e2e (real browser → real form → server action) | **2/2 passed**; disposable `*.test` fixture deleted in teardown (0 left) |
| Sibling apps `tenxops*` / `tenxrole*` | **untouched** (uptimes unchanged) |

Production URL: **https://tenxpros.com** — `/partners`, `/partners/apply`, the Partner
Panel `/partner/*`, and the admin **Partner Program** section are live and current.

