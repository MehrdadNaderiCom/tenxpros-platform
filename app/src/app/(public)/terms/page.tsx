import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service",
};

const sections = [
  ["Program nature", "TenXPros is a selective professional education and certification program. Admission, participation, feedback, and certification decisions are based on fit, submitted work, evidence quality, and professional judgment."],
  ["No guaranteed outcome", "TenXPros does not guarantee employment, promotion, revenue, directory leads, or certification. The program provides education, structure, review, and credentialing standards."],
  ["Participant responsibilities", "Participants are responsible for truthful application information, protecting confidential data, respecting third-party rights, and submitting original work."],
  ["Responsible AI use", "Participants must not submit sensitive, regulated, proprietary, or personal data unless they have authority and appropriate safeguards."],
  ["Account access", "Participant accounts are created after admission and manual enrollment. Accounts may be suspended for misuse, non-payment, policy violation, or harmful conduct."],
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-16 md:px-8 md:py-24">
      <PageHeader title="Terms of Service" description="Launch terms for the TenXPros program and platform." />
      <div className="space-y-4">
        {sections.map(([title, copy]) => (
          <Card key={title}>
            <h2 className="text-xl font-semibold text-navy-900">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
