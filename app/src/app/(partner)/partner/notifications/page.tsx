import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/auth";
import { prisma } from "@/lib/prisma";
import { markAllPartnerNotificationsRead, markPartnerNotificationRead } from "@/lib/actions/partner-notifications";
import { PageHeader, EmptyState } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PartnerNotificationsPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const notifications = await prisma.partnerNotification.findMany({
    where: { partnerId: current.partner.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.isRead).length;
  const readOnly = Boolean(current.preview);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Notifications" description="Updates about your Academy lessons and partner program." />
        {unread > 0 && !readOnly ? (
          <form action={markAllPartnerNotificationsRead}>
            <Button type="submit" variant="secondary" size="sm">
              Mark all read
            </Button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          eyebrow="All clear"
          title="No notifications yet"
          description="When a lesson you can see is updated, or there is partner program news, it will show up here."
          actionLabel="Go to the Academy"
          actionHref="/partner/academy"
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={n.isRead ? "" : "border-navy-200 bg-navy-50/40"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {!n.isRead ? <Badge status="IN_PROGRESS">New</Badge> : null}
                    <h2 className="text-base font-semibold text-navy-900">{n.title}</h2>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{n.body}</p>
                  <p className="text-xs text-slate-400">{n.createdAt.toLocaleString()}</p>
                  {n.url ? (
                    <Link href={n.url} className="text-sm font-medium text-navy-600 underline">
                      Open the lesson
                    </Link>
                  ) : null}
                </div>
                {!n.isRead && !readOnly ? (
                  <form action={markPartnerNotificationRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Mark read
                    </Button>
                  </form>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
