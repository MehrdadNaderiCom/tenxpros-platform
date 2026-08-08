/**
 * A synchronous browser-side shadow of the durable audio bookmark.
 *
 * The database remains the cross-device source of truth. This small record
 * covers the narrower refresh race where a new server render can read before
 * the old document's final keepalive POST has committed. Callers must provide
 * an account-and-lesson-specific opaque scope so one person's checkpoint can
 * never be restored into another person's session on a shared browser.
 */

const SHADOW_SCHEMA_VERSION = 1 as const;
const STORAGE_PREFIX = "txp-academy-audio-resume-shadow-v1:";
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_AUDIO_SECONDS = 86_400;
const MAX_SCOPE_LENGTH = 256;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1_000;

type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type AcademyAudioResumeCheckpoint = {
  resumeKey: string;
  positionSeconds: number;
  durationSeconds: number;
  /** Unix epoch milliseconds. */
  updatedAt: number;
};

export type AcademyAudioResumeShadow =
  AcademyAudioResumeCheckpoint & {
    schemaVersion: typeof SHADOW_SCHEMA_VERSION;
  };

/**
 * Nullable shape accepted directly from a server snapshot. Invalid or partial
 * candidates are ignored instead of being allowed to disturb media playback.
 */
export type AcademyAudioResumeCandidate = {
  resumeKey: string | null;
  positionSeconds: number | null;
  durationSeconds: number | null;
  /** Unix epoch milliseconds; old rows may not have one yet. */
  updatedAt: number | null;
};

export type AcademyAudioResumeSelection = {
  source: "server" | "shadow";
  checkpoint: AcademyAudioResumeCheckpoint;
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidResumeKey(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    SHA256_PATTERN.test(value)
  );
}

function isValidUpdatedAt(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function normalizeCheckpoint(
  value: unknown,
): AcademyAudioResumeCheckpoint | null {
  if (!isRecord(value)) return null;
  const {
    resumeKey,
    positionSeconds,
    durationSeconds,
    updatedAt,
  } = value;
  if (
    !isValidResumeKey(resumeKey) ||
    typeof positionSeconds !== "number" ||
    !Number.isFinite(positionSeconds) ||
    positionSeconds < 0 ||
    positionSeconds > MAX_AUDIO_SECONDS ||
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    durationSeconds > MAX_AUDIO_SECONDS ||
    positionSeconds > durationSeconds ||
    !isValidUpdatedAt(updatedAt)
  ) {
    return null;
  }
  return {
    resumeKey,
    positionSeconds,
    durationSeconds,
    updatedAt,
  };
}

function resolveStorage(
  explicit?: StorageLike | null,
): StorageLike | null {
  if (explicit !== undefined) return explicit;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Builds the only localStorage key used by this helper. Invalid scopes fail
 * closed; callers should use a stable opaque hash of user and lesson identity.
 */
export function academyAudioResumeShadowStorageKey(
  scope: string,
): string | null {
  const normalized =
    typeof scope === "string" ? scope.trim() : "";
  if (
    normalized.length === 0 ||
    normalized.length > MAX_SCOPE_LENGTH
  ) {
    return null;
  }
  return `${STORAGE_PREFIX}${encodeURIComponent(normalized)}`;
}

/** Parse and strictly validate a serialized shadow checkpoint. */
export function parseAcademyAudioResumeShadow(
  raw: string | null,
): AcademyAudioResumeShadow | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !isRecord(value) ||
    value.schemaVersion !== SHADOW_SCHEMA_VERSION
  ) {
    return null;
  }
  const checkpoint = normalizeCheckpoint(value);
  return checkpoint
    ? {
        schemaVersion: SHADOW_SCHEMA_VERSION,
        ...checkpoint,
      }
    : null;
}

/**
 * Read a shadow checkpoint. localStorage may be unavailable in SSR, private
 * browsing, hardened browsers, or full-quota conditions; all such failures
 * intentionally degrade to a missing checkpoint.
 */
export function readAcademyAudioResumeShadow(
  scope: string,
  storage?: StorageLike | null,
): AcademyAudioResumeShadow | null {
  const key =
    academyAudioResumeShadowStorageKey(scope);
  const target = resolveStorage(storage);
  if (!key || !target) return null;
  try {
    const parsed = parseAcademyAudioResumeShadow(
      target.getItem(key),
    );
    return parsed &&
      parsed.updatedAt <=
        Date.now() + MAX_FUTURE_CLOCK_SKEW_MS
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Validate and synchronously write the latest in-browser checkpoint. Returns
 * the normalized record when stored and null when validation/storage fails.
 */
export function writeAcademyAudioResumeShadow(
  scope: string,
  checkpoint: AcademyAudioResumeCheckpoint,
  storage?: StorageLike | null,
): AcademyAudioResumeShadow | null {
  const key =
    academyAudioResumeShadowStorageKey(scope);
  const target = resolveStorage(storage);
  const normalized =
    normalizeCheckpoint(checkpoint);
  if (
    !key ||
    !target ||
    !normalized ||
    normalized.updatedAt >
      Date.now() + MAX_FUTURE_CLOCK_SKEW_MS
  ) {
    return null;
  }
  const shadow: AcademyAudioResumeShadow = {
    schemaVersion: SHADOW_SCHEMA_VERSION,
    ...normalized,
  };
  try {
    target.setItem(key, JSON.stringify(shadow));
    return shadow;
  } catch {
    return null;
  }
}

/** Remove a shadow record. Returns false when storage is unavailable/fails. */
export function clearAcademyAudioResumeShadow(
  scope: string,
  storage?: StorageLike | null,
): boolean {
  const key =
    academyAudioResumeShadowStorageKey(scope);
  const target = resolveStorage(storage);
  if (!key || !target) return false;
  try {
    target.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function normalizeServerCandidate(
  candidate: AcademyAudioResumeCandidate | null,
): AcademyAudioResumeCheckpoint | null {
  if (!candidate) return null;
  // A complete checkpoint created before timestamp reconciliation support is
  // still safe to restore. Treat its unknown age as the oldest possible value
  // so any valid browser shadow wins, while the server remains usable when
  // localStorage is unavailable.
  return normalizeCheckpoint({
    ...candidate,
    updatedAt: candidate.updatedAt ?? 0,
  });
}

/**
 * Select the newest checkpoint for the active immutable audio asset.
 *
 * A resume-key mismatch always invalidates a candidate. When timestamps tie,
 * the durable server value wins. A valid timestamped shadow beats a legacy
 * server snapshot without updatedAt, which is the refresh-race fallback this
 * helper exists to provide.
 */
export function selectFreshestAcademyAudioResume(
  input: {
    activeResumeKey: string | null;
    server: AcademyAudioResumeCandidate | null;
    shadow: AcademyAudioResumeShadow | null;
  },
): AcademyAudioResumeSelection | null {
  if (!isValidResumeKey(input.activeResumeKey)) {
    return null;
  }
  const server = normalizeServerCandidate(input.server);
  const shadow = normalizeCheckpoint(input.shadow);
  const validServer =
    server?.resumeKey === input.activeResumeKey
      ? server
      : null;
  const validShadow =
    shadow?.resumeKey === input.activeResumeKey
      ? shadow
      : null;

  if (!validServer && !validShadow) return null;
  if (!validShadow) {
    return {
      source: "server",
      checkpoint: validServer!,
    };
  }
  if (!validServer) {
    return {
      source: "shadow",
      checkpoint: validShadow,
    };
  }
  if (validShadow.updatedAt > validServer.updatedAt) {
    return {
      source: "shadow",
      checkpoint: validShadow,
    };
  }
  return {
    source: "server",
    checkpoint: validServer,
  };
}
