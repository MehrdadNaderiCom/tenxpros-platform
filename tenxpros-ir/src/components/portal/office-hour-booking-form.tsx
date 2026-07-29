"use client";

import { CalendarCheck2, Clock3, ShieldCheck } from "lucide-react";
import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import { bookOfficeHourAction } from "@/actions/bookings";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

export type BookableSlot = {
  id: string;
  dateLabel: string;
  timeLabel: string;
};

export function OfficeHourBookingForm({ slots }: { slots: BookableSlot[] }) {
  const [state, formAction] = useFormState(bookOfficeHourAction, INITIAL_ACTION_STATE);

  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-6">
        <CalendarCheck2 className="size-10 text-emerald-300" />
        <h2 className="mt-4 text-xl font-black text-white">Office Hour شما رزرو شد</h2>
        <p className="mt-3 text-sm leading-7 text-emerald-50">{state.message}</p>
        <a
          href="/portal/office-hours"
          className="mt-5 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-black text-emerald-900"
        >
          مشاهده جزئیات جلسه
        </a>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-7 text-center">
        <Clock3 className="mx-auto size-9 text-slate-500" />
        <h2 className="mt-4 font-black text-white">زمان آزادی برای این هفته باقی نمانده است</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-400">
          زمان‌های تازه فقط با ساعت تهران نمایش داده می‌شوند. برای ظرفیت‌های بعدی دوباره
          همین صفحه را بررسی کنید.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot) => (
          <label
            key={slot.id}
            className="group relative cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] p-5 transition hover:border-iris-400/50 has-[:checked]:border-iris-400 has-[:checked]:bg-iris-500/10 has-[:checked]:ring-2 has-[:checked]:ring-iris-400/15"
          >
            <input
              type="radio"
              name="slotId"
              value={slot.id}
              required
              className="absolute left-4 top-4 size-4 accent-indigo-500"
            />
            <p className="pl-7 text-sm font-black text-white">{slot.dateLabel}</p>
            <p className="mt-3 flex items-center gap-2 text-sm text-iris-200">
              <Clock3 className="size-4" />
              ساعت {slot.timeLabel}
            </p>
            <p className="mt-2 text-xs text-slate-500">۳۰ دقیقه به وقت تهران</p>
          </label>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.07] p-4 text-xs leading-6 text-amber-50">
        <ShieldCheck className="mt-1 size-4 shrink-0 text-amber-200" />
        <p>
          ثبت این زمان قطعی است. هر عضو در هفته ایرانی از شنبه تا جمعه فقط یک جلسه
          ۳۰ دقیقه‌ای دارد. سهمیه استفاده‌نشده به هفته بعد منتقل نمی‌شود و پس از رزرو،
          انتخاب زمان دوم در همان هفته ممکن نیست.
        </p>
      </div>

      <div className="mt-5">
        <FormMessage message={state.message} tone="error" />
      </div>
      <SubmitButton className="mt-5 w-full sm:w-auto" pendingLabel="در حال ساخت جلسه Zoom">
        تأیید زمان و رزرو قطعی
      </SubmitButton>
    </form>
  );
}
