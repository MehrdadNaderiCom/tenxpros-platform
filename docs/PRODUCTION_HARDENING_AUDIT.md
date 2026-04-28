# Production Hardening Audit — M0.3 (2026-04-28)

State of the live deploy *immediately before* the M0.3 hardening pass.

## 1. Current exposed demo users

The seed creates four well-known demo users with documented passwords:

| Email | Role | Documented password |
|-------|------|---------------------|
| `admin@tenxpros.test` | ADMIN | `tenxpros-admin-demo` |
| `reviewer@tenxpros.test` | REVIEWER | `tenxpros-reviewer-demo` |
| `demo.pro@tenxpros.test` | PROFESSIONAL | `tenxpros-pro-demo` |
| `demo.org@tenxpros.test` | EMPLOYER | `tenxpros-org-demo` |

All four exist in the live database and accept their seeded passwords
through `/sign-in`.

## 2. Are demo credentials documented?

**Yes — in `docs/README.md`** (the public docs index), in
[CHANGELOG.md](CHANGELOG.md) commit notes, and in the seed file output.
The seed actively prints the four passwords to stdout each run.

## 3. Does an admin demo account exist?

**Yes** — `admin@tenxpros.test` / `tenxpros-admin-demo` works on
`https://tenxpros.com/sign-in` right now and grants full admin access
to `/admin/*`.

## 4. Is `SESSION_SECRET` the placeholder?

**Yes.** `docker-compose.yml` ships:

```
SESSION_SECRET: please-generate-a-real-secret-at-least-32-characters
```

The auth lib in [`session.ts`](../app/src/lib/auth/session.ts) accepts
any secret of length ≥ 16, so the app boots — but every cookie
session is signed with a known string. Anyone who reads this file (or
the public repo) can forge a session.

## 5. Is `APP_URL` localhost?

**Yes.** `docker-compose.yml` sets `APP_URL=http://localhost:3003`.
Side effects:

- `app/src/app/sign-out/route.ts` redirects to `localhost:3000` after
  sign-out (visible to public users).
- `app/src/app/(admin)/admin/settings/page.tsx` displays
  `localhost:3000` to admins.
- Open Graph `metadataBase` falls back to `https://tenxpros.com` if
  `APP_URL` is unset — but it *is* set, to localhost — so social
  previews resolve relative URLs against the wrong base.

## 6. Production domain health

`https://tenxpros.com/api/health` → `{"status":"ok","db":"ok",…}` ✓
`http://tenxpros.com` → 308 to HTTPS via Caddy ✓
`https://tenxpros.com/` → 200 OK, Next.js HTML ✓

The deploy itself works; the *configuration* is what needs hardening.

## 7. Immediate risks

| # | Risk | Severity |
|---|------|:--------:|
| 1 | `admin@tenxpros.test / tenxpros-admin-demo` opens admin panel on the public domain | **Critical** |
| 2 | `SESSION_SECRET` is a publicly known placeholder — anyone can forge any user's cookie | **Critical** |
| 3 | Sign-out redirect points users at `localhost:3000` after they log out | High (UX + leak of internal URL) |
| 4 | Other three demo accounts are also publicly usable, including `demo.org@tenxpros.test` (verified employer) | High |
| 5 | Seed prints all demo passwords to stdout on every run, even in production | Medium |
| 6 | Demo Professional `demo.pro@tenxpros.test` is `visibility=PUBLIC` so `/pros/demo-professional` is indexable | Low |
| 7 | No admin user exists *outside* the demo set | Medium (operational) |

## 8. Changes made in this pass

See [IMPLEMENTATION_REPORT.md M0.3](IMPLEMENTATION_REPORT.md#m03--production-hardening--launch-sanity-2026-04-28).

Summary:

- New `/opt/tenxpros/.env.production` (chmod 600, gitignored) holds:
  - rotated `SESSION_SECRET` (64 hex chars from `openssl rand -hex 32`)
  - `APP_URL=https://tenxpros.com`
  - `ALLOW_DEMO_USERS=false`
  - `ADMIN_EMAIL` + `ADMIN_PASSWORD` for the secure prod admin
- `docker-compose.yml` rewritten to use `env_file: ./.env.production`;
  no real secrets remain in the tracked file.
- `app/prisma/seed.ts` gated:
  - reads `ALLOW_DEMO_USERS` (default `false`).
  - When false: skips creating demo users, **scrambles passwords on
    any pre-existing demo users so they can no longer log in**, skips
    the demo certificate creation, and stops printing demo passwords
    to stdout.
  - When `ADMIN_EMAIL` + `ADMIN_PASSWORD` are set: upserts a secure
    `ADMIN` user regardless of demo mode.
- `app/.env.example` documents `ALLOW_DEMO_USERS`, `ADMIN_EMAIL`,
  `ADMIN_PASSWORD`.
- A new root `.gitignore` keeps `.env.production` and other env files
  out of the repo.
