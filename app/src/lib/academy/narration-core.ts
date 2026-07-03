import { createHash } from "node:crypto";

/**
 * Pure narration helpers, dependency-free so tests can import them directly
 * (the DB-touching generation lives in lesson-audio.ts, same split as
 * telemetry-core.ts vs telemetry.ts).
 */

/** Bumped when the engine or encoding recipe changes, to invalidate old rows. */
export const AUDIO_ENGINE = "piper-2023.11.14-2/lame-64k-mono";

export function audioTextHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex");
}

/**
 * Parse an HTTP Range header against a total size. Returns null for a missing
 * or malformed header (serve the whole file) and "unsatisfiable" when the
 * requested start lies beyond the end of the file (416). Only single ranges
 * are honored; multipart ranges fall back to the whole file, which is valid.
 */
export function parseRange(
  header: string | null,
  total: number,
): { start: number; end: number } | null | "unsatisfiable" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, rawStart, rawEnd] = m;
  if (rawStart === "" && rawEnd === "") return null;
  if (rawStart === "") {
    // Suffix form: the last N bytes.
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return "unsatisfiable";
    const start = Math.max(0, total - suffix);
    return { start, end: total - 1 };
  }
  const start = Number(rawStart);
  const end = rawEnd === "" ? total - 1 : Math.min(Number(rawEnd), total - 1);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start >= total || start > end) return "unsatisfiable";
  return { start, end };
}
