import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { setSupportTicketStatus } from "@/lib/actions/support";
import { SUPPORT_STATUS_BADGE, SUPPORT_STATUS_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const [open, resolved] = await Promise.all([
    prisma.partnerSupportTicket.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: { partner: { select: { id: true, displayName: true, contactEmail: true } } },
    }),
    prisma.partnerSupportTicket.findMany({
      where: { status: "RESOLVED" },
      orderBy: { resolvedAt: "desc" },
      take: 30,
      include: { partner: { select: { id: true, displayName: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Support"
        description="Reports partners file from their panel. Each one is also emailed to the program owner. Resolve a report once it is handled."
      />

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Open ({open.length})</h2>
        <div className="mt-4 space-y-4">
          {open.map((t) => (
            <div key={t.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-navy-900">{t.subject}</p>
                  <p className="text-xs text-slate-500">
                    <Link href={`/admin/partners/${t.partner.id}`} className="hover:underline">{t.partner.displayName}</Link>
                    {" , "}{t.partner.contactEmail} , {t.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <Badge status={SUPPORT_STATUS_BADGE[t.status]}>{SUPPORT_STATUS_LABELS[t.status]}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{t.body}</p>
              <form action={setSupportTicketStatus} className="mt-3">
                <input type="hidden" name="ticketId" value={t.id} />
                <input type="hidden" name="resolve" value="true" />
                <Button type="submit" size="sm">Mark resolved</Button>
              </form>
            </div>
          ))}
          {open.length === 0 ? <p className="text-sm text-slate-500">No open reports.</p> : null}
        </div>
      </Card>

      {resolved.length > 0 ? (
        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Recently resolved</h2>
          <div className="mt-4 space-y-2">
            {resolved.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3">
                <span className="text-sm text-slate-700">
                  <span className="font-medium">{t.subject}</span> , {t.partner.displayName}
                </span>
                <form action={setSupportTicketStatus} className="flex items-center gap-2">
                  <input type="hidden" name="ticketId" value={t.id} />
                  <input type="hidden" name="resolve" value="false" />
                  <Button type="submit" variant="ghost" size="sm">Reopen</Button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
