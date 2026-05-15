import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="space-y-8">
      <PageHeader title="Audit Log" description="Major admin status changes and significant actions." />
      <Card className="space-y-2 text-sm text-slate-600">
        {logs.map((log) => (
          <p key={log.id}>{log.createdAt.toLocaleString()} · {log.action} · {log.entity} · {log.actor?.email ?? log.actorRole ?? "system"}</p>
        ))}
        {logs.length === 0 ? <p>No audit records yet.</p> : null}
      </Card>
    </div>
  );
}
