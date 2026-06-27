# Partner Program — Phase 1 Implementation Plan

_Concrete plan expressed in the real stack from `00-AUDIT.md`: Next.js 14 App Router,
Prisma 5 (Postgres, migrations), NextAuth v5, server actions + Zod v4, Tailwind +
in-house UI primitives, Vitest, Docker deploy._

Source of truth for the rules: the three TenXPros documents (90-Day Partner Pilot
Letter, Partner Program Agreement + Schedules A–H, Founder Note). The Agreement makes
the **Partner Panel the single source of truth** — nothing is approved, registered,
promoted or confirmed except on the panel — so every state change writes an `AuditLog`
entry (action prefixed `PANEL_*` for confirmations).

---

## 0. Money & percentage representation (decision)

- **Money:** integer **cents** (`Int`) for all new Partner-Program monetary fields
  (`netReceiptsCents`, `amountCents`, `estValueCents`). Avoids floats; keeps commission
  math exact. A `formatCents(cents, currency)` helper wraps the legacy `formatCurrency`.
  (Legacy `PaymentRecord.amount` stays whole-dollar; the two never mix.)
- **Percentages / rates:** integer **basis points** (`Int`, 1% = 100 bp). All config rate
  fields and stored commission rates are bp. Commission = `floor(baseCents * bp / 10000)`.
- **Caps** are bp too; the engine clamps total compensation to the cap as a final step.

## 1. Schema additions (`prisma/schema.prisma`)

Additive only. New `PARTNER` value on `UserRole`. New models & enums:

**Enums:** `PartnerStatus` (APPLICANT, PILOT, TIER1, TIER2, TIER3, INACTIVE, TERMINATED),
`PartnerTier` (TIER1, TIER2, TIER3), `PartnerApplicationStatus` (NEW, UNDER_REVIEW,
APPROVED, REJECTED), `OfferingType` (B2C_CHARTER, B2B_ENGAGEMENT, OTHER),
`DealProductLine` (TENXPROS, TENXOPS), `DealRegStatus` (SUBMITTED, CONFIRMED, DECLINED,
LAPSED, WITHDRAWN), `PartnerFunction` (BASIC_INTRO, QUALIFIED_ORIGINATION,
STRONG_ORIGINATION, CLOSING, DELIVERY, OVERRIDE, FOCUS_BONUS, GROWTH_BONUS),
`CommissionStatus` (ACCRUED, PAYABLE, PAID, REVERSED), `SeatStatus` (PENDING,
PAID_COLLECTED, REFUNDED, CANCELLED), `EngagementStatus` (REQUESTED, CONFIRMED,
DECLINED), `FocusGrantStatus` (ACTIVE, LAPSED, WITHDRAWN), `ScorecardDay` (DAY_14,
DAY_30, DAY_60, DAY_90), `DeliveryMode` (FIXED_FEE, PERCENTAGE).

**Models:**
- `PartnerApplication` — applicant identity (fullName, email, phone?, country, region?,
  linkedinUrl?, background, b2cB2b), targetMarkets, accountJustification, heardFrom?,
  consentNoEquity (bool), honeypot handling (not stored), UTM fields, status, reviewerNotes,
  reviewedAt/By, `partner` back-relation. Indexes on `status`, `email`, `createdAt`.
- `Partner` — `userId?` (unique, nullable until login), `applicationId?` (unique),
  status, tier, pilotStartDate?, activationGatePassedAt?, activeStatus (bool),
  lastActivityAt?, recognitionTitle?, displayName/contactEmail/country, terminatedAt?,
  terminationReason?, qualityFlagged (bool). Relations to all child tables. One
  `PartnerConfig?`.
- `ProgramConfig` — singleton (`id @default("singleton")`), every global default field
  (see §3) as **non-null** with seeded defaults, `updatedAt`, `updatedBy?`.
- `PartnerConfig` — `partnerId @unique`, every field **nullable** (override or fall back).
- `ActivationGateItem` — partnerId, key, label, completed (bool), completedAt?. (Onboarding
  checklist; unique [partnerId, key].)
- `ScorecardCheckpoint` — partnerId, day (`ScorecardDay`), requiredEvidence, met (bool),
  reviewedAt?, reviewerNote?. unique [partnerId, day].
- `DealRegistration` — partnerId, productLine, offering, legalEntity, country,
  businessUnit?, contactName?, contactTitle?, estSeats?, estValueCents?, functionsIntended
  (String[]), justification, widerScopeRequested?, status, confirmedScope?,
  firstRightExpiresAt?, pipelineProtectionExpiresAt?, confirmedByUserId?, decidedAt?,
  declineReason?, submittedAt, panel timestamps. → `registeredAccount?`. Indexes
  [partnerId, status], [status, submittedAt].
- `RegisteredAccount` — dealRegistrationId @unique, partnerId, legalEntity, country,
  businessUnit?, offering, scope, isHouseAccount, isDirectRegistration, managed (bool),
  protectionExpiresAt?, lastMeaningfulUpdateAt?, lapsedAt?. → closedDeals, engagement.
- `HouseAccount` — entityName, domain?, note?, createdByUserId. Index on entityName.
- `ClosedDeal` — registeredAccountId?, partnerId, dealType (B2C|B2B via OfferingType-ish
  bool), productLine, netReceiptsCents, deliveredAt?, paymentClearedAt?,
  originationRateBpAtOpen?, originationWindowStart?, trailPeriodEnd?, isMajorNewEngagement,
  currency, conversionRate?, conversionDate?. → seats, commissions, refundEvents.
- `SeatRecord` — closedDealId, count, status (`SeatStatus`), industryOrRegion?,
  sourcedByPartner (bool), note?. (countsTowardTargets derived: PAID_COLLECTED && !quality
  disregard.)
- `CommissionEntry` — partnerId, closedDealId, function (`PartnerFunction`), rateBp,
  baseAmountCents, amountCents, status (`CommissionStatus`), payableOn?, paidOn?, currency,
  conversionRate?, conversionDate?, queryFlag (bool), queryNote?, note?. Indexes
  [partnerId, status], [closedDealId].
- `TenXOpsEngagement` — partnerId, registeredAccountId @unique, status, justification,
  confirmedByUserId?, decidedAt?, closedDealId? (the B2B ClosedDeal it becomes). Seats NOT
  counted toward partner targets.
- `FocusGrant` — partnerId, industryOrRegion, grantedAt, expiresAt, continuouslyHeldSince,
  currentBonusBp, status (`FocusGrantStatus`).
- `RefundEvent` — closedDealId, type (refund|chargeback|cancel|credit|reverse), amountCents,
  occurredAt, withinWindow (bool), reversedCommissionCents.
- `QualityFlag` — partnerId, closedDealId?, reason, disregardForTargets (bool), createdAt.
- Panel confirmations + config changes reuse the existing **`AuditLog`** (no new audit
  model). A read view filters `entity` ∈ partner-program entities.

The singleton `ProgramConfig` row is inserted by the **migration SQL itself**
(`INSERT ... ON CONFLICT (id) DO NOTHING`) so every environment (shared dev/prod) has it
after `migrate deploy`, with no separate prod seed run. The resolver also self-heals if missing.

## 2. Config resolver

`src/lib/partner/config.ts`:
- `EFFECTIVE_CONFIG_FIELDS` — typed list of all config keys.
- `resolvePartnerConfig(partnerId?)` → loads `ProgramConfig` (create-if-missing) + the
  partner's `PartnerConfig`, returns `EffectiveConfig` (every field non-null, partner
  override wins, else global default). Mirrors `resolvePaymentTerms` precedence.
- `resolveGlobalConfig()` for non-partner contexts.
- Tiered fields (maxOpenAccounts, pipelineProtectionDays, quietAccountLapseDays,
  activeStatusCureDays) are stored per tier (`...Tier1/2/3`) and the resolver exposes a
  `forTier(tier)` accessor.
- **The commission engine and every rule read effective config through this resolver only —
  no hard-coded constants.** Defaults live once in `PROGRAM_CONFIG_DEFAULTS`.

## 3. Config fields (seeded global defaults — from the prompt's table)

Rates (bp): basicIntroductionBp=500; qualifiedOriginationB2cBp=1000, qualifiedOriginationB2bBp=800;
strongOriginationB2cBp=1500, strongOriginationB2bBp=1200; strongOriginationUnlockSeats=40;
closingB2cBp=500, closingB2bBp=1000; deliveryMode=PERCENTAGE, deliveryPercentMinBp=500,
deliveryPercentMaxBp=800.
Caps (bp): capB2cBp=2500, capB2bBp=3000, tier3FocusHardCeilingBp=3500.
Origination: originationWindowMonths=12, overrideShareBp=5000, majorNewEngagementMinSeats=15,
trailPeriodMonths=12.
Tiers: tierQualifyingWindowMonths=12, tier2SeatThreshold=40, tier3FocusSeatThreshold=15.
Focus bonus: focusBonusStartBp=100, focusBonusAnnualIncrementBp=100, focusBonusCeilingBp=3500.
Growth bonus: growthBonusOrgThreshold=3, growthBonusBp=100.
Limits per tier: maxOpenAccounts 3/5/10; pilotFirst30DaysMaxAccountsTier1=2;
pipelineProtectionDays 120/150/180; quietAccountLapseDays 30/45/60; firstRightHours=48;
dealConfirmationWindowBusinessDays=5.
Active Status: activeStatusResponseBusinessDays=5; activeStatusCureDays 30/45/60; transitionDays=30.
Payment: currency="USD"; paymentBusinessDays=30; smallPayoutThresholdCents=… (carry-forward true).
Clawback: clawbackDays=120.
Pilot/termination: pilotDays=90; pilotTerminationNoticeDays=7; postPilotTerminationNoticeDays=30;
materialBreachCureDays=15; windDownDays=30; programAmendmentNoticeDays=30.
Restrictions: nonCircumventionMonths=24; nonSolicitationMonths=12; lateStageTailDays=90.

## 4. Commission engine (`src/lib/partner/commission.ts`, pure + tested)

Exported pure functions (all take `EffectiveConfig`):
- `originationRateBp(strength, dealType, seatsSoldB2c, config)` — qualified vs strong; B2C
  strong gated by `strongOriginationUnlockSeats` (or panel unlock flag).
- `functionCommissionCents(fn, baseCents, rateBp)`.
- `computeDealCommission({ functions, baseCents, dealType, config })` → per-function entries
  + **cap clamp** to `capB2c/B2bBp` (Tier-3 focus → up to `tier3FocusHardCeilingBp`).
- `originationOverrideBp(openRateBp, config)` = `openRateBp * overrideShareBp / 10000`, only
  inside the 12-month window, 0 after.
- `isMajorNewEngagement({ isNewEngagement, expansionSeats }, config)`.
- `focusBonusBp(yearsHeld, config)` — start + increment·(years-1), clamped so total ≤ ceiling;
  resets to start on lapse.
- `growthBonusApplies(orgCountRolling12, tier, config)`.
- `trailEnd(signedAt, config)`, `originationWindowEnd(firstCloseAt, config)`.
- `applyClawback(entry, refund, config)` → reversal; seat stops counting.
- `convertCents(cents, rate)` — FX at cleared date.
- `countableSeats(seats, qualityFlag)` — only PAID_COLLECTED, not refunded/cancelled, not
  disregarded.
- `tierEligibility(seatsInWindow, focusSeatsInWindow, currentTier, config)` → eligible flags
  (panel confirmation still required to actually promote).
- `commissionPayable(deliveredAt, paymentClearedAt, config)` → payableOn = later + N business days.

**Vitest** `tests/partner-commission.test.ts`: full stack at cap; multi-partner stacking;
override vs renewal vs major-new-engagement window reset; refund after payment reversal;
focus bonus stepping + 35% ceiling clamp; FX conversion; inactive partner (vested trail
stays, override stops); B2C strong-rate seat gate; growth bonus threshold. Plus
`tests/partner-config.test.ts` for resolver precedence, and `tests/partner-rules.test.ts`
for windows/lapse/tier eligibility. A `tests/partner-engine-invariants.test.ts` asserts the
engine never reads a hard-coded rate (source-level, like `security-hardening.test.ts`).

## 5. Validations (`src/lib/validations/partner.ts`)

Zod v4 schemas: `partnerApplicationSchema` (+ honeypot refine), `dealRegistrationSchema`,
`activationGateSchema`, `programConfigSchema` (all bp/cents ints, ranges), `partnerConfigSchema`
(all optional), `tenxOpsRequestSchema`, admin decision schemas. Shared client + server.

## 6. Server actions

- `src/lib/actions/partner-public.ts` — `submitPartnerApplication(formData)` (honeypot +
  Zod + rate-limit by email/IP-hash via a small in-memory+DB guard, EmailEvent ack, audit,
  SiteEvent). Returns `{ ok, message, id }`.
- `src/lib/actions/partner-portal.ts` — partner-authenticated: `completeActivationItem`,
  `submitActivationGate`, `submitDealRegistration`, `requestTenXOpsEngagement`,
  `flagCommissionQuery`, `updatePartnerProfile`. Each resolves the caller's own `Partner`
  (IDOR-safe) and audits.
- `src/lib/actions/partner-admin.ts` — `requireAdminUser()` gated: `reviewPartnerApplication`
  (approve→create Partner+User link+pilot+scorecard+gate items+PANEL_CONFIRMATION audit /
  reject), `confirmDealRegistration`/`declineDealRegistration` (writes scope + first-right +
  protection expiry, House-Account & duplicate checks, priority by confirmation timestamp),
  `promotePartnerTier`/`stepDownPartner`/`setActiveStatus`/`terminatePartner`,
  `upsertPartnerConfigOverride`, `updateProgramConfig`, `recordClosedDeal`/`recordSeats`,
  `computeCommissionsForDeal`, `markCommissionPayable`/`markCommissionPaid`,
  `applyRefund`/`clawback`, `addHouseAccount`/`removeHouseAccount`, `addQualityFlag`,
  `confirmTenXOpsEngagement`. All audit before/after.

## 7. Routes / surfaces

**Public** (`(public)`): `/partners` (marketing — tiers, pilot, ladder, no-equity, CTA),
`/partners/apply` (form) → `/partners/apply/thank-you`. Header/hero/footer "Become a Partner".

**Partner Panel** — new route group `(partner)` at **`/partner`**, layout gated to
`role === PARTNER` + linked approved `Partner` (else redirect). Pages: `/partner` (dashboard:
status, tier benefits, pilot day counter + scorecard, active status, totals),
`/partner/onboarding` (activation gate), `/partner/deals` (+ `new`, registration form with
justification, list with status/scope/protection), `/partner/accounts`, `/partner/commissions`
(statement + query flag), `/partner/tenxops` (request engagement), `/partner/profile`.
New `partner-nav.tsx` mirrors `portal-nav.tsx`.

**Admin** (`(admin)/admin`): new sidebar **"Partner Program"** section (append `NavSection`).
Pages under `/admin/partners`: `applications`, `partners` (+ `[id]` detail with config-override
editor showing effective value + `default: X` placeholder, tier/status actions, accounts/deals/
commissions/scorecard/focus), `deal-registrations` (queue + confirm/decline), `commissions`
(compute/payable/paid/clawback/export CSV via route handler), `config` (global defaults editor),
`house-accounts`, `audit` (filtered AuditLog view). Gate the whole section to `ADMIN`
(super-admin is also ADMIN); financial mutations stay admin-only.

## 8. Emails (`src/lib/email/templates.ts`)

Add pure builders: `partnerApplicationReceivedEmail` (applicant ack),
`partnerApplicationNotifyAdminEmail` (notify `SUPER_ADMIN_EMAIL`),
`partnerApplicationDecisionEmail` (approved → set-password/login link, or rejected),
`partnerDealConfirmedEmail`. Sent via `safeSendEmail` (never blocks the action).

## 9. RBAC & security

- New `PARTNER` role. Partner-portal layout: session + `role === PARTNER` + own approved
  `Partner` record, else redirect. Admin layout already gates ADMIN.
- Every action re-checks server-side; partner actions resolve `Partner` from the session user
  (never trust a partnerId from the client) → **no IDOR**.
- Public application: server-side Zod + honeypot + lightweight rate-limit; never exposes admin
  endpoints. Money as cents int, percentages as bp int (no floats). DB indexes on FKs +
  status/date fields. Accessible forms (reuse `Field`/`Input` with labels/aria/errors).

## 10. Migration strategy (shared dev/prod DB — careful)

1. Edit `schema.prisma` (additive). `prisma format` + `validate`.
2. `prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel
   ./prisma/schema.prisma --script` → write to a new
   `prisma/migrations/<ts>_partner_program/migration.sql`; append the idempotent
   `INSERT INTO "ProgramConfig" ... ON CONFLICT DO NOTHING`.
3. `prisma migrate deploy` (forward-only; applies the one new migration to the shared DB).
   `prisma generate`.
4. No `migrate dev`/`reset`. Verify `migrate status` clean afterward.

## 11. Test / build / deploy

- `pnpm typecheck && pnpm lint && pnpm test` (Vitest) green. Add a Playwright happy-path
  (`tests/e2e/partner-lifecycle.spec.ts`): home → Become a Partner → submit application
  (admin approve → partner login → register a deal → admin confirm), best-effort against a
  local server.
- `pnpm build` (standalone) green.
- Commit in logical, conventional commits (db schema+migration, config+engine+tests,
  public flow, partner panel, admin section, emails+wiring, docs).
- Deploy: push the deploy branch; from repo root `docker compose build tenxpros-app` then
  `docker compose up -d --no-deps tenxpros-app` (only this service; siblings untouched).
  Container start runs `migrate deploy`. Verify https://tenxpros.com: home shows Become a
  Partner; `/partners` + `/partners/apply` load; a test application submits; `/admin/partners`
  lists it. Fix forward on failure.
- Write `02-RESULT.md`.

## 12. Assumptions (carried; see RESULT for the full list)

- Partner identity = a new `PARTNER` `UserRole` (additive). Super-admin actions stay under
  `ADMIN` (founder is ADMIN); the section is admin-visible per the prompt's "super admin /
  admin role".
- New money fields use integer **cents**, rates use **basis points** (precision; the prompt
  explicitly forbids floats). Legacy whole-dollar fields are untouched.
- Commission computation is **operator-driven** (admin records closed deals/seats and runs
  the engine) rather than wired to a live payment processor — Stripe/Cryptomus reconciliation
  is a documented follow-up.
- The singleton `ProgramConfig` is created by the migration and self-healed by the resolver.
