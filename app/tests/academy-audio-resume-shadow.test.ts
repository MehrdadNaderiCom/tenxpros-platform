import { describe, expect, it, vi } from "vitest";
import {
  academyAudioResumeShadowStorageKey,
  clearAcademyAudioResumeShadow,
  parseAcademyAudioResumeShadow,
  readAcademyAudioResumeShadow,
  selectFreshestAcademyAudioResume,
  writeAcademyAudioResumeShadow,
  type AcademyAudioResumeCheckpoint,
} from "../src/lib/academy/audio-resume-shadow";

const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);
const SCOPE = "opaque-user-and-lesson-scope";

const checkpoint: AcademyAudioResumeCheckpoint = {
  resumeKey: KEY_A,
  positionSeconds: 321.75,
  durationSeconds: 1_800.5,
  updatedAt: 1_753_776_000_000,
};

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("Academy audio resume shadow parsing", () => {
  it("parses a complete, versioned checkpoint", () => {
    expect(
      parseAcademyAudioResumeShadow(
        JSON.stringify({
          schemaVersion: 1,
          ...checkpoint,
        }),
      ),
    ).toEqual({
      schemaVersion: 1,
      ...checkpoint,
    });
  });

  it("accepts the inclusive timing boundaries", () => {
    expect(
      parseAcademyAudioResumeShadow(
        JSON.stringify({
          schemaVersion: 1,
          ...checkpoint,
          positionSeconds: 0,
          durationSeconds: 86_400,
          updatedAt: 0,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseAcademyAudioResumeShadow(
        JSON.stringify({
          schemaVersion: 1,
          ...checkpoint,
          positionSeconds: 86_400,
          durationSeconds: 86_400,
        }),
      ),
    ).not.toBeNull();
  });

  it.each([
    null,
    "",
    "not-json",
    "[]",
    "{}",
    JSON.stringify({ schemaVersion: 2, ...checkpoint }),
    JSON.stringify({
      schemaVersion: 1,
      ...checkpoint,
      resumeKey: "A".repeat(64),
    }),
    JSON.stringify({
      schemaVersion: 1,
      ...checkpoint,
      resumeKey: "a".repeat(63),
    }),
    JSON.stringify({
      schemaVersion: 1,
      ...checkpoint,
      positionSeconds: -1,
    }),
    JSON.stringify({
      schemaVersion: 1,
      ...checkpoint,
      positionSeconds: 101,
      durationSeconds: 100,
    }),
    JSON.stringify({
      schemaVersion: 1,
      ...checkpoint,
      durationSeconds: 0,
    }),
    JSON.stringify({
      schemaVersion: 1,
      ...checkpoint,
      durationSeconds: 86_401,
    }),
    JSON.stringify({
      schemaVersion: 1,
      ...checkpoint,
      updatedAt: -1,
    }),
    JSON.stringify({
      schemaVersion: 1,
      ...checkpoint,
      updatedAt: 1.5,
    }),
    JSON.stringify({
      schemaVersion: 1,
      ...checkpoint,
      updatedAt: Number.MAX_SAFE_INTEGER + 1,
    }),
  ])("rejects malformed or unsafe records: %j", (raw) => {
    expect(parseAcademyAudioResumeShadow(raw)).toBeNull();
  });
});

describe("Academy audio resume shadow storage", () => {
  it("builds a namespaced, encoded key and rejects unsafe scopes", () => {
    expect(
      academyAudioResumeShadowStorageKey(" user/lesson "),
    ).toBe(
      "txp-academy-audio-resume-shadow-v1:user%2Flesson",
    );
    expect(
      academyAudioResumeShadowStorageKey("   "),
    ).toBeNull();
    expect(
      academyAudioResumeShadowStorageKey("x".repeat(257)),
    ).toBeNull();
  });

  it("round-trips a validated checkpoint", () => {
    const storage = new MemoryStorage();
    const written = writeAcademyAudioResumeShadow(
      SCOPE,
      checkpoint,
      storage,
    );

    expect(written).toEqual({
      schemaVersion: 1,
      ...checkpoint,
    });
    expect(
      readAcademyAudioResumeShadow(SCOPE, storage),
    ).toEqual(written);
  });

  it("rejects invalid writes without touching storage", () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    expect(
      writeAcademyAudioResumeShadow(
        SCOPE,
        {
          ...checkpoint,
          positionSeconds: checkpoint.durationSeconds + 1,
        },
        storage,
      ),
    ).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("rejects implausibly future-dated shadows after a clock correction", () => {
    const storage = new MemoryStorage();
    const futureCheckpoint = {
      ...checkpoint,
      updatedAt: Date.now() + 6 * 60 * 1_000,
    };
    const storageKey =
      academyAudioResumeShadowStorageKey(SCOPE)!;
    storage.setItem(
      storageKey,
      JSON.stringify({
        schemaVersion: 1,
        ...futureCheckpoint,
      }),
    );

    expect(
      readAcademyAudioResumeShadow(SCOPE, storage),
    ).toBeNull();
    expect(
      writeAcademyAudioResumeShadow(
        SCOPE,
        futureCheckpoint,
        storage,
      ),
    ).toBeNull();
  });

  it("clears only the scoped checkpoint", () => {
    const storage = new MemoryStorage();
    writeAcademyAudioResumeShadow(
      SCOPE,
      checkpoint,
      storage,
    );
    writeAcademyAudioResumeShadow(
      "another-scope",
      {
        ...checkpoint,
        positionSeconds: 10,
      },
      storage,
    );

    expect(
      clearAcademyAudioResumeShadow(SCOPE, storage),
    ).toBe(true);
    expect(
      readAcademyAudioResumeShadow(SCOPE, storage),
    ).toBeNull();
    expect(
      readAcademyAudioResumeShadow(
        "another-scope",
        storage,
      ),
    ).not.toBeNull();
  });

  it("is SSR-safe when no explicit storage exists", () => {
    expect(
      readAcademyAudioResumeShadow(SCOPE),
    ).toBeNull();
    expect(
      writeAcademyAudioResumeShadow(SCOPE, checkpoint),
    ).toBeNull();
    expect(
      clearAcademyAudioResumeShadow(SCOPE),
    ).toBe(false);
  });

  it("swallows get, set, and remove storage failures", () => {
    const readFailure = {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const writeFailure = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error("quota");
      }),
      removeItem: vi.fn(),
    };
    const clearFailure = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };

    expect(
      readAcademyAudioResumeShadow(SCOPE, readFailure),
    ).toBeNull();
    expect(
      writeAcademyAudioResumeShadow(
        SCOPE,
        checkpoint,
        writeFailure,
      ),
    ).toBeNull();
    expect(
      clearAcademyAudioResumeShadow(
        SCOPE,
        clearFailure,
      ),
    ).toBe(false);
  });
});

describe("freshest Academy audio resume selection", () => {
  const server = {
    ...checkpoint,
    updatedAt: checkpoint.updatedAt + 100,
  };
  const shadow = {
    schemaVersion: 1 as const,
    ...checkpoint,
  };

  it("selects a newer server checkpoint", () => {
    expect(
      selectFreshestAcademyAudioResume({
        activeResumeKey: KEY_A,
        server,
        shadow,
      }),
    ).toEqual({
      source: "server",
      checkpoint: server,
    });
  });

  it("selects a newer shadow checkpoint", () => {
    const newer = {
      ...shadow,
      positionSeconds: 400,
      updatedAt: server.updatedAt + 1,
    };
    expect(
      selectFreshestAcademyAudioResume({
        activeResumeKey: KEY_A,
        server,
        shadow: newer,
      }),
    ).toEqual({
      source: "shadow",
      checkpoint: {
        resumeKey: KEY_A,
        positionSeconds: 400,
        durationSeconds: checkpoint.durationSeconds,
        updatedAt: server.updatedAt + 1,
      },
    });
  });

  it("prefers the durable server on an exact timestamp tie", () => {
    const tiedShadow = {
      ...shadow,
      updatedAt: server.updatedAt,
      positionSeconds: 999,
    };
    expect(
      selectFreshestAcademyAudioResume({
        activeResumeKey: KEY_A,
        server,
        shadow: tiedShadow,
      }),
    ).toEqual({
      source: "server",
      checkpoint: server,
    });
  });

  it("never crosses an immutable resume-key boundary", () => {
    expect(
      selectFreshestAcademyAudioResume({
        activeResumeKey: KEY_B,
        server,
        shadow,
      }),
    ).toBeNull();
    expect(
      selectFreshestAcademyAudioResume({
        activeResumeKey: KEY_A,
        server: {
          ...server,
          resumeKey: KEY_B,
        },
        shadow,
      })?.source,
    ).toBe("shadow");
  });

  it("uses either valid candidate independently", () => {
    expect(
      selectFreshestAcademyAudioResume({
        activeResumeKey: KEY_A,
        server,
        shadow: null,
      }),
    ).toEqual({
      source: "server",
      checkpoint: server,
    });
    expect(
      selectFreshestAcademyAudioResume({
        activeResumeKey: KEY_A,
        server: null,
        shadow,
      }),
    ).toEqual({
      source: "shadow",
      checkpoint,
    });
  });

  it("restores a complete legacy server checkpoint as the oldest candidate", () => {
    expect(
      selectFreshestAcademyAudioResume({
        activeResumeKey: KEY_A,
        server: {
          ...server,
          updatedAt: null,
        },
        shadow: null,
      }),
    ).toEqual({
      source: "server",
      checkpoint: {
        ...server,
        updatedAt: 0,
      },
    });
  });

  it("ignores invalid and unavailable candidates", () => {
    expect(
      selectFreshestAcademyAudioResume({
        activeResumeKey: null,
        server,
        shadow,
      }),
    ).toBeNull();
    expect(
      selectFreshestAcademyAudioResume({
        activeResumeKey: "not-a-key",
        server,
        shadow,
      }),
    ).toBeNull();
  });
});
