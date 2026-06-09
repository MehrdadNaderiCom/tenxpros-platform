import { notFound } from "next/navigation";
import {
  markPaymentCancelled,
  markPaymentFailed,
  markPaymentInstructionsSent,
  markPaymentReceivedAndEnroll,
  markPaymentWaived,
  updateApplicationStatus,
  upsertApplicationPaymentTerms,
} from "@/lib/actions/applications";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHODS, formatPaymentMethod, formatPaymentStatus } from "@/lib/payment-terms";

const statuses = ["UNDER_REVIEW", "ACCEPTED", "REVISE_AND_REAPPLY", "NOT_ACCEPTED"] as const;

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
              <Badge status={application.status}>{application.status}</Badge>
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
                <dt className="text-sm font-medium text-slate-500">AI experience</dt>
                <dd className="text-slate-900">{application.aiExperience}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Time availability</dt>
                <dd className="text-slate-900">{application.timeAvailability}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Data sensitivity</dt>
                <dd className="text-slate-900">{application.dataSensitivity}</dd>
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
        </div>

        <aside className="space-y-4">
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-navy-900">Status transition</h2>
            {statuses.map((status) => (
              <form key={status} action={updateApplicationStatus} className="space-y-3 rounded-md border border-neutral-200 p-3">
                <input type="hidden" name="applicationId" value={application.id} />
                <input type="hidden" name="status" value={status} />
                <Textarea name="adminNotes" placeholder="Admin note for audit/email" defaultValue={application.adminNotes ?? ""} />
                <Button className="w-full" type="submit" variant={status === "NOT_ACCEPTED" ? "danger" : "primary"}>
                  Mark {status.replaceAll("_", " ").toLowerCase()}
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
