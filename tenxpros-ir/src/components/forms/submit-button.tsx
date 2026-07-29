"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
} & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "name" | "value" | "formAction">;

export function SubmitButton({
  children,
  pendingLabel = "در حال ثبت",
  className = "",
  name,
  value,
  formAction,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-iris-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-iris-500/20 transition hover:bg-iris-400 focus:outline-none focus:ring-2 focus:ring-iris-300 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
