import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Refund Policy",
};

const sections = [
  ["Apply first, pay only after acceptance", "Applying does not create enrollment or a payment obligation. TenXPros reviews each application before sending any payment instructions."],
  ["Accepted applicants pay to enroll", "Accepted applicants pay through a secure Stripe payment link, sent only from hello@tenxpros.com. TenXPros is operated by Naprolity OÜ, so your Stripe checkout or card statement may show Naprolity OÜ as the legal payee. Enrollment is activated and recorded after payment is confirmed."],
  ["Before enrollment", "If payment is made but enrollment has not yet been activated, refund requests are reviewed manually."],
  ["After program access", "The program reserves review capacity and begins providing access, diagnostic, and feedback resources after enrollment. Refund eligibility may become limited once these services begin, because the reviewer time and capacity they require are set aside for you."],
  ["Certification outcomes", "Completing the program does not guarantee certification. Public review outcomes are Certified, Strong Draft (specific revisions are returned before certification), or Completed (the program is finished and the credential is not yet earned). Refund eligibility is assessed by where you are in the program, not by the certification outcome."],
  ["Statutory rights and cooling-off", "Statutory consumer rights may still apply depending on your jurisdiction. For EU/UK-style 14-day withdrawal or cooling-off contexts, starting access or review work during the withdrawal period requires your explicit consent and acknowledgment that beginning the service may affect your refund rights."],
  ["How to request a review", "You can request a refund review by email or support ticket. Acceptance and payment instructions are sent only from hello@tenxpros.com; for your security, do not pay any link unless it comes through an official TenXPros/Naprolity channel and matches our official details. For questions or to verify a payment request, contact support@tenxpros.com. TenXPros records refund decisions in its payment and audit workflow."],
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
