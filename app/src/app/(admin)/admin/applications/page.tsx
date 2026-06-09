import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";
import { aiExperienceLabel, applicationStatusLabel } from "@/lib/application-labels";
import { DeleteApplicationButton } from "@/components/admin/delete-application-button";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    include: { payments: true },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Applications"
        description="Review applicant fit, status, notes, payment readiness, and enrollment. Manage or remove each application individually."
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">AI familiarity</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application, index) => (
              <tr key={application.id} className={index % 2 ? "bg-neutral-50" : "bg-white"}>
                <td className="px-4 py-3">
                  <Link href={`/admin/applications/${application.id}`} className="font-medium text-navy-900 hover:underline">
                    {application.fullName}
                  </Link>
                  <p className="text-xs text-slate-500">{application.email}</p>
                </td>
                <td className="px-4 py-3">{application.domain}</td>
                <td className="px-4 py-3">{aiExperienceLabel(application.aiExperience)}</td>
                <td className="px-4 py-3">{application.pricingTierAtApply ?? "FOUNDING"}</td>
                <td className="px-4 py-3">
                  <Badge status={application.status}>{applicationStatusLabel(application.status)}</Badge>
                </td>
                <td className="px-4 py-3">{application.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/applications/${application.id}`}
                      className="font-medium text-navy-600 hover:underline"
                    >
                      Manage
                    </Link>
                    <DeleteApplicationButton
                      applicationId={application.id}
                      applicantName={application.fullName}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {applications.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                  No applications yet. New Founding Charter applications will appear here for fit review, decision notes, payment link handling, and enrollment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
