import Link from "next/link";
import type { PaymentStatus as DbPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_STATUSES, formatPaymentMethod, formatPaymentStatus } from "@/lib/payment-terms";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({ searchParams }: { searchParams: { status?: string } }) {
  const raw = searchParams.status;
  const statusFilter =
    raw && (PAYMENT_STATUSES as readonly string[]).includes(raw) ? (raw as DbPaymentStatus) : undefined;

  const payments = await prisma.paymentRecord.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: { application: true, participant: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Payments" description="Manual payment records, terms, and enrollment evidence." />

      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" href="/admin/payments" active={!statusFilter} />
        {PAYMENT_STATUSES.map((status) => (
          <FilterChip
            key={status}
            label={formatPaymentStatus(status)}
            href={`/admin/payments?status=${status}`}
            active={statusFilter === status}
          />
        ))}
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
              <th className="px-4 py-3">Timeline</th>
              <th className="px-4 py-3">Application</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-neutral-100 align-top">
                <td className="px-4 py-3">
                  {payment.participant?.user.email ?? payment.application?.email ?? "Unknown"}
                </td>
                <td className="px-4 py-3">{formatCurrency(payment.amount, payment.currency)}</td>
                <td className="px-4 py-3">{formatPaymentMethod(payment.method)}</td>
                <td className="px-4 py-3">
                  <Badge status={payment.status}>{formatPaymentStatus(payment.status)}</Badge>
                </td>
                <td className="px-4 py-3">{payment.dueAt?.toLocaleDateString() ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {payment.instructionsSentAt ? <div>Sent {payment.instructionsSentAt.toLocaleDateString()}</div> : null}
                  {payment.paidAt ? <div>Paid {payment.paidAt.toLocaleDateString()}</div> : null}
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
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {payments.length === 0 ? (
        <EmptyState
          eyebrow="No payments"
          title={statusFilter ? "No payment records with this status." : "No manual payment records have been created."}
          description="Accepted applicants receive manual payment instructions. Confirmed, waived, or cancelled payments appear here."
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
