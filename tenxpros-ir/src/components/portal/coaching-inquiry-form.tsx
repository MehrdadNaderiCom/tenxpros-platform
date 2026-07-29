"use client";

import { CheckCircle2 } from "lucide-react";
import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import { submitCoachingInquiryAction } from "@/actions/coaching";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

const inputClass =
  "min-h-12 w-full rounded-lg border border-white/10 bg-white/[0.055] px-4 text-white outline-none transition placeholder:text-slate-600 focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20";

function FieldError({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  if (!message) return null;

  return (
    <p id={id} className="mt-2 text-xs leading-6 text-rose-200">
      {message}
    </p>
  );
}

export function CoachingInquiryForm() {
  const [state, formAction] = useFormState(
    submitCoachingInquiryAction,
    INITIAL_ACTION_STATE,
  );
  const subjectError = state.fieldErrors?.subject?.[0];
  const messageError = state.fieldErrors?.message?.[0];
  const scheduleError = state.fieldErrors?.preferredSchedule?.[0];

  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-6">
        <CheckCircle2 className="size-9 text-emerald-300" />
        <h2 className="mt-4 text-xl font-black text-white">
          درخواست Coaching ثبت شد
        </h2>
        <p className="mt-3 text-sm leading-7 text-emerald-50">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="coaching-subject"
          className="mb-2 block text-sm font-bold text-slate-200"
        >
          موضوع جلسه
        </label>
        <input
          id="coaching-subject"
          name="subject"
          required
          minLength={3}
          maxLength={200}
          aria-invalid={Boolean(subjectError)}
          aria-describedby={subjectError ? "coaching-subject-error" : undefined}
          placeholder="برای نمونه تدوین AI Product Strategy"
          className={inputClass}
        />
        <FieldError id="coaching-subject-error" message={subjectError} />
      </div>

      <div>
        <label
          htmlFor="coaching-message"
          className="mb-2 block text-sm font-bold text-slate-200"
        >
          مسئله‌ای که می‌خواهید حل کنید
        </label>
        <textarea
          id="coaching-message"
          name="message"
          required
          rows={6}
          minLength={20}
          maxLength={5000}
          aria-invalid={Boolean(messageError)}
          aria-describedby={messageError ? "coaching-message-error" : undefined}
          placeholder="درباره زمینه مسئله، تصمیم پیش رو و نتیجه مطلوب بنویسید."
          className={`${inputClass} py-3 leading-7`}
        />
        <FieldError id="coaching-message-error" message={messageError} />
      </div>

      <div>
        <label
          htmlFor="coaching-preferred-schedule"
          className="mb-2 block text-sm font-bold text-slate-200"
        >
          زمان‌های ترجیحی
        </label>
        <input
          id="coaching-preferred-schedule"
          name="preferredSchedule"
          maxLength={500}
          aria-invalid={Boolean(scheduleError)}
          aria-describedby={
            scheduleError ? "coaching-preferred-schedule-error" : undefined
          }
          placeholder="برای نمونه دوشنبه یا چهارشنبه بعد از ساعت ۱۷"
          className={inputClass}
        />
        <FieldError
          id="coaching-preferred-schedule-error"
          message={scheduleError}
        />
      </div>

      <FormMessage message={state.message} tone="error" />
      <SubmitButton className="w-full sm:w-auto" pendingLabel="در حال ثبت درخواست">
        ارسال درخواست Coaching
      </SubmitButton>
    </form>
  );
}
