import { createHash } from "node:crypto";

type ResumeLessonContent = {
  body: string;
  bodyHtml: string | null;
};

/**
 * A lesson-specific key for visible reading content. The representation prefix
 * prevents a plain lesson and a rich lesson with coincidentally identical text
 * from sharing a bookmark. Any content edit naturally invalidates old anchors.
 */
export function academyReadingContentKey(
  lesson: ResumeLessonContent,
): string {
  const rich = lesson.bodyHtml?.trim();
  return createHash("sha256")
    .update(rich ? `html:${rich}` : `plain:${lesson.body}`)
    .digest("hex");
}

/** Hash an immutable narration identity into the fixed-width database key. */
export function academyAudioResumeKey(parts: {
  source: "versioned" | "legacy";
  assetId: string;
  identityHash: string;
  voiceId: string;
}): string {
  return createHash("sha256")
    .update(
      [
        "academy-audio-resume-v1",
        parts.source,
        parts.assetId,
        parts.identityHash,
        parts.voiceId,
      ].join(":"),
    )
    .digest("hex");
}

/**
 * Reject cross-site bookmark POSTs even though they only affect the current
 * account. Both Origin and Fetch Metadata are checked without trusting a
 * deployment-specific hard-coded hostname.
 */
export function isSameOriginAcademyResumeRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    fetchSite !== "same-origin" &&
    fetchSite !== "none"
  ) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host =
    forwardedHost ??
    request.headers.get("host") ??
    requestUrl.host;
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProto ?? requestUrl.protocol.replace(/:$/u, "");

  return (
    originUrl.host === host &&
    originUrl.protocol.replace(/:$/u, "") === protocol
  );
}
