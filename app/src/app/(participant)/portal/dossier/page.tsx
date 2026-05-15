import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function DossierPage() {
  const session = await auth();
  const dossier = await prisma.dossier.findFirst({
    where: { participant: { userId: session?.user.id ?? "" } },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!dossier) throw new Error("Dossier not found.");

  return (
    <div className="space-y-8">
      <PageHeader title="Dossier Builder" description="Build and submit each section for section-level review." />
      <div className="grid gap-4 md:grid-cols-2">
        {dossier.sections.map((section) => (
          <Card key={section.id} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-navy-900">
                {section.order}. {section.sectionType.replaceAll("_", " ").toLowerCase()}
              </h2>
              <Badge status={section.status}>{section.status}</Badge>
            </div>
            <p className="text-sm text-slate-600">
              Last edited: {section.lastEditedAt?.toLocaleString() ?? "Not started"}
            </p>
            <Link href={`/portal/dossier/${section.id}`} className="font-medium text-navy-900">
              Open section
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
