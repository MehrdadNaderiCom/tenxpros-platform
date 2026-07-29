import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/partner/auth";
import { academyResumePayloadSchema } from "@/lib/academy/resume-contract";
import {
  academyReadingContentKey,
  isSameOriginAcademyResumeRequest,
  resolveAcademyAudioResumeSource,
  resolveAcademyResumeLesson,
  writeAcademyLessonResume,
} from "@/lib/academy/resume-server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;
const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
} as const;

function json(
  body: object,
  init?: { status?: number },
) {
  return NextResponse.json(body, {
    ...init,
    headers: NO_STORE,
  });
}

/**
 * Persist one reading or narration bookmark. Identity is always session-derived,
 * and page access is rechecked on every request. The two lanes are independently
 * compare-and-set so scroll and audio saves cannot clobber each other.
 */
export async function POST(
  request: Request,
  { params }: { params: { slug: string } },
) {
  if (!isSameOriginAcademyResumeRequest(request)) {
    return json({ message: "Cross-site request refused." }, { status: 403 });
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return json({ message: "JSON required." }, { status: 415 });
  }

  const declaredSize = Number(
    request.headers.get("content-length") ?? "0",
  );
  if (
    Number.isFinite(declaredSize) &&
    declaredSize > MAX_BODY_BYTES
  ) {
    return json({ message: "Request too large." }, { status: 413 });
  }

  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return json({ message: "Invalid request body." }, { status: 400 });
  }
  if (
    new TextEncoder().encode(raw).byteLength >
    MAX_BODY_BYTES
  ) {
    return json({ message: "Request too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ message: "Invalid JSON." }, { status: 400 });
  }
  const parsed = academyResumePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return json({ message: "Invalid bookmark." }, { status: 400 });
  }

  let current: Awaited<ReturnType<typeof requirePartner>>;
  try {
    current = await requirePartner();
  } catch {
    return json({ message: "Partner access required." }, { status: 401 });
  }

  const access = await resolveAcademyResumeLesson(
    current.partner.id,
    params.slug,
  );
  if (access.state === "missing") {
    return json({ message: "Lesson not found." }, { status: 404 });
  }
  if (access.state === "locked") {
    return json({ message: "Lesson is locked." }, { status: 403 });
  }

  const payload = parsed.data;
  if (payload.kind === "reading") {
    const contentKey = academyReadingContentKey(access.lesson);
    // An old page left open across a content edit may not overwrite the new
    // lesson's bookmark with an anchor from the obsolete DOM.
    if (payload.contentKey !== contentKey) {
      return json(
        {
          message: "Lesson content changed.",
          code: "content_changed",
        },
        { status: 409 },
      );
    }
    const result = await writeAcademyLessonResume({
      userId: current.user.id,
      partnerId: current.partner.id,
      lessonId: access.lesson.id,
      payload,
      readingContentKey: contentKey,
    });
    return json(
      {
        accepted: result.outcome === "accepted",
        duplicate: result.outcome === "duplicate",
        revision: result.revision,
      },
      {
        status: result.outcome === "conflict" ? 409 : 200,
      },
    );
  }

  const source = await resolveAcademyAudioResumeSource({
    lesson: access.lesson,
    lessonSlug: access.slug,
    requestedVoiceId: payload.voiceId,
  });
  if (!source) {
    return json(
      {
        message: "Narration source unavailable.",
        code: "source_unavailable",
      },
      { status: 409 },
    );
  }
  if (payload.resumeKey !== source.resumeKey) {
    return json(
      {
        message: "Narration source changed.",
        code: "source_changed",
      },
      { status: 409 },
    );
  }

  const result = await writeAcademyLessonResume({
    userId: current.user.id,
    partnerId: current.partner.id,
    lessonId: access.lesson.id,
    payload,
    audioSource: source,
  });
  return json(
    {
      accepted: result.outcome === "accepted",
      duplicate: result.outcome === "duplicate",
      revision: result.revision,
      // Return the authoritative values used for clamping.
      positionSeconds: Math.min(
        payload.positionSeconds,
        source.durationSeconds,
      ),
      durationSeconds: source.durationSeconds,
    },
    {
      status: result.outcome === "conflict" ? 409 : 200,
    },
  );
}
