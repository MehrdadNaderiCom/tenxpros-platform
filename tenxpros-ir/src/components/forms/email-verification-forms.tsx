"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import {
  resendEmailVerificationAction,
  verifyEmailAction,
} from "@/actions/email-verification";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

export function EmailVerificationConfirmForm({ token }: { token: string }) {
  const [state, formAction] = useFormState(
    verifyEmailAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <FormMessage
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
      {state.status === "success" ? (
        <Link
          href="/login"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-bold text-ink-950"
        >
          ورود به پنل
        </Link>
      ) : (
        <SubmitButton className="w-full" pendingLabel="در حال تأیید امن ایمیل">
          تأیید ایمیل
        </SubmitButton>
      )}
    </form>
  );
}

export function EmailVerificationResendForm() {
  const [state, formAction] = useFormState(
    resendEmailVerificationAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="verification-email"
          className="mb-2 block text-sm font-bold text-slate-200"
        >
          ایمیل درخواست
        </label>
        <input
          id="verification-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          className="min-h-12 w-full rounded-lg border border-white/10 bg-white/[0.055] px-4 text-left text-white outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20"
        />
      </div>
      <FormMessage
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
      <SubmitButton className="w-full" pendingLabel="در حال ارسال لینک تازه">
        ارسال لینک تازه
      </SubmitButton>
    </form>
  );
}
