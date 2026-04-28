import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { evaluateAllLevels } from "@/lib/certification/eligibility";
import { certificateLevelLabels, formatDate } from "@/lib/utils";
import { requestCertificateAction } from "./actions";

export const metadata = { title: "Certificates" };

export default async function CertificatesPage({ searchParams }: { searchParams?: { saved?: string; err?: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");

  const [profile, latestDiagnostic, taskCount, classifiedCount, evidenceCount, scenarioCount, lessonCount, certs] = await Promise.all([
    prisma.professionalProfile.findUnique({ where: { id: user.professionalId } }),
    prisma.aIReadinessDiagnostic.findFirst({ where: { professionalId: user.professionalId }, orderBy: { createdAt: "desc" } }),
    prisma.professionalTask.count({ where: { professionalId: user.professionalId } }),
    prisma.taskAIClassification.count({ where: { task: { professionalId: user.professionalId } } }),
    prisma.evidenceArtifact.count({ where: { professionalId: user.professionalId } }),
    prisma.scenarioSubmission.count({ where: { professionalId: user.professionalId } }),
    prisma.lessonCompletion.count({ where: { professionalId: user.professionalId } }),
    prisma.certificate.findMany({ where: { professionalId: user.professionalId }, orderBy: { createdAt: "desc" } }),
  ]);
  void profile;

  const eligibility = evaluateAllLevels({
    diagnosticCompleted: !!latestDiagnostic,
    basicLiteracyModulesCompleted: lessonCount >= 1 ? 1 : 0,
    rolePathModulesCompleted: lessonCount,
    advancedScenariosCompleted: scenarioCount,
    tasksMapped: taskCount,
    tasksClassified: classifiedCount,
    evidenceCount,
    scenariosCompleted: scenarioCount,
    workflowsBuilt: 0,
    outputQualityEvidence: evidenceCount > 0,
    riskAwarenessPassed: !!latestDiagnostic && (latestDiagnostic.riskAwareness ?? 0) >= 3,
    reviewerApproved: certs.some((c) => c.status === "ISSUED"),
    productivityImprovementEvidence: false,
    implementationDesignSubmitted: false,
    oversightDemonstrated: evidenceCount >= 2,
    teamAdoptionPlan: false,
    enablementMaterials: false,
    governanceScenario: false,
    guidedOthersEvidence: false,
    leadershipEvidence: false,
  });

  const pendingByLevel = new Set(certs.filter((c) => c.status === "PENDING_REVIEW" || c.status === "DRAFT").map((c) => c.level));

  return (
    <div className="space-y-6">
      <header>
        <Badge tone="primary"><BadgeCheck className="h-3 w-3" /> Certification</Badge>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Your certificate progression</h1>
        <p className="text-muted-foreground">All TenXPros certificates require human reviewer approval after eligibility is met.</p>
      </header>

      {searchParams?.saved ? <Alert tone="success" title="Submitted for review">A reviewer will look at your evidence and decide.</Alert> : null}
      {searchParams?.err ? <Alert tone="danger" title="Could not submit">{decodeURIComponent(searchParams.err)}</Alert> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {eligibility.map((e) => {
          const issued = certs.find((c) => c.level === e.level && c.status === "ISSUED");
          const pending = pendingByLevel.has(e.level);
          const pct = Math.round((e.satisfied / e.total) * 100);
          return (
            <Card key={e.level}>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge tone="accent">{certificateLevelLabels[e.level]}</Badge>
                  {issued ? <Badge tone="success">Issued · {formatDate(issued.issuedAt)}</Badge> : pending ? <Badge tone="warning">Pending review</Badge> : null}
                </div>
                <Progress value={pct} tone={pct === 100 ? "success" : "primary"} />
                <p className="text-xs text-muted-foreground">{e.satisfied}/{e.total} requirements met</p>
                <ul className="text-sm space-y-1">
                  {e.checks.map((c) => (
                    <li key={c.key} className="flex items-start gap-2">
                      <span className={c.satisfied ? "text-[hsl(var(--success))]" : "text-muted-foreground"}>{c.satisfied ? "✓" : "○"}</span>
                      <span className={c.satisfied ? "" : "text-muted-foreground"}>{c.label}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between pt-2">
                  {issued ? (
                    <Link href={`/verify/${issued.publicId}`} className="text-sm text-primary inline-flex items-center gap-1">
                      Open verification page
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Eligibility is auto-tracked.</span>
                  )}
                  {!issued && !pending && e.ready ? (
                    <form action={requestCertificateAction.bind(null, e.level)}>
                      <Button size="sm" type="submit">Submit for review</Button>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardContent className="p-6 text-xs text-muted-foreground">
          A TenXPros certificate verifies completion and evidence review within the TenXPros framework.
          It does not represent external accreditation unless explicitly stated.
        </CardContent>
      </Card>
    </div>
  );
}
