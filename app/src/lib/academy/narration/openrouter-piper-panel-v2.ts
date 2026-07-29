import {
  AI_AUDIO_SCORE_DIMENSIONS,
  canonicalAiJson,
  decideLocalNarration,
  hashAiValue,
  type AiAudioScoreDimension,
  type AiBlindJudgeAssignment,
  type AiBryceDecisionMetrics,
  type AiNarrationDecision,
  type AiObjectiveAnalysisSummary,
  type AiPrivateSampleIdentity,
} from "./ai-audio-evaluation";

export const PIPER_PANEL_V2_TOOL_NAME =
  "submit_audio_evaluation";
export const PIPER_PANEL_V2_MAX_TOKENS = 2_500;
export const PIPER_PANEL_V2_MAX_PAID_POSTS = 7;

const SCORE_DIMENSIONS = [
  "naturalness",
  "pause_quality",
  "pronunciation",
  "clarity",
  "listening_comfort",
  "professional_quality",
  "long_form_suitability",
] as const satisfies readonly AiAudioScoreDimension[];

const PAIR_PREFERENCE_FIELDS = [
  "preferred_overall",
  "clearer",
  "more_natural",
  "better_paced",
  "preferred_for_long_lesson",
] as const;

const PERSPECTIVE_IDS = [
  "judge-01",
  "judge-02",
  "judge-03",
  "judge-04",
  "judge-05",
] as const;

export type PiperPanelV2PerspectiveId =
  (typeof PERSPECTIVE_IDS)[number];
export type PiperPanelV2Preference = "A" | "B" | "tie";
export type PiperPanelV2Severity =
  | "none"
  | "minor"
  | "moderate"
  | "major"
  | "critical";

export interface PiperPanelV2Scores {
  naturalness: number;
  pause_quality: number;
  pronunciation: number;
  clarity: number;
  listening_comfort: number;
  professional_quality: number;
  long_form_suitability: number;
}

export interface PiperPanelV2PronunciationIssue {
  version: "A" | "B";
  severity: PiperPanelV2Severity;
  description: string;
}

export interface PiperPanelV2Pair {
  pair_id: string;
  a: PiperPanelV2Scores;
  b: PiperPanelV2Scores;
  preferred_overall: PiperPanelV2Preference;
  clearer: PiperPanelV2Preference;
  more_natural: PiperPanelV2Preference;
  better_paced: PiperPanelV2Preference;
  preferred_for_long_lesson: PiperPanelV2Preference;
  a_too_slow: boolean;
  b_too_slow: boolean;
  a_too_fast: boolean;
  b_too_fast: boolean;
  pronunciation_issues:
    readonly PiperPanelV2PronunciationIssue[];
  confidence: number;
  reason: string;
}

export interface PiperPanelV2Evaluation {
  judge: {
    perspective_id: PiperPanelV2PerspectiveId;
    confidence: number;
  };
  pairs: readonly PiperPanelV2Pair[];
  table_evaluation: {
    pair_id: string;
    easier_to_follow: PiperPanelV2Preference;
    repeated_labels_helpful: boolean;
    duration_excessive: boolean;
    clarity_justifies_duration: boolean;
    concise_variant_recommended: boolean;
    confidence: number;
    reason: string;
  };
  overall: {
    best_pipeline_across_pairs: PiperPanelV2Preference;
    suitable_for_professional_academy: boolean;
    suitable_for_15_to_30_minutes: boolean;
    main_strength: string;
    main_concern: string;
  };
}

export interface PiperPanelV2Run {
  perspectiveId: PiperPanelV2PerspectiveId;
  assignment: AiBlindJudgeAssignment;
  evaluation: PiperPanelV2Evaluation;
  responseId: string;
  rawBodySha256: string;
  normalizedResponseSha256: string;
  requestOrdinal: number;
  attempt: 1 | 2;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${path} has missing or unknown properties`);
  }
}

function trimRequiredString(
  value: unknown,
  path: string,
  maximumWords?: number,
): string {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string`);
  }
  const result = value.trim().replace(/\s+/gu, " ");
  if (!result) {
    throw new Error(`${path} cannot be empty`);
  }
  if (
    maximumWords !== undefined &&
    result.split(/\s+/u).length > maximumWords
  ) {
    throw new Error(
      `${path} must contain at most ${String(maximumWords)} words`,
    );
  }
  return result;
}

function auditoryEvidence(
  value: unknown,
  path: string,
): string {
  const result = trimRequiredString(value, path, 35);
  if (
    /\b(?:transcript|source\s+text|implementation|pipeline\s+identity|corrected|baseline|file\s*name|codec|bitrate|waveform)\b/iu.test(
      result,
    ) ||
    !/\b(?:sound|heard|audio|voice|speech|spoken|pause|pace|natural|pronunciation|clar|listen|comfort|delivery|flow|rhythm|tone|fatigue|slow|fast|silence|word|label|duration|smooth|choppy|professional)\w*\b/iu.test(
      result,
    )
  ) {
    throw new Error(
      `${path} must contain concise evidence grounded in what was heard`,
    );
  }
  return result;
}

function integerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  path: string,
): number {
  const normalized =
    typeof value === "string" && /^\s*\d+\s*$/u.test(value)
      ? Number(value.trim())
      : value;
  if (
    typeof normalized !== "number" ||
    !Number.isInteger(normalized) ||
    normalized < minimum ||
    normalized > maximum
  ) {
    throw new Error(
      `${path} must be an integer from ${String(minimum)} to ${String(maximum)}`,
    );
  }
  return normalized;
}

function booleanValue(
  value: unknown,
  path: string,
): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${path} must be boolean`);
  }
  return value;
}

function preference(
  value: unknown,
  path: string,
  allowTie = true,
): PiperPanelV2Preference {
  if (typeof value !== "string") {
    throw new Error(`${path} must be A, B, or tie`);
  }
  const compact = value.trim().toLowerCase();
  const normalized =
    compact === "a" || compact === "version a"
      ? "A"
      : compact === "b" || compact === "version b"
        ? "B"
        : compact === "tie"
          ? "tie"
          : null;
  if (
    normalized === null ||
    (!allowTie && normalized === "tie")
  ) {
    throw new Error(`${path} must be A${allowTie ? ", B, or tie" : " or B"}`);
  }
  return normalized;
}

function severity(
  value: unknown,
  path: string,
): PiperPanelV2Severity {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a severity string`);
  }
  const compact = value.trim().toLowerCase();
  if (["none", "no issue"].includes(compact)) return "none";
  if (["low", "mild", "slight", "minor"].includes(compact)) {
    return "minor";
  }
  if (["medium", "moderate"].includes(compact)) {
    return "moderate";
  }
  if (["high", "serious", "major"].includes(compact)) {
    return "major";
  }
  if (["severe", "critical"].includes(compact)) {
    return "critical";
  }
  throw new Error(`${path} contains an unsupported severity`);
}

function scores(
  value: unknown,
  path: string,
): PiperPanelV2Scores {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object`);
  }
  assertExactKeys(value, SCORE_DIMENSIONS, path);
  return Object.fromEntries(
    SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      integerInRange(
        value[dimension],
        1,
        5,
        `${path}.${dimension}`,
      ),
    ]),
  ) as unknown as PiperPanelV2Scores;
}

function perspectiveId(
  value: unknown,
  expected: PiperPanelV2PerspectiveId,
): PiperPanelV2PerspectiveId {
  if (value !== expected) {
    throw new Error(
      `judge.perspective_id must equal ${expected}`,
    );
  }
  return expected;
}

export function piperPanelV2Tool(
  assignment: AiBlindJudgeAssignment,
): Readonly<Record<string, unknown>> {
  const pairIds = assignment.pairs.map(
    (pair) => pair.neutralPairLabel,
  );
  const tablePair = assignment.pairs.find(
    (pair) => pair.tableEvaluation,
  );
  if (
    pairIds.length !== 5 ||
    new Set(pairIds).size !== 5 ||
    !tablePair
  ) {
    throw new Error(
      "The blind assignment must contain five pairs and one table pair",
    );
  }
  const scoreProperties = Object.fromEntries(
    SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      { type: "integer", minimum: 1, maximum: 5 },
    ]),
  );
  const scoreSchema = {
    type: "object",
    additionalProperties: false,
    required: [...SCORE_DIMENSIONS],
    properties: scoreProperties,
  };
  const preferenceSchema = {
    type: "string",
    enum: ["A", "B", "tie"],
  };
  const concise = {
    type: "string",
    minLength: 1,
    maxLength: 300,
  };
  const pairProperties = {
    pair_id: { type: "string", enum: pairIds },
    a: scoreSchema,
    b: scoreSchema,
    preferred_overall: preferenceSchema,
    clearer: preferenceSchema,
    more_natural: preferenceSchema,
    better_paced: preferenceSchema,
    preferred_for_long_lesson: preferenceSchema,
    a_too_slow: { type: "boolean" },
    b_too_slow: { type: "boolean" },
    a_too_fast: { type: "boolean" },
    b_too_fast: { type: "boolean" },
    pronunciation_issues: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["version", "severity", "description"],
        properties: {
          version: { type: "string", enum: ["A", "B"] },
          severity: { type: "string" },
          description: concise,
        },
      },
    },
    confidence: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },
    reason: concise,
  };
  return {
    type: "function",
    function: {
      name: PIPER_PANEL_V2_TOOL_NAME,
      description:
        "Submit one concise, complete, independent blind evaluation of all ten audio clips.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        required: [
          "judge",
          "pairs",
          "table_evaluation",
          "overall",
        ],
        properties: {
          judge: {
            type: "object",
            additionalProperties: false,
            required: ["perspective_id", "confidence"],
            properties: {
              perspective_id: {
                type: "string",
                const: assignment.judgeId,
              },
              confidence: {
                type: "integer",
                minimum: 0,
                maximum: 100,
              },
            },
          },
          pairs: {
            type: "array",
            minItems: 5,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: Object.keys(pairProperties),
              properties: pairProperties,
            },
          },
          table_evaluation: {
            type: "object",
            additionalProperties: false,
            required: [
              "pair_id",
              "easier_to_follow",
              "repeated_labels_helpful",
              "duration_excessive",
              "clarity_justifies_duration",
              "concise_variant_recommended",
              "confidence",
              "reason",
            ],
            properties: {
              pair_id: {
                type: "string",
                const: tablePair.neutralPairLabel,
              },
              easier_to_follow: preferenceSchema,
              repeated_labels_helpful: {
                type: "boolean",
              },
              duration_excessive: { type: "boolean" },
              clarity_justifies_duration: {
                type: "boolean",
              },
              concise_variant_recommended: {
                type: "boolean",
              },
              confidence: {
                type: "integer",
                minimum: 0,
                maximum: 100,
              },
              reason: concise,
            },
          },
          overall: {
            type: "object",
            additionalProperties: false,
            required: [
              "best_pipeline_across_pairs",
              "suitable_for_professional_academy",
              "suitable_for_15_to_30_minutes",
              "main_strength",
              "main_concern",
            ],
            properties: {
              best_pipeline_across_pairs: preferenceSchema,
              suitable_for_professional_academy: {
                type: "boolean",
              },
              suitable_for_15_to_30_minutes: {
                type: "boolean",
              },
              main_strength: concise,
              main_concern: concise,
            },
          },
        },
      },
    },
  };
}

export function parsePiperPanelV2ToolArguments(input: {
  argumentsJson: string;
  assignment: AiBlindJudgeAssignment;
}): PiperPanelV2Evaluation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.argumentsJson) as unknown;
  } catch {
    throw new Error("function.arguments is not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new Error("function.arguments must be an object");
  }
  assertExactKeys(
    parsed,
    ["judge", "pairs", "table_evaluation", "overall"],
    "$",
  );
  if (!isRecord(parsed.judge)) {
    throw new Error("$.judge must be an object");
  }
  assertExactKeys(
    parsed.judge,
    ["perspective_id", "confidence"],
    "$.judge",
  );
  const expectedPerspective =
    input.assignment.judgeId as PiperPanelV2PerspectiveId;
  if (!PERSPECTIVE_IDS.includes(expectedPerspective)) {
    throw new Error("Assignment perspective is unsupported");
  }
  if (
    !Array.isArray(parsed.pairs) ||
    parsed.pairs.length !== 5
  ) {
    throw new Error("$.pairs must contain exactly five records");
  }
  const expectedPairs = new Map(
    input.assignment.pairs.map((pair) => [
      pair.neutralPairLabel,
      pair,
    ]),
  );
  const seen = new Set<string>();
  const normalizedPairs = parsed.pairs.map(
    (candidate, pairIndex): PiperPanelV2Pair => {
      const path = `$.pairs[${String(pairIndex)}]`;
      if (!isRecord(candidate)) {
        throw new Error(`${path} must be an object`);
      }
      assertExactKeys(
        candidate,
        [
          "pair_id",
          "a",
          "b",
          ...PAIR_PREFERENCE_FIELDS,
          "a_too_slow",
          "b_too_slow",
          "a_too_fast",
          "b_too_fast",
          "pronunciation_issues",
          "confidence",
          "reason",
        ],
        path,
      );
      const pairId = trimRequiredString(
        candidate.pair_id,
        `${path}.pair_id`,
      );
      if (
        !expectedPairs.has(pairId) ||
        seen.has(pairId)
      ) {
        throw new Error(
          `${path}.pair_id is missing, duplicated, or unknown`,
        );
      }
      seen.add(pairId);
      if (!Array.isArray(candidate.pronunciation_issues)) {
        throw new Error(
          `${path}.pronunciation_issues must be an array`,
        );
      }
      const issues = candidate.pronunciation_issues.map(
        (issue, issueIndex): PiperPanelV2PronunciationIssue => {
          const issuePath = `${path}.pronunciation_issues[${String(
            issueIndex,
          )}]`;
          if (!isRecord(issue)) {
            throw new Error(`${issuePath} must be an object`);
          }
          assertExactKeys(
            issue,
            ["version", "severity", "description"],
            issuePath,
          );
          return {
            version: preference(
              issue.version,
              `${issuePath}.version`,
              false,
            ) as "A" | "B",
            severity: severity(
              issue.severity,
              `${issuePath}.severity`,
            ),
            description: auditoryEvidence(
              issue.description,
              `${issuePath}.description`,
            ),
          };
        },
      );
      return {
        pair_id: pairId,
        a: scores(candidate.a, `${path}.a`),
        b: scores(candidate.b, `${path}.b`),
        preferred_overall: preference(
          candidate.preferred_overall,
          `${path}.preferred_overall`,
        ),
        clearer: preference(
          candidate.clearer,
          `${path}.clearer`,
        ),
        more_natural: preference(
          candidate.more_natural,
          `${path}.more_natural`,
        ),
        better_paced: preference(
          candidate.better_paced,
          `${path}.better_paced`,
        ),
        preferred_for_long_lesson: preference(
          candidate.preferred_for_long_lesson,
          `${path}.preferred_for_long_lesson`,
        ),
        a_too_slow: booleanValue(
          candidate.a_too_slow,
          `${path}.a_too_slow`,
        ),
        b_too_slow: booleanValue(
          candidate.b_too_slow,
          `${path}.b_too_slow`,
        ),
        a_too_fast: booleanValue(
          candidate.a_too_fast,
          `${path}.a_too_fast`,
        ),
        b_too_fast: booleanValue(
          candidate.b_too_fast,
          `${path}.b_too_fast`,
        ),
        pronunciation_issues: issues,
        confidence: integerInRange(
          candidate.confidence,
          0,
          100,
          `${path}.confidence`,
        ),
        reason: auditoryEvidence(
          candidate.reason,
          `${path}.reason`,
        ),
      };
    },
  );
  if (
    seen.size !== expectedPairs.size ||
    [...expectedPairs.keys()].some(
      (pairId) => !seen.has(pairId),
    )
  ) {
    throw new Error(
      "The response does not evaluate all five assigned pairs",
    );
  }
  if (!isRecord(parsed.table_evaluation)) {
    throw new Error("$.table_evaluation must be an object");
  }
  const table = parsed.table_evaluation;
  assertExactKeys(
    table,
    [
      "pair_id",
      "easier_to_follow",
      "repeated_labels_helpful",
      "duration_excessive",
      "clarity_justifies_duration",
      "concise_variant_recommended",
      "confidence",
      "reason",
    ],
    "$.table_evaluation",
  );
  const expectedTable = input.assignment.pairs.find(
    (pair) => pair.tableEvaluation,
  )?.neutralPairLabel;
  const tablePairId = trimRequiredString(
    table.pair_id,
    "$.table_evaluation.pair_id",
  );
  if (!expectedTable || tablePairId !== expectedTable) {
    throw new Error(
      "$.table_evaluation.pair_id must be the assigned table pair",
    );
  }
  if (!isRecord(parsed.overall)) {
    throw new Error("$.overall must be an object");
  }
  const overall = parsed.overall;
  assertExactKeys(
    overall,
    [
      "best_pipeline_across_pairs",
      "suitable_for_professional_academy",
      "suitable_for_15_to_30_minutes",
      "main_strength",
      "main_concern",
    ],
    "$.overall",
  );
  const result: PiperPanelV2Evaluation = {
    judge: {
      perspective_id: perspectiveId(
        parsed.judge.perspective_id,
        expectedPerspective,
      ),
      confidence: integerInRange(
        parsed.judge.confidence,
        0,
        100,
        "$.judge.confidence",
      ),
    },
    pairs: normalizedPairs,
    table_evaluation: {
      pair_id: tablePairId,
      easier_to_follow: preference(
        table.easier_to_follow,
        "$.table_evaluation.easier_to_follow",
      ),
      repeated_labels_helpful: booleanValue(
        table.repeated_labels_helpful,
        "$.table_evaluation.repeated_labels_helpful",
      ),
      duration_excessive: booleanValue(
        table.duration_excessive,
        "$.table_evaluation.duration_excessive",
      ),
      clarity_justifies_duration: booleanValue(
        table.clarity_justifies_duration,
        "$.table_evaluation.clarity_justifies_duration",
      ),
      concise_variant_recommended: booleanValue(
        table.concise_variant_recommended,
        "$.table_evaluation.concise_variant_recommended",
      ),
      confidence: integerInRange(
        table.confidence,
        0,
        100,
        "$.table_evaluation.confidence",
      ),
      reason: auditoryEvidence(
        table.reason,
        "$.table_evaluation.reason",
      ),
    },
    overall: {
      best_pipeline_across_pairs: preference(
        overall.best_pipeline_across_pairs,
        "$.overall.best_pipeline_across_pairs",
      ),
      suitable_for_professional_academy: booleanValue(
        overall.suitable_for_professional_academy,
        "$.overall.suitable_for_professional_academy",
      ),
      suitable_for_15_to_30_minutes: booleanValue(
        overall.suitable_for_15_to_30_minutes,
        "$.overall.suitable_for_15_to_30_minutes",
      ),
      main_strength: trimRequiredString(
        overall.main_strength,
        "$.overall.main_strength",
        35,
      ),
      main_concern: trimRequiredString(
        overall.main_concern,
        "$.overall.main_concern",
        35,
      ),
    },
  };
  return result;
}

export function piperPanelV2ArgumentsFromEnvelope(
  envelope: unknown,
): string {
  if (
    !isRecord(envelope) ||
    !Array.isArray(envelope.choices) ||
    envelope.choices.length !== 1 ||
    !isRecord(envelope.choices[0]) ||
    !isRecord(envelope.choices[0].message)
  ) {
    throw new Error(
      "Response must contain exactly one assistant choice",
    );
  }
  const calls = envelope.choices[0].message.tool_calls;
  if (!Array.isArray(calls)) {
    throw new Error("Response contains no tool calls");
  }
  const matching = calls.filter(
    (call) =>
      isRecord(call) &&
      call.type === "function" &&
      isRecord(call.function) &&
      call.function.name ===
        PIPER_PANEL_V2_TOOL_NAME,
  );
  if (
    matching.length !== 1 ||
    !isRecord(matching[0]) ||
    !isRecord(matching[0].function) ||
    typeof matching[0].function.arguments !== "string"
  ) {
    throw new Error(
      "Response must contain exactly one matching submit_audio_evaluation call",
    );
  }
  return matching[0].function.arguments;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort(
    (left, right) => left - right,
  );
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]!
    : (ordered[middle - 1]! + ordered[middle]!) / 2;
}

function mean(values: readonly number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) /
        values.length;
}

function choicePipeline(
  choice: PiperPanelV2Preference,
  correctedVersion: "A" | "B",
): "corrected" | "baseline" | "tie" {
  if (choice === "tie") return "tie";
  return choice === correctedVersion
    ? "corrected"
    : "baseline";
}

export interface PiperPanelV2Aggregate {
  schemaVersion: "tenxpros-piper-panel-v2-aggregate-v1";
  validPerspectiveCount: number;
  correctedPairMajorityWins: number;
  pairResults: Readonly<
    Record<
      string,
      {
        correctedVotes: number;
        baselineVotes: number;
        tieVotes: number;
        majority:
          | "corrected"
          | "baseline"
          | "tie";
        agreementRate: number;
      }
    >
  >;
  correctedOverallPreferenceRate: number | null;
  confidenceWeightedCorrectedPreferenceRate:
    | number
    | null;
  correctedPreferenceRates: Readonly<
    Record<
      (typeof PAIR_PREFERENCE_FIELDS)[number],
      number | null
    >
  >;
  dimensionScores: {
    corrected: Record<AiAudioScoreDimension, number | null>;
    baseline: Record<AiAudioScoreDimension, number | null>;
  };
  pacing: {
    correctedTooSlowRate: number | null;
    correctedTooFastRate: number | null;
    correctedTooSlowMajoritySampleIds: readonly string[];
    correctedTooFastMajoritySampleIds: readonly string[];
  };
  table: {
    correctedEasierRate: number | null;
    repeatedLabelsHelpfulRate: number | null;
    durationExcessiveRate: number | null;
    clarityJustifiesDurationRate: number | null;
    conciseVariantRecommendedRate: number | null;
    efficiencyPass: boolean;
  };
  judgeAgreementMean: number | null;
  meanConfidence: number | null;
  professionalAcademySuitableRate: number | null;
  longFormSuitableRate: number | null;
  pronunciationIssues: readonly {
    perspectiveId: PiperPanelV2PerspectiveId;
    sourceSampleId: string;
    pipeline: "corrected" | "baseline";
    severity: PiperPanelV2Severity;
    description: string;
  }[];
  decisiveEvidence: readonly string[];
  dissentingEvidence: readonly string[];
  metrics: AiBryceDecisionMetrics;
  libraryDecision: AiNarrationDecision;
  perceptualDecision:
    | "PASS_PIPER_BRYCE"
    | "TUNE_PIPER_PIPELINE"
    | "TEST_OTHER_LOCAL_VOICES"
    | "CONSIDER_ELEVENLABS"
    | "INCONCLUSIVE_AI_ONLY_EVALUATION";
  aggregateHash: string;
}

export function aggregatePiperPanelV2(input: {
  runs: readonly PiperPanelV2Run[];
  privateSamples: readonly AiPrivateSampleIdentity[];
  objective: AiObjectiveAnalysisSummary;
}): PiperPanelV2Aggregate {
  const uniquePerspectives = new Set(
    input.runs.map((run) => run.perspectiveId),
  );
  if (
    input.runs.length < 1 ||
    input.runs.length > 5 ||
    uniquePerspectives.size !== input.runs.length
  ) {
    throw new Error(
      "A panel summary requires one to five unique valid perspectives",
    );
  }
  const identities = new Map(
    input.privateSamples.map((sample) => [
      sample.sourceSampleId,
      sample,
    ]),
  );
  const correctedScores = Object.fromEntries(
    SCORE_DIMENSIONS.map((dimension) => [dimension, []]),
  ) as unknown as Record<AiAudioScoreDimension, number[]>;
  const baselineScores = Object.fromEntries(
    SCORE_DIMENSIONS.map((dimension) => [dimension, []]),
  ) as unknown as Record<AiAudioScoreDimension, number[]>;
  const pairVotes = new Map<
    string,
    {
      corrected: number;
      baseline: number;
      tie: number;
      confidenceCorrected: number;
      confidenceTotal: number;
    }
  >();
  const tableCorrected: boolean[] = [];
  const tableRepeated: boolean[] = [];
  const tableExcessive: boolean[] = [];
  const tableJustifies: boolean[] = [];
  const tableConcise: boolean[] = [];
  const confidences: number[] = [];
  const professionalSuitable: boolean[] = [];
  const longSuitable: boolean[] = [];
  const slowByCorrectedSample = new Map<string, number>();
  const fastByCorrectedSample = new Map<string, number>();
  const pronunciationIssues: PiperPanelV2Aggregate["pronunciationIssues"][number][] =
    [];
  const correctedPreferenceVotes = Object.fromEntries(
    PAIR_PREFERENCE_FIELDS.map((field) => [
      field,
      { corrected: 0, baseline: 0, tie: 0 },
    ]),
  ) as Record<
    (typeof PAIR_PREFERENCE_FIELDS)[number],
    { corrected: number; baseline: number; tie: number }
  >;
  const correctedTooSlowFlags: boolean[] = [];
  const correctedTooFastFlags: boolean[] = [];
  const mappedDissent: string[] = [];

  for (const run of input.runs) {
    confidences.push(run.evaluation.judge.confidence);
    professionalSuitable.push(
      run.evaluation.overall.suitable_for_professional_academy,
    );
    longSuitable.push(
      run.evaluation.overall.suitable_for_15_to_30_minutes,
    );
    for (const pairResponse of run.evaluation.pairs) {
      const pair = run.assignment.pairs.find(
        (candidate) =>
          candidate.neutralPairLabel ===
          pairResponse.pair_id,
      );
      if (!pair) {
        throw new Error(
          "Validated response no longer matches its assignment",
        );
      }
      const aIdentity = identities.get(
        pair.clips[0].sourceSampleId,
      );
      const bIdentity = identities.get(
        pair.clips[1].sourceSampleId,
      );
      if (
        !aIdentity ||
        !bIdentity ||
        aIdentity.pipeline === bIdentity.pipeline
      ) {
        throw new Error(
          "Private sample mapping is incomplete or ambiguous",
        );
      }
      const correctedVersion: "A" | "B" =
        aIdentity.pipeline === "corrected" ? "A" : "B";
      const correctedIdentity =
        correctedVersion === "A"
          ? aIdentity
          : bIdentity;
      const correctedPairScores =
        correctedVersion === "A"
          ? pairResponse.a
          : pairResponse.b;
      const baselinePairScores =
        correctedVersion === "A"
          ? pairResponse.b
          : pairResponse.a;
      for (const dimension of SCORE_DIMENSIONS) {
        correctedScores[dimension].push(
          correctedPairScores[dimension],
        );
        baselineScores[dimension].push(
          baselinePairScores[dimension],
        );
      }
      const pipelineChoice = choicePipeline(
        pairResponse.preferred_overall,
        correctedVersion,
      );
      for (const field of PAIR_PREFERENCE_FIELDS) {
        const mapped = choicePipeline(
          pairResponse[field],
          correctedVersion,
        );
        correctedPreferenceVotes[field][mapped] += 1;
      }
      const vote = pairVotes.get(pair.sourcePairId) ?? {
        corrected: 0,
        baseline: 0,
        tie: 0,
        confidenceCorrected: 0,
        confidenceTotal: 0,
      };
      vote[pipelineChoice] += 1;
      if (pipelineChoice === "corrected") {
        vote.confidenceCorrected +=
          pairResponse.confidence;
      }
      vote.confidenceTotal += pairResponse.confidence;
      pairVotes.set(pair.sourcePairId, vote);
      const correctedTooSlow =
        correctedVersion === "A"
          ? pairResponse.a_too_slow
          : pairResponse.b_too_slow;
      if (correctedTooSlow) {
        slowByCorrectedSample.set(
          correctedIdentity.sourceSampleId,
          (slowByCorrectedSample.get(
            correctedIdentity.sourceSampleId,
          ) ?? 0) + 1,
        );
      }
      correctedTooSlowFlags.push(correctedTooSlow);
      const correctedTooFast =
        correctedVersion === "A"
          ? pairResponse.a_too_fast
          : pairResponse.b_too_fast;
      correctedTooFastFlags.push(correctedTooFast);
      if (correctedTooFast) {
        fastByCorrectedSample.set(
          correctedIdentity.sourceSampleId,
          (fastByCorrectedSample.get(
            correctedIdentity.sourceSampleId,
          ) ?? 0) + 1,
        );
      }
      if (pipelineChoice === "baseline") {
        mappedDissent.push(
          `${run.perspectiveId} preferred baseline for ${pair.sourcePairId}: ${pairResponse.reason}`,
        );
      }
      for (const issue of pairResponse.pronunciation_issues) {
        const issueIdentity =
          issue.version === "A"
            ? aIdentity
            : bIdentity;
        pronunciationIssues.push({
          perspectiveId: run.perspectiveId,
          sourceSampleId:
            issueIdentity.sourceSampleId,
          pipeline: issueIdentity.pipeline,
          severity: issue.severity,
          description: issue.description,
        });
      }
      if (pair.tableEvaluation) {
        const table = run.evaluation.table_evaluation;
        const mappedTableChoice = choicePipeline(
          table.easier_to_follow,
          correctedVersion,
        );
        tableCorrected.push(mappedTableChoice === "corrected");
        if (mappedTableChoice === "baseline") {
          mappedDissent.push(
            `${run.perspectiveId} found the baseline table easier to follow: ${table.reason}`,
          );
        }
        tableRepeated.push(
          table.repeated_labels_helpful,
        );
        tableExcessive.push(table.duration_excessive);
        tableJustifies.push(
          table.clarity_justifies_duration,
        );
        tableConcise.push(
          table.concise_variant_recommended,
        );
      }
    }
    if (
      !run.evaluation.overall
        .suitable_for_professional_academy ||
      !run.evaluation.overall
        .suitable_for_15_to_30_minutes
    ) {
      mappedDissent.push(
        `${run.perspectiveId} concern: ${run.evaluation.overall.main_concern}`,
      );
    }
  }

  const pairResults: PiperPanelV2Aggregate["pairResults"] =
    Object.fromEntries(
      [...pairVotes.entries()].map(([pairId, vote]) => {
        const max = Math.max(
          vote.corrected,
          vote.baseline,
          vote.tie,
        );
        const majority =
          vote.corrected > input.runs.length / 2
            ? "corrected"
            : vote.baseline > input.runs.length / 2
              ? "baseline"
              : "tie";
        return [
          pairId,
          {
            correctedVotes: vote.corrected,
            baselineVotes: vote.baseline,
            tieVotes: vote.tie,
            majority,
            agreementRate: max / input.runs.length,
          },
        ];
      }),
    );
  const correctedPairMajorityWins = Object.values(
    pairResults,
  ).filter((result) => result.majority === "corrected").length;
  const totalVotes = [...pairVotes.values()].reduce(
    (sum, vote) =>
      sum + vote.corrected + vote.baseline + vote.tie,
    0,
  );
  const correctedVotes = [...pairVotes.values()].reduce(
    (sum, vote) => sum + vote.corrected,
    0,
  );
  const confidenceTotal = [...pairVotes.values()].reduce(
    (sum, vote) => sum + vote.confidenceTotal,
    0,
  );
  const confidenceCorrected = [...pairVotes.values()].reduce(
    (sum, vote) => sum + vote.confidenceCorrected,
    0,
  );
  const correctedPreferenceRates = Object.fromEntries(
    PAIR_PREFERENCE_FIELDS.map((field) => {
      const votes = correctedPreferenceVotes[field];
      const total =
        votes.corrected + votes.baseline + votes.tie;
      return [
        field,
        total === 0 ? null : votes.corrected / total,
      ];
    }),
  ) as Record<
    (typeof PAIR_PREFERENCE_FIELDS)[number],
    number | null
  >;
  const correctedMedianScores = Object.fromEntries(
    SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      median(correctedScores[dimension]),
    ]),
  ) as Record<AiAudioScoreDimension, number | null>;
  const baselineMedianScores = Object.fromEntries(
    SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      median(baselineScores[dimension]),
    ]),
  ) as Record<AiAudioScoreDimension, number | null>;
  const structuralFindings = [
    ...input.objective.blockingDefects,
    ...input.objective.regressions,
  ].filter(
    (finding) =>
      finding.severity === "blocking" ||
      !/(?:REVIEW_CANDIDATE|heuristic[-_ ]unverified)/iu.test(
        `${finding.code} ${finding.detail}`,
      ),
  );
  const semanticPauseStructurePass =
    !structuralFindings.some((finding) =>
      /\b(?:semantic|sentence|paragraph|heading|section|list|table.?row).?pause\b/iu.test(
        `${finding.code} ${finding.detail}`.replace(
          /[_-]+/gu,
          " ",
        ),
      ),
    );
  const segmentationPass =
    !structuralFindings.some((finding) =>
      /\b(?:segment\w*|truncat\w*|duplicat\w*|stitch\w*|discontinuit\w*)\b/iu.test(
        `${finding.code} ${finding.detail}`.replace(
          /[_-]+/gu,
          " ",
        ),
      ),
    );
  const tableCorrectedRate = mean(
    tableCorrected.map(Number),
  );
  const tableExcessiveRate = mean(
    tableExcessive.map(Number),
  );
  const tableJustifiesRate = mean(
    tableJustifies.map(Number),
  );
  const tableEfficiencyPass =
    tableCorrectedRate !== null &&
    tableCorrectedRate > 0.5 &&
    !(
      tableExcessiveRate !== null &&
      tableExcessiveRate > 0.5
    );
  const naturalness =
    correctedMedianScores.naturalness;
  const baselineNaturalness =
    baselineMedianScores.naturalness;
  const voiceNaturalnessAcceptable =
    naturalness !== null &&
    naturalness >= 3.8 &&
    baselineNaturalness !== null &&
    naturalness >= baselineNaturalness - 0.25;
  const fatigueAcceptable =
    (correctedMedianScores.listening_comfort ?? 0) >=
      3.8 &&
    (correctedMedianScores.long_form_suitability ?? 0) >=
      3.8;
  const nonTableCorePass =
    (correctedMedianScores.clarity ?? 0) >= 4 &&
    (correctedMedianScores.pronunciation ?? 0) >= 4 &&
    (correctedMedianScores.pause_quality ?? 0) >= 4 &&
    (correctedMedianScores.professional_quality ?? 0) >=
      3.8 &&
    fatigueAcceptable &&
    semanticPauseStructurePass &&
    segmentationPass &&
    input.objective.blockingDefects.length === 0;
  const criticalBySample = new Map<string, Set<string>>();
  for (const issue of pronunciationIssues) {
    if (
      issue.pipeline !== "corrected" ||
      issue.severity !== "critical"
    ) {
      continue;
    }
    const judges =
      criticalBySample.get(issue.sourceSampleId) ??
      new Set<string>();
    judges.add(issue.perspectiveId);
    criticalBySample.set(issue.sourceSampleId, judges);
  }
  const criticalMax = Math.max(
    0,
    ...[...criticalBySample.values()].map(
      (judges) => judges.size,
    ),
  );
  const agreementMean = mean(
    Object.values(pairResults).map(
      (result) => result.agreementRate,
    ),
  );
  const decisiveEvidence = [
    `Corrected pair majority wins: ${String(
      correctedPairMajorityWins,
    )} of 5.`,
    `Corrected overall preference rate: ${
      totalVotes === 0
        ? "unavailable"
        : `${((correctedVotes / totalVotes) * 100).toFixed(1)}%`
    }.`,
    `Table corrected-easier rate: ${
      tableCorrectedRate === null
        ? "unavailable"
        : `${(tableCorrectedRate * 100).toFixed(1)}%`
    }.`,
  ];
  const dissentingEvidence = [
    ...(agreementMean !== null && agreementMean < 0.6
      ? ["Mean pair-preference agreement is below 60%."]
      : []),
    ...mappedDissent,
  ];
  const metrics: AiBryceDecisionMetrics = {
    validJudgeCount: input.runs.length,
    correctedPairMajorityWins,
    totalPairCount: pairVotes.size,
    correctedOverallPreferenceRate:
      totalVotes === 0
        ? null
        : correctedVotes / totalVotes,
    correctedMedianScores,
    baselineNaturalnessMedian:
      baselineMedianScores.naturalness,
    criticalPronunciationMaxJudgeCount: criticalMax,
    blockingAcousticDefects:
      input.objective.blockingDefects.map(
        (finding) =>
          `${finding.code}: ${finding.detail}`,
      ),
    correctedExcessivelySlowMajoritySampleIds: [
      ...slowByCorrectedSample.entries(),
    ]
      .filter(
        ([, count]) => count > input.runs.length / 2,
      )
      .map(([sampleId]) => sampleId)
      .sort(),
    tableCorrectedClearerRate: tableCorrectedRate,
    tableAddedDurationAcceptedRate:
      tableJustifiesRate,
    tableOnlyRemainingIssue:
      nonTableCorePass && !tableEfficiencyPass,
    semanticPauseStructurePass,
    segmentationPass,
    tableEfficiencyPass,
    voiceNaturalnessAcceptable,
    fatigueAcceptable,
    panelConfidence: mean(confidences) ?? 0,
    decisiveEvidence,
    dissentingEvidence,
  };
  const libraryDecision = decideLocalNarration({
    bryce: metrics,
  });
  const perceptualDecision: PiperPanelV2Aggregate["perceptualDecision"] =
    libraryDecision.internalBranch === "TUNING"
      ? "TUNE_PIPER_PIPELINE"
      : libraryDecision.internalBranch ===
          "OTHER_LOCAL_VOICES"
        ? "TEST_OTHER_LOCAL_VOICES"
        : libraryDecision.primaryDecision ===
            "PASS_PIPER_BRYCE"
          ? "PASS_PIPER_BRYCE"
          : libraryDecision.primaryDecision ===
              "CONSIDER_ELEVENLABS"
            ? "CONSIDER_ELEVENLABS"
            : "INCONCLUSIVE_AI_ONLY_EVALUATION";
  const withoutHash = {
    schemaVersion:
      "tenxpros-piper-panel-v2-aggregate-v1" as const,
    validPerspectiveCount: input.runs.length,
    correctedPairMajorityWins,
    pairResults,
    correctedOverallPreferenceRate:
      totalVotes === 0
        ? null
        : correctedVotes / totalVotes,
    confidenceWeightedCorrectedPreferenceRate:
      confidenceTotal === 0
        ? null
        : confidenceCorrected / confidenceTotal,
    correctedPreferenceRates,
    dimensionScores: {
      corrected: correctedMedianScores,
      baseline: baselineMedianScores,
    },
    pacing: {
      correctedTooSlowRate: mean(
        correctedTooSlowFlags.map(Number),
      ),
      correctedTooFastRate: mean(
        correctedTooFastFlags.map(Number),
      ),
      correctedTooSlowMajoritySampleIds: [
        ...slowByCorrectedSample.entries(),
      ]
        .filter(([, count]) => count > input.runs.length / 2)
        .map(([sampleId]) => sampleId)
        .sort(),
      correctedTooFastMajoritySampleIds: [
        ...fastByCorrectedSample.entries(),
      ]
        .filter(([, count]) => count > input.runs.length / 2)
        .map(([sampleId]) => sampleId)
        .sort(),
    },
    table: {
      correctedEasierRate: tableCorrectedRate,
      repeatedLabelsHelpfulRate: mean(
        tableRepeated.map(Number),
      ),
      durationExcessiveRate: tableExcessiveRate,
      clarityJustifiesDurationRate:
        tableJustifiesRate,
      conciseVariantRecommendedRate: mean(
        tableConcise.map(Number),
      ),
      efficiencyPass: tableEfficiencyPass,
    },
    judgeAgreementMean: agreementMean,
    meanConfidence: mean(confidences),
    professionalAcademySuitableRate: mean(
      professionalSuitable.map(Number),
    ),
    longFormSuitableRate: mean(
      longSuitable.map(Number),
    ),
    pronunciationIssues,
    decisiveEvidence,
    dissentingEvidence,
    metrics,
    libraryDecision,
    perceptualDecision,
  };
  return {
    ...withoutHash,
    aggregateHash: hashAiValue(withoutHash),
  };
}

export function canonicalPiperPanelV2(
  value: unknown,
): string {
  return canonicalAiJson(value);
}
