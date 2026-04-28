import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "AI runs" };

export default async function AdminAIRunsPage() {
  const runs = await prisma.aIRunLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">AI runs</h1>
        <p className="text-muted-foreground text-sm">
          All LLM-assisted outputs are logged for auditability. Runs are reconciled against the human
          decision before anything goes live.
        </p>
      </header>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Purpose</th>
              <th className="p-3">Provider · Model</th>
              <th className="p-3">Status</th>
              <th className="p-3">Cost (USD)</th>
              <th className="p-3">Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="p-3 text-xs text-muted-foreground">{r.createdAt.toLocaleString()}</td>
                <td className="p-3 font-medium">{r.purpose}</td>
                <td className="p-3 text-muted-foreground">{r.provider} · {r.model}</td>
                <td className="p-3"><Badge tone={r.status === "SUCCESS" ? "success" : r.status === "FAILED" ? "danger" : "muted"}>{r.status.toLowerCase()}</Badge></td>
                <td className="p-3 text-muted-foreground">{r.costUsd?.toFixed?.(4) ?? "—"}</td>
                <td className="p-3">{r.reviewed ? <Badge tone="success">yes</Badge> : <Badge tone="muted">no</Badge>}</td>
              </tr>
            ))}
            {runs.length === 0 ? <tr><td className="p-3 text-muted-foreground" colSpan={6}>No AI runs yet.</td></tr> : null}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
