export const NARRATION_ALIGNMENT_POLICY_VERSION =
  "visible-spoken-alignment-v2-owner-approved";

/**
 * Automatic transformations are deliberately closed rather than extensible.
 * Anything outside this list must remain identical, carry an explicit
 * narration override, or be reported for owner review.
 */
export const AUTOMATIC_NARRATION_TRANSFORMATION_ALLOWLIST = Object.freeze([
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
] as const);

export type AutomaticNarrationTransformation =
  (typeof AUTOMATIC_NARRATION_TRANSFORMATION_ALLOWLIST)[number];

export type NarrationOrderedListStyle = "step" | "ordinal" | "plain";

/**
 * `Step` is permitted only for lists whose visible context explicitly defines
 * a sequential process. The key is canonical lesson slug + semantic list path.
 */
export const SEQUENTIAL_ORDERED_LIST_ALLOWLIST: Readonly<
  Record<string, readonly string[]>
> = Object.freeze({
  mission: Object.freeze(["root/ol[1]"]),
  customize: Object.freeze(["root/ol[1]"]),
  "experience-sharing": Object.freeze(["root/ol[1]"]),
});

export function resolveOrderedListStyle(
  slug: string,
  listPath: string,
  overrides?: Readonly<Record<string, NarrationOrderedListStyle>>,
): NarrationOrderedListStyle {
  const explicit = overrides?.[listPath];
  if (explicit) return explicit;
  return SEQUENTIAL_ORDERED_LIST_ALLOWLIST[slug]?.includes(listPath)
    ? "step"
    : "ordinal";
}

export interface PronunciationOwnerReviewItem {
  id: string;
  visible: string;
  kind: "term" | "url";
  recommendedOptions: readonly string[];
  matching: RegExp;
}

/**
 * These high-impact choices are intentionally not part of the automatic
 * dictionary. Each remains an owner-review item unless the rendered recipe
 * carries both an exact approved mapping and an approval reference.
 */
export const PRONUNCIATION_OWNER_REVIEW_ITEMS: readonly PronunciationOwnerReviewItem[] =
  Object.freeze([
    {
      id: "PRON-SMS",
      visible: "SMS",
      kind: "term",
      recommendedOptions: Object.freeze(["S M S", "text message"]),
      matching: /\bSMS\b/u,
    },
    {
      id: "PRON-SME",
      visible: "SME",
      kind: "term",
      recommendedOptions: Object.freeze([
        "S M E",
        "small and medium-sized enterprise",
      ]),
      matching: /\bSME\b/u,
    },
    {
      id: "PRON-CEO",
      visible: "CEO",
      kind: "term",
      recommendedOptions: Object.freeze(["C E O", "chief executive officer"]),
      matching: /\bCEO\b/u,
    },
    {
      id: "PRON-TENXPROS",
      visible: "TenXPros",
      kind: "term",
      recommendedOptions: Object.freeze(["Ten X Pros", "Ten Ex Pros"]),
      matching: /\bTenXPros\b/u,
    },
    {
      id: "PRON-TENXPRO",
      visible: "TenXPro",
      kind: "term",
      recommendedOptions: Object.freeze(["Ten X Pro", "Ten Ex Pro"]),
      matching: /\bTenXPro\b/u,
    },
    {
      id: "PRON-TENX",
      visible: "TenX",
      kind: "term",
      recommendedOptions: Object.freeze(["Ten X", "Ten Ex"]),
      matching: /\bTenX\b/u,
    },
    {
      id: "PRON-PRICING-URL",
      visible: "tenxpros.com/pricing",
      kind: "url",
      recommendedOptions: Object.freeze([
        "ten x pros dot com slash pricing",
        "the Ten X Pros pricing page",
      ]),
      matching: /(?:https?:\/\/)?(?:www\.)?tenxpros\.com\/pricing\b/iu,
    },
    {
      id: "PRON-MEHRDAD-URL",
      visible: "mehrdadnaderi.com",
      kind: "url",
      recommendedOptions: Object.freeze([
        "mehrdad naderi dot com",
        "Mehrdad Naderi's website",
      ]),
      matching: /(?:https?:\/\/)?(?:www\.)?mehrdadnaderi\.com\b/iu,
    },
    {
      id: "PRON-LINKEDIN-URL",
      visible: "linkedin.com/in/mehrdad-naderi",
      kind: "url",
      recommendedOptions: Object.freeze([
        "linkedin dot com slash in slash mehrdad naderi",
        "Mehrdad Naderi's LinkedIn profile",
      ]),
      matching:
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/mehrdad-naderi\/?/iu,
    },
    {
      id: "PRON-TENXOPS-URL",
      visible: "tenxops.org",
      kind: "url",
      recommendedOptions: Object.freeze([
        "ten x ops dot org",
        "the Ten X Ops website",
      ]),
      matching: /(?:https?:\/\/)?(?:www\.)?tenxops\.org\b/iu,
    },
  ]);

export function ownerReviewPronunciationsIn(
  visibleText: string,
): readonly PronunciationOwnerReviewItem[] {
  return PRONUNCIATION_OWNER_REVIEW_ITEMS.filter((item) =>
    item.matching.test(visibleText),
  );
}

export interface PronunciationOwnerReviewOccurrence {
  item: PronunciationOwnerReviewItem;
  matchedText: string;
  startOffset: number;
  endOffset: number;
}

export function ownerReviewPronunciationOccurrencesIn(
  visibleText: string,
): readonly PronunciationOwnerReviewOccurrence[] {
  return PRONUNCIATION_OWNER_REVIEW_ITEMS.flatMap((item) => {
    const flags = [...new Set(`${item.matching.flags}g`)].join("");
    const pattern = new RegExp(item.matching.source, flags);
    return [...visibleText.matchAll(pattern)].map((match) => ({
      item,
      matchedText: match[0],
      startOffset: match.index,
      endOffset: match.index + match[0].length,
    }));
  }).sort(
    (left, right) =>
      left.startOffset - right.startOffset ||
      left.item.id.localeCompare(right.item.id),
  );
}
