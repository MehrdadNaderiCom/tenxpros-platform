import { notFound } from "next/navigation";
import { addTicketMessage } from "@/lib/actions/participant";
import { resolvePortalUserId } from "@/lib/participant/view";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const viewUserId = await resolvePortalUserId();
  const ticket = await prisma.ticket.findFirst({
    where: { id: params.id, userId: viewUserId ?? "" },
    include: { messages: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title={ticket.subject} description={`${ticket.category} support thread.`} />
      <Badge status={ticket.status}>{ticket.status}</Badge>
      <div className="space-y-3">
        {ticket.messages.map((message) => (
          <Card key={message.id}>
            <p className="text-sm font-medium text-navy-900">{message.user.name ?? message.user.email}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{message.body}</p>
          </Card>
        ))}
      </div>
      <Card>
        <form action={addTicketMessage} className="space-y-4">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <Textarea name="body" placeholder="Add a reply..." />
          <Button type="submit">Send reply</Button>
        </form>
      </Card>
    </div>
  );
}
