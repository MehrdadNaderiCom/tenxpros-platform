import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { absoluteUrl } from "@/lib/utils";
import { ACADEMY_MODULE_COUNT } from "@/lib/academy/engine";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function PartnerAcademyAdminPage() {
  await requireSuperAdmin();
  const [partners, badges, passedRows, publishedModules] = await Promise.all([
    prisma.partner.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, displayName: true, status: true } }),
    prisma.partnerAcademyBadge.findMany({ select: { partnerId: true, serial: true, year: true, awardedAt: true } }),
    prisma.academyProgress.groupBy({ by: ["partnerId"], where: { examPassed: true }, _count: { _all: true } }),
    prisma.academyModule.count({ where: { isPublished: true } }),
  ]);
  const badgeBy = new Map(badges.map((b) => [b.partnerId, b]));
  const passedBy = new Map(passedRows.map((r) => [r.partnerId, r._count._all]));
  const total = publishedModules || ACADEMY_MODULE_COUNT;

  return (
    <div className="space-y-8">
      <PageHeader title="Partner Academy" description="Certificates and per-partner progress. Issue, renew, or revoke a certificate, and manually mark modules complete. Everything here is superadmin only." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          ["Partners", partners.length],
          ["Certificates issued", badges.length],
          ["Fully completed", partners.filter((p) => (passedBy.get(p.id) ?? 0) >= total).length],
        ].map(([label, value]) => (
          <Card key={label as string} className="text-center">
            <p className="text-2xl font-semibold text-navy-900">{value as number}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label as string}</p>
          </Card>
        ))}
      </div>

      <Table minWidth="min-w-[760px]">
        <THead>
          <Th>Partner</Th>
          <Th>Modules passed</Th>
          <Th>Certificate</Th>
          <Th>Manage</Th>
        </THead>
        <TBody>
          {partners.map((p) => {
            const passed = passedBy.get(p.id) ?? 0;
            const badge = badgeBy.get(p.id);
            return (
              <TR key={p.id}>
                <Td className="font-medium text-navy-900">{p.displayName}</Td>
                <Td>
                  <span className={passed >= total ? "font-medium text-emerald-700" : "text-slate-600"}>{passed} / {total}</span>
                </Td>
                <Td>
                  {badge ? (
                    <span className="inline-flex items-center gap-2">
                      <Badge status="PASSED">{badge.year}</Badge>
                      <Link href={absoluteUrl(`/academy/verify/${badge.serial}`)} className="text-xs text-navy-600 underline" target="_blank">{badge.serial}</Link>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Not issued</span>
                  )}
                </Td>
                <Td>
                  <ButtonLink href={`/admin/partners/academy/${p.id}`} variant="secondary" size="sm">Manage</ButtonLink>
                </Td>
              </TR>
            );
          })}
          {partners.length === 0 ? <TableEmpty colSpan={4}>No partners yet.</TableEmpty> : null}
        </TBody>
      </Table>
    </div>
  );
}
