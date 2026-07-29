import { CalendarClock, CheckCircle2, Clock3, Video } from "lucide-react";
import { redirect } from "next/navigation";

import { OfficeHourBookingForm } from "@/components/portal/office-hour-booking-form";
import { Panel, SectionHeading, StatusPill } from "@/components/portal/portal-ui";
import { getCurrentMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatTehranDateTime, getIranWeekBounds } from "@/lib/iran-week";

const bookingLabels = {
  RESERVED: "رزرو اولیه",
  ZOOM_PENDING: "در حال ساخت Zoom",
  CONFIRMED: "تأیید شده",
  COMPLETED: "برگزار شده",
  CANCELLED_BY_MEMBER: "لغو شده توسط عضو",
  CANCELLED_BY_ADMIN: "لغو شده توسط مدیریت",
  NO_SHOW: "عدم حضور",
  NEEDS_ATTENTION: "نیازمند پیگیری",
} as const;

export const dynamic = "force-dynamic";

export default async function OfficeHoursPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const now = new Date();
  const week = getIranWeekBounds(now);
  const [booking, slots] = await Promise.all([
    db.officeHourBooking.findUnique({
      where: {
        userId_iranWeekStartAt: {
          userId: member.id,
          iranWeekStartAt: week.start,
        },
      },
      include: { slot: true },
    }),
    db.officeHourSlot.findMany({
      where: {
        status: "OPEN",
        startsAt: { gt: now, gte: week.start, lt: week.endExclusive },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  const active = member.membershipStatus === "ACTIVE";
  const bookingIsTerminal = booking
    ? [
        "COMPLETED",
        "CANCELLED_BY_MEMBER",
        "CANCELLED_BY_ADMIN",
        "NO_SHOW",
      ].includes(booking.status)
    : false;

  return (
    <>
      <SectionHeading
        eyebrow="Weekly Office Hour"
        title="Office Hour اختصاصی شما"
        description="هر عضو فعال در هر هفته ایرانی، از شنبه تا جمعه، دقیقاً یک جلسه ۳۰ دقیقه‌ای دارد. سهمیه استفاده‌نشده در پایان جمعه منقضی می‌شود و به هفته بعد منتقل نخواهد شد."
        action={<StatusPill tone="warning">به وقت تهران</StatusPill>}
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        {[
          { title: "هفته ایرانی", detail: "شنبه تا جمعه", icon: CalendarClock },
          { title: "مدت جلسه", detail: "دقیقاً ۳۰ دقیقه", icon: Clock3 },
          { title: "سقف استفاده", detail: "فقط یک بار در هفته", icon: CheckCircle2 },
        ].map(({ title, detail, icon: Icon }) => (
          <div
            key={title}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
          >
            <Icon className="size-5 text-iris-300" />
            <p className="mt-4 font-black text-white">{title}</p>
            <p className="mt-2 text-sm text-slate-400">{detail}</p>
          </div>
        ))}
      </div>

      {!active ? (
        <Panel className="text-center">
          <CalendarClock className="mx-auto size-10 text-slate-500" />
          <h2 className="mt-5 text-xl font-black text-white">
            رزرو پس از فعال‌سازی عضویت باز می‌شود
          </h2>
        </Panel>
      ) : booking ? (
        <Panel>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <StatusPill
                tone={
                  booking.status === "CONFIRMED"
                    ? "positive"
                    : booking.status === "NEEDS_ATTENTION"
                      ? "warning"
                      : "neutral"
                }
              >
                {bookingLabels[booking.status]}
              </StatusPill>
              <h2 className="mt-5 text-2xl font-black text-white">
                {formatTehranDateTime(booking.slot.startsAt)}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                این رزرو سهمیه هفته جاری را مصرف کرده است و زمان دوم در همین هفته
                قابل انتخاب نیست.
              </p>
            </div>
            {booking.zoomJoinUrl && !bookingIsTerminal ? (
              <a
                href={booking.zoomJoinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-iris-500 px-5 py-3 text-sm font-black text-white"
              >
                <Video className="size-4" />
                ورود به جلسه Zoom
              </a>
            ) : null}
          </div>
          {booking.status === "NEEDS_ATTENTION" ? (
            <p className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/[0.07] p-4 text-sm leading-7 text-amber-50">
              زمان شما محفوظ است و مدیریت ساخت Zoom یا ارسال ایمیل را پیگیری می‌کند.
            </p>
          ) : null}
        </Panel>
      ) : (
        <Panel>
          <h2 className="mb-5 text-xl font-black text-white">زمان‌های آزاد این هفته</h2>
          <OfficeHourBookingForm
            slots={slots.map((slot) => ({
              id: slot.id,
              dateLabel: new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                timeZone: "Asia/Tehran",
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(slot.startsAt),
              timeLabel: new Intl.DateTimeFormat("fa-IR", {
                timeZone: "Asia/Tehran",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              }).format(slot.startsAt),
            }))}
          />
        </Panel>
      )}
    </>
  );
}
