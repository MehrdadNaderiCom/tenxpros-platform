import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function AdminTicketsPage() {
  const tickets = await prisma.ticket.findMany({ include: { user: true, messages: true }, orderBy: { updatedAt: "desc" } });
  return (
    <div className="space-y-8">
      <PageHeader title="Tickets" description="Support queue and response workflow." />
      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href={`/admin/tickets/${ticket.id}`} className="text-xl font-semibold text-navy-900">{ticket.subject}</Link>
              <p className="mt-1 text-sm text-slate-600">{ticket.user.email} · {ticket.category}</p>
            </div>
            <Badge status={ticket.status}>{ticket.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
