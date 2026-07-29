import { Award, Search, SearchX, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/marketing/marketing-ui";
import { db } from "@/lib/db";
import { formatPersianDate } from "@/lib/format";
import { credentialIsPublic } from "@/lib/learning";
import { credentialCodeSchema } from "@/lib/learning-validation";

export const metadata: Metadata = {
  title: "Credential Directory",
  description:
    "جست‌وجوی Credentialهای واقعی و بررسی وضعیت اعتبار آن‌ها در Registry رسمی TenXPros ایران.",
};

export const dynamic = "force-dynamic";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const rawCode = Array.isArray(parameters.code)
    ? parameters.code[0]
    : parameters.code;
  const parsed = rawCode
    ? credentialCodeSchema.safeParse(rawCode)
    : null;
  const credential =
    parsed?.success
      ? await db.credential.findUnique({
          where: { code: parsed.data },
          select: {
            id: true,
            code: true,
            recipientName: true,
            certificationTitle: true,
            status: true,
            issuedAt: true,
            revokedAt: true,
          },
        })
      : null;
  const issued = credential && credentialIsPublic(credential);
  const revoked =
    credential &&
    (credential.status === "REVOKED" || credential.revokedAt !== null);

  return (
    <MarketingShell>
      <section className="bg-ink-950 py-20 text-white sm:py-28">
        <div className="container-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-iris-300">
              CREDENTIAL DIRECTORY
            </p>
            <h1 className="mt-4 text-3xl font-black sm:text-5xl">
              Registry رسمی Credentialها
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-slate-300 sm:text-base">
              کد درج‌شده روی Certificate را وارد کنید تا وضعیت Credential
              مستقیماً از Registry بررسی شود.
            </p>
          </div>

          <form
            action="/directory"
            method="get"
            className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4 sm:flex-row"
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">Credential Code</span>
              <input
                type="text"
                name="code"
                required
                defaultValue={rawCode ?? ""}
                dir="ltr"
                placeholder="DBC-IR-2026-XXXXXXXXXXXX"
                className="min-h-12 w-full rounded-lg border border-white/15 bg-ink-900 px-4 font-mono text-sm text-white outline-none focus:border-iris-400"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-iris-500 px-6 text-sm font-black text-white"
            >
              <Search className="size-4" />
              بررسی
            </button>
          </form>

          {rawCode ? (
            <div className="mx-auto mt-7 max-w-2xl rounded-lg border border-white/10 bg-white/[0.045] p-7">
              {issued ? (
                <>
                  <div className="flex items-center gap-3 text-emerald-300">
                    <ShieldCheck className="size-6" />
                    <p
                      dir="ltr"
                      className="text-xs font-black uppercase tracking-[0.14em]"
                    >
                      VERIFIED AND ACTIVE
                    </p>
                  </div>
                  <h2 className="mt-5 text-2xl font-black">
                    {credential.recipientName}
                  </h2>
                  <p
                    dir="ltr"
                    className="mt-3 font-latin font-black text-slate-200"
                  >
                    {credential.certificationTitle}
                  </p>
                  <p className="mt-3 text-sm text-slate-400">
                    صادرشده در {formatPersianDate(credential.issuedAt)}
                  </p>
                  <p
                    dir="ltr"
                    className="mt-3 break-all font-mono text-xs font-bold text-iris-200"
                  >
                    {credential.code}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/verify/${credential.code}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-credential px-5 text-sm font-black text-ink-950"
                    >
                      <ShieldCheck className="size-4" />
                      Verification
                    </Link>
                    <Link
                      href={`/certificate/${credential.id}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 text-sm font-bold text-white"
                    >
                      <Award className="size-4" />
                      Certificate
                    </Link>
                  </div>
                </>
              ) : revoked ? (
                <>
                  <div className="flex items-center gap-3 text-rose-300">
                    <ShieldAlert className="size-6" />
                    <p
                      dir="ltr"
                      className="text-xs font-black uppercase tracking-[0.14em]"
                    >
                      REVOKED
                    </p>
                  </div>
                  <h2 className="mt-5 text-2xl font-black">
                    این Credential لغو شده است
                  </h2>
                  <p className="mt-3 text-sm leading-8 text-slate-400">
                    این رکورد دیگر معتبر نیست. اطلاعات دارنده و جزئیات لغو در
                    Directory عمومی نمایش داده نمی‌شوند.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 text-slate-400">
                    <SearchX className="size-6" />
                    <p
                      dir="ltr"
                      className="text-xs font-black uppercase tracking-[0.14em]"
                    >
                      NOT FOUND
                    </p>
                  </div>
                  <h2 className="mt-5 text-2xl font-black">
                    Credential معتبر پیدا نشد
                  </h2>
                  <p className="mt-3 text-sm leading-8 text-slate-400">
                    کد واردشده را با نسخه درج‌شده روی Certificate تطبیق دهید.
                  </p>
                </>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </MarketingShell>
  );
}
