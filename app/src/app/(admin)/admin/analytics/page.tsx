import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";
import { formatCurrency } from "@/lib/utils";
import { applicationStatusLabel } from "@/lib/application-labels";
import {
  applicationCounts,
  certificationCounts,
  emailCounts,
  participantCounts,
  paymentSummary,
} from "@/lib/admin-metrics";

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-navy-900">{value}</p>
      {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
    </Card>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
      {rows.length ? (
        <dl className="space-y-1.5 text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-neutral-100 pb-1.5 last:border-0"
            >
              <dt className="text-slate-600">{row.label}</dt>
              <dd className="font-semibold text-navy-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-500">No data yet.</p>
      )}
    </Card>
  );
}

export default async function AnalyticsPage() {
  const [apps, participants, certs, emails, payments] = await Promise.all([
    applicationCounts(),
    participantCounts(),
    certificationCounts(),
    emailCounts(),
    paymentSummary(),
  ]);

  const APP_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REVISE_AND_REAPPLY", "NOT_ACCEPTED", "ENROLLED"];
  const PAY_STATUSES = ["PENDING", "INSTRUCTIONS_SENT", "PAID", "WAIVED", "FAILED", "CANCELLED", "REFUNDED"];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Live operational overview across admissions, participants, revenue, and credentials."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Applications" value={String(apps.total)} sub={`${apps.byKey["ENROLLED"] ?? 0} enrolled`} />
        <StatCard
          label="Participants"
          value={String(participants.total)}
          sub={`${participants.byKey["CERTIFIED"] ?? 0} certified`}
        />
        <StatCard
          label="Revenue collected"
          value={formatCurrency(payments.collected)}
          sub={`${formatCurrency(payments.outstanding)} outstanding`}
        />
        <StatCard label="Emails sent" value={String(emails.byKey["sent"] ?? 0)} sub={`${emails.byKey["error"] ?? 0} failed`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Breakdown
          title="Applications by status"
          rows={APP_STATUSES.filter((s) => apps.byKey[s]).map((s) => ({
            label: applicationStatusLabel(s),
            value: String(apps.byKey[s]),
          }))}
        />
        <Breakdown
          title="Participants by status"
          rows={Object.entries(participants.byKey).map(([s, n]) => ({ label: humanize(s), value: String(n) }))}
        />
        <Breakdown
          title="Payments by status"
          rows={PAY_STATUSES.filter((s) => payments.byStatus[s]).map((s) => ({
            label: humanize(s),
            value: `${payments.byStatus[s].count} · ${formatCurrency(payments.byStatus[s].amount)}`,
          }))}
        />
      </div>

      <Breakdown
        title="Certification outcomes"
        rows={Object.entries(certs.byKey).map(([s, n]) => ({ label: humanize(s), value: String(n) }))}
      />

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Deeper analytics</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/admin/analytics/funnel"
            className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
          >
            Conversion funnel →
          </Link>
          <Link
            href="/admin/analytics/cohorts"
            className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
          >
            Cohorts →
          </Link>
          <Link
            href="/admin/analytics/marketing"
            className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
          >
            Marketing attribution →
          </Link>
        </div>
      </Card>
    </div>
  );
}
