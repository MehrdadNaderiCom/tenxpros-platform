import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { PartnerDealForm } from "@/components/portal/partner-deal-form";
import { DEAL_REG_STATUS_LABELS, OFFERING_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: "WAITING_RESPONSE",
  CONFIRMED: "APPROVED",
  DECLINED: "NOT_COMPLETED",
  LAPSED: "CLOSED",
  WITHDRAWN: "CLOSED",
};

export default async function PartnerDealsPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: current.partner.id },
    include: { dealRegistrations: { orderBy: { submittedAt: "desc" } } },
  });
  const activated = Boolean(partner.activationGatePassedAt);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Deal Registrations"
        description="Register each opportunity before substantive contact. Deal Registration is the only source of protection — and it is effective only on Panel Confirmation."
      />

      {!activated ? (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-navy-900">Complete the Activation Gate first</p>
          <p className="mt-1 text-sm text-slate-600">
            You can register opportunities once the company confirms your Activation Gate on the panel.
          </p>
        </Card>
      ) : (
        <PartnerDealForm />
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Offering</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Confirmed scope</th>
              <th className="px-4 py-3">Protected until</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {partner.dealRegistrations.map((reg, i) => (
              <tr key={reg.id} className={i % 2 ? "bg-neutral-50" : "bg-white"}>
                <td className="px-4 py-3">
                  <p className="font-medium text-navy-900">{reg.legalEntity}</p>
                  <p className="text-xs text-slate-500">{reg.country}{reg.businessUnit ? ` · ${reg.businessUnit}` : ""}</p>
                </td>
                <td className="px-4 py-3">{OFFERING_LABELS[reg.offering]}</td>
                <td className="px-4 py-3">
                  <Badge status={STATUS_BADGE[reg.status]}>{DEAL_REG_STATUS_LABELS[reg.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{reg.confirmedScope ?? (reg.declineReason ? `Declined: ${reg.declineReason}` : "—")}</td>
                <td className="px-4 py-3 text-slate-600">{reg.pipelineProtectionExpiresAt?.toLocaleDateString() ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{reg.submittedAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {partner.dealRegistrations.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                  No registrations yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
