import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  MetricCard,
  Panel,
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-ui";
import { getCurrentMember } from "@/lib/auth";
import { OFFER } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatTehranDateTime, formatToman } from "@/lib/format";
import { getIranWeekBounds } from "@/lib/iran-week";

const applicationLabels = {
  SUBMITTED: "ثبت شده",
  PENDING_REVIEW: "در صف بررسی",
  ACCEPTED_AWAITING_PAYMENT: "پذیرفته شده",
  PAYMENT_UNDER_REVIEW: "رسید در حال بررسی",
  ACTIVE: "عضویت فعال",
  REJECTED: "پذیرفته نشده",
  SUSPENDED: "تعلیق شده",
  GRADUATED: "فارغ‌التحصیل",
  WITHDRAWN: "انصراف داده شده",
} as const;

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const week = getIranWeekBounds();
  const [application, booking] = await Promise.all([
    db.application.findFirst({
      where: { userId: member.id },
      orderBy: { submittedAt: "desc" },
      include: {
        paymentReceipts: {
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
      },
    }),
    db.officeHourBooking.findUnique({
      where: {
        userId_iranWeekStartAt: {
          userId: member.id,
          iranWeekStartAt: week.start,
        },
      },
      include: { slot: true },
    }),
  ]);

  const active = member.membershipStatus === "ACTIVE";
  const graduated = member.membershipStatus === "GRADUATED";
  const latestReceipt = application?.paymentReceipts[0];
  const canPay =
    member.membershipStatus === "PENDING_PAYMENT" &&
    application?.status === "ACCEPTED_AWAITING_PAYMENT";

  return (
    <>
      <SectionHeading
        eyebrow="Member Dashboard"
        title={`${member.fullName}، خوش آمدید`}
        description="وضعیت درخواست، پرداخت و دسترسی‌های عضویت شما از همین پنل قابل پیگیری است."
        action={
          <StatusPill tone={active || graduated ? "positive" : "warning"}>
            {application ? applicationLabels[application.status] : "حساب عضو"}
          </StatusPill>
        }
      />

      {canPay ? (
        <div className="mb-7 flex flex-col gap-5 rounded-lg border border-credential/30 bg-credential/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-credential">درخواست شما پذیرفته شد</p>
            <p className="mt-2 text-sm leading-7 text-slate-200">
              ظرفیت Founding Charter با مبلغ ویژه ۶۰ میلیون تومان برای شما آماده است.
            </p>
          </div>
          <Link
            href="/portal/payment"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-credential px-5 py-3 text-sm font-black text-ink-950"
          >
            مشاهده اطلاعات و ثبت رسید
          </Link>
        </div>
      ) : null}

      {application?.status === "PAYMENT_UNDER_REVIEW" ? (
        <div className="mb-7 rounded-lg border border-iris-400/25 bg-iris-500/10 p-6">
          <p className="font-black text-iris-200">رسید شما در صف بررسی است</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            پس از تأیید مدیریت، دسترسی عضویت به صورت خودکار فعال می‌شود.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="وضعیت عضویت"
          value={
            active
              ? "فعال"
              : graduated
                ? "فارغ‌التحصیل"
                : member.membershipStatus === "PENDING_PAYMENT"
                  ? "در انتظار پرداخت"
                  : "در حال بررسی"
          }
        />
        <MetricCard
          label="قیمت Founding Charter"
          value={formatToman(OFFER.foundingPriceToman)}
          detail={`قیمت اصلی ${formatToman(OFFER.standardPriceToman)}`}
        />
        <MetricCard
          label="Office Hour این هفته"
          value={booking ? "رزرو شده" : active ? "آماده رزرو" : "پس از فعال‌سازی"}
          detail="فقط یک جلسه ۳۰ دقیقه‌ای از شنبه تا جمعه"
        />
        <MetricCard
          label="AI Roundtable"
          value={active || graduated ? "در دسترس" : "پس از فعال‌سازی"}
          detail="برنامه هفتگی ۹۰ دقیقه‌ای"
        />
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <h2 className="text-xl font-black text-white">مسیر عضویت</h2>
          <div className="mt-5 space-y-3">
            {[
              {
                title: "درخواست حرفه‌ای",
                complete: Boolean(application),
                detail: application?.referenceCode || "درخواستی متصل نیست.",
              },
              {
                title: "پذیرش و پرداخت",
                complete: Boolean(application?.acceptedAt),
                detail:
                  latestReceipt?.status === "REJECTED"
                    ? latestReceipt.reviewerNote || "رسید نیاز به اصلاح دارد."
                    : application?.status === "PAYMENT_UNDER_REVIEW"
                      ? "رسید در صف بررسی است."
                      : "پس از پذیرش، رسید را از پنل ثبت کنید.",
              },
              {
                title: "فعال‌سازی عضویت",
                complete: active || graduated,
                detail:
                  active || graduated
                    ? "دسترسی‌های عضویت فعال هستند."
                    : "فعال‌سازی پس از تأیید پرداخت انجام می‌شود.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-lg border border-white/10 bg-white/[0.025] p-4"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${
                    step.complete
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/5 text-slate-500"
                  }`}
                >
                  {step.complete ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Clock3 className="size-4" />
                  )}
                </span>
                <div>
                  <p className="font-black text-white">{step.title}</p>
                  <p className="mt-1 text-sm leading-7 text-slate-400">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-black text-white">دسترسی سریع</h2>
          <div className="mt-5 space-y-3">
            {[
              {
                href: "/portal/office-hours",
                title: "Office Hour",
                detail: "سهمیه هفتگی ۳۰ دقیقه‌ای",
                icon: CalendarClock,
              },
              {
                href: "/portal/gathering",
                title: "AI Roundtable",
                detail: "بحث هفتگی و Networking",
                icon: MessagesSquare,
              },
              {
                href: "/portal/coaching",
                title: "Coaching",
                detail: "هر ساعت ۵ میلیون تومان",
                icon: Sparkles,
              },
            ].map(({ href, title, detail, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 rounded-lg border border-white/10 p-4 transition hover:border-iris-400/40"
              >
                <Icon className="size-5 text-iris-300" />
                <div>
                  <p className="font-black text-white">{title}</p>
                  <p className="mt-1 text-xs text-slate-500">{detail}</p>
                </div>
              </Link>
            ))}
          </div>
          {booking ? (
            <p className="mt-5 rounded-lg bg-iris-500/10 p-4 text-sm leading-7 text-slate-200">
              جلسه این هفته: {formatTehranDateTime(booking.slot.startsAt)}
            </p>
          ) : null}
        </Panel>
      </div>
    </>
  );
}
