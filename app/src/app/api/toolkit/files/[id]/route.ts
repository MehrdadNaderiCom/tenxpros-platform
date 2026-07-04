import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isActivePartnerStatus } from "@/lib/partner/status";

export const dynamic = "force-dynamic";

/**
 * Stream a Toolkit attachment. An admin may fetch any file (including drafts and
 * orphans). A non-admin must be an ACTIVE partner (not a bare applicant and not
 * terminated) AND the file's parent post must be published, matching the toolkit
 * UI which lists only isPublished posts. The bytes live in the database.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    const partner = await prisma.partner.findUnique({ where: { userId: session.user.id }, select: { status: true } });
    if (!partner || !isActivePartnerStatus(partner.status)) return new Response("Forbidden", { status: 403 });
  }

  const file = await prisma.toolkitFile.findUnique({
    where: { id: params.id },
    include: { post: { select: { isPublished: true, categoryRef: { select: { isPublished: true } } } } },
  });
  if (!file) return new Response("Not found", { status: 404 });
  // Non-admins may only download an attachment of a published post whose category
  // is also published (or has none); a draft post, a post under a hidden category,
  // or an orphaned file is hidden from them, matching the partner UI.
  const categoryHidden = Boolean(file.post?.categoryRef && !file.post.categoryRef.isPublished);
  if (!isAdmin && (!file.post?.isPublished || categoryHidden)) return new Response("Not found", { status: 404 });

  const safeName = file.filename.replace(/[^\w.()\- ]+/g, "_") || "file";
  return new Response(Buffer.from(file.data), {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
