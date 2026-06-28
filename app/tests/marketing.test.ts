import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prospectScore, warmthWeight, LIVE_STAGES } from "../src/lib/marketing/constants";
import {
  advanceFollowup,
  isFollowupDue,
  nextFollowupDue,
  nextFollowupLabel,
  MAX_FOLLOWUP_STEPS,
} from "../src/lib/marketing/followup";
import { coachNudges, coachVerdict, type CoachInput } from "../src/lib/marketing/coach";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("prospect score", () => {
  it("weights warmth correctly (warm 4x ... cold 1x)", () => {
    expect(warmthWeight("WARM")).toBe(4);
    expect(warmthWeight("REFERRAL")).toBe(3);
    expect(warmthWeight("COLD_ENGAGED")).toBe(2);
    expect(warmthWeight("COLD")).toBe(1);
  });

  it("score = warmth x (pain + authority + icp)", () => {
    expect(prospectScore({ warmth: "WARM", pain: 5, authority: 5, icpFit: 5 })).toBe(60);
    expect(prospectScore({ warmth: "COLD", pain: 1, authority: 1, icpFit: 1 })).toBe(3);
    expect(prospectScore({ warmth: "REFERRAL", pain: 4, authority: 3, icpFit: 5 })).toBe(36);
  });

  it("live pipeline excludes terminal and not-yet-approached stages", () => {
    expect(LIVE_STAGES).not.toContain("LIST");
    expect(LIVE_STAGES).not.toContain("PAID");
    expect(LIVE_STAGES).not.toContain("LOST");
    expect(LIVE_STAGES).toContain("REPLIED");
  });
});

describe("follow-up engine (FU1 +3d, FU2 +7d, FU3 +7d)", () => {
  const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

  it("schedules the cadence offsets", () => {
    expect(nextFollowupDue(0, day("2026-06-01"))?.toISOString().slice(0, 10)).toBe("2026-06-04");
    expect(nextFollowupDue(1, day("2026-06-04"))?.toISOString().slice(0, 10)).toBe("2026-06-11");
    expect(nextFollowupDue(2, day("2026-06-11"))?.toISOString().slice(0, 10)).toBe("2026-06-18");
    expect(nextFollowupDue(3, day("2026-06-18"))).toBeNull();
  });

  it("labels the next follow-up and stops after FU3", () => {
    expect(nextFollowupLabel(0)).toBe("FU1");
    expect(nextFollowupLabel(2)).toBe("FU3");
    expect(nextFollowupLabel(MAX_FOLLOWUP_STEPS)).toBeNull();
  });

  it("advances and parks after the third follow-up", () => {
    const a = advanceFollowup(0, day("2026-06-04"));
    expect(a).toMatchObject({ step: 1, parked: false });
    const b = advanceFollowup(2, day("2026-06-18"));
    expect(b.step).toBe(3);
    expect(b.parked).toBe(true);
    expect(b.nextDue).toBeNull();
  });

  it("isFollowupDue compares at day resolution", () => {
    expect(isFollowupDue(day("2026-06-04"), new Date("2026-06-04T23:59:00Z"))).toBe(true);
    expect(isFollowupDue(day("2026-06-04"), new Date("2026-06-05T00:01:00Z"))).toBe(true); // overdue
    expect(isFollowupDue(day("2026-06-05"), new Date("2026-06-04T12:00:00Z"))).toBe(false);
    expect(isFollowupDue(null, new Date())).toBe(false);
  });
});

const base: CoachInput = {
  targetBreakEven: 2,
  targetIdeal: 3,
  targetStretch: 5,
  targetPipeline: 30,
  pivotMessagesThreshold: 150,
  pivotCallsThreshold: 10,
  elapsedDays: 10,
  remainingDays: 20,
  progressPct: 33,
  messagesSent: 60,
  messagesExpected: 80,
  repliesReceived: 12,
  callsHeld: 4,
  paidNow: 0,
  activePipeline: 20,
  staleHotProspects: [],
  followupsDueToday: 0,
};

describe("coach verdict", () => {
  it("recognizes the three win tiers", () => {
    expect(coachVerdict({ ...base, paidNow: 5 }).verdict).toBe("stretch_win");
    expect(coachVerdict({ ...base, paidNow: 3 }).verdict).toBe("ideal_win");
    expect(coachVerdict({ ...base, paidNow: 2 }).verdict).toBe("break_even_win");
  });

  it("calls quit at 1.5x pivot messages, <2 calls, >=70% elapsed", () => {
    const v = coachVerdict({ ...base, messagesSent: 230, callsHeld: 1, progressPct: 75 });
    expect(v.verdict).toBe("quit");
  });

  it("calls pivot at threshold messages with too few calls", () => {
    const v = coachVerdict({ ...base, messagesSent: 160, callsHeld: 4 });
    expect(v.verdict).toBe("pivot");
  });

  it("defaults to on_track / build by volume", () => {
    expect(coachVerdict(base).verdict).toBe("on_track");
    expect(coachVerdict({ ...base, messagesSent: 10 }).verdict).toBe("build");
  });
});

describe("coach nudges", () => {
  it("flags low reply rate and celebrates a working hook", () => {
    const low = coachNudges({ ...base, messagesSent: 50, repliesReceived: 2 });
    expect(low.some((n) => n.title === "Reply rate is low")).toBe(true);
    const high = coachNudges({ ...base, messagesSent: 50, repliesReceived: 12, messagesExpected: 50 });
    expect(high.some((n) => n.title === "Hook is working")).toBe(true);
  });

  it("flags closing problems and wins", () => {
    const bad = coachNudges({ ...base, callsHeld: 6, paidNow: 0 });
    expect(bad.some((n) => n.title === "Conversations aren't closing")).toBe(true);
    const good = coachNudges({ ...base, callsHeld: 5, paidNow: 2, messagesExpected: 60 });
    expect(good.some((n) => n.title === "Offer converts in conversation")).toBe(true);
  });

  it("surfaces due follow-ups first and thin pipeline", () => {
    const n = coachNudges({ ...base, followupsDueToday: 3, activePipeline: 5, messagesExpected: 60 });
    expect(n[0].title).toContain("follow-ups due today");
    expect(n.some((x) => x.title === "Pipeline coverage is thin")).toBe(true);
  });
});

describe("marketing security gating (source regression)", () => {
  const actions = read("src/lib/actions/marketing.ts");
  const layout = read("src/app/(admin)/admin/marketing/layout.tsx");
  const authz = read("src/lib/authz.ts");

  it("every exported marketing action requires the super admin", () => {
    const exported = actions.match(/export async function \w+/g) ?? [];
    expect(exported.length).toBeGreaterThanOrEqual(12);
    // every exported action body must call requireSuperAdmin before mutating
    const bodies = actions.split(/export async function /).slice(1);
    for (const body of bodies) {
      expect(body.slice(0, 400)).toContain("requireSuperAdmin");
    }
  });

  it("the marketing layout 404s for non-super admins", () => {
    expect(layout).toContain("isSuperAdmin");
    expect(layout).toContain("notFound()");
  });

  it("super admin defaults to the founder account", () => {
    // The founder account is always a default super admin (listed first, so it is
    // also the primary notification recipient); SUPER_ADMIN_EMAILS overrides the set.
    expect(authz).toContain('process.env.SUPER_ADMIN_EMAILS ?? "mail@mehrdadnaderi.com,pegah.rostam@gmail.com"');
    expect(authz).toContain("superAdminEmails()[0]");
  });
});
