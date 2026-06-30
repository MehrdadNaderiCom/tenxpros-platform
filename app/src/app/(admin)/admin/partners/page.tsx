import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { setPartnerStatus } from "@/lib/actions/partner-admin";
import { PARTNER_STATUS_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  APPLICANT: "SUBMITTED",
  PILOT: "IN_PROGRESS",
  TIER1: "ACTIVE",
  TIER2: "ACTIVE",
  TIER3: "CERTIFIED",
  INACTIVE: "CLOSED",
  TERMINATED: "NOT_COMPLETED",
};

export default async function AdminPartnersPage() {
  const partners = await prisma.partner.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { registeredAccounts: true, closedDeals: true, dealRegistrations: true } },
    },
  });

  const [appCount, submittedDeals] = await Promise.all([
    prisma.partnerApplication.count({ where: { status: { in: ["NEW", "UNDER_REVIEW"] } } }),
    prisma.dealRegistration.count({ where: { status: "SUBMITTED" } }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partners"
        description="The roster of partners. Open a partner to manage tier, status, deals, commissions, and per-partner configuration overrides."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Pending applications</p>
            <p className="mt-1 text-2xl font-semibold text-navy-900">{appCount}</p>
          </div>
          <ButtonLink href="/admin/partners/applications" size="sm" variant="secondary">
            Review
          </ButtonLink>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Deal registrations to confirm</p>
            <p className="mt-1 text-2xl font-semibold text-navy-900">{submittedDeals}</p>
          </div>
          <ButtonLink href="/admin/partners/deal-registrations" size="sm" variant="secondary">
            Open queue
          </ButtonLink>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Active partners</p>
            <p className="mt-1 text-2xl font-semibold text-navy-900">
              {partners.filter((p) => ["PILOT", "TIER1", "TIER2", "TIER3"].includes(p.status)).length}
            </p>
          </div>
          <ButtonLink href="/admin/partners/config" size="sm" variant="secondary">
            Configuration
          </ButtonLink>
        </Card>
      </div>

      <Table minWidth="min-w-[860px]">
        <THead>
          <Th>Partner</Th>
          <Th>Status</Th>
          <Th>Tier</Th>
          <Th>Active</Th>
          <Th>Accounts</Th>
          <Th>Deals</Th>
          <Th className="text-right">Actions</Th>
        </THead>
        <TBody>
          {partners.map((p) => (
            <TR key={p.id}>
              <Td>
                <Link href={`/admin/partners/${p.id}`} className="font-medium text-navy-900 hover:underline">
                  {p.displayName}
                </Link>
                <p className="text-xs text-slate-500">{p.contactEmail}</p>
              </Td>
              <Td>
                <Badge status={BADGE[p.status]}>{PARTNER_STATUS_LABELS[p.status]}</Badge>
              </Td>
              <Td>{p.tier}</Td>
              <Td>{p.activeStatus ? "Yes" : "No"}</Td>
              <Td>{p._count.registeredAccounts}</Td>
              <Td>{p._count.closedDeals}</Td>
              <Td>
                <div className="flex items-center justify-end gap-3">
                  {p.activeStatus ? (
                    <form action={setPartnerStatus}>
                      <input type="hidden" name="partnerId" value={p.id} />
                      <input type="hidden" name="action" value="DEACTIVATE" />
                      <Button type="submit" size="sm" variant="ghost">Pause</Button>
                    </form>
                  ) : (
                    <form action={setPartnerStatus}>
                      <input type="hidden" name="partnerId" value={p.id} />
                      <input type="hidden" name="action" value="ACTIVATE" />
                      <Button type="submit" size="sm" variant="ghost">Reactivate</Button>
                    </form>
                  )}
                  <a
                    href={`/admin/impersonate/partner/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-slate-500 hover:text-navy-700 hover:underline"
                  >
                    Panel
                  </a>
                  <Link href={`/admin/partners/${p.id}`} className="font-medium text-navy-600 hover:underline">
                    Manage
                  </Link>
                </div>
              </Td>
            </TR>
          ))}
          {partners.length === 0 ? (
            <TableEmpty colSpan={7}>
              No partners yet. Approve an application to create the first partner.
            </TableEmpty>
          ) : null}
        </TBody>
      </Table>
    </div>
  );
}
