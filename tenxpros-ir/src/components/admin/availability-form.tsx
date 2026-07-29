"use client";

import { CalendarPlus2 } from "lucide-react";
import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import { createAvailabilitySlotsAction } from "@/actions/bookings";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

const inputClass =
  "min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-iris-500 focus:ring-2 focus:ring-iris-500/10";

export function AvailabilityForm() {
  const [state, formAction] = useFormState(
    createAvailabilitySlotsAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-indigo-50 text-iris-600">
          <CalendarPlus2 className="size-5" />
        </span>
        <div>
          <h2 className="font-black text-slate-950">افزودن بازه آزاد</h2>
          <p className="mt-1 text-xs text-slate-500">
            برای هفته جاری یا هفته بلافاصله بعد، بازه‌ای به وقت تهران وارد کنید.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="slot-date" className="mb-2 block text-xs font-bold text-slate-600">
            تاریخ به وقت تهران
          </label>
          <input
            id="slot-date"
            type="date"
            name="date"
            required
            dir="ltr"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="slot-start" className="mb-2 block text-xs font-bold text-slate-600">
            ساعت شروع
          </label>
          <input
            id="slot-start"
            type="time"
            name="startTime"
            required
            step={1800}
            dir="ltr"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="slot-end" className="mb-2 block text-xs font-bold text-slate-600">
            ساعت پایان
          </label>
          <input
            id="slot-end"
            type="time"
            name="endTime"
            required
            step={1800}
            dir="ltr"
            className={inputClass}
          />
        </div>
      </div>

      <p className="rounded-lg bg-indigo-50 px-4 py-3 text-xs leading-6 text-iris-700">
        هر بازه به Slotهای دقیق ۳۰ دقیقه‌ای تقسیم می‌شود. اعضا فقط Slotهای هفته
        جاری ایران را می‌بینند و هفته بعد در آغاز همان هفته برای رزرو نمایش داده
        می‌شود.
      </p>

      <div>
        <label htmlFor="slot-note" className="mb-2 block text-xs font-bold text-slate-600">
          یادداشت اختیاری
        </label>
        <input
          id="slot-note"
          name="note"
          maxLength={300}
          className={inputClass}
          placeholder="برای نمونه ظرفیت Office Hour هفته اول"
        />
      </div>

      <FormMessage
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
      <SubmitButton pendingLabel="در حال ساخت Slotها">
        ثبت زمان‌های آزاد
      </SubmitButton>
    </form>
  );
}
