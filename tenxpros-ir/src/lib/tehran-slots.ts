import {
  createThirtyMinuteSlots,
  getIranWeekBounds,
  isThirtyMinuteSlot,
  type ThirtyMinuteSlot,
} from "@/lib/iran-week";

export const MAX_AVAILABILITY_SLOTS_PER_REQUEST = 24;

export type OfficeHourRuleCode =
  | "INVALID_RANGE"
  | "TOO_MANY_SLOTS"
  | "PAST_SLOT"
  | "OUTSIDE_ADMIN_WINDOW"
  | "OUTSIDE_CURRENT_WEEK"
  | "MEMBERSHIP_INACTIVE"
  | "SLOT_NOT_OPEN"
  | "INVALID_DURATION";

export class OfficeHourRuleError extends Error {
  constructor(
    readonly code: OfficeHourRuleCode,
    message: string,
  ) {
    super(message);
    this.name = "OfficeHourRuleError";
  }
}

function validDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

/**
 * Converts an administrator-entered Tehran wall-clock range to UTC instants.
 * Administrators can prepare the current Iranian week or the immediately
 * following week; member booking eligibility remains current-week only.
 */
export function createAdminAvailabilitySlots(
  input: {
    date: string;
    startTime: string;
    endTime: string;
  },
  now: Date = new Date(),
): ThirtyMinuteSlot[] {
  if (!validDate(now)) {
    throw new OfficeHourRuleError("INVALID_RANGE", "زمان فعلی معتبر نیست.");
  }

  let slots: ThirtyMinuteSlot[];
  try {
    slots = createThirtyMinuteSlots(input);
  } catch {
    throw new OfficeHourRuleError(
      "INVALID_RANGE",
      "بازه باید از Slotهای کامل ۳۰ دقیقه‌ای تشکیل شود.",
    );
  }

  if (slots.length === 0) {
    throw new OfficeHourRuleError(
      "INVALID_RANGE",
      "حداقل یک Slot سی دقیقه‌ای لازم است.",
    );
  }
  if (slots.length > MAX_AVAILABILITY_SLOTS_PER_REQUEST) {
    throw new OfficeHourRuleError(
      "TOO_MANY_SLOTS",
      "در هر بار حداکثر ۲۴ Slot قابل ثبت است.",
    );
  }

  const currentWeek = getIranWeekBounds(now);
  const nextWeek = getIranWeekBounds(currentWeek.endExclusive);
  for (const slot of slots) {
    if (!isThirtyMinuteSlot(slot.startsAt, slot.endsAt)) {
      throw new OfficeHourRuleError(
        "INVALID_DURATION",
        "مدت هر Slot باید دقیقاً ۳۰ دقیقه باشد.",
      );
    }
    if (slot.startsAt.getTime() <= now.getTime()) {
      throw new OfficeHourRuleError(
        "PAST_SLOT",
        "زمان آزاد باید بعد از زمان فعلی باشد.",
      );
    }
    if (
      slot.startsAt.getTime() < currentWeek.start.getTime() ||
      slot.endsAt.getTime() > nextWeek.endExclusive.getTime()
    ) {
      throw new OfficeHourRuleError(
        "OUTSIDE_ADMIN_WINDOW",
        "فقط زمان‌های هفته جاری یا هفته بلافاصله بعد، از شنبه تا جمعه، قابل ثبت هستند.",
      );
    }
  }

  return slots;
}

export type BookingEligibilityInput = {
  membershipStatus: string;
  slotStatus: string;
  startsAt: Date;
  endsAt: Date;
  now?: Date;
};

/**
 * Pure eligibility guard shared by the server action and unit tests.
 */
export function assertOfficeHourBookingEligible({
  membershipStatus,
  slotStatus,
  startsAt,
  endsAt,
  now = new Date(),
}: BookingEligibilityInput) {
  if (membershipStatus !== "ACTIVE") {
    throw new OfficeHourRuleError(
      "MEMBERSHIP_INACTIVE",
      "Office Hour فقط برای اعضای فعال در دسترس است.",
    );
  }
  if (slotStatus !== "OPEN") {
    throw new OfficeHourRuleError(
      "SLOT_NOT_OPEN",
      "این زمان دیگر برای رزرو باز نیست.",
    );
  }
  if (!validDate(startsAt) || !validDate(endsAt) || !isThirtyMinuteSlot(startsAt, endsAt)) {
    throw new OfficeHourRuleError(
      "INVALID_DURATION",
      "Slot انتخاب‌شده دقیقاً ۳۰ دقیقه نیست.",
    );
  }
  if (!validDate(now) || startsAt.getTime() <= now.getTime()) {
    throw new OfficeHourRuleError(
      "PAST_SLOT",
      "زمان این Slot گذشته است.",
    );
  }

  const week = getIranWeekBounds(now);
  if (
    startsAt.getTime() < week.start.getTime() ||
    endsAt.getTime() > week.endExclusive.getTime()
  ) {
    throw new OfficeHourRuleError(
      "OUTSIDE_CURRENT_WEEK",
      "این Slot متعلق به هفته جاری ایران نیست.",
    );
  }
}

export function iranWeekStartForSlot(startsAt: Date) {
  if (!validDate(startsAt)) {
    throw new OfficeHourRuleError("INVALID_RANGE", "زمان Slot معتبر نیست.");
  }
  return getIranWeekBounds(startsAt).start;
}
