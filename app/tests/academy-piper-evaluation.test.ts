import { describe, expect, it } from "vitest";

import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import { sanitizeLessonHtml } from "../src/lib/academy/lesson-html";
import { FROZEN_ACADEMY_NARRATION_OVERRIDES } from "../src/lib/academy/narration/approved-pronunciations";
import type {
  NarrationOverrides,
} from "../src/lib/academy/narration/contracts";
import {
  buildPiperEvaluationPackage,
  buildPiperEvaluationPlan,
  createPiperEvaluationPrivateManifest,
  createPiperEvaluationPublicIndex,
  PIPER_EVALUATION_EXCERPT_SELECTIONS,
  PIPER_EVALUATION_PAUSE_PROFILE,
  PiperEvaluationPlanError,
  renderPiperEvaluationListeningHtml,
  splitPiperEvaluationSentences,
  type PiperEvaluationLessonInput,
  type PiperEvaluationLessonSlug,
} from "../src/lib/academy/narration/piper-evaluation";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";

const LESSON_SLUGS = [
  "mission",
  "journey",
  "conversation",
  "rules",
] as const satisfies readonly PiperEvaluationLessonSlug[];

function renderLesson(
  slug: PiperEvaluationLessonSlug,
  {
    html,
    overrides = FROZEN_ACADEMY_NARRATION_OVERRIDES,
  }: {
    html?: string;
    overrides?: NarrationOverrides;
  } = {},
): PiperEvaluationLessonInput {
  const lesson = ACADEMY_MODULES.find((candidate) => candidate.slug === slug);
  if (!lesson) {
    throw new Error(`Missing Academy lesson: ${slug}`);
  }
  const sanitizedHtml =
    html ?? sanitizeLessonHtml(lesson.bodyHtml ?? "");
  return {
    html: sanitizedHtml,
    document: renderNarrationDocument({
      slug,
      title: lesson.title,
      html: sanitizedHtml,
      contentRevisionHash: `piper-evaluation-test-${slug}`,
      overrides,
    }),
  };
}

function frozenLessons(): Record<
  PiperEvaluationLessonSlug,
  PiperEvaluationLessonInput
> {
  return Object.fromEntries(
    LESSON_SLUGS.map((slug) => [slug, renderLesson(slug)]),
  ) as Record<PiperEvaluationLessonSlug, PiperEvaluationLessonInput>;
}

describe("locked Piper evaluation excerpt plan", () => {
  it("selects the four exact representative excerpts and both transcript streams", () => {
    const plan = buildPiperEvaluationPlan(frozenLessons());

    expect(plan.excerpts.map((excerpt) => excerpt.id)).toEqual([
      "E01-mission-brand-ai",
      "E02-journey-week-table",
      "E03-conversation-application-form",
      "E04-rules-cap-stacking",
    ]);
    expect(plan.excerpts.map((excerpt) => excerpt.sourcePath)).toEqual([
      "root/p[7]",
      "root/table[1]",
      "root/div[4]",
      "root/p[11]",
    ]);
    expect(plan.excerpts.map((excerpt) => excerpt.blockIds.length)).toEqual([
      1, 12, 1, 5,
    ]);
    expect(
      plan.excerpts.map((excerpt) => excerpt.sourceFragmentCharacterCount),
    ).toEqual([423, 1963, 421, 2277]);
    expect(
      plan.excerpts.map(
        (excerpt) => excerpt.pipelines.baseline.characterCount,
      ),
    ).toEqual([416, 1267, 254, 2253]);
    expect(
      plan.excerpts.map((excerpt) => excerpt.pipelines.baseline.wordCount),
    ).toEqual([73, 158, 41, 425]);
    expect(
      plan.excerpts.map(
        (excerpt) => excerpt.pipelines.corrected.characterCount,
      ),
    ).toEqual([419, 1824, 232, 2741]);
    expect(
      plan.excerpts.map((excerpt) => excerpt.pipelines.corrected.wordCount),
    ).toEqual([76, 277, 39, 488]);
    expect(
      plan.excerpts.map(
        (excerpt) => excerpt.pipelines.corrected.units.length,
      ),
    ).toEqual([5, 48, 2, 15]);

    expect(
      plan.excerpts[0]?.pipelines.baseline.transcript,
    ).toContain("AI courses");
    expect(
      plan.excerpts[0]?.pipelines.corrected.transcript,
    ).toContain("A I courses");
    expect(
      plan.excerpts[0]?.pipelines.corrected.transcript,
    ).toContain("Ten X Pros");
    expect(
      plan.excerpts[1]?.pipelines.baseline.transcript,
    ).toContain("WeekFocusWhat they produceBadge");
    expect(
      plan.excerpts[1]?.pipelines.corrected.transcript,
    ).toContain("What they produce:");
    expect(
      plan.excerpts[2]?.pipelines.baseline.transcript,
    ).toContain("The application screenThe application screen");
    expect(
      plan.excerpts[2]?.pipelines.corrected.transcript,
    ).not.toContain("screenThe application");
    expect(
      plan.excerpts[3]?.pipelines.corrected.transcript,
    ).toContain("twelve point seven three percent");

    for (const excerpt of plan.excerpts) {
      expect(excerpt.pauseProfile).toEqual(PIPER_EVALUATION_PAUSE_PROFILE);
      expect(excerpt.pipelines.baseline.units).toHaveLength(1);
      expect(excerpt.pipelines.baseline.piperSentenceSilenceMs).toBe(350);
      expect(excerpt.pipelines.corrected.piperSentenceSilenceMs).toBe(0);
      expect(
        excerpt.pipelines.corrected.units
          .map((unit) => unit.text)
          .join(" "),
      ).toBe(excerpt.pipelines.corrected.transcript);
      expect(
        excerpt.pipelines.corrected.units.at(-1),
      ).toMatchObject({
        pauseAfterMs: 0,
        pauseReason: "sample-end",
      });
    }
  });

  it("preserves 220 ms sentence pauses and semantic row/block pauses", () => {
    const [mission, journey, conversation, rules] =
      buildPiperEvaluationPlan(frozenLessons()).excerpts;
    if (!mission || !journey || !conversation || !rules) {
      throw new Error("Missing evaluation excerpt");
    }

    expect(
      mission.pipelines.corrected.units.map((unit) => unit.pauseAfterMs),
    ).toEqual([220, 220, 220, 220, 0]);
    expect(
      conversation.pipelines.corrected.units.map(
        (unit) => unit.pauseAfterMs,
      ),
    ).toEqual([220, 0]);
    expect(
      rules.pipelines.corrected.units.map((unit) => unit.pauseAfterMs),
    ).toEqual([...Array.from({ length: 14 }, () => 220), 0]);

    const journeyPauses = journey.pipelines.corrected.units.map(
      (unit) => unit.pauseAfterMs,
    );
    expect(journeyPauses.filter((pause) => pause === 220)).toHaveLength(36);
    expect(journeyPauses.filter((pause) => pause === 400)).toHaveLength(11);
    expect(journeyPauses.filter((pause) => pause === 0)).toHaveLength(1);
    expect(
      journey.pipelines.corrected.units.filter(
        (unit) => unit.pauseReason === "semantic-block-boundary",
      ),
    ).toHaveLength(11);
  });

  it("is deterministic and publishes source and transcript hash locks", () => {
    const lessons = frozenLessons();
    const first = buildPiperEvaluationPlan(lessons);
    const second = buildPiperEvaluationPlan(lessons);

    expect(second).toEqual(first);
    expect(first.planHash).toHaveLength(64);
    expect(
      PIPER_EVALUATION_EXCERPT_SELECTIONS.map(
        (selection) => selection.sourceFragmentSha256,
      ),
    ).toEqual(first.excerpts.map((excerpt) => excerpt.sourceFragmentSha256));
    expect(
      first.excerpts.map(
        (excerpt) => excerpt.pipelines.baseline.transcriptSha256,
      ),
    ).toEqual(
      PIPER_EVALUATION_EXCERPT_SELECTIONS.map(
        (selection) => selection.baselineTranscriptSha256,
      ),
    );
    expect(
      first.excerpts.map(
        (excerpt) => excerpt.pipelines.corrected.transcriptSha256,
      ),
    ).toEqual(
      PIPER_EVALUATION_EXCERPT_SELECTIONS.map(
        (selection) => selection.correctedTranscriptSha256,
      ),
    );
  });

  it("uses a conservative sentence splitter that preserves decimals and quoted punctuation", () => {
    const text =
      'It becomes 12.73 percent. Read "Can this be approved?" Then stop.';
    const sentences = splitPiperEvaluationSentences(text);

    expect(sentences).toEqual([
      "It becomes 12.73 percent.",
      'Read "Can this be approved?"',
      "Then stop.",
    ]);
    expect(sentences.join(" ")).toBe(text);
  });

  it("fails closed when a locked source fragment changes", () => {
    const lessons = frozenLessons();
    const original = lessons.mission.html;
    const changed = original.replace(
      "Most AI courses teach tools",
      "Most modern AI courses teach tools",
    );
    expect(changed).not.toBe(original);
    lessons.mission = renderLesson("mission", { html: changed });

    expect(() => buildPiperEvaluationPlan(lessons)).toThrowError(
      expect.objectContaining({
        code: "SOURCE_FRAGMENT_MISMATCH",
      }),
    );
  });

  it("fails closed on non-frozen recipes, source/document mismatch, and pause drift", () => {
    const notFrozen = frozenLessons();
    notFrozen.mission = renderLesson("mission", { overrides: {} });
    expect(() => buildPiperEvaluationPlan(notFrozen)).toThrowError(
      expect.objectContaining({
        code: "ALIGNMENT_NOT_FROZEN",
      }),
    );

    const wrongHtml = frozenLessons();
    wrongHtml.mission = {
      ...wrongHtml.mission,
      html: `${wrongHtml.mission.html}\n`,
    };
    expect(() => buildPiperEvaluationPlan(wrongHtml)).toThrowError(
      expect.objectContaining({
        code: "SOURCE_HTML_MISMATCH",
      }),
    );

    const pauseDrift = frozenLessons();
    pauseDrift.mission = renderLesson("mission", {
      overrides: {
        ...FROZEN_ACADEMY_NARRATION_OVERRIDES,
        pauseProfile: { sentence: 221 },
      },
    });
    expect(() => buildPiperEvaluationPlan(pauseDrift)).toThrowError(
      expect.objectContaining({
        code: "PAUSE_PROFILE_MISMATCH",
      }),
    );
  });
});

describe("blind private manifest and public listening package", () => {
  const BLIND_SEED =
    "38b343419d70a62f32bd3d4d2fda14bef90843ec8d0959f7f11ac0b353495a16";

  it("counterbalances random labels while keeping one baseline and one corrected sample per pair", () => {
    const plan = buildPiperEvaluationPlan(frozenLessons());
    const first = createPiperEvaluationPrivateManifest({
      plan,
      blindSeed: BLIND_SEED,
      packageId: "piper-eval-test",
    });
    const second = createPiperEvaluationPrivateManifest({
      plan,
      blindSeed: BLIND_SEED,
      packageId: "piper-eval-test",
    });

    expect(second).toEqual(first);
    expect(first.private).toBe(true);
    expect(first.pairs).toHaveLength(4);
    expect(first.pairs.map((pair) => pair.pairId)).toEqual([
      "sample-01",
      "sample-02",
      "sample-03",
      "sample-04",
    ]);
    for (const pair of first.pairs) {
      expect(pair.samples.map((sample) => sample.blindLabel)).toEqual([
        "A",
        "B",
      ]);
      expect(
        new Set(pair.samples.map((sample) => sample.pipeline)),
      ).toEqual(new Set(["baseline", "corrected"]));
      expect(pair.samples.map((sample) => sample.filename)).toEqual([
        `${pair.pairId}-A.mp3`,
        `${pair.pairId}-B.mp3`,
      ]);
      expect(
        pair.samples.every(
          (sample) =>
            sample.voice.id === "bryce" &&
            sample.voice.nativeSampleRateHz === 22_050,
        ),
      ).toBe(true);
      expect(
        pair.samples.every(
          (sample) =>
            sample.audio.status === "pending" &&
            sample.audit.status === "pending",
        ),
      ).toBe(true);
    }
    const correctedLabels = first.pairs.map(
      (pair) =>
        pair.samples.find((sample) => sample.pipeline === "corrected")
          ?.blindLabel,
    );
    expect(correctedLabels.filter((label) => label === "A")).toHaveLength(
      2,
    );
    expect(correctedLabels.filter((label) => label === "B")).toHaveLength(
      2,
    );
    expect(JSON.stringify(first)).not.toContain(BLIND_SEED);
    expect(first.blindSeedSha256).toHaveLength(64);
  });

  it("exposes only blind labels and filenames to the local listening page", () => {
    const manifest = createPiperEvaluationPrivateManifest({
      plan: buildPiperEvaluationPlan(frozenLessons()),
      blindSeed: BLIND_SEED,
      packageId: "piper-eval-public-test",
    });
    const publicIndex = createPiperEvaluationPublicIndex(manifest);
    const publicJson = JSON.stringify(publicIndex);
    const html = renderPiperEvaluationListeningHtml(publicIndex);

    expect(publicIndex.pairs).toHaveLength(4);
    expect(publicIndex.pairs.flatMap((pair) => pair.samples)).toHaveLength(8);
    expect(publicIndex.packageId).toMatch(/^blind-review-[a-f0-9]{16}$/u);
    expect(publicIndex.packageId).not.toBe(manifest.packageId);
    expect(publicJson).not.toMatch(
      /\b(?:baseline|corrected|mission|journey|conversation|rules)\b/iu,
    );
    expect(publicJson).not.toMatch(/recipe|transcript|lesson/iu);
    expect(html).not.toMatch(
      /\b(?:baseline|corrected|mission|journey|conversation|rules)\b/iu,
    );
    expect(html).not.toMatch(
      /piper|bryce|semantic|recipe|transcript|lesson/iu,
    );
    expect(html.match(/<audio /gu)).toHaveLength(8);
    expect(html).toContain('<option value="1" selected>1.0x</option>');
    expect(html).toContain('<option value="1.25">1.25x</option>');
    for (const label of [
      "Naturalness",
      "Pauses",
      "Pronunciation",
      "Clarity",
      "Listening fatigue",
      "Professional quality",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("localStorage");
    expect(html).toContain("data-notes");
    expect(html).toContain("Export blind scores");
    expect(html).toContain("new Blob");
    expect(html).toContain("-blind-scores.json");
  });

  it("provides the compact private runtime contract used by the audio orchestrator", () => {
    const lessons = frozenLessons();
    const evaluationPackage = buildPiperEvaluationPackage({
      lessons: LESSON_SLUGS.map((slug) => ({
        slug,
        sanitizedHtml: lessons[slug].html,
        document: lessons[slug].document,
      })),
      blindSeed: BLIND_SEED,
      packageId: "piper-eval-runtime-test",
    });

    expect(evaluationPackage.runtimeSamples).toHaveLength(8);
    expect(evaluationPackage.assignments).toHaveLength(8);
    expect(evaluationPackage.excerpts).toBe(evaluationPackage.plan.excerpts);
    expect(evaluationPackage.listeningHtml).toContain(
      evaluationPackage.publicIndex.packageId,
    );
    expect(evaluationPackage.listeningHtml).not.toContain(
      "piper-eval-runtime-test",
    );
    for (const sample of evaluationPackage.runtimeSamples) {
      expect(Object.keys(sample).sort()).toEqual(
        [
          "fileName",
          "label",
          "pairId",
          "pipeline",
          "segments",
          "sentenceSilenceSeconds",
          "transcript",
        ].sort(),
      );
      expect(sample.segments.map((segment) => segment.text).join(" ")).toBe(
        sample.transcript,
      );
      expect(sample.fileName).toBe(
        `${sample.pairId}-${sample.label}.mp3`,
      );
      expect(sample.sentenceSilenceSeconds).toBe(
        sample.pipeline === "baseline" ? 0.35 : 0,
      );
    }
  });

  it("rejects weak seeds and unsafe package identifiers", () => {
    const plan = buildPiperEvaluationPlan(frozenLessons());
    expect(() =>
      createPiperEvaluationPrivateManifest({
        plan,
        blindSeed: "too-short",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_BLIND_SEED",
      }),
    );
    expect(() =>
      createPiperEvaluationPrivateManifest({
        plan,
        blindSeed: BLIND_SEED,
        packageId: "../public",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_PACKAGE_ID",
      }),
    );
  });

  it("returns a typed error for consumers that need fail-closed reporting", () => {
    try {
      createPiperEvaluationPrivateManifest({
        plan: buildPiperEvaluationPlan(frozenLessons()),
        blindSeed: "short",
      });
      throw new Error("Expected manifest creation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PiperEvaluationPlanError);
      expect((error as PiperEvaluationPlanError).code).toBe(
        "INVALID_BLIND_SEED",
      );
    }
  });
});
