import { notFound } from "next/navigation";
import {
  deleteApplication,
  markPaymentCancelled,
  markPaymentFailed,
  markPaymentInstructionsSent,
  markPaymentReceivedAndEnroll,
  markPaymentWaived,
  updateApplicationDetails,
  updateApplicationStatus,
  upsertApplicationPaymentTerms,
} from "@/lib/actions/applications";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { InfoTip } from "@/components/ui/form-field";
import { PageHeader } from "@/components/shared/page-shell";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHODS, formatPaymentMethod, formatPaymentStatus } from "@/lib/payment-terms";
import {
  AI_EXPERIENCE_OPTIONS,
  DATA_SENSITIVITY_OPTIONS,
  WEEKLY_AVAILABILITY_OPTIONS,
  aiExperienceLabel,
  applicationStatusLabel,
  dataSensitivityLabel,
  weeklyAvailabilityLabel,
} from "@/lib/application-labels";
import { DeleteApplicationButton } from "@/components/admin/delete-application-button";

const statuses = ["UNDER_REVIEW", "ACCEPTED", "REVISE_AND_REAPPLY", "NOT_ACCEPTED"] as const;

// Precise, mistake-proof guidance for each status action (verified against the
// real transition rules and email side-effects), so any admin acts correctly.
const STATUS_SHARED_NOTE =
  "The Admin note is saved to the application and written to the audit log on every action. It is emailed to the applicant only for 'Revise & reapply' and 'Not accepted' (shown as 'Reviewer notes'), and only if you actually write something. For 'Under review' and 'Accepted' it stays internal.";

const STATUS_TIPS: Record<(typeof statuses)[number], string> = {
  UNDER_REVIEW:
    "Marks the application as actively being evaluated. No email is sent, and the Admin note stays internal. Allowed from Submitted, or from an application you previously sent back to revise.",
  ACCEPTED:
    "Records acceptance, creates a pending payment record, and emails the applicant their acceptance with payment instructions (amount, due date, manual-invoice details, support contact). The Admin note is not included and stays internal. Enrollment is a separate later step: after the payment arrives, use 'Mark payment received & enroll', which also sends the welcome and set-password email.",
  REVISE_AND_REAPPLY:
    "Emails the applicant a request to revise and resubmit. If you write an Admin note it is included verbatim under 'Reviewer notes'; if you leave it blank, no note is sent. Write it as polite, applicant-facing guidance, since they read it exactly as typed.",
  NOT_ACCEPTED:
    "Sends the applicant a polite decline. If you write an Admin note it is included verbatim under 'Reviewer notes'; leave it blank to send none. This is a final status with no further transitions, so use it only when the decision is final.",
};

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  async function enroll(formData: FormData) {
    "use server";
    await markPaymentReceivedAndEnroll(formData);
  }

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: { payments: true, user: true },
  });

  if (!application) notFound();

  const primaryPayment =
    application.payments.find((payment) => payment.id === `pending-${application.id}`) ??
    application.payments.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ??
    null;
  const dueAtValue = primaryPayment?.dueAt ? primaryPayment.dueAt.toISOString().slice(0, 10) : "";

  return (
    <div className="space-y-8">
      <PageHeader
        title={application.fullName}
        description={`${application.professionalRole} · ${application.domain} · ${application.country}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge status={application.status}>{applicationStatusLabel(application.status)}</Badge>
              <span className="text-sm text-slate-500">Applied {application.createdAt.toLocaleString()}</span>
            </div>
            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">Email</dt>
                <dd className="text-slate-900">{application.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">LinkedIn</dt>
                <dd className="text-slate-900">{application.linkedinUrl ?? "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">AI familiarity</dt>
                <dd className="text-slate-900">{aiExperienceLabel(application.aiExperience)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Weekly availability</dt>
                <dd className="text-slate-900">{weeklyAvailabilityLabel(application.timeAvailability)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Data sensitivity</dt>
                <dd className="text-slate-900">{dataSensitivityLabel(application.dataSensitivity)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Pricing tier snapshot</dt>
                <dd className="text-slate-900">{application.pricingTierAtApply ?? "FOUNDING"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-navy-900">Why TenXPros</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{application.whyTenXPros}</p>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold text-navy-900">Real problem brief</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {application.realProblemBrief}
            </p>
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-navy-900">Edit application details</h2>
              <DeleteApplicationButton
                applicationId={application.id}
                applicantName={application.fullName}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              />
            </div>
            <p className="text-sm text-slate-600">
              Correct any applicant detail. Changes are recorded in the audit log. Deleting is permanent.
            </p>
            <form action={updateApplicationDetails} className="space-y-4">
              <input type="hidden" name="applicationId" value={application.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full name">
                  <Input name="fullName" defaultValue={application.fullName} required />
                </Field>
                <Field label="Email">
                  <Input name="email" type="email" defaultValue={application.email} required />
                </Field>
                <Field label="Country">
                  <Input name="country" defaultValue={application.country} required />
                </Field>
                <Field label="Role / job function">
                  <Input name="professionalRole" defaultValue={application.professionalRole} required />
                </Field>
                <Field label="Field / industry context">
                  <Input name="domain" defaultValue={application.domain} required />
                </Field>
                <Field label="LinkedIn URL">
                  <Input name="linkedinUrl" type="url" defaultValue={application.linkedinUrl ?? ""} />
                </Field>
                <Field label="AI familiarity">
                  <Select name="aiExperience" defaultValue={application.aiExperience}>
                    {AI_EXPERIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Data sensitivity">
                  <Select name="dataSensitivity" defaultValue={application.dataSensitivity}>
                    {DATA_SENSITIVITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Weekly availability">
                  <Select name="timeAvailability" defaultValue={application.timeAvailability}>
                    {WEEKLY_AVAILABILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button type="submit" variant="secondary">
                Save details
              </Button>
            </form>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-navy-900">Status transition</h2>
            <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs leading-5 text-slate-500">{STATUS_SHARED_NOTE}</p>
            {statuses.map((status) => (
              <form key={status} action={updateApplicationStatus} className="space-y-3 rounded-md border border-neutral-200 p-3">
                <input type="hidden" name="applicationId" value={application.id} />
                <input type="hidden" name="status" value={status} />
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-navy-900">{applicationStatusLabel(status)}</span>
                  <InfoTip
                    id={`status-tip-${status}`}
                    label={`About marking ${applicationStatusLabel(status)}`}
                    text={STATUS_TIPS[status]}
                  />
                </div>
                <Textarea
                  name="adminNotes"
                  placeholder="Admin note (audited; emailed to the applicant only for revise/decline)"
                  defaultValue={application.adminNotes ?? ""}
                />
                <Button className="w-full" type="submit" variant={status === "NOT_ACCEPTED" ? "danger" : "primary"}>
                  Mark {applicationStatusLabel(status).toLowerCase()}
                </Button>
              </form>
            ))}
          </Card>

          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-navy-900">Enrollment</h2>
            <p className="text-sm leading-6 text-slate-600">
              After Stripe Payment Link payment is confirmed manually, enroll the participant.
            </p>
            <form action={enroll}>
              <input type="hidden" name="applicationId" value={application.id} />
              <Button className="w-full" type="submit" disabled={application.status !== "ACCEPTED"}>
                Mark payment received & enroll
              </Button>
            </form>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-navy-900">Payment management</h2>
            {primaryPayment ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge status={primaryPayment.status}>{formatPaymentStatus(primaryPayment.status)}</Badge>
                  <span className="text-slate-500">
                    {formatCurrency(primaryPayment.amount, primaryPayment.currency)}
                    {primaryPayment.method ? ` · ${formatPaymentMethod(primaryPayment.method)}` : ""}
                  </span>
                </div>

                <form
                  action={upsertApplicationPaymentTerms}
                  className="space-y-3 rounded-md border border-neutral-200 p-3"
                >
                  <input type="hidden" name="applicationId" value={application.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Amount (whole)">
                      <Input name="amount" type="number" min={1} step={1} defaultValue={primaryPayment.amount} required />
                    </Field>
                    <Field label="Currency">
                      <Input name="currency" maxLength={3} defaultValue={primaryPayment.currency} />
                    </Field>
                  </div>
                  <Field label="Method">
                    <Select name="method" defaultValue={primaryPayment.method ?? ""}>
                      <option value="">Not set</option>
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {formatPaymentMethod(method)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Payment link (https URL)">
                    <Input
                      name="paymentLink"
                      type="url"
                      placeholder="https://…"
                      defaultValue={primaryPayment.paymentLink ?? ""}
                    />
                  </Field>
                  <Field label="Payment instructions (shown to applicant)">
                    <Textarea
                      name="paymentInstructions"
                      className="min-h-20"
                      defaultValue={primaryPayment.paymentInstructions ?? ""}
                    />
                  </Field>
                  <Field label="Due date">
                    <Input name="dueAt" type="date" defaultValue={dueAtValue} />
                  </Field>
                  <Field label="Discount note (internal by default)">
                    <Textarea
                      name="discountNote"
                      className="min-h-16"
                      defaultValue={primaryPayment.discountNote ?? ""}
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="showDiscountNoteToApplicant"
                      defaultChecked={primaryPayment.showDiscountNoteToApplicant}
                    />
                    Show discount note to applicant in the email
                  </label>
                  <Field label="Internal note (never emailed)">
                    <Textarea
                      name="internalNote"
                      className="min-h-16"
                      defaultValue={primaryPayment.internalNote ?? ""}
                    />
                  </Field>
                  <Button type="submit" variant="secondary" className="w-full">
                    Save payment terms
                  </Button>
                </form>

                <div className="space-y-2 rounded-md border border-neutral-200 p-3">
                  <p className="text-sm font-semibold text-navy-900">Status actions</p>
                  <form action={markPaymentInstructionsSent}>
                    <input type="hidden" name="paymentRecordId" value={primaryPayment.id} />
                    <Button type="submit" variant="secondary" className="w-full">
                      Send payment instructions
                    </Button>
                  </form>
                  <form action={markPaymentWaived} className="space-y-2">
                    <input type="hidden" name="paymentRecordId" value={primaryPayment.id} />
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" name="enroll" />
                      Also enroll the participant (accepted apps only)
                    </label>
                    <Button type="submit" variant="secondary" className="w-full">
                      Waive payment
                    </Button>
                  </form>
                  <div className="grid grid-cols-2 gap-2">
                    <form action={markPaymentFailed}>
                      <input type="hidden" name="paymentRecordId" value={primaryPayment.id} />
                      <Button type="submit" variant="danger" className="w-full">
                        Mark failed
                      </Button>
                    </form>
                    <form action={markPaymentCancelled}>
                      <input type="hidden" name="paymentRecordId" value={primaryPayment.id} />
                      <Button type="submit" variant="danger" className="w-full">
                        Cancel
                      </Button>
                    </form>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                No payment record yet. Accept the application to create a pending payment, then customize terms here.
              </p>
            )}

            {application.payments.length > 0 ? (
              <div className="space-y-1 border-t border-neutral-200 pt-3 text-sm text-slate-600">
                <p className="font-semibold text-navy-900">History</p>
                {application.payments.map((payment) => (
                  <p key={payment.id}>
                    {formatPaymentStatus(payment.status)} · {formatCurrency(payment.amount, payment.currency)}
                    {payment.paidAt ? ` · paid ${payment.paidAt.toLocaleDateString()}` : ""}
                  </p>
                ))}
              </div>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
