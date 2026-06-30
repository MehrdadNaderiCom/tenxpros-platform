import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/auth";
import { startOrResumeExam } from "@/lib/actions/academy";
import { ExamPlayer } from "@/components/academy/exam-player";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  already_passed: "You have already passed this module.",
  not_ready: "Read the lesson and complete every exercise before the exam opens.",
  locked: "This module is locked. Pass the previous module first.",
  cooldown: "This module is on a short cooldown after a failed attempt. Revisit the lesson and exercises, then come back.",
};

export default async function ExamPage({ params }: { params: { slug: string } }) {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  if (current.preview) {
    return (
      <div className="space-y-6">
        <PageHeader title="Module exam" description="Admin preview" />
        <Card>
          <p className="text-sm text-slate-600">Exams are taken by partners. They are not available in admin preview.</p>
          <ButtonLink href={`/partner/academy/${params.slug}`} variant="secondary" size="sm" className="mt-4">Back to the lesson</ButtonLink>
        </Card>
      </div>
    );
  }

  const result = await startOrResumeExam(params.slug);
  if (!result.ok) {
    const cooldownNote =
      result.reason === "cooldown" && result.lockedUntil
        ? ` Available again after ${new Date(result.lockedUntil).toLocaleString()}.`
        : "";
    return (
      <div className="space-y-6">
        <PageHeader title="Module exam" description="" />
        <Card>
          <p className="text-sm text-slate-600">{(REASONS[result.reason] ?? "This exam is not available right now.") + cooldownNote}</p>
          <ButtonLink href={`/partner/academy/${params.slug}`} variant="secondary" size="sm" className="mt-4">Back to the lesson</ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module exam"
        description={`One sitting, ${result.questions.length} questions, ${result.passMark}% to pass. Answers are shown only after you submit.`}
      />
      <ExamPlayer sittingId={result.sittingId} questions={result.questions} passMark={result.passMark} failHref={`/partner/academy/${params.slug}`} />
    </div>
  );
}
