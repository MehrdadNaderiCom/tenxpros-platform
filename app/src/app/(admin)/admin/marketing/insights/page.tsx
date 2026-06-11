import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";
import { ColumnChart, HBarList, PaceBar, type HBarRow } from "@/components/admin/charts";
import { prisma } from "@/lib/prisma";
import { campaignMetrics, getActiveCampaign } from "@/lib/marketing/data";
import { replyRate } from "@/lib/marketing/coach";
import { attemptVariantLabel, channelLabel, stageLabel, type AttemptKindValue } from "@/lib/marketing/constants";

const DAY = 86_400_000;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "06-11" labels keep the x-axis readable. */
function shortDay(key: string): string {
  return key.slice(5);
}

/** Latest follow-up snapshot with numbers, or null. */
function latestMetrics(updates: Array<{ metrics: unknown }>): Record<string, number> | null {
  for (let i = updates.length - 1; i >= 0; i -= 1) {
    const m = updates[i].metrics;
    if (m && typeof m === "object" && !Array.isArray(m)) {
      const numeric: Record<string, number> = {};
      for (const [key, value] of Object.entries(m as Record<string, unknown>)) {
        if (typeof value === "number") numeric[key] = value;
      }
      if (Object.keys(numeric).length) return numeric;
    }
  }
  return null;
}

const FUNNEL_ORDER = ["LIST", "APPROACHED", "REPLIED", "CALL_BOOKED", "CALL_HELD", "APPLIED", "PAID"] as const;

export default async function MarketingInsightsPage() {
  const campaign = await getActiveCampaign();
  if (!campaign) {
    return (
      <div className="space-y-8">
        <PageHeader title="Insights" description="Visual progress for the marketing manager." />
        <EmptyState
          eyebrow="No active campaign"
          title="Create a campaign first."
          description="Charts read the active campaign's logs, pipeline, and journal."
          actionLabel="Open Campaigns"
          actionHref="/admin/marketing/campaigns"
        />
      </div>
    );
  }

  const m = await campaignMetrics(campaign);
  // Newest first so the cap can only ever drop the oldest history; no
  // consumer below depends on the array's order (grouping and per-day
  // filters), and the nested updates keep their own ascending order.
  const attempts = await prisma.marketingAttempt.findMany({
    where: { campaignId: campaign.id },
    orderBy: { at: "desc" },
    take: 400,
    include: { updates: { orderBy: [{ at: "asc" }, { id: "asc" }] } },
  });

  // ----- Daily output, last 28 days (all channels summed) -----
  const today = new Date(`${dayKey(new Date())}T00:00:00.000Z`);
  const days: string[] = [];
  for (let i = 27; i >= 0; i -= 1) days.push(dayKey(new Date(today.getTime() - i * DAY)));
  const perDay = new Map(days.map((d) => [d, { messages: 0, replies: 0, posts: 0, engagements: 0, calls: 0 }]));
  for (const log of m.logs) {
    const bucket = perDay.get(dayKey(log.date));
    if (!bucket) continue;
    bucket.messages += log.messages;
    bucket.replies += log.replies;
    bucket.posts += log.posts;
    bucket.engagements += log.engagements;
    bucket.calls += log.calls;
  }
  const series = (key: "messages" | "replies" | "posts" | "engagements") =>
    days.map((d) => ({ label: shortDay(d), value: perDay.get(d)?.[key] ?? 0 }));
  const enabledChannels = campaign.channels.filter((c) => c.enabled);
  const postsTarget = enabledChannels.reduce((sum, c) => sum + c.postsPerDay, 0);
  const engageTarget = enabledChannels.reduce((sum, c) => sum + c.engagePerDay, 0);

  // ----- Weekly reply rate (last 6 ISO weeks) -----
  const weekRows: HBarRow[] = [];
  {
    const monday = new Date(today);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    for (let w = 5; w >= 0; w -= 1) {
      const start = new Date(monday.getTime() - w * 7 * DAY);
      const end = new Date(start.getTime() + 7 * DAY);
      const logs = m.logs.filter((l) => l.date >= start && l.date < end);
      const msgs = logs.reduce((sum, l) => sum + l.messages, 0);
      const reps = logs.reduce((sum, l) => sum + l.replies, 0);
      if (msgs === 0 && reps === 0 && weekRows.length === 0) continue; // trim all leading empty weeks
      const rate = replyRate(msgs, reps);
      weekRows.push({
        label: `Week of ${shortDay(dayKey(start))}`,
        value: rate,
        display: msgs ? `${rate.toFixed(0)}%` : "-",
        sub: `${reps} replies / ${msgs} messages`,
      });
    }
  }

  // ----- Funnel: how many prospects reached at least each stage -----
  const liveOrPaid = m.prospects.filter((p) => !["LOST", "DROPPED"].includes(p.stage));
  const stageIndex = (stage: string) => FUNNEL_ORDER.indexOf(stage as (typeof FUNNEL_ORDER)[number]);
  const reached = FUNNEL_ORDER.map((stage, idx) => ({
    stage,
    count: liveOrPaid.filter((p) => stageIndex(p.stage) >= idx).length,
  }));
  const funnelRows: HBarRow[] = reached.map((row, idx) => {
    const prev = idx > 0 ? reached[idx - 1].count : 0;
    return {
      label: stageLabel(row.stage),
      value: row.count,
      sub:
        idx === 0
          ? "everyone you captured"
          : prev > 0
            ? `${Math.round((row.count / prev) * 100)}% of the previous step`
            : "no one reached the previous step yet",
    };
  });
  const lostCount = (m.byStage.LOST ?? 0) + (m.byStage.DROPPED ?? 0);

  // ----- Journal analysis: what works -----
  const groupRows = (kind: AttemptKindValue, build: (group: typeof attempts) => string): HBarRow[] => {
    const groups = new Map<string, typeof attempts>();
    for (const attempt of attempts.filter((a) => a.kind === kind)) {
      const key = attempt.variant ?? "unspecified";
      groups.set(key, [...(groups.get(key) ?? []), attempt]);
    }
    return [...groups.entries()]
      .map(([variant, list]) => ({
        label:
          variant === "unspecified"
            ? "Not set"
            : (attemptVariantLabel(kind, variant) ?? variant),
        value: list.length,
        display: `${list.length}`,
        sub: build(list),
      }))
      .sort((a, b) => b.value - a.value);
  };

  const postRows = groupRows("post", (list) => {
    const snaps = list.map((a) => latestMetrics(a.updates)).filter(Boolean) as Array<Record<string, number>>;
    if (!snaps.length) return "no snapshot numbers yet";
    const avg = (key: string) => Math.round(snaps.reduce((sum, s) => sum + (s[key] ?? 0), 0) / snaps.length);
    return `avg per post: ${avg("impressions")} impressions · ${avg("reactions")} reactions · ${avg("comments")} comments · ${avg("dms")} DMs`;
  });
  const outreachRows = groupRows("outreach", (list) => {
    const rating = list.reduce((sum, a) => sum + a.satisfaction, 0) / list.length;
    return `avg self-rating ${rating.toFixed(1)}/5`;
  });
  const engagementRows = groupRows("engagement", (list) => {
    const snaps = list.map((a) => latestMetrics(a.updates)).filter(Boolean) as Array<Record<string, number>>;
    const dms = snaps.reduce((sum, s) => sum + (s.dms ?? 0), 0);
    const responses = snaps.reduce((sum, s) => sum + (s.responses ?? 0), 0);
    return `${responses} responses · ${dms} DMs started`;
  });

  // ----- Time investment + how it felt (last 14 days) -----
  const last14 = days.slice(14);
  const minutesPerDay = last14.map((d) => ({
    label: shortDay(d),
    value: attempts.filter((a) => dayKey(a.at) === d).reduce((sum, a) => sum + a.minutes, 0),
  }));
  const ratingPerDay = last14.map((d) => {
    const list = attempts.filter((a) => dayKey(a.at) === d);
    const avg = list.length ? list.reduce((sum, a) => sum + a.satisfaction, 0) / list.length : 0;
    return { label: shortDay(d), value: Math.round(avg * 10) / 10 };
  });
  const weekMinutes = minutesPerDay.slice(7).reduce((sum, p) => sum + p.value, 0);

  // ----- Goal pacing -----
  const goalRows = [
    { label: "Break-even", target: campaign.targetBreakEven },
    { label: "Ideal", target: campaign.targetIdeal },
    { label: "Stretch", target: campaign.targetStretch },
  ];
  const totalExpected = m.dailyFloor * m.clock.totalDays;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Insights"
        description={`${campaign.name} · day ${m.clock.elapsedDays}/${m.clock.totalDays} · the visual read on whether the machine is working.`}
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      {/* Goal pacing */}
      <Card className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-navy-900">Goals vs time</h2>
          <p className="mt-1 text-xs text-slate-500">
            The amber marker is today ({Math.round(m.clock.progressPct)}% of the campaign window). A green bar is
            ahead of schedule; a navy bar has catching up to do.
          </p>
        </div>
        <div className="space-y-3">
          {goalRows.map((goal) => (
            <div key={goal.label}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">{goal.label} (paid)</span>
                <span className="font-semibold text-navy-900">
                  {m.paidNow} / {goal.target}
                </span>
              </div>
              <div className="mt-1">
                <PaceBar donePct={(m.paidNow / Math.max(1, goal.target)) * 100} timePct={m.clock.progressPct} />
              </div>
            </div>
          ))}
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700">Outreach volume (whole campaign)</span>
              <span className="font-semibold text-navy-900">
                {m.messagesSent} / {totalExpected} msgs
              </span>
            </div>
            <div className="mt-1">
              <PaceBar donePct={(m.messagesSent / Math.max(1, totalExpected)) * 100} timePct={m.clock.progressPct} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700">Active pipeline</span>
              <span className="font-semibold text-navy-900">
                {m.activePipeline} / {campaign.targetPipeline}
              </span>
            </div>
            <div className="mt-1">
              <PaceBar donePct={(m.activePipeline / Math.max(1, campaign.targetPipeline)) * 100} timePct={100} />
            </div>
          </div>
        </div>
      </Card>

      {/* Daily output */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-navy-900">Daily output (last 28 days)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Summed across {enabledChannels.map((c) => channelLabel(c.channel)).join(" + ") || "your channels"}. Green
            columns hit the daily plan; the dashed line is the target. Numbers fill in from the Journal automatically.
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-navy-900">Messages</p>
          <ColumnChart points={series("messages")} target={m.dailyFloor} label="Messages per day, last 28 days" />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <p className="mb-1 text-sm font-medium text-navy-900">Replies</p>
            <ColumnChart points={series("replies")} height={72} label="Replies per day, last 28 days" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-navy-900">Posts</p>
            <ColumnChart points={series("posts")} target={postsTarget} height={72} label="Posts per day, last 28 days" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-navy-900">Engagement</p>
            <ColumnChart points={series("engagements")} target={engageTarget} height={72} label="Engagement actions per day, last 28 days" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Funnel */}
        <Card className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-navy-900">Funnel: reached at least</h2>
            <p className="mt-1 text-xs text-slate-500">
              Of everyone captured, how many got to each stage (current pipeline; {lostCount} lost/dropped not shown).
              The percentage under each bar is the step conversion - your leak is the smallest one. Paid here counts
              pipeline cards only; the goal numbers above also include applications and off-platform wins.
            </p>
          </div>
          <HBarList rows={funnelRows} />
          <Link href="/admin/marketing/prospects" className="text-sm font-medium text-navy-600 hover:underline">
            Open pipeline →
          </Link>
        </Card>

        {/* Reply rate trend */}
        <Card className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-navy-900">Reply rate by week</h2>
            <p className="mt-1 text-xs text-slate-500">
              Target 15-25%. Under 10% means the opener needs rewriting, not more volume.
            </p>
          </div>
          <HBarList rows={weekRows} max={30} />
        </Card>
      </div>

      {/* What works */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-navy-900">What works (from your journal)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Grouped by the kind-specific detail you pick when logging attempts; numbers come from each attempt's
            latest follow-up snapshot. The more honestly you journal, the sharper this gets.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-sm font-medium text-navy-900">Posts by format</p>
            {postRows.length ? <HBarList rows={postRows} /> : <p className="text-sm text-slate-500">No posts journaled yet.</p>}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-navy-900">Outreach by approach</p>
            {outreachRows.length ? <HBarList rows={outreachRows} /> : <p className="text-sm text-slate-500">No outreach journaled yet.</p>}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-navy-900">Engagement by action</p>
            {engagementRows.length ? <HBarList rows={engagementRows} /> : <p className="text-sm text-slate-500">No engagement journaled yet.</p>}
          </div>
        </div>
        {attempts.some((a) => !a.variant && ["post", "outreach", "engagement"].includes(a.kind)) ? (
          <p className="text-xs text-slate-400">
            Tip: entries logged without the detail field show as "Not set" - edit them in the{" "}
            <Link href="/admin/marketing/journal" className="font-medium text-navy-600 hover:underline">
              Journal
            </Link>{" "}
            to sharpen these comparisons.
          </p>
        ) : null}
      </Card>

      {/* Time + feel */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-navy-900">Your time and how it felt (last 14 days)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Minutes come from the Journal's "minutes spent"; the rating is your own 1-5 score. Last 7 days:{" "}
            {weekMinutes} minutes logged.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium text-navy-900">Minutes per day</p>
            <ColumnChart points={minutesPerDay} height={80} unit=" min" label="Journal minutes per day, last 14 days" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-navy-900">Avg self-rating per day</p>
            <ColumnChart points={ratingPerDay} target={3} height={80} unit="/5" label="Average self-rating per day, last 14 days" />
          </div>
        </div>
      </Card>
    </div>
  );
}
