"use client";

import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import { retryBookingProvisionAction } from "@/actions/bookings";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

export function BookingRecoveryForm({ bookingId }: { bookingId: string }) {
  const [state, formAction] = useFormState(
    retryBookingProvisionAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <FormMessage
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
      <SubmitButton
        className="mt-3 min-h-10 bg-amber-600 px-4 py-2 shadow-none hover:bg-amber-500"
        pendingLabel="در حال تلاش دوباره"
      >
        ساخت دوباره Zoom و ارسال ایمیل
      </SubmitButton>
    </form>
  );
}
