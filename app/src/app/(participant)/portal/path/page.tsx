import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function PathPage() {
  const session = await auth();
  const profile = await prisma.participantProfile.findUnique({
    where: { userId: session?.user.id ?? "" },
    include: {
      path: true,
      diagnostic: true,
      participantModules: { include: { module: true }, orderBy: { module: { number: "asc" } } },
    },
  });
  if (!profile) throw new Error("Participant profile not found.");

  return (
    <div className="space-y-8">
      <PageHeader title="Personalized Path" description="Your 12-week path becomes more specific after diagnostic review." />
      <Card>
        <h2 className="text-xl font-semibold text-navy-900">Customization notes</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {profile.path?.customizationNotes ?? "Initial path pending diagnostic review."}
        </p>
      </Card>
      <div className="grid gap-4">
        {profile.participantModules.map((item) => (
          <Card key={item.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Module {item.module.number}</p>
              <h2 className="text-xl font-semibold text-navy-900">{item.module.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{item.customizationNotes ?? item.module.coreQuestion}</p>
            </div>
            <Badge status={item.status}>{item.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
