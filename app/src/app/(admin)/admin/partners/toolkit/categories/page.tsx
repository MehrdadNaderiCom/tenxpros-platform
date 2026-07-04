import { prisma } from "@/lib/prisma";
import { requireAdminUser, isSuperAdmin } from "@/lib/authz";
import {
  saveToolkitCategory,
  deleteToolkitCategory,
  moveToolkitCategory,
  toggleToolkitCategoryPublished,
} from "@/lib/actions/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function AdminToolkitCategoriesPage() {
  const admin = await requireAdminUser();
  if (!isSuperAdmin(admin.email)) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Authoring the Partner Toolkit is restricted to the primary admin.</p>
      </Card>
    );
  }

  const categories = await prisma.toolkitCategory.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { posts: true } } },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Toolkit categories"
          description="Create, rename, describe, reorder, and publish the top-level sections partners see. Deleting a category is blocked while it still has posts, so content is never orphaned."
        />
        <ButtonLink href="/admin/partners/toolkit" variant="secondary">
          Back to posts
        </ButtonLink>
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">New category</h2>
        <form action={saveToolkitCategory} className="grid gap-4 md:grid-cols-2">
          <Field label="Title">
            <Input name="title" required placeholder="e.g. Institutional Assets" />
          </Field>
          <Field label="Slug (optional)">
            <Input name="slug" placeholder="auto from title if left blank" />
          </Field>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Description (one line)</span>
            <Textarea name="description" rows={2} placeholder="What belongs in this category, in the honest TenXPros voice." />
          </label>
          <Field label="Order">
            <Input name="order" type="number" min={0} defaultValue="0" />
          </Field>
          <label className="flex items-center gap-2 self-end text-sm text-slate-700">
            <input type="checkbox" name="isPublished" defaultChecked className="h-4 w-4" />
            Published (visible to partners)
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Create category</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        {categories.map((c, i) => (
          <Card key={c.id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-navy-900">{c.title}</h2>
                <Badge status={c.isPublished ? "APPROVED" : "DRAFT"}>{c.isPublished ? "Published" : "Hidden"}</Badge>
                <span className="text-xs text-slate-500">{c._count.posts} post(s) , /{c.slug}</span>
              </div>
              <div className="flex items-center gap-1">
                <form action={moveToolkitCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="ghost" size="sm" disabled={i === 0}>
                    Up
                  </Button>
                </form>
                <form action={moveToolkitCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" variant="ghost" size="sm" disabled={i === categories.length - 1}>
                    Down
                  </Button>
                </form>
                <form action={toggleToolkitCategoryPublished}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    {c.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                </form>
              </div>
            </div>

            <form action={saveToolkitCategory} className="grid gap-4 border-t border-neutral-200 pt-4 md:grid-cols-2">
              <input type="hidden" name="id" value={c.id} />
              <Field label="Title">
                <Input name="title" required defaultValue={c.title} />
              </Field>
              <Field label="Slug">
                <Input name="slug" defaultValue={c.slug} />
              </Field>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Description (one line)</span>
                <Textarea name="description" rows={2} defaultValue={c.description ?? ""} />
              </label>
              <Field label="Order">
                <Input name="order" type="number" min={0} defaultValue={String(c.order)} />
              </Field>
              <label className="flex items-center gap-2 self-end text-sm text-slate-700">
                <input type="checkbox" name="isPublished" defaultChecked={c.isPublished} className="h-4 w-4" />
                Published (visible to partners)
              </label>
              <div className="flex items-center gap-3 md:col-span-2">
                <Button type="submit" variant="secondary">
                  Save changes
                </Button>
                <ConfirmDialog
                  action={deleteToolkitCategory}
                  hidden={{ id: c.id }}
                  triggerLabel="Delete"
                  title="Delete this category?"
                  description="This is blocked while the category still has posts. Move or delete its posts first."
                  confirmLabel="Delete"
                />
              </div>
            </form>
          </Card>
        ))}
        {categories.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No categories yet. Create the first one above.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
