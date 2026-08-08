/**
 * Display-only chapter plans for lessons whose length and mode changes make a
 * single uninterrupted presentation harder to follow. A plan never creates a
 * new AcademyLesson row and never changes lesson HTML or narration. Boundaries
 * point at the immutable follow-along source paths of the active lesson.
 */

export type AcademyChapterDefinition = Readonly<{
  /** Stable local key, independent of the visible module numbering. */
  id: string;
  /** Partner-facing number, for example "3.2". */
  number: string;
  title: string;
  summary: string;
  /** Exact cue path used to start the existing studio narration. */
  audioStartSourceHtmlPath: string;
  /** Existing lesson element used for reading navigation and the divider. */
  readingStartSourceHtmlPath: string;
  /** Audited range in the currently approved narration release. */
  startMs: number;
  endMs: number;
  /** Existing 1-based exercise orders, shown under this chapter. */
  exerciseOrders: readonly number[];
}>;

export type AcademyChapterPlan = Readonly<{
  moduleSlug: string;
  moduleOrder: number;
  /** Canonical stored bodyHtml hash; edited lessons safely fall back to legacy UI. */
  contentHash: string;
  chapters: readonly AcademyChapterDefinition[];
}>;

const CHAPTER_PLANS = [
  {
    moduleSlug: "rules",
    moduleOrder: 3,
    contentHash:
      "abdcc1f30cf1db17813b7a9451fe3aebea4bf227cbca1cf22a60e67c6537c280",
    chapters: [
      {
        id: "earning-rights",
        number: "3.1",
        title: "Earning Rights and Registration",
        summary:
          "Build the five-part earning formula, understand Panel confirmation and activation, and protect the exact opportunity you register.",
        audioStartSourceHtmlPath: "title",
        readingStartSourceHtmlPath: "root/p[1]",
        startMs: 0,
        endMs: 478_673,
        exerciseOrders: [1, 4],
      },
      {
        id: "commission-mechanics",
        number: "3.2",
        title: "Commission Mechanics",
        summary:
          "Work through commission by function, rate classifications, Net Receipts, caps, bonuses, renewal overrides, and shared deals.",
        audioStartSourceHtmlPath: "root/h3[6]",
        readingStartSourceHtmlPath: "root/h3[6]",
        startMs: 478_673,
        endMs: 1_177_635,
        exerciseOrders: [3, 5],
      },
      {
        id: "boundaries-and-limits",
        number: "3.3",
        title: "Boundary Scenarios, Tiers, and Operating Limits",
        summary:
          "Apply payment and clawback rules to real cases, then lock in tier progression, authority limits, annual validity, and survival clauses.",
        audioStartSourceHtmlPath: "root/h3[7]",
        readingStartSourceHtmlPath: "root/h3[7]",
        startMs: 1_177_635,
        endMs: 1_937_352,
        exerciseOrders: [2, 6],
      },
    ],
  },
  {
    moduleSlug: "customize",
    moduleOrder: 14,
    contentHash:
      "59809cd0ca9aa9e4928dce1271ad61de4c470f47dd7c49286bad11f8f053191f",
    chapters: [
      {
        id: "safe-method",
        number: "14.1",
        title: "The Safe Customization Method",
        summary:
          "Keep the program fixed while you discover the prospect's world, find the opportunity and boundary, and choose the right emphasis.",
        audioStartSourceHtmlPath: "title",
        readingStartSourceHtmlPath: "root/p[1]",
        startMs: 0,
        endMs: 323_008,
        exerciseOrders: [1, 2],
      },
      {
        id: "using-it-honestly",
        number: "14.2",
        title: "Using It Honestly",
        summary:
          "Turn discovery into a credible pitch and leave-behind while keeping objections, claims, and next steps inside the guardrails.",
        audioStartSourceHtmlPath: "root/h2[3]",
        readingStartSourceHtmlPath: "root/h2[3]",
        startMs: 323_008,
        endMs: 636_517,
        exerciseOrders: [4, 5],
      },
      {
        id: "scenario-and-toolkit",
        number: "14.3",
        title: "Applied Scenario and Partner Toolkit",
        summary:
          "See the method applied, then use the approved outreach, objection, qualification, and registration templates without turning them into scripts.",
        audioStartSourceHtmlPath: "root/h2[8]",
        readingStartSourceHtmlPath: "root/h2[8]",
        startMs: 636_517,
        endMs: 1_036_512,
        exerciseOrders: [3, 6],
      },
    ],
  },
] as const satisfies readonly AcademyChapterPlan[];

const CHAPTER_PLAN_BY_SLUG = new Map<string, AcademyChapterPlan>(
  CHAPTER_PLANS.map((plan) => [plan.moduleSlug, plan]),
);

export function academyChapterPlanForSlug(
  slug: string,
): AcademyChapterPlan | null {
  return CHAPTER_PLAN_BY_SLUG.get(slug) ?? null;
}

export function compatibleAcademyChapterPlan(input: {
  moduleSlug: string;
  moduleOrder: number;
  contentHash: string;
}): AcademyChapterPlan | null {
  const plan = academyChapterPlanForSlug(input.moduleSlug);
  if (
    !plan ||
    plan.moduleOrder !== input.moduleOrder ||
    plan.contentHash !== input.contentHash
  ) {
    return null;
  }
  return plan;
}

export function academyChapteredModuleSlugs(): readonly string[] {
  return CHAPTER_PLANS.map((plan) => plan.moduleSlug);
}

export function academyChapterAnchorId(
  moduleSlug: string,
  chapterId: string,
): string {
  return `academy-chapter-${moduleSlug}-${chapterId}`;
}

export function formatAcademyChapterDuration(
  chapter: Pick<AcademyChapterDefinition, "startMs" | "endMs">,
): string {
  const totalSeconds = Math.max(
    0,
    Math.round((chapter.endMs - chapter.startMs) / 1_000),
  );
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export type AcademyChapterExerciseGroup = Readonly<{
  id: string;
  number: string;
  title: string;
  summary: string;
  chapterAnchorId: string;
  questionIds: readonly string[];
}>;

/**
 * Join a plan to database questions without ever hiding or duplicating one.
 * A stale plan fails closed to the ordinary flat exercise list.
 */
export function academyChapterExerciseGroups<
  T extends { id: string; order: number },
>(
  plan: AcademyChapterPlan,
  questions: readonly T[],
): readonly AcademyChapterExerciseGroup[] | null {
  const byOrder = new Map<number, T>();
  for (const question of questions) {
    if (byOrder.has(question.order)) return null;
    byOrder.set(question.order, question);
  }

  const assigned = new Set<number>();
  const groups: AcademyChapterExerciseGroup[] = [];
  for (const chapter of plan.chapters) {
    const chapterQuestions: T[] = [];
    for (const order of chapter.exerciseOrders) {
      const question = byOrder.get(order);
      if (!question || assigned.has(order)) return null;
      assigned.add(order);
      chapterQuestions.push(question);
    }
    if (chapterQuestions.length === 0) return null;
    groups.push({
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      summary: chapter.summary,
      chapterAnchorId: academyChapterAnchorId(
        plan.moduleSlug,
        chapter.id,
      ),
      questionIds: chapterQuestions.map((question) => question.id),
    });
  }

  if (
    assigned.size !== questions.length ||
    questions.some((question) => !assigned.has(question.order))
  ) {
    return null;
  }
  return groups;
}
