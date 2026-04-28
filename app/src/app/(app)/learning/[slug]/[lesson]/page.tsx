import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { completeLessonAction } from "./actions";
import { certificateLevelLabels } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: { slug: string; lesson: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");

  const lesson = await prisma.lesson.findFirst({
    where: { slug: params.lesson, module: { track: { slug: params.slug } } },
    include: {
      module: { include: { track: true } },
      practiceTasks: true,
      scenarios: true,
    },
  });
  if (!lesson) notFound();

  const completion = await prisma.lessonCompletion.findUnique({
    where: { lessonId_professionalId: { lessonId: lesson.id, professionalId: user.professionalId } },
  });

  return (
    <div className="space-y-6">
      <Link href={`/learning/${lesson.module.track.slug}`} className="text-sm text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to track
      </Link>

      <header className="space-y-2">
        <Badge tone="accent">{certificateLevelLabels[lesson.certificateLevel]}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="text-muted-foreground">{lesson.description}</p>
      </header>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Learning objectives</p>
            <ul className="text-sm space-y-1">
              {lesson.objectives.map((o, i) => (
                <li key={i} className="flex gap-2"><BookOpen className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span>{o}</span></li>
              ))}
            </ul>
          </div>
          <article className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
            {lesson.body}
          </article>
        </CardContent>
      </Card>

      {lesson.practiceTasks.length > 0 ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Practice tasks</p>
            <ul className="space-y-2 text-sm">
              {lesson.practiceTasks.map((p) => (
                <li key={p.id} className="rounded-md border border-border p-3">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-muted-foreground">{p.description}</p>
                  <p className="text-xs text-accent mt-1">Deliverable: {p.expectedDeliverable}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {lesson.scenarios.length > 0 ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Linked scenarios</p>
            <ul className="space-y-2 text-sm">
              {lesson.scenarios.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <span>{s.title}</span>
                  <Link href={`/scenarios/${s.id}`} className="text-primary text-xs">Open scenario</Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {completion ? (
          <p className="text-sm text-[hsl(var(--success))] inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Lesson marked complete on {completion.completedAt.toDateString()}
          </p>
        ) : (
          <form action={completeLessonAction.bind(null, lesson.id, lesson.module.track.slug, lesson.slug)}>
            <Button type="submit">Mark as complete</Button>
          </form>
        )}
      </div>
    </div>
  );
}
