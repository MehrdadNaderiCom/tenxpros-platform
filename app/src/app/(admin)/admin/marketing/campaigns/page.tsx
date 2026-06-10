import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";
import { MARKETING_CHANNELS, channelLabel } from "@/lib/marketing/constants";
import {
  activateCampaign,
  createCampaign,
  removeChannel,
  saveChannel,
  updateCampaign,
} from "@/lib/actions/marketing";

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function MarketingCampaignsPage() {
  const campaigns = await prisma.marketingCampaign.findMany({
    include: { channels: { orderBy: { channel: "asc" } }, _count: { select: { prospects: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campaigns & goals"
        description="Each campaign sets the time window, the three outcome goals (break-even / ideal / stretch), the pipeline target, and per-channel daily quotas."
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">New campaign</h2>
        <form action={createCampaign} className="grid gap-4 md:grid-cols-3">
          <Field label="Name">
            <Input name="name" placeholder="Founding Cohort outreach" required />
          </Field>
          <Field label="Start date">
            <Input name="startDate" type="date" required />
          </Field>
          <Field label="End date">
            <Input name="endDate" type="date" required />
          </Field>
          <Field label="Break-even (paid)">
            <Input name="targetBreakEven" type="number" min={0} defaultValue={2} />
          </Field>
          <Field label="Ideal (paid)">
            <Input name="targetIdeal" type="number" min={0} defaultValue={3} />
          </Field>
          <Field label="Stretch (paid)">
            <Input name="targetStretch" type="number" min={0} defaultValue={5} />
          </Field>
          <Field label="Pipeline target (live prospects)">
            <Input name="targetPipeline" type="number" min={0} defaultValue={30} />
          </Field>
          <div className="flex items-end md:col-span-2">
            <Button type="submit">Create campaign</Button>
          </div>
        </form>
        <p className="text-xs text-slate-500">
          LinkedIn / WhatsApp / Email quotas are created with sensible defaults; edit them below after creating.
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
                <form action={activateCampaign}>
                  <input type="hidden" name="campaignId" value={campaign.id} />
                  <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
                    Make active
                  </Button>
                </form>
              ) : null}
            </div>
          </div>

          <form action={updateCampaign} className="grid gap-4 md:grid-cols-4">
            <input type="hidden" name="campaignId" value={campaign.id} />
            <Field label="Name">
              <Input name="name" defaultValue={campaign.name} />
            </Field>
            <Field label="Start date">
              <Input name="startDate" type="date" defaultValue={dateValue(campaign.startDate)} />
            </Field>
            <Field label="End date">
              <Input name="endDate" type="date" defaultValue={dateValue(campaign.endDate)} />
            </Field>
            <Field label="Off-platform paid (manual wins)">
              <Input name="offPlatformPaid" type="number" min={0} defaultValue={campaign.offPlatformPaid} />
            </Field>
            <Field label="Break-even">
              <Input name="targetBreakEven" type="number" min={0} defaultValue={campaign.targetBreakEven} />
            </Field>
            <Field label="Ideal">
              <Input name="targetIdeal" type="number" min={0} defaultValue={campaign.targetIdeal} />
            </Field>
            <Field label="Stretch">
              <Input name="targetStretch" type="number" min={0} defaultValue={campaign.targetStretch} />
            </Field>
            <Field label="Pipeline target">
              <Input name="targetPipeline" type="number" min={0} defaultValue={campaign.targetPipeline} />
            </Field>
            <Field label="Pivot: messages threshold">
              <Input name="pivotMessagesThreshold" type="number" min={1} defaultValue={campaign.pivotMessagesThreshold} />
            </Field>
            <Field label="Pivot: calls threshold">
              <Input name="pivotCallsThreshold" type="number" min={1} defaultValue={campaign.pivotCallsThreshold} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Notes">
                <Textarea name="notes" className="min-h-12" defaultValue={campaign.notes ?? ""} />
              </Field>
            </div>
            <div className="md:col-span-4">
              <Button type="submit" variant="secondary">
                Save campaign
              </Button>
            </div>
          </form>

          <div className="space-y-3 border-t border-neutral-200 pt-4">
            <h3 className="text-sm font-semibold text-navy-900">Channels & daily quotas</h3>
            <p className="text-xs text-slate-500">Daily floor/ceiling per platform plus a weekly cap, to stay under ban thresholds.</p>
            <div className="grid gap-3">
              {campaign.channels.map((channel) => (
                <form key={channel.id} action={saveChannel} className="grid grid-cols-2 items-end gap-3 rounded-md border border-neutral-200 p-3 md:grid-cols-6">
                  <input type="hidden" name="campaignId" value={campaign.id} />
                  <input type="hidden" name="channel" value={channel.channel} />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Channel</p>
                    <p className="text-sm font-medium text-navy-900">{channelLabel(channel.channel)}</p>
                  </div>
                  <Field label="Daily min">
                    <Input name="dailyMin" type="number" min={0} defaultValue={channel.dailyMin} />
                  </Field>
                  <Field label="Daily max">
                    <Input name="dailyMax" type="number" min={0} defaultValue={channel.dailyMax} />
                  </Field>
                  <Field label="Weekly cap">
                    <Input name="weeklyCap" type="number" min={0} defaultValue={channel.weeklyCap} />
                  </Field>
                  <Button type="submit" variant="secondary" className="text-xs">
                    Save
                  </Button>
                  <Button type="submit" formAction={removeChannel} name="channelId" value={channel.id} variant="danger" className="text-xs">
                    Remove
                  </Button>
                </form>
              ))}
            </div>
            <form action={saveChannel} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="campaignId" value={campaign.id} />
              <Field label="Add channel">
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
              </Field>
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
