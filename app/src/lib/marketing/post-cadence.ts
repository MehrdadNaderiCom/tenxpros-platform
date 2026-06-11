/**
 * LinkedIn posting rhythm: a reminder that fires when more than N hours
 * (default 28) have passed since the LAST LinkedIn post journaled (kind
 * "post", channel "linkedin"). Only the latest post counts; journaling a new
 * post restarts the clock and clears any snooze/dismiss, because those are
 * stored against the post id they were pressed for. All state lives in
 * AdminSetting rows (marketing_ prefix = hidden from the generic settings
 * page), so no schema changes are needed.
 */
import { prisma } from "@/lib/prisma";

export const POST_CADENCE_HOURS_SETTING = "marketing_post_cadence_hours";
export const POST_REMINDER_SNOOZE_SETTING = "marketing_post_reminder_snooze";
export const POST_REMINDER_DISMISS_SETTING = "marketing_post_reminder_dismiss";
export const DEFAULT_POST_CADENCE_HOURS = 28;

export type PostCadence = {
  /** Hours between posts the founder is aiming for. */
  threshold: number;
  lastPost: { id: string; at: Date; summary: string } | null;
  /** Hours since the last post (fractional), or null when none exists. */
  hoursSince: number | null;
  /** The threshold has passed. */
  due: boolean;
  /** Show the reminder banner (due, not snoozed, not dismissed for this post). */
  notify: boolean;
  /** Active snooze for the current post, if any. */
  snoozedUntil: Date | null;
};

function parseHours(raw: string | undefined): number {
  const value = Number(raw);
  if (Number.isInteger(value) && value >= 1 && value <= 720) return value;
  return DEFAULT_POST_CADENCE_HOURS;
}

/** The configured rhythm target, for the settings page. */
export async function getPostCadenceHours(): Promise<number> {
  const row = await prisma.adminSetting.findUnique({ where: { key: POST_CADENCE_HOURS_SETTING } });
  return parseHours(row?.value);
}

export async function getPostCadence(campaignId: string, now = new Date()): Promise<PostCadence> {
  const [settings, lastPost] = await Promise.all([
    prisma.adminSetting.findMany({
      where: {
        key: { in: [POST_CADENCE_HOURS_SETTING, POST_REMINDER_SNOOZE_SETTING, POST_REMINDER_DISMISS_SETTING] },
      },
    }),
    prisma.marketingAttempt.findFirst({
      where: { campaignId, kind: "post", channel: "linkedin" },
      orderBy: [{ at: "desc" }, { id: "desc" }],
      select: { id: true, at: true, summary: true },
    }),
  ]);
  const setting = (key: string) => settings.find((s) => s.key === key)?.value;
  const threshold = parseHours(setting(POST_CADENCE_HOURS_SETTING));

  if (!lastPost) {
    return { threshold, lastPost: null, hoursSince: null, due: false, notify: false, snoozedUntil: null };
  }

  const hoursSince = Math.max(0, (now.getTime() - lastPost.at.getTime()) / 3_600_000);
  const due = hoursSince >= threshold;

  // Snooze/dismiss are pinned to the post they were pressed for; a newer
  // post makes them irrelevant automatically.
  let snoozedUntil: Date | null = null;
  const snoozeRaw = setting(POST_REMINDER_SNOOZE_SETTING);
  if (snoozeRaw) {
    try {
      const parsed = JSON.parse(snoozeRaw) as { postId?: string; until?: string };
      if (parsed.postId === lastPost.id && parsed.until) {
        const until = new Date(parsed.until);
        if (!Number.isNaN(until.getTime()) && until > now) snoozedUntil = until;
      }
    } catch {
      // Malformed snooze state counts as no snooze.
    }
  }
  const dismissedForThisPost = setting(POST_REMINDER_DISMISS_SETTING) === lastPost.id;

  return {
    threshold,
    lastPost,
    hoursSince,
    due,
    notify: due && !dismissedForThisPost && snoozedUntil === null,
    snoozedUntil,
  };
}
