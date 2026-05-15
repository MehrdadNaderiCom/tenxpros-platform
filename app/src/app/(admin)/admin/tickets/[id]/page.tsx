import { notFound } from "next/navigation";
import { respondToTicket } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function AdminTicketPage({ params }: { params: { id: string } }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { user: true, messages: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();
  return (
    <div className="space-y-8">
      <PageHeader title={ticket.subject} description={`${ticket.user.email} · ${ticket.category}`} />
      <Badge status={ticket.status}>{ticket.status}</Badge>
      {ticket.messages.map((message) => (
        <Card key={message.id}>
          <p className="text-sm font-medium text-navy-900">{message.user.name ?? message.user.email}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{message.body}</p>
        </Card>
      ))}
      <Card>
        <form action={respondToTicket} className="space-y-4">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <select name="status" className="h-10 rounded-md border border-neutral-300 px-3 text-sm">
            <option value="AWAITING_PARTICIPANT">Awaiting participant</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <Textarea name="body" placeholder="Admin response..." />
          <Button type="submit">Send response</Button>
        </form>
      </Card>
    </div>
  );
}
