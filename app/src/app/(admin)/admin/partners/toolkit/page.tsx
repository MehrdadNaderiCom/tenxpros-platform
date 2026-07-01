import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, isSuperAdmin } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function AdminToolkitPage() {
  const admin = await requireAdminUser();
  if (!isSuperAdmin(admin.email)) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Authoring the Partner Toolkit is restricted to the primary admin.</p>
      </Card>
    );
  }

  const posts = await prisma.toolkitPost.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { files: true } } },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Partner Toolkit"
          description="Blog-style resources for partners: generic assets like outreach and objection templates, plus industry and role-specific templates. Partners read and download these."
        />
        <ButtonLink href="/admin/partners/toolkit/new">New post</ButtonLink>
      </div>

      <Card className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-4">
            <div>
              <Link href={`/admin/partners/toolkit/${p.id}`} className="font-semibold text-navy-900 hover:underline">
                {p.title}
              </Link>
              <p className="text-xs text-slate-500">
                {p.category} , {p._count.files} file(s) , /{p.slug}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge status={p.isPublished ? "APPROVED" : "DRAFT"}>{p.isPublished ? "Published" : "Draft"}</Badge>
              <ButtonLink href={`/admin/partners/toolkit/${p.id}`} variant="secondary" size="sm">
                Edit
              </ButtonLink>
            </div>
          </div>
        ))}
        {posts.length === 0 ? (
          <p className="text-sm text-slate-500">No posts yet. Create the first resource with New post.</p>
        ) : null}
      </Card>
    </div>
  );
}
