import { CoachingStatusForm } from "@/components/admin/coaching-status-form";
import {
  AdminBadge,
  AdminHeading,
  AdminPanel,
  EmptyState,
} from "@/components/admin/admin-ui";
import { db } from "@/lib/db";
import {
  formatTehranDateTime,
  formatTehranDateTimeInput,
  formatToman,
} from "@/lib/format";

const statusLabels = {
  NEW: "جدید",
  CONTACTED: "تماس گرفته شد",
  SCHEDULED: "زمان‌بندی شده",
  COMPLETED: "انجام شده",
  DECLINED: "رد شده",
} as const;

export default async function AdminCoachingPage() {
  const inquiries = await db.coachingInquiry.findMany({
    include: {
      requestedBy: {
        select: { fullName: true, email: true, phone: true },
      },
      managedBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <AdminHeading
        title="درخواست‌های Coaching"
        description="هر درخواست بر مبنای نرخ ۵ میلیون تومان برای یک ساعت ثبت می‌شود. هماهنگی زمان و پرداخت را پس از تماس با عضو در یادداشت داخلی ثبت کنید."
      />

      {inquiries.length === 0 ? (
        <AdminPanel>
          <EmptyState
            title="درخواستی وجود ندارد"
            description="درخواست‌های تازه Coaching اعضا در این بخش دیده می‌شوند."
          />
        </AdminPanel>
      ) : (
        <div className="space-y-5">
          {inquiries.map((inquiry) => (
            <AdminPanel key={inquiry.id}>
              <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminBadge tone={inquiry.status === "NEW" ? "warning" : "neutral"}>
                      {statusLabels[inquiry.status]}
                    </AdminBadge>
                    <span className="text-xs text-slate-400">
                      {formatTehranDateTime(inquiry.createdAt)}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-black text-slate-950">
                    {inquiry.subject}
                  </h2>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    {inquiry.requestedBy.fullName}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span dir="ltr">{inquiry.requestedBy.email}</span>
                    {inquiry.requestedBy.phone ? (
                      <span dir="ltr">{inquiry.requestedBy.phone}</span>
                    ) : null}
                  </div>
                  <p className="mt-5 whitespace-pre-wrap rounded-lg bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                    {inquiry.message}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <p className="rounded-lg border border-slate-200 p-4">
                      زمان ترجیحی
                      <strong className="mt-2 block text-slate-950">
                        {inquiry.preferredSchedule || "اعلام نشده"}
                      </strong>
                    </p>
                    <p className="rounded-lg border border-slate-200 p-4">
                      نرخ ثبت‌شده
                      <strong className="mt-2 block text-slate-950">
                        {formatToman(inquiry.hourlyRateToman)} برای هر ساعت
                      </strong>
                    </p>
                    <p className="rounded-lg border border-slate-200 p-4">
                      زمان قطعی جلسه
                      <strong className="mt-2 block text-slate-950">
                        {inquiry.scheduledAt
                          ? `${formatTehranDateTime(inquiry.scheduledAt)} به وقت تهران`
                          : "هنوز تعیین نشده"}
                      </strong>
                    </p>
                  </div>
                </div>
                <div>
                  <CoachingStatusForm
                    inquiryId={inquiry.id}
                    currentStatus={inquiry.status}
                    currentScheduledAt={
                      inquiry.scheduledAt
                        ? formatTehranDateTimeInput(inquiry.scheduledAt)
                        : undefined
                    }
                    currentAdminNote={inquiry.adminNote}
                  />
                </div>
              </div>
            </AdminPanel>
          ))}
        </div>
      )}
    </>
  );
}
