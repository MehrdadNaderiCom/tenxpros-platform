import type {
  EffectivePauseType,
  LowEnergyDetectorConfig,
} from "./effective-pause-normalization";

export const ACADEMY_BOUNDARY_AUDIT_VERSION =
  "academy-boundary-audit-v2-level-invariant-dual-domain";

export const ACADEMY_BOUNDARY_EVIDENCE_RANGES =
  Object.freeze({
    list: [280, 340],
    tableRow: [240, 310],
    paragraph: [780, 860],
    callout: [680, 760],
    heading: [880, 960],
    section: [1_020, 1_160],
  }) satisfies Readonly<
    Record<
      Exclude<EffectivePauseType, "sentence">,
      readonly [number, number]
    >
  >;

export function gainAdjustedBoundaryDetector(
  detector: LowEnergyDetectorConfig,
  appliedGainDb: number,
  sensitivityDeltaDb = 0,
): LowEnergyDetectorConfig {
  if (
    !Number.isFinite(appliedGainDb) ||
    !Number.isFinite(sensitivityDeltaDb)
  ) {
    throw new Error(
      "Boundary detector gain adjustments must be finite",
    );
  }
  return {
    ...detector,
    rmsThresholdDbfs:
      detector.rmsThresholdDbfs +
      appliedGainDb +
      sensitivityDeltaDb,
    peakThresholdDbfs:
      detector.peakThresholdDbfs +
      appliedGainDb +
      sensitivityDeltaDb,
  };
}

export function academyBoundaryRange(
  type: Exclude<
    EffectivePauseType,
    "sentence"
  >,
): readonly [number, number] {
  return ACADEMY_BOUNDARY_EVIDENCE_RANGES[
    type
  ];
}

export function valueInAcademyBoundaryRange(
  type: Exclude<
    EffectivePauseType,
    "sentence"
  >,
  valueMilliseconds: number,
): boolean {
  if (!Number.isFinite(valueMilliseconds)) {
    return false;
  }
  const [minimum, maximum] =
    academyBoundaryRange(type);
  return (
    valueMilliseconds >= minimum &&
    valueMilliseconds <= maximum
  );
}

export interface CorrectedBoundaryEvidence {
  type: Exclude<
    EffectivePauseType,
    "sentence"
  >;
  formulaPcmMilliseconds: number;
  decodedDetectorMeasurementsMilliseconds:
    readonly number[];
  speechCorrelationBefore: number | null;
  speechCorrelationAfter: number | null;
  classifierMatches: boolean;
  trimSafetyPasses: boolean;
}

export function evaluateCorrectedBoundary(
  evidence: CorrectedBoundaryEvidence,
) {
  if (
    evidence
      .decodedDetectorMeasurementsMilliseconds
      .length === 0
  ) {
    throw new Error(
      "Corrected boundary audit requires decoded detector measurements",
    );
  }
  const [minimum, maximum] =
    academyBoundaryRange(evidence.type);
  const detectorMinimum = Math.min(
    ...evidence
      .decodedDetectorMeasurementsMilliseconds,
  );
  const detectorMaximum = Math.max(
    ...evidence
      .decodedDetectorMeasurementsMilliseconds,
  );
  const formulaPcmPass =
    valueInAcademyBoundaryRange(
      evidence.type,
      evidence.formulaPcmMilliseconds,
    );
  const detectorEnsembleIntersectsRange =
    detectorMaximum >= minimum &&
    detectorMinimum <= maximum;
  const speechCorrelationPass =
    evidence.speechCorrelationBefore !==
      null &&
    evidence.speechCorrelationAfter !==
      null &&
    evidence.speechCorrelationBefore >=
      0.95 &&
    evidence.speechCorrelationAfter >=
      0.95;
  const pass =
    formulaPcmPass &&
    detectorEnsembleIntersectsRange &&
    speechCorrelationPass &&
    evidence.classifierMatches &&
    evidence.trimSafetyPasses;
  return {
    range: {
      minimumMilliseconds: minimum,
      maximumMilliseconds: maximum,
    },
    formulaPcmPass,
    detectorInterval: {
      minimumMilliseconds:
        detectorMinimum,
      maximumMilliseconds:
        detectorMaximum,
    },
    detectorEnsembleIntersectsRange,
    speechCorrelationPass,
    classifierPass:
      evidence.classifierMatches,
    trimSafetyPass:
      evidence.trimSafetyPasses,
    pass,
  };
}
