import { describe, expect, it } from "vitest";
import activeFollowAlong from "../src/data/academy-follow-along/active-elevenlabs-bella.json";
import { m03 } from "../prisma/seed/academy/m03-rules";
import { m14 } from "../prisma/seed/academy/m14-customize";
import {
  academyChapterExerciseGroups,
  academyChapteredModuleSlugs,
  academyChapterPlanForSlug,
  compatibleAcademyChapterPlan,
  formatAcademyChapterDuration,
} from "../src/lib/academy/chapter-plans";
import { visibleLessonContentHash } from "../src/lib/academy/narration-release";
import { sanitizeLessonHtml } from "../src/lib/academy/lesson-html";

const seeds = new Map([
  [m03.slug, m03],
  [m14.slug, m14],
]);

describe("Academy long-lesson chapter plans", () => {
  it("chapters only the two audited long lessons", () => {
    expect(academyChapteredModuleSlugs()).toEqual([
      "rules",
      "customize",
    ]);
  });

  it("is bound to canonical content and fails closed after any edit", () => {
    for (const slug of academyChapteredModuleSlugs()) {
      const plan = academyChapterPlanForSlug(slug);
      const seed = seeds.get(slug);
      expect(plan).not.toBeNull();
      expect(seed?.bodyHtml).toBeTruthy();
      const contentHash = visibleLessonContentHash(
        sanitizeLessonHtml(seed?.bodyHtml ?? ""),
      );
      expect(contentHash).toBe(plan?.contentHash);
      expect(
        compatibleAcademyChapterPlan({
          moduleSlug: slug,
          moduleOrder: plan!.moduleOrder,
          contentHash,
        }),
      ).toBe(plan);
      expect(
        compatibleAcademyChapterPlan({
          moduleSlug: slug,
          moduleOrder: plan!.moduleOrder,
          contentHash: "0".repeat(64),
        }),
      ).toBeNull();
    }
  });

  it("keeps three contiguous, focused ranges and partitions all exercises", () => {
    for (const slug of academyChapteredModuleSlugs()) {
      const plan = academyChapterPlanForSlug(slug)!;
      expect(plan.chapters).toHaveLength(3);
      expect(
        plan.chapters.map((chapter) => chapter.number),
      ).toEqual([
        `${plan.moduleOrder}.1`,
        `${plan.moduleOrder}.2`,
        `${plan.moduleOrder}.3`,
      ]);
      for (let index = 0; index < plan.chapters.length; index += 1) {
        const chapter = plan.chapters[index];
        expect(chapter.endMs).toBeGreaterThan(chapter.startMs);
        expect(chapter.endMs - chapter.startMs).toBeGreaterThanOrEqual(
          4 * 60 * 1_000,
        );
        expect(chapter.endMs - chapter.startMs).toBeLessThanOrEqual(
          13 * 60 * 1_000,
        );
        expect(chapter.exerciseOrders).toHaveLength(2);
        if (index > 0) {
          expect(chapter.startMs).toBe(
            plan.chapters[index - 1].endMs,
          );
        }
      }
      expect(
        plan.chapters
          .flatMap((chapter) => chapter.exerciseOrders)
          .slice()
          .sort((left, right) => left - right),
      ).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("uses exact heading cues and durations from the approved audio artifact", () => {
    for (const slug of academyChapteredModuleSlugs()) {
      const plan = academyChapterPlanForSlug(slug)!;
      const lesson = activeFollowAlong.lessons.find(
        (candidate) => candidate.lessonSlug === slug,
      );
      expect(lesson).toBeTruthy();
      expect(lesson?.contentHash).toBe(plan.contentHash);
      expect(plan.chapters.at(-1)?.endMs).toBe(
        Math.round((lesson?.durationSeconds ?? 0) * 1_000),
      );

      plan.chapters.forEach((chapter, index) => {
        const visibleCuePaths = new Set(
          lesson?.cues.map((candidate) =>
            candidate.sourceHtmlPath.replace(
              /#segment\[\d+\]$/u,
              "",
            ),
          ),
        );
        const cue = lesson?.cues.find(
          (candidate) =>
            candidate.sourceHtmlPath ===
            chapter.audioStartSourceHtmlPath,
        );
        expect(cue).toBeTruthy();
        expect(
          visibleCuePaths.has(
            chapter.readingStartSourceHtmlPath,
          ),
        ).toBe(true);
        if (index === 0) {
          expect(chapter.startMs).toBe(0);
          expect(cue?.startMs).toBeLessThan(1_000);
        } else {
          expect(cue?.startMs).toBe(chapter.startMs);
        }
        if (index < plan.chapters.length - 1) {
          expect(chapter.endMs).toBe(
            plan.chapters[index + 1].startMs,
          );
        }
        expect(formatAcademyChapterDuration(chapter)).toMatch(
          /^\d{1,2}:\d{2}$/u,
        );
      });
    }
  });

  it("groups by stable question order and never drops or duplicates a question", () => {
    const questions = Array.from({ length: 6 }, (_, index) => ({
      id: `q${index + 1}`,
      order: index + 1,
    }));
    const rules = academyChapterExerciseGroups(
      academyChapterPlanForSlug("rules")!,
      questions,
    );
    expect(rules?.map((group) => group.questionIds)).toEqual([
      ["q1", "q4"],
      ["q3", "q5"],
      ["q2", "q6"],
    ]);

    const customize = academyChapterExerciseGroups(
      academyChapterPlanForSlug("customize")!,
      questions,
    );
    expect(customize?.map((group) => group.questionIds)).toEqual([
      ["q1", "q2"],
      ["q4", "q5"],
      ["q3", "q6"],
    ]);
    expect(
      academyChapterExerciseGroups(
        academyChapterPlanForSlug("rules")!,
        questions.slice(0, 5),
      ),
    ).toBeNull();
  });
});
