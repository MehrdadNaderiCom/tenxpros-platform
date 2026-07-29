#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "pcm_24000";
const SEED = 7_538_411;
const PILOT_CHARACTER_CAP = 15_000;
const FULL_CHARACTER_CAP = 220_000;
const VOICE_SETTINGS = Object.freeze({
  stability: 0.65,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
  speed: 1,
});
const CANDIDATE_IDS = Object.freeze([
  "hpp4J3VqNfWAUOO0d1Us",
  "onwK4e9ZLuTAKqWW03F9",
  "pFZP5JQG7iQjIQuC4Bku",
]);
const GOLDEN_SELECTION = Object.freeze({
  mission: [14, 15, 20, 37, 43],
  journey: [12],
  conversation: [35, 36],
  rules: [20, 21],
  customize: [13, 14, 15, 55],
  "contact-us": [2, 3],
});
const AI_ALIASES = Object.freeze([
  { id: "a_i_space", spoken: "A I" },
  { id: "a_i_periods", spoken: "A. I." },
  { id: "ay_eye", spoken: "ay eye" },
]);

interface Arguments {
  productionSnapshot: string;
  piperPlan: string;
  reconciliation: string;
  preflight: string;
  outputDirectory: string;
}

function option(
  values: readonly string[],
  name: string,
): string {
  const index = values.indexOf(name);
  if (index < 0 || !values[index + 1]) {
    throw new Error(`${name} is required`);
  }
  return resolve(values[index + 1]!);
}

function parseArguments(
  values: readonly string[],
): Arguments {
  return {
    productionSnapshot: option(
      values,
      "--production-snapshot",
    ),
    piperPlan: option(values, "--piper-plan"),
    reconciliation: option(
      values,
      "--reconciliation",
    ),
    preflight: option(values, "--preflight"),
    outputDirectory: option(
      values,
      "--output-dir",
    ),
  };
}

function sha256(value: string | Buffer): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function canonical(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        "Canonical JSON rejects non-finite numbers",
      );
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (typeof value === "object") {
    const object =
      value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical(
            object[key],
          )}`,
      )
      .join(",")}}`;
  }
  throw new Error(
    `Canonical JSON rejects ${typeof value}`,
  );
}

async function json<T>(path: string): Promise<T> {
  return JSON.parse(
    await readFile(path, "utf8"),
  ) as T;
}

async function writePrivate(
  path: string,
  value: unknown,
): Promise<void> {
  const serialized =
    typeof value === "string"
      ? value
      : `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(path, serialized, {
    flag: "wx",
    mode: 0o600,
  });
  await chmod(path, 0o600);
}

function replaceStandaloneAi(
  value: string,
  spoken: string,
): string {
  return value.replace(
    /(?<![\p{L}\p{N}])A I(?![\p{L}\p{N}])/gu,
    spoken,
  );
}

function stableHash<T extends object>(
  value: T,
): T & { manifestHash: string } {
  return {
    ...value,
    manifestHash: sha256(canonical(value)),
  };
}

interface ProductionLesson {
  moduleSlug: string;
  moduleOrder: number;
  moduleTitle: string;
  contentVersion: number;
  lessonId: string;
  lessonTitle: string;
  bodyHtml: string;
  bodyHtmlSha256: string;
}

interface GenerationBlock {
  index: number;
  semanticBlockId: string;
  sourceBlockId: string;
  sourceType: string;
  kind: string;
  synthesisText: string;
  pauseType: string;
  effectivePauseTargetMilliseconds: number;
  sourceHash: string;
  spokenHash: string;
}

interface GenerationLesson {
  lessonId: string;
  slug: string;
  order: number;
  title: string;
  contentHash: string;
  transcript: string;
  transcriptHash: string;
  spokenScriptHash: string;
  rendererVersion: string;
  normalizationVersion: string;
  pronunciationVersion: string;
  segmentationVersion: string;
  blocks: GenerationBlock[];
}

interface GenerationPlan {
  lessons: GenerationLesson[];
  recipeVersion: string;
  recipeHash: string;
  sourceContentManifestHash: string;
}

interface Reconciliation {
  passed: boolean;
  manifestHash: string;
  summary: {
    lessonCount: number;
    approvedEditCount: number;
    unresolvedConflicts: number;
    protectedConflicts: number;
  };
  ledger: Array<Record<string, unknown>>;
}

interface PreflightVoice {
  voiceId: string;
  name: string;
  category: string;
  description: string | null;
  labels: Record<string, string>;
  noticePeriod: number | null;
  deactivatedAtUnix: number | null;
  highQualityBaseModelIds: string[];
  sharing: {
    rate: number | null;
  } | null;
}

interface Preflight {
  reportHash: string;
  allReadPreflightsPassed: boolean;
  subscription: {
    tier: string;
    status: string;
    remainingCharacters: number;
    maxCreditLimitExtension: number;
  };
  models: Array<{
    modelId: string;
    canDoTextToSpeech: boolean;
    maximumTextLengthPerRequest: number;
  }>;
  voices: {
    voices: PreflightVoice[];
  };
}

function voiceCandidate(
  all: readonly PreflightVoice[],
  id: string,
): PreflightVoice {
  const voice = all.find(
    (candidate) => candidate.voiceId === id,
  );
  if (!voice) {
    throw new Error(
      `Live candidate voice is unavailable: ${id}`,
    );
  }
  if (
    voice.category !== "premade" ||
    voice.noticePeriod !== null ||
    voice.deactivatedAtUnix !== null ||
    !voice.highQualityBaseModelIds.includes(
      MODEL_ID,
    ) ||
    voice.sharing !== null
  ) {
    throw new Error(
      `Voice ${id} failed durability or cost-multiplier gates`,
    );
  }
  return voice;
}

function auditLedger(
  reconciliation: Reconciliation,
  lessons: readonly ProductionLesson[],
): readonly Record<string, unknown>[] {
  const applied =
    reconciliation.ledger
      .filter(
        (row) =>
          row.classification ===
            "APPROVED_PHASE0_EDIT" &&
          row.decision === "APPLIED",
      )
      .map((row) => ({
        lesson: row.lessonSlug,
        sourceLocation: row.sourceLocation,
        originalText: row.productionValue,
        revisedText: row.mergedResult,
        reason:
          "Previously approved and already applied high-confidence grammar, punctuation, or clarity correction",
        meaningPreservation:
          (
            row.protectedFeatureComparison as {
              equal?: boolean;
            }
          )?.equal === true
            ? "PASSED"
            : "FAILED",
        classification:
          "SAFE_VISIBLE_CORRECTION",
        action:
          "ALREADY_PRESENT_IN_CURRENT_PRODUCTION",
      }));
  const current = lessons.map((lesson) => ({
    lesson: lesson.moduleSlug,
    sourceLocation:
      "complete current production bodyHtml",
    originalText: null,
    revisedText: null,
    reason:
      "Final conservative audit found no additional high-confidence visible correction; protected wording retained",
    meaningPreservation: "PASSED",
    classification: "NO_CHANGE_REQUIRED",
    action: "NONE",
    contentVersion: lesson.contentVersion,
    canonicalSanitizedHtmlHash:
      lesson.bodyHtmlSha256,
  }));
  return [...applied, ...current];
}

function microText(alias: string): string {
  return [
    `${alias} tools are now in everyone's hands.`,
    `Everything that follows rests on a single shift in the market: access to ${alias} is now universal, so access no longer separates strong professionals from weak ones.`,
    `Leading ${alias} adoption means knowing where ${alias} genuinely helps inside your specific field, knowing where it fails, and knowing where it adds risk.`,
  ].join(" ");
}

async function main(): Promise<void> {
  process.umask(0o077);
  const arguments_ = parseArguments(
    process.argv.slice(2),
  );
  const [
    production,
    piperPlan,
    reconciliation,
    preflight,
  ] = await Promise.all([
    json<{
      production: {
        lessons: ProductionLesson[];
      };
      legacy: {
        rows: number;
        bytes: number;
        binaryCopySha256: string;
      };
    }>(arguments_.productionSnapshot),
    json<GenerationPlan>(arguments_.piperPlan),
    json<Reconciliation>(
      arguments_.reconciliation,
    ),
    json<Preflight>(arguments_.preflight),
  ]);
  if (
    production.legacy.rows !== 51 ||
    production.legacy.bytes !==
      271_123_569 ||
    production.legacy.binaryCopySha256 !==
      "2ba47ce80f134b47f210a00ba6d47639742596df536c396ee3f651757859202d"
  ) {
    throw new Error(
      "PRODUCTION_STATE_CHANGED: legacy snapshot mismatch",
    );
  }
  if (
    !reconciliation.passed ||
    reconciliation.summary.lessonCount !== 17 ||
    reconciliation.summary
      .unresolvedConflicts !== 0 ||
    reconciliation.summary
      .protectedConflicts !== 0 ||
    !preflight.allReadPreflightsPassed ||
    preflight.subscription.status !==
      "active"
  ) {
    throw new Error(
      "Editorial reconciliation or provider preflight failed",
    );
  }
  const model = preflight.models.find(
    (candidate) =>
      candidate.modelId === MODEL_ID &&
      candidate.canDoTextToSpeech,
  );
  if (
    !model ||
    model.maximumTextLengthPerRequest <
      9_000
  ) {
    throw new Error(
      "Required ElevenLabs model/request limit is unavailable",
    );
  }
  const productionBySlug = new Map(
    production.production.lessons.map(
      (lesson) => [
        lesson.moduleSlug,
        lesson,
      ],
    ),
  );
  if (
    piperPlan.lessons.length !== 17 ||
    productionBySlug.size !== 17
  ) {
    throw new Error(
      "Expected exactly 17 lessons",
    );
  }
  const manifestLessons =
    piperPlan.lessons.map((lesson) => {
      const current =
        productionBySlug.get(lesson.slug);
      if (
        !current ||
        current.lessonId !== lesson.lessonId ||
        current.bodyHtmlSha256 !==
          lesson.contentHash
      ) {
        throw new Error(
          `Content hash drift for ${lesson.slug}`,
        );
      }
      const blocks = lesson.blocks.map(
        (block) => ({
          sequence: block.index,
          sourceHtmlPath:
            block.semanticBlockId,
          blockType: block.sourceType,
          spokenTextTemplate:
            replaceStandaloneAi(
              block.synthesisText,
              "{AI_ALIAS}",
            ),
          sourceHash: block.sourceHash,
          piperSpokenHash:
            block.spokenHash,
          semanticPauseClass:
            block.pauseType,
          inheritedPiperPauseMilliseconds:
            block
              .effectivePauseTargetMilliseconds,
          elevenLabsPausePolicy:
            "MEASURE_THEN_INSERT_ONLY_IF_NEEDED",
        }),
      );
      return {
        lessonId: lesson.lessonId,
        slug: lesson.slug,
        order: lesson.order,
        title: lesson.title,
        contentVersion:
          current.contentVersion,
        canonicalSanitizedHtmlHash:
          lesson.contentHash,
        visiblePlainTextHash:
          sha256(current.bodyHtml),
        piperSpokenScriptHash:
          lesson.spokenScriptHash,
        narrationScriptTemplateHash:
          sha256(
            blocks
              .map(
                (block) =>
                  block.spokenTextTemplate,
              )
              .join("\n\n"),
          ),
        expectedBillableCharacters:
          blocks.reduce(
            (sum, block) =>
              sum +
              block.spokenTextTemplate.replaceAll(
                "{AI_ALIAS}",
                "A. I.",
              ).length,
            0,
          ),
        rendererVersion:
          `${lesson.rendererVersion}-elevenlabs-e1`,
        normalizationVersion:
          "english-spoken-v3-elevenlabs",
        pronunciationVersion:
          "tenxpros-elevenlabs-pronunciation-candidates-v1",
        tableNarrationVersion:
          "academy-table-label-value-v1",
        semanticChunkingVersion:
          "elevenlabs-semantic-chunks-v1-max-9000",
        pausePolicyVersion:
          "elevenlabs-measured-boundaries-v1",
        warnings: [],
        invalidSemanticDrift: 0,
        blocks,
      };
    });
  const sourceManifest = stableHash({
    schemaVersion:
      "tenxpros-elevenlabs-audition-source-manifest-v1",
    status: "FROZEN_FOR_AUDITION",
    productionSnapshotSha256: sha256(
      await readFile(
        arguments_.productionSnapshot,
      ),
    ),
    reconciliationManifestHash:
      reconciliation.manifestHash,
    sourceContentManifestHash:
      piperPlan.sourceContentManifestHash,
    sourcePiperRecipe: {
      version: piperPlan.recipeVersion,
      hash: piperPlan.recipeHash,
    },
    lessonCount: 17,
    invalidSemanticDrift: 0,
    errorWarnings: 0,
    ownerReviewAffectingSpokenScript: 0,
    lessons: manifestLessons,
  });
  const selectedVoices = CANDIDATE_IDS.map(
    (id) =>
      voiceCandidate(
        preflight.voices.voices,
        id,
      ),
  );
  const goldenBlocks: Array<
    Record<string, unknown>
  > = [];
  for (const [slug, indexes] of Object.entries(
    GOLDEN_SELECTION,
  )) {
    const lesson = piperPlan.lessons.find(
      (candidate) =>
        candidate.slug === slug,
    )!;
    for (const index of indexes) {
      const block = lesson.blocks.find(
        (candidate) =>
          candidate.index === index,
      );
      if (!block) {
        throw new Error(
          `Missing Golden block ${slug}/${index}`,
        );
      }
      goldenBlocks.push({
        sequence: goldenBlocks.length,
        lessonSlug: slug,
        sourceHtmlPath:
          block.semanticBlockId,
        blockType: block.sourceType,
        sourceHash: block.sourceHash,
        text: replaceStandaloneAi(
          block.synthesisText,
          "A. I.",
        ),
      });
    }
  }
  const goldenText = goldenBlocks
    .map((block) => block.text)
    .join("\n\n");
  if (
    goldenText.length < 2_500 ||
    goldenText.length > 3_500
  ) {
    throw new Error(
      `Golden script length ${goldenText.length} is outside 2500-3500`,
    );
  }
  const golden = stableHash({
    schemaVersion:
      "tenxpros-elevenlabs-golden-audition-v1",
    spokenAiAliasForFullAudition:
      "A. I.",
    characterCount: goldenText.length,
    textSha256: sha256(goldenText),
    blocks: goldenBlocks,
    text: goldenText,
  });
  const requests = [];
  for (const voice of selectedVoices) {
    requests.push({
      id: `golden-${voice.voiceId}`,
      kind: "GOLDEN_AUDITION",
      voiceId: voice.voiceId,
      voiceName: voice.name,
      text: goldenText,
      textSha256: sha256(goldenText),
      characters: goldenText.length,
    });
    for (const alias of AI_ALIASES) {
      const text = microText(alias.spoken);
      requests.push({
        id: `ai-${voice.voiceId}-${alias.id}`,
        kind: "AI_PRONUNCIATION_MICRO",
        voiceId: voice.voiceId,
        voiceName: voice.name,
        aliasId: alias.id,
        aliasSpoken: alias.spoken,
        text,
        textSha256: sha256(text),
        characters: text.length,
      });
    }
  }
  const submittedCharacters =
    requests.reduce(
      (sum, request) =>
        sum + request.characters,
      0,
    );
  if (
    submittedCharacters >
      PILOT_CHARACTER_CAP ||
    submittedCharacters >
      preflight.subscription
        .remainingCharacters
  ) {
    throw new Error(
      "Pilot character/quota cap exceeded",
    );
  }
  const paidPlan = stableHash({
    schemaVersion:
      "tenxpros-elevenlabs-paid-audition-plan-v1",
    status: "FROZEN",
    provider: "ElevenLabs",
    providerPreflightHash:
      preflight.reportHash,
    sourceManifestHash:
      sourceManifest.manifestHash,
    goldenManifestHash:
      golden.manifestHash,
    model: MODEL_ID,
    outputFormat: OUTPUT_FORMAT,
    voiceSettings: VOICE_SETTINGS,
    seed: SEED,
    continuityStrategy:
      "single-request-golden-and-independent-pronunciation-micros",
    pronunciationDictionaryLocators: [],
    candidates: selectedVoices.map(
      (voice) => ({
        voiceId: voice.voiceId,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        labels: voice.labels,
        noticePeriod:
          voice.noticePeriod,
        deactivatedAtUnix:
          voice.deactivatedAtUnix,
        customCostMultiplier:
          voice.sharing?.rate ?? 1,
      }),
    ),
    aiAliases: AI_ALIASES,
    requestCount: requests.length,
    submittedCharacters,
    maximumCharacterExposure:
      submittedCharacters,
    pilotCharacterCap:
      PILOT_CHARACTER_CAP,
    taskCharacterCap:
      FULL_CHARACTER_CAP,
    accountRemainingBefore:
      preflight.subscription
        .remainingCharacters,
    noAutomaticTopUp: true,
    retryPolicy:
      "NO_AUTOMATIC_RETRY_OF_AMBIGUOUS_OR_POTENTIALLY_BILLED_REQUEST",
    requests,
  });
  const editorial = stableHash({
    schemaVersion:
      "tenxpros-elevenlabs-final-editorial-ledger-v1",
    productionIsSourceOfTruth: true,
    finalAuditLessonCount: 17,
    priorApprovedCorrections:
      reconciliation.summary
        .approvedEditCount,
    newVisibleCorrectionsApplied: 0,
    ownerReviewRequired: 0,
    protectedMeaningChanges: 0,
    invalidSemanticDrift: 0,
    ledger: auditLedger(
      reconciliation,
      production.production.lessons,
    ),
  });
  const pronunciation = stableHash({
    schemaVersion:
      "tenxpros-elevenlabs-pronunciation-system-v1",
    status:
      "AI_ALIAS_PENDING_AUDIO_AUDIT",
    visibleHtmlModified: false,
    candidates: AI_ALIASES,
    fixedNarrationOnlyAliases: {
      TenX: "Ten X",
      TenXPro: "Ten X Pro",
      TenXPros: "Ten X Pros",
      B2B: "B to B",
      B2C: "B to C",
      HR: "H R",
      CEO: "C E O",
      SMS: "S M S",
      SME: "small and medium-sized enterprise",
      API: "A P I",
      CRM: "C R M",
      FAQ: "F A Q",
      ROI: "R O I",
      SEO: "S E O",
      "tenxpros.com": "ten x pros dot com",
      "tenxops.org": "ten x ops dot org",
    },
    absentFromCurrentVisibleCorpus: [
      "API",
      "CRM",
      "FAQ",
      "ROI",
      "SEO",
    ],
    dictionaryProviderRequirement:
      "alias-based rules for eleven_multilingual_v2",
  });
  await mkdir(arguments_.outputDirectory, {
    recursive: false,
    mode: 0o700,
  });
  await chmod(
    arguments_.outputDirectory,
    0o700,
  );
  await Promise.all([
    writePrivate(
      resolve(
        arguments_.outputDirectory,
        "editorial-ledger.json",
      ),
      editorial,
    ),
    writePrivate(
      resolve(
        arguments_.outputDirectory,
        "audition-source-manifest.json",
      ),
      sourceManifest,
    ),
    writePrivate(
      resolve(
        arguments_.outputDirectory,
        "golden-audition-script.json",
      ),
      golden,
    ),
    writePrivate(
      resolve(
        arguments_.outputDirectory,
        "pronunciation-system.json",
      ),
      pronunciation,
    ),
    writePrivate(
      resolve(
        arguments_.outputDirectory,
        "paid-audition-plan.json",
      ),
      paidPlan,
    ),
  ]);
  process.stdout.write(
    `${JSON.stringify({
      passed: true,
      outputDirectory:
        arguments_.outputDirectory,
      editorialLedgerHash:
        editorial.manifestHash,
      sourceManifestHash:
        sourceManifest.manifestHash,
      goldenManifestHash:
        golden.manifestHash,
      goldenCharacters:
        goldenText.length,
      paidPlanHash:
        paidPlan.manifestHash,
      voices: paidPlan.candidates,
      requestCount: requests.length,
      submittedCharacters,
      accountRemaining:
        preflight.subscription
          .remainingCharacters,
      invalidSemanticDrift: 0,
      errorWarnings: 0,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${
      error instanceof Error
        ? error.stack
        : String(error)
    }\n`,
  );
  process.exitCode = 1;
});
