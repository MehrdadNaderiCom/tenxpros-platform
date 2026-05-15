import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function TicketsPage() {
  const session = await auth();
  const tickets = await prisma.ticket.findMany({
    where: { userId: session?.user.id ?? "" },
    include: { messages: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageHeader title="Tickets" description="Use tickets for module, dossier, evidence, workflow, foresight, capstone, or technical support." />
        <ButtonLink href="/portal/tickets/new">New ticket</ButtonLink>
      </div>
      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href={`/portal/tickets/${ticket.id}`} className="text-xl font-semibold text-navy-900">
                {ticket.subject}
              </Link>
              <p className="mt-1 text-sm text-slate-600">
                {ticket.category} · {ticket.messages.length} messages
              </p>
            </div>
            <Badge status={ticket.status}>{ticket.status}</Badge>
          </Card>
        ))}
        {tickets.length === 0 ? <Card>No tickets yet.</Card> : null}
      </div>
    </div>
  );
}
