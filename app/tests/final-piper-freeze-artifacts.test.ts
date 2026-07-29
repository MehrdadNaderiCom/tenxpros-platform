import {
  readFile,
  stat,
} from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RUN_DIRECTORY = resolve(
  process.cwd(),
  "..",
  "scratch_academy",
  "piper-final-recipe",
  "semantic-block-flow-v2-final-20260727",
);

async function json(file: string) {
  return JSON.parse(
    await readFile(
      resolve(RUN_DIRECTORY, file),
      "utf8",
    ),
  ) as Record<string, any>;
}

describe("frozen final Piper recipe artifacts", () => {
  it("freezes the exact recipe and parent hashes", async () => {
    const freeze = await json(
      "recipe-freeze.json",
    );
    expect(freeze).toMatchObject({
      status: "FROZEN",
      recipeVersion:
        "semantic-block-flow-v2-final",
      recipeHash:
        "0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe",
      parent: {
        recipeVersion:
          "semantic-block-flow-v1",
        planHash:
          "110fbd6db6d5a7c59f4d3d31c7e538e7a215d9dd9066c3ecea4dfb93a32ce599",
      },
      externalApiCalls: 0,
      fullAcademyGenerated: false,
      productionMutations: 0,
    });
  });

  it("passes every final objective gate", async () => {
    const objective = await json(
      "final-objective-validation.json",
    );
    expect(objective.passed).toBe(true);
    expect(
      objective.checks.every(
        (check: { pass: boolean }) =>
          check.pass,
      ),
    ).toBe(true);
    expect(
      objective.sentence.medianMilliseconds,
    ).toBeGreaterThanOrEqual(180);
    expect(
      objective.sentence.p95Milliseconds,
    ).toBeLessThanOrEqual(375);
    expect(
      objective.boundaries.paragraph.minimumMilliseconds,
    ).toBeGreaterThanOrEqual(790);
    expect(
      objective.boundaries.paragraph.maximumMilliseconds,
    ).toBeLessThanOrEqual(850);
    expect(
      objective.stitchDiscontinuityWarnings,
    ).toBe(0);
  });

  it("binds two valid focused MP3s without generating the Academy", async () => {
    const manifest = await json(
      "focused-audio-manifest.json",
    );
    expect(manifest.assets).toHaveLength(2);
    for (const asset of manifest.assets) {
      const metadata = await stat(
        resolve(RUN_DIRECTORY, asset.path),
      );
      expect(metadata.size).toBe(
        asset.sizeBytes,
      );
    }
  });

  it("prepares but does not execute the future generation command", async () => {
    const command = (
      await readFile(
        resolve(
          RUN_DIRECTORY,
          "future-full-generation-command.txt",
        ),
        "utf8",
      )
    ).trim();
    expect(command).toContain(
      "scripts/generate-final-piper-academy.ts",
    );
    expect(command).toContain(
      "--recipe-hash 0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe",
    );
    const freeze = await json(
      "recipe-freeze.json",
    );
    expect(freeze.fullAcademyGenerated).toBe(
      false,
    );
  });

  it("keeps the exact immutable production snapshot", async () => {
    const invariance = await json(
      "production-invariance.json",
    );
    expect(invariance).toMatchObject({
      exactMatch: true,
      legacyRecordsByteForByteUnchanged: true,
      productionMutationCount: 0,
      productionAfter: {
        count: 51,
        bytes: 271_123_569,
        binaryCopySha256:
          "2ba47ce80f134b47f210a00ba6d47639742596df536c396ee3f651757859202d",
      },
    });
  });
});
