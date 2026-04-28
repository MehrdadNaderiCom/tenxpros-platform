import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Organizations" };

export default async function AdminOrgsPage() {
  const orgs = await prisma.organizationProfile.findMany({
    include: { user: true, _count: { select: { roleNeeds: true, requests: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Organisations</h1>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Industry</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Role needs</th>
              <th className="p-3">Requests</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs.map((o) => (
              <tr key={o.id}>
                <td className="p-3 font-medium">{o.name}</td>
                <td className="p-3 text-muted-foreground">{o.industry ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{o.user.email}</td>
                <td className="p-3">{o._count.roleNeeds}</td>
                <td className="p-3">{o._count.requests}</td>
                <td className="p-3 text-muted-foreground">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
            {orgs.length === 0 ? <tr><td className="p-3 text-muted-foreground" colSpan={6}>No organisations yet.</td></tr> : null}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
