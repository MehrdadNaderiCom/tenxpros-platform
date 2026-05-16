import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

export default async function PaymentsPage() {
  const payments = await prisma.paymentRecord.findMany({
    include: { application: true, participant: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Payments" description="Manual payment records and enrollment evidence." />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-navy-900 text-left text-white"><tr><th className="px-4 py-3">Person</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Paid</th></tr></thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-neutral-100">
                <td className="px-4 py-3">{payment.participant?.user.email ?? payment.application?.email ?? "Unknown"}</td>
                <td className="px-4 py-3">{formatCurrency(payment.amount, payment.currency)}</td>
                <td className="px-4 py-3"><Badge status={payment.status}>{payment.status}</Badge></td>
                <td className="px-4 py-3">{payment.paidAt?.toLocaleString() ?? "Not paid"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {payments.length === 0 ? (
        <EmptyState
          eyebrow="No payments"
          title="No manual payment records have been created."
          description="At launch, accepted applicants receive manual Stripe Payment Links. Confirmed payments create records here."
          actionLabel="Review applications"
          actionHref="/admin/applications"
        />
      ) : null}
    </div>
  );
}
