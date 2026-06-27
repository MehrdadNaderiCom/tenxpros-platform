import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { PartnerTenXOpsForm } from "@/components/portal/partner-tenxops-form";
import { ENGAGEMENT_STATUS_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = { REQUESTED: "WAITING_RESPONSE", CONFIRMED: "APPROVED", DECLINED: "NOT_COMPLETED" };

export default async function PartnerTenXOpsPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const [accounts, engagements] = await Promise.all([
    prisma.registeredAccount.findMany({
      where: { partnerId: current.partner.id, lapsedAt: null },
      select: { id: true, legalEntity: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenXOpsEngagement.findMany({
      where: { partnerId: current.partner.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="TenXOps Engagements"
        description="Coaching is the route to a deeper, more fundamental collaboration. Turn a coaching relationship into an organisational engagement."
      />
      <PartnerTenXOpsForm accounts={accounts} />

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3">Decided</th>
            </tr>
          </thead>
          <tbody>
            {engagements.map((e, i) => (
              <tr key={e.id} className={i % 2 ? "bg-neutral-50" : "bg-white"}>
                <td className="px-4 py-3 font-medium text-navy-900">{e.organisation}</td>
                <td className="px-4 py-3">
                  <Badge status={BADGE[e.status]}>{ENGAGEMENT_STATUS_LABELS[e.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{e.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-600">{e.decidedAt?.toLocaleDateString() ?? "—"}</td>
              </tr>
            ))}
            {engagements.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={4}>
                  No engagement requests yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
