import { createHash } from "node:crypto";

import type {
  NarrationBlock,
  NarrationParagraphBlock,
  NarrationPauseProfile,
  NarrationWarning,
} from "./contracts";

export const LONG_BLOCK_SEGMENTATION_POLICY_VERSION =
  "academy-long-blocks-v1";

export interface LongBlockSegmentationPolicy {
  slug: string;
  sourcePath: string;
  visibleTextSha256: string;
  sentenceCount: number;
  breakAfterSentenceNumbers: readonly number[];
}

/**
 * These policies are deliberately source-bound. A content edit must be
 * reviewed and produce a new hash before its sentence boundaries can be
 * changed.
 */
export const LONG_BLOCK_SEGMENTATION_POLICIES =
  Object.freeze<readonly LongBlockSegmentationPolicy[]>([
    {
      slug: "rules",
      sourcePath: "root/p[10]",
      visibleTextSha256:
        "16e029646d7d160518f39acc4bcb9905652cdb991ae17444bcce798bc824b046",
      sentenceCount: 11,
      breakAfterSentenceNumbers: [5, 9],
    },
    {
      slug: "rules",
      sourcePath: "root/p[11]",
      visibleTextSha256:
        "0efbbc8df0cb528aefe68b87082535cd4c7d627a772e00c57317e154d3084e0c",
      sentenceCount: 15,
      breakAfterSentenceNumbers: [4, 8, 10, 12],
    },
    {
      slug: "rules",
      sourcePath: "root/p[13]",
      visibleTextSha256:
        "1562fcbc3dfb05f9f2606ced47f6ea71ef19a08d53a1d92e0aba4c4cc005dec5",
      sentenceCount: 13,
      breakAfterSentenceNumbers: [4, 7, 9],
    },
    {
      slug: "motions",
      sourcePath: "root/p[7]",
      visibleTextSha256:
        "d5cecfea26ffb213359ece31af91864fa2b4b3fe2799687729e60eb0a87b02ef",
      sentenceCount: 7,
      breakAfterSentenceNumbers: [2, 3, 4],
    },
  ]);

export type NarrationSegmentNormalizer = (
  visibleText: string,
  originalBlock: NarrationParagraphBlock,
) => string;

export interface SegmentLongNarrationBlocksInput {
  slug: string;
  blocks: readonly NarrationBlock[];
  normalizeSpokenText: NarrationSegmentNormalizer;
  pauseProfile: Pick<NarrationPauseProfile, "sentence">;
  onWarning?: (warning: NarrationWarning) => void;
}

export interface SegmentLongNarrationBlocksResult {
  blocks: NarrationBlock[];
  warnings: NarrationWarning[];
}

function plainTextSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Split only after terminal sentence punctuation followed by one ASCII space.
 * The reconstruction check rejects any source for which this conservative
 * parser would alter whitespace.
 */
function splitSentences(value: string): string[] | null {
  const sentences: string[] = [];
  let sentenceStart = 0;
  const terminalPunctuation =
    /[.!?](?:["')\u005d\u007d])*(?= |$)/gu;

  for (const match of value.matchAll(terminalPunctuation)) {
    const matchStart = match.index;
    if (matchStart === undefined) {
      return null;
    }

    const sentenceEnd = matchStart + match[0].length;
    sentences.push(value.slice(sentenceStart, sentenceEnd));

    if (sentenceEnd < value.length) {
      if (value[sentenceEnd] !== " ") {
        return null;
      }
      sentenceStart = sentenceEnd + 1;
    } else {
      sentenceStart = sentenceEnd;
    }
  }

  if (sentenceStart < value.length) {
    sentences.push(value.slice(sentenceStart));
  }

  if (
    sentences.length === 0 ||
    sentences.some((sentence) => !sentence) ||
    sentences.join(" ") !== value
  ) {
    return null;
  }

  return sentences;
}

function groupSentences(
  sentences: readonly string[],
  breakAfterSentenceNumbers: readonly number[],
): string[] | null {
  const boundaries = [
    ...breakAfterSentenceNumbers,
    sentences.length,
  ];
  const groups: string[] = [];
  let start = 0;

  for (const boundary of boundaries) {
    if (
      !Number.isInteger(boundary) ||
      boundary <= start ||
      boundary > sentences.length
    ) {
      return null;
    }
    groups.push(sentences.slice(start, boundary).join(" "));
    start = boundary;
  }

  return start === sentences.length ? groups : null;
}

function alignmentWarning(
  block: NarrationBlock,
  policy: LongBlockSegmentationPolicy,
  reason: string,
  details: Readonly<Record<string, string | number | boolean>> = {},
): NarrationWarning {
  return {
    code: "NARRATION_ALIGNMENT_INVALID_SEMANTIC_DRIFT",
    severity: "error",
    message:
      "A source-bound long-block segmentation policy no longer matches; the original block was left unchanged.",
    blockId: block.id,
    ...(block.source ? { source: block.source } : {}),
    details: {
      reason,
      policyVersion: LONG_BLOCK_SEGMENTATION_POLICY_VERSION,
      expectedVisibleTextSha256: policy.visibleTextSha256,
      ...details,
    },
  };
}

function segmentBlock(
  block: NarrationBlock,
  policy: LongBlockSegmentationPolicy,
  normalize: NarrationSegmentNormalizer,
  sentencePauseMs: number,
): { blocks: NarrationBlock[]; warning?: NarrationWarning } {
  if (block.type !== "paragraph") {
    return {
      blocks: [block],
      warning: alignmentWarning(block, policy, "unsupported-block-type", {
        actualBlockType: block.type,
      }),
    };
  }

  const actualVisibleTextSha256 = plainTextSha256(block.visibleText);
  if (actualVisibleTextSha256 !== policy.visibleTextSha256) {
    return {
      blocks: [block],
      warning: alignmentWarning(block, policy, "visible-text-hash-mismatch", {
        actualVisibleTextSha256,
      }),
    };
  }

  const sentences = splitSentences(block.visibleText);
  if (!sentences || sentences.length !== policy.sentenceCount) {
    return {
      blocks: [block],
      warning: alignmentWarning(
        block,
        policy,
        "visible-sentence-count-mismatch",
        {
          expectedSentenceCount: policy.sentenceCount,
          actualSentenceCount: sentences?.length ?? 0,
        },
      ),
    };
  }

  const visibleSegments = groupSentences(
    sentences,
    policy.breakAfterSentenceNumbers,
  );
  if (
    !visibleSegments ||
    visibleSegments.join(" ") !== block.visibleText
  ) {
    return {
      blocks: [block],
      warning: alignmentWarning(
        block,
        policy,
        "unsafe-visible-segmentation-boundary",
      ),
    };
  }

  let spokenSegments: string[];
  try {
    spokenSegments = visibleSegments.map((visibleText) =>
      normalize(visibleText, block),
    );
  } catch {
    return {
      blocks: [block],
      warning: alignmentWarning(block, policy, "spoken-normalization-failed"),
    };
  }

  const reconstructedSpokenText = spokenSegments.join(" ");
  if (
    spokenSegments.some((spokenText) => !spokenText) ||
    reconstructedSpokenText !== block.spokenText
  ) {
    return {
      blocks: [block],
      warning: alignmentWarning(
        block,
        policy,
        "spoken-reconstruction-mismatch",
        {
          expectedSpokenTextSha256: plainTextSha256(block.spokenText),
          actualSpokenTextSha256: plainTextSha256(reconstructedSpokenText),
        },
      ),
    };
  }

  return {
    blocks: visibleSegments.map(
      (visibleText, index): NarrationParagraphBlock => ({
        ...block,
        id: `${block.id}#segment[${String(index + 1)}]`,
        visibleText,
        spokenText: spokenSegments[index],
        pauseAfterMs:
          index === visibleSegments.length - 1
            ? block.pauseAfterMs
            : sentencePauseMs,
      }),
    ),
  };
}

export function segmentLongNarrationBlocks({
  slug,
  blocks,
  normalizeSpokenText,
  pauseProfile,
  onWarning,
}: SegmentLongNarrationBlocksInput): SegmentLongNarrationBlocksResult {
  const policiesByPath = new Map(
    LONG_BLOCK_SEGMENTATION_POLICIES.filter(
      (policy) => policy.slug === slug,
    ).map((policy) => [policy.sourcePath, policy] as const),
  );
  const warnings: NarrationWarning[] = [];
  const segmentedBlocks = blocks.flatMap((block) => {
    const sourcePath = block.source?.path;
    const policy = sourcePath ? policiesByPath.get(sourcePath) : undefined;
    if (!policy || block.id !== policy.sourcePath) {
      return [block];
    }

    const result = segmentBlock(
      block,
      policy,
      normalizeSpokenText,
      pauseProfile.sentence,
    );
    if (result.warning) {
      warnings.push(result.warning);
      onWarning?.(result.warning);
    }
    return result.blocks;
  });

  return {
    blocks: segmentedBlocks,
    warnings,
  };
}
