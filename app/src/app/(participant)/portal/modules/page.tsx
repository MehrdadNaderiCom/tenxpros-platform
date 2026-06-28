import Link from "next/link";
import { resolvePortalUserId } from "@/lib/participant/view";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

export default async function ModulesPage() {
  const viewUserId = await resolvePortalUserId();
  const profile = await prisma.participantProfile.findUnique({
    where: { userId: viewUserId ?? "" },
    include: { participantModules: { include: { module: true }, orderBy: { module: { number: "asc" } } } },
  });
  if (!profile) throw new Error("Participant profile not found.");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Modules"
        description="Each module produces a practical artifact and may earn a badge after review."
      />
      <div className="grid gap-4">
        {profile.participantModules.map((item) => (
          <Card key={item.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Module {item.module.number} · {item.module.phase}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-navy-900">{item.module.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.module.description}</p>
              {item.status === "LOCKED" ? (
                <p className="mt-2 text-sm text-slate-500">
                  Locked until your path or prior module evidence is ready.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Badge status={item.status}>{item.status}</Badge>
              {item.status !== "LOCKED" ? (
                <Link href={`/portal/modules/${item.id}`} className="font-medium text-navy-900">
                  Open
                </Link>
              ) : null}
            </div>
          </Card>
        ))}
        {profile.participantModules.length === 0 ? (
          <EmptyState
            eyebrow="No modules yet"
            title="Your module path has not been generated."
            description="Complete the Starter Pack and Diagnostic Intake first. Admin approval then unlocks the right starting sequence."
            actionLabel="Go to diagnostic"
            actionHref="/portal/diagnostic"
          />
        ) : null}
      </div>
    </div>
  );
}
