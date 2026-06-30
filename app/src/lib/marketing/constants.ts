/**
 * Shared marketing (TenXPros Command) constants: pipeline stages, warmth
 * weights, channels, and assets. Pure data, safe for client and server.
 */

export const PROSPECT_STAGES = [
  { value: "LIST", label: "List" },
  { value: "APPROACHED", label: "Approached" },
  { value: "REPLIED", label: "Replied" },
  // "Conversation" = a real back-and-forth (WhatsApp/DM thread or a call).
  // The founder works message-first, so the labels avoid implying phone calls.
  { value: "CALL_BOOKED", label: "Convo planned" },
  { value: "CALL_HELD", label: "Convo held" },
  { value: "APPLIED", label: "Applied" },
  { value: "PAID", label: "Paid" },
  { value: "LOST", label: "Lost" },
  { value: "DROPPED", label: "Dropped" },
] as const;

export type ProspectStageValue = (typeof PROSPECT_STAGES)[number]["value"];

/** Stages considered "live pipeline" (in motion, not terminal). */
export const LIVE_STAGES: ProspectStageValue[] = [
  "APPROACHED",
  "REPLIED",
  "CALL_BOOKED",
  "CALL_HELD",
  "APPLIED",
];

export const WARMTH_OPTIONS = [
  { value: "WARM", label: "Warm, knows you", weight: 4 },
  { value: "REFERRAL", label: "Referral", weight: 3 },
  { value: "COLD_ENGAGED", label: "Cold (engaged)", weight: 2 },
  { value: "COLD", label: "Cold", weight: 1 },
] as const;

export type WarmthValue = (typeof WARMTH_OPTIONS)[number]["value"];

export const MARKETING_CHANNELS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "phone", label: "Phone / voice" },
] as const;

export const ASSET_OPTIONS = [
  { value: "founder_letter", label: "Founder Letter" },
  { value: "sample_dossier", label: "Sample Dossier" },
  { value: "review_rubric", label: "Review Rubric" },
] as const;

export const TOUCH_TYPES = [
  { value: "message", label: "Message sent" },
  { value: "follow_up", label: "Follow-up sent" },
  { value: "reply", label: "Reply received" },
  { value: "call", label: "Conversation / call" },
  { value: "asset", label: "Asset shared" },
  { value: "note", label: "Note" },
] as const;

/**
 * Journal entry kinds. Each kind maps to the daily-log counter it should
 * bump (null = journal-only), so logging an attempt once updates the daily
 * stats automatically, no double entry.
 */
export const ATTEMPT_KINDS = [
  { value: "outreach", label: "New outreach message", counter: "messages" },
  { value: "follow_up", label: "Follow-up sent", counter: "messages" },
  { value: "reply", label: "Got / handled a reply", counter: "replies" },
  { value: "conversation", label: "Deep conversation (DM thread / call)", counter: "calls" },
  { value: "post", label: "Published a post", counter: "posts" },
  { value: "engagement", label: "Engagement (comment / react / follow)", counter: "engagements" },
  { value: "other", label: "Other (research, list building…)", counter: null },
] as const;

export type AttemptKindValue = (typeof ATTEMPT_KINDS)[number]["value"];

export function attemptKindLabel(value?: string | null): string {
  if (!value) return ", ";
  return ATTEMPT_KINDS.find((k) => k.value === value)?.label ?? value;
}

/**
 * Kind-specific detail captured when logging an attempt, so results can be
 * analyzed by flavor later (which content format earns comments, which
 * approach earns replies). One select per kind; kinds not listed have none.
 */
export const ATTEMPT_VARIANTS: Partial<
  Record<AttemptKindValue, { label: string; hint: string; options: ReadonlyArray<{ value: string; label: string }> }>
> = {
  post: {
    label: "Content format",
    hint: "What the post physically was. Later you can compare formats: do documents out-earn text posts in comments and DMs?",
    options: [
      { value: "text", label: "Text only" },
      { value: "image", label: "Image / infographic" },
      { value: "document", label: "Document / carousel" },
      { value: "video", label: "Video" },
      { value: "poll", label: "Poll" },
      { value: "article", label: "Article / newsletter" },
      { value: "repost", label: "Repost with comment" },
    ],
  },
  outreach: {
    label: "Approach",
    hint: "How the first contact was made. Lets you compare reply rates per approach instead of guessing.",
    options: [
      { value: "connection_note", label: "Connection request + note" },
      { value: "dm", label: "DM to existing connection" },
      { value: "inmail", label: "InMail" },
      { value: "comment_then_dm", label: "Comment first, then DM" },
      { value: "intro", label: "Warm intro / referral" },
      { value: "other", label: "Other" },
    ],
  },
  engagement: {
    label: "Action",
    hint: "What kind of engagement it was, so you can see which actions actually start relationships.",
    options: [
      { value: "comment", label: "Comment" },
      { value: "reaction", label: "Reaction" },
      { value: "follow", label: "Follow / connect" },
      { value: "share", label: "Share / repost" },
    ],
  },
  reply: {
    label: "Their tone",
    hint: "How the reply felt. Trends here show whether your openers attract the right people.",
    options: [
      { value: "positive", label: "Positive / interested" },
      { value: "neutral", label: "Neutral / questions" },
      { value: "negative", label: "Negative / not now" },
    ],
  },
};

export function attemptVariantLabel(kind?: string | null, value?: string | null): string | null {
  if (!kind || !value) return null;
  const variant = ATTEMPT_VARIANTS[kind as AttemptKindValue];
  return variant?.options.find((o) => o.value === value)?.label ?? value;
}

/**
 * Kind-specific snapshot numbers for follow-up updates on an attempt. Each
 * filled field is stored in the update's metrics JSON, stamped with the
 * elapsed time since the attempt, so growth over time is analyzable.
 */
export const ATTEMPT_METRICS: Partial<
  Record<AttemptKindValue, ReadonlyArray<{ key: string; label: string; hint: string }>>
> = {
  post: [
    { key: "impressions", label: "Impressions", hint: "Views LinkedIn reports for the post at this moment (total so far, not the increase)." },
    { key: "reactions", label: "Reactions", hint: "Total likes/reactions so far." },
    { key: "comments", label: "Comments", hint: "Total comments so far (excluding your own replies)." },
    { key: "mentions", label: "Mentions", hint: "People who mentioned or tagged you/the post elsewhere." },
    { key: "connections", label: "Connections", hint: "NEW connection requests or follows you got because of this post." },
    { key: "dms", label: "DMs started", hint: "Direct conversations this post started (people who wrote to you, or replied when you wrote referencing it)." },
  ],
  engagement: [
    { key: "responses", label: "Responses", hint: "Replies your comment/action received, including from the author." },
    { key: "connections", label: "Connections", hint: "NEW connections or follows that came from this engagement." },
    { key: "dms", label: "DMs started", hint: "Direct conversations that started because of it." },
  ],
};

/** 1-5 self-rating shown in the journal. */
export const SATISFACTION_OPTIONS = [
  { value: 5, label: "5 - Great" },
  { value: 4, label: "4 - Good" },
  { value: 3, label: "3 - Okay" },
  { value: 2, label: "2 - Weak" },
  { value: 1, label: "1 - Poor" },
] as const;

export function stageLabel(value?: string | null): string {
  if (!value) return ", ";
  return PROSPECT_STAGES.find((s) => s.value === value)?.label ?? value;
}

export function warmthLabel(value?: string | null): string {
  if (!value) return ", ";
  return WARMTH_OPTIONS.find((w) => w.value === value)?.label ?? value;
}

export function warmthWeight(value?: string | null): number {
  return WARMTH_OPTIONS.find((w) => w.value === value)?.weight ?? 1;
}

export function channelLabel(value?: string | null): string {
  if (!value) return ", ";
  return MARKETING_CHANNELS.find((c) => c.value === value)?.label ?? value;
}

/**
 * Prioritization score: warmth weight x (pain + authority + ICP fit).
 * Range 3 (cold, all 1s) to 60 (warm, all 5s). Higher = approach first.
 */
export function prospectScore(p: {
  warmth: string;
  pain: number;
  authority: number;
  icpFit: number;
}): number {
  return warmthWeight(p.warmth) * (p.pain + p.authority + p.icpFit);
}
