import "server-only";

import { createHash } from "node:crypto";
import releaseData from "@/data/academy-follow-along/active-elevenlabs-bella.json";
import {
  isValidAcademyFollowAlongLesson,
  type AcademyFollowAlongLessonManifest,
} from "@/lib/academy/follow-along-contract";

const SHA256 = /^[a-f0-9]{64}$/u;
const ALIGNMENT_METHOD =
  "torchaudio-wav2vec2-ctc-windowed-v1";
const MODEL_ID =
  "torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H";

type FollowAlongRelease = {
  schemaVersion: string;
  releaseId: string;
  recipeHash: string;
  sourceContentManifestHash: string;
  alignmentMethod: string;
  modelId: string;
  modelSampleRate: number;
  lessonCount: number;
  cueCount: number;
  lessons: AcademyFollowAlongLessonManifest[];
  manifestHash: string;
};

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonical(record[key])}`,
    )
    .join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

let auditedRelease:
  | FollowAlongRelease
  | null
  | undefined;

function auditRelease(): FollowAlongRelease | null {
  if (auditedRelease !== undefined) return auditedRelease;
  const candidate = releaseData as unknown;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    auditedRelease = null;
    return auditedRelease;
  }
  const record = candidate as Record<string, unknown>;
  const lessons = record.lessons;
  const manifestHash = record.manifestHash;
  const { manifestHash: _hash, ...releaseCore } = record;
  if (
    record.schemaVersion !==
      "tenxpros-academy-follow-along-v1" ||
    typeof record.releaseId !== "string" ||
    record.releaseId.length === 0 ||
    !SHA256.test(String(record.recipeHash)) ||
    !SHA256.test(
      String(record.sourceContentManifestHash),
    ) ||
    record.alignmentMethod !== ALIGNMENT_METHOD ||
    record.modelId !== MODEL_ID ||
    record.modelSampleRate !== 16_000 ||
    record.lessonCount !== 17 ||
    record.cueCount !== 954 ||
    !Array.isArray(lessons) ||
    lessons.length !== 17 ||
    typeof manifestHash !== "string" ||
    sha256(canonical(releaseCore)) !== manifestHash ||
    !lessons.every((lesson) => {
      if (!isValidAcademyFollowAlongLesson(lesson)) {
        return false;
      }
      const {
        manifestHash: lessonHash,
        ...lessonCore
      } = lesson;
      return (
        sha256(canonical(lessonCore)) === lessonHash
      );
    }) ||
    lessons.reduce(
      (total, lesson) =>
        total +
        (lesson as AcademyFollowAlongLessonManifest)
          .cueCount,
      0,
    ) !== 954
  ) {
    auditedRelease = null;
    return auditedRelease;
  }
  auditedRelease = candidate as FollowAlongRelease;
  return auditedRelease;
}

/**
 * Return cues only when every immutable release and asset identity matches.
 * A content edit, audio replacement, partial artifact, or hash drift disables
 * follow-along without affecting narration playback.
 */
export function resolveAcademyFollowAlongLesson(input: {
  releaseId: string;
  recipeHash: string;
  sourceContentManifestHash: string;
  lessonId: string;
  lessonSlug: string;
  assetChecksumSha256: string;
  contentHash: string;
  spokenScriptHash: string;
  durationSeconds: number;
}): AcademyFollowAlongLessonManifest | null {
  const release = auditRelease();
  if (
    !release ||
    release.releaseId !== input.releaseId ||
    release.recipeHash !== input.recipeHash ||
    release.sourceContentManifestHash !==
      input.sourceContentManifestHash
  ) {
    return null;
  }
  const lesson = release.lessons.find(
    (candidate) =>
      candidate.lessonSlug === input.lessonSlug,
  );
  if (
    !lesson ||
    lesson.lessonId !== input.lessonId ||
    lesson.assetChecksumSha256 !==
      input.assetChecksumSha256 ||
    lesson.contentHash !== input.contentHash ||
    lesson.spokenScriptHash !== input.spokenScriptHash ||
    Math.abs(
      lesson.durationSeconds - input.durationSeconds,
    ) > 0.001
  ) {
    return null;
  }
  return lesson;
}
