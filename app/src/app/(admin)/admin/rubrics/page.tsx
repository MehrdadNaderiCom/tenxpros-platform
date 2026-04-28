import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Rubrics" };

export default async function AdminRubricsPage() {
  const rubrics = await prisma.rubric.findMany({
    include: { criteria: true, scenarios: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Rubrics</h1>
      <p className="text-muted-foreground text-sm">Reviewers grade scenario submissions against these rubrics.</p>
      <div className="grid gap-4">
        {rubrics.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-6 space-y-3">
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </div>
              <ul className="text-sm space-y-1">
                {r.criteria.map((c) => (
                  <li key={c.id} className="rounded-md border border-border p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.title}</span>
                      <Badge tone="muted">weight {c.weight}</Badge>
                    </div>
                    <p className="text-muted-foreground">{c.description}</p>
                  </li>
                ))}
              </ul>
              {r.scenarios.length > 0 ? (
                <p className="text-xs text-muted-foreground">Used in {r.scenarios.length} scenario(s)</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {rubrics.length === 0 ? <p className="text-sm text-muted-foreground">No rubrics yet.</p> : null}
      </div>
    </div>
  );
}
