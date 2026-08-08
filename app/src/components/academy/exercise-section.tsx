"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ExercisePlayer } from "@/components/academy/exercise-player";
import type { ExerciseAttemptResult } from "@/lib/actions/academy";
import { ButtonLink } from "@/components/ui/button";
import type { AcademyChapterExerciseGroup } from "@/lib/academy/chapter-plans";
import { cn } from "@/lib/utils";

/**
 * The module's exercise list plus a live "go to the exam" call to action. The
 * lesson page is server-rendered, so without this wrapper the exam button only
 * appears after a manual reload once the last exercise is completed. Here the
 * completion state is tracked client-side: the moment the final exercise is
 * done, the CTA appears in place and the server-rendered parts (step checklist,
 * exam card) are refreshed via the router.
 */
export function ExerciseSection({
  slug,
  lessonRead,
  examPassed,
  examCooldownUntilLabel,
  questions,
  initialCompletedIds,
  groups = null,
}: {
  slug: string;
  lessonRead: boolean;
  examPassed: boolean;
  /** Preformatted end of an active post-failure cooldown, null when none. */
  examCooldownUntilLabel: string | null;
  questions: { id: string; stem: string; options: string[] }[];
  initialCompletedIds: string[];
  groups?: readonly AcademyChapterExerciseGroup[] | null;
}) {
  const router = useRouter();
  const [completedIds, setCompletedIds] = useState<ReadonlySet<string>>(new Set(initialCompletedIds));
  const allDone = questions.length > 0 && questions.every((q) => completedIds.has(q.id));

  const questionById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const groupedQuestions = groups?.map((group) => ({
    ...group,
    questions: group.questionIds.flatMap((id) => {
      const question = questionById.get(id);
      return question ? [question] : [];
    }),
  }));
  const groupedIds = groupedQuestions?.flatMap((group) =>
    group.questions.map((question) => question.id),
  );
  const hasCompleteGrouping = Boolean(
    groupedQuestions &&
      groupedQuestions.length > 0 &&
      groupedQuestions.every((group) => group.questions.length > 0) &&
      groupedIds &&
      groupedIds.length === questions.length &&
      new Set(groupedIds).size === questions.length,
  );

  const handleCompleted = (questionId: string, result: ExerciseAttemptResult) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
    // The server confirmed the module's exercises are all done: re-render the
    // server components on this page so the checklist and exam card update too.
    if (result.moduleExercisesDone) router.refresh();
  };

  const reviewChapter = (anchorId: string) => {
    const target = document.getElementById(anchorId);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
        ? "auto"
        : "smooth",
    });
  };

  let displayIndex = 0;

  return (
    <div className="space-y-4">
      {hasCompleteGrouping && groupedQuestions ? (
        <div className="space-y-8">
          {groupedQuestions.map((group) => {
            const completedCount = group.questions.filter(
              (question) => completedIds.has(question.id),
            ).length;
            const groupDone =
              completedCount === group.questions.length;
            return (
              <section
                key={group.id}
                className="space-y-3"
                aria-labelledby={`academy-review-${group.id}`}
              >
                <div
                  className={cn(
                    "rounded-lg border p-4",
                    groupDone
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-neutral-200 bg-neutral-50",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-navy-700">
                        Part {group.number} review
                      </p>
                      <h3
                        id={`academy-review-${group.id}`}
                        className="mt-1 text-base font-semibold text-navy-900"
                      >
                        {group.title}
                      </h3>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                        {group.summary}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        groupDone
                          ? "bg-white text-emerald-700"
                          : "bg-white text-slate-600",
                      )}
                      role="status"
                    >
                      {groupDone
                        ? "Review complete"
                        : `${completedCount} of ${group.questions.length} complete`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      reviewChapter(group.chapterAnchorId)
                    }
                    className="mt-3 text-xs font-semibold text-navy-700 underline decoration-navy-100 underline-offset-4 hover:text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2"
                  >
                    Review this part in the lesson
                  </button>
                </div>
                {group.questions.map((question) => {
                  displayIndex += 1;
                  return (
                    <ExercisePlayer
                      key={question.id}
                      index={displayIndex}
                      question={question}
                      initialCompleted={completedIds.has(
                        question.id,
                      )}
                      onCompleted={(result) =>
                        handleCompleted(question.id, result)
                      }
                    />
                  );
                })}
              </section>
            );
          })}
        </div>
      ) : (
        questions.map((q, i) => (
          <ExercisePlayer
            key={q.id}
            index={i + 1}
            question={q}
            initialCompleted={completedIds.has(q.id)}
            onCompleted={(result) => handleCompleted(q.id, result)}
          />
        ))
      )}

      {allDone && !examPassed ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-5"
          role="status"
        >
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
              <Check className="h-4 w-4 flex-none" aria-hidden="true" />
              All exercises complete.
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {!lessonRead
                ? "Mark the lesson above as read to unlock the module exam."
                : examCooldownUntilLabel
                  ? `The exam is on a short cooldown after your last attempt. Available again after ${examCooldownUntilLabel}.`
                  : "The module exam is unlocked. You can take it right now."}
            </p>
          </div>
          {lessonRead ? (
            examCooldownUntilLabel ? (
              <ButtonLink href={`/partner/academy/${slug}/exam`} variant="secondary" size="sm">
                Review your last attempt
              </ButtonLink>
            ) : (
              <ButtonLink href={`/partner/academy/${slug}/exam`}>Start module exam</ButtonLink>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
