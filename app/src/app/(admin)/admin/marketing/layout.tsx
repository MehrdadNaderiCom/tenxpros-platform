import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

/**
 * Marketing (TenXPros Command) is visible ONLY to the super admin. Other
 * admins get a 404 so the section's existence is not advertised.
 */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireSuperAdmin();
  } catch {
    notFound();
  }
  return <>{children}</>;
}
