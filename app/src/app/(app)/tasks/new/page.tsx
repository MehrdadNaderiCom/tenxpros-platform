import { redirect } from "next/navigation";
import { Workflow } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select, Label, FieldHint } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { workModeLabels, workModeDescriptions } from "@/lib/utils";
import { createTaskAction } from "./actions";

export const metadata = { title: "Add task" };

export default async function NewTaskPage({ searchParams }: { searchParams?: { err?: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <header>
        <Badge tone="primary"><Workflow className="h-3 w-3" /> Personal Task Radar</Badge>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Add a recurring task</h1>
        <p className="text-muted-foreground">We'll classify it for you. You can override the recommendation any time.</p>
      </header>

      {searchParams?.err ? <Alert tone="danger" title="Could not save">{decodeURIComponent(searchParams.err)}</Alert> : null}

      <Card>
        <CardContent className="p-6">
          <form action={createTaskAction} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Task title</Label>
              <Input id="title" name="title" required placeholder="e.g. Weekly project status report" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} required placeholder="What does this task involve, end-to-end?" />
            </div>
            <div>
              <Label htmlFor="roleContext">Role context</Label>
              <Input id="roleContext" name="roleContext" placeholder="e.g. PM working on a delivery program" />
            </div>
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select id="frequency" name="frequency" defaultValue="WEEKLY">
                <option value="AD_HOC">Ad-hoc</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </Select>
            </div>
            <ScaleField name="businessValue" label="Business / professional value (1-5)" />
            <ScaleField name="complexity" label="Complexity (1-5)" />
            <ScaleField name="humanJudgment" label="Human judgement required (1-5)" />
            <ScaleField name="aiSuitability" label="AI suitability (1-5)" />
            <ScaleField name="automationPotential" label="Automation potential (1-5)" />
            <div>
              <Label htmlFor="riskLevel">Risk level</Label>
              <Select id="riskLevel" name="riskLevel" defaultValue="LOW">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="confidentiality">Confidentiality</Label>
              <Select id="confidentiality" name="confidentiality" defaultValue="INTERNAL">
                <option value="PUBLIC">Public</option>
                <option value="INTERNAL">Internal</option>
                <option value="CONFIDENTIAL">Confidential</option>
                <option value="RESTRICTED">Restricted</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" name="notes" rows={3} placeholder="Anything that should change the classification?" />
              <FieldHint>The classifier weighs risk and confidentiality heavily.</FieldHint>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="submit">Save task</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-semibold mb-2">Work modes</p>
          <ul className="grid gap-2 md:grid-cols-2 text-sm">
            {Object.entries(workModeLabels).map(([k, v]) => (
              <li key={k}><span className="font-medium">{v}</span> — <span className="text-muted-foreground">{workModeDescriptions[k]}</span></li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ScaleField({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Select id={name} name={name} defaultValue="3">
        {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
      </Select>
    </div>
  );
}
