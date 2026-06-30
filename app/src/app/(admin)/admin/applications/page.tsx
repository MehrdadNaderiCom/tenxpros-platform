import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
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
      <Table minWidth="min-w-[960px]">
        <THead>
          <Th>Applicant</Th>
          <Th>Domain</Th>
          <Th>AI familiarity</Th>
          <Th>Tier</Th>
          <Th>Status</Th>
          <Th>Submitted</Th>
          <Th className="text-right">Actions</Th>
        </THead>
        <TBody>
          {applications.map((application) => (
            <TR key={application.id}>
              <Td>
                <Link href={`/admin/applications/${application.id}`} className="font-medium text-navy-900 hover:underline">
                  {application.fullName}
                </Link>
                <p className="text-xs text-slate-500">{application.email}</p>
              </Td>
              <Td>{application.domain}</Td>
              <Td>{aiExperienceLabel(application.aiExperience)}</Td>
              <Td>{application.pricingTierAtApply ?? "FOUNDING"}</Td>
              <Td>
                <Badge status={application.status}>{applicationStatusLabel(application.status)}</Badge>
              </Td>
              <Td>{application.createdAt.toLocaleDateString()}</Td>
              <Td>
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
              </Td>
            </TR>
          ))}
          {applications.length === 0 ? (
            <TableEmpty colSpan={7}>
              No applications yet. New Founding Charter applications will appear here for fit review, decision notes, payment link handling, and enrollment.
            </TableEmpty>
          ) : null}
        </TBody>
      </Table>
    </div>
  );
}
