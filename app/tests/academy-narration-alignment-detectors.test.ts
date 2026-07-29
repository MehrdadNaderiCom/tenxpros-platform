import { describe, expect, it } from "vitest";

import {
  auditNarrationBlockAlignment,
  auditNarrationFieldAlignment,
  detectProtectedNarrationDrift,
} from "../src/lib/academy/narration/alignment";
import type {
  NarrationFormFieldBlock,
  NarrationListItemBlock,
} from "../src/lib/academy/narration/contracts";

function audit(expected: string, actual: string) {
  return auditNarrationFieldAlignment({
    blockId: "fixture",
    blockType: "paragraph",
    field: "text",
    visibleText: expected,
    expectedSpokenText: expected,
    spokenText: actual,
  });
}

describe("narration alignment protected-feature detectors", () => {
  it("invalidates person, modality, negation, quantity, and temporal drift", () => {
    const result = audit(
      "They may not receive 10% before approval.",
      "You will receive 12% after approval.",
    );
    const features = result.protectedFeatureDrifts.map(
      (drift) => drift.feature,
    );

    expect(result.classification).toBe("INVALID_SEMANTIC_DRIFT");
    expect(features).toEqual(
      expect.arrayContaining([
        "PRONOUNS_AND_RESPONSIBLE_ACTORS",
        "MODALITY",
        "NEGATION",
        "NUMBERS_PERCENT_CURRENCY",
        "CONDITIONS_AND_TEMPORAL_ORDER",
      ]),
    );
  });

  it.each([
    ["You get more support.", "You get less support.", "COMPARATIVES"],
    [
      "Partners should submit it.",
      "Partners must submit it.",
      "OBLIGATION_AND_PERMISSION",
    ],
    ["They are eligible.", "They are ineligible.", "ELIGIBILITY"],
    ["They pass the assessment.", "They fail the assessment.", "ASSESSMENT"],
    ["The commission is paid.", "The bonus is paid.", "COMMISSION"],
    ["The policy is approved.", "The guideline is approved.", "GOVERNANCE"],
  ])("invalidates %s -> %s as %s drift", (expected, actual, feature) => {
    const result = audit(expected, actual);

    expect(result.classification).toBe("INVALID_SEMANTIC_DRIFT");
    expect(result.protectedFeatureDrifts.map((drift) => drift.feature)).toContain(
      feature,
    );
  });

  it("detects auxiliary and regular-verb tense changes", () => {
    const drifts = detectProtectedNarrationDrift(
      "The company is ready, has authority, and approves payment.",
      "The company was ready, had authority, and approved payment.",
    );

    expect(drifts.map((drift) => drift.feature)).toContain("TENSE");
  });

  it("does not read the I in spelled AI as a first-person pronoun", () => {
    const drifts = detectProtectedNarrationDrift(
      "AI supports the partner.",
      "A I supports the partner.",
    );

    expect(
      drifts.some(
        (drift) =>
          drift.feature === "PRONOUNS_AND_RESPONSIBLE_ACTORS",
      ),
    ).toBe(false);
  });

  it("uses whole words, so payment never creates a may modal", () => {
    const drifts = detectProtectedNarrationDrift(
      "Payment is available.",
      "Payment was available.",
    );

    expect(drifts.some((drift) => drift.feature === "MODALITY")).toBe(false);
    expect(drifts.some((drift) => drift.feature === "TENSE")).toBe(true);
  });
});

describe("narration alignment classification and structural policy", () => {
  it("routes non-protected lexical differences to owner review", () => {
    expect(audit("The explanation is clear.", "The explanation is concise."))
      .toMatchObject({
        classification: "REQUIRES_OWNER_REVIEW",
        changeKind: "RESIDUAL_LEXICAL_DIFFERENCE",
      });
  });

  it("counts every unresolved owner-pronunciation occurrence", () => {
    const result = auditNarrationFieldAlignment({
      blockId: "fixture",
      blockType: "paragraph",
      field: "text",
      visibleText: "TenXPros and TenXPros",
      spokenText: "TenXPros and TenXPros.",
    });

    expect(result.classification).toBe("REQUIRES_OWNER_REVIEW");
    expect(result.pendingOwnerReviewItemIds).toEqual(["PRON-TENXPROS"]);
    expect(result.pendingOwnerReviewOccurrenceCount).toBe(2);
  });

  it("accepts a mapped pronunciation only with an owner reference", () => {
    const result = auditNarrationFieldAlignment({
      blockId: "fixture",
      blockType: "paragraph",
      field: "text",
      visibleText: "SMS",
      spokenText: "S M S.",
      context: {
        pronunciations: { SMS: "S M S" },
        ownerApprovalReference: "COPY-123",
      },
    });

    expect(result.classification).toBe("ALLOWED_SPEECH_TRANSFORMATION");
    expect(result.pendingOwnerReviewOccurrenceCount).toBe(0);
  });

  it("permits Step only on an explicitly sequential list", () => {
    const allowed: NarrationListItemBlock = {
      type: "listItem",
      id: "root/ol[1]/li[1]",
      source: { path: "root/ol[1]/li[1]" },
      visibleText: "Review the account",
      spokenText: "Step one: Review the account.",
      index: 1,
      markerStyle: "step",
      pauseAfterMs: 280,
    };
    const invalid: NarrationListItemBlock = {
      ...allowed,
      id: "root/ol[2]/li[1]",
      source: { path: "root/ol[2]/li[1]" },
    };

    expect(
      auditNarrationBlockAlignment(allowed, { slug: "mission" })
        .classification,
    ).toBe("ALLOWED_SPEECH_TRANSFORMATION");
    expect(
      auditNarrationBlockAlignment(invalid, { slug: "mission" })
        .classification,
    ).toBe("INVALID_SEMANTIC_DRIFT");
  });

  it("invalidates duplicate-label suppression unless the label is exact", () => {
    const block: NarrationFormFieldBlock = {
      type: "formField",
      id: "root/div[1]",
      visibleLabel: "Company",
      spokenLabel: "Company",
      visibleDescription: "Describe the account.",
      spokenDescription: "Describe the account.",
      suppressDuplicateLabelInSpeech: true,
      pauseAfterMs: 500,
    };

    expect(auditNarrationBlockAlignment(block).classification).toBe(
      "INVALID_SEMANTIC_DRIFT",
    );
  });
});
