import { notFound } from "next/navigation";
import { decideCertification } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function CertificationDecisionPage({ params }: { params: { id: string } }) {
  const participant = await prisma.participantProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { include: { application: { select: { domain: true } } } },
      certification: true,
      participantModules: { include: { module: true } },
      dossier: { include: { sections: true } },
    },
  });
  if (!participant) notFound();

  // Defaults: field from the application domain, specialization from the dossier
  // title. Both prefilled and fully editable by the reviewer.
  const fieldDefault = participant.certification?.field ?? participant.user.application?.domain ?? "";
  const specializationDefault = participant.certification?.specialization ?? participant.dossier?.title ?? "";
  return (
    <div className="space-y-8">
      <PageHeader title="Certification Decision" description={participant.user.name ?? participant.user.email} />
      <Card className="bg-neutral-50">
        <p className="text-sm leading-6 text-slate-700">
          Use this decision only after reviewing module evidence, dossier quality, and capstone readiness. Certification is not automatic completion.
        </p>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-slate-500">Modules passed</p><p className="mt-3 text-2xl font-semibold">{participant.participantModules.filter((m) => m.status === "PASSED").length}/11</p></Card>
        <Card><p className="text-sm text-slate-500">Dossier approved</p><p className="mt-3 text-2xl font-semibold">{participant.dossier?.sections.filter((s) => s.status === "APPROVED").length ?? 0}/12</p></Card>
        <Card><p className="text-sm text-slate-500">Current outcome</p><p className="mt-3 text-lg font-semibold">{participant.certification?.outcome ?? "None"}</p></Card>
      </div>
      <Card>
        <form action={decideCertification} className="space-y-4">
          <input type="hidden" name="participantId" value={participant.id} />
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Outcome</span>
            <Select name="outcome" defaultValue={participant.certification?.outcome ?? "CERTIFIED"}>
              <option value="CERTIFIED">Certified</option>
              <option value="CONDITIONALLY_CERTIFIED">Conditionally certified</option>
              <option value="COMPLETED_NOT_CERTIFIED">Completed, not certified</option>
              <option value="NOT_COMPLETED">Not completed</option>
            </Select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Field</span>
              <Input name="field" defaultValue={fieldDefault} placeholder="The professional domain the person works in" />
              <span className="text-xs text-slate-500">Defaults from the application domain. Appears on the credential.</span>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Specialization</span>
              <Input name="specialization" defaultValue={specializationDefault} placeholder="What the dossier accomplished" />
              <span className="text-xs text-slate-500">Defaults from the dossier title. Appears on the credential.</span>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Reviewer notes</span>
            <Textarea name="reviewerNotes" placeholder="Reviewer notes..." defaultValue={participant.certification?.reviewerNotes ?? ""} />
          </label>
          <Button type="submit">Save certification decision</Button>
        </form>
      </Card>
    </div>
  );
}
