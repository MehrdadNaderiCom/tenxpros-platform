import { cn, formatUtcDateTime } from "@/lib/utils";
import type { SittingReview, SittingReviewQuestion } from "@/lib/academy/queries";

/**
 * One reviewed exam question: the options exactly as they were displayed during
 * the sitting, with the correct one and the partner's choice marked. Shared by
 * the just-submitted result screen (ExamPlayer) and the persistent review of
 * past sittings on the exam pages.
 */
export function ExamQuestionReview({ item, index }: { item: SittingReviewQuestion; index: number }) {
  const correct = item.selected === item.correctOption;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="font-medium text-navy-900">
        <span className="mr-2 text-sm text-slate-400">{index + 1}.</span>
        {item.stem}
      </p>
      <div className="mt-3 space-y-2">
        {item.options.map((opt, j) => (
          <div
            key={j}
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              j === item.correctOption
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : j === item.selected
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-neutral-200 text-slate-700",
            )}
          >
            {opt}
            {j === item.correctOption ? <span className="ml-2 text-xs font-medium">correct</span> : null}
            {j === item.selected && j !== item.correctOption ? <span className="ml-2 text-xs font-medium">your answer</span> : null}
          </div>
        ))}
      </div>
      <p className={cn("mt-3 text-sm", correct ? "text-emerald-800" : "text-slate-600")}>{item.explanation}</p>
    </div>
  );
}

/**
 * Every submitted sitting, newest first, the latest expanded and older ones
 * collapsed. Rendered only where no sitting is in progress, so it never shows
 * answers alongside a live exam.
 */
export function ExamReviewList({ sittings, title = "Review your answers" }: { sittings: SittingReview[]; title?: string }) {
  if (sittings.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
      <p className="text-sm text-slate-600">
        Every submitted sitting stays available here, with the correct answers and explanations, so you can revisit what you
        learned at any time.
      </p>
      {sittings.map((s, si) => (
        <details key={s.id} open={si === 0} className="group rounded-lg border border-neutral-200 bg-white">
          <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-lg p-4 text-sm hover:bg-neutral-50">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                s.passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
              )}
            >
              {s.passed ? "Passed" : "Not passed"}
            </span>
            <span className="font-medium text-navy-900">{s.score}%</span>
            <span className="text-slate-500">{formatUtcDateTime(s.submittedAt)}</span>
            <span className="ml-auto text-xs text-slate-400 group-open:hidden">Show questions</span>
            <span className="ml-auto hidden text-xs text-slate-400 group-open:inline">Hide questions</span>
          </summary>
          <div className="space-y-4 border-t border-neutral-200 p-4">
            {s.missingCount > 0 ? (
              <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-slate-500">
                {s.missingCount} question{s.missingCount === 1 ? "" : "s"} from this sitting {s.missingCount === 1 ? "is" : "are"} no
                longer part of the current content and cannot be displayed. The score above is unchanged.
              </p>
            ) : null}
            {s.review.map((item, i) => (
              <ExamQuestionReview key={i} item={item} index={i} />
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
