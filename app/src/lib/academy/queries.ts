import { prisma } from "@/lib/prisma";
import { cooldownUntil, FINAL_EXAM_COOLDOWN_HOURS } from "@/lib/academy/engine";

export type AcademyStatus = "locked" | "available" | "in_progress" | "exercises_done" | "passed";

export interface ModuleView {
  id: string;
  slug: string;
  order: number;
  title: string;
  summary: string;
  passMark: number;
  examSize: number;
  exerciseCount: number;
  status: AcademyStatus;
  unlocked: boolean;
  lessonRead: boolean;
  exercisesDone: boolean;
  examPassed: boolean;
  canTakeExam: boolean;
  bestExamScore: number;
  examAttempts: number;
  lockedUntil: Date | null;
}

export interface AcademyOverview {
  modules: ModuleView[];
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
  /** The next module to act on (first not-passed unlocked module), for resume. */
  resumeSlug: string | null;
  badge: { serial: string; year: number; awardedAt: Date } | null;
  /** The comprehensive final exam (unlocks once every module is passed). */
  finalExam: { unlocked: boolean; passed: boolean; lockedUntil: Date | null; attempts: number };
}

/**
 * Build the partner's Academy overview: each published module with its computed
 * status, gating, and best score, plus resume and badge info. Unlock depends on
 * the previous module being passed (the first module is always open).
 */
export async function getAcademyOverview(partnerId: string): Promise<AcademyOverview> {
  const [modules, progressRows, exerciseCounts, badge, finalSittings] = await Promise.all([
    prisma.academyModule.findMany({ where: { isPublished: true }, orderBy: { order: "asc" } }),
    prisma.academyProgress.findMany({ where: { partnerId } }),
    prisma.academyQuestion.groupBy({ by: ["moduleId"], where: { pool: "EXERCISE" }, _count: { _all: true } }),
    prisma.partnerAcademyBadge.findUnique({ where: { partnerId } }),
    prisma.academyExamSitting.findMany({
      where: { partnerId, isFinal: true, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const progressByModule = new Map(progressRows.map((p) => [p.moduleId, p]));
  const exCountByModule = new Map(exerciseCounts.map((r) => [r.moduleId, r._count._all]));

  const views: ModuleView[] = [];
  let previousPassed = true; // module one is always unlocked
  for (const m of modules) {
    const p = progressByModule.get(m.id);
    const lessonRead = Boolean(p?.lessonReadAt);
    const exercisesDone = Boolean(p?.exercisesDone);
    const examPassed = Boolean(p?.examPassed);
    const unlocked = m.order <= 1 || previousPassed;

    let status: AcademyStatus = "locked";
    if (examPassed) status = "passed";
    else if (!unlocked) status = "locked";
    else if (exercisesDone && lessonRead) status = "exercises_done";
    else if (lessonRead || (p && p.status === "in_progress")) status = "in_progress";
    else status = "available";

    views.push({
      id: m.id,
      slug: m.slug,
      order: m.order,
      title: m.title,
      summary: m.summary,
      passMark: m.passMark,
      examSize: m.examSize,
      exerciseCount: exCountByModule.get(m.id) ?? 0,
      status,
      unlocked,
      lessonRead,
      exercisesDone,
      examPassed,
      canTakeExam: unlocked && lessonRead && exercisesDone && !examPassed,
      bestExamScore: p?.bestExamScore ?? 0,
      examAttempts: p?.examAttempts ?? 0,
      lockedUntil: p?.lockedUntil ?? null,
    });

    previousPassed = examPassed;
  }

  const passedCount = views.filter((v) => v.examPassed).length;
  const totalCount = views.length;
  const resume = views.find((v) => v.unlocked && !v.examPassed) ?? null;
  const allPassed = totalCount > 0 && passedCount === totalCount;

  const finalPassed = finalSittings.some((s) => s.passed);
  const lastFinal = finalSittings[0]; // most recent submitted
  let finalLockedUntil: Date | null = null;
  if (!finalPassed && lastFinal?.submittedAt) {
    const until = cooldownUntil(lastFinal.submittedAt, FINAL_EXAM_COOLDOWN_HOURS);
    if (until.getTime() > Date.now()) finalLockedUntil = until;
  }

  return {
    modules: views,
    passedCount,
    totalCount,
    allPassed,
    resumeSlug: resume?.slug ?? null,
    badge: badge ? { serial: badge.serial, year: badge.year, awardedAt: badge.awardedAt } : null,
    finalExam: {
      unlocked: allPassed,
      passed: finalPassed,
      lockedUntil: finalLockedUntil,
      attempts: finalSittings.length,
    },
  };
}

/** Load one module's lesson and exercises for the lesson view (no exam answers). */
export async function getModuleForLesson(partnerId: string, slug: string) {
  const m = await prisma.academyModule.findFirst({
    where: { slug, isPublished: true },
    include: {
      lessons: { orderBy: { order: "asc" } },
      questions: { where: { pool: "EXERCISE" }, orderBy: { order: "asc" } },
    },
  });
  if (!m) return null;

  const [progress, attempts, prevPassed] = await Promise.all([
    prisma.academyProgress.findUnique({ where: { partnerId_moduleId: { partnerId, moduleId: m.id } } }),
    prisma.academyExerciseAttempt.findMany({ where: { partnerId, questionId: { in: m.questions.map((q) => q.id) } } }),
    m.order <= 1
      ? Promise.resolve(true)
      : prisma.academyModule
          .findFirst({ where: { order: m.order - 1, isPublished: true } })
          .then((prev) =>
            prev
              ? prisma.academyProgress
                  .findUnique({ where: { partnerId_moduleId: { partnerId, moduleId: prev.id } } })
                  .then((pp) => Boolean(pp?.examPassed))
              : true,
          ),
  ]);

  return { module: m, progress, attempts, unlocked: m.order <= 1 || prevPassed };
}
