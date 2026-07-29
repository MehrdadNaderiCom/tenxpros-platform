import Link from "next/link";
import { CheckCircle2, Copy, LogIn } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-ui";
import { TechnicalTerm } from "@/components/shared/technical-term";

export default async function ThankYouPage({
  searchParams
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;

  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-ink-950 py-24 text-white sm:py-32">
        <div className="container-shell relative">
          <div className="mx-auto max-w-2xl rounded-lg border border-white/10 bg-white/[0.04] p-7 text-center shadow-panel sm:p-10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
              <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
            </span>
            <p
              lang="en"
              className="mt-6 font-latin text-xs font-bold tracking-[0.14em] text-iris-300"
            >
              APPLICATION RECEIVED
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-[1.4] text-white">
              درخواست شما دریافت شد.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-300">
              لینک تأیید به ایمیل شما فرستاده شد. پس از تأیید مالکیت ایمیل،
              درخواست به‌صورت انسانی Review می‌شود. تا پیش از پذیرش، هیچ
              پرداختی انجام ندهید.
            </p>
            {reference ? (
              <div className="mt-7 rounded-lg border border-white/10 bg-ink-900 p-4">
                <p className="text-xs text-slate-500">کد پیگیری درخواست</p>
                <p
                  dir="ltr"
                  lang="en"
                  className="mt-2 font-latin text-base font-semibold tracking-[0.06em] text-white"
                >
                  {reference}
                </p>
                <p className="sr-only">
                  <Copy aria-hidden="true" className="h-4 w-4" />
                </p>
              </div>
            ) : null}
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/verify-email"
                className="dark-focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-ink-950 transition hover:bg-slate-100"
              >
                <LogIn aria-hidden="true" className="h-4 w-4" />
                تأیید ایمیل یا دریافت لینک تازه
              </Link>
              <Link
                href="/"
                className="dark-focus-ring inline-flex min-h-12 items-center justify-center rounded-lg border border-white/20 bg-white/[0.03] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                بازگشت به صفحه اصلی
              </Link>
            </div>
            <p className="mt-7 text-xs leading-6 text-slate-500">
              فقط پیام‌های رسمی{" "}
              <TechnicalTerm>hello@tenxpros.ir</TechnicalTerm> و اطلاعات داخل
              پنل را معتبر بدانید.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
