#!/usr/bin/env node
/**
 * bootstrap-admin.mjs — one-time, idempotent founder-admin bootstrap.
 * -----------------------------------------------------------------------------
 * Creates (or updates) a single ADMIN user from ENVIRONMENT variables.
 *
 *   - The password is NEVER hard-coded; it is read from ADMIN_PASSWORD.
 *   - The password is NEVER printed; the email is masked in the success line.
 *   - Safe to re-run (upsert). Does not touch any other data.
 *   - Unlike prisma/seed.ts, this does NOT seed demo data and is allowed to run
 *     with NODE_ENV=production (it only ensures the admin account exists).
 *
 * Run inside the app container so DATABASE_URL resolves, e.g.:
 *
 *   # preferred: supply secrets via a temporary protected env file, then delete it
 *   printf 'ADMIN_EMAIL=%s\nADMIN_PASSWORD=%s\n' "<founder-email>" "<one-time-strong-pw>" > /tmp/boot.env
 *   chmod 600 /tmp/boot.env
 *   docker compose exec -T --env-file /tmp/boot.env tenxpros-app node scripts/bootstrap-admin.mjs
 *   rm -f /tmp/boot.env
 *
 * (Do not commit any real password. Rotate it after first login.)
 * -----------------------------------------------------------------------------
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";

if (!email || !password) {
  console.error("[bootstrap-admin] ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("[bootstrap-admin] refusing: ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const passwordHash = await hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash, name: "TenXPros Admin" },
    create: { email, role: "ADMIN", passwordHash, name: "TenXPros Admin" },
  });
  const masked = email.replace(/^(.).*(@.*)$/, "$1***$2");
  console.log(`[bootstrap-admin] OK: ADMIN ensured for <${masked}> (record id present: ${Boolean(user.id)}).`);
} finally {
  await prisma.$disconnect();
}
