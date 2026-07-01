import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { DISCUSSION_STATUS_BADGE, DISCUSSION_STATUS_LABELS } from "@/lib/partner/constants";
import { DiscussionPostForm } from "@/components/portal/discussion-post-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerDiscussionsPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const [published, mine] = await Promise.all([
    prisma.discussionPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { _count: { select: { comments: true } } },
    }),
    prisma.discussionPost.findMany({
      where: { authorPartnerId: current.partner.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Experience Sharing"
        description="Share what worked and what you learned. Posts publish under your own name once the company reviews them, and others can comment after that."
      />

      {current.preview ? null : (
        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Share an experience</h2>
          <div className="mt-4">
            <DiscussionPostForm />
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Published</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {published.map((p) => (
            <Card key={p.id} className="flex flex-col justify-between gap-2">
              <div>
                <Link href={`/partner/discussions/${p.id}`} className="font-semibold text-navy-900 hover:underline">
                  {p.title}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  by {p.authorName}
                  {p.category ? ` , ${p.category}` : ""} , {p._count.comments} comment(s)
                </p>
              </div>
              <Link href={`/partner/discussions/${p.id}`} className="text-sm font-medium text-navy-700 hover:underline">
                Read and comment
              </Link>
            </Card>
          ))}
          {published.length === 0 ? <p className="text-sm text-slate-500">No published posts yet. Be the first to share.</p> : null}
        </div>
      </div>

      {mine.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">Your posts</h2>
          <Card className="space-y-2">
            {mine.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3">
                <Link href={`/partner/discussions/${p.id}`} className="text-sm font-medium text-navy-900 hover:underline">
                  {p.title}
                </Link>
                <Badge status={DISCUSSION_STATUS_BADGE[p.status]}>{DISCUSSION_STATUS_LABELS[p.status]}</Badge>
              </div>
            ))}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
