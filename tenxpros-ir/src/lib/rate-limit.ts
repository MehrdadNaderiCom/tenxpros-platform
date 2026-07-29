import "server-only";
import { db } from "@/lib/db";

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("تعداد درخواست‌ها بیش از حد مجاز است.");
    this.name = "RateLimitError";
  }
}

export function getRateLimitSalt() {
  const configured = process.env.RATE_LIMIT_SALT?.trim();
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RATE_LIMIT_SALT must be configured with at least 32 characters.",
    );
  }
  return "tenxpros-ir-development-rate-limit-salt";
}

export async function enforceRateLimit({
  scope,
  subjectHash,
  limit,
  windowMs,
}: {
  scope: string;
  subjectHash: string;
  limit: number;
  windowMs: number;
}) {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const windowEnd = new Date(windowStart.getTime() + windowMs);

  const bucket = await db.rateLimitBucket.upsert({
    where: {
      scope_subjectHash_windowStart: { scope, subjectHash, windowStart },
    },
    create: {
      scope,
      subjectHash,
      windowStart,
      windowEnd,
      hitCount: 1,
    },
    update: { hitCount: { increment: 1 } },
  });

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    throw new RateLimitError(
      Math.max(1, Math.ceil((bucket.blockedUntil.getTime() - now.getTime()) / 1000)),
    );
  }

  if (bucket.hitCount > limit) {
    await db.rateLimitBucket.update({
      where: { id: bucket.id },
      data: { blockedUntil: windowEnd },
    });
    throw new RateLimitError(
      Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000)),
    );
  }
}
