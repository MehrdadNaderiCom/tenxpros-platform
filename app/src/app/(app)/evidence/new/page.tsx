import { redirect } from "next/navigation";
import { FileCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select, Label, FieldHint } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { createEvidenceAction } from "./actions";

export const metadata = { title: "New evidence" };

const TYPES: Array<[string, string]> = [
  ["BEFORE_AFTER_ARTIFACT", "Before / after artifact"],
  ["PROMPT_CHAIN", "Prompt chain"],
  ["AI_WORKFLOW", "AI workflow"],
  ["REPORT", "Report"],
  ["PRESENTATION", "Presentation"],
  ["DOC_IMPROVEMENT", "Document improvement"],
  ["JOB_APPLICATION_IMPROVEMENT", "Job application improvement"],
  ["AUTOMATION_DESIGN", "Automation design"],
  ["SCENARIO_RESPONSE", "Scenario response"],
  ["DECISION_LOG", "Decision log"],
  ["PORTFOLIO_LINK", "Portfolio link"],
  ["FILE_UPLOAD", "File upload (URL)"],
];

export default async function NewEvidencePage({ searchParams }: { searchParams?: { err?: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <header>
        <Badge tone="primary"><FileCheck className="h-3 w-3" /> Evidence Vault</Badge>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">New evidence artifact</h1>
        <p className="text-muted-foreground">Be specific. Reviewers grade clarity, role relevance and risk awareness.</p>
      </header>

      {searchParams?.err ? <Alert tone="danger" title="Could not save">{decodeURIComponent(searchParams.err)}</Alert> : null}

      <Card>
        <CardContent className="p-6">
          <form action={createEvidenceAction} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select id="type" name="type" defaultValue="AI_WORKFLOW">
                {TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="roleContext">Role context</Label>
              <Input id="roleContext" name="roleContext" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} required />
            </div>
            <div>
              <Label htmlFor="aiToolsUsed">AI tools used (comma separated)</Label>
              <Input id="aiToolsUsed" name="aiToolsUsed" />
            </div>
            <div>
              <Label htmlFor="externalUrl">Link (optional)</Label>
              <Input id="externalUrl" name="externalUrl" type="url" />
              <FieldHint>Don't paste confidential client data; link to a sanitised artifact instead.</FieldHint>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="humanContribution">Human contribution</Label>
              <Textarea id="humanContribution" name="humanContribution" rows={3} required placeholder="What did you, the human, do?" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="aiContribution">AI contribution</Label>
              <Textarea id="aiContribution" name="aiContribution" rows={3} required placeholder="What did the AI do, and what didn't it do?" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="risksConsidered">Risks considered</Label>
              <Textarea id="risksConsidered" name="risksConsidered" rows={3} required placeholder="Confidentiality, hallucinations, bias, data sharing…" />
            </div>
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select id="visibility" name="visibility" defaultValue="REVIEWERS_ONLY">
                <option value="PRIVATE">Private (only me)</option>
                <option value="REVIEWERS_ONLY">Reviewers only</option>
                <option value="EMPLOYER_VISIBLE">Employer-visible</option>
                <option value="PUBLIC">Public profile</option>
              </Select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Save evidence</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
