"use client";

import { Button } from "@/components/ui/button";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/**
 * A form-submit button that asks for confirmation before running its server
 * action. Uses the shared Button so destructive actions look consistent across
 * the admin. Defaults to the red "danger" variant for deletes.
 */
export function ConfirmSubmit({
  action,
  hidden = {},
  message,
  label,
  variant = "danger",
  size = "sm",
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  message: string;
  label: string;
  variant?: Variant;
  size?: Size;
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
      <Button type="submit" variant={variant} size={size}>
        {label}
      </Button>
    </form>
  );
}
