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
  /** Most recently saved reading/audio lesson, across devices. */
  lastResumeSlug: string | null;
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
  const [modules, informational, progressRows, exerciseCounts, badge, finalSittings, lastResume] = await Promise.all([
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
    prisma.academyLessonResume.findFirst({
      where: {
        partnerId,
        lesson: { module: { isPublished: true } },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        lesson: {
          select: {
            module: { select: { slug: true } },
          },
        },
      },
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
    lastResumeSlug: lastResume?.lesson.module.slug ?? null,
    badge: badge ? { serial: badge.serial, year: badge.year, awardedAt: badge.awardedAt } : null,
    finalExam: {
      unlocked: allPassed,
      passed: finalPassed,
      lockedUntil: finalLockedUntil,
      attempts: finalSittings.length,
    },
  };
}

/** One question of a submitted sitting, reconstructed exactly as it was served. */
export type SittingReviewQuestion = {
  stem: string;
  /** Options in the order they were displayed during the sitting. */
  options: string[];
  correctOption: number;
  /** The displayed index the partner chose; -1 when left unanswered. */
  selected: number;
  explanation: string;
};

export type SittingReview = {
  id: string;
  submittedAt: Date;
  score: number;
  passed: boolean;
  review: SittingReviewQuestion[];
  /** Served questions that can no longer be displayed (content changed since). */
  missingCount: number;
};

/**
 * Reconstruct every submitted exam sitting for review, newest first. Sittings
 * created since the review feature carry a frozen display snapshot (stem,
 * displayed options, correct index, explanation) taken when the exam was served,
 * so later content edits or reseeds never distort them; older sittings fall back
 * to the current question rows, skipping any question deleted or reshaped since.
 *
 * SECURITY: a review must never overlap an open (unsubmitted) sitting's question
 * pool, or it becomes that sitting's answer key in another tab. The final exam
 * draws from every module's pool, so final reviews hide while ANY sitting is
 * open, and module reviews hide while a final (or a same-module) sitting is
 * open. An abandoned sitting of some OTHER module never hides a module review:
 * module pools are disjoint, and sittings never expire, so hiding globally would
 * lock reviews away indefinitely.
 */
export async function getSubmittedSittingReviews(
  partnerId: string,
  scope: { moduleSlug: string } | { final: true },
): Promise<SittingReview[]> {
  const openSitting = await prisma.academyExamSitting.findFirst({
    where: {
      partnerId,
      submittedAt: null,
      ...("final" in scope ? {} : { OR: [{ isFinal: true }, { module: { slug: scope.moduleSlug } }] }),
    },
    select: { id: true },
  });
  if (openSitting) return [];

  const sittings = await prisma.academyExamSitting.findMany({
    where:
      "final" in scope
        ? { partnerId, isFinal: true, submittedAt: { not: null } }
        : { partnerId, isFinal: false, submittedAt: { not: null }, module: { slug: scope.moduleSlug } },
    orderBy: { submittedAt: "desc" },
  });
  if (sittings.length === 0) return [];

  type Served = {
    questionId: string;
    optionOrder: number[];
    snapshot?: { stem: string; options: string[]; correctOption: number; explanation: string };
  };
  const questionIds = [...new Set(sittings.flatMap((s) => (s.questionIds as unknown as Served[]).map((q) => q.questionId)))];
  const questions = await prisma.academyQuestion.findMany({ where: { id: { in: questionIds } } });
  const qById = new Map(questions.map((q) => [q.id, q]));

  return sittings.map((s) => {
    const served = s.questionIds as unknown as Served[];
    const answers = (s.answers as unknown as number[]) ?? [];
    const review = served.flatMap((sv, i) => {
      const selected = answers[i];
      const selectedIndex = typeof selected === "number" ? selected : -1;
      if (sv.snapshot) {
        return [{ ...sv.snapshot, selected: selectedIndex }];
      }
      const q = qById.get(sv.questionId);
      const opts = q?.options as string[] | undefined;
      if (!q || !opts || sv.optionOrder.length !== opts.length) return [];
      return [
        {
          stem: q.stem,
          options: sv.optionOrder.map((idx) => opts[idx]),
          correctOption: sv.optionOrder.indexOf(q.correctIndex),
          selected: selectedIndex,
          explanation: q.explanation,
        },
      ];
    });
    return {
      id: s.id,
      submittedAt: s.submittedAt as Date,
      score: s.score,
      passed: s.passed,
      review,
      missingCount: served.length - review.length,
    };
  });
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
