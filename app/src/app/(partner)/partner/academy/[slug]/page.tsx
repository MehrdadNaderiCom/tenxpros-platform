import { notFound, redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/auth";
import { getModuleForLesson } from "@/lib/academy/queries";
import { markLessonRead } from "@/lib/actions/academy";
import { EXERCISE_MAX_ATTEMPTS } from "@/lib/academy/engine";
import { AudioReader } from "@/components/academy/audio-reader";
import { LessonReader } from "@/components/academy/lesson-reader";
import { TelemetryBeacon } from "@/components/academy/telemetry-beacon";
import { sanitizeLessonHtml } from "@/lib/academy/lesson-html";
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
  const { module: m, progress, attempts, unlocked, blockedBy, nextModule } = data;
  const preview = Boolean(current.preview);
  const neededCorrect = Math.ceil((m.passMark / 100) * m.examSize);

  if (!unlocked) {
    return (
      <div className="space-y-6">
        <PageHeader title={m.title} description={`Module ${m.order}`} />
        <Card>
          <p className="text-sm text-slate-600">
            This module is locked. It opens the moment you pass the
            {blockedBy
              ? ` Module ${blockedBy.order} (${blockedBy.title}) exam with ${blockedBy.neededCorrect} of ${blockedBy.examSize} answers correct (${blockedBy.passMark}%)`
              : " previous module's exam"}
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {blockedBy ? (
              <ButtonLink href={`/partner/academy/${blockedBy.slug}`} size="sm">
                Go to Module {blockedBy.order}
              </ButtonLink>
            ) : null}
            <ButtonLink href="/partner/academy" variant="secondary" size="sm">Back to the Academy</ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  const lesson = m.lessons[0];
  const lessonHtml = lesson?.bodyHtml ? sanitizeLessonHtml(lesson.bodyHtml) : null;
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

  const steps: Array<{ label: string; done: boolean; active: boolean }> = m.isInformational
    ? []
    : [
        { label: "Read the lesson", done: lessonRead, active: !lessonRead },
        { label: `Work the ${m.questions.length} exercises`, done: exercisesDone, active: lessonRead && !exercisesDone },
        {
          label: `Pass the exam (${neededCorrect} of ${m.examSize} correct)`,
          done: examPassed,
          active: canExam,
        },
      ];

  return (
    <div className="space-y-8">
      <TelemetryBeacon slug={m.slug} disabled={preview} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title={m.title}
          description={`${m.isInformational ? "Reference" : `Module ${m.order}`} ${String.fromCharCode(183)} ${m.summary}`}
        />
        <ButtonLink href="/partner/academy" variant="secondary" size="sm">All modules</ButtonLink>
      </div>

      {preview ? (
        <Alert tone="warning">
          Admin preview, read-only. Lesson progress, exercises, and the exam are disabled here.
        </Alert>
      ) : null}

      {steps.length > 0 ? (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your path through this module</p>
          <ol className="mt-3 grid gap-2 md:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.label}
                className={`rounded-md border p-3 text-sm ${
                  s.done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : s.active
                      ? "border-navy-300 bg-navy-50 font-medium text-navy-900"
                      : "border-neutral-200 bg-neutral-50 text-slate-500"
                }`}
              >
                {i + 1}. {s.label} {s.done ? String.fromCharCode(10003) : ""}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            The module is complete only when its exam is passed; that is also what unlocks
            {nextModule ? ` Module ${nextModule.order} (${nextModule.title})` : " the comprehensive final exam"}. Reading alone
            does not complete it, and a failed exam can always be retaken after a short cooldown.
          </p>
        </Card>
      ) : null}

      {examPassed && nextModule ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-emerald-200 bg-emerald-50">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Module complete</p>
            <p className="mt-1 text-sm text-slate-700">
              Well done. Module {nextModule.order} ({nextModule.title}) is now unlocked.
            </p>
          </div>
          <ButtonLink href={`/partner/academy/${nextModule.slug}`}>Continue to Module {nextModule.order}</ButtonLink>
        </Card>
      ) : null}

      <AudioReader text={lesson?.audioText ?? ""} />

      <Card>
        <LessonReader paragraphs={paragraphs} html={lessonHtml} />
        {!preview && !lessonRead ? (
          <form action={markLessonRead} className="mt-6 border-t border-neutral-200 pt-5">
            <input type="hidden" name="slug" value={m.slug} />
            <p className="mb-3 text-sm text-slate-600">When you have read the full lesson, mark it complete to open the exercises and the module exam.</p>
            <Button type="submit">I have read this lesson</Button>
          </form>
        ) : lessonRead ? (
          <p className="mt-6 border-t border-neutral-200 pt-5 text-sm font-medium text-emerald-700">
            Lesson read.{!m.isInformational && !examPassed ? " Next: work the exercises below, then pass the module exam." : ""}
          </p>
        ) : null}
      </Card>

      {m.isInformational ? (
        <Card>
          <p className="text-sm text-slate-600">
            This is an informational module. There is no exam here, and reading it is never required to earn your certificate.
          </p>
        </Card>
      ) : (
        <>
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
              <h2 className="text-lg font-semibold text-navy-900">Module exam</h2>
              <p className="mt-1 text-sm text-slate-600">
                {examPassed
                  ? `Passed with ${progress?.bestExamScore ?? 0}%.`
                  : `One sitting, ${m.examSize} questions, ${m.passMark}% to pass (${neededCorrect} of ${m.examSize} correct). Passing it completes this module and unlocks ${nextModule ? "the next one" : "the comprehensive final exam"}.`}
              </p>
            </div>
            {examPassed ? (
              <span className="text-sm font-medium text-emerald-700">Module complete</span>
            ) : canExam && !preview ? (
              <ButtonLink href={`/partner/academy/${m.slug}/exam`}>Start module exam</ButtonLink>
            ) : (
              <span className="text-sm text-slate-500">{lessonRead ? "Finish the exercises" : "Read the lesson"} to unlock the exam.</span>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
