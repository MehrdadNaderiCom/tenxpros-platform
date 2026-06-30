import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A single KPI / stat. One look for every "big number + label" tile in the
 * dashboards. Optionally a hint line and a tone for the number, and it becomes a
 * link when href is set.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  href,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "positive" | "warning" | "danger";
  href?: string;
  className?: string;
}) {
  const toneClass =
    tone === "positive" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : tone === "danger" ? "text-red-700" : "text-navy-900";
  const inner = (
    <>
      <p className={cn("text-2xl font-semibold", toneClass)}>{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </>
  );
  const base = cn("rounded-lg border border-neutral-200 bg-white p-4", className);
  return href ? (
    <Link href={href} className={cn(base, "block transition hover:border-navy-300 hover:shadow-sm")}>
      {inner}
    </Link>
  ) : (
    <div className={base}>{inner}</div>
  );
}

/** A responsive grid of StatCards. */
export function StatGrid({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4 | 5; className?: string }) {
  const colClass = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 5: "sm:grid-cols-3 lg:grid-cols-5" }[cols];
  return <div className={cn("grid grid-cols-2 gap-3", colClass, className)}>{children}</div>;
}

/** A titled content section card with an optional action in the header. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-neutral-200 bg-white p-5 md:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
