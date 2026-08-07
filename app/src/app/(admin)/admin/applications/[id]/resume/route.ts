import { requireAdminUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminUser();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const resume = await prisma.applicationResume.findUnique({ where: { applicationId: params.id } });
  if (!resume) return new Response("Not found", { status: 404 });

  const safeName = resume.filename.replace(/[^\w.()\- ]+/g, "_") || "resume.pdf";
  return new Response(Buffer.from(resume.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(resume.size),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
