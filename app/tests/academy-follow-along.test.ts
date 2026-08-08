import { describe, expect, it } from "vitest";
import {
  academyFollowAlongWebVtt,
  isValidAcademyFollowAlongLesson,
  type AcademyFollowAlongLessonManifest,
} from "../src/lib/academy/follow-along-contract";

const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);
const KEY_C = "c".repeat(64);

const manifest: AcademyFollowAlongLessonManifest = {
  lessonSlug: "mission",
  lessonId: "lesson-1",
  assetChecksumSha256: KEY_A,
  contentHash: KEY_B,
  spokenScriptHash: KEY_C,
  durationSeconds: 12,
  timelineDurationMs: 12_000,
  cueCount: 3,
  meanConfidence: 0.97,
  minimumConfidence: 0.91,
  manifestHash: KEY_A,
  cues: [
    {
      blockIndex: 0,
      semanticBlockId: KEY_A,
      sourceHtmlPath: "title",
      sourceHash: KEY_B,
      spokenHash: KEY_C,
      startMs: 80,
      endMs: 900,
      confidence: 0.98,
    },
    {
      blockIndex: 1,
      semanticBlockId: KEY_B,
      sourceHtmlPath: "root/p[1]",
      sourceHash: KEY_C,
      spokenHash: KEY_A,
      startMs: 1_400,
      endMs: 5_800,
      confidence: 0.91,
    },
    {
      blockIndex: 2,
      semanticBlockId: KEY_C,
      sourceHtmlPath: "root/p[2]#segment[1]",
      sourceHash: KEY_A,
      spokenHash: KEY_B,
      startMs: 6_200,
      endMs: 11_500,
      confidence: 0.99,
    },
  ],
};

describe("Academy follow-along manifest contract", () => {
  it("accepts complete, monotonic asset-bound cues", () => {
    expect(
      isValidAcademyFollowAlongLesson(manifest),
    ).toBe(true);
  });

  it("rejects overlap, missing coverage, invalid paths, and unsafe timing", () => {
    expect(
      isValidAcademyFollowAlongLesson({
        ...manifest,
        cueCount: 2,
      }),
    ).toBe(false);
    expect(
      isValidAcademyFollowAlongLesson({
        ...manifest,
        cues: manifest.cues.map((cue, index) =>
          index === 1 ? { ...cue, startMs: 800 } : cue,
        ),
      }),
    ).toBe(false);
    expect(
      isValidAcademyFollowAlongLesson({
        ...manifest,
        cues: manifest.cues.map((cue, index) =>
          index === 1
            ? {
                ...cue,
                sourceHtmlPath:
                  "root/p[1],script",
              }
            : cue,
        ),
      }),
    ).toBe(false);
    expect(
      isValidAcademyFollowAlongLesson({
        ...manifest,
        cues: manifest.cues.map((cue, index) =>
          index === 2
            ? { ...cue, endMs: 12_001 }
            : cue,
        ),
      }),
    ).toBe(false);
    expect(
      isValidAcademyFollowAlongLesson({
        ...manifest,
        minimumConfidence: 0.99,
        meanConfidence: 0.95,
      }),
    ).toBe(false);
    expect(
      isValidAcademyFollowAlongLesson({
        ...manifest,
        timelineDurationMs: 12_251,
      }),
    ).toBe(false);
  });
});

describe("Academy follow-along WebVTT", () => {
  it("emits metadata cues with continuous passage display boundaries", () => {
    const vtt = academyFollowAlongWebVtt(manifest);
    expect(vtt.startsWith("WEBVTT\n\n")).toBe(true);
    expect(vtt).toContain(
      "00:00:00.080 --> 00:00:01.400",
    );
    expect(vtt).toContain(
      "00:00:01.400 --> 00:00:06.200",
    );
    expect(vtt).toContain(
      "00:00:06.200 --> 00:00:11.500",
    );
    expect(vtt).toContain(
      JSON.stringify({
        blockIndex: 2,
        semanticBlockId: KEY_C,
        sourceHtmlPath:
          "root/p[2]#segment[1]",
      }),
    );
  });

  it("fails closed instead of serializing an invalid manifest", () => {
    expect(() =>
      academyFollowAlongWebVtt({
        ...manifest,
        cues: manifest.cues.slice().reverse(),
      }),
    ).toThrow(
      "Invalid Academy follow-along manifest.",
    );
  });
});
