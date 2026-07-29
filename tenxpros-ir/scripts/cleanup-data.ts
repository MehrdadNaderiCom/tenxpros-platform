import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1_000;

async function main() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const twoDaysAgo = new Date(now.getTime() - 2 * DAY_MS);

  const [sessions, verificationTokens, rateLimitBuckets] =
    await prisma.$transaction([
      prisma.session.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revokedAt: { not: null, lt: thirtyDaysAgo } },
          ],
        },
      }),
      prisma.emailVerificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: sevenDaysAgo } },
            { consumedAt: { not: null, lt: sevenDaysAgo } },
          ],
        },
      }),
      prisma.rateLimitBucket.deleteMany({
        where: { windowEnd: { lt: twoDaysAgo } },
      }),
    ]);

  console.log(
    JSON.stringify({
      removed: {
        sessions: sessions.count,
        emailVerificationTokens: verificationTokens.count,
        rateLimitBuckets: rateLimitBuckets.count,
      },
    }),
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Data cleanup failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
