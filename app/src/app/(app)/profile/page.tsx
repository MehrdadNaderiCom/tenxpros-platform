import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select, Label, FieldHint } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveProfileAction } from "./actions";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams?: { saved?: string; err?: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");

  const profile = await prisma.professionalProfile.findUnique({ where: { id: user.professionalId } });
  if (!profile) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Professional profile</h1>
        <p className="text-muted-foreground">
          Your platform profile drives recommendations and what employers can see (when you opt in).
        </p>
      </header>

      {searchParams?.saved ? <Alert tone="success" title="Profile saved">Changes are live for you and reviewers.</Alert> : null}
      {searchParams?.err ? <Alert tone="danger" title="Could not save">{decodeURIComponent(searchParams.err)}</Alert> : null}

      <form action={saveProfileAction} className="space-y-6">
        <Card><CardContent className="p-6 grid md:grid-cols-2 gap-4">
          <Field label="Headline">
            <Input name="headline" defaultValue={profile.headline ?? ""} placeholder="e.g. PM building AI-augmented delivery workflows" />
          </Field>
          <Field label="Current role">
            <Input name="currentRole" defaultValue={profile.currentRole ?? ""} placeholder="Senior Project Manager" />
          </Field>
          <Field label="Target role">
            <Input name="targetRole" defaultValue={profile.targetRole ?? ""} placeholder="AI-augmented Program Lead" />
          </Field>
          <Field label="Industry">
            <Input name="industry" defaultValue={profile.industry ?? ""} placeholder="Professional services" />
          </Field>
          <Field label="Location">
            <Input name="location" defaultValue={profile.location ?? ""} placeholder="Remote · EU timezone" />
          </Field>
          <Field label="Remote preference">
            <Select name="remotePreference" defaultValue={profile.remotePreference ?? "open"}>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
              <option value="open">Open</option>
            </Select>
          </Field>
        </CardContent></Card>

        <Card><CardContent className="p-6 grid md:grid-cols-2 gap-4">
          <Field label="Languages" hint="Comma separated. e.g. English, Spanish">
            <Input name="languages" defaultValue={(profile.languages ?? []).join(", ")} />
          </Field>
          <Field label="Skills" hint="Comma separated">
            <Input name="skills" defaultValue={(profile.skills ?? []).join(", ")} />
          </Field>
          <Field label="Tools" hint="Comma separated">
            <Input name="tools" defaultValue={(profile.tools ?? []).join(", ")} />
          </Field>
          <Field label="AI tools used" hint="Comma separated. e.g. ChatGPT, Claude, NotebookLM">
            <Input name="aiToolsUsed" defaultValue={(profile.aiToolsUsed ?? []).join(", ")} />
          </Field>
        </CardContent></Card>

        <Card><CardContent className="p-6 space-y-4">
          <Field label="Career goals">
            <Textarea name="careerGoals" rows={4} defaultValue={profile.careerGoals ?? ""} placeholder="What outcome are you optimising for over the next 12 months?" />
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Resume URL"><Input name="resumeUrl" defaultValue={profile.resumeUrl ?? ""} type="url" placeholder="https://..." /></Field>
            <Field label="LinkedIn URL"><Input name="linkedinUrl" defaultValue={profile.linkedinUrl ?? ""} type="url" /></Field>
            <Field label="GitHub URL"><Input name="githubUrl" defaultValue={profile.githubUrl ?? ""} type="url" /></Field>
            <Field label="Personal website"><Input name="websiteUrl" defaultValue={profile.websiteUrl ?? ""} type="url" /></Field>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6 space-y-4">
          <Field label="Visibility" hint="Controls who can see your profile.">
            <Select name="visibility" defaultValue={profile.visibility}>
              <option value="PRIVATE">Private — only you</option>
              <option value="REVIEWERS_ONLY">Reviewers only</option>
              <option value="EMPLOYER_VISIBLE">Employer-visible (verified employers can find me)</option>
              <option value="PUBLIC">Public profile (sharable URL)</option>
            </Select>
          </Field>
          <FieldHint>
            Even when public, evidence remains private unless you mark each artifact as employer-visible or public.
          </FieldHint>
        </CardContent></Card>

        <div className="flex justify-end gap-2">
          <Button type="submit">Save profile</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}
