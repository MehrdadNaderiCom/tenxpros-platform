import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CONDITIONAL_PIPER_OUTPUT_ROOT,
  buildConditionalPiperDockerInvocation,
  conditionalPiperResultPath,
  executeConditionalPiperPlan,
} from "../scripts/conditional-piper-generator";
import {
  CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO,
  assembleConditionalAudioClips,
  buildLocalVoicePiperPlan,
  buildTunedBrycePiperPlan,
  maximumConditionalGeneratedDurationSeconds,
  serializeConditionalPiperPlan,
  validateConditionalPiperRuntimeResult,
  type ConditionalPiperGenerationPlan,
  type ConditionalPiperRuntimeResult,
  type FrozenCorrectedPiperExcerpt,
} from "../src/lib/academy/narration/conditional-piper-generation";
import {
  createLocalVoiceConditionalDraft,
  createTuningConditionalDraft,
} from "../src/lib/academy/narration/ai-audio-conditional-evaluation";
import {
  hashAiValue,
  type AiTuningFailureSignal,
} from "../src/lib/academy/narration/ai-audio-evaluation";

const BASE_PLAN_HASH = "a".repeat(64);
const PHASE2B_MANIFEST_HASH = "b".repeat(64);
const SOURCE_RECIPE_HASH = "c".repeat(64);

const REQUIRED_CHECKS = [
  "TRANSCRIPT_RECONSTRUCTION",
  "SEGMENT_ORDER",
  "NETWORK_ISOLATED",
  "NO_DATABASE_RUNTIME",
  "OUTPUT_ISOLATED_FROM_PRODUCTION",
  "SEGMENT_COUNT",
  "INSERTED_SILENCE_EXACT",
  "POST_NORMALIZATION_SILENCE_EXACT",
  "FRAME_COUNT_PRESERVED",
  "MP3_DECODABLE",
  "MP3_CODEC",
  "SAMPLE_RATE",
  "MONO_CHANNEL",
  "CBR_64K",
  "CONDITIONAL_DURATION_LIMIT",
  "INTEGRATED_LOUDNESS_RANGE",
  "TRUE_PEAK_LIMIT",
  "NO_FULL_SCALE_SAMPLES",
  "NO_CLIPPING_PLATEAU",
  "PUBLISHED_COPY_INTEGRITY",
] as const;

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function excerpt(
  index: number,
  options: {
    pauseType?: FrozenCorrectedPiperExcerpt["segments"][number]["pauseType"];
    sameBlock?: boolean;
    sourceRecipeHash?: string;
  } = {},
): FrozenCorrectedPiperExcerpt {
  const firstText = `Frozen excerpt ${String(index)} first sentence.`;
  const secondText = `Frozen excerpt ${String(index)} second sentence.`;
  const transcript = `${firstText} ${secondText}`;
  return {
    excerptId: `excerpt-${String(index).padStart(2, "0")}`,
    sourceSampleId: `sample-${String(index).padStart(2, "0")}-A`,
    sourceAudioSha256: hashAiValue(["source-audio", index]),
    sourceAudioDurationSeconds: 20 + index,
    sourceRecipeHash:
      options.sourceRecipeHash ?? SOURCE_RECIPE_HASH,
    transcript,
    transcriptSha256: sha256(transcript),
    segments: [
      {
        id: `semantic:root/p[${String(index)}]:sentence[1]`,
        sourceBlockId: `root/row[${String(index)}]`,
        text: firstText,
        textSha256: sha256(firstText),
        pauseAfterMs: 220,
        pauseReason: "sentence-boundary",
        pauseType: options.pauseType ?? "sentence",
      },
      {
        id: `semantic:root/p[${String(index)}]:sentence[2]`,
        sourceBlockId: options.sameBlock
          ? `root/row[${String(index)}]`
          : `root/p[${String(index)}]`,
        text: secondText,
        textSha256: sha256(secondText),
        pauseAfterMs: 0,
        pauseReason: "sample-end",
        pauseType: "sampleEnd",
      },
    ],
  };
}

function localVoicePlan(
  voice: "linda" | "cori" = "linda",
): ConditionalPiperGenerationPlan {
  const excerpts = [1, 2, 3, 4, 5].map((index) =>
    excerpt(index),
  );
  const draft = createLocalVoiceConditionalDraft({
    basePlanHash: BASE_PLAN_HASH,
    excerptIds: excerpts.map((item) => item.excerptId),
  });
  return buildLocalVoicePiperPlan({
    draft,
    phase2BManifestSha256: PHASE2B_MANIFEST_HASH,
    voice,
    excerpts,
  });
}

function tuningDraft(
  signal: AiTuningFailureSignal,
  excerptId = "excerpt-01",
) {
  return createTuningConditionalDraft({
    basePlanHash: BASE_PLAN_HASH,
    signals: [signal],
    affectedExcerptIdsByDimension: {
      [signal.dimension]: [excerptId],
    },
  });
}

function runtimeResult(
  plan: ConditionalPiperGenerationPlan,
  runtimePlanBytesSha256 = sha256(
    serializeConditionalPiperPlan(plan),
  ),
): ConditionalPiperRuntimeResult {
  return {
    version: "piper-corrected-evaluation-results-v1",
    runtimeVersion: "piper-corrected-evaluation-runtime-v1",
    plan: {
      version: plan.version,
      recipeHash: plan.recipeHash,
      sha256: runtimePlanBytesSha256,
      sampleCount: plan.samples.length,
      correctedOnly: true,
      lengthScale: plan.lengthScale,
    },
    isolation: {
      isolated: true,
      externalApiRequests: 0,
      databaseImports: 0,
      prismaImports: 0,
    },
    voice: {
      id: plan.voice.id,
      modelSha256: plan.voice.modelSha256,
      expectedModelSha256Matched: true,
      configSha256: plan.voice.configSha256,
      nativeSampleRate: 22_050,
    },
    audioRecipe: {
      lengthScale: plan.lengthScale,
    },
    summary: {
      samples: plan.samples.length,
      passed: plan.samples.length,
      failed: 0,
      allPassed: true,
      allEligibleForBlindReview: true,
      qualityPassed: plan.samples.length,
    },
    samples: plan.samples.map((sample, index) => ({
      pairId: sample.pairId,
      fileName: sample.fileName,
      outputFile: `listening/audio/${sample.fileName}`,
      durationSeconds: 21 + index,
      sizeBytes: 100_000 + index,
      sha256: hashAiValue([
        "generated-audio",
        plan.candidateId,
        index,
      ]),
      transcriptSha256:
        plan.sourceAudit[index]!.transcriptSha256,
      passed: true,
      published: true,
      qualityPassed: true,
      eligibleForBlindReview: true,
      checks: REQUIRED_CHECKS.map((id) => ({
        id,
        pass: true,
      })),
    })),
  };
}

describe("conditional local Piper generation", () => {
  it("builds corrected-only Linda and Cori plans for exactly the same five frozen excerpts", () => {
    for (const voice of ["linda", "cori"] as const) {
      const plan = localVoicePlan(voice);
      expect(plan.branchKind).toBe("LOCAL_VOICES");
      expect(plan.candidateId).toBe(`voice-${voice}`);
      expect(plan.voice.id).toBe(voice);
      expect(plan.samples).toHaveLength(5);
      expect(plan.durationLimit).toEqual({
        basis: "frozen_corrected_bryce_excerpt_duration",
        maximumGeneratedToSourceRatio:
          CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO,
        enforcementCheck: "CONDITIONAL_DURATION_LIMIT",
        enforcedBeforeConditionalApi: true,
      });
      expect(
        plan.samples.every(
          (sample, index) =>
            sample.pipeline === "corrected" &&
            sample.sentenceSilenceSeconds === 0 &&
            sample.maximumDurationSeconds ===
              maximumConditionalGeneratedDurationSeconds(
                plan.sourceAudit[index]!
                  .sourceAudioDurationSeconds,
              ),
        ),
      ).toBe(true);
      expect(
        plan.samples.map((sample) => sample.transcript),
      ).toEqual(
        plan.sourceAudit.map((source, index) => {
          expect(source.excerptId).toBe(
            `excerpt-${String(index + 1).padStart(2, "0")}`,
          );
          return plan.samples[index]!.transcript;
        }),
      );
      expect(plan.sourceRecipeSetHash).toMatch(/^[a-f0-9]{64}$/u);
      expect(plan.recipeHash).toMatch(/^[a-f0-9]{64}$/u);
      expect(plan.recipeHash).not.toBe(SOURCE_RECIPE_HASH);
      expect(plan.preservation).toMatchObject({
        baselineSamplesGenerated: false,
        substantiveSpokenWordingChanged: false,
        productionWrites: false,
      });
    }
  });

  it("binds differing per-excerpt source recipes into one canonical voice-specific generation recipe", () => {
    const excerpts = [1, 2, 3, 4, 5].map((index) =>
      excerpt(index, {
        sourceRecipeHash: hashAiValue([
          "realistic-source-recipe",
          index,
        ]),
      }),
    );
    const draft = createLocalVoiceConditionalDraft({
      basePlanHash: BASE_PLAN_HASH,
      excerptIds: excerpts.map((item) => item.excerptId),
    });
    const linda = buildLocalVoicePiperPlan({
      draft,
      phase2BManifestSha256: PHASE2B_MANIFEST_HASH,
      voice: "linda",
      excerpts,
    });
    const cori = buildLocalVoicePiperPlan({
      draft,
      phase2BManifestSha256: PHASE2B_MANIFEST_HASH,
      voice: "cori",
      excerpts,
    });
    const expectedSetHash = hashAiValue(
      excerpts.map((item) => ({
        excerptId: item.excerptId,
        sourceRecipeHash: item.sourceRecipeHash,
      })),
    );
    expect(linda.sourceRecipeSetHash).toBe(expectedSetHash);
    expect(cori.sourceRecipeSetHash).toBe(expectedSetHash);
    expect(linda.recipeHash).not.toBe(cori.recipeHash);
    expect(
      linda.sourceAudit.map((item) => item.sourceRecipeHash),
    ).toEqual(excerpts.map((item) => item.sourceRecipeHash));

    const resultHash = sha256(
      serializeConditionalPiperPlan(linda),
    );
    const generated = validateConditionalPiperRuntimeResult({
      plan: linda,
      runtimePlanBytesSha256: resultHash,
      result: runtimeResult(linda, resultHash),
    });
    expect(
      generated.map((item) => item.sourceRecipeHash),
    ).toEqual(excerpts.map((item) => item.sourceRecipeHash));
    expect(
      new Set(
        generated.map((item) => item.sourceRecipeSetHash),
      ),
    ).toEqual(new Set([expectedSetHash]));
  });

  it("tunes only the selected affected excerpt and preserves its exact transcript", () => {
    const frozen = excerpt(1);
    const draft = tuningDraft({
      dimension: "sentence_pause",
      direction: "too_long",
      severity: 0.9,
      evidence: ["Sentence pauses were audibly long."],
    });
    const plan = buildTunedBrycePiperPlan({
      draft,
      phase2BManifestSha256: PHASE2B_MANIFEST_HASH,
      profileId: draft.profiles[0]!.profileId,
      excerpts: [frozen],
    });
    expect(plan.voice.id).toBe("bryce");
    expect(plan.samples).toHaveLength(1);
    expect(plan.samples[0]!.transcript).toBe(frozen.transcript);
    expect(plan.samples[0]!.segments[0]!.pauseAfterMs).toBe(180);
    expect(plan.samples[0]!.segments[1]!.pauseAfterMs).toBe(0);
    expect(plan.lengthScale).toBe(1);
    expect(() =>
      buildTunedBrycePiperPlan({
        draft,
        phase2BManifestSha256: PHASE2B_MANIFEST_HASH,
        profileId: draft.profiles[0]!.profileId,
        excerpts: [excerpt(2)],
      }),
    ).toThrow(/exactly match/u);
  });

  it("supports safe speaking-rate and transcript-preserving table grouping profiles", () => {
    const rateDraft = tuningDraft({
      dimension: "speaking_rate",
      direction: "too_slow",
      severity: 0.8,
      evidence: ["Delivery was slow."],
    });
    const ratePlan = buildTunedBrycePiperPlan({
      draft: rateDraft,
      phase2BManifestSha256: PHASE2B_MANIFEST_HASH,
      profileId: rateDraft.profiles[0]!.profileId,
      excerpts: [excerpt(1)],
    });
    expect(ratePlan.lengthScale).toBe(0.952381);
    expect(ratePlan.samples[0]!.transcript).toBe(
      excerpt(1).transcript,
    );

    const groupingDraft = tuningDraft({
      dimension: "short_table_field_grouping",
      direction: "too_fragmented",
      severity: 0.85,
      evidence: ["Short fields sounded fragmented."],
    });
    const frozenTable = excerpt(1, {
      pauseType: "tableRow",
      sameBlock: true,
    });
    const groupingPlan = buildTunedBrycePiperPlan({
      draft: groupingDraft,
      phase2BManifestSha256: PHASE2B_MANIFEST_HASH,
      profileId: groupingDraft.profiles[1]!.profileId,
      excerpts: [frozenTable],
    });
    expect(groupingPlan.samples[0]!.segments).toHaveLength(1);
    expect(groupingPlan.samples[0]!.segments[0]!.text).toBe(
      frozenTable.transcript,
    );
    expect(groupingPlan.samples[0]!.transcript).toBe(
      frozenTable.transcript,
    );
  });

  it("fails closed when a table-label profile would change the frozen spoken transcript", () => {
    const draft = tuningDraft({
      dimension: "table_label_repetition",
      direction: "too_repetitive",
      severity: 0.9,
      evidence: ["Repeated labels caused fatigue."],
    });
    expect(() =>
      buildTunedBrycePiperPlan({
        draft,
        phase2BManifestSha256: PHASE2B_MANIFEST_HASH,
        profileId: draft.profiles[0]!.profileId,
        excerpts: [
          excerpt(1, {
            pauseType: "tableRow",
            sameBlock: true,
          }),
        ],
      }),
    ).toThrow(/frozen transcript/u);
  });

  it("validates exact model, config, recipe, plan, audio, loudness, and integrity bindings", () => {
    const plan = localVoicePlan();
    const bytes = serializeConditionalPiperPlan(plan);
    const bytesHash = sha256(bytes);
    const result = runtimeResult(plan, bytesHash);
    const generated = validateConditionalPiperRuntimeResult({
      plan,
      runtimePlanBytesSha256: bytesHash,
      result,
    });
    expect(generated).toHaveLength(5);
    expect(generated[0]).toMatchObject({
      candidateId: "voice-linda",
      voice: "linda",
      objectiveIntegrityPass: true,
      contentConsistency: 1,
      modelSha256: plan.voice.modelSha256,
      configSha256: plan.voice.configSha256,
      generationRecipeHash: plan.recipeHash,
      planHash: plan.planHash,
    });
    expect(() =>
      validateConditionalPiperRuntimeResult({
        plan,
        runtimePlanBytesSha256: bytesHash,
        result: {
          ...result,
          voice: {
            ...result.voice,
            configSha256: "d".repeat(64),
          },
        },
      }),
    ).toThrow(/model\/config identity/u);
    expect(() =>
      validateConditionalPiperRuntimeResult({
        plan,
        runtimePlanBytesSha256: bytesHash,
        result: {
          ...result,
          samples: result.samples.map((sample, index) => ({
            ...sample,
            checks:
              index === 0
                ? sample.checks.filter(
                    (check) =>
                      check.id !==
                      "INTEGRATED_LOUDNESS_RANGE",
                  )
                : sample.checks,
          })),
        },
      }),
    ).toThrow(/INTEGRATED_LOUDNESS_RANGE/u);
  });

  it("fails closed before API binding when generated audio exceeds the hash-bound source-duration ceiling", () => {
    const plan = localVoicePlan();
    const bytesHash = sha256(
      serializeConditionalPiperPlan(plan),
    );
    const result = runtimeResult(plan, bytesHash);
    expect(() =>
      validateConditionalPiperRuntimeResult({
        plan,
        runtimePlanBytesSha256: bytesHash,
        result: {
          ...result,
          samples: result.samples.map((sample, index) =>
            index === 0
              ? {
                  ...sample,
                  durationSeconds:
                    plan.samples[0]!
                      .maximumDurationSeconds + 0.001,
                }
              : sample,
          ),
        },
      }),
    ).toThrow(/duration limit/iu);
  });

  it("builds a no-network, read-only Docker invocation with no secret, database, or production mount", () => {
    const outputDirectory = resolve(
      CONDITIONAL_PIPER_OUTPUT_ROOT,
      "synthetic-invocation",
    );
    const planPath = resolve(
      outputDirectory,
      "private",
      "conditional-plan.json",
    );
    const invocation =
      buildConditionalPiperDockerInvocation({
        outputDirectory,
        planPath,
      });
    expect(invocation.command).toBe("docker");
    expect(invocation.args).toContain("none");
    expect(invocation.args).toContain("--read-only");
    expect(invocation.args).toContain("ALL");
    expect(invocation.security).toEqual({
      network: "none",
      rootFilesystem: "read-only",
      capabilities: "none",
      noNewPrivileges: true,
      databaseEnvironmentForwarded: false,
      apiSecretForwarded: false,
      productionPathMounted: false,
    });
    expect(JSON.stringify(invocation)).not.toMatch(
      /DATABASE_URL|openai_audio_judge_key|AcademyLessonAudio/u,
    );
    expect(() =>
      buildConditionalPiperDockerInvocation({
        outputDirectory: "/opt/tenxpros/app",
        planPath: "/opt/tenxpros/app/plan.json",
      }),
    ).toThrow(/below/u);
  });

  it("executes through a mockable Docker seam without generating any real branch audio", async () => {
    await mkdir(CONDITIONAL_PIPER_OUTPUT_ROOT, {
      recursive: true,
    });
    const outputDirectory = await mkdtemp(
      resolve(
        CONDITIONAL_PIPER_OUTPUT_ROOT,
        "synthetic-adapter-",
      ),
    );
    temporaryDirectories.push(outputDirectory);
    const privateDirectory = resolve(
      outputDirectory,
      "private",
    );
    await mkdir(privateDirectory, { recursive: true });
    const plan = localVoicePlan("cori");
    const planPath = resolve(
      privateDirectory,
      "conditional-plan.json",
    );
    const serialized = serializeConditionalPiperPlan(plan);
    await writeFile(planPath, serialized, {
      encoding: "utf8",
      flag: "wx",
    });
    const expectedResult = runtimeResult(
      plan,
      sha256(serialized),
    );
    let calls = 0;
    const generated = await executeConditionalPiperPlan(
      {
        plan,
        planPath,
        outputDirectory,
      },
      {
        run: async (invocation) => {
          calls += 1;
          expect(invocation.security.network).toBe("none");
          await writeFile(
            conditionalPiperResultPath(outputDirectory),
            `${JSON.stringify(expectedResult, null, 2)}\n`,
            "utf8",
          );
          return { exitCode: 0, stdout: "", stderr: "" };
        },
      },
    );
    expect(calls).toBe(1);
    expect(generated).toHaveLength(5);
    expect(
      JSON.parse(await readFile(planPath, "utf8")),
    ).toEqual(plan);
  });

  it("assembles only the complete source/generated candidate cross-product", () => {
    const excerpts = [1, 2, 3, 4, 5].map((index) =>
      excerpt(index),
    );
    const draft = createLocalVoiceConditionalDraft({
      basePlanHash: BASE_PLAN_HASH,
      excerptIds: excerpts.map((item) => item.excerptId),
    });
    const generated = (
      ["linda", "cori"] as const
    ).flatMap((voice) => {
      const plan = buildLocalVoicePiperPlan({
        draft,
        phase2BManifestSha256: PHASE2B_MANIFEST_HASH,
        voice,
        excerpts,
      });
      const bytesHash = sha256(
        serializeConditionalPiperPlan(plan),
      );
      return validateConditionalPiperRuntimeResult({
        plan,
        runtimePlanBytesSha256: bytesHash,
        result: runtimeResult(plan, bytesHash),
      });
    });
    const sourceClips = excerpts.map((item) => ({
      excerptId: item.excerptId,
      candidateId: "voice-bryce",
      audioSha256: item.sourceAudioSha256,
      durationSeconds: item.sourceAudioDurationSeconds,
      objectiveIntegrityPass: true,
      contentConsistency: 1,
    }));
    expect(
      assembleConditionalAudioClips({
        draft,
        sourceClips,
        generated,
      }),
    ).toHaveLength(15);
    expect(() =>
      assembleConditionalAudioClips({
        draft,
        sourceClips: sourceClips.slice(1),
        generated,
      }),
    ).toThrow(/cross-product/u);
  });
});
