import Link from "next/link";
import type { Prisma, PaymentStatus as DbPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_STATUSES, formatPaymentMethod, formatPaymentStatus } from "@/lib/payment-terms";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

// Read-only "follow-up" views over the accepted-but-unpaid population. These back
// the dashboard's Payment follow-up report, which links here with ?follow=...
const FOLLOW_LABELS: Record<string, string> = {
  awaiting: "Awaiting payment",
  reminded: "Reminded (24h)",
  overdue: "Past deadline",
  notified: "Deadline notice sent",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { status?: string; follow?: string };
}) {
  const now = new Date();
  const raw = searchParams.status;
  const statusFilter =
    raw && (PAYMENT_STATUSES as readonly string[]).includes(raw) ? (raw as DbPaymentStatus) : undefined;
  const follow = searchParams.follow && FOLLOW_LABELS[searchParams.follow] ? searchParams.follow : undefined;

  const awaitingBase: Prisma.PaymentRecordWhereInput = {
    status: "INSTRUCTIONS_SENT",
    paidAt: null,
    waivedAt: null,
    cancelledAt: null,
  };
  const followWhere: Record<string, Prisma.PaymentRecordWhereInput> = {
    awaiting: awaitingBase,
    reminded: { ...awaitingBase, reminderSentAt: { not: null } },
    overdue: { ...awaitingBase, dueAt: { lt: now } },
    notified: { ...awaitingBase, expiryNoticeSentAt: { not: null } },
  };

  // follow takes precedence over status when both are present.
  const where: Prisma.PaymentRecordWhereInput | undefined = follow
    ? followWhere[follow]
    : statusFilter
      ? { status: statusFilter }
      : undefined;

  const payments = await prisma.paymentRecord.findMany({
    where,
    include: { application: true, participant: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Payments" description="Manual payment records, terms, and enrollment evidence." />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <FilterChip label="All" href="/admin/payments" active={!statusFilter && !follow} />
          {PAYMENT_STATUSES.map((status) => (
            <FilterChip
              key={status}
              label={formatPaymentStatus(status)}
              href={`/admin/payments?status=${status}`}
              active={!follow && statusFilter === status}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Follow-up</span>
          {Object.entries(FOLLOW_LABELS).map(([key, label]) => (
            <FilterChip key={key} label={label} href={`/admin/payments?follow=${key}`} active={follow === key} />
          ))}
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Follow-up timeline</th>
              <th className="px-4 py-3">Application</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const overdue =
                payment.status === "INSTRUCTIONS_SENT" && !payment.paidAt && payment.dueAt != null && payment.dueAt < now;
              return (
                <tr key={payment.id} className="border-b border-neutral-100 align-top">
                  <td className="px-4 py-3">
                    {payment.participant?.user.email ?? payment.application?.email ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(payment.amount, payment.currency)}</td>
                  <td className="px-4 py-3">{formatPaymentMethod(payment.method)}</td>
                  <td className="px-4 py-3">
                    <Badge status={payment.status}>{formatPaymentStatus(payment.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {payment.dueAt ? (
                      <span className={overdue ? "font-medium text-red-700" : ""}>
                        {payment.dueAt.toLocaleDateString()}
                        {overdue ? " (passed)" : ""}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {payment.instructionsSentAt ? <div>Instructions {payment.instructionsSentAt.toLocaleDateString()}</div> : null}
                    {payment.reminderSentAt ? <div className="text-amber-700">Reminder {payment.reminderSentAt.toLocaleDateString()}</div> : null}
                    {payment.expiryNoticeSentAt ? <div className="text-red-700">Deadline notice {payment.expiryNoticeSentAt.toLocaleDateString()}</div> : null}
                    {payment.paidAt ? <div className="text-emerald-700">Paid {payment.paidAt.toLocaleDateString()}</div> : null}
                    {payment.waivedAt ? <div>Waived {payment.waivedAt.toLocaleDateString()}</div> : null}
                    {payment.cancelledAt ? <div>Cancelled {payment.cancelledAt.toLocaleDateString()}</div> : null}
                    {!payment.instructionsSentAt && !payment.paidAt && !payment.waivedAt && !payment.cancelledAt ? (
                      <div>Created {payment.createdAt.toLocaleDateString()}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {payment.applicationId ? (
                      <Link className="text-navy-600 underline" href={`/admin/applications/${payment.applicationId}`}>
                        View
                      </Link>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {payments.length === 0 ? (
        <EmptyState
          eyebrow="No payments"
          title={follow ? `No records in "${FOLLOW_LABELS[follow]}".` : statusFilter ? "No payment records with this status." : "No manual payment records have been created."}
          description="Accepted applicants receive manual payment instructions, then automated reminders. Confirmed, waived, or cancelled payments appear here."
          actionLabel="Review applications"
          actionHref="/admin/applications"
        />
      ) : null}
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-white"
          : "rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-neutral-50"
      }
    >
      {label}
    </Link>
  );
}
