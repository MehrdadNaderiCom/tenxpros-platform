import { describe, expect, it } from "vitest";
import {
  assertThirtyMinuteSlot,
  createThirtyMinuteSlots,
  getIranWeekBounds,
  getIranWeekDatabaseDate,
  getIranWeekKey,
  isSameIranWeek,
  isThirtyMinuteSlot,
  isWithinIranWeek,
  tehranLocalDateTimeToUtc,
} from "../src/lib/iran-week";

describe("Iran week boundaries", () => {
  it("starts at Saturday midnight in Tehran", () => {
    const bounds = getIranWeekBounds("2026-08-03T10:00:00.000Z");

    expect(bounds.key).toBe("2026-08-01");
    expect(bounds.start.toISOString()).toBe("2026-07-31T20:30:00.000Z");
    expect(bounds.endExclusive.toISOString()).toBe(
      "2026-08-07T20:30:00.000Z",
    );
  });

  it("moves to a new week precisely at Tehran's Saturday midnight", () => {
    const finalFridayInstant = "2026-07-31T20:29:59.999Z";
    const firstSaturdayInstant = "2026-07-31T20:30:00.000Z";

    expect(getIranWeekKey(finalFridayInstant)).toBe("2026-07-25");
    expect(getIranWeekKey(firstSaturdayInstant)).toBe("2026-08-01");
    expect(isSameIranWeek(finalFridayInstant, firstSaturdayInstant)).toBe(
      false,
    );
  });

  it("uses an exclusive end boundary", () => {
    const bounds = getIranWeekBounds("2026-08-01T12:00:00.000Z");

    expect(isWithinIranWeek(bounds.start, bounds)).toBe(true);
    expect(isWithinIranWeek(bounds.endInclusive, bounds)).toBe(true);
    expect(isWithinIranWeek(bounds.endExclusive, bounds)).toBe(false);
  });

  it("creates a stable database DATE from the week key", () => {
    expect(
      getIranWeekDatabaseDate("2026-08-03T10:00:00.000Z").toISOString(),
    ).toBe("2026-08-01T00:00:00.000Z");
  });
});

describe("30-minute Office Hour slots", () => {
  it("converts admin input through the Tehran IANA time zone", () => {
    expect(
      tehranLocalDateTimeToUtc("2026-08-01", "09:00").toISOString(),
    ).toBe("2026-08-01T05:30:00.000Z");
  });

  it("splits a Tehran window into exact 30-minute slots", () => {
    const slots = createThirtyMinuteSlots({
      date: "2026-08-01",
      startTime: "09:00",
      endTime: "10:30",
    });

    expect(slots).toHaveLength(3);
    expect(slots[0]?.startsAt.toISOString()).toBe(
      "2026-08-01T05:30:00.000Z",
    );
    expect(slots[2]?.endsAt.toISOString()).toBe(
      "2026-08-01T07:00:00.000Z",
    );
  });

  it("rejects a partial admin availability interval", () => {
    expect(() =>
      createThirtyMinuteSlots({
        date: "2026-08-01",
        startTime: "09:00",
        endTime: "09:45",
      }),
    ).toThrow(RangeError);
  });

  it("accepts exactly 30 minutes", () => {
    const start = new Date("2026-08-02T08:00:00.000Z");
    const end = new Date("2026-08-02T08:30:00.000Z");

    expect(isThirtyMinuteSlot(start, end)).toBe(true);
    expect(() => assertThirtyMinuteSlot(start, end)).not.toThrow();
  });

  it("rejects shorter, longer, reversed, and invalid intervals", () => {
    expect(
      isThirtyMinuteSlot(
        "2026-08-02T08:00:00.000Z",
        "2026-08-02T08:29:59.999Z",
      ),
    ).toBe(false);
    expect(
      isThirtyMinuteSlot(
        "2026-08-02T08:30:00.000Z",
        "2026-08-02T08:00:00.000Z",
      ),
    ).toBe(false);
    expect(isThirtyMinuteSlot("invalid", "also-invalid")).toBe(false);
  });
});
