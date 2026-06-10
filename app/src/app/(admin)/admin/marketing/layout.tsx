import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

/**
 * Marketing (TenXPros Command) is visible ONLY to the super admin. Other
 * admins get a 404 so the section's existence is not advertised.
 */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !isSuperAdmin(session.user.email)) notFound();
  return <>{children}</>;
}
