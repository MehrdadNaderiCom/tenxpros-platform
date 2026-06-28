import { notFound } from "next/navigation";
import { reviewParticipantModule } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function ParticipantDetailPage({ params }: { params: { id: string } }) {
  const participant = await prisma.participantProfile.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      diagnostic: true,
      participantModules: { include: { module: true }, orderBy: { module: { number: "asc" } } },
      dossier: { include: { sections: true } },
      certification: true,
    },
  });
  if (!participant) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title={participant.user.name ?? participant.user.email} description={`${participant.tier} · ${participant.status}`} />
      <Card className="flex flex-col gap-3 bg-neutral-50 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">Participant workspace</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Jump to the operational surface that needs attention: path, dossier review, or certification decision.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/admin/impersonate/participant/${participant.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
          >
            Open portal (read-only)
          </a>
          {participant.dossier ? (
            <ButtonLink href={`/admin/dossiers/${participant.dossier.id}`} variant="secondary" size="sm">
              Dossier
            </ButtonLink>
          ) : null}
          <ButtonLink href={`/admin/certifications/${participant.id}`} variant="secondary" size="sm">
            Certification
          </ButtonLink>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm text-slate-500">Status</p><Badge className="mt-3" status={participant.status}>{participant.status}</Badge></Card>
        <Card><p className="text-sm text-slate-500">Diagnostic</p><p className="mt-3 font-semibold">{participant.diagnostic?.isComplete ? "Submitted" : "Pending"}</p></Card>
        <Card><p className="text-sm text-slate-500">Dossier sections</p><p className="mt-3 font-semibold">{participant.dossier?.sections.length ?? 0}/12</p></Card>
        <Card><p className="text-sm text-slate-500">Certification</p><p className="mt-3 font-semibold">{participant.certification?.outcome ?? "Not reviewed"}</p></Card>
      </div>
      <Card>
        <h2 className="text-xl font-semibold text-navy-900">Module review</h2>
        <div className="mt-4 grid gap-4">
          {participant.participantModules.map((item) => (
            <form key={item.id} action={reviewParticipantModule} className="rounded-md border border-neutral-200 p-4">
              <input type="hidden" name="participantModuleId" value={item.id} />
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-navy-900">Module {item.module.number}: {item.module.title}</p>
                  <p className="text-sm text-slate-600">Current: {item.status}</p>
                </div>
                <select name="status" className="h-10 rounded-md border border-neutral-300 px-3 text-sm">
                  <option value="PASSED">Passed</option>
                  <option value="REVISE">Revise</option>
                  <option value="HOLD">Hold</option>
                </select>
              </div>
              <Textarea name="coachFeedback" className="mt-3" placeholder="Section-level or artifact feedback..." defaultValue={item.coachFeedback ?? ""} />
              <Button className="mt-3" type="submit">Save review</Button>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}
