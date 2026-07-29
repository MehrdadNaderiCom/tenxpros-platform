import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  assertOpenRouterPaidJudgeRequestBody,
  auditOpenRouterPaidJudgeRequestBody,
  authorizeOpenRouterSemanticParse,
  buildOpenRouterPartialPanelStatus,
  classifyOpenRouterConfirmedUnbilledToolRejection,
  createOpenRouterPaidJudgeExecutorState,
  createOpenRouterRawResponseLifecycle,
  parseOpenRouterChatCompletionReceipt,
  parseOpenRouterPaidJudgePayload,
  planNextOpenRouterPaidJudgeRequest,
  recordOpenRouterRawPersistenceLedgered,
  recordOpenRouterRawResponsePersisted,
  resolveOpenRouterPaidJudgeCost,
  resumeOpenRouterPaidJudgeAfterCostReconciliation,
  settleOpenRouterPaidJudgeRequest,
  type OpenRouterPaidJudgeExecutorState,
  type OpenRouterPaidJudgeRequestMode,
} from "../src/lib/academy/narration/openrouter-paid-judge-executor";
import {
  parseOpenRouterGenerationMetadata,
} from "../src/lib/academy/narration/openrouter-generation-retrieval";

const generationId = "gen-paid-judge-123456";

function forcedTool() {
  return {
    type: "function",
    function: {
      name: "submit_audio_evaluation",
      description: "Submit an evaluation.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["judge_metadata"],
        properties: {
          judge_metadata: {
            type: "object",
          },
        },
      },
    },
  };
}

function requestBody(
  mode: OpenRouterPaidJudgeRequestMode =
    "FORCED_TOOL_CALL",
) {
  return {
    model: "openai/gpt-audio",
    provider: {
      allow_fallbacks: false,
      require_parameters: true,
    },
    store: false,
    stream: false,
    max_tokens: 5_000,
    ...(mode === "FORCED_TOOL_CALL"
      ? {
          tools: [forcedTool()],
          tool_choice: {
            type: "function",
            function: {
              name: "submit_audio_evaluation",
            },
          },
        }
      : {}),
    messages: [
      {
        role: "system",
        content:
          mode === "FORCED_TOOL_CALL"
            ? "Listen independently and call only submit_audio_evaluation."
            : "Return only a single JSON object. Do not use Markdown.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Compare neutral Version A and Version B.",
          },
          ...Array.from({ length: 10 }, () => ({
            type: "input_audio",
            input_audio: {
              data: "AA==",
              format: "mp3",
            },
          })),
        ],
      },
    ],
  };
}

function chatBody(options: {
  id?: string | null;
  cost?: string | number | null;
  arguments?: string;
  content?: unknown;
} = {}): string {
  const usage =
    options.cost === null
      ? {
          prompt_tokens: 100,
          completion_tokens: 20,
        }
      : {
          prompt_tokens: 100,
          completion_tokens: 20,
          cost: options.cost ?? "0.35509000",
        };
  return JSON.stringify({
    ...(options.id === null
      ? {}
      : { id: options.id ?? generationId }),
    usage,
    choices: [
      {
        message: {
          content:
            options.content === undefined
              ? null
              : options.content,
          tool_calls: [
            {
              type: "function",
              function: {
                name: "submit_audio_evaluation",
                arguments:
                  options.arguments ?? "{\"ok\":true}",
              },
            },
          ],
        },
      },
    ],
  });
}

function plan(
  state: OpenRouterPaidJudgeExecutorState,
  reconciledActualCost = "3.54151",
) {
  return planNextOpenRouterPaidJudgeRequest({
    state,
    reconciledActualCost,
    maximumUncertainCost: "0",
    estimatedNextRequestCost: "0",
    costEvidenceStable: true,
  });
}

function authorizedLifecycle(rawBody: string) {
  const responseHash = createHash("sha256")
    .update(rawBody)
    .digest("hex");
  return authorizeOpenRouterSemanticParse(
    recordOpenRouterRawPersistenceLedgered(
      recordOpenRouterRawResponsePersisted(
        createOpenRouterRawResponseLifecycle(),
        {
          rawBodySha256: responseHash,
          artifactBodySha256: responseHash,
          rawBodyBytes: Buffer.byteLength(rawBody),
          exactRawBodyStored: true,
          sanitizedArtifactStored: false,
        },
      ),
      "d".repeat(64),
    ),
  );
}

function confirmedUnbilledToolEvidence() {
  const rawBody = JSON.stringify({
    error: {
      message:
        "The tools parameter is not supported; request not billed.",
      param: "tools",
    },
  });
  const receipt =
    parseOpenRouterChatCompletionReceipt({
      rawBody,
    });
  const evidence =
    classifyOpenRouterConfirmedUnbilledToolRejection({
      lifecycle: authorizedLifecycle(rawBody),
      httpStatus: 400,
      rawBody,
      receipt,
    });
  if (!evidence) {
    throw new Error(
      "Expected confirmed-unbilled tool evidence",
    );
  }
  return evidence;
}

function plannedState(
  state: OpenRouterPaidJudgeExecutorState,
) {
  const result = plan(state);
  expect(result.status).toBe("PLANNED");
  if (result.status !== "PLANNED") {
    throw new Error("Expected a planned request");
  }
  return result;
}

describe("OpenRouter paid judge request contract", () => {
  it("accepts the forced tool request without returning audio data", () => {
    const audit = assertOpenRouterPaidJudgeRequestBody({
      body: requestBody(),
      mode: "FORCED_TOOL_CALL",
    });

    expect(audit).toMatchObject({
      valid: true,
      issues: [],
      audioInputCount: 10,
      responseFormatOmitted: true,
    });
    expect(JSON.stringify(audit)).not.toContain("AA==");
  });

  it("accepts only the authorized plain fallback shape", () => {
    expect(
      assertOpenRouterPaidJudgeRequestBody({
        body: requestBody(
          "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
        ),
        mode:
          "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
      }).valid,
    ).toBe(true);

    expect(
      auditOpenRouterPaidJudgeRequestBody({
        body: requestBody(),
        mode:
          "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
      }).issues,
    ).toContain("PLAIN_FALLBACK_MUST_OMIT_TOOLS");
  });

  it("rejects response_format, wrong tools, audio drift, and private identity leakage", () => {
    const body = requestBody();
    const broken = {
      ...body,
      response_format: {
        type: "json_object",
      },
      tools: [
        {
          ...forcedTool(),
          function: {
            ...forcedTool().function,
            name: "wrong_tool",
          },
        },
      ],
      messages: [
        body.messages[0],
        {
          ...body.messages[1],
          content: [
            {
              type: "text",
              text: "The corrected pipeline should beat baseline.",
            },
            ...(body.messages[1].content as unknown[]).slice(
              1,
              10,
            ),
          ],
        },
      ],
    };
    const audit = auditOpenRouterPaidJudgeRequestBody({
      body: broken,
      mode: "FORCED_TOOL_CALL",
    });

    expect(audit.valid).toBe(false);
    expect(audit.issues).toEqual(
      expect.arrayContaining([
        "RESPONSE_FORMAT_MUST_BE_OMITTED",
        "FORCED_TOOL_DEFINITION_INVALID",
        "AUDIO_INPUT_COUNT_NOT_10",
        "PRIVATE_PIPELINE_IDENTITY_LEAK",
      ]),
    );
  });
});

describe("OpenRouter paid judge response and cost parsing", () => {
  it("parses exact inline usage.cost and a proven generation ID", () => {
    const rawBody = chatBody();
    const receipt =
      parseOpenRouterChatCompletionReceipt({
        rawBody,
        generationHeaderId: generationId,
      });

    expect(receipt).toMatchObject({
      generationId,
      inlineUsageCostQuanta: 35_509_000n,
      inlineUsageCostUsd: "0.35509000",
      promptTokens: 100,
      completionTokens: 20,
      rawBodyBytes: Buffer.byteLength(rawBody),
    });
    expect(receipt.rawBodySha256).toBe(
      createHash("sha256")
        .update(rawBody)
        .digest("hex"),
    );
    expect(
      resolveOpenRouterPaidJudgeCost({ receipt }),
    ).toMatchObject({
      status: "RESOLVED",
      source: "usage.cost",
      costQuanta: 35_509_000n,
    });
  });

  it("requires generation metadata when inline cost is absent", () => {
    const receipt =
      parseOpenRouterChatCompletionReceipt({
        rawBody: chatBody({ cost: null }),
      });
    expect(
      resolveOpenRouterPaidJudgeCost({ receipt }),
    ).toEqual({
      status: "REQUIRES_GENERATION_METADATA",
      generationId,
    });

    const metadata =
      parseOpenRouterGenerationMetadata(
        JSON.stringify({
          data: {
            id: generationId,
            total_cost: "0.31000000",
            tokens_prompt: 100,
            tokens_completion: 20,
            provider_name: "OpenAI",
            finish_reason: "tool_calls",
            model: "openai/gpt-audio",
          },
        }),
        generationId,
      );
    expect(
      resolveOpenRouterPaidJudgeCost({
        receipt,
        generationMetadata: metadata,
      }),
    ).toMatchObject({
      status: "RESOLVED",
      source: "generation.data.total_cost",
      generationId,
      costQuanta: 31_000_000n,
    });
  });

  it("fails closed without a proven generation ID and rejects generic or conflicting IDs", () => {
    const noId =
      parseOpenRouterChatCompletionReceipt({
        rawBody: chatBody({
          id: null,
          cost: null,
        }),
      });
    expect(
      resolveOpenRouterPaidJudgeCost({
        receipt: noId,
      }),
    ).toEqual({
      status: "UNRESOLVED_FAIL_CLOSED",
      generationId: null,
    });
    expect(() =>
      parseOpenRouterChatCompletionReceipt({
        rawBody: chatBody({
          id: null,
          cost: null,
        }),
        generationHeaderId: "req-generic-123",
      }),
    ).toThrow(/not a proven/u);
    expect(() =>
      parseOpenRouterChatCompletionReceipt({
        rawBody: chatBody(),
        generationHeaderId:
          "gen-conflicting-123456",
      }),
    ).toThrow(/conflict/u);
  });

  it("rejects hidden inline cost precision", () => {
    const rawBody = chatBody().replace(
      '"cost":"0.35509000"',
      '"cost":0.35509000000000001',
    );
    expect(() =>
      parseOpenRouterChatCompletionReceipt({
        rawBody,
      }),
    ).toThrow(/plain nonnegative/u);
  });

  it("extracts only one exact forced tool payload", () => {
    expect(
      parseOpenRouterPaidJudgePayload({
        rawBody: chatBody({
          arguments: " {\"heard\":true} ",
        }),
        mode: "FORCED_TOOL_CALL",
      }),
    ).toMatchObject({
      payload: " {\"heard\":true} ",
      sourcePath:
        "$.choices[0].message.tool_calls[0].function.arguments",
    });
    expect(() =>
      parseOpenRouterPaidJudgePayload({
        rawBody: chatBody({
          content: "{\"ambiguous\":true}",
        }),
        mode: "FORCED_TOOL_CALL",
      }),
    ).toThrow(/ambiguous/u);
  });

  it("extracts the plain fallback only in its explicit mode", () => {
    const rawBody = JSON.stringify({
      id: generationId,
      choices: [
        {
          message: {
            content: " {\"plain\":true} ",
          },
        },
      ],
    });
    expect(
      parseOpenRouterPaidJudgePayload({
        rawBody,
        mode:
          "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
      }),
    ).toMatchObject({
      payload: " {\"plain\":true} ",
      sourcePath: "$.choices[0].message.content",
    });
  });
});

describe("raw-before-parse lifecycle", () => {
  const hashA = "a".repeat(64);
  const hashB = "b".repeat(64);
  const hashC = "c".repeat(64);

  it("authorizes parsing only after durable storage and its ledger event", () => {
    const initial =
      createOpenRouterRawResponseLifecycle();
    expect(() =>
      authorizeOpenRouterSemanticParse(initial),
    ).toThrow(/forbidden/u);
    const persisted =
      recordOpenRouterRawResponsePersisted(initial, {
        rawBodySha256: hashA,
        artifactBodySha256: hashA,
        rawBodyBytes: 100,
        exactRawBodyStored: true,
        sanitizedArtifactStored: false,
      });
    expect(() =>
      authorizeOpenRouterSemanticParse(persisted),
    ).toThrow(/forbidden/u);
    const ledgered =
      recordOpenRouterRawPersistenceLedgered(
        persisted,
        hashC,
      );
    expect(
      authorizeOpenRouterSemanticParse(ledgered),
    ).toMatchObject({
      stage: "SEMANTIC_PARSE_AUTHORIZED",
      rawBodySha256: hashA,
      persistenceLedgerEntryHash: hashC,
    });
  });

  it("requires either exact or sanitized durable response bytes", () => {
    expect(() =>
      recordOpenRouterRawResponsePersisted(
        createOpenRouterRawResponseLifecycle(),
        {
          rawBodySha256: hashA,
          artifactBodySha256: hashB,
          rawBodyBytes: 100,
          exactRawBodyStored: false,
          sanitizedArtifactStored: false,
        },
      ),
    ).toThrow(/invalid/u);
    expect(() =>
      recordOpenRouterRawResponsePersisted(
        createOpenRouterRawResponseLifecycle(),
        {
          rawBodySha256: hashA,
          artifactBodySha256: hashA,
          rawBodyBytes: 100,
          exactRawBodyStored: true,
          sanitizedArtifactStored: true,
        },
      ),
    ).toThrow(/invalid/u);
    expect(() =>
      recordOpenRouterRawResponsePersisted(
        createOpenRouterRawResponseLifecycle(),
        {
          rawBodySha256: hashA,
          artifactBodySha256: hashB,
          rawBodyBytes: 100,
          exactRawBodyStored: true,
          sanitizedArtifactStored: false,
        },
      ),
    ).toThrow(/invalid/u);
  });

  it("classifies the sole unbilled fallback exception only from durable, explicit evidence", () => {
    expect(
      confirmedUnbilledToolEvidence(),
    ).toMatchObject({
      classification:
        "CONFIRMED_UNBILLED_TOOL_UNSUPPORTED",
      httpStatus: 400,
      unbilledEvidence:
        "EXPLICIT_PROVIDER_NO_CHARGE",
    });

    const rawBody = JSON.stringify({
      error: {
        message:
          "Invalid tool arguments schema validation",
        param: "tools[0].function.arguments",
      },
      usage: {
        cost: "0.2",
      },
    });
    expect(
      classifyOpenRouterConfirmedUnbilledToolRejection({
        lifecycle: authorizedLifecycle(rawBody),
        httpStatus: 400,
        rawBody,
        receipt:
          parseOpenRouterChatCompletionReceipt({
            rawBody,
          }),
      }),
    ).toBeNull();

    const conflictingBilling = JSON.stringify({
      error: {
        message:
          "The tools parameter is unsupported; request not billed.",
        param: "tools",
      },
      usage: { cost: "0.10000000" },
    });
    expect(
      classifyOpenRouterConfirmedUnbilledToolRejection({
        lifecycle: authorizedLifecycle(
          conflictingBilling,
        ),
        httpStatus: 400,
        rawBody: conflictingBilling,
        receipt:
          parseOpenRouterChatCompletionReceipt({
            rawBody: conflictingBilling,
          }),
        stableKeyUsageDeltaZero: {
          beforeUsageQuanta: 100n,
          afterUsageQuanta: 101n,
          beforeRawBodySha256: "a".repeat(64),
          afterRawBodySha256: "b".repeat(64),
        },
      }),
    ).toBeNull();
  });
});

describe("five-primary paid executor state", () => {
  it("plans the first missing perspective with the pinned USD 0.50 admission floor", () => {
    const result = plan(
      createOpenRouterPaidJudgeExecutorState({
        existingValidPerspectiveIds: [
          "judge-01",
          "judge-02",
        ],
      }),
    );
    expect(result).toMatchObject({
      status: "PLANNED",
      request: {
        perspectiveId: "judge-03",
        mode: "FORCED_TOOL_CALL",
        paidAttemptOrdinal: 1,
        admissionNextCostQuanta: 50_000_000n,
      },
    });
  });

  it("permits one unbilled capability fallback without consuming a paid primary", () => {
    const first = plannedState(
      createOpenRouterPaidJudgeExecutorState({
        existingValidPerspectiveIds: [],
      }),
    );
    const switched =
      settleOpenRouterPaidJudgeRequest({
        state: first.state,
        settlement: {
          kind: "CONFIRMED_UNBILLED_TOOL_UNSUPPORTED",
          evidence:
            confirmedUnbilledToolEvidence(),
        },
      });
    expect(switched).toMatchObject({
      paidJudgePostsUsed: 0,
      confirmedUnbilledToolRejectionUsed: true,
      fallbackPerspectiveId: "judge-01",
      formatMode:
        "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
    });

    const fallback = plannedState(switched);
    expect(fallback.request).toMatchObject({
      perspectiveId: "judge-01",
      mode:
        "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
      isFallbackAfterConfirmedUnbilledToolRejection:
        true,
      paidAttemptOrdinal: 1,
    });
    const accepted =
      settleOpenRouterPaidJudgeRequest({
        state: fallback.state,
        settlement: {
          kind: "VALID_PAID",
          actualCostQuanta: 30_000_000n,
        },
      });
    expect(accepted).toMatchObject({
      paidJudgePostsUsed: 1,
      validNewPerspectiveIds: ["judge-01"],
      knownNewActualCostQuanta: 30_000_000n,
    });
    expect(plannedState(accepted).request).toMatchObject({
      perspectiveId: "judge-02",
      mode:
        "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
      isFallbackAfterConfirmedUnbilledToolRejection:
        false,
    });
  });

  it("never retries a paid or ambiguous perspective", () => {
    const first = plannedState(
      createOpenRouterPaidJudgeExecutorState({
        existingValidPerspectiveIds: [],
      }),
    );
    const paused =
      settleOpenRouterPaidJudgeRequest({
        state: first.state,
        settlement: {
          kind: "UNCERTAIN_POSSIBLY_PAID",
        },
      });
    expect(plan(paused)).toMatchObject({
      status: "NO_REQUEST",
      reason: "COST_RECONCILIATION_REQUIRED",
    });
    const resumed =
      resumeOpenRouterPaidJudgeAfterCostReconciliation(
        paused,
      );
    expect(plannedState(resumed).request).toMatchObject({
      perspectiveId: "judge-02",
      paidAttemptOrdinal: 2,
    });
  });

  it("never exceeds five paid primaries and reports an invalid partial panel", () => {
    let state =
      createOpenRouterPaidJudgeExecutorState({
        existingValidPerspectiveIds: [],
      });
    for (let index = 0; index < 5; index += 1) {
      const current = plannedState(state);
      state = settleOpenRouterPaidJudgeRequest({
        state: current.state,
        settlement: {
          kind: "INVALID_PAID",
          actualCostQuanta: 1n,
        },
      });
    }
    expect(state.paidJudgePostsUsed).toBe(5);
    expect(plan(state)).toMatchObject({
      status: "NO_REQUEST",
      reason: "ALL_PERSPECTIVES_ATTEMPTED",
    });
    expect(
      buildOpenRouterPartialPanelStatus(state),
    ).toMatchObject({
      status: "PARTIAL",
      decision:
        "INCONCLUSIVE_AI_ONLY_EVALUATION",
      validIndependentJudgeCount: 0,
      paidJudgePostsUsed: 5,
      invalidPaidPerspectiveIds: [
        "judge-01",
        "judge-02",
        "judge-03",
        "judge-04",
        "judge-05",
      ],
    });
  });

  it("fails closed on the USD gate and HTTP 402", () => {
    const initial =
      createOpenRouterPaidJudgeExecutorState({
        existingValidPerspectiveIds: [],
      });
    expect(plan(initial, "9.50000001")).toMatchObject({
      status: "NO_REQUEST",
      reason: "CAP_BLOCKED",
      capReason: "USD_CAP_EXCEEDED",
    });

    const pending = plannedState(initial);
    const stopped =
      settleOpenRouterPaidJudgeRequest({
        state: pending.state,
        settlement: {
          kind: "HTTP_402",
        },
      });
    expect(stopped).toMatchObject({
      paidJudgePostsUsed: 1,
      terminalReason:
        "HTTP_402_INSUFFICIENT_CREDIT",
    });
    expect(plan(stopped)).toMatchObject({
      status: "NO_REQUEST",
      reason: "TERMINAL",
    });
  });

  it("adds every known new settlement to the carried baseline before the next admission", () => {
    let state =
      createOpenRouterPaidJudgeExecutorState({
        existingValidPerspectiveIds: [],
      });
    const first = plannedState(state);
    state = settleOpenRouterPaidJudgeRequest({
      state: first.state,
      settlement: {
        kind: "VALID_PAID",
        actualCostQuanta: 300_000_000n,
      },
    });
    const second = plannedState(state);
    expect(
      second.request.admissionProjectedCostQuanta,
    ).toBe(704_151_000n);
    state = settleOpenRouterPaidJudgeRequest({
      state: second.state,
      settlement: {
        kind: "INVALID_PAID",
        actualCostQuanta: 300_000_000n,
      },
    });

    expect(plan(state)).toMatchObject({
      status: "NO_REQUEST",
      reason: "CAP_BLOCKED",
      capReason: "USD_CAP_EXCEEDED",
    });
    expect(state.knownNewActualCostQuanta).toBe(
      600_000_000n,
    );
  });

  it("reports complete only with five independent valid perspectives", () => {
    const complete =
      createOpenRouterPaidJudgeExecutorState({
        existingValidPerspectiveIds: [
          "judge-01",
          "judge-02",
          "judge-03",
          "judge-04",
          "judge-05",
        ],
      });
    expect(
      buildOpenRouterPartialPanelStatus(complete),
    ).toMatchObject({
      status: "COMPLETE",
      decision: "READY_FOR_PRIVATE_AGGREGATION",
      validIndependentJudgeCount: 5,
      paidJudgePostsUsed: 0,
    });
    expect(plan(complete)).toMatchObject({
      status: "NO_REQUEST",
      reason: "PANEL_ALREADY_COMPLETE",
    });
  });

  it("rejects state tampering that could authorize a paid retry", () => {
    const tampered = {
      ...createOpenRouterPaidJudgeExecutorState({
        existingValidPerspectiveIds: [],
      }),
      attemptedPaidPerspectiveIds: [
        "judge-01",
        "judge-01",
      ],
      paidJudgePostsUsed: 2,
    } as OpenRouterPaidJudgeExecutorState;
    expect(() => plan(tampered)).toThrow(
      /unique known perspectives/u,
    );

    const unsupportedPlainMode = {
      ...createOpenRouterPaidJudgeExecutorState({
        existingValidPerspectiveIds: [],
      }),
      formatMode:
        "PLAIN_JSON_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
    } as OpenRouterPaidJudgeExecutorState;
    expect(() => plan(unsupportedPlainMode)).toThrow(
      /must agree/u,
    );
  });
});
