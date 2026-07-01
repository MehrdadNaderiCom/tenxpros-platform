import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { SUPPORT_STATUS_BADGE, SUPPORT_STATUS_LABELS } from "@/lib/partner/constants";
import { SupportTicketForm } from "@/components/portal/support-ticket-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerSupportPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const tickets = await prisma.partnerSupportTicket.findMany({
    where: { partnerId: current.partner.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Support"
        description="Hit a problem or have a question? Send a report and it reaches the team directly. We follow up by email."
      />

      {current.preview ? null : (
        <Card>
          <h2 className="text-lg font-semibold text-navy-900">File a report</h2>
          <div className="mt-4">
            <SupportTicketForm />
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Your reports</h2>
        <Card className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-md border border-neutral-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-navy-900">{t.subject}</span>
                <Badge status={SUPPORT_STATUS_BADGE[t.status]}>{SUPPORT_STATUS_LABELS[t.status]}</Badge>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{t.body}</p>
              <p className="mt-1 text-xs text-slate-400">{t.createdAt.toLocaleString()}</p>
            </div>
          ))}
          {tickets.length === 0 ? <p className="text-sm text-slate-500">No reports yet.</p> : null}
        </Card>
      </div>
    </div>
  );
}
