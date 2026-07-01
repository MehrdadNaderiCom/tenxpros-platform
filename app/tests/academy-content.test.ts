import { describe, it, expect } from "vitest";
import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import { validateAcademyContent } from "../prisma/seed/academy";
import { ACADEMY_MODULE_COUNT, normalizeStem } from "../src/lib/academy/engine";

describe("Academy seed content", () => {
  it("passes the full integrity check (pools, options, keys, no dashes, no duplicate stems)", () => {
    expect(() => validateAcademyContent(ACADEMY_MODULES)).not.toThrow();
  });

  it("has the exam-bearing modules count from ACADEMY_MODULE_COUNT, contiguous order 1..N, unique slugs", () => {
    const examBearing = ACADEMY_MODULES.filter((m) => !m.isInformational);
    const informational = ACADEMY_MODULES.filter((m) => m.isInformational);
    // The gate counts only exam-bearing modules; informational ones are extra.
    expect(examBearing.length).toBe(ACADEMY_MODULE_COUNT);
    expect(informational.length).toBeGreaterThan(0);
    // Orders are contiguous across the full set (1..total), exam-bearing first.
    const orders = ACADEMY_MODULES.map((m) => m.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: ACADEMY_MODULES.length }, (_, i) => i + 1));
    const slugs = new Set(ACADEMY_MODULES.map((m) => m.slug));
    expect(slugs.size).toBe(ACADEMY_MODULES.length);
  });

  it("has six exercise and twelve exam questions per exam-bearing module (informational carry none)", () => {
    for (const m of ACADEMY_MODULES) {
      if (m.isInformational) {
        expect(m.exercises.length, m.slug).toBe(0);
        expect(m.exam.length, m.slug).toBe(0);
        continue;
      }
      expect(m.exercises.length, m.slug).toBe(6);
      expect(m.exam.length, m.slug).toBe(12);
      for (const q of [...m.exercises, ...m.exam]) {
        expect(q.options.length, q.stem).toBe(4);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThanOrEqual(3);
        expect(q.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it("never reuses a normalized stem across modules", () => {
    const seen = new Map<string, string>();
    for (const m of ACADEMY_MODULES) {
      for (const q of [...m.exercises, ...m.exam]) {
        const key = normalizeStem(q.stem);
        const prev = seen.get(key);
        expect(prev === undefined || prev === m.slug, `${q.stem} reused`).toBe(true);
        seen.set(key, m.slug);
      }
    }
  });

  it("contains no em or en dashes anywhere in shipped content", () => {
    for (const m of ACADEMY_MODULES) {
      const blob = [
        m.title,
        m.summary,
        m.lesson,
        m.bodyHtml ?? "",
        ...m.exercises.flatMap((q) => [q.stem, ...q.options, q.explanation]),
        ...m.exam.flatMap((q) => [q.stem, ...q.options, q.explanation]),
      ].join("\n");
      expect(/[\u2014\u2013]/.test(blob), m.slug).toBe(false);
    }
  });
});
