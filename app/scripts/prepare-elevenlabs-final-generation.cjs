#!/usr/bin/env node
"use strict";

const {
  createHash,
} = require("node:crypto");
const fs = require("node:fs");
const { promises: fsp } = fs;
const path = require("node:path");

const PHASE_ROOT = path.resolve(
  __dirname,
  "../../scratch_academy/elevenlabs-final-migration/phase-e1-final-20260728",
);
const SOURCE_PATH = path.resolve(
  PHASE_ROOT,
  "audition-plan/audition-source-manifest.json",
);
const SELECTION_PATH = path.resolve(
  PHASE_ROOT,
  "owner-voice-review/owner-selection.json",
);
const DICTIONARY_PATH = path.resolve(
  PHASE_ROOT,
  "pronunciation-dictionary-v1/dictionary-result.json",
);
const PREFLIGHT_PATH = path.resolve(
  PHASE_ROOT,
  "provider-preflight-v4/preflight-report.json",
);
const OUTPUT_ROOT = path.resolve(
  PHASE_ROOT,
  "final-generation-plan-v1",
);
const EXPECTED_SOURCE_HASH =
  "4dcab6696390c07da958be191268490a2a3a02b0a7f543b06a2fb59e99683313";
const EXPECTED_SELECTION_HASH =
  "e53369eeadede222985fb9c6fa019cb60e09a45657447ac30ee95bc477b01d89";
const EXPECTED_DICTIONARY_HASH =
  "31cac4cffa56310b873654d5e3f47323e527886e383e339f7fdc7bb4b4b6e5c2";
const EXPECTED_PREFLIGHT_HASH =
  "d55845cc0ffb0d060b81778540c16beb5a5090c92acb551b21d312735ddd6b39";
const MAX_CHUNK_CHARACTERS = 8_500;
const TASK_CHARACTER_CAP = 220_000;
const AUDITION_SUBMITTED_CHARACTERS = 13_008;
const RETRY_RESERVE_BPS = 1_000;

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function canonical(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonical(
          value[key],
        )}`,
    )
    .join(",")}}`;
}

async function writeExclusive(filePath, value) {
  const handle = await fsp.open(
    filePath,
    "wx",
    0o600,
  );
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsp.chmod(filePath, 0o600);
}

function chunkLesson(blocks) {
  const chunks = [];
  let current = [];
  let currentText = "";
  for (const block of blocks) {
    const text = block.spokenText;
    if (text.length > MAX_CHUNK_CHARACTERS) {
      throw new Error(
        `Semantic block ${block.sequence} exceeds the chunk cap`,
      );
    }
    const candidate =
      current.length === 0
        ? text
        : `${currentText}\n\n${text}`;
    if (
      current.length > 0 &&
      candidate.length >
        MAX_CHUNK_CHARACTERS
    ) {
      chunks.push({
        blocks: current,
        text: currentText,
      });
      current = [block];
      currentText = text;
    } else {
      current.push(block);
      currentText = candidate;
    }
  }
  if (current.length > 0) {
    chunks.push({
      blocks: current,
      text: currentText,
    });
  }
  return chunks.map((chunk, index) => ({
    index,
    text: chunk.text,
    textSha256: sha256(chunk.text),
    characters: chunk.text.length,
    firstBlockSequence:
      chunk.blocks[0].sequence,
    lastBlockSequence:
      chunk.blocks.at(-1).sequence,
    boundaryClassBefore:
      index === 0
        ? "start"
        : chunk.blocks[0].semanticPauseClass,
    blockSequences: chunk.blocks.map(
      (block) => block.sequence,
    ),
  }));
}

async function main() {
  process.umask(0o077);
  if (fs.existsSync(OUTPUT_ROOT)) {
    throw new Error(
      "Refusing to overwrite the final generation plan",
    );
  }
  const [source, selection, dictionary, preflight] =
    await Promise.all(
      [
        SOURCE_PATH,
        SELECTION_PATH,
        DICTIONARY_PATH,
        PREFLIGHT_PATH,
      ].map(async (filePath) =>
        JSON.parse(
          await fsp.readFile(
            filePath,
            "utf8",
          ),
        ),
      ),
    );
  if (
    source.manifestHash !==
      EXPECTED_SOURCE_HASH ||
    source.lessonCount !== 17 ||
    source.invalidSemanticDrift !== 0 ||
    source.errorWarnings !== 0 ||
    source.ownerReviewAffectingSpokenScript !==
      0 ||
    selection.selectionHash !==
      EXPECTED_SELECTION_HASH ||
    selection.selectedVoice.neutralLabel !==
      "Voice C" ||
    selection.selectedVoice.voiceId !==
      "hpp4J3VqNfWAUOO0d1Us" ||
    selection.selectedAiAlias.aliasId !==
      "a_i_periods" ||
    selection.selectedAiAlias.spokenForm !==
      "A. I." ||
    dictionary.resultHash !==
      EXPECTED_DICTIONARY_HASH ||
    preflight.reportHash !==
      EXPECTED_PREFLIGHT_HASH ||
    preflight.allReadPreflightsPassed !==
      true ||
    preflight.subscription.status !==
      "active"
  ) {
    throw new Error(
      "Final generation frozen input gate failed",
    );
  }
  const aiAlias =
    selection.selectedAiAlias.spokenForm;
  const lessons = source.lessons.map(
    (lesson) => {
      const blocks = lesson.blocks.map(
        (block) => {
          const spokenText =
            block.spokenTextTemplate.replaceAll(
              "{AI_ALIAS}",
              aiAlias,
            );
          if (
            spokenText.includes(
              "{AI_ALIAS}",
            )
          ) {
            throw new Error(
              `${lesson.slug}: unresolved AI alias`,
            );
          }
          return {
            sequence: block.sequence,
            semanticBlockId: sha256(
              `${lesson.lessonId}:${block.sequence}:${block.sourceHash}`,
            ),
            sourceHtmlPath:
              block.sourceHtmlPath,
            blockType: block.blockType,
            semanticPauseClass:
              block.semanticPauseClass,
            sourceHash: block.sourceHash,
            spokenText,
            spokenHash: sha256(spokenText),
          };
        },
      );
      if (
        blocks.some(
          (block, index) =>
            block.sequence !== index ||
            block.spokenText.length === 0,
        )
      ) {
        throw new Error(
          `${lesson.slug}: semantic block sequence failed`,
        );
      }
      const exactFinalSpokenText = blocks
        .map((block) => block.spokenText)
        .join("\n\n");
      const chunks = chunkLesson(blocks);
      return {
        lessonId: lesson.lessonId,
        slug: lesson.slug,
        order: lesson.order,
        title: lesson.title,
        contentVersion:
          lesson.contentVersion,
        canonicalSanitizedHtmlHash:
          lesson.canonicalSanitizedHtmlHash,
        visibleTextHash:
          lesson.visiblePlainTextHash,
        spokenScriptHash: sha256(
          exactFinalSpokenText,
        ),
        exactFinalSpokenText,
        rendererVersion:
          lesson.rendererVersion,
        normalizationVersion:
          lesson.normalizationVersion,
        pronunciationVersion:
          "tenxpros-elevenlabs-pronunciation-dictionary-v1",
        tableNarrationVersion:
          lesson.tableNarrationVersion,
        pausePolicy:
          "provider-natural-with-measured-chunk-boundary-minimum-v1",
        semanticChunkingVersion:
          "elevenlabs-semantic-chunks-v1-max-8500",
        expectedBillableCharacters:
          chunks.reduce(
            (sum, chunk) =>
              sum + chunk.characters,
            0,
          ),
        warnings: [],
        invalidSemanticDrift: 0,
        blocks,
        chunks,
      };
    },
  );
  const manifestCore = {
    schemaVersion:
      "tenxpros-elevenlabs-final-narration-manifest-v1",
    status: "FROZEN",
    sourceManifestHash:
      source.manifestHash,
    ownerSelectionHash:
      selection.selectionHash,
    lessonCount: lessons.length,
    semanticBlockCount: lessons.reduce(
      (sum, lesson) =>
        sum + lesson.blocks.length,
      0,
    ),
    requestChunkCount: lessons.reduce(
      (sum, lesson) =>
        sum + lesson.chunks.length,
      0,
    ),
    exactSubmittedCharacters:
      lessons.reduce(
        (sum, lesson) =>
          sum +
          lesson.expectedBillableCharacters,
        0,
      ),
    invalidSemanticDrift: 0,
    errorWarnings: 0,
    lessons,
  };
  const narrationManifestHash = sha256(
    canonical(manifestCore),
  );
  const recipeCore = {
    schemaVersion:
      "tenxpros-elevenlabs-final-recipe-v1",
    provider: "ElevenLabs",
    model: "eleven_multilingual_v2",
    voiceId:
      selection.selectedVoice.voiceId,
    voiceName:
      selection.selectedVoice.voiceName,
    voiceSettings: {
      stability: 0.65,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
      speed: 1,
    },
    seed: 7_538_411,
    selectedAiAlias: {
      id: "a_i_periods",
      spokenForm: "A. I.",
    },
    pronunciationDictionary: {
      dictionaryId:
        dictionary.dictionaryId,
      versionId: dictionary.versionId,
      resultHash: dictionary.resultHash,
    },
    rendererVersion:
      "semantic-html-v2-alignment-elevenlabs-e1",
    normalizationVersion:
      "english-spoken-v3-elevenlabs",
    pronunciationVersion:
      "tenxpros-elevenlabs-pronunciation-dictionary-v1",
    semanticChunkingVersion:
      "elevenlabs-semantic-chunks-v1-max-8500",
    continuityStrategy:
      "previous-request-ids-last-3-within-lesson-v1",
    pauseProcessingVersion:
      "measured-chunk-boundary-minimum-v1",
    outputFormat: "pcm_24000",
    finalAssetFormat:
      "mp3-24000hz-mono-64kbps-cbr",
    sourceNarrationManifestHash:
      narrationManifestHash,
  };
  const recipeHash = sha256(
    canonical(recipeCore),
  );
  const recipeVersion =
    "elevenlabs-bella-multilingual-v2-final-v1";
  const releaseId =
    `academy-elevenlabs-bella-final-${recipeHash.slice(
      0,
      16,
    )}`;
  const requests = lessons.flatMap(
    (lesson) =>
      lesson.chunks.map(
        (chunk) => ({
          id: `${lesson.slug}-chunk-${String(
            chunk.index + 1,
          ).padStart(2, "0")}`,
          lessonId: lesson.lessonId,
          lessonSlug: lesson.slug,
          lessonOrder: lesson.order,
          chunkIndex: chunk.index,
          firstBlockSequence:
            chunk.firstBlockSequence,
          lastBlockSequence:
            chunk.lastBlockSequence,
          boundaryClassBefore:
            chunk.boundaryClassBefore,
          blockSequences:
            chunk.blockSequences,
          text: chunk.text,
          textSha256:
            chunk.textSha256,
          characters:
            chunk.characters,
        }),
      ),
  );
  const submittedCharacters =
    requests.reduce(
      (sum, request) =>
        sum + request.characters,
      0,
    );
  const retryReserveCharacters =
    Math.ceil(
      (submittedCharacters *
        RETRY_RESERVE_BPS) /
        10_000,
    );
  const taskMaximumExposure =
    AUDITION_SUBMITTED_CHARACTERS +
    submittedCharacters +
    retryReserveCharacters;
  const liveRemaining =
    preflight.subscription
      .remainingCharacters;
  const quotaGate = {
    schemaVersion:
      "tenxpros-elevenlabs-final-quota-gate-v1",
    providerPreflightHash:
      preflight.reportHash,
    accountRemainingCharacters:
      liveRemaining,
    completedAuditionSubmittedCharacters:
      AUDITION_SUBMITTED_CHARACTERS,
    completedAuditionBilledCharacters:
      7_155,
    fullGenerationSubmittedCharacters:
      submittedCharacters,
    conservativeRetryReserveCharacters:
      retryReserveCharacters,
    taskMaximumExposureCharacters:
      taskMaximumExposure,
    taskCharacterCap:
      TASK_CHARACTER_CAP,
    fullGenerationAndReserveFitLiveQuota:
      submittedCharacters +
        retryReserveCharacters <=
      liveRemaining,
    taskExposureFitsCap:
      taskMaximumExposure <=
      TASK_CHARACTER_CAP,
    noAutomaticTopUp: true,
    passed:
      submittedCharacters +
          retryReserveCharacters <=
        liveRemaining &&
      taskMaximumExposure <=
        TASK_CHARACTER_CAP,
  };
  if (!quotaGate.passed) {
    throw new Error(
      "Final generation quota gate failed",
    );
  }
  const planCore = {
    schemaVersion:
      "tenxpros-elevenlabs-final-paid-generation-plan-v1",
    status: "FROZEN",
    provider: "ElevenLabs",
    providerPreflightHash:
      preflight.reportHash,
    narrationManifestHash,
    recipeVersion,
    recipeHash,
    releaseId,
    sourceContentManifestHash:
      source.sourceContentManifestHash,
    selectedVoice: {
      id: recipeCore.voiceId,
      name: recipeCore.voiceName,
    },
    model: recipeCore.model,
    outputFormat:
      recipeCore.outputFormat,
    voiceSettings:
      recipeCore.voiceSettings,
    seed: recipeCore.seed,
    pronunciationDictionaryLocators: [
      {
        pronunciation_dictionary_id:
          dictionary.dictionaryId,
        version_id:
          dictionary.versionId,
      },
    ],
    continuityStrategy:
      recipeCore.continuityStrategy,
    expectedAssetCount: 17,
    requestCount: requests.length,
    submittedCharacters,
    maximumCharacterExposure:
      submittedCharacters +
      retryReserveCharacters,
    taskCharacterCap:
      TASK_CHARACTER_CAP,
    automaticRetry: false,
    requests,
  };
  const planHash = sha256(
    canonical(planCore),
  );
  await fsp.mkdir(OUTPUT_ROOT, {
    recursive: false,
    mode: 0o700,
  });
  await fsp.chmod(OUTPUT_ROOT, 0o700);
  await Promise.all([
    writeExclusive(
      path.resolve(
        OUTPUT_ROOT,
        "final-narration-manifest.json",
      ),
      `${JSON.stringify(
        {
          ...manifestCore,
          manifestHash:
            narrationManifestHash,
        },
        null,
        2,
      )}\n`,
    ),
    writeExclusive(
      path.resolve(
        OUTPUT_ROOT,
        "final-recipe.json",
      ),
      `${JSON.stringify(
        {
          ...recipeCore,
          recipeVersion,
          recipeHash,
          releaseId,
        },
        null,
        2,
      )}\n`,
    ),
    writeExclusive(
      path.resolve(
        OUTPUT_ROOT,
        "quota-gate.json",
      ),
      `${JSON.stringify(
        quotaGate,
        null,
        2,
      )}\n`,
    ),
    writeExclusive(
      path.resolve(
        OUTPUT_ROOT,
        "paid-generation-plan.json",
      ),
      `${JSON.stringify(
        { ...planCore, planHash },
        null,
        2,
      )}\n`,
    ),
  ]);
  process.stdout.write(
    `${JSON.stringify({
      status:
        "FINAL_GENERATION_PLAN_FROZEN",
      releaseId,
      recipeHash,
      narrationManifestHash,
      planHash,
      lessonCount: lessons.length,
      semanticBlockCount:
        manifestCore.semanticBlockCount,
      requestCount: requests.length,
      submittedCharacters,
      retryReserveCharacters,
      taskMaximumExposure,
      liveRemaining,
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `${
      error instanceof Error
        ? error.message
        : String(error)
    }\n`,
  );
  process.exitCode = 1;
});
