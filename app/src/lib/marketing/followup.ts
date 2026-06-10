/**
 * Follow-up cadence engine (pure). After the initial approach: FU1 at +3 days,
 * FU2 at +7 days after FU1, FU3 at +7 days after FU2. After FU3 the prospect is
 * "parked" (kept, no more reminders). Compatible with the original Command
 * design; all date math is UTC-day based.
 */

export const FOLLOWUP_OFFSETS_DAYS = [3, 7, 7] as const;
export const MAX_FOLLOWUP_STEPS = FOLLOWUP_OFFSETS_DAYS.length;

const MS_PER_DAY = 86_400_000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Label for the NEXT follow-up given how many follow-ups were already sent. */
export function nextFollowupLabel(stepCompleted: number): string | null {
  if (stepCompleted >= MAX_FOLLOWUP_STEPS) return null;
  return `FU${stepCompleted + 1}`;
}

/**
 * Given the follow-up step just completed (0 = initial approach sent), return
 * the next due date, or null when the sequence is finished (-> park).
 */
export function nextFollowupDue(stepCompleted: number, from: Date): Date | null {
  if (stepCompleted >= MAX_FOLLOWUP_STEPS) return null;
  return addDays(from, FOLLOWUP_OFFSETS_DAYS[stepCompleted]);
}

export function isFollowupDue(nextDue: Date | null | undefined, now: Date): boolean {
  if (!nextDue) return false;
  // Due when the calendar day has arrived (compare at UTC day resolution).
  const due = Date.UTC(nextDue.getUTCFullYear(), nextDue.getUTCMonth(), nextDue.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return due <= today;
}

/**
 * Advance the sequence after sending the follow-up that was due.
 * Returns the new step, the next due date (or null), and whether to park.
 */
export function advanceFollowup(
  currentStep: number,
  now: Date,
): { step: number; nextDue: Date | null; parked: boolean } {
  const step = Math.min(currentStep + 1, MAX_FOLLOWUP_STEPS);
  const nextDue = nextFollowupDue(step, now);
  return { step, nextDue, parked: nextDue === null };
}
