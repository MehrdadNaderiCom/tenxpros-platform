import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  tone = "primary",
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "primary" | "accent" | "success";
}) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const fill =
    tone === "accent"
      ? "bg-accent"
      : tone === "success"
        ? "bg-[hsl(var(--success))]"
        : "bg-primary";
  return (
    <div className={cn("h-2 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div className={cn("h-full transition-all", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}
