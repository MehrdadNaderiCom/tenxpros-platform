"use client";

import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import { reviewApplicationAction } from "@/actions/applications";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

export function ApplicationReviewForm({
  applicantId,
  compact = false,
}: {
  applicantId: string;
  compact?: boolean;
}) {
  const [state, formAction] = useFormState(
    reviewApplicationAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className={compact ? "space-y-3" : "space-y-4"}>
      <input type="hidden" name="applicantId" value={applicantId} />
      {!compact ? (
        <div>
          <label htmlFor={`review-note-${applicantId}`} className="mb-2 block text-sm font-bold">
            یادداشت داخلی
          </label>
          <textarea
            id={`review-note-${applicantId}`}
            name="reviewerNote"
            rows={3}
            maxLength={1000}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none focus:border-iris-500 focus:ring-2 focus:ring-iris-500/10"
            placeholder="دلیل تصمیم یا نکته لازم برای پیگیری"
          />
        </div>
      ) : null}
      <FormMessage
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
      <div className="flex flex-wrap gap-2">
        <SubmitButton
          className="min-h-10 bg-emerald-600 px-4 py-2 shadow-none hover:bg-emerald-500"
          pendingLabel="در حال ثبت"
          name="decision"
          value="accept"
        >
          پذیرش و دعوت به پرداخت
        </SubmitButton>
        <button
          type="submit"
          name="decision"
          value="reject"
          className="min-h-10 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
        >
          رد درخواست
        </button>
      </div>
    </form>
  );
}
