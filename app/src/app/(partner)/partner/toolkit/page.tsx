import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

// The three journey entry points. Each links to the first of its target
// categories that is actually present and published, so a renamed or hidden
// category never produces a dead jump.
const PATHS: Array<{ label: string; blurb: string; targets: string[] }> = [
  { label: "I found an individual", blurb: "A single senior professional in their own field.", targets: ["qualification-and-discovery", "outreach-templates", "industry-packs"] },
  { label: "I found an institution", blurb: "A team or organization adopting AI together.", targets: ["institutional-assets", "industry-packs", "outreach-templates"] },
  { label: "I want to promote", blurb: "Describe TenXPros truthfully and on brand.", targets: ["positioning-and-brand", "outreach-templates", "start-here"] },
];

export default async function PartnerToolkitPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const [categories, otherPosts] = await Promise.all([
    prisma.toolkitCategory.findMany({
      where: { isPublished: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        posts: {
          where: { isPublished: true },
          orderBy: [{ order: "asc" }, { createdAt: "desc" }],
          include: { _count: { select: { files: true, links: true } } },
        },
      },
    }),
    // Published posts with no managed category (for example older posts created
    // before categories existed) still appear here, so nothing published is lost.
    prisma.toolkitPost.findMany({
      where: { isPublished: true, categoryId: null },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { files: true, links: true } } },
    }),
  ]);

  const presentSlugs = new Set(categories.map((c) => c.slug));
  const paths = PATHS.map((p) => ({ label: p.label, blurb: p.blurb, anchor: p.targets.find((t) => presentSlugs.has(t)) }))
    .filter((p) => p.anchor);

  const hasAnything = categories.some((c) => c.posts.length > 0) || otherPosts.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partner Toolkit"
        description="A growing library of approved resources for reaching individuals and institutions and for promoting TenXPros honestly. It is useful now, and we add to it regularly, so it is worth a look often."
      />

      {paths.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {paths.map((p) => (
            <Link
              key={p.label}
              href={`#${p.anchor}`}
              className="rounded-lg border border-neutral-200 p-4 transition hover:border-navy-300 hover:bg-navy-50"
            >
              <p className="font-semibold text-navy-900">{p.label}</p>
              <p className="mt-1 text-xs text-slate-500">{p.blurb}</p>
            </Link>
          ))}
        </div>
      ) : null}

      {categories.map((c) => (
        <div key={c.id} id={c.slug} className="scroll-mt-24 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">{c.title}</h2>
            {c.description ? <p className="mt-1 text-sm text-slate-500">{c.description}</p> : null}
          </div>
          {c.posts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {c.posts.map((p) => {
                const attachments = p._count.files + p._count.links;
                return (
                  <Card key={p.id} className="flex flex-col justify-between gap-3">
                    <div>
                      <Link href={`/partner/toolkit/${p.slug}`} className="font-semibold text-navy-900 hover:underline">
                        {p.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{attachments > 0 ? `${attachments} attachment(s)` : "Reference"}</p>
                    </div>
                    <Link href={`/partner/toolkit/${p.slug}`} className="text-sm font-medium text-navy-700 hover:underline">
                      Open
                    </Link>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <p className="text-sm text-slate-500">We are adding resources here. Check back soon.</p>
            </Card>
          )}
        </div>
      ))}

      {otherPosts.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">More resources</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {otherPosts.map((p) => {
              const attachments = p._count.files + p._count.links;
              return (
                <Card key={p.id} className="flex flex-col justify-between gap-3">
                  <div>
                    <Link href={`/partner/toolkit/${p.slug}`} className="font-semibold text-navy-900 hover:underline">
                      {p.title}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">{attachments > 0 ? `${attachments} attachment(s)` : "Reference"}</p>
                  </div>
                  <Link href={`/partner/toolkit/${p.slug}`} className="text-sm font-medium text-navy-700 hover:underline">
                    Open
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {!hasAnything ? (
        <Card>
          <p className="text-sm text-slate-500">The toolkit is being prepared. Check back soon.</p>
        </Card>
      ) : (
        <p className="text-xs text-slate-400">
          <Badge status="OPEN">Living resource</Badge> New resources are added over time. Revisit often.
        </p>
      )}
    </div>
  );
}
