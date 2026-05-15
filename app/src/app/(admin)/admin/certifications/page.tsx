import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function CertificationsPage() {
  const participants = await prisma.participantProfile.findMany({
    include: { user: true, certification: true, participantModules: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Certifications" description="Capstone and final credential decisions." />
      <div className="grid gap-4">
        {participants.map((participant) => (
          <Card key={participant.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href={`/admin/certifications/${participant.id}`} className="text-xl font-semibold text-navy-900">
                {participant.user.name ?? participant.user.email}
              </Link>
              <p className="mt-1 text-sm text-slate-600">{participant.participantModules.filter((m) => m.status === "PASSED").length}/11 modules passed</p>
            </div>
            <Badge status={participant.certification?.outcome ?? participant.status}>{participant.certification?.outcome ?? participant.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
