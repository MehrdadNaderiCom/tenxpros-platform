import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, isSuperAdmin } from "@/lib/authz";
import { saveToolkitPost, deleteToolkitPost, deleteToolkitFile, deleteToolkitLink, updateToolkitLink, moveToolkitLink } from "@/lib/actions/toolkit";
import { LessonEditor } from "@/components/admin/academy/lesson-editor";
import { TOOLKIT_LINK_KINDS, TOOLKIT_LINK_KIND_LABELS } from "@/lib/toolkit/embeds";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function AdminToolkitEditorPage({ params }: { params: { id: string } }) {
  const admin = await requireAdminUser();
  if (!isSuperAdmin(admin.email)) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Authoring the Partner Toolkit is restricted to the primary admin.</p>
      </Card>
    );
  }

  const isNew = params.id === "new";
  const [post, categories] = await Promise.all([
    isNew ? null : prisma.toolkitPost.findUnique({ where: { id: params.id }, include: { files: true, links: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } } }),
    prisma.toolkitCategory.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  ]);
  if (!isNew && !post) notFound();

  const hasCategories = categories.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={isNew ? "New toolkit post" : "Edit toolkit post"}
        description="Write the post and attach any files or external links. The body is sanitized on save with the same rules as lessons. Links and embeds are stored separately and rendered safely."
      />

      {!hasCategories ? (
        <Card className="border-amber-200">
          <p className="text-sm text-slate-700">
            There are no categories yet. Create at least one in{" "}
            <ButtonLink href="/admin/partners/toolkit/categories" variant="ghost" size="sm">
              Manage categories
            </ButtonLink>{" "}
            so you can file this post.
          </p>
        </Card>
      ) : null}

      <Card>
        <form action={saveToolkitPost} className="space-y-5">
          {post ? <input type="hidden" name="id" value={post.id} /> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Title</span>
              <Input name="title" required defaultValue={post?.title ?? ""} placeholder="e.g. Outreach and objection templates" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Category</span>
              <Select name="categoryId" defaultValue={post?.categoryId ?? ""} required>
                <option value="" disabled>
                  Choose a category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.isPublished ? "" : " (hidden)"}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Slug (optional)</span>
              <Input name="slug" defaultValue={post?.slug ?? ""} placeholder="auto from title if left blank" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Order</span>
              <Input name="order" type="number" min={0} defaultValue={String(post?.order ?? 0)} />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isPublished" defaultChecked={post?.isPublished ?? true} className="h-4 w-4" />
            Published (visible to partners)
          </label>

          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Body</span>
            <LessonEditor name="bodyHtml" initialHtml={post?.bodyHtml ?? "<p></p>"} />
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Attach files (optional)</span>
            <input type="file" name="files" multiple className="block text-sm text-slate-600" />
            <p className="text-xs text-slate-500">Up to 10 files per save, 15 MB each. For video and large decks, use a link below instead.</p>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Add external links or embeds (optional)</span>
            <p className="text-xs text-slate-500">
              Paste an https link. A YouTube, Vimeo, Loom, Google Slides, or Google Drive link marked Video or Slide deck is
              embedded inline; anything else shows as a link. Leave a row blank to skip it.
            </p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr,2fr,auto]">
                <Input name="linkTitle" placeholder="Label (e.g. Walkthrough video)" />
                <Input name="linkUrl" type="url" placeholder="https://..." />
                <Select name="linkKind" defaultValue="LINK" aria-label="Link type">
                  {TOOLKIT_LINK_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {TOOLKIT_LINK_KIND_LABELS[k]}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>

          <Button type="submit">{isNew ? "Create post" : "Save changes"}</Button>
        </form>
      </Card>

      {post && post.links.length > 0 ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">Links and embeds</h2>
          <p className="text-xs text-slate-500">Edit a link in place and Save, reorder with Up and Down, or Remove it.</p>
          <ul className="space-y-3">
            {post.links.map((l, i) => (
              <li key={l.id} className="space-y-2 rounded-md border border-neutral-200 p-3">
                <form action={updateToolkitLink} className="grid gap-2 md:grid-cols-[1fr,2fr,auto,auto]">
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="postId" value={post.id} />
                  <Input name="title" defaultValue={l.title} placeholder="Label" aria-label="Link label" />
                  <Input name="url" type="url" defaultValue={l.url} aria-label="Link URL" />
                  <Select name="kind" defaultValue={l.kind} aria-label="Link type">
                    {TOOLKIT_LINK_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {TOOLKIT_LINK_KIND_LABELS[k]}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary" size="sm">
                    Save
                  </Button>
                </form>
                <div className="flex items-center gap-1">
                  <form action={moveToolkitLink}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button type="submit" variant="ghost" size="sm" disabled={i === 0}>Up</Button>
                  </form>
                  <form action={moveToolkitLink}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button type="submit" variant="ghost" size="sm" disabled={i === post.links.length - 1}>Down</Button>
                  </form>
                  <form action={deleteToolkitLink}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="postId" value={post.id} />
                    <Button type="submit" variant="ghost" size="sm">Remove</Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {post && post.files.length > 0 ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">Attachments</h2>
          <ul className="space-y-2">
            {post.files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3">
                <a href={`/api/toolkit/files/${f.id}`} className="text-sm font-medium text-navy-700 hover:underline">
                  {f.filename}
                </a>
                <span className="text-xs text-slate-500">{Math.max(1, Math.round(f.size / 1024))} KB</span>
                <form action={deleteToolkitFile}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="postId" value={post.id} />
                  <Button type="submit" variant="ghost" size="sm">Remove</Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {post ? (
        <Card className="border-amber-200">
          <h2 className="text-lg font-semibold text-navy-900">Delete this post</h2>
          <p className="mt-1 text-sm text-slate-600">This removes the post and its attachments. It cannot be undone.</p>
          <div className="mt-3">
            <ConfirmDialog
              action={deleteToolkitPost}
              hidden={{ id: post.id }}
              triggerLabel="Delete post"
              title="Delete this toolkit post?"
              description="The post and all its attachments will be permanently removed."
              confirmLabel="Delete"
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
