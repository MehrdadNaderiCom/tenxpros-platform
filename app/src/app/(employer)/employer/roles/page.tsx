import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { certificateLevelLabels, formatDate } from "@/lib/utils";

export const metadata = { title: "Role needs" };

export default async function RoleNeedsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "EMPLOYER") redirect("/sign-in");
  const org = await prisma.organizationProfile.findUnique({ where: { userId: user.id } });
  if (!org) redirect("/employer/organization");

  const roles = await prisma.employerRoleNeed.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Role needs</h1>
        <Link href="/employer/roles/new"><Button><Plus className="h-4 w-4" /> Post a role</Button></Link>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge tone="accent">{certificateLevelLabels[r.minCertificateLevel].split(" · ")[0]}</Badge>
                <Badge tone={r.status === "OPEN" ? "success" : r.status === "CLOSED" ? "muted" : "warning"}>{r.status.toLowerCase()}</Badge>
              </div>
              <p className="font-semibold">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.industry ?? "—"} · {r.location ?? "—"} · {r.engagementType ?? "—"}</p>
              <p className="text-sm text-muted-foreground line-clamp-3">{r.description}</p>
              <p className="text-xs text-muted-foreground">Matches offered: {r._count.matches} · Posted {formatDate(r.createdAt)}</p>
            </CardContent>
          </Card>
        ))}
        {roles.length === 0 ? <p className="text-sm text-muted-foreground">No role needs posted yet.</p> : null}
      </div>
    </div>
  );
}
