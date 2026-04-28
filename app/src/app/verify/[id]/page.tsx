import { notFound } from "next/navigation";
import { BadgeCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";
import { certificateLevelLabels, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Verify certificate" };

export default async function VerifyPage({ params }: { params: { id: string } }) {
  const cert = await prisma.certificate.findUnique({
    where: { publicId: params.id },
    include: {
      requirements: true,
      professional: { include: { user: true, publicProfile: true } },
    },
  });
  if (!cert) notFound();

  const issued = cert.status === "ISSUED";
  const revoked = cert.status === "REVOKED";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="container py-4 flex items-center justify-between">
          <Logo />
          <span className="text-xs text-muted-foreground">Public verification</span>
        </div>
      </header>

      <main className="container py-12 max-w-3xl space-y-6">
        <Card>
          <CardContent className="p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <Badge tone={issued ? "success" : revoked ? "danger" : "warning"} className="mb-3">
                  {issued ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                  {issued ? "Verified · Issued" : revoked ? `Revoked · ${cert.revocationReason ?? "no reason given"}` : "Not yet issued"}
                </Badge>
                <h1 className="text-2xl font-semibold">{cert.professional.user.name ?? "Professional"}</h1>
                <p className="text-sm text-muted-foreground">{cert.professional.publicProfile?.headline ?? cert.professional.headline ?? ""}</p>
              </div>
              <BadgeCheck className="h-10 w-10 text-accent" />
            </div>

            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <Field label="Certificate ID">{cert.publicId}</Field>
              <Field label="Level">{certificateLevelLabels[cert.level]}</Field>
              <Field label="Issued">{formatDate(cert.issuedAt)}</Field>
              <Field label="Expires">{formatDate(cert.expiresAt)}</Field>
              <Field label="Role focus">{cert.roleFocus ?? "—"}</Field>
              <Field label="Assessment score">{cert.assessmentScore ?? "—"}</Field>
            </div>

            {cert.evidenceSummary ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Evidence summary</p>
                <p className="text-sm leading-relaxed">{cert.evidenceSummary}</p>
              </div>
            ) : null}

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Requirements verified</p>
              <ul className="text-sm space-y-1">
                {cert.requirements.map((r) => (
                  <li key={r.id} className="flex items-start gap-2">
                    <span className={r.satisfied ? "text-[hsl(var(--success))]" : "text-muted-foreground"}>{r.satisfied ? "✓" : "○"}</span>
                    <span className={r.satisfied ? "" : "text-muted-foreground"}>{r.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-xs text-muted-foreground leading-relaxed">
            A TenXPros certificate verifies completion and evidence review within the TenXPros framework
            and does not represent external accreditation unless explicitly stated. Issuance and revocation
            decisions are made by humans and are auditable. If you have a concern, contact us at <span className="font-medium">trust@tenxpros.com</span>.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}
