# Local lifecycle E2E

The browser test uses only the dedicated local PostgreSQL database
`tenxpros_ir_test` on `127.0.0.1:55432`. Both the Playwright configuration and
the test helper reject any other host, port, database name, or database user.

Prepare the migrated test database and Chromium once:

```bash
export E2E_DATABASE_URL='postgresql://tenxpros_ir_test:local-test-only-password@127.0.0.1:55432/tenxpros_ir_test?schema=public'
DATABASE_URL="$E2E_DATABASE_URL" pnpm exec prisma migrate deploy
pnpm exec playwright install chromium
```

Run the complete applicant-to-member lifecycle:

```bash
export E2E_DATABASE_URL='postgresql://tenxpros_ir_test:local-test-only-password@127.0.0.1:55432/tenxpros_ir_test?schema=public'
pnpm test:e2e --project=chromium-desktop
```

Playwright starts the application on `http://127.0.0.1:3190` with mock Zoom,
log-only email, and isolated private receipt storage. It removes the generated
applicant, receipt, Coaching inquiry, AI Roundtable, registration, booking, and
availability records after the run. The lifecycle also verifies that Coaching
is exactly 60 minutes at 5,000,000 toman, that the administrator can schedule it
in Tehran time, and that a published 90-minute Roundtable exposes its mock Zoom
link only after the active member registers. The reserved test administrator
remains in the dedicated test database and its sessions are removed.

The Office Hour segment creates real Tehran wall-clock availability through the
admin UI. Run it while the current Iran week still has two consecutive future
30-minute slots, rather than at the very end of Friday night.
