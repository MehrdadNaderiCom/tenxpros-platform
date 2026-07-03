import { getCurrentPartner } from "@/lib/partner/auth";
import { getModuleForLesson } from "@/lib/academy/queries";
import { prisma } from "@/lib/prisma";
import { AUDIO_ENGINE, audioTextHash, ensureLessonAudio, parseRange } from "@/lib/academy/lesson-audio";
import { narrationVoice } from "@/lib/academy/voices";

export const dynamic = "force-dynamic";

/**
 * The lesson narration bytes for one curated voice, with full HTTP Range
 * support (iOS Safari requires 206 responses for seeking to work). Access
 * mirrors the lesson page. A stale or missing row schedules regeneration and
 * answers 404; the player polls the status endpoint and retries.
 */
export async function GET(req: Request, { params }: { params: { slug: string; voice: string } }) {
  const current = await getCurrentPartner();
  if (!current) return new Response("Unauthorized", { status: 401 });
  const voice = narrationVoice(params.voice);
  if (!voice) return new Response("Unknown voice", { status: 404 });
  const data = await getModuleForLesson(current.partner.id, params.slug);
  if (!data) return new Response("Not found", { status: 404 });
  if (!data.unlocked) return new Response("Locked", { status: 403 });

  const lesson = data.module.lessons[0];
  const text = lesson?.audioText?.trim() ?? "";
  if (!lesson || !text) return new Response("No narration", { status: 404 });

  const hash = audioTextHash(text);
  // Metadata first: media players probe with tiny ranges (iOS sends
  // bytes=0-1), so the multi-megabyte blob must never be pulled from the
  // database just to answer a 2 byte request.
  const row = await prisma.academyLessonAudio.findUnique({
    where: { lessonId_voice: { lessonId: lesson.id, voice: voice.id } },
    select: { id: true, textHash: true, engine: true, mimeType: true, sizeBytes: true },
  });
  if (!row || row.textHash !== hash || row.engine !== AUDIO_ENGINE) {
    ensureLessonAudio(lesson.id, text);
    return new Response("Preparing", { status: 404 });
  }

  const total = row.sizeBytes;
  const baseHeaders: Record<string, string> = {
    "Content-Type": row.mimeType,
    "Accept-Ranges": "bytes",
    // Freshness over caching: an edited lesson must never serve old audio.
    "Cache-Control": "private, no-store",
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
    const sliced = await prisma.$queryRaw<Array<{ chunk: Buffer }>>`
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
  const full = await prisma.academyLessonAudio.findUnique({
    where: { id: row.id },
    select: { data: true },
  });
  if (!full) return new Response("Preparing", { status: 404 });
  const buf = Buffer.from(full.data);
  return new Response(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), {
    headers: { ...baseHeaders, "Content-Length": String(total) },
  });
}
