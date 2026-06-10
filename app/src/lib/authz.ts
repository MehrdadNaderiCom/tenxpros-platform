import type { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";

export type AuthorizedAdminUser = {
  id: string;
  role: Extract<UserRole, "ADMIN">;
  name: string | null;
  email: string | null;
  image: string | null;
};

export async function requireAdminUser(): Promise<AuthorizedAdminUser> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Admin access required.");
  }

  return {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  };
}

/** The single account allowed into Marketing (TenXPros Command). */
export function superAdminEmail(): string {
  return process.env.SUPER_ADMIN_EMAIL ?? "mail@mehrdadnaderi.com";
}

export function isSuperAdmin(email?: string | null): boolean {
  return Boolean(email && email.toLowerCase() === superAdminEmail().toLowerCase());
}

/**
 * Marketing (Command) is restricted to the super admin only — a regular ADMIN
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
