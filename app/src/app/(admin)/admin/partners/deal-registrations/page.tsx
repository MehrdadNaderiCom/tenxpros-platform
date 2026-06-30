import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  confirmDealRegistration,
  declineDealRegistration,
  decideTenXOpsEngagement,
} from "@/lib/actions/partner-admin";
import { DEAL_REG_STATUS_LABELS, OFFERING_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, THead, Th, TBody, TR, Td } from "@/components/ui/table";
import { Input } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function DealRegistrationsPage() {
  const [submitted, recent, engagements] = await Promise.all([
    prisma.dealRegistration.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      include: { partner: { select: { id: true, displayName: true, tier: true } } },
    }),
    prisma.dealRegistration.findMany({
      where: { status: { not: "SUBMITTED" } },
      orderBy: { decidedAt: "desc" },
      take: 25,
      include: { partner: { select: { displayName: true } } },
    }),
    prisma.tenXOpsEngagement.findMany({
      where: { status: "REQUESTED" },
      orderBy: { createdAt: "asc" },
      include: { partner: { select: { id: true, displayName: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Deal Registrations"
        description="Confirm or decline on the panel. Confirmation creates a protected Registered Account; House Accounts and entities already held by another partner are blocked automatically."
      />

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Awaiting Panel Confirmation ({submitted.length})</h2>
        <div className="mt-4 space-y-4">
          {submitted.map((reg) => (
            <div key={reg.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy-900">
                    {reg.legalEntity} <span className="text-sm font-normal text-slate-500">· {reg.country}{reg.businessUnit ? ` · ${reg.businessUnit}` : ""}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    <Link href={`/admin/partners/${reg.partner.id}`} className="hover:underline">{reg.partner.displayName}</Link>
                    {" · "}{reg.partner.tier} · {OFFERING_LABELS[reg.offering]} · {reg.productLine}
                    {reg.estSeats ? ` · ${reg.estSeats} seats` : ""}
                  </p>
                </div>
                <Badge status="WAITING_RESPONSE">Submitted {reg.submittedAt.toLocaleDateString()}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Case:</span> {reg.justification}</p>
              {reg.widerScopeRequested ? (
                <p className="mt-1 text-sm text-slate-600"><span className="font-medium">Wider scope:</span> {reg.widerScopeRequested}</p>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <form action={confirmDealRegistration} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="dealRegistrationId" value={reg.id} />
                  <label className="flex-1 space-y-1">
                    <span className="text-xs font-medium text-slate-600">Confirmed scope</span>
                    <Input name="confirmedScope" defaultValue={`${reg.legalEntity}, ${reg.country}${reg.businessUnit ? `, ${reg.businessUnit}` : ""}, ${OFFERING_LABELS[reg.offering]}`} />
                  </label>
                  <Button type="submit" size="sm">Confirm</Button>
                </form>
                <form action={declineDealRegistration} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="dealRegistrationId" value={reg.id} />
                  <label className="flex-1 space-y-1">
                    <span className="text-xs font-medium text-slate-600">Decline reason</span>
                    <Input name="declineReason" placeholder="e.g. House Account / already held" />
                  </label>
                  <Button type="submit" size="sm" variant="danger">Decline</Button>
                </form>
              </div>
            </div>
          ))}
          {submitted.length === 0 ? <p className="text-sm text-slate-500">Nothing awaiting confirmation.</p> : null}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">TenXOps engagement requests ({engagements.length})</h2>
        <div className="mt-4 space-y-3">
          {engagements.map((e) => (
            <div key={e.id} className="rounded-lg border border-neutral-200 p-4">
              <p className="font-semibold text-navy-900">{e.organisation}</p>
              <p className="text-xs text-slate-500">
                <Link href={`/admin/partners/${e.partner.id}`} className="hover:underline">{e.partner.displayName}</Link>
              </p>
              <p className="mt-2 text-sm text-slate-700">{e.justification}</p>
              <div className="mt-3 flex gap-2">
                <form action={decideTenXOpsEngagement}>
                  <input type="hidden" name="engagementId" value={e.id} />
                  <input type="hidden" name="decision" value="CONFIRM" />
                  <Button type="submit" size="sm">Confirm</Button>
                </form>
                <form action={decideTenXOpsEngagement}>
                  <input type="hidden" name="engagementId" value={e.id} />
                  <input type="hidden" name="decision" value="DECLINE" />
                  <Button type="submit" size="sm" variant="danger">Decline</Button>
                </form>
              </div>
            </div>
          ))}
          {engagements.length === 0 ? <p className="text-sm text-slate-500">No engagement requests.</p> : null}
        </div>
      </Card>

      <Table minWidth="min-w-[720px]">
        <THead>
          <Th>Account</Th>
          <Th>Partner</Th>
          <Th>Status</Th>
          <Th>Decided</Th>
        </THead>
        <TBody>
          {recent.map((reg) => (
            <TR key={reg.id}>
              <Td className="text-slate-800">{reg.legalEntity}</Td>
              <Td className="text-slate-600">{reg.partner.displayName}</Td>
              <Td>
                <Badge status={reg.status === "CONFIRMED" ? "APPROVED" : "NOT_COMPLETED"}>{DEAL_REG_STATUS_LABELS[reg.status]}</Badge>
              </Td>
              <Td className="text-slate-600">{reg.decidedAt?.toLocaleDateString() ?? "-"}</Td>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
