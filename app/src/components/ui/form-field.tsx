"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible info tooltip: a focusable button that reveals a short description on
 * hover, keyboard focus, and tap (works without a mouse). Used to keep the form
 * compact while giving precise per-field guidance.
 */
export function InfoTip({ id, label, text }: { id: string; label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    // Hover handlers live on the wrapper so moving the pointer from the button
    // onto the tooltip popover keeps it open (the popover is a child here).
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-6 z-20 w-60 rounded-md border border-neutral-200 bg-white p-2.5 text-xs font-normal leading-5 text-slate-600 shadow-lg"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

/**
 * One form field with a uniform structure: a single-line label row (optional
 * "(optional)" tag + info tooltip), an optional always-visible description, the
 * control, and the error. Every field has the same vertical rhythm so grid rows
 * line up cleanly. The control is wired with id / aria-describedby / aria-invalid
 * for screen readers via cloneElement.
 *
 * - `hint`        -> compact info tooltip next to the label (keeps the form short)
 * - `description` -> always-visible helper line (use for the long free-text answers)
 */
export function Field({
  label,
  hint,
  description,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  description?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })
    : children;

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-[1.5rem] items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-slate-900">
          {label}
        </label>
        {optional ? <span className="text-xs font-normal text-slate-400">(optional)</span> : null}
        {hint ? <InfoTip id={hintId!} label={`About ${label}`} text={hint} /> : null}
      </div>
      {description ? (
        <p id={descId} className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
      <div className={cn("mt-2", !description && "mt-auto pt-0")}>{control}</div>
      {error ? (
        <p id={errId} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
