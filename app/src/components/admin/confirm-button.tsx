"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Submit button for destructive form actions that asks for confirmation first.
 * Accepts a server action via `action` (used as the button's formAction) so it
 * can sit inside an existing form next to Save. Payload fields must live in
 * hidden inputs on the form, never on the button. Shows a spinner while the
 * form's action runs.
 */
export function ConfirmButton({
  action,
  message,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={action}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={
        (className ??
          "rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40") +
        " inline-flex items-center active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60"
      }
    >
      {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 flex-none animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
