import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const KIND_MAP: Record<string, "RESUME" | "COVER_LETTER"> = {
  resume: "RESUME",
  "cover-letter": "COVER_LETTER",
};

export async function GET(_req: Request, { params }: { params: { id: string; kind: string } }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return new Response("Unauthorized", { status: 401 });

  const kind = KIND_MAP[params.kind];
  if (!kind) return new Response("Not found", { status: 404 });

  const doc = await prisma.partnerApplicationDocument.findUnique({
    where: { applicationId_kind: { applicationId: params.id, kind } },
  });
  if (!doc) return new Response("Not found", { status: 404 });

  const safeName = doc.filename.replace(/[^\w.()\- ]+/g, "_") || "document.pdf";
  return new Response(Buffer.from(doc.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(doc.size),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
