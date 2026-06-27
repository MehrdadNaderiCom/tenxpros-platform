import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { reviewPartnerApplication } from "@/lib/actions/partner-admin";
import { PARTNER_APPLICATION_STATUS_LABELS } from "@/lib/partner/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

export default async function PartnerApplicationDetailPage({ params }: { params: { id: string } }) {
  const a = await prisma.partnerApplication.findUnique({
    where: { id: params.id },
    include: { partner: true },
  });
  if (!a) notFound();

  const decided = a.status === "APPROVED" || a.status === "REJECTED";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader title={a.fullName} description={`Applied ${a.createdAt.toLocaleDateString()} · ${a.email}`} />
        <Badge status={a.status === "APPROVED" ? "APPROVED" : a.status === "REJECTED" ? "NOT_COMPLETED" : "SUBMITTED"}>
          {PARTNER_APPLICATION_STATUS_LABELS[a.status]}
        </Badge>
      </div>

      <Card className="grid gap-5 md:grid-cols-2">
        <Detail label="Email" value={a.email} />
        <Detail label="Phone" value={a.phone} />
        <Detail label="Country" value={a.country} />
        <Detail label="Region / city" value={a.region} />
        <Detail label="LinkedIn / profile" value={a.linkedinUrl} />
        <Detail label="Sells to" value={a.audience} />
        <Detail label="Heard from" value={a.heardFrom} />
        <Detail label="Acknowledged no-equity terms" value={a.consentNoEquity ? "Yes" : "No"} />
      </Card>

      <Card className="space-y-5">
        <Detail label="Relevant background" value={a.background} />
        <Detail label="Target markets / organisations" value={a.targetMarkets} />
        <Detail label="Case for these accounts" value={a.accountJustification} />
      </Card>

      {a.partner ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <p className="text-sm font-semibold text-navy-900">Approved — partner created.</p>
          <Link href={`/admin/partners/${a.partner.id}`} className="mt-1 inline-block text-sm font-medium text-navy-600 hover:underline">
            Open partner record →
          </Link>
        </Card>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Review decision</h2>
          {a.reviewerNotes ? <p className="mt-2 text-sm text-slate-600">Previous notes: {a.reviewerNotes}</p> : null}
          <form action={reviewPartnerApplication} className="mt-4 space-y-4">
            <input type="hidden" name="applicationId" value={a.id} />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-900">Notes to the applicant (optional)</span>
              <Textarea name="reviewerNotes" defaultValue={a.reviewerNotes ?? ""} placeholder="Included in the decision email." />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" name="decision" value="APPROVE">
                Approve &amp; start pilot
              </Button>
              <Button type="submit" name="decision" value="UNDER_REVIEW" variant="secondary" disabled={decided}>
                Mark under review
              </Button>
              <Button type="submit" name="decision" value="REJECT" variant="danger" disabled={decided}>
                Reject
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
