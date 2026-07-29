import { getCurrentPartner } from "@/lib/partner/auth";
import { getModuleForLesson } from "@/lib/academy/queries";
import { prisma } from "@/lib/prisma";
import { parseRange } from "@/lib/academy/lesson-audio";
import {
  activeAcademyNarrationRelease,
  resolveVersionedNarrationAsset,
} from "@/lib/academy/narration-release";
import { narrationVoice } from "@/lib/academy/voices";

export const dynamic = "force-dynamic";

/**
 * The lesson narration bytes for one curated voice, with full HTTP Range
 * support (iOS Safari requires 206 responses for seeking to work). Access
 * mirrors the lesson page. Learner requests are read-only: generation is only
 * possible through the isolated administrative CLI.
 */
export async function GET(req: Request, { params }: { params: { slug: string; voice: string } }) {
  const current = await getCurrentPartner();
  if (!current) return new Response("Unauthorized", { status: 401 });
  const data = await getModuleForLesson(current.partner.id, params.slug);
  if (!data) return new Response("Not found", { status: 404 });
  if (!data.unlocked && !current.preview) {
    return new Response("Locked", { status: 403 });
  }

  const lesson = data.module.lessons[0];
  if (!lesson) return new Response("No narration", { status: 404 });

  const active = await activeAcademyNarrationRelease();
  let row:
    | {
        source: "versioned";
        id: string;
        mimeType: string;
        sizeBytes: number;
        releaseId: string;
        recipeHash: string;
        contentHash: string;
        audioStatus: "CURRENT" | "STALE";
      }
    | {
        source: "legacy";
        id: string;
        mimeType: string;
        sizeBytes: number;
      }
    | null = null;
  if (active.release) {
    if (
      params.voice !==
      active.release.voiceId
    ) {
      return new Response("Unknown voice", { status: 404 });
    }
    const asset =
      await resolveVersionedNarrationAsset({
        lessonId: lesson.id,
        lessonSlug: params.slug,
        bodyHtml: lesson.bodyHtml,
        releaseId: active.release.id,
      });
    row = asset
      ? {
          source: "versioned",
          id: asset.id,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
          releaseId: asset.releaseId,
          recipeHash: asset.recipeHash,
          contentHash: asset.contentHash,
          audioStatus: asset.audioStatus,
        }
      : null;
    if (!row) {
      return new Response("Narration is stale", { status: 404 });
    }
  } else {
    const voice = narrationVoice(params.voice);
    if (!voice) return new Response("Unknown voice", { status: 404 });
    const legacy = await prisma.academyLessonAudio.findUnique({
      where: {
        lessonId_voice: {
          lessonId: lesson.id,
          voice: voice.id,
        },
      },
      select: {
        id: true,
        mimeType: true,
        sizeBytes: true,
      },
    });
    row = legacy
      ? { source: "legacy", ...legacy }
      : null;
    if (!row) return new Response("No narration", { status: 404 });
  }

  const total = row.sizeBytes;
  const baseHeaders: Record<string, string> = {
    "Content-Type": row.mimeType,
    "Accept-Ranges": "bytes",
    // A content save never generates audio. The immutable active asset stays
    // playable while authorized admins receive its hash-derived STALE status.
    "Cache-Control": "private, no-store",
    "X-Academy-Narration-Source": row.source,
    ...(row.source === "versioned"
      ? {
          "X-Academy-Narration-Release": row.releaseId,
          "X-Academy-Narration-Recipe": row.recipeHash,
          "X-Academy-Content-Hash": row.contentHash,
          "X-Academy-Audio-Status": row.audioStatus,
        }
      : {}),
  };

  const range = parseRange(req.headers.get("range"), total);
  if (range === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${total}` },
    });
  }
  if (range) {
    // Fetch only the requested slice (bytea substring is 1-indexed; the
    // explicit int casts matter because the driver binds numbers as bigint,
    // and substring(bytea, bigint, bigint) does not exist in Postgres).
    const sliced =
      row.source === "versioned"
        ? await prisma.$queryRaw<Array<{ chunk: Buffer }>>`
            SELECT substring("data" FROM ${range.start + 1}::int FOR ${range.end - range.start + 1}::int) AS chunk
            FROM "AcademyNarrationAsset" WHERE id = ${row.id}`
        : await prisma.$queryRaw<Array<{ chunk: Buffer }>>`
            SELECT substring("data" FROM ${range.start + 1}::int FOR ${range.end - range.start + 1}::int) AS chunk
            FROM "AcademyLessonAudio" WHERE id = ${row.id}`;
    const chunk = sliced[0]?.chunk;
    if (!chunk) return new Response("Preparing", { status: 404 });
    return new Response(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${range.start}-${range.end}/${total}`,
        "Content-Length": String(chunk.byteLength),
      },
    });
  }
  const full =
    row.source === "versioned"
      ? await prisma.academyNarrationAsset.findUnique({
          where: { id: row.id },
          select: { data: true },
        })
      : await prisma.academyLessonAudio.findUnique({
          where: { id: row.id },
          select: { data: true },
        });
  if (!full) return new Response("Preparing", { status: 404 });
  const buf = Buffer.from(full.data);
  return new Response(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), {
    headers: { ...baseHeaders, "Content-Length": String(total) },
  });
}
