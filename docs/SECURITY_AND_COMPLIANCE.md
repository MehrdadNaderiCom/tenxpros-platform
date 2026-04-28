# Security and Compliance

## Authentication

- In-tree HMAC-signed cookie sessions implemented in
  [`src/lib/auth/session.ts`](../app/src/lib/auth/session.ts).
- Cookie name: `tenxpros_session`. Max age 30 days. `HttpOnly`,
  `SameSite=Lax`, `Secure` in production.
- Secret read from `SESSION_SECRET` env. Required to be ≥ 32 chars in
  production; the lib raises if it's the placeholder.
- Passwords hashed via `bcryptjs` (10 rounds) in
  [`src/lib/auth/password.ts`](../app/src/lib/auth/password.ts).
- The auth surface is intentionally small — sign-in, sign-up, sign-out
  — so it can be swapped for NextAuth or Clerk later without changing
  consumers.

## Authorisation

Every authenticated route resolves the user via `getCurrentUser()` and
checks the role in the route's layout (or in the action). The current
roles are `PROFESSIONAL`, `EMPLOYER`, `ADMIN`, `REVIEWER`, `INSTRUCTOR`.

| Route group | Required role |
|-------------|---------------|
| `(app)` | `PROFESSIONAL` (or higher with a professional profile) |
| `(admin)` | `ADMIN` or `REVIEWER` |
| `(employer)` | `EMPLOYER` |

## Input validation

All form-action and contact submissions are validated through Zod
schemas in [`src/lib/validation.ts`](../app/src/lib/validation.ts).
Server actions never trust raw form data.

## Secrets

All real production secrets live in `/opt/tenxpros/.env.production`
(chmod 600, owned by `ubuntu`, gitignored at the repo root). The
compose file references it via `env_file: ./.env.production` and
contains no secrets itself.

| Secret | Source | Rotation |
|--------|--------|----------|
| `SESSION_SECRET` | `openssl rand -hex 32` | annually, or after any suspected leak |
| `ADMIN_PASSWORD` | random ≥ 12 chars | annually, or whenever ownership changes |
| `DATABASE_URL` | service-local Postgres password | annually |
| `OPENROUTER_API_KEY` (if used) | OpenRouter dashboard | per OpenRouter policy |

**Rotation procedure for `SESSION_SECRET`:**

1. `openssl rand -hex 32 > /tmp/new-secret` (then `chmod 600`).
2. Edit `/opt/tenxpros/.env.production`, replace `SESSION_SECRET=…`.
3. `docker compose up -d --force-recreate tenxpros-app`.
4. All existing sessions invalidate; users re-sign-in. Acceptable cost.

`.env` is git-ignored; `.env.example` is checked in with placeholder
values.

## Demo / admin user policy

The seed has two modes, chosen by `ALLOW_DEMO_USERS`:

- **`true` (local dev):** four demo users are created with documented
  passwords (see `app/.env.example`). The seed prints those passwords
  to stdout. Convenient; **never use on a public domain**.
- **`false` (production):** demo users are not created. Any
  pre-existing demo users (e.g. left over from an earlier dev seed)
  have their bcrypt password hashes scrambled to an unguessable
  `bcrypt(locked-<random hex>)` value, so the well-known development
  credentials cannot be reused. The rows themselves are kept so
  foreign keys (e.g. the demo certificate) remain intact.

Independent of `ALLOW_DEMO_USERS`, the seed always upserts a secure
production admin if both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set.
This is how the prod admin gets provisioned.

To verify the demo passwords are dead in a deployed instance:

```bash
docker compose exec -T tenxpros-app node -e '
  const { PrismaClient } = require("@prisma/client");
  const bcrypt = require("bcryptjs");
  const p = new PrismaClient();
  (async () => {
    for (const e of ["admin@tenxpros.test","reviewer@tenxpros.test","demo.pro@tenxpros.test","demo.org@tenxpros.test"]) {
      const u = await p.user.findUnique({ where: { email: e } });
      if (!u) continue;
      const known = ["tenxpros-admin-demo","tenxpros-reviewer-demo","tenxpros-pro-demo","tenxpros-org-demo"];
      const ok = (await Promise.all(known.map(k => bcrypt.compare(k, u.passwordHash)))).some(Boolean);
      console.log(e, "demo-password-still-works:", ok);
    }
    await p.$disconnect();
  })();
'
```

All five rows should print `false`.

## Data residency

`DEFAULT_REGION=eu-west` is the convention for the platform's local
infra. Documents this fact for admins; does not currently enforce it.

## AI use policy

Documented at `/about#ai-policy` and applied in code:

1. Every AI output is **stored** with prompt version, provider, model.
2. Every AI output is **marked AI-generated** in the schema and in the
   UI where it surfaces.
3. AI output is **editable** by the user (e.g. diagnostic report) or
   admin (e.g. candidate summary) before it becomes public.
4. AI output is **never used as the only basis for hiring decisions** —
   reviewers and admins always sit between AI and a publicly visible
   decision.
5. The mock provider must always work — the system degrades gracefully
   when no provider key is configured.

## Privacy

- Professional visibility is opt-in: profiles default to `PRIVATE`.
- The `pros/[slug]` route filters by `visibility ∈ {EMPLOYER_VISIBLE,
  PUBLIC}`. Employer browse only sees those plus an `ISSUED` certificate.
- Even when employer-visible, contact details are gated until the
  candidate consents to introduction.
- The footer disclaimer reminds visitors of the certification scope:
  "TenXPros certificates verify completion and evidence review within
  the TenXPros framework. They do not represent external accreditation
  unless explicitly stated."

## Audit logging

`AuditLog` records sign-ups, certificate state changes, employer
request transitions, evidence reviews and issuance/revocation
decisions. The actor's user id, action, target entity and a JSON
`meta` blob are recorded.

## Threat model (informal)

| Threat | Mitigation |
|--------|------------|
| Stolen session cookie | HMAC + secret rotation; `Secure`/`HttpOnly`/`SameSite` |
| SQL injection | Prisma parameterised queries everywhere |
| XSS in lesson body / evidence description | Output is rendered as text; markdown rendering planned with sanitiser |
| Mass-scraping employer browse | Rate limit on `/employer/browse` (planned) |
| Employer impersonation | Org `verified` flag; admin verification before requests are honoured |
| Hallucinated AI claim becomes a hire/reject decision | Reviewer-in-the-loop for every decision; AI outputs marked & editable |
| Leaked AI provider key | `.env` git-ignored; provider abstraction so keys live only in env |

## Compliance roadmap

- DPA / GDPR notice page on the marketing site.
- A documented data-deletion flow on `/settings`.
- A policy gate on `OrganizationProfile.verified` before requests are
  honoured (already in place; admin-controlled).
