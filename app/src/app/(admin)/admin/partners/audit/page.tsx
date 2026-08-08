import { prisma } from "@/lib/prisma";
import { PARTNER_AUDIT_ENTITIES } from "@/lib/partner/audit";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
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
        description="Every Panel Confirmation, approval, tier change and configuration change, who, what, and when. PANEL_* actions are the authoritative confirmations."
      />
      <Table minWidth="min-w-[860px]">
        <THead>
          <Th>When</Th>
          <Th>Actor</Th>
          <Th>Action</Th>
          <Th>Entity</Th>
          <Th>Changes</Th>
        </THead>
        <TBody>
          {entries.map((e) => (
            <TR key={e.id}>
              <Td className="whitespace-nowrap text-slate-600">{e.createdAt.toLocaleString()}</Td>
              <Td className="text-slate-700">
                {e.actor?.email ?? e.actorEmailSnapshot ?? e.actor?.name ?? e.actorNameSnapshot ?? (e.actorRole ?? "system")}
              </Td>
              <Td>
                {e.action.startsWith("PANEL_") ? (
                  <Badge status="APPROVED">{e.action}</Badge>
                ) : (
                  <span className="font-medium text-navy-900">{e.action}</span>
                )}
              </Td>
              <Td className="text-slate-600">
                {e.entity}
                {e.entityId ? <span className="block text-xs text-slate-400">{e.entityId}</span> : null}
              </Td>
              <Td className="max-w-md">
                <pre className="whitespace-pre-wrap break-words text-xs text-slate-500">
                  {e.changes ? JSON.stringify(e.changes) : "-"}
                </pre>
              </Td>
            </TR>
          ))}
          {entries.length === 0 ? (
            <TableEmpty colSpan={5}>
              No partner-program audit entries yet.
            </TableEmpty>
          ) : null}
        </TBody>
      </Table>
    </div>
  );
}
