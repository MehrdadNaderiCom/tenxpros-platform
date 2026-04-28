import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { certificateLevelLabels, formatDate } from "@/lib/utils";

export const metadata = { title: "Certifications" };

const STATUS_TONE: Record<string, "muted" | "warning" | "success" | "danger"> = {
  DRAFT: "muted",
  PENDING_REVIEW: "warning",
  ISSUED: "success",
  REVOKED: "danger",
  EXPIRED: "muted",
};

export default async function AdminCertsPage() {
  const certs = await prisma.certificate.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { professional: { include: { user: true } } },
  });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Certifications</h1>
        <p className="text-muted-foreground text-sm">Review pending requests, issue, or revoke certificates.</p>
      </header>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Public ID</th>
              <th className="p-3">Professional</th>
              <th className="p-3">Level</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3">Issued</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {certs.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-mono text-xs">{c.publicId}</td>
                <td className="p-3">{c.professional.user.name ?? c.professional.user.email}</td>
                <td className="p-3">{certificateLevelLabels[c.level].split(" · ")[0]}</td>
                <td className="p-3"><Badge tone={STATUS_TONE[c.status]}>{c.status.toLowerCase().replace("_", " ")}</Badge></td>
                <td className="p-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                <td className="p-3 text-muted-foreground">{formatDate(c.issuedAt)}</td>
                <td className="p-3"><Link href={`/admin/certifications/${c.id}`} className="text-primary text-xs">Review</Link></td>
              </tr>
            ))}
            {certs.length === 0 ? <tr><td className="p-3 text-muted-foreground" colSpan={7}>No certificates yet.</td></tr> : null}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
