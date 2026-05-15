import { notFound } from "next/navigation";
import { reviewDossierSection } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function DossierReviewPage({ params }: { params: { id: string } }) {
  const dossier = await prisma.dossier.findUnique({
    where: { id: params.id },
    include: { participant: { include: { user: true } }, sections: { include: { feedback: true }, orderBy: { order: "asc" } } },
  });
  if (!dossier) notFound();
  return (
    <div className="space-y-8">
      <PageHeader title={dossier.title ?? "Dossier"} description={dossier.participant.user.email} />
      <div className="grid gap-4">
        {dossier.sections.map((section) => (
          <Card key={section.id} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-navy-900">{section.order}. {section.sectionType.replaceAll("_", " ")}</h2>
              <Badge status={section.status}>{section.status}</Badge>
            </div>
            <p className="whitespace-pre-wrap rounded-md bg-neutral-50 p-4 text-sm leading-6 text-slate-700">{section.content || "No content yet."}</p>
            <form action={reviewDossierSection} className="space-y-3">
              <input type="hidden" name="sectionId" value={section.id} />
              <select name="status" className="h-10 rounded-md border border-neutral-300 px-3 text-sm">
                <option value="REVIEWED">Reviewed</option>
                <option value="APPROVED">Approved</option>
                <option value="REVISED">Revision requested</option>
              </select>
              <Textarea name="content" placeholder="Section-level feedback..." />
              <Button type="submit">Save feedback</Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
