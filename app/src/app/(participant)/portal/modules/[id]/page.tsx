import { notFound } from "next/navigation";
import { startModule, submitModuleArtifact } from "@/lib/actions/participant";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function ModulePage({ params }: { params: { id: string } }) {
  const session = await auth();
  const profile = await prisma.participantProfile.findUnique({ where: { userId: session?.user.id ?? "" } });
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
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-slate-600">
            This module is locked until your approved path or prior module evidence opens it.
          </p>
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
