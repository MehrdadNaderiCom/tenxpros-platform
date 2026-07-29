import {
  BadgeCheck,
  FileSearch,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";
import { ApplicationForm } from "@/components/marketing/application-form";
import {
  MarketingShell,
  PageHero,
  Section,
  SectionHeader
} from "@/components/marketing/marketing-ui";
import { TechnicalTerm } from "@/components/shared/technical-term";

const process = [
  {
    icon: FileSearch,
    title: "Apply",
    text: "تخصص، مسئله واقعی، انگیزه و زمان قابل تعهد را معرفی می‌کنید."
  },
  {
    icon: ShieldCheck,
    title: "پذیرش",
    text: "درخواست از نظر تناسب و آمادگی برای کار واقعی Review می‌شود."
  },
  {
    icon: LockKeyhole,
    title: "پرداخت",
    text: "فقط پس از پذیرش، اطلاعات واریز و بارگذاری رسید در پنل فعال می‌شود."
  },
  {
    icon: BadgeCheck,
    title: "فعال‌سازی",
    text: "پس از تأیید پرداخت، عضویت و دسترسی برنامه فعال می‌شوند."
  }
];

export function ApplyPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="FOUNDING CHARTER APPLICATION"
        title="تخصص و مسئله حرفه‌ای خود را معرفی کنید."
        description={
          <>
            <TechnicalTerm>TenXPros</TechnicalTerm> گزینشی است چون کار هر عضو
            Review می‌شود. درخواست رایگان است، هیچ تعهد پرداختی ایجاد نمی‌کند و
            اطلاعات بانکی فقط پس از پذیرش در پنل نمایش داده می‌شوند.
          </>
        }
        primary={null}
        secondary={{ label: "نمونه Dossier", href: "/dossier" }}
      />

      <Section tone="dark" className="-mt-px pb-20 pt-0">
        <ol className="grid overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] md:grid-cols-4">
          {process.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="border-t border-white/10 p-5 first:border-t-0 md:border-r md:border-t-0 md:first:border-r-0"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-iris-400/10 text-iris-300">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {`۰${index + 1}`}
                  </span>
                </div>
                <TechnicalTerm className="mt-5 block text-lg font-semibold text-white">
                  {step.title}
                </TechnicalTerm>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {step.text}
                </p>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section tone="soft">
        <div className="grid items-start gap-10 lg:grid-cols-[0.6fr_1.4fr] lg:gap-12">
          <aside className="lg:sticky lg:top-28">
            <SectionHeader
              eyebrow="BEFORE YOU APPLY"
              title="زمینه واقعی کافی است."
              description="لازم نیست راهکار نهایی داشته باشید. باید بتوانید حوزه تخصصی، یک مسئله جدی و دلیل اهمیت آن را با صداقت توضیح دهید."
            />
            <ul className="mt-8 space-y-3">
              {[
                "تکمیل فرم حدود ۸ تا ۱۲ دقیقه زمان می‌برد",
                "هیچ اطلاعات پرداختی دریافت نمی‌شود",
                "اطلاعات محرمانه یا تحت مقررات ارسال نکنید",
                "پس از ارسال، کد پیگیری دریافت می‌کنید"
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-7 text-slate-600"
                >
                  <BadgeCheck
                    aria-hidden="true"
                    className="mt-1 h-4 w-4 shrink-0 text-iris-600"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft sm:p-8 lg:p-10">
            <div className="mb-9 border-b border-slate-200 pb-7">
              <p
                lang="en"
                className="font-latin text-xs font-bold tracking-[0.14em] text-iris-600"
              >
                YOUR APPLICATION
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink-950">
                درخواست حضور در Founding Charter
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                کیفیت پاسخ مهم‌تر از عبارت‌های رسمی و تبلیغاتی است.
              </p>
            </div>
            <ApplicationForm />
          </div>
        </div>
      </Section>
    </MarketingShell>
  );
}

export const ApplyPageContent = ApplyPage;
