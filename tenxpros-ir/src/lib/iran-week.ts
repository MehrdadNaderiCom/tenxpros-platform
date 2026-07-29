import { IRAN_TIME_ZONE } from "./config";

export { IRAN_TIME_ZONE };

export const IRAN_WEEK_START_DAY = 6 as const;
export const OFFICE_HOUR_DURATION_MINUTES = 30 as const;

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type IranWeekBounds = {
  /** Gregorian date of the Saturday in Tehran, formatted as YYYY-MM-DD. */
  key: string;
  /** Alias used by persistence and booking code. */
  weekKey: string;
  /** Saturday at 00:00 in Tehran, represented as an absolute UTC instant. */
  start: Date;
  /** Alias that makes the UTC instant semantics explicit. */
  startsAt: Date;
  /** The following Saturday at 00:00 in Tehran. */
  endExclusive: Date;
  /** Alias for the exclusive end instant. */
  endsAt: Date;
  /** Friday's final millisecond. Prefer endExclusive for database queries. */
  endInclusive: Date;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function zonedPartsFormatter(timeZone: string) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function localDateParts(
  instant: Date,
  timeZone = IRAN_TIME_ZONE,
): LocalDateParts {
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError("A valid date is required.");
  }

  const values: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of zonedPartsFormatter(timeZone).formatToParts(instant)) {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day" ||
      part.type === "hour" ||
      part.type === "minute" ||
      part.type === "second"
    ) {
      values[part.type] = Number(part.value);
    }
  }

  return {
    year: values.year!,
    month: values.month!,
    day: values.day!,
    hour: values.hour!,
    minute: values.minute!,
    second: values.second!,
  };
}

function localDateTimeToUtc(
  parts: LocalDateParts,
  timeZone = IRAN_TIME_ZONE,
) {
  const targetAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let candidate = targetAsUtc;

  // Iteration keeps this correct if Tehran's UTC offset changes in the future.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const represented = localDateParts(new Date(candidate), timeZone);
    const representedAsUtc = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
      represented.second,
    );
    const correction = targetAsUtc - representedAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }

  return new Date(candidate);
}

function parseGregorianDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new RangeError("Date must use the YYYY-MM-DD format.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    throw new RangeError("The Gregorian date is invalid.");
  }
  return { year, month, day };
}

function parseLocalTime(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new RangeError("Time must use the 24-hour HH:mm format.");
  }
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    totalMinutes: Number(match[1]) * 60 + Number(match[2]),
  };
}

function addGregorianCalendarDays(
  date: Pick<LocalDateParts, "year" | "month" | "day">,
  days: number,
) {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day + days),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function dateKey(date: Pick<LocalDateParts, "year" | "month" | "day">) {
  return [
    String(date.year).padStart(4, "0"),
    String(date.month).padStart(2, "0"),
    String(date.day).padStart(2, "0"),
  ].join("-");
}

export function getIranWeekBounds(
  input: Date | string | number = new Date(),
): IranWeekBounds {
  const instant = input instanceof Date ? new Date(input) : new Date(input);
  const local = localDateParts(instant);
  const localWeekday = new Date(
    Date.UTC(local.year, local.month - 1, local.day),
  ).getUTCDay();
  const daysSinceSaturday =
    (localWeekday - IRAN_WEEK_START_DAY + 7) % 7;
  const saturday = addGregorianCalendarDays(local, -daysSinceSaturday);
  const nextSaturday = addGregorianCalendarDays(saturday, 7);

  const start = localDateTimeToUtc({
    ...saturday,
    hour: 0,
    minute: 0,
    second: 0,
  });
  const endExclusive = localDateTimeToUtc({
    ...nextSaturday,
    hour: 0,
    minute: 0,
    second: 0,
  });

  return {
    key: dateKey(saturday),
    weekKey: dateKey(saturday),
    start,
    startsAt: start,
    endExclusive,
    endsAt: endExclusive,
    endInclusive: new Date(endExclusive.getTime() - 1),
  };
}

export function getIranWeekKey(input: Date | string | number = new Date()) {
  return getIranWeekBounds(input).key;
}

/**
 * Converts a Gregorian date and wall-clock time entered by an administrator in
 * Tehran into an absolute instant. The IANA zone database is used rather than a
 * fixed UTC offset.
 */
export function tehranLocalDateTimeToUtc(date: string, time: string) {
  const localDate = parseGregorianDate(date);
  const localTime = parseLocalTime(time);
  const converted = localDateTimeToUtc({
    ...localDate,
    hour: localTime.hour,
    minute: localTime.minute,
    second: 0,
  });
  const roundTrip = localDateParts(converted);

  if (
    roundTrip.year !== localDate.year ||
    roundTrip.month !== localDate.month ||
    roundTrip.day !== localDate.day ||
    roundTrip.hour !== localTime.hour ||
    roundTrip.minute !== localTime.minute
  ) {
    throw new RangeError(
      "This local Tehran time does not map to a valid instant.",
    );
  }
  return converted;
}

export type ThirtyMinuteSlot = {
  startsAt: Date;
  endsAt: Date;
  localDate: string;
  localStartTime: string;
  localEndTime: string;
};

function minutesToTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Splits a same-day Tehran availability window into complete 30-minute slots.
 */
export function createThirtyMinuteSlots(input: {
  date: string;
  startTime: string;
  endTime: string;
}): ThirtyMinuteSlot[] {
  parseGregorianDate(input.date);
  const start = parseLocalTime(input.startTime);
  const end = parseLocalTime(input.endTime);
  const duration = end.totalMinutes - start.totalMinutes;

  if (
    start.minute % OFFICE_HOUR_DURATION_MINUTES !== 0 ||
    end.minute % OFFICE_HOUR_DURATION_MINUTES !== 0 ||
    duration <= 0 ||
    duration % OFFICE_HOUR_DURATION_MINUTES !== 0
  ) {
    throw new RangeError(
      "The availability window must contain complete 30-minute intervals.",
    );
  }

  const slots: ThirtyMinuteSlot[] = [];
  for (
    let cursor = start.totalMinutes;
    cursor < end.totalMinutes;
    cursor += OFFICE_HOUR_DURATION_MINUTES
  ) {
    const localStartTime = minutesToTime(cursor);
    const localEndTime = minutesToTime(
      cursor + OFFICE_HOUR_DURATION_MINUTES,
    );
    const startsAt = tehranLocalDateTimeToUtc(
      input.date,
      localStartTime,
    );
    const endsAt = tehranLocalDateTimeToUtc(input.date, localEndTime);
    assertThirtyMinuteSlot(startsAt, endsAt);
    slots.push({
      startsAt,
      endsAt,
      localDate: input.date,
      localStartTime,
      localEndTime,
    });
  }
  return slots;
}

export function getIranWeekStart(
  input: Date | string | number = new Date(),
) {
  return getIranWeekBounds(input).start;
}

/**
 * Value suitable for the `@db.Date` audit column. Eligibility must be enforced
 * with `iranWeekKey`, because a SQL DATE has no time-zone semantics.
 */
export function getIranWeekDatabaseDate(input: Date | string | number) {
  return new Date(`${getIranWeekKey(input)}T00:00:00.000Z`);
}

export function isSameIranWeek(
  left: Date | string | number,
  right: Date | string | number,
) {
  return getIranWeekKey(left) === getIranWeekKey(right);
}

export function isWithinIranWeek(
  instant: Date | string | number,
  week: IranWeekBounds,
) {
  const timestamp = new Date(instant).getTime();
  if (Number.isNaN(timestamp)) return false;
  return (
    timestamp >= week.start.getTime() &&
    timestamp < week.endExclusive.getTime()
  );
}

export function isThirtyMinuteSlot(
  startAt: Date | string | number,
  endAt: Date | string | number,
) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end - start === OFFICE_HOUR_DURATION_MINUTES * 60_000
  );
}

export function assertThirtyMinuteSlot(
  startAt: Date | string | number,
  endAt: Date | string | number,
) {
  if (!isThirtyMinuteSlot(startAt, endAt)) {
    throw new RangeError(
      "Office Hour availability must be exactly 30 minutes.",
    );
  }
}

export function formatTehranDateTime(
  input: Date | string | number,
  locale = "fa-IR-u-ca-persian",
) {
  const instant = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError("A valid date is required.");
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: IRAN_TIME_ZONE,
    dateStyle: "full",
    timeStyle: "short",
  }).format(instant);
}
