import { CheckCircle2, ClipboardCheck, LockKeyhole } from "lucide-react";

import { saveDiagnosticAction } from "@/actions/learning";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  Panel,
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-ui";
import { db } from "@/lib/db";
import { formatPersianDate } from "@/lib/format";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/learning";
import { requireLearningMember } from "@/lib/learning-access";

const resultMessages: Record<string, string> = {
  saved: "پیش‌نویس Diagnostic ذخیره شد.",
  submitted: "Diagnostic برای review ارسال شد.",
  invalid: "اطلاعات فرم کامل یا معتبر نیست.",
  locked: "این Diagnostic دیگر قابل ویرایش نیست.",
  retry: "هم‌زمان تغییری ثبت شد. لطفا دوباره تلاش کنید.",
  error: "ثبت Diagnostic انجام نشد. لطفا دوباره تلاش کنید.",
};

const statusLabels = {
  IN_PROGRESS: "پیش‌نویس",
  SUBMITTED: "در صف Review",
  REVIEWED: "Review شده",
} as const;

export const dynamic = "force-dynamic";

export default async function DiagnosticPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const member = await requireLearningMember();
  const { result } = await searchParams;
  const diagnostic = await db.diagnostic.findUnique({
    where: { memberId: member.id },
  });
  const editable = !diagnostic || diagnostic.status === "IN_PROGRESS";

  return (
    <>
      <SectionHeading
        eyebrow="Readiness Diagnostic"
        title="Diagnostic حرفه‌ای"
        description="این ارزیابی نقطه شروع مسیر شماست. پاسخ‌ها را بر اساس مسئله و تجربه واقعی خود بنویسید تا Review دقیق و قابل استفاده باشد."
        action={
          <StatusPill
            tone={
              diagnostic?.status === "REVIEWED"
                ? "positive"
                : diagnostic?.status === "SUBMITTED"
                  ? "warning"
                  : "neutral"
            }
          >
            {diagnostic ? statusLabels[diagnostic.status] : "شروع نشده"}
          </StatusPill>
        }
      />

      {result && resultMessages[result] ? (
        <div className="mb-6 rounded-lg border border-iris-400/25 bg-iris-500/10 p-4 text-sm leading-7 text-iris-100">
          {resultMessages[result]}
        </div>
      ) : null}

      {diagnostic?.status === "REVIEWED" ? (
        <Panel className="mb-7 border-emerald-400/25 bg-emerald-400/[0.07]">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="mt-1 size-6 shrink-0 text-emerald-300" />
            <div>
              <h2 className="text-lg font-black text-white">
                Diagnostic شما Review شده است
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                امتیاز نهایی شما {diagnostic.overallScore} از ۱۰۰ است. اکنون
                Module نخست در TenX Method برای شما باز شده است.
              </p>
              {diagnostic.reviewerNote ? (
                <p className="mt-4 rounded-lg border border-white/10 bg-black/10 p-4 text-sm leading-7 text-slate-200">
                  <strong className="text-white">یادداشت Reviewer:</strong>{" "}
                  {diagnostic.reviewerNote}
                </p>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : diagnostic?.status === "SUBMITTED" ? (
        <Panel className="mb-7">
          <div className="flex items-start gap-4">
            <LockKeyhole className="mt-1 size-6 shrink-0 text-amber-200" />
            <div>
              <h2 className="text-lg font-black text-white">
                پاسخ‌ها برای Review قفل شده‌اند
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                پس از تکمیل Review، نتیجه و یادداشت Reviewer همین‌جا نمایش
                داده می‌شود.
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      <form action={saveDiagnosticAction} className="space-y-7">
        <Panel>
          <div className="flex items-center gap-3">
            <ClipboardCheck className="size-5 text-iris-300" />
            <h2 className="text-xl font-black text-white">
              Readiness Dimensions
            </h2>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            برای هر dimension امتیازی از ۱ تا ۵ انتخاب کنید. امتیاز ۱ یعنی
            آمادگی اولیه و امتیاز ۵ یعنی شواهد قوی و تجربه عملی.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {DIAGNOSTIC_DIMENSIONS.map((dimension) => {
              const value = diagnostic?.[dimension.field];
              return (
                <label
                  key={dimension.field}
                  className="rounded-lg border border-white/10 bg-white/[0.025] p-4"
                >
                  <span
                    dir="ltr"
                    className="block text-sm font-black text-white"
                  >
                    {dimension.title}
                  </span>
                  <span className="mt-2 block text-xs leading-6 text-slate-400">
                    {dimension.description}
                  </span>
                  {editable ? (
                    <select
                      name={dimension.field}
                      defaultValue={value ?? ""}
                      className="mt-4 min-h-11 w-full rounded-lg border border-white/15 bg-ink-900 px-3 text-sm text-white outline-none focus:border-iris-400"
                    >
                      <option value="">انتخاب امتیاز</option>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="mt-4 block text-2xl font-black text-iris-200">
                      {value} از ۵
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-black text-white">Professional Context</h2>
          <div className="mt-6 space-y-5">
            {[
              {
                name: "primaryGoal",
                title: "هدف اصلی شما از این برنامه چیست؟",
                hint: "برای ارسال نهایی حداقل ۴۰ کاراکتر بنویسید.",
                value: diagnostic?.primaryGoal,
              },
              {
                name: "coreChallenge",
                title: "مهم‌ترین مسئله یا Workflow مورد نظر شما چیست؟",
                hint: "مسئله را با زمینه و پیامد واقعی توضیح دهید.",
                value: diagnostic?.coreChallenge,
              },
              {
                name: "evidenceContext",
                title: "در حال حاضر چه شواهد یا داده‌ای در اختیار دارید؟",
                hint: "برای ارسال نهایی حداقل ۳۰ کاراکتر بنویسید.",
                value: diagnostic?.evidenceContext,
              },
            ].map((field) => (
              <label key={field.name} className="block">
                <span className="text-sm font-black text-white">
                  {field.title}
                </span>
                <span className="mt-1 block text-xs leading-6 text-slate-500">
                  {field.hint}
                </span>
                {editable ? (
                  <textarea
                    name={field.name}
                    defaultValue={field.value ?? ""}
                    rows={6}
                    maxLength={5_000}
                    className="mt-3 w-full rounded-lg border border-white/15 bg-ink-900 px-4 py-3 text-sm leading-7 text-white outline-none focus:border-iris-400"
                  />
                ) : (
                  <p className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm leading-7 text-slate-300">
                    {field.value}
                  </p>
                )}
              </label>
            ))}
          </div>

          {editable ? (
            <div className="mt-7 flex flex-wrap gap-3">
              <SubmitButton
                name="intent"
                value="save"
                pendingLabel="در حال ذخیره"
                className="bg-white/10 text-white shadow-none hover:bg-white/15"
              >
                ذخیره پیش‌نویس
              </SubmitButton>
              <SubmitButton
                name="intent"
                value="submit"
                pendingLabel="در حال ارسال"
              >
                ارسال نهایی برای Review
              </SubmitButton>
            </div>
          ) : diagnostic?.submittedAt ? (
            <p className="mt-6 text-xs text-slate-500">
              تاریخ ارسال: {formatPersianDate(diagnostic.submittedAt)}
            </p>
          ) : null}
        </Panel>
      </form>
    </>
  );
}
