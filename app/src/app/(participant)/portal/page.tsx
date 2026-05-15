import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function PortalDashboardPage() {
  const session = await auth();
  const profile = await prisma.participantProfile.findUnique({
    where: { userId: session?.user.id ?? "" },
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
      <PageHeader title="Participant Dashboard" description="Your current TenXPros status and next action." />
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
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">{nextAction[0]}</h2>
          <p className="mt-2 text-sm text-slate-600">The dashboard always points to the next meaningful participant action.</p>
        </div>
        <Link className="font-medium text-navy-900" href={nextAction[1]}>
          Open
        </Link>
      </Card>
    </div>
  );
}
