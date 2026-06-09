import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";
import { formatCurrency } from "@/lib/utils";
import { applicationStatusLabel } from "@/lib/application-labels";
import { applicationCounts, certificationCounts, participantCounts, paymentSummary } from "@/lib/admin-metrics";

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SummaryTable({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
      {rows.length ? (
        <dl className="space-y-1.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b border-neutral-100 pb-1.5 last:border-0">
              <dt className="text-slate-600">{label}</dt>
              <dd className="font-semibold text-navy-900">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-500">No data yet.</p>
      )}
    </Card>
  );
}

const EXPORTS = [
  { type: "applications", label: "Applications", note: "Every application with answers, status, tier, and attribution." },
  { type: "participants", label: "Participants", note: "Enrolled participants with tier, status, and module progress." },
  { type: "payments", label: "Payments", note: "Payment records with amount, method, status, and timestamps." },
];

export default async function ReportsPage() {
  const [apps, participants, payments, certs] = await Promise.all([
    applicationCounts(),
    participantCounts(),
    paymentSummary(),
    certificationCounts(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Reports & exports" description="Operational summaries and downloadable CSV exports for offline analysis." />

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Download CSV</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {EXPORTS.map((item) => (
            <a
              key={item.type}
              href={`/admin/reports/export/${item.type}`}
              className="block rounded-md border border-neutral-200 px-4 py-3 transition hover:bg-navy-50"
            >
              <span className="block text-sm font-semibold text-navy-700">Download {item.label} ↓</span>
              <span className="mt-1 block text-xs text-slate-500">{item.note}</span>
            </a>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryTable
          title={`Applications (${apps.total})`}
          rows={Object.entries(apps.byKey).map(([s, n]) => [applicationStatusLabel(s), String(n)])}
        />
        <SummaryTable
          title={`Participants (${participants.total})`}
          rows={Object.entries(participants.byKey).map(([s, n]) => [humanize(s), String(n)])}
        />
        <SummaryTable
          title="Payments"
          rows={[
            ["Collected", formatCurrency(payments.collected)],
            ["Outstanding", formatCurrency(payments.outstanding)],
            ...Object.entries(payments.byStatus).map(
              ([s, v]) => [humanize(s), `${v.count} · ${formatCurrency(v.amount)}`] as [string, string],
            ),
          ]}
        />
        <SummaryTable
          title="Certifications"
          rows={Object.entries(certs.byKey).map(([s, n]) => [humanize(s), String(n)])}
        />
      </div>
    </div>
  );
}
