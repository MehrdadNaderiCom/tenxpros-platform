import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Search, Send, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Employer overview" };

export default async function EmployerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "EMPLOYER") redirect("/sign-in");
  const org = await prisma.organizationProfile.findUnique({
    where: { userId: user.id },
    include: {
      roleNeeds: { orderBy: { createdAt: "desc" }, take: 5 },
      requests: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { roleNeeds: true, matches: true } },
    },
  });
  if (!org) redirect("/employer/organization");

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Welcome, {user.name?.split(" ")[0] ?? ""}.</p>
          <h1 className="text-3xl font-semibold tracking-tight">{org.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/employer/roles/new"><Button><Send className="h-4 w-4" /> Post a role</Button></Link>
          <Link href="/employer/browse"><Button variant="outline"><Search className="h-4 w-4" /> Browse professionals</Button></Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Open role needs</p>
          <p className="text-2xl font-semibold">{org._count.roleNeeds}</p>
          <Link href="/employer/roles" className="text-xs text-primary">Manage</Link>
        </CardContent></Card>
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Matches offered by TenXPros</p>
          <p className="text-2xl font-semibold">{org._count.matches}</p>
          <Link href="/employer/matches" className="text-xs text-primary">View</Link>
        </CardContent></Card>
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Verification status</p>
          <Badge tone={org.verified ? "success" : "warning"}>{org.verified ? "Verified employer" : "Pending verification"}</Badge>
          <p className="text-xs text-muted-foreground">Verified employers can view more profile detail.</p>
        </CardContent></Card>
      </section>

      <Card><CardContent className="p-6 space-y-3">
        <p className="font-semibold">Latest role needs</p>
        {org.roleNeeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No role needs yet. Post your first role to start matching.</p>
        ) : (
          <ul className="text-sm divide-y divide-border">
            {org.roleNeeds.map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.industry ?? "—"} · {r.location ?? "—"}</p>
                </div>
                <Badge tone="muted">{r.status.toLowerCase().replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>

      <Card><CardContent className="p-6 space-y-3">
        <p className="font-semibold">Recent talent requests</p>
        {org.requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="text-sm divide-y divide-border">
            {org.requests.map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.kind}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.message ?? "—"}</p>
                </div>
                <Badge tone="muted">{r.status.toLowerCase().replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>

      <Card><CardContent className="p-6 text-xs text-muted-foreground">
        <p className="flex items-center gap-2"><ClipboardList className="h-3.5 w-3.5" /> We match humans first. Automation is only used to shortlist, never to reject. You'll always talk to real candidates.</p>
      </CardContent></Card>
    </div>
  );
}
