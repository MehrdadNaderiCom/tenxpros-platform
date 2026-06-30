/**
 * Single source of truth for the human-readable labels of the application's
 * enum fields. Imported by BOTH the public apply form (to render the <option>s)
 * and the admin views (to display the stored value), so what the admin sees is
 * exactly what the applicant selected, the two can never drift.
 */

export type LabeledOption = { value: string; label: string };

export const AI_EXPERIENCE_OPTIONS: LabeledOption[] = [
  { value: "BEGINNER", label: "New to AI at work" },
  { value: "INTERMEDIATE", label: "Use AI tools occasionally or regularly" },
  { value: "ADVANCED", label: "Lead or advise on AI initiatives" },
];

export const DATA_SENSITIVITY_OPTIONS: LabeledOption[] = [
  { value: "LOW", label: "Low, public or general info" },
  { value: "MODERATE", label: "Moderate, internal business data" },
  { value: "HIGH", label: "High, personal, financial, or client data" },
  { value: "CRITICAL", label: "Critical, regulated (health, legal, gov)" },
];

export const WEEKLY_AVAILABILITY_OPTIONS: LabeledOption[] = [
  { value: "HOURS_5", label: "About 2-5 hours / week" },
  { value: "HOURS_8", label: "About 6-10 hours / week" },
  { value: "HOURS_12_PLUS", label: "More than 10 hours / week" },
];

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ACCEPTED: "Accepted",
  REVISE_AND_REAPPLY: "Revise & reapply",
  NOT_ACCEPTED: "Not accepted",
  ENROLLED: "Enrolled",
};

function labelOf(options: LabeledOption[], value?: string | null): string {
  if (!value) return ", ";
  return options.find((option) => option.value === value)?.label ?? value;
}

export const aiExperienceLabel = (value?: string | null) => labelOf(AI_EXPERIENCE_OPTIONS, value);
export const dataSensitivityLabel = (value?: string | null) => labelOf(DATA_SENSITIVITY_OPTIONS, value);
export const weeklyAvailabilityLabel = (value?: string | null) => labelOf(WEEKLY_AVAILABILITY_OPTIONS, value);
export const applicationStatusLabel = (value?: string | null) =>
  value ? APPLICATION_STATUS_LABELS[value] ?? value : ", ";
