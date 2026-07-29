import { describe, expect, it } from "vitest";

import {
  aggregatePhase2BResponses,
  evaluatePhase2BDecision,
  normalizePhase2BPronunciationDescription,
  renderPhase2BAnalysisMarkdown,
  renderPhase2BDecisionSummary,
  type Phase2BDecisionInput,
} from "../src/lib/academy/narration/piper-listening-aggregation";
import {
  computePhase2BCompletion,
  PHASE2B_PRIVATE_MANIFEST_SCHEMA_VERSION,
  PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION,
  PHASE2B_RESPONSE_SCHEMA_VERSION,
  type Phase2BPrivateAnalysisManifest,
  type Phase2BPublicPackage,
  type Phase2BResponse,
} from "../src/lib/academy/narration/piper-listening-evaluation";

const PACKAGE_ID = "blind-review-0123456789abcdef";
const PAIR_IDS = [
  "sample-01",
  "sample-02",
  "sample-03",
  "sample-04",
  "sample-05",
] as const;
const CORRECTED_LABELS = ["A", "B", "A", "B", "A"] as const;

const publicPackage: Phase2BPublicPackage = {
  schema_version: PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION,
  evaluation_package_id: PACKAGE_ID,
  pairs: PAIR_IDS.map((pairId, index) => ({
    pair_id: pairId,
    table_efficiency: pairId === "sample-02",
    samples: [
      {
        sample_id: `${pairId}-A`,
        label: "A",
        filename: `${pairId}-A.mp3`,
      },
      {
        sample_id: `${pairId}-B`,
        label: "B",
        filename: `${pairId}-B.mp3`,
      },
    ],
  })),
};

const manifest: Phase2BPrivateAnalysisManifest = {
  schemaVersion: PHASE2B_PRIVATE_MANIFEST_SCHEMA_VERSION,
  evaluationPackageId: PACKAGE_ID,
  originalManifest: {
    path: "authoritative-private.json",
    sha256: "a".repeat(64),
  },
  originalPairIds: [
    "sample-01",
    "sample-02",
    "sample-03",
    "sample-04",
  ],
  tablePairId: "sample-02",
  allLocalVoicesFailedVoiceOnlyCriteria: false,
  voicesEvaluated: ["bryce"],
  pairs: PAIR_IDS.map((pairId, index) => {
    const correctedLabel = CORRECTED_LABELS[index];
    return {
      pairId,
      cohort: index < 4 ? "original" : "pause_coverage",
      excerptId: `opaque-${String(index + 1)}`,
      pauseTypesExercised:
        pairId === "sample-02"
          ? ["sentence", "tableRow"]
          : pairId === "sample-05"
            ? [
                "sentence",
                "list",
                "paragraph",
                "heading",
                "section",
              ]
            : ["sentence", "paragraph"],
      samples: [
        {
          sampleId: `${pairId}-A`,
          filename: `${pairId}-A.mp3`,
          pairId,
          pipeline:
            correctedLabel === "A" ? "corrected" : "baseline",
          durationSeconds: null,
          sha256: null,
        },
        {
          sampleId: `${pairId}-B`,
          filename: `${pairId}-B.mp3`,
          pairId,
          pipeline:
            correctedLabel === "B" ? "corrected" : "baseline",
          durationSeconds: null,
          sha256: null,
        },
      ],
    };
  }),
};

const LISTENER_IDS = [
  "L-ABCDEFGH",
  "L-ABCDEFGJ",
  "L-ABCDEFGK",
  "L-ABCDEFGL",
  "L-ABCDEFGM",
] as const;

function completeResponse(
  listenerId: (typeof LISTENER_IDS)[number],
): Phase2BResponse {
  const timestamp = "2026-07-26T12:00:00.000Z";
  const files = Object.fromEntries(
    publicPackage.pairs.flatMap((pair, pairIndex) =>
      pair.samples.map((sample) => {
        const corrected =
          sample.label === CORRECTED_LABELS[pairIndex];
        return [
          sample.sample_id,
          {
            scores: {
              naturalness: corrected ? 4 : 3,
              pause_quality: corrected ? 4 : 3,
              pronunciation: corrected ? 5 : 3,
              clarity: corrected ? 5 : 3,
              listening_comfort: corrected ? 4 : 3,
              professional_quality: corrected ? 4 : 3,
            },
            one_x_recorded_at: timestamp,
            optional_1_25x_used: false,
            ...(pairIndex === 0 && corrected
              ? { comment: "Comfortable sample." }
              : {}),
          },
        ];
      }),
    ),
  );
  const pairs: Phase2BResponse["pairs"] = Object.fromEntries(
    publicPackage.pairs.map((pair, pairIndex) => {
      const preferred = CORRECTED_LABELS[pairIndex];
      return [
        pair.pair_id,
        {
          preferences: {
            overall_preference: preferred,
            easier_to_understand: preferred,
            more_natural: preferred,
            long_lesson_preference: preferred,
            too_slow: "neither" as const,
            too_fast: "neither" as const,
            strange_pronunciation: "neither" as const,
          },
          pronunciation_issues: [],
          table_efficiency: pair.table_efficiency
            ? {
                easier_to_understand: preferred,
                repeated_labels_usefulness: 5,
                excessively_slow: "neither" as const,
                pauses_excessive: "neither" as const,
                prefer_longer_clearer: "yes" as const,
                test_more_concise_format: "no" as const,
              }
            : null,
          ...(pairIndex === 0
            ? { comments: "The contrast was easy to hear." }
            : {}),
        },
      ];
    }),
  );
  const withoutCompletion: Omit<Phase2BResponse, "completion"> = {
    schema_version: PHASE2B_RESPONSE_SCHEMA_VERSION,
    evaluation_package_id: PACKAGE_ID,
    listener_id: listenerId,
    timestamps: {
      started_at: timestamp,
      updated_at: timestamp,
      exported_at: timestamp,
    },
    files,
    pairs,
  };
  const completion = computePhase2BCompletion(
    withoutCompletion,
    publicPackage,
  );
  return {
    ...withoutCompletion,
    completion: { ...completion, errors: [...completion.errors] },
  };
}

function submissions(
  responses: readonly Phase2BResponse[],
) {
  return responses.map((value, index) => ({
    source: `response-${String(index + 1)}.json`,
    value,
  }));
}

describe("Phase 2B offline aggregation", () => {
  it("collapses exact duplicates and computes paired, pipeline, preference, table, consistency, and comment metrics", () => {
    const responses = LISTENER_IDS.map(completeResponse);
    const analysis = aggregatePhase2BResponses({
      manifest,
      publicPackage,
      submissions: [
        ...submissions(responses),
        { source: "response-copy.json", value: responses[0] },
      ],
    });

    expect(analysis.submissions).toMatchObject({
      received_files: 6,
      unique_submission_identities: 5,
      exact_duplicates_collapsed: 1,
      invalid_response_count: 0,
      complete_valid_listeners: 5,
      completion_rate: 1,
      listener_count_in_range: true,
    });
    expect(
      analysis.scores.by_pipeline.corrected.clarity,
    ).toEqual({ count: 25, mean: 5, median: 5 });
    expect(
      analysis.scores.corrected_improvement.pause_quality,
    ).toMatchObject({
      paired_difference: { count: 25, mean: 1, median: 1 },
      corrected_higher_count: 25,
      tied_count: 0,
      baseline_higher_count: 0,
    });
    expect(analysis.preferences.corrected_original_pair_wins).toBe(4);
    expect(
      analysis.preferences.corrected_overall_preference,
    ).toMatchObject({ corrected: 25, total: 25, rate: 1 });
    expect(
      analysis.preferences.corrected_long_lesson_preference.rate,
    ).toBe(1);
    expect(
      analysis.table_efficiency.corrected_excessively_slow_rate,
    ).toBe(0);
    expect(
      analysis.table_efficiency.corrected_rejected_by_majority,
    ).toBe(false);
    expect(analysis.consistency.flagged_listener_ids).toEqual([]);
    expect(
      analysis.comments.by_pipeline.corrected.filter(
        (comment) => comment.scope === "file",
      ),
    ).toHaveLength(5);
    expect(
      analysis.comments.by_pipeline.baseline.filter(
        (comment) => comment.scope === "pair",
      ),
    ).toHaveLength(5);
    expect(analysis.decision.recommendation).toBe("PASS");
    expect(renderPhase2BAnalysisMarkdown(analysis)).toContain(
      "**PASS**",
    );
    expect(renderPhase2BDecisionSummary(analysis)).toContain(
      "No tuning, voice switch, or external TTS request was performed",
    );
  });

  it("invalidates every export for a conflicting listener id and fails closed below five valid listeners", () => {
    const responses = LISTENER_IDS.map(completeResponse);
    const conflicting = structuredClone(responses[0]);
    conflicting.files["sample-01-A"]!.comment = "Different export.";
    const analysis = aggregatePhase2BResponses({
      manifest,
      publicPackage,
      submissions: [
        ...submissions(responses),
        { source: "conflict.json", value: conflicting },
      ],
    });

    expect(analysis.submissions.complete_valid_listeners).toBe(4);
    expect(analysis.submissions.completion_rate).toBe(0.8);
    expect(analysis.invalid_responses).toEqual([
      expect.objectContaining({
        listener_id: LISTENER_IDS[0],
        code: "CONFLICTING_LISTENER_EXPORTS",
      }),
    ]);
    expect(analysis.decision.recommendation).toBe(
      "INSUFFICIENT_DATA",
    );
  });

  it("rejects malformed private decision gates instead of coercing them", () => {
    expect(() =>
      aggregatePhase2BResponses({
        manifest: {
          ...manifest,
          allLocalVoicesFailedVoiceOnlyCriteria: "false",
        } as unknown as Phase2BPrivateAnalysisManifest,
        publicPackage,
        submissions: submissions(
          LISTENER_IDS.map(completeResponse),
        ),
      }),
    ).toThrow(/schema|contract/u);
  });

  it("keeps no-preference votes in the original-pair majority denominator", () => {
    const responses = LISTENER_IDS.map(completeResponse);
    const corrected = CORRECTED_LABELS[0];
    const baseline = corrected === "A" ? "B" : "A";
    responses[2]!.pairs["sample-01"]!.preferences.overall_preference =
      baseline;
    responses[3]!.pairs["sample-01"]!.preferences.overall_preference =
      baseline;
    responses[4]!.pairs[
      "sample-01"
    ]!.preferences.overall_preference = "no_preference";
    const analysis = aggregatePhase2BResponses({
      manifest,
      publicPackage,
      submissions: submissions(responses),
    });

    expect(
      analysis.preferences.original_pair_outcomes["sample-01"],
    ).toBe("tie");
    expect(analysis.preferences.corrected_original_pair_wins).toBe(3);
    expect(
      analysis.preferences.by_pair["sample-01"]?.overall_preference,
    ).toEqual({
      corrected: 2,
      baseline: 2,
      neutral: 1,
      total: 5,
    });
  });

  it("normalizes pronunciation descriptions and blocks repeated critical corrected issues", () => {
    const responses = LISTENER_IDS.map(completeResponse);
    const first = structuredClone(responses[0]);
    const second = structuredClone(responses[1]);
    for (const [response, description] of [
      [first, "A.P.I — sounds wrong!"],
      [second, "a p i sounds wrong"],
    ] as const) {
      const preferred = CORRECTED_LABELS[0];
      response.pairs["sample-01"]!.preferences.strange_pronunciation =
        preferred;
      response.pairs["sample-01"]!.pronunciation_issues = [
        {
          version: preferred,
          severity: "critical",
          description,
        },
      ];
    }
    const analysis = aggregatePhase2BResponses({
      manifest,
      publicPackage,
      submissions: submissions([
        first,
        second,
        ...responses.slice(2),
      ]),
    });

    expect(
      normalizePhase2BPronunciationDescription(
        "  A.P.I — sounds WRONG! ",
      ),
    ).toBe("a p i sounds wrong");
    expect(
      analysis.pronunciation.repeated_corrected_critical_groups,
    ).toEqual([
      expect.objectContaining({
        normalized_description: "a p i sounds wrong",
        unique_listener_count: 2,
      }),
    ]);
    expect(
      analysis.decision.criteria.critical_pronunciation_pass,
    ).toBe(false);
    expect(analysis.decision.recommendation).toBe(
      "TUNE_AND_RETEST",
    );
  });

  it("requires adjudication when multiple listeners report differently worded critical issues for one corrected sample", () => {
    const responses = LISTENER_IDS.map(completeResponse);
    for (const [index, description] of [
      [0, "The acronym is unintelligible."],
      [1, "The brand name is mispronounced."],
    ] as const) {
      const response = responses[index]!;
      const corrected = CORRECTED_LABELS[0];
      response.pairs[
        "sample-01"
      ]!.preferences.strange_pronunciation = corrected;
      response.pairs["sample-01"]!.pronunciation_issues = [
        {
          version: corrected,
          severity: "critical",
          description,
        },
      ];
    }
    const analysis = aggregatePhase2BResponses({
      manifest,
      publicPackage,
      submissions: submissions(responses),
    });

    expect(
      analysis.pronunciation.repeated_corrected_critical_groups,
    ).toEqual([]);
    expect(
      analysis.pronunciation
        .corrected_critical_adjudication_pair_ids,
    ).toEqual(["sample-01"]);
    expect(
      analysis.decision.criteria.critical_pronunciation_pass,
    ).toBe(false);
  });
});

const passingDecisionInput: Phase2BDecisionInput = {
  valid_listener_count: 5,
  original_pair_count: 4,
  corrected_original_pair_wins: 3,
  corrected_overall_preference_rate: 0.6,
  corrected_median_scores: {
    naturalness: 4,
    pause_quality: 4,
    pronunciation: 4,
    clarity: 4,
    listening_comfort: 4,
    professional_quality: 3.8,
  },
  corrected_long_lesson_preference_rate: 0.7,
  repeated_corrected_critical_pronunciation_problem_count: 0,
  corrected_critical_pronunciation_adjudication_required: false,
  corrected_table_excessively_slow_rate: 0.5,
  corrected_table_pauses_excessive_rate: 0.5,
  table_concise_format_yes_rate: 0.5,
  corrected_too_slow_rate: 0.5,
  corrected_too_fast_rate: 0.5,
  weak_pause_types: [],
  all_local_voices_failed_voice_only_criteria: false,
  voices_evaluated: ["bryce"],
};

describe("Phase 2B deterministic decision rules", () => {
  it("treats the stated PASS thresholds as inclusive and table majority as strictly greater than half", () => {
    expect(
      evaluatePhase2BDecision(passingDecisionInput).recommendation,
    ).toBe("PASS");
  });

  it("routes technical pause failure to tuning without performing it", () => {
    const result = evaluatePhase2BDecision({
      ...passingDecisionInput,
      corrected_median_scores: {
        ...passingDecisionInput.corrected_median_scores,
        pause_quality: 3.5,
      },
      weak_pause_types: ["heading", "section"],
    });

    expect(result.recommendation).toBe("TUNE_AND_RETEST");
    expect(result.tuning_targets).toEqual([
      "heading_pause",
      "section_pause",
    ]);
  });

  it("identifies loudness as a candidate when clarity alone fails", () => {
    const result = evaluatePhase2BDecision({
      ...passingDecisionInput,
      corrected_median_scores: {
        ...passingDecisionInput.corrected_median_scores,
        clarity: 3.5,
      },
    });

    expect(result.recommendation).toBe("TUNE_AND_RETEST");
    expect(result.tuning_targets).toContain("loudness");
  });

  it("tests other local voices before considering an external provider, then allows escalation only after the explicit all-local failure gate", () => {
    const weakVoice = {
      ...passingDecisionInput,
      corrected_median_scores: {
        ...passingDecisionInput.corrected_median_scores,
        naturalness: 3,
        listening_comfort: 3,
        professional_quality: 3,
      },
    };

    expect(
      evaluatePhase2BDecision(weakVoice).recommendation,
    ).toBe("TEST_OTHER_LOCAL_VOICES");
    expect(
      evaluatePhase2BDecision({
        ...weakVoice,
        all_local_voices_failed_voice_only_criteria: true,
        voices_evaluated: ["bryce", "linda", "cori"],
      }).recommendation,
    ).toBe("CONSIDER_ELEVENLABS");
  });
});
