import { createHash } from "node:crypto";

import {
  parseFragment,
  type DefaultTreeAdapterTypes,
} from "parse5";
import { describe, expect, it } from "vitest";

import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import type { ModuleSeed } from "../prisma/seed/academy/content-types";
import releaseArtifact from "../src/data/academy-follow-along/active-elevenlabs-bella.json";
import {
  isValidAcademyFollowAlongLesson,
  type AcademyFollowAlongCue,
  type AcademyFollowAlongLessonManifest,
} from "../src/lib/academy/follow-along-contract";
import { sanitizeLessonHtml } from "../src/lib/academy/lesson-html";
import { FROZEN_ACADEMY_NARRATION_OVERRIDES } from "../src/lib/academy/narration/approved-pronunciations";
import type { NarrationBlock } from "../src/lib/academy/narration/contracts";
import { narrationBlockToSpokenText } from "../src/lib/academy/narration/preview";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";

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

type ElementNode = DefaultTreeAdapterTypes.Element;
type ParentNode = DefaultTreeAdapterTypes.ParentNode;
type ChildNode = DefaultTreeAdapterTypes.ChildNode;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const RELEASE_KEYS = [
  "alignmentMethod",
  "cueCount",
  "lessonCount",
  "lessons",
  "manifestHash",
  "modelId",
  "modelSampleRate",
  "recipeHash",
  "releaseId",
  "schemaVersion",
  "sourceContentManifestHash",
] as const;

const LESSON_KEYS = [
  "assetChecksumSha256",
  "contentHash",
  "cueCount",
  "cues",
  "durationSeconds",
  "lessonId",
  "lessonSlug",
  "manifestHash",
  "meanConfidence",
  "minimumConfidence",
  "spokenScriptHash",
  "timelineDurationMs",
] as const;

const CUE_KEYS = [
  "blockIndex",
  "confidence",
  "endMs",
  "semanticBlockId",
  "sourceHash",
  "sourceHtmlPath",
  "spokenHash",
  "startMs",
] as const;

const EXPECTED_RELEASE = {
  schemaVersion: "tenxpros-academy-follow-along-v1",
  releaseId:
    "academy-elevenlabs-bella-final-d43797ae6555cedd",
  recipeHash:
    "d43797ae6555cedd6cc1061abe71c89ac41a611c400029503f0e267e77b4edb3",
  sourceContentManifestHash:
    "75b5f40bba75f58ab7e9942aaf1b162215e9560307b05f43a72ab75c67a6c3f2",
  alignmentMethod:
    "torchaudio-wav2vec2-ctc-windowed-v1",
  modelId:
    "torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H",
  modelSampleRate: 16_000,
  lessonCount: 17,
  cueCount: 954,
} as const;

const EXPECTED_RELEASE_MANIFEST_HASH =
  "e58c61847bc904432f59e16edcf3da2534be1fcc951f8742cee757b312906125";

const EXPECTED_LESSONS = [
  {
    slug: "mission",
    lessonId: "cmqz6su120002tjltzxcccl4k",
    cueCount: 68,
  },
  {
    slug: "identity",
    lessonId: "cmqz6su3k0015tjltx3wjc6dp",
    cueCount: 62,
  },
  {
    slug: "rules",
    lessonId: "cmqz6su5l0028tjlt1qtgt5e4",
    cueCount: 102,
  },
  {
    slug: "product",
    lessonId: "cmqz6su7h003btjlt5qbjpn84",
    cueCount: 59,
  },
  {
    slug: "journey",
    lessonId: "cmqz6su9o004etjltwaluegjj",
    cueCount: 70,
  },
  {
    slug: "ranks",
    lessonId: "cmqz6subh005htjltdas4ltv4",
    cueCount: 53,
  },
  {
    slug: "coach",
    lessonId: "cmqz6sud8006ktjlt8r7vwzuc",
    cueCount: 54,
  },
  {
    slug: "selling",
    lessonId: "cmqz6suf6007ntjlt0pqgwla6",
    cueCount: 66,
  },
  {
    slug: "prospecting",
    lessonId: "cmqz6suh1008qtjltscjbtf8y",
    cueCount: 49,
  },
  {
    slug: "conversation",
    lessonId: "cmqz6suiv009ttjlt53gyi49p",
    cueCount: 56,
  },
  {
    slug: "operations",
    lessonId: "cmqz6sukn00awtjlt4y6tg8h3",
    cueCount: 67,
  },
  {
    slug: "mechanics",
    lessonId: "cmqz6sumg00bztjltaz9mie0v",
    cueCount: 58,
  },
  {
    slug: "motions",
    lessonId: "cmqz6suoc00d2tjlt0vr7l72x",
    cueCount: 57,
  },
  {
    slug: "customize",
    lessonId: "cmqz6suq200e5tjltaqx9x14z",
    cueCount: 101,
  },
  {
    slug: "contact-us",
    lessonId: "cmr2rsaug00egmfomndkki3qd",
    cueCount: 11,
  },
  {
    slug: "alumni-network",
    lessonId: "cmr2rsaup00ejmfomp62egjt1",
    cueCount: 11,
  },
  {
    slug: "experience-sharing",
    lessonId: "cmr2rsaux00emmfomgnpzq6xv",
    cueCount: 10,
  },
] as const;

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical(
            record[key],
          )}`,
      )
      .join(",")}}`;
  }
  throw new Error(
    `Unsupported canonical value: ${typeof value}`,
  );
}

function sha256(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function release(): FollowAlongRelease {
  const candidate: unknown = releaseArtifact;
  if (
    !isRecord(candidate) ||
    !Array.isArray(candidate.lessons)
  ) {
    throw new Error(
      "The active Academy follow-along artifact is not populated.",
    );
  }
  return candidate as FollowAlongRelease;
}

function lessonForSlug(
  slug: string,
): AcademyFollowAlongLessonManifest {
  const lesson = release().lessons.find(
    (candidate) => candidate.lessonSlug === slug,
  );
  if (!lesson) {
    throw new Error(
      `Missing Academy follow-along lesson: ${slug}`,
    );
  }
  return lesson;
}

function finalElevenLabsSpokenText(
  block: NarrationBlock,
): string {
  return narrationBlockToSpokenText(block).replace(
    /(?<![\p{L}\p{N}])A I(?![\p{L}\p{N}])/gu,
    "A. I.",
  );
}

function expectedNarration(
  academyModule: ModuleSeed,
): {
  sanitizedHtml: string;
  contentHash: string;
  blocks: readonly NarrationBlock[];
  spokenScriptHash: string;
} {
  const sanitizedHtml = sanitizeLessonHtml(
    academyModule.bodyHtml ?? "",
  );
  const contentHash = sha256(sanitizedHtml);
  const document = renderNarrationDocument({
    slug: academyModule.slug,
    title: academyModule.title,
    html: sanitizedHtml,
    contentRevisionHash: contentHash,
    overrides: FROZEN_ACADEMY_NARRATION_OVERRIDES,
  });
  const blocks = document.blocks.filter(
    (block) =>
      block.type !== "sectionBreak" &&
      narrationBlockToSpokenText(block).trim().length >
        0,
  );
  return {
    sanitizedHtml,
    contentHash,
    blocks,
    spokenScriptHash: sha256(
      blocks
        .map(finalElevenLabsSpokenText)
        .join("\n\n"),
    ),
  };
}

function expectedCueIdentity(
  block: NarrationBlock,
  blockIndex: number,
  lessonId: string,
): Pick<
  AcademyFollowAlongCue,
  | "blockIndex"
  | "semanticBlockId"
  | "sourceHtmlPath"
  | "sourceHash"
  | "spokenHash"
> {
  const sourceHash = sha256(canonical(block));
  return {
    blockIndex,
    semanticBlockId: sha256(
      `${lessonId}:${String(blockIndex)}:${sourceHash}`,
    ),
    sourceHtmlPath: block.id,
    sourceHash,
    spokenHash: sha256(
      finalElevenLabsSpokenText(block),
    ),
  };
}

function isElement(node: ChildNode): node is ElementNode {
  return "tagName" in node;
}

function resolveSanitizedSourcePath(
  root: ParentNode,
  sourceHtmlPath: string,
):
  | { kind: "title" }
  | { kind: "element"; element: ElementNode }
  | null {
  if (sourceHtmlPath === "title") {
    return { kind: "title" };
  }
  if (!sourceHtmlPath.startsWith("root/")) {
    return null;
  }
  const segments = sourceHtmlPath
    .slice("root/".length)
    .split("/");
  let current = root;
  for (const rawSegment of segments) {
    const segment = rawSegment.replace(
      /#segment\[\d+\]$/u,
      "",
    );
    const match =
      /^([a-z][a-z0-9-]*)\[(\d+)\]$/u.exec(
        segment,
      );
    if (!match) return null;
    const [, tagName, ordinalText] = match;
    const ordinal = Number(ordinalText);
    if (
      !Number.isSafeInteger(ordinal) ||
      ordinal < 1 ||
      ordinal > 10_000
    ) {
      return null;
    }
    const matches = current.childNodes.filter(
      (node): node is ElementNode =>
        isElement(node) && node.tagName === tagName,
    );
    const next = matches[ordinal - 1];
    if (!next) return null;
    current = next;
  }
  return "tagName" in current
    ? { kind: "element", element: current }
    : null;
}

describe("active Academy follow-along artifact", () => {
  it("pins the complete 17-lesson, 954-cue release envelope and hash", () => {
    const artifact = release();
    const {
      manifestHash,
      ...releaseCore
    } = artifact;
    const lessons = artifact.lessons;

    expect(Object.keys(artifact).sort()).toEqual(
      RELEASE_KEYS,
    );
    expect(releaseCore).toMatchObject(EXPECTED_RELEASE);
    expect(lessons).toHaveLength(
      EXPECTED_RELEASE.lessonCount,
    );
    expect(
      lessons.reduce(
        (total, lesson) =>
          total + lesson.cueCount,
        0,
      ),
    ).toBe(EXPECTED_RELEASE.cueCount);
    expect(manifestHash).toBe(
      EXPECTED_RELEASE_MANIFEST_HASH,
    );
    expect(sha256(canonical(releaseCore))).toBe(
      manifestHash,
    );
    expect(
      lessons.map((lesson) => lesson.lessonSlug),
    ).toEqual(
      EXPECTED_LESSONS.map((lesson) => lesson.slug),
    );
    expect(
      ACADEMY_MODULES.map(
        (academyModule) => academyModule.slug,
      ),
    ).toEqual(
      EXPECTED_LESSONS.map((lesson) => lesson.slug),
    );
    expect(
      new Set(
        lessons.map(
          (lesson) => lesson.assetChecksumSha256,
        ),
      ).size,
    ).toBe(EXPECTED_RELEASE.lessonCount);
  });

  describe.each(
    ACADEMY_MODULES.map(
      (academyModule, index) => ({
        academyModule,
        expected: EXPECTED_LESSONS[index],
      }),
    ),
  )(
    "$academyModule.slug",
    ({ academyModule, expected }) => {
    it("binds every cue and hash to the exact sanitized seed narration", () => {
      expect(expected).toBeDefined();
      if (!expected) return;
      expect(academyModule.slug).toBe(expected.slug);

      const lesson = lessonForSlug(expected.slug);
      const narration =
        expectedNarration(academyModule);
      const {
        manifestHash,
        cues,
        ...lessonCore
      } = lesson;

      expect(Object.keys(lesson).sort()).toEqual(
        LESSON_KEYS,
      );
      expect(isValidAcademyFollowAlongLesson(lesson)).toBe(
        true,
      );
      expect(lesson.lessonId).toBe(expected.lessonId);
      expect(lesson.cueCount).toBe(expected.cueCount);
      expect(cues).toHaveLength(expected.cueCount);
      expect(lesson.minimumConfidence).toBeGreaterThanOrEqual(
        0.8,
      );
      expect(lesson.meanConfidence).toBeGreaterThanOrEqual(
        0.95,
      );
      expect(
        Math.round(lesson.durationSeconds * 1_000) -
          lesson.timelineDurationMs,
      ).toBeGreaterThanOrEqual(0);
      expect(
        Math.round(lesson.durationSeconds * 1_000) -
          lesson.timelineDurationMs,
      ).toBeLessThanOrEqual(100);
      expect(narration.blocks).toHaveLength(
        expected.cueCount,
      );
      expect(lesson.contentHash).toBe(
        narration.contentHash,
      );
      expect(lesson.spokenScriptHash).toBe(
        narration.spokenScriptHash,
      );
      expect(manifestHash).toMatch(SHA256_PATTERN);
      expect(
        sha256(
          canonical({
            ...lessonCore,
            cues,
          }),
        ),
      ).toBe(manifestHash);

      let previousEndMs = -1;
      for (const [index, cue] of cues.entries()) {
        const block = narration.blocks[index];
        expect(block).toBeDefined();
        if (!block) continue;

        expect(Object.keys(cue).sort()).toEqual(
          CUE_KEYS,
        );
        expect(cue).toMatchObject(
          expectedCueIdentity(
            block,
            index,
            lesson.lessonId,
          ),
        );
        expect(cue.startMs).toBeGreaterThanOrEqual(
          previousEndMs,
        );
        expect(cue.endMs).toBeGreaterThan(
          cue.startMs,
        );
        expect(cue.endMs).toBeLessThanOrEqual(
          lesson.timelineDurationMs,
        );
        expect(cue.confidence).toBeGreaterThanOrEqual(
          0.8,
        );
        expect(cue.confidence).toBeLessThanOrEqual(1);
        previousEndMs = cue.endMs;
      }

      const encodedDurationMs = Math.round(
        lesson.durationSeconds * 1_000,
      );
      expect(
        lesson.timelineDurationMs,
      ).toBeLessThanOrEqual(encodedDurationMs);
      expect(
        encodedDurationMs -
          lesson.timelineDurationMs,
      ).toBeLessThanOrEqual(100);

      const confidences = cues.map(
        (cue) => cue.confidence,
      );
      const calculatedMean =
        confidences.reduce(
          (sum, confidence) => sum + confidence,
          0,
        ) / confidences.length;
      expect(
        Math.abs(
          lesson.meanConfidence - calculatedMean,
        ),
      ).toBeLessThanOrEqual(0.000_000_5);
      expect(lesson.minimumConfidence).toBe(
        Math.min(...confidences),
      );
    });

    it("resolves every cue path against the exact sanitized lesson DOM", () => {
      expect(expected).toBeDefined();
      if (!expected) return;
      const lesson = lessonForSlug(expected.slug);
      const narration =
        expectedNarration(academyModule);
      const fragment = parseFragment(
        narration.sanitizedHtml,
      );

      for (const [index, cue] of lesson.cues.entries()) {
        const block = narration.blocks[index];
        expect(block).toBeDefined();
        if (!block) continue;
        expect(cue.sourceHtmlPath).toBe(block.id);

        const resolved = resolveSanitizedSourcePath(
          fragment,
          cue.sourceHtmlPath,
        );
        expect(
          resolved,
          `${academyModule.slug} cue ${String(
            index,
          )}: ${cue.sourceHtmlPath}`,
        ).not.toBeNull();
        if (!resolved) continue;

        if (cue.sourceHtmlPath === "title") {
          expect(resolved.kind).toBe("title");
          expect(block.type).toBe("heading");
          if (block.type === "heading") {
            expect(block.visibleText).toBe(
              academyModule.title,
            );
          }
          continue;
        }

        expect(resolved.kind).toBe("element");
        if (resolved.kind !== "element") continue;
        const finalSegment = cue.sourceHtmlPath
          .split("/")
          .at(-1)
          ?.replace(/#segment\[\d+\]$/u, "");
        const expectedTag =
          /^([a-z][a-z0-9-]*)\[\d+\]$/u.exec(
            finalSegment ?? "",
          )?.[1];
        expect(resolved.element.tagName).toBe(
          expectedTag,
        );
      }
    });
    },
  );
});
