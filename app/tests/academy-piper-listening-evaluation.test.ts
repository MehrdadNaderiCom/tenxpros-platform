import { describe, expect, it } from "vitest";

import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import { sanitizeLessonHtml } from "../src/lib/academy/lesson-html";
import { FROZEN_ACADEMY_NARRATION_OVERRIDES } from "../src/lib/academy/narration/approved-pronunciations";
import {
  buildPhase2BPauseCoveragePlan,
  buildPhase2BSupplementalManifest,
  computePhase2BCompletion,
  createPhase2BPackageManifests,
  parsePhase2BResponse,
  PHASE2B_RESPONSE_SCHEMA_VERSION,
  PHASE2B_SCORE_DIMENSIONS,
  type Phase2BOriginalManifestInput,
  type Phase2BPublicPackage,
  type Phase2BResponse,
} from "../src/lib/academy/narration/piper-listening-evaluation";
import {
  createPiperEvaluationPrivateManifest,
  PiperEvaluationPlanError,
  type PiperEvaluationLessonInput,
} from "../src/lib/academy/narration/piper-evaluation";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";

function missionLesson(): PiperEvaluationLessonInput {
  const lesson = ACADEMY_MODULES.find(
    (candidate) => candidate.slug === "mission",
  );
  if (!lesson) throw new Error("Missing mission");
  const html = sanitizeLessonHtml(lesson.bodyHtml ?? "");
  return {
    html,
    document: renderNarrationDocument({
      slug: lesson.slug,
      title: lesson.title,
      html,
      contentRevisionHash: "phase2b-test-revision",
      overrides: FROZEN_ACADEMY_NARRATION_OVERRIDES,
    }),
  };
}

function originalManifest(): Phase2BOriginalManifestInput {
  const correctedByPair = ["A", "B", "A", "B"] as const;
  return {
    planHash: "a".repeat(64),
    pairs: correctedByPair.map((correctedLabel, index) => {
      const pairId = `sample-0${String(index + 1)}`;
      return {
        pairId,
        excerptId: `E0${String(index + 1)}`,
        samples: (["A", "B"] as const).map((label) => ({
          blindSampleId: `${pairId}-${label}`,
          blindLabel: label,
          filename: `${pairId}-${label}.mp3`,
          pipeline:
            label === correctedLabel
              ? ("corrected" as const)
              : ("baseline" as const),
          audio: {
            durationSeconds: index + (label === "A" ? 1 : 2),
            sha256: `${String(index)}${label}`.padEnd(64, "0"),
          },
        })),
      };
    }),
  };
}

function completeResponse(publicPackage: Phase2BPublicPackage) {
  const now = "2026-07-26T12:00:00.000Z";
  const files = Object.fromEntries(
    publicPackage.pairs.flatMap((pair) =>
      pair.samples.map((sample) => [
        sample.sample_id,
        {
          scores: Object.fromEntries(
            PHASE2B_SCORE_DIMENSIONS.map((dimension) => [
              dimension,
              4,
            ]),
          ),
          one_x_recorded_at: now,
          optional_1_25x_used: false,
          comment: "",
        },
      ]),
    ),
  );
  const pairs = Object.fromEntries(
    publicPackage.pairs.map((pair) => [
      pair.pair_id,
      {
        preferences: {
          overall_preference: "A",
          easier_to_understand: "A",
          more_natural: "A",
          long_lesson_preference: "A",
          too_slow: "neither",
          too_fast: "neither",
          strange_pronunciation: "neither",
        },
        pronunciation_issues: [],
        table_efficiency: pair.table_efficiency
          ? {
              easier_to_understand: "A",
              repeated_labels_usefulness: 4,
              excessively_slow: "neither",
              pauses_excessive: "neither",
              prefer_longer_clearer: "yes",
              test_more_concise_format: "no",
            }
          : null,
        comments: "",
      },
    ]),
  ) as Phase2BResponse["pairs"];
  const withoutCompletion: Omit<Phase2BResponse, "completion"> = {
    schema_version: PHASE2B_RESPONSE_SCHEMA_VERSION,
    evaluation_package_id: publicPackage.evaluation_package_id,
    listener_id: "L-ABCDEFGH",
    timestamps: {
      started_at: now,
      updated_at: now,
      exported_at: now,
    },
    files,
    pairs,
  };
  return {
    ...withoutCompletion,
    completion: computePhase2BCompletion(
      withoutCompletion,
      publicPackage,
    ),
  };
}

describe("Phase 2B supplemental pause coverage", () => {
  it("locks one source excerpt and acoustically schedules every missing pause", () => {
    const plan = buildPhase2BPauseCoveragePlan(missionLesson());
    const excerpt = plan.excerpts[0];
    expect(plan.excerpts).toHaveLength(1);
    expect(excerpt).toMatchObject({
      id: "P05-mission-pause-coverage",
      sourceFragmentCharacterCount: 1863,
    });
    expect(excerpt?.pipelines.baseline).toMatchObject({
      characterCount: 1590,
      wordCount: 283,
    });
    expect(excerpt?.pipelines.corrected).toMatchObject({
      characterCount: 1625,
      wordCount: 290,
    });
    const pauses = excerpt?.pipelines.corrected.units.map(
      (unit) => unit.pauseAfterMs,
    );
    expect(pauses).toHaveLength(21);
    expect(pauses?.filter((pause) => pause === 220)).toHaveLength(12);
    expect(pauses?.filter((pause) => pause === 280)).toHaveLength(3);
    expect(pauses?.filter((pause) => pause === 500)).toHaveLength(3);
    expect(pauses?.filter((pause) => pause === 700)).toHaveLength(1);
    expect(pauses?.filter((pause) => pause === 900)).toHaveLength(1);
    expect(pauses?.filter((pause) => pause === 0)).toHaveLength(1);
  });

  it("uses sample-05, preserves all original assignments, and publishes no mapping", () => {
    const supplemental = buildPhase2BSupplementalManifest(
      buildPhase2BPauseCoveragePlan(missionLesson()),
      "phase2b-blind-seed-at-least-16",
      "phase2b-supplemental",
    );
    const result = createPhase2BPackageManifests({
      originalManifest: originalManifest(),
      originalManifestPath: "/private/original.json",
      originalManifestSha256: "b".repeat(64),
      supplementalManifest: supplemental,
    });
    expect(result.privateManifest.pairs).toHaveLength(5);
    expect(result.privateManifest.pairs.slice(0, 4)).toEqual(
      expect.arrayContaining(
        originalManifest().pairs.map((pair) =>
          expect.objectContaining({
            pairId: pair.pairId,
            samples: pair.samples.map((sample) =>
              expect.objectContaining({
                sampleId: sample.blindSampleId,
                pipeline: sample.pipeline,
              }),
            ),
          }),
        ),
      ),
    );
    expect(result.privateManifest.pairs[4]).toMatchObject({
      pairId: "sample-05",
      pauseTypesExercised: [
        "sentence",
        "list",
        "paragraph",
        "heading",
        "section",
      ],
    });
    expect(JSON.stringify(result.publicPackage)).not.toMatch(
      /baseline|corrected|bryce|\/private\//iu,
    );
    expect(result.publicPackage.pairs[1]?.table_efficiency).toBe(true);
  });

  it("randomizes the odd supplemental assignment and validates its offset", () => {
    const plan = buildPhase2BPauseCoveragePlan(missionLesson());
    const correctedLabels = new Set(
      Array.from({ length: 64 }, (_, index) => {
        const manifest = buildPhase2BSupplementalManifest(
          plan,
          `phase2b-seed-${String(index).padStart(4, "0")}`,
          "phase2b-supplemental",
        );
        return manifest.pairs[0]?.samples.find(
          (sample) => sample.pipeline === "corrected",
        )?.blindLabel;
      }),
    );
    expect(correctedLabels).toEqual(new Set(["A", "B"]));
    expect(() =>
      createPiperEvaluationPrivateManifest({
        plan,
        blindSeed: "phase2b-blind-seed-at-least-16",
        pairNumberOffset: -1,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<PiperEvaluationPlanError>>({
        code: "INVALID_PAIR_OFFSET",
      }),
    );
  });

  it("strictly validates a complete blind response and rejects extra keys", () => {
    const supplemental = buildPhase2BSupplementalManifest(
      buildPhase2BPauseCoveragePlan(missionLesson()),
      "phase2b-blind-seed-at-least-16",
      "phase2b-supplemental",
    );
    const { publicPackage } = createPhase2BPackageManifests({
      originalManifest: originalManifest(),
      originalManifestPath: "/private/original.json",
      originalManifestSha256: "b".repeat(64),
      supplementalManifest: supplemental,
    });
    const response = completeResponse(publicPackage);
    expect(response.completion).toMatchObject({
      status: "complete",
      answered_required: 111,
      required_total: 111,
      percent: 100,
    });
    expect(
      parsePhase2BResponse(response, publicPackage).listener_id,
    ).toBe("L-ABCDEFGH");
    expect(() =>
      parsePhase2BResponse(
        { ...response, hidden_assignment: "A" },
        publicPackage,
      ),
    ).toThrow();
  });
});
