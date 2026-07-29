import { Award, SearchX, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/marketing/marketing-ui";
import { db } from "@/lib/db";
import { formatPersianDate } from "@/lib/format";
import { credentialIsPublic } from "@/lib/learning";
import { credentialCodeSchema } from "@/lib/learning-validation";

export const metadata: Metadata = {
  title: "Credential Verification",
  description: "نتیجه بررسی Credential در Registry رسمی TenXPros ایران.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CredentialVerificationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const parsed = credentialCodeSchema.safeParse(
    code.trim().toUpperCase(),
  );
  const credential = parsed.success
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
          <div className="mx-auto max-w-3xl rounded-lg border border-white/10 bg-white/[0.045] p-7 shadow-panel sm:p-10">
            {issued ? (
              <>
                <span className="grid size-16 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                  <ShieldCheck className="size-8" />
                </span>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                  VERIFIED AND ACTIVE
                </p>
                <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                  Credential معتبر است
                </h1>
                <p className="mt-4 text-sm leading-8 text-slate-300">
                  این Credential در Registry رسمی TenXPros ایران ثبت شده و در
                  حال حاضر معتبر است.
                </p>

                <dl className="mt-8 grid gap-4 rounded-lg border border-white/10 bg-black/10 p-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold text-slate-500">
                      نام دارنده
                    </dt>
                    <dd className="mt-2 font-black text-white">
                      {credential.recipientName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-500">
                      تاریخ صدور
                    </dt>
                    <dd className="mt-2 font-black text-white">
                      {formatPersianDate(credential.issuedAt)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-bold text-slate-500">
                      Credential
                    </dt>
                    <dd
                      dir="ltr"
                      className="mt-2 font-latin font-black text-white"
                    >
                      {credential.certificationTitle}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-bold text-slate-500">
                      Verification Code
                    </dt>
                    <dd
                      dir="ltr"
                      className="mt-2 break-all font-mono text-sm font-bold text-iris-200"
                    >
                      {credential.code}
                    </dd>
                  </div>
                </dl>

                <Link
                  href={`/certificate/${credential.id}`}
                  className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-credential px-6 text-sm font-black text-ink-950"
                >
                  <Award className="size-4" />
                  مشاهده Certificate
                </Link>
              </>
            ) : revoked ? (
              <>
                <span className="grid size-16 place-items-center rounded-full border border-rose-400/25 bg-rose-400/10 text-rose-300">
                  <ShieldAlert className="size-8" />
                </span>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-rose-300">
                  REVOKED
                </p>
                <h1 className="mt-3 text-3xl font-black">
                  این Credential لغو شده است
                </h1>
                <p className="mt-4 text-sm leading-8 text-slate-300">
                  این رکورد دیگر مدرک معتبر محسوب نمی‌شود. برای حفظ حریم خصوصی،
                  اطلاعات دارنده و جزئیات لغو نمایش داده نمی‌شوند.
                </p>
              </>
            ) : (
              <>
                <span className="grid size-16 place-items-center rounded-full border border-slate-400/20 bg-white/5 text-slate-400">
                  <SearchX className="size-8" />
                </span>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  NOT FOUND
                </p>
                <h1 className="mt-3 text-3xl font-black">
                  Credential معتبر پیدا نشد
                </h1>
                <p className="mt-4 text-sm leading-8 text-slate-300">
                  قالب کد یا رکورد Registry معتبر نیست. کد را دقیقاً مطابق
                  Certificate وارد کنید.
                </p>
              </>
            )}

            <Link
              href="/directory"
              className="mt-8 inline-flex text-sm font-bold text-iris-300 hover:text-iris-200"
            >
              جست‌وجوی دوباره در Directory
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
