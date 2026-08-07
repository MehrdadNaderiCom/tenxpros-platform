import type { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthorizedAdminUser = {
  id: string;
  role: Extract<UserRole, "ADMIN">;
  name: string | null;
  email: string | null;
  image: string | null;
};

export async function requireAdminUser(): Promise<AuthorizedAdminUser> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Admin access required.");
  }

  // Sensitive authorization is database-backed even though auth() already
  // refreshes JWT state. This second check keeps the action safe if a caller is
  // ever moved outside the normal Auth.js session pipeline.
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true, email: true, image: true, isActive: true },
  });
  if (!current?.isActive || current.role !== "ADMIN") {
    throw new Error("Admin access required.");
  }

  return {
    id: current.id,
    role: current.role,
    name: current.name,
    email: current.email,
    image: current.image,
  };
}

/**
 * Every account with super-admin powers (Marketing/Command, destructive partner
 * operations, and read-only panel preview). Override with the SUPER_ADMIN_EMAILS
 * env var (comma-separated); defaults to the two program owners.
 */
export function superAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? "mail@mehrdadnaderi.com,pegah.rostam@gmail.com";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** The primary super admin, the recipient for owner notifications. */
export function superAdminEmail(): string {
  return superAdminEmails()[0] ?? "mail@mehrdadnaderi.com";
}

/**
 * AdminSetting keys that must never appear in (or be editable from) the
 * generic /admin/settings UI: secrets and super-admin-only marketing config.
 */
export function isProtectedSettingKey(key: string): boolean {
  return key.includes("api_key") || key.startsWith("openrouter_") || key.startsWith("marketing_");
}

export function isSuperAdmin(email?: string | null): boolean {
  return Boolean(email && superAdminEmails().includes(email.toLowerCase()));
}

/**
 * Marketing (Command) is restricted to the super admin only, a regular ADMIN
 * session is not enough. Used by the marketing layout and every marketing
 * server action.
 */
export async function requireSuperAdmin(): Promise<AuthorizedAdminUser> {
  const admin = await requireAdminUser();
  if (!isSuperAdmin(admin.email)) {
    throw new Error("Marketing access is restricted to the primary admin.");
  }
  return admin;
}
