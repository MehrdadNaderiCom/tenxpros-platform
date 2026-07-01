import Link from "next/link";
import type { DealMessage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  confirmDealRegistration,
  declineDealRegistration,
  decideTenXOpsEngagement,
  postDealMessageAdmin,
  requestDealRevision,
} from "@/lib/actions/partner-admin";
import { DEAL_REG_STATUS_LABELS, OFFERING_LABELS } from "@/lib/partner/constants";
import { DealThread } from "@/components/portal/deal-thread";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, THead, Th, TBody, TR, Td } from "@/components/ui/table";
import { Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

type AdminDeal = {
  id: string;
  legalEntity: string;
  country: string;
  businessUnit: string | null;
  offering: keyof typeof OFFERING_LABELS;
  productLine: string;
  estSeats: number | null;
  status: string;
  justification: string;
  widerScopeRequested: string | null;
  submittedAt: Date;
  partner: { id: string; displayName: string; tier: string };
  messages: DealMessage[];
};

/** One actionable opportunity: details, thread, and every admin control. */
function AdminDealCard({ reg }: { reg: AdminDeal }) {
  const scopeDefault = `${reg.legalEntity}, ${reg.country}${reg.businessUnit ? `, ${reg.businessUnit}` : ""}, ${OFFERING_LABELS[reg.offering]}`;
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-900">
            {reg.legalEntity}{" "}
            <span className="text-sm font-normal text-slate-500">
              , {reg.country}{reg.businessUnit ? `, ${reg.businessUnit}` : ""}
            </span>
          </p>
          <p className="text-xs text-slate-500">
            <Link href={`/admin/partners/${reg.partner.id}`} className="hover:underline">
              {reg.partner.displayName}
            </Link>
            {" , "}
            {reg.partner.tier} , {OFFERING_LABELS[reg.offering]} , {reg.productLine}
            {reg.estSeats ? ` , ${reg.estSeats} seats` : ""}
          </p>
        </div>
        <Badge status={reg.status === "NEEDS_REVISION" ? "REVISE" : "WAITING_RESPONSE"}>
          {reg.status === "NEEDS_REVISION" ? "Awaiting revision" : `Submitted ${reg.submittedAt.toLocaleDateString()}`}
        </Badge>
      </div>

      <p className="mt-3 text-sm text-slate-700">
        <span className="font-medium">Case:</span> {reg.justification}
      </p>
      {reg.widerScopeRequested ? (
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-medium">Wider scope:</span> {reg.widerScopeRequested}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <form action={confirmDealRegistration} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="dealRegistrationId" value={reg.id} />
          <label className="flex-1 space-y-1">
            <span className="text-xs font-medium text-slate-600">Confirmed scope</span>
            <Input name="confirmedScope" defaultValue={scopeDefault} />
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

      <form action={requestDealRevision} className="mt-3 space-y-1">
        <span className="text-xs font-medium text-slate-600">Ask the partner to revise (emails them and opens the thread)</span>
        <div className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="dealRegistrationId" value={reg.id} />
          <Textarea name="feedback" rows={2} className="flex-1" placeholder="What needs to change before you can confirm this." />
          <Button type="submit" size="sm" variant="secondary">Request revision</Button>
        </div>
      </form>

      <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversation</p>
        <DealThread messages={reg.messages} />
        <form action={postDealMessageAdmin} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="dealRegistrationId" value={reg.id} />
          <Textarea name="body" rows={2} className="flex-1" placeholder="Post a message to the partner." />
          <Button type="submit" size="sm" variant="secondary">Send message</Button>
        </form>
      </div>
    </div>
  );
}

export default async function DealRegistrationsPage() {
  const dealInclude = {
    partner: { select: { id: true, displayName: true, tier: true } },
    messages: { orderBy: { createdAt: "asc" } as const },
  };
  const [submitted, needsRevision, recent, engagements] = await Promise.all([
    prisma.dealRegistration.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      include: dealInclude,
    }),
    prisma.dealRegistration.findMany({
      where: { status: "NEEDS_REVISION" },
      orderBy: { revisionRequestedAt: "desc" },
      include: dealInclude,
    }),
    prisma.dealRegistration.findMany({
      where: { status: { notIn: ["SUBMITTED", "NEEDS_REVISION"] } },
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
        description="Confirm or decline on the panel, or ask the partner to revise. Confirmation creates a protected Registered Account; House Accounts and entities already held by another partner are blocked automatically."
      />

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Awaiting Panel Confirmation ({submitted.length})</h2>
        <div className="mt-4 space-y-4">
          {submitted.map((reg) => (
            <AdminDealCard key={reg.id} reg={reg as AdminDeal} />
          ))}
          {submitted.length === 0 ? <p className="text-sm text-slate-500">Nothing awaiting confirmation.</p> : null}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Awaiting partner revision ({needsRevision.length})</h2>
        <p className="mt-1 text-sm text-slate-600">
          You asked these partners to revise. They return to the confirmation queue once resubmitted. You can keep the
          conversation going below.
        </p>
        <div className="mt-4 space-y-4">
          {needsRevision.map((reg) => (
            <AdminDealCard key={reg.id} reg={reg as AdminDeal} />
          ))}
          {needsRevision.length === 0 ? <p className="text-sm text-slate-500">Nothing awaiting revision.</p> : null}
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
