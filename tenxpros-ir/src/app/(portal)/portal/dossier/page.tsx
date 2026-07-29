import {
  CheckCircle2,
  FileCheck2,
  FilePenLine,
  ShieldCheck,
} from "lucide-react";

import {
  saveDossierSectionAction,
  submitDossierAction,
} from "@/actions/dossier";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  Panel,
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-ui";
import { db } from "@/lib/db";
import {
  formatNumber,
  formatPersianDate,
} from "@/lib/format";
import {
  allProgramModulesCompleted,
  DOSSIER_SECTION_MINIMUM_CHARACTERS,
  DOSSIER_SECTIONS,
  dossierSectionIsComplete,
} from "@/lib/learning";
import { requireLearningMember } from "@/lib/learning-access";

export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  saved: "این بخش از Dossier ذخیره شد.",
  submitted: "Dossier برای Final Review ارسال شد و تا اعلام نتیجه قابل ویرایش نیست.",
  invalid: "اطلاعات این بخش معتبر نیست. طول متن و Evidence URL را بررسی کنید.",
  locked: "Dossier در وضعیت review یا تأیید نهایی است و قابل ویرایش نیست.",
  diagnostic_required: "Diagnostic باید پیش از ارسال Dossier review شده باشد.",
  modules_required: "هر ۱۱ Module باید پیش از ارسال Dossier تکمیل شوند.",
  incomplete: "هر ۱۲ بخش باید متن کافی داشته باشند.",
  retry: "هم‌زمان تغییری ثبت شد. دوباره تلاش کنید.",
  error: "ثبت Dossier انجام نشد. کمی بعد دوباره تلاش کنید.",
};

const statusLabels = {
  DRAFT: "Draft",
  SUBMITTED: "در Final Review",
  CHANGES_REQUESTED: "نیازمند اصلاح",
  APPROVED: "تأیید شده",
} as const;

export default async function PortalDossierPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string | string[] }>;
}) {
  const member = await requireLearningMember();
  const parameters = await searchParams;
  const result =
    typeof parameters.result === "string" ? parameters.result : undefined;
  const [diagnostic, completedModules, dossier] = await Promise.all([
    db.diagnostic.findUnique({
      where: { memberId: member.id },
      select: { status: true },
    }),
    db.programModuleProgress.findMany({
      where: { memberId: member.id, status: "COMPLETED" },
      select: { moduleNumber: true },
    }),
    db.dossier.findUnique({
      where: { memberId: member.id },
      include: {
        sections: { orderBy: { sectionNumber: "asc" } },
        reviews: { orderBy: { createdAt: "desc" } },
      },
    }),
  ]);
  const sectionsByNumber = new Map(
    dossier?.sections.map((section) => [section.sectionNumber, section]) ?? [],
  );
  const completedSections = DOSSIER_SECTIONS.filter((section) =>
    dossierSectionIsComplete(
      sectionsByNumber.get(section.number)?.content,
    ),
  ).length;
  const modulesReady = allProgramModulesCompleted(
    completedModules.map((module) => module.moduleNumber),
  );
  const diagnosticReady = diagnostic?.status === "REVIEWED";
  const allSectionsReady = completedSections === DOSSIER_SECTIONS.length;
  const editable =
    !dossier ||
    dossier.status === "DRAFT" ||
    dossier.status === "CHANGES_REQUESTED";
  const canSubmit =
    editable && diagnosticReady && modulesReady && allSectionsReady;

  return (
    <>
      <SectionHeading
        eyebrow="Living AI Solution Dossier"
        title="Dossier حرفه‌ای شما"
        description="۱۲ بخش Dossier باید یک تصمیم AI واقعی، مسئولانه و قابل دفاع را با Evidence روشن ثبت کنند. محتوای این بخش خصوصی است."
        action={
          <StatusPill
            tone={
              dossier?.status === "APPROVED"
                ? "positive"
                : dossier?.status === "CHANGES_REQUESTED"
                  ? "warning"
                  : "neutral"
            }
          >
            {dossier ? statusLabels[dossier.status] : "شروع نشده"}
          </StatusPill>
        }
      />

      {result && resultMessages[result] ? (
        <p
          className={`mb-6 rounded-lg border p-4 text-sm leading-7 ${
            result === "saved" || result === "submitted"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
              : "border-amber-300/20 bg-amber-300/10 text-amber-100"
          }`}
        >
          {resultMessages[result]}
        </p>
      ) : null}

      <div className="mb-7 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Diagnostic",
            ready: diagnosticReady,
            detail: diagnosticReady ? "Review شده" : "در انتظار تکمیل و review",
          },
          {
            title: "Core Modules",
            ready: modulesReady,
            detail: `${formatNumber(completedModules.length)} از ۱۱ تکمیل شده`,
          },
          {
            title: "Dossier Sections",
            ready: allSectionsReady,
            detail: `${formatNumber(completedSections)} از ۱۲ آماده ارسال`,
          },
        ].map((item) => (
          <Panel key={item.title} className="p-5 sm:p-5">
            <div className="flex items-center gap-3">
              {item.ready ? (
                <CheckCircle2 className="size-5 text-emerald-300" />
              ) : (
                <FilePenLine className="size-5 text-slate-500" />
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
        ))}
      </div>

      {dossier?.status === "CHANGES_REQUESTED" &&
      dossier.reviews[0]?.note ? (
        <Panel className="mb-7 border-amber-300/20 bg-amber-300/[0.06]">
          <p className="text-xs font-black text-amber-200">
            Revision Request
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-slate-100">
            {dossier.reviews[0].note}
          </p>
        </Panel>
      ) : null}

      {dossier?.status === "APPROVED" ? (
        <Panel className="mb-7 border-emerald-400/20 bg-emerald-400/[0.06]">
          <div className="flex gap-4">
            <ShieldCheck className="size-7 shrink-0 text-emerald-300" />
            <div>
              <h2 className="font-black text-white">Dossier تأیید شده است</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Final Review با موفقیت انجام شده است. صدور Credential یک اقدام
                مستقل ادمین است و وضعیت آن در بخش Certification نمایش داده
                می‌شود.
              </p>
              {dossier.approvedAt ? (
                <p className="mt-3 text-xs text-slate-500">
                  تأیید در {formatPersianDate(dossier.approvedAt)}
                </p>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="space-y-5">
        {DOSSIER_SECTIONS.map((definition) => {
          const section = sectionsByNumber.get(definition.number);
          const ready = dossierSectionIsComplete(section?.content);

          return (
            <Panel
              key={definition.number}
              className={ready ? "border-emerald-400/15" : ""}
            >
              <div className="flex gap-4">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-black ${
                    ready
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-white/5 text-slate-400"
                  }`}
                >
                  {ready ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    formatNumber(definition.number)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2
                        dir="ltr"
                        lang="en"
                        className="text-left text-lg font-black text-white"
                      >
                        {definition.title}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-slate-400">
                        {definition.guidance}
                      </p>
                    </div>
                    <StatusPill tone={ready ? "positive" : "neutral"}>
                      {ready ? "آماده" : "نیازمند تکمیل"}
                    </StatusPill>
                  </div>

                  {editable ? (
                    <form
                      action={saveDossierSectionAction}
                      className="mt-6 space-y-5 border-t border-white/10 pt-6"
                    >
                      <input
                        type="hidden"
                        name="sectionNumber"
                        value={definition.number}
                      />
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-200">
                          محتوای این بخش
                        </span>
                        <textarea
                          name="content"
                          rows={8}
                          maxLength={12000}
                          defaultValue={section?.content ?? ""}
                          className="w-full rounded-lg border border-white/10 bg-ink-900/80 px-4 py-3 text-sm leading-8 text-white outline-none focus:border-iris-400"
                          placeholder="تحلیل، تصمیم و Evidence مرتبط را با جزئیات کافی ثبت کنید"
                        />
                        <span className="mt-1 block text-xs text-slate-500">
                          حداقل{" "}
                          {formatNumber(
                            DOSSIER_SECTION_MINIMUM_CHARACTERS,
                          )}{" "}
                          کاراکتر برای آماده‌شدن این بخش
                        </span>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-200">
                          Evidence URL
                        </span>
                        <input
                          dir="ltr"
                          type="url"
                          name="evidenceUrl"
                          maxLength={500}
                          defaultValue={section?.evidenceUrl ?? ""}
                          placeholder="https://"
                          className="min-h-12 w-full rounded-lg border border-white/10 bg-ink-900/80 px-4 text-left text-sm text-white outline-none focus:border-iris-400"
                        />
                      </label>
                      <SubmitButton pendingLabel="در حال ذخیره">
                        ذخیره این بخش
                      </SubmitButton>
                    </form>
                  ) : (
                    <div className="mt-6 border-t border-white/10 pt-6">
                      <p className="whitespace-pre-wrap text-sm leading-8 text-slate-200">
                        {section?.content}
                      </p>
                      {section?.evidenceUrl ? (
                        <a
                          href={section.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex text-sm font-bold text-iris-200 hover:text-white"
                        >
                          مشاهده Evidence
                        </a>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      {editable ? (
        <Panel className="mt-7 border-iris-400/20">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <FileCheck2 className="mt-1 size-7 shrink-0 text-iris-200" />
              <div>
                <h2 className="text-lg font-black text-white">
                  ارسال برای Final Review
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                  پس از ارسال، Dossier تا اعلام نتیجه قفل می‌شود. شرط ارسال،
                  Diagnostic تأییدشده، تکمیل هر ۱۱ Module و آماده‌بودن هر ۱۲ بخش
                  است.
                </p>
              </div>
            </div>
            <form action={submitDossierAction}>
              <SubmitButton
                pendingLabel="در حال ارسال"
                className={
                  canSubmit
                    ? ""
                    : "pointer-events-none opacity-40"
                }
              >
                ارسال Dossier
              </SubmitButton>
            </form>
          </div>
        </Panel>
      ) : null}

      {dossier && dossier.reviews.length > 0 ? (
        <Panel className="mt-7">
          <h2 className="text-lg font-black text-white">Review History</h2>
          <div className="mt-5 space-y-3">
            {dossier.reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-white/10 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusPill
                    tone={
                      review.decision === "APPROVE"
                        ? "positive"
                        : "warning"
                    }
                  >
                    {review.decision === "APPROVE"
                      ? "Approved"
                      : "Revision Requested"}
                  </StatusPill>
                  <span className="text-xs text-slate-500">
                    {formatPersianDate(review.createdAt)}
                  </span>
                </div>
                {review.note ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-slate-300">
                    {review.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </>
  );
}
