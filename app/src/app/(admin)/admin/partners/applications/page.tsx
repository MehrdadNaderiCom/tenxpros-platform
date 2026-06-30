import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deletePartnerApplication } from "@/lib/actions/partner-admin";
import { PARTNER_APPLICATION_STATUS_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
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
      <Table minWidth="min-w-[860px]">
        <THead>
          <Th>Applicant</Th>
          <Th>Country</Th>
          <Th>Sells to</Th>
          <Th>Status</Th>
          <Th>Submitted</Th>
          <Th className="text-right">Review / edit</Th>
          <Th className="text-right">Delete</Th>
        </THead>
        <TBody>
          {applications.map((a) => (
            <TR key={a.id}>
              <Td>
                <Link href={`/admin/partners/applications/${a.id}`} className="font-medium text-navy-900 hover:underline">
                  {a.fullName}
                </Link>
                <p className="text-xs text-slate-500">{a.email}</p>
              </Td>
              <Td>{a.country}</Td>
              <Td>{a.audience}</Td>
              <Td>
                <Badge status={BADGE[a.status]}>{PARTNER_APPLICATION_STATUS_LABELS[a.status]}</Badge>
              </Td>
              <Td className="text-slate-600">{a.createdAt.toLocaleDateString()}</Td>
              <Td className="text-right">
                <Link href={`/admin/partners/applications/${a.id}`} className="font-medium text-navy-600 hover:underline">
                  {a.partner ? "View" : "Review"}
                </Link>
              </Td>
              <Td className="text-right">
                {a.partner ? (
                  <span className="text-xs text-slate-400">Approved</span>
                ) : (
                  <div className="flex justify-end">
                    <ConfirmSubmit
                      action={deletePartnerApplication}
                      hidden={{ applicationId: a.id }}
                      message={`Permanently delete the application from "${a.fullName}"? This also removes any uploaded resume or cover letter and cannot be undone.`}
                      label="Delete"
                    />
                  </div>
                )}
              </Td>
            </TR>
          ))}
          {applications.length === 0 ? (
            <TableEmpty colSpan={7}>
              No partner applications yet.
            </TableEmpty>
          ) : null}
        </TBody>
      </Table>
    </div>
  );
}
