import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { certificateLevelLabels } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");

  const track = await prisma.learningTrack.findUnique({
    where: { slug: params.slug },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!track) notFound();

  const completedIds = await prisma.lessonCompletion.findMany({
    where: { professionalId: user.professionalId },
    select: { lessonId: true },
  });
  const done = new Set(completedIds.map((c) => c.lessonId));

  return (
    <div className="space-y-6">
      <Link href="/learning" className="text-sm text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> All tracks
      </Link>
      <header className="space-y-2">
        <Badge tone="accent">{certificateLevelLabels[track.level]}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">{track.title}</h1>
        <p className="text-muted-foreground max-w-2xl">{track.description}</p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> ~{track.estimatedHours}h · {track.modules.length} modules
        </p>
      </header>

      <div className="space-y-4">
        {track.modules.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{m.title}</p>
                <span className="text-xs text-muted-foreground">{m.estimatedMinutes} min</span>
              </div>
              <p className="text-sm text-muted-foreground">{m.description}</p>
              <ul className="divide-y divide-border border border-border rounded-md">
                {m.lessons.map((l) => (
                  <li key={l.id} className="flex items-center justify-between p-3 text-sm">
                    <span className="flex items-center gap-2">
                      {done.has(l.id) ? (
                        <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{l.title}</span>
                      {l.required ? <Badge tone="muted">required</Badge> : null}
                    </span>
                    <Link href={`/learning/${track.slug}/${l.slug}`} className="text-primary text-xs">
                      {done.has(l.id) ? "Review" : "Open"}
                    </Link>
                  </li>
                ))}
                {m.lessons.length === 0 ? <li className="p-3 text-sm text-muted-foreground">No lessons yet.</li> : null}
              </ul>
            </CardContent>
          </Card>
        ))}
        {track.modules.length === 0 ? <p className="text-sm text-muted-foreground">No modules yet.</p> : null}
      </div>
    </div>
  );
}
