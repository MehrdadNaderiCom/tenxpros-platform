import { BadgeCheck, Clock3, Sparkles, Target } from "lucide-react";
import { redirect } from "next/navigation";

import { CoachingInquiryForm } from "@/components/portal/coaching-inquiry-form";
import { Panel, SectionHeading, StatusPill } from "@/components/portal/portal-ui";
import { getCurrentMember } from "@/lib/auth";
import { OFFER } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatTehranDateTime, formatToman } from "@/lib/format";
import { isWeeklyGatheringEligible } from "@/lib/validation";

const statusLabels = {
  NEW: "ثبت شده",
  CONTACTED: "تماس گرفته شد",
  SCHEDULED: "زمان‌بندی شده",
  COMPLETED: "انجام شده",
  DECLINED: "رد شده",
} as const;

export const dynamic = "force-dynamic";

export default async function CoachingPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const eligible = isWeeklyGatheringEligible(member.membershipStatus);
  const inquiries = await db.coachingInquiry.findMany({
    where: { requestedById: member.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <>
      <SectionHeading
        eyebrow="Private Coaching"
        title="Coaching اختصاصی"
        description="برای تصمیم‌های حرفه‌ای، طراحی AI Strategy یا حل یک مسئله واقعی می‌توانید جلسه اختصاصی درخواست کنید."
        action={
          <StatusPill tone="positive">
            {formatToman(OFFER.coachingPriceToman)} برای هر ساعت
          </StatusPill>
        }
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "جلسه یک ساعته",
            detail: "هر درخواست بر مبنای یک ساعت کامل محاسبه می‌شود.",
            icon: Clock3,
          },
          {
            title: "متمرکز بر مسئله شما",
            detail: "زمینه و خروجی مطلوب را پیش از جلسه مشخص می‌کنید.",
            icon: Target,
          },
          {
            title: "مجزا از Office Hour",
            detail: "این خدمت سهمیه هفتگی شما را مصرف نمی‌کند.",
            icon: BadgeCheck,
          },
        ].map(({ title, detail, icon: Icon }) => (
          <div
            key={title}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
          >
            <Icon className="size-5 text-iris-300" />
            <p className="mt-4 font-black text-white">{title}</p>
            <p className="mt-2 text-sm leading-7 text-slate-400">{detail}</p>
          </div>
        ))}
      </div>

      {!eligible ? (
        <Panel className="text-center">
          <Sparkles className="mx-auto size-10 text-slate-500" />
          <h2 className="mt-5 text-xl font-black text-white">
            Coaching پس از فعال‌سازی عضویت در دسترس است
          </h2>
        </Panel>
      ) : (
        <div className="grid gap-7 xl:grid-cols-[1fr_0.8fr]">
          <Panel>
            <h2 className="text-xl font-black text-white">درخواست جلسه تازه</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              زمان و شیوه پرداخت پس از بررسی درخواست با شما هماهنگ می‌شود.
            </p>
            <div className="mt-6">
              <CoachingInquiryForm />
            </div>
          </Panel>
          <Panel>
            <h2 className="text-xl font-black text-white">درخواست‌های شما</h2>
            {inquiries.length === 0 ? (
              <p className="mt-5 rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">
                هنوز درخواست Coaching ثبت نکرده‌اید.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {inquiries.map((inquiry) => (
                  <article
                    key={inquiry.id}
                    className="rounded-lg border border-white/10 bg-white/[0.025] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-black text-white">{inquiry.subject}</p>
                      <StatusPill
                        tone={
                          inquiry.status === "COMPLETED"
                            ? "positive"
                            : inquiry.status === "DECLINED"
                              ? "negative"
                              : "neutral"
                        }
                      >
                        {statusLabels[inquiry.status]}
                      </StatusPill>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {formatTehranDateTime(inquiry.createdAt)}
                    </p>
                    {inquiry.scheduledAt ? (
                      <p className="mt-3 flex items-start gap-2 rounded-lg border border-iris-400/20 bg-iris-500/10 p-3 text-sm leading-7 text-iris-100">
                        <Clock3 className="mt-1 size-4 shrink-0 text-iris-300" />
                        <span>
                          زمان جلسه:{" "}
                          <strong>
                            {formatTehranDateTime(inquiry.scheduledAt)}
                          </strong>{" "}
                          به وقت تهران
                        </span>
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
