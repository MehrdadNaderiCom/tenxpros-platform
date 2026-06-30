import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { OFFERING_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerAccountsPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const accounts = await prisma.registeredAccount.findMany({
    where: { partnerId: current.partner.id },
    orderBy: { createdAt: "desc" },
    include: { closedDeals: true },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Accounts"
        description="Your confirmed Registered Accounts. Keep each one moving with a meaningful update so its protection does not lapse."
      />
      <Card className="p-0">
        <Table minWidth="min-w-[760px]">
          <THead>
            <Th>Account</Th>
            <Th>Offering</Th>
            <Th>Scope</Th>
            <Th>Closed deals</Th>
            <Th>Protected until</Th>
            <Th>State</Th>
          </THead>
          <TBody>
            {accounts.map((a) => (
              <TR key={a.id}>
                <Td>
                  <p className="font-medium text-navy-900">{a.legalEntity}</p>
                  <p className="text-xs text-slate-500">{a.country}{a.businessUnit ? ` · ${a.businessUnit}` : ""}</p>
                </Td>
                <Td>{OFFERING_LABELS[a.offering]}</Td>
                <Td className="text-slate-600">{a.scope}</Td>
                <Td>{a.closedDeals.length}</Td>
                <Td className="text-slate-600">{a.protectionExpiresAt?.toLocaleDateString() ?? "-"}</Td>
                <Td>
                  <Badge status={a.lapsedAt ? "CLOSED" : "ACTIVE"}>{a.lapsedAt ? "Lapsed" : "Active"}</Badge>
                </Td>
              </TR>
            ))}
            {accounts.length === 0 ? (
              <TableEmpty colSpan={6}>
                No confirmed accounts yet. Register an opportunity and it appears here once confirmed.
              </TableEmpty>
            ) : null}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
