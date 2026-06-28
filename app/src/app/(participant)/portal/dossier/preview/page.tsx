import { resolvePortalUserId } from "@/lib/participant/view";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/shared/print-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function DossierPreviewPage() {
  const viewUserId = await resolvePortalUserId();
  const dossier = await prisma.dossier.findFirst({
    where: { participant: { userId: viewUserId ?? "" } },
    include: {
      participant: { include: { user: true, certification: true } },
      sections: { orderBy: { order: "asc" } },
    },
  });
  if (!dossier) throw new Error("Dossier not found.");

  const isCertified = dossier.participant.certification?.outcome === "CERTIFIED";

  return (
    <div className="mx-auto max-w-5xl space-y-8 print:max-w-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow={isCertified ? "Certified Dossier" : "Draft Dossier"}
          title={dossier.title ?? "Living AI Solution Dossier"}
          description={dossier.participant.user.name ?? dossier.participant.user.email}
        />
        <PrintButton />
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">TenXPros</p>
          <Badge status={isCertified ? "CERTIFIED" : "SUBMITTED"}>{isCertified ? "CERTIFIED" : "DRAFT"}</Badge>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Generated: {new Date().toLocaleDateString()} · Sections: {dossier.sections.length}/12
        </p>
      </Card>

      <div className="space-y-5">
        {dossier.sections.map((section) => (
          <Card key={section.id} className="break-inside-avoid space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-navy-900">
                {section.order}. {section.sectionType.replaceAll("_", " ")}
              </h2>
              <Badge status={section.status}>{section.status}</Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {section.content || "No content yet."}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
