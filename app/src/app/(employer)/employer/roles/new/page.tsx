import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { createRoleAction } from "./actions";

export const metadata = { title: "Post a role need" };

export default async function NewRoleNeedPage({ searchParams }: { searchParams?: { err?: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "EMPLOYER") redirect("/sign-in");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Post a role need</h1>
      {searchParams?.err ? <Alert tone="danger" title="Could not save">{decodeURIComponent(searchParams.err)}</Alert> : null}
      <Card>
        <CardContent className="p-6">
          <form action={createRoleAction} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
            <div className="md:col-span-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={5} required /></div>
            <div><Label htmlFor="industry">Industry</Label><Input id="industry" name="industry" /></div>
            <div><Label htmlFor="location">Location</Label><Input id="location" name="location" /></div>
            <div>
              <Label htmlFor="engagementType">Engagement</Label>
              <Select id="engagementType" name="engagementType" defaultValue="fulltime">
                <option value="fulltime">Full-time</option>
                <option value="parttime">Part-time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
                <option value="project">Project</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="minCertificateLevel">Minimum certificate level</Label>
              <Select id="minCertificateLevel" name="minCertificateLevel" defaultValue="L1_AI_READY">
                <option value="L1_AI_READY">L1 — AI-Ready</option>
                <option value="L2_AI_ADOPTED">L2 — AI-Adopted</option>
                <option value="L3_AI_AUGMENTED">L3 — AI-Augmented</option>
                <option value="L4_AI_IMPLEMENTER">L4 — AI Implementer</option>
                <option value="L5_AI_LEADER">L5 — AI-Enabled Leader</option>
              </Select>
            </div>
            <div><Label htmlFor="budgetRange">Budget range (optional)</Label><Input id="budgetRange" name="budgetRange" placeholder="€80-120k / €600 per day" /></div>
            <div className="md:col-span-2"><Label htmlFor="skillsRequired">Required skills (comma separated)</Label><Input id="skillsRequired" name="skillsRequired" /></div>
            <div className="md:col-span-2"><Label htmlFor="aiWorkModes">Preferred AI work modes (comma separated)</Label><Input id="aiWorkModes" name="aiWorkModes" placeholder="AI_ASSISTED, AI_TOOL_CHAIN" /></div>
            <div className="md:col-span-2 flex justify-end"><Button type="submit">Post role need</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
