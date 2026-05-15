import type { Metadata } from "next";
import { ModuleGrid } from "@/components/marketing/marketing-sections";
import { PageHeader } from "@/components/shared/page-shell";

export const metadata: Metadata = {
  title: "Program",
};

export default function ProgramPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-12 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="12-week architecture"
        title="Eleven modules across four phases."
        description="TenXPros answers three questions: where do I start, how do I do it, and how do I evaluate and improve it?"
      />
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Frame", "Weeks 1-4", "Readiness, literacy, boundaries, and problem framing."],
          ["Design", "Weeks 5-8", "Stakeholders, evidence, workflow, and responsible solution design."],
          ["Prove", "Weeks 9-10", "Adoption, communication, value, roadmap, and proof."],
          ["Foresee", "Week 11", "Scenario planning and future-proofing."],
        ].map(([phase, weeks, copy]) => (
          <section key={phase} className="rounded-lg border border-neutral-200 bg-white p-6">
            <p className="text-sm font-semibold text-gold-800">{weeks}</p>
            <h2 className="mt-2 text-xl font-semibold text-navy-900">{phase}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
          </section>
        ))}
      </div>
      <ModuleGrid />
    </main>
  );
}
