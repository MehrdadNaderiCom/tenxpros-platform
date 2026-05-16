import { auth } from "@/lib/auth";
import { saveDiagnostic, submitDiagnostic } from "@/lib/actions/participant";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function DiagnosticPage() {
  const session = await auth();
  const profile = await prisma.participantProfile.findUnique({
    where: { userId: session?.user.id ?? "" },
    include: { diagnostic: true },
  });
  const diagnostic = profile?.diagnostic;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Diagnostic Intake"
        description="Save a draft as you go, then submit when the core context is complete."
      />
      <Card className="bg-neutral-50">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">Guided context</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          This intake gives the admin enough signal to tune your path: risk, stakeholders, output type, success criteria, and the support you need.
        </p>
      </Card>
      <Card>
        <form className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-navy-900">1. Operating context</h2>
            <p className="text-sm text-slate-600">Choose the closest fit. You can refine the nuance in the written fields below.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Risk profile">
              <Select name="riskProfile" defaultValue={diagnostic?.riskProfile ?? "MODERATE"}>
                <option value="LOW">Low</option>
                <option value="MODERATE">Moderate</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </Field>
            <Field label="AI literacy level">
              <Select name="aiLiteracyLevel" defaultValue={diagnostic?.aiLiteracyLevel ?? "BEGINNER"}>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </Select>
            </Field>
            <Field label="Stakeholder complexity">
              <Select name="stakeholderComplexity" defaultValue={diagnostic?.stakeholderComplexity ?? "SMALL_TEAM"}>
                <option value="SOLO">Solo</option>
                <option value="SMALL_TEAM">Small team</option>
                <option value="DEPARTMENT">Department</option>
                <option value="MULTI_STAKEHOLDER">Multi-stakeholder</option>
              </Select>
            </Field>
            <Field label="Regulatory weight">
              <Select name="industryRegulatoryWeight" defaultValue={diagnostic?.industryRegulatoryWeight ?? "MODERATE"}>
                <option value="LIGHT">Light</option>
                <option value="MODERATE">Moderate</option>
                <option value="HEAVY">Heavy</option>
              </Select>
            </Field>
            <Field label="Time availability">
              <Select name="timeAvailability" defaultValue={diagnostic?.timeAvailability ?? "HOURS_8"}>
                <option value="HOURS_5">5 hours</option>
                <option value="HOURS_8">8 hours</option>
                <option value="HOURS_12_PLUS">12+ hours</option>
              </Select>
            </Field>
            <Field label="Output type">
              <Select name="outputType" defaultValue={diagnostic?.outputType ?? "INTERNAL"}>
                <option value="INTERNAL">Internal</option>
                <option value="CLIENT_FACING">Client-facing</option>
                <option value="PUBLIC_FACING">Public-facing</option>
                <option value="REGULATED">Regulated</option>
              </Select>
            </Field>
            <Field label="Domain recognition">
              <Input name="domainRecognition" defaultValue={diagnostic?.domainRecognition ?? ""} />
            </Field>
            <Field label="Solution pattern hint">
              <Input name="solutionPatternHint" defaultValue={diagnostic?.solutionPatternHint ?? ""} />
            </Field>
          </div>
          {[
            ["problemContext", "Problem context"],
            ["problemClarity", "Problem clarity"],
            ["successCriteria", "Success criteria"],
            ["organizationalContext", "Organizational context"],
            ["goals", "Goals"],
            ["supportNeeds", "Support needs"],
          ].map(([name, label]) => (
            <Field key={name} label={label}>
              <Textarea name={name} defaultValue={(diagnostic?.[name as keyof typeof diagnostic] as string | null) ?? ""} />
            </Field>
          ))}
          <input type="hidden" name="currentStep" value="5" />
          <div className="flex gap-3">
            <Button formAction={saveDiagnostic} variant="secondary" type="submit">
              Save draft
            </Button>
            <Button formAction={submitDiagnostic} type="submit">
              Submit diagnostic
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
