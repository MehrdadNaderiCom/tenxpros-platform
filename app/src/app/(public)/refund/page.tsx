import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Refund Policy",
};

const sections = [
  ["Founder/legal review", "Founder/legal review required before production launch."],
  ["Selective admission", "Applying does not create enrollment or a payment obligation. TenXPros reviews each application before sending any payment instructions."],
  ["Manual launch payments", "At launch, accepted applicants pay through manual Stripe Payment Links. Admins record payment status after confirmation."],
  ["Before enrollment", "If payment is made but enrollment has not been activated, refund requests are reviewed manually."],
  ["After program access", "Once participant access, starter materials, diagnostic intake, or coach review begins, refunds may be limited because capacity and review resources have been reserved."],
  ["Certification outcomes", "Program completion does not automatically guarantee certification. Outcomes may include certified, conditionally certified, completed not certified, or not completed."],
  ["How to request review", "Participants can request review by email or support ticket. TenXPros records refund decisions in the admin payment and audit workflow."],
];

export default function RefundPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        title="Refund Policy"
        description="Manual launch refund handling for selective admission and charter enrollment."
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
