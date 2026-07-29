import {
  readFile,
  readdir,
} from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RUN_DIRECTORY = resolve(
  process.cwd(),
  "..",
  "scratch_academy",
  "piper-semantic-block-flow",
  "semantic-block-flow-v1-20260727",
);

async function json(file: string) {
  return JSON.parse(
    await readFile(
      resolve(RUN_DIRECTORY, file),
      "utf8",
    ),
  ) as Record<string, any>;
}

describe("final semantic-block artifacts", () => {
  it("proves the acoustic hierarchy and controlled boundaries", async () => {
    const runtime = await json(
      "runtime-results.json",
    );
    const gates = runtime.objectiveGates;
    expect(gates.passed).toBe(true);
    expect(
      gates.boundaries.paragraph.minimumMilliseconds,
    ).toBeGreaterThanOrEqual(
      gates.sentence.p95Milliseconds + 250,
    );
    expect(
      gates.boundaries.heading.minimumMilliseconds,
    ).toBeGreaterThan(
      gates.boundaries.paragraph.maximumMilliseconds,
    );
    expect(
      gates.boundaries.section.minimumMilliseconds,
    ).toBeGreaterThan(
      gates.boundaries.heading.maximumMilliseconds,
    );
    expect(
      gates.boundaries.section.maximumMilliseconds,
    ).toBeLessThanOrEqual(1_150);
    expect(
      gates.boundaries.tableRow.minimumMilliseconds,
    ).toBeGreaterThanOrEqual(240);
    expect(
      gates.boundaries.tableRow.maximumMilliseconds,
    ).toBeLessThanOrEqual(300);
    expect(
      gates.boundaries.list.minimumMilliseconds,
    ).toBeGreaterThanOrEqual(280);
    expect(
      gates.boundaries.list.maximumMilliseconds,
    ).toBeLessThanOrEqual(330);
  });

  it("stores each raw paid response before accepting it", async () => {
    const lines = (
      await readFile(
        resolve(
          RUN_DIRECTORY,
          "final-tuning-ledger.jsonl",
        ),
        "utf8",
      )
    )
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line) as Record<string, any>,
      );
    for (const ordinal of [1, 2, 3]) {
      const persisted = lines.findIndex(
        (event) =>
          event.event ===
            "RAW_RESPONSE_PERSISTED_BEFORE_PARSE" &&
          event.data.requestOrdinal === ordinal,
      );
      const accepted = lines.findIndex(
        (event) =>
          event.event ===
            "VALID_JUDGE_RESULT_ACCEPTED" &&
          event.data.requestOrdinal === ordinal,
      );
      expect(persisted).toBeGreaterThanOrEqual(0);
      expect(accepted).toBeGreaterThan(persisted);
    }
    expect(
      await readdir(
        resolve(
          RUN_DIRECTORY,
          "raw-ai-responses",
        ),
      ),
    ).toHaveLength(3);
  });

  it("keeps authoritative cost below the owner cap", async () => {
    const cost = await json(
      "final-tuning-cost-report.json",
    );
    expect(cost.paidJudgeRequests).toBe(3);
    expect(
      Number(cost.cumulativeActualCostUsd),
    ).toBeLessThan(10);
    expect(
      Number(cost.unresolvedOrUncertainCostUsd),
    ).toBe(0);
    expect(cost.withinCostCap).toBe(true);
  });

  it("carries the exact immutable 51-row production baseline", async () => {
    const plan = await json(
      "block-level-generation-plan.json",
    );
    expect(plan.productionBefore).toMatchObject({
      count: 51,
      bytes: 271_123_569,
      rowMd5Aggregate:
        "307e49138be9ea27192a3bef9f060d18",
      binaryCopySha256:
        "2ba47ce80f134b47f210a00ba6d47639742596df536c396ee3f651757859202d",
    });
  });
});
