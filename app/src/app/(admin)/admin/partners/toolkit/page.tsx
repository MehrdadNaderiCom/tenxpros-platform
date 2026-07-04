import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, isSuperAdmin } from "@/lib/authz";
import { moveToolkitPost, toggleToolkitPostPublished, deleteToolkitPost } from "@/lib/actions/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  _count: { files: number; links: number };
};

function PostLine({ p, index, count }: { p: PostRow; index: number; count: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-4">
      <div>
        <Link href={`/admin/partners/toolkit/${p.id}`} className="font-semibold text-navy-900 hover:underline">
          {p.title}
        </Link>
        <p className="text-xs text-slate-500">
          {p._count.files} file(s) , {p._count.links} link(s) , /{p.slug}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Badge status={p.isPublished ? "APPROVED" : "DRAFT"}>{p.isPublished ? "Published" : "Draft"}</Badge>
        <form action={moveToolkitPost}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="direction" value="up" />
          <Button type="submit" variant="ghost" size="sm" disabled={index === 0}>Up</Button>
        </form>
        <form action={moveToolkitPost}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="direction" value="down" />
          <Button type="submit" variant="ghost" size="sm" disabled={index === count - 1}>Down</Button>
        </form>
        <form action={toggleToolkitPostPublished}>
          <input type="hidden" name="id" value={p.id} />
          <Button type="submit" variant="ghost" size="sm">{p.isPublished ? "Unpublish" : "Publish"}</Button>
        </form>
        <ButtonLink href={`/admin/partners/toolkit/${p.id}`} variant="secondary" size="sm">
          Edit
        </ButtonLink>
        <ConfirmDialog
          action={deleteToolkitPost}
          hidden={{ id: p.id }}
          triggerLabel="Delete"
          title="Delete this toolkit post?"
          description="The post and all its attachments will be permanently removed."
          confirmLabel="Delete"
        />
      </div>
    </div>
  );
}

export default async function AdminToolkitPage() {
  const admin = await requireAdminUser();
  if (!isSuperAdmin(admin.email)) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Authoring the Partner Toolkit is restricted to the primary admin.</p>
      </Card>
    );
  }

  const postInclude = { _count: { select: { files: true, links: true } } } as const;
  const [categories, ungrouped] = await Promise.all([
    prisma.toolkitCategory.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: { posts: { orderBy: [{ order: "asc" }, { createdAt: "desc" }], include: postInclude } },
    }),
    prisma.toolkitPost.findMany({
      where: { categoryId: null },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: postInclude,
    }),
  ]);

  const totalPosts = categories.reduce((n, c) => n + c.posts.length, 0) + ungrouped.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Partner Toolkit"
          description="Blog-style resources for partners, grouped by managed category. Partners read and download these. Posts can carry rich text, uploaded files, and external links or embeds (video and slides)."
        />
        <div className="flex items-center gap-2">
          <ButtonLink href="/admin/partners/toolkit/categories" variant="secondary">
            Manage categories
          </ButtonLink>
          <ButtonLink href="/admin/partners/toolkit/new">New post</ButtonLink>
        </div>
      </div>

      {categories.map((c) => (
        <Card key={c.id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-navy-900">{c.title}</h2>
              {c.description ? <p className="text-xs text-slate-500">{c.description}</p> : null}
            </div>
            <Badge status={c.isPublished ? "APPROVED" : "DRAFT"}>{c.isPublished ? "Published" : "Hidden"}</Badge>
          </div>
          {c.posts.length > 0 ? (
            c.posts.map((p, i) => <PostLine key={p.id} p={p} index={i} count={c.posts.length} />)
          ) : (
            <p className="text-sm text-slate-500">No posts in this category yet.</p>
          )}
        </Card>
      ))}

      {ungrouped.length > 0 ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">Uncategorized</h2>
          <p className="text-xs text-slate-500">These posts have no managed category. Open each one and pick a category.</p>
          {ungrouped.map((p, i) => (
            <PostLine key={p.id} p={p} index={i} count={ungrouped.length} />
          ))}
        </Card>
      ) : null}

      {totalPosts === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No posts yet. Create the first resource with New post.</p>
        </Card>
      ) : null}
    </div>
  );
}
