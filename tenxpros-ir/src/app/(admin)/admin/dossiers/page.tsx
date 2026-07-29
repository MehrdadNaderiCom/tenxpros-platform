import { FileSearch, ChevronLeft } from "lucide-react";
import Link from "next/link";

import {
  AdminBadge,
  AdminHeading,
  AdminPanel,
  EmptyState,
} from "@/components/admin/admin-ui";
import { db } from "@/lib/db";
import { formatNumber, formatTehranDateTime } from "@/lib/format";
import {
  DOSSIER_SECTIONS,
  dossierSectionIsComplete,
} from "@/lib/learning";

export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  invalid: "درخواست review معتبر نبود.",
};

const statusLabels = {
  DRAFT: "Draft",
  SUBMITTED: "منتظر Final Review",
  CHANGES_REQUESTED: "اصلاح خواسته شده",
  APPROVED: "Approved",
} as const;

export default async function AdminDossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const result =
    typeof parameters.result === "string" ? parameters.result : undefined;
  const dossiers = await db.dossier.findMany({
    include: {
      member: {
        select: {
          fullName: true,
          email: true,
          membershipStatus: true,
        },
      },
      sections: {
        select: { sectionNumber: true, content: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { decision: true, createdAt: true },
      },
      credential: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <>
      <AdminHeading
        title="Dossier Review"
        description="Dossierهای اعضا را بررسی کنید، Revision بخواهید یا پس از ارزیابی کامل تأیید کنید."
      />

      {result && resultMessages[result] ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {resultMessages[result]}
        </p>
      ) : null}

      {dossiers.length === 0 ? (
        <AdminPanel>
          <EmptyState
            title="Dossier ثبت نشده است"
            description="پس از ذخیره نخستین بخش توسط عضو، Dossier او در این فهرست دیده می‌شود."
          />
        </AdminPanel>
      ) : (
        <div className="space-y-4">
          {dossiers.map((dossier) => {
            const completeSections = dossier.sections.filter((section) =>
              dossierSectionIsComplete(section.content),
            ).length;
            return (
              <AdminPanel key={dossier.id}>
                <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                  <span className="grid size-12 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                    <FileSearch className="size-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
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
                      {dossier.credential ? (
                        <AdminBadge
                          tone={
                            dossier.credential.status === "ISSUED"
                              ? "info"
                              : "negative"
                          }
                        >
                          Credential {dossier.credential.status}
                        </AdminBadge>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-lg font-black text-slate-950">
                      {dossier.member.fullName}
                    </h2>
                    <p dir="ltr" className="mt-1 text-sm text-slate-500">
                      {dossier.member.email}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                      <p>
                        بخش‌های آماده: {formatNumber(completeSections)} از{" "}
                        {formatNumber(DOSSIER_SECTIONS.length)}
                      </p>
                      <p>آخرین تغییر: {formatTehranDateTime(dossier.updatedAt)}</p>
                      {dossier.submittedAt ? (
                        <p>
                          آخرین ارسال:{" "}
                          {formatTehranDateTime(dossier.submittedAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={`/admin/dossiers/${dossier.id}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-black text-white"
                  >
                    مشاهده پرونده
                    <ChevronLeft className="size-4" />
                  </Link>
                </div>
              </AdminPanel>
            );
          })}
        </div>
      )}
    </>
  );
}
