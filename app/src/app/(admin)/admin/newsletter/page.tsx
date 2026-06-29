import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewsletterEditor } from "@/components/admin/newsletter-editor";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { createCampaign, deleteCampaign } from "@/lib/actions/newsletter";

export const dynamic = "force-dynamic";

export default async function NewsletterComposePage({ searchParams }: { searchParams: { error?: string } }) {
  const [groups, subscribers, campaigns, subscribedCount] = await Promise.all([
    prisma.newsletterGroup.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { subscribers: true } } } }),
    prisma.newsletterSubscriber.findMany({ where: { status: "subscribed" }, orderBy: { createdAt: "desc" } }),
    prisma.newsletterCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.newsletterSubscriber.count({ where: { status: "subscribed" } }),
  ]);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Newsletter" description="Compose and send campaigns from the send-only newsletter mailbox. Every send is recorded with a full per-recipient history." />
        <ButtonLink href="/admin/newsletter/subscribers" variant="secondary" size="sm">Subscribers & groups</ButtonLink>
      </div>

      {searchParams.error === "empty" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">A campaign needs both a subject and a body before it can be saved.</p>
      ) : null}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">Compose a campaign</h2>
          <span className="text-xs text-slate-500">{subscribedCount} subscribed</span>
        </div>
        <form action={createCampaign} className="mt-4 space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-navy-900">Subject</label>
            <input id="subject" name="subject" required className="mt-1 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm" />
          </div>
          <div>
            <span className="block text-sm font-medium text-navy-900">Body</span>
            <p className="mb-1 text-xs text-slate-500">Write it like a blog post: headings, bold, lists, quotes, and links.</p>
            <NewsletterEditor name="body" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="rounded-md border border-neutral-200 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Target groups</legend>
              {groups.length === 0 ? <p className="text-sm text-slate-500">No groups yet.</p> : null}
              <div className="space-y-1">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="groupIds" value={g.id} className="h-4 w-4" />
                    {g.name} <span className="text-xs text-slate-400">({g._count.subscribers})</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="max-h-48 overflow-y-auto rounded-md border border-neutral-200 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Target individuals</legend>
              <div className="space-y-1">
                {subscribers.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="subscriberIds" value={s.id} className="h-4 w-4" />
                    {s.email}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <p className="text-xs text-slate-500">Recipients are the deduplicated union of the chosen groups and individuals, only those still subscribed. Sent from newsletter@tenxops.org with one-click unsubscribe.</p>
          <Button type="submit">Save as draft</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Campaigns</h2>
        <div className="mt-4 space-y-3">
          {campaigns.length === 0 ? <p className="text-sm text-slate-500">No campaigns yet.</p> : null}
          {campaigns.map((c) => {
            const gids = (c.targetGroupIds as unknown as string[]) ?? [];
            const sids = (c.targetSubscriberIds as unknown as string[]) ?? [];
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-navy-900">{c.subject}</p>
                    <Badge status={c.status === "sent" ? "PASSED" : "IN_PROGRESS"}>{c.status === "sent" ? "Sent" : c.status === "sending" ? "Sending" : "Draft"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {gids.length} group{gids.length === 1 ? "" : "s"}
                    {gids.length ? ` (${gids.map((id) => groupName.get(id) ?? "?").join(", ")})` : ""}, {sids.length} individual{sids.length === 1 ? "" : "s"}
                    {c.status === "sent" ? ` ${String.fromCharCode(183)} sent to ${c.sentCount} of ${c.recipientCount} on ${c.sentAt?.toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.status === "sent" ? (
                    <ButtonLink href={`/admin/newsletter/campaigns/${c.id}`} variant="secondary" size="sm">View history</ButtonLink>
                  ) : c.status === "sending" ? (
                    <ButtonLink href={`/admin/newsletter/campaigns/${c.id}`} variant="secondary" size="sm">View</ButtonLink>
                  ) : (
                    <ButtonLink href={`/admin/newsletter/campaigns/${c.id}`} size="sm">Review &amp; send</ButtonLink>
                  )}
                  <ConfirmSubmit
                    action={deleteCampaign}
                    hidden={{ id: c.id }}
                    message={`Delete the campaign "${c.subject}"? This also removes its send history.`}
                    label="Delete"
                    className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-neutral-50"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-xs text-slate-500">
        Need to manage who receives campaigns?{" "}
        <Link href="/admin/newsletter/subscribers" className="font-medium text-navy-900 hover:underline">Open subscribers and groups</Link>.
      </p>
    </div>
  );
}
