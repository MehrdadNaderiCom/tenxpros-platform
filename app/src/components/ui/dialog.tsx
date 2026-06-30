"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Controlled modal dialog. Renders a backdrop + centered panel, closes on Escape
 * and backdrop click, and traps nothing fancy (the panel is the only focusable
 * region). Use ConfirmDialog for destructive confirmations.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter(
        (el) => !el.hasAttribute("disabled"),
      );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        // Trap focus within the panel.
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Move focus into the dialog on open.
    const t = setTimeout(() => focusables()[0]?.focus(), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} className={cn("relative w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl", className)}>
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-600">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <h2 id={titleId} className="pr-6 text-lg font-semibold text-navy-900">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

/**
 * A destructive confirmation. Renders a trigger button that opens a modal asking
 * for confirmation, then submits the given server action. Replaces window.confirm
 * for a polished, consistent destructive flow.
 */
export function ConfirmDialog({
  action,
  hidden = {},
  triggerLabel,
  title,
  description,
  confirmLabel,
  triggerVariant = "danger",
  triggerSize = "sm",
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  triggerLabel: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger";
  triggerSize?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        footer={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <form action={action}>
              {Object.entries(hidden).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <Button type="submit" variant="danger" size="sm">
                {confirmLabel ?? "Confirm"}
              </Button>
            </form>
          </>
        }
      />
    </>
  );
}
