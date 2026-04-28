import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, certificateLevelLabels } from "@/lib/utils";

export const metadata = { title: "Matches" };

export default async function EmployerMatchesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "EMPLOYER") redirect("/sign-in");
  const org = await prisma.organizationProfile.findUnique({ where: { userId: user.id } });
  if (!org) redirect("/employer/organization");

  const matches = await prisma.employerMatch.findMany({
    where: { roleNeed: { organizationId: org.id } },
    include: {
      roleNeed: true,
      professional: {
        include: {
          user: true,
          certificates: { where: { status: "ISSUED" }, orderBy: { issuedAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Matches</h1>
      <p className="text-muted-foreground text-sm">Matches are curated by the TenXPros review team from opt-in professionals.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {matches.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge tone="accent">{certificateLevelLabels[m.professional.certificates[0]?.level ?? "L1_AI_READY"].split(" · ")[0]}</Badge>
                <Badge tone="muted">{m.status.toLowerCase().replace("_", " ")}</Badge>
              </div>
              <p className="font-semibold">{m.professional.user.name ?? "Professional"}</p>
              <p className="text-xs text-muted-foreground">For role: {m.roleNeed.title}</p>
              {m.notes ? <p className="text-sm text-muted-foreground line-clamp-3">{m.notes}</p> : null}
              <p className="text-xs text-muted-foreground">Offered {formatDate(m.createdAt)}</p>
              <Link href={`/pros/${m.professional.slug}`} className="text-primary text-sm">Open public profile</Link>
            </CardContent>
          </Card>
        ))}
        {matches.length === 0 ? <p className="text-sm text-muted-foreground">No matches yet. Post role needs and we'll start matching.</p> : null}
      </div>
    </div>
  );
}
