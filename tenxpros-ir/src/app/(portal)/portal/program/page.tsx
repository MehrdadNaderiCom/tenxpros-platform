import {
  CheckCircle2,
  CircleDashed,
  LockKeyhole,
  Route,
} from "lucide-react";
import Link from "next/link";

import { saveModuleProgressAction } from "@/actions/learning";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  Panel,
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-ui";
import { db } from "@/lib/db";
import { formatNumber, formatPersianDate } from "@/lib/format";
import {
  moduleIsUnlocked,
  PROGRAM_MODULES,
} from "@/lib/learning";
import { requireLearningMember } from "@/lib/learning-access";

export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  saved: "Reflection این Module ذخیره شد.",
  completed: "Module تکمیل شد و مرحله بعد برای شما باز شد.",
  invalid: "اطلاعات معتبر نیست. برای تکمیل، Reflection باید حداقل ۴۰ کاراکتر باشد.",
  diagnostic_required: "پیش از شروع Moduleها باید Diagnostic شما review شده باشد.",
  sequence: "Moduleها باید به ترتیب تکمیل شوند.",
  locked: "Module تکمیل‌شده قابل ویرایش نیست.",
  retry: "هم‌زمان تغییری ثبت شد. دوباره تلاش کنید.",
  error: "ثبت پیشرفت انجام نشد. کمی بعد دوباره تلاش کنید.",
};

export default async function PortalProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string | string[] }>;
}) {
  const member = await requireLearningMember();
  const parameters = await searchParams;
  const result =
    typeof parameters.result === "string" ? parameters.result : undefined;
  const [diagnostic, progressRows] = await Promise.all([
    db.diagnostic.findUnique({
      where: { memberId: member.id },
      select: { status: true },
    }),
    db.programModuleProgress.findMany({
      where: { memberId: member.id },
      orderBy: { moduleNumber: "asc" },
    }),
  ]);
  const diagnosticReviewed = diagnostic?.status === "REVIEWED";
  const progressByModule = new Map(
    progressRows.map((row) => [row.moduleNumber, row]),
  );
  const completedNumbers = new Set(
    progressRows
      .filter((row) => row.status === "COMPLETED")
      .map((row) => row.moduleNumber),
  );
  const completedCount = completedNumbers.size;

  return (
    <>
      <SectionHeading
        eyebrow="TenX Method"
        title="مسیر ۱۱ Module"
        description="Moduleها به ترتیب باز می‌شوند. برای تکمیل هر مرحله، Reflection و Evidence مرتبط با مسئله واقعی خود را ثبت کنید."
        action={
          <StatusPill
            tone={
              completedCount === PROGRAM_MODULES.length ? "positive" : "neutral"
            }
          >
            {formatNumber(completedCount)} از{" "}
            {formatNumber(PROGRAM_MODULES.length)} تکمیل شده
          </StatusPill>
        }
      />

      {result && resultMessages[result] ? (
        <p
          className={`mb-6 rounded-lg border p-4 text-sm leading-7 ${
            result === "saved" || result === "completed"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
              : "border-amber-300/20 bg-amber-300/10 text-amber-100"
          }`}
        >
          {resultMessages[result]}
        </p>
      ) : null}

      {!diagnosticReviewed ? (
        <Panel className="mb-7 border-amber-300/20 bg-amber-300/[0.06]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <LockKeyhole className="mt-1 size-6 shrink-0 text-amber-200" />
              <div>
                <h2 className="font-black text-white">
                  Diagnostic هنوز تأیید نشده است
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  ابتدا Diagnostic را کامل کنید. پس از review ادمین، Module
                  نخست به‌صورت خودکار باز می‌شود.
                </p>
              </div>
            </div>
            <Link
              href="/portal/diagnostic"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-amber-200 px-5 text-sm font-black text-ink-950"
            >
              مشاهده Diagnostic
            </Link>
          </div>
        </Panel>
      ) : null}

      <Panel className="mb-7">
        <div className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-lg bg-iris-500/15 text-iris-200">
            <Route className="size-5" />
          </span>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <p className="font-black text-white">Program Progress</p>
              <p className="text-sm font-bold text-iris-200">
                {formatNumber(
                  Math.round(
                    (completedCount / PROGRAM_MODULES.length) * 100,
                  ),
                )}
                ٪
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-l from-iris-400 to-emerald-300"
                style={{
                  width: `${(completedCount / PROGRAM_MODULES.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        {PROGRAM_MODULES.map((module) => {
          const progress = progressByModule.get(module.number);
          const completed = progress?.status === "COMPLETED";
          const unlocked =
            diagnosticReviewed &&
            moduleIsUnlocked(module.number, completedNumbers);

          return (
            <Panel
              key={module.number}
              className={
                completed
                  ? "border-emerald-400/20"
                  : unlocked
                    ? "border-iris-400/25"
                    : "opacity-70"
              }
            >
              <div className="flex gap-4">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-black ${
                    completed
                      ? "bg-emerald-400/15 text-emerald-200"
                      : unlocked
                        ? "bg-iris-500/15 text-iris-200"
                        : "bg-white/5 text-slate-500"
                  }`}
                >
                  {completed ? (
                    <CheckCircle2 className="size-5" />
                  ) : unlocked ? (
                    <CircleDashed className="size-5" />
                  ) : (
                    <LockKeyhole className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-iris-300">
                        {module.phase} · Module {formatNumber(module.number)}
                      </p>
                      <h2
                        dir="ltr"
                        lang="en"
                        className="mt-2 text-left text-lg font-black text-white sm:text-xl"
                      >
                        {module.title}
                      </h2>
                    </div>
                    <StatusPill
                      tone={
                        completed
                          ? "positive"
                          : unlocked
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {completed
                        ? "تکمیل شده"
                        : unlocked
                          ? progress
                            ? "در حال تکمیل"
                            : "آماده شروع"
                          : "قفل"}
                    </StatusPill>
                  </div>
                  <p className="mt-4 text-sm font-bold leading-7 text-slate-200">
                    {module.coreQuestion}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    {module.description}
                  </p>

                  {completed ? (
                    <div className="mt-6 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.05] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold text-emerald-200">
                          Reflection ثبت‌شده
                        </p>
                        {progress.completedAt ? (
                          <p className="text-xs text-slate-500">
                            {formatPersianDate(progress.completedAt)}
                          </p>
                        ) : null}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-slate-200">
                        {progress.reflection}
                      </p>
                      {progress.evidenceUrl ? (
                        <a
                          href={progress.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex text-sm font-bold text-iris-200 hover:text-white"
                        >
                          مشاهده Evidence
                        </a>
                      ) : null}
                    </div>
                  ) : unlocked ? (
                    <form
                      action={saveModuleProgressAction}
                      className="mt-6 space-y-5 border-t border-white/10 pt-6"
                    >
                      <input
                        type="hidden"
                        name="moduleNumber"
                        value={module.number}
                      />
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-200">
                          Reflection
                        </span>
                        <textarea
                          name="reflection"
                          rows={5}
                          maxLength={5000}
                          defaultValue={progress?.reflection ?? ""}
                          className="w-full rounded-lg border border-white/10 bg-ink-900/80 px-4 py-3 text-sm leading-8 text-white outline-none focus:border-iris-400"
                          placeholder="آموخته‌ها، تصمیم‌ها و کاربرد این Module در مسئله واقعی خود را بنویسید"
                        />
                        <span className="mt-1 block text-xs text-slate-500">
                          حداقل ۴۰ کاراکتر برای تکمیل نهایی
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
                          defaultValue={progress?.evidenceUrl ?? ""}
                          placeholder="https://"
                          className="min-h-12 w-full rounded-lg border border-white/10 bg-ink-900/80 px-4 text-left text-sm text-white outline-none focus:border-iris-400"
                        />
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <SubmitButton
                          name="intent"
                          value="save"
                          pendingLabel="در حال ذخیره"
                          className="bg-white/10 text-white shadow-none hover:bg-white/15"
                        >
                          ذخیره Draft
                        </SubmitButton>
                        <SubmitButton
                          name="intent"
                          value="complete"
                          pendingLabel="در حال تکمیل"
                        >
                          تکمیل Module
                        </SubmitButton>
                      </div>
                    </form>
                  ) : (
                    <p className="mt-5 rounded-lg bg-white/[0.03] p-4 text-sm leading-7 text-slate-500">
                      این Module پس از تکمیل مرحله قبل باز می‌شود.
                    </p>
                  )}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
