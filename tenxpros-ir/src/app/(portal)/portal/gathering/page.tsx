import { Clock3, MessagesSquare, Network, UsersRound, Video } from "lucide-react";
import { redirect } from "next/navigation";

import { GatheringRegistrationForm } from "@/components/portal/gathering-registration-form";
import { Panel, SectionHeading, StatusPill } from "@/components/portal/portal-ui";
import { getCurrentMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatTehranDateTime } from "@/lib/format";
import { isWeeklyGatheringEligible } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function GatheringPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const eligible = isWeeklyGatheringEligible(member.membershipStatus);
  const gatherings = eligible
    ? await db.weeklyGathering.findMany({
        where: { status: "PUBLISHED", startsAt: { gt: new Date() } },
        include: {
          registrations: {
            where: { userId: member.id, cancelledAt: null },
            select: { id: true },
          },
          _count: {
            select: {
              registrations: { where: { cancelledAt: null } },
            },
          },
        },
        orderBy: { startsAt: "asc" },
        take: 8,
      })
    : [];

  return (
    <>
      <SectionHeading
        eyebrow="Members and DBC Alumni"
        title="TenXPros AI Roundtable"
        description="هر هفته ۹۰ دقیقه درباره یک موضوع جدی در AI گفت‌وگو می‌کنیم. این برنامه برای یادگیری جمعی، تبادل تجربه و Networking میان اعضا و فارغ‌التحصیلان DBC طراحی شده است."
        action={<StatusPill tone="positive">۹۰ دقیقه در هفته</StatusPill>}
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "بحث عمیق درباره AI",
            detail: "هر هفته یک موضوع مشخص و کاربردی محور گفت‌وگو است.",
            icon: MessagesSquare,
          },
          {
            title: "Networking هدفمند",
            detail: "ارتباط با متخصصانی که با مسئله‌های واقعی AI کار می‌کنند.",
            icon: Network,
          },
          {
            title: "برنامه منظم",
            detail: "دقیقاً ۹۰ دقیقه و بر اساس ساعت تهران",
            icon: Clock3,
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
          <UsersRound className="mx-auto size-10 text-slate-500" />
          <h2 className="mt-5 text-xl font-black text-white">
            این برنامه مخصوص اعضا و فارغ‌التحصیلان است
          </h2>
        </Panel>
      ) : gatherings.length === 0 ? (
        <Panel className="text-center">
          <MessagesSquare className="mx-auto size-10 text-slate-500" />
          <h2 className="mt-5 text-xl font-black text-white">
            برنامه بعدی به زودی اعلام می‌شود
          </h2>
        </Panel>
      ) : (
        <div className="space-y-5">
          {gatherings.map((gathering, index) => {
            const registered = gathering.registrations.length > 0;
            const full =
              gathering.capacity !== null &&
              gathering._count.registrations >= gathering.capacity;
            return (
              <Panel
                key={gathering.id}
                className={index === 0 ? "border-iris-400/30 bg-iris-500/[0.07]" : ""}
              >
                <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {index === 0 ? (
                        <StatusPill tone="positive">برنامه بعدی</StatusPill>
                      ) : null}
                      {registered ? (
                        <StatusPill tone="neutral">حضور ثبت شده</StatusPill>
                      ) : null}
                    </div>
                    <h2 className="mt-4 text-2xl font-black text-white">
                      {gathering.topic}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-iris-200">
                      {gathering.title}
                    </p>
                    {gathering.description ? (
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                        {gathering.description}
                      </p>
                    ) : null}
                    <p className="mt-4 text-sm font-bold text-white">
                      {formatTehranDateTime(gathering.startsAt)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      ۹۰ دقیقه به وقت تهران
                    </p>
                  </div>
                  <div className="min-w-52">
                    {registered && gathering.zoomJoinUrl ? (
                      <a
                        href={gathering.zoomJoinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-iris-500 px-5 py-3 text-sm font-black text-white"
                      >
                        <Video className="size-4" />
                        لینک Zoom
                      </a>
                    ) : registered ? (
                      <p className="rounded-lg bg-emerald-400/10 p-4 text-center text-sm font-bold text-emerald-100">
                        حضور شما ثبت شده است
                      </p>
                    ) : full ? (
                      <p className="rounded-lg bg-amber-300/10 p-4 text-center text-sm font-bold text-amber-100">
                        ظرفیت تکمیل است
                      </p>
                    ) : (
                      <GatheringRegistrationForm gatheringId={gathering.id} />
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
