import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

const STATUS_FILTERS = ["sent", "error"] as const;

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

export default async function EmailLogPage({ searchParams }: { searchParams: { status?: string } }) {
  const raw = searchParams.status;
  const status = raw && (STATUS_FILTERS as readonly string[]).includes(raw) ? raw : undefined;

  const where: Prisma.EmailEventWhereInput | undefined = status ? { status } : undefined;
  const emails = await prisma.emailEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-8">
      <PageHeader title="Email log" description="Every transactional email event, newest first (latest 200)." />
      <Link href="/admin/email" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to email
      </Link>

      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" href="/admin/email/log" active={!status} />
        {STATUS_FILTERS.map((s) => (
          <FilterChip key={s} label={s} href={`/admin/email/log?status=${s}`} active={status === s} />
        ))}
      </div>

      <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs leading-5 text-slate-500">
        “sent” means our mail server accepted the message for delivery. If a recipient address is invalid, the
        receiving provider can still bounce it afterwards; bounce notices arrive in the hello@tenxpros.com inbox.
        “error” means our own server rejected or failed the send.
      </p>

      {emails.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-navy-900 text-left text-white">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email, index) => (
                <tr key={email.id} className={index % 2 ? "bg-neutral-50" : "bg-white"}>
                  <td className="px-4 py-3 text-xs text-slate-500">{email.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-3">{email.template}</td>
                  <td className="px-4 py-3">{email.to}</td>
                  <td className="px-4 py-3">
                    {email.subject}
                    {email.error ? <span className="block text-xs text-red-600">{email.error}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={email.status === "sent" ? "ACCEPTED" : "HOLD"}>{email.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState
          eyebrow="No email events"
          title={status ? `No "${status}" email events.` : "No email events yet."}
          description="Application, acceptance, payment, and enrollment emails are logged here after they send."
        />
      )}
    </div>
  );
}
