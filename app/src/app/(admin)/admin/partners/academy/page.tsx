import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { absoluteUrl } from "@/lib/utils";
import { ACADEMY_MODULE_COUNT } from "@/lib/academy/engine";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

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

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Modules passed</th>
              <th className="px-4 py-3">Certificate</th>
              <th className="px-4 py-3">Manage</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => {
              const passed = passedBy.get(p.id) ?? 0;
              const badge = badgeBy.get(p.id);
              return (
                <tr key={p.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3 font-medium text-navy-900">{p.displayName}</td>
                  <td className="px-4 py-3">
                    <span className={passed >= total ? "font-medium text-emerald-700" : "text-slate-600"}>{passed} / {total}</span>
                  </td>
                  <td className="px-4 py-3">
                    {badge ? (
                      <span className="inline-flex items-center gap-2">
                        <Badge status="PASSED">{badge.year}</Badge>
                        <Link href={absoluteUrl(`/academy/verify/${badge.serial}`)} className="text-xs text-navy-600 underline" target="_blank">{badge.serial}</Link>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Not issued</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ButtonLink href={`/admin/partners/academy/${p.id}`} variant="secondary" size="sm">Manage</ButtonLink>
                  </td>
                </tr>
              );
            })}
            {partners.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">No partners yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
