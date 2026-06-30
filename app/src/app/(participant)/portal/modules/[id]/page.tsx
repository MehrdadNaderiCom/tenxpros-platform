import { notFound } from "next/navigation";
import { startModule, submitModuleArtifact } from "@/lib/actions/participant";
import { resolvePortalUserId } from "@/lib/participant/view";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function ModulePage({ params }: { params: { id: string } }) {
  const viewUserId = await resolvePortalUserId();
  const profile = await prisma.participantProfile.findUnique({ where: { userId: viewUserId ?? "" } });
  const item = await prisma.participantModule.findFirst({
    where: { id: params.id, participantId: profile?.id },
    include: { module: true },
  });
  if (!item) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title={item.module.title} description={item.module.coreQuestion} />
      <Card className="space-y-4">
        <Badge status={item.status}>{item.status}</Badge>
        <p className="text-sm leading-6 text-slate-600">{item.module.description}</p>
        <p className="text-sm text-slate-600">
          Estimated hours: {item.module.estimatedHours} · Badge: {item.module.badgeName}
        </p>
        {item.status === "LOCKED" ? (
          <Alert tone="neutral">
            This module is locked until your approved path or prior module evidence opens it.
          </Alert>
        ) : null}
        {item.status === "UNLOCKED" ? (
          <form action={startModule}>
            <input type="hidden" name="participantModuleId" value={item.id} />
            <Button type="submit">Start module</Button>
          </form>
        ) : null}
      </Card>
      <Card>
        <form action={submitModuleArtifact} className="space-y-4">
          <input type="hidden" name="participantModuleId" value={item.id} />
          <Field label="Artifact content">
            <Textarea name="artifactContent" defaultValue={item.artifactContent ?? ""} />
          </Field>
          <Field label="Artifact URL">
            <Input name="artifactUrl" type="url" defaultValue={item.artifactUrl ?? ""} />
          </Field>
          <Button type="submit" disabled={item.status === "LOCKED"}>
            Submit artifact for review
          </Button>
        </form>
      </Card>
    </div>
  );
}
