import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ACADEMY_BOUNDARY_AUDIT_VERSION,
  ACADEMY_BOUNDARY_EVIDENCE_RANGES,
  evaluateCorrectedBoundary,
  gainAdjustedBoundaryDetector,
} from "../src/lib/academy/narration/boundary-audit-policy";
import {
  DEFAULT_LOW_ENERGY_DETECTOR,
} from "../src/lib/academy/narration/effective-pause-normalization";

describe("Academy corrected boundary audit policy", () => {
  it("pins the independently versioned evidence ranges", () => {
    expect(
      ACADEMY_BOUNDARY_AUDIT_VERSION,
    ).toBe(
      "academy-boundary-audit-v2-level-invariant-dual-domain",
    );
    expect(
      ACADEMY_BOUNDARY_EVIDENCE_RANGES,
    ).toEqual({
      list: [280, 340],
      tableRow: [240, 310],
      paragraph: [780, 860],
      callout: [680, 760],
      heading: [880, 960],
      section: [1_020, 1_160],
    });
  });

  it("moves absolute detector thresholds into the post-gain level domain", () => {
    expect(
      gainAdjustedBoundaryDetector(
        DEFAULT_LOW_ENERGY_DETECTOR,
        -3.42,
      ),
    ).toMatchObject({
      rmsThresholdDbfs: -49.42,
      peakThresholdDbfs: -37.42,
    });
  });

  it("accepts an immutable boundary when the exact PCM formula and calibrated decoded ensemble pass", () => {
    expect(
      evaluateCorrectedBoundary({
        type: "list",
        formulaPcmMilliseconds:
          299.00226757369614,
        decodedDetectorMeasurementsMilliseconds:
          [
            371.2018140589569,
            291.0204081632653,
            341.1337868480726,
            351.15646258503403,
          ],
        speechCorrelationBefore:
          0.9995,
        speechCorrelationAfter:
          0.9992,
        classifierMatches: true,
        trimSafetyPasses: true,
      }).pass,
    ).toBe(true);
  });

  it("does not let detector uncertainty hide a genuine timing defect", () => {
    const result =
      evaluateCorrectedBoundary({
        type: "list",
        formulaPcmMilliseconds: 245,
        decodedDetectorMeasurementsMilliseconds:
          [300, 315],
        speechCorrelationBefore: 0.999,
        speechCorrelationAfter: 0.999,
        classifierMatches: true,
        trimSafetyPasses: true,
      });
    expect(
      result.formulaPcmPass,
    ).toBe(false);
    expect(result.pass).toBe(false);
  });

  it("fails when decoded evidence misses the range or speech preservation is weak", () => {
    expect(
      evaluateCorrectedBoundary({
        type: "tableRow",
        formulaPcmMilliseconds: 245,
        decodedDetectorMeasurementsMilliseconds:
          [215, 225, 230],
        speechCorrelationBefore: 0.999,
        speechCorrelationAfter: 0.999,
        classifierMatches: true,
        trimSafetyPasses: true,
      }).pass,
    ).toBe(false);
    expect(
      evaluateCorrectedBoundary({
        type: "paragraph",
        formulaPcmMilliseconds: 799,
        decodedDetectorMeasurementsMilliseconds:
          [799, 829],
        speechCorrelationBefore: 0.94,
        speechCorrelationAfter: 0.999,
        classifierMatches: true,
        trimSafetyPasses: true,
      }).pass,
    ).toBe(false);
  });

  it("keeps classifier and trim safety as independent fail-closed gates", () => {
    const common = {
      type: "heading" as const,
      formulaPcmMilliseconds: 899,
      decodedDetectorMeasurementsMilliseconds:
        [899, 919],
      speechCorrelationBefore: 0.999,
      speechCorrelationAfter: 0.999,
    };
    expect(
      evaluateCorrectedBoundary({
        ...common,
        classifierMatches: false,
        trimSafetyPasses: true,
      }).pass,
    ).toBe(false);
    expect(
      evaluateCorrectedBoundary({
        ...common,
        classifierMatches: true,
        trimSafetyPasses: false,
      }).pass,
    ).toBe(false);
  });
});
