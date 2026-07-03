/**
 * Pure telemetry primitives: constants, the beat clamp, and formatting. No
 * imports, no database, so the unit tests exercise the exact arithmetic the
 * server uses. The database writers live in telemetry.ts and import from here.
 */

/** How often the client sends a reading heartbeat, in seconds. */
export const BEAT_INTERVAL_SECONDS = 20;
/**
 * The most seconds a single beat may credit. Slightly above the interval to
 * absorb timer jitter, and the hard ceiling on any gap (sleep, tab switch,
 * clock games): a partner can never gain more time than real beats deliver.
 */
export const BEAT_MAX_CREDIT_SECONDS = 40;

/**
 * Minimum seconds between two counted views of the same module by the same
 * partner. A rapid reload or a scripted loop cannot inflate the view counter or
 * flood the event log; a genuine return visit later still counts.
 */
export const VIEW_THROTTLE_SECONDS = 60;

/** The event kinds the log accepts (a closed set, so queries stay meaningful). */
export const ACADEMY_EVENT_KINDS = [
  "MODULE_OPENED",
  "LESSON_READ",
  "EXERCISE_ANSWERED",
  "EXAM_STARTED",
  "EXAM_SUBMITTED",
  "FINAL_EXAM_STARTED",
  "FINAL_EXAM_SUBMITTED",
] as const;
export type AcademyEventKind = (typeof ACADEMY_EVENT_KINDS)[number];

/**
 * Seconds a heartbeat may credit, from the stored anchor: the real elapsed time
 * since the last beat, clamped to [0, BEAT_MAX_CREDIT_SECONDS]. First beat (no
 * anchor) credits zero and just sets the anchor, so time only ever accrues
 * between two observed beats. Pure and deterministic for tests.
 */
export function beatCredit(lastBeatAt: Date | null | undefined, now: Date): number {
  if (!lastBeatAt) return 0;
  const elapsed = Math.floor((now.getTime() - lastBeatAt.getTime()) / 1000);
  if (elapsed <= 0) return 0;
  return Math.min(elapsed, BEAT_MAX_CREDIT_SECONDS);
}

/** Clamp a client-reported scroll percentage into 0..100 integers. */
export function clampScrollPct(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Human formatting for the admin analytics: 4980 -> "1h 23m", 252 -> "4m 12s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}
