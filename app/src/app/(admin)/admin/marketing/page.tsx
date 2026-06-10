import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";
import { getActiveCampaign, campaignMetrics } from "@/lib/marketing/data";
import { coachNudges, coachVerdict, replyRate, closeRate } from "@/lib/marketing/coach";
import { PROSPECT_STAGES, stageLabel } from "@/lib/marketing/constants";
import { markFollowupSent, syncProspectsWithFunnel } from "@/lib/actions/marketing";
import { nextFollowupLabel } from "@/lib/marketing/followup";

function GoalTile({ label, value, target, hit }: { label: string; value: number; target: number; hit: boolean }) {
  return (
    <Card className={`space-y-1 ${hit ? "border-emerald-300" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Marketing Command"
        description={`${campaign.name} · day ${m.clock.elapsedDays}/${m.clock.totalDays} · ${m.clock.remainingDays} days left`}
      />

      {/* Goals */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GoalTile label="Break-even (paid)" value={m.paidNow} target={campaign.targetBreakEven} hit={m.paidNow >= campaign.targetBreakEven} />
        <GoalTile label="Ideal (paid)" value={m.paidNow} target={campaign.targetIdeal} hit={m.paidNow >= campaign.targetIdeal} />
        <GoalTile label="Stretch (paid)" value={m.paidNow} target={campaign.targetStretch} hit={m.paidNow >= campaign.targetStretch} />
        <GoalTile label="Active pipeline" value={m.activePipeline} target={campaign.targetPipeline} hit={m.activePipeline >= campaign.targetPipeline} />
      </div>
      <p className="text-xs text-slate-500">
        Paid = real paid/enrolled applications since the campaign start ({m.paidApplications}) plus off-platform wins ({campaign.offPlatformPaid}).
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

      {/* Activity + funnel snapshot */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-navy-900">Activity</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Messages sent</dt><dd className="font-semibold">{m.messagesSent} / {m.messagesExpected} expected</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Replies</dt><dd className="font-semibold">{m.repliesReceived} ({reply.toFixed(1)}%)</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Calls held</dt><dd className="font-semibold">{m.callsHeld}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Close rate (calls→paid)</dt><dd className="font-semibold">{close.toFixed(0)}%</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Daily floor (all channels)</dt><dd className="font-semibold">{m.dailyFloor} msgs/day</dd></div>
          </dl>
          <Link href="/admin/marketing/activity" className="text-sm font-medium text-navy-600 hover:underline">Log today's activity →</Link>
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
          <h2 className="text-sm font-semibold text-navy-900">Follow-ups due today ({m.followupsDue.length})</h2>
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
            </div>
          )}
          <form action={syncProspectsWithFunnel}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <Button type="submit" variant="secondary" className="w-full text-xs">
              Sync pipeline with real applications
            </Button>
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/marketing/prospects" className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50">Prospects →</Link>
        <Link href="/admin/marketing/activity" className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50">Daily activity →</Link>
        <Link href="/admin/marketing/playbook" className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50">Playbook →</Link>
      </div>
    </div>
  );
}
