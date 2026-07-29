import { describe, expect, it } from "vitest";

import {
  AI_AUDIO_RECOVERED_RESPONSE_FORMAT,
  AI_AUDIO_RECOVERED_RESPONSE_JSON_SCHEMA,
  AI_AUDIO_SEVERITY_SYNONYMS,
  recoverAiAudioJudgeResponse,
  selectIndependentRecoveredResponses,
  toLegacyAiJudgeResponse,
  type AiAudioRecoveryAssignment,
  type AiAudioRecoveryResult,
} from "../src/lib/academy/narration/ai-audio-response-recovery";
import {
  AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION,
  AI_AUDIO_SCORE_DIMENSIONS,
} from "../src/lib/academy/narration/ai-audio-evaluation";

const assignment: AiAudioRecoveryAssignment = {
  assignmentId: "run-recovery-test",
  judgeId: "judge-01",
  pairs: Array.from({ length: 5 }, (_, index) => ({
    pairId: `SET-${String(index + 1)}`,
    versionAFileId: `CLIP-${String(index + 1)}A`,
    versionBFileId: `CLIP-${String(index + 1)}B`,
    tableEvaluation: index === 2,
  })),
};

function scores(value: number | string = 4) {
  return Object.fromEntries(
    AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      value,
    ]),
  );
}

function oldResponse(options: {
  severity?: string;
  numericString?: boolean;
  versionLabels?: boolean;
} = {}) {
  return {
    schema_version: AI_AUDIO_JUDGE_RESPONSE_SCHEMA_VERSION,
    assignment_id: assignment.assignmentId,
    judge_id: assignment.judgeId,
    evidence_basis: "AUDIO_ONLY",
    clips: assignment.pairs.flatMap((pair, pairIndex) => [
      {
        clip_label: pair.versionAFileId,
        scores: scores(options.numericString ? "4" : 4),
        evidence_note: `The heard voice has steady pacing and clear articulation ${String(
          pairIndex,
        )}A.`,
      },
      {
        clip_label: pair.versionBFileId,
        scores: scores(),
        evidence_note: `The delivery has natural cadence and audible endings ${String(
          pairIndex,
        )}B.`,
      },
    ]),
    pairs: assignment.pairs.map((pair, pairIndex) => {
      const choice = options.versionLabels
        ? "Version A"
        : pair.versionAFileId;
      return {
        pair_label: pair.pairId,
        preferred_version_overall: choice,
        clearer_version: choice,
        more_natural_version: choice,
        better_paced_version: choice,
        long_lesson_preference: choice,
        speed_assessment: [
          {
            clip_label: pair.versionAFileId,
            too_slow: false,
            too_fast: false,
          },
          {
            clip_label: pair.versionBFileId,
            too_slow: false,
            too_fast: false,
          },
        ],
        pronunciation_issues:
          pairIndex === 0 && options.severity
            ? [
                {
                  clip_label: pair.versionBFileId,
                  severity: options.severity,
                  description:
                    "A heard pronunciation stress was slightly uneven.",
                },
              ]
            : [],
        audible_distinction: "CLEAR",
        confidence: options.numericString ? "84" : 84,
        concise_reason: `The heard pacing and voice rhythm make this comparison ${String(
          pairIndex,
        )} distinct.`,
        ...(pair.tableEvaluation
          ? {
              table_evaluation: {
                easier_to_follow: pair.versionAFileId,
                repeated_labels_helpful: "yes",
                longer_clip: pair.versionAFileId,
                longer_duration_excessive: "no",
                clarity_justifies_added_duration: "yes",
                test_more_concise_table_narration: "no",
              },
            }
          : {}),
      };
    }),
    overall_notes:
      "The heard voices differ in pacing, comfort, and articulation.",
  };
}

function recover(
  response: unknown = oldResponse(),
  responseId = "gen-recovery-test",
): AiAudioRecoveryResult {
  return recoverAiAudioJudgeResponse({
    responseId,
    response,
    assignment,
  });
}

type JudgeId =
  | "judge-01"
  | "judge-02"
  | "judge-03"
  | "judge-04"
  | "judge-05";

function recoverForJudge(
  judgeId: JudgeId,
  responseId: string,
): AiAudioRecoveryResult {
  const response = oldResponse();
  response.judge_id = judgeId;
  return recoverAiAudioJudgeResponse({
    responseId,
    response,
    assignment: {
      ...assignment,
      judgeId,
    },
  });
}

function scalarLeafPaths(
  value: unknown,
  path = "$",
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      scalarLeafPaths(item, `${path}[${String(index)}]`),
    );
  }
  if (
    typeof value === "object" &&
    value !== null
  ) {
    return Object.entries(value).flatMap(([key, item]) =>
      scalarLeafPaths(item, `${path}.${key}`),
    );
  }
  return [path];
}

describe("offline audio-judge response recovery", () => {
  it("accepts missing non-table fields and extracts exactly one top-level table evaluation", () => {
    const result = recover();

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.response.file_scores).toHaveLength(10);
    expect(result.response.pair_evaluations).toHaveLength(5);
    expect(result.response.pair_evaluations[0]).not.toHaveProperty(
      "table_evaluation",
    );
    expect(result.response.table_evaluation).toMatchObject({
      pair_id: "SET-3",
      clearer_version: "A",
      repeated_labels_helpful: true,
      longer_version: "A",
      longer_duration_excessive: false,
      clarity_justifies_added_duration: true,
      concise_table_variant_recommended: false,
      confidence: 84,
    });
    expect(
      result.provenance.some(
        (entry) =>
          entry.originalResponseId === "gen-recovery-test" &&
          entry.outputPath === "$.table_evaluation.pair_id" &&
          entry.originalJsonPath === "$.pairs[2].pair_label" &&
          entry.normalizationRule ===
            "MOVE_TABLE_EVALUATION_TO_TOP_LEVEL",
      ),
    ).toBe(true);
    expect(
      result.provenance.find(
        (entry) =>
          entry.outputPath ===
          "$.table_evaluation.confidence",
      ),
    ).toMatchObject({
      originalJsonPath: "$.pairs[2].confidence",
      originalValue: 84,
      normalizedValue: 84,
      normalizationRule:
        "MOVE_TABLE_EVALUATION_TO_TOP_LEVEL",
    });
    expect(
      result.provenance.find(
        (entry) =>
          entry.outputPath === "$.table_evaluation.reason",
      ),
    ).toMatchObject({
      originalJsonPath: "$.pairs[2].concise_reason",
      originalValue:
        "The heard pacing and voice rhythm make this comparison 2 distinct.",
      normalizedValue:
        "The heard pacing and voice rhythm make this comparison 2 distinct.",
      normalizationRule:
        "MOVE_TABLE_EVALUATION_TO_TOP_LEVEL",
    });
    expect(
      scalarLeafPaths(result.response).filter(
        (path) =>
          !result.provenance.some(
            (entry) => entry.outputPath === path,
          ),
      ),
    ).toEqual([]);
    expect(
      result.provenance.filter((entry) =>
        [
          "$.table_evaluation.repeated_labels_helpful",
          "$.table_evaluation.longer_duration_excessive",
          "$.table_evaluation.clarity_justifies_added_duration",
          "$.table_evaluation.concise_table_variant_recommended",
        ].includes(entry.outputPath),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizationRule:
            "LEGACY_TABLE_YES_NO_TO_BOOLEAN",
        }),
      ]),
    );
  });

  it("scopes the exact legacy SIMILAR_DURATION sentinel to the table duration field", () => {
    const response = oldResponse();
    const tablePair = response.pairs.find(
      (pair) => pair.table_evaluation,
    )!;
    tablePair.table_evaluation!.longer_clip =
      "SIMILAR_DURATION";

    const valid = recover(response);

    expect(valid.valid).toBe(true);
    if (!valid.valid) return;
    expect(valid.response.table_evaluation.longer_version).toBe(
      "tie",
    );
    expect(
      valid.provenance.find(
        (entry) =>
          entry.outputPath ===
          "$.table_evaluation.longer_version",
      ),
    ).toMatchObject({
      originalValue: "SIMILAR_DURATION",
      normalizedValue: "tie",
      normalizationRule:
        "LEGACY_SIMILAR_DURATION_TO_TIE",
    });

    const invalidPreference = oldResponse();
    invalidPreference.pairs[0]!.preferred_version_overall =
      "SIMILAR_DURATION";
    const invalid = recover(invalidPreference);
    expect(invalid.valid).toBe(false);
    expect(invalid.issues).toContainEqual(
      expect.objectContaining({
        code: "UNKNOWN_PRESENTATION_LABEL",
        path: "$.pairs[0].preferred_version_overall",
      }),
    );
  });

  it("accepts only exact legacy yes/no table sentinels after trimming", () => {
    const response = oldResponse();
    const tablePair = response.pairs.find(
      (pair) => pair.table_evaluation,
    )!;
    tablePair.table_evaluation!.repeated_labels_helpful =
      "YES";

    const result = recover(response);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "INVALID_VALUE",
        path:
          "$.pairs[2].table_evaluation.repeated_labels_helpful",
      }),
    );
  });

  it("fails closed on prose preference aliases", () => {
    for (const alias of [
      "NO_PREFERENCE",
      "no preference",
      "no_preference",
      "similar duration",
      "similar_duration",
    ]) {
      const response = oldResponse();
      response.pairs[0]!.preferred_version_overall = alias;
      const result = recover(response);
      expect(result.valid, alias).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "UNKNOWN_PRESENTATION_LABEL",
          path: "$.pairs[0].preferred_version_overall",
        }),
      );
    }
  });

  it.each(Object.entries(AI_AUDIO_SEVERITY_SYNONYMS))(
    "normalizes approved pronunciation severity %s to %s",
    (source, expected) => {
      const result = recover(oldResponse({ severity: source }));

      expect(result.valid).toBe(true);
      if (!result.valid) return;
      expect(
        result.response.pair_evaluations[0]
          ?.pronunciation_findings[0]?.severity,
      ).toBe(expected);
      expect(
        result.provenance.find(
          (entry) =>
            entry.outputPath ===
            "$.pair_evaluations[0].pronunciation_findings[0].severity",
        ),
      ).toMatchObject({
        originalValue: source,
        normalizedValue: expected,
      });
    },
  );

  it.each(["somewhat concerning", "MILD"])(
    "rejects unknown or non-mapped pronunciation severity %s without suppressing the finding",
    (severity) => {
      const result = recover(oldResponse({ severity }));

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "UNKNOWN_SEVERITY",
          path: "$.pairs[0].pronunciation_issues[0].severity",
        }),
      );
    },
  );

  it("does not invent a missing score", () => {
    const response = oldResponse();
    delete (
      response.clips[0]!.scores as Partial<
        Record<(typeof AI_AUDIO_SCORE_DIMENSIONS)[number], unknown>
      >
    ).clarity;

    const result = recover(response);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "MISSING_REQUIRED_FIELD",
        path: "$.clips[0].scores.clarity",
      }),
    );
  });

  it("does not invent a missing preference", () => {
    const response = oldResponse();
    delete (
      response.pairs[0] as Partial<
        (typeof response.pairs)[number]
      >
    ).preferred_version_overall;

    const result = recover(response);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "MISSING_REQUIRED_FIELD",
        path: "$.pairs[0].preferred_version_overall",
      }),
    );
  });

  it("removes JSON fences and normalizes numeric and Version A/B values deterministically", () => {
    const response = ` \n\`\`\`json\n${JSON.stringify(
      oldResponse({
        numericString: true,
        versionLabels: true,
      }),
    )}\n\`\`\`\n `;
    const result = recover(response);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.response.file_scores[0]?.scores.clarity).toBe(4);
    expect(
      result.response.pair_evaluations[0]
        ?.preferred_version_overall,
    ).toBe("A");
    expect(result.response.pair_evaluations[0]?.confidence).toBe(84);
    expect(
      result.provenance.map((entry) => entry.normalizationRule),
    ).toEqual(
      expect.arrayContaining([
        "REMOVE_MARKDOWN_JSON_FENCE",
        "NUMERIC_STRING_TO_INTEGER",
        "VERSION_LABEL_TO_CANONICAL",
      ]),
    );
  });

  it("rejects a recovery context containing any private/source mapping", () => {
    const unsafeAssignment = {
      ...assignment,
      pairs: assignment.pairs.map((pair, index) => ({
        ...pair,
        sourceSampleId:
          index === 0 ? "bryce-corrected" : "bryce-baseline",
      })),
    };
    const result = recoverAiAudioJudgeResponse({
      responseId: "gen-private-context-test",
      response: oldResponse(),
      assignment:
        unsafeAssignment as unknown as AiAudioRecoveryAssignment,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "PRIVATE_MAPPING_INPUT",
      }),
    );
  });

  it("round-trips to panel input without changing A/B or canonical severity", () => {
    const result = recover(oldResponse({ severity: "medium" }));
    expect(result.valid).toBe(true);
    if (!result.valid) return;

    const legacy = toLegacyAiJudgeResponse(
      result.response,
      assignment,
    );

    expect(legacy.pairs[0]?.preferred_version_overall).toBe(
      assignment.pairs[0]?.versionAFileId,
    );
    expect(legacy.pairs[0]?.pronunciation_issues[0]).toMatchObject({
      clip_label: assignment.pairs[0]?.versionBFileId,
      severity: "moderate",
    });
    expect(legacy.pairs[2]?.table_evaluation).not.toBeNull();
    expect(legacy.pairs[0]?.table_evaluation).toBeNull();
  });
});

describe("corrected schema and perspective selection", () => {
  it("exposes one strict top-level table schema without per-pair table requirements", () => {
    expect(AI_AUDIO_RECOVERED_RESPONSE_FORMAT).toMatchObject({
      type: "json_schema",
      json_schema: { strict: true },
    });
    expect(
      AI_AUDIO_RECOVERED_RESPONSE_JSON_SCHEMA.required,
    ).toEqual([
      "judge_metadata",
      "file_scores",
      "pair_evaluations",
      "table_evaluation",
      "overall_assessment",
      "long_form_recommendation",
      "confidence",
    ]);
    const pairItems =
      AI_AUDIO_RECOVERED_RESPONSE_JSON_SCHEMA.properties
        .pair_evaluations.items;
    expect(pairItems.required).not.toContain("table_evaluation");
    expect(pairItems.properties).not.toHaveProperty(
      "table_evaluation",
    );
  });

  it("prefers valid initials, uses retry only when needed, and counts one judge per perspective", () => {
    const perspectiveIds: JudgeId[] = [
      "judge-01",
      "judge-02",
      "judge-03",
      "judge-04",
      "judge-05",
    ];
    const selection = selectIndependentRecoveredResponses({
      perspectiveIds,
      attempts: perspectiveIds.flatMap(
        (perspectiveId, index) => {
          const invalidInitial =
            recoverAiAudioJudgeResponse({
              responseId: `invalid-initial-${perspectiveId}`,
              response: {},
              assignment: {
                ...assignment,
                judgeId: perspectiveId,
              },
            });
          return [
            {
              perspectiveId,
              attempt: 1 as const,
              result:
                index === 1
                  ? invalidInitial
                  : recoverForJudge(
                      perspectiveId,
                      `initial-${perspectiveId}`,
                    ),
            },
            {
              perspectiveId,
              attempt: 2 as const,
              result: recoverForJudge(
                perspectiveId,
                `retry-${perspectiveId}`,
              ),
            },
          ];
        },
      ),
    });

    expect(selection.validIndependentJudgeCount).toBe(5);
    expect(selection.selected).toHaveLength(5);
    expect(selection.missingPerspectiveIds).toEqual([]);
    expect(selection.selected[0]).toMatchObject({
      perspectiveId: "judge-01",
      selectedAttempt: 1,
      originalResponseId: "initial-judge-01",
    });
    expect(selection.selected[1]).toMatchObject({
      perspectiveId: "judge-02",
      selectedAttempt: 2,
      originalResponseId: "retry-judge-02",
    });
  });

  it("binds recovered judge metadata to its perspective", () => {
    const perspectiveIds: JudgeId[] = [
      "judge-01",
      "judge-02",
      "judge-03",
      "judge-04",
      "judge-05",
    ];
    expect(() =>
      selectIndependentRecoveredResponses({
        perspectiveIds,
        attempts: [
          {
            perspectiveId: "judge-02",
            attempt: 1,
            result: recoverForJudge(
              "judge-01",
              "wrong-perspective",
            ),
          },
        ],
      }),
    ).toThrow(/judge metadata does not match perspective/iu);
  });

  it("never counts a duplicate response id or hash as independent", () => {
    const perspectiveIds: JudgeId[] = [
      "judge-01",
      "judge-02",
      "judge-03",
      "judge-04",
      "judge-05",
    ];
    const duplicateIds = perspectiveIds.map((perspectiveId) => ({
      perspectiveId,
      attempt: 1 as const,
      result: recoverForJudge(
        perspectiveId,
        "duplicate-response-id",
      ),
    }));
    expect(() =>
      selectIndependentRecoveredResponses({
        perspectiveIds,
        attempts: duplicateIds,
      }),
    ).toThrow(/duplicate response id or response hash/iu);

    const duplicateHash = "f".repeat(64);
    const duplicateHashes = perspectiveIds.map(
      (perspectiveId) => {
        const result = recoverForJudge(
          perspectiveId,
          `unique-${perspectiveId}`,
        );
        if (!result.valid) {
          throw new Error("Test fixture must recover");
        }
        return {
          perspectiveId,
          attempt: 1 as const,
          result: {
            ...result,
            responseHash: duplicateHash,
          },
        };
      },
    );
    expect(() =>
      selectIndependentRecoveredResponses({
        perspectiveIds,
        attempts: duplicateHashes,
      }),
    ).toThrow(/duplicate response id or response hash/iu);
  });
});
