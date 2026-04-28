import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { certificateLevelLabels } from "@/lib/utils";

export const metadata = { title: "Learning" };

export default async function AppLearningPage() {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");

  const [tracks, completions] = await Promise.all([
    prisma.learningTrack.findMany({
      where: { published: true },
      orderBy: [{ level: "asc" }, { order: "asc" }],
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: { _count: { select: { lessons: true } } },
        },
      },
    }),
    prisma.lessonCompletion.findMany({
      where: { professionalId: user.professionalId },
      select: { lessonId: true, lesson: { select: { module: { select: { trackId: true } } } } },
    }),
  ]);

  const completionsByTrack = new Map<string, number>();
  for (const c of completions) {
    const tid = c.lesson.module.trackId;
    completionsByTrack.set(tid, (completionsByTrack.get(tid) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <header>
        <Badge tone="primary"><BookOpen className="h-3 w-3" /> Learning</Badge>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Tracks for AI-adopted professionals</h1>
        <p className="text-muted-foreground">Each track maps to a certificate level and to scenario practice.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {tracks.map((t) => {
          const totalLessons = t.modules.reduce((acc, m) => acc + m._count.lessons, 0);
          const done = completionsByTrack.get(t.id) ?? 0;
          const pct = totalLessons === 0 ? 0 : Math.round((done / totalLessons) * 100);
          return (
            <Card key={t.id}>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge tone="accent">{certificateLevelLabels[t.level]}</Badge>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {t.estimatedHours}h
                  </span>
                </div>
                <p className="font-semibold text-lg">{t.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">{t.description}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{done}/{totalLessons} lessons</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} tone={pct === 100 ? "success" : "primary"} />
                </div>
                <Link href={`/learning/${t.slug}`} className="text-sm text-primary inline-flex items-center gap-1">
                  Open track <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
        {tracks.length === 0 ? <p className="text-sm text-muted-foreground">No tracks published yet.</p> : null}
      </div>
    </div>
  );
}
