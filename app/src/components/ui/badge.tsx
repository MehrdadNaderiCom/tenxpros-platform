import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-700",
  SUBMITTED: "bg-slate-100 text-slate-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  REVIEWED: "bg-blue-100 text-blue-700",
  REVISED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  ENROLLED: "bg-navy-100 text-navy-700",
  ONBOARDING: "bg-navy-100 text-navy-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  REVOKED: "bg-red-100 text-red-700",
  EXPIRED: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-neutral-100 text-neutral-600",
  PRIVATE: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  UNLOCKED: "bg-blue-100 text-blue-700",
  LOCKED: "bg-neutral-100 text-neutral-600",
  PASSED: "bg-emerald-100 text-emerald-700",
  REVISE: "bg-amber-100 text-amber-800",
  HOLD: "bg-red-100 text-red-700",
  OPEN: "bg-blue-100 text-blue-700",
  WAITING_RESPONSE: "bg-amber-100 text-amber-800",
  AWAITING_PARTICIPANT: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-neutral-100 text-neutral-600",
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-700",
  CERTIFIED: "border border-gold-500 bg-gold-100 text-gold-800",
  CONDITIONALLY_CERTIFIED: "bg-amber-100 text-amber-800",
  COMPLETED_NOT_CERTIFIED: "bg-slate-100 text-slate-600",
  NOT_COMPLETED: "bg-red-100 text-red-700",
  NOT_CERTIFIED: "bg-slate-100 text-slate-600",
};

export function Badge({
  className,
  status,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { status?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-normal",
        status ? statusStyles[status] ?? "bg-neutral-100 text-neutral-700" : "bg-neutral-100 text-neutral-700",
        className,
      )}
      {...props}
    />
  );
}
