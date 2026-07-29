import type {
  NarrationBlock,
  NarrationLessonScopedPronunciation,
} from "./contracts";

export type NarrationLessonScopedPronunciations = Readonly<
  Record<string, NarrationLessonScopedPronunciation>
>;

export interface NarrationScopedPronunciationState {
  readonly occurrenceCounts: Map<string, number>;
}

export function createNarrationScopedPronunciationState(): NarrationScopedPronunciationState {
  return { occurrenceCounts: new Map<string, number>() };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pronunciationBoundaryPattern(source: string): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(source)}(?![\\p{L}\\p{N}])`,
    "giu",
  );
}

/**
 * Applies a scoped rule exactly once while advancing explicit caller-owned
 * state. The function does not retain module-global state, so separate lesson
 * renders and repeated audits are byte-for-byte deterministic.
 */
export function applyLessonScopedPronunciationsToText(
  value: string,
  pronunciations: NarrationLessonScopedPronunciations | undefined,
  state: NarrationScopedPronunciationState,
): string {
  let spoken = value;
  const entries = Object.entries(pronunciations ?? {})
    .map(([source, rule]) => [source.trim(), rule] as const)
    .filter(
      ([source, rule]) =>
        source &&
        rule.firstOccurrence.trim() &&
        rule.subsequentOccurrences.trim(),
    )
    .sort(
      ([left], [right]) =>
        right.length - left.length || left.localeCompare(right),
    );

  for (const [source, rule] of entries) {
    spoken = spoken.replace(
      pronunciationBoundaryPattern(source),
      () => {
        const count = state.occurrenceCounts.get(source) ?? 0;
        state.occurrenceCounts.set(source, count + 1);
        return count === 0
          ? rule.firstOccurrence
          : rule.subsequentOccurrences;
      },
    );
  }

  return spoken;
}

/**
 * Walks the same fields and order used by narration playback. A duplicate form
 * label that is explicitly suppressed is not a meaningful spoken occurrence.
 */
export function applyLessonScopedPronunciationsToBlocks(
  blocks: readonly NarrationBlock[],
  pronunciations: NarrationLessonScopedPronunciations | undefined,
): NarrationBlock[] {
  if (!Object.keys(pronunciations ?? {}).length) {
    return [...blocks];
  }

  const state = createNarrationScopedPronunciationState();
  return blocks.map((block): NarrationBlock => {
    switch (block.type) {
      case "heading":
      case "paragraph":
      case "listItem":
      case "callout":
        return {
          ...block,
          spokenText: applyLessonScopedPronunciationsToText(
            block.spokenText,
            pronunciations,
            state,
          ),
        };
      case "tableRow":
        return {
          ...block,
          cells: block.cells.map((cell) => ({
            ...cell,
            spokenLabel: applyLessonScopedPronunciationsToText(
              cell.spokenLabel,
              pronunciations,
              state,
            ),
            spokenValue: applyLessonScopedPronunciationsToText(
              cell.spokenValue,
              pronunciations,
              state,
            ),
          })),
        };
      case "formField":
        return {
          ...block,
          spokenLabel: block.suppressDuplicateLabelInSpeech
            ? block.spokenLabel
            : applyLessonScopedPronunciationsToText(
                block.spokenLabel,
                pronunciations,
                state,
              ),
          ...(block.spokenDescription !== undefined
            ? {
                spokenDescription:
                  applyLessonScopedPronunciationsToText(
                    block.spokenDescription,
                    pronunciations,
                    state,
                  ),
              }
            : {}),
        };
      case "sectionBreak":
        return block;
    }
  });
}
