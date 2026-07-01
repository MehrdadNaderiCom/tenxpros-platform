import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { ToolkitBody } from "@/components/portal/toolkit-body";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerToolkitPostPage({ params }: { params: { slug: string } }) {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const post = await prisma.toolkitPost.findFirst({
    where: { slug: params.slug, isPublished: true },
    include: { files: true },
  });
  if (!post) notFound();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Badge status="OPEN">{post.category}</Badge>
        <PageHeader title={post.title} description="" />
      </div>

      <Card>
        <ToolkitBody html={post.bodyHtml} />
      </Card>

      {post.files.length > 0 ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">Downloads</h2>
          <ul className="space-y-2">
            {post.files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3">
                <a href={`/api/toolkit/files/${f.id}`} className="text-sm font-medium text-navy-700 hover:underline">
                  {f.filename}
                </a>
                <span className="text-xs text-slate-500">{Math.max(1, Math.round(f.size / 1024))} KB</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <p className="text-sm">
        <Link href="/partner/toolkit" className="text-navy-700 hover:underline">
          Back to the toolkit
        </Link>
      </p>
    </div>
  );
}
