import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Evidence review queue" };

export default async function AdminEvidenceQueuePage() {
  const items = await prisma.evidenceArtifact.findMany({
    where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    orderBy: { createdAt: "asc" },
    include: { professional: { include: { user: true } } },
  });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Evidence review queue</h1>
        <p className="text-muted-foreground text-sm">Evidence must be reviewed by a human before it can count toward certification.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge tone="accent">{e.type.replace(/_/g, " ").toLowerCase()}</Badge>
                <Badge tone={e.status === "SUBMITTED" ? "warning" : "primary"}>{e.status.replace("_", " ").toLowerCase()}</Badge>
              </div>
              <p className="font-semibold">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                by {e.professional.user.name ?? e.professional.user.email} · submitted {formatDate(e.createdAt)}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-3">{e.description}</p>
              <Link href={`/admin/evidence/${e.id}`} className="text-primary text-xs">Open review</Link>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 ? <p className="text-sm text-muted-foreground">Queue empty. Nice.</p> : null}
      </div>
    </div>
  );
}
