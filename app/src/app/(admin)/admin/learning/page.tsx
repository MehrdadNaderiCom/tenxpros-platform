import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { certificateLevelLabels } from "@/lib/utils";

export const metadata = { title: "Learning content" };

export default async function AdminLearningPage() {
  const tracks = await prisma.learningTrack.findMany({
    orderBy: [{ level: "asc" }, { order: "asc" }],
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { _count: { select: { lessons: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Learning content</h1>
        <p className="text-muted-foreground">Tracks and modules. Lesson editing is intentionally minimal here for now — content is seeded.</p>
      </header>

      <div className="grid gap-4">
        {tracks.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.slug}</p>
                </div>
                <Badge tone="accent">{certificateLevelLabels[t.level]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <ul className="text-sm divide-y divide-border border border-border rounded-md mt-2">
                {t.modules.map((m) => (
                  <li key={m.id} className="p-3 flex items-center justify-between">
                    <span className="font-medium">{m.title}</span>
                    <span className="text-xs text-muted-foreground">{m._count.lessons} lessons · {m.estimatedMinutes} min</span>
                  </li>
                ))}
              </ul>
              <Link href={`/learning/${t.slug}`} className="text-xs text-primary">View as professional</Link>
            </CardContent>
          </Card>
        ))}
        {tracks.length === 0 ? <p className="text-sm text-muted-foreground">No tracks yet.</p> : null}
      </div>
    </div>
  );
}
