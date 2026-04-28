import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

const COOKIE_NAME = "tenxpros_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production (32+ chars).");
    }
    return "dev-only-insecure-secret-please-change-me";
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function buildToken(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

function parseToken(token: string | undefined): string | null {
  if (!token) return null;
  const [sessionId, signature] = token.split(".");
  if (!sessionId || !signature) return null;
  const expected = sign(sessionId);
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))
  ) {
    return null;
  }
  return sessionId;
}

export async function createSession(userId: string, meta: { userAgent?: string; ip?: string } = {}) {
  const id = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await prisma.session.create({
    data: { id, userId, expiresAt, userAgent: meta.userAgent, ip: meta.ip },
  });
  cookies().set(COOKIE_NAME, buildToken(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function destroySession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  const sessionId = parseToken(token);
  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
  cookies().delete(COOKIE_NAME);
}

export type AuthUser = User & {
  professionalId?: string | null;
  organizationId?: string | null;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  const sessionId = parseToken(token);
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          professional: { select: { id: true } },
          organization: { select: { id: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const { user } = session;
  return {
    ...user,
    professionalId: user.professional?.id ?? null,
    organizationId: user.organization?.id ?? null,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "REVIEWER") {
    redirect("/dashboard");
  }
  return user;
}
