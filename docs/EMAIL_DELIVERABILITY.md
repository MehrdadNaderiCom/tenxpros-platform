# Email deliverability and anti-spam posture

Status: verified on 2026-06-29. Both sending domains are authenticated, and the
newsletter carries the standard anti-spam signals. No outstanding DNS work.

## Sending identities

| Purpose | From | SMTP host | Notes |
| --- | --- | --- | --- |
| Transactional (acceptance, payment, reminders) | hello@tenxpros.com / support@tenxpros.com | mail.tenxpros.com | EMAIL_PROVIDER=smtp, port 465 SSL |
| Newsletter (send only) | newsletter@tenxops.org | mail.tenxops.org | NEWSLETTER_SMTP_*; no reply expected |

Both mail hosts resolve to the same server (136.243.174.135), and both domains
publish the same style of records.

## DNS authentication (verified, no action needed)

Verify any time with:

```
dig +short TXT tenxpros.com | grep spf
dig +short TXT _dmarc.tenxpros.com
dig +short TXT default._domainkey.tenxpros.com
# repeat for tenxops.org
```

Current state (both tenxpros.com and tenxops.org):

- SPF: `v=spf1 +a +mx +a:s508.bertina.biz -all` (hard fail; the MX sends, so it is authorized).
- DKIM: selector `default` published, key present; the mail server signs outbound mail.
- DMARC: `v=DMARC1; p=quarantine; adkim=s; aspf=s` (quarantine policy, strict alignment).

Because we send from each domain through that domain's own MX with a `default`
DKIM signature, SPF passes, DKIM passes, and DMARC aligns strictly. This is the
strong configuration; nothing to add.

Note: tenxpros.ORG (a different TLD) has no records, but it is not used to send
email, so that is expected and irrelevant.

## In-code anti-spam measures (newsletter)

Implemented in `src/lib/services/newsletter-email.ts` and
`src/lib/email/newsletter-template.ts`:

- One-click unsubscribe: RFC 8058 `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, plus an in-body unsubscribe link. Unsubscribed people are always excluded from sends (`resolveRecipients` filters to status "subscribed").
- `List-Id` and `Precedence: bulk` headers so inbox providers categorize the mail correctly.
- Multipart: every message has both an HTML part and a plain-text alternative.
- Sender identity in the footer naming the operating company, plus an optional postal address (`NEWSLETTER_POSTAL_ADDRESS`) for CAN-SPAM and trust.
- Send-only from address; replies are not invited.
- Message-Id is generated on the sending domain, so it aligns with DKIM.

## One optional config item

Set a real postal address for the newsletter footer (recommended for CAN-SPAM and
inbox placement):

```
# in .env.production
NEWSLETTER_POSTAL_ADDRESS=Your Company, Street, City, Country
```

Then redeploy (`docker compose up -d --force-recreate --no-deps tenxpros-app`).
Without it, the footer still names the operating company.

## Operational guidance

- Warm up gradually if the volume grows quickly; large first-time blasts from a
  quiet domain can be throttled.
- Watch DMARC aggregate reports (the policy is quarantine) for any unexpected
  unauthenticated sources.
- Keep content balanced (text and links, avoid all-image emails and spammy
  phrasing). The rich-text editor produces clean semantic HTML.
- Always use the single-test send on the review screen before a bulk send.
