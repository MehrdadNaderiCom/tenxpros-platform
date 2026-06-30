"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitExam, type ExamSubmitResult } from "@/lib/actions/academy";
import { cn } from "@/lib/utils";

type SubmitAction = (input: { sittingId: string; selections: number[] }) => Promise<ExamSubmitResult>;

/**
 * One exam sitting (module exam or the comprehensive final exam). Answers and
 * explanations are never shown during the exam. Submitting ends the sitting and
 * shows the score, which questions were missed, and the explanations, so a failed
 * attempt is still a learning moment. The submit action and the pass/fail routing
 * are injected so the same player drives both exam types.
 */
export function ExamPlayer({
  sittingId,
  questions,
  passMark,
  submitAction = submitExam,
  passHref = "/partner/academy",
  passLabel = "Continue",
  failHref,
  failLabel = "Review the lesson",
  completionMessage = "You have completed the Partner Academy. Your certificate has been issued.",
}: {
  sittingId: string;
  questions: { id: string; stem: string; options: string[] }[];
  passMark: number;
  submitAction?: SubmitAction;
  passHref?: string;
  passLabel?: string;
  failHref: string;
  failLabel?: string;
  completionMessage?: string;
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<ExamSubmitResult | null>(null);
  const [pending, startTransition] = useTransition();
  const answered = selections.filter((s) => s != null).length;

  const submit = () => {
    startTransition(async () => {
      const r = await submitAction({ sittingId, selections: selections.map((s) => (s == null ? -1 : s)) });
      setResult(r);
      window.scrollTo({ top: 0 });
    });
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className={cn("rounded-lg border p-6", result.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">{result.passed ? "Passed" : "Not yet"}</p>
          <p className="mt-1 text-3xl font-semibold text-navy-900">{result.percent}%</p>
          <p className="mt-1 text-sm text-slate-600">
            {result.correctCount} of {result.total} correct. The pass mark is {passMark}%.
          </p>
          {result.badgeAwarded ? (
            <p className="mt-2 text-sm font-medium text-gold-800">{completionMessage}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            {result.passed ? (
              <button type="button" onClick={() => router.push(passHref)} className="inline-flex h-10 items-center rounded-md bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-700">
                {passLabel}
              </button>
            ) : (
              <button type="button" onClick={() => router.push(failHref)} className="inline-flex h-10 items-center rounded-md bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-700">
                {failLabel}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-navy-900">Review</h2>
          {result.review.map((r, i) => {
            const correct = r.selected === r.correctOption;
            return (
              <div key={i} className="rounded-lg border border-neutral-200 bg-white p-5">
                <p className="font-medium text-navy-900">
                  <span className="mr-2 text-sm text-slate-400">{i + 1}.</span>
                  {r.stem}
                </p>
                <div className="mt-3 space-y-2">
                  {r.options.map((opt, j) => (
                    <div
                      key={j}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm",
                        j === r.correctOption ? "border-emerald-300 bg-emerald-50 text-emerald-800" : j === r.selected ? "border-red-300 bg-red-50 text-red-700" : "border-neutral-200 text-slate-700",
                      )}
                    >
                      {opt}
                      {j === r.correctOption ? <span className="ml-2 text-xs font-medium">correct</span> : null}
                      {j === r.selected && j !== r.correctOption ? <span className="ml-2 text-xs font-medium">your answer</span> : null}
                    </div>
                  ))}
                </div>
                <p className={cn("mt-3 text-sm", correct ? "text-emerald-800" : "text-slate-600")}>{r.explanation}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="font-medium text-navy-900">
            <span className="mr-2 text-sm text-slate-400">{i + 1}.</span>
            {q.stem}
          </p>
          <fieldset className="mt-3 space-y-2">
            {q.options.map((opt, j) => (
              <label key={j} className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm transition hover:bg-neutral-50">
                <input
                  type="radio"
                  name={`exam-${q.id}`}
                  className="mt-1 h-4 w-4 flex-none"
                  checked={selections[i] === j}
                  onChange={() => setSelections((prev) => prev.map((s, k) => (k === i ? j : s)))}
                />
                <span className="text-slate-700">{opt}</span>
              </label>
            ))}
          </fieldset>
        </div>
      ))}

      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <span className="text-sm text-slate-600">{answered} of {questions.length} answered</span>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Submit this exam? Submitting ends the sitting and cannot be undone.")) submit();
          }}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-navy-900 px-5 text-sm font-medium text-white transition hover:bg-navy-700 disabled:opacity-50"
        >
          {pending ? "Submitting..." : "Submit exam"}
        </button>
      </div>
    </div>
  );
}
