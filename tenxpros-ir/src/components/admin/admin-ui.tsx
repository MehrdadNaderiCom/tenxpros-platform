import type { ReactNode } from "react";

export function AdminPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-7 ${className}`}
    >
      {children}
    </section>
  );
}

export function AdminHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-iris-600">
          Admin Console
        </p>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

const tones = {
  positive: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/15",
  neutral: "bg-slate-100 text-slate-700 ring-slate-600/10",
  negative: "bg-rose-50 text-rose-700 ring-rose-600/15",
  info: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
};

export function AdminBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
      <p className="font-black text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}
