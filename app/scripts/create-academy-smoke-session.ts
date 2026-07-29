#!/usr/bin/env tsx

import {
  chmod,
  constants,
  mkdir,
  open,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { encode } from "@auth/core/jwt";

import { superAdminEmails } from "../src/lib/authz";
import { prisma } from "../src/lib/prisma";

async function writeExclusive(
  path: string,
  value: string,
) {
  await mkdir(dirname(path), {
    recursive: true,
    mode: 0o700,
  });
  await chmod(dirname(path), 0o700);
  const handle = await open(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(path, 0o600);
}

function option(
  args: readonly string[],
  name: string,
) {
  const index = args.indexOf(name);
  const value =
    index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function ttlSeconds(
  args: readonly string[],
) {
  const index = args.indexOf(
    "--ttl-seconds",
  );
  const raw =
    index >= 0 ? args[index + 1] : "1800";
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value < 900 ||
    value > 7_200
  ) {
    throw new Error(
      "--ttl-seconds must be an integer from 900 through 7200",
    );
  }
  return value;
}

async function main() {
  process.umask(0o077);
  const args = process.argv.slice(2);
  const outputDirectory = resolve(
    option(
      args,
      "--output-dir",
    ),
  );
  const maxAge = ttlSeconds(args);
  const secret =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Auth session secret is unavailable",
    );
  }
  const [admin, partner] = await Promise.all([
    prisma.user.findFirst({
      where: {
        email: {
          in: superAdminEmails(),
        },
        role: "ADMIN",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    }),
    prisma.partner.findFirst({
      where: {
        status: "PILOT",
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    }),
  ]);
  if (!admin?.email || !partner) {
    throw new Error(
      "A superadmin and preview partner are required",
    );
  }
  const cookieName = "authjs.session-token";
  const token = await encode({
    secret,
    salt: cookieName,
    maxAge,
    token: {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  });
  const cookieFile = resolve(
    outputDirectory,
    "academy-smoke.cookies.txt",
  );
  await writeExclusive(
    cookieFile,
    [
      "# Netscape HTTP Cookie File",
      `172.17.0.1\tFALSE\t/\tFALSE\t0\t${cookieName}\t${token}`,
      `172.17.0.1\tFALSE\t/\tFALSE\t0\ttenx_view_partner\t${partner.id}`,
      "",
    ].join("\n"),
  );
  process.stdout.write(
    `${JSON.stringify({
      cookieFile,
      expiresWithinSeconds: maxAge,
      includesSuperadminSession: true,
      includesReadOnlyPartnerPreview: true,
    })}\n`,
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
