import { describe, expect, it } from "vitest";

import {
  assertOfficeHourBookingEligible,
  createAdminAvailabilitySlots,
  iranWeekStartForSlot,
  OfficeHourRuleError,
} from "@/lib/tehran-slots";

const NOW = new Date("2026-08-02T04:00:00.000Z");

function caughtError(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the operation to throw.");
}

describe("Tehran availability slots", () => {
  it("converts a current-week Tehran range to exact UTC half-hours", () => {
    const slots = createAdminAvailabilitySlots(
      {
        date: "2026-08-02",
        startTime: "09:00",
        endTime: "10:30",
      },
      NOW,
    );

    expect(slots).toHaveLength(3);
    expect(slots[0]?.startsAt.toISOString()).toBe("2026-08-02T05:30:00.000Z");
    expect(slots[0]?.endsAt.toISOString()).toBe("2026-08-02T06:00:00.000Z");
    expect(slots[2]?.endsAt.toISOString()).toBe("2026-08-02T07:00:00.000Z");
  });

  it("allows the final complete Friday slot in the current Iranian week", () => {
    const slots = createAdminAvailabilitySlots(
      {
        date: "2026-08-07",
        startTime: "23:00",
        endTime: "23:30",
      },
      NOW,
    );

    expect(slots).toHaveLength(1);
    expect(slots[0]?.endsAt.toISOString()).toBe("2026-08-07T20:00:00.000Z");
  });

  it("accepts the immediately next Iranian week for admin planning", () => {
    const slots = createAdminAvailabilitySlots(
      {
        date: "2026-08-08",
        startTime: "09:00",
        endTime: "10:00",
      },
      NOW,
    );

    expect(slots).toHaveLength(2);
    expect(slots[0]?.startsAt.toISOString()).toBe(
      "2026-08-08T05:30:00.000Z",
    );
  });

  it("rejects partial, past, and later-than-next-week ranges", () => {
    expect(() =>
      createAdminAvailabilitySlots(
        {
          date: "2026-08-02",
          startTime: "09:00",
          endTime: "09:45",
        },
        NOW,
      ),
    ).toThrowError(OfficeHourRuleError);

    expect(
      caughtError(() =>
        createAdminAvailabilitySlots(
          {
            date: "2026-08-02",
            startTime: "07:00",
            endTime: "07:30",
          },
          NOW,
        ),
      ),
    ).toMatchObject({ code: "PAST_SLOT" });

    expect(
      caughtError(() =>
        createAdminAvailabilitySlots(
          {
            date: "2026-08-15",
            startTime: "09:00",
            endTime: "09:30",
          },
          NOW,
        ),
      ),
    ).toMatchObject({ code: "OUTSIDE_ADMIN_WINDOW" });
  });
});

describe("Office Hour booking eligibility", () => {
  const validSlot = {
    membershipStatus: "ACTIVE",
    slotStatus: "OPEN",
    startsAt: new Date("2026-08-03T05:30:00.000Z"),
    endsAt: new Date("2026-08-03T06:00:00.000Z"),
    now: NOW,
  };

  it("accepts an active member and returns the Tehran Saturday UTC instant", () => {
    expect(() => assertOfficeHourBookingEligible(validSlot)).not.toThrow();
    expect(iranWeekStartForSlot(validSlot.startsAt).toISOString()).toBe(
      "2026-07-31T20:30:00.000Z",
    );
  });

  it("rejects inactive membership and an already reserved slot", () => {
    expect(caughtError(() =>
      assertOfficeHourBookingEligible({
        ...validSlot,
        membershipStatus: "PENDING_PAYMENT",
      }),
    )).toMatchObject({ code: "MEMBERSHIP_INACTIVE" });

    expect(caughtError(() =>
      assertOfficeHourBookingEligible({
        ...validSlot,
        slotStatus: "RESERVED",
      }),
    )).toMatchObject({ code: "SLOT_NOT_OPEN" });
  });

  it("rejects a non-30-minute or next-week slot", () => {
    expect(caughtError(() =>
      assertOfficeHourBookingEligible({
        ...validSlot,
        endsAt: new Date("2026-08-03T06:15:00.000Z"),
      }),
    )).toMatchObject({ code: "INVALID_DURATION" });

    expect(caughtError(() =>
      assertOfficeHourBookingEligible({
        ...validSlot,
        startsAt: new Date("2026-08-08T05:30:00.000Z"),
        endsAt: new Date("2026-08-08T06:00:00.000Z"),
      }),
    )).toMatchObject({ code: "OUTSIDE_CURRENT_WEEK" });
  });
});
