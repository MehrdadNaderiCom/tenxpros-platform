import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, isSuperAdmin } from "@/lib/authz";
import { saveToolkitPost, deleteToolkitPost, deleteToolkitFile } from "@/lib/actions/toolkit";
import { LessonEditor } from "@/components/admin/academy/lesson-editor";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const CATEGORY_SUGGESTIONS = ["Generic assets", "Industry and role templates"];

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
  const post = isNew
    ? null
    : await prisma.toolkitPost.findUnique({ where: { id: params.id }, include: { files: true } });
  if (!isNew && !post) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title={isNew ? "New toolkit post" : "Edit toolkit post"}
        description="Write the post and attach any files. The body is sanitized on save with the same rules as lessons."
      />

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
              <Input name="category" required list="toolkit-categories" defaultValue={post?.category ?? CATEGORY_SUGGESTIONS[0]} />
              <datalist id="toolkit-categories">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
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
            <p className="text-xs text-slate-500">Up to 10 files per save, 15 MB each.</p>
          </div>

          <Button type="submit">{isNew ? "Create post" : "Save changes"}</Button>
        </form>
      </Card>

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
