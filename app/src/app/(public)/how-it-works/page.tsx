import type { Metadata } from "next";
import { JourneySteps } from "@/components/marketing/marketing-sections";
import { PageHeader } from "@/components/shared/page-shell";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How It Works",
};

export default function HowItWorksPage() {
  const steps = [
    "Apply with a real professional problem and confidentiality consent.",
    "Admission review checks fit, seriousness, and ability to benefit.",
    "Complete the Starter Pack and Diagnostic Intake.",
    "Receive a personalized path across the 11 modules.",
    "Build artifacts and the Living AI Solution Dossier section by section.",
    "Submit capstone materials for certification review.",
    "Publish a directory profile only after certification and opt-in.",
  ];

  return (
    <main>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24">
        <PageHeader
          eyebrow="Process"
          title="A reviewed path from problem to credential."
          description="TenXPros is selective, async-first, and anchored in real work. Admission, diagnostic intake, module artifacts, dossier review, and certification all serve one purpose: defensible AI adoption."
        />
        <ol className="mt-10 grid gap-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-4 rounded-md border border-neutral-200 bg-white p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                {index + 1}
              </span>
              <span className="text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/apply">Apply for Founding Charter</ButtonLink>
          <ButtonLink href="/dossier" variant="secondary">
            See the Dossier
          </ButtonLink>
        </div>
      </section>
      <JourneySteps />
    </main>
  );
}
