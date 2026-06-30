import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, TBody, TR, Td } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

export default async function ParticipantsPage() {
  const participants = await prisma.participantProfile.findMany({
    include: { user: true, participantModules: true, certification: true },
    orderBy: { enrolledAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Participants" description="Active participant lifecycle and review state." />
      <Table minWidth="min-w-[820px]">
        <THead>
          <Th>Participant</Th>
          <Th>Tier</Th>
          <Th>Status</Th>
          <Th>Modules</Th>
          <Th>Enrolled</Th>
          <Th className="text-right">Portal</Th>
        </THead>
        <TBody>
          {participants.map((participant) => (
            <TR key={participant.id}>
              <Td>
                <Link href={`/admin/participants/${participant.id}`} className="font-medium text-navy-900">
                  {participant.user.name ?? participant.user.email}
                </Link>
                <p className="text-xs text-slate-500">{participant.user.email}</p>
              </Td>
              <Td>{participant.tier}</Td>
              <Td><Badge status={participant.status}>{participant.status}</Badge></Td>
              <Td>{participant.participantModules.filter((m) => m.status === "PASSED").length}/11 passed</Td>
              <Td>{participant.enrolledAt.toLocaleDateString()}</Td>
              <Td className="text-right">
                <a
                  href={`/admin/impersonate/participant/${participant.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-500 hover:text-navy-700 hover:underline"
                >
                  Open portal
                </a>
              </Td>
            </TR>
          ))}
        </TBody>
      </Table>
      {participants.length === 0 ? (
        <EmptyState
          eyebrow="No participants"
          title="Enrollment has not started yet."
          description="Accepted applicants become participants only after manual payment confirmation and enrollment."
          actionLabel="Review applications"
          actionHref="/admin/applications"
        />
      ) : null}
    </div>
  );
}
