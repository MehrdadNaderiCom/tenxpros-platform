"use client";

import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import { registerForGatheringAction } from "@/actions/gatherings";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

type GatheringRegistrationFormProps = {
  gatheringId: string;
};

export function GatheringRegistrationForm({
  gatheringId,
}: GatheringRegistrationFormProps) {
  const [state, formAction] = useFormState(
    registerForGatheringAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="gatheringId" value={gatheringId} />
      <FormMessage
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
      {state.status !== "success" ? (
        <SubmitButton className="w-full" pendingLabel="در حال ثبت حضور">
          ثبت حضور در AI Roundtable
        </SubmitButton>
      ) : null}
    </form>
  );
}
