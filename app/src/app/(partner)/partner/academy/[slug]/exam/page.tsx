import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/auth";
import { prisma } from "@/lib/prisma";
import { startOrResumeExam } from "@/lib/actions/academy";
import { getSubmittedSittingReviews } from "@/lib/academy/queries";
import { ExamPlayer } from "@/components/academy/exam-player";
import { ExamReviewList } from "@/components/academy/exam-review";
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
    // No sitting is open here, so past submitted sittings are safe to review.
    const pastSittings = await getSubmittedSittingReviews(current.partner.id, { moduleSlug: params.slug });
    return (
      <div className="space-y-6">
        <PageHeader title="Module exam" description="" />
        <Card>
          <p className="text-sm text-slate-600">{(REASONS[result.reason] ?? "This exam is not available right now.") + cooldownNote}</p>
          <ButtonLink href={`/partner/academy/${params.slug}`} variant="secondary" size="sm" className="mt-4">Back to the lesson</ButtonLink>
        </Card>
        <ExamReviewList sittings={pastSittings} />
      </div>
    );
  }

  // On a pass, send the partner straight to the module that just unlocked.
  const currentModule = await prisma.academyModule.findFirst({ where: { slug: params.slug }, select: { order: true } });
  const nextModule = currentModule
    ? await prisma.academyModule.findFirst({
        where: { order: { gt: currentModule.order }, isPublished: true, isInformational: false },
        orderBy: { order: "asc" },
        select: { order: true, slug: true },
      })
    : null;
  const neededCorrect = Math.ceil((result.passMark / 100) * result.questions.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module exam"
        description={`One sitting, ${result.questions.length} questions, ${result.passMark}% to pass (${neededCorrect} of ${result.questions.length} correct). ${nextModule ? "Passing unlocks the next module." : "Passing completes the last module and unlocks the comprehensive final exam."} Answers are shown only after you submit.`}
      />
      <ExamPlayer
        sittingId={result.sittingId}
        questions={result.questions}
        passMark={result.passMark}
        failHref={`/partner/academy/${params.slug}`}
        passHref={nextModule ? `/partner/academy/${nextModule.slug}` : "/partner/academy"}
        passLabel={nextModule ? `Continue to Module ${nextModule.order}` : "Back to the Academy"}
      />
    </div>
  );
}
