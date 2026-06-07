import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Refund Policy",
};

const sections = [
  ["Apply first, pay only after acceptance", "Applying does not create enrollment or a payment obligation. TenXPros reviews each application before sending any payment instructions."],
  ["Accepted applicants pay to enroll", "Accepted applicants pay through a Stripe Payment Link. Enrollment is activated and recorded after payment is confirmed."],
  ["Before enrollment", "If payment is made but enrollment has not yet been activated, refund requests are reviewed manually."],
  ["After program access", "Once participant access, starter materials, diagnostic intake, or review begins, refunds may be limited because capacity and review resources have been reserved."],
  ["Certification outcomes", "Completing the program does not guarantee certification. Public review outcomes are Certified, Strong Draft (specific revisions are returned before certification), or Completed (the program is finished and the credential is not yet earned). Refund eligibility is assessed by where you are in the program, not by the certification outcome."],
  ["How to request review", "Participants can request review by email or support ticket. TenXPros records refund decisions in its payment and audit workflow."],
];

export default function RefundPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        title="Refund Policy"
        description="How refunds are handled for selective admission and charter enrollment."
      />
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
