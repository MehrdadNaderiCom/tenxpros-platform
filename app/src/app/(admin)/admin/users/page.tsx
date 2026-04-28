import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Professionals" };

export default async function AdminUsersPage() {
  const pros = await prisma.professionalProfile.findMany({
    include: { user: true, _count: { select: { evidence: true, tasks: true, certificates: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Professionals</h1>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Visibility</th>
              <th className="p-3">Score</th>
              <th className="p-3">Tasks</th>
              <th className="p-3">Evidence</th>
              <th className="p-3">Certs</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Public</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pros.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-medium">{p.user.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.user.email}</td>
                <td className="p-3"><Badge tone="muted">{p.visibility}</Badge></td>
                <td className="p-3">{p.readinessScore ?? "—"}</td>
                <td className="p-3">{p._count.tasks}</td>
                <td className="p-3">{p._count.evidence}</td>
                <td className="p-3">{p._count.certificates}</td>
                <td className="p-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                <td className="p-3"><Link href={`/pros/${p.slug}`} className="text-primary text-xs">/pros/{p.slug}</Link></td>
              </tr>
            ))}
            {pros.length === 0 ? <tr><td className="p-3 text-muted-foreground" colSpan={9}>No professionals yet.</td></tr> : null}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
