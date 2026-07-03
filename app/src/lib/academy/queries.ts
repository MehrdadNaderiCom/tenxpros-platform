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
  /** Questions that must be answered correctly to pass (from passMark x examSize). */
  neededCorrect: number;
  /** When locked: the module whose exam opens this one, with ITS OWN exam numbers. */
  blockedBy: { order: number; title: string; neededCorrect: number; examSize: number } | null;
}

/** A reference/benefit module: a lesson only, always open, not exam-gated. */
export interface InformationalModuleView {
  id: string;
  slug: string;
  order: number;
  title: string;
  summary: string;
}

export interface AcademyOverview {
  modules: ModuleView[];
  /** Informational modules (Contact Us, Alumni, Experience Sharing): read-only. */
  informationalModules: InformationalModuleView[];
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
  const [modules, informational, progressRows, exerciseCounts, badge, finalSittings] = await Promise.all([
    prisma.academyModule.findMany({ where: { isPublished: true, isInformational: false }, orderBy: { order: "asc" } }),
    prisma.academyModule.findMany({
      where: { isPublished: true, isInformational: true },
      orderBy: { order: "asc" },
      select: { id: true, slug: true, order: true, title: true, summary: true },
    }),
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
  let previousModule: { order: number; title: string; neededCorrect: number; examSize: number } | null = null;
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
      neededCorrect: Math.ceil((m.passMark / 100) * m.examSize),
      blockedBy: unlocked ? null : previousModule,
    });

    previousPassed = examPassed;
    previousModule = {
      order: m.order,
      title: m.title,
      neededCorrect: Math.ceil((m.passMark / 100) * m.examSize),
      examSize: m.examSize,
    };
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
    informationalModules: informational,
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

  const [progress, attempts, prevModule, nextModule] = await Promise.all([
    prisma.academyProgress.findUnique({ where: { partnerId_moduleId: { partnerId, moduleId: m.id } } }),
    prisma.academyExerciseAttempt.findMany({ where: { partnerId, questionId: { in: m.questions.map((q) => q.id) } } }),
    // Informational modules are always open; exam-bearing modules unlock when the
    // previous exam-bearing module is passed.
    m.isInformational || m.order <= 1
      ? Promise.resolve(null)
      : prisma.academyModule.findFirst({
          where: { order: { lt: m.order }, isPublished: true, isInformational: false },
          orderBy: { order: "desc" },
          select: { id: true, order: true, title: true, slug: true, passMark: true, examSize: true },
        }),
    // The next exam-bearing module, so a pass can point straight at it.
    prisma.academyModule.findFirst({
      where: { order: { gt: m.order }, isPublished: true, isInformational: false },
      orderBy: { order: "asc" },
      select: { order: true, title: true, slug: true },
    }),
  ]);
  const prevPassed = prevModule
    ? Boolean(
        (
          await prisma.academyProgress.findUnique({
            where: { partnerId_moduleId: { partnerId, moduleId: prevModule.id } },
          })
        )?.examPassed,
      )
    : true;

  return {
    module: m,
    progress,
    attempts,
    unlocked: m.isInformational || m.order <= 1 || prevPassed,
    // For the locked screen: name exactly which module's exam opens this one, with
    // THAT module's own exam numbers (never the locked module's).
    blockedBy:
      prevPassed || !prevModule
        ? null
        : {
            order: prevModule.order,
            title: prevModule.title,
            slug: prevModule.slug,
            passMark: prevModule.passMark,
            examSize: prevModule.examSize,
            neededCorrect: Math.ceil((prevModule.passMark / 100) * prevModule.examSize),
          },
    nextModule,
  };
}
