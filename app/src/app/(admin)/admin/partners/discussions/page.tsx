import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, isSuperAdmin } from "@/lib/authz";
import { htmlToPlainText } from "@/lib/academy/lesson-html";
import {
  moderateDiscussionPost,
  unpublishDiscussionPost,
  deleteDiscussionPost,
  deleteDiscussionComment,
} from "@/lib/actions/discussions";
import { ToolkitBody } from "@/components/portal/toolkit-body";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function AdminDiscussionsPage() {
  const admin = await requireAdminUser();
  if (!isSuperAdmin(admin.email)) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Moderating the discussion board is restricted to the primary admin.</p>
      </Card>
    );
  }

  const [pending, published] = await Promise.all([
    prisma.discussionPost.findMany({ where: { status: "PENDING_REVIEW" }, orderBy: { createdAt: "asc" } }),
    prisma.discussionPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { comments: { orderBy: { createdAt: "asc" } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Discussion Board"
        description="Partners' experience posts. Review each one, edit if needed, then publish under the author's name or reject. Comments open only after a post is published."
      />

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Awaiting review ({pending.length})</h2>
        <div className="mt-4 space-y-4">
          {pending.map((p) => (
            <div key={p.id} className="rounded-lg border border-neutral-200 p-4">
              <p className="text-xs text-slate-500">by {p.authorName} , submitted {p.createdAt.toLocaleDateString()}</p>
              <form action={moderateDiscussionPost} className="mt-3 space-y-3">
                <input type="hidden" name="postId" value={p.id} />
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Title</span>
                  <Input name="title" defaultValue={p.title} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Topic (optional)</span>
                  <Input name="category" defaultValue={p.category ?? ""} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Body (edit before publishing if needed)</span>
                  <Textarea name="body" rows={8} defaultValue={htmlToPlainText(p.bodyHtml)} />
                </label>
                <div className="flex gap-2">
                  <Button type="submit" name="decision" value="PUBLISH" size="sm">Publish</Button>
                  <Button type="submit" name="decision" value="REJECT" size="sm" variant="danger">Reject</Button>
                </div>
              </form>
            </div>
          ))}
          {pending.length === 0 ? <p className="text-sm text-slate-500">Nothing awaiting review.</p> : null}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Published ({published.length})</h2>
        <div className="mt-4 space-y-4">
          {published.map((p) => (
            <div key={p.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/partner/discussions/${p.id}`} className="font-semibold text-navy-900 hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-xs text-slate-500">by {p.authorName}{p.category ? ` , ${p.category}` : ""}</p>
                </div>
                <Badge status="APPROVED">Published</Badge>
              </div>
              <div className="mt-3 rounded-md bg-neutral-50 p-3">
                <ToolkitBody html={p.bodyHtml} />
              </div>

              {p.comments.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {p.comments.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-neutral-200 p-2">
                      <span className="text-sm text-slate-700">
                        <span className="font-medium">{c.authorName}:</span> {c.body}
                      </span>
                      <form action={deleteDiscussionComment}>
                        <input type="hidden" name="commentId" value={c.id} />
                        <Button type="submit" variant="ghost" size="sm">Remove</Button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 flex gap-2">
                <form action={unpublishDiscussionPost}>
                  <input type="hidden" name="postId" value={p.id} />
                  <Button type="submit" variant="secondary" size="sm">Unpublish</Button>
                </form>
                <ConfirmDialog
                  action={deleteDiscussionPost}
                  hidden={{ postId: p.id }}
                  triggerLabel="Delete"
                  title="Delete this post?"
                  description="The post and its comments will be permanently removed."
                  confirmLabel="Delete"
                />
              </div>
            </div>
          ))}
          {published.length === 0 ? <p className="text-sm text-slate-500">Nothing published yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
