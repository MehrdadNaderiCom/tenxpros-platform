import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  OPENROUTER_USD_QUANTA_PER_DOLLAR,
  checkMetadataGetCap,
  checkPaidInferenceCap,
  estimateConservativeNextJudgeCost,
  formatUsdQuanta,
  parseOpenRouterGenerationContent,
  parseOpenRouterGenerationMetadata,
  parseOpenRouterKeyUsage,
  parseUsdToQuanta,
  reconcileOpenRouterUsage,
  resolveOpenRouterInferenceCost,
  type OpenRouterKeyUsage,
} from "../src/lib/academy/narration/openrouter-generation-retrieval";

const generationId = "gen-test-123";
const historicalCosts = [
  "0.35509",
  "0.355635",
  "0.351385",
  "0.35203",
  "0.3504275",
  "0.3541725",
  "0.35271",
  "0.360065",
  "0.355775",
  "0.35422",
] as const;

function keyReading(options: {
  usage?: string;
  limit?: string;
  remaining?: string;
  kind?: OpenRouterKeyUsage["keyKind"];
} = {}): OpenRouterKeyUsage {
  const usage = parseUsdToQuanta(
    options.usage ?? "3.54151",
  );
  const limit = parseUsdToQuanta(
    options.limit ?? "10",
  );
  const remaining = parseUsdToQuanta(
    options.remaining ?? "6.45849",
  );
  return {
    usageQuanta: usage,
    limitQuanta: limit,
    limitRemainingQuanta: remaining,
    usageUsd: formatUsdQuanta(usage),
    limitUsd: formatUsdQuanta(limit),
    limitRemainingUsd: formatUsdQuanta(remaining),
    keyKind: options.kind ?? "INFERENCE_CONFIRMED",
    active: true,
    expiresAt: null,
  };
}

describe("OpenRouter fixed-point USD accounting", () => {
  it("parses and formats eight-decimal USD exactly", () => {
    expect(parseUsdToQuanta("3.54151000")).toBe(
      354_151_000n,
    );
    expect(parseUsdToQuanta(0.3504275)).toBe(
      35_042_750n,
    );
    expect(
      parseUsdToQuanta(6.458489999999999),
    ).toBe(645_849_000n);
    expect(formatUsdQuanta(1n)).toBe("0.00000001");
    expect(formatUsdQuanta(-1n)).toBe("-0.00000001");
    expect(OPENROUTER_USD_QUANTA_PER_DOLLAR).toBe(
      100_000_000n,
    );
  });

  it.each([
    "1e-8",
    "-1",
    "+1",
    " 1",
    "01.0",
    "0.000000001",
    "6.458489999999999",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -0.1,
    undefined,
  ])("rejects unsafe USD input %s", (value) => {
    expect(() => parseUsdToQuanta(value)).toThrow();
  });
});

describe("official OpenRouter generation parsers", () => {
  it("preserves and hashes an exact direct completion", () => {
    const completion = "  ```json\n{\"ok\":true}\n```  ";
    const parsed = parseOpenRouterGenerationContent(
      JSON.stringify({
        data: {
          id: generationId,
          content: completion,
        },
      }),
      generationId,
    );

    expect(parsed).toMatchObject({
      generationId,
      completion,
      sourcePath: "$.data.content",
      toolName: null,
    });
    expect(parsed.completionSha256).toBe(
      createHash("sha256")
        .update(completion)
        .digest("hex"),
    );
  });

  it("extracts one historical forced tool-call argument", () => {
    const parsed = parseOpenRouterGenerationContent(
      JSON.stringify({
        data: {
          id: generationId,
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    type: "function",
                    function: {
                      name:
                        "submit_blind_audio_evaluation",
                      arguments: "{\"score\":4}",
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
      generationId,
    );

    expect(parsed).toMatchObject({
      completion: "{\"score\":4}",
      sourcePath:
        "$.data.choices[0].message.tool_calls[0].function.arguments",
      toolName: "submit_blind_audio_evaluation",
    });
  });

  it("rejects the wrong historical tool type or name", () => {
    for (const toolCall of [
      {
        type: "custom",
        function: {
          name: "submit_blind_audio_evaluation",
          arguments: "{}",
        },
      },
      {
        type: "function",
        function: {
          name: "submit_audio_evaluation",
          arguments: "{}",
        },
      },
    ]) {
      expect(() =>
        parseOpenRouterGenerationContent(
          JSON.stringify({
            data: {
              id: generationId,
              choices: [
                {
                  message: {
                    content: null,
                    tool_calls: [toolCall],
                  },
                },
              ],
            },
          }),
          generationId,
        ),
      ).toThrow(/complete function call/u);
    }
  });

  it("rejects ID mismatch, arbitrary nesting, and ambiguous candidates", () => {
    expect(() =>
      parseOpenRouterGenerationContent(
        JSON.stringify({
          data: {
            id: "gen-other",
            content: "{}",
          },
        }),
        generationId,
      ),
    ).toThrow(/does not match/u);
    expect(() =>
      parseOpenRouterGenerationContent(
        JSON.stringify({
          data: {
            id: generationId,
            request: {
              prompt: "{\"not\":\"completion\"}",
            },
          },
        }),
        generationId,
      ),
    ).toThrow(/no allowlisted/u);
    expect(() =>
      parseOpenRouterGenerationContent(
        JSON.stringify({
          data: {
            id: generationId,
            content: "{}",
            choices: [
              {
                message: {
                  content: "{\"other\":true}",
                },
              },
            ],
          },
        }),
        generationId,
      ),
    ).toThrow(/ambiguous/u);
  });

  it("parses generation metadata and documented token aliases", () => {
    const parsed = parseOpenRouterGenerationMetadata(
      JSON.stringify({
        data: {
          id: generationId,
          total_cost: "0.35509000",
          tokens_prompt: 11216,
          native_tokens_prompt: 11200,
          tokens_completion: 3146,
          native_tokens_completion: 3100,
          provider_name: "OpenAI",
          provider: "OpenAI",
          finish_reason: "tool_calls",
          native_finish_reason: "stop",
          model: "openai/gpt-audio",
        },
      }),
      generationId,
    );

    expect(parsed).toMatchObject({
      generationId,
      totalCostQuanta: 35_509_000n,
      totalCostUsd: "0.35509000",
      promptTokens: 11216,
      completionTokens: 3146,
      nativePromptTokens: 11200,
      nativeCompletionTokens: 3100,
      promptTokenSource: "tokens_prompt",
      completionTokenSource: "tokens_completion",
      provider: "OpenAI",
      finishReason: "tool_calls",
      nativeFinishReason: "stop",
    });

    const fallback = parseOpenRouterGenerationMetadata(
      JSON.stringify({
        data: {
          id: generationId,
          total_cost: 0.1,
          native_tokens_prompt: 10,
          native_tokens_completion: 20,
          provider: "OpenAI",
          native_finish_reason: "stop",
        },
      }),
      generationId,
    );
    expect(fallback).toMatchObject({
      promptTokens: 10,
      completionTokens: 20,
      promptTokenSource: "native_tokens_prompt",
      completionTokenSource: "native_tokens_completion",
    });
  });

  it.each([
    { total_cost: -1 },
    { total_cost: "1e-3" },
    { total_cost: "0.000000001" },
    { tokens_prompt: 1.5 },
    { tokens_completion: -1 },
    { provider_name: 4 },
    { finish_reason: null },
    { model: "different/model" },
  ])("rejects malformed metadata %#", (override) => {
    expect(() =>
      parseOpenRouterGenerationMetadata(
        JSON.stringify({
          data: {
            id: generationId,
            total_cost: "0.1",
            tokens_prompt: 10,
            tokens_completion: 20,
            provider_name: "OpenAI",
            finish_reason: "stop",
            ...override,
          },
        }),
        generationId,
      ),
    ).toThrow();
  });

  it("keeps normalized and native metadata distinct and rejects hidden numeric precision", () => {
    const aliases = parseOpenRouterGenerationMetadata(
      JSON.stringify({
        data: {
          id: generationId,
          total_cost: "0.1",
          tokens_prompt: 10,
          native_tokens_prompt: 999,
          tokens_completion: 20,
          provider_name: "OpenAI",
          provider: "Other",
          finish_reason: "tool_calls",
          native_finish_reason: "stop",
        },
      }),
      generationId,
    );
    expect(aliases).toMatchObject({
      promptTokens: 10,
      nativePromptTokens: 999,
      provider: "OpenAI",
      alternateProvider: "Other",
      finishReason: "tool_calls",
      nativeFinishReason: "stop",
    });
    expect(() =>
      parseOpenRouterGenerationMetadata(
        `{"data":{"id":"${generationId}","total_cost":0.10000000000000001,"tokens_prompt":10,"tokens_completion":20,"provider_name":"OpenAI","finish_reason":"stop"}}`,
        generationId,
      ),
    ).toThrow(/plain nonnegative/u);
  });

  it("parses exact key usage and identifies inference keys", () => {
    const parsed = parseOpenRouterKeyUsage(
      JSON.stringify({
        data: {
          usage: "3.54151000",
          limit: 10,
          limit_remaining: "6.45849000",
          is_management_key: false,
          disabled: false,
          expires_at: null,
        },
      }),
    );

    expect(parsed).toMatchObject({
      usageQuanta: 354_151_000n,
      limitQuanta: 1_000_000_000n,
      limitRemainingQuanta: 645_849_000n,
      keyKind: "INFERENCE_CONFIRMED",
      active: true,
    });
  });

  it("canonicalizes only bounded numeric IEEE-754 noise in key monetary fields and keeps strings strict", () => {
    const observed = parseOpenRouterKeyUsage(
      `{"data":{"usage":3.54151,"limit":10,"limit_remaining":6.458489999999999,"is_management_key":false,"is_provisioning_key":false,"expires_at":"2026-07-27T17:12:00.014Z"}}`,
    );
    expect(observed).toMatchObject({
      usageUsd: "3.54151000",
      limitUsd: "10.00000000",
      limitRemainingUsd: "6.45849000",
      numericCanonicalizations: [
        {
          field: "limit_remaining",
          originalNumericLexeme:
            "6.458489999999999",
          canonicalUsd: "6.45849000",
          absoluteAdjustmentUsd:
            "0.000000000000001",
          maximumAcceptedAdjustmentUsd:
            "0.000000000000001",
        },
      ],
    });
    for (const boundary of [
      "1.000000000000001",
      "0.999999999999999",
    ]) {
      expect(
        parseOpenRouterKeyUsage(
          `{"data":{"usage":${boundary},"limit":10,"limit_remaining":9,"is_management_key":false}}`,
        ).usageUsd,
      ).toBe("1.00000000");
    }
    for (const outside of [
      "1.0000000000000011",
      "0.9999999999999989",
    ]) {
      expect(() =>
        parseOpenRouterKeyUsage(
          `{"data":{"usage":${outside},"limit":10,"limit_remaining":9,"is_management_key":false}}`,
        ),
      ).toThrow(/maximum IEEE-754 noise/iu);
    }
    expect(() =>
      parseOpenRouterKeyUsage(
        `{"data":{"usage":"6.458489999999999","limit":10,"limit_remaining":3.54151,"is_management_key":false}}`,
      ),
    ).toThrow(/plain nonnegative/u);
  });
});

describe("stable two-reading reconciliation", () => {
  function reconcile(
    before = keyReading(),
    after = before,
  ) {
    return reconcileOpenRouterUsage({
      historicalGenerationCosts: historicalCosts,
      carriedHistoricalCost: "3.54151",
      initialKeyUsage: "0",
      keyReadingBefore: before,
      keyReadingAfter: after,
      priorUncertainMaximum: "4.146",
      noInferenceBetweenKeyReadings: true,
    });
  }

  it("clears the uncertain maximum with stable zero-delta evidence", () => {
    const result = reconcile();

    expect(result).toMatchObject({
      status: "UNCERTAIN_COST_CLEARED",
      canContinuePaidInference: true,
      unexplainedDeltaQuanta: 0n,
      reconciledActualCostQuanta: 354_151_000n,
      unresolvedActualDeltaQuanta: 0n,
      retainedHypotheticalUncertainQuanta: 0n,
      capAccountedCostQuanta: 354_151_000n,
      event: {
        event: "UNCERTAIN_COST_RECONCILED",
        previousUncertainAmountUsd: "4.14600000",
        reconciledActualAmountUsd: "0.00000000",
      },
    });
  });

  it("carries only an exact positive usage delta", () => {
    const reading = keyReading({
      usage: "3.64151",
      remaining: "6.35849",
    });
    const result = reconcile(reading);

    expect(result).toMatchObject({
      status: "UNEXPLAINED_ACTUAL_DELTA_CARRIED",
      unexplainedDeltaQuanta: 10_000_000n,
      reconciledActualCostQuanta: 364_151_000n,
      unresolvedActualDeltaQuanta: 0n,
      retainedHypotheticalUncertainQuanta: 0n,
      capAccountedCostQuanta: 364_151_000n,
    });
  });

  it("blocks and retains uncertainty for negative, unstable, or arithmetically invalid readings", () => {
    const negative = keyReading({
      usage: "3.5",
      remaining: "6.5",
    });
    expect(reconcile(negative)).toMatchObject({
      status: "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN",
      canContinuePaidInference: false,
      retainedHypotheticalUncertainQuanta:
        414_600_000n,
    });

    expect(
      reconcile(
        keyReading(),
        keyReading({
          usage: "3.54151001",
          remaining: "6.45848999",
        }),
      ),
    ).toMatchObject({
      status: "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN",
    });

    expect(
      reconcile(
        keyReading({
          remaining: "6.4",
        }),
      ),
    ).toMatchObject({
      status: "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN",
    });
  });

  it("accounts for but blocks an implausibly large actual delta", () => {
    const reading = keyReading({
      usage: "8",
      remaining: "2",
    });
    expect(reconcile(reading)).toMatchObject({
      status: "IMPLAUSIBLE_ACTUAL_DELTA_BLOCKED",
      canContinuePaidInference: false,
      reconciledActualCostQuanta: 800_000_000n,
      unresolvedActualDeltaQuanta: 0n,
      retainedHypotheticalUncertainQuanta: 0n,
      capAccountedCostQuanta: 800_000_000n,
    });
  });

  it("blocks expired keys at an injected reconciliation time", () => {
    const expired = {
      ...keyReading(),
      expiresAt: "2026-07-26T23:59:59.000Z",
    };
    const result = reconcileOpenRouterUsage({
      historicalGenerationCosts: historicalCosts,
      carriedHistoricalCost: "3.54151",
      initialKeyUsage: "0",
      keyReadingBefore: expired,
      keyReadingAfter: expired,
      priorUncertainMaximum: "4.146",
      noInferenceBetweenKeyReadings: true,
      nowIso: "2026-07-27T00:00:00.000Z",
    });
    expect(result).toMatchObject({
      status: "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN",
      canContinuePaidInference: false,
    });
    expect(result.reasons).toContain(
      "The before key is expired",
    );
  });

  it("does not permit raising the plausible unexplained-cost bound", () => {
    expect(() =>
      reconcileOpenRouterUsage({
        historicalGenerationCosts: historicalCosts,
        carriedHistoricalCost: "3.54151",
        initialKeyUsage: "0",
        keyReadingBefore: keyReading(),
        keyReadingAfter: keyReading(),
        priorUncertainMaximum: "4.146",
        noInferenceBetweenKeyReadings: true,
        maximumPlausibleUnexplained:
          "4.14600001",
      }),
    ).toThrow(/immutable prior request bound/u);
  });
});

describe("independent request caps and cost fallback", () => {
  it("counts metadata GETs independently of paid POSTs", () => {
    expect(
      checkMetadataGetCap({ metadataGetsUsed: 39 }),
    ).toMatchObject({
      allowed: true,
      nextCount: 40,
    });
    expect(
      checkMetadataGetCap({ metadataGetsUsed: 40 }),
    ).toMatchObject({
      allowed: false,
      reason: "METADATA_GET_CAP_EXCEEDED",
    });
    expect(() =>
      checkMetadataGetCap({
        metadataGetsUsed: 0,
        maximumMetadataGets: 41,
      }),
    ).toThrow(/Invalid metadata/u);
  });

  it("allows exact USD 10 and rejects one quantum over", () => {
    expect(
      checkPaidInferenceCap({
        paidJudgePostsUsed: 4,
        reconciledActualCost: "9",
        unresolvedActualUsageDelta: "0.5",
        estimatedNextRequestCost: "0.5",
        costEvidenceStable: true,
      }),
    ).toMatchObject({
      allowed: true,
      projectedCostQuanta: 1_000_000_000n,
      nextCount: 5,
    });
    expect(
      checkPaidInferenceCap({
        paidJudgePostsUsed: 4,
        reconciledActualCost: "9",
        unresolvedActualUsageDelta: "0.5",
        estimatedNextRequestCost: "0.50000001",
        costEvidenceStable: true,
      }),
    ).toMatchObject({
      allowed: false,
      reason: "USD_CAP_EXCEEDED",
      projectedCostQuanta: 1_000_000_001n,
    });
    expect(() =>
      checkPaidInferenceCap({
        paidJudgePostsUsed: 0,
        reconciledActualCost: "0",
        unresolvedActualUsageDelta: "0",
        estimatedNextRequestCost: "0",
        costEvidenceStable: true,
        maximumPaidJudgePosts: 6,
      }),
    ).toThrow(/Invalid paid/u);
    expect(() =>
      checkPaidInferenceCap({
        paidJudgePostsUsed: 0,
        reconciledActualCost: "0",
        unresolvedActualUsageDelta: "0",
        estimatedNextRequestCost: "0",
        costEvidenceStable: true,
        maximumSpend: "10.00000001",
      }),
    ).toThrow(/immutable USD 10/u);
  });

  it.each(["0", "0.49999999"])(
    "internally floors a caller estimate of %s to the pinned USD 0.50",
    (estimatedNextRequestCost) => {
      expect(
        checkPaidInferenceCap({
          paidJudgePostsUsed: 0,
          reconciledActualCost: "9.5",
          unresolvedActualUsageDelta: "0",
          estimatedNextRequestCost,
          costEvidenceStable: true,
        }),
      ).toMatchObject({
        allowed: true,
        projectedCostQuanta: 1_000_000_000n,
        effectiveNextRequestCostQuanta:
          50_000_000n,
      });
    },
  );

  it("uses the exact historical maxima and documented margin", () => {
    expect(estimateConservativeNextJudgeCost()).toEqual({
      baseCostQuanta: 37_376_250n,
      safetyMarginBasisPoints: 2_500,
      estimatedCostQuanta: 50_000_000n,
      estimatedCostUsd: "0.50000000",
    });
  });

  it("prefers inline usage.cost and falls back to matching generation metadata", () => {
    expect(
      resolveOpenRouterInferenceCost({
        inlineUsageCost: "0.25",
        generationId,
      }),
    ).toMatchObject({
      resolved: true,
      source: "usage.cost",
      costQuanta: 25_000_000n,
    });

    const metadata = parseOpenRouterGenerationMetadata(
      JSON.stringify({
        data: {
          id: generationId,
          total_cost: "0.3",
          tokens_prompt: 10,
          tokens_completion: 20,
          provider_name: "OpenAI",
          finish_reason: "stop",
        },
      }),
      generationId,
    );
    expect(
      resolveOpenRouterInferenceCost({
        inlineUsageCost: null,
        generationId,
        generationMetadata: metadata,
      }),
    ).toMatchObject({
      resolved: true,
      source: "generation.data.total_cost",
      costQuanta: 30_000_000n,
    });
    expect(
      resolveOpenRouterInferenceCost({
        inlineUsageCost: null,
        generationId,
      }),
    ).toEqual({
      resolved: false,
      source: null,
      requiresGenerationMetadata: true,
    });
  });
});
