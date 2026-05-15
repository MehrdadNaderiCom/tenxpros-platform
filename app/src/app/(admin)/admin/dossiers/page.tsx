import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function AdminDossiersPage() {
  const dossiers = await prisma.dossier.findMany({
    include: { participant: { include: { user: true } }, sections: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Dossiers" description="Section-level review queues. Inline annotation is intentionally deferred." />
      <div className="grid gap-4">
        {dossiers.map((dossier) => (
          <Card key={dossier.id}>
            <Link href={`/admin/dossiers/${dossier.id}`} className="text-xl font-semibold text-navy-900">
              {dossier.title ?? dossier.participant.user.name ?? dossier.participant.user.email}
            </Link>
            <p className="mt-2 text-sm text-slate-600">
              Submitted sections: {dossier.sections.filter((section) => section.status === "SUBMITTED").length}/12
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
