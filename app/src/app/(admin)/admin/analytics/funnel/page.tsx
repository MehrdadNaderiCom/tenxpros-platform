import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";
import { applicationCounts, certificationCounts } from "@/lib/admin-metrics";

function pct(n: number, of: number): string {
  if (!of) return ", ";
  return `${Math.round((n / of) * 1000) / 10}%`;
}

export default async function FunnelPage() {
  const [apps, certs] = await Promise.all([applicationCounts(), certificationCounts()]);

  const applied = apps.total;
  const reviewed = applied - (apps.byKey["SUBMITTED"] ?? 0);
  const accepted = (apps.byKey["ACCEPTED"] ?? 0) + (apps.byKey["ENROLLED"] ?? 0);
  const enrolled = apps.byKey["ENROLLED"] ?? 0;
  const certified = certs.byKey["CERTIFIED"] ?? 0;

  const stages = [
    { label: "Applied", count: applied },
    { label: "Reviewed", count: reviewed },
    { label: "Accepted", count: accepted },
    { label: "Enrolled", count: enrolled },
    { label: "Certified", count: certified },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Conversion funnel" description="Application → review → acceptance → enrollment → certification." />
      <Link href="/admin/analytics" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to analytics
      </Link>

      <Card className="space-y-4">
        {stages.map((stage, index) => {
          const prev = index === 0 ? stage.count : stages[index - 1].count;
          const widthPct = applied ? Math.max((stage.count / applied) * 100, stage.count > 0 ? 4 : 0) : 0;
          return (
            <div key={stage.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-navy-900">{stage.label}</span>
                <span className="text-slate-600">
                  {stage.count}
                  <span className="ml-2 text-xs text-slate-400">
                    {pct(stage.count, applied)} of applied
                    {index > 0 ? ` · ${pct(stage.count, prev)} from previous` : ""}
                  </span>
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-navy-600" style={{ width: `${widthPct}%` }} />
              </div>
            </div>
          );
        })}
        {applied === 0 ? <p className="text-sm text-slate-500">No applications yet.</p> : null}
      </Card>

      <p className="text-xs text-slate-500">
        “Accepted” counts applications accepted at any point (including those later enrolled). “Reviewed” counts
        applications that moved past the initial submitted state.
      </p>
    </div>
  );
}
