# Resend Setup Guide

TenXPros launch email is transactional only: application, admission, payment placeholder, enrollment, review, support, and certification messages.

## 1. Domain Authentication

1. Add the sending domain in Resend.
2. Add the DNS records Resend provides.
3. Wait for Resend to show the domain as verified.
4. Do not use a production sender until verification is complete.

## 2. SPF, DKIM, And DMARC

Before launch, confirm:

- SPF includes the provider records Resend requires.
- DKIM records are present and verified.
- DMARC exists for the domain.
- The sender domain aligns with the brand domain where possible.

## 3. EMAIL_FROM Guidance

Use a verified sender:

```bash
EMAIL_FROM="TenXPros <hello@tenxpros.com>"
```

Avoid personal addresses for production transactional email. Keep the display name stable so applicants and participants recognize TenXPros messages.

## 4. Environment Variables

Production:

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=replace-with-production-resend-key
EMAIL_FROM="TenXPros <hello@tenxpros.com>"
```

Local/dev may use:

```bash
EMAIL_PROVIDER=console
EMAIL_FROM="TenXPros <hello@tenxpros.test>"
```

## 5. How To Test Email Sending

1. Configure production-like env values in a staging or controlled production environment.
2. Submit a test application.
3. Accept the application as admin.
4. Confirm the accepted/payment-link email is delivered.
5. Mark payment received and enroll.
6. Confirm the welcome/password setup email is delivered.
7. Open the email log in admin and confirm statuses.

Do not run this test with real customer data before launch approval.

## 6. Before Launch

- [ ] Resend domain verified.
- [ ] SPF/DKIM/DMARC confirmed.
- [ ] `EMAIL_PROVIDER=resend`.
- [ ] `RESEND_API_KEY` configured in hosting secrets.
- [ ] `EMAIL_FROM` uses a verified domain.
- [ ] Test email delivered to at least one external inbox.
- [ ] Console/dev mode disabled in production.

## 7. If Email Remains In Console/Dev Mode

If `EMAIL_PROVIDER=console`, emails are not delivered to applicants or participants. That is acceptable for local acceptance only.

Before public launch:

1. Stop launch.
2. Configure Resend.
3. Rerun `npm run launch:env-check`.
4. Repeat the email test flow.
