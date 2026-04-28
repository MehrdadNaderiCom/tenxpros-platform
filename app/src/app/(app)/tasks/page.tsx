import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Workflow } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { workModeLabels, workModeDescriptions } from "@/lib/utils";

export const metadata = { title: "Personal Task Radar" };

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");
  const tasks = await prisma.professionalTask.findMany({
    where: { professionalId: user.professionalId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <Badge tone="primary"><Workflow className="h-3 w-3" /> Personal Task Radar</Badge>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">Map your real work to the right work mode.</h1>
          <p className="text-muted-foreground max-w-2xl">
            Tell us about your recurring tasks. The classifier recommends a work mode — human-led,
            AI-assisted, rules-based, automated, AI tool chain, escalate, or not suitable for AI.
          </p>
        </div>
        <Link href="/tasks/new"><Button><Plus className="h-4 w-4" /> Add task</Button></Link>
      </header>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No tasks yet. Start with a few recurring tasks from your week — a status report, a candidate screen,
            a recurring email, a forecast. The classifier will suggest the right mode.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{t.title}</p>
                    {t.roleContext ? <p className="text-xs text-muted-foreground">{t.roleContext}</p> : null}
                  </div>
                  <Badge tone="accent">{workModeLabels[t.recommendedMode]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{t.description}</p>
                <p className="text-xs text-muted-foreground italic">{workModeDescriptions[t.recommendedMode]}</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Badge tone="muted">{t.frequency.toLowerCase().replace("_", " ")}</Badge>
                  <Badge tone={t.riskLevel === "LOW" ? "muted" : t.riskLevel === "MEDIUM" ? "warning" : "danger"}>
                    risk: {t.riskLevel.toLowerCase()}
                  </Badge>
                  <Badge tone={t.confidentiality === "PUBLIC" || t.confidentiality === "INTERNAL" ? "muted" : "warning"}>
                    {t.confidentiality.toLowerCase()}
                  </Badge>
                  <Badge tone="muted">value {t.businessValue}/5</Badge>
                  <Badge tone="muted">complexity {t.complexity}/5</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
