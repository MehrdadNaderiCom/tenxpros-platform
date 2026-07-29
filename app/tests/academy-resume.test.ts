import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  academyResumePayloadSchema,
  decideAcademyResumeCas,
  type AcademyAudioResumePayload,
  type AcademyReadingResumePayload,
  type AcademyResumeEnvelope,
  type AcademyResumeStoredState,
} from "../src/lib/academy/resume-contract";
import {
  academyAudioResumeKey,
  academyReadingContentKey,
  isSameOriginAcademyResumeRequest,
} from "../src/lib/academy/resume-core";

const CLIENT_A = "2c9488fd-8304-4d61-9244-f7f528824a4d";
const CLIENT_B = "65e3a40c-52c7-4a2f-a88c-26c6280d10e7";
const KEY_A = "a".repeat(64);
const MAX_INT = 2_147_483_647;

const readingPayload: AcademyReadingResumePayload = {
  kind: "reading",
  clientId: CLIENT_A,
  clientSeq: 1,
  expectedRevision: 0,
  contentKey: KEY_A,
  blockKey: "section-2:paragraph_4",
  blockIndex: 42,
  offsetRatio: 0.375,
  progressPct: 48.25,
};

const audioPayload: AcademyAudioResumePayload = {
  kind: "audio",
  clientId: CLIENT_A,
  clientSeq: 2,
  expectedRevision: 1,
  resumeKey: KEY_A,
  voiceId: "tenx_voice-1",
  positionSeconds: 321.75,
  durationSeconds: 1_800.5,
};

function parses(candidate: unknown): boolean {
  return academyResumePayloadSchema.safeParse(candidate).success;
}

describe("academy resume payload validation", () => {
  it("accepts complete reading and audio payloads", () => {
    expect(parses(readingPayload)).toBe(true);
    expect(parses(audioPayload)).toBe(true);
  });

  it("accepts nullable reading anchors and all inclusive numeric edges", () => {
    expect(
      parses({
        ...readingPayload,
        clientSeq: MAX_INT,
        expectedRevision: MAX_INT,
        blockKey: null,
        blockIndex: null,
        offsetRatio: 0,
        progressPct: 100,
      }),
    ).toBe(true);
    expect(
      parses({
        ...audioPayload,
        positionSeconds: 86_400,
        durationSeconds: 86_400,
      }),
    ).toBe(true);
  });

  it("is strict at the top level for both discriminated branches", () => {
    expect(parses({ ...readingPayload, unexpected: true })).toBe(false);
    expect(parses({ ...audioPayload, unexpected: true })).toBe(false);
    expect(parses({ ...readingPayload, durationSeconds: 10 })).toBe(false);
    expect(parses({ ...audioPayload, progressPct: 10 })).toBe(false);
  });

  it("rejects absent, unknown, and mismatched discriminators", () => {
    const { kind: _readingKind, ...withoutKind } = readingPayload;
    expect(parses(withoutKind)).toBe(false);
    expect(parses({ ...readingPayload, kind: "video" })).toBe(false);
    expect(
      parses({
        ...readingPayload,
        kind: "audio",
      }),
    ).toBe(false);
  });

  it("requires a UUID clientId and bounded integer sequence values", () => {
    for (const clientId of ["", "not-a-uuid", 123, null]) {
      expect(parses({ ...readingPayload, clientId })).toBe(false);
    }

    for (const clientSeq of [0, -1, 1.5, MAX_INT + 1, "1", NaN, Infinity]) {
      expect(parses({ ...readingPayload, clientSeq })).toBe(false);
    }

    for (const expectedRevision of [
      -1,
      0.5,
      MAX_INT + 1,
      "0",
      NaN,
      Infinity,
    ]) {
      expect(parses({ ...audioPayload, expectedRevision })).toBe(false);
    }
  });

  it("requires exact lowercase SHA-256-style keys", () => {
    for (const contentKey of [
      "a".repeat(63),
      "a".repeat(65),
      "A".repeat(64),
      "g".repeat(64),
      123,
      null,
    ]) {
      expect(parses({ ...readingPayload, contentKey })).toBe(false);
    }

    for (const resumeKey of [
      "0".repeat(63),
      "0".repeat(65),
      "F".repeat(64),
      "z".repeat(64),
      undefined,
    ]) {
      expect(parses({ ...audioPayload, resumeKey })).toBe(false);
    }
  });

  it("restricts optional reading anchors to safe bounded values", () => {
    for (const blockKey of [
      "",
      "contains space",
      "Uppercase",
      "slash/not-safe",
      "a".repeat(97),
      12,
    ]) {
      expect(parses({ ...readingPayload, blockKey })).toBe(false);
    }

    for (const blockIndex of [-1, 100_001, 1.2, "2", NaN, Infinity]) {
      expect(parses({ ...readingPayload, blockIndex })).toBe(false);
    }
  });

  it("rejects non-finite, wrongly typed, and out-of-range reading metrics", () => {
    for (const offsetRatio of [
      -Number.EPSILON,
      1 + Number.EPSILON,
      NaN,
      Infinity,
      -Infinity,
      "0.5",
      null,
    ]) {
      expect(parses({ ...readingPayload, offsetRatio })).toBe(false);
    }

    for (const progressPct of [
      -Number.EPSILON,
      100.0001,
      NaN,
      Infinity,
      -Infinity,
      "50",
      null,
    ]) {
      expect(parses({ ...readingPayload, progressPct })).toBe(false);
    }
  });

  it("requires a safe non-empty bounded voice id", () => {
    for (const voiceId of [
      "",
      "voice with spaces",
      "voice/slash",
      "voice.dot",
      "a".repeat(129),
      1,
      null,
    ]) {
      expect(parses({ ...audioPayload, voiceId })).toBe(false);
    }
  });

  it("rejects non-finite, wrongly typed, and out-of-range audio timing", () => {
    for (const positionSeconds of [
      -Number.EPSILON,
      86_400.0001,
      NaN,
      Infinity,
      -Infinity,
      "30",
      null,
    ]) {
      expect(parses({ ...audioPayload, positionSeconds })).toBe(false);
    }

    for (const durationSeconds of [
      0,
      -Number.EPSILON,
      86_400.0001,
      NaN,
      Infinity,
      -Infinity,
      "60",
      null,
    ]) {
      expect(parses({ ...audioPayload, durationSeconds })).toBe(false);
    }
  });
});

describe("academy resume compare-and-swap decision", () => {
  const stored: AcademyResumeStoredState = {
    revision: 7,
    clientId: CLIENT_A,
    clientSeq: 12,
  };

  const incoming = (
    values: Partial<AcademyResumeEnvelope> = {},
  ): AcademyResumeEnvelope => ({
    clientId: CLIENT_A,
    clientSeq: 13,
    expectedRevision: 7,
    ...values,
  });

  it("accepts only a strictly newer sequence from the same client", () => {
    expect(decideAcademyResumeCas(stored, incoming({ clientSeq: 13 }))).toBe(
      "accept",
    );
    expect(
      decideAcademyResumeCas(
        stored,
        incoming({ clientSeq: MAX_INT, expectedRevision: 0 }),
      ),
    ).toBe("accept");
  });

  it("classifies same-client retries and out-of-order delivery as duplicates", () => {
    expect(decideAcademyResumeCas(stored, incoming({ clientSeq: 12 }))).toBe(
      "duplicate",
    );
    expect(
      decideAcademyResumeCas(
        stored,
        incoming({ clientSeq: 11, expectedRevision: 7 }),
      ),
    ).toBe("duplicate");
    expect(
      decideAcademyResumeCas(
        stored,
        incoming({ clientSeq: 1, expectedRevision: 999 }),
      ),
    ).toBe("duplicate");
  });

  it("accepts another tab or device only when it observed the current revision", () => {
    expect(
      decideAcademyResumeCas(
        stored,
        incoming({
          clientId: CLIENT_B,
          clientSeq: 1,
          expectedRevision: 7,
        }),
      ),
    ).toBe("accept");
    expect(
      decideAcademyResumeCas(
        stored,
        incoming({
          clientId: CLIENT_B,
          clientSeq: 999,
          expectedRevision: 6,
        }),
      ),
    ).toBe("conflict");
  });

  it("treats an unclaimed stored checkpoint as cross-client CAS state", () => {
    const unclaimed: AcademyResumeStoredState = {
      revision: 0,
      clientId: null,
      clientSeq: 0,
    };

    expect(decideAcademyResumeCas(unclaimed, incoming({ expectedRevision: 0 }))).toBe(
      "accept",
    );
    expect(decideAcademyResumeCas(unclaimed, incoming({ expectedRevision: 1 }))).toBe(
      "conflict",
    );
  });

  it("prevents two tabs that read one revision from both overwriting it", () => {
    const before: AcademyResumeStoredState = {
      revision: 3,
      clientId: CLIENT_A,
      clientSeq: 8,
    };
    const tabB = incoming({
      clientId: CLIENT_B,
      clientSeq: 1,
      expectedRevision: 3,
    });

    expect(decideAcademyResumeCas(before, tabB)).toBe("accept");

    const afterTabB: AcademyResumeStoredState = {
      revision: 4,
      clientId: CLIENT_B,
      clientSeq: 1,
    };
    const staleTabA = incoming({
      clientId: CLIENT_A,
      clientSeq: 9,
      expectedRevision: 3,
    });
    expect(decideAcademyResumeCas(afterTabB, staleTabA)).toBe("conflict");
  });
});

describe("academy resume server identities and request boundary", () => {
  it("keys reading bookmarks to the exact lesson representation", () => {
    const plain = academyReadingContentKey({
      body: "The lesson",
      bodyHtml: null,
    });
    const rich = academyReadingContentKey({
      body: "The lesson",
      bodyHtml: "<p>The lesson</p>",
    });
    expect(plain).toMatch(/^[a-f0-9]{64}$/u);
    expect(rich).toMatch(/^[a-f0-9]{64}$/u);
    expect(plain).not.toBe(rich);
    expect(
      academyReadingContentKey({
        body: "The lesson",
        bodyHtml: null,
      }),
    ).toBe(plain);
  });

  it("binds an audio bookmark to source, asset, hash, and voice", () => {
    const base = academyAudioResumeKey({
      source: "versioned",
      assetId: "asset-1",
      identityHash: "f".repeat(64),
      voiceId: "bryce",
    });
    expect(base).toMatch(/^[a-f0-9]{64}$/u);
    expect(
      academyAudioResumeKey({
        source: "versioned",
        assetId: "asset-2",
        identityHash: "f".repeat(64),
        voiceId: "bryce",
      }),
    ).not.toBe(base);
    expect(
      academyAudioResumeKey({
        source: "legacy",
        assetId: "asset-1",
        identityHash: "f".repeat(64),
        voiceId: "bryce",
      }),
    ).not.toBe(base);
  });

  it("accepts same-origin POST metadata across a trusted proxy", () => {
    expect(
      isSameOriginAcademyResumeRequest(
        new Request("http://internal:3000/api/resume", {
          headers: {
            origin: "https://academy.tenxpros.com",
            host: "internal:3000",
            "x-forwarded-host": "academy.tenxpros.com",
            "x-forwarded-proto": "https",
            "sec-fetch-site": "same-origin",
          },
        }),
      ),
    ).toBe(true);
  });

  it("rejects missing, malformed, or cross-site origins", () => {
    const request = (headers: Record<string, string>) =>
      new Request("https://academy.tenxpros.com/api/resume", {
        headers,
      });
    expect(
      isSameOriginAcademyResumeRequest(
        request({ host: "academy.tenxpros.com" }),
      ),
    ).toBe(false);
    expect(
      isSameOriginAcademyResumeRequest(
        request({
          host: "academy.tenxpros.com",
          origin: "https://evil.example",
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(false);
    expect(
      isSameOriginAcademyResumeRequest(
        request({
          host: "academy.tenxpros.com",
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
    expect(
      isSameOriginAcademyResumeRequest(
        request({
          host: "academy.tenxpros.com",
          origin: "not a url",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBe(false);
  });
});

describe("academy single-voice and resume wiring", () => {
  const appRoot = join(__dirname, "..");
  const player = readFileSync(
    join(
      appRoot,
      "src/components/academy/audio-reader.tsx",
    ),
    "utf8",
  );
  const lesson = readFileSync(
    join(
      appRoot,
      "src/components/academy/lesson-reader.tsx",
    ),
    "utf8",
  );

  it("does not render production voice copy when only one voice is active", () => {
    expect(player).not.toContain("{selected.label}");
    expect(player).toContain(
      "status.voices.filter((voice) => voice.ready).length",
    );
    expect(player).toContain("!status.productionVoiceLocked");
  });

  it("flushes both reading and audio bookmarks on fast exits", () => {
    expect(player).toContain(
      'window.addEventListener("pagehide", flush)',
    );
    expect(lesson).toContain(
      'window.addEventListener("pagehide", flush)',
    );
    expect(player).toContain("keepalive: true");
    expect(lesson).toContain("keepalive: true");
  });

  it("never autoplays a restored narration timestamp", () => {
    expect(player).toContain(
      "pendingInitialSeekSecondsRef.current = saved",
    );
    expect(player).not.toMatch(
      /pendingInitialSeekSecondsRef\.current\s*=\s*saved[\s\S]{0,300}\.play\(/u,
    );
  });

  it("never writes an old media element under a new release key", () => {
    expect(
      player.match(
        /loadedResumeKeyRef\.current !== selected\.resumeKey/gu,
      )?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
    expect(player).toContain(
      "statusRequestGenerationRef.current",
    );
    expect(player).toContain(
      "pendingCheckpoint ??",
    );
  });
});
