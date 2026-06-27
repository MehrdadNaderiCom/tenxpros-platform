import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PARTNER_APPLICATION_STATUS_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  NEW: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "NOT_COMPLETED",
};

export default async function PartnerApplicationsPage() {
  const applications = await prisma.partnerApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: { partner: { select: { id: true } } },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partner Applications"
        description="Review applicants. Approving creates the partner, starts the 90-day pilot, and records a Panel Confirmation."
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Sells to</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3 text-right">Review</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a, i) => (
              <tr key={a.id} className={i % 2 ? "bg-neutral-50" : "bg-white"}>
                <td className="px-4 py-3">
                  <Link href={`/admin/partners/applications/${a.id}`} className="font-medium text-navy-900 hover:underline">
                    {a.fullName}
                  </Link>
                  <p className="text-xs text-slate-500">{a.email}</p>
                </td>
                <td className="px-4 py-3">{a.country}</td>
                <td className="px-4 py-3">{a.audience}</td>
                <td className="px-4 py-3">
                  <Badge status={BADGE[a.status]}>{PARTNER_APPLICATION_STATUS_LABELS[a.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/partners/applications/${a.id}`} className="font-medium text-navy-600 hover:underline">
                    {a.partner ? "View" : "Review"}
                  </Link>
                </td>
              </tr>
            ))}
            {applications.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                  No partner applications yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
