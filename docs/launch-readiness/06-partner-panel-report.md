# Partner Panel Report

Deliverable 6. A deep report on the whole partner panel: every route, every server action, the permission model, and the end-to-end partner flow.

## Permission model

- **Partner identity is resolved from the session, never from a client-supplied id**, so a partner can only ever act on their own records (no IDOR). `getSessionPartner()` and `requirePartner()` (used by every mutating partner action) resolve the `Partner` from `session.user.id`. `getCurrentPartner()` additionally honors a super-admin read-only preview cookie for display only; it is never used for mutations.
- **Admin vs super-admin.** `requireAdminUser()` gates operational admin work. `requireSuperAdmin()` (the primary owner) gates content and community management and destructive operations. Super-admin is defined by `SUPER_ADMIN_EMAILS` (default includes mail@mehrdadnaderi.com).
- **Super-admin preview** of a partner's panel is read-only: the mutating actions ignore the preview cookie, so a previewing owner cannot act as the partner.

## Partner routes (`src/app/(partner)/partner/**`)

| Route | Purpose |
|---|---|
| `/partner` | Dashboard. |
| `/partner/onboarding` | Activation Gate checklist. |
| `/partner/academy` (+ `/[slug]`, `/[slug]/exam`, `/final-exam`, `/certificate`) | Partner Academy: lessons, exercises, module exams, final exam, certificate. |
| `/partner/deals` (+ `/[id]`) | Deal registrations; opportunity detail with the threaded conversation and edit/resubmit. |
| `/partner/accounts` (+ `/[id]`) | Registered accounts; account detail with the 7-stage pipeline and the activity log. |
| `/partner/special-deals` | Special-deal requests and their per-item decisions. |
| `/partner/toolkit` (+ `/[slug]`) | Partner Toolkit repository: read and download resources. |
| `/partner/discussions` (+ `/[id]`) | Experience Sharing board: submit, read, comment. |
| `/partner/support` | File a support report; see your own tickets. |
| `/partner/commissions` | Commission lines and statements. |
| `/partner/tenxops` | TenXOps engagement requests. |
| `/partner/notifications`, `/partner/profile` | Notifications; profile. |

## Admin routes (`src/app/(admin)/admin/partners/**` and `/admin/alumni`)

| Route | Gate |
|---|---|
| `/admin/partners` (+ `/[id]`) | admin: roster and the full per-partner console (lifecycle, config overrides, closed deals, commission lines with the engine rate preview, focus, quality flags). |
| `/admin/partners/applications` (+ `/[id]`) | admin: application review. |
| `/admin/partners/deal-registrations` | admin: confirm/decline, request revision, thread. |
| `/admin/partners/special-deals` | super-admin: per-item and whole-request decisions. |
| `/admin/partners/toolkit` (+ `/[id]`) | super-admin: author posts, upload files. |
| `/admin/partners/discussions` | super-admin: moderate, publish/edit, delete. |
| `/admin/partners/support` | admin: triage, resolve, reopen. |
| `/admin/partners/commissions`, `/admin/partners/config`, `/admin/partners/house-accounts`, `/admin/partners/audit`, `/admin/partners/academy` | admin: commissions export, program and per-partner config, house accounts, audit log, academy oversight. |
| `/admin/alumni` (+ `/[id]`) | super-admin: groups, memberships, events; opted-in participant lists. |

## Server actions and their guards

- **`partner-portal.ts`** (partner, `requirePartner`): setActivationItem, submitDealRegistration, requestTenXOpsEngagement, advanceAccountStage, logAccountActivity, postDealMessage, resubmitDealRegistration, submitSpecialDealRequest, flagCommissionQuery, updatePartnerProfile.
- **`partner-admin.ts`**: reviewPartnerApplication, confirmActivationGate, setPartnerTier, setPartnerStatus, setScorecardCheckpoint, confirmDealRegistration, declineDealRegistration, requestDealRevision, postDealMessageAdmin, updateProgramConfig, upsertPartnerConfigOverride, recordClosedDeal, recordSeats, updateSeatStatus, addCommissionLine, recomputeDealCommissions, setCommissionStatus, applyRefund, house-account and quality-flag actions, focus grant/end, TenXOps decision, profile admin, and partner delete/force-delete (`requireAdminUser`; delete uses `requireSuperAdmin`). `decideSpecialDealItem` and `decideSpecialDealRequest` use `requireSuperAdmin`.
- **`discussions.ts`**: submitDiscussionPost, postDiscussionComment (partner); moderateDiscussionPost, unpublishDiscussionPost, deleteDiscussionPost, deleteDiscussionComment (`requireSuperAdmin`).
- **`support.ts`**: submitSupportTicket (partner, also emails the owner); setSupportTicketStatus (`requireAdminUser`).
- **`alumni.ts`** (`requireSuperAdmin`): create/update/delete group, add/remove membership, create/delete event.
- **`toolkit.ts`** (`requireSuperAdmin`): saveToolkitPost, deleteToolkitPost, deleteToolkitFile. File download route is gated to any logged-in admin or partner.
- **`participant.ts`**: updateAlumniOptIn (participant, session-scoped).

## End-to-end partner flow

1. **Apply** on the public site; the owner reviews the application.
2. **Approval** creates the `Partner` on a pilot.
3. **Activation Gate**: the partner completes onboarding; the owner confirms it on the panel; the owner is notified when a partner is ready.
4. **Deal Registration**: the partner registers an opportunity before substantive contact. It is protected only on **Panel Confirmation**, which creates a **Registered Account**. The owner can instead request a revision (the partner edits and resubmits) or decline.
5. **Account pipeline**: the partner moves the account through the seven stages and logs activity; each meaningful update refreshes the account so its protection does not lapse (the lapse cadence is config-driven per tier).
6. **Closed Deal**: the owner records a closed deal on cleared, delivered receipts (Net Receipts, in the customer's currency).
7. **Commission**: the owner adds commission lines. The rate is **derived by the engine** from config by function and deal kind (B2C/B2B split, strong-origination seat gate of 40 paid seats for B2C), never typed. Every line **requires an evidence note**. Recompute clamps total compensation to the cap (25 percent B2C, 30 percent B2B, up to 35 percent for an eligible Tier 3 focus).
8. **Payout timing**: commission becomes payable only after both delivery and cleared payment, then within 30 business days of the later event. Refunds and chargebacks reverse the matching commission proportionally within the clawback window.
9. **Progression**: on collected results the partner can be confirmed to Tier 2 and Tier 3, and a Tier 3 partner can be granted an industry or region focus.

## Guardrails

Session-only partner resolution (no IDOR); commission integrity (engine-derived rates, required evidence, proportional and idempotent refunds, historical lines untouched); a full audit trail; a financial-safety restriction that a partner with commission history cannot be hard-deleted; and config-driven commercial terms with per-partner overrides, all audited.
