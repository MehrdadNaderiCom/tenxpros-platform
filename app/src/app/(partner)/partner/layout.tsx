import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/auth";
import { startReadiness } from "@/lib/partner/readiness";
import { prisma } from "@/lib/prisma";
import { PartnerNav } from "@/components/shared/partner-nav";
import { AdminPreviewBanner } from "@/components/shared/admin-preview-banner";
import { StartHereBanner } from "@/components/partner/start-here";
import { FreshAuthorizationBoundary } from "@/components/auth/fresh-authorization-boundary";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentPartner();
  // Access is link-based: a logged-in user with an associated Partner record (or
  // a super admin previewing a partner read-only via getCurrentPartner).
  if (!current) redirect("/login");

  const [unread, academyBadge] = await Promise.all([
    prisma.partnerNotification.count({ where: { partnerId: current.partner.id, isRead: false } }),
    prisma.partnerAcademyBadge.findUnique({ where: { partnerId: current.partner.id }, select: { id: true } }),
  ]);
  // Panel-wide reminder: until the partner has completed the Academy AND
  // onboarding, every page shows the start-here banner so it keeps nudging them.
  const readiness = startReadiness({
    activationGatePassedAt: current.partner.activationGatePassedAt,
    hasAcademyBadge: Boolean(academyBadge),
  });

  return (
    <FreshAuthorizationBoundary surface="partner">
      <div className="min-h-screen bg-neutral-50 md:flex">
        <PartnerNav name={current.partner.displayName} status={current.partner.status} unread={unread} />
        <main className="w-full px-6 py-8 md:px-8">
          {current.preview ? <AdminPreviewBanner name={current.partner.displayName} /> : null}
          {!readiness.ready ? (
            <StartHereBanner
              academyComplete={readiness.academyComplete}
              onboardingComplete={readiness.onboardingComplete}
            />
          ) : null}
          {children}
        </main>
      </div>
    </FreshAuthorizationBoundary>
  );
}
