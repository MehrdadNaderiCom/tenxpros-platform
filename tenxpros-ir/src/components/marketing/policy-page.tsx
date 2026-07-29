import Link from "next/link";
import { CalendarDays, ChevronLeft, FileText, Mail } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-ui";

export type PolicySection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export function PolicyPage({
  eyebrow,
  title,
  description,
  updated = "۷ مرداد ۱۴۰۵",
  sections,
  notice,
  contactEmail = "support@tenxpros.ir"
}: {
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  updated?: string;
  sections: PolicySection[];
  notice?: React.ReactNode;
  contactEmail?: string;
}) {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-ink-950 py-20 text-white sm:py-24">
        <div className="container-shell relative">
          <Link
            href="/"
            className="dark-focus-ring inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-slate-400 transition hover:text-white"
          >
            صفحه اصلی
            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
          <div className="mt-8 max-w-4xl">
            <p
              lang="en"
              className="font-latin text-xs font-bold tracking-[0.15em] text-iris-300"
            >
              {eyebrow}
            </p>
            <h1 className="text-balance mt-5 text-4xl font-semibold leading-[1.35] text-white sm:text-5xl">
              {title}
            </h1>
            <div className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg sm:leading-9">
              {description}
            </div>
            <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-400">
              <CalendarDays aria-hidden="true" className="h-4 w-4 text-iris-300" />
              آخرین به‌روزرسانی: {updated}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="container-shell grid items-start gap-10 lg:grid-cols-[18rem_1fr] lg:gap-14">
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-28">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-iris-50 text-iris-600">
                <FileText aria-hidden="true" className="h-4 w-4" />
              </span>
              <p className="font-semibold text-ink-950">در این صفحه</p>
            </div>
            <nav aria-label={`فهرست ${title}`} className="mt-5">
              <ol className="space-y-1">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="focus-ring flex items-start gap-3 rounded-lg px-2 py-2.5 text-sm leading-6 text-slate-600 transition hover:bg-slate-50 hover:text-ink-950"
                    >
                      <span className="mt-0.5 font-sans text-[0.65rem] font-semibold text-slate-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
            {notice ? (
              <div className="border-b border-amber-200 bg-amber-50 p-5 text-sm leading-8 text-amber-950 sm:p-6">
                {notice}
              </div>
            ) : null}
            <div className="divide-y divide-slate-200 px-6 sm:px-9">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 py-8 sm:py-10"
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-950 font-sans text-[0.65rem] font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold leading-8 text-ink-950 sm:text-2xl">
                        {section.title}
                      </h2>
                      <div className="mt-4 space-y-4 text-sm leading-8 text-slate-600 sm:text-base">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="border-t border-white/10 bg-ink-950 py-12 text-white">
        <div className="container-shell flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">پرسشی درباره این سیاست دارید؟</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              موضوع و زمینه درخواست را برای تیم پشتیبانی ارسال کنید.
            </p>
          </div>
          <a
            href={`mailto:${contactEmail}`}
            className="dark-focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-ink-950 transition hover:bg-slate-100"
          >
            <Mail aria-hidden="true" className="h-4 w-4" />
            <span dir="ltr">{contactEmail}</span>
          </a>
        </div>
      </section>
    </MarketingShell>
  );
}
