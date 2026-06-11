import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/form-field";
import { AiText } from "@/components/admin/ai-text";
import { PageHeader } from "@/components/shared/page-shell";
import { prisma } from "@/lib/prisma";
import { getActiveCampaign, campaignMetrics } from "@/lib/marketing/data";
import { coachNudges, coachVerdict, replyRate, closeRate } from "@/lib/marketing/coach";
import { getCoachSettings } from "@/lib/marketing/ai-coach";
import { getPostCadence } from "@/lib/marketing/post-cadence";
import { PostCadenceBanner } from "@/components/admin/post-cadence-banner";
import { PROSPECT_STAGES, stageLabel } from "@/lib/marketing/constants";
import { askAiCoach, markFollowupSent, syncProspectsWithFunnel } from "@/lib/actions/marketing";
import { nextFollowupLabel } from "@/lib/marketing/followup";

function GoalTile({
  label,
  value,
  target,
  hit,
  hint,
}: {
  label: string;
  value: number;
  target: number;
  hit: boolean;
  hint: string;
}) {
  return (
    <Card className={`space-y-1 ${hit ? "border-emerald-300" : ""}`}>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
        <InfoTip id={`goal-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`} label={`About ${label}`} text={hint} />
      </p>
      <p className="text-3xl font-semibold text-navy-900">
        {value}
        <span className="text-base font-normal text-slate-400"> / {target}</span>
      </p>
      {hit ? <p className="text-xs font-medium text-emerald-600">Reached</p> : null}
    </Card>
  );
}

const NUDGE_STYLES: Record<string, string> = {
  win: "border-l-emerald-500 bg-emerald-50",
  warn: "border-l-amber-500 bg-amber-50",
  info: "border-l-navy-500 bg-navy-50",
};

export default async function MarketingCommandPage() {
  const campaign = await getActiveCampaign();
  if (!campaign) {
    return (
      <div className="space-y-8">
        <PageHeader title="Marketing Command" description="Founder-led sales operating system: goals, pipeline, coach, and playbook." />
        <Card className="space-y-3 p-8 text-center">
          <h2 className="text-lg font-semibold text-navy-900">No active campaign</h2>
          <p className="text-sm text-slate-600">Create a campaign with dates, goals, and channel quotas to start.</p>
          <Link href="/admin/marketing/campaigns" className="font-medium text-navy-600 hover:underline">
            Open Campaigns →
          </Link>
        </Card>
      </div>
    );
  }

  const m = await campaignMetrics(campaign);
  const verdict = coachVerdict(m.coachInput);
  const nudges = coachNudges(m.coachInput);
  const reply = replyRate(m.messagesSent, m.repliesReceived);
  const close = closeRate(m.callsHeld, m.paidNow);
  const todayStart = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const [coachSettings, adviceHistory, todayLogs, postCadence] = await Promise.all([
    getCoachSettings(),
    prisma.marketingCoachAdvice.findMany({
      where: { campaignId: campaign.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.marketingDailyLog.findMany({ where: { campaignId: campaign.id, date: todayStart } }),
    getPostCadence(campaign.id),
  ]);
  // Day rollover: only advice asked TODAY counts as current; anything older
  // moves to the history below so each morning starts with a fresh ask.
  const latestAdvice = adviceHistory[0] ?? null;
  const adviceIsToday = Boolean(latestAdvice && latestAdvice.createdAt >= todayStart);
  const olderAdvice = adviceIsToday ? adviceHistory.slice(1) : adviceHistory;
  const todayTotals = todayLogs.reduce(
    (acc, log) => {
      acc.messages += log.messages;
      acc.posts += log.posts;
      acc.engagements += log.engagements;
      return acc;
    },
    { messages: 0, posts: 0, engagements: 0 },
  );
  const dailyPostsTarget = campaign.channels.filter((c) => c.enabled).reduce((sum, c) => sum + c.postsPerDay, 0);
  const dailyEngageTarget = campaign.channels.filter((c) => c.enabled).reduce((sum, c) => sum + c.engagePerDay, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Marketing Command"
        description={`${campaign.name} · day ${m.clock.elapsedDays}/${m.clock.totalDays} · ${m.clock.remainingDays} days left`}
      />

      <PostCadenceBanner cadence={postCadence} />

      {/* Goals */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GoalTile
          label="Break-even (paid)"
          value={m.paidNow}
          target={campaign.targetBreakEven}
          hit={m.paidNow >= campaign.targetBreakEven}
          hint="Minimum acceptable outcome: paid customers covering the campaign's cost. Counted live from applications SUBMITTED on or after the campaign start that are enrolled or have a successful payment (whenever the payment lands), plus off-platform wins you record in Campaigns."
        />
        <GoalTile
          label="Ideal (paid)"
          value={m.paidNow}
          target={campaign.targetIdeal}
          hit={m.paidNow >= campaign.targetIdeal}
          hint="The goal you're actually aiming for (the 'first 3 customers' number). Same live paid count, higher bar."
        />
        <GoalTile
          label="Stretch (paid)"
          value={m.paidNow}
          target={campaign.targetStretch}
          hit={m.paidNow >= campaign.targetStretch}
          hint="The big-win bar. Hitting it means the offer works; plan a larger, higher-priced next cohort."
        />
        <GoalTile
          label="Active pipeline"
          value={m.activePipeline}
          target={campaign.targetPipeline}
          hit={m.activePipeline >= campaign.targetPipeline}
          hint="Prospects currently in motion (Approached through Applied; not List, not lost/dropped). Keep this near the target: conversions need coverage, roughly 10x your ideal goal."
        />
      </div>
      <p className="text-xs text-slate-500">
        Paid = applications submitted since the campaign start that are enrolled or successfully paid ({m.paidApplications}) plus off-platform wins ({campaign.offPlatformPaid}).
      </p>

      {/* Coach verdict */}
      <Card className={`space-y-2 border-l-4 ${verdict.verdict.includes("win") ? "border-l-emerald-500" : verdict.verdict === "quit" || verdict.verdict === "pivot" ? "border-l-amber-500" : "border-l-navy-500"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy-900">{verdict.headline}</h2>
          <Badge status={verdict.verdict.includes("win") ? "ACCEPTED" : "UNDER_REVIEW"}>{verdict.verdict.replaceAll("_", " ")}</Badge>
        </div>
        <ul className="space-y-1 text-sm text-slate-600">
          {verdict.reasoning.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
        <p className="text-sm font-medium text-navy-900">Next move: {verdict.nextMove}</p>
      </Card>

      {/* AI coach (OpenRouter) */}
      <Card className="space-y-3 border-l-4 border-l-violet-500">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold text-navy-900">
            AI coach
            <InfoTip
              label="About the AI coach"
              text="Sends the live campaign picture (goals, funnel, activity, top prospects, due follow-ups) to a top LLM via OpenRouter and returns a prioritized plan for the next 24 hours. The last 20 advice entries are kept per campaign. Note: this data, including prospect names, is processed by OpenRouter and the selected model provider."
            />
          </h2>
          <form action={askAiCoach}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <Button type="submit" disabled={!coachSettings.hasKey} className="h-9 px-4 text-sm">
              {adviceIsToday ? "Ask again" : latestAdvice ? "Get today's plan" : "Ask the AI coach"}
            </Button>
          </form>
        </div>

        {coachSettings.lastError ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {coachSettings.lastError}
          </p>
        ) : null}

        {latestAdvice && adviceIsToday ? (
          <div className="space-y-1">
            <div className="rounded-md bg-violet-50/60 p-4">
              <AiText text={latestAdvice.advice} />
            </div>
            <p className="text-[11px] text-slate-400">
              {latestAdvice.model} · {latestAdvice.createdAt.toLocaleString()}
            </p>
          </div>
        ) : latestAdvice ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            A new day has started. The last advice (from {latestAdvice.createdAt.toISOString().slice(0, 10)}) moved
            to the history below; press the button for a plan built on today's numbers.
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            {coachSettings.hasKey ? (
              "No advice yet. Press the button and the coach reads your live numbers and pipeline."
            ) : (
              <>
                Connect OpenRouter once in{" "}
                <Link href="/admin/marketing/settings" className="font-medium text-navy-600 hover:underline">
                  Marketing settings
                </Link>
                , then ask for a data-driven plan whenever you want.
              </>
            )}
          </p>
        )}

        {olderAdvice.length > 0 ? (
          <details>
            <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-700">
              Advice history ({olderAdvice.length})
            </summary>
            <div className="mt-2 max-h-96 space-y-3 overflow-y-auto pr-1">
              {olderAdvice.map((advice) => (
                <div key={advice.id} className="space-y-1 rounded-md border border-neutral-200 p-3">
                  <p className="text-[11px] font-medium text-slate-400">
                    {advice.createdAt.toISOString().slice(0, 10)} · {advice.model}
                  </p>
                  <AiText text={advice.advice} />
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <p className="text-xs text-slate-400">
          {coachSettings.hasKey ? "Connected ✓ · " : ""}
          Model: {coachSettings.model} ·{" "}
          <Link href="/admin/marketing/settings" className="font-medium text-navy-600 hover:underline">
            AI settings →
          </Link>
        </p>
      </Card>

      {/* Activity + funnel snapshot */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-navy-900">Activity</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Messages sent</dt><dd className="font-semibold">{m.messagesSent} / {m.messagesExpected} expected</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Replies</dt><dd className="font-semibold">{m.repliesReceived} ({reply.toFixed(1)}%)</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Convos held</dt><dd className="font-semibold">{m.callsHeld}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Close rate (convo→paid)</dt><dd className="font-semibold">{close.toFixed(0)}%</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Daily floor (all channels)</dt><dd className="font-semibold">{m.dailyFloor} msgs/day</dd></div>
          </dl>
          <p className="rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs text-slate-600">
            Today so far: <span className={todayTotals.messages >= m.dailyFloor ? "font-semibold text-emerald-600" : "font-semibold"}>{todayTotals.messages}/{m.dailyFloor} msgs</span>
            {dailyPostsTarget > 0 ? <> · {todayTotals.posts}/{dailyPostsTarget} posts</> : null}
            {dailyEngageTarget > 0 ? <> · {todayTotals.engagements}/{dailyEngageTarget} engage</> : null}
          </p>
          <Link href="/admin/marketing/activity" className="text-sm font-medium text-navy-600 hover:underline">Open Today →</Link>
        </Card>

        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-navy-900">Funnel</h2>
          <dl className="space-y-1.5 text-sm">
            {PROSPECT_STAGES.filter((s) => !["LOST", "DROPPED"].includes(s.value)).map((s) => (
              <div key={s.value} className="flex justify-between">
                <dt className="text-slate-600">{s.label}</dt>
                <dd className="font-semibold">{m.byStage[s.value] ?? 0}</dd>
              </div>
            ))}
          </dl>
          <Link href="/admin/marketing/prospects" className="text-sm font-medium text-navy-600 hover:underline">Open pipeline →</Link>
        </Card>

        <Card className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
            Follow-ups due today ({m.followupsDue.length})
            <InfoTip
              id="tip-followups-due"
              label="About follow-ups due"
              text="Prospects whose FU1/FU2/FU3 date has arrived. Send the follow-up (Playbook has the drafts), then press 'Mark sent' to schedule the next step. Clear these BEFORE new cold outreach, and remember to count them in today's Messages on the Activity page."
            />
          </h2>
          {m.followupsDue.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing due. Send new outreach.</p>
          ) : (
            <div className="space-y-2">
              {m.followupsDue.slice(0, 6).map((p) => (
                <form key={p.id} action={markFollowupSent} className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2">
                  <input type="hidden" name="prospectId" value={p.id} />
                  <span className="text-sm text-slate-700">
                    {p.name} <span className="text-xs text-slate-400">· {nextFollowupLabel(p.followupStep) ?? "FU"} · {stageLabel(p.stage)}</span>
                  </span>
                  <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">Mark sent</Button>
                </form>
              ))}
              {m.followupsDue.length > 6 ? (
                <Link href="/admin/marketing/prospects" className="block text-xs font-medium text-navy-600 hover:underline">
                  View all {m.followupsDue.length} →
                </Link>
              ) : null}
            </div>
          )}
          <form action={syncProspectsWithFunnel} className="flex items-center gap-1.5">
            <input type="hidden" name="campaignId" value={campaign.id} />
            <Button type="submit" variant="secondary" className="w-full text-xs">
              Sync pipeline with real applications
            </Button>
            <InfoTip
              id="tip-funnel-sync"
              label="About funnel sync"
              text="Matches each prospect's email to real applications on the site, links them, and moves their stage forward to Applied or Paid (never backwards, never out of Lost/Dropped). Run it whenever someone you contacted applies. Note: pre-campaign applications link and move the stage, but the paid goals only count applications submitted after the campaign start."
            />
          </form>
        </Card>
      </div>

      {/* Nudges */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-navy-900">Coaching nudges</h2>
        {nudges.length === 0 ? (
          <p className="text-sm text-slate-500">No urgent nudges. Keep executing.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {nudges.map((n) => (
              <Card key={n.title} className={`space-y-1 border-l-4 ${NUDGE_STYLES[n.tone] ?? NUDGE_STYLES.info}`}>
                <h3 className="text-sm font-semibold text-navy-900">{n.title}</h3>
                <p className="text-sm text-slate-600">{n.body}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/admin/marketing/insights" className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50">Insights →</Link>
        <Link href="/admin/marketing/activity" className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50">Today →</Link>
        <Link href="/admin/marketing/journal" className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50">Journal →</Link>
        <Link href="/admin/marketing/prospects" className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50">Prospects →</Link>
        <Link href="/admin/marketing/playbook" className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50">Playbook →</Link>
      </div>
    </div>
  );
}
