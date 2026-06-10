import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/form-fields";
import { HintField } from "@/components/ui/hint-field";
import { InfoTip } from "@/components/ui/form-field";
import { CampaignDateRange } from "@/components/admin/campaign-date-range";
import { PageHeader } from "@/components/shared/page-shell";
import { MARKETING_CHANNELS, channelLabel } from "@/lib/marketing/constants";
import {
  activateCampaign,
  createCampaign,
  removeChannel,
  saveChannel,
  updateCampaign,
} from "@/lib/actions/marketing";
import { AiSuggestCard } from "@/components/admin/ai-suggest-card";
import { ConfirmButton } from "@/components/admin/confirm-button";

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Explanation + concrete recommendation for every campaign field, so any admin
// (or future operator) knows exactly what each number drives.
const TIPS = {
  name: "A label you'll recognize later, e.g. 'Founding Cohort outreach'. It appears on every Command page.",
  startDate:
    "Day 1 of the sprint. The coach measures pace from this date, so set it to the day you actually start sending. Suggestion: today.",
  endDate:
    "The decision deadline. At the end you close the pipeline and decide: extend, pivot, or wrap. Suggestion: 6 weeks (42 days) is long enough to learn and short enough to stay urgent.",
  targetBreakEven:
    "Minimum acceptable result: how many PAID customers cover the cost of running this campaign. The coach declares 'break-even reached' here. Suggestion: 2.",
  targetIdeal:
    "The realistic goal you are actually aiming for. Suggestion: 3 paid (this is the 'first 3 customers' target).",
  targetStretch:
    "The big-win number. Hitting it means the offer works and you should plan a bigger cohort at a higher price. Suggestion: 5.",
  targetPipeline:
    "How many LIVE prospects (approached up to applied, not lost/dropped) you want in motion at once. After the first week, the coach warns when coverage falls under half of this (days 1-7 are a grace period for list building). Suggestion: 30, roughly 10x your ideal target.",
  pivotMessages:
    "Pivot trigger: after this many messages with too few calls, the coach tells you to change ONE variable (opener, channel, or segment). Suggestion: 150, from the playbook's 150/10 rule.",
  pivotCalls:
    "The 'too few calls' side of the pivot rule: if calls held are below this when you cross the message threshold, the approach is not earning conversations. Suggestion: 10.",
  offPlatformPaid:
    "Paid customers you closed OUTSIDE the website (bank transfer, in person). Added to the live paid count so goals reflect reality. Update it manually whenever it happens.",
  notes: "Anything future-you needs: the offer version, pricing experiments, what changed mid-campaign.",
  dailyMin:
    "Your daily FLOOR for this channel: the number of messages you commit to send every day. The coach computes expected volume from the sum of all floors, so keep it honest. Suggestion: LinkedIn 5, Email 5, WhatsApp 3.",
  dailyMax:
    "Soft ceiling per day to stay under platform spam/ban thresholds. Advisory (shown next to the daily log). Suggestion: LinkedIn 15-20, Email 20, WhatsApp 10.",
  weeklyCap:
    "Soft weekly ceiling for the same reason; new accounts should stay well below it. Advisory. Suggestion: LinkedIn 70, Email 100, WhatsApp 50.",
  postsPerDay:
    "Content plan: how many public posts you commit to publish on this channel each day. Suggestion: LinkedIn 1/day (founder insights, dossier excerpts); 0 is fine for pure-outreach channels.",
  engagePerDay:
    "Engagement plan: comments/reactions on your ICP's posts each day. Warms cold prospects before outreach. Suggestion: LinkedIn 5-10/day.",
  contentNote:
    "WHAT to publish or do on this channel, in one line, e.g. '1 dossier-insight post + comment on 5 ops-director posts'. The AI planner reads and refines this.",
  addChannel:
    "Add another platform you actually plan to work daily. Fewer channels done consistently beat many channels done sometimes.",
  makeActive:
    "Only one campaign is active at a time. The Command dashboard, prospects, activity log, and coach all read the ACTIVE campaign.",
};

export default async function MarketingCampaignsPage() {
  const campaigns = await prisma.marketingCampaign.findMany({
    include: { channels: { orderBy: { channel: "asc" } }, _count: { select: { prospects: true } } },
    orderBy: { createdAt: "desc" },
  });

  const today = new Date();
  const suggestedEnd = new Date(today.getTime() + 42 * 86_400_000);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campaigns & goals"
        description="Each campaign is one focused sprint: a time window, three levels of success, a pipeline target, and per-channel daily quotas. Hover any ⓘ for what the field does and a suggested value."
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      {campaigns.find((c) => c.isActive) ? (
        <AiSuggestCard
          campaignId={campaigns.find((c) => c.isActive)!.id}
          area="channels"
          subtitle={`for ${campaigns.find((c) => c.isActive)!.name}`}
          hint="Reads your goals, current quotas, content plan, and 14 days of real activity, then proposes per-channel numbers (outreach, posts, engagement) and content themes you can copy into the fields of the ACTIVE campaign below."
        />
      ) : null}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">New campaign</h2>
        <form action={createCampaign} className="grid gap-4 md:grid-cols-3">
          <HintField label="Name" hint={TIPS.name}>
            <Input name="name" placeholder="Founding Cohort outreach" required />
          </HintField>
          <CampaignDateRange
            defaultStart={dateValue(today)}
            defaultEnd={dateValue(suggestedEnd)}
            startHint={TIPS.startDate}
            endHint={TIPS.endDate}
            required
          />
          <HintField label="Break-even (paid)" hint={TIPS.targetBreakEven}>
            <Input name="targetBreakEven" type="number" min={0} defaultValue={2} />
          </HintField>
          <HintField label="Ideal (paid)" hint={TIPS.targetIdeal}>
            <Input name="targetIdeal" type="number" min={0} defaultValue={3} />
          </HintField>
          <HintField label="Stretch (paid)" hint={TIPS.targetStretch}>
            <Input name="targetStretch" type="number" min={0} defaultValue={5} />
          </HintField>
          <HintField label="Pipeline target" hint={TIPS.targetPipeline}>
            <Input name="targetPipeline" type="number" min={0} defaultValue={30} />
          </HintField>
          <div className="flex items-end md:col-span-2">
            <Button type="submit">Create campaign</Button>
          </div>
        </form>
        <p className="text-xs text-slate-500">
          Defaults are pre-filled with the playbook's suggestions (today + 6 weeks, 2/3/5 paid, pipeline 30). LinkedIn,
          WhatsApp, and Email quotas are created automatically; tune them below after creating.
        </p>
      </Card>

      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-navy-900">{campaign.name}</h2>
              <p className="text-xs text-slate-500">
                {dateValue(campaign.startDate)} → {dateValue(campaign.endDate)} · {campaign._count.prospects} prospects
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge status={campaign.isActive ? "ACCEPTED" : "SUBMITTED"}>{campaign.isActive ? "Active" : "Inactive"}</Badge>
              {!campaign.isActive ? (
                <form action={activateCampaign} className="flex items-center gap-1.5">
                  <input type="hidden" name="campaignId" value={campaign.id} />
                  <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
                    Make active
                  </Button>
                  <InfoTip id={`tip-activate-${campaign.id}`} label="About activating" text={TIPS.makeActive} />
                </form>
              ) : null}
            </div>
          </div>

          <form action={updateCampaign} className="grid gap-4 md:grid-cols-4">
            <input type="hidden" name="campaignId" value={campaign.id} />
            <HintField label="Name" hint={TIPS.name}>
              <Input name="name" defaultValue={campaign.name} />
            </HintField>
            <CampaignDateRange
              defaultStart={dateValue(campaign.startDate)}
              defaultEnd={dateValue(campaign.endDate)}
              startHint={TIPS.startDate}
              endHint={TIPS.endDate}
            />
            <HintField label="Off-platform paid" hint={TIPS.offPlatformPaid}>
              <Input name="offPlatformPaid" type="number" min={0} defaultValue={campaign.offPlatformPaid} />
            </HintField>
            <HintField label="Break-even (paid)" hint={TIPS.targetBreakEven}>
              <Input name="targetBreakEven" type="number" min={0} defaultValue={campaign.targetBreakEven} />
            </HintField>
            <HintField label="Ideal (paid)" hint={TIPS.targetIdeal}>
              <Input name="targetIdeal" type="number" min={0} defaultValue={campaign.targetIdeal} />
            </HintField>
            <HintField label="Stretch (paid)" hint={TIPS.targetStretch}>
              <Input name="targetStretch" type="number" min={0} defaultValue={campaign.targetStretch} />
            </HintField>
            <HintField label="Pipeline target" hint={TIPS.targetPipeline}>
              <Input name="targetPipeline" type="number" min={0} defaultValue={campaign.targetPipeline} />
            </HintField>
            <HintField label="Pivot: messages" hint={TIPS.pivotMessages}>
              <Input name="pivotMessagesThreshold" type="number" min={1} defaultValue={campaign.pivotMessagesThreshold} />
            </HintField>
            <HintField label="Pivot: calls" hint={TIPS.pivotCalls}>
              <Input name="pivotCallsThreshold" type="number" min={1} defaultValue={campaign.pivotCallsThreshold} />
            </HintField>
            <div className="md:col-span-2">
              <HintField label="Notes" hint={TIPS.notes}>
                <Textarea name="notes" className="min-h-12" defaultValue={campaign.notes ?? ""} />
              </HintField>
            </div>
            <div className="md:col-span-4">
              <Button type="submit" variant="secondary">
                Save campaign
              </Button>
            </div>
          </form>

          <div className="space-y-3 border-t border-neutral-200 pt-4">
            <h3 className="text-sm font-semibold text-navy-900">Channels & daily quotas</h3>
            <p className="text-xs text-slate-500">
              The coach's expected volume = the sum of the daily floors across enabled channels. Max and weekly cap are
              advisory guardrails against platform bans.
            </p>
            <div className="grid gap-3">
              {campaign.channels.map((channel) => (
                <form key={channel.id} action={saveChannel} className="space-y-3 rounded-md border border-neutral-200 p-3">
                  <input type="hidden" name="campaignId" value={campaign.id} />
                  <input type="hidden" name="channel" value={channel.channel} />
                  {/* carried by the form (not the button) so Remove receives it reliably */}
                  <input type="hidden" name="channelId" value={channel.id} />
                  <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Channel</p>
                      <p className="text-sm font-medium text-navy-900">{channelLabel(channel.channel)}</p>
                    </div>
                    <HintField label="Daily min" hint={TIPS.dailyMin}>
                      <Input name="dailyMin" type="number" min={0} defaultValue={channel.dailyMin} />
                    </HintField>
                    <HintField label="Daily max" hint={TIPS.dailyMax}>
                      <Input name="dailyMax" type="number" min={0} defaultValue={channel.dailyMax} />
                    </HintField>
                    <HintField label="Weekly cap" hint={TIPS.weeklyCap}>
                      <Input name="weeklyCap" type="number" min={0} defaultValue={channel.weeklyCap} />
                    </HintField>
                    <HintField label="Posts / day" hint={TIPS.postsPerDay}>
                      <Input name="postsPerDay" type="number" min={0} max={100} defaultValue={channel.postsPerDay} />
                    </HintField>
                    <HintField label="Engage / day" hint={TIPS.engagePerDay}>
                      <Input name="engagePerDay" type="number" min={0} max={1000} defaultValue={channel.engagePerDay} />
                    </HintField>
                  </div>
                  <div className="grid items-end gap-3 md:grid-cols-6">
                    <div className="md:col-span-4">
                      <HintField label="Content plan (what to post/do here)" hint={TIPS.contentNote}>
                        <Input
                          name="contentNote"
                          defaultValue={channel.contentNote ?? ""}
                          placeholder="1 dossier-insight post + comment on 5 ICP posts"
                        />
                      </HintField>
                    </div>
                    <Button type="submit" variant="secondary" className="text-xs">
                      Save
                    </Button>
                    <ConfirmButton
                      action={removeChannel}
                      message={`Remove ${channelLabel(channel.channel)} from this campaign? Its quotas and content plan are kept in the audit log.`}
                      className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Remove
                    </ConfirmButton>
                  </div>
                </form>
              ))}
            </div>
            <form action={saveChannel} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="campaignId" value={campaign.id} />
              <HintField label="Add channel" hint={TIPS.addChannel}>
                <select
                  name="channel"
                  className="h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm text-slate-900"
                  defaultValue="instagram"
                >
                  {MARKETING_CHANNELS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </HintField>
              <Button type="submit" variant="secondary">
                Add
              </Button>
            </form>
          </div>
        </Card>
      ))}

      {campaigns.length === 0 ? (
        <p className="text-sm text-slate-500">No campaigns yet. Create the first one above.</p>
      ) : null}
    </div>
  );
}
