import {
  ACADEMY_PRONUNCIATION_FREEZE_REVISION,
  ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
} from "./approved-pronunciations";
import {
  DEFAULT_LOW_ENERGY_DETECTOR,
  EFFECTIVE_PAUSE_NORMALIZATION_VERSION,
} from "./effective-pause-normalization";
import {
  NARRATION_NORMALIZATION_VERSION,
  NARRATION_PRONUNCIATION_VERSION,
  stableNarrationHash,
} from "./recipe";
import {
  INTERNAL_SENTENCE_DETECTOR,
  SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
  SEMANTIC_BLOCK_FINAL_RECIPE_VERSION,
  SEMANTIC_BLOCK_FLOW_VERSION,
  SEMANTIC_BLOCK_REALIZATION_GUARD_MILLISECONDS,
} from "./semantic-block-flow";
import { LONG_BLOCK_SEGMENTATION_POLICY_VERSION } from "./segmentation";
import { PIPER_EVALUATION_SEGMENTATION_VERSION } from "./piper-evaluation";

export const FINAL_PIPER_RECIPE = Object.freeze({
  schemaVersion: "tenxpros-piper-narration-recipe-v1",
  recipeVersion: SEMANTIC_BLOCK_FINAL_RECIPE_VERSION,
  status: "FROZEN",
  parent: Object.freeze({
    recipeVersion: SEMANTIC_BLOCK_FLOW_VERSION,
    planHash:
      "110fbd6db6d5a7c59f4d3d31c7e538e7a215d9dd9066c3ecea4dfb93a32ce599",
    focusedCandidateSha256: Object.freeze({
      sample02:
        "158359087d28420c8685881ec493aafee05e08703709e4cc248a34398310d010",
      sample05:
        "d9da7a05d398463a98f999af00a2d9d02d040a2a12bcb9e94d025b8ede1116da",
    }),
  }),
  architecture: Object.freeze({
    synthesisUnit: "COHERENT_SEMANTIC_BLOCK",
    paragraph: "ONE_REQUEST_PER_COHERENT_PARAGRAPH",
    heading: "ONE_REQUEST_PER_HEADING",
    listItem: "ONE_REQUEST_PER_LIST_ITEM",
    tableRow: "ONE_REQUEST_PER_TABLE_ROW",
    formField:
      "ONE_REQUEST_PER_COHERENT_LABEL_DESCRIPTION_UNIT",
    callout: "ONE_REQUEST_PER_CALLOUT",
    section: "SEPARATE_GENUINE_SEMANTIC_SECTIONS",
    internalSentenceExternalStitches: 0,
  }),
  effectivePauseTargetsMilliseconds:
    SEMANTIC_BLOCK_FINAL_EFFECTIVE_TARGETS,
  piper: Object.freeze({
    sentenceSilenceSeconds: 0.15,
    lengthScale: 1,
    sampleRateHertz: 22_050,
  }),
  voice: Object.freeze({
    id: "bryce",
    modelSha256:
      "dc9caa6c313199ffb5ac698b6e542fa6cba388aeaf2731e25262e33b9810aef1",
    configSha256:
      "7ceb1bc4af6d4e41b6d1edbb86c67e91e01eaa71f66db4cd0ae92ac704d415be",
  }),
  normalization: Object.freeze({
    effectivePauseVersion:
      EFFECTIVE_PAUSE_NORMALIZATION_VERSION,
    narrationNormalizationVersion:
      NARRATION_NORMALIZATION_VERSION,
    semanticEdgeDetector:
      DEFAULT_LOW_ENERGY_DETECTOR,
    internalSentenceDetector:
      INTERNAL_SENTENCE_DETECTOR,
    realizationGuardMilliseconds:
      SEMANTIC_BLOCK_REALIZATION_GUARD_MILLISECONDS,
    exactZeroPcmInsertion: true,
    unsafeTrimFallback: "INSERTION_ONLY",
  }),
  pronunciation: Object.freeze({
    narrationVersion:
      NARRATION_PRONUNCIATION_VERSION,
    freezeRevision:
      ACADEMY_PRONUNCIATION_FREEZE_REVISION,
    ownerApprovalReference:
      ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
  }),
  segmentation: Object.freeze({
    evaluationVersion:
      PIPER_EVALUATION_SEGMENTATION_VERSION,
    longBlockPolicyVersion:
      LONG_BLOCK_SEGMENTATION_POLICY_VERSION,
    semanticBlockArchitectureVersion:
      SEMANTIC_BLOCK_FLOW_VERSION,
  }),
  loudness: Object.freeze({
    targetLufs: -19,
    truePeakDbtp: -2,
    mp3EncodingTruePeakHeadroomDb: 1,
    maxPositiveGainDb: 6,
    integratedLufsRange: Object.freeze([-22, -18]),
    truePeakMaximumDbtp: -1.5,
  }),
  mp3: Object.freeze({
    encoder: "lame",
    mode: "mono",
    bitrateKbps: 64,
    rateMode: "CBR",
  }),
});

export const FINAL_PIPER_RECIPE_HASH =
  stableNarrationHash(FINAL_PIPER_RECIPE);
