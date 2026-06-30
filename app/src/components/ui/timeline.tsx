import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineItem = {
  title: ReactNode;
  meta?: ReactNode;
  body?: ReactNode;
  state?: "done" | "current" | "upcoming";
};

/**
 * A vertical timeline / progress trail. One look for "steps with a connector"
 * (academy progress, payment follow-up history, application status trail).
 */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-5 border-l border-neutral-200 pl-6", className)}>
      {items.map((item, i) => {
        const state = item.state ?? "upcoming";
        const dot =
          state === "done"
            ? "border-emerald-500 bg-emerald-500 text-white"
            : state === "current"
              ? "border-navy-600 bg-white text-navy-700"
              : "border-neutral-300 bg-white text-neutral-300";
        return (
          <li key={i} className="relative">
            <span className={cn("absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2", dot)} aria-hidden="true">
              {state === "done" ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className={cn("text-sm font-medium", state === "upcoming" ? "text-slate-400" : "text-navy-900")}>{item.title}</p>
              {item.meta ? <span className="text-xs text-slate-400">{item.meta}</span> : null}
            </div>
            {item.body ? <div className="mt-1 text-sm text-slate-600">{item.body}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** A labelled horizontal progress bar (0-100). `barClassName` colors the fill
 * (default brand navy; pass `bg-emerald-500` for a success/completion bar). */
export function ProgressBar({
  value,
  label,
  className,
  barClassName = "bg-navy-600",
}: {
  value: number;
  label?: ReactNode;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={className}>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span className="font-medium text-slate-600">{pct}%</span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full transition-all", barClassName)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
