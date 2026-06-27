# Partner Program — Phase 0 Repository Audit

_Date: 2026-06-27 · Author: autonomous engineering pass · Scope: TenXPros repo behind tenxpros.com_

This audit precedes any feature code. It records exactly how the existing
codebase is built so the Partner Program extends it rather than fighting it.

---

## 1. Stack and tooling

| Concern | Finding |
|---|---|
| Framework | **Next.js 14.2.35**, **App Router** (`src/app`), route groups `(public)`, `(admin)`, `(participant)`, `(auth)`, `(verify)`. `output: "standalone"`, `reactStrictMode`, server actions enabled (`bodySizeLimit: 8mb`). |
| UI runtime | **React 18.3.1** |
| Language | **TypeScript 5.6.3**, `strict: true`, `moduleResolution: bundler`, path alias `@/* → ./src/*`. `tsconfig.include` covers `src/**`, `prisma/**`, `tests/**`. |
| Package manager | **pnpm 9.15.9** (Corepack-pinned; `pnpm-lock.yaml` present). |
| Node | **>=20** (running v20.19.0). |
| Scripts | `dev` (port 3000), `build`, `start` (`-H 0.0.0.0 -p 3000`), `lint` (`next lint`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:e2e` (Playwright), `db:migrate`/`db:deploy`/`db:seed`/`db:generate`/`db:studio`. |

The Next.js app is at **`/opt/tenxpros/app`** (repo root is `/opt/tenxpros`; `docs/`, `docker-compose.yml`, `.env.production` live at root).

## 2. Database and ORM

- **PostgreSQL** via **Prisma 5.22.0** (`@prisma/client`, `prisma`).
- Schema: single file `app/prisma/schema.prisma` (~1700 lines). IDs are `cuid()`. Timestamps `createdAt`/`updatedAt` everywhere. No soft-delete convention (hard deletes used, e.g. `deleteApplication`).
- **Migrations are used** (`prisma/migrations/`, 11 applied, `migration_lock.toml` → postgresql). `db:migrate` = `prisma migrate dev`, `db:deploy` = `prisma migrate deploy`.
- `DATABASE_URL` from env. Dev `.env` → `postgresql://tenxpros:***@localhost:5433/tenxpros`. Prod `.env.production` → `postgresql://tenxpros:***@db:5432/tenxpros`.
- **⚠️ Dev and prod share ONE Postgres container** (`tenxpros-db`): host `localhost:5433` (dev) and `db:5432` (inside the compose network, prod) are the same database. `prisma migrate status` reports the schema up to date with all 11 migrations. **Implication:** never run `migrate dev`/`migrate reset` (shadow DB + potential reset) against this shared DB. Author migrations forward-only with `prisma migrate diff` and apply with `prisma migrate deploy`.
- Seeding: `app/prisma/seed.ts` (run via `tsx`), **refuses to run when `NODE_ENV=production`**. Uses idempotent `upsert`s from `src/lib/program-data.ts`.

## 3. Auth and roles

- **Auth.js / NextAuth v5 (5.0.0-beta.31)** with `@auth/prisma-adapter`, **Credentials provider** (email + bcrypt `passwordHash`), **JWT session strategy**. Config in `src/lib/auth.ts`. Sign-in page `/login`.
- Session shape augmented in `src/types/next-auth.d.ts`: `session.user.{id, role}` where `role` is the Prisma `UserRole`. `role` is carried on the JWT.
- `UserRole` enum (Prisma): **`APPLICANT | PARTICIPANT | COACH | ADMIN`**. There is **no `SUPER_ADMIN` role**; the "super admin" is identified by **email match** against `SUPER_ADMIN_EMAIL` (default `mail@mehrdadnaderi.com`).
- Authz helpers in `src/lib/authz.ts`:
  - `requireAdminUser()` → throws unless `session.user.role === "ADMIN"`.
  - `requireSuperAdmin()` → admin **and** `isSuperAdmin(email)`.
  - `isSuperAdmin(email)`, `superAdminEmail()`.
- **Route protection pattern:** the route-group `layout.tsx` does the gate. `(admin)/admin/layout.tsx` → `redirect("/login")` if no session, `notFound()` if not ADMIN. Marketing (super-admin-only) gates inside `(admin)/admin/marketing/layout.tsx` with `notFound()`. Participant portal gates in `(participant)/portal/layout.tsx`. **Every server action re-checks** with `requireAdminUser()` (defense in depth, not UI-only).

## 4. Existing admin panel

- Lives at `src/app/(admin)/admin/*`. Existing sections: `applications`, `participants`, `tickets`, `diagnostics`, `paths`, `modules`, `dossiers`, `certifications`, `badges`, `directory`, `pricing`, `payments`, `analytics`, `reports`, `users`, `email`, `audit`, `settings`, `marketing` (super-admin only).
- **Left sidebar**: `src/components/shared/admin-nav.tsx` (server component) defines a `sections: NavSection[]` array (`Overview / People / Learning / Credentials / Revenue / Insights / System`), plus a `marketingSection` shown only when `isSuperAdmin(email)`. Rendered by the client island `admin-nav-client.tsx` (search + collapse + active highlight). **To add a section:** append a `NavSection` to the array (and conditionally splice it for super-admin if desired) — this is the exact, low-risk extension point.
- Page convention: list page `page.tsx` + detail `[id]/page.tsx`; server components reading Prisma directly + forms posting to server actions. Example: `applications/page.tsx`, `applications/[id]/page.tsx`, `applications/[id]/resume/route.ts` (a route handler for binary).

## 5. Existing public site / homepage

- `src/app/(public)/layout.tsx` wraps pages with `<PublicNav/>` + `<Footer/>`.
- Header nav: `src/components/shared/public-nav.tsx` (client) — `navItems` array + a primary CTA `ButtonLink href="/apply"`. Mobile full-screen menu mirrors the same items. **Add a "Become a Partner" entry here** (nav + mobile menu) and a CTA.
- Homepage: `src/app/(public)/page.tsx` renders `src/components/marketing/home-instrument.tsx`. Footer link list in `src/components/shared/footer.tsx`.
- Existing public apply flow: `/apply` → `src/app/(public)/apply/page.tsx` + `src/components/marketing/application-form.tsx` (react-hook-form client form) → server action `submitApplication` (`src/lib/actions/applications.ts`) → `/apply/thank-you`. This is the closest analog to the partner application.

## 6. UI system

- **Tailwind 3.4.14** with a custom palette (`navy`, `gold`, `indigo`, `neutral`/`slate`). `tailwind.config.ts` + `postcss.config.mjs`. Class merge via `cn()` (`clsx` + `tailwind-merge`) in `src/lib/utils.ts`.
- Primitives in `src/components/ui/`: `Button`/`ButtonLink` (variants `primary|secondary|ghost|danger`, sizes `sm|md|lg`, auto pending spinner via `useFormStatus`), `Card`, `Badge` (status→style map), `Input`/`Textarea`/`Select` + simple `Field` (`form-fields.tsx`), rich accessible `Field`/`InfoTip` (`form-field.tsx`), `hint-field.tsx`.
- **Form library:** `react-hook-form` 7 + `@hookform/resolvers` + **Zod v4** (validation schemas in `src/lib/validations/*.ts`, shared client/server). Forms commonly post `FormData` to a server action that re-parses with the same Zod schema.
- Icons: `lucide-react`. Toasts: none (inline `{ ok, message }` results rendered in-form; status `Badge`s).
- `formatCurrency(amount, currency)` formats an **integer as whole units** (`maximumFractionDigits: 0`) → the legacy money convention is **whole-dollar Int** (`PaymentRecord.amount`, `PricingTier.price`).

## 7. Conventions

- **Server actions** (`"use server"`) in `src/lib/actions/*.ts`. Public actions take `FormData`, parse with a Zod schema, return `{ ok: boolean, message?, id? }`. Admin actions call `requireAdminUser()` first and **throw** on error. After mutating, write an `AuditLog` row and call `safeRevalidatePath(...)` (wrapper that swallows the "static generation store missing" error).
- **Audit:** `prisma.auditLog.create({ data: { actorId, actorRole, action, entity, entityId, changes: { before, after }, metadata } })`. The `AuditLog` model already exists with indexes — **reuse it** for Panel Confirmations and config changes.
- **Analytics:** `prisma.siteEvent.create({ ... })` with string `eventType` constants (`src/lib/analytics/events.ts`).
- **Email:** `safeSendEmail({ to, subject, template, text, html })` (`src/lib/services/email.ts`, never throws, records `EmailEvent`). Templates are pure builders in `src/lib/email/templates.ts` returning `{ subject, text, html }`. Provider via `EMAIL_PROVIDER` (`console` in dev, `smtp` in prod).
- **State machines:** transition maps + `assertXTransition` (e.g. `src/lib/services/status.ts`, `src/lib/payment-terms.ts`). Pure, unit-tested.
- **Resolver/precedence pattern** already exists: `resolvePaymentTerms({ record, tier })` (record override → tier default) — the exact shape the Partner config resolver should mirror.
- **Config store:** `AdminSetting` key/value table exists, but is unsuitable for ~40 typed numeric config fields × per-partner overrides → dedicated `ProgramConfig`/`PartnerConfig` tables are the right call.
- Lint: `eslint-config-next` (`.eslintrc.json`). No Prettier config; match existing 2-space style.

## 8. Testing

- **Unit:** **Vitest 4**. Config `vitest.config.ts` → `include: ["tests/**/*.test.ts"]`, excludes `tests/e2e/**`. Tests live in **`app/tests/*.test.ts`** and import from `../src/...`. Existing examples: `payment-terms.test.ts`, `status-transitions.test.ts`, `pricing.test.ts`, `application-validation.test.ts`, `security-hardening.test.ts` (asserts source-level invariants). Pure-function, no DB.
- **E2E:** **Playwright** (`playwright.config.ts`), specs in `tests/e2e/*.spec.ts` (`core-smoke.spec.ts`, `full-lifecycle.spec.ts`). Requires a running app.
- QA verify scripts in `app/scripts/*-qa-verify.mjs`.

## 9. Deployment

- **Self-hosted Docker Compose** (`/opt/tenxpros/docker-compose.yml`): `db` (postgres:16-alpine, host `:5433`) + `tenxpros-app` (built from `./app/Dockerfile`, host **`:3003`** → container `:3000`, `env_file: ./.env.production`).
- Caddy (per project memory + running `tenxops-caddy-1`) terminates TLS and proxies `tenxpros.com` → host `:3003`. Production URL: **https://tenxpros.com**.
- **Migrations run on container start:** `CMD ["sh","-c","pnpm prisma migrate deploy && pnpm start"]`. So a deploy = rebuild image + recreate the `tenxpros-app` service; the new migration auto-applies (forward-only).
- Branch model: `main` is the default/PR branch; **current branch `deployment/production-deployment-sprint-a`** is what the live container is built from. Other unrelated apps share the host (`tenxops-*`, `tenxrole-*`, `mn-ai-exam-*`) — **must not be touched**; only `tenxpros-app` (and its shared `tenxpros-db`) are in scope.
- Health: `GET /api/health`.

## 10. Anything already partner-related

- **None.** Zero `partner`/`affiliate`/`commission`/`referral` code identifiers (only the English word "partner" appears in marketing prose). No `/partner` route, no partner schema. The Partner Program is a clean, additive extension. ("Radar" = a Job-Radar marketing page, unrelated.)

---

## Key constraints carried into Phase 1

1. **Forward-only migrations** against the shared dev/prod Postgres: author with `prisma migrate diff`, apply with `prisma migrate deploy`. Additive only (new tables/enums + idempotent singleton insert). Never reset.
2. **Match conventions exactly:** App Router route groups; server actions + Zod; `requireAdminUser`/`requireSuperAdmin`; `AuditLog`; `safeSendEmail`; `cn` + existing UI primitives; whole-dollar legacy money but **integer cents + basis points for the new commission math** (precision, no floats) — documented and isolated to the new module.
3. **RBAC:** new `PARTNER` role (additive enum); partner portal gated to `role === PARTNER` + linked approved `Partner`; admin section gated to `ADMIN`; every server action re-checks server-side; guard against IDOR (partner sees only own rows).
4. **Deploy** = green build → rebuild only `tenxpros-app` → `migrate deploy` auto-runs → verify https://tenxpros.com. Do not disturb sibling containers.
