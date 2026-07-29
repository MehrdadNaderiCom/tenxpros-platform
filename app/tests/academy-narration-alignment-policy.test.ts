import { afterEach, describe, expect, it, vi } from "vitest";

import { m01 } from "../prisma/seed/academy/m01-mission";
import { sanitizeLessonHtml } from "../src/lib/academy/lesson-html";
import { auditNarrationDocumentAlignment } from "../src/lib/academy/narration/alignment";
import {
  ACADEMY_PRONUNCIATION_FREEZE_REVISION,
  ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
  FROZEN_ACADEMY_NARRATION_OVERRIDES,
} from "../src/lib/academy/narration/approved-pronunciations";
import type {
  NarrationDocument,
  NarrationFormFieldBlock,
  NarrationListItemBlock,
  NarrationTableRowBlock,
} from "../src/lib/academy/narration/contracts";
import { normalizeSpokenText } from "../src/lib/academy/narration/normalization";
import {
  AUTOMATIC_NARRATION_TRANSFORMATION_ALLOWLIST,
  NARRATION_ALIGNMENT_POLICY_VERSION,
  ownerReviewPronunciationsIn,
  resolveOrderedListStyle,
} from "../src/lib/academy/narration/policy";
import { narrationBlockToSpokenText } from "../src/lib/academy/narration/preview";
import { DEFAULT_NARRATION_PRONUNCIATIONS } from "../src/lib/academy/narration/recipe";
import { renderNarrationDocument } from "../src/lib/academy/narration/semantic-renderer";

function render(
  html: string,
  {
    slug = "alignment-policy-fixture",
    overrides,
  }: {
    slug?: string;
    overrides?: Parameters<typeof renderNarrationDocument>[0]["overrides"];
  } = {},
): NarrationDocument {
  return renderNarrationDocument({
    slug,
    title: "Alignment policy fixture",
    html,
    contentRevisionHash: "alignment-policy-fixture-v1",
    overrides,
  });
}

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("closed narration-alignment policy", () => {
  it("publishes the complete automatic-transformation allowlist", () => {
    expect(NARRATION_ALIGNMENT_POLICY_VERSION).toBe(
      "visible-spoken-alignment-v2-owner-approved",
    );
    expect([...AUTOMATIC_NARRATION_TRANSFORMATION_ALLOWLIST]).toEqual([
      "pronunciation normalization",
      "number and symbol expansion",
      "punctuation normalization",
      "sentence-boundary insertion",
      "semantic table narration",
      "form-label separation",
      "exact duplicate-label suppression",
      "approved URL and email pronunciation",
      "decorative-element omission",
      "pause metadata",
    ]);
  });

  it("keeps owner-review terms out of the automatic pronunciation dictionary", () => {
    for (const term of [
      "TenX",
      "TenXPro",
      "TenXPros",
      "SMS",
      "SME",
      "CEO",
    ]) {
      expect(
        Object.prototype.hasOwnProperty.call(
          DEFAULT_NARRATION_PRONUNCIATIONS,
          term,
        ),
        term,
      ).toBe(false);
    }
  });

  it("publishes the exact immutable owner-approved pronunciation profile", () => {
    expect(FROZEN_ACADEMY_NARRATION_OVERRIDES).toMatchObject({
      revision: ACADEMY_PRONUNCIATION_FREEZE_REVISION,
      ownerApproval: {
        approved: true,
        reference:
          ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
      },
      pronunciations: {
        SMS: "S M S",
        CEO: "C E O",
        TenX: "Ten X",
        TenXPro: "Ten X Pro",
        TenXPros: "Ten X Pros",
      },
      lessonScopedPronunciations: {
        SME: {
          firstOccurrence:
            "small and medium-sized enterprise",
          subsequentOccurrences: "S M E",
        },
      },
      approvedUrls: {
        "https://tenxpros.com/pricing":
          "the Ten X Pros pricing page",
        "mehrdadnaderi.com": "mehrdadnaderi dot com",
        "linkedin.com/in/mehrdad-naderi":
          "Mehrdad Naderi's LinkedIn profile",
        "tenxops.org": "the Ten X Ops website",
      },
      approvedEmails: {
        "mail@mehrdadnaderi.com":
          "mail at mehrdadnaderi dot com",
      },
    });
    expect(Object.isFrozen(FROZEN_ACADEMY_NARRATION_OVERRIDES)).toBe(
      true,
    );
    expect(
      Object.isFrozen(
        FROZEN_ACADEMY_NARRATION_OVERRIDES
          .lessonScopedPronunciations.SME,
      ),
    ).toBe(true);
  });

  it("finds every unresolved owner-review pronunciation without conflating brand variants", () => {
    const visible =
      "TenX, TenXPro, TenXPros, SMS, SME, CEO, tenxpros.com/pricing, " +
      "mehrdadnaderi.com, linkedin.com/in/mehrdad-naderi, and tenxops.org.";

    expect(ownerReviewPronunciationsIn(visible).map((item) => item.id)).toEqual([
      "PRON-SMS",
      "PRON-SME",
      "PRON-CEO",
      "PRON-TENXPROS",
      "PRON-TENXPRO",
      "PRON-TENX",
      "PRON-PRICING-URL",
      "PRON-MEHRDAD-URL",
      "PRON-LINKEDIN-URL",
      "PRON-TENXOPS-URL",
    ]);
  });

  it("defaults ordered lists to ordinals and grants Step only by exact path", () => {
    expect(resolveOrderedListStyle("reference", "root/ol[1]")).toBe("ordinal");
    expect(resolveOrderedListStyle("mission", "root/ol[1]")).toBe("step");
    expect(resolveOrderedListStyle("mission", "root/ol[2]")).toBe("ordinal");
    expect(
      resolveOrderedListStyle("mission", "root/ol[1]", {
        "root/ol[1]": "plain",
      }),
    ).toBe("plain");
  });
});

describe("visible-to-spoken normalization boundaries", () => {
  it("leaves owner-review brand names and abbreviations verbatim", () => {
    const visible = "TenX, TenXPro, TenXPros, SMS, SME, and CEO.";

    expect(
      normalizeSpokenText(visible, {
        pronunciations: DEFAULT_NARRATION_PRONUNCIATIONS,
      }),
    ).toBe(visible);
  });

  it("leaves unapproved URLs and email addresses byte-for-byte intact", () => {
    const visible =
      "Visit https://tenxpros.com/pricing or email mail@mehrdadnaderi.com.";

    expect(normalizeSpokenText(visible)).toBe(visible);
  });

  it("applies only exact, explicitly approved URL and email mappings", () => {
    const visible =
      "Visit https://tenxpros.com/pricing or email mail@mehrdadnaderi.com.";
    const approved = normalizeSpokenText(visible, {
      approvedUrls: {
        "https://tenxpros.com/pricing": "the TenXPros pricing page",
      },
      approvedEmails: {
        "mail@mehrdadnaderi.com": "the academy inbox",
      },
    });

    expect(approved).toBe(
      "Visit the TenXPros pricing page or email the academy inbox.",
    );
    expect(
      normalizeSpokenText("Visit https://tenxpros.com/pricing/team.", {
        approvedUrls: {
          "https://tenxpros.com/pricing": "the TenXPros pricing page",
        },
      }),
    ).toBe("Visit https://tenxpros.com/pricing/team.");
  });

  it("does not apply an approved domain to a longer or lookalike host", () => {
    const options = {
      approvedUrls:
        FROZEN_ACADEMY_NARRATION_OVERRIDES.approvedUrls,
    };

    expect(
      normalizeSpokenText("Visit mehrdadnaderi.com.evil.", options),
    ).toBe("Visit mehrdadnaderi.com.evil.");
    expect(
      normalizeSpokenText("Visit blog.mehrdadnaderi.com.", options),
    ).toBe("Visit blog.mehrdadnaderi.com.");
  });

  it("does not append punctuation outside a closing quote after a question", () => {
    expect(normalizeSpokenText('Read "Can you approve this?"')).toBe(
      'Read "Can you approve this?"',
    );
  });

  it("preserves person, pronouns, modality, negation, conditions, and obligations while expanding numbers", () => {
    const visible =
      "If they approve it, you may receive 10%, but the partner must not " +
      "claim $1,200 before approval.";

    expect(normalizeSpokenText(visible)).toBe(
      "If they approve it, you may receive ten percent, but the partner " +
        "must not claim one thousand two hundred dollars before approval.",
    );
  });
});

describe("semantic renderer alignment", () => {
  it("applies first and subsequent SME forms in semantic playback order and resets per lesson", () => {
    const input = {
      slug: "scoped-sme-fixture",
      title: "Scoped pronunciation fixture",
      html:
        "<p>SME leaders support another SME.</p>" +
        "<p>The next SME follows.</p>",
      contentRevisionHash: "scoped-sme-fixture-v1",
      overrides: FROZEN_ACADEMY_NARRATION_OVERRIDES,
    } as const;

    const first = renderNarrationDocument(input);
    const second = renderNarrationDocument(input);
    const paragraphs = first.blocks.filter(
      (block) => block.type === "paragraph",
    );

    expect(paragraphs.map((block) => block.spokenText)).toEqual([
      "small and medium-sized enterprise leaders support another S M E.",
      "The next S M E follows.",
    ]);
    expect(second).toEqual(first);
    expect(second.hashes.document).toBe(first.hashes.document);
    expect(first.recipe).toMatchObject({
      overrideRevision: ACADEMY_PRONUNCIATION_FREEZE_REVISION,
      ownerApprovalReference:
        ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
      lessonScopedPronunciations: {
        SME: {
          firstOccurrence:
            "small and medium-sized enterprise",
          subsequentOccurrences: "S M E",
        },
      },
      versions: {
        pronunciation: "tenxpros-english-v3-owner-approved",
        alignmentPolicy:
          "visible-spoken-alignment-v2-owner-approved",
      },
    });
    expect(
      auditNarrationDocumentAlignment(first).summary
        .blocksByClassification,
    ).toMatchObject({
      REQUIRES_OWNER_REVIEW: 0,
      INVALID_SEMANTIC_DRIFT: 0,
    });
  });

  it("does not count a suppressed duplicate form label as the first meaningful SME occurrence", () => {
    const document = render(
      `
        <div class="form-preview">
          <div class="form-preview-label">SME</div>
          <p>SME guidance belongs here.</p>
        </div>
        <p>Another SME follows.</p>
      `,
      { overrides: FROZEN_ACADEMY_NARRATION_OVERRIDES },
    );
    const field = document.blocks.find(
      (block): block is NarrationFormFieldBlock =>
        block.type === "formField",
    );
    const paragraph = document.blocks.find(
      (block) =>
        block.type === "paragraph" &&
        block.visibleText.includes("Another SME"),
    );

    expect(field?.suppressDuplicateLabelInSpeech).toBe(true);
    expect(field?.spokenLabel).toBe("SME");
    expect(field?.spokenDescription).toBe(
      "small and medium-sized enterprise guidance belongs here.",
    );
    expect(
      paragraph?.type === "paragraph"
        ? paragraph.spokenText
        : undefined,
    ).toBe("Another S M E follows.");
    expect(
      auditNarrationDocumentAlignment(document).summary
        .blocksByClassification,
    ).toMatchObject({
      REQUIRES_OWNER_REVIEW: 0,
      INVALID_SEMANTIC_DRIFT: 0,
    });
  });

  it("keeps overlapping brands exact and applies every approved network mapping", () => {
    const document = render(
      `
        <p>TenX, TenXPro, and TenXPros use SMS with the CEO.</p>
        <p>Visit https://tenxpros.com/pricing, mehrdadnaderi.com,
        linkedin.com/in/mehrdad-naderi, and tenxops.org.
        Email mail@mehrdadnaderi.com.</p>
      `,
      { overrides: FROZEN_ACADEMY_NARRATION_OVERRIDES },
    );
    const script = document.blocks
      .filter((block) => block.type === "paragraph")
      .map((block) => block.spokenText)
      .join(" ");

    expect(script).toContain(
      "Ten X, Ten X Pro, and Ten X Pros use S M S with the C E O.",
    );
    expect(script).toContain("the Ten X Pros pricing page");
    expect(script).toContain("mehrdadnaderi dot com");
    expect(script).toContain(
      "Mehrdad Naderi's LinkedIn profile",
    );
    expect(script).toContain("the Ten X Ops website");
    expect(script).toContain(
      "mail at mehrdadnaderi dot com",
    );
    expect(
      document.warnings.some(
        (warning) =>
          warning.code ===
            "PRONUNCIATION_REQUIRES_OWNER_REVIEW" ||
          warning.code === "UNNATURAL_URL",
      ),
    ).toBe(false);
  });

  it("changes only narration and recipe hashes when the frozen profile is applied", () => {
    const input = {
      slug: "visible-preservation-fixture",
      title: "Visible preservation fixture",
      html: "<p>TenXPros supports an SME.</p>",
      contentRevisionHash: "visible-preservation-fixture-v1",
    } as const;
    const baseline = renderNarrationDocument(input);
    const frozen = renderNarrationDocument({
      ...input,
      overrides: FROZEN_ACADEMY_NARRATION_OVERRIDES,
    });

    expect(frozen.hashes.source).toBe(baseline.hashes.source);
    expect(
      frozen.blocks.map((block) =>
        block.type === "tableRow"
          ? block.cells.map((cell) => [
              cell.visibleLabel,
              cell.visibleValue,
            ])
          : block.type === "formField"
            ? [block.visibleLabel, block.visibleDescription]
            : block.type === "sectionBreak"
              ? null
              : block.visibleText,
      ),
    ).toEqual(
      baseline.blocks.map((block) =>
        block.type === "tableRow"
          ? block.cells.map((cell) => [
              cell.visibleLabel,
              cell.visibleValue,
            ])
          : block.type === "formField"
            ? [block.visibleLabel, block.visibleDescription]
            : block.type === "sectionBreak"
              ? null
              : block.visibleText,
      ),
    );
    expect(frozen.hashes.recipe).not.toBe(
      baseline.hashes.recipe,
    );
    expect(frozen.hashes.blocks).not.toBe(
      baseline.hashes.blocks,
    );
  });

  it("uses ordinal markers, never Step, for a generic ordered list", () => {
    const document = render(`
      <h2>Reference items</h2>
      <ol>
        <li>Review the file.</li>
        <li>Approve the result.</li>
      </ol>
    `);
    const items = document.blocks.filter(
      (block): block is NarrationListItemBlock => block.type === "listItem",
    );

    expect(items.map((item) => item.markerStyle)).toEqual([
      "ordinal",
      "ordinal",
    ]);
    expect(items.map((item) => item.spokenText)).toEqual([
      "First: Review the file.",
      "Second: Approve the result.",
    ]);
    expect(items.every((item) => !/\bStep\b/u.test(item.spokenText))).toBe(
      true,
    );
  });

  it("uses Step for the real Mission list on its allowlisted semantic path", () => {
    const mission = renderNarrationDocument({
      slug: m01.slug,
      title: m01.title,
      html: sanitizeLessonHtml(m01.bodyHtml ?? ""),
      contentRevisionHash: "mission-alignment-policy-test-v1",
    });
    const items = mission.blocks.filter(
      (block): block is NarrationListItemBlock =>
        block.type === "listItem" &&
        block.source?.path.startsWith("root/ol[1]/li[") === true,
    );

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.markerStyle)).toEqual([
      "step",
      "step",
      "step",
    ]);
    expect(items.map((item) => item.spokenText)).toEqual([
      expect.stringMatching(/^Step one:/u),
      expect.stringMatching(/^Step two:/u),
      expect.stringMatching(/^Step three:/u),
    ]);
  });

  it("keeps every table label faithful while normalizing only cell values", () => {
    const document = render(`
      <table>
        <thead>
          <tr>
            <th>What they produce</th>
            <th>Who approves</th>
            <th>Eligibility</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>10%</td>
            <td>The partner</td>
            <td>They may not qualify before approval</td>
          </tr>
        </tbody>
      </table>
    `);
    const row = document.blocks.find(
      (block): block is NarrationTableRowBlock => block.type === "tableRow",
    );

    expect(row).toBeDefined();
    expect(
      row?.cells.map((cell) => [cell.visibleLabel, cell.spokenLabel]),
    ).toEqual([
      ["What they produce", "What they produce"],
      ["Who approves", "Who approves"],
      ["Eligibility", "Eligibility"],
    ]);
    expect(row?.cells.map((cell) => cell.spokenValue)).toEqual([
      "ten percent.",
      "The partner.",
      "They may not qualify before approval.",
    ]);
  });

  it("suppresses an exact duplicate form label without rewriting its sentence", () => {
    const visibleDescription =
      "The application screen, where the prospect describes the problem.";
    const document = render(`
      <div class="form-preview">
        <div class="form-preview-label">The application screen</div>
        <p>${visibleDescription}</p>
      </div>
    `);
    const field = document.blocks.find(
      (block): block is NarrationFormFieldBlock => block.type === "formField",
    );

    expect(field).toBeDefined();
    expect(field?.visibleDescription).toBe(visibleDescription);
    expect(field?.spokenDescription).toBe(visibleDescription);
    expect(field?.suppressDuplicateLabelInSpeech).toBe(true);

    const spoken = narrationBlockToSpokenText(field!);
    expect(spoken).toBe(visibleDescription);
    expect(countOccurrences(spoken, "The application screen")).toBe(1);
    expect(spoken).not.toContain("screen. Where");
  });

  it("is deterministic and performs no network or TTS request", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const input = {
      slug: "deterministic-alignment-fixture",
      title: "Deterministic alignment fixture",
      html:
        "<p>TenXPros may receive 10% after approval. " +
        "Visit https://tenxpros.com/pricing.</p>",
      contentRevisionHash: "deterministic-alignment-fixture-v1",
      overrides: {
        approvedUrls: {
          "https://tenxpros.com/pricing": "the approved pricing page",
        },
      },
    } as const;

    const first = renderNarrationDocument(input);
    const second = renderNarrationDocument(input);

    expect(second).toEqual(first);
    expect(second.hashes.document).toBe(first.hashes.document);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("alignment detector handoff", () => {
  it("warns on and rejects an unapproved modality override", () => {
    const document = renderNarrationDocument({
      slug: "alignment-override-fixture",
      html: "<p>They may receive 10% only after approval.</p>",
      overrides: {
        blocks: {
          "root/p[1]": {
            spokenText: "You will receive 12% before approval.",
          },
        },
      },
    });

    expect(document.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "NARRATION_ALIGNMENT_INVALID_SEMANTIC_DRIFT",
          severity: "error",
        }),
      ]),
    );
    expect(narrationBlockToSpokenText(document.blocks[0]!)).toBe(
      "They may receive ten percent only after approval.",
    );
    expect(
      auditNarrationDocumentAlignment(document).summary
        .protectedFeatureDriftCount,
    ).toBe(0);
  });
});
