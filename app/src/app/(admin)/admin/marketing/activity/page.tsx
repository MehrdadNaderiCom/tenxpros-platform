import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-fields";
import { HintField } from "@/components/ui/hint-field";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";
import { prisma } from "@/lib/prisma";
import { getActiveCampaign } from "@/lib/marketing/data";
import { channelLabel } from "@/lib/marketing/constants";
import { logDailyActivity } from "@/lib/actions/marketing";
import { AiSuggestCard } from "@/components/admin/ai-suggest-card";

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
      acc.posts += log.posts;
      acc.engagements += log.engagements;
      return acc;
    },
    { messages: 0, replies: 0, calls: 0, posts: 0, engagements: 0 },
  );

  const todayProgress = channels.map((channel) => {
    const log = todayLogs[channel.channel];
    return {
      channel,
      bars: [
        { label: "Messages", done: log?.messages ?? 0, target: channel.dailyMin },
        { label: "Posts", done: log?.posts ?? 0, target: channel.postsPerDay },
        { label: "Engage", done: log?.engagements ?? 0, target: channel.engagePerDay },
      ].filter((bar) => bar.target > 0),
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Today"
        description={`${campaign.name} · your daily home: see the plan, do the work, log the numbers. Everything else updates from here.`}
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      {/* The real-world event -> click mapping, so nothing is ever ambiguous */}
      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-navy-900">
            📌 What do I click when… (the daily routine)
          </summary>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            <p className="text-xs text-slate-500">
              Morning: press <span className="font-medium">Plan my day</span> below → clear due follow-ups in{" "}
              <Link href="/admin/marketing/prospects" className="font-medium text-navy-600 hover:underline">Prospects</Link>{" "}
              → send new outreach → post content → write each attempt in the{" "}
              <Link href="/admin/marketing/journal" className="font-medium text-navy-600 hover:underline">Journal</Link>{" "}
              (it counts the numbers here for you). Then check{" "}
              <Link href="/admin/marketing" className="font-medium text-navy-600 hover:underline">Command</Link> for progress.
            </p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-neutral-100">
                {[
                  ["I messaged someone NEW", "Prospects → Quick add them (if not there) → press “Approached ✓”. Then write it in Journal (auto +1 Messages)."],
                  ["I sent a due follow-up", "Prospects (or Command) → press “FU sent ✓” on their row. Then Journal it as 'Follow-up sent'."],
                  ["They replied (yes OR no)", "Prospects → press “They replied”. Then Journal it: what they said, your read on it."],
                  ["We had a real back-and-forth (WhatsApp/DM thread or call)", "Prospects → “Convo planned” / “Convo held”. Journal it as 'Deep conversation' (auto +1 Convos)."],
                  ["I published a post", "Journal it as 'Published a post' (auto +1 Posts). Nothing else."],
                  ["I commented / reacted / followed someone (ICP)", "Journal it as 'Engagement' (auto +1 Engage). Nothing else."],
                  ["They applied on the site", "Command → “Sync pipeline with real applications” links and advances them automatically."],
                  ["They said no / went silent after FU3", "Prospects → “Lost” (confirmed) or let them park automatically after FU3."],
                ].map(([event, action]) => (
                  <tr key={event}>
                    <td className="w-2/5 py-1.5 pr-3 font-medium text-navy-900">{event}</td>
                    <td className="py-1.5 text-slate-600">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      <AiSuggestCard
        campaignId={campaign.id}
        area="activity"
        hint="Plans TODAY for you: which follow-ups (by name), how many new messages per channel within your caps, what to post, and one engagement block, ordered by impact, based on your real pace."
      />

      {/* Today's targets at a glance */}
      {todayProgress.some((t) => t.bars.length > 0) ? (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-navy-900">Today's targets</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {todayProgress.map(({ channel, bars }) =>
              bars.length === 0 ? null : (
                <div key={channel.id} className="space-y-2 rounded-md border border-neutral-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{channelLabel(channel.channel)}</p>
                  {bars.map((bar) => {
                    const pct = Math.min(100, Math.round((bar.done / bar.target) * 100));
                    const hit = bar.done >= bar.target;
                    return (
                      <div key={bar.label}>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">{bar.label}</span>
                          <span className={hit ? "font-semibold text-emerald-600" : "text-slate-500"}>
                            {bar.done}/{bar.target} {hit ? "✓" : ""}
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                          <div className={`h-full rounded-full ${hit ? "bg-emerald-500" : "bg-navy-600"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ),
            )}
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-navy-900">Log today's numbers ({today})</h2>
          <p className="mt-1 text-xs text-slate-500">
            Easiest path: write each attempt in the{" "}
            <Link href="/admin/marketing/journal" className="font-medium text-navy-600 hover:underline">
              Journal
            </Link>{" "}
            and these counters fill themselves. Use the forms below only to correct today's totals, or pick an
            earlier date to backfill that day.
          </p>
        </div>
        <div className="grid gap-3">
          {channels.map((channel) => {
            const log = todayLogs[channel.channel];
            return (
              <form
                key={channel.id}
                action={logDailyActivity}
                className="space-y-3 rounded-md border border-neutral-200 p-3"
              >
                <input type="hidden" name="campaignId" value={campaign.id} />
                <input type="hidden" name="channel" value={channel.channel} />
                {/* Baseline = what this form showed at render time. The action
                    applies edits as deltas against it (same-day saves only),
                    so journal auto-counts from another tab are never undone. */}
                <input type="hidden" name="baseDate" value={today} />
                <input type="hidden" name="base_messages" value={log?.messages ?? 0} />
                <input type="hidden" name="base_replies" value={log?.replies ?? 0} />
                <input type="hidden" name="base_calls" value={log?.calls ?? 0} />
                <input type="hidden" name="base_posts" value={log?.posts ?? 0} />
                <input type="hidden" name="base_engagements" value={log?.engagements ?? 0} />
                <div>
                  <p className="text-sm font-medium text-navy-900">{channelLabel(channel.channel)}</p>
                  <p className="text-[11px] text-slate-400">
                    msgs {channel.dailyMin}-{channel.dailyMax}/day
                    {channel.postsPerDay > 0 ? ` · ${channel.postsPerDay} post${channel.postsPerDay === 1 ? "" : "s"}` : ""}
                    {channel.engagePerDay > 0 ? ` · ${channel.engagePerDay} engage` : ""}
                    {channel.contentNote ? ` · ${channel.contentNote}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-end gap-3 md:grid-cols-8">
                <HintField
                  label="Date"
                  hint="Defaults to today. Pick an earlier date to backfill or fix that day's numbers (those saves overwrite the day exactly as entered)."
                >
                  <Input name="date" type="date" defaultValue={today} max={today} required />
                </HintField>
                <HintField
                  label="Messages"
                  hint="Outbound messages you actually sent today on this channel: new openers AND follow-ups both count. The coach compares the total against your daily floors."
                >
                  <Input name="messages" type="number" min={0} defaultValue={log?.messages ?? 0} />
                </HintField>
                <HintField
                  label="Replies"
                  hint="Replies received today (any human response, even a 'no'). Drives the reply-rate nudge: target 15-25%; under 10% means rewrite the first line."
                >
                  <Input name="replies" type="number" min={0} defaultValue={log?.replies ?? 0} />
                </HintField>
                <HintField
                  label="Convos"
                  hint="Deep conversations actually HELD today: a real back-and-forth WhatsApp/DM thread or a call. The coach's pivot and close-rate logic read this number."
                >
                  <Input name="calls" type="number" min={0} defaultValue={log?.calls ?? 0} />
                </HintField>
                <HintField
                  label="Posts"
                  hint="Public posts you published on this channel today, against the channel's posts/day plan."
                >
                  <Input name="posts" type="number" min={0} defaultValue={log?.posts ?? 0} />
                </HintField>
                <HintField
                  label="Engage"
                  hint="Engagement actions today (comments/reactions on ICP posts), against the channel's engage/day plan."
                >
                  <Input name="engagements" type="number" min={0} defaultValue={log?.engagements ?? 0} />
                </HintField>
                <div className="col-span-2 md:col-span-1">
                  <HintField label="Note" hint="Optional one-liner: what you tested today (e.g. 'new opener v2'), so trends make sense later.">
                    <Input name="notes" defaultValue={log?.notes ?? ""} />
                  </HintField>
                </div>
                <Button type="submit" variant="secondary">
                  Save
                </Button>
                </div>
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
            Totals: {totals.messages} messages · {totals.replies} replies · {totals.calls} convos · {totals.posts} posts ·{" "}
            {totals.engagements} engagements
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
                <th className="px-3 py-2">Convos</th>
                <th className="px-3 py-2">Posts</th>
                <th className="px-3 py-2">Engage</th>
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
                  <td className="px-3 py-2">{log.posts}</td>
                  <td className="px-3 py-2">{log.engagements}</td>
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
