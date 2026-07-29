export const PIPER_PAUSE_TUNING_TOOL_NAME =
  "submit_audio_evaluation";

export const PIPER_PAUSE_TUNING_PERSPECTIVES = [
  "judge-01",
  "judge-02",
  "judge-03",
] as const;

export type PiperPauseTuningPerspective =
  (typeof PIPER_PAUSE_TUNING_PERSPECTIVES)[number];

export type BlindVersion = "A" | "B";
export type BlindPreference = BlindVersion | "TIE";
export type VersionSet =
  | BlindVersion
  | "BOTH"
  | "NEITHER";

export const PIPER_PAUSE_SCORE_KEYS = [
  "internal_sentence_flow",
  "paragraph_separation",
  "heading_separation",
  "list_pacing",
  "section_pacing",
  "table_pacing",
  "naturalness",
  "clarity",
  "professional_quality",
  "long_form_suitability",
] as const;

export type PiperPauseScoreKey =
  (typeof PIPER_PAUSE_SCORE_KEYS)[number];

export type PiperPauseScores = Record<
  PiperPauseScoreKey,
  number
>;

export interface PiperPauseTuningJudgeResult {
  perspective_id: PiperPauseTuningPerspective;
  version_a_scores: PiperPauseScores;
  version_b_scores: PiperPauseScores;
  paragraph_clearly_longer:
    | BlindVersion
    | "BOTH"
    | "NEITHER";
  paragraph_natural_preference: BlindPreference;
  headings_clearly_separated: VersionSet;
  list_pacing_natural: VersionSet;
  section_clear_not_theatrical: VersionSet;
  paragraph_pause_excessive: VersionSet;
  section_pause_excessive: VersionSet;
  awkward_silence_present: VersionSet;
  table_easier_to_follow: BlindPreference;
  table_more_efficient: BlindPreference;
  table_pacing_preference: BlindPreference;
  long_form_comfort_preference: BlindPreference;
  overall_preference: BlindPreference;
  critical_defect: {
    present: boolean;
    affected_version:
      | BlindVersion
      | "BOTH"
      | "NEITHER";
    severity: "NONE" | "MINOR" | "MAJOR";
    kind: string;
    description: string;
  };
  bryce_naturalness_or_fatigue_primary_failure: boolean;
  confidence: number;
  reasoning: string;
}

function object(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  if (
    JSON.stringify(actual) !==
    JSON.stringify(sortedExpected)
  ) {
    throw new Error(`${label} fields are not exact`);
  }
}

function enumValue<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (
    typeof value !== "string" ||
    !values.includes(value as T)
  ) {
    throw new Error(`${label} is invalid`);
  }
  return value as T;
}

function scores(
  value: unknown,
  label: string,
): PiperPauseScores {
  const candidate = object(value, label);
  exactKeys(candidate, PIPER_PAUSE_SCORE_KEYS, label);
  for (const key of PIPER_PAUSE_SCORE_KEYS) {
    if (
      !Number.isInteger(candidate[key]) ||
      Number(candidate[key]) < 1 ||
      Number(candidate[key]) > 5
    ) {
      throw new Error(
        `${label}.${key} must be an integer from 1 to 5`,
      );
    }
  }
  return candidate as PiperPauseScores;
}

export function parsePiperPauseTuningJudgeResult(
  payload: string,
  expectedPerspective: PiperPauseTuningPerspective,
): PiperPauseTuningJudgeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload) as unknown;
  } catch {
    throw new Error("Tuning judge arguments are not JSON");
  }
  const value = object(parsed, "judge result");
  exactKeys(
    value,
    [
      "perspective_id",
      "version_a_scores",
      "version_b_scores",
      "paragraph_clearly_longer",
      "paragraph_natural_preference",
      "headings_clearly_separated",
      "list_pacing_natural",
      "section_clear_not_theatrical",
      "paragraph_pause_excessive",
      "section_pause_excessive",
      "awkward_silence_present",
      "table_easier_to_follow",
      "table_more_efficient",
      "table_pacing_preference",
      "long_form_comfort_preference",
      "overall_preference",
      "critical_defect",
      "bryce_naturalness_or_fatigue_primary_failure",
      "confidence",
      "reasoning",
    ],
    "judge result",
  );
  if (value.perspective_id !== expectedPerspective) {
    throw new Error(
      "Judge perspective does not match its assignment",
    );
  }
  const critical = object(
    value.critical_defect,
    "critical_defect",
  );
  exactKeys(
    critical,
    [
      "present",
      "affected_version",
      "severity",
      "kind",
      "description",
    ],
    "critical_defect",
  );
  if (
    typeof critical.present !== "boolean" ||
    typeof critical.kind !== "string" ||
    typeof critical.description !== "string" ||
    typeof value
      .bryce_naturalness_or_fatigue_primary_failure !==
      "boolean" ||
    !Number.isInteger(value.confidence) ||
    Number(value.confidence) < 0 ||
    Number(value.confidence) > 100 ||
    typeof value.reasoning !== "string" ||
    value.reasoning.trim().length === 0
  ) {
    throw new Error(
      "Judge booleans, confidence, or reasoning are invalid",
    );
  }
  const severity = enumValue(
    critical.severity,
    ["NONE", "MINOR", "MAJOR"] as const,
    "critical_defect.severity",
  );
  if (
    (critical.present === false &&
      severity !== "NONE") ||
    (critical.present === true &&
      severity === "NONE")
  ) {
    throw new Error(
      "Critical defect presence and severity disagree",
    );
  }
  return {
    perspective_id: expectedPerspective,
    version_a_scores: scores(
      value.version_a_scores,
      "version_a_scores",
    ),
    version_b_scores: scores(
      value.version_b_scores,
      "version_b_scores",
    ),
    paragraph_clearly_longer: enumValue(
      value.paragraph_clearly_longer,
      ["A", "B", "BOTH", "NEITHER"] as const,
      "paragraph_clearly_longer",
    ),
    paragraph_natural_preference: enumValue(
      value.paragraph_natural_preference,
      ["A", "B", "TIE"] as const,
      "paragraph_natural_preference",
    ),
    headings_clearly_separated: enumValue(
      value.headings_clearly_separated,
      ["A", "B", "BOTH", "NEITHER"] as const,
      "headings_clearly_separated",
    ),
    list_pacing_natural: enumValue(
      value.list_pacing_natural,
      ["A", "B", "BOTH", "NEITHER"] as const,
      "list_pacing_natural",
    ),
    section_clear_not_theatrical: enumValue(
      value.section_clear_not_theatrical,
      ["A", "B", "BOTH", "NEITHER"] as const,
      "section_clear_not_theatrical",
    ),
    paragraph_pause_excessive: enumValue(
      value.paragraph_pause_excessive,
      ["A", "B", "BOTH", "NEITHER"] as const,
      "paragraph_pause_excessive",
    ),
    section_pause_excessive: enumValue(
      value.section_pause_excessive,
      ["A", "B", "BOTH", "NEITHER"] as const,
      "section_pause_excessive",
    ),
    awkward_silence_present: enumValue(
      value.awkward_silence_present,
      ["A", "B", "BOTH", "NEITHER"] as const,
      "awkward_silence_present",
    ),
    table_easier_to_follow: enumValue(
      value.table_easier_to_follow,
      ["A", "B", "TIE"] as const,
      "table_easier_to_follow",
    ),
    table_more_efficient: enumValue(
      value.table_more_efficient,
      ["A", "B", "TIE"] as const,
      "table_more_efficient",
    ),
    table_pacing_preference: enumValue(
      value.table_pacing_preference,
      ["A", "B", "TIE"] as const,
      "table_pacing_preference",
    ),
    long_form_comfort_preference: enumValue(
      value.long_form_comfort_preference,
      ["A", "B", "TIE"] as const,
      "long_form_comfort_preference",
    ),
    overall_preference: enumValue(
      value.overall_preference,
      ["A", "B", "TIE"] as const,
      "overall_preference",
    ),
    critical_defect: {
      present: critical.present,
      affected_version: enumValue(
        critical.affected_version,
        ["A", "B", "BOTH", "NEITHER"] as const,
        "critical_defect.affected_version",
      ),
      severity,
      kind: critical.kind,
      description: critical.description,
    },
    bryce_naturalness_or_fatigue_primary_failure:
      value.bryce_naturalness_or_fatigue_primary_failure,
    confidence: Number(value.confidence),
    reasoning: value.reasoning,
  };
}

function includesVersion(
  value: VersionSet,
  version: BlindVersion,
): boolean {
  return value === version || value === "BOTH";
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error("Median requires at least one value");
  }
  const sorted = [...values].sort(
    (left, right) => left - right,
  );
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

export interface PiperPauseTuningValidRun {
  perspectiveId: PiperPauseTuningPerspective;
  tunedVersion: BlindVersion;
  result: PiperPauseTuningJudgeResult;
}

export function aggregatePiperPauseTuning(
  runs: readonly PiperPauseTuningValidRun[],
) {
  if (
    runs.length !== 3 ||
    new Set(
      runs.map((run) => run.perspectiveId),
    ).size !== 3
  ) {
    throw new Error(
      "Tuning aggregation requires three independent perspectives",
    );
  }
  const normalized = runs.map((run) => {
    const currentVersion: BlindVersion =
      run.tunedVersion === "A" ? "B" : "A";
    const tunedScores =
      run.tunedVersion === "A"
        ? run.result.version_a_scores
        : run.result.version_b_scores;
    const currentScores =
      currentVersion === "A"
        ? run.result.version_a_scores
        : run.result.version_b_scores;
    return {
      perspectiveId: run.perspectiveId,
      tunedVersion: run.tunedVersion,
      currentVersion,
      tunedScores,
      currentScores,
      overall:
        run.result.overall_preference ===
        run.tunedVersion
          ? "TUNED"
          : run.result.overall_preference ===
              currentVersion
            ? "CURRENT"
            : "TIE",
      paragraphClearlyLonger: includesVersion(
        run.result.paragraph_clearly_longer,
        run.tunedVersion,
      ),
      paragraphExcessive: includesVersion(
        run.result.paragraph_pause_excessive,
        run.tunedVersion,
      ),
      sectionExcessive: includesVersion(
        run.result.section_pause_excessive,
        run.tunedVersion,
      ),
      tablePacing:
        run.result.table_pacing_preference ===
        run.tunedVersion
          ? "TUNED"
          : run.result.table_pacing_preference ===
              currentVersion
            ? "CURRENT"
            : "TIE",
      criticalTunedDefect:
        run.result.critical_defect.present &&
        includesVersion(
          run.result.critical_defect
            .affected_version,
          run.tunedVersion,
        ) &&
        run.result.critical_defect.severity ===
          "MAJOR",
      naturalnessOrFatiguePrimary:
        run.result
          .bryce_naturalness_or_fatigue_primary_failure,
      confidence: run.result.confidence,
    };
  });
  const medians = Object.fromEntries(
    PIPER_PAUSE_SCORE_KEYS.map((key) => [
      key,
      median(
        normalized.map(
          (run) => run.tunedScores[key],
        ),
      ),
    ]),
  ) as PiperPauseScores;
  const currentMedians = Object.fromEntries(
    PIPER_PAUSE_SCORE_KEYS.map((key) => [
      key,
      median(
        normalized.map(
          (run) => run.currentScores[key],
        ),
      ),
    ]),
  ) as PiperPauseScores;
  const tunedOverallVotes = normalized.filter(
    (run) => run.overall === "TUNED",
  ).length;
  const allParagraphClearlyLonger =
    normalized.every(
      (run) => run.paragraphClearlyLonger,
    );
  const tableNotWorse =
    medians.table_pacing >=
      currentMedians.table_pacing &&
    normalized.filter(
      (run) => run.tablePacing === "CURRENT",
    ).length < 2;
  const coreQualityPass =
    medians.paragraph_separation >= 4 &&
    medians.naturalness >= 4 &&
    medians.clarity >= 4 &&
    medians.professional_quality >= 4 &&
    medians.long_form_suitability >= 4;
  const noExcessMajority =
    normalized.filter(
      (run) => run.paragraphExcessive,
    ).length < 2 &&
    normalized.filter(
      (run) => run.sectionExcessive,
    ).length < 2;
  const noCriticalDefect = normalized.every(
    (run) => !run.criticalTunedDefect,
  );
  const pass =
    tunedOverallVotes >= 2 &&
    allParagraphClearlyLonger &&
    coreQualityPass &&
    noExcessMajority &&
    tableNotWorse &&
    noCriticalDefect;
  const pacingPass =
    medians.internal_sentence_flow >= 4 &&
    medians.paragraph_separation >= 4 &&
    medians.heading_separation >= 4 &&
    medians.list_pacing >= 4 &&
    medians.section_pacing >= 4 &&
    medians.table_pacing >= 4;
  const fatiguePrimary =
    pacingPass &&
    normalized.filter(
      (run) => run.naturalnessOrFatiguePrimary,
    ).length >= 2 &&
    (medians.naturalness < 4 ||
      medians.long_form_suitability < 4);
  const decision = pass
    ? "PASS_TUNED_PIPER_BRYCE"
    : fatiguePrimary
      ? "TEST_OTHER_LOCAL_VOICES"
      : "TUNE_AGAIN_REQUIRED";
  return {
    schemaVersion:
      "tenxpros-piper-pause-tuning-aggregate-v1",
    validPerspectiveCount: runs.length,
    normalized,
    tunedScoreMedians: medians,
    currentScoreMedians: currentMedians,
    gates: {
      tunedOverallVotes,
      allParagraphClearlyLonger,
      paragraphSeparationMedian:
        medians.paragraph_separation,
      naturalnessMedian: medians.naturalness,
      clarityMedian: medians.clarity,
      professionalQualityMedian:
        medians.professional_quality,
      longFormSuitabilityMedian:
        medians.long_form_suitability,
      paragraphExcessiveVotes:
        normalized.filter(
          (run) => run.paragraphExcessive,
        ).length,
      sectionExcessiveVotes:
        normalized.filter(
          (run) => run.sectionExcessive,
        ).length,
      tableNotWorse,
      criticalTunedDefectCount:
        normalized.filter(
          (run) => run.criticalTunedDefect,
        ).length,
    },
    decision,
  };
}

export function aggregatePiperSemanticBlockFinal(
  runs: readonly PiperPauseTuningValidRun[],
) {
  const base = aggregatePiperPauseTuning(runs);
  const medians = base.tunedScoreMedians;
  const controlMedians = base.currentScoreMedians;
  const requiredMedians = {
    internalSentenceFlow:
      medians.internal_sentence_flow,
    paragraphSeparation:
      medians.paragraph_separation,
    headingSeparation:
      medians.heading_separation,
    sectionPacing: medians.section_pacing,
    naturalness: medians.naturalness,
    clarity: medians.clarity,
    professionalQuality:
      medians.professional_quality,
    longFormSuitability:
      medians.long_form_suitability,
  };
  const allRequiredMediansPass =
    Object.values(requiredMedians).every(
      (value) => value >= 4,
    );
  const pass =
    base.gates.tunedOverallVotes >= 2 &&
    base.gates.allParagraphClearlyLonger &&
    allRequiredMediansPass &&
    base.gates.paragraphExcessiveVotes < 2 &&
    base.gates.sectionExcessiveVotes < 2 &&
    base.gates.tableNotWorse &&
    base.gates.criticalTunedDefectCount === 0;
  const pacingAndFlowPass =
    medians.internal_sentence_flow >= 4 &&
    medians.paragraph_separation >= 4 &&
    medians.heading_separation >= 4 &&
    medians.section_pacing >= 4 &&
    medians.list_pacing >= 4 &&
    medians.table_pacing >= 4 &&
    base.gates.allParagraphClearlyLonger &&
    base.gates.paragraphExcessiveVotes < 2 &&
    base.gates.sectionExcessiveVotes < 2;
  const voiceQualityPrimary =
    pacingAndFlowPass &&
    base.normalized.filter(
      (run) => run.naturalnessOrFatiguePrimary,
    ).length >= 2 &&
    (medians.naturalness < 4 ||
      medians.long_form_suitability < 4);
  const flowKeys = [
    "internal_sentence_flow",
    "paragraph_separation",
    "heading_separation",
    "section_pacing",
  ] as const;
  const flowImprovementCount = flowKeys.filter(
    (key) => medians[key] > controlMedians[key],
  ).length;
  const blockFlowClearlyImproves =
    base.gates.tunedOverallVotes >= 2 &&
    flowImprovementCount >= 2;
  const decision = pass
    ? "PASS_TUNED_PIPER_BRYCE_FINAL"
    : voiceQualityPrimary
      ? "TEST_OTHER_LOCAL_VOICES"
      : blockFlowClearlyImproves
        ? "TUNE_NUMERIC_PAUSES_ONLY"
        : "INCONCLUSIVE_AI_ONLY_EVALUATION";
  return {
    ...base,
    schemaVersion:
      "tenxpros-piper-semantic-block-final-aggregate-v1",
    gates: {
      ...base.gates,
      requiredMedians,
      allRequiredMediansPass,
      pacingAndFlowPass,
      voiceQualityPrimary,
      flowImprovementCount,
      blockFlowClearlyImproves,
    },
    decision,
  };
}

const scoreProperties = Object.fromEntries(
  PIPER_PAUSE_SCORE_KEYS.map((key) => [
    key,
    {
      type: "integer",
      minimum: 1,
      maximum: 5,
    },
  ]),
);

const scoreSchema = {
  type: "object",
  additionalProperties: false,
  properties: scoreProperties,
  required: [...PIPER_PAUSE_SCORE_KEYS],
};

export function piperPauseTuningTool(
  perspective: PiperPauseTuningPerspective,
) {
  const preference = {
    type: "string",
    enum: ["A", "B", "TIE"],
  };
  const versionSet = {
    type: "string",
    enum: ["A", "B", "BOTH", "NEITHER"],
  };
  return {
    type: "function",
    function: {
      name: PIPER_PAUSE_TUNING_TOOL_NAME,
      description:
        "Submit one complete blind comparison of two Piper pause systems.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          perspective_id: {
            type: "string",
            enum: [perspective],
          },
          version_a_scores: scoreSchema,
          version_b_scores: scoreSchema,
          paragraph_clearly_longer: versionSet,
          paragraph_natural_preference: preference,
          headings_clearly_separated: versionSet,
          list_pacing_natural: versionSet,
          section_clear_not_theatrical: versionSet,
          paragraph_pause_excessive: versionSet,
          section_pause_excessive: versionSet,
          awkward_silence_present: versionSet,
          table_easier_to_follow: preference,
          table_more_efficient: preference,
          table_pacing_preference: preference,
          long_form_comfort_preference: preference,
          overall_preference: preference,
          critical_defect: {
            type: "object",
            additionalProperties: false,
            properties: {
              present: { type: "boolean" },
              affected_version: versionSet,
              severity: {
                type: "string",
                enum: ["NONE", "MINOR", "MAJOR"],
              },
              kind: { type: "string" },
              description: { type: "string" },
            },
            required: [
              "present",
              "affected_version",
              "severity",
              "kind",
              "description",
            ],
          },
          bryce_naturalness_or_fatigue_primary_failure:
            { type: "boolean" },
          confidence: {
            type: "integer",
            minimum: 0,
            maximum: 100,
          },
          reasoning: { type: "string" },
        },
        required: [
          "perspective_id",
          "version_a_scores",
          "version_b_scores",
          "paragraph_clearly_longer",
          "paragraph_natural_preference",
          "headings_clearly_separated",
          "list_pacing_natural",
          "section_clear_not_theatrical",
          "paragraph_pause_excessive",
          "section_pause_excessive",
          "awkward_silence_present",
          "table_easier_to_follow",
          "table_more_efficient",
          "table_pacing_preference",
          "long_form_comfort_preference",
          "overall_preference",
          "critical_defect",
          "bryce_naturalness_or_fatigue_primary_failure",
          "confidence",
          "reasoning",
        ],
      },
    },
  } as const;
}
