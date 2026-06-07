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
