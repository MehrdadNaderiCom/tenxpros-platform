import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";
import { ButtonLink } from "@/components/ui/button";

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
  const todayActions = [
    ["Review applications", applications, "/admin/applications"],
    ["Check tickets", openTickets, "/admin/tickets"],
    ["Review modules", submittedModules, "/admin/modules"],
    ["Review dossier sections", submittedDossierSections, "/admin/dossiers"],
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Admin Dashboard" description="Operational view of applications, participants, reviews, support, and events." />
      <Card className="bg-navy-900 text-white">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-200">Today's actions</p>
            <h2 className="mt-2 text-2xl font-semibold">Start with the queues that unblock people.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Applications, support, submitted module artifacts, and dossier sections are the launch-critical founder workflow.
            </p>
          </div>
          <ButtonLink href="/admin/applications" variant="secondary">
            Open applications
          </ButtonLink>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {todayActions.map(([label, value, href]) => (
            <a key={label} href={href as string} className="rounded-md border border-white/15 bg-white/10 p-4 transition hover:bg-white/15">
              <p className="text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-sm text-slate-200">{label}</p>
            </a>
          ))}
        </div>
      </Card>
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
          {events.length === 0 ? (
            <p>No recent events yet. Application submissions, enrollments, reviews, tickets, and certification decisions will appear here.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
