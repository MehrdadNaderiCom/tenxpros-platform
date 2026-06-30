import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/auth";
import { prisma } from "@/lib/prisma";
import { PartnerNav } from "@/components/shared/partner-nav";
import { AdminPreviewBanner } from "@/components/shared/admin-preview-banner";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentPartner();
  // Access is link-based: a logged-in user with an associated Partner record (or
  // a super admin previewing a partner read-only via getCurrentPartner).
  if (!current) redirect("/login");

  const unread = await prisma.partnerNotification.count({
    where: { partnerId: current.partner.id, isRead: false },
  });

  return (
    <div className="min-h-screen bg-neutral-50 md:flex">
      <PartnerNav name={current.partner.displayName} status={current.partner.status} unread={unread} />
      <main className="w-full px-6 py-8 md:px-8">
        {current.preview ? <AdminPreviewBanner name={current.partner.displayName} /> : null}
        {children}
      </main>
    </div>
  );
}
