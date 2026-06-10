import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/form-field";
import { PageHeader } from "@/components/shared/page-shell";
import { emailCounts } from "@/lib/admin-metrics";

// Next.js pages may only export route fields, so this stays module-local.
const SENT_MEANING =
  "Sent means the TenXPros mail server accepted the message for delivery. If a recipient address is invalid, the receiving provider can still bounce it afterwards; bounce notices arrive in the hello@tenxpros.com inbox.";

export default async function EmailPage() {
  const [counts, recent] = await Promise.all([
    emailCounts(),
    prisma.emailEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Email"
        description="Transactional email delivery: status overview, recent activity, the full log, and the template catalog."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Sent
            <InfoTip id="email-sent-meaning" label="What sent means" text={SENT_MEANING} />
          </p>
          <p className="text-3xl font-semibold text-navy-900">{counts.byKey["sent"] ?? 0}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Failed</p>
          <p className="text-3xl font-semibold text-navy-900">{counts.byKey["error"] ?? 0}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total events</p>
          <p className="text-3xl font-semibold text-navy-900">{counts.total}</p>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/email/log"
          className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
        >
          Full email log →
        </Link>
        <Link
          href="/admin/email/templates"
          className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
        >
          Email templates →
        </Link>
      </div>

      <Card className="space-y-2">
        <h2 className="text-lg font-semibold text-navy-900">Recent activity</h2>
        {recent.map((email) => (
          <p key={email.id} className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-2 text-sm last:border-0">
            <span className="truncate text-slate-700">
              {email.template} · {email.to} · {email.subject}
            </span>
            <Badge status={email.status === "sent" ? "ACCEPTED" : "HOLD"}>{email.status}</Badge>
          </p>
        ))}
        {recent.length === 0 ? (
          <p className="text-sm text-slate-600">
            No email events yet. Application, acceptance, payment, and enrollment messages are logged here after they
            send.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
