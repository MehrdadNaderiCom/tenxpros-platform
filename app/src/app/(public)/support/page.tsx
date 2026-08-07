import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import {
  OFFICIAL_PRODUCT,
  OFFICIAL_PRICE_LABEL,
  PAYMENT_PROCESSOR,
  LEGAL_OPERATOR,
  OFFICIAL_PAYMENT_DOMAIN,
} from "@/lib/payment-disclosure";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata({
  title: "Support & Contact",
  description:
    "Contact TenXPros support for technical, payment, access, or account questions before or during the 100-day program. We aim to respond within 1-2 business days.",
  path: "/support",
});

const contactDetails: Array<{ label: string; value: string; href?: string; note?: string }> = [
  {
    label: "Support email",
    value: "support@tenxpros.com",
    href: "mailto:support@tenxpros.com",
    note: "Technical questions, payment issues, and account or access problems.",
  },
  {
    label: "General & admissions",
    value: "hello@tenxpros.com",
    href: "mailto:hello@tenxpros.com",
    note: "Application, enrollment, and official acceptance or payment instructions.",
  },
  {
    label: "Manager contact",
    value: "mail@mehrdadnaderi.com",
    href: "mailto:mail@mehrdadnaderi.com",
    note: "Direct line to the program manager.",
  },
  { label: "Website", value: "https://tenxpros.com", href: "https://tenxpros.com" },
  { label: "Expected response time", value: "Within 1-2 business days" },
];

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Technical Support"
        title="Support & Contact"
        description="If you have any technical questions, payment-related issues, access problems, or questions about your TenXPros account or service, please contact our support team. We aim to respond within 1-2 business days."
      />

      <Card>
        <h2 className="text-xl font-semibold text-navy-900">Technical Support</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Our team is here to help with technical questions, payment-related issues, access
          problems, or any questions about your TenXPros account or service. We aim to respond
          within 1-2 business days.
        </p>

        <dl className="mt-6 divide-y divide-neutral-200 border-t border-neutral-200">
          {contactDetails.map(({ label, value, href, note }) => (
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
                {note ? <span className="mt-0.5 block text-xs text-slate-500">{note}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-navy-900">Payment verification</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          TenXPros never asks for payment before acceptance. If you are accepted, the official payment
          link is sent to you by email. Before paying any link, you can verify it against the official
          details below, and if anything looks unexpected, contact us first.
        </p>

        <dl className="mt-6 divide-y divide-neutral-200 border-t border-neutral-200">
          {[
            { label: "Product / program", value: OFFICIAL_PRODUCT },
            { label: "Price", value: OFFICIAL_PRICE_LABEL },
            { label: "Payment processor", value: `${PAYMENT_PROCESSOR} (secure checkout)` },
            { label: "Legal operator / payee", value: LEGAL_OPERATOR },
            {
              label: "Official payment link",
              value: `A secure ${PAYMENT_PROCESSOR} page on ${OFFICIAL_PAYMENT_DOMAIN}, sent only in your acceptance email`,
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="w-48 shrink-0 text-sm font-semibold text-navy-900">{label}</dt>
              <dd className="text-sm leading-6 text-slate-600">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          TenXPros is operated by {LEGAL_OPERATOR}. Secure payments are processed by {PAYMENT_PROCESSOR},
          so your {PAYMENT_PROCESSOR} checkout or card statement may show {LEGAL_OPERATOR} as the legal
          payee, this is expected and legitimate. For your security, please do not pay any link unless it
          is sent through an official TenXPros/{LEGAL_OPERATOR.split(" ")[0]} channel and matches these
          details. To confirm whether a payment request is legitimate, email{" "}
          <a href="mailto:support@tenxpros.com" className="font-medium text-indigo-600 hover:text-indigo-500">
            support@tenxpros.com
          </a>{" "}
          before paying.
        </p>
      </Card>

      <Card className="border-dashed bg-neutral-50">
        <h2 className="text-xl font-semibold text-navy-900">What to include</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          To help us resolve your request quickly, please include the email address associated with
          your TenXPros application or account, a short description of the issue, and, for
          payment-related questions, the date and method of payment. You can reach us any time at{" "}
          <a href="mailto:support@tenxpros.com" className="font-medium text-indigo-600 hover:text-indigo-500">
            support@tenxpros.com
          </a>
          .
        </p>
      </Card>
    </main>
  );
}
