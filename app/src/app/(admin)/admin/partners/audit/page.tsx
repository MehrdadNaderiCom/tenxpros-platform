import { prisma } from "@/lib/prisma";
import { PARTNER_AUDIT_ENTITIES } from "@/lib/partner/audit";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerAuditPage() {
  const entries = await prisma.auditLog.findMany({
    where: { entity: { in: [...PARTNER_AUDIT_ENTITIES] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { email: true, name: true } } },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partner Program Audit Log"
        description="Every Panel Confirmation, approval, tier change and configuration change — who, what, and when. PANEL_* actions are the authoritative confirmations."
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Changes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id} className={i % 2 ? "bg-neutral-50" : "bg-white"}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{e.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-700">{e.actor?.email ?? e.actor?.name ?? (e.actorRole ?? "system")}</td>
                <td className="px-4 py-3">
                  {e.action.startsWith("PANEL_") ? (
                    <Badge status="APPROVED">{e.action}</Badge>
                  ) : (
                    <span className="font-medium text-navy-900">{e.action}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {e.entity}
                  {e.entityId ? <span className="block text-xs text-slate-400">{e.entityId}</span> : null}
                </td>
                <td className="max-w-md px-4 py-3">
                  <pre className="whitespace-pre-wrap break-words text-xs text-slate-500">
                    {e.changes ? JSON.stringify(e.changes) : "—"}
                  </pre>
                </td>
              </tr>
            ))}
            {entries.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                  No partner-program audit entries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
