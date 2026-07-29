import {
  Award,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

import {
  Panel,
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-ui";
import { db } from "@/lib/db";
import { formatNumber, formatPersianDate } from "@/lib/format";
import {
  allProgramModulesCompleted,
  PROGRAM_MODULE_COUNT,
} from "@/lib/learning";
import { requireLearningMember } from "@/lib/learning-access";

export const dynamic = "force-dynamic";

export default async function PortalCertificationPage() {
  const member = await requireLearningMember();
  const [diagnostic, completedModules, dossier] = await Promise.all([
    db.diagnostic.findUnique({
      where: { memberId: member.id },
      select: { status: true, reviewedAt: true },
    }),
    db.programModuleProgress.findMany({
      where: { memberId: member.id, status: "COMPLETED" },
      select: { moduleNumber: true },
    }),
    db.dossier.findUnique({
      where: { memberId: member.id },
      select: {
        status: true,
        approvedAt: true,
        credential: true,
      },
    }),
  ]);
  const diagnosticReady = diagnostic?.status === "REVIEWED";
  const modulesReady = allProgramModulesCompleted(
    completedModules.map((module) => module.moduleNumber),
  );
  const dossierReady = dossier?.status === "APPROVED";
  const credential = dossier?.credential;
  const issued = credential?.status === "ISSUED" && !credential.revokedAt;

  return (
    <>
      <SectionHeading
        eyebrow="Professional Credential"
        title="Certification"
        description="Credential فقط پس از Diagnostic تأییدشده، تکمیل ۱۱ Module، تصویب Dossier و تصمیم مستقل ادمین صادر می‌شود."
        action={
          <StatusPill
            tone={
              issued
                ? "positive"
                : credential?.status === "REVOKED"
                  ? "negative"
                  : "neutral"
            }
          >
            {issued
              ? "Issued"
              : credential?.status === "REVOKED"
                ? "Revoked"
                : "Not Issued"}
          </StatusPill>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Diagnostic Review",
            ready: diagnosticReady,
            detail: diagnosticReady
              ? "Review کامل شده است"
              : "نیازمند ارسال و review",
            href: "/portal/diagnostic",
          },
          {
            title: "Core Modules",
            ready: modulesReady,
            detail: `${formatNumber(completedModules.length)} از ${formatNumber(
              PROGRAM_MODULE_COUNT,
            )} تکمیل شده`,
            href: "/portal/program",
          },
          {
            title: "Final Dossier",
            ready: dossierReady,
            detail: dossierReady
              ? "Final Review تأیید شده است"
              : "نیازمند تکمیل و تصویب",
            href: "/portal/dossier",
          },
        ].map((item) => (
          <Link key={item.title} href={item.href}>
            <Panel className="h-full p-5 transition hover:border-iris-400/30 sm:p-5">
              <div className="flex items-center gap-3">
                {item.ready ? (
                  <CheckCircle2 className="size-6 shrink-0 text-emerald-300" />
                ) : (
                  <CircleDashed className="size-6 shrink-0 text-slate-500" />
                )}
                <div>
                  <p dir="ltr" lang="en" className="font-black text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-400">
                    {item.detail}
                  </p>
                </div>
              </div>
            </Panel>
          </Link>
        ))}
      </div>

      {issued && credential ? (
        <Panel className="relative mt-7 overflow-hidden border-credential/30 bg-gradient-to-br from-credential/10 via-white/[0.04] to-iris-500/10">
          <div className="pointer-events-none absolute left-0 top-0 size-64 -translate-x-1/3 -translate-y-1/3 rounded-full bg-credential/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <span className="grid size-20 place-items-center rounded-full border border-credential/30 bg-credential/10 text-credential">
              <Award className="size-9" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-credential">
                Verified Professional Credential
              </p>
              <h2
                dir="ltr"
                lang="en"
                className="mt-3 text-left text-2xl font-black text-white sm:text-3xl"
              >
                {credential.certificationTitle}
              </h2>
              <p className="mt-3 text-lg font-bold text-slate-200">
                {credential.recipientName}
              </p>
              <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-sm text-slate-400">
                <p>
                  تاریخ صدور: {formatPersianDate(credential.issuedAt)}
                </p>
                <p dir="ltr" className="font-mono">
                  {credential.code}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href={`/certificate/${credential.id}`}
                target="_blank"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-credential px-5 text-sm font-black text-ink-950"
              >
                مشاهده Certificate
                <ExternalLink className="size-4" />
              </Link>
              <Link
                href={`/verify/${credential.code}`}
                target="_blank"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 text-sm font-bold text-white"
              >
                Public Verification
                <ExternalLink className="size-4" />
              </Link>
            </div>
          </div>
        </Panel>
      ) : credential?.status === "REVOKED" ? (
        <Panel className="mt-7 border-rose-400/25 bg-rose-400/[0.06]">
          <div className="flex gap-4">
            <ShieldAlert className="size-7 shrink-0 text-rose-300" />
            <div>
              <h2 className="text-lg font-black text-white">
                Credential لغو شده است
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Certificate عمومی دیگر قابل نمایش نیست و Public Verification
                وضعیت لغوشده را بدون انتشار اطلاعات شخصی نشان می‌دهد.
              </p>
              {credential.revocationReason ? (
                <p className="mt-4 rounded-lg bg-black/15 p-4 text-sm leading-7 text-slate-200">
                  دلیل ثبت‌شده: {credential.revocationReason}
                </p>
              ) : null}
              {credential.revokedAt ? (
                <p className="mt-3 text-xs text-slate-500">
                  تاریخ لغو: {formatPersianDate(credential.revokedAt)}
                </p>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : (
        <Panel className="mt-7">
          <div className="flex gap-4">
            <Award className="size-7 shrink-0 text-slate-500" />
            <div>
              <h2 className="text-lg font-black text-white">
                Credential هنوز صادر نشده است
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                تکمیل زمان برنامه به تنهایی باعث صدور Credential نمی‌شود. پس
                از آماده‌شدن هر سه prerequisite، ادمین پرونده را برای صدور
                نهایی بررسی می‌کند.
              </p>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
}
