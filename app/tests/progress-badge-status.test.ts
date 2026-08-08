import { describe, expect, it } from "vitest";
import { earnedRankBadgeSlugs } from "../src/lib/credentials/progress-badges";
import {
  canParticipantStartModule,
  canParticipantSubmitModule,
} from "../src/lib/participant/module-transitions";

describe("progress badge current-state eligibility", () => {
  it("earns ranks only from the current complete module sets", () => {
    expect([...earnedRankBadgeSlugs([1, 2, 3])]).toEqual([]);
    expect([...earnedRankBadgeSlugs([1, 2, 3, 4])]).toEqual([
      "rank-ai-ready-professional",
    ]);
    expect([...earnedRankBadgeSlugs([1, 2, 3, 4, 5, 6, 7, 8])]).toEqual([
      "rank-ai-ready-professional",
      "rank-ai-problem-solver-solution-designer",
    ]);
  });

  it("withdraws dependent ranks as soon as one required pass is removed", () => {
    expect([...earnedRankBadgeSlugs([1, 2, 3, 5, 6, 7, 8, 9, 10, 11])]).toEqual([]);
  });
});

describe("participant module transition boundaries", () => {
  it("never lets participant writes regress a reviewed or pending module", () => {
    expect(canParticipantStartModule("UNLOCKED")).toBe(true);
    expect(canParticipantSubmitModule("IN_PROGRESS")).toBe(true);
    expect(canParticipantSubmitModule("REVISE")).toBe(true);
    for (const status of ["LOCKED", "SUBMITTED", "PASSED", "HOLD", "REMEDIAL"] as const) {
      expect(canParticipantStartModule(status)).toBe(false);
      expect(canParticipantSubmitModule(status)).toBe(false);
    }
  });
});
