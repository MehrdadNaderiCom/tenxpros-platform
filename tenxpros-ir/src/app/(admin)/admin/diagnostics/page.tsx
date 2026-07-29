import { ClipboardCheck } from "lucide-react";

import { reviewDiagnosticAction } from "@/actions/learning";
import {
  AdminBadge,
  AdminHeading,
  AdminPanel,
  EmptyState,
} from "@/components/admin/admin-ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { db } from "@/lib/db";
import { formatNumber, formatTehranDateTime } from "@/lib/format";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/learning";

export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  reviewed: "Diagnostic با موفقیت review شد و دسترسی Moduleها برای عضو باز شد.",
  invalid: "یادداشت review باید حداقل ۲۰ کاراکتر باشد.",
  stale: "این Diagnostic قبلاً بررسی شده یا وضعیت آن تغییر کرده است.",
};

export default async function AdminDiagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const result =
    typeof parameters.result === "string" ? parameters.result : undefined;
  const diagnostics = await db.diagnostic.findMany({
    where: { status: { in: ["SUBMITTED", "REVIEWED"] } },
    include: {
      member: {
        select: {
          fullName: true,
          email: true,
          membershipStatus: true,
        },
      },
      reviewedBy: { select: { fullName: true } },
    },
    orderBy: [
      { status: "asc" },
      { submittedAt: "asc" },
    ],
    take: 100,
  });

  return (
    <>
      <AdminHeading
        title="Diagnostic Review"
        description="هر Diagnostic را بر پایه پاسخ‌های ثبت‌شده بررسی کنید. تأیید این مرحله، نخستین Module را برای عضو باز می‌کند."
      />

      {result && resultMessages[result] ? (
        <p
          className={`mb-6 rounded-lg border p-4 text-sm ${
            result === "reviewed"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {resultMessages[result]}
        </p>
      ) : null}

      {diagnostics.length === 0 ? (
        <AdminPanel>
          <EmptyState
            title="Diagnostic ارسالی وجود ندارد"
            description="Diagnosticهای ارسال‌شده اعضا برای review در این بخش قرار می‌گیرند."
          />
        </AdminPanel>
      ) : (
        <div className="space-y-5">
          {diagnostics.map((diagnostic) => (
            <AdminPanel key={diagnostic.id}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                    <ClipboardCheck className="size-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge
                        tone={
                          diagnostic.status === "REVIEWED"
                            ? "positive"
                            : "warning"
                        }
                      >
                        {diagnostic.status === "REVIEWED"
                          ? "Review شده"
                          : "منتظر review"}
                      </AdminBadge>
                      <AdminBadge
                        tone={
                          diagnostic.member.membershipStatus === "ACTIVE" ||
                          diagnostic.member.membershipStatus === "GRADUATED"
                            ? "positive"
                            : "negative"
                        }
                      >
                        {diagnostic.member.membershipStatus}
                      </AdminBadge>
                    </div>
                    <h2 className="mt-3 text-xl font-black text-slate-950">
                      {diagnostic.member.fullName}
                    </h2>
                    <p dir="ltr" className="mt-1 text-sm text-slate-500">
                      {diagnostic.member.email}
                    </p>
                  </div>
                </div>
                <div className="text-sm leading-7 text-slate-500 lg:text-left">
                  {diagnostic.submittedAt ? (
                    <p>
                      ارسال: {formatTehranDateTime(diagnostic.submittedAt)}
                    </p>
                  ) : null}
                  {diagnostic.reviewedAt ? (
                    <p>
                      Review: {formatTehranDateTime(diagnostic.reviewedAt)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {DIAGNOSTIC_DIMENSIONS.map((dimension) => (
                  <div
                    key={dimension.field}
                    className="rounded-lg bg-slate-50 p-4"
                  >
                    <p
                      dir="ltr"
                      lang="en"
                      className="text-left text-xs font-bold text-slate-500"
                    >
                      {dimension.title}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {formatNumber(diagnostic[dimension.field] ?? 0)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {[
                  ["هدف اصلی", diagnostic.primaryGoal],
                  ["مسئله محوری", diagnostic.coreChallenge],
                  ["شواهد و محدودیت‌ها", diagnostic.evidenceContext],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-5">
                    <p className="text-xs font-black text-slate-500">{label}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {diagnostic.status === "SUBMITTED" ? (
                <form
                  action={reviewDiagnosticAction}
                  className="mt-6 border-t border-slate-200 pt-6"
                >
                  <input
                    type="hidden"
                    name="diagnosticId"
                    value={diagnostic.id}
                  />
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-800">
                      Reviewer Feedback
                    </span>
                    <textarea
                      name="reviewerNote"
                      required
                      minLength={20}
                      maxLength={5000}
                      rows={4}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none focus:border-iris-500 focus:ring-2 focus:ring-iris-500/10"
                      placeholder="ارزیابی روشن، نقاط قوت و جهت پیشنهادی برای شروع Moduleها"
                    />
                  </label>
                  <SubmitButton
                    pendingLabel="در حال ثبت review"
                    className="mt-4 bg-emerald-600 shadow-none hover:bg-emerald-500"
                  >
                    تأیید Diagnostic
                  </SubmitButton>
                </form>
              ) : (
                <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-xs font-black text-emerald-700">
                    Reviewer Feedback
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {diagnostic.reviewerNote}
                  </p>
                  {diagnostic.reviewedBy ? (
                    <p className="mt-3 text-xs text-slate-500">
                      ثبت‌شده توسط {diagnostic.reviewedBy.fullName}
                    </p>
                  ) : null}
                </div>
              )}
            </AdminPanel>
          ))}
        </div>
      )}
    </>
  );
}
