import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import {
  adminAddSubscriber,
  adminSetSubscriberStatus,
  createNewsletterGroup,
  deleteNewsletterGroup,
  toggleGroupMembership,
  forceDeleteSubscriber,
} from "@/lib/actions/newsletter";

export const dynamic = "force-dynamic";

export default async function NewsletterSubscribersPage() {
  const [subscribers, groups, subscribedCount, unsubscribedCount] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, include: { groups: true, _count: { select: { deliveries: true } } } }),
    prisma.newsletterGroup.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { subscribers: true } } } }),
    prisma.newsletterSubscriber.count({ where: { status: "subscribed" } }),
    prisma.newsletterSubscriber.count({ where: { status: "unsubscribed" } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Subscribers & groups" description="Manage who receives the newsletter. Toggle a subscription, permanently remove an address, or organize subscribers into groups." />
        <ButtonLink href="/admin/newsletter" variant="secondary" size="sm">Compose & campaigns</ButtonLink>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          ["Subscribed", subscribedCount],
          ["Unsubscribed", unsubscribedCount],
          ["Groups", groups.length],
        ].map(([label, value]) => (
          <Card key={label as string} className="text-center">
            <p className="text-2xl font-semibold text-navy-900">{value as number}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label as string}</p>
          </Card>
        ))}
      </div>

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
              <ConfirmSubmit action={deleteNewsletterGroup} hidden={{ id: g.id }} message={`Delete the group "${g.name}"? Subscribers are kept; only the group is removed.`} label="Delete" className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-neutral-50" />
            </div>
          ))}
        </div>
      </Card>

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
                    {s._count.deliveries > 0 ? <span className="text-xs text-slate-400">{s._count.deliveries} sent</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={adminSetSubscriberStatus}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value={s.status === "subscribed" ? "unsubscribed" : "subscribed"} />
                      <Button type="submit" size="sm" variant="secondary">{s.status === "subscribed" ? "Unsubscribe" : "Resubscribe"}</Button>
                    </form>
                    <ConfirmSubmit
                      action={forceDeleteSubscriber}
                      hidden={{ id: s.id }}
                      message={`Permanently delete ${s.email}? This completely removes the record and cannot be undone. To simply stop emails, use Unsubscribe instead.`}
                      label="Force delete"
                    />
                  </div>
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
