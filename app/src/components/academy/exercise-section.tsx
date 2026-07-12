"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ExercisePlayer } from "@/components/academy/exercise-player";
import type { ExerciseAttemptResult } from "@/lib/actions/academy";
import { ButtonLink } from "@/components/ui/button";

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
}: {
  slug: string;
  lessonRead: boolean;
  examPassed: boolean;
  /** Preformatted end of an active post-failure cooldown, null when none. */
  examCooldownUntilLabel: string | null;
  questions: { id: string; stem: string; options: string[] }[];
  initialCompletedIds: string[];
}) {
  const router = useRouter();
  const [completedIds, setCompletedIds] = useState<ReadonlySet<string>>(new Set(initialCompletedIds));
  const allDone = questions.length > 0 && questions.every((q) => completedIds.has(q.id));

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

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <ExercisePlayer
          key={q.id}
          index={i + 1}
          question={q}
          initialCompleted={completedIds.has(q.id)}
          onCompleted={(result) => handleCompleted(q.id, result)}
        />
      ))}

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
