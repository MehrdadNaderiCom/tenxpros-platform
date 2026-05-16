import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

export default async function AdminTicketsPage() {
  const tickets = await prisma.ticket.findMany({ include: { user: true, messages: true }, orderBy: { updatedAt: "desc" } });
  return (
    <div className="space-y-8">
      <PageHeader title="Tickets" description="Support queue and response workflow. Prioritize open and waiting-response threads." />
      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href={`/admin/tickets/${ticket.id}`} className="text-xl font-semibold text-navy-900">{ticket.subject}</Link>
              <p className="mt-1 text-sm text-slate-600">
                {ticket.user.email} · {ticket.category} · Updated {ticket.updatedAt.toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">SLA: respond in the current support window.</p>
            </div>
            <Badge status={ticket.status}>{ticket.status}</Badge>
          </Card>
        ))}
        {tickets.length === 0 ? (
          <EmptyState
            eyebrow="No tickets"
            title="The support queue is clear."
            description="Participant questions about modules, dossier work, evidence, foresight, capstone, and technical issues will appear here."
            actionLabel="View participants"
            actionHref="/admin/participants"
          />
        ) : null}
      </div>
    </div>
  );
}
