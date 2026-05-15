import { describe, expect, it } from "vitest";
import { canTransitionApplication } from "../src/lib/services/status";

describe("application status transitions", () => {
  it("allows submitted applications to enter review", () => {
    expect(canTransitionApplication("SUBMITTED", "UNDER_REVIEW")).toBe(true);
  });

  it("allows accepted applications to enroll", () => {
    expect(canTransitionApplication("ACCEPTED", "ENROLLED")).toBe(true);
  });

  it("prevents enrolled applications moving backwards", () => {
    expect(canTransitionApplication("ENROLLED", "UNDER_REVIEW")).toBe(false);
  });
});
