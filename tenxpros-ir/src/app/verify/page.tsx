import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarketingShell } from "@/components/marketing/marketing-ui";

export const metadata: Metadata = {
  title: "Credential Verification",
  description: "بررسی اعتبار Credentialهای صادرشده TenXPros ایران.",
  robots: { index: false, follow: false },
};

export default async function VerificationEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const { code } = await searchParams;
  const rawCode = Array.isArray(code) ? code[0] : code;
  if (rawCode?.trim()) {
    redirect(`/verify/${encodeURIComponent(rawCode.trim().toUpperCase())}`);
  }

  return (
    <MarketingShell>
      <section className="bg-ink-950 py-24 text-white">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl rounded-lg border border-white/10 bg-white/[0.045] p-7 shadow-panel sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-iris-300">
              CREDENTIAL VERIFICATION
            </p>
            <h1 className="mt-4 text-3xl font-black">
              بررسی اعتبار Credential
            </h1>
            <p className="mt-4 text-sm leading-8 text-slate-300">
              کد کامل Credential را وارد کنید تا وضعیت ثبت‌شده در Registry
              رسمی بررسی شود.
            </p>
            <form action="/verify" method="get" className="mt-7">
              <label className="block">
                <span className="text-sm font-black">Credential Code</span>
                <input
                  type="text"
                  name="code"
                  required
                  dir="ltr"
                  placeholder="DBC-IR-2026-XXXXXXXXXXXX"
                  className="mt-3 min-h-12 w-full rounded-lg border border-white/15 bg-ink-900 px-4 font-mono text-sm text-white outline-none focus:border-iris-400"
                />
              </label>
              <button
                type="submit"
                className="mt-4 inline-flex min-h-12 items-center justify-center rounded-lg bg-iris-500 px-6 text-sm font-black text-white"
              >
                بررسی Credential
              </button>
            </form>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
