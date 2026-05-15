import { notFound } from "next/navigation";
import { saveModuleLibraryItem } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function ModuleEditorPage({ params }: { params: { id: string } }) {
  const programModule = await prisma.module.findUnique({ where: { id: params.id } });
  if (!programModule) notFound();
  return (
    <div className="space-y-8">
      <PageHeader title={`Module ${programModule.number}`} description="Edit library metadata and participant-facing instructions." />
      <Card>
        <form action={saveModuleLibraryItem} className="space-y-4">
          <input type="hidden" name="moduleId" value={programModule.id} />
          <Field label="Title"><Input name="title" defaultValue={programModule.title} /></Field>
          <Field label="Core question"><Textarea name="coreQuestion" defaultValue={programModule.coreQuestion} /></Field>
          <Field label="Description"><Textarea name="description" defaultValue={programModule.description} /></Field>
          <Field label="Artifact template"><Textarea name="artifactTemplate" defaultValue={programModule.artifactTemplate} /></Field>
          <Field label="Pass criteria"><Textarea name="passCriteria" defaultValue={programModule.passCriteria} /></Field>
          <Field label="Estimated hours"><Input name="estimatedHours" type="number" step="0.5" defaultValue={programModule.estimatedHours} /></Field>
          <Button type="submit">Save module</Button>
        </form>
      </Card>
    </div>
  );
}
