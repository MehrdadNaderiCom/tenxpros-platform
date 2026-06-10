"use client";

/**
 * Submit button for destructive form actions that asks for confirmation first.
 * Accepts a server action via `action` (used as the button's formAction) so it
 * can sit inside an existing form next to Save. Payload fields must live in
 * hidden inputs on the form, never on the button.
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
  return (
    <button
      type="submit"
      formAction={action}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={
        className ??
        "rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
      }
    >
      {children}
    </button>
  );
}
