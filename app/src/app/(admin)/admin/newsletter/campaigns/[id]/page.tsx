import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveTargetStats } from "@/lib/newsletter/service";
import { buildNewsletterEmail } from "@/lib/email/newsletter-template";
import { newsletterFrom } from "@/lib/services/newsletter-email";
import { absoluteUrl } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sendTestCampaign, sendCampaign } from "@/lib/actions/newsletter";

export const dynamic = "force-dynamic";

const NL_HTML =
  "[&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy-900 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-navy-900 [&_p]:my-2 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-slate-700 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:text-sm [&_li]:text-slate-700 [&_a]:text-navy-600 [&_a]:underline [&_strong]:text-navy-900";

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-navy-900">{value}</dd>
    </div>
  );
}

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; test?: string; to?: string; expected?: string };
}) {
  const campaign = await prisma.newsletterCampaign.findUnique({
    where: { id: params.id },
    include: { deliveries: { orderBy: { createdAt: "asc" }, include: { subscriber: { select: { status: true } } } } },
  });
  if (!campaign) notFound();

  const groupIds = (campaign.targetGroupIds as unknown as string[]) ?? [];
  const subscriberIds = (campaign.targetSubscriberIds as unknown as string[]) ?? [];
  const sentGroupIds = (campaign.sentGroupIds as unknown as string[]) ?? groupIds;
  const groups = await prisma.newsletterGroup.findMany({
    where: { id: { in: Array.from(new Set([...groupIds, ...sentGroupIds])) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(groups.map((g) => [g.id, g.name]));
  const isSent = campaign.status === "sent";

  // ---- Sent: immutable snapshot + delivery history ----
  if (isSent) {
    const ok = campaign.deliveries.filter((d) => d.status === "sent").length;
    const failed = campaign.deliveries.length - ok;
    const bodyHtml = campaign.sentBodyHtml ?? campaign.bodyHtml;
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeader title={campaign.sentSubject ?? campaign.subject} description="Immutable record of exactly what was sent, to whom, and when. Later draft edits never change this." />
          <ButtonLink href="/admin/newsletter" variant="secondary" size="sm">Back to campaigns</ButtonLink>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Sent snapshot</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Meta label="Subject" value={campaign.sentSubject ?? campaign.subject} />
            <Meta label="From" value={campaign.sentFromAddress ?? newsletterFrom()} />
            <Meta label="Reply-To" value="Send-only (replies not monitored)" />
            <Meta label="Sent at" value={campaign.sentAt ? `${campaign.sentAt.toISOString()}` : "n/a"} />
            <Meta label="Recipients" value={`${ok} delivered / ${campaign.recipientCount} (${failed} failed)`} />
            <Meta label="Groups" value={sentGroupIds.length ? sentGroupIds.map((id) => nameOf.get(id) ?? "?").join(", ") : "individuals only"} />
            <Meta label="Unsubscribe" value={campaign.sentUnsubVersion ?? "one-click"} />
            <Meta label="Template version" value={campaign.sentTemplateVersion ?? "nl-1"} />
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Message that was sent</h2>
          <div className={`mt-3 ${NL_HTML}`} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </Card>

        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-navy-900 text-left text-white">
              <tr>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Sent at</th>
                <th className="px-4 py-3">Current status</th>
              </tr>
            </thead>
            <tbody>
              {campaign.deliveries.map((d) => (
                <tr key={d.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3 text-navy-900">{d.email}</td>
                  <td className="px-4 py-3">
                    <Badge status={d.status === "sent" ? "PASSED" : "NOT_COMPLETED"}>{d.status === "sent" ? "Delivered" : "Failed"}</Badge>
                    {d.error ? <span className="ml-2 text-xs text-red-600">{d.error}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.sentAt ? d.sentAt.toISOString() : "Not sent"}</td>
                  <td className="px-4 py-3 text-slate-500">{d.subscriber ? d.subscriber.status : "removed"}</td>
                </tr>
              ))}
              {campaign.deliveries.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">No deliveries recorded.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  // ---- Draft: preview + send test + review + confirm ----
  const stats = await resolveTargetStats(groupIds, subscriberIds);
  const previewHtml = buildNewsletterEmail({
    subject: campaign.subject,
    bodyHtml: campaign.bodyHtml,
    unsubscribeUrl: absoluteUrl("/newsletter/unsubscribe/PREVIEW"),
  }).html;
  const from = newsletterFrom();
  const confirmError = searchParams.error === "confirm";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={campaign.subject} description="Review this campaign carefully, send yourself a test, then confirm. Nothing is sent until you type the recipient count and confirm." />
        <ButtonLink href="/admin/newsletter" variant="secondary" size="sm">Back to campaigns</ButtonLink>
      </div>

      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
        {["Draft", "Preview", "Send test", "Review", "Confirm send", "Sent"].map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 ${i <= 3 ? "bg-navy-900 text-white" : "bg-neutral-100 text-slate-500"}`}>{i + 1}. {step}</span>
            {i < 5 ? <span aria-hidden="true">{String.fromCharCode(8250)}</span> : null}
          </li>
        ))}
      </ol>

      {searchParams.test === "sent" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Test sent to {searchParams.to}. Check that inbox before sending for real.</p>
      ) : null}
      {searchParams.test === "error" ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">The test could not be sent to {searchParams.to}. Check the address and mail settings.</p>
      ) : null}
      {searchParams.test === "invalid" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">That test email address looked invalid.</p>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Review</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Meta label="Subject" value={campaign.subject} />
          <Meta label="From" value={from} />
          <Meta label="Reply-To" value="None (send-only, replies not monitored)" />
          <Meta label="Recipient groups" value={groupIds.length ? groupIds.map((id) => nameOf.get(id) ?? "?").join(", ") : "individuals only"} />
          <Meta label="Will send to" value={<span className="text-lg font-semibold text-navy-900">{stats.subscribed} subscribers</span>} />
          <Meta label="Excluded (unsubscribed)" value={`${stats.excluded}`} />
          <Meta label="One-click unsubscribe" value="Enabled (RFC 8058 header + in-body link)" />
          <Meta label="Send timestamp" value="Recorded the moment you confirm (UTC)" />
        </dl>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy-900">Final preview</h2>
          <span className="text-xs text-slate-500">Exactly what recipients will see</span>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr,375px]">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Desktop</p>
            <iframe title="Desktop preview" srcDoc={previewHtml} sandbox="" className="h-[560px] w-full rounded-md border border-neutral-200 bg-white" />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Mobile</p>
            <iframe title="Mobile preview" srcDoc={previewHtml} sandbox="" className="h-[560px] w-[375px] max-w-full rounded-md border border-neutral-200 bg-white" />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Send a test first</h2>
        <p className="mt-1 text-sm text-slate-600">Send one copy to yourself (or any address) to check it in a real inbox. This does not affect subscribers or the send history.</p>
        <form action={sendTestCampaign} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={campaign.id} />
          <input name="testEmail" type="email" placeholder="you@example.com" className="h-10 w-72 rounded-md border border-neutral-300 px-3 text-sm" />
          <Button type="submit" variant="secondary">Send test</Button>
        </form>
      </Card>

      <Card className="border-gold-500">
        <h2 className="text-lg font-semibold text-navy-900">Confirm and send</h2>
        <p className="mt-1 text-sm text-slate-600">
          This sends the campaign to <strong className="text-navy-900">{stats.subscribed}</strong> subscribed people from {from}. To prevent an accidental send, type the recipient
          count below, then confirm.
        </p>
        {confirmError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            The number did not match the current recipient count ({searchParams.expected ?? stats.subscribed}). Nothing was sent. Re-check and type the exact number to confirm.
          </p>
        ) : null}
        {stats.subscribed === 0 ? (
          <p className="mt-3 text-sm text-amber-700">There are no subscribed recipients in this target set, so there is nothing to send.</p>
        ) : (
          <form action={sendCampaign} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={campaign.id} />
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-navy-900">Type the recipient count to confirm</label>
              <input id="confirm" name="confirm" inputMode="numeric" autoComplete="off" required placeholder={String(stats.subscribed)} className="mt-1 h-10 w-40 rounded-md border border-neutral-300 px-3 text-sm" />
            </div>
            <Button type="submit" className="bg-gold-800 hover:bg-gold-800/90">Yes, send to {stats.subscribed} subscribers</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
