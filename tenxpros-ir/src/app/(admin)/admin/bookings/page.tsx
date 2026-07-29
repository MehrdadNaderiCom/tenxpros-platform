import { updateBookingStatusAction } from "@/actions/bookings";
import { BookingRecoveryForm } from "@/components/admin/booking-recovery-form";
import {
  AdminBadge,
  AdminHeading,
  AdminPanel,
  EmptyState,
} from "@/components/admin/admin-ui";
import { db } from "@/lib/db";
import { formatTehranDateTime } from "@/lib/format";

const statusLabels = {
  RESERVED: "رزرو اولیه",
  ZOOM_PENDING: "Zoom در انتظار ساخت",
  CONFIRMED: "تأیید شده",
  COMPLETED: "برگزار شده",
  CANCELLED_BY_MEMBER: "لغو عضو",
  CANCELLED_BY_ADMIN: "لغو مدیریت",
  NO_SHOW: "عدم حضور",
  NEEDS_ATTENTION: "نیازمند پیگیری",
} as const;

export default async function AdminBookingsPage() {
  const now = new Date();
  const bookings = await db.officeHourBooking.findMany({
    include: {
      user: { select: { fullName: true, email: true } },
      slot: true,
    },
    orderBy: { slot: { startsAt: "desc" } },
    take: 150,
  });

  return (
    <>
      <AdminHeading
        title="رزروهای Office Hour"
        description="رزروهایی که Zoom یا ایمیل آن‌ها کامل نشده است در اولویت پیگیری قرار دارند. رزرو هفته همچنان مصرف‌شده محسوب می‌شود."
      />

      {bookings.length === 0 ? (
        <AdminPanel>
          <EmptyState
            title="رزروی وجود ندارد"
            description="پس از انتخاب زمان توسط عضو، رزرو و وضعیت Zoom در این بخش نمایش داده می‌شود."
          />
        </AdminPanel>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const needsRecovery = ["ZOOM_PENDING", "NEEDS_ATTENTION"].includes(
              booking.status,
            );
            const meetingEnded = booking.slot.endsAt <= now;
            const activeBooking = [
              "RESERVED",
              "ZOOM_PENDING",
              "CONFIRMED",
              "NEEDS_ATTENTION",
            ].includes(booking.status);
            return (
              <AdminPanel key={booking.id}>
                <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge tone={needsRecovery ? "warning" : "neutral"}>
                        {statusLabels[booking.status]}
                      </AdminBadge>
                      <span className="text-xs text-slate-400">
                        هفته شروع‌شده از{" "}
                        {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                          timeZone: "Asia/Tehran",
                          dateStyle: "long",
                        }).format(booking.iranWeekStartAt)}
                      </span>
                    </div>
                    <h2 className="mt-4 text-xl font-black text-slate-950">
                      {booking.user.fullName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500" dir="ltr">
                      {booking.user.email}
                    </p>
                    <p className="mt-4 font-bold text-slate-800">
                      {formatTehranDateTime(booking.slot.startsAt)}
                    </p>
                    {booking.lastError ? (
                      <p
                        dir="ltr"
                        className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left font-mono text-xs leading-6 text-amber-900"
                      >
                        {booking.lastError}
                      </p>
                    ) : null}
                  </div>
                  <div className="w-full lg:w-80">
                    {booking.zoomJoinUrl ? (
                      <a
                        href={booking.zoomJoinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700"
                      >
                        باز کردن Zoom
                      </a>
                    ) : null}
                    {needsRecovery ? (
                      <BookingRecoveryForm bookingId={booking.id} />
                    ) : null}
                    {activeBooking ? (
                      <form
                        action={updateBookingStatusAction}
                        className="mt-4 flex flex-wrap gap-2"
                      >
                        <input type="hidden" name="bookingId" value={booking.id} />
                        {meetingEnded ? (
                          <>
                            <button
                              type="submit"
                              name="status"
                              value="COMPLETED"
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                            >
                              انجام شد
                            </button>
                            <button
                              type="submit"
                              name="status"
                              value="NO_SHOW"
                              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"
                            >
                              عدم حضور
                            </button>
                          </>
                        ) : null}
                        <button
                          type="submit"
                          name="status"
                          value="CANCELLED_BY_ADMIN"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                        >
                          لغو مدیریت
                        </button>
                      </form>
                    ) : null}
                    {booking.status === "CANCELLED_BY_ADMIN" &&
                    booking.zoomMeetingId ? (
                      <form
                        action={updateBookingStatusAction}
                        className="mt-4"
                      >
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <button
                          type="submit"
                          name="status"
                          value="CANCELLED_BY_ADMIN"
                          className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"
                        >
                          تلاش دوباره برای حذف Zoom
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </AdminPanel>
            );
          })}
        </div>
      )}
    </>
  );
}
