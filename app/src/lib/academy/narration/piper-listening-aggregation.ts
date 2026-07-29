import type { PiperEvaluationPipeline } from "./piper-evaluation";
import {
  PHASE2B_ANALYSIS_SCHEMA_VERSION,
  PHASE2B_PRIVATE_MANIFEST_SCHEMA_VERSION,
  PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION,
  PHASE2B_SCORE_DIMENSIONS,
  parsePhase2BResponse,
  type Phase2BPrivateAnalysisManifest,
  type Phase2BPublicPackage,
  type Phase2BResponse,
  type Phase2BScoreDimension,
} from "./piper-listening-evaluation";
import {
  stableNarrationHash,
  stableNarrationStringify,
} from "./recipe";

export const PHASE2B_MIN_LISTENERS = 5;
export const PHASE2B_MAX_LISTENERS = 10;

export const PHASE2B_DECISIONS = Object.freeze([
  "PASS",
  "TUNE_AND_RETEST",
  "TEST_OTHER_LOCAL_VOICES",
  "CONSIDER_ELEVENLABS",
  "INSUFFICIENT_DATA",
] as const);

export type Phase2BDecision =
  (typeof PHASE2B_DECISIONS)[number];

export interface Phase2BResponseSubmission {
  source: string;
  value: unknown;
}

export interface Phase2BDescriptiveStatistics {
  count: number;
  mean: number | null;
  median: number | null;
}

export interface Phase2BInvalidResponse {
  sources: readonly string[];
  listener_id: string | null;
  code:
    | "CONFLICTING_LISTENER_EXPORTS"
    | "INCOMPLETE_RESPONSE"
    | "INVALID_RESPONSE";
  message: string;
}

export interface Phase2BScoreSummary {
  pipeline: PiperEvaluationPipeline;
  dimensions: Record<
    Phase2BScoreDimension,
    Phase2BDescriptiveStatistics
  >;
}

export interface Phase2BImprovementSummary {
  dimension: Phase2BScoreDimension;
  paired_difference: Phase2BDescriptiveStatistics;
  corrected_higher_count: number;
  tied_count: number;
  baseline_higher_count: number;
}

export interface Phase2BDirectionalPreferenceCounts {
  corrected: number;
  baseline: number;
  neutral: number;
  total: number;
}

export interface Phase2BLongLessonCounts {
  corrected: number;
  baseline: number;
  neither: number;
  no_preference: number;
  total: number;
}

export interface Phase2BSpeedCounts {
  corrected_only: number;
  baseline_only: number;
  both: number;
  neither: number;
  corrected_reports: number;
  baseline_reports: number;
  total: number;
}

export interface Phase2BPairPreferenceSummary {
  cohort: "original" | "pause_coverage";
  overall_preference: Phase2BDirectionalPreferenceCounts;
  easier_to_understand: Phase2BDirectionalPreferenceCounts;
  more_natural: Phase2BDirectionalPreferenceCounts;
  long_lesson_preference: Phase2BLongLessonCounts;
  too_slow: Phase2BSpeedCounts;
  too_fast: Phase2BSpeedCounts;
  strange_pronunciation: Phase2BSpeedCounts;
}

export interface Phase2BPronunciationGroup {
  pair_id: string;
  pipeline: PiperEvaluationPipeline;
  severity: "minor" | "major" | "critical";
  normalized_description: string;
  descriptions: readonly string[];
  listener_ids: readonly string[];
  unique_listener_count: number;
  report_count: number;
}

export interface Phase2BConsistencySummary {
  listener_id: string;
  concordant: number;
  discordant: number;
  comparable_answers: number;
  consistency_rate: number | null;
  flagged: boolean;
}

export interface Phase2BComment {
  listener_id: string;
  pair_id: string;
  sample_id: string;
  pipeline: PiperEvaluationPipeline;
  scope: "file" | "pair";
  text: string;
}

export type Phase2BTuningTarget =
  | "sentence_pause"
  | "paragraph_pause"
  | "table_row_pause"
  | "heading_pause"
  | "section_pause"
  | "repeated_table_labels"
  | "segmentation"
  | "loudness"
  | "playback_speed";

export interface Phase2BDecisionInput {
  valid_listener_count: number;
  original_pair_count: number;
  corrected_original_pair_wins: number;
  corrected_overall_preference_rate: number | null;
  corrected_median_scores: Record<
    Phase2BScoreDimension,
    number | null
  >;
  corrected_long_lesson_preference_rate: number | null;
  repeated_corrected_critical_pronunciation_problem_count: number;
  corrected_critical_pronunciation_adjudication_required: boolean;
  corrected_table_excessively_slow_rate: number | null;
  corrected_table_pauses_excessive_rate: number | null;
  table_concise_format_yes_rate: number | null;
  corrected_too_slow_rate: number | null;
  corrected_too_fast_rate: number | null;
  weak_pause_types: readonly string[];
  all_local_voices_failed_voice_only_criteria: boolean;
  voices_evaluated: readonly string[];
}

export interface Phase2BDecisionResult {
  recommendation: Phase2BDecision;
  criteria: {
    listener_count_in_range: boolean;
    original_pair_wins_pass: boolean;
    overall_preference_pass: boolean;
    clarity_pass: boolean;
    pronunciation_pass: boolean;
    pause_quality_pass: boolean;
    professional_quality_pass: boolean;
    long_lesson_preference_pass: boolean;
    critical_pronunciation_pass: boolean;
    table_speed_pass: boolean;
    pacing_pass: boolean;
    voice_quality_pass: boolean;
  };
  reasons: readonly string[];
  tuning_targets: readonly Phase2BTuningTarget[];
}

export interface Phase2BAggregationResult {
  schema_version: typeof PHASE2B_ANALYSIS_SCHEMA_VERSION;
  evaluation_package_id: string;
  submissions: {
    received_files: number;
    unique_submission_identities: number;
    exact_duplicates_collapsed: number;
    invalid_response_count: number;
    complete_valid_listeners: number;
    completion_rate: number | null;
    listener_count_in_range: boolean;
  };
  scores: {
    by_file: Record<string, Phase2BScoreSummary>;
    by_pipeline: Record<
      PiperEvaluationPipeline,
      Record<
        Phase2BScoreDimension,
        Phase2BDescriptiveStatistics
      >
    >;
    corrected_improvement: Record<
      Phase2BScoreDimension,
      Phase2BImprovementSummary
    >;
  };
  preferences: {
    by_pair: Record<string, Phase2BPairPreferenceSummary>;
    original_pair_outcomes: Record<
      string,
      "corrected" | "baseline" | "tie"
    >;
    corrected_original_pair_wins: number;
    original_pair_count: number;
    corrected_original_pair_win_rate: number | null;
    corrected_overall_preference: {
      corrected: number;
      baseline: number;
      no_preference: number;
      total: number;
      rate: number | null;
    };
    corrected_long_lesson_preference: {
      corrected: number;
      baseline: number;
      neither: number;
      no_preference: number;
      total: number;
      rate: number | null;
    };
    speed: {
      too_slow: Phase2BSpeedCounts;
      too_fast: Phase2BSpeedCounts;
      corrected_too_slow_rate: number | null;
      corrected_too_fast_rate: number | null;
    };
  };
  table_efficiency: {
    pair_id: string;
    easier_to_understand: Phase2BDirectionalPreferenceCounts;
    repeated_labels_usefulness: Phase2BDescriptiveStatistics;
    excessively_slow: Phase2BSpeedCounts;
    pauses_excessive: Phase2BSpeedCounts;
    prefer_longer_clearer: {
      yes: number;
      no: number;
      not_applicable: number;
      total: number;
      yes_rate: number | null;
    };
    test_more_concise_format: {
      yes: number;
      no: number;
      unsure: number;
      total: number;
      yes_rate: number | null;
    };
    corrected_excessively_slow_rate: number | null;
    corrected_rejected_by_majority: boolean;
  };
  pronunciation: {
    groups: readonly Phase2BPronunciationGroup[];
    repeated_corrected_critical_groups: readonly Phase2BPronunciationGroup[];
    corrected_critical_adjudication_pair_ids: readonly string[];
    severity_counts_by_pipeline: Record<
      PiperEvaluationPipeline,
      Record<"minor" | "major" | "critical", number>
    >;
  };
  consistency: {
    listeners: readonly Phase2BConsistencySummary[];
    cohort_rate: Phase2BDescriptiveStatistics;
    flagged_listener_ids: readonly string[];
  };
  comments: {
    by_sample: Record<string, readonly Phase2BComment[]>;
    by_pipeline: Record<
      PiperEvaluationPipeline,
      readonly Phase2BComment[]
    >;
  };
  invalid_responses: readonly Phase2BInvalidResponse[];
  decision: Phase2BDecisionResult;
}

interface ResolvedSample {
  sampleId: string;
  pairId: string;
  label: "A" | "B";
  pipeline: PiperEvaluationPipeline;
}

interface ResolvedPair {
  pairId: string;
  cohort: "original" | "pause_coverage";
  pauseTypes: readonly string[];
  samples: readonly [ResolvedSample, ResolvedSample];
  byLabel: Readonly<Record<"A" | "B", ResolvedSample>>;
}

interface ResolvedPackage {
  pairs: readonly ResolvedPair[];
  byPair: ReadonlyMap<string, ResolvedPair>;
  bySample: ReadonlyMap<string, ResolvedSample>;
}

function isObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function stats(values: readonly number[]): Phase2BDescriptiveStatistics {
  if (values.length === 0) {
    return { count: 0, mean: null, median: null };
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? null);
  return {
    count: values.length,
    mean:
      values.reduce((total, value) => total + value, 0) /
      values.length,
    median,
  };
}

function sortedRecord<T>(
  entries: readonly (readonly [string, T])[],
): Record<string, T> {
  return Object.fromEntries(
    [...entries].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function emptyDirectional(): Phase2BDirectionalPreferenceCounts {
  return { corrected: 0, baseline: 0, neutral: 0, total: 0 };
}

function emptyLongLesson(): Phase2BLongLessonCounts {
  return {
    corrected: 0,
    baseline: 0,
    neither: 0,
    no_preference: 0,
    total: 0,
  };
}

function emptySpeed(): Phase2BSpeedCounts {
  return {
    corrected_only: 0,
    baseline_only: 0,
    both: 0,
    neither: 0,
    corrected_reports: 0,
    baseline_reports: 0,
    total: 0,
  };
}

function addDirectional(
  counts: Phase2BDirectionalPreferenceCounts,
  choice: "A" | "B" | "same" | "no_preference",
  pair: ResolvedPair,
): void {
  counts.total += 1;
  if (choice === "same" || choice === "no_preference") {
    counts.neutral += 1;
    return;
  }
  counts[pair.byLabel[choice].pipeline] += 1;
}

function addLongLesson(
  counts: Phase2BLongLessonCounts,
  choice: "A" | "B" | "neither" | "no_preference",
  pair: ResolvedPair,
): void {
  counts.total += 1;
  if (choice === "neither" || choice === "no_preference") {
    counts[choice] += 1;
    return;
  }
  counts[pair.byLabel[choice].pipeline] += 1;
}

function addSpeed(
  counts: Phase2BSpeedCounts,
  choice: "A" | "B" | "both" | "neither",
  pair: ResolvedPair,
): void {
  counts.total += 1;
  if (choice === "both") {
    counts.both += 1;
    counts.corrected_reports += 1;
    counts.baseline_reports += 1;
    return;
  }
  if (choice === "neither") {
    counts.neither += 1;
    return;
  }
  const pipeline = pair.byLabel[choice].pipeline;
  if (pipeline === "corrected") {
    counts.corrected_only += 1;
    counts.corrected_reports += 1;
  } else {
    counts.baseline_only += 1;
    counts.baseline_reports += 1;
  }
}

function combineSpeed(
  summaries: readonly Phase2BSpeedCounts[],
): Phase2BSpeedCounts {
  const combined = emptySpeed();
  for (const summary of summaries) {
    for (const key of Object.keys(combined) as (keyof Phase2BSpeedCounts)[]) {
      combined[key] += summary[key];
    }
  }
  return combined;
}

function resolvePackage(
  manifest: Phase2BPrivateAnalysisManifest,
  publicPackage: Phase2BPublicPackage,
): ResolvedPackage {
  if (
    manifest.schemaVersion !==
      PHASE2B_PRIVATE_MANIFEST_SCHEMA_VERSION ||
    publicPackage.schema_version !==
      PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION ||
    typeof manifest.allLocalVoicesFailedVoiceOnlyCriteria !==
      "boolean" ||
    !Array.isArray(manifest.voicesEvaluated) ||
    manifest.voicesEvaluated.some(
      (voice) =>
        typeof voice !== "string" ||
        !["bryce", "linda", "cori"].includes(voice),
    ) ||
    new Set(manifest.voicesEvaluated).size !==
      manifest.voicesEvaluated.length
  ) {
    throw new Error("Unsupported private or public package schema");
  }
  if (
    manifest.evaluationPackageId !==
      publicPackage.evaluation_package_id ||
    !/^blind-review-[a-f0-9]{16}$/u.test(
      manifest.evaluationPackageId,
    )
  ) {
    throw new Error("Private manifest and public package id do not match");
  }
  const publicPairIds = publicPackage.pairs.map((pair) => pair.pair_id);
  const privatePairIds = manifest.pairs.map((pair) => pair.pairId);
  if (
    new Set(publicPairIds).size !== publicPairIds.length ||
    new Set(privatePairIds).size !== privatePairIds.length ||
    [...publicPairIds].sort().join("\0") !==
      [...privatePairIds].sort().join("\0")
  ) {
    throw new Error("Private and public pair sets do not match");
  }
  if (
    manifest.originalPairIds.length !== 4 ||
    new Set(manifest.originalPairIds).size !== 4 ||
    !manifest.originalPairIds.every((id) => privatePairIds.includes(id))
  ) {
    throw new Error("The private manifest must identify four original pairs");
  }
  if (
    !privatePairIds.includes(manifest.tablePairId) ||
    publicPackage.pairs.filter((pair) => pair.table_efficiency).length !==
      1 ||
    !publicPackage.pairs.find(
      (pair) => pair.pair_id === manifest.tablePairId,
    )?.table_efficiency
  ) {
    throw new Error("The table-efficiency pair is inconsistent");
  }

  const privateById = new Map(
    manifest.pairs.map((pair) => [pair.pairId, pair]),
  );
  const sampleIds = new Set<string>();
  const pairs = publicPackage.pairs.map((publicPair): ResolvedPair => {
    const privatePair = privateById.get(publicPair.pair_id);
    if (!privatePair) throw new Error(`Missing ${publicPair.pair_id}`);
    const publicById = new Map(
      publicPair.samples.map((sample) => [sample.sample_id, sample]),
    );
    if (
      privatePair.samples.length !== 2 ||
      publicPair.samples.length !== 2 ||
      !["original", "pause_coverage"].includes(
        privatePair.cohort,
      ) ||
      privatePair.samples.some(
        (sample) =>
          sample.pipeline !== "baseline" &&
          sample.pipeline !== "corrected",
      ) ||
      new Set(privatePair.samples.map((sample) => sample.pipeline))
        .size !== 2
    ) {
      throw new Error(
        `${publicPair.pair_id} must contain one sample per pipeline`,
      );
    }
    const samples = privatePair.samples.map((sample): ResolvedSample => {
      const publicSample = publicById.get(sample.sampleId);
      if (
        !publicSample ||
        sample.pairId !== publicPair.pair_id ||
        publicSample.filename !== sample.filename ||
        publicSample.label !==
          sample.filename.match(/-([AB])\.mp3$/u)?.[1]
      ) {
        throw new Error(
          `${publicPair.pair_id}: public sample mapping is inconsistent`,
        );
      }
      if (sampleIds.has(sample.sampleId)) {
        throw new Error(`Duplicate sample id ${sample.sampleId}`);
      }
      sampleIds.add(sample.sampleId);
      return {
        sampleId: sample.sampleId,
        pairId: publicPair.pair_id,
        label: publicSample.label,
        pipeline: sample.pipeline,
      };
    }) as [ResolvedSample, ResolvedSample];
    const byLabel = Object.fromEntries(
      samples.map((sample) => [sample.label, sample]),
    ) as Record<"A" | "B", ResolvedSample>;
    if (!byLabel.A || !byLabel.B) {
      throw new Error(`${publicPair.pair_id}: labels must be A and B`);
    }
    return {
      pairId: publicPair.pair_id,
      cohort: privatePair.cohort,
      pauseTypes: privatePair.pauseTypesExercised,
      samples,
      byLabel,
    };
  });
  return {
    pairs,
    byPair: new Map(pairs.map((pair) => [pair.pairId, pair])),
    bySample: new Map(
      pairs.flatMap((pair) =>
        pair.samples.map((sample) => [sample.sampleId, sample] as const),
      ),
    ),
  };
}

function usableListenerId(value: unknown): string | null {
  if (!isObject(value)) return null;
  const listenerId = value.listener_id;
  return typeof listenerId === "string" &&
    /^L-[A-Z2-9]{8,16}$/u.test(listenerId)
    ? listenerId
    : null;
}

function conciseError(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown response error";
  return error.message.replace(/\s+/gu, " ").slice(0, 500);
}

function selectValidResponses(
  submissions: readonly Phase2BResponseSubmission[],
  publicPackage: Phase2BPublicPackage,
): {
  valid: readonly Phase2BResponse[];
  invalid: readonly Phase2BInvalidResponse[];
  duplicates: number;
  identities: number;
} {
  const ordered = submissions
    .map((submission, index) => ({ ...submission, index }))
    .sort(
      (left, right) =>
        left.source.localeCompare(right.source) ||
        left.index - right.index,
    );
  const groups = new Map<
    string,
    {
      listenerId: string | null;
      entries: typeof ordered;
    }
  >();
  for (const entry of ordered) {
    const listenerId = usableListenerId(entry.value);
    const key = listenerId ?? `invalid:${String(entry.index)}`;
    const group = groups.get(key) ?? {
      listenerId,
      entries: [],
    };
    group.entries.push(entry);
    groups.set(key, group);
  }

  const valid: Phase2BResponse[] = [];
  const invalid: Phase2BInvalidResponse[] = [];
  let duplicates = 0;
  for (const group of [...groups.values()].sort((left, right) =>
    (left.listenerId ?? left.entries[0]?.source ?? "").localeCompare(
      right.listenerId ?? right.entries[0]?.source ?? "",
    ),
  )) {
    const hashes = new Set(
      group.entries.map((entry) =>
        stableNarrationHash(
          entry.value,
          "academy-blind-listening-response-submission-v1",
        ),
      ),
    );
    if (hashes.size > 1 && group.listenerId) {
      invalid.push({
        sources: group.entries.map((entry) => entry.source).sort(),
        listener_id: group.listenerId,
        code: "CONFLICTING_LISTENER_EXPORTS",
        message:
          "Different exports use the same listener id; all exports for that listener were excluded.",
      });
      continue;
    }
    duplicates += group.entries.length - 1;
    const selected = group.entries[0];
    if (!selected) continue;
    try {
      const parsed = parsePhase2BResponse(
        selected.value,
        publicPackage,
      );
      if (parsed.completion.status !== "complete") {
        invalid.push({
          sources: group.entries.map((entry) => entry.source).sort(),
          listener_id: parsed.listener_id,
          code: "INCOMPLETE_RESPONSE",
          message: "Only canonical complete responses are analyzed.",
        });
      } else {
        valid.push(parsed);
      }
    } catch (error) {
      invalid.push({
        sources: group.entries.map((entry) => entry.source).sort(),
        listener_id: group.listenerId,
        code: "INVALID_RESPONSE",
        message: conciseError(error),
      });
    }
  }
  valid.sort((left, right) =>
    left.listener_id.localeCompare(right.listener_id),
  );
  invalid.sort(
    (left, right) =>
      (left.listener_id ?? "").localeCompare(right.listener_id ?? "") ||
      (left.sources[0] ?? "").localeCompare(right.sources[0] ?? ""),
  );
  return {
    valid,
    invalid,
    duplicates,
    identities: groups.size,
  };
}

function buildScoreAnalysis(
  responses: readonly Phase2BResponse[],
  resolved: ResolvedPackage,
): Phase2BAggregationResult["scores"] {
  const byFileEntries = [...resolved.bySample.values()].map((sample) => {
    const dimensions = Object.fromEntries(
      PHASE2B_SCORE_DIMENSIONS.map((dimension) => [
        dimension,
        stats(
          responses.map(
            (response) =>
              response.files[sample.sampleId]?.scores[dimension] ?? 0,
          ),
        ),
      ]),
    ) as Record<Phase2BScoreDimension, Phase2BDescriptiveStatistics>;
    return [
      sample.sampleId,
      { pipeline: sample.pipeline, dimensions },
    ] as const;
  });

  const byPipeline = Object.fromEntries(
    (["baseline", "corrected"] as const).map((pipeline) => [
      pipeline,
      Object.fromEntries(
        PHASE2B_SCORE_DIMENSIONS.map((dimension) => [
          dimension,
          stats(
            responses.flatMap((response) =>
              [...resolved.bySample.values()]
                .filter((sample) => sample.pipeline === pipeline)
                .map(
                  (sample) =>
                    response.files[sample.sampleId]?.scores[
                      dimension
                    ] ?? 0,
                ),
            ),
          ),
        ]),
      ),
    ]),
  ) as Phase2BAggregationResult["scores"]["by_pipeline"];

  const correctedImprovement = Object.fromEntries(
    PHASE2B_SCORE_DIMENSIONS.map((dimension) => {
      const differences = responses.flatMap((response) =>
        resolved.pairs.map((pair) => {
          const corrected = pair.samples.find(
            (sample) => sample.pipeline === "corrected",
          );
          const baseline = pair.samples.find(
            (sample) => sample.pipeline === "baseline",
          );
          if (!corrected || !baseline) {
            throw new Error(`${pair.pairId}: missing pipeline`);
          }
          return (
            (response.files[corrected.sampleId]?.scores[dimension] ?? 0) -
            (response.files[baseline.sampleId]?.scores[dimension] ?? 0)
          );
        }),
      );
      const summary: Phase2BImprovementSummary = {
        dimension,
        paired_difference: stats(differences),
        corrected_higher_count: differences.filter(
          (difference) => difference > 0,
        ).length,
        tied_count: differences.filter((difference) => difference === 0)
          .length,
        baseline_higher_count: differences.filter(
          (difference) => difference < 0,
        ).length,
      };
      return [dimension, summary];
    }),
  ) as Record<Phase2BScoreDimension, Phase2BImprovementSummary>;

  return {
    by_file: sortedRecord(byFileEntries),
    by_pipeline: byPipeline,
    corrected_improvement: correctedImprovement,
  };
}

function buildPairPreferences(
  responses: readonly Phase2BResponse[],
  resolved: ResolvedPackage,
): Record<string, Phase2BPairPreferenceSummary> {
  return sortedRecord(
    resolved.pairs.map((pair) => {
      const summary: Phase2BPairPreferenceSummary = {
        cohort: pair.cohort,
        overall_preference: emptyDirectional(),
        easier_to_understand: emptyDirectional(),
        more_natural: emptyDirectional(),
        long_lesson_preference: emptyLongLesson(),
        too_slow: emptySpeed(),
        too_fast: emptySpeed(),
        strange_pronunciation: emptySpeed(),
      };
      for (const response of responses) {
        const preferences = response.pairs[pair.pairId]?.preferences;
        if (!preferences) throw new Error(`Missing ${pair.pairId}`);
        addDirectional(
          summary.overall_preference,
          preferences.overall_preference ??
            (() => {
              throw new Error("Incomplete overall preference");
            })(),
          pair,
        );
        addDirectional(
          summary.easier_to_understand,
          preferences.easier_to_understand ??
            (() => {
              throw new Error("Incomplete easier preference");
            })(),
          pair,
        );
        addDirectional(
          summary.more_natural,
          preferences.more_natural ??
            (() => {
              throw new Error("Incomplete naturalness preference");
            })(),
          pair,
        );
        addLongLesson(
          summary.long_lesson_preference,
          preferences.long_lesson_preference ??
            (() => {
              throw new Error("Incomplete long-lesson preference");
            })(),
          pair,
        );
        addSpeed(
          summary.too_slow,
          preferences.too_slow ??
            (() => {
              throw new Error("Incomplete speed preference");
            })(),
          pair,
        );
        addSpeed(
          summary.too_fast,
          preferences.too_fast ??
            (() => {
              throw new Error("Incomplete speed preference");
            })(),
          pair,
        );
        addSpeed(
          summary.strange_pronunciation,
          preferences.strange_pronunciation ??
            (() => {
              throw new Error("Incomplete pronunciation preference");
            })(),
          pair,
        );
      }
      return [pair.pairId, summary] as const;
    }),
  );
}

function buildTableEfficiency(
  responses: readonly Phase2BResponse[],
  resolved: ResolvedPackage,
  tablePairId: string,
): Phase2BAggregationResult["table_efficiency"] {
  const pair = resolved.byPair.get(tablePairId);
  if (!pair) throw new Error(`Missing table pair ${tablePairId}`);
  const easier = emptyDirectional();
  const excessive = emptySpeed();
  const pauses = emptySpeed();
  const usefulness: number[] = [];
  const longer = { yes: 0, no: 0, not_applicable: 0, total: 0 };
  const concise = { yes: 0, no: 0, unsure: 0, total: 0 };
  for (const response of responses) {
    const table = response.pairs[tablePairId]?.table_efficiency;
    if (!table) throw new Error("Complete response lacks table answers");
    addDirectional(
      easier,
      table.easier_to_understand ??
        (() => {
          throw new Error("Incomplete table answer");
        })(),
      pair,
    );
    usefulness.push(
      table.repeated_labels_usefulness ??
        (() => {
          throw new Error("Incomplete table answer");
        })(),
    );
    addSpeed(
      excessive,
      table.excessively_slow ??
        (() => {
          throw new Error("Incomplete table answer");
        })(),
      pair,
    );
    addSpeed(
      pauses,
      table.pauses_excessive ??
        (() => {
          throw new Error("Incomplete table answer");
        })(),
      pair,
    );
    const longerChoice =
      table.prefer_longer_clearer ??
      (() => {
        throw new Error("Incomplete table answer");
      })();
    longer[longerChoice] += 1;
    longer.total += 1;
    const conciseChoice =
      table.test_more_concise_format ??
      (() => {
        throw new Error("Incomplete table answer");
      })();
    concise[conciseChoice] += 1;
    concise.total += 1;
  }
  const excessiveRate = rate(
    excessive.corrected_reports,
    excessive.total,
  );
  return {
    pair_id: tablePairId,
    easier_to_understand: easier,
    repeated_labels_usefulness: stats(usefulness),
    excessively_slow: excessive,
    pauses_excessive: pauses,
    prefer_longer_clearer: {
      ...longer,
      yes_rate: rate(longer.yes, longer.total),
    },
    test_more_concise_format: {
      ...concise,
      yes_rate: rate(concise.yes, concise.total),
    },
    corrected_excessively_slow_rate: excessiveRate,
    corrected_rejected_by_majority:
      excessiveRate !== null && excessiveRate > 0.5,
  };
}

export function normalizePhase2BPronunciationDescription(
  description: string,
): string {
  const normalized = description
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return normalized || "<non-lexical-description>";
}

function buildPronunciationAnalysis(
  responses: readonly Phase2BResponse[],
  resolved: ResolvedPackage,
): Phase2BAggregationResult["pronunciation"] {
  interface MutableGroup {
    pairId: string;
    pipeline: PiperEvaluationPipeline;
    severity: "minor" | "major" | "critical";
    normalized: string;
    descriptions: Set<string>;
    listenerIds: Set<string>;
    reports: number;
  }
  const groups = new Map<string, MutableGroup>();
  const criticalListenersByPair = new Map<string, Set<string>>();
  const severityCounts = {
    baseline: { minor: 0, major: 0, critical: 0 },
    corrected: { minor: 0, major: 0, critical: 0 },
  };
  for (const response of responses) {
    for (const pair of resolved.pairs) {
      const issues =
        response.pairs[pair.pairId]?.pronunciation_issues ?? [];
      for (const issue of issues) {
        const pipeline = pair.byLabel[issue.version].pipeline;
        const normalized = normalizePhase2BPronunciationDescription(
          issue.description,
        );
        const key = stableNarrationStringify([
          pair.pairId,
          pipeline,
          issue.severity,
          normalized,
        ]);
        const group = groups.get(key) ?? {
          pairId: pair.pairId,
          pipeline,
          severity: issue.severity,
          normalized,
          descriptions: new Set<string>(),
          listenerIds: new Set<string>(),
          reports: 0,
        };
        group.descriptions.add(issue.description.trim());
        group.listenerIds.add(response.listener_id);
        group.reports += 1;
        groups.set(key, group);
        severityCounts[pipeline][issue.severity] += 1;
        if (pipeline === "corrected" && issue.severity === "critical") {
          const listeners =
            criticalListenersByPair.get(pair.pairId) ??
            new Set<string>();
          listeners.add(response.listener_id);
          criticalListenersByPair.set(pair.pairId, listeners);
        }
      }
    }
  }
  const finalized: Phase2BPronunciationGroup[] = [...groups.values()]
    .map((group) => ({
      pair_id: group.pairId,
      pipeline: group.pipeline,
      severity: group.severity,
      normalized_description: group.normalized,
      descriptions: [...group.descriptions].sort(),
      listener_ids: [...group.listenerIds].sort(),
      unique_listener_count: group.listenerIds.size,
      report_count: group.reports,
    }))
    .sort(
      (left, right) =>
        left.pair_id.localeCompare(right.pair_id) ||
        left.pipeline.localeCompare(right.pipeline) ||
        left.severity.localeCompare(right.severity) ||
        left.normalized_description.localeCompare(
          right.normalized_description,
        ),
    );
  const repeated = finalized.filter(
    (group) =>
      group.pipeline === "corrected" &&
      group.severity === "critical" &&
      group.unique_listener_count > 1,
  );
  const adjudication = [...criticalListenersByPair.entries()]
    .filter(
      ([pairId, listeners]) =>
        listeners.size > 1 &&
        !repeated.some((group) => group.pair_id === pairId),
    )
    .map(([pairId]) => pairId)
    .sort();
  return {
    groups: finalized,
    repeated_corrected_critical_groups: repeated,
    corrected_critical_adjudication_pair_ids: adjudication,
    severity_counts_by_pipeline: severityCounts,
  };
}

function preferenceDirection(
  value:
    | "A"
    | "B"
    | "same"
    | "neither"
    | "no_preference",
  pair: ResolvedPair,
): PiperEvaluationPipeline | null {
  return value === "A" || value === "B"
    ? pair.byLabel[value].pipeline
    : null;
}

function scoreDirection(
  response: Phase2BResponse,
  pair: ResolvedPair,
  dimensions: readonly Phase2BScoreDimension[],
): PiperEvaluationPipeline | null {
  const score = (pipeline: PiperEvaluationPipeline): number => {
    const sample = pair.samples.find(
      (candidate) => candidate.pipeline === pipeline,
    );
    if (!sample) throw new Error(`${pair.pairId}: missing ${pipeline}`);
    return (
      dimensions.reduce(
        (total, dimension) =>
          total +
          (response.files[sample.sampleId]?.scores[dimension] ?? 0),
        0,
      ) / dimensions.length
    );
  };
  const baseline = score("baseline");
  const corrected = score("corrected");
  return corrected === baseline
    ? null
    : corrected > baseline
      ? "corrected"
      : "baseline";
}

function buildConsistency(
  responses: readonly Phase2BResponse[],
  resolved: ResolvedPackage,
): Phase2BAggregationResult["consistency"] {
  const listeners = responses.map((response) => {
    let concordant = 0;
    let discordant = 0;
    for (const pair of resolved.pairs) {
      const preferences = response.pairs[pair.pairId]?.preferences;
      if (!preferences) throw new Error(`Missing ${pair.pairId}`);
      const comparisons: readonly [
        PiperEvaluationPipeline | null,
        PiperEvaluationPipeline | null,
      ][] = [
        [
          preferenceDirection(
            preferences.overall_preference ?? "no_preference",
            pair,
          ),
          scoreDirection(response, pair, PHASE2B_SCORE_DIMENSIONS),
        ],
        [
          preferenceDirection(
            preferences.easier_to_understand ?? "same",
            pair,
          ),
          scoreDirection(response, pair, ["clarity"]),
        ],
        [
          preferenceDirection(
            preferences.more_natural ?? "same",
            pair,
          ),
          scoreDirection(response, pair, ["naturalness"]),
        ],
        [
          preferenceDirection(
            preferences.long_lesson_preference ?? "no_preference",
            pair,
          ),
          scoreDirection(response, pair, [
            "listening_comfort",
            "professional_quality",
          ]),
        ],
      ];
      for (const [preference, score] of comparisons) {
        if (!preference || !score) continue;
        if (preference === score) concordant += 1;
        else discordant += 1;
      }
    }
    const comparable = concordant + discordant;
    const consistencyRate =
      comparable < 4 ? null : concordant / comparable;
    return {
      listener_id: response.listener_id,
      concordant,
      discordant,
      comparable_answers: comparable,
      consistency_rate: consistencyRate,
      flagged:
        comparable >= 8 &&
        consistencyRate !== null &&
        consistencyRate < 0.6,
    };
  });
  return {
    listeners,
    cohort_rate: stats(
      listeners.flatMap((listener) =>
        listener.consistency_rate === null
          ? []
          : [listener.consistency_rate],
      ),
    ),
    flagged_listener_ids: listeners
      .filter((listener) => listener.flagged)
      .map((listener) => listener.listener_id),
  };
}

function buildComments(
  responses: readonly Phase2BResponse[],
  resolved: ResolvedPackage,
): Phase2BAggregationResult["comments"] {
  const bySample = new Map<string, Phase2BComment[]>(
    [...resolved.bySample.keys()].map((sampleId) => [sampleId, []]),
  );
  const byPipeline: Record<
    PiperEvaluationPipeline,
    Phase2BComment[]
  > = { baseline: [], corrected: [] };
  const add = (comment: Phase2BComment): void => {
    bySample.get(comment.sample_id)?.push(comment);
    byPipeline[comment.pipeline].push(comment);
  };
  for (const response of responses) {
    for (const pair of resolved.pairs) {
      for (const sample of pair.samples) {
        const fileText =
          response.files[sample.sampleId]?.comment?.trim();
        if (fileText) {
          add({
            listener_id: response.listener_id,
            pair_id: pair.pairId,
            sample_id: sample.sampleId,
            pipeline: sample.pipeline,
            scope: "file",
            text: fileText,
          });
        }
        const pairText =
          response.pairs[pair.pairId]?.comments?.trim();
        if (pairText) {
          add({
            listener_id: response.listener_id,
            pair_id: pair.pairId,
            sample_id: sample.sampleId,
            pipeline: sample.pipeline,
            scope: "pair",
            text: pairText,
          });
        }
      }
    }
  }
  const sortComments = (comments: Phase2BComment[]): Phase2BComment[] =>
    comments.sort(
      (left, right) =>
        left.sample_id.localeCompare(right.sample_id) ||
        left.listener_id.localeCompare(right.listener_id) ||
        left.scope.localeCompare(right.scope) ||
        left.text.localeCompare(right.text),
    );
  return {
    by_sample: sortedRecord(
      [...bySample.entries()].map(([sampleId, comments]) => [
        sampleId,
        sortComments(comments),
      ]),
    ),
    by_pipeline: {
      baseline: sortComments(byPipeline.baseline),
      corrected: sortComments(byPipeline.corrected),
    },
  };
}

function weakPauseTypes(
  responses: readonly Phase2BResponse[],
  resolved: ResolvedPackage,
): readonly string[] {
  const weak = new Set<string>();
  for (const pair of resolved.pairs) {
    const corrected = pair.samples.find(
      (sample) => sample.pipeline === "corrected",
    );
    const baseline = pair.samples.find(
      (sample) => sample.pipeline === "baseline",
    );
    if (!corrected || !baseline) continue;
    const correctedScores = responses.map(
      (response) =>
        response.files[corrected.sampleId]?.scores.pause_quality ?? 0,
    );
    const baselineScores = responses.map(
      (response) =>
        response.files[baseline.sampleId]?.scores.pause_quality ?? 0,
    );
    const correctedMedian = stats(correctedScores).median;
    const improvementMedian = stats(
      correctedScores.map(
        (score, index) => score - (baselineScores[index] ?? 0),
      ),
    ).median;
    if (
      (correctedMedian !== null && correctedMedian < 4) ||
      (improvementMedian !== null && improvementMedian < 0)
    ) {
      for (const pauseType of pair.pauseTypes) weak.add(pauseType);
    }
  }
  return [...weak].sort();
}

function tuningTargets(
  input: Phase2BDecisionInput,
  criteria: Phase2BDecisionResult["criteria"],
): readonly Phase2BTuningTarget[] {
  const targets = new Set<Phase2BTuningTarget>();
  const pauseTargets: Readonly<
    Record<string, Phase2BTuningTarget | undefined>
  > = {
    sentence: "sentence_pause",
    paragraph: "paragraph_pause",
    tableRow: "table_row_pause",
    heading: "heading_pause",
    section: "section_pause",
    list: "segmentation",
  };
  for (const pauseType of input.weak_pause_types) {
    const target = pauseTargets[pauseType];
    if (target) targets.add(target);
  }
  if (!criteria.pause_quality_pass && targets.size === 0) {
    targets.add("sentence_pause");
  }
  if (
    (input.corrected_table_pauses_excessive_rate ?? 0) > 0.5
  ) {
    targets.add("table_row_pause");
  }
  if (
    (input.table_concise_format_yes_rate ?? 0) > 0.5
  ) {
    targets.add("repeated_table_labels");
  }
  if (
    !criteria.table_speed_pass ||
    (input.corrected_too_slow_rate ?? 0) > 0.5 ||
    (input.corrected_too_fast_rate ?? 0) > 0.5
  ) {
    targets.add("playback_speed");
  }
  if (!criteria.original_pair_wins_pass) {
    targets.add("segmentation");
  }
  if (
    !criteria.clarity_pass &&
    criteria.pronunciation_pass &&
    criteria.pause_quality_pass
  ) {
    targets.add("loudness");
  }
  return [...targets].sort();
}

export function evaluatePhase2BDecision(
  input: Phase2BDecisionInput,
): Phase2BDecisionResult {
  const score = input.corrected_median_scores;
  const listenerCountInRange =
    input.valid_listener_count >= PHASE2B_MIN_LISTENERS &&
    input.valid_listener_count <= PHASE2B_MAX_LISTENERS;
  const criticalPass =
    input.repeated_corrected_critical_pronunciation_problem_count ===
      0 &&
    !input.corrected_critical_pronunciation_adjudication_required;
  const criteria: Phase2BDecisionResult["criteria"] = {
    listener_count_in_range: listenerCountInRange,
    original_pair_wins_pass:
      input.original_pair_count === 4 &&
      input.corrected_original_pair_wins >= 3,
    overall_preference_pass:
      (input.corrected_overall_preference_rate ?? 0) >= 0.6,
    clarity_pass: (score.clarity ?? 0) >= 4,
    pronunciation_pass:
      (score.pronunciation ?? 0) >= 4 && criticalPass,
    pause_quality_pass: (score.pause_quality ?? 0) >= 4,
    professional_quality_pass:
      (score.professional_quality ?? 0) >= 3.8,
    long_lesson_preference_pass:
      (input.corrected_long_lesson_preference_rate ?? 0) >= 0.7,
    critical_pronunciation_pass: criticalPass,
    table_speed_pass:
      input.corrected_table_excessively_slow_rate !== null &&
      input.corrected_table_excessively_slow_rate <= 0.5,
    pacing_pass:
      (input.corrected_too_slow_rate ?? 1) <= 0.5 &&
      (input.corrected_too_fast_rate ?? 1) <= 0.5,
    voice_quality_pass:
      (score.naturalness ?? 0) >= 3.8 &&
      (score.listening_comfort ?? 0) >= 3.8 &&
      (score.professional_quality ?? 0) >= 3.8,
  };
  const pass =
    criteria.listener_count_in_range &&
    criteria.original_pair_wins_pass &&
    criteria.overall_preference_pass &&
    criteria.clarity_pass &&
    criteria.pause_quality_pass &&
    criteria.professional_quality_pass &&
    criteria.long_lesson_preference_pass &&
    criteria.critical_pronunciation_pass &&
    criteria.table_speed_pass;

  if (!listenerCountInRange) {
    return {
      recommendation: "INSUFFICIENT_DATA",
      criteria,
      reasons: [
        `A valid cohort requires ${String(
          PHASE2B_MIN_LISTENERS,
        )}-${String(
          PHASE2B_MAX_LISTENERS,
        )} complete unique listeners; received ${String(
          input.valid_listener_count,
        )}.`,
      ],
      tuning_targets: [],
    };
  }
  if (pass) {
    return {
      recommendation: "PASS",
      criteria,
      reasons: [
        "All provisional stay-with-local-pipeline criteria passed.",
      ],
      tuning_targets: [],
    };
  }

  const semanticAndPacingPass =
    criteria.clarity_pass &&
    criteria.pronunciation_pass &&
    criteria.pause_quality_pass &&
    criteria.pacing_pass &&
    criteria.table_speed_pass;
  if (semanticAndPacingPass && !criteria.voice_quality_pass) {
    if (input.all_local_voices_failed_voice_only_criteria) {
      return {
        recommendation: "CONSIDER_ELEVENLABS",
        criteria,
        reasons: [
          "Semantic structure, pronunciation, and pacing passed, but the explicitly recorded all-local-voices comparison failed voice-only quality criteria.",
        ],
        tuning_targets: [],
      };
    }
    return {
      recommendation: "TEST_OTHER_LOCAL_VOICES",
      criteria,
      reasons: [
        "Semantic structure, pronunciation, and pacing passed, but naturalness, listening comfort, or professional voice quality remained weak.",
        `Local voices evaluated so far: ${
          input.voices_evaluated.join(", ") || "none recorded"
        }.`,
      ],
      tuning_targets: [],
    };
  }

  const failed = Object.entries(criteria)
    .filter(
      ([key, passed]) =>
        key !== "listener_count_in_range" &&
        key !== "voice_quality_pass" &&
        !passed,
    )
    .map(([key]) => key)
    .sort();
  return {
    recommendation: "TUNE_AND_RETEST",
    criteria,
    reasons: [
      `Local technical or content-type criteria need retesting: ${
        failed.join(", ") || "preference pattern"
      }.`,
      "No tuning is applied automatically.",
    ],
    tuning_targets: tuningTargets(input, criteria),
  };
}

export function aggregatePhase2BResponses(input: {
  manifest: Phase2BPrivateAnalysisManifest;
  publicPackage: Phase2BPublicPackage;
  submissions: readonly Phase2BResponseSubmission[];
}): Phase2BAggregationResult {
  const resolved = resolvePackage(input.manifest, input.publicPackage);
  const selected = selectValidResponses(
    input.submissions,
    input.publicPackage,
  );
  const responses = selected.valid;
  const scores = buildScoreAnalysis(responses, resolved);
  const byPair = buildPairPreferences(responses, resolved);
  const originalOutcomes = Object.fromEntries(
    input.manifest.originalPairIds.map((pairId) => {
      const counts = byPair[pairId]?.overall_preference;
      if (!counts) throw new Error(`Missing original pair ${pairId}`);
      const majority = responses.length / 2;
      const outcome =
        counts.corrected > majority
          ? "corrected"
          : counts.baseline > majority
            ? "baseline"
            : "tie";
      return [pairId, outcome];
    }),
  ) as Record<string, "corrected" | "baseline" | "tie">;
  const originalWins = Object.values(originalOutcomes).filter(
    (outcome) => outcome === "corrected",
  ).length;
  const allPairSummaries = Object.values(byPair);
  const overall = allPairSummaries.reduce(
    (combined, pair) => ({
      corrected: combined.corrected + pair.overall_preference.corrected,
      baseline: combined.baseline + pair.overall_preference.baseline,
      no_preference:
        combined.no_preference + pair.overall_preference.neutral,
      total: combined.total + pair.overall_preference.total,
    }),
    { corrected: 0, baseline: 0, no_preference: 0, total: 0 },
  );
  const longLesson = allPairSummaries.reduce(
    (combined, pair) => ({
      corrected:
        combined.corrected + pair.long_lesson_preference.corrected,
      baseline:
        combined.baseline + pair.long_lesson_preference.baseline,
      neither: combined.neither + pair.long_lesson_preference.neither,
      no_preference:
        combined.no_preference +
        pair.long_lesson_preference.no_preference,
      total: combined.total + pair.long_lesson_preference.total,
    }),
    {
      corrected: 0,
      baseline: 0,
      neither: 0,
      no_preference: 0,
      total: 0,
    },
  );
  const tooSlow = combineSpeed(
    allPairSummaries.map((summary) => summary.too_slow),
  );
  const tooFast = combineSpeed(
    allPairSummaries.map((summary) => summary.too_fast),
  );
  const table = buildTableEfficiency(
    responses,
    resolved,
    input.manifest.tablePairId,
  );
  const pronunciation = buildPronunciationAnalysis(
    responses,
    resolved,
  );
  const correctedMedians = Object.fromEntries(
    PHASE2B_SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      scores.by_pipeline.corrected[dimension].median,
    ]),
  ) as Record<Phase2BScoreDimension, number | null>;
  const decision = evaluatePhase2BDecision({
    valid_listener_count: responses.length,
    original_pair_count: input.manifest.originalPairIds.length,
    corrected_original_pair_wins: originalWins,
    corrected_overall_preference_rate: rate(
      overall.corrected,
      overall.total,
    ),
    corrected_median_scores: correctedMedians,
    corrected_long_lesson_preference_rate: rate(
      longLesson.corrected,
      longLesson.total,
    ),
    repeated_corrected_critical_pronunciation_problem_count:
      pronunciation.repeated_corrected_critical_groups.length,
    corrected_critical_pronunciation_adjudication_required:
      pronunciation.corrected_critical_adjudication_pair_ids.length >
      0,
    corrected_table_excessively_slow_rate:
      table.corrected_excessively_slow_rate,
    corrected_table_pauses_excessive_rate: rate(
      table.pauses_excessive.corrected_reports,
      table.pauses_excessive.total,
    ),
    table_concise_format_yes_rate:
      table.test_more_concise_format.yes_rate,
    corrected_too_slow_rate: rate(
      tooSlow.corrected_reports,
      tooSlow.total,
    ),
    corrected_too_fast_rate: rate(
      tooFast.corrected_reports,
      tooFast.total,
    ),
    weak_pause_types: weakPauseTypes(responses, resolved),
    all_local_voices_failed_voice_only_criteria:
      input.manifest.allLocalVoicesFailedVoiceOnlyCriteria,
    voices_evaluated: input.manifest.voicesEvaluated,
  });

  return {
    schema_version: PHASE2B_ANALYSIS_SCHEMA_VERSION,
    evaluation_package_id: input.manifest.evaluationPackageId,
    submissions: {
      received_files: input.submissions.length,
      unique_submission_identities: selected.identities,
      exact_duplicates_collapsed: selected.duplicates,
      invalid_response_count: selected.invalid.length,
      complete_valid_listeners: responses.length,
      completion_rate: rate(responses.length, selected.identities),
      listener_count_in_range:
        responses.length >= PHASE2B_MIN_LISTENERS &&
        responses.length <= PHASE2B_MAX_LISTENERS,
    },
    scores,
    preferences: {
      by_pair: byPair,
      original_pair_outcomes: sortedRecord(
        Object.entries(originalOutcomes),
      ),
      corrected_original_pair_wins: originalWins,
      original_pair_count: input.manifest.originalPairIds.length,
      corrected_original_pair_win_rate: rate(
        originalWins,
        input.manifest.originalPairIds.length,
      ),
      corrected_overall_preference: {
        ...overall,
        rate: rate(overall.corrected, overall.total),
      },
      corrected_long_lesson_preference: {
        ...longLesson,
        rate: rate(longLesson.corrected, longLesson.total),
      },
      speed: {
        too_slow: tooSlow,
        too_fast: tooFast,
        corrected_too_slow_rate: rate(
          tooSlow.corrected_reports,
          tooSlow.total,
        ),
        corrected_too_fast_rate: rate(
          tooFast.corrected_reports,
          tooFast.total,
        ),
      },
    },
    table_efficiency: table,
    pronunciation,
    consistency: buildConsistency(responses, resolved),
    comments: buildComments(responses, resolved),
    invalid_responses: selected.invalid,
    decision,
  };
}

function formatMetric(value: number | null): string {
  return value === null ? "n/a" : value.toFixed(2);
}

function formatRate(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

export function renderPhase2BAnalysisMarkdown(
  analysis: Phase2BAggregationResult,
): string {
  const lines = [
    "# Blind listening analysis",
    "",
    `- Evaluation package: \`${analysis.evaluation_package_id}\``,
    `- Complete valid listeners: ${String(
      analysis.submissions.complete_valid_listeners,
    )}`,
    `- Completion rate: ${formatRate(
      analysis.submissions.completion_rate,
    )}`,
    `- Exact duplicates collapsed: ${String(
      analysis.submissions.exact_duplicates_collapsed,
    )}`,
    `- Invalid responses: ${String(
      analysis.submissions.invalid_response_count,
    )}`,
    "",
    "## Decision",
    "",
    `**${analysis.decision.recommendation}**`,
    "",
    ...analysis.decision.reasons.map((reason) => `- ${reason}`),
    "",
    "## Corrected pipeline",
    "",
    `- Original pair wins: ${String(
      analysis.preferences.corrected_original_pair_wins,
    )}/${String(analysis.preferences.original_pair_count)}`,
    `- Overall preference: ${formatRate(
      analysis.preferences.corrected_overall_preference.rate,
    )}`,
    `- Long-lesson preference: ${formatRate(
      analysis.preferences.corrected_long_lesson_preference.rate,
    )}`,
    `- Table excessively-slow rejection: ${formatRate(
      analysis.table_efficiency.corrected_excessively_slow_rate,
    )}`,
    "",
    "| Dimension | Mean | Median | Paired mean improvement |",
    "| --- | ---: | ---: | ---: |",
    ...PHASE2B_SCORE_DIMENSIONS.map((dimension) => {
      const score = analysis.scores.by_pipeline.corrected[dimension];
      const improvement =
        analysis.scores.corrected_improvement[dimension]
          .paired_difference;
      return `| ${dimension} | ${formatMetric(
        score.mean,
      )} | ${formatMetric(score.median)} | ${formatMetric(
        improvement.mean,
      )} |`;
    }),
    "",
    "## Table efficiency",
    "",
    `- Repeated-label usefulness median: ${formatMetric(
      analysis.table_efficiency.repeated_labels_usefulness.median,
    )}`,
    `- Prefer longer/clearer: ${formatRate(
      analysis.table_efficiency.prefer_longer_clearer.yes_rate,
    )}`,
    `- Test a more concise format: ${formatRate(
      analysis.table_efficiency.test_more_concise_format.yes_rate,
    )}`,
    "",
    "## Pronunciation and consistency",
    "",
    `- Repeated corrected critical issues: ${String(
      analysis.pronunciation.repeated_corrected_critical_groups.length,
    )}`,
    `- Critical adjudication pairs: ${
      analysis.pronunciation.corrected_critical_adjudication_pair_ids
        .join(", ") || "none"
    }`,
    `- Flagged listener consistency: ${
      analysis.consistency.flagged_listener_ids.join(", ") || "none"
    }`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export function renderPhase2BDecisionSummary(
  analysis: Phase2BAggregationResult,
): string {
  const targets =
    analysis.decision.tuning_targets.length === 0
      ? "none"
      : analysis.decision.tuning_targets.join(", ");
  return [
    "# Decision summary",
    "",
    `Recommendation: **${analysis.decision.recommendation}**`,
    "",
    ...analysis.decision.reasons.map((reason) => `- ${reason}`),
    `- Tuning targets (advisory only): ${targets}`,
    "- No tuning, voice switch, or external TTS request was performed by this analysis.",
    "",
  ].join("\n");
}
