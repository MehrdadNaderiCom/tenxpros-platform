import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Support & Contact",
  description:
    "Contact TenXPros technical support for help with technical questions, payment issues, access problems, or questions about your account. We aim to respond within 1–2 business days.",
};

const contactDetails: Array<{ label: string; value: string; href?: string }> = [
  { label: "Support email", value: "support@tenxpros.com", href: "mailto:support@tenxpros.com" },
  { label: "Business contact", value: "mail@mehrdadnaderi.com", href: "mailto:mail@mehrdadnaderi.com" },
  { label: "Website", value: "https://tenxpros.com", href: "https://tenxpros.com" },
  { label: "Expected response time", value: "Within 1–2 business days" },
];

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Technical Support"
        title="Support & Contact"
        description="If you have any technical questions, payment-related issues, access problems, or questions about your TenXPros account or service, please contact our support team. We aim to respond within 1–2 business days."
      />

      <Card>
        <h2 className="text-xl font-semibold text-navy-900">Technical Support</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Our team is here to help with technical questions, payment-related issues, access
          problems, or any questions about your TenXPros account or service. We aim to respond
          within 1–2 business days.
        </p>

        <dl className="mt-6 divide-y divide-neutral-200 border-t border-neutral-200">
          {contactDetails.map(({ label, value, href }) => (
            <div key={label} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="w-48 shrink-0 text-sm font-semibold text-navy-900">{label}</dt>
              <dd className="text-sm leading-6 text-slate-600">
                {href ? (
                  <a href={href} className="font-medium text-indigo-600 hover:text-indigo-500">
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="border-dashed bg-neutral-50">
        <h2 className="text-xl font-semibold text-navy-900">What to include</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          To help us resolve your request quickly, please include the email address associated with
          your TenXPros application or account, a short description of the issue, and — for
          payment-related questions — the date and method of payment. You can reach us any time at{" "}
          <a href="mailto:support@tenxpros.com" className="font-medium text-indigo-600 hover:text-indigo-500">
            support@tenxpros.com
          </a>
          .
        </p>
      </Card>
    </main>
  );
}
