import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPartner } from "@/lib/partner/auth";
import { getModuleForLesson } from "@/lib/academy/queries";
import { markLessonRead } from "@/lib/actions/academy";
import { EXERCISE_MAX_ATTEMPTS } from "@/lib/academy/engine";
import { AudioReader } from "@/components/academy/audio-reader";
import { LessonReader } from "@/components/academy/lesson-reader";
import { ExercisePlayer } from "@/components/academy/exercise-player";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: { slug: string } }) {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");
  const data = await getModuleForLesson(current.partner.id, params.slug);
  if (!data) notFound();
  const { module: m, progress, attempts, unlocked } = data;
  const preview = Boolean(current.preview);

  if (!unlocked) {
    return (
      <div className="space-y-6">
        <PageHeader title={m.title} description={`Module ${m.order}`} />
        <Card>
          <p className="text-sm text-slate-600">This module is locked. Pass the previous module to unlock it.</p>
          <ButtonLink href="/partner/academy" variant="secondary" size="sm" className="mt-4">Back to the Academy</ButtonLink>
        </Card>
      </div>
    );
  }

  const lesson = m.lessons[0];
  const paragraphs = lesson ? lesson.body.split("\n\n") : [];

  // Exercise completion from recorded attempts.
  const byQuestion = new Map<string, { count: number; anyCorrect: boolean }>();
  for (const a of attempts) {
    const cur = byQuestion.get(a.questionId) ?? { count: 0, anyCorrect: false };
    cur.count += 1;
    cur.anyCorrect = cur.anyCorrect || a.correct;
    byQuestion.set(a.questionId, cur);
  }
  const isCompleted = (qid: string) => {
    const s = byQuestion.get(qid);
    return Boolean(s && (s.anyCorrect || s.count >= EXERCISE_MAX_ATTEMPTS));
  };

  const lessonRead = Boolean(progress?.lessonReadAt);
  const exercisesDone = m.questions.every((q) => isCompleted(q.id));
  const examPassed = Boolean(progress?.examPassed);
  const canExam = lessonRead && exercisesDone && !examPassed;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={m.title} description={`Module ${m.order} ${String.fromCharCode(183)} ${m.summary}`} />
        <ButtonLink href="/partner/academy" variant="secondary" size="sm">All modules</ButtonLink>
      </div>

      {preview ? (
        <Alert tone="warning">
          Admin preview, read-only. Lesson progress, exercises, and the exam are disabled here.
        </Alert>
      ) : null}

      <AudioReader text={lesson?.audioText ?? ""} />

      <Card>
        <LessonReader paragraphs={paragraphs} />
        {!preview && !lessonRead ? (
          <form action={markLessonRead} className="mt-6 border-t border-neutral-200 pt-5">
            <input type="hidden" name="slug" value={m.slug} />
            <p className="mb-3 text-sm text-slate-600">When you have read the full lesson, mark it complete to open the exercises and the final exam.</p>
            <Button type="submit">I have read this lesson</Button>
          </form>
        ) : lessonRead ? (
          <p className="mt-6 border-t border-neutral-200 pt-5 text-sm font-medium text-emerald-700">Lesson read.</p>
        ) : null}
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy-900">Exercises</h2>
        <p className="text-sm text-slate-600">
          Each exercise gives {EXERCISE_MAX_ATTEMPTS} attempts. They teach, they never block: after the final attempt the answer and explanation are shown so you can move on.
        </p>
        {preview ? (
          <Card><p className="text-sm text-slate-500">Exercises are interactive for partners. They are not available in admin preview.</p></Card>
        ) : (
          m.questions.map((q, i) => (
            <ExercisePlayer
              key={q.id}
              index={i + 1}
              question={{ id: q.id, stem: q.stem, options: q.options as string[] }}
              initialCompleted={isCompleted(q.id)}
            />
          ))
        )}
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Final exam</h2>
          <p className="mt-1 text-sm text-slate-600">
            {examPassed
              ? `Passed with ${progress?.bestExamScore ?? 0}%.`
              : `One sitting, ${m.examSize} questions, ${m.passMark}% to pass. Open it once the lesson is read and every exercise is done.`}
          </p>
        </div>
        {examPassed ? (
          <span className="text-sm font-medium text-emerald-700">Module complete</span>
        ) : canExam && !preview ? (
          <ButtonLink href={`/partner/academy/${m.slug}/exam`}>Start final exam</ButtonLink>
        ) : (
          <span className="text-sm text-slate-500">{lessonRead ? "Finish the exercises" : "Read the lesson"} to unlock the exam.</span>
        )}
      </Card>
    </div>
  );
}
