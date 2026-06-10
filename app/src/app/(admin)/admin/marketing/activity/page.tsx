import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-fields";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";
import { prisma } from "@/lib/prisma";
import { getActiveCampaign } from "@/lib/marketing/data";
import { channelLabel } from "@/lib/marketing/constants";
import { logDailyActivity } from "@/lib/actions/marketing";

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function MarketingActivityPage() {
  const campaign = await getActiveCampaign();
  if (!campaign) {
    return (
      <div className="space-y-8">
        <PageHeader title="Daily activity" description="Log outreach volume against quotas." />
        <EmptyState
          eyebrow="No active campaign"
          title="Create a campaign first."
          description="Daily quotas come from the campaign's channels."
          actionLabel="Open Campaigns"
          actionHref="/admin/marketing/campaigns"
        />
      </div>
    );
  }

  const today = utcDay(new Date());
  const since = new Date(Date.now() - 14 * 86_400_000);
  const logs = await prisma.marketingDailyLog.findMany({
    where: { campaignId: campaign.id, date: { gte: since } },
    orderBy: [{ date: "desc" }, { channel: "asc" }],
  });
  const todayLogs = Object.fromEntries(logs.filter((l) => utcDay(l.date) === today).map((l) => [l.channel, l]));
  const channels = campaign.channels.filter((c) => c.enabled);

  const totals = logs.reduce(
    (acc, log) => {
      acc.messages += log.messages;
      acc.replies += log.replies;
      acc.calls += log.calls;
      return acc;
    },
    { messages: 0, replies: 0, calls: 0 },
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Daily activity"
        description={`${campaign.name} · log what actually went out, per channel. The coach reads these numbers.`}
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-navy-900">Today ({today})</h2>
        <div className="grid gap-3">
          {channels.map((channel) => {
            const log = todayLogs[channel.channel];
            return (
              <form
                key={channel.id}
                action={logDailyActivity}
                className="grid grid-cols-2 items-end gap-3 rounded-md border border-neutral-200 p-3 md:grid-cols-6"
              >
                <input type="hidden" name="campaignId" value={campaign.id} />
                <input type="hidden" name="channel" value={channel.channel} />
                <input type="hidden" name="date" value={today} />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Channel</p>
                  <p className="text-sm font-medium text-navy-900">{channelLabel(channel.channel)}</p>
                  <p className="text-[11px] text-slate-400">
                    floor {channel.dailyMin} · cap {channel.dailyMax}/day, {channel.weeklyCap}/wk
                  </p>
                </div>
                <Field label="Messages">
                  <Input name="messages" type="number" min={0} defaultValue={log?.messages ?? 0} />
                </Field>
                <Field label="Replies">
                  <Input name="replies" type="number" min={0} defaultValue={log?.replies ?? 0} />
                </Field>
                <Field label="Calls">
                  <Input name="calls" type="number" min={0} defaultValue={log?.calls ?? 0} />
                </Field>
                <Field label="Note">
                  <Input name="notes" defaultValue={log?.notes ?? ""} />
                </Field>
                <Button type="submit" variant="secondary">
                  Save
                </Button>
              </form>
            );
          })}
          {channels.length === 0 ? (
            <p className="text-sm text-slate-500">
              No enabled channels. Add them in{" "}
              <Link href="/admin/marketing/campaigns" className="text-navy-600 hover:underline">
                Campaigns
              </Link>
              .
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-navy-900">Last 14 days</h2>
          <p className="text-xs text-slate-500">
            Totals: {totals.messages} messages · {totals.replies} replies · {totals.calls} calls
          </p>
        </div>
        {logs.length ? (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-navy-900 text-left text-white">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Messages</th>
                <th className="px-3 py-2">Replies</th>
                <th className="px-3 py-2">Calls</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={log.id} className={index % 2 ? "bg-neutral-50" : "bg-white"}>
                  <td className="px-3 py-2">{utcDay(log.date)}</td>
                  <td className="px-3 py-2">{channelLabel(log.channel)}</td>
                  <td className="px-3 py-2">{log.messages}</td>
                  <td className="px-3 py-2">{log.replies}</td>
                  <td className="px-3 py-2">{log.calls}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{log.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">Nothing logged yet. Save today's numbers above.</p>
        )}
      </Card>
    </div>
  );
}
