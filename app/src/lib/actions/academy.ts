"use server";

import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/partner/auth";
import { safeRevalidatePath } from "@/lib/partner/revalidate";
import {
  EXERCISE_MAX_ATTEMPTS,
  evaluateExerciseAttempt,
  selectExamQuestionIds,
  shuffleOptions,
  makeRng,
  gradeSitting,
  cooldownUntil,
  academyBadgeSerial,
  ACADEMY_MODULE_COUNT,
  CERTIFICATION_MODULE_FILTER,
  FINAL_EXAM_SIZE,
  FINAL_EXAM_PASS_MARK,
  FINAL_EXAM_COOLDOWN_HOURS,
} from "@/lib/academy/engine";
import { safeSendEmail } from "@/lib/services/email";
import { superAdminEmail } from "@/lib/authz";
import { applyLessonBeat, recordAcademyEvent, recordModuleView } from "@/lib/academy/telemetry";

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

async function ensureProgress(partnerId: string, moduleId: string) {
  return prisma.academyProgress.upsert({
    where: { partnerId_moduleId: { partnerId, moduleId } },
    update: {},
    create: { partnerId, moduleId, status: "available" },
  });
}

/** Mark a module's lesson as read to the end. Required before the final exam. */
export async function markLessonRead(formData: FormData) {
  const { partner } = await requirePartner();
  const slug = String(formData.get("slug") ?? "");
  const m = await prisma.academyModule.findFirstOrThrow({ where: { slug, isPublished: true } });
  await prisma.academyProgress.upsert({
    where: { partnerId_moduleId: { partnerId: partner.id, moduleId: m.id } },
    update: { lessonReadAt: new Date(), status: "in_progress" },
    create: { partnerId: partner.id, moduleId: m.id, lessonReadAt: new Date(), status: "in_progress" },
  });
  await recordAcademyEvent({ partnerId: partner.id, kind: "LESSON_READ", moduleId: m.id });
  safeRevalidatePath(`/partner/academy/${slug}`);
  safeRevalidatePath("/partner/academy");
}

/**
 * Telemetry: one module page view (bumps the view counter and logs the event).
 * Called from a client effect on mount; a previewing super admin never reaches
 * here because requirePartner ignores the preview cookie.
 */
export async function recordAcademyModuleOpened(slug: string): Promise<void> {
  const { partner } = await requirePartner();
  const m = await prisma.academyModule.findFirst({ where: { slug, isPublished: true }, select: { id: true } });
  if (!m) return;
  await recordModuleView(partner.id, m.id);
}

/**
 * Telemetry: one visibility-aware reading heartbeat. The credited seconds are
 * clamped server-side from the stored anchor, so an idle tab or replayed beat
 * cannot inflate reading time. Never throws into the caller's flow.
 */
export async function recordAcademyLessonBeat(input: {
  slug: string;
  scrollPct?: number;
  audioSecondsDelta?: number;
}): Promise<void> {
  const { partner } = await requirePartner();
  const m = await prisma.academyModule.findFirst({ where: { slug: input.slug, isPublished: true }, select: { id: true } });
  if (!m) return;
  await applyLessonBeat({
    partnerId: partner.id,
    moduleId: m.id,
    scrollPct: input.scrollPct,
    audioSecondsDelta: input.audioSecondsDelta,
  });
}

export type ExerciseAttemptResult = {
  correct: boolean;
  revealCorrect: boolean;
  correctIndex: number;
  explanation: string;
  completed: boolean;
  attemptNo: number;
  attemptsLeft: number;
};

/**
 * Record one exercise attempt (max three). Returns whether it was correct, the
 * explanation, and, only once correct or on the final attempt, the correct index
 * to reveal. When every exercise in the module is completed, exercisesDone is set.
 */
export async function recordExerciseAttempt(input: {
  questionId: string;
  selected: number;
}): Promise<ExerciseAttemptResult> {
  const { partner } = await requirePartner();
  const question = await prisma.academyQuestion.findFirstOrThrow({
    where: { id: input.questionId, pool: "EXERCISE" },
  });
  await ensureProgress(partner.id, question.moduleId);

  const prior = await prisma.academyExerciseAttempt.findMany({
    where: { partnerId: partner.id, questionId: question.id },
    orderBy: { createdAt: "asc" },
  });
  const alreadyCompleted = prior.some((a) => a.correct) || prior.length >= EXERCISE_MAX_ATTEMPTS;
  const attemptNo = Math.min(prior.length + 1, EXERCISE_MAX_ATTEMPTS);
  const outcome = evaluateExerciseAttempt(input.selected, question.correctIndex, attemptNo);

  if (!alreadyCompleted) {
    await prisma.academyExerciseAttempt.create({
      data: {
        partnerId: partner.id,
        questionId: question.id,
        attemptNo,
        selected: input.selected,
        correct: outcome.correct,
      },
    });
    await recordAcademyEvent({
      partnerId: partner.id,
      kind: "EXERCISE_ANSWERED",
      moduleId: question.moduleId,
      meta: { questionId: question.id, attemptNo, correct: outcome.correct },
    });
  }

  // Recompute exercisesDone for the module.
  const exQuestions = await prisma.academyQuestion.findMany({
    where: { moduleId: question.moduleId, pool: "EXERCISE" },
    select: { id: true },
  });
  const attemptsAll = await prisma.academyExerciseAttempt.findMany({
    where: { partnerId: partner.id, questionId: { in: exQuestions.map((q) => q.id) } },
  });
  const byQuestion = new Map<string, { count: number; anyCorrect: boolean }>();
  for (const a of attemptsAll) {
    const cur = byQuestion.get(a.questionId) ?? { count: 0, anyCorrect: false };
    cur.count += 1;
    cur.anyCorrect = cur.anyCorrect || a.correct;
    byQuestion.set(a.questionId, cur);
  }
  const allDone = exQuestions.every((q) => {
    const s = byQuestion.get(q.id);
    return s && (s.anyCorrect || s.count >= EXERCISE_MAX_ATTEMPTS);
  });
  if (allDone) {
    await prisma.academyProgress.update({
      where: { partnerId_moduleId: { partnerId: partner.id, moduleId: question.moduleId } },
      data: { exercisesDone: true, status: "exercises_done" },
    });
  }

  return {
    correct: outcome.correct,
    revealCorrect: outcome.revealCorrect,
    correctIndex: outcome.revealCorrect ? question.correctIndex : -1,
    explanation: question.explanation,
    completed: outcome.completed,
    attemptNo,
    attemptsLeft: Math.max(0, EXERCISE_MAX_ATTEMPTS - attemptNo),
  };
}

type ServedQuestion = { questionId: string; optionOrder: number[] };

/**
 * Create or resume an exam sitting for a module. Eligibility: unlocked, lesson
 * read, exercises done, not already passed, not in cooldown. The draw rotates
 * unseen questions in first and shuffles options. Returns the served questions
 * (no correct answers) for the client.
 */
export async function startOrResumeExam(slug: string): Promise<
  | { ok: false; reason: string; lockedUntil?: string }
  | { ok: true; sittingId: string; questions: { id: string; stem: string; options: string[] }[]; passMark: number }
> {
  const { partner } = await requirePartner();
  const m = await prisma.academyModule.findFirstOrThrow({
    where: { slug, isPublished: true },
    include: { questions: { where: { pool: "EXAM" } } },
  });
  const progress = await ensureProgress(partner.id, m.id);

  if (progress.examPassed) return { ok: false, reason: "already_passed" };
  if (!progress.lessonReadAt || !progress.exercisesDone) return { ok: false, reason: "not_ready" };
  if (progress.lockedUntil && progress.lockedUntil.getTime() > Date.now()) {
    return { ok: false, reason: "cooldown", lockedUntil: progress.lockedUntil.toISOString() };
  }
  // Module unlock: previous exam-bearing module passed (informational modules
  // are not part of the unlock chain).
  if (m.order > 1) {
    const prev = await prisma.academyModule.findFirst({
      where: { order: { lt: m.order }, isPublished: true, isInformational: false },
      orderBy: { order: "desc" },
    });
    if (prev) {
      const prevP = await prisma.academyProgress.findUnique({
        where: { partnerId_moduleId: { partnerId: partner.id, moduleId: prev.id } },
      });
      if (!prevP?.examPassed) return { ok: false, reason: "locked" };
    }
  }

  // Resume an open sitting if one exists.
  const open = await prisma.academyExamSitting.findFirst({
    where: { partnerId: partner.id, moduleId: m.id, submittedAt: null },
    orderBy: { startedAt: "desc" },
  });
  let served: ServedQuestion[];
  let sittingId: string;
  if (open) {
    served = open.questionIds as unknown as ServedQuestion[];
    sittingId = open.id;
  } else {
    const seenIds = new Set(
      (
        await prisma.academyExamSitting.findMany({
          where: { partnerId: partner.id, moduleId: m.id },
          select: { questionIds: true },
        })
      ).flatMap((s) => (s.questionIds as unknown as ServedQuestion[]).map((q) => q.questionId)),
    );
    const rng = makeRng(randomSeed());
    const poolIds = m.questions.map((q) => q.id);
    const chosen = selectExamQuestionIds(poolIds, m.examSize, seenIds, rng);
    served = chosen.map((id) => {
      const q = m.questions.find((x) => x.id === id)!;
      const layout = shuffleOptions((q.options as string[]).length, q.correctIndex, rng);
      return { questionId: id, optionOrder: layout.order };
    });
    const created = await prisma.academyExamSitting.create({
      data: { partnerId: partner.id, moduleId: m.id, questionIds: served as object, answers: [], score: 0, passed: false },
    });
    sittingId = created.id;
    await recordAcademyEvent({ partnerId: partner.id, kind: "EXAM_STARTED", moduleId: m.id, meta: { sittingId } });
  }

  const qById = new Map(m.questions.map((q) => [q.id, q]));
  const questions = served.map((s) => {
    const q = qById.get(s.questionId)!;
    const opts = q.options as string[];
    return { id: s.questionId, stem: q.stem, options: s.optionOrder.map((i) => opts[i]) };
  });
  return { ok: true, sittingId, questions, passMark: m.passMark };
}

export type ExamSubmitResult = {
  passed: boolean;
  percent: number;
  correctCount: number;
  total: number;
  review: { stem: string; options: string[]; correctOption: number; selected: number; explanation: string }[];
  badgeAwarded: boolean;
};

/** Grade and close an exam sitting. Pass unlocks the next module; fail sets a cooldown. */
export async function submitExam(input: { sittingId: string; selections: number[] }): Promise<ExamSubmitResult> {
  const { partner } = await requirePartner();
  const sitting = await prisma.academyExamSitting.findFirstOrThrow({
    where: { id: input.sittingId, partnerId: partner.id },
  });
  if (sitting.submittedAt) throw new Error("This exam sitting is already submitted.");
  if (sitting.isFinal || !sitting.moduleId) throw new Error("This is the final exam. Use submitFinalExam.");
  const m = await prisma.academyModule.findUniqueOrThrow({ where: { id: sitting.moduleId } });
  const served = sitting.questionIds as unknown as ServedQuestion[];
  const questions = await prisma.academyQuestion.findMany({ where: { id: { in: served.map((s) => s.questionId) } } });
  const qById = new Map(questions.map((q) => [q.id, q]));

  const gradeInput = served.map((s) => {
    const q = qById.get(s.questionId)!;
    return { correctIndex: s.optionOrder.indexOf(q.correctIndex) };
  });
  const result = gradeSitting(gradeInput, input.selections, m.passMark);

  const submittedAt = new Date();
  await prisma.academyExamSitting.update({
    where: { id: sitting.id },
    data: { answers: input.selections as object, score: result.percent, passed: result.passed, submittedAt },
  });
  await recordAcademyEvent({
    partnerId: partner.id,
    kind: "EXAM_SUBMITTED",
    moduleId: m.id,
    meta: {
      sittingId: sitting.id,
      percent: result.percent,
      passed: result.passed,
      durationSeconds: Math.max(0, Math.round((submittedAt.getTime() - sitting.startedAt.getTime()) / 1000)),
    },
  });

  await prisma.academyProgress.update({
    where: { partnerId_moduleId: { partnerId: partner.id, moduleId: m.id } },
    data: {
      examAttempts: { increment: 1 },
      ...(result.passed
        ? { examPassed: true, status: "passed", lockedUntil: null, passedContentVersion: m.contentVersion }
        : { lockedUntil: cooldownUntil(new Date(), m.examCooldownHours) }),
    },
  });
  // Raise the best score atomically and monotonically: a conditional update so a
  // concurrent lower-scoring submission can never lower an already-higher best.
  await prisma.academyProgress.updateMany({
    where: { partnerId: partner.id, moduleId: m.id, bestExamScore: { lt: result.percent } },
    data: { bestExamScore: result.percent },
  });

  // Passing a module no longer issues the certificate. The certificate is gated
  // on the comprehensive final exam (see submitFinalExam), which unlocks once
  // every module is passed.
  const badgeAwarded = false;

  const review = served.map((s, i) => {
    const q = qById.get(s.questionId)!;
    const opts = q.options as string[];
    return {
      stem: q.stem,
      options: s.optionOrder.map((idx) => opts[idx]),
      correctOption: s.optionOrder.indexOf(q.correctIndex),
      selected: input.selections[i] ?? -1,
      explanation: q.explanation,
    };
  });

  safeRevalidatePath(`/partner/academy/${m.slug}`);
  safeRevalidatePath("/partner/academy");
  return {
    passed: result.passed,
    percent: result.percent,
    correctCount: result.correctCount,
    total: result.total,
    review,
    badgeAwarded,
  };
}

/**
 * True once every published EXAM-BEARING module's exam is passed (the final-exam
 * gate). Informational modules (isInformational=true) are excluded, so publishing
 * a Contact Us / Alumni / Experience Sharing module never blocks the certificate.
 */
async function allModulesPassedFor(partnerId: string): Promise<boolean> {
  const [publishedCount, passedCount] = await Promise.all([
    prisma.academyModule.count({ where: CERTIFICATION_MODULE_FILTER }),
    // Scope the passed count to the SAME population (published, exam-bearing), so a
    // progress row on an informational module cannot inflate it toward the gate.
    prisma.academyProgress.count({ where: { partnerId, examPassed: true, module: CERTIFICATION_MODULE_FILTER } }),
  ]);
  return publishedCount >= ACADEMY_MODULE_COUNT && passedCount >= publishedCount;
}

/**
 * Create or resume the comprehensive final exam. It unlocks only once every
 * module is passed, draws FINAL_EXAM_SIZE questions shuffled from all modules'
 * exam pools, and is the sole automatic gate for the certificate. A failed
 * attempt sets a cooldown derived from the sitting's submit time.
 */
export async function startOrResumeFinalExam(): Promise<
  | { ok: false; reason: string; lockedUntil?: string }
  | { ok: true; sittingId: string; questions: { id: string; stem: string; options: string[] }[]; passMark: number }
> {
  const { partner } = await requirePartner();

  const passedFinal = await prisma.academyExamSitting.findFirst({
    where: { partnerId: partner.id, isFinal: true, passed: true },
  });
  if (passedFinal) return { ok: false, reason: "already_passed" };

  if (!(await allModulesPassedFor(partner.id))) return { ok: false, reason: "not_ready" };

  // Cooldown from the most recent submitted (failed) final sitting.
  const lastFinal = await prisma.academyExamSitting.findFirst({
    where: { partnerId: partner.id, isFinal: true, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
  });
  if (lastFinal?.submittedAt) {
    const until = cooldownUntil(lastFinal.submittedAt, FINAL_EXAM_COOLDOWN_HOURS);
    if (until.getTime() > Date.now()) return { ok: false, reason: "cooldown", lockedUntil: until.toISOString() };
  }

  // The pool is every published module's EXAM questions, combined.
  const examQuestions = await prisma.academyQuestion.findMany({
    where: { pool: "EXAM", module: { isPublished: true, isInformational: false } },
  });

  const open = await prisma.academyExamSitting.findFirst({
    where: { partnerId: partner.id, isFinal: true, submittedAt: null },
    orderBy: { startedAt: "desc" },
  });

  let served: ServedQuestion[];
  let sittingId: string;
  if (open) {
    served = open.questionIds as unknown as ServedQuestion[];
    sittingId = open.id;
  } else {
    const seenIds = new Set(
      (
        await prisma.academyExamSitting.findMany({
          where: { partnerId: partner.id, isFinal: true },
          select: { questionIds: true },
        })
      ).flatMap((s) => (s.questionIds as unknown as ServedQuestion[]).map((q) => q.questionId)),
    );
    const rng = makeRng(randomSeed());
    const poolIds = examQuestions.map((q) => q.id);
    const chosen = selectExamQuestionIds(poolIds, FINAL_EXAM_SIZE, seenIds, rng);
    served = chosen.map((id) => {
      const q = examQuestions.find((x) => x.id === id)!;
      const layout = shuffleOptions((q.options as string[]).length, q.correctIndex, rng);
      return { questionId: id, optionOrder: layout.order };
    });
    const created = await prisma.academyExamSitting.create({
      data: { partnerId: partner.id, moduleId: null, isFinal: true, questionIds: served as object, answers: [], score: 0, passed: false },
    });
    sittingId = created.id;
    await recordAcademyEvent({ partnerId: partner.id, kind: "FINAL_EXAM_STARTED", meta: { sittingId } });
  }

  const qById = new Map(examQuestions.map((q) => [q.id, q]));
  const questions = served.map((s) => {
    const q = qById.get(s.questionId)!;
    const opts = q.options as string[];
    return { id: s.questionId, stem: q.stem, options: s.optionOrder.map((i) => opts[i]) };
  });
  return { ok: true, sittingId, questions, passMark: FINAL_EXAM_PASS_MARK };
}

/** Grade and close the final exam. A pass issues the certificate and emails the owner. */
export async function submitFinalExam(input: { sittingId: string; selections: number[] }): Promise<ExamSubmitResult> {
  const { partner } = await requirePartner();
  const sitting = await prisma.academyExamSitting.findFirstOrThrow({
    where: { id: input.sittingId, partnerId: partner.id, isFinal: true },
  });
  if (sitting.submittedAt) throw new Error("This exam sitting is already submitted.");

  const served = sitting.questionIds as unknown as ServedQuestion[];
  const questions = await prisma.academyQuestion.findMany({ where: { id: { in: served.map((s) => s.questionId) } } });
  const qById = new Map(questions.map((q) => [q.id, q]));
  const gradeInput = served.map((s) => {
    const q = qById.get(s.questionId)!;
    return { correctIndex: s.optionOrder.indexOf(q.correctIndex) };
  });
  const result = gradeSitting(gradeInput, input.selections, FINAL_EXAM_PASS_MARK);

  const submittedAt = new Date();
  await prisma.academyExamSitting.update({
    where: { id: sitting.id },
    data: { answers: input.selections as object, score: result.percent, passed: result.passed, submittedAt },
  });
  await recordAcademyEvent({
    partnerId: partner.id,
    kind: "FINAL_EXAM_SUBMITTED",
    meta: {
      sittingId: sitting.id,
      percent: result.percent,
      passed: result.passed,
      durationSeconds: Math.max(0, Math.round((submittedAt.getTime() - sitting.startedAt.getTime()) / 1000)),
    },
  });

  let badgeAwarded = false;
  if (result.passed) {
    const existing = await prisma.partnerAcademyBadge.findUnique({ where: { partnerId: partner.id } });
    if (!existing) {
      const year = new Date().getUTCFullYear();
      const seq = (await prisma.partnerAcademyBadge.count()) + 1;
      const badge = await prisma.partnerAcademyBadge.create({
        data: { partnerId: partner.id, serial: academyBadgeSerial(year, seq), year },
      });
      badgeAwarded = true;
      // Let the owner know a partner finished the Academy and earned a certificate.
      await safeSendEmail({
        to: superAdminEmail(),
        subject: `Partner Academy certificate earned: ${partner.displayName}`,
        template: "owner_academy_certificate",
        text: `${partner.displayName} passed the comprehensive final exam and earned Partner Academy certificate ${badge.serial} (${year}). Score ${result.percent}%. Review: /admin/partners/academy/${partner.id}`,
      });
    }
  }

  const review = served.map((s, i) => {
    const q = qById.get(s.questionId)!;
    const opts = q.options as string[];
    return {
      stem: q.stem,
      options: s.optionOrder.map((idx) => opts[idx]),
      correctOption: s.optionOrder.indexOf(q.correctIndex),
      selected: input.selections[i] ?? -1,
      explanation: q.explanation,
    };
  });

  safeRevalidatePath("/partner/academy");
  safeRevalidatePath("/partner/academy/final-exam");
  safeRevalidatePath("/partner/academy/certificate");
  return {
    passed: result.passed,
    percent: result.percent,
    correctCount: result.correctCount,
    total: result.total,
    review,
    badgeAwarded,
  };
}
