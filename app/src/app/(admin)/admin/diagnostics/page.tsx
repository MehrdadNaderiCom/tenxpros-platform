import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

export default async function DiagnosticsPage() {
  const diagnostics = await prisma.diagnosticIntake.findMany({
    include: { participant: { include: { user: true, path: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Diagnostics" description="Submitted and draft diagnostic intakes." />
      <div className="grid gap-4">
        {diagnostics.map((diagnostic) => (
          <Card key={diagnostic.id}>
            <Link href={`/admin/paths/${diagnostic.participant.path?.id}`} className="text-xl font-semibold text-navy-900">
              {diagnostic.participant.user.name ?? diagnostic.participant.user.email}
            </Link>
            <p className="mt-2 text-sm text-slate-600">
              Complete: {diagnostic.isComplete ? "yes" : "no"} · Risk: {diagnostic.riskProfile ?? "draft"}
            </p>
          </Card>
        ))}
        {diagnostics.length === 0 ? (
          <EmptyState
            eyebrow="No diagnostics"
            title="No diagnostic intakes are waiting."
            description="Submitted participant intakes will appear here so you can approve or tune a personalized path."
            actionLabel="View participants"
            actionHref="/admin/participants"
          />
        ) : null}
      </div>
    </div>
  );
}
