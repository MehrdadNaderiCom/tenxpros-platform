import { requireSuperAdmin } from "@/lib/authz";
import { parseRange } from "@/lib/academy/lesson-audio";
import {
  resolveVersionedNarrationAsset,
} from "@/lib/academy/narration-release";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Superadmin-only delivery of an audited inactive release through the same
 * database slicing and HTTP Range contract used by the learner endpoint.
 * Preview never changes the active release pointer.
 */
export async function GET(
  req: Request,
  {
    params,
  }: {
    params: {
      releaseId: string;
      slug: string;
    };
  },
) {
  try {
    await requireSuperAdmin();
  } catch {
    return new Response("Forbidden", {
      status: 403,
    });
  }
  const lesson =
    await prisma.academyLesson.findFirst({
      where: {
        module: {
          slug: params.slug,
          isPublished: true,
        },
      },
      select: {
        id: true,
        bodyHtml: true,
      },
    });
  if (!lesson) {
    return new Response("Not found", {
      status: 404,
    });
  }
  const asset =
    await resolveVersionedNarrationAsset({
      lessonId: lesson.id,
      lessonSlug: params.slug,
      bodyHtml: lesson.bodyHtml,
      releaseId: params.releaseId,
    });
  if (!asset) {
    return new Response(
      "Release asset is missing or stale",
      { status: 404 },
    );
  }
  const total = asset.sizeBytes;
  const baseHeaders: Record<string, string> = {
    "Content-Type": asset.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Academy-Narration-Source":
      "versioned-preview",
    "X-Academy-Narration-Release":
      asset.releaseId,
    "X-Academy-Narration-Voice":
      asset.voiceId,
    "X-Academy-Narration-Recipe":
      asset.recipeHash,
    "X-Academy-Content-Hash":
      asset.contentHash,
  };
  const range = parseRange(
    req.headers.get("range"),
    total,
  );
  if (range === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${total}`,
      },
    });
  }
  if (range) {
    const sliced =
      await prisma.$queryRaw<
        Array<{ chunk: Buffer }>
      >`
        SELECT substring("data" FROM ${range.start + 1}::int FOR ${range.end - range.start + 1}::int) AS chunk
        FROM "AcademyNarrationAsset"
        WHERE id = ${asset.id}`;
    const chunk = sliced[0]?.chunk;
    if (!chunk) {
      return new Response("Not found", {
        status: 404,
      });
    }
    return new Response(
      new Uint8Array(
        chunk.buffer,
        chunk.byteOffset,
        chunk.byteLength,
      ),
      {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${range.start}-${range.end}/${total}`,
          "Content-Length": String(
            chunk.byteLength,
          ),
        },
      },
    );
  }
  const full =
    await prisma.academyNarrationAsset.findUnique({
      where: { id: asset.id },
      select: { data: true },
    });
  if (!full) {
    return new Response("Not found", {
      status: 404,
    });
  }
  const bytes = Buffer.from(full.data);
  return new Response(
    new Uint8Array(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    ),
    {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": String(total),
      },
    },
  );
}
