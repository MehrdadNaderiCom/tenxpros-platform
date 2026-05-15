import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function ParticipantsPage() {
  const participants = await prisma.participantProfile.findMany({
    include: { user: true, participantModules: true, certification: true },
    orderBy: { enrolledAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Participants" description="Active participant lifecycle and review state." />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Modules</th>
              <th className="px-4 py-3">Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant, index) => (
              <tr key={participant.id} className={index % 2 ? "bg-neutral-50" : "bg-white"}>
                <td className="px-4 py-3">
                  <Link href={`/admin/participants/${participant.id}`} className="font-medium text-navy-900">
                    {participant.user.name ?? participant.user.email}
                  </Link>
                  <p className="text-xs text-slate-500">{participant.user.email}</p>
                </td>
                <td className="px-4 py-3">{participant.tier}</td>
                <td className="px-4 py-3"><Badge status={participant.status}>{participant.status}</Badge></td>
                <td className="px-4 py-3">{participant.participantModules.filter((m) => m.status === "PASSED").length}/11 passed</td>
                <td className="px-4 py-3">{participant.enrolledAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
