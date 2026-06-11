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
export const OPERATOR_PROFILE_SETTING = "marketing_operator_profile";
export const DEFAULT_COACH_MODEL = "anthropic/claude-sonnet-4.5";

/**
 * How the founder actually works. Sent with EVERY AI request (coach and all
 * "suggest" buttons) as hard constraints, and editable in Marketing settings.
 * Without this, models suggest cold email blasts and phone-call CTAs that the
 * founder will never do.
 */
export const DEFAULT_OPERATOR_PROFILE = `- I work message-first. I am not a phone-call person: never propose call CTAs. A "conversation" for me is a real back-and-forth in WhatsApp or LinkedIn DMs.
- My main channel is LinkedIn: reading posts, commenting, publishing posts, connection requests with a short note, and DMs to accepted connections. Respect LinkedIn limits (connection-request weekly caps, InMail is scarce - do not assume I can InMail everyone).
- WhatsApp is my ideal place to deepen a relationship once someone shares a number or we already know each other.
- No cold email for now: I have no email list and do not want to send cold emails. Only suggest email when a prospect has given me their address.
- I am a solo founder doing this alongside running the company; plans must fit roughly 2 focused hours per day.`;

/** Current operator profile (custom if saved, otherwise the default above). */
export async function getOperatorProfile(): Promise<{ profile: string; isCustom: boolean }> {
  const row = await prisma.adminSetting.findUnique({ where: { key: OPERATOR_PROFILE_SETTING } });
  const custom = row?.value.trim();
  return custom ? { profile: custom, isCustom: true } : { profile: DEFAULT_OPERATOR_PROFILE, isCustom: false };
}

/** Appended to every AI system prompt so suggestions fit how the founder really works. */
export function operatorBlock(profile: string): string {
  if (!profile.trim()) return "";
  return `\n\nOPERATOR PROFILE - how this founder actually works. These are HARD constraints; never suggest anything that violates them, and shape every plan around them:\n${profile.trim()}`;
}

/** Compact "2h" / "3d" elapsed marker for follow-up timelines. */
function elapsedShort(from: Date, to: Date): string {
  const mins = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Recent journal entries (what was tried, outcome, self-rating) for AI context. */
export async function recentAttemptSummaries(campaignId: string, take = 15) {
  const rows = await prisma.marketingAttempt.findMany({
    where: { campaignId },
    orderBy: { at: "desc" },
    take,
    include: {
      prospect: { select: { name: true } },
      updates: { orderBy: { at: "asc" } },
    },
  });
  return rows.map((a) => ({
    date: a.at.toISOString().slice(0, 10),
    kind: a.kind,
    channel: a.channel ?? undefined,
    prospect: a.prospect?.name,
    what: a.summary.slice(0, 240),
    outcome: a.outcome?.slice(0, 240) || undefined,
    minutes: a.minutes || undefined,
    selfRating: `${a.satisfaction}/5`,
    learnings: a.learnings?.slice(0, 240) || undefined,
    // How the attempt unfolded over time ("+2h: 14 comments, 3 DMs").
    ...(a.updates.length
      ? { followUps: a.updates.slice(-5).map((u) => `+${elapsedShort(a.at, u.at)}: ${u.note.slice(0, 160)}`) }
      : {}),
  }));
}

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

The operator is a solo founder doing founder-led, trust-first outreach, guided by a playbook: personalize the first line of every message; follow-up cadence FU1 +3d, FU2 +7d, FU3 +7d; lead with the Sample Dossier and Founder Letter; the 150-messages/10-conversations pivot rule; reply-rate target 15-25%. In the data, "calls" counts deep conversations (a real back-and-forth thread or a call).

You receive the live campaign data as JSON, including the founder's own journal of recent attempts (what was tried, the outcome, a 1-5 self-rating, lessons). Treat low ratings and repeated lessons as the strongest coaching signal. Respond with:
1. A one-line verdict of where the campaign truly stands.
2. The 3 highest-leverage moves for the NEXT 24 HOURS, concrete and specific to the data (name names from the pipeline when useful).
3. One risk the founder is probably not seeing.
Be direct, practical, and brief (under 300 words). No generic advice; tie every point to the numbers, prospects, or journal entries given. Format: short **bold** section labels and "-" bullets only (no tables, no nested lists, no # headers).`;

export function buildCoachContext(
  campaign: CampaignWithChannels,
  m: Awaited<ReturnType<typeof campaignMetrics>>,
  journal: Awaited<ReturnType<typeof recentAttemptSummaries>> = [],
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
      // The founder's own journal: what was tried, the outcome, and their
      // self-rating - the strongest signal for what to coach on next.
      journal,
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
export function requestCoachAdvice(apiKey: string, model: string, context: string, profile = ""): Promise<string> {
  return callOpenRouter(apiKey, model, SYSTEM_PROMPT + operatorBlock(profile), `Live campaign data:\n${context}`);
}
