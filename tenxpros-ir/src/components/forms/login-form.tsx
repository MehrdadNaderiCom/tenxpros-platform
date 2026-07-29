"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import {
  adminLoginAction,
  applicantLoginAction,
} from "@/actions/auth";
import { INITIAL_ACTION_STATE } from "@/actions/action-state";

import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

type LoginFormProps = {
  mode: "applicant" | "admin";
};

export function LoginForm({ mode }: LoginFormProps) {
  const action = mode === "admin" ? adminLoginAction : applicantLoginAction;
  const [state, formAction] = useFormState(action, INITIAL_ACTION_STATE);
  const isAdmin = mode === "admin";

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor={`${mode}-email`} className="mb-2 block text-sm font-bold text-slate-200">
          ایمیل
        </label>
        <input
          id={`${mode}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          placeholder={isAdmin ? "admin@tenxpros.ir" : "name@example.com"}
          className="min-h-12 w-full rounded-lg border border-white/10 bg-white/[0.055] px-4 text-left text-white outline-none transition placeholder:text-slate-600 focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20"
        />
        {state.fieldErrors?.email?.[0] ? (
          <p className="mt-2 text-xs text-rose-200">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor={`${mode}-password`}
          className="mb-2 block text-sm font-bold text-slate-200"
        >
          رمز عبور
        </label>
        <input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className="min-h-12 w-full rounded-lg border border-white/10 bg-white/[0.055] px-4 text-left text-white outline-none transition focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20"
        />
        {state.fieldErrors?.password?.[0] ? (
          <p className="mt-2 text-xs text-rose-200">{state.fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <FormMessage message={state.message} tone="error" />

      <SubmitButton className="w-full" pendingLabel="در حال ورود">
        ورود امن
      </SubmitButton>

      {!isAdmin ? (
        <p className="text-center text-sm leading-7 text-slate-400">
          هنوز درخواست نداده‌اید؟{" "}
          <Link href="/apply" className="font-bold text-iris-300 hover:text-white">
            ارسال درخواست Founding Charter
          </Link>
        </p>
      ) : null}
    </form>
  );
}
