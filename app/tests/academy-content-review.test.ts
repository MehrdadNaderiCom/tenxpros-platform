import { parseFragment } from "parse5";
import { describe, expect, it } from "vitest";

import editorialLedgerJson from "../prisma/seed/academy/editorial-ledger.phase0.json";
import ownerReviewJson from "../prisma/seed/academy/editorial-owner-review.phase0.json";
import phase0InventoryJson from "../prisma/seed/academy/content-inventory.phase0.json";
import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import {
  analyzeReadability,
  applyEditorialChanges,
  assessSemanticPreservation,
  createVisibleContentRevisionHash,
  reconstructOriginalHtml,
  validateEditorialLedger,
  validateOwnerReviewItems,
  validatePhase0BaselineInventory,
} from "../src/lib/academy/content-review";
import type {
  AcademyLessonForReview,
  EditorialChange,
  OwnerReviewItem,
  Phase0BaselineInventory,
} from "../src/lib/academy/content-review";
import { htmlToPlainText } from "../src/lib/academy/lesson-html";

const SOURCE_LOCATIONS = [
  "prisma/seed/academy/m01-mission.ts",
  "prisma/seed/academy/m02-identity.ts",
  "prisma/seed/academy/m03-rules.ts",
  "prisma/seed/academy/m04-product.ts",
  "prisma/seed/academy/m05-journey.ts",
  "prisma/seed/academy/m06-ranks.ts",
  "prisma/seed/academy/m07-coach.ts",
  "prisma/seed/academy/m08-selling.ts",
  "prisma/seed/academy/m09-prospecting.ts",
  "prisma/seed/academy/m10-conversation.ts",
  "prisma/seed/academy/m11-operations.ts",
  "prisma/seed/academy/m12-mechanics.ts",
  "prisma/seed/academy/m13-motions.ts",
  "prisma/seed/academy/m14-customize.ts",
  "prisma/seed/academy/m15-contact.ts",
  "prisma/seed/academy/m16-alumni.ts",
  "prisma/seed/academy/m17-sharing.ts",
] as const;

const changes = editorialLedgerJson.changes as unknown as EditorialChange[];
const ownerReviewItems =
  ownerReviewJson.items as unknown as OwnerReviewItem[];
const phase0Inventory =
  phase0InventoryJson as unknown as Phase0BaselineInventory;
const lessons: AcademyLessonForReview[] = ACADEMY_MODULES.map(
  (module, index) => ({
    slug: module.slug,
    title: module.title,
    sourceLocation: SOURCE_LOCATIONS[index],
    bodyHtml: module.bodyHtml ?? "",
  }),
);

function changesFor(slug: string): EditorialChange[] {
  return changes.filter((change) => change.lessonSlug === slug);
}

function originalHtml(lesson: AcademyLessonForReview): string {
  return reconstructOriginalHtml(lesson.bodyHtml, changesFor(lesson.slug));
}

interface ParsedNode {
  tagName?: string;
  value?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: ParsedNode[];
}

function structuralTokens(html: string): string[] {
  const root = parseFragment(html) as unknown as ParsedNode;
  const tokens: string[] = [];
  const visit = (node: ParsedNode): void => {
    if (node.tagName) {
      const attributes = (node.attrs ?? [])
        .map(({ name, value }) => `${name}=${value}`)
        .sort()
        .join("|");
      tokens.push(`${node.tagName}[${attributes}]`);
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(root);
  return tokens;
}

function elementTexts(html: string, tagName: string): string[] {
  const root = parseFragment(html) as unknown as ParsedNode;
  const texts: string[] = [];
  const plainText = (node: ParsedNode): string =>
    node.value ??
    (node.childNodes ?? []).map((child) => plainText(child)).join(" ");
  const visit = (node: ParsedNode): void => {
    if (node.tagName === tagName) {
      texts.push(plainText(node).replace(/\s+/g, " ").trim());
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(root);
  return texts;
}

describe("Phase 0 readability analysis", () => {
  it("is deterministic and recognizes avoidable formal wording", () => {
    const source =
      "Prior to commencing the assessment, utilize the checklist. Then explain the result.";
    const first = analyzeReadability(source);

    expect(analyzeReadability(source)).toEqual(first);
    expect(first.words).toBeGreaterThan(0);
    expect(first.sentences).toBe(2);
    expect(first.difficultPhrases).toBeGreaterThanOrEqual(2);
    expect(first.fleschKincaidGrade).toEqual(expect.any(Number));
  });

  it("keeps the full 17-lesson order and validates every applied ledger entry", () => {
    const reviews = validateEditorialLedger(lessons, changes);

    expect(() =>
      validatePhase0BaselineInventory(lessons, changes, phase0Inventory),
    ).not.toThrow();
    expect(reviews).toHaveLength(17);
    expect(reviews.map((review) => review.slug)).toEqual(
      ACADEMY_MODULES.map((module) => module.slug),
    );
    expect(changes).toHaveLength(24);
    expect(new Set(changes.map((change) => change.id)).size).toBe(24);
    expect(changes.every((change) => change.meaningRemoved === false)).toBe(
      true,
    );
    expect(
      changes.every(
        (change) => change.confidence !== "requires owner review",
      ),
    ).toBe(true);
  });

  it("rejects canonical text drift that is not represented in the ledger", () => {
    const driftedLessons = lessons.map((lesson) =>
      lesson.slug === "mission"
        ? {
            ...lesson,
            bodyHtml: lesson.bodyHtml.replace(
              "AI tools are now in everyone's hands.",
              "AI systems are now in everyone's hands.",
            ),
          }
        : lesson,
    );

    expect(() =>
      validatePhase0BaselineInventory(
        driftedLessons,
        changes,
        phase0Inventory,
      ),
    ).toThrow(/mission: reconstructed original hash/);
  });
});

describe("Phase 0 semantic-preservation gates", () => {
  it("reconstructs and reapplies the revision exactly and idempotently", () => {
    for (const lesson of lessons) {
      const original = originalHtml(lesson);
      const lessonChanges = changesFor(lesson.slug);

      expect(applyEditorialChanges(original, lessonChanges)).toBe(
        lesson.bodyHtml,
      );
      expect(reconstructOriginalHtml(lesson.bodyHtml, lessonChanges)).toBe(
        original,
      );
      expect(
        applyEditorialChanges(
          reconstructOriginalHtml(lesson.bodyHtml, lessonChanges),
          lessonChanges,
        ),
      ).toBe(lesson.bodyHtml);
      expect(
        applyEditorialChanges(
          applyEditorialChanges(original, lessonChanges),
          lessonChanges,
        ),
      ).toBe(lesson.bodyHtml);
      expect(
        reconstructOriginalHtml(
          reconstructOriginalHtml(lesson.bodyHtml, lessonChanges),
          lessonChanges,
        ),
      ).toBe(original);
    }
  });

  it("preserves structure, links, numbers, percentages, currency, negation, modals, and protected terms", () => {
    for (const lesson of lessons) {
      const result = assessSemanticPreservation(
        originalHtml(lesson),
        lesson.bodyHtml,
      );

      expect(result.ok, `${lesson.slug}: ${result.warnings.join("; ")}`).toBe(
        true,
      );
      expect(result.warnings).toEqual([]);
      expect(result.revisedStructure).toEqual(result.originalStructure);
      expect(result.wordDifferencePercent).toBeGreaterThanOrEqual(-3);
    }
  });

  it("fails on representative semantic or structural loss mutations", () => {
    const source =
      '<h2>Warning</h2><p>You must not charge $300 before 10% is approved.</p><ul><li>Keep the example.</li></ul><a href="https://example.com">Source</a>';
    const mutations = [
      source.replace("$300", "$30"),
      source.replace("must not", "can"),
      source.replace("<li>Keep the example.</li>", ""),
      source.replace("https://example.com", "https://other.example"),
    ];

    for (const mutation of mutations) {
      expect(assessSemanticPreservation(source, mutation).ok).toBe(false);
    }
  });

  it("preserves the exact element and attribute order plus every list item", () => {
    for (const lesson of lessons) {
      const before = originalHtml(lesson);
      expect(structuralTokens(lesson.bodyHtml), lesson.slug).toEqual(
        structuralTokens(before),
      );
      expect(elementTexts(lesson.bodyHtml, "li"), lesson.slug).toEqual(
        elementTexts(before, "li"),
      );
    }
  });

  it("keeps representative examples, instructions, and methodology names", () => {
    const examples: Readonly<Record<string, readonly string[]>> = {
      journey: ["Amir", "Leila", "David", "fourteen years"],
      conversation: ["objection", "qualified", "prospect"],
      mechanics: ["Strong Draft", "Dossier", "weekly"],
      customize: ["evidence", "governance", "Dossier"],
    };

    for (const [slug, phrases] of Object.entries(examples)) {
      const lesson = lessons.find((candidate) => candidate.slug === slug);
      expect(lesson, slug).toBeDefined();
      const before = htmlToPlainText(originalHtml(lesson!));
      const after = htmlToPlainText(lesson!.bodyHtml);
      for (const phrase of phrases) {
        expect(before.toLocaleLowerCase(), `${slug}/${phrase}/original`).toContain(
          phrase.toLocaleLowerCase(),
        );
        expect(after.toLocaleLowerCase(), `${slug}/${phrase}/revised`).toContain(
          phrase.toLocaleLowerCase(),
        );
      }
    }
  });

  it("does not materially shorten any lesson or the complete Academy", () => {
    const reviews = validateEditorialLedger(lessons, changes);
    const originalWords = reviews.reduce(
      (total, review) => total + review.original.words,
      0,
    );
    const revisedWords = reviews.reduce(
      (total, review) => total + review.revised.words,
      0,
    );
    const originalCharacters = lessons.reduce(
      (total, lesson) =>
        total + htmlToPlainText(originalHtml(lesson)).length,
      0,
    );
    const revisedCharacters = lessons.reduce(
      (total, lesson) => total + htmlToPlainText(lesson.bodyHtml).length,
      0,
    );

    expect(originalWords).toBe(28_787);
    expect(revisedWords).toBe(28_783);
    expect(revisedWords - originalWords).toBe(-4);
    expect(((revisedWords - originalWords) / originalWords) * 100).toBeCloseTo(
      -0.014,
      3,
    );
    expect(originalCharacters).toBe(171_151);
    expect(revisedCharacters).toBe(171_196);
    expect(reviews.every((review) => review.wordDifferencePercent >= -3)).toBe(
      true,
    );
  });

  it("leaves already-clear and high-risk lessons unchanged unless a safe edit was logged", () => {
    const unchanged = [
      "coach",
      "motions",
      "customize",
      "contact-us",
      "alumni-network",
      "experience-sharing",
    ];

    for (const slug of unchanged) {
      const lesson = lessons.find((candidate) => candidate.slug === slug);
      expect(lesson, slug).toBeDefined();
      expect(changesFor(slug)).toEqual([]);
      expect(originalHtml(lesson!)).toBe(lesson!.bodyHtml);
    }
  });

  it("keeps canonical HTML parseable without parser recovery", () => {
    for (const lesson of lessons) {
      const parseErrors: string[] = [];
      parseFragment(lesson.bodyHtml, {
        onParseError(error) {
          parseErrors.push(error.code);
        },
      });
      expect(parseErrors, lesson.slug).toEqual([]);
    }
  });

  it("produces deterministic visible-revision hashes that distinguish a revision", () => {
    const lesson = lessons.find((candidate) => candidate.slug === "mission")!;
    const original = originalHtml(lesson);
    const first = createVisibleContentRevisionHash(original, lesson.bodyHtml);

    expect(createVisibleContentRevisionHash(original, lesson.bodyHtml)).toBe(
      first,
    );
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(createVisibleContentRevisionHash(original, original)).not.toBe(
      first,
    );
  });
});

describe("Phase 0 owner-review safeguards", () => {
  it("records high-risk proposals separately and never applies them", () => {
    expect(ownerReviewItems).toHaveLength(15);
    expect(() =>
      validateOwnerReviewItems(lessons, ownerReviewItems),
    ).not.toThrow();
    expect(
      ownerReviewItems.every(
        (item) => item.status === "requires owner review",
      ),
    ).toBe(true);

    for (const item of ownerReviewItems) {
      const lesson = lessons.find(
        (candidate) => candidate.slug === item.lessonSlug,
      );
      expect(lesson, item.id).toBeDefined();
      expect(
        lesson!.bodyHtml.includes(item.proposedRevision),
        `${item.id} proposal was applied`,
      ).toBe(false);
    }
  });
});
