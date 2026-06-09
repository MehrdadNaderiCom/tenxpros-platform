import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

const CERTIFIED_STATUSES = new Set(["CERTIFIED", "CONDITIONALLY_CERTIFIED"]);

export default async function CohortsPage() {
  const participants = await prisma.participantProfile.findMany({
    select: { enrolledAt: true, tier: true, status: true },
    orderBy: { enrolledAt: "desc" },
  });

  const cohorts = new Map<string, { count: number; tiers: Record<string, number>; certified: number }>();
  for (const participant of participants) {
    const key = participant.enrolledAt.toISOString().slice(0, 7); // YYYY-MM
    const entry = cohorts.get(key) ?? { count: 0, tiers: {}, certified: 0 };
    entry.count += 1;
    entry.tiers[participant.tier] = (entry.tiers[participant.tier] ?? 0) + 1;
    if (CERTIFIED_STATUSES.has(participant.status)) entry.certified += 1;
    cohorts.set(key, entry);
  }
  const rows = Array.from(cohorts.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div className="space-y-8">
      <PageHeader title="Cohorts" description="Enrolled participants grouped by enrollment month, with tier mix and certification progress." />
      <Link href="/admin/analytics" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to analytics
      </Link>

      {rows.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-navy-900 text-left text-white">
              <tr>
                <th className="px-4 py-3">Cohort (enrolled)</th>
                <th className="px-4 py-3">Participants</th>
                <th className="px-4 py-3">Tiers</th>
                <th className="px-4 py-3">Certified</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([month, entry], index) => (
                <tr key={month} className={index % 2 ? "bg-neutral-50" : "bg-white"}>
                  <td className="px-4 py-3 font-medium text-navy-900">{month}</td>
                  <td className="px-4 py-3">{entry.count}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {Object.entries(entry.tiers)
                      .map(([tier, n]) => `${tier} ${n}`)
                      .join(" · ")}
                  </td>
                  <td className="px-4 py-3">{entry.certified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState
          eyebrow="No cohorts"
          title="No participants have enrolled yet."
          description="Cohorts appear here once accepted applicants are enrolled. Each enrollment month forms a cohort."
          actionLabel="View participants"
          actionHref="/admin/participants"
        />
      )}
    </div>
  );
}
