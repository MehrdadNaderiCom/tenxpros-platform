import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { setCommissionStatus } from "@/lib/actions/partner-admin";
import { resolveGlobalConfig } from "@/lib/partner/config-server";
import { COMMISSION_STATUS_LABELS, PARTNER_FUNCTION_LABELS, formatBp, formatCents } from "@/lib/partner/constants";
import { entryPayoutMinor, formatMoney } from "@/lib/partner/currency";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = { ACCRUED: "PENDING", PAYABLE: "WAITING_RESPONSE", PAID: "PAID", REVERSED: "NOT_COMPLETED" };

export default async function AdminCommissionsPage() {
  const config = await resolveGlobalConfig();
  const payoutCurrency = config.currency;

  // Load all lines (with the deal's currency + captured rate) so multi-currency
  // totals convert to the single payout currency; show the most recent 200.
  const all = await prisma.commissionEntry.findMany({
    orderBy: { createdAt: "desc" },
    include: { partner: { select: { id: true, displayName: true } }, closedDeal: { include: { registeredAccount: true } } },
  });
  const entries = all.slice(0, 200);

  const totalFor = (s: string) =>
    all.filter((e) => e.status === s).reduce((t, e) => t + entryPayoutMinor(e, e.closedDeal, payoutCurrency), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Commissions"
          description="Computed commission lines across all partners. Mark lines payable and paid as delivery and cleared payment are met. Refunds and clawbacks are applied from each partner's page."
        />
        <ButtonLink href="/admin/partners/commissions/export" variant="secondary" size="sm">
          Export CSV
        </ButtonLink>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {(["ACCRUED", "PAYABLE", "PAID", "REVERSED"] as const).map((s) => (
          <Card key={s}>
            <p className="text-sm capitalize text-slate-500">{s.toLowerCase()}</p>
            <p className="mt-2 text-xl font-semibold text-navy-900">{formatMoney(totalFor(s), payoutCurrency)}</p>
          </Card>
        ))}
      </div>

      <Table minWidth="min-w-[980px]">
        <THead>
          <Th>Partner</Th>
          <Th>Account</Th>
          <Th>Function</Th>
          <Th>Rate</Th>
          <Th>Amount</Th>
          <Th>Status</Th>
          <Th className="text-right">Actions</Th>
        </THead>
        <TBody>
          {entries.map((e) => (
            <TR key={e.id}>
              <Td>
                <Link href={`/admin/partners/${e.partner.id}`} className="text-navy-700 hover:underline">{e.partner.displayName}</Link>
              </Td>
              <Td className="text-slate-600">{e.closedDeal.registeredAccount?.legalEntity ?? "-"}</Td>
              <Td>{PARTNER_FUNCTION_LABELS[e.function]}{e.isFlat ? <span className="ml-1 text-xs text-slate-400">(fixed)</span> : null}{e.queryFlag ? <span className="ml-1 text-xs text-amber-700">(queried)</span> : null}</Td>
              <Td>{e.isFlat ? ", " : formatBp(e.rateBp)}</Td>
              <Td className="font-medium text-navy-900">
                {formatCents(e.amountCents - e.reversedCents, e.currency)}
                {e.currency !== payoutCurrency ? <span className="ml-1 text-xs text-slate-500">(≈ {formatMoney(entryPayoutMinor(e, e.closedDeal, payoutCurrency), payoutCurrency)})</span> : null}
              </Td>
              <Td><Badge status={BADGE[e.status]}>{COMMISSION_STATUS_LABELS[e.status]}</Badge></Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  {e.status === "ACCRUED" ? (
                    <form action={setCommissionStatus}>
                      <input type="hidden" name="commissionEntryId" value={e.id} />
                      <input type="hidden" name="status" value="PAYABLE" />
                      <Button type="submit" size="sm" variant="secondary">Mark payable</Button>
                    </form>
                  ) : null}
                  {e.status === "PAYABLE" ? (
                    <form action={setCommissionStatus}>
                      <input type="hidden" name="commissionEntryId" value={e.id} />
                      <input type="hidden" name="status" value="PAID" />
                      <Button type="submit" size="sm">Mark paid</Button>
                    </form>
                  ) : null}
                </div>
              </Td>
            </TR>
          ))}
          {entries.length === 0 ? (
            <TableEmpty colSpan={7}>
              No commission lines yet.
            </TableEmpty>
          ) : null}
        </TBody>
      </Table>
    </div>
  );
}
