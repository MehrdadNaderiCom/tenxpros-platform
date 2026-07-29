"use client";

import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import { reviewPaymentReceiptAction } from "@/actions/payments";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

export function PaymentReviewForm({ receiptId }: { receiptId: string }) {
  const [state, formAction] = useFormState(
    reviewPaymentReceiptAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="receiptId" value={receiptId} />
      <label htmlFor={`payment-note-${receiptId}`} className="sr-only">
        یادداشت بررسی
      </label>
      <textarea
        id={`payment-note-${receiptId}`}
        name="reviewerNote"
        rows={2}
        maxLength={1000}
        placeholder="یادداشت بررسی برای متقاضی"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-iris-500"
      />
      <FormMessage
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
      <div className="flex flex-wrap gap-2">
        <SubmitButton
          name="decision"
          value="approve"
          className="min-h-10 bg-emerald-600 px-4 py-2 shadow-none hover:bg-emerald-500"
          pendingLabel="در حال ثبت"
        >
          تأیید پرداخت و فعال‌سازی
        </SubmitButton>
        <button
          type="submit"
          name="decision"
          value="reject"
          className="min-h-10 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700"
        >
          رد رسید
        </button>
      </div>
    </form>
  );
}
