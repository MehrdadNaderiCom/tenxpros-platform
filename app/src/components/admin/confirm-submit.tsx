"use client";

import { ConfirmDialog } from "@/components/ui/dialog";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/**
 * A form-submit control that asks for confirmation before running its server
 * action. Renders the shared modal ConfirmDialog (not a native window.confirm),
 * so every destructive action across the admin uses the same polished, accessible
 * confirmation. Defaults to the red "danger" variant for deletes.
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
    <ConfirmDialog
      action={action}
      hidden={hidden}
      triggerLabel={label}
      title="Please confirm"
      description={message}
      confirmLabel={label}
      triggerVariant={variant}
      triggerSize={size}
    />
  );
}
