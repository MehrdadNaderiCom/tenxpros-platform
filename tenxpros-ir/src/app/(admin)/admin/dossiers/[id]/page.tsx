import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { reviewDossierAction } from "@/actions/dossier";
import {
  AdminBadge,
  AdminHeading,
  AdminPanel,
} from "@/components/admin/admin-ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { db } from "@/lib/db";
import { formatNumber, formatTehranDateTime } from "@/lib/format";
import {
  allProgramModulesCompleted,
  DOSSIER_SECTIONS,
  dossierSectionIsComplete,
} from "@/lib/learning";

export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  approved: "Dossier تأیید شد و اکنون برای تصمیم صدور Credential آماده است.",
  changes_requested: "درخواست اصلاح ثبت شد و Dossier دوباره برای عضو باز شد.",
  invalid: "تصمیم یا یادداشت معتبر نیست. برای درخواست اصلاح حداقل ۲۰ کاراکتر بنویسید.",
  stale: "وضعیت Dossier قبلاً تغییر کرده است.",
  member_ineligible: "عضویت این فرد برای ادامه مسیر فعال نیست.",
  incomplete: "هر ۱۲ بخش باید محتوای کافی داشته باشند.",
  retry: "هم‌زمان تغییری ثبت شد. دوباره تلاش کنید.",
  error: "ثبت review انجام نشد. کمی بعد دوباره تلاش کنید.",
};

const statusLabels = {
  DRAFT: "Draft",
  SUBMITTED: "منتظر Final Review",
  CHANGES_REQUESTED: "اصلاح خواسته شده",
  APPROVED: "Approved",
} as const;

export default async function AdminDossierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string | string[] }>;
}) {
  const [{ id }, parameters] = await Promise.all([params, searchParams]);
  const result =
    typeof parameters.result === "string" ? parameters.result : undefined;
  const dossier = await db.dossier.findUnique({
    where: { id },
    include: {
      member: {
        select: {
          fullName: true,
          email: true,
          membershipStatus: true,
          diagnostic: { select: { status: true } },
          programModuleProgress: {
            where: { status: "COMPLETED" },
            select: { moduleNumber: true },
          },
        },
      },
      sections: { orderBy: { sectionNumber: "asc" } },
      reviews: {
        include: { reviewer: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      },
      credential: {
        select: { id: true, code: true, status: true },
      },
    },
  });
  if (!dossier) notFound();

  const sectionsByNumber = new Map(
    dossier.sections.map((section) => [section.sectionNumber, section]),
  );
  const completeSections = DOSSIER_SECTIONS.filter((definition) =>
    dossierSectionIsComplete(
      sectionsByNumber.get(definition.number)?.content,
    ),
  ).length;
  const modulesReady = allProgramModulesCompleted(
    dossier.member.programModuleProgress.map(
      (module) => module.moduleNumber,
    ),
  );
  const diagnosticReady = dossier.member.diagnostic?.status === "REVIEWED";

  return (
    <>
      <Link
        href="/admin/dossiers"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950"
      >
        <ArrowRight className="size-4" />
        بازگشت به فهرست Dossierها
      </Link>
      <AdminHeading
        title={`Dossier ${dossier.member.fullName}`}
        description="تمام ۱۲ بخش و Evidenceهای عضو را بررسی کنید. تأیید باید بر پایه استاندارد Final Review و شواهد ثبت‌شده باشد."
        action={
          <AdminBadge
            tone={
              dossier.status === "APPROVED"
                ? "positive"
                : dossier.status === "SUBMITTED"
                  ? "warning"
                  : dossier.status === "CHANGES_REQUESTED"
                    ? "negative"
                    : "neutral"
            }
          >
            {statusLabels[dossier.status]}
          </AdminBadge>
        }
      />

      {result && resultMessages[result] ? (
        <p
          className={`mb-6 rounded-lg border p-4 text-sm ${
            result === "approved" || result === "changes_requested"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {resultMessages[result]}
        </p>
      ) : null}

      <AdminPanel>
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              {dossier.member.fullName}
            </h2>
            <p dir="ltr" className="mt-1 text-sm text-slate-500">
              {dossier.member.email}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminBadge
                tone={
                  diagnosticReady ? "positive" : "negative"
                }
              >
                Diagnostic {diagnosticReady ? "Reviewed" : "Incomplete"}
              </AdminBadge>
              <AdminBadge tone={modulesReady ? "positive" : "negative"}>
                Modules{" "}
                {formatNumber(
                  dossier.member.programModuleProgress.length,
                )}{" "}
                از ۱۱
              </AdminBadge>
              <AdminBadge
                tone={
                  completeSections === DOSSIER_SECTIONS.length
                    ? "positive"
                    : "negative"
                }
              >
                Sections {formatNumber(completeSections)} از ۱۲
              </AdminBadge>
              <AdminBadge
                tone={
                  dossier.member.membershipStatus === "ACTIVE" ||
                  dossier.member.membershipStatus === "GRADUATED"
                    ? "positive"
                    : "negative"
                }
              >
                {dossier.member.membershipStatus}
              </AdminBadge>
            </div>
          </div>
          <div className="text-sm leading-7 text-slate-500 lg:text-left">
            <p>آخرین تغییر: {formatTehranDateTime(dossier.updatedAt)}</p>
            {dossier.submittedAt ? (
              <p>ارسال: {formatTehranDateTime(dossier.submittedAt)}</p>
            ) : null}
            {dossier.approvedAt ? (
              <p>تأیید: {formatTehranDateTime(dossier.approvedAt)}</p>
            ) : null}
          </div>
        </div>
      </AdminPanel>

      <div className="mt-6 space-y-4">
        {DOSSIER_SECTIONS.map((definition) => {
          const section = sectionsByNumber.get(definition.number);
          const complete = dossierSectionIsComplete(section?.content);
          return (
            <AdminPanel key={definition.number}>
              <div className="flex gap-4">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full ${
                    complete
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {complete ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <FileText className="size-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-400">
                        Section {formatNumber(definition.number)}
                      </p>
                      <h2
                        dir="ltr"
                        lang="en"
                        className="mt-1 text-left text-lg font-black text-slate-950"
                      >
                        {definition.title}
                      </h2>
                    </div>
                    <AdminBadge tone={complete ? "positive" : "negative"}>
                      {complete ? "آماده" : "ناکامل"}
                    </AdminBadge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {definition.guidance}
                  </p>
                  <div className="mt-5 rounded-lg bg-slate-50 p-5">
                    <p className="whitespace-pre-wrap text-sm leading-8 text-slate-700">
                      {section?.content || "محتوایی ثبت نشده است."}
                    </p>
                  </div>
                  {section?.evidenceUrl ? (
                    <a
                      href={section.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-iris-700 hover:text-iris-500"
                    >
                      مشاهده Evidence
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </AdminPanel>
          );
        })}
      </div>

      {dossier.status === "SUBMITTED" ? (
        <AdminPanel className="mt-6 border-indigo-200">
          <h2 className="text-xl font-black text-slate-950">
            ثبت تصمیم Final Review
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            برای درخواست Revision، دلیل دقیق و اجرایی با حداقل ۲۰ کاراکتر لازم
            است. یادداشت Approval اختیاری است.
          </p>
          <form action={reviewDossierAction} className="mt-5">
            <input type="hidden" name="dossierId" value={dossier.id} />
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">
                Reviewer Note
              </span>
              <textarea
                name="note"
                minLength={20}
                maxLength={5000}
                rows={5}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none focus:border-iris-500 focus:ring-2 focus:ring-iris-500/10"
                placeholder="نتیجه ارزیابی یا اصلاح‌های دقیق مورد نیاز"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <SubmitButton
                name="decision"
                value="approve"
                pendingLabel="در حال ثبت"
                className="bg-emerald-600 shadow-none hover:bg-emerald-500"
              >
                Approve Dossier
              </SubmitButton>
              <SubmitButton
                name="decision"
                value="request_changes"
                pendingLabel="در حال ثبت"
                className="bg-amber-600 shadow-none hover:bg-amber-500"
              >
                Request Revision
              </SubmitButton>
            </div>
          </form>
        </AdminPanel>
      ) : null}

      {dossier.credential ? (
        <AdminPanel className="mt-6">
          <h2 className="font-black text-slate-950">Credential متصل</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <AdminBadge
              tone={
                dossier.credential.status === "ISSUED"
                  ? "positive"
                  : "negative"
              }
            >
              {dossier.credential.status}
            </AdminBadge>
            <span dir="ltr" className="font-mono text-slate-600">
              {dossier.credential.code}
            </span>
          </div>
        </AdminPanel>
      ) : null}

      {dossier.reviews.length > 0 ? (
        <AdminPanel className="mt-6">
          <h2 className="text-xl font-black text-slate-950">Review History</h2>
          <div className="mt-5 space-y-3">
            {dossier.reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <AdminBadge
                    tone={
                      review.decision === "APPROVE"
                        ? "positive"
                        : "warning"
                    }
                  >
                    {review.decision === "APPROVE"
                      ? "Approved"
                      : "Revision Requested"}
                  </AdminBadge>
                  <p className="text-xs text-slate-500">
                    {review.reviewer.fullName}،{" "}
                    {formatTehranDateTime(review.createdAt)}
                  </p>
                </div>
                {review.note ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {review.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </AdminPanel>
      ) : null}
    </>
  );
}
