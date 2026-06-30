import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deletePartnerApplication, reviewPartnerApplication, updatePartnerApplication } from "@/lib/actions/partner-admin";
import { PARTNER_APPLICATION_STATUS_LABELS } from "@/lib/partner/constants";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value || "-"}</p>
    </div>
  );
}

export default async function PartnerApplicationDetailPage({ params }: { params: { id: string } }) {
  const a = await prisma.partnerApplication.findUnique({
    where: { id: params.id },
    include: {
      partner: true,
      // Metadata only, never load the file bytes into the page.
      documents: { select: { kind: true, filename: true, size: true } },
    },
  });
  if (!a) notFound();

  const DOC_LABELS: Record<string, string> = { RESUME: "Resume", COVER_LETTER: "Cover letter" };
  const DOC_SLUGS: Record<string, string> = { RESUME: "resume", COVER_LETTER: "cover-letter" };

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
        <Detail label="Agreed to Partner Program Terms" value={a.consentNoEquity ? "Yes" : "No"} />
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Edit applicant details</h2>
        <form action={updatePartnerApplication} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="applicationId" value={a.id} />
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Full name</span>
            <Input name="fullName" defaultValue={a.fullName} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Email</span>
            <Input name="email" type="email" defaultValue={a.email} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Phone</span>
            <Input name="phone" defaultValue={a.phone ?? ""} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Country</span>
            <Input name="country" defaultValue={a.country} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Region / city</span>
            <Input name="region" defaultValue={a.region ?? ""} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">LinkedIn / profile URL</span>
            <Input name="linkedinUrl" type="url" defaultValue={a.linkedinUrl ?? ""} />
          </label>
          <div className="md:col-span-2">
            <Button type="submit" size="sm">Save applicant details</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-5">
        <Detail label="Relevant background" value={a.background} />
        <Detail label="Target markets / organisations" value={a.targetMarkets} />
        <Detail label="Case for these accounts" value={a.accountJustification} />
      </Card>

      {a.documents.length > 0 ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">Attached documents</h2>
          <div className="flex flex-wrap gap-3">
            {a.documents.map((doc) => (
              <a
                key={doc.kind}
                href={`/admin/partners/applications/${a.id}/document/${DOC_SLUGS[doc.kind]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
              >
                {DOC_LABELS[doc.kind]}
                <span className="text-xs font-normal text-slate-500">
                  {Math.max(1, Math.round(doc.size / 1024))} KB · PDF
                </span>
              </a>
            ))}
          </div>
        </Card>
      ) : null}

      {a.partner ? (
        <Alert tone="success" title="Approved, partner created.">
          <Link href={`/admin/partners/${a.partner.id}`} className="mt-1 inline-block text-sm font-medium text-navy-600 hover:underline">
            Open partner record →
          </Link>
        </Alert>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Review decision</h2>
          <div className="mt-3 flex justify-end">
            <ConfirmSubmit
              action={deletePartnerApplication}
              hidden={{ applicationId: a.id }}
              message={`Permanently delete the application from "${a.fullName}"? This also removes any uploaded resume or cover letter and cannot be undone.`}
              label="Delete application"
            />
          </div>
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
