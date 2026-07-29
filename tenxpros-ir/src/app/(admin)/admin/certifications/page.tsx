import {
  Award,
  ExternalLink,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import Link from "next/link";

import {
  issueCredentialAction,
  revokeCredentialAction,
} from "@/actions/credentials";
import {
  AdminBadge,
  AdminHeading,
  AdminPanel,
  EmptyState,
} from "@/components/admin/admin-ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { db } from "@/lib/db";
import { formatTehranDateTime } from "@/lib/format";
import {
  allProgramModulesCompleted,
  isLearningMemberStatus,
} from "@/lib/learning";

export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  issued: "Credential صادر شد و Public Verification آن اکنون فعال است.",
  revoked: "Credential لغو شد. صفحه عمومی فقط وضعیت لغوشده را نمایش می‌دهد.",
  invalid: "درخواست صدور معتبر نیست.",
  invalid_revocation: "دلیل لغو باید حداقل ۲۰ کاراکتر باشد.",
  dossier_required: "Dossier هنوز تأیید نشده است.",
  already_issued: "برای این عضو قبلاً Credential صادر شده است.",
  member_ineligible: "وضعیت عضویت اجازه صدور Credential را نمی‌دهد.",
  diagnostic_required: "Diagnostic عضو هنوز review نشده است.",
  modules_required: "هر ۱۱ Module هنوز تکمیل نشده‌اند.",
  stale: "وضعیت Credential قبلاً تغییر کرده است.",
  retry: "هم‌زمان تغییری ثبت شد. دوباره تلاش کنید.",
  error: "عملیات انجام نشد. کمی بعد دوباره تلاش کنید.",
};

export default async function AdminCertificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const result =
    typeof parameters.result === "string" ? parameters.result : undefined;
  const [approvedDossiers, credentials] = await Promise.all([
    db.dossier.findMany({
      where: { status: "APPROVED" },
      include: {
        credential: { select: { id: true, status: true } },
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
      },
      orderBy: { approvedAt: "desc" },
      take: 100,
    }),
    db.credential.findMany({
      include: {
        member: {
          select: {
            email: true,
            membershipStatus: true,
          },
        },
        issuedBy: { select: { fullName: true } },
      },
      orderBy: { issuedAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <>
      <AdminHeading
        title="Credential Issuance"
        description="صدور تنها زمانی ممکن است که Diagnostic review شده، هر ۱۱ Module تکمیل و Dossier تصویب شده باشد. تمام شرط‌ها هنگام صدور دوباره از Database بررسی می‌شوند."
      />

      {result && resultMessages[result] ? (
        <p
          className={`mb-6 rounded-lg border p-4 text-sm ${
            result === "issued" || result === "revoked"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {resultMessages[result]}
        </p>
      ) : null}

      <AdminPanel>
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              پرونده‌های آماده تصمیم
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Dossierهای Approved که باید وضعیت صدورشان بررسی شود.
            </p>
          </div>
        </div>

        {approvedDossiers.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Dossier تأییدشده‌ای وجود ندارد"
              description="پس از Approval در Final Review، پرونده در این فهرست قرار می‌گیرد."
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {approvedDossiers.map((dossier) => {
              const diagnosticReady =
                dossier.member.diagnostic?.status === "REVIEWED";
              const modulesReady = allProgramModulesCompleted(
                dossier.member.programModuleProgress.map(
                  (module) => module.moduleNumber,
                ),
              );
              const memberReady = isLearningMemberStatus(
                dossier.member.membershipStatus,
              );
              const ready =
                diagnosticReady &&
                modulesReady &&
                memberReady &&
                !dossier.credential;
              return (
                <div
                  key={dossier.id}
                  className="grid gap-5 rounded-lg border border-slate-200 p-5 lg:grid-cols-[1fr_auto] lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge
                        tone={diagnosticReady ? "positive" : "negative"}
                      >
                        Diagnostic{" "}
                        {diagnosticReady ? "Reviewed" : "Incomplete"}
                      </AdminBadge>
                      <AdminBadge
                        tone={modulesReady ? "positive" : "negative"}
                      >
                        Modules {modulesReady ? "Complete" : "Incomplete"}
                      </AdminBadge>
                      <AdminBadge
                        tone={memberReady ? "positive" : "negative"}
                      >
                        {dossier.member.membershipStatus}
                      </AdminBadge>
                      {dossier.credential ? (
                        <AdminBadge
                          tone={
                            dossier.credential.status === "ISSUED"
                              ? "info"
                              : "negative"
                          }
                        >
                          {dossier.credential.status}
                        </AdminBadge>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-black text-slate-950">
                      {dossier.member.fullName}
                    </h3>
                    <p dir="ltr" className="mt-1 text-sm text-slate-500">
                      {dossier.member.email}
                    </p>
                    {dossier.approvedAt ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Dossier Approved:{" "}
                        {formatTehranDateTime(dossier.approvedAt)}
                      </p>
                    ) : null}
                  </div>
                  {ready ? (
                    <form action={issueCredentialAction}>
                      <input
                        type="hidden"
                        name="dossierId"
                        value={dossier.id}
                      />
                      <SubmitButton
                        pendingLabel="در حال صدور"
                        className="bg-emerald-600 shadow-none hover:bg-emerald-500"
                      >
                        Issue Credential
                      </SubmitButton>
                    </form>
                  ) : dossier.credential ? (
                    <p className="text-sm font-bold text-slate-500">
                      صدور انجام شده است
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-rose-700">
                      prerequisiteها کامل نیستند
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AdminPanel>

      <AdminPanel className="mt-7">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
            <Award className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Credential Registry
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              سابقه صدور و لغو Credentialها در این بخش نگهداری می‌شود.
            </p>
          </div>
        </div>

        {credentials.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Credential صادر نشده است"
              description="نخستین Credential پس از صدور در Registry نمایش داده می‌شود."
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="rounded-lg border border-slate-200 p-5"
              >
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge
                        tone={
                          credential.status === "ISSUED"
                            ? "positive"
                            : "negative"
                        }
                      >
                        {credential.status}
                      </AdminBadge>
                      <AdminBadge
                        tone={
                          credential.member.membershipStatus === "ACTIVE" ||
                          credential.member.membershipStatus === "GRADUATED"
                            ? "positive"
                            : "warning"
                        }
                      >
                        {credential.member.membershipStatus}
                      </AdminBadge>
                    </div>
                    <h3 className="mt-3 text-lg font-black text-slate-950">
                      {credential.recipientName}
                    </h3>
                    <p dir="ltr" className="mt-1 text-sm text-slate-500">
                      {credential.member.email}
                    </p>
                    <p
                      dir="ltr"
                      className="mt-3 font-mono text-sm font-bold text-slate-700"
                    >
                      {credential.code}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                      <p>صدور: {formatTehranDateTime(credential.issuedAt)}</p>
                      <p>صادرکننده: {credential.issuedBy.fullName}</p>
                      {credential.revokedAt ? (
                        <p>
                          لغو: {formatTehranDateTime(credential.revokedAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {credential.status === "ISSUED" ? (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/verify/${credential.code}`}
                        target="_blank"
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:border-indigo-300"
                      >
                        Verification
                        <ExternalLink className="size-4" />
                      </Link>
                      <Link
                        href={`/certificate/${credential.id}`}
                        target="_blank"
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:border-indigo-300"
                      >
                        Certificate
                        <ExternalLink className="size-4" />
                      </Link>
                    </div>
                  ) : null}
                </div>

                {credential.status === "ISSUED" ? (
                  <form
                    action={revokeCredentialAction}
                    className="mt-5 border-t border-slate-200 pt-5"
                  >
                    <input
                      type="hidden"
                      name="credentialId"
                      value={credential.id}
                    />
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-800">
                        دلیل لغو Credential
                      </span>
                      <textarea
                        name="reason"
                        required
                        minLength={20}
                        maxLength={5000}
                        rows={3}
                        className="w-full rounded-lg border border-rose-200 bg-rose-50/50 px-4 py-3 text-sm leading-7 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                        placeholder="دلیل دقیق و قابل استناد برای لغو را ثبت کنید"
                      />
                    </label>
                    <SubmitButton
                      pendingLabel="در حال لغو"
                      className="mt-3 bg-rose-700 shadow-none hover:bg-rose-600"
                    >
                      <ShieldX className="ml-2 size-4" />
                      Revoke Credential
                    </SubmitButton>
                  </form>
                ) : credential.revocationReason ? (
                  <div className="mt-5 rounded-lg bg-rose-50 p-4">
                    <p className="text-xs font-black text-rose-700">
                      Revocation Reason
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {credential.revocationReason}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </>
  );
}
