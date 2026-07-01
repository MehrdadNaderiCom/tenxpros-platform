import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPartner } from "@/lib/partner/auth";
import { getAcademyOverview, type AcademyStatus } from "@/lib/academy/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-shell";
import { ProgressBar } from "@/components/ui/timeline";
import { ProDetectionPanel } from "@/components/partner/pro-detection-panel";

export const dynamic = "force-dynamic";

const STATUS: Record<AcademyStatus, { label: string; badge: string }> = {
  locked: { label: "Locked", badge: "LOCKED" },
  available: { label: "Available", badge: "OPEN" },
  in_progress: { label: "In progress", badge: "IN_PROGRESS" },
  exercises_done: { label: "Exam ready", badge: "UNDER_REVIEW" },
  passed: { label: "Passed", badge: "PASSED" },
};

export default async function AcademyHome() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");
  const overview = await getAcademyOverview(current.partner.id);
  const pct = overview.totalCount ? Math.round((overview.passedCount / overview.totalCount) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partner Academy"
        description="A step by step training that turns the program into something you can explain and represent with confidence. Read each lesson, work the exercises, and pass the module exam to unlock the next one. A comprehensive final exam at the end earns your certificate."
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Your progress</p>
            <p className="mt-1 text-2xl font-semibold text-navy-900">
              {overview.passedCount} of {overview.totalCount} modules passed
            </p>
          </div>
          {overview.resumeSlug ? (
            <ButtonLink href={`/partner/academy/${overview.resumeSlug}`}>Resume</ButtonLink>
          ) : null}
        </div>
        <ProgressBar value={pct} barClassName="bg-emerald-500" />
        {overview.badge ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gold-500 bg-gold-50 p-4">
            <div>
              <p className="text-sm font-semibold text-gold-800">Partner Academy badge earned</p>
              <p className="text-xs text-slate-600">Serial {overview.badge.serial} for {overview.badge.year}</p>
            </div>
            <ButtonLink href="/partner/academy/certificate" variant="secondary" size="sm">View certificate</ButtonLink>
          </div>
        ) : null}
      </Card>

      {overview.finalExam.unlocked && !overview.finalExam.passed ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-gold-500 bg-gold-50">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-800">Final step</p>
            <h2 className="mt-1 text-lg font-semibold text-navy-900">The comprehensive final exam</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              You have passed every module. The final exam draws 20 questions from across every module exam. Pass it to earn your Partner Academy certificate.
            </p>
            {overview.finalExam.lockedUntil ? (
              <p className="mt-1 text-sm text-amber-700">
                On cooldown after a failed attempt. Available again after {overview.finalExam.lockedUntil.toLocaleString()}.
              </p>
            ) : null}
          </div>
          {overview.finalExam.lockedUntil ? null : (
            <ButtonLink href="/partner/academy/final-exam">Start the final exam</ButtonLink>
          )}
        </Card>
      ) : null}

      <ProDetectionPanel />

      <div className="space-y-3">
        {overview.modules.map((m) => {
          const s = STATUS[m.status];
          const inner = (
            <Card className={m.unlocked ? "transition hover:border-navy-300 hover:shadow-md" : "opacity-70"}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Module {m.order}</p>
                  <h2 className="mt-1 text-lg font-semibold text-navy-900">{m.title}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{m.summary}</p>
                </div>
                <Badge status={s.badge}>{s.label}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {m.examPassed ? <span>Best score {m.bestExamScore}%</span> : null}
                {!m.unlocked ? <span>Pass the previous module to unlock this one.</span> : null}
                {m.unlocked && !m.examPassed ? (
                  <span>
                    {m.lessonRead ? "Lesson read" : "Lesson not read"} {String.fromCharCode(183)} {m.exercisesDone ? "exercises done" : `${m.exerciseCount} exercises`}
                  </span>
                ) : null}
              </div>
            </Card>
          );
          return m.unlocked ? (
            <Link key={m.id} href={`/partner/academy/${m.slug}`} className="block">
              {inner}
            </Link>
          ) : (
            <div key={m.id}>{inner}</div>
          );
        })}
      </div>

      {overview.informationalModules.length > 0 ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">Reference and information</h2>
            <p className="text-sm text-slate-600">
              These are always open and never gated. They do not affect your certificate; read them whenever it is useful.
            </p>
          </div>
          {overview.informationalModules.map((m) => (
            <Link key={m.id} href={`/partner/academy/${m.slug}`} className="block">
              <Card className="transition hover:border-navy-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reference</p>
                    <h3 className="mt-1 text-lg font-semibold text-navy-900">{m.title}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{m.summary}</p>
                  </div>
                  <Badge status="OPEN">Info</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
