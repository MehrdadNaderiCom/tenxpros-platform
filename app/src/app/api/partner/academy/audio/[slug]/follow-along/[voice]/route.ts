import { getCurrentPartner } from "@/lib/partner/auth";
import { getModuleForLesson } from "@/lib/academy/queries";
import {
  activeAcademyNarrationRelease,
  resolveVersionedNarrationAsset,
} from "@/lib/academy/narration-release";
import { resolveAcademyFollowAlongLesson } from "@/lib/academy/follow-along-server";
import { academyFollowAlongWebVtt } from "@/lib/academy/follow-along-contract";

export const dynamic = "force-dynamic";

function response(
  body: string,
  status: number,
  contentType: string,
) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Authenticated metadata WebVTT for one immutable narration asset. Every cue
 * is hash-bound to the active release, final MP3, source HTML, and spoken
 * script. Missing or stale alignment fails closed while audio keeps working.
 */
export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: { slug: string; voice: string };
  },
) {
  const current = await getCurrentPartner();
  if (!current) {
    return response(
      "Unauthorized",
      401,
      "text/plain; charset=utf-8",
    );
  }
  const data = await getModuleForLesson(
    current.partner.id,
    params.slug,
  );
  if (!data) {
    return response(
      "Not found",
      404,
      "text/plain; charset=utf-8",
    );
  }
  if (!data.unlocked && !current.preview) {
    return response(
      "Locked",
      403,
      "text/plain; charset=utf-8",
    );
  }
  const lesson = data.module.lessons[0];
  if (!lesson) {
    return response(
      "Not found",
      404,
      "text/plain; charset=utf-8",
    );
  }
  const active = await activeAcademyNarrationRelease();
  if (
    !active.release ||
    params.voice !== active.release.voiceId
  ) {
    return response(
      "Not found",
      404,
      "text/plain; charset=utf-8",
    );
  }
  const asset = await resolveVersionedNarrationAsset({
    lessonId: lesson.id,
    lessonSlug: params.slug,
    bodyHtml: lesson.bodyHtml,
    releaseId: active.release.id,
  });
  if (!asset || asset.audioStatus !== "CURRENT") {
    return response(
      "Not found",
      404,
      "text/plain; charset=utf-8",
    );
  }
  const alignment = resolveAcademyFollowAlongLesson({
    releaseId: asset.releaseId,
    recipeHash: asset.recipeHash,
    sourceContentManifestHash:
      active.release.sourceContentManifestHash,
    lessonId: asset.lessonId,
    lessonSlug: asset.lessonSlug,
    assetChecksumSha256: asset.checksumSha256,
    contentHash: asset.contentHash,
    spokenScriptHash: asset.spokenScriptHash,
    durationSeconds: asset.durationSeconds,
  });
  if (!alignment) {
    return response(
      "Not found",
      404,
      "text/plain; charset=utf-8",
    );
  }
  return response(
    academyFollowAlongWebVtt(alignment),
    200,
    "text/vtt; charset=utf-8",
  );
}
