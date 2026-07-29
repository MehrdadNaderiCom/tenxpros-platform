import { describe, expect, it } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  AI_AUDIO_SCORE_DIMENSIONS,
  buildBlindJudgeAssignments,
  hashAiValue,
  type AiBlindJudgeAssignment,
  type AiBlindSourcePair,
  type AiObjectiveAnalysisSummary,
  type AiPrivateSampleIdentity,
} from "../src/lib/academy/narration/ai-audio-evaluation";
import {
  aggregatePiperPanelV2,
  parsePiperPanelV2ToolArguments,
  piperPanelV2ArgumentsFromEnvelope,
  piperPanelV2Tool,
  type PiperPanelV2Evaluation,
  type PiperPanelV2Run,
} from "../src/lib/academy/narration/openrouter-piper-panel-v2";
import {
  assertPiperPanelV2Request,
  authorizePiperPanelV2Request,
  buildPiperPanelV2Request,
  estimatePiperPanelV2RequestCost,
  parsePiperPanelV2ModelCatalog,
} from "../src/lib/academy/narration/openrouter-piper-panel-v2-executor";
import {
  persistRawResponseBeforeParse,
} from "../scripts/openrouter-piper-panel-v2";

const PACKAGE_ID = "blind-review-fedcba9876543210";
const BASE_SEED =
  "piper-panel-v2-unit-test-independent-seed-material";

function sourcePairs(): readonly AiBlindSourcePair[] {
  return Array.from({ length: 5 }, (_, index) => {
    const pairId = `source-pair-${String(index + 1)}`;
    return {
      pairId,
      tableEvaluation: index === 1,
      samples: [
        {
          sampleId: `${pairId}-baseline`,
          audioSha256: hashAiValue({
            pairId,
            pipeline: "baseline",
          }),
          durationSeconds: 20 + index,
        },
        {
          sampleId: `${pairId}-corrected`,
          audioSha256: hashAiValue({
            pairId,
            pipeline: "corrected",
          }),
          durationSeconds: 21 + index,
        },
      ],
    };
  });
}

function assignments(): readonly AiBlindJudgeAssignment[] {
  return buildBlindJudgeAssignments({
    evaluationPackageId: PACKAGE_ID,
    blindSeed: BASE_SEED,
    pairs: sourcePairs(),
  });
}

function argumentsObject(
  assignment: AiBlindJudgeAssignment,
): Record<string, unknown> {
  const pairs = assignment.pairs.map((pair, index) => {
    const correctedVersion =
      pair.clips[0].sourceSampleId.endsWith("-corrected")
        ? "A"
        : "B";
    const baselineVersion =
      correctedVersion === "A" ? "B" : "A";
    const scores = (score: string) =>
      Object.fromEntries(
        AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => [
          dimension,
          score,
        ]),
      );
    return {
      pair_id: pair.neutralPairLabel,
      a: scores(correctedVersion === "A" ? "5" : "3"),
      b: scores(correctedVersion === "B" ? "5" : "3"),
      preferred_overall: `Version ${correctedVersion}`,
      clearer: correctedVersion.toLowerCase(),
      more_natural: correctedVersion,
      better_paced: correctedVersion,
      preferred_for_long_lesson: correctedVersion,
      a_too_slow: false,
      b_too_slow: false,
      a_too_fast: false,
      b_too_fast: false,
      pronunciation_issues:
        index === 0
          ? [
              {
                version: baselineVersion,
                severity: "mild",
                description:
                  "The spoken acronym sounds clipped and less clear.",
              },
            ]
          : [],
      confidence: "88",
      reason:
        "The preferred voice sounds clearer, more natural, and better paced.",
    };
  });
  const tablePair = assignment.pairs.find(
    (pair) => pair.tableEvaluation,
  )!;
  const tableCorrectedVersion =
    tablePair.clips[0].sourceSampleId.endsWith("-corrected")
      ? "A"
      : "B";
  return {
    judge: {
      perspective_id: assignment.judgeId,
      confidence: "90",
    },
    pairs,
    table_evaluation: {
      pair_id: tablePair.neutralPairLabel,
      easier_to_follow: `version ${tableCorrectedVersion}`,
      repeated_labels_helpful: true,
      duration_excessive: false,
      clarity_justifies_duration: true,
      concise_variant_recommended: false,
      confidence: "86",
      reason:
        "The repeated spoken labels make the table easier to follow.",
    },
    overall: {
      best_pipeline_across_pairs: "tie",
      suitable_for_professional_academy: true,
      suitable_for_15_to_30_minutes: true,
      main_strength:
        "Clear sentence rhythm and comfortable instructional delivery.",
      main_concern:
        "A few baseline pronunciations sound slightly clipped.",
    },
  };
}

function parseValid(
  assignment: AiBlindJudgeAssignment,
): PiperPanelV2Evaluation {
  return parsePiperPanelV2ToolArguments({
    assignment,
    argumentsJson: JSON.stringify(
      argumentsObject(assignment),
    ),
  });
}

describe("Piper panel v2 forced-tool response contract", () => {
  it("uses exactly five pairs and one top-level table evaluation", () => {
    const assignment = assignments()[0]!;
    const tool = piperPanelV2Tool(assignment) as {
      function: {
        parameters: {
          properties: Record<string, unknown>;
        };
      };
    };
    expect(
      tool.function.parameters.properties,
    ).toHaveProperty("table_evaluation");
    const pairSchema = tool.function.parameters.properties
      .pairs as {
      minItems: number;
      maxItems: number;
      items: {
        properties: Record<string, unknown>;
      };
    };
    expect(pairSchema.minItems).toBe(5);
    expect(pairSchema.maxItems).toBe(5);
    expect(
      pairSchema.items.properties,
    ).not.toHaveProperty("table_evaluation");
  });

  it("normalizes only approved numeric, preference, and severity forms", () => {
    const response = parseValid(assignments()[0]!);
    expect(response.judge.confidence).toBe(90);
    expect(response.pairs[0]!.a.naturalness).toSatisfy(
      (value: number) => value === 3 || value === 5,
    );
    expect(
      response.pairs[0]!.pronunciation_issues[0]!
        .severity,
    ).toBe("minor");
    expect(
      ["A", "B"].includes(
        response.pairs[0]!.preferred_overall,
      ),
    ).toBe(true);
  });

  it("never invents a missing score or pair", () => {
    const assignment = assignments()[0]!;
    const missingScore = argumentsObject(assignment);
    const pair = (
      missingScore.pairs as Record<string, unknown>[]
    )[0]!;
    delete (pair.a as Record<string, unknown>).clarity;
    expect(() =>
      parsePiperPanelV2ToolArguments({
        assignment,
        argumentsJson: JSON.stringify(missingScore),
      }),
    ).toThrow(/missing or unknown properties/u);

    const missingPair = argumentsObject(assignment);
    (
      missingPair.pairs as Record<string, unknown>[]
    ).pop();
    expect(() =>
      parsePiperPanelV2ToolArguments({
        assignment,
        argumentsJson: JSON.stringify(missingPair),
      }),
    ).toThrow(/exactly five/u);
  });

  it("extracts one matching tool call and ignores unrelated prose", () => {
    const args = JSON.stringify(
      argumentsObject(assignments()[0]!),
    );
    const envelope = {
      choices: [
        {
          message: {
            content: "Evaluation complete.",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "unrelated_tool",
                  arguments: "{}",
                },
              },
              {
                type: "function",
                function: {
                  name: "submit_audio_evaluation",
                  arguments: args,
                },
              },
            ],
          },
        },
      ],
    };
    expect(
      piperPanelV2ArgumentsFromEnvelope(envelope),
    ).toBe(args);
    envelope.choices[0]!.message.tool_calls.push({
      type: "function",
      function: {
        name: "submit_audio_evaluation",
        arguments: args,
      },
    });
    expect(() =>
      piperPanelV2ArgumentsFromEnvelope(envelope),
    ).toThrow(/exactly one matching/u);
  });
});

describe("Piper panel v2 request and cost controls", () => {
  const catalog = JSON.stringify({
    data: [
      {
        id: "openai/gpt-audio",
        context_length: 128_000,
        architecture: {
          input_modalities: ["text", "audio"],
        },
        supported_parameters: [
          "max_tokens",
          "tools",
          "tool_choice",
        ],
        pricing: {
          prompt: "0.0000025",
          audio: "0.000032",
          completion: "0.00001",
        },
      },
    ],
  });

  it("forces the exact tool, omits response_format, and sends ten audio inputs", () => {
    const assignment = assignments()[0]!;
    const audioContent = assignment.pairs.flatMap((pair) => [
      {
        type: "text",
        text: `Listen to ${pair.neutralPairLabel}.`,
      },
      {
        type: "input_audio",
        input_audio: {
          data: "AA==",
          format: "mp3",
        },
      },
      {
        type: "input_audio",
        input_audio: {
          data: "AQ==",
          format: "mp3",
        },
      },
    ]);
    const built = buildPiperPanelV2Request({
      assignment,
      audioContent,
    });
    expect(built.audioInputCount).toBe(10);
    expect(built.body).not.toHaveProperty(
      "response_format",
    );
    expect(() =>
      assertPiperPanelV2Request(built.body),
    ).not.toThrow();
    expect(
      JSON.stringify(built.redactedRequest),
    ).not.toMatch(/AA==|AQ==/u);
  });

  it("uses live catalog prices, actual duration, prompt bytes, and 2500 max tokens", () => {
    const model =
      parsePiperPanelV2ModelCatalog(catalog);
    const estimate =
      estimatePiperPanelV2RequestCost({
        durationSeconds: Array.from(
          { length: 10 },
          () => 100,
        ),
        textPayloadBytes: 9_000,
        pricing: model.pricing,
      });
    expect(estimate.audioTokenEstimate).toBe(16_667);
    expect(estimate.textTokenEstimate).toBe(3_000);
    expect(estimate.maximumCompletionTokens).toBe(
      2_500,
    );
    expect(
      estimate.conservativeCostQuanta,
    ).toBeGreaterThan(0n);
  });

  it("allows no more than seven paid posts and enforces the USD 10 projection", () => {
    const allowed = authorizePiperPanelV2Request({
      paidPostsUsed: 6,
      cumulativeKnownActualCost: "3.54151000",
      unresolvedActualUsageDelta: "0",
      maximumUncertainCost: "0",
      nextEstimate: "0.70000000",
      keyUsage: "3.54151000",
      keyLimit: "10.00000000",
      keyLimitRemaining: "6.45849000",
      costEvidenceStable: true,
    });
    expect(allowed.allowed).toBe(true);
    expect(
      authorizePiperPanelV2Request({
        paidPostsUsed: 1,
        cumulativeKnownActualCost: "3.88159750",
        unresolvedActualUsageDelta: "0",
        maximumUncertainCost: "0",
        nextEstimate: "0.70000000",
        keyUsage: "3.54151000",
        keyLimit: "10.00000000",
        keyLimitRemaining: "6.45849000",
        costEvidenceStable: true,
      }).allowed,
    ).toBe(true);
    expect(
      authorizePiperPanelV2Request({
        paidPostsUsed: 7,
        cumulativeKnownActualCost: "3.54151000",
        unresolvedActualUsageDelta: "0",
        maximumUncertainCost: "0",
        nextEstimate: "0.70000000",
        keyUsage: "3.54151000",
        keyLimit: "10.00000000",
        keyLimitRemaining: "6.45849000",
        costEvidenceStable: true,
      }).reason,
    ).toBe("PAID_POST_CAP_EXCEEDED");
    expect(
      authorizePiperPanelV2Request({
        paidPostsUsed: 1,
        cumulativeKnownActualCost: "9.50000000",
        unresolvedActualUsageDelta: "0",
        maximumUncertainCost: "0",
        nextEstimate: "0.70000000",
        keyUsage: "9.50000000",
        keyLimit: "10.00000000",
        keyLimitRemaining: "0.50000000",
        costEvidenceStable: true,
      }).reason,
    ).toBe("KEY_REMAINING_INSUFFICIENT");
  });

  it("produces independent blind assignments without exposing the mapping to validation", () => {
    const generated = assignments();
    expect(
      new Set(
        generated.map(
          (assignment) => assignment.assignmentHash,
        ),
      ).size,
    ).toBe(5);
    expect(
      parsePiperPanelV2ToolArguments.length,
    ).toBe(1);
  });

  it("durably stores and records the complete raw response before semantic parsing", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "piper-panel-v2-"),
    );
    const path = join(directory, "raw.txt");
    const order: string[] = [];
    const rawBody = JSON.stringify({
      id: "gen-unit-test-12345678",
      choices: [],
    });
    try {
      const result =
        await persistRawResponseBeforeParse({
          path,
          rawBody,
          recordPersistence: async (evidence) => {
            expect(await readFile(path, "utf8")).toBe(
              rawBody,
            );
            expect(evidence.rawBodyBytes).toBe(
              Buffer.byteLength(rawBody),
            );
            order.push("ledger");
          },
          parse: (body) => {
            order.push("parse");
            return JSON.parse(body) as unknown;
          },
        });
      expect(result.parsed).toEqual(
        JSON.parse(rawBody),
      );
      expect(order).toEqual(["ledger", "parse"]);
      expect((await stat(path)).mode & 0o777).toBe(
        0o600,
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});

describe("Piper panel v2 private aggregation", () => {
  it("applies the private mapping only after five valid perspectives", () => {
    const generated = assignments();
    const identities: AiPrivateSampleIdentity[] =
      sourcePairs().flatMap((pair) =>
        pair.samples.map((sample) => ({
          sourceSampleId: sample.sampleId,
          sourcePairId: pair.pairId,
          candidateId: sample.sampleId.endsWith(
            "-corrected",
          )
            ? "bryce-corrected"
            : "bryce-baseline",
          pipeline: sample.sampleId.endsWith(
            "-corrected",
          )
            ? ("corrected" as const)
            : ("baseline" as const),
          voice: "bryce" as const,
        })),
      );
    const objectiveWithoutHash = {
      blockingDefects: [],
      regressions: [],
      improvements: [],
      directionalFindings: [],
      clearlyDistinctPairIds: sourcePairs().map(
        (pair) => pair.pairId,
      ),
    };
    const objective: AiObjectiveAnalysisSummary = {
      ...objectiveWithoutHash,
      analysisHash: hashAiValue(objectiveWithoutHash),
    };
    const runs: PiperPanelV2Run[] = generated.map(
      (assignment, index) => {
        const evaluation = parseValid(assignment);
        return {
          perspectiveId:
            evaluation.judge.perspective_id,
          assignment,
          evaluation,
          responseId: `gen-panel-${String(index + 1)}`,
          rawBodySha256: hashAiValue({
            raw: index,
          }),
          normalizedResponseSha256:
            hashAiValue(evaluation),
          requestOrdinal: index + 1,
          attempt: 1,
        };
      },
    );
    const aggregate = aggregatePiperPanelV2({
      runs,
      privateSamples: identities,
      objective,
    });
    expect(aggregate.validPerspectiveCount).toBe(5);
    expect(aggregate.correctedPairMajorityWins).toBe(5);
    expect(
      aggregate.correctedOverallPreferenceRate,
    ).toBe(1);
    expect(
      aggregate.correctedPreferenceRates.better_paced,
    ).toBe(1);
    expect(
      aggregate.dimensionScores.corrected.clarity,
    ).toBe(5);
    expect(aggregate.perceptualDecision).toBe(
      "PASS_PIPER_BRYCE",
    );
  });
});
