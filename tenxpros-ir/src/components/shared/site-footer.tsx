import Link from "next/link";
import { ArrowUpLeft, Mail } from "lucide-react";
import { BrandMark } from "@/components/shared/brand-mark";
import { TechnicalTerm } from "@/components/shared/technical-term";

const columns = [
  {
    title: "برنامه",
    links: [
      { label: "TenX Method", href: "/program" },
      { label: "Living AI Solution Dossier", href: "/dossier" },
      { label: "Certification", href: "/certification" },
      { label: "خدمات اعضا", href: "/services" },
      { label: "Founding Charter و قیمت", href: "/pricing" }
    ]
  },
  {
    title: "TenXPros",
    links: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "درباره ما", href: "/about" },
      { label: "پرسش‌های متداول", href: "/faq" },
      { label: "پشتیبانی", href: "/support" },
      { label: "درخواست عضویت", href: "/apply" },
      { label: "ورود اعضا", href: "/login" }
    ]
  },
  {
    title: "جامعه",
    links: [
      { label: "Partner Program", href: "/partners" },
      { label: "Partner Application", href: "/partners/apply" },
      { label: "Partner Terms", href: "/partners/terms" },
      { label: "TenXPro Radar", href: "/radar" },
      { label: "Credential Directory", href: "/directory" }
    ]
  },
  {
    title: "قوانین",
    links: [
      { label: "شرایط استفاده", href: "/terms" },
      { label: "نسخه‌ها و تغییرات شرایط", href: "/terms/updates" },
      { label: "حریم خصوصی", href: "/privacy" },
      { label: "سیاست بازپرداخت", href: "/refund" }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink-950 text-slate-300">
      <div className="container-shell py-14 sm:py-16">
        <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Link
              href="/"
              className="dark-focus-ring inline-flex rounded-lg"
              aria-label="TenXPros ایران، صفحه اصلی"
            >
              <BrandMark inverse />
            </Link>
            <p className="mt-6 max-w-md text-base leading-8 text-slate-300">
              تخصص را شما می‌آورید. ما{" "}
              <TechnicalTerm className="text-white">AI Method</TechnicalTerm>{" "}
              را می‌آوریم. خروجی، کاری ارزیابی‌شده است که می‌توانید از آن دفاع
              کنید.
            </p>
            <a
              href="mailto:support@tenxpros.ir"
              className="dark-focus-ring mt-6 inline-flex items-center gap-2 rounded-lg text-sm text-iris-300 transition hover:text-white"
            >
              <Mail aria-hidden="true" className="h-4 w-4" />
              <span dir="ltr" lang="en" className="font-latin">
                support@tenxpros.ir
              </span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-semibold text-white">
                  {column.title}
                </h2>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="dark-focus-ring inline-flex rounded-md text-sm leading-6 text-slate-400 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 pt-8 text-xs leading-6 text-slate-500 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-3xl">
            <TechnicalTerm>TenXPros</TechnicalTerm> یک برنامه خصوصی برای صدور{" "}
            <TechnicalTerm>Professional Credential</TechnicalTerm> است. این
            برنامه مدرک دانشگاهی، اعتباربخشی آکادمیک یا تضمین نتیجه شغلی و مالی
            نیست.
          </p>
          <a
            href="mailto:hello@tenxpros.ir"
            className="dark-focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-md text-slate-400 transition hover:text-white"
          >
            ارتباط با پذیرش
            <ArrowUpLeft aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
