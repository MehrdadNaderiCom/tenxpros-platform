import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { resolvePartnerConfig } from "@/lib/partner/config-server";
import { flagCommissionQuery } from "@/lib/actions/partner-portal";
import { COMMISSION_STATUS_LABELS, commissionLineDisplay, qualifiedBySeatsNote, formatBp, formatCents } from "@/lib/partner/constants";
import { entryPayoutMinor, formatMoney } from "@/lib/partner/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-fields";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  ACCRUED: "PENDING",
  PAYABLE: "WAITING_RESPONSE",
  PAID: "PAID",
  REVERSED: "NOT_COMPLETED",
};

export default async function PartnerCommissionsPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");
  const cfg = await resolvePartnerConfig(current.partner.id);

  const entries = await prisma.commissionEntry.findMany({
    where: { partnerId: current.partner.id },
    orderBy: { createdAt: "desc" },
    include: { closedDeal: { include: { registeredAccount: true } } },
  });

  const payoutCurrency = cfg.currency;
  // Net payable, converted to the partner's payout currency.
  const total = (status: string) =>
    entries
      .filter((e) => e.status === status)
      .reduce((t, e) => t + entryPayoutMinor(e, e.closedDeal, payoutCurrency), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Commissions"
        description="Your commission statement. Commission is paid on cleared receipts, after delivery, within the payment window. Query any line you believe is wrong."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {(["ACCRUED", "PAYABLE", "PAID", "REVERSED"] as const).map((s) => (
          <Card key={s}>
            <p className="text-sm capitalize text-slate-500">{s.toLowerCase()}</p>
            <p className="mt-2 text-xl font-semibold text-navy-900">{formatMoney(total(s), payoutCurrency)}</p>
          </Card>
        ))}
      </div>

      <Card className="p-0">
        <Table minWidth="min-w-[920px]">
          <THead>
            <Th>Account</Th>
            <Th>Function</Th>
            <Th>Rate</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th>Payable on</Th>
            <Th className="text-right">Query</Th>
          </THead>
          <TBody>
            {entries.map((e) => (
              <TR key={e.id}>
                <Td className="text-slate-700">{e.closedDeal.registeredAccount?.legalEntity ?? "-"}</Td>
                <Td>
                  {(() => { const d = commissionLineDisplay(e.function, e.paidStrongRate); return (
                    <>
                      {d.label}{e.isFlat ? <span className="ml-1 text-xs text-slate-400">(fixed)</span> : null}
                      {d.qualifiedBySeats ? <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{qualifiedBySeatsNote(cfg)}</p> : null}
                    </>
                  ); })()}
                </Td>
                <Td>{e.isFlat ? "Flat" : formatBp(e.rateBp)}</Td>
                <Td className="font-medium text-navy-900">
                  {formatCents(e.amountCents - e.reversedCents, e.currency)}
                  {e.currency !== payoutCurrency ? <span className="ml-1 text-xs text-slate-500">(≈ {formatMoney(entryPayoutMinor(e, e.closedDeal, payoutCurrency), payoutCurrency)})</span> : null}
                  {e.reversedCents > 0 ? <span className="ml-1 text-xs text-amber-700">(-{formatCents(e.reversedCents, e.currency)})</span> : null}
                </Td>
                <Td>
                  <Badge status={STATUS_BADGE[e.status]}>{COMMISSION_STATUS_LABELS[e.status]}</Badge>
                </Td>
                <Td className="text-slate-600">{e.payableOn?.toLocaleDateString() ?? "-"}</Td>
                <Td>
                  {e.queryFlag ? (
                    <span className="text-xs font-medium text-amber-700">Queried</span>
                  ) : (
                    <form action={flagCommissionQuery} className="flex items-center justify-end gap-2">
                      <input type="hidden" name="commissionEntryId" value={e.id} />
                      <Input
                        name="queryNote"
                        placeholder="Reason (optional)"
                        className="h-8 w-36 px-2 text-xs"
                      />
                      <Button type="submit" size="sm" variant="ghost">
                        Query
                      </Button>
                    </form>
                  )}
                </Td>
              </TR>
            ))}
            {entries.length === 0 ? (
              <TableEmpty colSpan={7}>
                No commission yet. Lines appear here as deals are recorded and computed.
              </TableEmpty>
            ) : null}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
