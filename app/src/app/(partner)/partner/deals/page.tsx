import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { PartnerDealForm } from "@/components/portal/partner-deal-form";
import { SpecialDealModal } from "@/components/portal/special-deal-modal";
import { DEAL_REG_STATUS_LABELS, OFFERING_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: "WAITING_RESPONSE",
  CONFIRMED: "APPROVED",
  DECLINED: "NOT_COMPLETED",
  LAPSED: "CLOSED",
  WITHDRAWN: "CLOSED",
  NEEDS_REVISION: "REVISE",
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
        description="Register each opportunity before substantive contact. Deal Registration is the only source of protection, and it is effective only on Panel Confirmation."
      />

      {!activated ? (
        <Alert tone="warning" title="Complete the Activation Gate first">
          You can register opportunities once the company confirms your Activation Gate on the panel.
        </Alert>
      ) : (
        <>
          <PartnerDealForm />
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-navy-900">Need terms beyond the standard contract?</p>
              <p className="text-sm text-slate-600">
                Submit a special request. The company decides on the request as a whole and on each detail separately.
              </p>
            </div>
            <SpecialDealModal
              deals={partner.dealRegistrations.map((d) => ({ id: d.id, label: `${d.legalEntity}, ${d.country}` }))}
            />
          </Card>
        </>
      )}

      <Card className="p-0">
        <Table minWidth="min-w-[820px]">
          <THead>
            <Th>Account</Th>
            <Th>Offering</Th>
            <Th>Status</Th>
            <Th>Confirmed scope</Th>
            <Th>Protected until</Th>
            <Th>Submitted</Th>
          </THead>
          <TBody>
            {partner.dealRegistrations.map((reg) => (
              <TR key={reg.id}>
                <Td>
                  <Link href={`/partner/deals/${reg.id}`} className="font-medium text-navy-900 hover:underline">
                    {reg.legalEntity}
                  </Link>
                  <p className="text-xs text-slate-500">{reg.country}{reg.businessUnit ? `, ${reg.businessUnit}` : ""}</p>
                </Td>
                <Td>{OFFERING_LABELS[reg.offering]}</Td>
                <Td>
                  <Badge status={STATUS_BADGE[reg.status]}>{DEAL_REG_STATUS_LABELS[reg.status]}</Badge>
                </Td>
                <Td className="text-slate-600">{reg.confirmedScope ?? (reg.declineReason ? `Declined: ${reg.declineReason}` : "-")}</Td>
                <Td className="text-slate-600">{reg.pipelineProtectionExpiresAt?.toLocaleDateString() ?? "-"}</Td>
                <Td className="text-slate-600">{reg.submittedAt.toLocaleDateString()}</Td>
              </TR>
            ))}
            {partner.dealRegistrations.length === 0 ? (
              <TableEmpty colSpan={6}>
                No registrations yet.
              </TableEmpty>
            ) : null}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
