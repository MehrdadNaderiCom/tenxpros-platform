import type { ReactNode } from "react";
import { Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  info: { wrap: "border-blue-200 bg-blue-50 text-blue-900", icon: Info, iconColor: "text-blue-500" },
  success: { wrap: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2, iconColor: "text-emerald-600" },
  warning: { wrap: "border-amber-200 bg-amber-50 text-amber-900", icon: AlertTriangle, iconColor: "text-amber-600" },
  error: { wrap: "border-red-200 bg-red-50 text-red-700", icon: XCircle, iconColor: "text-red-600" },
  neutral: { wrap: "border-neutral-200 bg-neutral-50 text-slate-700", icon: Info, iconColor: "text-slate-400" },
} as const;

/**
 * Inline alert / banner. One look for every status message in the app: info,
 * success, warning, error, neutral. Use instead of hand-rolled colored boxes.
 */
export function Alert({
  tone = "info",
  title,
  children,
  icon = true,
  className,
}: {
  tone?: keyof typeof TONES;
  title?: ReactNode;
  children?: ReactNode;
  icon?: boolean;
  className?: string;
}) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-md border px-4 py-3 text-sm leading-6", t.wrap, className)}>
      {icon ? <Icon className={cn("mt-0.5 h-4 w-4 flex-none", t.iconColor)} aria-hidden="true" /> : null}
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5 text-[0.92em] opacity-90")}>{children}</div> : null}
      </div>
    </div>
  );
}
