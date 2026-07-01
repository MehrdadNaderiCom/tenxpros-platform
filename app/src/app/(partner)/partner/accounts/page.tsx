import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { resolvePartnerConfig } from "@/lib/partner/config-server";
import { accountLapseState } from "@/lib/partner/rules";
import { ACCOUNT_STAGE_BADGE, ACCOUNT_STAGE_LABELS, OFFERING_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

function lapseBadge(daysUntilLapse: number | null, lapsed: boolean): { text: string; status: string } {
  if (daysUntilLapse === null) return { text: "New", status: "PENDING" };
  if (lapsed) return { text: "Lapsed", status: "NOT_COMPLETED" };
  if (daysUntilLapse <= 7) return { text: `${daysUntilLapse}d left`, status: "WAITING_RESPONSE" };
  return { text: "Active", status: "ACTIVE" };
}

export default async function PartnerAccountsPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const [accounts, cfg] = await Promise.all([
    prisma.registeredAccount.findMany({
      where: { partnerId: current.partner.id },
      orderBy: { createdAt: "desc" },
      include: { closedDeals: true },
    }),
    resolvePartnerConfig(current.partner.id),
  ]);
  const now = new Date();

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Accounts"
        description="Your confirmed Registered Accounts. Open one to move its stage and log activity. Keep each account moving with a meaningful update so its protection does not lapse."
      />
      <Card className="p-0">
        <Table minWidth="min-w-[860px]">
          <THead>
            <Th>Account</Th>
            <Th>Offering</Th>
            <Th>Stage</Th>
            <Th>Closed deals</Th>
            <Th>Protected until</Th>
            <Th>Freshness</Th>
          </THead>
          <TBody>
            {accounts.map((a) => {
              const lapse = accountLapseState(a.lastMeaningfulUpdateAt, current.partner.tier, now, cfg);
              const badge = lapseBadge(lapse.daysUntilLapse, lapse.lapsed);
              return (
                <TR key={a.id}>
                  <Td>
                    <Link href={`/partner/accounts/${a.id}`} className="font-medium text-navy-900 hover:underline">
                      {a.legalEntity}
                    </Link>
                    <p className="text-xs text-slate-500">{a.country}{a.businessUnit ? `, ${a.businessUnit}` : ""}</p>
                  </Td>
                  <Td>{OFFERING_LABELS[a.offering]}</Td>
                  <Td>
                    <Badge status={ACCOUNT_STAGE_BADGE[a.stage]}>{ACCOUNT_STAGE_LABELS[a.stage]}</Badge>
                  </Td>
                  <Td>{a.closedDeals.length}</Td>
                  <Td className="text-slate-600">{a.protectionExpiresAt?.toLocaleDateString() ?? "-"}</Td>
                  <Td>
                    <Badge status={badge.status}>{badge.text}</Badge>
                  </Td>
                </TR>
              );
            })}
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
