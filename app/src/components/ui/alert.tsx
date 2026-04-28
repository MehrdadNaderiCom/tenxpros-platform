import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";
const toneClasses: Record<Tone, string> = {
  info: "border-primary/30 bg-primary/5 text-foreground",
  success: "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 text-foreground",
  warning: "border-[hsl(var(--warning))]/50 bg-[hsl(var(--warning))]/10 text-foreground",
  danger: "border-[hsl(var(--danger))]/40 bg-[hsl(var(--danger))]/10 text-foreground",
};

export function Alert({
  className,
  tone = "info",
  title,
  children,
}: {
  className?: string;
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-md border p-4 text-sm", toneClasses[tone], className)}>
      {title ? <p className="font-medium mb-1">{title}</p> : null}
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}
