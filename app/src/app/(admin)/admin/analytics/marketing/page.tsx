import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Table, THead, Th, TBody, TR, Td } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

const CONVERTED = new Set(["ACCEPTED", "ENROLLED"]);

function pct(n: number, of: number): string {
  if (!of) return ", ";
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
          <Table minWidth="min-w-[640px]">
            <THead>
              <Th>Source · medium</Th>
              <Th>Applications</Th>
              <Th>Converted</Th>
              <Th>Conversion</Th>
            </THead>
            <TBody>
              {rows.map(([source, entry], index) => (
                <TR key={source} className={index % 2 ? "bg-neutral-50" : "bg-white"}>
                  <Td className="font-medium text-navy-900">{source}</Td>
                  <Td>{entry.apps}</Td>
                  <Td>{entry.converted}</Td>
                  <Td className="text-slate-600">{pct(entry.converted, entry.apps)}</Td>
                </TR>
              ))}
            </TBody>
          </Table>
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
