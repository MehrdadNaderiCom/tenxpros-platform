import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";
import {
  applicationReceivedEmail,
  applicationStatusEmail,
  enrollmentWelcomeEmail,
  paymentInstructionsEmail,
} from "@/lib/email/templates";

const SAMPLE = { fullName: "Sample Applicant", supportEmail: "support@tenxpros.com" };

const TEMPLATES = [
  {
    key: "application_received",
    name: "Application received",
    when: "Sent automatically the moment an application is submitted.",
    subject: applicationReceivedEmail({ fullName: SAMPLE.fullName, applicationId: "sample-id" }).subject,
  },
  {
    key: "application_status_update",
    name: "Application status update",
    when: "Sent when an application is marked Revise & reapply or Not accepted (includes the reviewer note if provided).",
    subject: applicationStatusEmail({ fullName: SAMPLE.fullName, status: "REVISE_AND_REAPPLY" }).subject,
  },
  {
    key: "application_accepted_payment_link",
    name: "Acceptance + payment instructions",
    when: "Sent when an application is marked Accepted; carries the resolved payment terms.",
    subject: paymentInstructionsEmail({
      fullName: SAMPLE.fullName,
      amount: 997,
      currency: "USD",
      supportEmail: SAMPLE.supportEmail,
    }).subject,
  },
  {
    key: "enrollment_welcome",
    name: "Enrollment welcome",
    when: "Sent when a paid applicant is enrolled; carries the set-password link.",
    subject: enrollmentWelcomeEmail({ fullName: SAMPLE.fullName, setPasswordUrl: "#", portalUrl: "#" }).subject,
  },
];

export default async function EmailTemplatesPage() {
  const counts = await prisma.emailEvent.groupBy({ by: ["template"], _count: { _all: true } });
  const sentByTemplate = Object.fromEntries(counts.map((c) => [c.template, c._count._all]));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Email templates"
        description="The branded HTML emails TenXPros sends. All are sent from hello@tenxpros.com with support@tenxpros.com as the help contact."
      />
      <Link href="/admin/email" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to email
      </Link>

      <div className="grid gap-4">
        {TEMPLATES.map((template) => (
          <Card key={template.key} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-navy-900">{template.name}</h2>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {sentByTemplate[template.key] ?? 0} sent
              </span>
            </div>
            <p className="text-sm text-slate-600">{template.when}</p>
            <p className="text-sm">
              <span className="font-medium text-slate-500">Subject: </span>
              <span className="text-navy-900">{template.subject}</span>
            </p>
            <p className="font-mono text-xs text-slate-400">{template.key}</p>
          </Card>
        ))}
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Templates are versioned in code (branded HTML with a plain-text fallback). In-app template editing is
        intentionally deferred; changes ship through a normal deploy.
      </p>
    </div>
  );
}
