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

export const dynamic = "force-dynamic";

export default async function PartnerAcademyManagePage({ params }: { params: { partnerId: string } }) {
  await requireSuperAdmin();
  const partner = await prisma.partner.findUnique({ where: { id: params.partnerId }, select: { id: true, displayName: true } });
  if (!partner) notFound();

  const [modules, progress, badge] = await Promise.all([
    prisma.academyModule.findMany({ where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, order: true, title: true } }),
    prisma.academyProgress.findMany({ where: { partnerId: partner.id } }),
    prisma.partnerAcademyBadge.findUnique({ where: { partnerId: partner.id } }),
  ]);
  const progBy = new Map(progress.map((p) => [p.moduleId, p]));
  const passedCount = progress.filter((p) => p.examPassed).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={partner.displayName} description={`Partner Academy management. ${passedCount} of ${modules.length} modules passed.`} />
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

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy-900">Module progress</h2>
          <form action={markAllModulesComplete}>
            <input type="hidden" name="partnerId" value={partner.id} />
            <Button type="submit" variant="secondary" size="sm">Mark all complete</Button>
          </form>
        </div>
        <div className="mt-4 space-y-2">
          {modules.map((m) => {
            const p = progBy.get(m.id);
            const passed = Boolean(p?.examPassed);
            return (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 p-3">
                <div>
                  <p className="text-sm font-medium text-navy-900"><span className="mr-2 text-xs text-slate-400">Module {m.order}</span>{m.title}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{p?.lessonReadAt ? "Lesson read" : "Lesson not read"}</span>
                    <span>{p?.exercisesDone ? "Exercises done" : "Exercises pending"}</span>
                    <span>{passed ? `Exam passed (${p?.bestExamScore ?? 0}%)` : "Exam not passed"}</span>
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
