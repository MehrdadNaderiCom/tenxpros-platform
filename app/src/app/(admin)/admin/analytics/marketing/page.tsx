import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

const CONVERTED = new Set(["ACCEPTED", "ENROLLED"]);

function pct(n: number, of: number): string {
  if (!of) return "—";
  return `${Math.round((n / of) * 1000) / 10}%`;
}

export default async function MarketingAttributionPage() {
  const applications = await prisma.application.findMany({
    select: { utmSource: true, utmMedium: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const bySource = new Map<string, { apps: number; converted: number }>();
  for (const app of applications) {
    const source = (app.utmSource?.trim() || "Direct / none") + (app.utmMedium ? ` · ${app.utmMedium}` : "");
    const entry = bySource.get(source) ?? { apps: 0, converted: 0 };
    entry.apps += 1;
    if (CONVERTED.has(app.status)) entry.converted += 1;
    bySource.set(source, entry);
  }
  const rows = Array.from(bySource.entries()).sort((a, b) => b[1].apps - a[1].apps);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Marketing attribution"
        description="Where applications come from, by captured UTM source/medium, with how many converted (accepted or enrolled). Read-only analytics over existing data."
      />
      <Link href="/admin/analytics" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to analytics
      </Link>

      {applications.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-navy-900 text-left text-white">
              <tr>
                <th className="px-4 py-3">Source · medium</th>
                <th className="px-4 py-3">Applications</th>
                <th className="px-4 py-3">Converted</th>
                <th className="px-4 py-3">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([source, entry], index) => (
                <tr key={source} className={index % 2 ? "bg-neutral-50" : "bg-white"}>
                  <td className="px-4 py-3 font-medium text-navy-900">{source}</td>
                  <td className="px-4 py-3">{entry.apps}</td>
                  <td className="px-4 py-3">{entry.converted}</td>
                  <td className="px-4 py-3 text-slate-600">{pct(entry.converted, entry.apps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState
          eyebrow="No attribution data"
          title="No applications to attribute yet."
          description="UTM source/medium is captured automatically on each application. Attribution appears here as applications arrive."
          actionLabel="View applications"
          actionHref="/admin/applications"
        />
      )}
    </div>
  );
}
