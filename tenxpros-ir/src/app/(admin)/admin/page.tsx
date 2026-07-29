import {
  CalendarClock,
  CalendarRange,
  ClipboardCheck,
  CreditCard,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AdminHeading, AdminPanel } from "@/components/admin/admin-ui";
import { db } from "@/lib/db";

const cards = [
  {
    key: "applications",
    label: "درخواست‌های منتظر بررسی",
    href: "/admin/applications",
    icon: ClipboardCheck,
    tone: "bg-indigo-50 text-indigo-700",
  },
  {
    key: "payments",
    label: "رسیدهای منتظر بررسی",
    href: "/admin/payments",
    icon: CreditCard,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "slots",
    label: "زمان‌های آزاد آینده",
    href: "/admin/slots",
    icon: CalendarRange,
    tone: "bg-sky-50 text-sky-700",
  },
  {
    key: "bookings",
    label: "رزروهای نیازمند پیگیری",
    href: "/admin/bookings",
    icon: CalendarClock,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    key: "coaching",
    label: "درخواست‌های تازه Coaching",
    href: "/admin/coaching",
    icon: Sparkles,
    tone: "bg-violet-50 text-violet-700",
  },
] as const;

export default async function AdminDashboardPage() {
  const now = new Date();
  const [applications, payments, slots, bookings, coaching] = await Promise.all([
    db.application.count({
      where: { status: { in: ["SUBMITTED", "PENDING_REVIEW"] } },
    }),
    db.paymentReceipt.count({
      where: { status: { in: ["SUBMITTED", "PENDING_REVIEW"] } },
    }),
    db.officeHourSlot.count({
      where: { status: "OPEN", startsAt: { gt: now } },
    }),
    db.officeHourBooking.count({
      where: { status: { in: ["ZOOM_PENDING", "NEEDS_ATTENTION"] } },
    }),
    db.coachingInquiry.count({ where: { status: "NEW" } }),
  ]);
  const values = { applications, payments, slots, bookings, coaching };

  return (
    <>
      <AdminHeading
        title="داشبورد عملیات"
        description="مواردی که به تصمیم یا پیگیری نیاز دارند، در این نما اولویت‌بندی شده‌اند."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ key, label, href, icon: Icon, tone }) => (
          <Link
            key={key}
            href={href}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-slate-300"
          >
            <span className={`grid size-11 place-items-center rounded-lg ${tone}`}>
              <Icon className="size-5" />
            </span>
            <p className="mt-5 text-3xl font-black text-slate-950">
              {new Intl.NumberFormat("fa-IR").format(values[key])}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{label}</p>
          </Link>
        ))}
      </div>

      <AdminPanel className="mt-7">
        <h2 className="text-xl font-black text-slate-950">کنترل روزانه پیشنهادی</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-5">
            <p className="text-xs font-black text-iris-600">۱</p>
            <p className="mt-2 font-black">درخواست‌ها و رسیدها</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              تصمیم‌ها را همراه با یادداشت روشن ثبت کنید تا عضو وضعیت دقیق را ببیند.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-5">
            <p className="text-xs font-black text-iris-600">۲</p>
            <p className="mt-2 font-black">Office Hour و Zoom</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              رزروهای نیازمند پیگیری را پیش از شروع جلسه بازیابی کنید.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-5">
            <p className="text-xs font-black text-iris-600">۳</p>
            <p className="mt-2 font-black">برنامه‌های اعضا</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              موضوع AI Roundtable و درخواست‌های Coaching را به‌روز نگه دارید.
            </p>
          </div>
        </div>
      </AdminPanel>
    </>
  );
}
