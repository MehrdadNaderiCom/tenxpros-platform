import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { certificateLevelLabels } from "@/lib/utils";

export const metadata = { title: "Scenarios" };

export default async function AdminScenariosPage() {
  const scenarios = await prisma.scenario.findMany({
    orderBy: { createdAt: "desc" },
    include: { rubric: true, _count: { select: { submissions: true } } },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Scenarios</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {scenarios.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge tone="accent">{certificateLevelLabels[s.certificateLevel].split(" · ")[0]}</Badge>
                <Badge tone="muted">{s._count.submissions} submissions</Badge>
              </div>
              <p className="font-semibold">{s.title}</p>
              {s.rubric ? <p className="text-xs text-muted-foreground">Rubric: {s.rubric.title}</p> : null}
              <p className="text-sm text-muted-foreground line-clamp-2">{s.prompt}</p>
              <Link href={`/scenarios/${s.id}`} className="text-xs text-primary">Open as professional</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
