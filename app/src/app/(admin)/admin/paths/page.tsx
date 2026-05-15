import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function PathsPage() {
  const paths = await prisma.programPath.findMany({
    include: { participant: { include: { user: true, diagnostic: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Paths" description="Approve and tune personalized participant paths." />
      <div className="grid gap-4">
        {paths.map((path) => (
          <Card key={path.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href={`/admin/paths/${path.id}`} className="text-xl font-semibold text-navy-900">
                {path.participant.user.name ?? path.participant.user.email}
              </Link>
              <p className="mt-1 text-sm text-slate-600">{path.customizationNotes ?? "No notes yet"}</p>
            </div>
            <Badge status={path.approvedByAdmin ? "ACCEPTED" : "UNDER_REVIEW"}>{path.approvedByAdmin ? "APPROVED" : "DRAFT"}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
