import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACADEMY_EVENT_KINDS,
  BEAT_INTERVAL_SECONDS,
  BEAT_MAX_CREDIT_SECONDS,
  beatCredit,
  clampScrollPct,
  formatDuration,
} from "../src/lib/academy/telemetry-core";

const at = (ms: number) => new Date(ms);

// ---------------------------------------------------------------------------
// The clamp: no beat pattern can inflate reading time.
// ---------------------------------------------------------------------------

describe("beatCredit: server-side clamping of reading time", () => {
  it("credits zero on the first beat (no anchor): time accrues only between observed beats", () => {
    expect(beatCredit(null, at(100_000))).toBe(0);
    expect(beatCredit(undefined, at(100_000))).toBe(0);
  });

  it("credits the real elapsed seconds for a normal interval", () => {
    expect(beatCredit(at(100_000), at(100_000 + BEAT_INTERVAL_SECONDS * 1000))).toBe(BEAT_INTERVAL_SECONDS);
  });

  it("clamps a long gap (sleep, hidden tab, replay) to the maximum credit", () => {
    expect(beatCredit(at(0), at(3_600_000))).toBe(BEAT_MAX_CREDIT_SECONDS);
  });

  it("never credits negative or zero-elapsed beats (clock games)", () => {
    expect(beatCredit(at(200_000), at(100_000))).toBe(0);
    expect(beatCredit(at(100_000), at(100_000))).toBe(0);
  });

  it("N beats can never credit more than N times the maximum", () => {
    let total = 0;
    let anchor: Date | null = null;
    // Simulate 10 beats with wildly irregular gaps.
    const gaps = [1, 500, 20, 100_000, 3, 40, 0, 7, 86_400, 20];
    let now = 1_000_000;
    for (const g of gaps) {
      now += g * 1000;
      total += beatCredit(anchor, at(now));
      anchor = at(now);
    }
    expect(total).toBeLessThanOrEqual(gaps.length * BEAT_MAX_CREDIT_SECONDS);
  });
});

describe("clampScrollPct and formatDuration", () => {
  it("clamps scroll into 0..100 integers and survives junk", () => {
    expect(clampScrollPct(150)).toBe(100);
    expect(clampScrollPct(-5)).toBe(0);
    expect(clampScrollPct(55.6)).toBe(56);
    expect(clampScrollPct("not a number")).toBe(0);
  });

  it("formats durations for the admin panel", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(252)).toBe("4m 12s");
    expect(formatDuration(4980)).toBe("1h 23m");
    expect(formatDuration(0)).toBe("0s");
  });
});

// ---------------------------------------------------------------------------
// The wiring: instrumentation lives inside the real actions (tamper resistant),
// the beacon is mounted, and the admin panel reads the analytics.
// ---------------------------------------------------------------------------

describe("telemetry wiring (source inspection)", () => {
  const actions = readFileSync(join(__dirname, "../src/lib/actions/academy.ts"), "utf8");
  const telemetry = readFileSync(join(__dirname, "../src/lib/academy/telemetry.ts"), "utf8");
  const modulePage = readFileSync(join(__dirname, "../src/app/(partner)/partner/academy/[slug]/page.tsx"), "utf8");
  const audio = readFileSync(join(__dirname, "../src/components/academy/audio-reader.tsx"), "utf8");
  const adminDetail = readFileSync(join(__dirname, "../src/app/(admin)/admin/partners/academy/[partnerId]/page.tsx"), "utf8");

  it("every lifecycle action logs its event server-side", () => {
    expect(actions).toContain('kind: "LESSON_READ"');
    expect(actions).toContain('kind: "EXERCISE_ANSWERED"');
    expect(actions).toContain('kind: "EXAM_STARTED"');
    expect(actions).toContain('kind: "EXAM_SUBMITTED"');
    expect(actions).toContain('kind: "FINAL_EXAM_STARTED"');
    expect(actions).toContain('kind: "FINAL_EXAM_SUBMITTED"');
    // Submitted exams carry the measured sitting duration.
    expect(actions).toContain("durationSeconds");
  });

  it("the closed event-kind set matches what the actions emit", () => {
    for (const k of ["MODULE_OPENED", "LESSON_READ", "EXERCISE_ANSWERED", "EXAM_STARTED", "EXAM_SUBMITTED", "FINAL_EXAM_STARTED", "FINAL_EXAM_SUBMITTED"]) {
      expect(ACADEMY_EVENT_KINDS).toContain(k);
    }
  });

  it("telemetry failures are swallowed so analytics can never break the partner flow", () => {
    // Every write helper carries a swallow-all catch.
    expect((telemetry.match(/catch \{/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("the module page mounts the beacon, disabled in admin preview", () => {
    expect(modulePage).toContain("<TelemetryBeacon slug={m.slug} disabled={preview} />");
  });

  it("the audio reader announces played seconds for the beacon (server player AND fallback)", () => {
    // The reader dispatches the beacon's own exported constant, so the event
    // name can never drift between the two files.
    expect(audio).toContain('import { AUDIO_SECOND_EVENT } from "@/components/academy/telemetry-beacon"');
    expect((audio.match(/new CustomEvent\(AUDIO_SECOND_EVENT\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("the FALLBACK speech path stays engine-safe (used only until the studio narration is ready)", () => {
    // Android engines can report the SAME voiceURI for different voices, so the
    // selection must key on name + lang, never on voiceURI.
    expect(audio).toContain("function voiceKey");
    expect(audio).toContain("${v.name}__${v.lang}");
    expect(audio).not.toContain("vv.voiceURI === voiceURI");
    // Some engines ignore `voice` unless the utterance lang matches it.
    expect(audio).toContain("u.lang = v.lang");
    // A settings change restarts from the current chunk while playing.
    expect(audio).toContain("if (playing) startFrom(currentChunkRef.current, opts)");
    // Stale onend events from a cancelled queue cannot corrupt state.
    expect(audio).toContain("generationRef.current !== gen");
  });

  it("the superadmin panel shows reading time, exam durations, and the behavior timeline", () => {
    expect(adminDetail).toContain("Engagement analytics");
    expect(adminDetail).toContain("academyEngagement.findMany");
    expect(adminDetail).toContain("academyEvent.findMany");
    expect(adminDetail).toContain("Recent activity");
  });
});

// ---------------------------------------------------------------------------
// The clarity layer: the 8-of-10 rule is explicit and config-derived everywhere.
// ---------------------------------------------------------------------------

describe("academy clarity (source inspection)", () => {
  const overview = readFileSync(join(__dirname, "../src/app/(partner)/partner/academy/page.tsx"), "utf8");
  const modulePage = readFileSync(join(__dirname, "../src/app/(partner)/partner/academy/[slug]/page.tsx"), "utf8");
  const queries = readFileSync(join(__dirname, "../src/lib/academy/queries.ts"), "utf8");
  const m01 = readFileSync(join(__dirname, "../prisma/seed/academy/m01-mission.ts"), "utf8");

  it("neededCorrect is computed from passMark and examSize, never typed as a literal", () => {
    expect(queries).toContain("Math.ceil((m.passMark / 100) * m.examSize)");
    expect(modulePage).toContain("Math.ceil((m.passMark / 100) * m.examSize)");
    expect(m01).toContain("Math.ceil((PASS_MARK / 100) * EXAM_SIZE)");
  });

  it("the overview teaches the three steps and the exact next action", () => {
    expect(overview).toContain("How the Academy works");
    expect(overview).toContain("Reading alone does not complete a module");
    expect(overview).toContain("Your next step");
    expect(overview).toContain("Take the Module");
  });

  it("a locked module names the exact module and score that opens it", () => {
    expect(overview).toContain("It opens when you pass the Module");
    expect(modulePage).toContain("It opens the moment you pass the");
  });

  it("module one itself teaches the mechanics, with interpolated numbers", () => {
    expect(m01).toContain("How this Academy works");
    expect(m01).toContain("${NEEDED_CORRECT} of ${EXAM_SIZE}");
    // The module count is sourced from the engine constant, never typed prose.
    expect(m01).toContain("step one of ${MODULE_COUNT}");
    expect(m01).toContain("ACADEMY_MODULE_COUNT");
    expect(m01).not.toMatch(/fourteen/i);
    // Both the rich body and the plain lesson teach it.
    expect(m01).toContain("Before anything else, know how this Academy works");
  });

  it("a pass points straight at the next module", () => {
    expect(modulePage).toContain("Continue to Module {nextModule.order}");
  });

  // Regression guards for the adversarial findings that were fixed.
  it("the next-step banner is cooldown-aware and never points at a refused exam", () => {
    expect(overview).toContain("resumeOnCooldown");
    expect(overview).toContain("finalOnCooldown");
    expect(overview).toContain("Retake opens");
  });

  it("the locked messaging uses the BLOCKING module's own exam numbers", () => {
    expect(overview).toContain("m.blockedBy.neededCorrect} of ${m.blockedBy.examSize}");
    expect(modulePage).toContain("blockedBy.neededCorrect} of ${blockedBy.examSize}");
  });

  it("the last module's prose promises the final exam, not a nonexistent next module", () => {
    expect(modulePage).toContain('" the comprehensive final exam"');
    expect(modulePage).toContain('"the comprehensive final exam"');
  });

  it("informational modules render as Reference, never as a numbered module", () => {
    expect(modulePage).toContain('m.isInformational ? "Reference"');
  });
});

describe("telemetry anti-abuse fixes (source inspection)", () => {
  const telemetry = readFileSync(join(__dirname, "../src/lib/academy/telemetry.ts"), "utf8");
  const roster = readFileSync(join(__dirname, "../src/app/(admin)/admin/partners/academy/page.tsx"), "utf8");

  it("beat crediting is a compare-and-set on the anchor, so concurrent beats cannot double-credit", () => {
    expect(telemetry).toContain("updateMany");
    expect(telemetry).toContain("lastBeatAt: existing.lastBeatAt");
    expect(telemetry).toContain("swapped.count === 0");
  });

  it("module views are throttled AND compare-and-set on their own anchor (concurrent spam counts once)", () => {
    expect(telemetry).toContain("VIEW_THROTTLE_SECONDS");
    expect(telemetry).toContain("lastViewAt: existing.lastViewAt");
    expect(telemetry).toContain("if (swapped.count === 0) return;");
  });

  it("the roster time total sums verified reading time only (audio is never added in)", () => {
    expect(roster).toContain("seconds: r._sum.readSeconds ?? 0");
    expect(roster).not.toContain("readSeconds ?? 0) + (r._sum.audioSeconds");
  });

  it("admin completion counts scope numerator and denominator to exam-bearing modules alike", () => {
    const adminDetail = readFileSync(join(__dirname, "../src/app/(admin)/admin/partners/academy/[partnerId]/page.tsx"), "utf8");
    const adminActions = readFileSync(join(__dirname, "../src/lib/actions/academy-admin.ts"), "utf8");
    // Roster numerator scoped like its denominator.
    expect(roster).toContain("module: { isPublished: true, isInformational: false }");
    // Detail numerator counts only exam-bearing module passes.
    expect(adminDetail).toContain("examBearingIds.has(p.moduleId)");
    // Manual completion never fabricates passes on reference pages.
    expect(adminActions).toContain("isPublished: true, isInformational: false");
  });
});
