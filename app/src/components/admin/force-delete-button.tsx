"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Two-step destructive control for force-deleting a partner WITH financial
 * history. Step 1: tick the acknowledgement checkbox (also re-checked server-side
 * via the `acknowledge` field). Step 2: two sequential confirmation dialogs on
 * click. Lives inside a form that carries a hidden partnerId.
 */
export function ForceDeleteButton({
  action,
  partnerName,
}: {
  action: (formData: FormData) => Promise<void>;
  partnerName: string;
}) {
  const [ack, setAck] = useState(false);
  const { pending } = useFormStatus();
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
        <span>
          I understand this also permanently deletes all closed deals and commission history for this partner. This
          erases the audit trail and cannot be undone.
        </span>
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
          if (!window.confirm(`Force delete "${partnerName}" AND all of their financial history? This destroys the audit trail and cannot be undone.`)) {
            event.preventDefault();
            return;
          }
          if (!window.confirm("This is permanent and irreversible. Click OK to confirm for the second and final time.")) {
            event.preventDefault();
          }
        }}
        className="inline-flex items-center rounded-md border border-red-300 bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 flex-none animate-spin" aria-hidden="true" /> : null}
        Force delete (with financial history)
      </button>
    </div>
  );
}
