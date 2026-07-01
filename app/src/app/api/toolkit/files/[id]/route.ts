import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Stream a Toolkit attachment. Available to any logged-in admin or partner (the
 * repository is a partner resource). The bytes live in the database.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    const partner = await prisma.partner.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!partner) return new Response("Forbidden", { status: 403 });
  }

  const file = await prisma.toolkitFile.findUnique({ where: { id: params.id } });
  if (!file) return new Response("Not found", { status: 404 });

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
