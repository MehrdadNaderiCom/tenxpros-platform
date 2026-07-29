import Link from "next/link";
import { ChevronLeft, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "TenX Method", href: "/program", lang: "en" },
  { label: "Dossier", href: "/dossier", lang: "en" },
  { label: "Certification", href: "/certification", lang: "en" },
  { label: "How It Works", href: "/how-it-works", lang: "en" },
  { label: "خدمات اعضا", href: "/services", lang: "fa" },
  { label: "Founding Charter", href: "/pricing", lang: "en" },
  { label: "Partners", href: "/partners", lang: "en" },
  { label: "درباره ما", href: "/about", lang: "fa" }
];

function NavLink({
  item,
  mobile = false
}: {
  item: (typeof navigation)[number];
  mobile?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        mobile
          ? "dark-focus-ring flex min-h-12 items-center justify-between rounded-lg px-4 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
          : "dark-focus-ring rounded-lg px-2.5 py-2 text-[0.78rem] font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white",
        item.lang === "en" ? "font-latin" : "font-sans"
      )}
    >
      <span dir={item.lang === "en" ? "ltr" : undefined} lang={item.lang}>
        {item.label}
      </span>
      {mobile ? <ChevronLeft aria-hidden="true" className="h-4 w-4" /> : null}
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/90 text-white backdrop-blur-xl">
      <div className="container-shell flex h-[4.5rem] items-center justify-between gap-5">
        <Link
          href="/"
          aria-label="TenXPros ایران، صفحه اصلی"
          className="dark-focus-ring rounded-lg"
        >
          <BrandMark inverse />
        </Link>

        <nav
          aria-label="پیمایش اصلی"
          className="hidden items-center gap-0.5 xl:flex"
        >
          {navigation.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <Link
            href="/login"
            className="dark-focus-ring rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            ورود
          </Link>
          <Link
            href="/apply"
            className="dark-focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-iris-500 px-4 text-sm font-semibold text-white shadow-lg shadow-iris-600/20 transition hover:bg-iris-400"
          >
            درخواست عضویت
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <details className="group relative xl:hidden">
          <summary className="dark-focus-ring flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-white marker:content-none">
            <span className="sr-only">بازکردن منوی سایت</span>
            <Menu aria-hidden="true" className="h-5 w-5 group-open:hidden" />
            <X
              aria-hidden="true"
              className="hidden h-5 w-5 group-open:block"
            />
          </summary>
          <div className="absolute left-0 top-14 w-[min(22rem,calc(100vw-2.5rem))] rounded-lg border border-white/10 bg-ink-900 p-3 shadow-panel">
            <nav aria-label="پیمایش موبایل" className="space-y-1">
              {navigation.map((item) => (
                <NavLink key={item.href} item={item} mobile />
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
              <Link
                href="/login"
                className="dark-focus-ring flex min-h-11 items-center justify-center rounded-lg border border-white/15 text-sm font-medium text-white"
              >
                ورود
              </Link>
              <Link
                href="/apply"
                className="dark-focus-ring flex min-h-11 items-center justify-center rounded-lg bg-iris-500 px-3 text-sm font-semibold text-white"
              >
                درخواست عضویت
              </Link>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
