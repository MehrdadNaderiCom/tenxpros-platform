import Link from "next/link";
import { redirect } from "next/navigation";
import { FileCheck, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Evidence Vault" };

const VIS_TONE: Record<string, "muted" | "primary" | "accent" | "success"> = {
  PRIVATE: "muted",
  REVIEWERS_ONLY: "primary",
  EMPLOYER_VISIBLE: "accent",
  PUBLIC: "success",
};

export default async function EvidencePage() {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");
  const items = await prisma.evidenceArtifact.findMany({
    where: { professionalId: user.professionalId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <Badge tone="primary"><FileCheck className="h-3 w-3" /> Evidence Vault</Badge>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">Prove what you can actually do.</h1>
          <p className="text-muted-foreground max-w-2xl">
            Upload artifacts that demonstrate AI-enabled work: prompt chains, before/after, automation
            designs, decision logs. Reviewers verify them. You decide who sees what.
          </p>
        </div>
        <Link href="/evidence/new"><Button><Plus className="h-4 w-4" /> New evidence</Button></Link>
      </header>

      {items.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No evidence yet. Add your first artifact to start your certification path.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge tone="accent">{e.type.replace(/_/g, " ").toLowerCase()}</Badge>
                  <Badge tone={VIS_TONE[e.visibility]}>{e.visibility.replace("_", " ").toLowerCase()}</Badge>
                </div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">{e.description}</p>
                {e.externalUrl ? (
                  <Link href={e.externalUrl} className="text-xs text-primary inline-flex items-center" target="_blank" rel="noreferrer">
                    Open external link
                  </Link>
                ) : null}
                <p className="text-xs text-muted-foreground">Status: {e.status.toLowerCase().replace("_", " ")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
