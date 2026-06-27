# Partner Program — Phase 2 Result

_What was built, how to use it, the assumptions made, the adversarial review and fixes,
known limitations, and the deploy + verification._

---

## 1. What was built

A complete Partner Program across three surfaces, on the existing Next.js 14 / Prisma /
NextAuth stack, derived from the three governing documents (90-Day Partner Pilot Letter,
Partner Program Agreement + Schedules A–H, Founder Note).

### Surface 1 — Public (apply)
- **`/partners`** — marketing page: the three-tier ladder, the 90-day pilot, the stage-by-stage
  relationship, how you earn by function, and the "no equity / country / industry / exclusivity"
  rule. CTAs to apply.
- **`/partners/apply`** — react-hook-form + Zod application form (honeypot + server-side
  rate limit). On submit it creates a `PartnerApplication (NEW)`, emails the applicant an
  acknowledgement and the owner a notification, and redirects to **`/partners/apply/thank-you`**.
- **"Become a Partner"** entry in the public header nav, the homepage hero, and the footer.

### Surface 2 — Partner Panel (`/partner`, role-linked)
Gated to a logged-in user whose `User` is linked to an approved `Partner`. Pages: **Dashboard**
(status, tier, active status, pilot day counter + scorecard, paid-seat & commission totals),
**Onboarding** (the Activation Gate checklist; the rest of the panel is gated behind gate
completion + the company's Panel Confirmation), **Deal Registrations** (register an opportunity
with the mandatory account justification; statuses + confirmed scope + protection expiry),
**My Accounts**, **Commissions** (statement with accrued/payable/paid/reversed + a per-line
query flag), **TenXOps** (request to open an engagement on an account you coach), **Profile**
(display details + the recognition credential for the current tier).

### Surface 3 — Admin "Partner Program" (in the existing sidebar)
A new sidebar section (admin-gated, matching the existing nav component): **Partners**
(roster + per-partner detail), **Applications** (inbox + review → approve creates the partner
+ pilot + Panel Confirmation / reject / hold), **Deal Registrations** (confirm/decline queue
with House-Account + duplicate guards, and TenXOps requests), **Commissions** (compute, mark
payable/paid, CSV export), **Configuration** (global defaults editor), **House Accounts**, and
**Audit Log** (every `PANEL_*` confirmation, approval, tier/config change). The per-partner
detail page manages tier/status/active, scorecard, closed deals/seats/commission lines/refunds,
quality flags, focus grants, and the **per-partner config override editor**.

## 2. Data model (all additive)

New `PARTNER` value on `UserRole`; new models: `PartnerApplication`, `Partner`, `ProgramConfig`
(singleton), `PartnerConfig`, `ActivationGateItem`, `ScorecardCheckpoint`, `DealRegistration`,
`RegisteredAccount`, `HouseAccount`, `ClosedDeal`, `SeatRecord`, `CommissionEntry`,
`TenXOpsEngagement`, `FocusGrant`, `RefundEvent`, `QualityFlag`; new enums (`PartnerStatus`,
`PartnerTier`, `DealRegStatus`, `PartnerFunction`, `CommissionStatus`, `SeatStatus`, …). Panel
Confirmations and config changes reuse the existing **`AuditLog`** (actions prefixed `PANEL_*`).
Migration: `20260627000000_partner_program` (forward-only; verified strictly additive — no DROP/
RENAME/row-mutation of any existing object; the singleton `ProgramConfig` row is seeded by an
idempotent `INSERT … ON CONFLICT DO NOTHING` so every environment self-provisions it).

**Money is integer cents; rates/caps are integer basis points (100 bp = 1%)** — no floats — kept
isolated from the legacy whole-dollar `PaymentRecord`.

## 3. Two-layer config + resolver (the "globally defaulted, per-partner overridable" core)

- `ProgramConfig` (one row) holds ~60 global defaults; `PartnerConfig` holds the same fields,
  all nullable, per partner.
- A single resolver `resolvePartnerConfig(partnerId)` (`src/lib/partner/config-server.ts`)
  merges them — a non-null partner override wins, else the global default — and returns a fully
  populated `EffectiveConfig`. The **commission engine and every rule read commercial numbers
  only through this resolver**; there are no hard-coded rates (asserted by a source-level test).
- Admin editors: `/admin/partners/config` (global) and each partner's page (override). The
  override editor shows the effective default as a placeholder; a blank field inherits the default.

## 4. Commission engine (pure, unit-tested)

`src/lib/partner/commission.ts` + `rules.ts` are pure functions (no DB, no clock — `now` is
injected). They implement: per-function rates (incl. the B2C strong-rate seat gate), the absolute
per-deal **cap clamp** (25% B2C / 30% B2B, the Tier-3 focus exception to 35%, cents-exact
proportional scaling), the **origination override** (50% of the opening rate, only inside the
12-month window with Active Status), **major-new-engagement** window reset, **trail** end,
**focus-bonus** stepping with the 35% ceiling, **growth bonus**, **proportional clawback**, FX
conversion, **countable seats**, tier eligibility, pipeline/lapse windows, and business-day
payment timing. **48 partner unit tests** (commission, config resolver, rules, purity invariants),
**133 total** passing.

## 5. How to use the admin

1. **Applications** → open an applicant → **Approve & start pilot** (creates the `Partner` at
   Tier 1 / PILOT, seeds the Activation Gate + scorecard, emails a set-password link, records a
   `PANEL_CONFIRM_PARTNER_APPROVED` audit entry).
2. On the partner's page: **Confirm Activation Gate** once they complete onboarding; manage tier
   (eligibility is shown but promotion is your Panel Confirmation), active status, and termination.
3. **Deal Registrations** → confirm (writes confirmed scope + first-right + pipeline-protection
   expiry, creates the protected `RegisteredAccount`; House Accounts and entities already held by
   another partner are blocked) or decline.
4. Record a **closed deal** → add **seats** and **commission lines** (function + rate or flat fee)
   → **Recompute** (applies the cap clamp + payment timing) → **Mark payable / paid**. Apply a
   **refund** to reverse commission proportionally (full refunds also mark seats refunded).
5. **Configuration** edits global defaults; each partner's page overrides any value for that
   partner only. Everything is in the **Audit Log**.

## 6. Assumptions made

- **Partner identity = a new `PARTNER` `UserRole`** (additive). Partner-panel access is
  link-based (a `User` linked to an approved `Partner`), so a dual participant/partner user is
  supported. The admin section is gated to `ADMIN` (the founder/super-admin is an `ADMIN`),
  matching the prompt's "super admin / admin role"; the existing `isSuperAdmin` email pattern is
  preserved for Marketing.
- **New money fields use integer cents and rates use basis points** (the prompt forbids floats);
  the legacy whole-dollar `PaymentRecord` is untouched.
- **Commission computation is operator-driven** (the admin records closed deals/seats and runs
  the engine), not wired to a live payment processor. Stripe/Cryptomus reconciliation is a
  documented follow-up.
- The singleton `ProgramConfig` is created by the migration and self-healed by the resolver and
  the global-config upsert.
- The Tier-1 pilot "first 30 days" window is fixed by the spec (which names the field
  `pilotFirst30DaysMaxAccountsTier1`); only the account cap is tunable/overridable.

## 7. Adversarial review (multi-agent) and fixes applied

A 5-dimension review (engine correctness, security/IDOR, data integrity, contract fidelity,
Next.js correctness) with each finding independently verified against the code surfaced 28 raw
findings; 8 were rejected as false positives by verification. Fixes applied:

- **[High] Tier-3 focus cap leaked to non-focus deals.** `recomputeDealCommissions` computed
  `focusActive` partner-wide, so any deal for a partner with an active focus could use the 35%
  ceiling. Fixed to scope `focusActive` to deals whose `industryOrRegion` matches an **active
  focus grant**; ordinary deals keep the absolute 25%/30% cap.
- **[Med] Recompute could undo refund reversals.** `recomputeDealCommissions` now aborts if the
  deal has any `RefundEvent` (refunds are final adjustments and must not be re-derived from rate).
- **[Med] Refunds did not stop seats / set the clawback window.** `applyRefund` now marks the
  deal's paid seats `REFUNDED` on a full refund (so they stop counting toward targets/tiers) and
  records `RefundEvent.withinWindow` from the clawback window.
- **[Low] Honeypot was inert.** The public form now forwards the honeypot value so the server-side
  spam guard actually fires.
- **[Low] Global config used `update` (would throw if the singleton were missing).** Changed to
  `upsert`.
- **[Info] Tier eligibility** is now shown on the partner page (promotion remains the admin's
  Panel-Confirmation decision, per the contract).

## 8. Known limitations / recommended follow-ups (out of scope)

- **Payment-processor reconciliation** (Stripe/Cryptomus webhooks → auto-create `ClosedDeal`/
  `SeatRecord`/cleared dates) — today the admin records these. This is the biggest follow-up.
- **Cumulative partial refunds** reverse against each line's current amount; for multiple partial
  refunds on one deal, prefer a single refund or a manual adjustment. Full refunds are exact.
- **Fixed-fee delivery lines** store an implied `rateBp` (the exact fee is preserved as the
  stored amount but not as a dedicated `flatCents` column); a future migration could add it.
- **Focus-bonus annual stepping** and the **growth bonus** are applied by the operator adding the
  corresponding commission line (the engine computes the correct bp); auto-stepping a focus
  grant's bonus each held year is a follow-up.
- **Financial-record retention**: `Partner`/`ClosedDeal` cascade-delete their children. There is
  no partner-delete UI (termination is soft), so this is latent; switch to restrict/soft-delete
  if a hard-delete path is ever added.
- **Date math** uses local-time calendar operations; the production host is UTC so this is inert,
  but pinning to UTC (or `TZ=UTC`) is recommended before any non-UTC deployment.
- **CAPTCHA** on the public form, and richer email templates, are nice-to-haves.

## 9. Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (133 unit tests), and `pnpm build` all green
  (before and after the review fixes).
- A Playwright happy-path spec (`tests/e2e/partner-lifecycle.spec.ts`) is included following the
  repo's e2e convention (namespaced `*.test` disposable fixture, deleted in teardown).
- **Live deploy + verification:** see the section below (appended after deploy).
