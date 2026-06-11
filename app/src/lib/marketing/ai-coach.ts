/**
 * AI coach (OpenRouter). The super admin pastes an API key once (stored in
 * AdminSetting, never in code or env files); "Ask the AI coach" then sends the
 * full live campaign picture to a top LLM and stores the advice.
 */
import { prisma } from "@/lib/prisma";
import { prospectScore, stageLabel } from "@/lib/marketing/constants";
import { coachVerdict } from "@/lib/marketing/coach";
import type { CampaignWithChannels, campaignMetrics } from "@/lib/marketing/data";

export const OPENROUTER_KEY_SETTING = "openrouter_api_key";
export const OPENROUTER_MODEL_SETTING = "openrouter_model";
export const OPENROUTER_ERROR_SETTING = "openrouter_last_error";
export const DEFAULT_COACH_MODEL = "anthropic/claude-sonnet-4.5";

export async function getCoachSettings(): Promise<{ hasKey: boolean; model: string; lastError: string | null }> {
  const rows = await prisma.adminSetting.findMany({
    where: { key: { in: [OPENROUTER_KEY_SETTING, OPENROUTER_MODEL_SETTING, OPENROUTER_ERROR_SETTING] } },
  });
  const key = rows.find((r) => r.key === OPENROUTER_KEY_SETTING)?.value ?? "";
  const model = rows.find((r) => r.key === OPENROUTER_MODEL_SETTING)?.value || DEFAULT_COACH_MODEL;
  const lastError = rows.find((r) => r.key === OPENROUTER_ERROR_SETTING)?.value || null;
  return { hasKey: key.trim().length > 0, model, lastError };
}

const SYSTEM_PROMPT = `You are the sales coach inside "TenXPros Command", the founder's operating system for landing the first paying customers of TenXPros (tenxpros.com) — a selective, reviewed 12-week program ($997 Founding tier) where non-technical professionals adopt AI in their real work and ship a defensible "Living AI Solution Dossier".

The operator is a solo founder doing founder-led, trust-first outreach (LinkedIn / WhatsApp / email), guided by a playbook: personalize the first line of every message; follow-up cadence FU1 +3d, FU2 +7d, FU3 +7d; lead with the Sample Dossier and Founder Letter; the 150-messages/10-calls pivot rule; reply-rate target 15-25%.

You receive the live campaign data as JSON. Respond with:
1. A one-line verdict of where the campaign truly stands.
2. The 3 highest-leverage moves for the NEXT 24 HOURS, concrete and specific to the data (name names from the pipeline when useful).
3. One risk the founder is probably not seeing.
Be direct, practical, and brief (under 300 words). No generic advice; tie every point to the numbers or prospects given. Format: short **bold** section labels and "-" bullets only (no tables, no nested lists, no # headers).`;

export function buildCoachContext(
  campaign: CampaignWithChannels,
  m: Awaited<ReturnType<typeof campaignMetrics>>,
): string {
  const verdict = coachVerdict(m.coachInput);
  // Same ranking the operator sees in the queues: warmth-weighted score.
  const topProspects = [...m.prospects]
    .filter((p) => !["PAID", "LOST", "DROPPED"].includes(p.stage))
    .sort((a, b) => prospectScore(b) - prospectScore(a))
    .slice(0, 12)
    .map((p) => ({
      name: p.name,
      stage: stageLabel(p.stage),
      warmth: p.warmth,
      score: prospectScore(p),
      context: p.context,
      followupStep: p.followupStep,
      followupStatus: p.followupStatus,
    }));
  const cutoff = Date.now() - 14 * 86_400_000;
  const recentLogs = m.logs
    .filter((l) => l.date.getTime() >= cutoff)
    .map((l) => ({
      date: l.date.toISOString().slice(0, 10),
      channel: l.channel,
      messages: l.messages,
      replies: l.replies,
      calls: l.calls,
      posts: l.posts,
      engagements: l.engagements,
    }));

  return JSON.stringify(
    {
      campaign: {
        name: campaign.name,
        day: `${m.clock.elapsedDays}/${m.clock.totalDays}`,
        remainingDays: m.clock.remainingDays,
        goals: {
          breakEven: campaign.targetBreakEven,
          ideal: campaign.targetIdeal,
          stretch: campaign.targetStretch,
          pipelineTarget: campaign.targetPipeline,
        },
        channels: campaign.channels.map((c) => ({
          channel: c.channel,
          dailyMin: c.dailyMin,
          dailyMax: c.dailyMax,
          postsPerDay: c.postsPerDay,
          engagePerDay: c.engagePerDay,
          contentNote: c.contentNote,
        })),
      },
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
      ruleBasedVerdict: verdict,
      topProspects,
      recentDailyLogs: recentLogs,
    },
    null,
    1,
  );
}

/** Generic OpenRouter chat call. Throws a user-readable error on failure. */
export async function callOpenRouter(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tenxpros.com",
        "X-Title": "TenXPros Command",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      if (response.status === 401) {
        throw new Error("OpenRouter rejected the API key (401). Re-paste the key in the AI coach settings on the Command page.");
      }
      if (response.status === 404 || response.status === 400) {
        throw new Error(`OpenRouter rejected the request (${response.status}). Check the model id in the AI coach settings on the Command page. ${detail.slice(0, 200)}`);
      }
      throw new Error(`OpenRouter error ${response.status}. ${detail.slice(0, 200)}`);
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const advice = data.choices?.[0]?.message?.content?.trim();
    if (!advice) throw new Error("OpenRouter returned an empty response. Try again or switch the model.");
    return advice;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The AI coach timed out after 90 seconds. Try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** The Command-page coach: campaign-wide verdict + next-24h plan. */
export function requestCoachAdvice(apiKey: string, model: string, context: string): Promise<string> {
  return callOpenRouter(apiKey, model, SYSTEM_PROMPT, `Live campaign data:\n${context}`);
}
