/**
 * Seed content types for the Partner Academy. Lesson prose and every question
 * are transcribed verbatim from the build spec (no paraphrasing, no em dashes).
 * `correct` is a 0-based index (A=0, B=1, C=2, D=3).
 */
export interface QuestionSeed {
  stem: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface ModuleSeed {
  slug: string;
  order: number;
  title: string;
  summary: string;
  passMark: number;
  examSize: number;
  /** Full lesson prose, paragraphs separated by a blank line. Used as the plain
   * fallback body and (when bodyHtml is absent) as audioText. */
  lesson: string;
  /** Optional rich lesson content (HTML). When present it is sanitized and stored
   * as the rendered lesson; audioText is derived from it. Built from the same
   * canonical material as `lesson`, expanded with structured partner-facing
   * sections (objective, examples, sales framing, objections, checklists). */
  bodyHtml?: string;
  exercises: QuestionSeed[]; // 6, seeded as EXERCISE
  exam: QuestionSeed[]; // 12, seeded as EXAM
}
