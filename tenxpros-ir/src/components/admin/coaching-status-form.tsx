"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import { updateCoachingInquiryAction } from "@/actions/coaching";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

type CoachingInquiryStatus =
  | "NEW"
  | "CONTACTED"
  | "SCHEDULED"
  | "COMPLETED"
  | "DECLINED";

type CoachingStatusFormProps = {
  inquiryId: string;
  currentStatus: CoachingInquiryStatus;
  currentScheduledAt?: string;
  currentAdminNote?: string | null;
};

export function CoachingStatusForm({
  inquiryId,
  currentStatus,
  currentScheduledAt,
  currentAdminNote,
}: CoachingStatusFormProps) {
  const [state, formAction] = useFormState(
    updateCoachingInquiryAction,
    INITIAL_ACTION_STATE,
  );
  const [selectedStatus, setSelectedStatus] =
    useState<CoachingInquiryStatus>(currentStatus);
  const statusId = `coaching-status-${inquiryId}`;
  const scheduleId = `coaching-scheduled-at-${inquiryId}`;
  const scheduleHelpId = `coaching-scheduled-at-help-${inquiryId}`;
  const noteId = `coaching-note-${inquiryId}`;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="inquiryId" value={inquiryId} />

      <label
        htmlFor={statusId}
        className="block text-xs font-bold text-slate-600"
      >
        وضعیت درخواست
      </label>
      <select
        id={statusId}
        name="status"
        required
        value={selectedStatus}
        onChange={(event) =>
          setSelectedStatus(event.target.value as CoachingInquiryStatus)
        }
        className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-iris-500"
      >
        <option value="NEW">جدید</option>
        <option value="CONTACTED">تماس گرفته شد</option>
        <option value="SCHEDULED">زمان‌بندی شد</option>
        <option value="COMPLETED">انجام شد</option>
        <option value="DECLINED">رد شد</option>
      </select>

      <label
        htmlFor={scheduleId}
        className="block text-xs font-bold text-slate-600"
      >
        زمان جلسه به وقت تهران
      </label>
      <input
        id={scheduleId}
        name="scheduledAt"
        type="datetime-local"
        step={1800}
        required={selectedStatus === "SCHEDULED"}
        defaultValue={currentScheduledAt}
        aria-describedby={scheduleHelpId}
        dir="ltr"
        className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-iris-500"
      />
      <p id={scheduleHelpId} className="text-xs leading-6 text-slate-500">
        این مقدار با Time Zone تهران ذخیره می‌شود. با ثبت وضعیت زمان‌بندی‌شده،
        زمان جلسه برای عضو ایمیل خواهد شد.
      </p>

      <label
        htmlFor={noteId}
        className="block text-xs font-bold text-slate-600"
      >
        یادداشت داخلی اختیاری
      </label>
      <textarea
        id={noteId}
        name="adminNote"
        rows={3}
        maxLength={3000}
        defaultValue={currentAdminNote ?? ""}
        placeholder="نتیجه تماس، زمان هماهنگ‌شده یا نکته لازم برای پیگیری"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-iris-500"
      />

      <FormMessage
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
      <SubmitButton
        className="min-h-10 px-4 py-2 shadow-none"
        pendingLabel="در حال ذخیره"
      >
        ذخیره وضعیت
      </SubmitButton>
    </form>
  );
}
