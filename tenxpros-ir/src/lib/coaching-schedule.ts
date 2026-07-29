import { tehranLocalDateTimeToUtc } from "@/lib/iran-week";

export class CoachingScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoachingScheduleError";
  }
}

type ResolveCoachingScheduledAtInput = {
  status: string;
  scheduledAtInput: string;
  currentScheduledAt: Date | null;
  now?: Date;
};

/**
 * Resolves the Tehran wall-clock value submitted by an administrator.
 * An existing value is reusable so an administrator can update notes without
 * accidentally replacing or losing the agreed schedule.
 */
export function resolveCoachingScheduledAt({
  status,
  scheduledAtInput,
  currentScheduledAt,
  now = new Date(),
}: ResolveCoachingScheduledAtInput) {
  if (status !== "SCHEDULED") return undefined;

  const value = scheduledAtInput.trim();
  if (!value) {
    if (currentScheduledAt) return new Date(currentScheduledAt);
    throw new CoachingScheduleError(
      "برای وضعیت زمان‌بندی‌شده، تاریخ و ساعت تهران را وارد کنید.",
    );
  }

  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  if (!match) {
    throw new CoachingScheduleError(
      "فرمت تاریخ و ساعت جلسه Coaching معتبر نیست.",
    );
  }

  let scheduledAt: Date;
  try {
    scheduledAt = tehranLocalDateTimeToUtc(match[1], match[2]);
  } catch {
    throw new CoachingScheduleError(
      "تاریخ یا ساعت جلسه Coaching معتبر نیست.",
    );
  }

  const unchanged =
    currentScheduledAt?.getTime() === scheduledAt.getTime();
  if (scheduledAt.getTime() <= now.getTime() && !unchanged) {
    throw new CoachingScheduleError(
      "زمان تازه جلسه Coaching باید در آینده باشد.",
    );
  }

  return scheduledAt;
}
