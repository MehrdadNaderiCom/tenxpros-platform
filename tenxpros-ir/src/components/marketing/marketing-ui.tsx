import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  ShieldCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { TechnicalTerm } from "@/components/shared/technical-term";
import { cn } from "@/lib/utils";

function isLatinLabel(value: ReactNode): value is string {
  return (
    typeof value === "string" &&
    /[A-Za-z]/.test(value) &&
    !/[\u0600-\u06ff]/u.test(value)
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-900">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Section({
  children,
  className,
  id,
  tone = "light"
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "light" | "soft" | "dark";
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative py-20 sm:py-24 lg:py-28",
        tone === "light" && "bg-white",
        tone === "soft" && "bg-slate-50",
        tone === "dark" && "bg-ink-950 text-white",
        className
      )}
    >
      <div className="container-shell">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "start",
  inverse = false
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "start" | "center";
  inverse?: boolean;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto max-w-3xl text-center")}>
      {eyebrow ? (
        <div
          lang={isLatinLabel(eyebrow) ? "en" : undefined}
          className={cn(
            "mb-4 text-xs font-bold uppercase tracking-[0.12em]",
            isLatinLabel(eyebrow) && "font-latin",
            inverse ? "text-iris-300" : "text-iris-600"
          )}
        >
          {eyebrow}
        </div>
      ) : null}
      <h2
        className={cn(
          "text-balance text-3xl font-semibold leading-[1.35] sm:text-4xl lg:text-[2.7rem]",
          inverse ? "text-white" : "text-ink-950"
        )}
      >
        {title}
      </h2>
      {description ? (
        <div
          className={cn(
            "text-pretty mt-5 max-w-3xl text-base leading-8 sm:text-lg sm:leading-9",
            align === "center" && "mx-auto",
            inverse ? "text-slate-300" : "text-slate-600"
          )}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
  inverse = true,
  className
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "start" | "center";
  inverse?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        align={align}
        inverse={inverse}
      />
    </div>
  );
}

export function English({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span dir="ltr" lang="en" className={cn("font-latin", className)}>
      {children}
    </span>
  );
}

export function Eyebrow({
  children,
  className,
  gold = false
}: {
  children: ReactNode;
  className?: string;
  gold?: boolean;
}) {
  return (
    <p
      lang={isLatinLabel(children) ? "en" : undefined}
      className={cn(
        "text-xs font-bold uppercase tracking-[0.12em]",
        isLatinLabel(children) && "font-latin",
        gold ? "text-credential" : "text-iris-300",
        className
      )}
    >
      {children}
    </p>
  );
}

export function Surface({
  children,
  className,
  gold = false
}: {
  children: ReactNode;
  className?: string;
  gold?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-ink-850 shadow-panel",
        gold ? "border-credential/25" : "border-white/10",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PrimaryLink({
  href,
  children,
  inverse = false
}: {
  href: string;
  children: ReactNode;
  inverse?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        inverse ? "dark-focus-ring" : "focus-ring",
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold shadow-lg transition",
        inverse
          ? "bg-white text-ink-950 shadow-black/20 hover:bg-slate-100"
          : "bg-iris-500 text-white shadow-iris-600/20 hover:bg-iris-400"
      )}
    >
      {children}
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

export function ArrowAction({
  href,
  children,
  className,
  variant = "primary"
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "gold";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "dark-focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-black transition",
        variant === "gold"
          ? "bg-credential text-ink-950 hover:bg-amber-200"
          : "bg-iris-500 text-white hover:bg-iris-400",
        className
      )}
    >
      {children}
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

export function MarketingLink({
  href,
  children,
  className,
  variant = "primary"
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "dark-focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-bold transition",
        variant === "secondary"
          ? "border-white/20 bg-white/[0.03] text-white hover:bg-white/[0.08]"
          : "border-iris-500 bg-iris-500 text-white hover:bg-iris-400",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({
  href,
  children,
  inverse = false
}: {
  href: string;
  children: ReactNode;
  inverse?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        inverse ? "dark-focus-ring" : "focus-ring",
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-semibold transition",
        inverse
          ? "border-white/20 bg-white/[0.03] text-white hover:bg-white/[0.08]"
          : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
      )}
    >
      {children}
      <ArrowUpLeft aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  primary = { label: "درخواست عضویت", href: "/apply" },
  secondary,
  children,
  actions,
  trust
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  primary?: { label: string; href: string } | null;
  secondary?: { label: string; href: string };
  children?: ReactNode;
  actions?: ReactNode;
  trust?: string[];
}) {
  return (
    <>
      <section
        className="relative isolate overflow-hidden bg-ink-950 bg-cover bg-[position:18%_28%] text-white"
        style={{ backgroundImage: "url('/images/dossier-cover.png')" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-ink-950/85"
        />
        <div className="container-shell flex min-h-[34rem] items-center py-16 sm:py-20 lg:py-24">
          <div className="max-w-4xl">
          <div
            lang={isLatinLabel(eyebrow) ? "en" : undefined}
            className={cn(
              "mb-6 inline-flex items-center gap-2 rounded-full border border-iris-300/20 bg-iris-400/10 px-3.5 py-2 text-xs font-semibold text-iris-200",
              isLatinLabel(eyebrow) && "font-latin"
            )}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-credential"
            />
            {eyebrow}
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.28] text-white sm:text-5xl lg:text-[4rem] lg:leading-[1.18]">
            {title}
          </h1>
          <div className="text-pretty mt-7 max-w-3xl text-lg leading-9 text-slate-300">
            {description}
          </div>
          {actions ? (
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">{actions}</div>
          ) : primary || secondary ? (
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {primary ? (
                <PrimaryLink href={primary.href} inverse>
                  {primary.label}
                </PrimaryLink>
              ) : null}
              {secondary ? (
                <SecondaryLink href={secondary.href} inverse>
                  {secondary.label}
                </SecondaryLink>
              ) : null}
            </div>
          ) : null}
          {trust ? (
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs leading-6 text-slate-400">
              {trust.map((item) => (
                <span className="inline-flex items-center gap-2" key={item}>
                  <Check aria-hidden="true" className="h-4 w-4 text-iris-300" />
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs leading-6 text-slate-400">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-iris-300" />
                ابتدا درخواست می‌دهید
              </span>
              <span className="inline-flex items-center gap-2">
                <Check aria-hidden="true" className="h-4 w-4 text-iris-300" />
                فقط پس از پذیرش پرداخت می‌کنید
              </span>
            </div>
          )}
          </div>
        </div>
      </section>
      {children ? (
        <section className="bg-ink-950 pb-16 text-white sm:pb-20">
          <div className="container-shell">
            <div className="mx-auto max-w-2xl">{children}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}

export function DossierVisual({ compact = false }: { compact?: boolean }) {
  const phases = [
    ["۰۱", "Frame", "۱ تا ۴"],
    ["۰۲", "Design", "۵ تا ۸"],
    ["۰۳", "Prove", "۹ تا ۱۰"],
    ["۰۴", "Foresee", "۱۱ تا ۱۲"]
  ];

  return (
    <div className="relative mx-auto max-w-[31rem]">
      <div
        aria-hidden="true"
        className="absolute inset-8 translate-y-6 rotate-3 rounded-lg border border-white/10 bg-white/[0.03]"
      />
      <div className="relative overflow-hidden rounded-lg border border-white/15 bg-ink-850 p-5 shadow-panel sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p
              lang="en"
              className="font-latin text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-iris-300"
            >
              Living AI Solution Dossier
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              یک تصمیم حرفه‌ای، مستند و قابل دفاع
            </p>
          </div>
          <span
            lang="en"
            className="rounded-full border border-credential/30 bg-credential/10 px-3 py-1.5 font-latin text-[0.61rem] font-bold tracking-[0.12em] text-credential"
          >
            REVIEW STANDARD
          </span>
        </div>
        <div className={cn("grid gap-2.5 py-5", compact ? "grid-cols-2" : "")}>
          {phases.map(([index, title, weeks]) => (
            <div
              key={title}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-iris-400/10 text-xs font-bold text-iris-300">
                {index}
              </span>
              <span>
                <TechnicalTerm className="text-sm font-semibold text-white">
                  {title}
                </TechnicalTerm>
                <span className="block text-[0.68rem] text-slate-500">
                  هفته‌های {weeks}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5 border-t border-white/10 pt-5">
          <div className="rounded-lg bg-white/[0.04] p-3">
            <p
              lang="en"
              className="font-latin text-[0.61rem] uppercase tracking-[0.12em] text-slate-500"
            >
              Review criteria
            </p>
            <p className="mt-1.5 text-sm font-semibold text-white">۸ معیار روشن</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-3">
            <p
              lang="en"
              className="font-latin text-[0.61rem] uppercase tracking-[0.12em] text-slate-500"
            >
              Credential
            </p>
            <p className="mt-1.5 text-sm font-semibold text-white">قابل استعلام</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IconCard({
  icon: Icon,
  title,
  description,
  className
}: {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-lg border border-white/10 bg-ink-850 p-6",
        className
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-iris-500/10 text-iris-300">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3
        lang={isLatinLabel(title) ? "en" : undefined}
        className={cn(
          "mt-5 text-lg font-black text-white",
          isLatinLabel(title) && "font-latin"
        )}
      >
        {title}
      </h3>
      <div className="mt-3 text-sm leading-8 text-slate-300">{description}</div>
    </article>
  );
}

export function Metrics({
  items,
  dark = false
}: {
  items: { value: string; label: string }[];
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-4",
        dark
          ? "border-white/10 bg-white/[0.03]"
          : "border-slate-200 bg-white shadow-soft"
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "p-6 sm:p-7",
            index > 0 &&
              (dark
                ? "border-t border-white/10 sm:border-r sm:border-t-0"
                : "border-t border-slate-200 sm:border-r sm:border-t-0"),
            index === 2 && "sm:border-r-0 lg:border-r",
            index === 2 && "sm:border-t lg:border-t-0"
          )}
        >
          <p
            lang={isLatinLabel(item.value) ? "en" : undefined}
            className={cn(
              "text-2xl font-semibold",
              isLatinLabel(item.value) && "font-latin",
              dark ? "text-white" : "text-ink-950"
            )}
          >
            {item.value}
          </p>
          <p
            className={cn(
              "mt-2 text-sm",
              dark ? "text-slate-400" : "text-slate-500"
            )}
          >
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CheckList({
  items,
  inverse = false,
  columns = 1,
  className,
  gold = false
}: {
  items: ReactNode[];
  inverse?: boolean;
  columns?: 1 | 2;
  className?: string;
  gold?: boolean;
}) {
  return (
    <ul
      className={cn(
        "grid gap-3",
        columns === 2 && "md:grid-cols-2",
        className
      )}
    >
      {items.map((item, index) => (
        <li
          key={index}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4 text-sm leading-7",
            inverse || gold
              ? "border-white/10 bg-white/[0.03] text-slate-300"
              : "border-slate-200 bg-white text-slate-700"
          )}
        >
          <span
            className={cn(
              "mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full",
              inverse || gold
                ? "bg-iris-400/15 text-iris-300"
                : "bg-iris-50 text-iris-600"
            )}
          >
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function OfficeHourNotice({
  compact = false,
  inverse = false
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5 sm:p-6",
        inverse
          ? "border-iris-300/20 bg-iris-400/10"
          : "border-iris-200 bg-iris-50"
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-lg",
            inverse
              ? "bg-white/10 text-iris-200"
              : "bg-white text-iris-600 shadow-sm"
          )}
        >
          <Clock3 aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <p
            lang="en"
            className={cn(
              "font-latin text-sm font-semibold",
              inverse ? "text-white" : "text-ink-950"
            )}
          >
            Weekly Office Hour
          </p>
          <p
            className={cn(
              "mt-2 leading-7",
              compact ? "text-sm" : "text-base",
              inverse ? "text-slate-300" : "text-slate-700"
            )}
          >
            هر عضو فعال نسخه فارسی در هر هفته تقویمی ایران، از شنبه تا جمعه، فقط یک{" "}
            <TechnicalTerm>Office Hour</TechnicalTerm> اختصاصی ۳۰ دقیقه‌ای
            می‌تواند رزرو کند. سهمیه استفاده‌نشده در پایان جمعه منقضی می‌شود و
            به هفته بعد منتقل یا انباشته نمی‌شود.
          </p>
          {!compact ? (
            <p
              className={cn(
                "mt-3 inline-flex items-center gap-2 text-xs font-medium",
                inverse ? "text-iris-200" : "text-iris-700"
              )}
            >
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              همه زمان‌ها به وقت تهران نمایش داده می‌شوند
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FaqAccordion({
  items
}: {
  items: { question: string; answer: ReactNode }[];
}) {
  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 font-semibold leading-7 text-ink-950 marker:content-none sm:px-6">
            <span>{item.question}</span>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition group-open:rotate-180 group-open:bg-iris-50 group-open:text-iris-600">
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            </span>
          </summary>
          <div className="px-5 pb-5 text-sm leading-8 text-slate-600 sm:px-6 sm:pb-6">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}

export function FinalCta({
  eyebrow = "FOUNDING CHARTER",
  title,
  description,
  primaryLabel = "درخواست حضور در Founding Charter",
  secondaryLabel = "جزئیات شهریه"
}: {
  eyebrow?: string;
  title: ReactNode;
  description: ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  return (
    <Section tone="dark" className="overflow-hidden">
      <div className="relative mx-auto max-w-3xl text-center">
        <p
          lang={isLatinLabel(eyebrow) ? "en" : undefined}
          className={cn(
            "text-xs font-bold tracking-[0.16em] text-credential",
            isLatinLabel(eyebrow) && "font-latin"
          )}
        >
          {eyebrow}
        </p>
        <h2 className="text-balance mt-5 text-3xl font-semibold leading-[1.4] text-white sm:text-4xl">
          {title}
        </h2>
        <div className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300">
          {description}
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <PrimaryLink href="/apply" inverse>
            {primaryLabel}
          </PrimaryLink>
          <SecondaryLink href="/pricing" inverse>
            {secondaryLabel}
          </SecondaryLink>
        </div>
      </div>
    </Section>
  );
}
