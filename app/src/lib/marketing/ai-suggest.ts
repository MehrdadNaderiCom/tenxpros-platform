/**
 * Per-area AI suggestions ("Suggest a plan" buttons across the marketing
 * section). Each area sends a focused slice of live campaign data to the
 * configured OpenRouter model and stores the result (or the error, inline)
 * in MarketingAiSuggestion.
 */
import { prisma } from "@/lib/prisma";
import { channelLabel, prospectScore, stageLabel } from "@/lib/marketing/constants";
import type { CampaignWithChannels, campaignMetrics } from "@/lib/marketing/data";

export type SuggestArea = "channels" | "activity" | "prospects" | "playbook";

export const SUGGEST_AREAS: Record<SuggestArea, { title: string; button: string }> = {
  channels: { title: "AI channel plan", button: "Suggest a channel plan" },
  activity: { title: "AI plan for today", button: "Plan my day" },
  prospects: { title: "AI pipeline focus", button: "Who should I focus on?" },
  playbook: { title: "AI playbook review", button: "Improve my templates" },
};

const BASE_SYSTEM = `You are the marketing planner inside "TenXPros Command" for a solo founder selling TenXPros (tenxpros.com): a selective, reviewed 12-week program ($997 Founding tier) where non-technical professionals adopt AI in their real work and ship a defensible "Living AI Solution Dossier". Style: founder-led, trust-first; personalize the first line of every message; lead with the Sample Dossier; follow-up cadence FU1 +3d, FU2 +7d, FU3 +7d; reply-rate target 15-25%.
Respond with short **bold** section labels and "-" bullets only (no tables, no nested lists, no # headers), under 280 words, concrete and tied to the data given. Numbers must be realistic for ONE person working alongside running the company.`;

const AREA_PROMPTS: Record<SuggestArea, string> = {
  channels: `Design the channel & content plan. For EACH channel give one line: outreach floor/ceiling per day, posts per day (0 is fine), engagement actions per day (comments/reactions on ICP posts), weekly cap, and WHAT to post or do there (theme ideas tied to TenXPros proof assets). Stay under platform ban thresholds. Then one line on which channel to drop or add and why; additions may only come from the supported set: LinkedIn, WhatsApp, Email, Instagram, Telegram, X (Twitter), Phone/voice. Format each channel line so the numbers are easy to copy into the form fields.`,
  activity: `Plan TODAY for the founder, hour-light and specific: exactly how many follow-ups (name them), how many new outreach messages per channel (respect the daily floors/caps), what to post today per the content plan, and 1 engagement block. Order the list by impact. Use the "today" date to read yesterday and the current week from the logs; if pace was below floor, say how to catch up without burning the weekly caps.`,
  prospects: `Pick the 5 prospects to act on RIGHT NOW. For each: name, why now (stage + score + cadence state + staleness), and a one-line suggested angle for the next touch (specific to their context). Then one line: who to stop chasing (see possibleDrops and daysSinceActivity) and why.`,
  playbook: `Review the outreach performance vs the templates. Diagnose which part of the funnel leaks (message->reply, reply->call, call->paid) from the numbers, then propose: 1) a rewritten first-line pattern (2 variants to A/B), 2) one concrete improvement to the follow-up that precedes the leak, 3) one new template worth adding. Quote actual template titles when referring to them.`,
};

export function buildSuggestContext(
  area: SuggestArea,
  campaign: CampaignWithChannels,
  m: Awaited<ReturnType<typeof campaignMetrics>>,
  extra: Record<string, unknown> = {},
): { system: string; user: string } {
  const now = new Date();
  const cutoff = now.getTime() - 14 * 86_400_000;
  // Monday of the current UTC week, so weekly-cap headroom is computable.
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  const base = {
    today: now.toISOString().slice(0, 10),
    weekStart: weekStart.toISOString().slice(0, 10),
    campaign: {
      name: campaign.name,
      day: `${m.clock.elapsedDays}/${m.clock.totalDays}`,
      remainingDays: m.clock.remainingDays,
      goals: { breakEven: campaign.targetBreakEven, ideal: campaign.targetIdeal, stretch: campaign.targetStretch, pipelineTarget: campaign.targetPipeline },
    },
    channels: campaign.channels.map((c) => ({
      channel: channelLabel(c.channel),
      enabled: c.enabled,
      outreachPerDay: `${c.dailyMin}-${c.dailyMax}`,
      weeklyCap: c.weeklyCap,
      postsPerDay: c.postsPerDay,
      engagePerDay: c.engagePerDay,
      contentNote: c.contentNote,
    })),
    results: {
      paid: m.paidNow,
      messagesSent: m.messagesSent,
      messagesExpected: m.messagesExpected,
      replies: m.repliesReceived,
      callsHeld: m.callsHeld,
      activePipeline: m.activePipeline,
      funnel: m.byStage,
      followupsDueToday: m.followupsDue.map((p) => p.name),
    },
    recentDailyLogs: m.logs
      .filter((l) => l.date.getTime() >= cutoff)
      .map((l) => ({
        date: l.date.toISOString().slice(0, 10),
        channel: l.channel,
        messages: l.messages,
        replies: l.replies,
        calls: l.calls,
        posts: l.posts,
        engagements: l.engagements,
      })),
    ...extra,
  };
  return {
    system: `${BASE_SYSTEM}\n\nTask: ${AREA_PROMPTS[area]}`,
    user: `Live data:\n${JSON.stringify(base, null, 1)}`,
  };
}

/** Area-specific extras loaded only when that area asks. */
export async function buildAreaExtras(
  area: SuggestArea,
  m: Awaited<ReturnType<typeof campaignMetrics>>,
): Promise<Record<string, unknown>> {
  if (area === "prospects") {
    const now = Date.now();
    const live = [...m.prospects]
      .filter((p) => !["PAID", "LOST", "DROPPED"].includes(p.stage))
      .sort((a, b) => prospectScore(b) - prospectScore(a));
    const describe = (p: (typeof live)[number]) => ({
      name: p.name,
      stage: stageLabel(p.stage),
      warmth: p.warmth,
      score: prospectScore(p),
      context: p.context,
      followupStep: p.followupStep,
      followupStatus: p.followupStatus,
      daysSinceActivity: Math.floor((now - p.updatedAt.getTime()) / 86_400_000),
      notes: p.notes?.slice(0, 160),
    });
    return {
      prospects: live.slice(0, 20).map(describe),
      // Explicit stop-chasing candidates: lowest scored when the list is large.
      possibleDrops: live.length > 20 ? live.slice(-5).map(describe) : [],
    };
  }
  if (area === "playbook") {
    const templates = await prisma.marketingTemplate.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: { category: true, title: true, body: true },
    });
    return {
      templates: templates.map((t) => ({ category: t.category, title: t.title, body: t.body.slice(0, 600) })),
    };
  }
  return {};
}

export function latestSuggestion(campaignId: string, area: SuggestArea) {
  return prisma.marketingAiSuggestion.findFirst({
    where: { campaignId, area },
    orderBy: { createdAt: "desc" },
  });
}
