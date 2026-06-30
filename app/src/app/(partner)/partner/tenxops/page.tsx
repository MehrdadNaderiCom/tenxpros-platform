import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { PartnerTenXOpsForm } from "@/components/portal/partner-tenxops-form";
import { ENGAGEMENT_STATUS_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
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

      <Card className="p-0">
        <Table minWidth="min-w-[640px]">
          <THead>
            <Th>Organisation</Th>
            <Th>Status</Th>
            <Th>Requested</Th>
            <Th>Decided</Th>
          </THead>
          <TBody>
            {engagements.map((e) => (
              <TR key={e.id}>
                <Td className="font-medium text-navy-900">{e.organisation}</Td>
                <Td>
                  <Badge status={BADGE[e.status]}>{ENGAGEMENT_STATUS_LABELS[e.status]}</Badge>
                </Td>
                <Td className="text-slate-600">{e.createdAt.toLocaleDateString()}</Td>
                <Td className="text-slate-600">{e.decidedAt?.toLocaleDateString() ?? "-"}</Td>
              </TR>
            ))}
            {engagements.length === 0 ? (
              <TableEmpty colSpan={4}>
                No engagement requests yet.
              </TableEmpty>
            ) : null}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
