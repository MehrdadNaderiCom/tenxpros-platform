import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/auth";
import { PartnerNav } from "@/components/shared/partner-nav";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentPartner();
  // Access is link-based: a logged-in user with an associated Partner record.
  if (!current) redirect("/login");

  return (
    <div className="min-h-screen bg-neutral-50 md:flex">
      <PartnerNav name={current.partner.displayName} status={current.partner.status} />
      <main className="w-full px-6 py-8 md:px-8">{children}</main>
    </div>
  );
}
