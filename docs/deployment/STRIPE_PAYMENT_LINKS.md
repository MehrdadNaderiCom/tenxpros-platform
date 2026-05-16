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

Recommended Stripe Product names:

- `TenXPros Founding Charter`
- `TenXPros Early Charter`
- `TenXPros Late Charter`
- `TenXPros Final Charter`
- `TenXPros Standard`

Recommended Stripe Price labels:

- `Founding Charter - USD 997`
- `Early Charter - USD 1247`
- `Late Charter - USD 1497`
- `Final Charter - USD 1747`
- `Standard - USD 1997`

## 3. Description And Metadata

Use descriptions that match the product scope:

```text
TenXPros 12-week certification program. Includes Living AI Solution Dossier work and certification review. Certification is not automatically guaranteed.
```

Suggested Payment Link page copy:

```text
Payment for accepted TenXPros applicants only. This payment activates program enrollment after manual admin confirmation. Certification depends on reviewed work and is not automatically guaranteed.
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

Keep this manual confirmation step for launch. It prevents accidental enrollment from an unpaid or disputed Payment Link session.

## 6. How To Test With A Real Accepted Applicant

Use a founder-controlled test applicant before public launch:

1. Submit `/apply` with a controlled test email.
2. Accept the application in admin.
3. Confirm the accepted email includes the tier’s Payment Link.
4. Open the Payment Link and confirm:
   - product name
   - price
   - description
   - currency
   - receipt behavior
5. Complete a real or Stripe-supported test payment only if the Stripe account mode and launch plan allow it.
6. Confirm the payment in Stripe.
7. In TenXPros admin, click `Mark payment received & enroll`.
8. Confirm the user role becomes `PARTICIPANT`.
9. Confirm the welcome/password setup email is delivered.

Do not use a real prospect for this first operational test.

## 7. Explicit Launch Scope

Do not implement Stripe Checkout or webhooks before the later planned phase.

For this launch, payment evidence is manual and enrollment is an admin action.
