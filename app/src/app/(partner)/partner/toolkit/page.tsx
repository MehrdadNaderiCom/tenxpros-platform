import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerToolkitPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const posts = await prisma.toolkitPost.findMany({
    where: { isPublished: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { files: true } } },
  });

  // Group by category, preserving order.
  const groups: { category: string; posts: typeof posts }[] = [];
  for (const p of posts) {
    const group = groups.find((g) => g.category === p.category);
    if (group) group.posts.push(p);
    else groups.push({ category: p.category, posts: [p] });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partner Toolkit"
        description="Resources you can read and use: outreach and objection templates, and industry and role-specific templates. We add to it regularly, so it is worth a look at least once a month."
      />

      {groups.map((g) => (
        <div key={g.category} className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">{g.category}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {g.posts.map((p) => (
              <Card key={p.id} className="flex flex-col justify-between gap-3">
                <div>
                  <Link href={`/partner/toolkit/${p.slug}`} className="font-semibold text-navy-900 hover:underline">
                    {p.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{p._count.files > 0 ? `${p._count.files} file(s) attached` : "Reference"}</p>
                </div>
                <Link href={`/partner/toolkit/${p.slug}`} className="text-sm font-medium text-navy-700 hover:underline">
                  Open
                </Link>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {posts.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">The toolkit is being prepared. Check back soon.</p>
        </Card>
      ) : (
        <p className="text-xs text-slate-400">
          <Badge status="OPEN">Tip</Badge> New resources are added over time. Revisit monthly.
        </p>
      )}
    </div>
  );
}
