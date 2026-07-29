import { createHash } from "node:crypto";

import {
  DEFAULT_NARRATION_PAUSE_PROFILE,
  type NarrationBlock,
  type NarrationDocument,
  type NarrationLessonScopedPronunciation,
  type NarrationOverrides,
  type NarrationPauseProfile,
  type NarrationRecipe,
} from "./contracts";
import { NARRATION_ALIGNMENT_POLICY_VERSION } from "./policy";
import { LONG_BLOCK_SEGMENTATION_POLICY_VERSION } from "./segmentation";

export const NARRATION_SCHEMA_VERSION = "1";
export const NARRATION_RENDERER_VERSION = "semantic-html-v2-alignment";
export const NARRATION_NORMALIZATION_VERSION = "english-spoken-v2-alignment";
export const NARRATION_PRONUNCIATION_VERSION =
  "tenxpros-english-v3-owner-approved";
export const NARRATION_PAUSE_VERSION = "natural-pauses-v1";

export const DEFAULT_NARRATION_PRONUNCIATIONS = Object.freeze({
  AI: "A I",
  API: "A P I",
  B2B: "B to B",
  B2C: "B to C",
  CRM: "C R M",
  FAQ: "F A Q",
  FAQs: "F A Qs",
  HR: "H R",
  ROI: "R O I",
  SEO: "S E O",
});

type JsonPrimitive = string | number | boolean | null;
type CanonicalJson =
  | JsonPrimitive
  | readonly CanonicalJson[]
  | { readonly [key: string]: CanonicalJson };

function canonicalize(value: unknown, inArray = false): CanonicalJson | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Narration hashes only support finite numbers.");
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item, true) ?? null);
  }

  if (typeof value === "object") {
    const object = value as Readonly<Record<string, unknown>>;
    const result: Record<string, CanonicalJson> = {};

    for (const key of Object.keys(object).sort()) {
      const normalized = canonicalize(object[key]);
      if (normalized !== undefined) {
        result[key] = normalized;
      }
    }

    return result;
  }

  if (inArray && value === undefined) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  throw new TypeError(
    `Narration hashes do not support values of type ${typeof value}.`,
  );
}

export function stableNarrationStringify(value: unknown): string {
  const normalized = canonicalize(value);
  return JSON.stringify(normalized ?? null);
}

export function stableNarrationHash(
  value: unknown,
  namespace = "value",
): string {
  return createHash("sha256")
    .update(`tenxpros:narration:${namespace}:`)
    .update(stableNarrationStringify(value))
    .digest("hex");
}

function isValidPause(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 10_000
  );
}

export function resolveNarrationPauseProfile(
  override?: Partial<NarrationPauseProfile>,
): NarrationPauseProfile {
  const resolved: NarrationPauseProfile = {
    ...DEFAULT_NARRATION_PAUSE_PROFILE,
  };

  if (!override) {
    return resolved;
  }

  for (const key of Object.keys(resolved) as (keyof NarrationPauseProfile)[]) {
    const value = override[key];
    if (isValidPause(value)) {
      resolved[key] = Math.round(value);
    }
  }

  return resolved;
}

function sortedPronunciations(
  pronunciations?: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const merged = {
    ...DEFAULT_NARRATION_PRONUNCIATIONS,
    ...pronunciations,
  };

  return Object.freeze(
    Object.fromEntries(
      Object.entries(merged)
        .filter(([source, spoken]) => source.trim() && spoken.trim())
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
}

function sortedStringMap(
  values?: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(values ?? {})
        .map(([source, spoken]) => [source.trim(), spoken.trim()] as const)
        .filter(([source, spoken]) => source && spoken)
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
}

function sortedLessonScopedPronunciations(
  values?: Readonly<Record<string, NarrationLessonScopedPronunciation>>,
): Readonly<Record<string, NarrationLessonScopedPronunciation>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(values ?? {})
        .map(
          ([source, rule]) =>
            [
              source.trim(),
              Object.freeze({
                firstOccurrence: rule.firstOccurrence.trim(),
                subsequentOccurrences:
                  rule.subsequentOccurrences.trim(),
              }),
            ] as const,
        )
        .filter(
          ([source, rule]) =>
            source &&
            rule.firstOccurrence &&
            rule.subsequentOccurrences,
        )
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
}

function sortedOrderedListStyles(
  values?: Readonly<Record<string, "step" | "ordinal" | "plain">>,
): Readonly<Record<string, "step" | "ordinal" | "plain">> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(values ?? {}).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  );
}

export interface CreateNarrationRecipeInput {
  contentRevisionHash: string;
  overrides?: NarrationOverrides;
}

export function createNarrationRecipe({
  contentRevisionHash,
  overrides,
}: CreateNarrationRecipeInput): NarrationRecipe {
  const pauseProfile = resolveNarrationPauseProfile(overrides?.pauseProfile);
  const pronunciations = sortedPronunciations(overrides?.pronunciations);
  const lessonScopedPronunciations =
    sortedLessonScopedPronunciations(
      overrides?.lessonScopedPronunciations,
    );
  const approvedUrls = sortedStringMap(overrides?.approvedUrls);
  const approvedEmails = sortedStringMap(overrides?.approvedEmails);
  const orderedListStyles = sortedOrderedListStyles(
    overrides?.orderedListStyles,
  );
  const overridesHash = stableNarrationHash(
    {
      revision: overrides?.revision ?? "",
      pauseProfile: overrides?.pauseProfile ?? {},
      pronunciations: overrides?.pronunciations ?? {},
      lessonScopedPronunciations:
        overrides?.lessonScopedPronunciations ?? {},
      approvedUrls: overrides?.approvedUrls ?? {},
      approvedEmails: overrides?.approvedEmails ?? {},
      orderedListStyles: overrides?.orderedListStyles ?? {},
      ownerApproval: overrides?.ownerApproval ?? null,
      blocks: overrides?.blocks ?? {},
    },
    "overrides-v1",
  );

  const ownerApprovalReference =
    overrides?.ownerApproval?.approved === true
      ? overrides.ownerApproval.reference.trim()
      : "";

  return Object.freeze({
    versions: Object.freeze({
      schema: NARRATION_SCHEMA_VERSION,
      renderer: NARRATION_RENDERER_VERSION,
      contentRevision: contentRevisionHash,
      normalization: NARRATION_NORMALIZATION_VERSION,
      pronunciation: NARRATION_PRONUNCIATION_VERSION,
      pause: NARRATION_PAUSE_VERSION,
      alignmentPolicy: NARRATION_ALIGNMENT_POLICY_VERSION,
      segmentation: LONG_BLOCK_SEGMENTATION_POLICY_VERSION,
    }),
    pauseProfile: Object.freeze({ ...pauseProfile }),
    pronunciations,
    lessonScopedPronunciations,
    approvedUrls,
    approvedEmails,
    orderedListStyles,
    overrideRevision: overrides?.revision ?? "",
    ownerApprovalReference,
    overridesHash,
  });
}

export function hashNarrationSource(input: {
  slug: string;
  title?: string;
  html: string;
}): string {
  return stableNarrationHash(input, "source-v1");
}

export function hashNarrationBlocks(
  blocks: readonly NarrationBlock[],
): string {
  return stableNarrationHash(blocks, "blocks-v1");
}

export function hashNarrationRecipe(recipe: NarrationRecipe): string {
  return stableNarrationHash(recipe, "recipe-v1");
}

export function hashNarrationDocument(
  document: Omit<NarrationDocument, "hashes"> & {
    hashes?: Omit<NarrationDocument["hashes"], "document">;
  },
): string {
  return stableNarrationHash(
    {
      schemaVersion: document.schemaVersion,
      slug: document.slug,
      title: document.title,
      blocks: document.blocks,
      warnings: document.warnings,
      recipe: document.recipe,
      stats: document.stats,
      hashes: document.hashes,
    },
    "document-v1",
  );
}
