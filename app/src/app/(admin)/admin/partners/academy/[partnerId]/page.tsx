import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { absoluteUrl } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { manualIssueBadge, renewBadge, revokeBadge, setModuleCompletion, markAllModulesComplete } from "@/lib/actions/academy-admin";
import { formatDuration } from "@/lib/academy/telemetry";

export const dynamic = "force-dynamic";

/** Plain-language labels for the behavior event log. */
const EVENT_LABELS: Record<string, string> = {
  MODULE_OPENED: "Opened the module",
  LESSON_READ: "Marked the lesson read",
  EXERCISE_ANSWERED: "Answered an exercise",
  EXAM_STARTED: "Started the module exam",
  EXAM_SUBMITTED: "Submitted the module exam",
  FINAL_EXAM_STARTED: "Started the final exam",
  FINAL_EXAM_SUBMITTED: "Submitted the final exam",
};

export default async function PartnerAcademyManagePage({ params }: { params: { partnerId: string } }) {
  await requireSuperAdmin();
  const partner = await prisma.partner.findUnique({ where: { id: params.partnerId }, select: { id: true, displayName: true } });
  if (!partner) notFound();

  const [modules, progress, badge, engagements, sittings, exerciseAttempts, events] = await Promise.all([
    prisma.academyModule.findMany({ where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, order: true, title: true, contentVersion: true, isInformational: true } }),
    prisma.academyProgress.findMany({ where: { partnerId: partner.id } }),
    prisma.partnerAcademyBadge.findUnique({ where: { partnerId: partner.id } }),
    prisma.academyEngagement.findMany({ where: { partnerId: partner.id } }),
    prisma.academyExamSitting.findMany({ where: { partnerId: partner.id, submittedAt: { not: null } }, orderBy: { startedAt: "asc" } }),
    prisma.academyExerciseAttempt.findMany({ where: { partnerId: partner.id }, select: { questionId: true, correct: true, attemptNo: true, question: { select: { moduleId: true } } } }),
    prisma.academyEvent.findMany({ where: { partnerId: partner.id }, orderBy: { createdAt: "desc" }, take: 60, include: { module: { select: { order: true, title: true } } } }),
  ]);
  const progBy = new Map(progress.map((p) => [p.moduleId, p]));
  // Count passes only for exam-bearing modules, matching the denominator, so a stray
  // progress row on a reference page can never inflate the header count.
  const examBearing = modules.filter((m) => !m.isInformational);
  const examBearingIds = new Set(examBearing.map((m) => m.id));
  const passedCount = progress.filter((p) => p.examPassed && examBearingIds.has(p.moduleId)).length;
  const examBearingCount = examBearing.length;

  // Engagement rollups.
  const engBy = new Map(engagements.map((e) => [e.moduleId, e]));
  const sittingsByModule = new Map<string, typeof sittings>();
  for (const s of sittings) {
    if (!s.moduleId) continue;
    const arr = sittingsByModule.get(s.moduleId) ?? [];
    arr.push(s);
    sittingsByModule.set(s.moduleId, arr);
  }
  const finalSittings = sittings.filter((s) => s.isFinal);
  const exByModule = new Map<string, { attempts: number; firstTryCorrect: number }>();
  const firstTryByQuestion = new Map<string, boolean>();
  for (const a of exerciseAttempts) {
    const modId = a.question.moduleId;
    const cur = exByModule.get(modId) ?? { attempts: 0, firstTryCorrect: 0 };
    cur.attempts += 1;
    if (a.attemptNo === 1 && a.correct && !firstTryByQuestion.has(a.questionId)) cur.firstTryCorrect += 1;
    if (a.attemptNo === 1) firstTryByQuestion.set(a.questionId, a.correct);
    exByModule.set(modId, cur);
  }
  const sittingSeconds = (s: (typeof sittings)[number]) =>
    s.submittedAt ? Math.max(0, Math.round((s.submittedAt.getTime() - s.startedAt.getTime()) / 1000)) : 0;
  const totalReadSeconds = engagements.reduce((n, e) => n + e.readSeconds, 0);
  const totalAudioSeconds = engagements.reduce((n, e) => n + e.audioSeconds, 0);
  const totalExamSeconds = sittings.reduce((n, s) => n + sittingSeconds(s), 0);
  const lastActivity = engagements.reduce<Date | null>(
    (latest, e) => (e.lastActivityAt && (!latest || e.lastActivityAt > latest) ? e.lastActivityAt : latest),
    events[0]?.createdAt ?? null,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={partner.displayName} description={`Partner Academy management. ${passedCount} of ${examBearingCount} modules passed.`} />
        <ButtonLink href="/admin/partners/academy" variant="secondary" size="sm">All partners</ButtonLink>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">Certificate</h2>
            {badge ? (
              <p className="mt-1 text-sm text-slate-600">
                Issued for {badge.year}, serial{" "}
                <Link href={absoluteUrl(`/academy/verify/${badge.serial}`)} target="_blank" className="font-medium text-navy-600 underline">{badge.serial}</Link>, awarded {badge.awardedAt.toLocaleDateString()}.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">No certificate issued.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={manualIssueBadge}>
              <input type="hidden" name="partnerId" value={partner.id} />
              <Button type="submit" size="sm">{badge ? "Re-issue (this year)" : "Issue certificate"}</Button>
            </form>
            {badge ? (
              <>
                <form action={renewBadge}>
                  <input type="hidden" name="partnerId" value={partner.id} />
                  <Button type="submit" variant="secondary" size="sm">Renew for this year</Button>
                </form>
                <ConfirmSubmit action={revokeBadge} hidden={{ partnerId: partner.id }} message={`Revoke ${partner.displayName}'s certificate? This deletes it.`} label="Revoke" />
              </>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">A manually issued certificate is valid for the current calendar year regardless of whether the partner finished the modules or passed the exam. Renewal sets it to the current year.</p>
      </Card>

      {/* Engagement analytics: how this partner actually works through the Academy. */}
      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Engagement analytics</h2>
        <p className="mt-1 text-xs text-slate-500">
          Reading time counts only while the lesson tab is actually visible, credited in short server-clamped beats, so it
          cannot be inflated by an open idle tab. Exam durations are measured from opening a sitting to submitting it. Audio
          is client reported (capped by presence) and is shown separately, never added into time totals.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Reading time", formatDuration(totalReadSeconds)],
            ["Audio listened", formatDuration(totalAudioSeconds)],
            ["Time in exams", formatDuration(totalExamSeconds)],
            ["Exam sittings", String(sittings.length)],
            ["Last activity", lastActivity ? lastActivity.toLocaleString() : "none yet"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-center">
              <p className="text-sm font-semibold text-navy-900">{value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Module</th>
                <th className="py-2 pr-3">Reading</th>
                <th className="py-2 pr-3">Audio</th>
                <th className="py-2 pr-3">Views</th>
                <th className="py-2 pr-3">Scroll depth</th>
                <th className="py-2 pr-3">Exercises</th>
                <th className="py-2 pr-3">Exam sittings (score, duration)</th>
                <th className="py-2">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {modules
                .filter((m) => !m.isInformational)
                .map((m) => {
                  const e = engBy.get(m.id);
                  const ex = exByModule.get(m.id);
                  const modSittings = sittingsByModule.get(m.id) ?? [];
                  return (
                    <tr key={m.id} className="border-b border-neutral-100 align-top">
                      <td className="py-2 pr-3 font-medium text-navy-900">
                        <span className="mr-1 text-xs text-slate-400">{m.order}</span>
                        {m.title}
                      </td>
                      <td className="py-2 pr-3">{formatDuration(e?.readSeconds ?? 0)}</td>
                      <td className="py-2 pr-3">{e?.audioSeconds ? formatDuration(e.audioSeconds) : "0s"}</td>
                      <td className="py-2 pr-3">{e?.lessonViews ?? 0}</td>
                      <td className="py-2 pr-3">{e?.maxScrollPct ?? 0}%</td>
                      <td className="py-2 pr-3">
                        {ex ? `${ex.attempts} attempts, ${ex.firstTryCorrect} right first try` : "none"}
                      </td>
                      <td className="py-2 pr-3">
                        {modSittings.length === 0
                          ? "none"
                          : modSittings
                              .map((s) => `${s.score}% in ${formatDuration(sittingSeconds(s))}${s.passed ? " (pass)" : ""}`)
                              .join("; ")}
                      </td>
                      <td className="py-2 text-xs text-slate-500">
                        {e?.lastActivityAt ? e.lastActivityAt.toLocaleString() : ""}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {finalSittings.length > 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            <span className="font-medium text-navy-900">Final exam:</span>{" "}
            {finalSittings.map((s) => `${s.score}% in ${formatDuration(sittingSeconds(s))}${s.passed ? " (pass)" : ""}`).join("; ")}
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Recent activity</h2>
        <p className="mt-1 text-xs text-slate-500">The newest {events.length} behavior events, newest first.</p>
        <div className="mt-3 max-h-96 space-y-1 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            events.map((ev) => {
              const meta = (ev.meta ?? {}) as { percent?: number; passed?: boolean; durationSeconds?: number; correct?: boolean; attemptNo?: number };
              const detail =
                ev.kind === "EXAM_SUBMITTED" || ev.kind === "FINAL_EXAM_SUBMITTED"
                  ? ` ${meta.percent}%${meta.passed ? ", passed" : ", not passed"}${typeof meta.durationSeconds === "number" ? `, ${formatDuration(meta.durationSeconds)}` : ""}`
                  : ev.kind === "EXERCISE_ANSWERED"
                    ? ` attempt ${meta.attemptNo ?? ""}${meta.correct ? ", correct" : ", incorrect"}`
                    : "";
              return (
                <div key={ev.id} className="flex flex-wrap items-baseline gap-x-2 border-b border-neutral-100 py-1.5 text-sm">
                  <span className="text-xs tabular-nums text-slate-400">{ev.createdAt.toLocaleString()}</span>
                  <span className="text-slate-700">
                    {EVENT_LABELS[ev.kind] ?? ev.kind}
                    {ev.module ? ` (Module ${ev.module.order}, ${ev.module.title})` : ""}
                    {detail}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy-900">Module progress</h2>
          <form action={markAllModulesComplete}>
            <input type="hidden" name="partnerId" value={partner.id} />
            <Button type="submit" variant="secondary" size="sm">Mark all complete</Button>
          </form>
        </div>
        <div className="mt-4 space-y-2">
          {examBearing.map((m) => {
            const p = progBy.get(m.id);
            const passed = Boolean(p?.examPassed);
            const stale = passed && (p?.passedContentVersion ?? 1) < m.contentVersion;
            return (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 p-3">
                <div>
                  <p className="text-sm font-medium text-navy-900"><span className="mr-2 text-xs text-slate-400">Module {m.order}</span>{m.title}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{p?.lessonReadAt ? "Lesson read" : "Lesson not read"}</span>
                    <span>{p?.exercisesDone ? "Exercises done" : "Exercises pending"}</span>
                    <span>{passed ? `Exam passed (${p?.bestExamScore ?? 0}%)` : "Exam not passed"}</span>
                    {passed ? (
                      <span className={stale ? "text-amber-700" : "text-slate-400"}>
                        {stale ? `Passed v${p?.passedContentVersion ?? 1}, now v${m.contentVersion}` : `On current v${m.contentVersion}`}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={passed ? "PASSED" : "IN_PROGRESS"}>{passed ? "Complete" : "Incomplete"}</Badge>
                  {passed ? (
                    <form action={setModuleCompletion}>
                      <input type="hidden" name="partnerId" value={partner.id} />
                      <input type="hidden" name="moduleId" value={m.id} />
                      <input type="hidden" name="done" value="0" />
                      <Button type="submit" variant="danger" size="sm">Reset</Button>
                    </form>
                  ) : (
                    <form action={setModuleCompletion}>
                      <input type="hidden" name="partnerId" value={partner.id} />
                      <input type="hidden" name="moduleId" value={m.id} />
                      <input type="hidden" name="done" value="1" />
                      <Button type="submit" size="sm">Mark complete</Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
