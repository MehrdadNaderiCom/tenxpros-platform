"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { recordExerciseAttempt, type ExerciseAttemptResult } from "@/lib/actions/academy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * One exercise checkpoint with up to three attempts. A wrong attempt shows why
 * the chosen option is wrong without revealing the correct one, until the partner
 * answers correctly or uses the third attempt. Then the correct answer is shown
 * and the exercise is marked complete. It never permanently blocks anyone.
 */
export function ExercisePlayer({
  index,
  question,
  initialCompleted,
  onCompleted,
}: {
  index: number;
  question: { id: string; stem: string; options: string[] };
  initialCompleted: boolean;
  /** Fired when this exercise becomes completed (correct or final attempt). */
  onCompleted?: (result: ExerciseAttemptResult) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [last, setLast] = useState<ExerciseAttemptResult | null>(null);
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (selected == null || completed) return;
    startTransition(async () => {
      const r = await recordExerciseAttempt({ questionId: question.id, selected });
      setLast(r);
      if (r.completed) {
        setCompleted(true);
        onCompleted?.(r);
      }
    });
  };

  const revealCorrect = last?.revealCorrect ? last.correctIndex : -1;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p
          id={`academy-exercise-question-${question.id}`}
          className="font-medium text-navy-900"
        >
          <span className="mr-2 text-sm text-slate-400">{index}.</span>
          {question.stem}
        </p>
        {completed ? (
          <span className="inline-flex flex-none items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Done
          </span>
        ) : null}
      </div>

      <fieldset
        className="mt-3 space-y-2"
        disabled={completed}
        aria-labelledby={`academy-exercise-question-${question.id}`}
      >
        {question.options.map((opt, i) => {
          const isCorrect = revealCorrect === i;
          const isWrongChosen = last && !last.correct && last.revealCorrect === false && selected === i;
          return (
            <label
              key={i}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-navy-500 focus-within:ring-offset-1",
                isCorrect ? "border-emerald-300 bg-emerald-50" : isWrongChosen ? "border-red-300 bg-red-50" : "border-neutral-200 hover:bg-neutral-50",
                completed && !isCorrect ? "opacity-70" : "",
              )}
            >
              <input
                type="radio"
                name={`ex-${question.id}`}
                className="mt-1 h-4 w-4 flex-none"
                checked={selected === i}
                onChange={() => setSelected(i)}
                disabled={completed}
              />
              <span className="text-slate-700">{opt}</span>
            </label>
          );
        })}
      </fieldset>

      {last && !completed ? (
        <p className="mt-3 inline-flex items-start gap-1.5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="status">
          <X className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>That is not right. {last.explanation} You have {last.attemptsLeft} attempt{last.attemptsLeft === 1 ? "" : "s"} left.</span>
        </p>
      ) : null}

      {last && last.revealCorrect ? (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          {last.correct ? "Correct. " : "The correct answer is highlighted. "}
          {last.explanation}
        </p>
      ) : null}

      {!completed ? (
        <Button
          type="button"
          onClick={submit}
          disabled={selected == null || pending}
          size="sm"
          className="mt-4"
        >
          {pending ? "Checking..." : "Check answer"}
        </Button>
      ) : null}
    </div>
  );
}
