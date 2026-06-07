import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-10 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Philosophy"
        title="You bring the expertise. We bring the AI method."
        description="TenXPros exists because AI adoption is now professional judgment work. The program is built for people who need to know where AI fits, where it does not, and how to defend a practical solution in their own domain."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Partnership, not replacement", "The core framing is human-AI partnership, with professional responsibility preserved."],
          ["Selective by design", "The credential means more when admission, work quality, and review standards are serious."],
          ["Adaptive, not generic", "The path adapts to domain, risk, stakeholders, evidence, output type, and time availability."],
        ].map(([title, copy]) => (
          <Card key={title}>
            <h2 className="text-xl font-semibold text-navy-900">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
