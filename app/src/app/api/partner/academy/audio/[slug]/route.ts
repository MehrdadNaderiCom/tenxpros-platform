import { NextResponse } from "next/server";
import { getCurrentPartner } from "@/lib/partner/auth";
import { getModuleForLesson } from "@/lib/academy/queries";
import { prisma } from "@/lib/prisma";
import {
  AUDIO_ENGINE,
  audioTextHash,
  ensureLessonAudio,
  narrationAvailable,
} from "@/lib/academy/lesson-audio";
import { DEFAULT_NARRATION_VOICE_ID, NARRATION_VOICES } from "@/lib/academy/voices";

export const dynamic = "force-dynamic";

/**
 * Narration status for a lesson: which curated voices are ready for the
 * CURRENT text. Access mirrors the lesson page exactly (partner session or
 * superadmin preview, module unlocked). Calling this also schedules any
 * missing or stale voice in the background, so a freshly edited lesson heals
 * itself the first time someone opens it.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const current = await getCurrentPartner();
  if (!current) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const data = await getModuleForLesson(current.partner.id, params.slug);
  if (!data) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!data.unlocked) return NextResponse.json({ message: "Locked" }, { status: 403 });

  const lesson = data.module.lessons[0];
  const text = lesson?.audioText?.trim() ?? "";
  if (!lesson || !text) {
    return NextResponse.json({ narration: false, defaultVoice: null, voices: [] });
  }

  const available = await narrationAvailable();
  const hash = audioTextHash(text);
  const rows = await prisma.academyLessonAudio.findMany({
    where: { lessonId: lesson.id },
    select: { voice: true, textHash: true, engine: true, durationSeconds: true },
  });
  const byVoice = new Map(rows.map((r) => [r.voice, r]));
  const voices = NARRATION_VOICES.map((v) => {
    const row = byVoice.get(v.id);
    const ready = Boolean(row && row.textHash === hash && row.engine === AUDIO_ENGINE);
    return {
      id: v.id,
      label: v.label,
      tagline: v.tagline,
      ready,
      durationSeconds: ready ? row?.durationSeconds ?? null : null,
    };
  });
  if (available && voices.some((v) => !v.ready)) ensureLessonAudio(lesson.id, text);

  return NextResponse.json({
    narration: available || voices.some((v) => v.ready),
    defaultVoice: DEFAULT_NARRATION_VOICE_ID,
    voices,
  });
}
