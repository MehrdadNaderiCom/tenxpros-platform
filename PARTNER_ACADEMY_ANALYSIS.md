# Partner Academy: Phase 0 Analysis

Written before any feature code, per Section 2 of the build spec. Where the real
codebase contradicts the spec, the real codebase wins, and the deviation is noted.

## 1. Stack and tooling

- Framework: Next.js 14.2.35, App Router, React 18.3, TypeScript.
- Package manager: pnpm. App lives in `app/`; git root is `/opt/tenxpros`.
- Data layer: Prisma 5.22 on PostgreSQL. Client generated with `prisma generate`.
- Auth: NextAuth v5 (beta.31), JWT sessions, role on `session.user.role`.
- Styling: Tailwind 3.4 with custom tokens (navy, gold, indigo, slate, neutral). No CSS-in-JS.
- Validation: Zod 4 with react-hook-form 7 and `@hookform/resolvers`.
- Email: Resend 6 and nodemailer 7, selected by `EMAIL_PROVIDER` (smtp | resend | console).
- Tests: Vitest 4 (`pnpm test`, files in `app/tests/**/*.test.ts`, relative imports, no `@` alias) and Playwright (`pnpm test:e2e`).
- Build and gate: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- Deploy: Docker Compose. `docker compose build tenxpros-app` then `docker compose up -d --no-deps tenxpros-app`. The container runs `prisma migrate deploy` on boot. Host port 3003 behind Caddy at https://tenxpros.com.

## 2. Migration and seeding workflow

- Migrations are forward only, in dated folders under `app/prisma/migrations`. Latest are `20260628000000_partner_program_money_i18n` and `20260628120000_partner_application_documents`.
- The shared dev and prod database must never see `prisma migrate dev` or `migrate reset`. New migrations are generated offline with `prisma migrate diff --from-schema-datamodel <old> --to-schema-datamodel <new> --script`, placed in a new dated folder, and applied by the container on boot via `migrate deploy`.
- Seeding: `pnpm db:seed` runs `tsx prisma/seed.ts`. The Academy seed will be a separate, idempotent script invoked from there.

## 3. The partner area today

- Routes live under `app/src/app/(partner)/partner/`: `page.tsx` (dashboard), `deals`, `commissions`, `accounts`, `profile`, `onboarding`, `tenxops`, plus `layout.tsx`.
- Access control: `app/src/lib/partner/auth.ts`. `getCurrentPartner()` resolves the partner from the session (read), `getSessionPartner()` is strict session only, and `requirePartner()` guards every mutating partner action and throws if the caller is not an active partner. There is also a read only super-admin preview path that the Academy reads must respect (use `getCurrentPartner()` for display, `requirePartner()` for writes).
- The Academy is net new. There is no `partner/academy` route and no Academy Prisma models yet, so nothing is being overwritten.

## 4. Auth and roles

- NextAuth JWT. `session.user.role` is one of APPLICANT, PARTICIPANT, COACH, ADMIN, PARTNER.
- Middleware (`app/src/middleware.ts`) protects `/portal` (PARTICIPANT, COACH, ADMIN) and `/admin` (ADMIN). `/partner` is guarded by its layout calling `getCurrentPartner()`.
- Super admins are matched by email in `app/src/lib/authz.ts` (`superAdminEmails()`, default the two owner accounts). `requireSuperAdmin()` and `requireAdminUser()` gate admin actions.

## 5. Email infrastructure (newsletter reuses this, no second provider)

- `app/src/lib/services/email.ts`: `sendEmail(input)` and the non throwing `safeSendEmail(input)`. Provider chosen by `EMAIL_PROVIDER`. Default from address `EMAIL_FROM` or `TenXPros <hello@tenxpros.com>`.
- Every send records an `EmailEvent` row (to, subject, template, status sent or error). The newsletter sender will reuse `safeSendEmail` per recipient and inject a per recipient unsubscribe link. No new provider is added.
- Branded templates live in `app/src/lib/email/templates.ts` with a shared `layout()` helper. Campaign bodies will be wrapped in that layout so every campaign looks native.

## 6. Design system (the Academy must look native)

- Primitives: `Card`, `Button` and `ButtonLink`, `Badge` (status tokens), `Input` / `Select` / `Textarea` (form-fields), `Field` (form-field), `PageHeader` and `EmptyState` (page-shell), `cn()` (utils), and the new `dashboard-ui` bars and ring.
- Palette: navy (50, 100, 500, 600, 700, 900), gold (50, 100, 500, 800), plus default Tailwind emerald, amber, blue, slate, red, neutral, indigo. Note: navy only has those shades, gold only those four, so visuals must use defined shades.
- Money helpers: `formatCurrency` (`@/lib/utils`) for major-unit amounts, `formatMoney` and `entryPayoutMinor` (`@/lib/partner/currency`) for commission minor units, `formatBp` and the partner label maps (`@/lib/partner/constants`).
- Footer: `app/src/components/shared/footer.tsx`, with a partner-aware Terms link island already present.

## 7. i18n

- English only. No i18n framework installed. The Academy content is English, which matches the site default. No translation layer is added.

## 8. CONFIRM values: already sourced, not hardcoded

The spec marks commission percentages, tier thresholds, clawback windows, and contract durations as CONFIRM and requires a single source. That single source already exists: the `ProgramConfig` singleton (basis points and cents and days) resolved through `app/src/lib/partner/config-server.ts`, and the plain-language partner terms in `app/src/lib/partner/terms.ts`. So:

- Commission rates, caps, tier seat thresholds, focus and growth bonuses, pipeline protection and quiet-account windows, and confirmation windows: read from `ProgramConfig`. The Rules module lesson and the terms page render these from config, never hardcoded numbers.
- Non circumvention (24 months), non solicitation (12 months), and clawback window (120 days): currently expressed in `terms.ts`. These will be surfaced for owner confirmation in the verification report and, where they are numeric policy, moved into config if the owner wants them editable in one place.
- Academy specific CONFIRM values (passMark 80, examSize 10, examCooldownHours 24) are per-module columns on `AcademyModule` with the spec defaults, editable per module.
- Badge and rank display names are config driven (a small Academy config or seed constant) so they can be renamed in one place.

## 9. Gaps and risks

- No blocking gaps. Email infra, admin area, role system, partner panel, migration story, and design system all exist and are reused.
- Overlap to manage, not a gap: a public `/terms` page and a partner terms page (`/partners/terms`) and a partner-aware footer Terms link already exist. The spec's annual `TermsVersion` model and footer "Terms and rules updates" section will be layered onto these rather than duplicating them: the terms page becomes version driven, and the footer gains the quiet updates line linking to it.
- Newsletter on the homepage: the homepage is `app/src/app/(public)/page.tsx` rendering marketing instruments. The subscribe block will be placed in a position that fits that layout.
- Copy protection is a deterrent only, not security, and will never block assistive technology or the audio reader. Noted per spec.
- Payments stay manual and operator entered. The Academy and newsletter add no payment flow.

## 10. Build plan mapped to real files

Executed in safe, shippable, committed and deployed phases, top to bottom per Section 7:

1. Phase 0 analysis (this file).
2. Schema and additive migration for Academy, `TermsVersion`, and Newsletter, reusing `Partner` and `User`. New models cascade-delete from `Partner` so existing partner delete flows keep working. Files: `app/prisma/schema.prisma`, new migration folder.
3. Seed: `app/prisma/seed/academy.ts` (14 modules, lessons, 6 exercise and 12 exam questions each, with a duplicate-stem integrity check that fails the seed on violation), the current `TermsVersion`, and an empty newsletter group set. Invoked from `prisma/seed.ts`.
4. Academy partner experience under `app/src/app/(partner)/partner/academy/`: landing, module list with live status, lesson view with the SpeechSynthesis audio reader and copy-protection, three-attempt exercises, the one-sitting final exam (80 percent, cooldown, fresh draw on retake), progress, the badge, and a downloadable completion certificate. Engine logic in `app/src/lib/academy/*` (pure, unit tested) with server actions in `app/src/lib/actions/academy.ts`.
5. Annual terms: version-driven terms page from `TermsVersion`, survival-clause framing, and the footer updates section in `footer.tsx`.
6. Newsletter: homepage subscribe block, `/newsletter/unsubscribe` flow, and admin pages under `app/src/app/(admin)/admin/newsletter/` for subscribers, groups, and campaigns, sending through `safeSendEmail`.
7. Tests in `app/tests/` (assessment engine, seed integrity, newsletter dedup and recipient logic) plus the manual acceptance scenarios, and a sweep for em and en dashes.
8. Commit, push, deploy each phase, and write `PARTNER_ACADEMY_VERIFICATION.md`.

## 11. Hard rules carried through every phase

- No em dashes and no en dashes in any shipped file, seed, string, or comment. Swept before each commit.
- Human voice in everything a partner reads. Lesson content is seeded verbatim from the spec, formatted for the web, not reworded.
- No invented program facts and no fabricated commercial terms. Numbers come from `ProgramConfig`. Operational CONFIRM items the owner has not set are surfaced, never guessed.
- Additive migrations only. No destructive commands against the shared database.
