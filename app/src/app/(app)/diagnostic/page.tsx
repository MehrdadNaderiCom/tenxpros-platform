import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { saveDiagnosticAction } from "./actions";
import { certificateLevelLabels } from "@/lib/utils";

export const metadata = { title: "AI Readiness Diagnostic" };

const SCALE_FIELDS = [
  { key: "aiLiteracy", label: "AI literacy", hint: "Can you explain what an LLM is, what it can and can't do, and where it is unreliable?" },
  { key: "toolFamiliarity", label: "AI tool familiarity", hint: "How comfortable are you using ChatGPT / Claude / Gemini / etc. for real work?" },
  { key: "prompting", label: "Prompting ability", hint: "Can you write structured prompts that produce reliable, role-relevant output?" },
  { key: "automationAwareness", label: "Automation awareness", hint: "Can you tell when something should be automated vs prompted vs left manual?" },
  { key: "riskAwareness", label: "Risk & privacy awareness", hint: "Do you protect confidential / regulated data when using AI tools?" },
  { key: "outputEvaluation", label: "Output evaluation", hint: "Can you tell good AI output from bad, and verify before using?" },
  { key: "roleSpecificUse", label: "Role-specific AI use", hint: "Do you have repeatable AI workflows for your day-to-day role?" },
  { key: "englishComm", label: "Professional communication", hint: "Comfort writing for a global, cross-functional audience." },
] as const;

export default async function DiagnosticPage({ searchParams }: { searchParams?: { saved?: string; err?: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");

  const latest = await prisma.aIReadinessDiagnostic.findFirst({
    where: { professionalId: user.professionalId },
    orderBy: { createdAt: "desc" },
    include: { reports: true },
  });
  const report = latest?.reports[0] ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <Badge tone="primary"><ClipboardList className="h-3 w-3" /> Diagnostic</Badge>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">AI Readiness Diagnostic</h1>
          <p className="text-muted-foreground">Self-rate eight dimensions and tell us about your work. We compute your readiness score and a structured report.</p>
        </div>
        {latest ? (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Latest score</p>
            <p className="text-3xl font-semibold tracking-tight">{latest.computedScore}/100</p>
            <Progress value={latest.computedScore} />
          </div>
        ) : null}
      </header>

      {searchParams?.saved ? <Alert tone="success" title="Diagnostic saved">A new readiness report was generated below.</Alert> : null}
      {searchParams?.err ? <Alert tone="danger" title="Could not save diagnostic">{decodeURIComponent(searchParams.err)}</Alert> : null}

      {report ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Latest readiness report</p>
              <Badge tone="accent">Recommended: {certificateLevelLabels[report.recommendedCertificate].split(" · ")[0]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{report.summary}</p>
            <div className="grid md:grid-cols-2 gap-4">
              <ListBlock title="Strengths" items={report.strengths} />
              <ListBlock title="Gaps" items={report.gaps} tone="warning" />
              <ListBlock title="Recommended tracks" items={report.recommendedTracks} />
              <ListBlock title="Recommended workflows" items={report.recommendedWorkflows} />
            </div>
            <div className="text-xs text-muted-foreground">
              Generated {report.generatedByAI ? "with AI assistance" : "deterministically"} ·{" "}
              <Link href="/learning" className="text-primary inline-flex items-center gap-1">
                Open recommended tracks <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <form action={saveDiagnosticAction} className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2">
              {SCALE_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <select
                    id={f.key}
                    name={f.key}
                    defaultValue={String((latest as Record<string, unknown> | null)?.[f.key] ?? "3")}
                    className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {[0, 1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>{v} — {scaleLabel(v)}</option>
                    ))}
                  </select>
                  <FieldHint>{f.hint}</FieldHint>
                </div>
              ))}
            </section>

            <section className="grid gap-4">
              <div>
                <Label htmlFor="jobSearchStatus">Career / job search status</Label>
                <Input id="jobSearchStatus" name="jobSearchStatus" defaultValue={latest?.jobSearchStatus ?? ""} placeholder="e.g. employed, looking, switching role, founder, freelancer" />
              </div>
              <div>
                <Label htmlFor="dailyTasks">What does your daily work actually look like?</Label>
                <Textarea id="dailyTasks" name="dailyTasks" rows={4} defaultValue={latest?.dailyTasks ?? ""} placeholder="Concrete tasks. e.g. status reports from messy notes, candidate screening, training material, monthly forecasts..." />
              </div>
              <div>
                <Label htmlFor="painPoints">Where does your work currently hurt?</Label>
                <Textarea id="painPoints" name="painPoints" rows={4} defaultValue={latest?.painPoints ?? ""} />
              </div>
              <div>
                <Label htmlFor="targetOutcomes">What outcomes are you optimising for?</Label>
                <Textarea id="targetOutcomes" name="targetOutcomes" rows={4} defaultValue={latest?.targetOutcomes ?? ""} />
              </div>
            </section>

            <div className="flex justify-end">
              <Button type="submit">Compute readiness report</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function scaleLabel(v: number) {
  return ["No exposure", "Aware", "Beginner", "Working", "Strong", "Expert"][v];
}

function ListBlock({ title, items, tone = "muted" }: { title: string; items: string[]; tone?: "muted" | "warning" }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <ul className="text-sm space-y-1">
        {items.length === 0 ? <li className="text-muted-foreground">—</li> : items.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className={tone === "warning" ? "text-[hsl(var(--warning))]" : "text-accent"}>•</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
