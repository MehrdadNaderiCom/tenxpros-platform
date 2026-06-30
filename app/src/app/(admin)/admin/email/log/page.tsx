import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FilterPill } from "@/components/ui/filter-pill";
import { Table, THead, Th, TBody, TR, Td } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

const STATUS_FILTERS = ["sent", "error"] as const;

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
        <FilterPill label="All" href="/admin/email/log" active={!status} />
        {STATUS_FILTERS.map((s) => (
          <FilterPill key={s} label={s} href={`/admin/email/log?status=${s}`} active={status === s} />
        ))}
      </div>

      <Alert tone="neutral">
        “sent” means our mail server accepted the message for delivery. If a recipient address is invalid, the
        receiving provider can still bounce it afterwards; bounce notices arrive in the hello@tenxpros.com inbox.
        “error” means our own server rejected or failed the send.
      </Alert>

      {emails.length ? (
        <Card className="overflow-x-auto p-0">
          <Table minWidth="min-w-[820px]">
            <THead>
              <Th>When</Th>
              <Th>Template</Th>
              <Th>To</Th>
              <Th>Subject</Th>
              <Th>Status</Th>
            </THead>
            <TBody>
              {emails.map((email, index) => (
                <TR key={email.id} className={index % 2 ? "bg-neutral-50" : "bg-white"}>
                  <Td className="text-xs text-slate-500">{email.createdAt.toLocaleString()}</Td>
                  <Td>{email.template}</Td>
                  <Td>{email.to}</Td>
                  <Td>
                    {email.subject}
                    {email.error ? <span className="block text-xs text-red-600">{email.error}</span> : null}
                  </Td>
                  <Td>
                    <Badge status={email.status === "sent" ? "ACCEPTED" : "HOLD"}>{email.status}</Badge>
                  </Td>
                </TR>
              ))}
            </TBody>
          </Table>
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
