import type {
  NarrationBlock,
  NarrationChunk,
} from "./contracts";
import { narrationBlockToSpokenText } from "./preview";

export const MAX_SAFE_NARRATION_CHUNK_CHARACTERS = 9_000;

/**
 * Builds deterministic review-only chunks at semantic block boundaries.
 *
 * This does not call a provider or create audio. A section break always closes
 * the current chunk. A single oversized block remains intact so the warning
 * layer can report it instead of silently splitting meaning mid-block.
 */
export function planNarrationChunks(
  blocks: readonly NarrationBlock[],
  maxCharacters = MAX_SAFE_NARRATION_CHUNK_CHARACTERS,
): NarrationChunk[] {
  if (!Number.isInteger(maxCharacters) || maxCharacters <= 0) {
    throw new RangeError("Narration chunk size must be a positive integer.");
  }

  const chunks: NarrationChunk[] = [];
  let blockIds: string[] = [];
  let spokenParts: string[] = [];

  const flush = (): void => {
    if (!spokenParts.length) return;
    const spokenText = spokenParts.join("\n\n");
    chunks.push({
      index: chunks.length,
      blockIds,
      spokenText,
      characterCount: spokenText.length,
    });
    blockIds = [];
    spokenParts = [];
  };

  for (const block of blocks) {
    if (block.type === "sectionBreak") {
      flush();
      continue;
    }

    const spokenText = narrationBlockToSpokenText(block);
    if (!spokenText) continue;
    const proposedCharacters =
      spokenParts.reduce((total, part) => total + part.length, 0) +
      spokenText.length +
      spokenParts.length * 2;

    if (spokenParts.length && proposedCharacters > maxCharacters) {
      flush();
    }
    blockIds.push(block.id);
    spokenParts.push(spokenText);
  }

  flush();
  return chunks;
}
