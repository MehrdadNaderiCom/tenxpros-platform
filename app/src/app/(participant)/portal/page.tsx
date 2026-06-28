import { resolvePortalUserId } from "@/lib/participant/view";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function PortalDashboardPage() {
  const viewUserId = await resolvePortalUserId();
  const profile = await prisma.participantProfile.findUnique({
    where: { userId: viewUserId ?? "" },
    include: {
      diagnostic: true,
      participantModules: { include: { module: true }, orderBy: { module: { number: "asc" } } },
      dossier: { include: { sections: true } },
      certification: true,
    },
  });

  if (!profile) throw new Error("Participant profile not found.");

  const nextAction = !profile.starterPackCompletedAt
    ? ["Complete Starter Pack", "/portal/starter-pack"]
    : !profile.diagnostic?.isComplete
      ? ["Submit Diagnostic Intake", "/portal/diagnostic"]
      : profile.participantModules.find((item) => ["UNLOCKED", "IN_PROGRESS", "REVISE"].includes(item.status))
        ? ["Continue Modules", "/portal/modules"]
        : ["Review Dossier", "/portal/dossier"];

  const submittedSections = profile.dossier?.sections.filter((section) => section.status !== "DRAFT").length ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Participant Dashboard"
        description="A calm view of your current status, evidence work, and the next action that matters."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Status</p>
          <Badge className="mt-3" status={profile.status}>
            {profile.status}
          </Badge>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Starter Pack</p>
          <p className="mt-3 font-semibold text-navy-900">{profile.starterPackCompletedAt ? "Complete" : "Pending"}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Modules submitted</p>
          <p className="mt-3 text-2xl font-semibold text-navy-900">
            {profile.participantModules.filter((item) => item.status === "SUBMITTED" || item.status === "PASSED").length}/11
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Dossier sections active</p>
          <p className="mt-3 text-2xl font-semibold text-navy-900">{submittedSections}/12</p>
        </Card>
      </div>
      <Card className="flex flex-col gap-4 border-navy-200 bg-navy-50 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">Next action</p>
          <h2 className="text-xl font-semibold text-navy-900">{nextAction[0]}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Work through one clear step at a time. TenXPros opens more of the path as your evidence becomes ready.
          </p>
        </div>
        <ButtonLink href={nextAction[1]}>
          Open
        </ButtonLink>
      </Card>
      <Card className="border-dashed bg-neutral-50">
        <p className="text-sm font-semibold text-navy-900">Notifications</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No notifications yet. Review updates, ticket replies, and certification decisions will appear in the relevant workspace area.
        </p>
      </Card>
    </div>
  );
}
