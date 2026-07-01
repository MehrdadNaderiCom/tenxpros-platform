import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/auth";
import { startOrResumeFinalExam } from "@/lib/actions/academy";
import { submitFinalExam } from "@/lib/actions/academy";
import { ExamPlayer } from "@/components/academy/exam-player";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  already_passed: "You have already passed the final exam. Your certificate has been issued.",
  not_ready: "The final exam opens once you have passed every module exam. Finish the modules first.",
  cooldown: "The final exam is on a short cooldown after a failed attempt. Review your weaker modules, then come back.",
};

export default async function FinalExamPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  if (current.preview) {
    return (
      <div className="space-y-6">
        <PageHeader title="Final exam" description="Admin preview" />
        <Card>
          <p className="text-sm text-slate-600">The final exam is taken by partners. It is not available in admin preview.</p>
          <ButtonLink href="/partner/academy" variant="secondary" size="sm" className="mt-4">Back to the Academy</ButtonLink>
        </Card>
      </div>
    );
  }

  const result = await startOrResumeFinalExam();
  if (!result.ok) {
    const passed = result.reason === "already_passed";
    const cooldownNote =
      result.reason === "cooldown" && result.lockedUntil
        ? ` Available again after ${new Date(result.lockedUntil).toLocaleString()}.`
        : "";
    return (
      <div className="space-y-6">
        <PageHeader title="Final exam" description="The comprehensive exam that earns your Partner Academy certificate." />
        <Alert tone={passed ? "success" : "info"}>{(REASONS[result.reason] ?? "The final exam is not available right now.") + cooldownNote}</Alert>
        <ButtonLink href={passed ? "/partner/academy/certificate" : "/partner/academy"} variant="secondary" size="sm">
          {passed ? "View your certificate" : "Back to the Academy"}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Final exam"
        description={`One sitting, ${result.questions.length} questions drawn from across every module exam, ${result.passMark}% to pass. Answers are shown only after you submit. Passing issues your certificate.`}
      />
      <ExamPlayer
        sittingId={result.sittingId}
        questions={result.questions}
        passMark={result.passMark}
        submitAction={submitFinalExam}
        passHref="/partner/academy/certificate"
        passLabel="View your certificate"
        failHref="/partner/academy"
        failLabel="Back to the Academy"
        completionMessage="You passed the comprehensive final exam. Your Partner Academy certificate has been issued."
      />
    </div>
  );
}
