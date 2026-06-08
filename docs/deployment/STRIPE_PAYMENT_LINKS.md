# Payment Links Guide (provider-agnostic)

> Filename is kept for history; this guide is **not Stripe-only**. A payment link
> is just a URL, so it can point at **Wise**, a **manual checkout/instructions
> page**, or **Stripe**. Full Stripe Checkout and webhook automation remain out
> of scope for the current launch; enrollment is a manual admin action.

## 1. Charter tier links and env vars

Set one URL per tier. The app resolves the **generic** key first, then falls back
to the **legacy Stripe-named** key, then to the FOUNDING link, then to a safe
placeholder (`Manual payment link pending`). See `app/src/lib/services/payment-link.ts`.

| Tier | Price (USD) | Preferred env var | Legacy env var (still works) |
| --- | ---: | --- | --- |
| Founding Charter | 997 | `PAYMENT_LINK_FOUNDING` | `STRIPE_PAYMENT_LINK_FOUNDING` |
| Early Charter | 1,247 | `PAYMENT_LINK_EARLY` | `STRIPE_PAYMENT_LINK_EARLY` |
| Late Charter | 1,497 | `PAYMENT_LINK_LATE` | `STRIPE_PAYMENT_LINK_LATE` |
| Final Charter | 1,747 | `PAYMENT_LINK_FINAL` | `STRIPE_PAYMENT_LINK_FINAL` |
| Standard | 2,497 | `PAYMENT_LINK_STANDARD` | `STRIPE_PAYMENT_LINK_STANDARD` |

For the founding window you only strictly need `PAYMENT_LINK_FOUNDING` (or the
legacy `STRIPE_PAYMENT_LINK_FOUNDING`). A Wise link or a manual instructions page
URL is valid here — the value is treated as an opaque URL.

## 2. Provider options

- **Wise / manual:** create a hosted payment request or a simple instructions page
  and paste its URL into `PAYMENT_LINK_FOUNDING`.
- **Stripe (manual Payment Link):** create a Payment Link product/price and paste
  its URL into `PAYMENT_LINK_FOUNDING` (or the legacy key). No webhooks needed.

Suggested page copy (any provider):

```text
Payment for accepted TenXPros applicants only. This payment activates program
enrollment after manual admin confirmation. Certification depends on reviewed
work and is not automatically guaranteed.
```

## 3. Where to set the values

Set the values in the production hosting provider's environment (the server's
`.env.production`). **Do not commit real payment links into the repository.**
Local placeholders may exist only in local env files used for acceptance testing.

## 4. Manual enrollment workflow (provider-neutral)

1. Visitor submits `/apply`.
2. Admin reviews the application (reply target: within 48 hours).
3. Admin accepts the application.
4. The accepted-applicant email includes the relevant payment link
   (or `Manual payment link pending` if none is configured yet).
5. Applicant pays through the chosen provider.
6. Founder/admin confirms the payment with the provider.
7. Admin clicks **Mark payment received & enroll** in TenXPros admin.
8. The user is enrolled as `PARTICIPANT`.
9. The participant receives the welcome / password-setup flow.

Keep the manual confirmation step for launch. It prevents accidental enrollment
from an unpaid or disputed payment session, and it is provider-independent.

## 5. How to test with a founder-controlled applicant

Use a founder-controlled test applicant before public launch (never a real prospect):

1. Submit `/apply` with a controlled test email.
2. Accept the application in admin.
3. Confirm the accepted email includes the tier's payment link.
4. Open the link and confirm the amount, description, currency, and receipt behavior.
5. Complete a test/real payment only if the provider account and launch plan allow it.
6. Confirm the payment with the provider.
7. In admin, click **Mark payment received & enroll**.
8. Confirm the user role becomes `PARTICIPANT` and the password-setup email is delivered.

## 6. Launch scope

Do not implement Stripe Checkout or webhooks before the later planned phase.
For this launch, payment evidence is manual and enrollment is an admin action,
regardless of which provider issues the link.
