import { notFound } from "next/navigation";
import { saveDossierSection, submitDossierSection } from "@/lib/actions/participant";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function DossierSectionPage({ params }: { params: { section: string } }) {
  const session = await auth();
  const section = await prisma.dossierSection.findFirst({
    where: { id: params.section, dossier: { participant: { userId: session?.user.id ?? "" } } },
    include: { feedback: { orderBy: { createdAt: "desc" } } },
  });
  if (!section) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title={section.sectionType.replaceAll("_", " ")} description="Save drafts as you work. Submit when ready for review." />
      <Card>
        <form className="space-y-4">
          <input type="hidden" name="sectionId" value={section.id} />
          <div className="flex items-center gap-3">
            <Badge status={section.status}>{section.status}</Badge>
            <span className="text-sm text-slate-500">Section {section.order}</span>
          </div>
          <Textarea name="content" defaultValue={section.content} className="min-h-[420px]" />
          <div className="flex gap-3">
            <Button formAction={saveDossierSection} type="submit" variant="secondary">
              Save draft
            </Button>
            <Button formAction={submitDossierSection} type="submit">
              Submit for review
            </Button>
          </div>
        </form>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold text-navy-900">Feedback history</h2>
        <div className="mt-4 space-y-3">
          {section.feedback.map((feedback) => (
            <div key={feedback.id} className="rounded-md border border-neutral-200 p-3">
              <p className="text-sm font-medium text-slate-900">{feedback.type} · {feedback.authorName}</p>
              <p className="mt-2 text-sm text-slate-600">{feedback.content}</p>
            </div>
          ))}
          {section.feedback.length === 0 ? <p className="text-sm text-slate-600">No feedback yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
