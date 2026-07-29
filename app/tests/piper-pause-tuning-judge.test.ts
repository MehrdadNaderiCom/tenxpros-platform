import { describe, expect, it } from "vitest";

import {
  PIPER_PAUSE_SCORE_KEYS,
  aggregatePiperSemanticBlockFinal,
  aggregatePiperPauseTuning,
  parsePiperPauseTuningJudgeResult,
  type PiperPauseTuningJudgeResult,
} from "../src/lib/academy/narration/piper-pause-tuning-judge";

function result(
  perspective:
    | "judge-01"
    | "judge-02"
    | "judge-03",
  preferred: "A" | "B",
): PiperPauseTuningJudgeResult {
  const score = Object.fromEntries(
    PIPER_PAUSE_SCORE_KEYS.map((key) => [
      key,
      4,
    ]),
  ) as PiperPauseTuningJudgeResult["version_a_scores"];
  return {
    perspective_id: perspective,
    version_a_scores: score,
    version_b_scores: score,
    paragraph_clearly_longer: preferred,
    paragraph_natural_preference: preferred,
    headings_clearly_separated: preferred,
    list_pacing_natural: preferred,
    section_clear_not_theatrical: preferred,
    paragraph_pause_excessive: "NEITHER",
    section_pause_excessive: "NEITHER",
    awkward_silence_present: "NEITHER",
    table_easier_to_follow: preferred,
    table_more_efficient: preferred,
    table_pacing_preference: preferred,
    long_form_comfort_preference: preferred,
    overall_preference: preferred,
    critical_defect: {
      present: false,
      affected_version: "NEITHER",
      severity: "NONE",
      kind: "",
      description: "",
    },
    bryce_naturalness_or_fatigue_primary_failure:
      false,
    confidence: 90,
    reasoning: "The hierarchy is clear and natural.",
  };
}

describe("Piper pause tuning judge", () => {
  it("strictly parses one perspective", () => {
    const expected = result("judge-01", "B");
    expect(
      parsePiperPauseTuningJudgeResult(
        JSON.stringify(expected),
        "judge-01",
      ),
    ).toEqual(expected);
  });

  it("rejects an out-of-range score", () => {
    const invalid = result("judge-01", "B");
    invalid.version_b_scores.naturalness = 6;
    expect(() =>
      parsePiperPauseTuningJudgeResult(
        JSON.stringify(invalid),
        "judge-01",
      ),
    ).toThrow(/integer from 1 to 5/u);
  });

  it("passes only a complete three-judge tuned panel", () => {
    const aggregate = aggregatePiperPauseTuning([
      {
        perspectiveId: "judge-01",
        tunedVersion: "B",
        result: result("judge-01", "B"),
      },
      {
        perspectiveId: "judge-02",
        tunedVersion: "A",
        result: result("judge-02", "A"),
      },
      {
        perspectiveId: "judge-03",
        tunedVersion: "B",
        result: result("judge-03", "B"),
      },
    ]);
    expect(aggregate.decision).toBe(
      "PASS_TUNED_PIPER_BRYCE",
    );
    expect(
      aggregate.gates.allParagraphClearlyLonger,
    ).toBe(true);
    expect(aggregate.gates.tableNotWorse).toBe(
      true,
    );
  });

  it("applies every final semantic-block acceptance gate", () => {
    const aggregate = aggregatePiperSemanticBlockFinal([
      {
        perspectiveId: "judge-01",
        tunedVersion: "B",
        result: result("judge-01", "B"),
      },
      {
        perspectiveId: "judge-02",
        tunedVersion: "A",
        result: result("judge-02", "A"),
      },
      {
        perspectiveId: "judge-03",
        tunedVersion: "B",
        result: result("judge-03", "B"),
      },
    ]);
    expect(aggregate.decision).toBe(
      "PASS_TUNED_PIPER_BRYCE_FINAL",
    );
    expect(
      aggregate.gates.allRequiredMediansPass,
    ).toBe(true);
  });
});
