import { notFound } from "next/navigation";
import { markPaymentReceivedAndEnroll, updateApplicationStatus } from "@/lib/actions/applications";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";
import { formatCurrency } from "@/lib/utils";

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

          <Card>
            <h2 className="text-xl font-semibold text-navy-900">Payments</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {application.payments.map((payment) => (
                <p key={payment.id}>
                  {payment.status} · {formatCurrency(payment.amount, payment.currency)}
                </p>
              ))}
              {application.payments.length === 0 ? <p>No payment records yet.</p> : null}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
