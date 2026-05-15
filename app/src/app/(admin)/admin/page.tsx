import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function AdminDashboardPage() {
  const [applications, participants, openTickets, submittedModules, submittedDossierSections, certifications, events] =
    await Promise.all([
      prisma.application.count(),
      prisma.participantProfile.count(),
      prisma.ticket.count({ where: { status: { in: ["OPEN", "WAITING_RESPONSE"] } } }),
      prisma.participantModule.count({ where: { status: "SUBMITTED" } }),
      prisma.dossierSection.count({ where: { status: "SUBMITTED" } }),
      prisma.certificationReview.count(),
      prisma.siteEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Admin Dashboard" description="Operational view of applications, participants, reviews, support, and events." />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Applications", applications],
          ["Participants", participants],
          ["Open tickets", openTickets],
          ["Module submissions", submittedModules],
          ["Dossier reviews", submittedDossierSections],
          ["Certifications", certifications],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-navy-900">{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="text-xl font-semibold text-navy-900">Recent events</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          {events.map((event) => (
            <p key={event.id}>
              {event.eventType} · {event.createdAt.toLocaleString()}
            </p>
          ))}
          {events.length === 0 ? <p>No events yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
