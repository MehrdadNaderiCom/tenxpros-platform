import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { OFFERING_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerAccountsPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const accounts = await prisma.registeredAccount.findMany({
    where: { partnerId: current.partner.id },
    orderBy: { createdAt: "desc" },
    include: { closedDeals: true },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Accounts"
        description="Your confirmed Registered Accounts. Keep each one moving with a meaningful update so its protection does not lapse."
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Offering</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Closed deals</th>
              <th className="px-4 py-3">Protected until</th>
              <th className="px-4 py-3">State</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a, i) => (
              <tr key={a.id} className={i % 2 ? "bg-neutral-50" : "bg-white"}>
                <td className="px-4 py-3">
                  <p className="font-medium text-navy-900">{a.legalEntity}</p>
                  <p className="text-xs text-slate-500">{a.country}{a.businessUnit ? ` · ${a.businessUnit}` : ""}</p>
                </td>
                <td className="px-4 py-3">{OFFERING_LABELS[a.offering]}</td>
                <td className="px-4 py-3 text-slate-600">{a.scope}</td>
                <td className="px-4 py-3">{a.closedDeals.length}</td>
                <td className="px-4 py-3 text-slate-600">{a.protectionExpiresAt?.toLocaleDateString() ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge status={a.lapsedAt ? "CLOSED" : "ACTIVE"}>{a.lapsedAt ? "Lapsed" : "Active"}</Badge>
                </td>
              </tr>
            ))}
            {accounts.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                  No confirmed accounts yet. Register an opportunity and it appears here once confirmed.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
