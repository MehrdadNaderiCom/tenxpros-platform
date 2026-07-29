import { NextResponse } from "next/server";
import { getCurrentPartner } from "@/lib/partner/auth";
import { getModuleForLesson } from "@/lib/academy/queries";
import { prisma } from "@/lib/prisma";
import {
  academyNarrationVoiceLabel,
  activeAcademyNarrationRelease,
  resolveVersionedNarrationAsset,
} from "@/lib/academy/narration-release";
import { DEFAULT_NARRATION_VOICE_ID, NARRATION_VOICES } from "@/lib/academy/voices";

export const dynamic = "force-dynamic";

/**
 * Narration status for a lesson: which curated voices are ready for the
 * CURRENT text. Access mirrors the lesson page exactly (partner session or
 * superadmin preview, module unlocked). This endpoint is strictly read-only;
 * it never starts or schedules audio generation.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const current = await getCurrentPartner();
  if (!current) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const data = await getModuleForLesson(current.partner.id, params.slug);
  if (!data) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!data.unlocked && !current.preview) {
    return NextResponse.json({ message: "Locked" }, { status: 403 });
  }

  const lesson = data.module.lessons[0];
  if (!lesson) {
    return NextResponse.json({ narration: false, defaultVoice: null, voices: [] });
  }

  const active = await activeAcademyNarrationRelease();
  if (active.release) {
    const asset =
      await resolveVersionedNarrationAsset({
        lessonId: lesson.id,
        lessonSlug: params.slug,
        bodyHtml: lesson.bodyHtml,
        releaseId: active.release.id,
      });
    return NextResponse.json({
      narration: Boolean(asset),
      audioStatus:
        asset?.audioStatus ?? "MISSING",
      defaultVoice:
        active.release.voiceId,
      productionVoiceLocked: true,
      releaseMode: "versioned",
      activeRelease: {
        id: active.release.id,
        recipeVersion:
          active.release.recipeVersion,
        recipeHash:
          active.release.recipeHash,
        voiceId: active.release.voiceId,
        sourceContentManifestHash:
          active.release
            .sourceContentManifestHash,
      },
      voices: [
        {
          id: active.release.voiceId,
          label: academyNarrationVoiceLabel(
            active.release.voiceId,
          ),
          tagline:
            "Validated production narrator",
          ready: Boolean(asset),
          status:
            asset?.audioStatus ?? "MISSING",
          durationSeconds:
            asset?.durationSeconds ?? null,
        },
      ],
    });
  }

  const rows = await prisma.academyLessonAudio.findMany({
    where: { lessonId: lesson.id },
    select: {
      voice: true,
      durationSeconds: true,
    },
  });
  const byVoice = new Map(rows.map((r) => [r.voice, r]));
  const voices = NARRATION_VOICES.map((v) => {
    const row = byVoice.get(v.id);
    const ready = Boolean(row);
    return {
      id: v.id,
      label: v.label,
      tagline: v.tagline,
      ready,
      durationSeconds: ready ? row?.durationSeconds ?? null : null,
    };
  });

  return NextResponse.json({
    narration: voices.some((v) => v.ready),
    defaultVoice: DEFAULT_NARRATION_VOICE_ID,
    productionVoiceLocked: false,
    releaseMode: "legacy",
    activeRelease: null,
    voices,
  });
}
