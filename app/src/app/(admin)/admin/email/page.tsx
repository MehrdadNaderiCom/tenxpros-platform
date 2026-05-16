import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function EmailPage() {
  const emails = await prisma.emailEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="space-y-8">
      <PageHeader title="Email" description="Transactional email log. Template editing remains minimal at launch." />
      <Card className="space-y-2 text-sm">
        {emails.map((email) => (
          <p key={email.id} className="flex items-center justify-between gap-4">
            <span>{email.template} · {email.to} · {email.subject}</span>
            <Badge status={email.status === "sent" ? "ACCEPTED" : "HOLD"}>{email.status}</Badge>
          </p>
        ))}
        {emails.length === 0 ? (
          <p className="text-slate-600">
            No email events yet. Application, enrollment, payment placeholder, ticket, and certification messages will be logged here after they send.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
