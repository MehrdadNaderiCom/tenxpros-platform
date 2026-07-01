import Link from "next/link";
import type { SpecialDealRequestItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decideSpecialDealItem, decideSpecialDealRequest } from "@/lib/actions/partner-admin";
import {
  SPECIAL_DEAL_ITEM_STATUS_BADGE,
  SPECIAL_DEAL_ITEM_STATUS_LABELS,
  SPECIAL_DEAL_STATUS_BADGE,
  SPECIAL_DEAL_STATUS_LABELS,
} from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

type RequestWithRelations = {
  id: string;
  title: string;
  context: string;
  status: keyof typeof SPECIAL_DEAL_STATUS_LABELS;
  decisionNote: string | null;
  createdAt: Date;
  partner: { id: string; displayName: string };
  dealRegistration: { legalEntity: string; country: string } | null;
  items: SpecialDealRequestItem[];
};

function ItemRow({ item }: { item: SpecialDealRequestItem }) {
  return (
    <li className="rounded-md border border-neutral-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-slate-700">{item.description}</span>
        <Badge status={SPECIAL_DEAL_ITEM_STATUS_BADGE[item.status]}>
          {SPECIAL_DEAL_ITEM_STATUS_LABELS[item.status]}
        </Badge>
      </div>
      {item.decisionNote ? <p className="mt-1 text-xs text-slate-500">Note: {item.decisionNote}</p> : null}
      <form action={decideSpecialDealItem} className="mt-2 flex flex-wrap items-end gap-2">
        <input type="hidden" name="itemId" value={item.id} />
        <label className="flex-1 space-y-1">
          <span className="text-xs font-medium text-slate-600">Decision note (optional)</span>
          <Input name="decisionNote" placeholder="Why this detail is approved or rejected." />
        </label>
        <Button type="submit" name="decision" value="APPROVE" size="sm">Approve</Button>
        <Button type="submit" name="decision" value="REJECT" size="sm" variant="danger">Reject</Button>
      </form>
    </li>
  );
}

function RequestCard({ req }: { req: RequestWithRelations }) {
  const decided = req.status !== "PENDING";
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-navy-900">{req.title}</p>
          <p className="text-xs text-slate-500">
            <Link href={`/admin/partners/${req.partner.id}`} className="hover:underline">
              {req.partner.displayName}
            </Link>
            {req.dealRegistration ? ` , opportunity: ${req.dealRegistration.legalEntity}, ${req.dealRegistration.country}` : ""}
            {` , submitted ${req.createdAt.toLocaleDateString()}`}
          </p>
        </div>
        <Badge status={SPECIAL_DEAL_STATUS_BADGE[req.status]}>{SPECIAL_DEAL_STATUS_LABELS[req.status]}</Badge>
      </div>
      <p className="text-sm text-slate-700">{req.context}</p>

      <ul className="space-y-2">
        {req.items.map((it) => (
          <ItemRow key={it.id} item={it} />
        ))}
      </ul>

      <form action={decideSpecialDealRequest} className="flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
        <input type="hidden" name="requestId" value={req.id} />
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Finalize the request</span>
          <Select name="decision" defaultValue="FINALIZE_FROM_ITEMS">
            <option value="FINALIZE_FROM_ITEMS">Finalize from the item decisions</option>
            <option value="APPROVE_ALL">Approve the whole request</option>
            <option value="REJECT_ALL">Reject the whole request</option>
          </Select>
        </label>
        <label className="flex-1 space-y-1">
          <span className="text-xs font-medium text-slate-600">Overall note (optional)</span>
          <Input name="decisionNote" defaultValue={req.decisionNote ?? ""} placeholder="A short note to the partner." />
        </label>
        <Button type="submit" size="sm">{decided ? "Update decision" : "Finalize"}</Button>
      </form>
    </Card>
  );
}

export default async function AdminSpecialDealsPage() {
  const include = {
    partner: { select: { id: true, displayName: true } },
    dealRegistration: { select: { legalEntity: true, country: true } },
    items: { orderBy: { order: "asc" as const } },
  };
  const [pending, decided] = await Promise.all([
    prisma.specialDealRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include }),
    prisma.specialDealRequest.findMany({ where: { status: { not: "PENDING" } }, orderBy: { decidedAt: "desc" }, take: 30, include }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Special Requests"
        description="Partners' requests for arrangements beyond the standard contract. Decide each out-of-rule detail separately, then finalize the request as a whole."
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Pending ({pending.length})</h2>
        <div className="space-y-4">
          {pending.map((r) => (
            <RequestCard key={r.id} req={r as RequestWithRelations} />
          ))}
          {pending.length === 0 ? <p className="text-sm text-slate-500">Nothing pending.</p> : null}
        </div>
      </div>

      {decided.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-navy-900">Recently decided</h2>
          <div className="space-y-4">
            {decided.map((r) => (
              <RequestCard key={r.id} req={r as RequestWithRelations} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
