import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RUNTIME = resolve(
  process.cwd(),
  "scripts",
  "phase2c-audio-objective-runtime.cjs",
);
const SAMPLE_RATE = 22_050;
const EVALUATION_IMAGE = "tenxpros-piper-eval:local";

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function run(
  executable: string,
  args: readonly string[],
  cwd = process.cwd(),
) {
  return spawnSync(executable, [...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: {
      PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      NODE_ENV: process.env.NODE_ENV ?? "test",
    },
  });
}

function createFixturePcm(): Buffer {
  const frames = SAMPLE_RATE * 3;
  const pcm = Buffer.alloc(frames * 2);
  const segments = [
    { start: 0, end: 0.8, frequency: 220 },
    { start: 1.3, end: 2.1, frequency: 330 },
    { start: 2.4, end: 3, frequency: 220 },
  ];
  for (const segment of segments) {
    const startFrame = Math.round(segment.start * SAMPLE_RATE);
    const endFrame = Math.round(segment.end * SAMPLE_RATE);
    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const sample = Math.round(
        Math.sin(
          (2 * Math.PI * segment.frequency * frame) / SAMPLE_RATE,
        ) * 10_000,
      );
      pcm.writeInt16LE(sample, frame * 2);
    }
  }
  return pcm;
}

function dockerBaseArguments(): string[] {
  return [
    "run",
    "--rm",
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--pids-limit",
    "64",
    "--tmpfs",
    "/tmp:rw,nosuid,nodev,size=64m",
  ];
}

describe("Phase 2C objective audio runtime", () => {
  it("passes its dependency-free deterministic algorithm self-test", () => {
    const result = run(process.execPath, [RUNTIME, "--self-test"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      passed: true,
      assertions: 10,
      networkRequests: 0,
      modelDownloads: 0,
    });
  });

  it("analyzes an MP3 end-to-end, preserves it, and emits stable metrics and limitations", async () => {
    const directory = await mkdtemp(
      resolve(tmpdir(), "tenxpros-phase2c-objective-"),
    );
    try {
      const pcmPath = resolve(directory, "fixture.pcm");
      const mp3Path = resolve(directory, "fixture.mp3");
      const planPath = resolve(directory, "plan.json");
      const firstOutput = resolve(directory, "analysis-one.json");
      const secondOutput = resolve(directory, "analysis-two.json");
      await writeFile(pcmPath, createFixturePcm(), {
        flag: "wx",
        mode: 0o600,
      });
      const encode = run(
        "docker",
        [
          ...dockerBaseArguments(),
          "--mount",
          `type=bind,src=${directory},dst=/phase2c`,
          "--entrypoint",
          "/usr/bin/ffmpeg",
          EVALUATION_IMAGE,
          "-hide_banner",
          "-loglevel",
          "error",
          "-nostdin",
          "-f",
          "s16le",
          "-ar",
          String(SAMPLE_RATE),
          "-ac",
          "1",
          "-i",
          "/phase2c/fixture.pcm",
          "-map_metadata",
          "-1",
          "-codec:a",
          "libmp3lame",
          "-b:a",
          "64k",
          "/phase2c/fixture.mp3",
        ],
        directory,
      );
      expect(
        encode.status,
        encode.error?.message ?? encode.stderr,
      ).toBe(0);
      const sourceBefore = await readFile(mp3Path);
      const sourceSha256 = sha256(sourceBefore);
      await writeFile(
        planPath,
        `${JSON.stringify(
          {
            schemaVersion:
              "tenxpros-phase2c-objective-audio-plan-v1",
            analysisId: "phase2c-fixture",
            samples: [
              {
                id: "fixture-01",
                path: "fixture.mp3",
                expectedSha256: sourceSha256,
                referenceWordCount: 30,
                stitchBoundaries: [
                  {
                    id: "paragraph-boundary",
                    seconds: 1.3,
                    expectedPauseMs: 500,
                    pauseType: "paragraph",
                  },
                  {
                    id: "list-boundary",
                    seconds: 2.4,
                    expectedPauseMs: 300,
                    pauseType: "list",
                  },
                ],
              },
            ],
          },
          null,
          2,
        )}\n`,
        { encoding: "utf8", flag: "wx", mode: 0o600 },
      );

      const runtimeDockerArguments = (outputName: string) => [
        ...dockerBaseArguments(),
        "--mount",
        `type=bind,src=${directory},dst=/phase2c`,
        "--mount",
        `type=bind,src=${RUNTIME},dst=/runtime.cjs,readonly`,
        "--entrypoint",
        "node",
        EVALUATION_IMAGE,
        "/runtime.cjs",
        "--plan",
        "/phase2c/plan.json",
        "--output",
        `/phase2c/${outputName}`,
      ];
      const first = run(
        "docker",
        runtimeDockerArguments("analysis-one.json"),
      );
      expect(first.status, first.stderr).toBe(0);
      expect(JSON.parse(first.stdout)).toMatchObject({
        status: "COMPLETED",
        samples: 1,
        stitchBoundaries: 2,
        allSourcesPreserved: true,
        externalNetworkRequests: 0,
        modelDownloads: 0,
      });

      const second = run(
        "docker",
        runtimeDockerArguments("analysis-two.json"),
      );
      expect(second.status, second.stderr).toBe(0);
      const [firstBytes, secondBytes, sourceAfter] =
        await Promise.all([
          readFile(firstOutput),
          readFile(secondOutput),
          readFile(mp3Path),
        ]);
      expect(secondBytes.equals(firstBytes)).toBe(true);
      expect(sourceAfter.equals(sourceBefore)).toBe(true);

      const analysis = JSON.parse(firstBytes.toString("utf8"));
      expect(analysis).toMatchObject({
        schemaVersion:
          "tenxpros-phase2c-objective-audio-analysis-v1",
        recipeVersion:
          "tenxpros-phase2c-objective-audio-recipe-v1",
        isolation: {
          externalNetworkRequests: 0,
          externalApiRequests: 0,
          modelDownloads: 0,
          asrModelsLoaded: 0,
          phase2BOutputWrites: 0,
        },
        summary: {
          sampleCount: 1,
          allSourcesPreserved: true,
          suppliedStitchBoundaryCount: 2,
        },
      });
      expect(analysis.limitations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "NO_ASR" }),
          expect.objectContaining({ code: "NO_FORCED_ALIGNMENT" }),
          expect.objectContaining({
            code: "NO_PERCEPTUAL_JUDGMENT",
          }),
        ]),
      );
      const sample = analysis.samples[0];
      expect(sample.source).toMatchObject({
        sha256: sourceSha256,
        byteForBytePreserved: true,
        metadataPreserved: true,
      });
      expect(sample.duration.decodedSeconds).toBeCloseTo(3, 1);
      expect(sample.speakingRate.wordsPerMinute).toBeGreaterThan(590);
      expect(sample.speakingRate.wordsPerMinute).toBeLessThan(610);
      expect(
        sample.speakingRate.estimatedVoicedSeconds,
      ).toBeLessThan(sample.duration.decodedSeconds);
      expect(
        sample.speakingRate.estimatedActiveSpeechWordsPerMinute,
      ).toBeGreaterThan(sample.speakingRate.wordsPerMinute);
      expect(sample.silence.eventCount).toBeGreaterThanOrEqual(2);
      expect(sample.silence.ratio).toBeGreaterThan(0.2);
      expect(sample.loudness.integratedLufs).toEqual(
        expect.any(Number),
      );
      expect(sample.loudness.loudnessRangeLu).toEqual(
        expect.any(Number),
      );
      expect(sample.loudness.truePeakDbtp).toEqual(
        expect.any(Number),
      );
      expect(sample.clipping.possibleClipping).toBe(false);
      expect(sample.stitchBoundaries).toHaveLength(2);
      expect(
        sample.semanticPauseCoverage.expectedBoundaryCount,
      ).toBe(2);
      expect(
        sample.semanticPauseCoverage.allExpectedPausesCovered,
      ).toBe(true);
      expect(
        sample.semanticPauseCoverage.byPauseType.paragraph
          .expectedCount,
      ).toBe(1);
      expect(
        sample.stitchBoundaries.every(
          (boundary: {
            measuredPause: { covered: boolean };
          }) => boundary.measuredPause.covered,
        ),
      ).toBe(true);
      expect(
        sample.stitchBoundaries[0].crossSpeechStitchFeatures,
      ).toMatchObject({
        energyDeltaDb: expect.any(Number),
        spectralCentroidDeltaHz: expect.any(Number),
        requiresPerceptualReview: true,
      });
      expect(sample.cannotEstablish).toContain(
        "pronunciation correctness",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 30_000);
});
