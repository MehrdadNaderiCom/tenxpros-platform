"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Two-step destructive control. Step 1: tick the acknowledgement checkbox (also
 * re-checked server-side via the `acknowledge` field). Step 2: two sequential
 * confirmation dialogs on click. Lives inside a form that carries the hidden id.
 */
export function ForceDeleteButton({
  action,
  name,
  label = "Force delete (with financial history)",
  acknowledgeText = "I understand this also permanently deletes all closed deals and commission history for this partner. This erases the audit trail and cannot be undone.",
  confirm1,
  confirm2,
}: {
  action: (formData: FormData) => Promise<void>;
  name: string;
  label?: string;
  acknowledgeText?: string;
  confirm1?: string;
  confirm2?: string;
}) {
  const [ack, setAck] = useState(false);
  const { pending } = useFormStatus();
  const c1 = confirm1 ?? `Force delete "${name}" AND all of their financial history? This destroys the audit trail and cannot be undone.`;
  const c2 = confirm2 ?? "This is permanent and irreversible. Click OK to confirm for the second and final time.";
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          name="acknowledge"
          className="mt-0.5 h-4 w-4 flex-none"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />
        <span>{acknowledgeText}</span>
      </label>
      <button
        type="submit"
        formAction={action}
        disabled={!ack || pending}
        aria-busy={pending || undefined}
        onClick={(event) => {
          if (!ack) {
            event.preventDefault();
            return;
          }
          if (!window.confirm(c1)) {
            event.preventDefault();
            return;
          }
          if (!window.confirm(c2)) {
            event.preventDefault();
          }
        }}
        className="inline-flex items-center rounded-md border border-red-300 bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 flex-none animate-spin" aria-hidden="true" /> : null}
        {label}
      </button>
    </div>
  );
}
