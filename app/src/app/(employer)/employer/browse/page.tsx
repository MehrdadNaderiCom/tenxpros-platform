import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { certificateLevelLabels } from "@/lib/utils";

export const metadata = { title: "Browse professionals" };

export default async function BrowseProsPage({ searchParams }: { searchParams?: { q?: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "EMPLOYER") redirect("/sign-in");
  const q = (searchParams?.q ?? "").trim();

  const pros = await prisma.professionalProfile.findMany({
    where: {
      visibility: { in: ["EMPLOYER_VISIBLE", "PUBLIC"] },
      certificates: { some: { status: "ISSUED" } },
      ...(q
        ? {
            OR: [
              { headline: { contains: q, mode: "insensitive" } },
              { currentRole: { contains: q, mode: "insensitive" } },
              { targetRole: { contains: q, mode: "insensitive" } },
              { industry: { contains: q, mode: "insensitive" } },
              { skills: { has: q } },
              { aiToolsUsed: { has: q } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { name: true } },
      certificates: { where: { status: "ISSUED" }, orderBy: { issuedAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Browse professionals</h1>
        <p className="text-muted-foreground text-sm">Only opt-in, certificate-holding professionals are listed here.</p>
      </header>

      <Card><CardContent className="p-6">
        <form className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="q">Search</Label>
            <Input id="q" name="q" defaultValue={q} placeholder="role, industry, skill, AI tool…" />
          </div>
          <div className="self-end">
            <Button type="submit"><Search className="h-4 w-4" /> Search</Button>
          </div>
        </form>
      </CardContent></Card>

      <div className="grid gap-4 md:grid-cols-2">
        {pros.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge tone="accent">{certificateLevelLabels[p.certificates[0]?.level ?? "L1_AI_READY"].split(" · ")[0]}</Badge>
                <span className="text-xs text-muted-foreground">Score {p.readinessScore ?? "—"}</span>
              </div>
              <p className="font-semibold">{p.user.name ?? "Professional"}</p>
              <p className="text-sm text-muted-foreground">{p.headline ?? ""}</p>
              <p className="text-xs text-muted-foreground">
                {p.currentRole ?? "—"} · {p.location ?? "—"} · {p.remotePreference ?? "—"}
              </p>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {(p.skills ?? []).slice(0, 5).map((s) => <Badge key={s} tone="muted">{s}</Badge>)}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Link href={`/pros/${p.slug}`} className="text-sm text-primary">Open public profile</Link>
                <Link href={`/employer/request?professionalId=${p.id}`} className="text-sm text-primary">Request intro</Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {pros.length === 0 ? <p className="text-sm text-muted-foreground">No matching opt-in professionals found. Try another query.</p> : null}
      </div>
    </div>
  );
}
