import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  SUBMITTED: "bg-slate-100 text-slate-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  ENROLLED: "bg-navy-100 text-navy-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  PASSED: "bg-emerald-100 text-emerald-700",
  REVISE: "bg-amber-100 text-amber-800",
  HOLD: "bg-red-100 text-red-700",
  CERTIFIED: "border border-gold-500 bg-gold-100 text-gold-800",
  CONDITIONALLY_CERTIFIED: "bg-amber-100 text-amber-800",
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
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        status ? statusStyles[status] ?? "bg-neutral-100 text-neutral-700" : "bg-neutral-100 text-neutral-700",
        className,
      )}
      {...props}
    />
  );
}
