import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import {
  SPECIAL_DEAL_ITEM_STATUS_BADGE,
  SPECIAL_DEAL_ITEM_STATUS_LABELS,
  SPECIAL_DEAL_STATUS_BADGE,
  SPECIAL_DEAL_STATUS_LABELS,
} from "@/lib/partner/constants";
import { SpecialDealModal } from "@/components/portal/special-deal-modal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerSpecialDealsPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const [requests, deals] = await Promise.all([
    prisma.specialDealRequest.findMany({
      where: { partnerId: current.partner.id },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { order: "asc" } } },
    }),
    prisma.dealRegistration.findMany({
      where: { partnerId: current.partner.id },
      orderBy: { submittedAt: "desc" },
      select: { id: true, legalEntity: true, country: true },
    }),
  ]);
  const dealOptions = deals.map((d) => ({ id: d.id, label: `${d.legalEntity}, ${d.country}` }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Special Requests"
          description="Ask for an arrangement beyond the standard contract. The company decides on the request as a whole and on each detail separately."
        />
        {current.preview ? null : <SpecialDealModal deals={dealOptions} triggerVariant="primary" />}
      </div>

      <div className="space-y-4">
        {requests.map((r) => (
          <Card key={r.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-navy-900">{r.title}</p>
                <p className="text-xs text-slate-500">Submitted {r.createdAt.toLocaleDateString()}</p>
              </div>
              <Badge status={SPECIAL_DEAL_STATUS_BADGE[r.status]}>{SPECIAL_DEAL_STATUS_LABELS[r.status]}</Badge>
            </div>
            <p className="text-sm text-slate-700">{r.context}</p>
            <ul className="space-y-2">
              {r.items.map((it) => (
                <li key={it.id} className="rounded-md border border-neutral-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-slate-700">{it.description}</span>
                    <Badge status={SPECIAL_DEAL_ITEM_STATUS_BADGE[it.status]}>
                      {SPECIAL_DEAL_ITEM_STATUS_LABELS[it.status]}
                    </Badge>
                  </div>
                  {it.decisionNote ? (
                    <p className="mt-1 text-xs text-slate-500">Note: {it.decisionNote}</p>
                  ) : null}
                </li>
              ))}
            </ul>
            {r.decisionNote ? (
              <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-slate-600">
                <span className="font-medium">Company note:</span> {r.decisionNote}
              </p>
            ) : null}
          </Card>
        ))}
        {requests.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">
              No special requests yet. Use the button above when an opportunity needs terms beyond the standard contract.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
