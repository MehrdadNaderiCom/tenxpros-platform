import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adminAddSubscriber,
  adminSetSubscriberStatus,
  createNewsletterGroup,
  deleteNewsletterGroup,
  toggleGroupMembership,
  createCampaign,
  sendCampaign,
  deleteCampaign,
} from "@/lib/actions/newsletter";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const [subscribers, groups, campaigns, subscribedCount, unsubscribedCount] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, include: { groups: true } }),
    prisma.newsletterGroup.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { subscribers: true } } } }),
    prisma.newsletterCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.newsletterSubscriber.count({ where: { status: "subscribed" } }),
    prisma.newsletterSubscriber.count({ where: { status: "unsubscribed" } }),
  ]);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div className="space-y-8">
      <PageHeader title="Newsletter" description="Subscribers, groups, and campaigns. Campaigns send through the existing email service, deduplicated and unsubscribed-aware, with a one-click unsubscribe link per recipient." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Subscribed", subscribedCount],
          ["Unsubscribed", unsubscribedCount],
          ["Groups", groups.length],
          ["Campaigns", campaigns.length],
        ].map(([label, value]) => (
          <Card key={label as string} className="text-center">
            <p className="text-2xl font-semibold text-navy-900">{value as number}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label as string}</p>
          </Card>
        ))}
      </div>

      {/* Compose campaign */}
      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Compose a campaign</h2>
        <form action={createCampaign} className="mt-4 space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-navy-900">Subject</label>
            <input id="subject" name="subject" required className="mt-1 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="body" className="block text-sm font-medium text-navy-900">Body</label>
            <textarea id="body" name="body" required rows={6} placeholder="Write the newsletter. Leave a blank line between paragraphs." className="mt-1 w-full rounded-md border border-neutral-300 p-3 text-sm" />
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
                {subscribers.filter((s) => s.status === "subscribed").map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="subscriberIds" value={s.id} className="h-4 w-4" />
                    {s.email}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <p className="text-xs text-slate-500">Recipients are the union of the chosen groups and individuals, deduplicated, and only those still subscribed.</p>
          <Button type="submit">Save as draft</Button>
        </form>
      </Card>

      {/* Campaigns list */}
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
                    <Badge status={c.status === "sent" ? "PASSED" : "IN_PROGRESS"}>{c.status === "sent" ? "Sent" : "Draft"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {gids.length} group{gids.length === 1 ? "" : "s"}
                    {gids.length ? ` (${gids.map((id) => groupName.get(id) ?? "?").join(", ")})` : ""}, {sids.length} individual{sids.length === 1 ? "" : "s"}
                    {c.status === "sent" ? ` ${String.fromCharCode(183)} sent to ${c.sentCount} on ${c.sentAt?.toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.status !== "sent" ? (
                    <form action={sendCampaign}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" size="sm">Send now</Button>
                    </form>
                  ) : null}
                  <form action={deleteCampaign}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" size="sm" variant="secondary">Delete</Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Groups */}
      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Groups</h2>
        <form action={createNewsletterGroup} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="g-name" className="block text-sm font-medium text-navy-900">Name</label>
            <input id="g-name" name="name" required className="mt-1 h-10 w-56 rounded-md border border-neutral-300 px-3 text-sm" />
          </div>
          <div className="flex-1">
            <label htmlFor="g-desc" className="block text-sm font-medium text-navy-900">Description</label>
            <input id="g-desc" name="description" className="mt-1 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm" />
          </div>
          <Button type="submit" size="sm">Add group</Button>
        </form>
        <div className="mt-4 space-y-2">
          {groups.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-2">
              <span className="text-sm text-navy-900">{g.name} <span className="text-xs text-slate-400">({g._count.subscribers})</span></span>
              <form action={deleteNewsletterGroup}>
                <input type="hidden" name="id" value={g.id} />
                <Button type="submit" size="sm" variant="secondary">Delete</Button>
              </form>
            </div>
          ))}
        </div>
      </Card>

      {/* Subscribers */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy-900">Subscribers</h2>
          <form action={adminAddSubscriber} className="flex items-end gap-2">
            <input name="email" type="email" required placeholder="add@example.com" className="h-9 w-56 rounded-md border border-neutral-300 px-3 text-sm" />
            <Button type="submit" size="sm">Add</Button>
          </form>
        </div>
        <div className="mt-4 space-y-2">
          {subscribers.length === 0 ? <p className="text-sm text-slate-500">No subscribers yet.</p> : null}
          {subscribers.map((s) => {
            const memberOf = new Set(s.groups.map((m) => m.groupId));
            return (
              <div key={s.id} className="rounded-md border border-neutral-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-navy-900">{s.email}</span>
                    <Badge status={s.status === "subscribed" ? "PASSED" : "NOT_COMPLETED"}>{s.status}</Badge>
                  </div>
                  <form action={adminSetSubscriberStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value={s.status === "subscribed" ? "unsubscribed" : "subscribed"} />
                    <Button type="submit" size="sm" variant="secondary">{s.status === "subscribed" ? "Unsubscribe" : "Resubscribe"}</Button>
                  </form>
                </div>
                {groups.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {groups.map((g) => {
                      const isMember = memberOf.has(g.id);
                      return (
                        <form key={g.id} action={toggleGroupMembership}>
                          <input type="hidden" name="subscriberId" value={s.id} />
                          <input type="hidden" name="groupId" value={g.id} />
                          <input type="hidden" name="add" value={isMember ? "0" : "1"} />
                          <button type="submit" className={`rounded-full px-2.5 py-0.5 text-xs transition ${isMember ? "bg-navy-900 text-white" : "border border-neutral-300 text-slate-600 hover:bg-neutral-50"}`}>
                            {g.name}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
