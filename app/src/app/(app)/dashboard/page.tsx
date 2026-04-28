import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, BookOpen, ClipboardList, FileCheck, Sparkles, Target, Workflow } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { evaluateAllLevels } from "@/lib/certification/eligibility";
import { certificateLevelLabels } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.professionalId) redirect("/profile");

  const [profile, latestDiagnostic, taskCount, classifiedCount, evidenceCount, scenarioCount, lessonCount, certificates] = await Promise.all([
    prisma.professionalProfile.findUnique({ where: { id: user.professionalId } }),
    prisma.aIReadinessDiagnostic.findFirst({
      where: { professionalId: user.professionalId },
      orderBy: { createdAt: "desc" },
      include: { reports: true },
    }),
    prisma.professionalTask.count({ where: { professionalId: user.professionalId } }),
    prisma.taskAIClassification.count({ where: { task: { professionalId: user.professionalId } } }),
    prisma.evidenceArtifact.count({ where: { professionalId: user.professionalId } }),
    prisma.scenarioSubmission.count({ where: { professionalId: user.professionalId } }),
    prisma.lessonCompletion.count({ where: { professionalId: user.professionalId } }),
    prisma.certificate.findMany({
      where: { professionalId: user.professionalId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const profileFields: Array<string | number | null | undefined> = [
    profile?.headline,
    profile?.currentRole,
    profile?.targetRole,
    profile?.industry,
    profile?.location,
    profile?.skills?.length ?? 0,
    profile?.aiToolsUsed?.length ?? 0,
    profile?.linkedinUrl,
    profile?.resumeUrl,
    profile?.careerGoals,
  ];
  const filled = profileFields.filter((v) =>
    typeof v === "number" ? v > 0 : Boolean(v),
  ).length;
  const profileCompleteness = Math.round((filled / profileFields.length) * 100);

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
    reviewerApproved: certificates.some((c) => c.status === "ISSUED"),
    productivityImprovementEvidence: false,
    implementationDesignSubmitted: false,
    oversightDemonstrated: evidenceCount >= 2,
    teamAdoptionPlan: false,
    enablementMaterials: false,
    governanceScenario: false,
    guidedOthersEvidence: false,
    leadershipEvidence: false,
  });
  const l1 = eligibility.find((e) => e.level === "L1_AI_READY")!;
  const l2 = eligibility.find((e) => e.level === "L2_AI_ADOPTED")!;
  const issued = certificates.find((c) => c.status === "ISSUED");
  const employerEligible = !!issued && profile?.visibility !== "PRIVATE";

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Hi {user.name?.split(" ")[0] ?? user.email},</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your AI adoption progress</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/diagnostic"><Button>Continue diagnostic</Button></Link>
          <Link href="/tasks/new"><Button variant="outline">Add a task</Button></Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={ClipboardList}
          title="AI Readiness Score"
          value={latestDiagnostic ? `${latestDiagnostic.computedScore}/100` : "Not yet"}
          hint={latestDiagnostic ? "Score from your latest diagnostic" : "Take the diagnostic to get a score"}
        />
        <KpiCard
          icon={BadgeCheck}
          title="Certificate level"
          value={issued ? certificateLevelLabels[issued.level].split(" · ")[0] : "None yet"}
          hint={issued ? "Issued by TenXPros" : "Eligibility tracks below"}
        />
        <KpiCard
          icon={Sparkles}
          title="Profile completeness"
          value={`${profileCompleteness}%`}
          progress={profileCompleteness}
        />
        <KpiCard
          icon={BadgeCheck}
          title="Employer visibility"
          value={employerEligible ? "Eligible" : "Not yet"}
          tone={employerEligible ? "success" : "muted"}
          hint={employerEligible ? "Organisations may discover you" : "Earn L1 + opt-in to make your profile employer-visible"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Lifecycle progress</p>
              <Link href="/learning" className="text-xs text-primary inline-flex items-center gap-1">Open learning <ArrowRight className="h-3 w-3" /></Link>
            </div>
            <ul className="space-y-3 text-sm">
              <Step icon={ClipboardList} done={!!latestDiagnostic} label="Diagnose" cta={{ href: "/diagnostic", text: "Take diagnostic" }} />
              <Step icon={BookOpen} done={lessonCount > 0} label={`Learn (${lessonCount} lessons)`} cta={{ href: "/learning", text: "Browse tracks" }} />
              <Step icon={Workflow} done={taskCount >= 5} label={`Practice — ${taskCount} tasks mapped`} cta={{ href: "/tasks", text: "Open Task Radar" }} />
              <Step icon={Target} done={scenarioCount >= 2} label={`Assess — ${scenarioCount} scenarios completed`} cta={{ href: "/scenarios", text: "Open scenarios" }} />
              <Step icon={FileCheck} done={evidenceCount >= 1} label={`Evidence — ${evidenceCount} artifacts`} cta={{ href: "/evidence", text: "Open Evidence Vault" }} />
              <Step icon={BadgeCheck} done={!!issued} label="Certify" cta={{ href: "/certificates", text: "Open certificates" }} />
              <Step icon={Sparkles} done={profile?.visibility === "PUBLIC"} label="Showcase / Connect" cta={{ href: "/public-profile", text: "Configure profile" }} />
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Certificate eligibility</p>
              <Link href="/certificates" className="text-xs text-primary inline-flex items-center gap-1">Details <ArrowRight className="h-3 w-3" /></Link>
            </div>
            <EligibilityRow level="L1 — AI-Ready" satisfied={l1.satisfied} total={l1.total} />
            <EligibilityRow level="L2 — AI-Adopted" satisfied={l2.satisfied} total={l2.total} />
            <p className="text-xs text-muted-foreground pt-2">
              Certificates issue only after reviewer approval. Eligibility shows you what's left to do.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Recommended next action</p>
            <RecommendedAction
              latestDiagnostic={latestDiagnostic}
              taskCount={taskCount}
              evidenceCount={evidenceCount}
              scenarioCount={scenarioCount}
              issued={!!issued}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Latest diagnostic report</p>
            {latestDiagnostic?.reports[0] ? (
              <>
                <p className="text-sm text-muted-foreground">{latestDiagnostic.reports[0].summary}</p>
                <Link href="/diagnostic" className="inline-flex items-center text-sm text-primary">Open report <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No report yet — complete the diagnostic to generate one.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Visibility</p>
            <p className="text-sm text-muted-foreground">Current: <Badge tone="muted">{profile?.visibility ?? "PRIVATE"}</Badge></p>
            <Link href="/public-profile"><Button size="sm" variant="outline">Manage public profile</Button></Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, title, value, hint, progress, tone }: {
  icon: typeof BadgeCheck; title: string; value: string; hint?: string; progress?: number; tone?: "success" | "muted";
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`text-2xl font-semibold ${tone === "muted" ? "text-muted-foreground" : ""}`}>{value}</p>
        {progress !== undefined ? <Progress value={progress} /> : null}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function Step({ icon: Icon, done, label, cta }: { icon: typeof BadgeCheck; done: boolean; label: string; cta: { href: string; text: string } }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-full ${done ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className={done ? "" : "text-muted-foreground"}>{label}</span>
      </span>
      <Link href={cta.href} className="text-xs text-primary">{cta.text}</Link>
    </li>
  );
}

function EligibilityRow({ level, satisfied, total }: { level: string; satisfied: number; total: number }) {
  const pct = Math.round((satisfied / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>{level}</span>
        <span className="text-muted-foreground">{satisfied}/{total}</span>
      </div>
      <Progress value={pct} tone={pct === 100 ? "success" : "primary"} />
    </div>
  );
}

function RecommendedAction({ latestDiagnostic, taskCount, evidenceCount, scenarioCount, issued }: {
  latestDiagnostic: unknown; taskCount: number; evidenceCount: number; scenarioCount: number; issued: boolean;
}) {
  if (!latestDiagnostic) return <ActionLine href="/diagnostic" body="Take the AI readiness diagnostic. It takes about 8 minutes." cta="Start diagnostic" />;
  if (taskCount < 5) return <ActionLine href="/tasks/new" body={`Map ${5 - taskCount} more tasks to reach the L1 minimum.`} cta="Add a task" />;
  if (scenarioCount < 2) return <ActionLine href="/scenarios" body="Complete scenario assessments to evidence judgement." cta="Open scenarios" />;
  if (evidenceCount < 1) return <ActionLine href="/evidence/new" body="Submit your first evidence artifact (a workflow, a before/after, a decision log)." cta="Submit evidence" />;
  if (!issued) return <ActionLine href="/certificates" body="You meet L1 minimums. Submit for reviewer approval." cta="Open certification" />;
  return <ActionLine href="/public-profile" body="Make your profile employer-visible to start matching." cta="Configure profile" />;
}

function ActionLine({ href, body, cta }: { href: string; body: string; cta: string }) {
  return (
    <>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Link href={href}><Button size="sm">{cta}</Button></Link>
    </>
  );
}
