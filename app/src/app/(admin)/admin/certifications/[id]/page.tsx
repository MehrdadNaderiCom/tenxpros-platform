import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea, Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { certificateLevelLabels, formatDate } from "@/lib/utils";
import { issueCertificateAction, revokeCertificateAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminCertDetail({ params, searchParams }: { params: { id: string }; searchParams?: { saved?: string; err?: string } }) {
  const cert = await prisma.certificate.findUnique({
    where: { id: params.id },
    include: {
      professional: { include: { user: true, evidence: { where: { status: "APPROVED" }, take: 10 }, scenarioSubmissions: { where: { status: "ACCEPTED" }, take: 10 } } },
      requirements: true,
    },
  });
  if (!cert) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/certifications" className="text-sm text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {searchParams?.saved ? <Alert tone="success" title="Saved">Certificate state updated.</Alert> : null}
      {searchParams?.err ? <Alert tone="danger" title="Could not save">{decodeURIComponent(searchParams.err)}</Alert> : null}

      <Card>
        <CardContent className="p-6 space-y-3">
          <Badge tone="accent">{certificateLevelLabels[cert.level]}</Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            {cert.professional.user.name ?? cert.professional.user.email}
          </h1>
          <p className="text-xs text-muted-foreground">Public ID {cert.publicId} · Status {cert.status.toLowerCase().replace("_", " ")} · Created {formatDate(cert.createdAt)} · Issued {formatDate(cert.issuedAt)}</p>
          {cert.evidenceSummary ? <p className="text-sm">{cert.evidenceSummary}</p> : null}

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-2 mb-1">Requirements</p>
            <ul className="text-sm space-y-1">
              {cert.requirements.map((r) => (
                <li key={r.id} className="flex items-start gap-2">
                  <span className={r.satisfied ? "text-[hsl(var(--success))]" : "text-muted-foreground"}>{r.satisfied ? "✓" : "○"}</span>
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <p className="font-semibold">Supporting evidence ({cert.professional.evidence.length})</p>
          <ul className="text-sm space-y-1">
            {cert.professional.evidence.map((e) => (
              <li key={e.id} className="rounded-md border border-border p-2">
                <Badge tone="accent">{e.type.replace(/_/g, " ").toLowerCase()}</Badge>
                <p className="font-medium mt-1">{e.title}</p>
                <p className="text-muted-foreground line-clamp-2">{e.description}</p>
              </li>
            ))}
            {cert.professional.evidence.length === 0 ? <li className="text-muted-foreground">No approved evidence.</li> : null}
          </ul>
          <p className="text-xs text-muted-foreground pt-2">Accepted scenarios: {cert.professional.scenarioSubmissions.length}</p>
        </CardContent>
      </Card>

      {cert.status !== "ISSUED" ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Issue certificate</p>
            <form action={issueCertificateAction.bind(null, cert.id)} className="space-y-3">
              <div>
                <Label htmlFor="roleFocus">Role focus (optional)</Label>
                <Input id="roleFocus" name="roleFocus" defaultValue={cert.roleFocus ?? ""} />
              </div>
              <div>
                <Label htmlFor="evidenceSummary">Evidence summary (public)</Label>
                <Textarea id="evidenceSummary" name="evidenceSummary" rows={4} defaultValue={cert.evidenceSummary ?? ""} placeholder="1–3 sentences that reviewers can stand behind publicly." />
              </div>
              <div>
                <Label htmlFor="assessmentScore">Assessment score (0-100, optional)</Label>
                <Input id="assessmentScore" name="assessmentScore" type="number" min={0} max={100} defaultValue={cert.assessmentScore ?? ""} />
              </div>
              <div className="flex justify-end"><Button type="submit">Issue certificate</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Revoke certificate</p>
            <form action={revokeCertificateAction.bind(null, cert.id)} className="space-y-3">
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" name="reason" rows={3} required />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="danger">Revoke</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Public verification: <Link href={`/verify/${cert.publicId}`} className="text-primary">/verify/{cert.publicId}</Link>
      </p>
    </div>
  );
}
