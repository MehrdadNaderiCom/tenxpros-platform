import Link from "next/link";
import { ArrowRight, BookOpen, Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { certificateLevelLabels } from "@/lib/utils";

export const metadata = { title: "Learning System" };
export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const tracks = await prisma.learningTrack.findMany({
    where: { published: true },
    orderBy: [{ level: "asc" }, { order: "asc" }],
    include: { _count: { select: { modules: true } } },
  });

  return (
    <>
      <section className="container py-20 max-w-4xl space-y-6">
        <Badge tone="primary"><BookOpen className="h-3 w-3" /> Learning System</Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          Structured tracks, not a course dump.
        </h1>
        <p className="text-lg text-muted-foreground">
          Lessons exist to support real workflows and real assessments. Every track maps cleanly to a
          certificate level and to scenario-based practice — not just video time.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-up"><Button size="lg">Start learning <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="container py-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Tracks are being seeded. Check back shortly.</CardContent></Card>
          ) : (
            tracks.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge tone="accent">{certificateLevelLabels[t.level]}</Badge>
                    <span className="text-xs text-muted-foreground">{t.estimatedHours}h</span>
                  </div>
                  <p className="font-semibold text-lg leading-tight">{t.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" /> {t._count.modules} modules
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </>
  );
}
