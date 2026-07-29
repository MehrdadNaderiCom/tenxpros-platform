import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createDeterministicZip,
  type DeterministicZipEntry,
} from "../src/lib/academy/narration/deterministic-zip";
import {
  assertPhase2BPublicPackageSafe,
  PHASE2B_LISTENER_HTML_FILENAME,
  PHASE2B_LISTENER_INSTRUCTIONS_FILENAME,
  renderPhase2BListenerInstructions,
  renderPhase2BListeningHtml,
  type Phase2BPublicFile,
} from "../src/lib/academy/narration/piper-listener-package";
import {
  PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION,
  PHASE2B_RESPONSE_SCHEMA_VERSION,
  type Phase2BPublicPackage,
} from "../src/lib/academy/narration/piper-listening-evaluation";

function publicDefinition(): Phase2BPublicPackage {
  return {
    schema_version: PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION,
    evaluation_package_id: "blind-review-0123456789abcdef",
    pairs: Array.from({ length: 5 }, (_, pairIndex) => {
      const pairId = `sample-${String(pairIndex + 1).padStart(
        2,
        "0",
      )}`;
      return {
        pair_id: pairId,
        table_efficiency: pairIndex === 1,
        samples: [
          {
            sample_id: `${pairId}-A`,
            label: "A" as const,
            filename: `${pairId}-A.mp3`,
          },
          {
            sample_id: `${pairId}-B`,
            label: "B" as const,
            filename: `${pairId}-B.mp3`,
          },
        ],
      };
    }),
  };
}

function publicFiles(
  definition = publicDefinition(),
): Phase2BPublicFile[] {
  return [
    {
      path: PHASE2B_LISTENER_HTML_FILENAME,
      data: renderPhase2BListeningHtml(definition),
    },
    {
      path: PHASE2B_LISTENER_INSTRUCTIONS_FILENAME,
      data: renderPhase2BListenerInstructions(),
    },
    ...definition.pairs.flatMap((pair) =>
      pair.samples.map((sample) => ({
        path: `audio/${sample.filename}`,
        data: Buffer.from(
          `\xff\xfb\x90\x64 MPEG audio LAME3.100 ${sample.sample_id}`,
          "latin1",
        ),
      })),
    ),
  ];
}

function readStoredZip(archive: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    expect(archive.readUInt16LE(offset + 8)).toBe(0);
    const size = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = archive
      .subarray(nameStart, nameStart + nameLength)
      .toString("utf8");
    entries.set(name, archive.subarray(dataStart, dataStart + size));
    offset = dataStart + size;
  }
  expect(archive.readUInt32LE(offset)).toBe(0x02014b50);
  expect(archive.readUInt32LE(archive.length - 22)).toBe(
    0x06054b50,
  );
  return entries;
}

describe("Phase 2B listener-facing package", () => {
  it("renders every required control and a canonical completion export shape", () => {
    const html = renderPhase2BListeningHtml(publicDefinition());

    expect(html).toContain("<title>Blind audio listening study</title>");
    expect(html.match(/data-score="/gu)).toHaveLength(60);
    expect(html.match(/data-lock="sample-/gu)).toHaveLength(10);
    expect(html.match(/data-optional-speed="sample-/gu)).toHaveLength(
      10,
    );
    expect(html).toContain('data-pair-field="overall_preference"');
    expect(html).toContain('data-pair-field="long_lesson_preference"');
    expect(html).toContain('data-pair-field="strange_pronunciation"');
    expect(html).toContain(
      'data-pair-field="table:repeated_labels_usefulness"',
    );
    expect(html).toContain(
      'data-pair-field="table:test_more_concise_format"',
    );
    expect(html).toContain(
      `schema_version: "${PHASE2B_RESPONSE_SCHEMA_VERSION}"`,
    );
    expect(html).toContain("errors: result.errors");
    expect(html).toContain(
      'completed_at: result.status === "complete" ? exportedAt : null',
    );
    expect(html).not.toMatch(
      /\b(?:fetch|xmlhttprequest|websocket|eventsource|sendbeacon|console)\b/iu,
    );
  });

  it("accepts the exact public allowlist and only the immutable encoder marker exception", () => {
    const result = assertPhase2BPublicPackageSafe({
      publicPackage: publicDefinition(),
      files: publicFiles(),
    });

    expect(result).toMatchObject({
      passed: true,
      fileCount: 12,
      audioCount: 10,
      codecMarkerException: "LAME3.100",
    });
    expect(Object.keys(result.sha256ByPath)).toHaveLength(12);
  });

  it("fails closed on extra files, ID3 metadata, identities, and private tokens", () => {
    const definition = publicDefinition();
    expect(() =>
      assertPhase2BPublicPackageSafe({
        publicPackage: definition,
        files: [
          ...publicFiles(definition),
          { path: "notes.txt", data: "extra" },
        ],
      }),
    ).toThrow(/allowlist/u);

    const id3 = publicFiles(definition);
    id3[2] = {
      ...id3[2]!,
      data: Buffer.from("ID3 identifying comment", "utf8"),
    };
    expect(() =>
      assertPhase2BPublicPackageSafe({
        publicPackage: definition,
        files: id3,
      }),
    ).toThrow(/metadata/u);

    const identity = publicFiles(definition);
    identity[0] = {
      ...identity[0]!,
      data: `${identity[0]!.data.toString()} comparison baseline`,
    };
    expect(() =>
      assertPhase2BPublicPackageSafe({
        publicPackage: definition,
        files: identity,
      }),
    ).toThrow(/identity/u);

    expect(() =>
      assertPhase2BPublicPackageSafe({
        publicPackage: definition,
        files: publicFiles(definition),
        additionalProhibitedTokens: ["MAPPING-TOKEN-1234"],
      }),
    ).not.toThrow();
    const privateToken = publicFiles(definition);
    privateToken[1] = {
      ...privateToken[1]!,
      data: `${privateToken[1]!.data.toString()} mapping-token-1234`,
    };
    expect(() =>
      assertPhase2BPublicPackageSafe({
        publicPackage: definition,
        files: privateToken,
        additionalProhibitedTokens: ["MAPPING-TOKEN-1234"],
      }),
    ).toThrow(/private token/u);
  });
});

describe("deterministic listener ZIP", () => {
  it("is stable, stored, self-contained, and rejects unsafe names", () => {
    const entries: DeterministicZipEntry[] = [
      { path: "study/index.html", data: "page" },
      {
        path: "study/audio/sample-01-A.mp3",
        data: Buffer.from([1, 2, 3, 4]),
      },
      { path: "study/LISTENER-INSTRUCTIONS.txt", data: "steps" },
    ];
    const first = createDeterministicZip(entries);
    const second = createDeterministicZip([...entries].reverse());

    expect(second.equals(first)).toBe(true);
    const extracted = readStoredZip(first);
    expect([...extracted.keys()]).toEqual([
      "study/LISTENER-INSTRUCTIONS.txt",
      "study/audio/sample-01-A.mp3",
      "study/index.html",
    ]);
    expect(extracted.get("study/index.html")?.toString("utf8")).toBe(
      "page",
    );
    expect(() =>
      createDeterministicZip([{ path: "../escape", data: "x" }]),
    ).toThrow(/Unsafe ZIP entry path/u);
    expect(() =>
      createDeterministicZip([
        { path: "same", data: "x" },
        { path: "same", data: "y" },
      ]),
    ).toThrow(/Duplicate ZIP entry/u);
  });
});

describe("authenticated listener server policy", () => {
  it("passes its isolated policy self-test", () => {
    const script = resolve(
      process.cwd(),
      "scripts/piper-listening-server.cjs",
    );
    const result = spawnSync(process.execPath, [script, "--self-test"], {
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("self-test passed");
    expect(result.stderr).toBe("");
  });

  it("rejects non-loopback exposure without both opt-in and TLS", () => {
    const require = createRequire(import.meta.url);
    const server = require(
      "../scripts/piper-listening-server.cjs",
    ) as {
      validateExposurePolicy: (options: {
        host: string;
        allowNetworkExposure: boolean;
        tlsCert: string;
        tlsKey: string;
      }) => void;
    };

    expect(() =>
      server.validateExposurePolicy({
        host: "0.0.0.0",
        allowNetworkExposure: false,
        tlsCert: "",
        tlsKey: "",
      }),
    ).toThrow(/non-loopback/u);
    expect(() =>
      server.validateExposurePolicy({
        host: "0.0.0.0",
        allowNetworkExposure: true,
        tlsCert: "/tmp/cert",
        tlsKey: "/tmp/key",
      }),
    ).not.toThrow();
  });
});
