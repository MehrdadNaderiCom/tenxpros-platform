import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata({
  title: "Terms of Service",
  description:
    "The terms that govern the TenXPros 100-day professional education and certification program, including admission, participation, review, payment, and account access.",
  path: "/terms",
});

const sections = [
  ["A private professional certification", "TenXPros is a selective private professional education and certification program. It is not a university degree, academic accreditation, or a government-recognized qualification. Admission, participation, feedback, and certification decisions are based on fit, submitted work, evidence quality, and professional judgment."],
  ["No guaranteed outcome", "TenXPros does not guarantee certification, employment, promotion, income, business results, or directory leads. The program provides education, structure, review, and a credentialing standard. Outcomes depend on the work you do and whether it meets the review standard; certification is not guaranteed."],
  ["Apply first, pay only after acceptance", "Applying creates no payment obligation. Payment is requested only after an application is accepted, and enrollment is activated after payment is confirmed. TenXPros is operated by Naprolity OÜ, the legal operating company and payee; secure payments are processed by Stripe, and your Stripe checkout or card statement may show Naprolity OÜ as the legal payee."],
  ["Deadlines, extensions, and resubmission", "Participants are expected to follow module and dossier deadlines. One reasonable extension or resubmission may be granted when justified. Additional missed deadlines, repeated resubmissions, or extra review cycles may require an administrative or review fee, because each review reserves limited capacity."],
  ["Participant responsibilities", "Participants are responsible for truthful application information, protecting confidential data, respecting third-party rights, and submitting original work."],
  ["Responsible data use", "Participants must not submit confidential client, employer, patient, regulated, or other third-party data unless they have the authority and appropriate safeguards. Use redacted or fictionalized examples."],
  ["Account access", "Participant accounts are created after admission and enrollment. Accounts may be suspended for misuse, non-payment, policy violation, or harmful conduct."],
  ["Contact and official communication", "Acceptance and payment instructions are sent only from hello@tenxpros.com. For questions or support, or to verify whether a payment link is legitimate, contact support@tenxpros.com. For your security, do not pay any link unless it comes through an official TenXPros/Naprolity channel and matches our official payment details. Treat any payment request from another address as suspicious."],
  ["Completion of service and continuity", "TenXPros is committed to delivering what it promises to each participant. Once we have met our obligations to you, for example by completing your program, your reviews, and your certification decision, that commitment has been fulfilled. TenXPros is offered for defined periods and is not a perpetual service. After outstanding obligations have been met, the founder may, at the founder's sole discretion, decide to conclude, pause, or change the direction or purpose of the service. Such a decision is final, is part of the ordinary running of the business, and is not subject to objection. It does not create any right to continued service, renewal, or compensation beyond what is already owed to you, and where practical we will give reasonable notice through the site."],
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        title="Terms of Service"
        description="The terms that govern the TenXPros program and platform. Please read them before applying."
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
