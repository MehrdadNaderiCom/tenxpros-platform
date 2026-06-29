"use client";

/**
 * A form-submit button that asks for confirmation before running its server
 * action. Used for destructive actions like a permanent (force) delete.
 */
export function ConfirmSubmit({
  action,
  hidden = {},
  message,
  label,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  message: string;
  label: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={className ?? "rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"}>
        {label}
      </button>
    </form>
  );
}
