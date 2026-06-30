/**
 * Server-side data layer for TenXPros Command: loads the active campaign and
 * computes live metrics. Goal progress ("paid") counts applications SUBMITTED
 * on or after the campaign start that are enrolled or have a successful
 * payment (whenever the payment lands), plus the campaign's off-platform
 * count, so goals track money, not just pipeline labels.
 */
import { prisma } from "@/lib/prisma";
import { LIVE_STAGES, prospectScore } from "@/lib/marketing/constants";
import { isFollowupDue } from "@/lib/marketing/followup";
import type { CoachInput } from "@/lib/marketing/coach";

const MS_PER_DAY = 86_400_000;

export function getActiveCampaign() {
  return prisma.marketingCampaign.findFirst({
    where: { isActive: true },
    include: { channels: { orderBy: { channel: "asc" } } },
  });
}

export type CampaignWithChannels = NonNullable<Awaited<ReturnType<typeof getActiveCampaign>>>;

export function campaignClock(campaign: { startDate: Date; endDate: Date }, now = new Date()) {
  const total = Math.max(1, Math.round((campaign.endDate.getTime() - campaign.startDate.getTime()) / MS_PER_DAY) + 1);
  const elapsedRaw = Math.floor((now.getTime() - campaign.startDate.getTime()) / MS_PER_DAY) + 1;
  const elapsedDays = Math.min(Math.max(elapsedRaw, 0), total);
  const remainingDays = Math.max(total - elapsedDays, 0);
  return { totalDays: total, elapsedDays, remainingDays, progressPct: (elapsedDays / total) * 100 };
}

export async function campaignMetrics(campaign: CampaignWithChannels, now = new Date()) {
  const clock = campaignClock(campaign, now);

  const [logs, prospects, paidApplications] = await Promise.all([
    prisma.marketingDailyLog.findMany({ where: { campaignId: campaign.id }, orderBy: { date: "asc" } }),
    prisma.prospect.findMany({ where: { campaignId: campaign.id } }),
    prisma.application.count({
      where: {
        createdAt: { gte: campaign.startDate },
        OR: [{ status: "ENROLLED" }, { payments: { some: { status: "PAID" } } }],
      },
    }),
  ]);

  const messagesSent = logs.reduce((sum, log) => sum + log.messages, 0);
  const repliesReceived = logs.reduce((sum, log) => sum + log.replies, 0);
  const callsHeld = logs.reduce((sum, log) => sum + log.calls, 0);

  const byStage: Record<string, number> = {};
  for (const prospect of prospects) byStage[prospect.stage] = (byStage[prospect.stage] ?? 0) + 1;
  const activePipeline = prospects.filter((p) => (LIVE_STAGES as string[]).includes(p.stage)).length;

  const paidNow = paidApplications + campaign.offPlatformPaid;

  const dailyFloor = campaign.channels.filter((c) => c.enabled).reduce((sum, c) => sum + c.dailyMin, 0);
  const messagesExpected = dailyFloor * clock.elapsedDays;

  const NO_FOLLOWUP_STAGES = ["LIST", "PAID", "LOST", "DROPPED"];
  const followupsDue = prospects.filter(
    (p) =>
      p.followupStatus === "ACTIVE" &&
      !NO_FOLLOWUP_STAGES.includes(p.stage) &&
      isFollowupDue(p.followupNextDue, now),
  );

  const staleHotProspects = prospects
    .filter((p) => p.stage === "LIST" && now.getTime() - p.createdAt.getTime() >= 14 * MS_PER_DAY)
    .map((p) => ({ name: p.name, score: prospectScore(p) }))
    .filter((p) => p.score >= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const coachInput: CoachInput = {
    targetBreakEven: campaign.targetBreakEven,
    targetIdeal: campaign.targetIdeal,
    targetStretch: campaign.targetStretch,
    targetPipeline: campaign.targetPipeline,
    pivotMessagesThreshold: campaign.pivotMessagesThreshold,
    pivotCallsThreshold: campaign.pivotCallsThreshold,
    elapsedDays: clock.elapsedDays,
    remainingDays: clock.remainingDays,
    progressPct: clock.progressPct,
    messagesSent,
    messagesExpected,
    repliesReceived,
    callsHeld,
    paidNow,
    activePipeline,
    staleHotProspects,
    followupsDueToday: followupsDue.length,
  };

  return {
    clock,
    logs,
    prospects,
    byStage,
    activePipeline,
    messagesSent,
    repliesReceived,
    callsHeld,
    paidNow,
    paidApplications,
    dailyFloor,
    messagesExpected,
    followupsDue,
    staleHotProspects,
    coachInput,
  };
}
