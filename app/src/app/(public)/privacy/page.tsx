import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

const sections = [
  ["What we collect", "We collect application details, account information, diagnostic responses, program submissions, dossier content, support tickets, payment status records, and operational analytics."],
  ["How we use data", "We use data to review applications, deliver the program, personalize paths, provide feedback, manage certification, operate support, and improve TenXPros."],
  ["Confidentiality", "TenXPros is designed around professional confidentiality. Participants should avoid uploading sensitive third-party information unless they have the right to use it."],
  ["Public visibility", "Directory profiles and badge verification pages are public only when a participant or admin action makes the relevant record public."],
  ["Email and analytics", "Transactional emails are used for application, enrollment, review, support, and certification workflows. Analytics focus on product and operational decisions."],
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-16 md:px-8 md:py-24">
      <PageHeader title="Privacy Policy" description="How TenXPros handles participant, applicant, and operational data." />
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
