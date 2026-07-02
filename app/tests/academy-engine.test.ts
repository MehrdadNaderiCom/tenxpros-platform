import { describe, it, expect } from "vitest";
import {
  makeRng,
  shuffle,
  selectExamQuestionIds,
  shuffleOptions,
  applyLayout,
  gradeSitting,
  evaluateExerciseAttempt,
  isModuleUnlocked,
  canOpenFinalExam,
  isInCooldown,
  cooldownUntil,
  allModulesPassed,
  academyBadgeSerial,
  normalizeStem,
  EXERCISE_MAX_ATTEMPTS,
  ACADEMY_MODULE_COUNT,
  CERTIFICATION_MODULE_FILTER,
} from "../src/lib/academy/engine";

describe("academy engine: rng + shuffle", () => {
  it("makeRng is deterministic for a seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("shuffle keeps the same multiset and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, makeRng(7));
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("academy engine: exam draw", () => {
  const pool = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "q11", "q12"];

  it("serves exactly examSize questions from the pool only", () => {
    const drawn = selectExamQuestionIds(pool, 10, [], makeRng(1));
    expect(drawn).toHaveLength(10);
    expect(drawn.every((id) => pool.includes(id))).toBe(true);
    expect(new Set(drawn).size).toBe(10);
  });

  it("never serves more than the pool holds", () => {
    const drawn = selectExamQuestionIds(["a", "b", "c"], 10, [], makeRng(1));
    expect(drawn).toHaveLength(3);
  });

  it("prioritizes unseen questions on a retake", () => {
    const seen = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];
    const drawn = selectExamQuestionIds(pool, 10, seen, makeRng(99));
    // The two unseen ids (q11, q12) must both be served before reusing seen ones.
    expect(drawn).toContain("q11");
    expect(drawn).toContain("q12");
  });

  it("two consecutive draws are not guaranteed identical", () => {
    const first = selectExamQuestionIds(pool, 10, [], makeRng(1));
    const second = selectExamQuestionIds(pool, 10, [], makeRng(2));
    expect(first).not.toEqual(second);
  });
});

describe("academy engine: option shuffle", () => {
  it("remaps the correct index and preserves the option set", () => {
    const opts = ["A", "B", "C", "D"];
    const layout = shuffleOptions(4, 2, makeRng(3));
    const shown = applyLayout(opts, layout);
    expect(shown.slice().sort()).toEqual(["A", "B", "C", "D"]);
    // The displayed correct option is still "C".
    expect(shown[layout.correctIndex]).toBe("C");
  });
});

describe("academy engine: grading + pass mark", () => {
  const served = [{ correctIndex: 1 }, { correctIndex: 0 }, { correctIndex: 3 }, { correctIndex: 2 }, { correctIndex: 1 }];

  it("scores correct selections and rounds the percent", () => {
    const r = gradeSitting(served, [1, 0, 3, 2, 1], 80);
    expect(r.correctCount).toBe(5);
    expect(r.percent).toBe(100);
    expect(r.passed).toBe(true);
  });

  it("eighty percent passes, below does not", () => {
    const ten = Array.from({ length: 10 }, () => ({ correctIndex: 0 }));
    const eight = gradeSitting(ten, [0, 0, 0, 0, 0, 0, 0, 0, 9, 9], 80);
    expect(eight.percent).toBe(80);
    expect(eight.passed).toBe(true);
    const seven = gradeSitting(ten, [0, 0, 0, 0, 0, 0, 0, 9, 9, 9], 80);
    expect(seven.percent).toBe(70);
    expect(seven.passed).toBe(false);
  });

  it("treats missing answers as wrong", () => {
    const r = gradeSitting(served, [1, null, undefined, 2, 1], 80);
    expect(r.correctCount).toBe(3);
    expect(r.passed).toBe(false);
  });
});

describe("academy engine: exercises never dead-end", () => {
  it("a correct attempt completes and reveals", () => {
    const o = evaluateExerciseAttempt(2, 2, 1);
    expect(o).toMatchObject({ correct: true, revealCorrect: true, completed: true });
  });

  it("a wrong attempt before the last withholds the correct option", () => {
    const o = evaluateExerciseAttempt(0, 2, 1);
    expect(o.correct).toBe(false);
    expect(o.revealCorrect).toBe(false);
    expect(o.completed).toBe(false);
  });

  it("the third wrong attempt reveals and completes", () => {
    const o = evaluateExerciseAttempt(0, 2, EXERCISE_MAX_ATTEMPTS);
    expect(o.correct).toBe(false);
    expect(o.isFinalAttempt).toBe(true);
    expect(o.revealCorrect).toBe(true);
    expect(o.completed).toBe(true);
  });
});

describe("academy engine: sequencing, gating, cooldown, badge", () => {
  it("module one is open, others need the previous pass", () => {
    expect(isModuleUnlocked(1, false)).toBe(true);
    expect(isModuleUnlocked(2, false)).toBe(false);
    expect(isModuleUnlocked(2, true)).toBe(true);
  });

  it("the final exam needs the lesson read and exercises done", () => {
    expect(canOpenFinalExam(false, true)).toBe(false);
    expect(canOpenFinalExam(true, false)).toBe(false);
    expect(canOpenFinalExam(true, true)).toBe(true);
  });

  it("cooldown blocks until it elapses", () => {
    const now = new Date("2026-06-29T12:00:00Z");
    const until = cooldownUntil(now, 24);
    expect(isInCooldown(until, now)).toBe(true);
    expect(isInCooldown(until, new Date("2026-06-30T12:00:01Z"))).toBe(false);
    expect(isInCooldown(null, now)).toBe(false);
  });

  it("the badge gates strictly on all fourteen modules", () => {
    expect(allModulesPassed(13)).toBe(false);
    expect(allModulesPassed(14)).toBe(true);
  });

  it("the certification gate counts only published, exam-bearing modules (finding 3)", () => {
    // Both the published-module count and the passed-module count use this exact
    // filter, so a progress row on an informational module (isInformational=true),
    // even if a superadmin marked it complete, is never counted toward the gate.
    expect(CERTIFICATION_MODULE_FILTER).toEqual({ isPublished: true, isInformational: false });
    // Passing only the exam-bearing modules is required: the threshold is 14.
    expect(ACADEMY_MODULE_COUNT).toBe(14);
    expect(allModulesPassed(ACADEMY_MODULE_COUNT - 1, ACADEMY_MODULE_COUNT)).toBe(false);
    expect(allModulesPassed(ACADEMY_MODULE_COUNT, ACADEMY_MODULE_COUNT)).toBe(true);
  });

  it("badge serial is zero-padded and carries the year", () => {
    expect(academyBadgeSerial(2026, 123)).toBe("TXP-PA-2026-000123");
  });

  it("normalizeStem makes duplicate detection robust", () => {
    expect(normalizeStem("What  is the MISSION?")).toBe(normalizeStem("what is the mission"));
  });
});
