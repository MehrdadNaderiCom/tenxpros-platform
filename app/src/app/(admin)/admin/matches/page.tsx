import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Matches" };

export default async function AdminMatchesPage() {
  const matches = await prisma.employerMatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      roleNeed: { include: { organization: true } },
      professional: { include: { user: true } },
    },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Matches</h1>
      <p className="text-muted-foreground text-sm">Curated by admins; no algorithm auto-matches today.</p>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Professional</th>
              <th className="p-3">Role</th>
              <th className="p-3">Organization</th>
              <th className="p-3">Status</th>
              <th className="p-3">Score</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matches.map((m) => (
              <tr key={m.id}>
                <td className="p-3">{m.professional.user.name ?? m.professional.user.email}</td>
                <td className="p-3">{m.roleNeed.title}</td>
                <td className="p-3">{m.roleNeed.organization.name}</td>
                <td className="p-3"><Badge tone="muted">{m.status.toLowerCase().replace("_", " ")}</Badge></td>
                <td className="p-3">{m.score?.toFixed(2) ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{formatDate(m.createdAt)}</td>
              </tr>
            ))}
            {matches.length === 0 ? <tr><td className="p-3 text-muted-foreground" colSpan={6}>No matches yet.</td></tr> : null}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
