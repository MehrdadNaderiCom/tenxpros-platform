#!/usr/bin/env node
/**
 * bootstrap-admin.mjs — one-time, idempotent founder-admin bootstrap.
 * -----------------------------------------------------------------------------
 * Creates (or updates) a single ADMIN user from ENVIRONMENT variables.
 *
 *   - The password is NEVER hard-coded; it comes from ADMIN_PASSWORD or --password-stdin.
 *   - The password is NEVER printed; the email is masked in the success line.
 *   - 12+ characters is recommended; a 6-character minimum is accepted only to
 *     speed up the initial founder bootstrap (temporary launch exception).
 *   - Safe to re-run (upsert). Does not touch any other data.
 *   - Unlike prisma/seed.ts, this does NOT seed demo data and is allowed to run
 *     with NODE_ENV=production (it only ensures the admin account exists).
 *
 * Run inside the app container so DATABASE_URL resolves. Examples:
 *
 *   # interactive stdin (password typed at a terminal, never stored or echoed):
 *   read -r -s -p "Founder admin password: " PW; echo
 *   printf '%s' "$PW" | docker compose exec -T -e ADMIN_EMAIL=mail@mehrdadnaderi.com tenxpros-app node scripts/bootstrap-admin.mjs --password-stdin
 *   unset PW
 *
 *   # or via a temporary protected env file, deleted after:
 *   printf 'ADMIN_EMAIL=%s\nADMIN_PASSWORD=%s\n' "<founder-email>" "<one-time-pw>" > /tmp/boot.env
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

// Password source: ADMIN_PASSWORD env if present, otherwise read from stdin when
// invoked with --password-stdin (so it never appears on a command line).
let password = process.env.ADMIN_PASSWORD || "";
if (!password && process.argv.includes("--password-stdin")) {
  password = await new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });
}

if (!email || !password) {
  console.error("[bootstrap-admin] ADMIN_EMAIL and ADMIN_PASSWORD (or --password-stdin) are required.");
  process.exit(1);
}
// NOTE: 12+ characters is recommended. A 6-character minimum is accepted ONLY to
// speed up the initial founder-admin bootstrap (an intentional, temporary launch
// exception) — rotate to a strong password after first login. This does NOT change
// public/participant password rules.
if (password.length < 6) {
  console.error("[bootstrap-admin] refusing: ADMIN password must be at least 6 characters.");
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
