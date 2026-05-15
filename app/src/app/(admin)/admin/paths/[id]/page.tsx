import { notFound } from "next/navigation";
import { approvePath } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function PathBuilderPage({ params }: { params: { id: string } }) {
  const path = await prisma.programPath.findUnique({
    where: { id: params.id },
    include: { participant: { include: { user: true, diagnostic: true, participantModules: { include: { module: true } } } } },
  });
  if (!path) notFound();
  return (
    <div className="space-y-8">
      <PageHeader title="Path Builder" description={path.participant.user.name ?? path.participant.user.email} />
      <Card>
        <form action={approvePath} className="space-y-4">
          <input type="hidden" name="pathId" value={path.id} />
          <Textarea name="customizationNotes" defaultValue={path.customizationNotes ?? ""} />
          <Button type="submit">Approve path</Button>
        </form>
      </Card>
      <div className="grid gap-3">
        {path.participant.participantModules.map((item) => (
          <Card key={item.id}>
            <p className="font-medium text-navy-900">Module {item.module.number}: {item.module.title}</p>
            <p className="mt-1 text-sm text-slate-600">{item.customizationNotes ?? item.module.coreQuestion}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
