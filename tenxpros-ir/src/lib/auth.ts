import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { MembershipStatus, UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { getAuthConfig } from "./config";
import { db } from "./db";

export const SESSION_COOKIE_NAME = "txp_ir_session";
export const PASSWORD_HASH_ROUNDS = 12;

const dummyHashPromise = bcrypt.hash(
  "tenxpros-ir-invalid-user-placeholder",
  PASSWORD_HASH_ROUNDS,
);

export type SafeUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  membershipStatus: MembershipStatus;
  emailVerifiedAt: Date | null;
};

export type SessionMetadata = {
  /**
   * Pass a one-way hash prepared by the request boundary. Raw IP addresses are
   * intentionally not accepted by the domain layer.
   */
  ipHash?: string;
  userAgent?: string;
};

export type CreatedSession = {
  token: string;
  expiresAt: Date;
};

export class AuthenticationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_CREDENTIALS"
      | "ACCOUNT_DISABLED"
      | "ROLE_MISMATCH"
      | "SESSION_REQUIRED",
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  membershipStatus: true,
  emailVerifiedAt: true,
} as const;

function accountCanSignIn(
  role: UserRole,
  membershipStatus: MembershipStatus,
) {
  if (role === "ADMIN") return membershipStatus === "ACTIVE";
  return (
    membershipStatus !== "SUSPENDED" &&
    membershipStatus !== "REVOKED"
  );
}

export function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

export async function hashPassword(password: string) {
  if (password.length < 10 || Buffer.byteLength(password, "utf8") > 72) {
    throw new RangeError(
      "Password must be at least 10 characters and at most 72 UTF-8 bytes.",
    );
  }
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

async function authenticateByRole(
  email: string,
  credential: string,
  role: UserRole,
): Promise<SafeUser | null> {
  const user = await db.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: {
      ...safeUserSelect,
      passwordHash: true,
      accessCodeHash: true,
    },
  });

  const storedHash = user?.passwordHash ?? user?.accessCodeHash;
  const hashToCheck = storedHash ?? (await dummyHashPromise);
  const valid = await bcrypt.compare(credential, hashToCheck);

  if (
    !user ||
    !valid ||
    user.role !== role ||
    !accountCanSignIn(user.role, user.membershipStatus)
  ) {
    return null;
  }

  const { passwordHash: _passwordHash, accessCodeHash: _accessCodeHash, ...safe } =
    user;
  return safe;
}

export function authenticateAdmin(email: string, password: string) {
  return authenticateByRole(email, password, "ADMIN");
}

export function authenticateApplicant(email: string, credential: string) {
  return authenticateByRole(email, credential, "MEMBER");
}

export const authenticateMember = authenticateApplicant;

function tokenDigest(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function sanitizedMetadata(metadata: SessionMetadata) {
  const ipHash =
    metadata.ipHash && /^[a-f\d]{64}$/i.test(metadata.ipHash)
      ? metadata.ipHash.toLowerCase()
      : undefined;
  const userAgent = metadata.userAgent?.trim().slice(0, 512) || undefined;
  return { ipHash, userAgent };
}

async function writeSessionCookie(session: CreatedSession) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
    priority: "high",
  });
}

async function createSessionForRole(
  userId: string,
  role: UserRole,
  metadata: SessionMetadata = {},
): Promise<CreatedSession> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      membershipStatus: true,
      emailVerifiedAt: true,
    },
  });
  if (!user) {
    throw new AuthenticationError("User does not exist.", "ACCOUNT_DISABLED");
  }
  if (user.role !== role) {
    throw new AuthenticationError(
      "The account role does not match this sign-in flow.",
      "ROLE_MISMATCH",
    );
  }
  if (!accountCanSignIn(user.role, user.membershipStatus)) {
    throw new AuthenticationError(
      "The account is disabled.",
      "ACCOUNT_DISABLED",
    );
  }
  if (role === "MEMBER" && !user.emailVerifiedAt) {
    throw new AuthenticationError(
      "The member email is not verified.",
      "ACCOUNT_DISABLED",
    );
  }

  const authConfig = getAuthConfig();
  const lifetimeMs =
    role === "ADMIN"
      ? authConfig.adminSessionHours * 60 * 60 * 1_000
      : authConfig.applicantSessionDays * 24 * 60 * 60 * 1_000;
  const token = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + lifetimeMs);

  await db.session.create({
    data: {
      tokenHash: tokenDigest(token),
      expiresAt,
      userId,
      ...sanitizedMetadata(metadata),
    },
  });

  const session = { token, expiresAt };
  await writeSessionCookie(session);
  return session;
}

export function createAdminSession(
  adminId: string,
  metadata: SessionMetadata = {},
) {
  return createSessionForRole(adminId, "ADMIN", metadata);
}

export function createApplicantSession(
  applicantId: string,
  metadata: SessionMetadata = {},
) {
  return createSessionForRole(applicantId, "MEMBER", metadata);
}

export const createMemberSession = createApplicantSession;

export async function getUserForSessionToken(
  token: string | null | undefined,
): Promise<SafeUser | null> {
  if (!token || token.length > 256) return null;

  const now = new Date();
  const session = await db.session.findUnique({
    where: { tokenHash: tokenDigest(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: safeUserSelect },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= now.getTime()
  ) {
    return null;
  }

  return session.user;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return getUserForSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function getCurrentAdmin() {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" &&
    accountCanSignIn(user.role, user.membershipStatus)
    ? user
    : null;
}

export async function getCurrentApplicant() {
  const user = await getCurrentUser();
  return user?.role === "MEMBER" &&
    accountCanSignIn(user.role, user.membershipStatus) &&
    Boolean(user.emailVerifiedAt)
    ? user
    : null;
}

export const getCurrentMember = getCurrentApplicant;

export async function requireCurrentAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new AuthenticationError(
      "An administrator session is required.",
      "SESSION_REQUIRED",
    );
  }
  return admin;
}

export async function requireCurrentApplicant() {
  const applicant = await getCurrentApplicant();
  if (!applicant) {
    throw new AuthenticationError(
      "A member session is required.",
      "SESSION_REQUIRED",
    );
  }
  return applicant;
}

export const requireCurrentMember = requireCurrentApplicant;

export async function revokeSessionToken(token: string | null | undefined) {
  if (!token || token.length > 256) return;
  await db.session.updateMany({
    where: { tokenHash: tokenDigest(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string) {
  await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  await revokeSessionToken(token);
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
