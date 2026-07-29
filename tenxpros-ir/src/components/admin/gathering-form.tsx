"use client";

import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import { createGatheringAction } from "@/actions/gatherings";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

const inputClass =
  "min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-iris-500 focus:ring-2 focus:ring-iris-500/10";

export function GatheringForm() {
  const [state, formAction] = useFormState(
    createGatheringAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="gathering-title"
          className="mb-2 block text-xs font-bold text-slate-600"
        >
          عنوان برنامه
        </label>
        <input
          id="gathering-title"
          name="title"
          required
          minLength={3}
          maxLength={200}
          defaultValue="TenXPros AI Roundtable"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="gathering-topic"
          className="mb-2 block text-xs font-bold text-slate-600"
        >
          موضوع این هفته
        </label>
        <input
          id="gathering-topic"
          name="topic"
          required
          minLength={3}
          maxLength={300}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="gathering-description"
          className="mb-2 block text-xs font-bold text-slate-600"
        >
          توضیح برنامه
        </label>
        <textarea
          id="gathering-description"
          name="description"
          rows={4}
          maxLength={5000}
          className={`${inputClass} py-3 leading-7`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="gathering-date"
            className="mb-2 block text-xs font-bold text-slate-600"
          >
            تاریخ به وقت تهران
          </label>
          <input
            id="gathering-date"
            name="date"
            type="date"
            required
            dir="ltr"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="gathering-start"
            className="mb-2 block text-xs font-bold text-slate-600"
          >
            ساعت شروع
          </label>
          <input
            id="gathering-start"
            name="startTime"
            type="time"
            required
            step={900}
            dir="ltr"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="gathering-capacity"
            className="mb-2 block text-xs font-bold text-slate-600"
          >
            ظرفیت اختیاری
          </label>
          <input
            id="gathering-capacity"
            name="capacity"
            type="number"
            min={1}
            max={10000}
            dir="ltr"
            className={inputClass}
          />
        </div>
      </div>

      <p className="rounded-lg bg-indigo-50 px-4 py-3 text-xs leading-6 text-iris-700">
        زمان پایان به‌صورت خودکار ۹۰ دقیقه پس از شروع محاسبه می‌شود.
      </p>

      <div>
        <label
          htmlFor="gathering-zoom"
          className="mb-2 block text-xs font-bold text-slate-600"
        >
          لینک Zoom اختیاری
        </label>
        <input
          id="gathering-zoom"
          name="zoomJoinUrl"
          type="url"
          dir="ltr"
          placeholder="https://zoom.us/j/"
          className={`${inputClass} text-left`}
        />
      </div>

      <div>
        <label
          htmlFor="gathering-status"
          className="mb-2 block text-xs font-bold text-slate-600"
        >
          وضعیت انتشار
        </label>
        <select
          id="gathering-status"
          name="status"
          required
          defaultValue="DRAFT"
          className={inputClass}
        >
          <option value="DRAFT">پیش‌نویس</option>
          <option value="PUBLISHED">انتشار فوری</option>
        </select>
      </div>

      <FormMessage
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
      <SubmitButton pendingLabel="در حال ثبت برنامه">
        ساخت برنامه ۹۰ دقیقه‌ای
      </SubmitButton>
    </form>
  );
}
