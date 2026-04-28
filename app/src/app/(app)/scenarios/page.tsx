import Link from "next/link";
import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { certificateLevelLabels } from "@/lib/utils";

export const metadata = { title: "Scenarios" };

export default async function ScenariosPage() {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");

  const [scenarios, submissions] = await Promise.all([
    prisma.scenario.findMany({
      where: { published: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.scenarioSubmission.findMany({
      where: { professionalId: user.professionalId },
      select: { scenarioId: true, status: true, score: true },
    }),
  ]);
  const subMap = new Map(submissions.map((s) => [s.scenarioId, s]));

  return (
    <div className="space-y-6">
      <header>
        <Badge tone="primary"><Target className="h-3 w-3" /> Scenarios</Badge>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Scenario-based assessment</h1>
        <p className="text-muted-foreground max-w-2xl">
          Real-world prompts that test how you decide between human-led, AI-assisted, automated and
          escalated work — and how you keep risk and quality under control.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {scenarios.map((s) => {
          const sub = subMap.get(s.id);
          return (
            <Card key={s.id}>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge tone="accent">{certificateLevelLabels[s.certificateLevel].split(" · ")[0]}</Badge>
                  {sub ? <Badge tone={sub.status === "ACCEPTED" ? "success" : sub.status === "NEEDS_REVISION" ? "warning" : "muted"}>{sub.status.toLowerCase().replace("_", " ")}</Badge> : null}
                </div>
                <p className="font-semibold text-lg">{s.title}</p>
                {s.roleFocus ? <p className="text-xs text-muted-foreground">Role focus: {s.roleFocus}</p> : null}
                <p className="text-sm text-muted-foreground line-clamp-3">{s.prompt}</p>
                <Link href={`/scenarios/${s.id}`} className="text-primary text-sm">Open scenario</Link>
              </CardContent>
            </Card>
          );
        })}
        {scenarios.length === 0 ? <p className="text-sm text-muted-foreground">No scenarios published yet.</p> : null}
      </div>
    </div>
  );
}
