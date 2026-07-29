export type AcademyFollowAlongCue = {
  blockIndex: number;
  semanticBlockId: string;
  sourceHtmlPath: string;
  sourceHash: string;
  spokenHash: string;
  startMs: number;
  endMs: number;
  confidence: number;
};

export type AcademyFollowAlongLessonManifest = {
  lessonSlug: string;
  lessonId: string;
  assetChecksumSha256: string;
  contentHash: string;
  spokenScriptHash: string;
  durationSeconds: number;
  timelineDurationMs: number;
  cueCount: number;
  meanConfidence: number;
  minimumConfidence: number;
  cues: AcademyFollowAlongCue[];
  manifestHash: string;
};

const SHA256 = /^[a-f0-9]{64}$/u;
const SOURCE_PATH =
  /^(?:title|root(?:\/[a-z][a-z0-9-]*\[\d+\])+(?:#segment\[\d+\])?)$/u;

export function isValidAcademyFollowAlongLesson(
  value: unknown,
): value is AcademyFollowAlongLessonManifest {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.lessonSlug !== "string" ||
    record.lessonSlug.length === 0 ||
    record.lessonSlug.length > 160 ||
    typeof record.lessonId !== "string" ||
    record.lessonId.length === 0 ||
    record.lessonId.length > 256 ||
    !SHA256.test(String(record.assetChecksumSha256)) ||
    !SHA256.test(String(record.contentHash)) ||
    !SHA256.test(String(record.spokenScriptHash)) ||
    !SHA256.test(String(record.manifestHash)) ||
    typeof record.durationSeconds !== "number" ||
    !Number.isFinite(record.durationSeconds) ||
    record.durationSeconds <= 0 ||
    record.durationSeconds > 86_400 ||
    typeof record.timelineDurationMs !== "number" ||
    !Number.isSafeInteger(record.timelineDurationMs) ||
    record.timelineDurationMs <= 0 ||
    record.timelineDurationMs >
      Math.ceil((record.durationSeconds as number) * 1_000) +
        250 ||
    typeof record.cueCount !== "number" ||
    !Number.isSafeInteger(record.cueCount) ||
    record.cueCount <= 0 ||
    typeof record.meanConfidence !== "number" ||
    !Number.isFinite(record.meanConfidence) ||
    record.meanConfidence < 0 ||
    record.meanConfidence > 1 ||
    typeof record.minimumConfidence !== "number" ||
    !Number.isFinite(record.minimumConfidence) ||
    record.minimumConfidence < 0 ||
    record.minimumConfidence > record.meanConfidence ||
    !Array.isArray(record.cues) ||
    record.cues.length !== record.cueCount
  ) {
    return false;
  }
  const timelineDurationMs =
    record.timelineDurationMs as number;
  let previousEnd = -1;
  return record.cues.every((candidate, index) => {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      return false;
    }
    const cue = candidate as Record<string, unknown>;
    const valid =
      cue.blockIndex === index &&
      SHA256.test(String(cue.semanticBlockId)) &&
      SOURCE_PATH.test(String(cue.sourceHtmlPath)) &&
      SHA256.test(String(cue.sourceHash)) &&
      SHA256.test(String(cue.spokenHash)) &&
      typeof cue.startMs === "number" &&
      Number.isSafeInteger(cue.startMs) &&
      cue.startMs >= 0 &&
      cue.startMs >= previousEnd &&
      typeof cue.endMs === "number" &&
      Number.isSafeInteger(cue.endMs) &&
      cue.endMs > cue.startMs &&
      cue.endMs <= timelineDurationMs &&
      typeof cue.confidence === "number" &&
      Number.isFinite(cue.confidence) &&
      cue.confidence >= 0 &&
      cue.confidence <= 1;
    if (valid) previousEnd = cue.endMs as number;
    return valid;
  });
}

function webVttTimestamp(milliseconds: number): string {
  const safe = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor(
    (safe % 3_600_000) / 60_000,
  );
  const seconds = Math.floor((safe % 60_000) / 1_000);
  const millis = safe % 1_000;
  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    `${String(seconds).padStart(2, "0")}.${String(
      millis,
    ).padStart(3, "0")}`,
  ].join(":");
}

/**
 * A metadata WebVTT track keeps exactly one passage active from the start of
 * its speech until the next passage begins. The alignment manifest retains
 * the measured speech end separately for audit.
 */
export function academyFollowAlongWebVtt(
  lesson: AcademyFollowAlongLessonManifest,
): string {
  if (!isValidAcademyFollowAlongLesson(lesson)) {
    throw new Error("Invalid Academy follow-along manifest.");
  }
  const lines = [
    "WEBVTT",
    "",
    `NOTE asset ${lesson.assetChecksumSha256} manifest ${lesson.manifestHash}`,
    "",
  ];
  lesson.cues.forEach((cue, index) => {
    const next = lesson.cues[index + 1];
    const displayEnd = next?.startMs ?? cue.endMs;
    lines.push(
      `block-${cue.blockIndex}`,
      `${webVttTimestamp(cue.startMs)} --> ${webVttTimestamp(
        Math.max(cue.startMs + 1, displayEnd),
      )}`,
      JSON.stringify({
        blockIndex: cue.blockIndex,
        semanticBlockId: cue.semanticBlockId,
        sourceHtmlPath: cue.sourceHtmlPath,
      }),
      "",
    );
  });
  return `${lines.join("\n")}\n`;
}
