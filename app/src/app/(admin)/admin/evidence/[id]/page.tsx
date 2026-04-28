import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { reviewEvidenceAction } from "./actions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminEvidenceReview({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { saved?: string; err?: string };
}) {
  const e = await prisma.evidenceArtifact.findUnique({
    where: { id: params.id },
    include: { professional: { include: { user: true } }, reviews: { include: { reviewer: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!e) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/evidence" className="text-sm text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to queue
      </Link>

      <header className="space-y-2">
        <Badge tone="accent">{e.type.replace(/_/g, " ").toLowerCase()}</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">{e.title}</h1>
        <p className="text-sm text-muted-foreground">
          by {e.professional.user.name ?? e.professional.user.email} · submitted {formatDate(e.createdAt)} · current status {e.status.toLowerCase().replace("_", " ")}
        </p>
      </header>

      {searchParams?.saved ? <Alert tone="success" title="Review saved">Status updated.</Alert> : null}
      {searchParams?.err ? <Alert tone="danger" title="Could not save">{decodeURIComponent(searchParams.err)}</Alert> : null}

      <Card>
        <CardContent className="p-6 space-y-3">
          <Section label="Description">{e.description}</Section>
          {e.roleContext ? <Section label="Role context">{e.roleContext}</Section> : null}
          <Section label="Human contribution">{e.humanContribution}</Section>
          <Section label="AI contribution">{e.aiContribution}</Section>
          <Section label="Risks considered">{e.risksConsidered}</Section>
          {e.aiToolsUsed.length > 0 ? <Section label="AI tools used">{e.aiToolsUsed.join(", ")}</Section> : null}
          {e.externalUrl ? <Section label="External link"><a href={e.externalUrl} className="text-primary break-all" target="_blank" rel="noreferrer">{e.externalUrl}</a></Section> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-semibold">Submit a review</p>
          <form action={reviewEvidenceAction.bind(null, e.id)} className="space-y-3">
            <div>
              <Label htmlFor="decision">Decision</Label>
              <select id="decision" name="decision" defaultValue="APPROVED" className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm">
                <option value="APPROVED">Approve (counts toward certification)</option>
                <option value="NEEDS_REVISION">Send back with notes</option>
                <option value="REJECTED">Reject</option>
              </select>
            </div>
            <div>
              <Label htmlFor="notes">Notes to the professional</Label>
              <Textarea id="notes" name="notes" rows={5} />
            </div>
            <div className="flex justify-end"><Button type="submit">Save review</Button></div>
          </form>
        </CardContent>
      </Card>

      {e.reviews.length > 0 ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Past reviews</p>
            <ul className="space-y-2 text-sm">
              {e.reviews.map((r) => (
                <li key={r.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.reviewer.name ?? r.reviewer.email}</span>
                    <Badge tone={r.decision === "APPROVED" ? "success" : r.decision === "REJECTED" ? "danger" : "warning"}>
                      {r.decision.toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">{r.notes ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.createdAt.toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{children}</p>
    </div>
  );
}
