import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Platform settings" };

export default async function AdminSettingsPage() {
  const [userCount, certIssued, aiRuns, lastAudit] = await Promise.all([
    prisma.user.count(),
    prisma.certificate.count({ where: { status: "ISSUED" } }),
    prisma.aIRunLog.count(),
    prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Platform settings</h1>

      <Card><CardContent className="p-6 space-y-2 text-sm">
        <p className="font-semibold">Environment</p>
        <Row label="App URL" value={process.env.APP_URL ?? "http://localhost:3000"} />
        <Row label="AI enabled" value={process.env.AI_ENABLED === "true" ? "yes" : "no"} />
        <Row label="AI provider" value={process.env.AI_PROVIDER ?? "none"} />
        <Row label="Default region" value={process.env.DEFAULT_REGION ?? "eu-west"} />
      </CardContent></Card>

      <Card><CardContent className="p-6 space-y-2 text-sm">
        <p className="font-semibold">Platform stats</p>
        <Row label="Users" value={String(userCount)} />
        <Row label="Certificates issued" value={String(certIssued)} />
        <Row label="AI runs logged" value={String(aiRuns)} />
        <Row label="Last audit event" value={lastAudit ? `${lastAudit.action} · ${formatDate(lastAudit.createdAt)}` : "—"} />
      </CardContent></Card>

      <Card><CardContent className="p-6 space-y-2 text-sm">
        <p className="font-semibold">Trust & governance</p>
        <p className="text-muted-foreground">
          TenXPros issues and revokes certificates with human review. All scoring, recommendations and
          AI output are logged and reconcilable. Reviewers are listed in the docs section.
        </p>
        <Badge tone="success">Human-in-the-loop for every issuance</Badge>
      </CardContent></Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border last:border-0 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate ml-4">{value}</span>
    </div>
  );
}
