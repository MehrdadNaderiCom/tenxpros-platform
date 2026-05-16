# Stripe Payment Links Guide

TenXPros launch uses manual Stripe Payment Links. Full Stripe Checkout and webhook automation are intentionally out of scope for the current launch.

## 1. Required Charter Tier Links

| Tier | Members | Price | Env var |
| --- | ---: | ---: | --- |
| Founding Charter | 1-10 | $997 | `STRIPE_PAYMENT_LINK_FOUNDING` |
| Early Charter | 11-20 | $1,247 | `STRIPE_PAYMENT_LINK_EARLY` |
| Late Charter | 21-30 | $1,497 | `STRIPE_PAYMENT_LINK_LATE` |
| Final Charter | 31-40 | $1,747 | `STRIPE_PAYMENT_LINK_FINAL` |
| Standard | 41-99 | $1,997 | `STRIPE_PAYMENT_LINK_STANDARD` |

## 2. Suggested Payment Link Names

- `TenXPros - Founding Charter - $997`
- `TenXPros - Early Charter - $1,247`
- `TenXPros - Late Charter - $1,497`
- `TenXPros - Final Charter - $1,747`
- `TenXPros - Standard - $1,997`

## 3. Description And Metadata

Use descriptions that match the product scope:

```text
TenXPros 12-week certification program. Includes Living AI Solution Dossier work and certification review. Certification is not automatically guaranteed.
```

Suggested metadata if Stripe Payment Links allow it:

- `product=tenxpros`
- `tier=FOUNDING`, `EARLY`, `LATE`, `FINAL`, or `STANDARD`
- `launch_scope=manual_payment_link`

Do not include sensitive applicant information in static payment link metadata.

## 4. Where To Place Env Vars

Set the five `STRIPE_PAYMENT_LINK_*` values in the production hosting provider.

Do not commit real payment links into the repository.

Local placeholders may exist only in local env files used for acceptance testing.

## 5. Manual Enrollment Workflow

1. Visitor submits `/apply`.
2. Admin reviews application.
3. Admin accepts application.
4. Accepted-applicant email includes the relevant manual Stripe Payment Link.
5. Applicant pays through Stripe.
6. Founder/admin confirms payment in Stripe.
7. Admin marks payment received in TenXPros.
8. User is enrolled as `PARTICIPANT`.
9. Participant receives welcome/password setup flow.

## 6. Explicit Launch Scope

Do not implement Stripe Checkout or webhooks before the later planned phase.

For this launch, payment evidence is manual and enrollment is an admin action.
