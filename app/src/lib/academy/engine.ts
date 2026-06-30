/**
 * Partner Academy assessment engine. Pure functions only: no database, no clock,
 * no randomness except through an injected generator, so every rule is unit
 * testable and deterministic. Section 5 of the build spec is the source of truth.
 */

export const ACADEMY_MODULE_COUNT = 14;
export const DEFAULT_PASS_MARK = 80;
export const DEFAULT_EXAM_SIZE = 10;
export const DEFAULT_COOLDOWN_HOURS = 24;
export const EXERCISE_MAX_ATTEMPTS = 3;

// The comprehensive final exam, taken after every module is passed. It draws a
// shuffled set of questions from all fourteen modules' exam pools and gates the
// certificate. It has no parent module, so its size, pass mark, and cooldown are
// constants here rather than read from an AcademyModule row.
export const FINAL_EXAM_SIZE = 20;
export const FINAL_EXAM_PASS_MARK = 80;
export const FINAL_EXAM_COOLDOWN_HOURS = 24;

/** Deterministic 32-bit PRNG (mulberry32). Returns a function yielding [0, 1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle into a new array using the injected generator. */
export function shuffle<T>(input: readonly T[], rand: () => number): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Choose the question ids for one exam sitting. Unseen pool questions are
 * prioritized (rotated in first), then already-seen ones fill the rest, each
 * group shuffled, and the final ordered set is shuffled again. This keeps a
 * retake from being the same exam in the same order. Never returns more than the
 * pool holds.
 */
export function selectExamQuestionIds(
  poolIds: readonly string[],
  examSize: number,
  seenIds: Iterable<string>,
  rand: () => number,
): string[] {
  const seen = new Set(seenIds);
  const unseen = poolIds.filter((id) => !seen.has(id));
  const already = poolIds.filter((id) => seen.has(id));
  const ordered = [...shuffle(unseen, rand), ...shuffle(already, rand)];
  const take = Math.min(examSize, poolIds.length);
  return shuffle(ordered.slice(0, take), rand);
}

/** A permutation of an option list, plus where the correct answer landed. */
export type OptionLayout = { order: number[]; correctIndex: number };

/** Shuffle a question's four options, remapping the correct index. */
export function shuffleOptions(optionCount: number, correctIndex: number, rand: () => number): OptionLayout {
  const indices = shuffle(
    Array.from({ length: optionCount }, (_, i) => i),
    rand,
  );
  return { order: indices, correctIndex: indices.indexOf(correctIndex) };
}

export type ServedQuestion = { id: string; stem: string; options: string[]; layout: OptionLayout };

/** Apply an OptionLayout to a question's options for display. */
export function applyLayout(options: string[], layout: OptionLayout): string[] {
  return layout.order.map((i) => options[i]);
}

export type ExamResult = { correctCount: number; total: number; percent: number; passed: boolean };

/**
 * Grade a sitting. `served` carries each question's displayed correct index (the
 * layout correctIndex). `selections` is the chosen displayed index per question,
 * aligned by position. A missing or out-of-range answer is wrong. Percent is
 * rounded; pass is percent >= passMark.
 */
export function gradeSitting(
  served: { correctIndex: number }[],
  selections: readonly (number | null | undefined)[],
  passMark: number,
): ExamResult {
  const total = served.length;
  let correctCount = 0;
  for (let i = 0; i < total; i += 1) {
    if (selections[i] != null && selections[i] === served[i].correctIndex) correctCount += 1;
  }
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  return { correctCount, total, percent, passed: percent >= passMark };
}

export type ExerciseOutcome = {
  correct: boolean;
  isFinalAttempt: boolean;
  revealCorrect: boolean;
  completed: boolean;
};

/**
 * Evaluate one exercise attempt. A wrong attempt before the last withholds the
 * correct option (the UI shows only why the chosen one is wrong). On a correct
 * attempt, or after the final wrong attempt, the correct answer is revealed and
 * the exercise is marked completed, so it never permanently blocks anyone.
 */
export function evaluateExerciseAttempt(
  selectedIndex: number,
  correctIndex: number,
  attemptNo: number,
  maxAttempts: number = EXERCISE_MAX_ATTEMPTS,
): ExerciseOutcome {
  const correct = selectedIndex === correctIndex;
  const isFinalAttempt = attemptNo >= maxAttempts;
  const revealCorrect = correct || isFinalAttempt;
  return { correct, isFinalAttempt, revealCorrect, completed: revealCorrect };
}

/** A module unlocks when it is the first module or the previous module passed. */
export function isModuleUnlocked(order: number, previousModulePassed: boolean): boolean {
  return order <= 1 || previousModulePassed;
}

/** The final exam opens only once the lesson is read and every exercise is done. */
export function canOpenFinalExam(lessonRead: boolean, exercisesDone: boolean): boolean {
  return lessonRead && exercisesDone;
}

/** Whether a partner is still inside a post-failure cooldown at `now`. */
export function isInCooldown(lockedUntil: Date | null | undefined, now: Date): boolean {
  return Boolean(lockedUntil && lockedUntil.getTime() > now.getTime());
}

/** The cooldown end time after a failed exam. */
export function cooldownUntil(now: Date, cooldownHours: number): Date {
  return new Date(now.getTime() + cooldownHours * 60 * 60 * 1000);
}

/** All fourteen modules passed. */
export function allModulesPassed(passedCount: number, total: number = ACADEMY_MODULE_COUNT): boolean {
  return passedCount >= total;
}

/** Verifiable badge serial, e.g. TXP-PA-2026-000123. */
export function academyBadgeSerial(year: number, sequence: number): string {
  return `TXP-PA-${year}-${String(sequence).padStart(6, "0")}`;
}

/** Normalize a question stem for the duplicate-integrity check. */
export function normalizeStem(stem: string): string {
  return stem.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}
