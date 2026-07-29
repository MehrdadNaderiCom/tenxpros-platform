import type { Metadata } from "next";
import { BadgeCheck, MailCheck } from "lucide-react";

import {
  EmailVerificationConfirmForm,
  EmailVerificationResendForm,
} from "@/components/forms/email-verification-forms";
import { MarketingShell } from "@/components/marketing/marketing-ui";

export const metadata: Metadata = {
  title: "تأیید ایمیل",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const token =
    typeof parameters.token === "string" ? parameters.token.trim() : "";
  const hasValidTokenShape = /^[A-Za-z0-9_-]{40,100}$/.test(token);

  return (
    <MarketingShell>
      <section className="bg-ink-950 px-4 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-lg rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-panel sm:p-9">
          <span className="grid size-12 place-items-center rounded-lg bg-iris-500/15 text-iris-200">
            {hasValidTokenShape ? (
              <BadgeCheck className="size-6" aria-hidden="true" />
            ) : (
              <MailCheck className="size-6" aria-hidden="true" />
            )}
          </span>
          <h1 className="mt-6 text-3xl font-black">
            {hasValidTokenShape ? "تأیید مالکیت ایمیل" : "دریافت لینک تأیید ایمیل"}
          </h1>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            {hasValidTokenShape
              ? "برای تکمیل تأیید، دکمه زیر را انتخاب کنید. لینک فقط یک بار قابل استفاده است."
              : "ایمیلی را که در فرم درخواست وارد کرده‌اید ثبت کنید تا در صورت نیاز لینک تازه برایتان ارسال شود."}
          </p>
          <div className="mt-7">
            {hasValidTokenShape ? (
              <EmailVerificationConfirmForm token={token} />
            ) : (
              <EmailVerificationResendForm />
            )}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
