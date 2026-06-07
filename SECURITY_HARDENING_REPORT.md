# Security Hardening Report

## 1. Summary of files changed

- `app/src/lib/authz.ts`: added shared server-side admin authorization helper.
- `app/src/lib/actions/applications.ts`: protected admin-only application status and enrollment mutations.
- `app/src/lib/actions/admin.ts`: protected exported badge issuance and reused the shared admin helper for admin mutations.
- `app/src/app/(participant)/portal/layout.tsx`: added defense-in-depth portal role check.
- `app/tests/security-hardening.test.ts`: added focused source-level regression tests for the authorization hardening.

## 2. Exact risks fixed

- Fixed direct server-action access to `updateApplicationStatus` by requiring an authenticated `ADMIN` before application lookup, transition validation, status mutation, audit logging, payment creation, or email side effects.
- Fixed direct server-action access to `markPaymentReceivedAndEnroll` by requiring an authenticated `ADMIN` before application lookup and before the atomic enrollment transaction.
- Fixed direct exported access to `issueBadge` by requiring an authenticated `ADMIN` before issuing or upserting a participant badge.
- Added a portal layout role check so portal rendering is not dependent only on middleware. Allowed roles are `PARTICIPANT`, `COACH`, and `ADMIN`; other roles are redirected to `/login`.

## 3. Authorization strategy used

- Added `requireAdminUser()` in `app/src/lib/authz.ts`.
- The helper calls `auth()`, requires a logged-in user with an id, requires `role === "ADMIN"`, returns normalized admin user data for action/audit use, and throws `Admin access required.` for unauthenticated or non-admin callers.
- The helper does not redirect, so low-level mutation helpers fail closed when called directly.
- `issueBadge` is now an authenticated exported wrapper around a private `issueBadgeForAdmin` implementation. Existing admin flows call the private implementation only after their own admin authorization path has run.

## 4. Audit-log changes

- `updateApplicationStatus` now records `actorId: admin.id` and keeps `actorRole` accurate via `admin.role`.
- `markPaymentReceivedAndEnroll` now records `actorId: admin.id` and keeps `actorRole` accurate via `admin.role`.
- Existing audit actions, entities, entity ids, status change payloads, and metadata were preserved.

## 5. Tests added/updated

- Added `app/tests/security-hardening.test.ts`.
- Assertions cover:
  - `updateApplicationStatus` calls the shared admin authorization helper and records admin actor fields.
  - `markPaymentReceivedAndEnroll` calls the shared admin authorization helper and records admin actor fields.
  - exported `issueBadge` requires admin authorization before badge issuance.
  - portal layout includes the allowed-role defense-in-depth check for `PARTICIPANT`, `COACH`, and `ADMIN`.

## 6. Commands run and results

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 5 test files and 16 tests.
- `pnpm build`: passed.

Note: the requested `TENXPROS_EN_REBUILD_BASELINE.md` file was not present anywhere under `/opt/tenxpros`, so it could not be read. The named source files and tests were reviewed directly.

## 7. Remaining security risks not fixed in this patch

- This patch did not perform a full audit of every server action, route handler, or data read path.
- This patch did not add runtime auth integration tests because that would require broader NextAuth/Prisma mocking; source-level regression tests were used to keep the change narrow.
- CSRF/origin controls, rate limiting, session lifetime policy, and broader audit-log coverage were not changed.
- Public Directory/Radar behavior, module progression, public pages, marketing copy, and application fields were intentionally left unchanged.
