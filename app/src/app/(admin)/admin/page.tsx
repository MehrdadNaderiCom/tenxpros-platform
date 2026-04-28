import Link from "next/link";
import { Activity, BadgeCheck, Building2, FileCheck, Sparkles, UsersRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const [
    proCount,
    orgCount,
    pendingCerts,
    pendingEvidence,
    pendingRequests,
    recentRuns,
  ] = await Promise.all([
    prisma.professionalProfile.count(),
    prisma.organizationProfile.count(),
    prisma.certificate.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.evidenceArtifact.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.employerRequest.count({ where: { status: { in: ["NEW", "IN_REVIEW"] } } }),
    prisma.aIRunLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Admin overview</h1>
        <p className="text-muted-foreground">Run TenXPros: review queues, content, employer requests and AI runs.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Stat icon={UsersRound} label="Professionals" value={proCount} href="/admin/users" />
        <Stat icon={Building2} label="Organisations" value={orgCount} href="/admin/organizations" />
        <Stat icon={BadgeCheck} label="Certificates pending review" value={pendingCerts} href="/admin/certifications" tone={pendingCerts > 0 ? "primary" : "muted"} />
        <Stat icon={FileCheck} label="Evidence to review" value={pendingEvidence} href="/admin/evidence" tone={pendingEvidence > 0 ? "primary" : "muted"} />
        <Stat icon={Activity} label="Open employer requests" value={pendingRequests} href="/admin/employer-requests" tone={pendingRequests > 0 ? "primary" : "muted"} />
        <Stat icon={Sparkles} label="AI runs (recent)" value={recentRuns.length} href="/admin/ai-runs" />
      </section>

      <Card>
        <CardContent className="p-6">
          <p className="font-semibold mb-3">Latest AI runs</p>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI runs yet.</p>
          ) : (
            <ul className="text-sm divide-y divide-border">
              {recentRuns.map((r) => (
                <li key={r.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.purpose}</p>
                    <p className="text-xs text-muted-foreground">{r.provider} · {r.model} · {r.status}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.createdAt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, href, tone = "muted" }: {
  icon: typeof Activity; label: string; value: number; href: string; tone?: "primary" | "muted";
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-semibold mt-1 ${tone === "primary" ? "text-primary" : ""}`}>{value}</p>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
