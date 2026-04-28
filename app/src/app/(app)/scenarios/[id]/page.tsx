import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Target } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { workModeLabels, certificateLevelLabels } from "@/lib/utils";
import { submitScenarioAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ScenarioPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { saved?: string; err?: string };
}) {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");

  const scenario = await prisma.scenario.findUnique({
    where: { id: params.id },
    include: { rubric: { include: { criteria: true } } },
  });
  if (!scenario) notFound();

  const submissions = await prisma.scenarioSubmission.findMany({
    where: { scenarioId: scenario.id, professionalId: user.professionalId },
    orderBy: { createdAt: "desc" },
    include: { reviews: true },
  });

  return (
    <div className="space-y-6">
      <Link href="/scenarios" className="text-sm text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to scenarios
      </Link>

      <header className="space-y-2">
        <Badge tone="accent"><Target className="h-3 w-3" /> {certificateLevelLabels[scenario.certificateLevel]}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">{scenario.title}</h1>
        {scenario.roleFocus ? <p className="text-xs text-muted-foreground">Role focus: {scenario.roleFocus}</p> : null}
      </header>

      <Card>
        <CardContent className="p-6 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Scenario</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{scenario.prompt}</p>
          {scenario.context ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scenario.context}</p> : null}
        </CardContent>
      </Card>

      {scenario.rubric ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Rubric: {scenario.rubric.title}</p>
            <p className="text-sm text-muted-foreground">{scenario.rubric.description}</p>
            <ul className="text-sm space-y-1">
              {scenario.rubric.criteria.map((c) => (
                <li key={c.id} className="rounded-md border border-border p-2">
                  <p className="font-medium">{c.title} <span className="text-xs text-muted-foreground">(weight {c.weight})</span></p>
                  <p className="text-muted-foreground">{c.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {searchParams?.saved ? <Alert tone="success" title="Submission saved">A reviewer will look at this. You can keep iterating.</Alert> : null}
      {searchParams?.err ? <Alert tone="danger" title="Could not save">{decodeURIComponent(searchParams.err)}</Alert> : null}

      <Card>
        <CardContent className="p-6">
          <p className="font-semibold mb-3">Your submission</p>
          <form action={submitScenarioAction.bind(null, scenario.id)} className="space-y-4">
            <div>
              <Label htmlFor="humanSteps">Proposed human steps</Label>
              <Textarea id="humanSteps" name="humanSteps" rows={4} required placeholder="What does a human do, in what order?" />
            </div>
            <div>
              <Label htmlFor="aiSteps">Proposed AI-assisted steps</Label>
              <Textarea id="aiSteps" name="aiSteps" rows={4} required placeholder="What do you ask AI to do? Where is it in the loop?" />
            </div>
            <div>
              <Label htmlFor="toolsUsed">Tools used (comma separated)</Label>
              <Input id="toolsUsed" name="toolsUsed" placeholder="ChatGPT, NotebookLM, Excel, Notion" />
            </div>
            <div>
              <Label htmlFor="promptOutline">Prompt or workflow outline</Label>
              <Textarea id="promptOutline" name="promptOutline" rows={4} required />
            </div>
            <div>
              <Label htmlFor="riskControls">Risk controls</Label>
              <Textarea id="riskControls" name="riskControls" rows={3} required placeholder="Confidentiality, hallucination handling, data minimisation, escalation rules…" />
            </div>
            <div>
              <Label htmlFor="reviewProcess">Review process</Label>
              <Textarea id="reviewProcess" name="reviewProcess" rows={3} required placeholder="Who checks the output? Against what criteria?" />
            </div>
            <div>
              <Label htmlFor="finalOutput">Final output structure</Label>
              <Textarea id="finalOutput" name="finalOutput" rows={3} required placeholder="What does the deliverable look like?" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workModeChoice">Chosen work mode</Label>
                <Select id="workModeChoice" name="workModeChoice" defaultValue="AI_ASSISTED">
                  {Object.entries(workModeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="workModeReason">Why this mode?</Label>
                <Input id="workModeReason" name="workModeReason" required />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Submit response</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {submissions.length > 0 ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Past submissions</p>
            <ul className="space-y-2 text-sm">
              {submissions.map((s) => (
                <li key={s.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.createdAt.toDateString()}</span>
                    <Badge tone={s.status === "ACCEPTED" ? "success" : s.status === "NEEDS_REVISION" ? "warning" : "muted"}>
                      {s.status.toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">Mode: <span className="text-foreground">{workModeLabels[s.workModeChoice]}</span> · {s.workModeReason}</p>
                  {s.reviews.length > 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reviewer notes: {s.reviews[0].notes ?? "—"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
