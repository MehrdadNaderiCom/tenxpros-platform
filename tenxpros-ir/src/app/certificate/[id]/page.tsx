import { Award, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CertificatePrintButton } from "@/components/credentials/certificate-print-button";
import { db } from "@/lib/db";
import { formatPersianDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Professional Certificate",
  description: "Certificate رسمی یک Credential معتبر TenXPros ایران.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const credential = await db.credential.findFirst({
    where: {
      id,
      status: "ISSUED",
      revokedAt: null,
    },
    select: {
      id: true,
      code: true,
      recipientName: true,
      certificationTitle: true,
      issuedAt: true,
    },
  });
  if (!credential) notFound();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 print:bg-white print:p-0">
      <div className="mx-auto mb-5 flex max-w-5xl items-center justify-between gap-4 print:hidden">
        <Link href={`/verify/${credential.code}`} className="text-sm font-bold text-iris-700">
          مشاهده Verification
        </Link>
        <CertificatePrintButton />
      </div>

      <article className="relative mx-auto flex min-h-[700px] max-w-5xl flex-col overflow-hidden border border-slate-200 bg-white p-8 shadow-2xl print:min-h-screen print:max-w-none print:border-0 print:shadow-none sm:p-14 lg:p-20">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-l from-credential via-iris-500 to-ink-950" />
        <div className="absolute left-8 top-8 size-40 rounded-full bg-iris-100/60 blur-3xl" />
        <div className="absolute bottom-10 right-10 size-48 rounded-full bg-amber-100/70 blur-3xl" />

        <header className="relative flex items-start justify-between gap-5 border-b border-slate-200 pb-8">
          <div>
            <p
              dir="ltr"
              className="font-latin text-xl font-black tracking-tight text-ink-950"
            >
              TenXPros <span className="text-iris-600">Iran</span>
            </p>
            <p
              dir="ltr"
              className="mt-2 font-latin text-xs font-bold uppercase tracking-[0.18em] text-slate-500"
            >
              PROFESSIONAL CREDENTIAL REGISTRY
            </p>
          </div>
          <span className="grid size-16 place-items-center rounded-full border border-credential/40 bg-credential/10 text-amber-700">
            <Award className="size-8" />
          </span>
        </header>

        <div className="relative flex flex-1 flex-col items-center justify-center py-14 text-center">
          <p
            dir="ltr"
            className="font-latin text-sm font-black uppercase tracking-[0.2em] text-iris-600"
          >
            CERTIFICATE OF ACHIEVEMENT
          </p>
          <h1
            dir="ltr"
            className="mt-7 font-latin text-3xl font-black leading-tight text-ink-950 sm:text-5xl"
          >
            {credential.certificationTitle}
          </h1>
          <p className="mt-8 text-sm leading-8 text-slate-500">
            این Certificate گواهی می‌کند که
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
            {credential.recipientName}
          </p>
          <p className="mt-7 max-w-2xl text-base leading-9 text-slate-600">
            Diagnostic حرفه‌ای، هر ۱۱ Module برنامه و Living AI Solution
            Dossier را مطابق Review Standard برنامه با موفقیت تکمیل کرده است.
          </p>
        </div>

        <footer className="relative grid gap-5 border-t border-slate-200 pt-7 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-xs font-bold text-slate-500">تاریخ صدور</p>
            <p className="mt-2 font-black text-slate-950">
              {formatPersianDate(credential.issuedAt)}
            </p>
            <p
              dir="ltr"
              className="mt-4 break-all font-mono text-xs font-bold text-slate-500"
            >
              {credential.code}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            <ShieldCheck className="size-5" />
            <div>
              <p
                dir="ltr"
                className="font-latin text-xs font-black uppercase"
              >
                ACTIVE CREDENTIAL
              </p>
              <p className="mt-1 text-xs">قابل بررسی در Registry رسمی</p>
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}
