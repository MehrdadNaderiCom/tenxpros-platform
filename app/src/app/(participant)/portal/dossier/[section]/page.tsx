import { notFound } from "next/navigation";
import { resolvePortalUserId } from "@/lib/participant/view";
import { prisma } from "@/lib/prisma";
import { DossierSectionEditor } from "@/components/participant/dossier-section-editor";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function DossierSectionPage({ params }: { params: { section: string } }) {
  const viewUserId = await resolvePortalUserId();
  const section = await prisma.dossierSection.findFirst({
    where: { id: params.section, dossier: { participant: { userId: viewUserId ?? "" } } },
    include: { feedback: { orderBy: { createdAt: "desc" } } },
  });
  if (!section) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title={section.sectionType.replaceAll("_", " ")} description="Save drafts as you work. Submit when ready for review." />
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <Badge status={section.status}>{section.status}</Badge>
          <span className="text-sm text-slate-500">Section {section.order}</span>
        </div>
        <DossierSectionEditor
          sectionId={section.id}
          initialContent={section.content}
          initialStatus={section.status}
          initialSavedAt={section.lastEditedAt?.toISOString() ?? null}
        />
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
