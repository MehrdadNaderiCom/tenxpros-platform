import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { getAppConfig } from "@/lib/config";
import { db } from "@/lib/db";

export const EMAIL_VERIFICATION_LIFETIME_HOURS = 24;

export type EmailVerificationCapability = {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
};

export type EmailVerificationResult =
  | { ok: true; alreadyVerified: boolean }
  | { ok: false; reason: "INVALID" | "EXPIRED" | "USED" };

function tokenDigest(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createEmailVerificationCapability(
  now = new Date(),
): EmailVerificationCapability {
  const rawToken = randomBytes(32).toString("base64url");
  return {
    rawToken,
    tokenHash: tokenDigest(rawToken),
    expiresAt: new Date(
      now.getTime() + EMAIL_VERIFICATION_LIFETIME_HOURS * 60 * 60 * 1_000,
    ),
  };
}

export function emailVerificationUrl(rawToken: string) {
  const url = new URL("/verify-email", getAppConfig().appUrl);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export async function issueEmailVerificationToken(userId: string) {
  const capability = createEmailVerificationCapability();
  await db.$transaction(async (transaction) => {
    await transaction.emailVerificationToken.deleteMany({
      where: { userId, consumedAt: null },
    });
    await transaction.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: capability.tokenHash,
        expiresAt: capability.expiresAt,
      },
    });
  });
  return capability;
}

export async function consumeEmailVerificationToken(
  rawToken: string,
): Promise<EmailVerificationResult> {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(rawToken)) {
    return { ok: false, reason: "INVALID" };
  }

  const now = new Date();
  try {
    return await db.$transaction(
      async (transaction) => {
        const token = await transaction.emailVerificationToken.findUnique({
          where: { tokenHash: tokenDigest(rawToken) },
          include: {
            user: { select: { id: true, emailVerifiedAt: true } },
          },
        });
        if (!token) return { ok: false, reason: "INVALID" } as const;
        if (token.consumedAt) return { ok: false, reason: "USED" } as const;
        if (token.expiresAt.getTime() <= now.getTime()) {
          return { ok: false, reason: "EXPIRED" } as const;
        }

        const claimed = await transaction.emailVerificationToken.updateMany({
          where: {
            id: token.id,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });
        if (claimed.count !== 1) {
          return { ok: false, reason: "USED" } as const;
        }

        if (!token.user.emailVerifiedAt) {
          await transaction.user.update({
            where: { id: token.user.id },
            data: { emailVerifiedAt: now },
          });
        }

        return {
          ok: true,
          alreadyVerified: Boolean(token.user.emailVerifiedAt),
        } as const;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return { ok: false, reason: "USED" };
    }
    throw error;
  }
}
