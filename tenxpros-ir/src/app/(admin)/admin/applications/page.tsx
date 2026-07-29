import { ApplicationReviewForm } from "@/components/admin/application-review-form";
import {
  AdminBadge,
  AdminHeading,
  AdminPanel,
  EmptyState,
} from "@/components/admin/admin-ui";
import { db } from "@/lib/db";
import { formatTehranDateTime, formatToman } from "@/lib/format";

const statusLabels = {
  SUBMITTED: "ثبت شده",
  PENDING_REVIEW: "منتظر بررسی",
  ACCEPTED_AWAITING_PAYMENT: "پذیرفته و منتظر پرداخت",
  PAYMENT_UNDER_REVIEW: "پرداخت در حال بررسی",
  ACTIVE: "فعال",
  REJECTED: "رد شده",
  SUSPENDED: "تعلیق شده",
  GRADUATED: "فارغ‌التحصیل",
  WITHDRAWN: "انصراف",
} as const;

export default async function AdminApplicationsPage() {
  const applications = await db.application.findMany({
    include: {
      reviewedBy: { select: { fullName: true } },
      user: {
        select: {
          membershipStatus: true,
          emailVerifiedAt: true,
        },
      },
    },
    orderBy: [{ submittedAt: "desc" }],
    take: 100,
  });

  return (
    <>
      <AdminHeading
        title="درخواست‌های Founding Charter"
        description="پذیرش درخواست، حساب موجود متقاضی را وارد مرحله پرداخت می‌کند. پیش از تصمیم، انگیزه و مسئله واقعی او را بررسی کنید."
      />

      {applications.length === 0 ? (
        <AdminPanel>
          <EmptyState
            title="درخواستی ثبت نشده است"
            description="پس از ارسال فرم Apply، درخواست‌های تازه در این بخش دیده می‌شوند."
          />
        </AdminPanel>
      ) : (
        <div className="space-y-5">
          {applications.map((application) => {
            const reviewable = ["SUBMITTED", "PENDING_REVIEW"].includes(
              application.status,
            );
            return (
              <AdminPanel key={application.id}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge tone={reviewable ? "warning" : "neutral"}>
                        {statusLabels[application.status]}
                      </AdminBadge>
                      <span
                        dir="ltr"
                        className="font-mono text-xs font-bold text-slate-400"
                      >
                        {application.referenceCode}
                      </span>
                      <AdminBadge
                        tone={application.user.emailVerifiedAt ? "positive" : "warning"}
                      >
                        {application.user.emailVerifiedAt
                          ? "ایمیل تأیید شده"
                          : "ایمیل تأیید نشده"}
                      </AdminBadge>
                    </div>
                    <h2 className="mt-4 text-xl font-black text-slate-950">
                      {application.fullName}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {application.professionalRole} در {application.domain}
                    </p>
                  </div>
                  <div className="text-sm leading-7 text-slate-500 lg:text-left">
                    <p dir="ltr">{application.email}</p>
                    <p dir="ltr">{application.phone}</p>
                    <p>{formatTehranDateTime(application.submittedAt)}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-5">
                    <p className="text-xs font-black text-slate-500">انگیزه حرفه‌ای</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {application.motivation}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-5">
                    <p className="text-xs font-black text-slate-500">
                      مسئله یا Workflow واقعی
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {application.realProblem}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 p-4 text-sm text-slate-600 sm:grid-cols-3">
                  <p>
                    پیشنهاد:{" "}
                    <strong className="text-slate-950">
                      {formatToman(application.offeredPriceToman)}
                    </strong>
                  </p>
                  <p>
                    AI Experience:{" "}
                    <strong className="text-slate-950">{application.aiExperience}</strong>
                  </p>
                  <p>
                    زمان هفتگی:{" "}
                    <strong className="text-slate-950">
                      {application.weeklyAvailability}
                    </strong>
                  </p>
                </div>

                {reviewable ? (
                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <ApplicationReviewForm applicantId={application.id} />
                  </div>
                ) : application.reviewerNote ? (
                  <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                    <strong>یادداشت بررسی:</strong> {application.reviewerNote}
                  </div>
                ) : null}
              </AdminPanel>
            );
          })}
        </div>
      )}
    </>
  );
}
