import { updateGatheringStatusAction } from "@/actions/gatherings";
import { GatheringForm } from "@/components/admin/gathering-form";
import {
  AdminBadge,
  AdminHeading,
  AdminPanel,
  EmptyState,
} from "@/components/admin/admin-ui";
import { db } from "@/lib/db";
import { formatTehranDateTime } from "@/lib/format";

const statusLabels = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشر شده",
  CANCELLED: "لغو شده",
  COMPLETED: "برگزار شده",
} as const;

export default async function AdminGatheringsPage() {
  const now = new Date();
  const gatherings = await db.weeklyGathering.findMany({
    include: {
      registrations: {
        where: { cancelledAt: null },
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { registeredAt: "asc" },
      },
    },
    orderBy: { startsAt: "desc" },
    take: 60,
  });

  return (
    <>
      <AdminHeading
        title="مدیریت AI Roundtable"
        description="برنامه ۹۰ دقیقه‌ای هفتگی برای اعضای فعال و فارغ‌التحصیلان DBC را بسازید، منتشر کنید و فهرست ثبت‌نام را ببینید."
      />

      <div className="grid gap-7 xl:grid-cols-[0.85fr_1.15fr]">
        <AdminPanel className="h-fit">
          <h2 className="mb-5 text-xl font-black text-slate-950">برنامه تازه</h2>
          <GatheringForm />
        </AdminPanel>

        <div className="space-y-4">
          {gatherings.length === 0 ? (
            <AdminPanel>
              <EmptyState
                title="برنامه‌ای ساخته نشده است"
                description="موضوع و زمان AI Roundtable بعدی را از فرم کناری ثبت کنید."
              />
            </AdminPanel>
          ) : (
            gatherings.map((gathering) => (
              <AdminPanel key={gathering.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <AdminBadge
                      tone={gathering.status === "PUBLISHED" ? "positive" : "neutral"}
                    >
                      {statusLabels[gathering.status]}
                    </AdminBadge>
                    <h2 className="mt-4 text-xl font-black text-slate-950">
                      {gathering.topic}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-iris-600">
                      {gathering.title}
                    </p>
                    <p className="mt-3 text-sm text-slate-500">
                      {formatTehranDateTime(gathering.startsAt)}
                    </p>
                  </div>
                  <form action={updateGatheringStatusAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="gatheringId" value={gathering.id} />
                    {gathering.status === "DRAFT" &&
                    gathering.startsAt > now ? (
                      <button
                        type="submit"
                        name="status"
                        value="PUBLISHED"
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        انتشار
                      </button>
                    ) : null}
                    {gathering.status === "PUBLISHED" &&
                    gathering.endsAt <= now ? (
                      <button
                        type="submit"
                        name="status"
                        value="COMPLETED"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                      >
                        برگزار شد
                      </button>
                    ) : null}
                    {gathering.status === "DRAFT" ||
                    gathering.status === "PUBLISHED" ? (
                      <button
                        type="submit"
                        name="status"
                        value="CANCELLED"
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                      >
                        لغو
                      </button>
                    ) : null}
                    {gathering.status === "CANCELLED" &&
                    gathering.zoomMeetingId ? (
                      <button
                        type="submit"
                        name="status"
                        value="CANCELLED"
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"
                      >
                        تلاش دوباره برای حذف Zoom
                      </button>
                    ) : null}
                  </form>
                </div>

                <details className="mt-5 rounded-lg bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-black text-slate-800">
                    ثبت‌نام‌ها:{" "}
                    {new Intl.NumberFormat("fa-IR").format(
                      gathering.registrations.length,
                    )}{" "}
                    نفر
                  </summary>
                  {gathering.registrations.length > 0 ? (
                    <div className="mt-4 divide-y divide-slate-200">
                      {gathering.registrations.map((registration) => (
                        <div
                          key={registration.id}
                          className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="font-bold text-slate-900">
                            {registration.user.fullName}
                          </span>
                          <span dir="ltr" className="text-slate-500">
                            {registration.user.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">هنوز کسی ثبت‌نام نکرده است.</p>
                  )}
                </details>
              </AdminPanel>
            ))
          )}
        </div>
      </div>
    </>
  );
}
