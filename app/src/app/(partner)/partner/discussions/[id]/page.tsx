import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { DISCUSSION_STATUS_BADGE, DISCUSSION_STATUS_LABELS } from "@/lib/partner/constants";
import { ToolkitBody } from "@/components/portal/toolkit-body";
import { DiscussionCommentForm } from "@/components/portal/discussion-comment-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerDiscussionDetailPage({ params }: { params: { id: string } }) {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const post = await prisma.discussionPost.findUnique({
    where: { id: params.id },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });
  if (!post) notFound();

  const isPublished = post.status === "PUBLISHED";
  const isAuthor = post.authorPartnerId === current.partner.id;
  // A post that is not published is visible only to its author (to track status).
  if (!isPublished && !isAuthor) notFound();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {post.category ? <Badge status="OPEN">{post.category}</Badge> : null}
          {!isPublished ? <Badge status={DISCUSSION_STATUS_BADGE[post.status]}>{DISCUSSION_STATUS_LABELS[post.status]}</Badge> : null}
        </div>
        <PageHeader title={post.title} description={`by ${post.authorName}`} />
      </div>

      {!isPublished ? (
        <Alert tone="info" title="This post is not published yet">
          {post.status === "PENDING_REVIEW"
            ? "The company is reviewing it. It will appear here for everyone once published."
            : "This post was not published. You are welcome to revise and submit a new one."}
        </Alert>
      ) : null}

      <Card>
        <ToolkitBody html={post.bodyHtml} />
      </Card>

      {isPublished ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-navy-900">Comments ({post.comments.length})</h2>
          {post.comments.length === 0 ? (
            <p className="text-sm text-slate-500">No comments yet.</p>
          ) : (
            <ol className="space-y-3">
              {post.comments.map((c) => (
                <li key={c.id} className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-navy-900">{c.authorName}</span>
                    <span className="text-xs text-slate-500">{c.createdAt.toLocaleString()}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
                </li>
              ))}
            </ol>
          )}
          {current.preview ? (
            <p className="text-sm text-slate-500">You are viewing read-only.</p>
          ) : (
            <DiscussionCommentForm postId={post.id} />
          )}
        </Card>
      ) : null}

      <p className="text-sm">
        <Link href="/partner/discussions" className="text-navy-700 hover:underline">
          Back to Experience Sharing
        </Link>
      </p>
    </div>
  );
}
