import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function ModulesPage() {
  const session = await auth();
  const profile = await prisma.participantProfile.findUnique({
    where: { userId: session?.user.id ?? "" },
    include: { participantModules: { include: { module: true }, orderBy: { module: { number: "asc" } } } },
  });
  if (!profile) throw new Error("Participant profile not found.");

  return (
    <div className="space-y-8">
      <PageHeader title="Modules" description="Each module produces a practical artifact and may earn a badge after review." />
      <div className="grid gap-4">
        {profile.participantModules.map((item) => (
          <Card key={item.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Module {item.module.number} · {item.module.phase}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-navy-900">{item.module.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.module.description}</p>
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
      </div>
    </div>
  );
}
