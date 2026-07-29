#!/usr/bin/env tsx

/**
 * One-off Phase 2C audio-capable AI evaluation orchestrator.
 *
 * Dry-run is the default and performs no external request. Paid execution is
 * fail-closed behind the task's explicit owner authorization, three exact
 * command-line gates, and a single OpenRouter secret file.
 * The secret is never accepted from argv/env/stdin and is never serialized.
 */
import {
  createHash,
  randomBytes,
} from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  access,
  appendFile,
  constants as fsConstants,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import {
  AI_AUDIO_SCORE_DIMENSIONS,
  AI_AUDIO_EVALUATION_TOOL,
  aggregateAiPanel,
  buildBlindJudgeAssignments,
  buildJudgePrompt,
  decideLocalNarration,
  deriveBryceDecisionMetrics,
  hashAiValue,
  validateJudgeResponse,
  type AiBlindJudgeAssignment,
  type AiBlindSourcePair,
  type AiBryceDecisionMetrics,
  type AiJudgeResponse,
  type AiObjectiveAnalysisSummary,
  type AiPrivateSampleIdentity,
  type AiTuningFailureSignal,
  type AiValidatedJudgeRun,
} from "../src/lib/academy/narration/ai-audio-evaluation";
import {
  aggregateConditionalPanel,
  bindConditionalSubplan,
  createLocalVoiceConditionalDraft,
  createTuningConditionalDraft,
  executeConditionalPanelWithFetch,
  selectTunedConditionalCandidate,
  voiceMetricsFromConditionalPanel,
  type AiBoundConditionalSubplan,
  type AiConditionalAudioClip,
  type AiConditionalBranchDraft,
  type AiConditionalExecutionResult,
} from "../src/lib/academy/narration/ai-audio-conditional-evaluation";
import {
  AI_AUDIO_RECOVERED_RESPONSE_FORMAT,
  AI_AUDIO_RECOVERED_RESPONSE_JSON_SCHEMA,
  AI_AUDIO_RESPONSE_RECOVERY_POLICY_VERSION,
  recoverAiAudioJudgeResponse,
  toLegacyAiJudgeResponse,
  type AiAudioRecoveredJudgeResponse,
  type AiAudioRecoveryAssignment,
} from "../src/lib/academy/narration/ai-audio-response-recovery";
import {
  OPENROUTER_HISTORICAL_TOOL_NAME,
  OPENROUTER_RECONCILIATION_TOLERANCE_QUANTA,
  checkMetadataGetCap,
  estimateConservativeNextJudgeCost,
  formatUsdQuanta,
  parseOpenRouterGenerationContent,
  parseOpenRouterGenerationMetadata,
  parseOpenRouterKeyUsage,
  parseUsdToQuanta,
  reconcileOpenRouterUsage,
  type OpenRouterGenerationMetadata,
  type OpenRouterKeyUsage,
  type OpenRouterUsageReconciliation,
} from "../src/lib/academy/narration/openrouter-generation-retrieval";
import {
  CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO,
  assembleConditionalAudioClips,
  buildLocalVoicePiperPlan,
  buildTunedBrycePiperPlan,
  type FrozenCorrectedPiperExcerpt,
} from "../src/lib/academy/narration/conditional-piper-generation";
import {
  executeConditionalPiperPlan,
} from "./conditional-piper-generator";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
const PHASE2B_PACKAGE = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "piper-listening",
  "phase2b-bryce-20260726",
);
const PHASE2B_LISTENER_AUDIO = resolve(
  PHASE2B_PACKAGE,
  "listener-package",
  "audio",
);
const PHASE2B_MANIFEST = resolve(
  PHASE2B_PACKAGE,
  "private",
  "manifest.json",
);
const PHASE2B_ZIP = resolve(
  PHASE2B_PACKAGE,
  "blind-audio-review-8fab36b45ab641b5.zip",
);
const PHASE2C_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "ai-audio-evaluation",
);
const DEFAULT_OUTPUT = resolve(
  PHASE2C_ROOT,
  "phase2c-openrouter-bryce-20260726",
);
const TASK_WIDE_PAID_LOCK_FILENAME =
  ".phase2c-openrouter-bryce-20260726-paid-execution.lock";
const RECOVERY_RUN_LOCK_FILENAME =
  ".phase2c-openrouter-bryce-20260726-response-recovery.lock";
const GENERATION_RETRIEVAL_LOCK_FILENAME =
  ".phase2c-openrouter-generation-retrieval.lock";
const INTERRUPTED_GENERATION_RETRIEVAL_PLAN_HASH =
  "d580401892d365ba0a29bde20e8044ada1058cd1105aaf5217f856bb5495c7f9";
const INTERRUPTED_GENERATION_RETRIEVAL_PLAN_FILE_SHA256 =
  "ab5ef8be37f0c9b57f45c1576edf1c0331a4d239980b6cf20d6c831c41490b2a";
const INTERRUPTED_GENERATION_RETRIEVAL_LEDGER_SHA256 =
  "2c990329b449dd015429514f5645ed1b520fa47607639a6d2ea30b09848ad1dc";
const INTERRUPTED_GENERATION_RETRIEVAL_LOCK_SHA256 =
  "58fbe5504bb95f429ce7b42b0e61d4f71d422e4c5a825b45b245aaf38e443d8a";
const INTERRUPTED_GENERATION_CONTENT_ARTIFACT_SHA256 =
  "9635b287d2698dfe3f941a8155fbc7934c565a9b6454cc6ce4c3341354f2fbaa";
const SECOND_INTERRUPTED_GENERATION_RETRIEVAL_LEDGER_SHA256 =
  "6160ee2067d50ea185f4c173461d07afabde53b5a5c404b131c237fe4c5e6947";
const SECOND_INTERRUPTED_GENERATION_RETRIEVAL_TERMINAL_HASH =
  "8a5afc27328fb3cf34c7b41889cf6336b8dbbe17b1cb9d104cc5a2c09e03e4eb";
const SECOND_INTERRUPTED_KEY_RAW_BODY_SHA256 =
  "298090c6b1e36bd5d3419878eddfe38a14a79fd1f4963116831b931a17394de8";
const COMPLETED_GENERATION_RETRIEVAL_LEDGER_SHA256 =
  "b0b7c4d294a906451d998ef15e2dd4d256efb2cf88a108e1da717df06bf74fc1";
const COMPLETED_GENERATION_RETRIEVAL_TERMINAL_HASH =
  "ad82a9ebd3a48ced1353c6cb38302a26bfd5c533496289d0372cb0f9c0f492ac";
const COMPLETED_GENERATION_RETRIEVAL_EVIDENCE_SHA256 =
  "55980291ef68c76a019398801a172298e060396fa56f24acb28bafc23bf2bf58";
const COMPLETED_GENERATION_RETRIEVAL_REPORT_SHA256 =
  "85eacb5a286023e6b70578e543475ba4ead926eaf35959134cce9b8d0a6487a0";
const COMPLETED_CURRENT_KEY_ARTIFACT_SHA256 =
  "5de5cc487178182933e62052d8a02e3b2c966cca22afce30d23ae4d510cad8b7";
const COMPLETED_GENERATION_RETRIEVAL_PROCESS_ID =
  1_565_685;
const GENERATION_RECONCILIATION_SUPPLEMENT_FILENAME =
  "generation-retrieval-reconciliation-supplement.json";
const GENERATION_RECONCILIATION_REPORT_FILENAME =
  "generation-retrieval-reconciliation-supplement.md";
const PRIOR_PAID_PLAN_HASH =
  "ac8586e750afc4e0fcc279583c33cde67352bb08f355427a1936025c3dc97e5c";
const PRIOR_PAID_PLAN_FILE_SHA256 =
  "484885c503ffe149934ff7f6f899cfc41d90e6952bf483bf92e40dd3e56e7578";
const SUPERSEDING_GENERATION_TASK_SHA256 =
  "b3f7bca00ba5ce4ce2d97d4e910a977a8e9d4d6d8b4e8b65c6d6b2002c64963f";
const PRIOR_PAID_LEDGER_SHA256 =
  "d9340ee4a7b493ac117ada69e82f101cfbe49615d20856808b5de0666a9c3a50";
const PRIOR_PAID_LEDGER_TERMINAL_HASH =
  "8290579d83ebc243a6a9e46b158729ab1cecf894a4f2bc40d95a62552209b10e";
const PRIOR_PRIVATE_MANIFEST_SHA256 =
  "884aa3931c89587280dccd680fd478718415e1700f454d4f443ff89d8f59f5b5";
const INITIAL_KEY_PREFLIGHT_SUMMARY_SHA256 =
  "ae11584af1ff157408f73e6651e578c04c195d36d847f9b97a4bd3e4de1a5c60";
const PRIOR_RESPONSE_RECOVERY_PLAN_SHA256 =
  "0407a55ca067530c0388dc44b1d6e1f85b29f08ca1ff59c80b6b4af3a80c2e13";
const PRIOR_RESPONSE_RECOVERY_LEDGER_SHA256 =
  "195517da75f83a73f67da3bbc9bc4c7d5dc1fdeb7fb14f08c2d7623d809b1658";
const PRIOR_RESPONSE_RECOVERY_LEDGER_TERMINAL_HASH =
  "83c0cab63ad648c6de4d3aba00f8c847ee0cf3144d0b44191167cf5ef94033fc";
const PRIOR_RESPONSE_RECOVERY_LOCK_SHA256 =
  "fd616a0766879ef8ec95b94627fed3fa3cf7e78e2f088363f55cbd94220766f3";
const REQUEST_16_RAW_RESPONSE_SHA256 =
  "ccd391cd6dc2af6d4eb2573256fecde4f69526b7d4ebaef451a5bd24a7a671b1";
const RESPONSE_RECOVERY_POLICY_VERSION =
  AI_AUDIO_RESPONSE_RECOVERY_POLICY_VERSION;
const PRIOR_PAID_ACTUAL_COST_USD = 3.54151;
const PRIOR_PAID_EXTERNAL_REQUESTS = 12;
const RECOVERY_MAXIMUM_EXTERNAL_REQUESTS = 24;
const RECOVERY_MAXIMUM_USD = 10;
const MAXIMUM_NEW_PAID_RECOVERY_POSTS = 5;
const MAXIMUM_GENERATION_METADATA_GETS = 40;
const GENERATION_RETRIEVAL_SCHEMA_VERSION =
  "tenxpros-openrouter-generation-retrieval-v1";
const GENERATION_RETRIEVAL_LEDGER_SCHEMA_VERSION =
  "tenxpros-openrouter-generation-retrieval-ledger-v1";
const GENERATION_RETRIEVAL_TOLERANCE_USD = 0.00000001;
const HISTORICAL_GENERATION_IDS = Object.freeze([
  "gen-1785098999-kONSJ7QUKSoo5Bx767YX",
  "gen-1785099035-B6QtnbMaTROw9tMIJb4l",
  "gen-1785099071-C8pVt5VquVFLcGicpu9O",
  "gen-1785099107-UvQYvF0f2Bkoc6XUv5JR",
  "gen-1785099142-G7aLR1fnsQCm0pfCIscn",
  "gen-1785099175-CmfGCXi3HhK9od2fLQp5",
  "gen-1785099212-eqEyewDWbvLvYZuU47OX",
  "gen-1785099249-B1WbrQGCzEDwZhi4difU",
  "gen-1785099292-G8ZKFUAednTxoGgh5xRK",
  "gen-1785099329-0XtS5hyPLv0p5KRrbvzu",
] as const);
const RECOVERY_PERSPECTIVE_IDS = Object.freeze([
  "judge-01",
  "judge-02",
  "judge-03",
  "judge-04",
  "judge-05",
] as const);
const SECRET_PATH =
  "/run/secrets/openrouter_audio_judge_key";
const OPENROUTER_API_BASE_URL =
  "https://openrouter.ai/api/v1";
const CHAT_COMPLETIONS_ENDPOINT =
  `${OPENROUTER_API_BASE_URL}/chat/completions`;
const KEY_PREFLIGHT_ENDPOINT =
  `${OPENROUTER_API_BASE_URL}/key`;
const MODELS_PREFLIGHT_ENDPOINT =
  `${OPENROUTER_API_BASE_URL}/models`;
const GENERATION_ENDPOINT =
  `${OPENROUTER_API_BASE_URL}/generation`;
const GENERATION_CONTENT_ENDPOINT =
  `${GENERATION_ENDPOINT}/content`;
const MODEL_ID = "openai/gpt-audio";
const RECOVERY_TOOL_NAME = "submit_audio_evaluation";
const OPENROUTER_ATTRIBUTION_HEADERS = Object.freeze({
  "HTTP-Referer": "https://tenxpros.com",
  "X-OpenRouter-Title":
    "TenXPros Academy Audio Evaluation",
  "X-OpenRouter-Metadata": "enabled",
});
const EVALUATION_PACKAGE_ID =
  "blind-review-8fab36b45ab641b5";
const INVALIDATED_DIRECT_OPENAI_PLAN_HASH =
  "71cf16c1dcc93a88a03ec1dfcfceceb83b86be1c10e460ebab378e4129b2fb7a";
const INVALIDATED_CREDITS_PREFLIGHT_PLAN_HASH =
  "230e43e70fbe964837c1d91c07c204de0ff0424e962585f4aba1f2b2c1ff97a0";
const INVALIDATED_USD8_PLAN_HASH =
  "5782b51d924395d4c10703c92d5c27e67ee6a456148581cbb104193e8a0ba383";
const EXPECTED_PHASE2B_MANIFEST_SHA256 =
  "990d417d49448813bbb670bc3d170cc903757740d4b9ac58a9dab53350155573";
const EXPECTED_PHASE2B_ZIP_SHA256 =
  "8ef39d1b7b0d6c3e1a8d47031dd1e9a1d2795d54810864ded364e2b28f57ff23";
const EXPECTED_PHASE2B_TREE_SHA256 =
  "4bfb7b7ab96a3e2a39d75fed5967ecde393ccf28ef9af8edd6babd902c363e90";
const EXPECTED_PHASE2B_TREE_FILES = 37;
const PHASE2B_TREE_HASH_PREFIX =
  "scratch_academy/piper-listening/phase2b-bryce-20260726";
const HARD_MAX_USD = 10;
const PRIMARY_BRYCE_JUDGE_CALLS = 5;
const MAXIMUM_BRYCE_JUDGE_CALLS = 10;
const METADATA_PREFLIGHT_CALLS = 2;
const CONDITIONAL_BRANCH_PRIMARY_CALLS = 3;
const CONDITIONAL_BRANCH_MAXIMUM_CALLS = 4;
const MAXIMUM_API_REQUESTS = 17 as const;
const MAXIMUM_CONDITIONAL_CALLS_AFTER_WORST_CASE_BRYCE =
  CONDITIONAL_BRANCH_MAXIMUM_CALLS;
const MAX_OUTPUT_TOKENS_PER_JUDGE = 5_000;
const TEXT_INPUT_TOKENS_PER_JUDGE_ESTIMATE = 12_000;
const MODEL_CONTEXT_WINDOW_TOKENS = 128_000;
const AUDIO_TOKEN_PLANNING_ASSUMPTION_PER_MINUTE = 1_000;
const OFFICIAL_AUDIO_INPUT_USD_PER_MILLION_TOKENS = 32;
const OFFICIAL_TEXT_INPUT_USD_PER_MILLION_TOKENS = 2.5;
const OFFICIAL_TEXT_OUTPUT_USD_PER_MILLION_TOKENS = 10;
const LEDGER_GENESIS_HASH = "0".repeat(64);
const LEDGER_SCHEMA_VERSION =
  "tenxpros-phase2c-openrouter-request-ledger-v2";
const PLAN_SCHEMA_VERSION =
  "tenxpros-phase2c-openrouter-evaluation-plan-v4";
const TOOL_NAME = AI_AUDIO_EVALUATION_TOOL.name;
const VALIDATION_RETRY_INSTRUCTION =
  "This is the single permitted validation retry. Listen afresh and ensure the function arguments exactly satisfy every required field; do not discuss the earlier machine response.";

const EXPECTED_AUDIO = Object.freeze({
  "sample-01-A.mp3": {
    sha256:
      "380903a8a0309558c5557a48ff9d5c6a9bb509e371b4bc65598d2bcab6233ac8",
    durationSeconds: 31.294694,
  },
  "sample-01-B.mp3": {
    sha256:
      "f222795ba82507671de97a8148982502998fe8182deddd4a437b2e4f0be0c30d",
    durationSeconds: 32.287347,
  },
  "sample-02-A.mp3": {
    sha256:
      "cd077f907f9278ab19de899dc735236a01aeb5bd6d057ec571a15231e70fd663",
    durationSeconds: 97.802449,
  },
  "sample-02-B.mp3": {
    sha256:
      "1fb5bdb8765ee86bd668a00b9b2dc27de4d25d527df5a74ef8074a83511625bf",
    durationSeconds: 151.457959,
  },
  "sample-03-A.mp3": {
    sha256:
      "a535ece5552168882d88ac714217b3358bd2e28ab6ea3e774280b05a7d6abc9c",
    durationSeconds: 17.136327,
  },
  "sample-03-B.mp3": {
    sha256:
      "cccb2be94bdbb5633de2a280d6c1858a4dcb0bbae76e689823cf99d6a5471f7e",
    durationSeconds: 19.644082,
  },
  "sample-04-A.mp3": {
    sha256:
      "d6b1a45c933d753b23cf3ff7f292062b4ad98c68a2c18e03c5de402023f2c199",
    durationSeconds: 200.385306,
  },
  "sample-04-B.mp3": {
    sha256:
      "2dddc7577c831c44c0d429db6359e7655f50212344b8b56e454098706bfa58bb",
    durationSeconds: 197.355102,
  },
  "sample-05-A.mp3": {
    sha256:
      "799e2afeeac4db5cf66176f6770e675f062fc596409637cf31301345d6aea5c9",
    durationSeconds: 129.253878,
  },
  "sample-05-B.mp3": {
    sha256:
      "04d5087db4ea10d062b7328c0fd166047e1a6683466d0f296146a330bc578cef",
    durationSeconds: 126.589388,
  },
} as const);

const PRODUCTION_SNAPSHOT_SQL = `
SELECT json_build_object(
  'count', count(*),
  'bytes', COALESCE(sum(octet_length(data)), 0),
  'rowMd5Aggregate', md5(string_agg(id || ':' || md5(data), ',' ORDER BY id)),
  'rows', COALESCE(
    json_agg(
      json_build_object(
        'id', id,
        'bytes', octet_length(data),
        'md5', md5(data)
      )
      ORDER BY id
    ),
    '[]'::json
  )
)
FROM "AcademyLessonAudio";
`.trim();

const PRODUCTION_BINARY_COPY_SQL =
  'COPY (SELECT id, data FROM "AcademyLessonAudio" ORDER BY id) TO STDOUT WITH (FORMAT binary)';

interface Phase2BManifest {
  schemaVersion: string;
  evaluationPackageId: string;
  tablePairId: string;
  pairs: readonly {
    pairId: string;
    cohort: string;
    excerptId: string;
    samples: readonly {
      sampleId: string;
      filename: string;
      pipeline: "baseline" | "corrected";
      pairId: string;
      durationSeconds: number;
      sha256: string;
    }[];
  }[];
}

interface ProductionAudioSnapshot {
  count: number;
  bytes: number;
  rowMd5Aggregate: string;
  binaryCopySha256: string;
  rows: readonly {
    id: string;
    bytes: number;
    md5: string;
  }[];
}

interface FrozenInput {
  manifest: Phase2BManifest;
  manifestSha256: string;
  zipSha256: string;
  treeSha256: string;
  treeFileCount: number;
  audio: readonly {
    sampleId: string;
    filename: keyof typeof EXPECTED_AUDIO;
    path: string;
    sha256: string;
    durationSeconds: number;
    bytes: number;
  }[];
  totalAudioDurationSeconds: number;
}

export interface AiAudioEvaluationCliOptions {
  outputDirectory: string;
  allowPaid: boolean;
  recoverResponsesOffline: boolean;
  attestRecoveryReport: boolean;
  executeResponseRecovery: boolean;
  retrieveOpenRouterGenerations: boolean;
  resumeOpenRouterGenerations: boolean;
  reconcileOpenRouterGenerationsOffline: boolean;
  suppliedMaxUsd?: string;
  suppliedMaxRequests?: string;
  help: boolean;
}

interface AiEvaluationPlanWithoutHash {
  schemaVersion: typeof PLAN_SCHEMA_VERSION;
  evaluationId: "phase2c-openrouter-bryce-20260726";
  sourceEvaluationPackageId: typeof EVALUATION_PACKAGE_ID;
  provider: {
    id: "openrouter";
    apiBaseUrl: typeof OPENROUTER_API_BASE_URL;
    chatCompletionsEndpoint: "/chat/completions";
    keyPreflightEndpoint: "/key";
    modelsPreflightEndpoint: "/models";
    routing: {
      allowFallbacks: false;
      requireParameters: true;
    };
    attributionHeaders: {
      httpReferer: "https://tenxpros.com";
      title: "TenXPros Academy Audio Evaluation";
      metadata: "enabled";
    };
    promptLoggingRequested: false;
    dataUseOptInRequested: false;
  };
  model: {
    id: typeof MODEL_ID;
    endpoint: "/chat/completions";
    modelPreflightEndpoint: "/models";
    inputAudioFormat: "mp3";
    responseMode: "required_function_call";
    functionName: typeof TOOL_NAME;
    store: false;
    stream: false;
    officialContextWindowTokens: 128_000;
    officialMaximumOutputTokens: 16_384;
    requestedMaximumOutputTokensPerJudge: 5_000;
    maximumOutputRequestField: "max_tokens";
    officialCapabilitySource: string;
    officialCapabilitiesVerifiedAtPlanning: {
      audioInput: true;
      chatCompletions: true;
      functionCalling: true;
      structuredOutputs: false;
    };
  };
  frozenInput: {
    phase2BPackagePath: string;
    manifestPath: string;
    manifestSha256: string;
    zipPath: string;
    zipSha256: string;
    treeFileCount: number;
    treeSha256: string;
    audioFileCount: 10;
    totalAudioDurationSeconds: number;
    totalAudioDurationMinutes: number;
    audioFiles: readonly {
      id: string;
      sha256: string;
      durationSeconds: number;
      bytes: number;
    }[];
  };
  judges: {
    primaryBryceJudgeCalls: 5;
    maximumBryceCallsIncludingOneValidationRetryEach: 10;
    metadataPreflightCalls: 2;
    keyPreflightCalls: 1;
    modelsPreflightCalls: 1;
    creditsPreflightCalls: 0;
    conditionalBranchPrimaryCalls: 3;
    conditionalBranchMaximumPotentialCalls: 4;
    conditionalBranchMaximumCallsAfterWorstCaseBryce: 4;
    conditionalBranchMaximumTaskWideValidationRetries: 1;
    maximumApiRequests: 17;
    freshConversationPerAttempt: true;
    maximumValidationRetriesPerJudge: 1;
    ambiguousTimeoutRetry: false;
    validationRetryInstructionSha256: string;
    conditionalBranchImplementation:
      "AUTOMATIC_HASH_BOUND_LOCAL_BRANCHES_V1";
    lenses: readonly {
      judgeId: string;
      lensId: string;
      promptSha256: string;
      retryCompositePromptSha256: string;
      assignmentSha256: string;
    }[];
  };
  expectedMaximumInput: {
    brycePrimaryAudioSeconds: number;
    bryceMaximumAudioSecondsWithAllRetries: number;
    conditionalVoiceBranchPrimaryAudioSeconds: number;
    conditionalVoiceBranchMaximumAudioSecondsWithAllRetries: number;
    conditionalTuningBranchPrimaryAudioSeconds: number;
    conditionalTuningBranchMaximumAudioSecondsWithAllRetries: number;
    conditionalWorstCaseBranch: "TUNING_FOUR_WAY";
    conditionalGeneratedAudioDurationCeiling: {
      basis: "frozen_corrected_bryce_excerpt_duration";
      maximumGeneratedToSourceRatio: typeof CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO;
      correctedSourceAudioSeconds: number;
      maximumGeneratedSecondsPerCandidate: number;
      enforcedByRuntimeCheck: "CONDITIONAL_DURATION_LIMIT";
      enforcedBeforeConditionalApi: true;
    };
    theoreticalAllJudgeSlotsAudioSeconds: number;
    executableEnvelopeAudioSeconds: number;
    executableEnvelopeAudioTokens: number;
    executableEnvelopeLimitedByHardBudget: true;
    executableEnvelopeDerivation: string;
    maximumTextInputTokensAcrossAllJudgeSlots: number;
    maximumTextOutputTokensAcrossAllJudgeSlots: number;
    maxOutputTokensPerJudgeCall: 5_000;
  };
  cost: {
    currency: "USD";
    approvedHardMaximumUsd: 10;
    nominalFiveBryceCallsEstimatedUsd: number;
    bryceAllRetriesEngineeringCeilingUsd: number;
    nominalOtherVoiceBranchEstimatedUsd: number;
    nominalTuningBranchEstimatedUsd: number;
    nominalBrycePlusOtherVoicePathEstimatedUsd: number;
    nominalBrycePlusWorstConditionalPathEstimatedUsd: number;
    uncappedTheoreticalAllSlotsUsd: number;
    estimatedExecutableMaximumUsd: 10;
    executableEnvelopeMaximumUsd: 10;
    pricing: {
      officialSource: string;
      snapshotAsOf: "2026-07-26";
      snapshotSource:
        "OpenRouter Models API, validated before paid inference";
      snapshotUnit: "USD_PER_TOKEN";
      promptUsdPerToken: 0.0000025;
      inputAudioUsdPerToken: 0.000032;
      completionUsdPerToken: 0.00001;
      audioInputUsdPerMillionTokens: 32;
      textInputUsdPerMillionTokens: 2.5;
      textOutputUsdPerMillionTokens: 10;
    };
    planningAssumption: {
      audioInputTokensPerMinute: 1_000;
      official: false;
      explanation: string;
    };
    perRequestRemainingBudgetGate: true;
    retriesAndConditionalBranchNotGuaranteedByBudget: true;
    perRequestProviderBoundUsd: number;
    providerBoundBasis: {
      contextWindowTokens: 128_000;
      maximumRequestedTextOutputTokens: 5_000;
      allInputTokensChargedAtHighestInputRate: true;
      formalProviderBound: true;
      explanation: string;
    };
    authoritativeActualCostField: "usage.cost";
  };
  promptHashes: readonly {
    judgeId: string;
    primarySha256: string;
    retryCompositeSha256: string;
  }[];
  privateAssignmentManifestSha256: string;
  privateAssignmentManifestHashInvariant:
    "SHA256_OF_EXACT_PRETTY_JSON_FILE_BYTES_WITH_TRAILING_LF";
  externalRequestsDuringOfflinePlanCreation: 0;
  preflightPolicy: {
    allMetadataRequestsCountTowardMaximum: true;
    secureInferenceKeyFileRequired: true;
    keyConfiguredLimitMaximumUsd: 10;
    minimumRequiredKeyRemainingUsd: 10;
    creditsEndpointCalled: false;
    cliMaximumUsd: 10;
    authoritativeActualCostField: "usage.cost";
    http402Policy: "FAIL_CLOSED_NO_RETRY";
    runtimePricingMustExactlyMatchPlan: true;
    runtimePlanHashPinnedBeforeFirstPaidInference: true;
  };
}

interface AiEvaluationPlan extends AiEvaluationPlanWithoutHash {
  planHash: string;
}

export type ResponseRecoveryPerspectiveId =
  (typeof RECOVERY_PERSPECTIVE_IDS)[number];

export interface PriorRejectedResponseEvidence {
  requestIndex: number;
  perspectiveId: ResponseRecoveryPerspectiveId;
  attempt: 1 | 2;
  originalResponseId: string;
  responseSha256: string;
  ledgerStatus: "REJECTED";
  httpStatus: 200;
  rawResponseStored: false;
  bodyHashVerification: "UNVERIFIED_BYTES_ABSENT";
  usageCostUsd: number;
}

export interface ResponseRecoveryPlan {
  schemaVersion:
    "tenxpros-phase2c-response-recovery-plan-v1";
  previousPlanHash: typeof PRIOR_PAID_PLAN_HASH;
  previousLedgerTerminalHash: string;
  previousLedgerSha256: string;
  previousLockSha256: string;
  priorRun: {
    actualCostUsd: typeof PRIOR_PAID_ACTUAL_COST_USD;
    externalRequests: typeof PRIOR_PAID_EXTERNAL_REQUESTS;
    uncertainCostUsd: 0;
  };
  frozenInputBinding: {
    manifestSha256: typeof EXPECTED_PHASE2B_MANIFEST_SHA256;
    zipSha256: typeof EXPECTED_PHASE2B_ZIP_SHA256;
    treeSha256: typeof EXPECTED_PHASE2B_TREE_SHA256;
    treeFileCount: typeof EXPECTED_PHASE2B_TREE_FILES;
    audioFiles: readonly {
      filename: string;
      sha256: string;
    }[];
  };
  rejectedResponses: readonly PriorRejectedResponseEvidence[];
  recoveryPolicyVersion:
    typeof RESPONSE_RECOVERY_POLICY_VERSION;
  correctedResponseSchemaSha256: string;
  recoveredPerspectiveIds: readonly ResponseRecoveryPerspectiveId[];
  missingPerspectiveIds: readonly ResponseRecoveryPerspectiveId[];
  recoveredPerspectiveCount: number;
  missingPerspectiveCount: number;
  replacementPolicy: {
    exactlyOnePrimaryPerMissingPerspective: true;
    maximumNewPrimaryRequests: number;
    billedAutomaticRetries: 0;
    unbilledOrPreTransmissionFallbackOnly: true;
    strictJsonSchemaIfSupported: true;
    deterministicJsonFallback: true;
    freshNeutralRandomizationRequired: true;
    replayPriorRequestIndexes: readonly [];
  };
  cumulativeCaps: {
    maximumActualPlusUncertainCostUsd:
      typeof RECOVERY_MAXIMUM_USD;
    maximumExternalRequests:
      typeof RECOVERY_MAXIMUM_EXTERNAL_REQUESTS;
  };
  remainingCostUsd: number;
  remainingExternalRequests: number;
  recoveryPlanHash: string;
}

export interface OfflineResponseRecoveryAttempt {
  evidence: PriorRejectedResponseEvidence;
  status: "RECOVERED" | "INVALID" | "SOURCE_MISSING";
  recoveredResponse?: unknown;
  recoveredResponseSha256?: string;
  provenance?: readonly Readonly<Record<string, unknown>>[];
  issueCodes: readonly string[];
}

export interface OfflineResponseRecoveryArtifacts {
  recoveryPlan: ResponseRecoveryPlan;
  selected: readonly {
    perspectiveId: ResponseRecoveryPerspectiveId;
    attempt: 1 | 2;
    requestIndex: number;
    recoveredResponseSha256: string;
  }[];
  outputDirectory: string;
  recoveryLedgerPath: string;
  recoveryReportPath: string;
  recoveredResponsesDirectory: string;
}

type AiEvaluationPlanCore = Omit<
  AiEvaluationPlanWithoutHash,
  "privateAssignmentManifestSha256"
>;

interface PrivateAiManifest {
  schemaVersion:
    "tenxpros-phase2c-openrouter-private-ai-manifest-v2";
  evaluationId: string;
  provider: "openrouter";
  model: typeof MODEL_ID;
  sourceEvaluationPackageId: string;
  planCoreHash: string;
  planCoreHashInvariant:
    "SHA256_OF_STABLE_PLAN_CORE_WITHOUT_PRIVATE_MANIFEST_SHA256_OR_PLAN_HASH";
  emittedFileHashInvariant:
    "SHA256_OF_EXACT_PRETTY_JSON_FILE_BYTES_WITH_TRAILING_LF";
  private: true;
  sourcePrivateMapping: Phase2BManifest["pairs"];
  judgeAssignments: readonly AiBlindJudgeAssignment[];
  prompts: readonly {
    judgeId: string;
    prompt: string;
    sha256: string;
  }[];
  conditionalBranch: {
    maximumRounds: 1;
    maximumTuningProfiles: 2;
    localVoiceAssets: {
      linda: {
        modelPath: string;
        modelSha256: string;
        sampleRateHz: 22_050;
      };
      cori: {
        modelPath: string;
        modelSha256: string;
        sampleRateHz: 22_050;
      };
    };
  };
}

function assertPrivateManifestHashInvariant(
  plan: AiEvaluationPlan,
  privateManifest: PrivateAiManifest,
): void {
  const {
    planHash: _planHash,
    privateAssignmentManifestSha256:
      _privateAssignmentManifestSha256,
    ...reconstructedPlanCore
  } = plan;
  if (
    privateManifest.planCoreHash !==
      sha256(stableJson(reconstructedPlanCore)) ||
    plan.privateAssignmentManifestSha256 !==
      sha256(prettyJsonFileBytes(privateManifest)) ||
    plan.privateAssignmentManifestHashInvariant !==
      "SHA256_OF_EXACT_PRETTY_JSON_FILE_BYTES_WITH_TRAILING_LF" ||
    privateManifest.planCoreHashInvariant !==
      "SHA256_OF_STABLE_PLAN_CORE_WITHOUT_PRIVATE_MANIFEST_SHA256_OR_PLAN_HASH" ||
    privateManifest.emittedFileHashInvariant !==
      "SHA256_OF_EXACT_PRETTY_JSON_FILE_BYTES_WITH_TRAILING_LF"
  ) {
    throw new Error(
      "Private manifest/plan hash invariant failed",
    );
  }
}

interface LedgerEntryBase {
  schemaVersion: typeof LEDGER_SCHEMA_VERSION;
  sequence: number;
  timestamp: string;
  previousHash: string;
  event: string;
  planHash: string;
  data: Readonly<Record<string, unknown>>;
}

interface LedgerEntry extends LedgerEntryBase {
  entryHash: string;
}

interface FetchResponseLike {
  ok: boolean;
  status: number;
  headers?: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export interface AiAudioEvaluationDependencies {
  fetchImpl?: (
    input: string,
    init?: RequestInit,
  ) => Promise<FetchResponseLike>;
  now?: () => string;
}

function usage(): string {
  return `Prepare or execute the one-off Phase 2C audio evaluation

Dry-run (zero external requests):
  pnpm exec tsx scripts/ai-audio-evaluation-cli.ts

Offline recovery audit (zero external requests):
  pnpm exec tsx scripts/ai-audio-evaluation-cli.ts \\
    --recover-responses-offline \\
    --output-dir ${DEFAULT_OUTPUT}

Append-only offline report hash attestation (zero external requests):
  pnpm exec tsx scripts/ai-audio-evaluation-cli.ts \\
    --attest-recovery-report \\
    --output-dir ${DEFAULT_OUTPUT}

Metadata-only historical generation retrieval (22 GETs, zero chat POSTs):
  pnpm exec tsx scripts/ai-audio-evaluation-cli.ts \\
    --retrieve-openrouter-generations \\
    --output-dir ${DEFAULT_OUTPUT}

Audited resume of an exact pinned interrupted metadata retrieval (only the
remaining GETs; 23 or 24 total reservations, zero chat POSTs):
  pnpm exec tsx scripts/ai-audio-evaluation-cli.ts \\
    --resume-openrouter-generations \\
    --output-dir ${DEFAULT_OUTPUT}

Append-only reconciliation of the exact completed retrieval (zero external
requests; no API key read):
  pnpm exec tsx scripts/ai-audio-evaluation-cli.ts \\
    --reconcile-openrouter-generations-offline \\
    --output-dir ${DEFAULT_OUTPUT}

Paid response-recovery execution (cumulative task caps):
  pnpm exec tsx scripts/ai-audio-evaluation-cli.ts \\
    --execute-response-recovery \\
    --allow-paid-ai-evaluation \\
    --max-usd 10 \\
    --max-requests 24 \\
    --output-dir ${DEFAULT_OUTPUT}

Paid execution uses the owner authorization already granted for this task.
The generated OpenRouter plan hash is pinned internally before inference:
  pnpm exec tsx scripts/ai-audio-evaluation-cli.ts \\
    --allow-paid-ai-evaluation \\
    --max-usd 10 \\
    --max-requests ${String(MAXIMUM_API_REQUESTS)}

Options:
  --output-dir <directory>  Defaults to ${DEFAULT_OUTPUT}
  --help                    Show this help

The API key is read only from ${SECRET_PATH}. It is never read during dry-run.`;
}

function valueAfter(
  args: readonly string[],
  option: string,
): string | undefined {
  const index = args.indexOf(option);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

export function parseAiAudioEvaluationCliOptions(
  rawArgs: readonly string[],
): AiAudioEvaluationCliOptions {
  let args = rawArgs[0] === "--" ? rawArgs.slice(1) : [...rawArgs];
  if (
    args[0] === "ai-evaluate" ||
    args[0] === "phase2c"
  ) {
    args = args.slice(1);
  }
  const values = new Set([
    "--output-dir",
    "--max-usd",
    "--max-requests",
  ]);
  const flags = new Set([
    "--allow-paid-ai-evaluation",
    "--recover-responses-offline",
    "--attest-recovery-report",
    "--execute-response-recovery",
    "--retrieve-openrouter-generations",
    "--resume-openrouter-generations",
    "--reconcile-openrouter-generations-offline",
    "--help",
  ]);
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    if (!values.has(argument) && !flags.has(argument)) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (seen.has(argument)) {
      throw new Error(`Duplicate option: ${argument}`);
    }
    seen.add(argument);
    if (values.has(argument)) index += 1;
  }
  return {
    outputDirectory: resolve(
      process.cwd(),
      valueAfter(args, "--output-dir") ?? DEFAULT_OUTPUT,
    ),
    allowPaid: args.includes("--allow-paid-ai-evaluation"),
    recoverResponsesOffline: args.includes(
      "--recover-responses-offline",
    ),
    attestRecoveryReport: args.includes(
      "--attest-recovery-report",
    ),
    executeResponseRecovery: args.includes(
      "--execute-response-recovery",
    ),
    retrieveOpenRouterGenerations: args.includes(
      "--retrieve-openrouter-generations",
    ),
    resumeOpenRouterGenerations: args.includes(
      "--resume-openrouter-generations",
    ),
    reconcileOpenRouterGenerationsOffline:
      args.includes(
        "--reconcile-openrouter-generations-offline",
      ),
    suppliedMaxUsd: valueAfter(args, "--max-usd"),
    suppliedMaxRequests: valueAfter(args, "--max-requests"),
    help: args.includes("--help"),
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function prettyJsonFileBytes(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertExactSha256(
  value: string,
  label: string,
): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${label} must be an exact SHA-256`);
  }
}

export function buildResponseRecoveryPlan(input: {
  previousPlanHash: string;
  previousLedgerTerminalHash: string;
  previousLedgerSha256: string;
  previousLockSha256: string;
  rejectedResponses: readonly PriorRejectedResponseEvidence[];
  correctedResponseSchemaSha256: string;
  recoveredPerspectiveIds: readonly string[];
  missingPerspectiveIds: readonly string[];
}): ResponseRecoveryPlan {
  if (input.previousPlanHash !== PRIOR_PAID_PLAN_HASH) {
    throw new Error(
      "Recovery must reference the exact completed paid-run plan hash",
    );
  }
  assertExactSha256(
    input.previousLedgerTerminalHash,
    "Previous ledger terminal hash",
  );
  assertExactSha256(
    input.previousLedgerSha256,
    "Previous ledger file hash",
  );
  assertExactSha256(
    input.previousLockSha256,
    "Previous paid lock file hash",
  );
  assertExactSha256(
    input.correctedResponseSchemaSha256,
    "Corrected response schema hash",
  );
  if (input.rejectedResponses.length !== 10) {
    throw new Error(
      "Recovery requires exactly ten prior rejected response hashes",
    );
  }
  const expectedPerspectives = new Set<string>(
    RECOVERY_PERSPECTIVE_IDS,
  );
  const responseKeys = new Set<string>();
  const requestIndexes = new Set<number>();
  const rejectedResponses = [...input.rejectedResponses]
    .map((response) => {
      if (
        !expectedPerspectives.has(response.perspectiveId) ||
        (response.attempt !== 1 && response.attempt !== 2) ||
        !Number.isInteger(response.requestIndex) ||
        response.requestIndex < 3 ||
        response.requestIndex > 12 ||
        !response.originalResponseId.trim() ||
        response.ledgerStatus !== "REJECTED" ||
        response.httpStatus !== 200 ||
        response.rawResponseStored !== false ||
        response.bodyHashVerification !==
          "UNVERIFIED_BYTES_ABSENT" ||
        !Number.isFinite(response.usageCostUsd) ||
        response.usageCostUsd < 0
      ) {
        throw new Error(
          "Prior rejected response identity is invalid",
        );
      }
      assertExactSha256(
        response.responseSha256,
        "Prior rejected response hash",
      );
      const key = `${response.perspectiveId}:${String(
        response.attempt,
      )}`;
      if (
        responseKeys.has(key) ||
        requestIndexes.has(response.requestIndex)
      ) {
        throw new Error(
          "Prior rejected response identities are duplicated",
        );
      }
      responseKeys.add(key);
      requestIndexes.add(response.requestIndex);
      return { ...response };
    })
    .sort(
      (left, right) =>
        left.requestIndex - right.requestIndex,
    );
  for (const perspectiveId of RECOVERY_PERSPECTIVE_IDS) {
    if (
      !responseKeys.has(`${perspectiveId}:1`) ||
      !responseKeys.has(`${perspectiveId}:2`)
    ) {
      throw new Error(
        "Each recovery perspective requires one initial response and one retry",
      );
    }
  }
  const normalizePerspectiveIds = (
    values: readonly string[],
    label: string,
  ): ResponseRecoveryPerspectiveId[] => {
    const unique = [...new Set(values)];
    if (
      unique.length !== values.length ||
      unique.some(
        (value) => !expectedPerspectives.has(value),
      )
    ) {
      throw new Error(
        `${label} contains an invalid or duplicate perspective`,
      );
    }
    return RECOVERY_PERSPECTIVE_IDS.filter((value) =>
      unique.includes(value),
    );
  };
  const recoveredPerspectiveIds = normalizePerspectiveIds(
    input.recoveredPerspectiveIds,
    "Recovered perspective list",
  );
  const missingPerspectiveIds = normalizePerspectiveIds(
    input.missingPerspectiveIds,
    "Missing perspective list",
  );
  const combined = new Set([
    ...recoveredPerspectiveIds,
    ...missingPerspectiveIds,
  ]);
  if (
    combined.size !== RECOVERY_PERSPECTIVE_IDS.length ||
    recoveredPerspectiveIds.some((value) =>
      missingPerspectiveIds.includes(value),
    )
  ) {
    throw new Error(
      "Recovered and missing perspectives must form one exact five-perspective partition",
    );
  }
  const remainingCostUsd = Number(
    (
      RECOVERY_MAXIMUM_USD -
      PRIOR_PAID_ACTUAL_COST_USD
    ).toFixed(8),
  );
  const remainingExternalRequests =
    RECOVERY_MAXIMUM_EXTERNAL_REQUESTS -
    PRIOR_PAID_EXTERNAL_REQUESTS;
  const withoutHash: Omit<
    ResponseRecoveryPlan,
    "recoveryPlanHash"
  > = {
    schemaVersion:
      "tenxpros-phase2c-response-recovery-plan-v1",
    previousPlanHash: PRIOR_PAID_PLAN_HASH,
    previousLedgerTerminalHash:
      input.previousLedgerTerminalHash,
    previousLedgerSha256: input.previousLedgerSha256,
    previousLockSha256: input.previousLockSha256,
    priorRun: {
      actualCostUsd: PRIOR_PAID_ACTUAL_COST_USD,
      externalRequests: PRIOR_PAID_EXTERNAL_REQUESTS,
      uncertainCostUsd: 0,
    },
    frozenInputBinding: {
      manifestSha256:
        EXPECTED_PHASE2B_MANIFEST_SHA256,
      zipSha256: EXPECTED_PHASE2B_ZIP_SHA256,
      treeSha256: EXPECTED_PHASE2B_TREE_SHA256,
      treeFileCount: EXPECTED_PHASE2B_TREE_FILES,
      audioFiles: Object.entries(EXPECTED_AUDIO)
        .map(([filename, value]) => ({
          filename,
          sha256: value.sha256,
        }))
        .sort((left, right) =>
          left.filename.localeCompare(right.filename),
        ),
    },
    rejectedResponses,
    recoveryPolicyVersion:
      RESPONSE_RECOVERY_POLICY_VERSION,
    correctedResponseSchemaSha256:
      input.correctedResponseSchemaSha256,
    recoveredPerspectiveIds,
    missingPerspectiveIds,
    recoveredPerspectiveCount:
      recoveredPerspectiveIds.length,
    missingPerspectiveCount: missingPerspectiveIds.length,
    replacementPolicy: {
      exactlyOnePrimaryPerMissingPerspective: true,
      maximumNewPrimaryRequests:
        missingPerspectiveIds.length,
      billedAutomaticRetries: 0,
      unbilledOrPreTransmissionFallbackOnly: true,
      strictJsonSchemaIfSupported: true,
      deterministicJsonFallback: true,
      freshNeutralRandomizationRequired: true,
      replayPriorRequestIndexes: [],
    },
    cumulativeCaps: {
      maximumActualPlusUncertainCostUsd:
        RECOVERY_MAXIMUM_USD,
      maximumExternalRequests:
        RECOVERY_MAXIMUM_EXTERNAL_REQUESTS,
    },
    remainingCostUsd,
    remainingExternalRequests,
  };
  return {
    ...withoutHash,
    recoveryPlanHash: sha256(stableJson(withoutHash)),
  };
}

export function assertResponseRecoveryPlanInvariant(
  value: unknown,
): asserts value is ResponseRecoveryPlan {
  if (
    !isRecord(value) ||
    value.schemaVersion !==
      "tenxpros-phase2c-response-recovery-plan-v1" ||
    !Array.isArray(value.rejectedResponses) ||
    !Array.isArray(value.recoveredPerspectiveIds) ||
    !Array.isArray(value.missingPerspectiveIds)
  ) {
    throw new Error(
      "Response recovery plan has an invalid runtime shape",
    );
  }
  const plan = value as unknown as ResponseRecoveryPlan;
  assertExactSha256(
    plan.recoveryPlanHash,
    "Recovery plan hash",
  );
  let rebuilt: ResponseRecoveryPlan;
  try {
    rebuilt = buildResponseRecoveryPlan({
      previousPlanHash: plan.previousPlanHash,
      previousLedgerTerminalHash:
        plan.previousLedgerTerminalHash,
      previousLedgerSha256:
        plan.previousLedgerSha256,
      previousLockSha256: plan.previousLockSha256,
      rejectedResponses: plan.rejectedResponses,
      correctedResponseSchemaSha256:
        plan.correctedResponseSchemaSha256,
      recoveredPerspectiveIds:
        plan.recoveredPerspectiveIds,
      missingPerspectiveIds:
        plan.missingPerspectiveIds,
    });
  } catch (error) {
    throw new Error(
      "Response recovery plan violates a frozen recovery invariant",
      { cause: error },
    );
  }
  if (stableJson(rebuilt) !== stableJson(plan)) {
    throw new Error(
      "Response recovery plan differs from its deterministic frozen reconstruction",
    );
  }
}

export function assertNextRecoveryRequestFits(input: {
  newExternalRequestsUsed: number;
  newKnownActualCostUsd: number;
  newUncertainMaximumCostUsd: number;
  nextMaximumPossibleCostUsd: number;
}): void {
  if (
    !Number.isInteger(input.newExternalRequestsUsed) ||
    input.newExternalRequestsUsed < 0 ||
    !Number.isFinite(input.newKnownActualCostUsd) ||
    input.newKnownActualCostUsd < 0 ||
    !Number.isFinite(input.newUncertainMaximumCostUsd) ||
    input.newUncertainMaximumCostUsd < 0
  ) {
    throw new Error(
      "Recovery accounting delta is invalid",
    );
  }
  assertNextPaidRequestFits({
    requestsUsed:
      PRIOR_PAID_EXTERNAL_REQUESTS +
      input.newExternalRequestsUsed,
    capAccountedCostUsd:
      PRIOR_PAID_ACTUAL_COST_USD +
      input.newKnownActualCostUsd +
      input.newUncertainMaximumCostUsd,
    nextMaximumPossibleCostUsd:
      input.nextMaximumPossibleCostUsd,
    maximumRequests: RECOVERY_MAXIMUM_EXTERNAL_REQUESTS,
    maximumUsd: RECOVERY_MAXIMUM_USD,
  });
}

export interface FreshRecoveryRandomization {
  schemaVersion:
    "tenxpros-phase2c-fresh-recovery-randomization-v1";
  perspectiveId: ResponseRecoveryPerspectiveId;
  privateBlindSeed: string;
  priorAssignmentHashes: readonly string[];
  priorPresentationSignatures: readonly string[];
  priorRecoveryRandomizationHashes: readonly string[];
  assignment: AiBlindJudgeAssignment;
  presentationSignature: string;
  randomizationSha256: string;
}

function assignmentPresentationSignature(
  assignment: AiBlindJudgeAssignment,
): string {
  return hashAiValue(
    assignment.pairs.map((pair) => ({
      sourcePairId: pair.sourcePairId,
      sourceSampleIds: pair.clips.map(
        (clip) => clip.sourceSampleId,
      ),
    })),
  );
}

function validatedPriorAssignmentBindings(
  priorAssignments: readonly AiBlindJudgeAssignment[],
): {
  hashes: string[];
  presentationSignatures: string[];
} {
  if (
    priorAssignments.length !== 5 ||
    new Set(
      priorAssignments.map(
        (assignment) => assignment.judgeId,
      ),
    ).size !== 5
  ) {
    throw new Error(
      "Fresh recovery randomization requires all five unique prior assignments",
    );
  }
  for (const assignment of priorAssignments) {
    const {
      assignmentHash,
      ...assignmentWithoutHash
    } = assignment;
    if (
      assignmentHash !==
      hashAiValue(assignmentWithoutHash)
    ) {
      throw new Error(
        "A prior assignment hash is not internally valid",
      );
    }
  }
  return {
    hashes: priorAssignments
      .map((assignment) => assignment.assignmentHash)
      .sort(),
    presentationSignatures: priorAssignments
      .map(assignmentPresentationSignature)
      .sort(),
  };
}

export function buildFreshRecoveryRandomization(input: {
  perspectiveId: ResponseRecoveryPerspectiveId;
  evaluationPackageId: string;
  sourcePairs: readonly AiBlindSourcePair[];
  priorAssignments: readonly AiBlindJudgeAssignment[];
  priorRecoveryRandomizations?: readonly FreshRecoveryRandomization[];
  entropySource?: () => Buffer;
}): FreshRecoveryRandomization {
  const prior = validatedPriorAssignmentBindings(
    input.priorAssignments,
  );
  const priorHashSet = new Set(prior.hashes);
  const priorPresentationSet = new Set(
    prior.presentationSignatures,
  );
  const priorRecoveryRandomizations =
    input.priorRecoveryRandomizations ?? [];
  const priorRecoveryRandomizationHashes =
    priorRecoveryRandomizations
      .map((randomization) => {
        const {
          randomizationSha256,
          ...randomizationWithoutHash
        } = randomization;
        if (
          hashAiValue(randomizationWithoutHash) !==
          randomizationSha256
        ) {
          throw new Error(
            "A prior recovery randomization hash is invalid",
          );
        }
        return randomizationSha256;
      })
      .sort();
  if (
    new Set(priorRecoveryRandomizationHashes).size !==
    priorRecoveryRandomizationHashes.length
  ) {
    throw new Error(
      "Prior recovery randomizations must be unique",
    );
  }
  for (const randomization of priorRecoveryRandomizations) {
    priorHashSet.add(
      randomization.assignment.assignmentHash,
    );
    priorPresentationSet.add(
      randomization.presentationSignature,
    );
  }
  const entropySource =
    input.entropySource ?? (() => randomBytes(32));
  for (let generationAttempt = 1; generationAttempt <= 64; generationAttempt += 1) {
    const entropy = entropySource();
    if (entropy.length < 32) {
      throw new Error(
        "Fresh recovery randomization entropy must contain at least 256 bits",
      );
    }
    const privateBlindSeed = [
      "tenxpros-phase2c-response-recovery-v1",
      input.perspectiveId,
      String(generationAttempt),
      entropy.toString("hex"),
    ].join("\0");
    const assignment =
      buildBlindJudgeAssignments({
        evaluationPackageId:
          input.evaluationPackageId,
        blindSeed: privateBlindSeed,
        pairs: input.sourcePairs,
      }).find(
        (candidate) =>
          candidate.judgeId === input.perspectiveId,
      );
    if (!assignment) {
      throw new Error(
        "Fresh randomization did not produce the requested perspective",
      );
    }
    const presentationSignature =
      assignmentPresentationSignature(assignment);
    if (
      priorHashSet.has(assignment.assignmentHash) ||
      priorPresentationSet.has(presentationSignature)
    ) {
      continue;
    }
    const withoutHash = {
      schemaVersion:
        "tenxpros-phase2c-fresh-recovery-randomization-v1" as const,
      perspectiveId: input.perspectiveId,
      privateBlindSeed,
      priorAssignmentHashes: prior.hashes,
      priorPresentationSignatures:
        prior.presentationSignatures,
      priorRecoveryRandomizationHashes,
      assignment,
      presentationSignature,
    };
    return {
      ...withoutHash,
      randomizationSha256: hashAiValue(withoutHash),
    };
  }
  throw new Error(
    "Unable to generate a presentation order distinct from every prior assignment",
  );
}

export function assertFreshRecoveryRandomization(
  input: {
    randomization: FreshRecoveryRandomization;
    evaluationPackageId: string;
    sourcePairs: readonly AiBlindSourcePair[];
    priorAssignments: readonly AiBlindJudgeAssignment[];
    priorRecoveryRandomizations?: readonly FreshRecoveryRandomization[];
  },
): void {
  const {
    randomizationSha256,
    ...withoutHash
  } = input.randomization;
  if (
    hashAiValue(withoutHash) !== randomizationSha256
  ) {
    throw new Error(
      "Fresh recovery randomization hash does not match its contents",
    );
  }
  const prior = validatedPriorAssignmentBindings(
    input.priorAssignments,
  );
  const priorRecoveryRandomizations =
    input.priorRecoveryRandomizations ?? [];
  const priorRecoveryRandomizationHashes =
    priorRecoveryRandomizations
      .map((randomization) => randomization.randomizationSha256)
      .sort();
  if (
    stableJson(prior.hashes) !==
      stableJson(
        input.randomization.priorAssignmentHashes,
      ) ||
    stableJson(prior.presentationSignatures) !==
      stableJson(
        input.randomization
          .priorPresentationSignatures,
      ) ||
    stableJson(priorRecoveryRandomizationHashes) !==
      stableJson(
        input.randomization
          .priorRecoveryRandomizationHashes,
      )
  ) {
    throw new Error(
      "Fresh recovery randomization is not bound to the verified prior assignments",
    );
  }
  const reconstructed =
    buildBlindJudgeAssignments({
      evaluationPackageId:
        input.evaluationPackageId,
      blindSeed:
        input.randomization.privateBlindSeed,
      pairs: input.sourcePairs,
    }).find(
      (assignment) =>
        assignment.judgeId ===
        input.randomization.perspectiveId,
    );
  if (
    !reconstructed ||
    stableJson(reconstructed) !==
      stableJson(input.randomization.assignment) ||
    assignmentPresentationSignature(reconstructed) !==
      input.randomization.presentationSignature ||
    prior.hashes.includes(reconstructed.assignmentHash) ||
    prior.presentationSignatures.includes(
      input.randomization.presentationSignature,
    ) ||
    priorRecoveryRandomizations.some(
      (randomization) =>
        randomization.randomizationSha256 ===
          input.randomization.randomizationSha256 ||
        randomization.assignment.assignmentHash ===
          reconstructed.assignmentHash ||
        randomization.presentationSignature ===
          input.randomization.presentationSignature,
    )
  ) {
    throw new Error(
      "Fresh recovery assignment is not a newly generated presentation",
    );
  }
}

export function buildRecoveryJudgePrompt(
  assignment: AiBlindJudgeAssignment,
): string {
  const prompt = buildJudgePrompt(assignment)
    .replace(
      "For each set compare the two neutral clip labels for overall preference,",
      `Schema binding rules:
- For every listed set, the first named clip is Version A and the second named clip is Version B.
- Use the exact neutral SET label as pair_id. Never use a clip label as pair_id.
- Use only A or B in file_scores.version and speed/pronunciation version fields.
- Use only A, B, or tie in permitted comparison-choice fields.
- The one set explicitly marked for table questions is the exact pair_id for table_evaluation.
- A version cannot be both too_slow and too_fast.
- A critical pronunciation finding requires that version's pronunciation score to be 3 or lower.
- If clearer_version, more_natural_version, or long_form_preference chooses A or B, the chosen version's corresponding score cannot be lower than the other version's score.
- If audible_distinction is NONE with confidence 80 or higher, at least one comparison-choice field must be tie.
- If longer_version is tie, both longer_duration_excessive and clarity_justifies_added_duration must be false.

For each set compare the two neutral clip labels for overall preference,`,
    )
    .replace(
    /Submit exactly one call to the supplied evaluation function\. Use assignment\nid [^\n]+ and judge id [^.]+\.$/u,
      `Submit exactly one evaluation matching the supplied response schema. Use assignment\nid ${assignment.assignmentId} and judge id ${assignment.judgeId}.`,
    );
  if (
    prompt.includes("supplied evaluation function") ||
    !prompt.includes(
      "the first named clip is Version A",
    )
  ) {
    throw new Error(
      "Recovery prompt transformation did not bind the corrected JSON schema to A/B presentation positions",
    );
  }
  return prompt;
}

export const RECOVERY_FORCED_TOOL = Object.freeze({
  type: "function",
  function: {
    name: RECOVERY_TOOL_NAME,
    description:
      "Submit one complete independent blind audio evaluation.",
    strict: true,
    parameters: {
      ...AI_AUDIO_RECOVERED_RESPONSE_JSON_SCHEMA,
      required:
        AI_AUDIO_RECOVERED_RESPONSE_JSON_SCHEMA.required,
      properties: {
        ...AI_AUDIO_RECOVERED_RESPONSE_JSON_SCHEMA.properties,
        long_form_recommendation: {
          type: "string",
          minLength: 20,
          maxLength: 1_000,
          description:
            "A bounded prose recommendation across the full evaluation; never an A/B presentation-position label.",
        },
        confidence: {
          type: "integer",
          minimum: 0,
          maximum: 100,
        },
      },
    },
  },
} as const);

export function buildRecoveryReplacementRequestBody(input: {
  randomization: FreshRecoveryRandomization;
  evaluationPackageId: string;
  sourcePairs: readonly AiBlindSourcePair[];
  priorAssignments: readonly AiBlindJudgeAssignment[];
  priorRecoveryRandomizations?: readonly FreshRecoveryRandomization[];
  prompt: string;
  userContent: readonly Readonly<Record<string, unknown>>[];
  formatMode:
    | "FORCED_TOOL_CALL"
    | "PLAIN_JSON_FALLBACK_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION";
  fallbackOfRequestIndex?: number;
  confirmedUnbilledToolCallRequestIndex?: number;
  confirmedUnbilledTaskLocalEvidence?: {
    transportPostIndex: number;
    ledgerEntryHash: string;
    responseSha256: string;
  };
}): {
  body: Readonly<Record<string, unknown>>;
  redactedRequestRecord: Readonly<Record<string, unknown>>;
} {
  assertFreshRecoveryRandomization({
    randomization: input.randomization,
    evaluationPackageId: input.evaluationPackageId,
    sourcePairs: input.sourcePairs,
    priorAssignments: input.priorAssignments,
    priorRecoveryRandomizations:
      input.priorRecoveryRandomizations,
  });
  const assignment = input.randomization.assignment;
  if (
    input.prompt !== buildRecoveryJudgePrompt(assignment) ||
    input.userContent.filter(
      (part) => part.type === "input_audio",
    ).length !== 10
  ) {
    throw new Error(
      "Recovery replacement requires one assignment, prompt, and all ten audio inputs",
    );
  }
  const expectedAudioHashes = assignment.pairs.flatMap(
    (pair) =>
      pair.clips.map((clip) => clip.audioSha256),
  );
  const audioParts = input.userContent.filter(
    (part) => part.type === "input_audio",
  );
  for (const [index, expectedHash] of expectedAudioHashes.entries()) {
    const inputAudio = audioParts[index]?.input_audio;
    if (
      !isRecord(inputAudio) ||
      inputAudio.format !== "mp3" ||
      typeof inputAudio.data !== "string"
    ) {
      throw new Error(
        "Recovery replacement contains an invalid audio payload",
      );
    }
    const audioBytes = Buffer.from(inputAudio.data, "base64");
    if (
      audioBytes.length === 0 ||
      audioBytes.toString("base64") !==
        inputAudio.data ||
      sha256(audioBytes) !== expectedHash
    ) {
      throw new Error(
        "Recovery replacement audio order or bytes do not match the fresh assignment",
      );
    }
  }
  const textOnly = input.userContent
    .filter((part) => part.type === "text")
    .map((part) => String(part.text ?? ""))
    .join("\n");
  if (
    /\b(?:baseline|corrected|pipeline)\b/iu.test(
      `${input.prompt}\n${textOnly}`,
    )
  ) {
    throw new Error(
      "Recovery replacement prompt leaks a private pipeline identity",
    );
  }
  const forcedToolMode =
    input.formatMode === "FORCED_TOOL_CALL";
  const localEvidence =
    input.confirmedUnbilledTaskLocalEvidence;
  const validLocalEvidence =
    localEvidence !== undefined &&
    Number.isInteger(localEvidence.transportPostIndex) &&
    localEvidence.transportPostIndex > 0 &&
    /^[a-f0-9]{64}$/u.test(localEvidence.ledgerEntryHash) &&
    /^[a-f0-9]{64}$/u.test(localEvidence.responseSha256);
  const validLegacyEvidence =
    Number.isInteger(input.fallbackOfRequestIndex) &&
    (input.fallbackOfRequestIndex ?? 0) >= 13 &&
    input.fallbackOfRequestIndex ===
      input.confirmedUnbilledToolCallRequestIndex;
  if (
    forcedToolMode
      ? input.fallbackOfRequestIndex !== undefined ||
        input.confirmedUnbilledToolCallRequestIndex !==
          undefined ||
        localEvidence !== undefined
      : validLegacyEvidence === validLocalEvidence
  ) {
    throw new Error(
      "Plain JSON fallback requires one exact confirmed-unbilled forced-tool predecessor",
    );
  }
  const body = {
    model: MODEL_ID,
    provider: {
      allow_fallbacks: false,
      require_parameters: true,
    },
    store: false,
    stream: false,
    max_tokens: MAX_OUTPUT_TOKENS_PER_JUDGE,
    ...(forcedToolMode
      ? {
          tools: [RECOVERY_FORCED_TOOL],
          tool_choice: {
            type: "function",
            function: {
              name: RECOVERY_TOOL_NAME,
            },
          },
        }
      : {}),
    messages: [
      {
        role: "system",
        content: forcedToolMode
          ? `Perform one fresh independent blind audio evaluation at exactly 1.0x normal playback speed. A and B are presentation positions only. Call only ${RECOVERY_TOOL_NAME}.`
          : "Perform one fresh independent blind audio evaluation at exactly 1.0x normal playback speed. A and B are presentation positions only. Return only a single JSON object. Do not use Markdown.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: input.prompt,
          },
          ...input.userContent,
        ],
      },
    ],
  } as const;
  return {
    body,
    redactedRequestRecord: {
      schemaVersion:
        "tenxpros-phase2c-recovery-replacement-request-v1",
      provider: "openrouter",
      endpoint: "/chat/completions",
      model: MODEL_ID,
      perspectiveId:
        input.randomization.perspectiveId,
      assignmentId: assignment.assignmentId,
      assignmentHash: assignment.assignmentHash,
      neutralRandomizationSha256:
        input.randomization.randomizationSha256,
      freshPresentationSignature:
        input.randomization.presentationSignature,
      distinctFromPriorAssignmentHashes: true,
      distinctFromPriorPresentationSignatures: true,
      formatMode: input.formatMode,
      fallbackOfRequestIndex:
        input.fallbackOfRequestIndex ?? null,
      confirmedUnbilledTaskLocalEvidence:
        localEvidence ?? null,
      toolArgumentsSchemaSha256: hashAiValue(
        RECOVERY_FORCED_TOOL.function.parameters,
      ),
      responseFormatOmitted: true,
      providerRouting: {
        allowFallbacks: false,
        requireParameters: true,
      },
      audioClipCount: 10,
      requestBodySha256: sha256(JSON.stringify(body)),
      rawAudioStored: false,
      secretStored: false,
      privateMappingStored: false,
    },
  };
}

export function assertRecoveryReplacementDispatchAllowed(
  input: {
    recoveryPlan: ResponseRecoveryPlan;
    perspectiveId: ResponseRecoveryPerspectiveId;
    mode:
      | "PRIMARY_FORCED_TOOL_CALL"
      | "UNBILLED_PLAIN_JSON_FALLBACK";
    priorNewRequests: readonly {
      requestIndex: number;
      perspectiveId: ResponseRecoveryPerspectiveId;
      mode:
        | "PRIMARY_STRICT_JSON_SCHEMA"
        | "UNBILLED_FORMAT_FALLBACK"
        | "PRIMARY_FORCED_TOOL_CALL"
        | "UNBILLED_PLAIN_JSON_FALLBACK";
      status:
        | "ACCEPTED"
        | "REJECTED_BILLED"
        | "FAILED_NOT_BILLED"
        | "UNCERTAIN_PAID";
      issueCodes: readonly string[];
    }[];
    strictFormatUnsupportedPreflightRequestIndex?: number;
  },
): void {
  if (
    !input.recoveryPlan.missingPerspectiveIds.includes(
      input.perspectiveId,
    ) ||
    input.recoveryPlan.recoveredPerspectiveIds.includes(
      input.perspectiveId,
    )
  ) {
    throw new Error(
      "A recovered or unplanned perspective may not be requested again",
    );
  }
  if (
    input.priorNewRequests.some(
      (request) =>
        request.requestIndex <=
        PRIOR_PAID_EXTERNAL_REQUESTS,
    )
  ) {
    throw new Error(
      "Recovery dispatch history may not replay or relabel an old request",
    );
  }
  const perspectiveRequests =
    input.priorNewRequests.filter(
      (request) =>
        request.perspectiveId === input.perspectiveId,
    );
  const toolUnsupportedRequests =
    input.priorNewRequests.filter(
      (request) =>
        request.mode ===
          "PRIMARY_FORCED_TOOL_CALL" &&
        request.status === "FAILED_NOT_BILLED" &&
        request.issueCodes.includes(
          "FORCED_TOOL_CALL_UNSUPPORTED",
        ),
    );
  if (toolUnsupportedRequests.length > 1) {
    throw new Error(
      "Forced tool-call capability may be probed only once task-wide",
    );
  }
  const toolUnsupported =
    toolUnsupportedRequests[0];
  const metadataUnsupported =
    input.strictFormatUnsupportedPreflightRequestIndex;
  if (
    metadataUnsupported !== undefined &&
    (!Number.isInteger(metadataUnsupported) ||
      metadataUnsupported <=
        PRIOR_PAID_EXTERNAL_REQUESTS)
  ) {
    throw new Error(
      "Strict-format metadata capability evidence has an invalid request index",
    );
  }
  if (toolUnsupported && metadataUnsupported !== undefined) {
    throw new Error(
      "Tool capability may not be both preflight-unsupported and probed again",
    );
  }
  if (
    toolUnsupported &&
    input.priorNewRequests.some(
      (request) =>
        request.mode ===
          "PRIMARY_FORCED_TOOL_CALL" &&
        request.requestIndex >
          toolUnsupported.requestIndex,
    )
  ) {
    throw new Error(
      "No perspective may re-test forced tool calling after one confirmed-unbilled provider rejection",
    );
  }
  if (input.mode === "PRIMARY_FORCED_TOOL_CALL") {
    if (
      toolUnsupported ||
      metadataUnsupported !== undefined
    ) {
      throw new Error(
        "Forced tool calling is globally unsupported for this recovery run; use the plain JSON fallback",
      );
    }
    if (
      perspectiveRequests.some((request) =>
        [
          "PRIMARY_FORCED_TOOL_CALL",
          "UNBILLED_PLAIN_JSON_FALLBACK",
        ].includes(request.mode),
      )
    ) {
      throw new Error(
        "Exactly one replacement primary is allowed for each missing perspective",
      );
    }
    return;
  }
  const primary = perspectiveRequests.filter(
    (request) =>
      request.mode === "PRIMARY_FORCED_TOOL_CALL",
  );
  const fallback = perspectiveRequests.filter(
    (request) =>
      request.mode === "UNBILLED_PLAIN_JSON_FALLBACK",
  );
  if (
    (!toolUnsupported &&
      metadataUnsupported === undefined) ||
    fallback.length !== 0 ||
    (primary.length !== 0 &&
      (primary.length !== 1 ||
        primary[0]?.requestIndex !==
          toolUnsupported?.requestIndex))
  ) {
    throw new Error(
      "A task-wide plain JSON fallback is allowed exactly once per missing perspective only after the one confirmed-unbilled forced-tool rejection",
    );
  }
}

async function sha256File(path: string): Promise<string> {
  return sha256(await readFile(path));
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function assertRegularFile(
  path: string,
  label: string,
): Promise<void> {
  const metadata = await lstat(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${label} is not a regular non-symlink file`);
  }
}

async function writeNewJson(
  path: string,
  value: unknown,
): Promise<void> {
  await writeFile(path, prettyJsonFileBytes(value), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

async function writeNewRestrictedText(
  path: string,
  value: string,
): Promise<string> {
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(value, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  const directoryHandle = await open(
    dirname(path),
    "r",
  );
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
  const expectedSha256 = sha256(value);
  const metadata = await lstat(path);
  const processUid = process.getuid?.();
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o600 ||
    (processUid !== undefined &&
      metadata.uid !== processUid) ||
    (await sha256File(path)) !== expectedSha256
  ) {
    throw new Error(
      "New restricted text artifact failed post-write verification",
    );
  }
  return expectedSha256;
}

async function writeAtomicJson(
  path: string,
  value: unknown,
): Promise<void> {
  const temporary = `${path}.${String(process.pid)}.tmp`;
  await writeFile(
    temporary,
    prettyJsonFileBytes(value),
    {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    },
  );
  const handle = await open(temporary, "r");
  await handle.sync();
  await handle.close();
  const { rename } = await import("node:fs/promises");
  await rename(temporary, path);
}

async function writeAtomicText(
  path: string,
  value: string,
): Promise<void> {
  const temporary = `${path}.${String(process.pid)}.tmp`;
  await writeFile(temporary, value, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  const handle = await open(temporary, "r");
  await handle.sync();
  await handle.close();
  const { rename } = await import("node:fs/promises");
  await rename(temporary, path);
  const directoryHandle = await open(dirname(path), "r");
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
}

async function writeOrVerifyJson(
  path: string,
  value: unknown,
): Promise<void> {
  if (!(await pathExists(path))) {
    await writeNewJson(path, value);
    return;
  }
  const existing = JSON.parse(
    await readFile(path, "utf8"),
  ) as unknown;
  if (stableJson(existing) !== stableJson(value)) {
    throw new Error(
      `Existing deterministic artifact differs: ${path}`,
    );
  }
}

async function listFilesRecursively(
  root: string,
  directory = root,
): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = resolve(directory, entry.name);
    const relativePath = relative(root, absolute)
      .split(sep)
      .join("/");
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Frozen Phase 2B tree contains a symlink: ${relativePath}`,
      );
    }
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(root, absolute)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error(
        `Frozen Phase 2B tree contains a non-file entry: ${relativePath}`,
      );
    }
  }
  return files.sort();
}

async function phase2BTreeDigest(): Promise<{
  sha256: string;
  files: readonly string[];
}> {
  const files = await listFilesRecursively(PHASE2B_PACKAGE);
  const aggregate = createHash("sha256");
  for (const relativePath of files) {
    const fileHash = await sha256File(
      resolve(PHASE2B_PACKAGE, relativePath),
    );
    aggregate.update(
      `${fileHash}  ${PHASE2B_TREE_HASH_PREFIX}/${relativePath}\n`,
    );
  }
  return {
    sha256: aggregate.digest("hex"),
    files,
  };
}

async function loadFrozenInput(): Promise<FrozenInput> {
  if ((await realpath(PHASE2B_PACKAGE)) !== PHASE2B_PACKAGE) {
    throw new Error("Frozen Phase 2B package may not be a symlink");
  }
  await Promise.all([
    assertRegularFile(PHASE2B_MANIFEST, "Phase 2B manifest"),
    assertRegularFile(PHASE2B_ZIP, "Phase 2B ZIP"),
  ]);
  const [manifestSha256, zipSha256, tree] =
    await Promise.all([
      sha256File(PHASE2B_MANIFEST),
      sha256File(PHASE2B_ZIP),
      phase2BTreeDigest(),
    ]);
  if (
    manifestSha256 !== EXPECTED_PHASE2B_MANIFEST_SHA256 ||
    zipSha256 !== EXPECTED_PHASE2B_ZIP_SHA256 ||
    tree.sha256 !== EXPECTED_PHASE2B_TREE_SHA256 ||
    tree.files.length !== EXPECTED_PHASE2B_TREE_FILES
  ) {
    throw new Error(
      "Frozen Phase 2B package hash/file-count verification failed",
    );
  }
  const manifest = JSON.parse(
    await readFile(PHASE2B_MANIFEST, "utf8"),
  ) as Phase2BManifest;
  if (
    manifest.evaluationPackageId !== EVALUATION_PACKAGE_ID ||
    manifest.pairs.length !== 5
  ) {
    throw new Error(
      "Frozen Phase 2B manifest package or pair count changed",
    );
  }
  const manifestSamples = new Map(
    manifest.pairs.flatMap((pair) =>
      pair.samples.map((sample) => [
        sample.filename,
        sample,
      ] as const),
    ),
  );
  const expectedNames = Object.keys(
    EXPECTED_AUDIO,
  ) as (keyof typeof EXPECTED_AUDIO)[];
  if (
    manifestSamples.size !== 10 ||
    expectedNames.some((name) => !manifestSamples.has(name))
  ) {
    throw new Error("Frozen audio filename set changed");
  }
  const audio = await Promise.all(
    expectedNames.map(async (filename) => {
      const expected = EXPECTED_AUDIO[filename];
      const manifestSample = manifestSamples.get(filename);
      const path = resolve(PHASE2B_LISTENER_AUDIO, filename);
      await assertRegularFile(path, `Frozen audio ${filename}`);
      const [actualSha256, metadata] = await Promise.all([
        sha256File(path),
        stat(path),
      ]);
      if (
        actualSha256 !== expected.sha256 ||
        manifestSample?.sha256 !== expected.sha256 ||
        manifestSample.durationSeconds !==
          expected.durationSeconds ||
        metadata.size <= 0
      ) {
        throw new Error(
          `${filename}: frozen audio hash/duration verification failed`,
        );
      }
      return {
        sampleId: manifestSample.sampleId,
        filename,
        path,
        sha256: actualSha256,
        durationSeconds: expected.durationSeconds,
        bytes: metadata.size,
      };
    }),
  );
  const totalAudioDurationSeconds = audio.reduce(
    (sum, sample) => sum + sample.durationSeconds,
    0,
  );
  if (
    Math.abs(totalAudioDurationSeconds - 1_003.206532) >
    1e-9
  ) {
    throw new Error("Frozen audio-duration total changed");
  }
  return {
    manifest,
    manifestSha256,
    zipSha256,
    treeSha256: tree.sha256,
    treeFileCount: tree.files.length,
    audio,
    totalAudioDurationSeconds,
  };
}

async function assertFrozenInputUnchanged(
  expected: FrozenInput,
): Promise<void> {
  const current = await loadFrozenInput();
  const identity = (input: FrozenInput) => ({
    manifestSha256: input.manifestSha256,
    zipSha256: input.zipSha256,
    treeSha256: input.treeSha256,
    treeFileCount: input.treeFileCount,
    audio: input.audio.map((sample) => ({
      sampleId: sample.sampleId,
      sha256: sample.sha256,
      durationSeconds: sample.durationSeconds,
      bytes: sample.bytes,
    })),
  });
  if (
    stableJson(identity(current)) !==
    stableJson(identity(expected))
  ) {
    throw new Error(
      "Frozen Phase 2B input changed after plan creation",
    );
  }
}

function assertPromptIsBlind(prompt: string): void {
  const normalized = prompt.normalize("NFKC").toLowerCase();
  const prohibited = [
    "baseline",
    "corrected",
    "piper",
    "bryce",
    "linda",
    "cori",
    "tenxpros",
    "sample-0",
    ".mp3",
    "/opt/",
    "manifest",
    "pipeline",
    "provider",
    "voice model",
  ];
  const found = prohibited.filter((token) =>
    normalized.includes(token),
  );
  if (found.length > 0) {
    throw new Error(
      `Judge prompt failed blinding scan: ${found.join(", ")}`,
    );
  }
}

function roundMoney(value: number): number {
  return Number(value.toFixed(6));
}

function buildPlanAndPrivateManifest(
  frozen: FrozenInput,
): {
  plan: AiEvaluationPlan;
  privateManifest: PrivateAiManifest;
  assignments: readonly AiBlindJudgeAssignment[];
  prompts: readonly {
    judgeId: string;
    prompt: string;
    sha256: string;
  }[];
} {
  const blindSeed = sha256(
    [
      "tenxpros-phase2c-blinding-v1",
      frozen.manifestSha256,
      frozen.treeSha256,
      EVALUATION_PACKAGE_ID,
    ].join("\0"),
  );
  const assignments = buildBlindJudgeAssignments({
    evaluationPackageId: EVALUATION_PACKAGE_ID,
    blindSeed,
    pairs: frozen.manifest.pairs.map((pair) => {
      if (pair.samples.length !== 2) {
        throw new Error(
          `${pair.pairId}: expected exactly two blind samples`,
        );
      }
      return {
        pairId: pair.pairId,
        tableEvaluation:
          pair.pairId === frozen.manifest.tablePairId,
        samples: [
          {
            sampleId: pair.samples[0]!.sampleId,
            audioSha256: pair.samples[0]!.sha256,
            durationSeconds:
              pair.samples[0]!.durationSeconds,
          },
          {
            sampleId: pair.samples[1]!.sampleId,
            audioSha256: pair.samples[1]!.sha256,
            durationSeconds:
              pair.samples[1]!.durationSeconds,
          },
        ],
      };
    }),
  });
  const prompts = assignments.map((assignment) => {
    const prompt = buildJudgePrompt(assignment);
    assertPromptIsBlind(prompt);
    return {
      judgeId: assignment.judgeId,
      prompt,
      sha256: sha256(prompt),
    };
  });
  const privateAssignmentMaterial = {
    schemaVersion:
      "tenxpros-phase2c-openrouter-private-assignment-material-v2",
    provider: "openrouter",
    model: MODEL_ID,
    sourceEvaluationPackageId: EVALUATION_PACKAGE_ID,
    sourcePrivateMapping: frozen.manifest.pairs,
    judgeAssignments: assignments,
    promptHashes: prompts.map(({ judgeId, prompt, sha256: hash }) => ({
      judgeId,
      primarySha256: hash,
      retryCompositeSha256: sha256(
        `${prompt}\n\n${VALIDATION_RETRY_INSTRUCTION}`,
      ),
    })),
    conditionalBranch: {
      maximumRounds: 1,
      maximumTuningProfiles: 2,
      localVoiceAssets: {
        linda: {
          modelPath:
            "/opt/piper/voices/en_US-ljspeech-high.onnx",
          modelSha256:
            "5d4f08ba6a2a48c44592eed3ce56bf85e9de3dd4e20df90541ae68a8310c029a",
          sampleRateHz: 22_050,
        },
        cori: {
          modelPath:
            "/opt/piper/voices/en_GB-cori-high.onnx",
          modelSha256:
            "470b4dd634c98f8a4850d7626ffc3dfc90774628eeef6605a6dd8f88f30a5903",
          sampleRateHz: 22_050,
        },
      },
    },
  } as const;
  const totalSeconds = frozen.totalAudioDurationSeconds;
  const baselineSeconds = frozen.manifest.pairs
    .flatMap((pair) => pair.samples)
    .filter((sample) => sample.pipeline === "baseline")
    .reduce(
      (sum, sample) => sum + sample.durationSeconds,
      0,
    );
  const correctedSeconds = frozen.manifest.pairs
    .flatMap((pair) => pair.samples)
    .filter((sample) => sample.pipeline === "corrected")
    .reduce(
      (sum, sample) => sum + sample.durationSeconds,
      0,
    );
  const maximumGeneratedSecondsPerCandidate =
    correctedSeconds *
    CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO;
  /*
   * Each local-voice request contains the frozen corrected candidate plus two
   * generated candidates. Each tuning request contains the frozen baseline,
   * the frozen corrected candidate, and at most two generated profiles. The
   * generated clips are admitted only when the isolated runtime proves that
   * every clip is within the plan-bound 2x per-excerpt ceiling.
   */
  const voiceBranchAudioSecondsPerRequest =
    correctedSeconds +
    2 * maximumGeneratedSecondsPerCandidate;
  const tuningBranchAudioSecondsPerRequest =
    baselineSeconds +
    correctedSeconds +
    2 * maximumGeneratedSecondsPerCandidate;
  const voiceBranchPrimarySeconds =
    CONDITIONAL_BRANCH_PRIMARY_CALLS *
    voiceBranchAudioSecondsPerRequest;
  const tuningBranchPrimarySeconds =
    CONDITIONAL_BRANCH_PRIMARY_CALLS *
    tuningBranchAudioSecondsPerRequest;
  const worstBranchPrimarySeconds = Math.max(
    voiceBranchPrimarySeconds,
    tuningBranchPrimarySeconds,
  );
  const conditionalFixedTextEstimatedUsd =
    (CONDITIONAL_BRANCH_PRIMARY_CALLS * 10_000 /
      1_000_000) *
      OFFICIAL_TEXT_INPUT_USD_PER_MILLION_TOKENS +
    (CONDITIONAL_BRANCH_PRIMARY_CALLS *
      MAX_OUTPUT_TOKENS_PER_JUDGE /
      1_000_000) *
      OFFICIAL_TEXT_OUTPUT_USD_PER_MILLION_TOKENS;
  const nominalConditionalCost = (
    primaryAudioSeconds: number,
  ) =>
    roundMoney(
      (primaryAudioSeconds /
        60 *
        AUDIO_TOKEN_PLANNING_ASSUMPTION_PER_MINUTE /
        1_000_000) *
        OFFICIAL_AUDIO_INPUT_USD_PER_MILLION_TOKENS +
        conditionalFixedTextEstimatedUsd,
    );
  const nominalOtherVoiceBranchEstimatedUsd =
    nominalConditionalCost(voiceBranchPrimarySeconds);
  const nominalTuningBranchEstimatedUsd =
    nominalConditionalCost(tuningBranchPrimarySeconds);
  const nominalFiveBryceCallsEstimatedUsd = roundMoney(
    (totalSeconds *
      PRIMARY_BRYCE_JUDGE_CALLS /
      60 *
      AUDIO_TOKEN_PLANNING_ASSUMPTION_PER_MINUTE /
      1_000_000) *
      OFFICIAL_AUDIO_INPUT_USD_PER_MILLION_TOKENS +
      (PRIMARY_BRYCE_JUDGE_CALLS *
        TEXT_INPUT_TOKENS_PER_JUDGE_ESTIMATE /
        1_000_000) *
        OFFICIAL_TEXT_INPUT_USD_PER_MILLION_TOKENS +
      (PRIMARY_BRYCE_JUDGE_CALLS *
        MAX_OUTPUT_TOKENS_PER_JUDGE /
        1_000_000) *
        OFFICIAL_TEXT_OUTPUT_USD_PER_MILLION_TOKENS,
  );
  const bryceAllRetriesEngineeringCeilingUsd =
    roundMoney(nominalFiveBryceCallsEstimatedUsd * 2);
  const nominalBrycePlusOtherVoicePathEstimatedUsd =
    roundMoney(
      nominalFiveBryceCallsEstimatedUsd +
        nominalOtherVoiceBranchEstimatedUsd,
    );
  const nominalBrycePlusWorstConditionalPathEstimatedUsd =
    roundMoney(
      nominalFiveBryceCallsEstimatedUsd +
        nominalTuningBranchEstimatedUsd,
    );
  const uncappedTheoreticalAllSlotsUsd = roundMoney(
    bryceAllRetriesEngineeringCeilingUsd +
      (CONDITIONAL_BRANCH_MAXIMUM_CALLS /
        CONDITIONAL_BRANCH_PRIMARY_CALLS) *
        nominalTuningBranchEstimatedUsd,
  );
  const maximumExecutableJudgeRequests =
    MAXIMUM_BRYCE_JUDGE_CALLS +
    CONDITIONAL_BRANCH_MAXIMUM_CALLS;
  const maximumExecutableTextInputTokens =
    maximumExecutableJudgeRequests *
    TEXT_INPUT_TOKENS_PER_JUDGE_ESTIMATE;
  const maximumExecutableTextOutputTokens =
    maximumExecutableJudgeRequests *
    MAX_OUTPUT_TOKENS_PER_JUDGE;
  const maximumExecutableTextCostUsd =
    (maximumExecutableTextInputTokens *
      OFFICIAL_TEXT_INPUT_USD_PER_MILLION_TOKENS +
      maximumExecutableTextOutputTokens *
        OFFICIAL_TEXT_OUTPUT_USD_PER_MILLION_TOKENS) /
    1_000_000;
  const executableEnvelopeAudioTokens = Math.floor(
    ((HARD_MAX_USD - maximumExecutableTextCostUsd) *
      1_000_000) /
      OFFICIAL_AUDIO_INPUT_USD_PER_MILLION_TOKENS,
  );
  const executableEnvelopeAudioSeconds =
    executableEnvelopeAudioTokens /
    AUDIO_TOKEN_PLANNING_ASSUMPTION_PER_MINUTE *
    60;
  const planCore: AiEvaluationPlanCore = {
    schemaVersion: PLAN_SCHEMA_VERSION,
    evaluationId: "phase2c-openrouter-bryce-20260726",
    sourceEvaluationPackageId: EVALUATION_PACKAGE_ID,
    provider: {
      id: "openrouter",
      apiBaseUrl: OPENROUTER_API_BASE_URL,
      chatCompletionsEndpoint: "/chat/completions",
      keyPreflightEndpoint: "/key",
      modelsPreflightEndpoint: "/models",
      routing: {
        allowFallbacks: false,
        requireParameters: true,
      },
      attributionHeaders: {
        httpReferer: "https://tenxpros.com",
        title: "TenXPros Academy Audio Evaluation",
        metadata: "enabled",
      },
      promptLoggingRequested: false,
      dataUseOptInRequested: false,
    },
    model: {
      id: MODEL_ID,
      endpoint: "/chat/completions",
      modelPreflightEndpoint: "/models",
      inputAudioFormat: "mp3",
      responseMode: "required_function_call",
      functionName: TOOL_NAME,
      store: false,
      stream: false,
      officialContextWindowTokens:
        MODEL_CONTEXT_WINDOW_TOKENS,
      officialMaximumOutputTokens: 16_384,
      requestedMaximumOutputTokensPerJudge:
        MAX_OUTPUT_TOKENS_PER_JUDGE,
      maximumOutputRequestField: "max_tokens",
      officialCapabilitySource:
        "https://openrouter.ai/openai/gpt-audio/api",
      officialCapabilitiesVerifiedAtPlanning: {
        audioInput: true,
        chatCompletions: true,
        functionCalling: true,
        structuredOutputs: false,
      },
    },
    frozenInput: {
      phase2BPackagePath: PHASE2B_PACKAGE,
      manifestPath: PHASE2B_MANIFEST,
      manifestSha256: frozen.manifestSha256,
      zipPath: PHASE2B_ZIP,
      zipSha256: frozen.zipSha256,
      treeFileCount: frozen.treeFileCount,
      treeSha256: frozen.treeSha256,
      audioFileCount: 10,
      totalAudioDurationSeconds: totalSeconds,
      totalAudioDurationMinutes: totalSeconds / 60,
      audioFiles: frozen.audio.map((sample) => ({
        id: sample.sampleId,
        sha256: sample.sha256,
        durationSeconds: sample.durationSeconds,
        bytes: sample.bytes,
      })),
    },
    judges: {
      primaryBryceJudgeCalls:
        PRIMARY_BRYCE_JUDGE_CALLS,
      maximumBryceCallsIncludingOneValidationRetryEach:
        MAXIMUM_BRYCE_JUDGE_CALLS,
      metadataPreflightCalls: METADATA_PREFLIGHT_CALLS,
      keyPreflightCalls: 1,
      modelsPreflightCalls: 1,
      creditsPreflightCalls: 0,
      conditionalBranchPrimaryCalls:
        CONDITIONAL_BRANCH_PRIMARY_CALLS,
      conditionalBranchMaximumPotentialCalls:
        CONDITIONAL_BRANCH_MAXIMUM_CALLS,
      conditionalBranchMaximumCallsAfterWorstCaseBryce:
        MAXIMUM_CONDITIONAL_CALLS_AFTER_WORST_CASE_BRYCE,
      conditionalBranchMaximumTaskWideValidationRetries: 1,
      maximumApiRequests: MAXIMUM_API_REQUESTS,
      freshConversationPerAttempt: true,
      maximumValidationRetriesPerJudge: 1,
      ambiguousTimeoutRetry: false,
      validationRetryInstructionSha256: sha256(
        VALIDATION_RETRY_INSTRUCTION,
      ),
      conditionalBranchImplementation:
        "AUTOMATIC_HASH_BOUND_LOCAL_BRANCHES_V1",
      lenses: assignments.map((assignment, index) => ({
        judgeId: assignment.judgeId,
        lensId: assignment.lensId,
        promptSha256: prompts[index]?.sha256 ?? "",
        retryCompositePromptSha256: sha256(
          `${prompts[index]?.prompt ?? ""}\n\n${VALIDATION_RETRY_INSTRUCTION}`,
        ),
        assignmentSha256: sha256(stableJson(assignment)),
      })),
    },
    expectedMaximumInput: {
      brycePrimaryAudioSeconds:
        totalSeconds * PRIMARY_BRYCE_JUDGE_CALLS,
      bryceMaximumAudioSecondsWithAllRetries:
        totalSeconds * MAXIMUM_BRYCE_JUDGE_CALLS,
      conditionalVoiceBranchPrimaryAudioSeconds:
        voiceBranchPrimarySeconds,
      conditionalVoiceBranchMaximumAudioSecondsWithAllRetries:
        voiceBranchPrimarySeconds *
        (CONDITIONAL_BRANCH_MAXIMUM_CALLS /
          CONDITIONAL_BRANCH_PRIMARY_CALLS),
      conditionalTuningBranchPrimaryAudioSeconds:
        tuningBranchPrimarySeconds,
      conditionalTuningBranchMaximumAudioSecondsWithAllRetries:
        tuningBranchPrimarySeconds *
        (CONDITIONAL_BRANCH_MAXIMUM_CALLS /
          CONDITIONAL_BRANCH_PRIMARY_CALLS),
      conditionalWorstCaseBranch: "TUNING_FOUR_WAY",
      conditionalGeneratedAudioDurationCeiling: {
        basis:
          "frozen_corrected_bryce_excerpt_duration",
        maximumGeneratedToSourceRatio:
          CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO,
        correctedSourceAudioSeconds: correctedSeconds,
        maximumGeneratedSecondsPerCandidate,
        enforcedByRuntimeCheck:
          "CONDITIONAL_DURATION_LIMIT",
        enforcedBeforeConditionalApi: true,
      },
      theoreticalAllJudgeSlotsAudioSeconds:
        totalSeconds * MAXIMUM_BRYCE_JUDGE_CALLS +
        worstBranchPrimarySeconds *
          (CONDITIONAL_BRANCH_MAXIMUM_CALLS /
            CONDITIONAL_BRANCH_PRIMARY_CALLS),
      executableEnvelopeAudioSeconds,
      executableEnvelopeAudioTokens,
      executableEnvelopeLimitedByHardBudget: true,
      executableEnvelopeDerivation:
        `After two zero-cost metadata preflights, the implemented workflow permits at most ${String(
          maximumExecutableJudgeRequests,
        )} model requests (${String(
          maximumExecutableJudgeRequests +
            METADATA_PREFLIGHT_CALLS,
        )} total external requests, with one request of headroom under the 17-request hard cap). Reserving USD ${maximumExecutableTextCostUsd.toFixed(
          6,
        )} for ${String(
          maximumExecutableTextInputTokens,
        )} estimated text-input tokens and ${String(
          maximumExecutableTextOutputTokens,
        )} maximum text-output tokens leaves a modeled ${String(
          executableEnvelopeAudioTokens,
        )}-audio-token / ${executableEnvelopeAudioSeconds.toFixed(
          2,
        )}-second envelope at the non-official 1,000-audio-tokens/minute assumption. Every actual dispatch still uses the stricter provider-bounded exposure and authoritative usage.cost settlement.`,
      maximumTextInputTokensAcrossAllJudgeSlots:
        maximumExecutableTextInputTokens,
      maximumTextOutputTokensAcrossAllJudgeSlots:
        maximumExecutableTextOutputTokens,
      maxOutputTokensPerJudgeCall:
        MAX_OUTPUT_TOKENS_PER_JUDGE,
    },
    cost: {
      currency: "USD",
      approvedHardMaximumUsd: HARD_MAX_USD,
      nominalFiveBryceCallsEstimatedUsd,
      bryceAllRetriesEngineeringCeilingUsd,
      nominalOtherVoiceBranchEstimatedUsd,
      nominalTuningBranchEstimatedUsd,
      nominalBrycePlusOtherVoicePathEstimatedUsd:
        nominalBrycePlusOtherVoicePathEstimatedUsd,
      nominalBrycePlusWorstConditionalPathEstimatedUsd:
        nominalBrycePlusWorstConditionalPathEstimatedUsd,
      uncappedTheoreticalAllSlotsUsd,
      estimatedExecutableMaximumUsd: HARD_MAX_USD,
      executableEnvelopeMaximumUsd: HARD_MAX_USD,
      pricing: {
        officialSource:
          "https://openrouter.ai/openai/gpt-audio/api",
        snapshotAsOf: "2026-07-26",
        snapshotSource:
          "OpenRouter Models API, validated before paid inference",
        snapshotUnit: "USD_PER_TOKEN",
        promptUsdPerToken: 0.0000025,
        inputAudioUsdPerToken: 0.000032,
        completionUsdPerToken: 0.00001,
        audioInputUsdPerMillionTokens:
          OFFICIAL_AUDIO_INPUT_USD_PER_MILLION_TOKENS,
        textInputUsdPerMillionTokens:
          OFFICIAL_TEXT_INPUT_USD_PER_MILLION_TOKENS,
        textOutputUsdPerMillionTokens:
          OFFICIAL_TEXT_OUTPUT_USD_PER_MILLION_TOKENS,
      },
      planningAssumption: {
        audioInputTokensPerMinute:
          AUDIO_TOKEN_PLANNING_ASSUMPTION_PER_MINUTE,
        official: false,
        explanation:
          "Conservative engineering ceiling only. OpenRouter publishes per-token pricing but no binding MP3-duration-to-audio-token conversion for this integration.",
      },
      perRequestRemainingBudgetGate: true,
      retriesAndConditionalBranchNotGuaranteedByBudget: true,
      perRequestProviderBoundUsd:
        PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
      providerBoundBasis: {
        contextWindowTokens: MODEL_CONTEXT_WINDOW_TOKENS,
        maximumRequestedTextOutputTokens:
          MAX_OUTPUT_TOKENS_PER_JUDGE,
        allInputTokensChargedAtHighestInputRate: true,
        formalProviderBound: true,
        explanation:
          "Hard pre-dispatch bound: charge the entire 128k context window at the higher OpenRouter audio-input rate, then add the request's separately capped 5k text output at the OpenRouter text-output rate.",
      },
      authoritativeActualCostField: "usage.cost",
    },
    promptHashes: prompts.map(({ judgeId, prompt, sha256: hash }) => ({
      judgeId,
      primarySha256: hash,
      retryCompositeSha256: sha256(
        `${prompt}\n\n${VALIDATION_RETRY_INSTRUCTION}`,
      ),
    })),
    privateAssignmentManifestHashInvariant:
      "SHA256_OF_EXACT_PRETTY_JSON_FILE_BYTES_WITH_TRAILING_LF",
    externalRequestsDuringOfflinePlanCreation: 0,
    preflightPolicy: {
      allMetadataRequestsCountTowardMaximum: true,
      secureInferenceKeyFileRequired: true,
      keyConfiguredLimitMaximumUsd: HARD_MAX_USD,
      minimumRequiredKeyRemainingUsd: HARD_MAX_USD,
      creditsEndpointCalled: false,
      cliMaximumUsd: HARD_MAX_USD,
      authoritativeActualCostField: "usage.cost",
      http402Policy: "FAIL_CLOSED_NO_RETRY",
      runtimePricingMustExactlyMatchPlan: true,
      runtimePlanHashPinnedBeforeFirstPaidInference: true,
    },
  };
  const planCoreHash = sha256(stableJson(planCore));
  const privateManifest: PrivateAiManifest = {
    schemaVersion:
      "tenxpros-phase2c-openrouter-private-ai-manifest-v2",
    evaluationId: planCore.evaluationId,
    provider: "openrouter",
    model: MODEL_ID,
    sourceEvaluationPackageId: EVALUATION_PACKAGE_ID,
    planCoreHash,
    planCoreHashInvariant:
      "SHA256_OF_STABLE_PLAN_CORE_WITHOUT_PRIVATE_MANIFEST_SHA256_OR_PLAN_HASH",
    emittedFileHashInvariant:
      "SHA256_OF_EXACT_PRETTY_JSON_FILE_BYTES_WITH_TRAILING_LF",
    private: true,
    sourcePrivateMapping: frozen.manifest.pairs,
    judgeAssignments: assignments,
    prompts,
    conditionalBranch:
      privateAssignmentMaterial.conditionalBranch,
  };
  const privateAssignmentManifestSha256 = sha256(
    prettyJsonFileBytes(privateManifest),
  );
  const withoutHash: AiEvaluationPlanWithoutHash = {
    ...planCore,
    privateAssignmentManifestSha256,
  };
  const plan: AiEvaluationPlan = {
    ...withoutHash,
    planHash: sha256(stableJson(withoutHash)),
  };
  assertPrivateManifestHashInvariant(plan, privateManifest);
  if (
    (plan.planHash === INVALIDATED_DIRECT_OPENAI_PLAN_HASH ||
      plan.planHash ===
        INVALIDATED_CREDITS_PREFLIGHT_PLAN_HASH ||
      plan.planHash === INVALIDATED_USD8_PLAN_HASH) ||
    plan.provider.id !== "openrouter" ||
    plan.model.id !== MODEL_ID ||
    plan.judges.maximumApiRequests !== 17 ||
    plan.cost.executableEnvelopeMaximumUsd !==
      HARD_MAX_USD ||
    plan.cost.uncappedTheoreticalAllSlotsUsd <=
      HARD_MAX_USD ||
    plan.cost.estimatedExecutableMaximumUsd >
      HARD_MAX_USD ||
    plan.expectedMaximumInput
      .conditionalGeneratedAudioDurationCeiling
      .maximumGeneratedToSourceRatio !==
      CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO ||
    Math.abs(
      plan.expectedMaximumInput
        .conditionalGeneratedAudioDurationCeiling
        .maximumGeneratedSecondsPerCandidate -
        correctedSeconds *
          CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO,
    ) > 1e-9 ||
    Math.abs(
      plan.expectedMaximumInput
        .conditionalVoiceBranchPrimaryAudioSeconds -
        CONDITIONAL_BRANCH_PRIMARY_CALLS *
          (correctedSeconds +
            2 *
              correctedSeconds *
              CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO),
    ) > 1e-9 ||
    Math.abs(
      plan.expectedMaximumInput
        .conditionalTuningBranchPrimaryAudioSeconds -
        CONDITIONAL_BRANCH_PRIMARY_CALLS *
          (baselineSeconds +
            correctedSeconds +
            2 *
              correctedSeconds *
              CONDITIONAL_PIPER_MAXIMUM_GENERATED_DURATION_RATIO),
    ) > 1e-9 ||
    plan.cost.nominalBrycePlusWorstConditionalPathEstimatedUsd >
      plan.cost.approvedHardMaximumUsd ||
    Math.abs(
      plan.cost.perRequestProviderBoundUsd - 4.146,
    ) > 1e-12 ||
    !plan.cost.providerBoundBasis.formalProviderBound
  ) {
    throw new Error("Phase 2C cost/request envelope drifted");
  }
  return {
    plan,
    privateManifest,
    assignments,
    prompts,
  };
}

function runChecked(
  executable: string,
  args: readonly string[],
): string {
  const result = spawnSync(executable, [...args], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${executable} exited ${String(result.status)}`,
    );
  }
  return typeof result.stdout === "string"
    ? result.stdout.trim()
    : "";
}

async function productionBinaryCopySha256(): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    const child = spawn(
      "docker",
      [
        "exec",
        "tenxpros-db",
        "psql",
        "-U",
        "tenxpros",
        "-d",
        "tenxpros",
        "-q",
        "-c",
        PRODUCTION_BINARY_COPY_SQL,
      ],
      {
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    child.stdout.on("data", (chunk: Buffer) => hash.update(chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Production binary snapshot failed (${String(code)})`,
          ),
        );
        return;
      }
      resolvePromise(hash.digest("hex"));
    });
  });
}

async function productionAudioSnapshot(): Promise<ProductionAudioSnapshot> {
  const summary = runChecked("docker", [
    "exec",
    "tenxpros-db",
    "psql",
    "-U",
    "tenxpros",
    "-d",
    "tenxpros",
    "-tA",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    PRODUCTION_SNAPSHOT_SQL,
  ]);
  const parsed = JSON.parse(summary) as Omit<
    ProductionAudioSnapshot,
    "binaryCopySha256"
  >;
  return {
    ...parsed,
    binaryCopySha256: await productionBinaryCopySha256(),
  };
}

function assertExpectedProductionSnapshot(
  snapshot: ProductionAudioSnapshot,
): void {
  if (
    snapshot.count !== 51 ||
    snapshot.bytes !== 271_123_569 ||
    snapshot.rowMd5Aggregate !==
      "307e49138be9ea27192a3bef9f060d18" ||
    snapshot.binaryCopySha256 !==
      "2ba47ce80f134b47f210a00ba6d47639742596df536c396ee3f651757859202d"
  ) {
    throw new Error(
      "Production audio baseline differs from the authorized Phase 2C snapshot",
    );
  }
}

function productionSnapshotsEqual(
  before: ProductionAudioSnapshot,
  after: ProductionAudioSnapshot,
): boolean {
  return (
    before.count === after.count &&
    before.bytes === after.bytes &&
    before.rowMd5Aggregate === after.rowMd5Aggregate &&
    before.binaryCopySha256 === after.binaryCopySha256 &&
    stableJson(before.rows) === stableJson(after.rows)
  );
}

function assertSafeOutputDirectory(path: string): void {
  const relativePath = relative(PHASE2C_ROOT, path);
  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath.includes(sep) ||
    resolve(PHASE2C_ROOT, relativePath) !== path ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/u.test(
      relativePath,
    )
  ) {
    throw new Error(
      `Phase 2C output must be a direct safe child of ${PHASE2C_ROOT}`,
    );
  }
  const fromPhase2B = relative(PHASE2B_PACKAGE, path);
  if (
    !fromPhase2B.startsWith("..") ||
    fromPhase2B === ""
  ) {
    throw new Error(
      "Phase 2C output may never be inside the frozen Phase 2B package",
    );
  }
}

export function createLedgerEntry(
  input: Omit<
    LedgerEntryBase,
    "schemaVersion" | "sequence" | "previousHash"
  > & {
    sequence: number;
    previousHash: string;
  },
): LedgerEntry {
  if (
    !Number.isInteger(input.sequence) ||
    input.sequence < 1 ||
    !/^[a-f0-9]{64}$/u.test(input.previousHash) ||
    !/^[a-f0-9]{64}$/u.test(input.planHash)
  ) {
    throw new Error("Invalid ledger entry identity");
  }
  const base: LedgerEntryBase = {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    sequence: input.sequence,
    timestamp: input.timestamp,
    previousHash: input.previousHash,
    event: input.event,
    planHash: input.planHash,
    data: input.data,
  };
  return {
    ...base,
    entryHash: sha256(stableJson(base)),
  };
}

export function verifyLedgerEntries(
  entries: readonly LedgerEntry[],
  expectedPlanHash: string,
): void {
  let previousHash = LEDGER_GENESIS_HASH;
  entries.forEach((entry, index) => {
    const { entryHash, ...base } = entry;
    if (
      entry.schemaVersion !== LEDGER_SCHEMA_VERSION ||
      entry.sequence !== index + 1 ||
      entry.previousHash !== previousHash ||
      entry.planHash !== expectedPlanHash ||
      entry.entryHash !== sha256(stableJson(base))
    ) {
      throw new Error(
        `Ledger hash-chain verification failed at entry ${String(
          index + 1,
        )}`,
      );
    }
    previousHash = entryHash;
  });
}

async function readLedger(path: string): Promise<LedgerEntry[]> {
  if (!(await pathExists(path))) return [];
  const raw = await readFile(path, "utf8");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line) as LedgerEntry;
    } catch {
      throw new Error(
        `Ledger contains invalid JSON at line ${String(index + 1)}`,
      );
    }
  });
}

async function appendLedger(
  path: string,
  planHash: string,
  event: string,
  data: Readonly<Record<string, unknown>>,
  now: () => string,
): Promise<LedgerEntry> {
  const entries = await readLedger(path);
  verifyLedgerEntries(entries, planHash);
  const previous = entries.at(-1);
  const entry = createLedgerEntry({
    sequence: entries.length + 1,
    timestamp: now(),
    previousHash:
      previous?.entryHash ?? LEDGER_GENESIS_HASH,
    event,
    planHash,
    data,
  });
  const serialized = `${JSON.stringify(entry)}\n`;
  const normalized = serialized.toLowerCase();
  if (
    normalized.includes("authorization") ||
    normalized.includes("bearer ") ||
    normalized.includes("input_audio") ||
    normalized.includes("base64")
  ) {
    throw new Error(
      "Ledger entry contains a prohibited secret/audio-payload marker",
    );
  }
  await appendFile(path, serialized, {
    encoding: "utf8",
    flag: "a",
    mode: 0o600,
  });
  const handle = await open(path, "r");
  await handle.sync();
  await handle.close();
  return entry;
}

export interface PriorPaidRunRecoverySnapshot {
  previousPlanHash: typeof PRIOR_PAID_PLAN_HASH;
  previousLedgerTerminalHash: string;
  previousLedgerSha256: string;
  previousLockSha256: string;
  actualCostUsd: typeof PRIOR_PAID_ACTUAL_COST_USD;
  externalRequests: typeof PRIOR_PAID_EXTERNAL_REQUESTS;
  uncertainCostUsd: 0;
  rejectedResponses: readonly PriorRejectedResponseEvidence[];
}

export async function loadPriorPaidRunRecoverySnapshot(
  input: {
    priorRunDirectory?: string;
    phaseRootForTest?: string;
  } = {},
): Promise<PriorPaidRunRecoverySnapshot> {
  const priorRunDirectory = resolve(
    input.priorRunDirectory ?? DEFAULT_OUTPUT,
  );
  const phaseRoot = resolve(
    input.phaseRootForTest ?? PHASE2C_ROOT,
  );
  const planPath = resolve(
    priorRunDirectory,
    "ai-evaluation-plan.json",
  );
  const ledgerPath = resolve(
    priorRunDirectory,
    "ai-evaluation-ledger.jsonl",
  );
  const lockPath = resolve(
    phaseRoot,
    TASK_WIDE_PAID_LOCK_FILENAME,
  );
  const planValue = JSON.parse(
    await readFile(planPath, "utf8"),
  ) as unknown;
  if (
    !isRecord(planValue) ||
    planValue.planHash !== PRIOR_PAID_PLAN_HASH
  ) {
    throw new Error(
      "Prior paid plan is missing or does not match the authorized recovery source",
    );
  }
  const ledger = await readLedger(ledgerPath);
  verifyLedgerEntries(ledger, PRIOR_PAID_PLAN_HASH);
  const terminal = ledger.at(-1);
  if (!terminal) {
    throw new Error("Prior paid ledger is empty");
  }
  const accounting = paidAccountingFromLedger(ledger);
  if (
    accounting.externalRequestCount !==
      PRIOR_PAID_EXTERNAL_REQUESTS ||
    Math.abs(
      accounting.knownActualCostUsd -
        PRIOR_PAID_ACTUAL_COST_USD,
    ) > 1e-9 ||
    accounting.uncertainMaximumExposureUsd !== 0
  ) {
    throw new Error(
      "Prior paid ledger does not match the owner-authorized 12-request USD 3.54151 zero-uncertain baseline",
    );
  }
  const rejectedResults = ledger.filter(
    (entry) =>
      entry.event === "EXTERNAL_REQUEST_RESULT" &&
      entry.data.requestKind === "JUDGE" &&
      entry.data.status === "REJECTED",
  );
  if (rejectedResults.length !== 10) {
    throw new Error(
      "Prior paid ledger must contain exactly ten rejected judge results",
    );
  }
  const rejectedResponses: PriorRejectedResponseEvidence[] =
    [];
  for (const entry of rejectedResults) {
    const requestIndex = entry.data.requestIndex;
    const perspectiveId = entry.data.judgeId;
    const attempt = entry.data.attempt;
    const responseSha256 = entry.data.responseSha256;
    const originalResponseId =
      entry.data.openRouterRequestId;
    if (
      typeof requestIndex !== "number" ||
      !Number.isInteger(requestIndex) ||
      !RECOVERY_PERSPECTIVE_IDS.includes(
        perspectiveId as ResponseRecoveryPerspectiveId,
      ) ||
      (attempt !== 1 && attempt !== 2) ||
      typeof responseSha256 !== "string" ||
      typeof originalResponseId !== "string" ||
      !isRecord(entry.data.usage) ||
      typeof entry.data.usage.openRouterCostUsd !==
        "number"
    ) {
      throw new Error(
        "Prior rejected ledger result has invalid recovery identity",
      );
    }
    assertExactSha256(
      responseSha256,
      "Prior response ledger hash",
    );
    const responseRecordPath = resolve(
      priorRunDirectory,
      "private",
      "api-records",
      `${String(requestIndex).padStart(
        2,
        "0",
      )}-${perspectiveId}-attempt-${String(
        attempt,
      )}-response.json`,
    );
    const responseRecord = JSON.parse(
      await readFile(responseRecordPath, "utf8"),
    ) as unknown;
    if (
      !isRecord(responseRecord) ||
      responseRecord.requestIndex !== requestIndex ||
      responseRecord.judgeId !== perspectiveId ||
      responseRecord.attempt !== attempt ||
      responseRecord.responseSha256 !== responseSha256 ||
      responseRecord.openRouterRequestId !==
        originalResponseId ||
      responseRecord.httpStatus !== 200 ||
      responseRecord.ok !== true ||
      responseRecord.rawResponseStored !== false ||
      stableJson(responseRecord.usage) !==
        stableJson(entry.data.usage)
    ) {
      throw new Error(
        "Prior private response metadata does not match its immutable ledger result",
      );
    }
    rejectedResponses.push({
      requestIndex,
      perspectiveId:
        perspectiveId as ResponseRecoveryPerspectiveId,
      attempt,
      originalResponseId,
      responseSha256,
      ledgerStatus: "REJECTED",
      httpStatus: 200,
      rawResponseStored: false,
      bodyHashVerification:
        "UNVERIFIED_BYTES_ABSENT",
      usageCostUsd:
        entry.data.usage.openRouterCostUsd,
    });
  }
  const lockValue = JSON.parse(
    await readFile(lockPath, "utf8"),
  ) as unknown;
  if (
    !isRecord(lockValue) ||
    lockValue.planHash !== PRIOR_PAID_PLAN_HASH
  ) {
    throw new Error(
      "Prior paid lock does not reference the recovery source plan",
    );
  }
  return {
    previousPlanHash: PRIOR_PAID_PLAN_HASH,
    previousLedgerTerminalHash: terminal.entryHash,
    previousLedgerSha256: await sha256File(ledgerPath),
    previousLockSha256: await sha256File(lockPath),
    actualCostUsd: PRIOR_PAID_ACTUAL_COST_USD,
    externalRequests: PRIOR_PAID_EXTERNAL_REQUESTS,
    uncertainCostUsd: 0,
    rejectedResponses: rejectedResponses.sort(
      (left, right) =>
        left.requestIndex - right.requestIndex,
    ),
  };
}

interface ResponseRecoveryLedgerEntry {
  schemaVersion:
    "tenxpros-phase2c-response-recovery-ledger-v1";
  sequence: number;
  timestamp: string;
  previousHash: string;
  event: string;
  recoveryPlanHash: string;
  data: Readonly<Record<string, unknown>>;
  entryHash: string;
}

async function readResponseRecoveryLedger(
  path: string,
): Promise<ResponseRecoveryLedgerEntry[]> {
  if (!(await pathExists(path))) return [];
  const raw = await readFile(path, "utf8");
  return raw
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as ResponseRecoveryLedgerEntry,
    );
}

function verifyResponseRecoveryLedger(
  entries: readonly ResponseRecoveryLedgerEntry[],
  expectedRecoveryPlanHash: string,
): void {
  let previousHash = LEDGER_GENESIS_HASH;
  entries.forEach((entry, index) => {
    const { entryHash, ...base } = entry;
    if (
      entry.schemaVersion !==
        "tenxpros-phase2c-response-recovery-ledger-v1" ||
      entry.sequence !== index + 1 ||
      entry.previousHash !== previousHash ||
      entry.recoveryPlanHash !==
        expectedRecoveryPlanHash ||
      entryHash !== sha256(stableJson(base))
    ) {
      throw new Error(
        `Response-recovery ledger hash-chain verification failed at entry ${String(
          index + 1,
        )}`,
      );
    }
    previousHash = entryHash;
  });
}

export async function appendResponseRecoveryLedgerEvent(
  path: string,
  recoveryPlanHash: string,
  event: string,
  data: Readonly<Record<string, unknown>>,
  now: () => string,
): Promise<ResponseRecoveryLedgerEntry> {
  assertExactSha256(
    recoveryPlanHash,
    "Recovery ledger plan hash",
  );
  const entries = await readResponseRecoveryLedger(path);
  verifyResponseRecoveryLedger(
    entries,
    recoveryPlanHash,
  );
  const previous = entries.at(-1);
  const base = {
    schemaVersion:
      "tenxpros-phase2c-response-recovery-ledger-v1" as const,
    sequence: entries.length + 1,
    timestamp: now(),
    previousHash:
      previous?.entryHash ?? LEDGER_GENESIS_HASH,
    event,
    recoveryPlanHash,
    data,
  };
  const entry: ResponseRecoveryLedgerEntry = {
    ...base,
    entryHash: sha256(stableJson(base)),
  };
  const serialized = `${JSON.stringify(entry)}\n`;
  if (
    /authorization|bearer |input_audio|base64/iu.test(
      serialized,
    )
  ) {
    throw new Error(
      "Response-recovery ledger contains prohibited secret or audio-payload material",
    );
  }
  await appendFile(path, serialized, {
    encoding: "utf8",
    flag: "a",
    mode: 0o600,
  });
  const handle = await open(path, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
  return entry;
}

interface OfflineRecoveryCompletionVerification {
  recoveryReportSha256: string;
  recoveryLedgerSha256: string;
  recoveryLedgerTerminalHash: string;
}

export async function verifyOfflineRecoveryCompletionForPaidExecution(
  input: {
    recoveryPlan: ResponseRecoveryPlan;
    priorRunDirectory?: string;
  },
): Promise<OfflineRecoveryCompletionVerification> {
  const outputDirectory = resolve(
    input.priorRunDirectory ?? DEFAULT_OUTPUT,
  );
  const recoveryPlanPath = resolve(
    outputDirectory,
    "response-recovery-plan.json",
  );
  const recoveryLedgerPath = resolve(
    outputDirectory,
    "response-recovery-ledger.jsonl",
  );
  const recoveryReportPath = resolve(
    outputDirectory,
    "response-recovery-report.md",
  );
  await Promise.all([
    assertRegularFile(
      recoveryPlanPath,
      "Response-recovery plan",
    ),
    assertRegularFile(
      recoveryLedgerPath,
      "Response-recovery ledger",
    ),
    assertRegularFile(
      recoveryReportPath,
      "Response-recovery report",
    ),
  ]);
  const storedPlan = JSON.parse(
    await readFile(recoveryPlanPath, "utf8"),
  ) as unknown;
  if (
    stableJson(storedPlan) !== stableJson(input.recoveryPlan)
  ) {
    throw new Error(
      "Stored response-recovery plan does not match the paid-execution plan",
    );
  }
  const recoveryReportSha256 = await sha256File(
    recoveryReportPath,
  );
  const entries = await readResponseRecoveryLedger(
    recoveryLedgerPath,
  );
  verifyResponseRecoveryLedger(
    entries,
    input.recoveryPlan.recoveryPlanHash,
  );
  const terminal = entries.at(-1);
  const completion = entries.at(-2);
  if (
    !terminal ||
    terminal.event !==
      "OFFLINE_RECOVERY_REPORT_HASH_VERIFIED" ||
    terminal.data.recoveryReportSha256 !==
      recoveryReportSha256 ||
    terminal.data
      .reportReadAndHashedBeforeVerificationEvent !==
      true ||
    terminal.data.completionEventHash !==
      completion?.entryHash ||
    completion?.event !==
      "OFFLINE_RECOVERY_REPORT_COMPLETED" ||
    (completion.data.recoveryReportSha256 !== undefined &&
      (completion.data.recoveryReportSha256 !==
        recoveryReportSha256 ||
        completion.data
          .reportWrittenAndFsyncedBeforeCompletionEvent !==
          true)) ||
    (completion.data.recoveryReportSha256 === undefined &&
      terminal.data
        .legacyCompletionWithoutReportHash !== true) ||
    terminal.data.recoveredPerspectiveCount !==
      input.recoveryPlan.recoveredPerspectiveCount ||
    terminal.data.missingPerspectiveCount !==
      input.recoveryPlan.missingPerspectiveCount ||
    terminal.data.networkRequestsMade !== 0 ||
    terminal.data.paidRequestsMade !== 0 ||
    terminal.data.safeToConsiderReplacementRequests !== true
  ) {
    throw new Error(
      "Paid recovery execution requires a terminal offline-report hash-verification event whose report hash matches the live report and its immediately preceding completion event",
    );
  }
  return {
    recoveryReportSha256,
    recoveryLedgerSha256: await sha256File(
      recoveryLedgerPath,
    ),
    recoveryLedgerTerminalHash: terminal.entryHash,
  };
}

export async function attestOfflineRecoveryReportCompletion(
  input: {
    recoveryPlan: ResponseRecoveryPlan;
    priorRunDirectory?: string;
    now?: () => string;
  },
): Promise<OfflineRecoveryCompletionVerification> {
  const outputDirectory = resolve(
    input.priorRunDirectory ?? DEFAULT_OUTPUT,
  );
  const recoveryLedgerPath = resolve(
    outputDirectory,
    "response-recovery-ledger.jsonl",
  );
  const recoveryReportPath = resolve(
    outputDirectory,
    "response-recovery-report.md",
  );
  await assertRegularFile(
    recoveryReportPath,
    "Response-recovery report",
  );
  const recoveryReportSha256 = await sha256File(
    recoveryReportPath,
  );
  const entries = await readResponseRecoveryLedger(
    recoveryLedgerPath,
  );
  verifyResponseRecoveryLedger(
    entries,
    input.recoveryPlan.recoveryPlanHash,
  );
  const terminal = entries.at(-1);
  if (
    terminal?.event ===
      "OFFLINE_RECOVERY_REPORT_HASH_VERIFIED" &&
    terminal.data.recoveryReportSha256 ===
      recoveryReportSha256 &&
    terminal.data
      .reportReadAndHashedBeforeVerificationEvent === true
  ) {
    return verifyOfflineRecoveryCompletionForPaidExecution({
      recoveryPlan: input.recoveryPlan,
      priorRunDirectory: outputDirectory,
    });
  }
  const auditedResponses = entries.filter(
    (entry) => entry.event === "OFFLINE_RESPONSE_AUDITED",
  );
  const perspectiveOutcomes = entries.filter((entry) =>
    [
      "INDEPENDENT_RESPONSE_SELECTED",
      "INDEPENDENT_PERSPECTIVE_MISSING",
    ].includes(entry.event),
  );
  const hasExecutionEvent = entries.some(
    (entry) =>
      ![
        "PRIOR_PAID_RUN_VERIFIED",
        "OFFLINE_RESPONSE_AUDITED",
        "INDEPENDENT_RESPONSE_SELECTED",
        "INDEPENDENT_PERSPECTIVE_MISSING",
        "OFFLINE_RECOVERY_REPORT_COMPLETED",
        "OFFLINE_RECOVERY_REPORT_HASH_VERIFIED",
      ].includes(entry.event),
  );
  if (
    auditedResponses.length !== 10 ||
    perspectiveOutcomes.length !== 5 ||
    hasExecutionEvent
  ) {
    throw new Error(
      "Offline report completion may be attested only after the complete offline audit and before any replacement execution",
    );
  }
  const now =
    input.now ?? (() => new Date().toISOString());
  const completion =
    terminal?.event ===
    "OFFLINE_RECOVERY_REPORT_COMPLETED"
      ? terminal
      : await appendResponseRecoveryLedgerEvent(
          recoveryLedgerPath,
          input.recoveryPlan.recoveryPlanHash,
          "OFFLINE_RECOVERY_REPORT_COMPLETED",
          {
            recoveredPerspectiveCount:
              input.recoveryPlan
                .recoveredPerspectiveCount,
            missingPerspectiveCount:
              input.recoveryPlan
                .missingPerspectiveCount,
            networkRequestsMade: 0,
            paidRequestsMade: 0,
            safeToConsiderReplacementRequests: true,
            recoveryReportSha256,
            reportWrittenAndFsyncedBeforeCompletionEvent:
              true,
          },
          now,
        );
  await appendResponseRecoveryLedgerEvent(
    recoveryLedgerPath,
    input.recoveryPlan.recoveryPlanHash,
    "OFFLINE_RECOVERY_REPORT_HASH_VERIFIED",
    {
      recoveredPerspectiveCount:
        input.recoveryPlan.recoveredPerspectiveCount,
      missingPerspectiveCount:
        input.recoveryPlan.missingPerspectiveCount,
      networkRequestsMade: 0,
      paidRequestsMade: 0,
      safeToConsiderReplacementRequests: true,
      recoveryReportSha256,
      completionEventHash: completion.entryHash,
      legacyCompletionWithoutReportHash:
        completion.data.recoveryReportSha256 === undefined,
      reportReadAndHashedBeforeVerificationEvent: true,
    },
    now,
  );
  return verifyOfflineRecoveryCompletionForPaidExecution({
    recoveryPlan: input.recoveryPlan,
    priorRunDirectory: outputDirectory,
  });
}

type RecoveryExternalRequestKind =
  | "KEY_PREFLIGHT"
  | "MODELS_PREFLIGHT"
  | "JUDGE";
type RecoveryExternalRequestStatus =
  | "ACCEPTED"
  | "REJECTED_BILLED"
  | "FAILED_NOT_BILLED"
  | "UNCERTAIN_PAID";
type RecoveryJudgeRequestMode =
  | "PRIMARY_STRICT_JSON_SCHEMA"
  | "UNBILLED_FORMAT_FALLBACK"
  | "PRIMARY_FORCED_TOOL_CALL"
  | "UNBILLED_PLAIN_JSON_FALLBACK";

interface RecoveryRequestAccounting {
  newExternalRequestsUsed: number;
  newKnownActualCostUsd: number;
  newUncertainMaximumCostUsd: number;
  requestHistory: {
    requestIndex: number;
    perspectiveId: ResponseRecoveryPerspectiveId;
    mode: RecoveryJudgeRequestMode;
    status: RecoveryExternalRequestStatus;
    issueCodes: readonly string[];
  }[];
}

function recoveryRequestAccounting(
  entries: readonly ResponseRecoveryLedgerEntry[],
): RecoveryRequestAccounting {
  const reservations = new Map<
    number,
    ResponseRecoveryLedgerEntry
  >();
  const results = new Map<
    number,
    ResponseRecoveryLedgerEntry
  >();
  for (const entry of entries) {
    const requestIndex = entry.data.requestIndex;
    if (
      typeof requestIndex !== "number" ||
      !Number.isInteger(requestIndex)
    ) {
      continue;
    }
    if (entry.event === "RECOVERY_EXTERNAL_REQUEST_RESERVED") {
      if (reservations.has(requestIndex)) {
        throw new Error(
          "Recovery ledger contains a duplicate request reservation",
        );
      }
      reservations.set(requestIndex, entry);
    } else if (
      entry.event === "RECOVERY_EXTERNAL_REQUEST_RESULT"
    ) {
      if (results.has(requestIndex)) {
        throw new Error(
          "Recovery ledger contains a duplicate request result",
        );
      }
      results.set(requestIndex, entry);
    }
  }
  let newKnownActualCostUsd = 0;
  let newUncertainMaximumCostUsd = 0;
  const requestHistory: RecoveryRequestAccounting["requestHistory"] =
    [];
  const orderedReservations = [...reservations.entries()].sort(
    ([left], [right]) => left - right,
  );
  orderedReservations.forEach(
    ([requestIndex], index) => {
      if (
        requestIndex !==
        PRIOR_PAID_EXTERNAL_REQUESTS + index + 1
      ) {
        throw new Error(
          "Recovery request indexes must be contiguous after the twelve prior requests",
        );
      }
    },
  );
  for (const [requestIndex, reservation] of orderedReservations) {
    if (
      requestIndex <= PRIOR_PAID_EXTERNAL_REQUESTS ||
      requestIndex >
        RECOVERY_MAXIMUM_EXTERNAL_REQUESTS
    ) {
      throw new Error(
        "Recovery request index is outside the append-only continuation range",
      );
    }
    const result = results.get(requestIndex);
    const maximumPossibleCostUsd =
      reservation.data.maximumPossibleCostUsd;
    if (
      typeof maximumPossibleCostUsd !== "number" ||
      !Number.isFinite(maximumPossibleCostUsd) ||
      maximumPossibleCostUsd < 0
    ) {
      throw new Error(
        "Recovery reservation has invalid maximum cost",
      );
    }
    const requestKind = reservation.data.requestKind;
    const perspectiveId =
      reservation.data.perspectiveId;
    const mode = reservation.data.mode;
    if (
      requestKind === "JUDGE" &&
      (!RECOVERY_PERSPECTIVE_IDS.includes(
        perspectiveId as ResponseRecoveryPerspectiveId,
      ) ||
        (mode !== "PRIMARY_STRICT_JSON_SCHEMA" &&
          mode !== "UNBILLED_FORMAT_FALLBACK" &&
          mode !== "PRIMARY_FORCED_TOOL_CALL" &&
          mode !==
            "UNBILLED_PLAIN_JSON_FALLBACK"))
    ) {
      throw new Error(
        "Recovery judge reservation identity is invalid",
      );
    }
    if (!result) {
      newUncertainMaximumCostUsd +=
        maximumPossibleCostUsd;
      if (requestKind === "JUDGE") {
        requestHistory.push({
          requestIndex,
          perspectiveId:
            perspectiveId as ResponseRecoveryPerspectiveId,
          mode: mode as RecoveryJudgeRequestMode,
          status: "UNCERTAIN_PAID",
          issueCodes: ["UNSETTLED_RESERVATION"],
        });
      }
      continue;
    }
    const status = result.data.status;
    const actualCostUsd = result.data.actualCostUsd;
    const usage = result.data.usage;
    const usageCostUsd =
      isRecord(usage) &&
      typeof usage.openRouterCostUsd === "number"
        ? usage.openRouterCostUsd
        : null;
    if (
      ![
        "ACCEPTED",
        "REJECTED_BILLED",
        "FAILED_NOT_BILLED",
        "UNCERTAIN_PAID",
      ].includes(String(status)) ||
      typeof actualCostUsd !== "number" ||
      !Number.isFinite(actualCostUsd) ||
      actualCostUsd < 0
    ) {
      throw new Error(
        "Recovery result has invalid status or actual cost",
      );
    }
    if (
      result.data.requestKind !== requestKind ||
      result.data.perspectiveId !== perspectiveId ||
      result.data.mode !== mode ||
      result.data.maximumPossibleCostUsd !==
        maximumPossibleCostUsd
    ) {
      throw new Error(
        "Recovery result identity or reserved cost does not match its reservation",
      );
    }
    const metadataInvariantInvalid =
      requestKind !== "JUDGE" &&
      ((status !== "ACCEPTED" &&
        status !== "FAILED_NOT_BILLED") ||
        actualCostUsd !== 0 ||
        usage !== null);
    const judgeInvariantInvalid =
      requestKind === "JUDGE" &&
      (((status === "ACCEPTED" ||
        status === "REJECTED_BILLED") &&
        (usageCostUsd === null ||
          Math.abs(usageCostUsd - actualCostUsd) >
            1e-9)) ||
        (status === "FAILED_NOT_BILLED" &&
          (actualCostUsd !== 0 ||
            (usageCostUsd !== null &&
              usageCostUsd !== 0))) ||
        (status === "UNCERTAIN_PAID" &&
          (actualCostUsd !== 0 || usage !== null)));
    if (metadataInvariantInvalid || judgeInvariantInvalid) {
      throw new Error(
        "Recovery result status, usage.cost, and actual cost are inconsistent",
      );
    }
    if (status === "UNCERTAIN_PAID") {
      newUncertainMaximumCostUsd +=
        maximumPossibleCostUsd;
    } else {
      newKnownActualCostUsd += actualCostUsd;
    }
    if (requestKind === "JUDGE") {
      requestHistory.push({
        requestIndex,
        perspectiveId:
          perspectiveId as ResponseRecoveryPerspectiveId,
        mode: mode as RecoveryJudgeRequestMode,
        status:
          status as RecoveryExternalRequestStatus,
        issueCodes: Array.isArray(
          result.data.issueCodes,
        )
          ? result.data.issueCodes.map(String)
          : [],
      });
    }
  }
  for (const requestIndex of results.keys()) {
    if (!reservations.has(requestIndex)) {
      throw new Error(
        "Recovery result has no matching reservation",
      );
    }
  }
  return {
    newExternalRequestsUsed: reservations.size,
    newKnownActualCostUsd: ceilingUsd(
      newKnownActualCostUsd,
    ),
    newUncertainMaximumCostUsd: ceilingUsd(
      newUncertainMaximumCostUsd,
    ),
    requestHistory: requestHistory.sort(
      (left, right) =>
        left.requestIndex - right.requestIndex,
    ),
  };
}

async function reserveRecoveryExternalRequest(input: {
  recoveryLedgerPath: string;
  recoveryPlan: ResponseRecoveryPlan;
  requestKind: RecoveryExternalRequestKind;
  maximumPossibleCostUsd: number;
  perspectiveId?: ResponseRecoveryPerspectiveId;
  mode?: RecoveryJudgeRequestMode;
  fallbackOfRequestIndex?: number;
  now: () => string;
}): Promise<number> {
  const entries = await readResponseRecoveryLedger(
    input.recoveryLedgerPath,
  );
  verifyResponseRecoveryLedger(
    entries,
    input.recoveryPlan.recoveryPlanHash,
  );
  const accounting = recoveryRequestAccounting(entries);
  const unsettledReservation = entries.some(
    (entry) =>
      entry.event ===
        "RECOVERY_EXTERNAL_REQUEST_RESERVED" &&
      !entries.some(
        (candidate) =>
          candidate.event ===
            "RECOVERY_EXTERNAL_REQUEST_RESULT" &&
          candidate.data.requestIndex ===
            entry.data.requestIndex,
      ),
  );
  if (unsettledReservation) {
    throw new Error(
      "An unsettled recovery reservation is treated as uncertain paid; no further request may be dispatched",
    );
  }
  if (accounting.newUncertainMaximumCostUsd > 0) {
    throw new Error(
      "A prior recovery request is UNCERTAIN_PAID; no later request may be dispatched",
    );
  }
  if (
    input.requestKind === "JUDGE"
      ? !input.perspectiveId || !input.mode
      : input.perspectiveId !== undefined ||
        input.mode !== undefined ||
        input.fallbackOfRequestIndex !== undefined
  ) {
    throw new Error(
      "Recovery request reservation identity is invalid",
    );
  }
  if (input.requestKind === "JUDGE") {
    if (
      input.mode !== "PRIMARY_FORCED_TOOL_CALL" &&
      input.mode !==
        "UNBILLED_PLAIN_JSON_FALLBACK"
    ) {
      throw new Error(
        "Legacy response_format recovery modes are superseded and disabled",
      );
    }
    const unsupportedCapabilityEvent = entries.find(
      (entry) =>
        entry.event ===
          "RECOVERY_FORCED_TOOL_CAPABILITY_DETERMINED" &&
        entry.data.forcedToolCapability ===
          "UNSUPPORTED" &&
        typeof entry.data.modelsPreflightRequestIndex ===
          "number",
    );
    const unsupportedPreflightRequestIndex =
      unsupportedCapabilityEvent?.data
        .modelsPreflightRequestIndex as number | undefined;
    assertRecoveryReplacementDispatchAllowed({
      recoveryPlan: input.recoveryPlan,
      perspectiveId: input.perspectiveId!,
      mode: input.mode!,
      priorNewRequests: accounting.requestHistory,
      strictFormatUnsupportedPreflightRequestIndex:
        unsupportedPreflightRequestIndex,
    });
    const globalToolUnsupported =
      accounting.requestHistory.find(
        (request) =>
          request.mode ===
            "PRIMARY_FORCED_TOOL_CALL" &&
          request.status ===
            "FAILED_NOT_BILLED" &&
          request.issueCodes.includes(
            "FORCED_TOOL_CALL_UNSUPPORTED",
          ),
      );
    const exactUnsupportedEvidenceRequestIndex =
      globalToolUnsupported?.requestIndex ??
      unsupportedPreflightRequestIndex;
    if (
      input.mode ===
        "UNBILLED_PLAIN_JSON_FALLBACK"
        ? exactUnsupportedEvidenceRequestIndex ===
            undefined ||
          input.fallbackOfRequestIndex !==
            exactUnsupportedEvidenceRequestIndex
        : input.fallbackOfRequestIndex !== undefined
    ) {
      throw new Error(
        "Recovery fallback must reference the exact task-wide confirmed-unbilled forced-tool rejection",
      );
    }
  }
  assertNextRecoveryRequestFits({
    newExternalRequestsUsed:
      accounting.newExternalRequestsUsed,
    newKnownActualCostUsd:
      accounting.newKnownActualCostUsd,
    newUncertainMaximumCostUsd:
      accounting.newUncertainMaximumCostUsd,
    nextMaximumPossibleCostUsd:
      input.maximumPossibleCostUsd,
  });
  const requestIndex =
    PRIOR_PAID_EXTERNAL_REQUESTS +
    accounting.newExternalRequestsUsed +
    1;
  await appendResponseRecoveryLedgerEvent(
    input.recoveryLedgerPath,
    input.recoveryPlan.recoveryPlanHash,
    "RECOVERY_EXTERNAL_REQUEST_RESERVED",
    {
      requestIndex,
      requestKind: input.requestKind,
      perspectiveId: input.perspectiveId ?? null,
      mode: input.mode ?? null,
      fallbackOfRequestIndex:
        input.fallbackOfRequestIndex ?? null,
      maximumPossibleCostUsd:
        input.maximumPossibleCostUsd,
      cumulativeExternalRequestsIncludingPrior:
        requestIndex,
      priorActualCostUsd:
        PRIOR_PAID_ACTUAL_COST_USD,
    },
    input.now,
  );
  return requestIndex;
}

async function settleRecoveryExternalRequest(input: {
  recoveryLedgerPath: string;
  recoveryPlan: ResponseRecoveryPlan;
  requestIndex: number;
  status: RecoveryExternalRequestStatus;
  actualCostUsd: number;
  issueCodes: readonly string[];
  usage?: UsageCost | null;
  openRouterRequestId?: string | null;
  responseSha256?: string | null;
  latencyMs: number;
  now: () => string;
}): Promise<void> {
  const entries = await readResponseRecoveryLedger(
    input.recoveryLedgerPath,
  );
  verifyResponseRecoveryLedger(
    entries,
    input.recoveryPlan.recoveryPlanHash,
  );
  const reservation = entries.find(
    (entry) =>
      entry.event ===
        "RECOVERY_EXTERNAL_REQUEST_RESERVED" &&
      entry.data.requestIndex === input.requestIndex,
  );
  if (
    !reservation ||
    entries.some(
      (entry) =>
        entry.event ===
          "RECOVERY_EXTERNAL_REQUEST_RESULT" &&
        entry.data.requestIndex === input.requestIndex,
    )
  ) {
    throw new Error(
      "Recovery request settlement is missing or duplicated",
    );
  }
  const maximumPossibleCostUsd =
    reservation.data.maximumPossibleCostUsd;
  const requestKind = reservation.data.requestKind;
  const usageCostUsd =
    input.usage?.openRouterCostUsd ?? null;
  const metadataInvariantInvalid =
    requestKind !== "JUDGE" &&
    ((input.status !== "ACCEPTED" &&
      input.status !== "FAILED_NOT_BILLED") ||
      input.actualCostUsd !== 0 ||
      (input.usage !== undefined &&
        input.usage !== null));
  const judgeInvariantInvalid =
    requestKind === "JUDGE" &&
    (((input.status === "ACCEPTED" ||
      input.status === "REJECTED_BILLED") &&
      (usageCostUsd === null ||
        Math.abs(
          usageCostUsd - input.actualCostUsd,
        ) > 1e-9)) ||
      (input.status === "FAILED_NOT_BILLED" &&
        (input.actualCostUsd !== 0 ||
          (usageCostUsd !== null &&
            usageCostUsd !== 0))) ||
      (input.status === "UNCERTAIN_PAID" &&
        (input.actualCostUsd !== 0 ||
          (input.usage !== undefined &&
            input.usage !== null))));
  if (
    typeof maximumPossibleCostUsd !== "number" ||
    input.actualCostUsd < 0 ||
    metadataInvariantInvalid ||
    judgeInvariantInvalid
  ) {
    throw new Error(
      "Recovery request settlement must bind billed status to authoritative usage.cost and unbilled/uncertain status to zero cost",
    );
  }
  const authoritativeBoundExceeded =
    input.actualCostUsd >
    maximumPossibleCostUsd + 1e-12;
  await appendResponseRecoveryLedgerEvent(
    input.recoveryLedgerPath,
    input.recoveryPlan.recoveryPlanHash,
    "RECOVERY_EXTERNAL_REQUEST_RESULT",
    {
      requestIndex: input.requestIndex,
      requestKind: reservation.data.requestKind,
      perspectiveId:
        reservation.data.perspectiveId,
      mode: reservation.data.mode,
      status: input.status,
      maximumPossibleCostUsd,
      actualCostUsd: input.actualCostUsd,
      usage: input.usage ?? null,
      openRouterRequestId:
        input.openRouterRequestId ?? null,
      responseSha256: input.responseSha256 ?? null,
      latencyMs: input.latencyMs,
      issueCodes: authoritativeBoundExceeded
        ? [
            ...input.issueCodes,
            "AUTHORITATIVE_COST_EXCEEDED_RESERVED_BOUND",
          ]
        : input.issueCodes,
      retryPermitted:
        input.status === "FAILED_NOT_BILLED" &&
        input.issueCodes.includes(
          "FORCED_TOOL_CALL_UNSUPPORTED",
        ),
    },
    input.now,
  );
  const afterSettlement = recoveryRequestAccounting(
    await readResponseRecoveryLedger(
      input.recoveryLedgerPath,
    ),
  );
  const capAccountedAfterSettlement =
    PRIOR_PAID_ACTUAL_COST_USD +
    afterSettlement.newKnownActualCostUsd +
    afterSettlement.newUncertainMaximumCostUsd;
  if (
    authoritativeBoundExceeded ||
    capAccountedAfterSettlement >
      RECOVERY_MAXIMUM_USD + 1e-12
  ) {
    throw new Error(
      "Authoritative recovery cost exceeded its reserved bound or cumulative USD 10 cap; result was ledgered and execution is stopped fail-closed",
    );
  }
}

export async function writeOfflineResponseRecoveryArtifacts(
  input: {
    priorSnapshot: PriorPaidRunRecoverySnapshot;
    attempts: readonly OfflineResponseRecoveryAttempt[];
    correctedResponseSchemaSha256: string;
    priorRunDirectory?: string;
    phaseRootForTest?: string;
    now?: () => string;
  },
): Promise<OfflineResponseRecoveryArtifacts> {
  if (input.attempts.length !== 10) {
    throw new Error(
      "Offline recovery must audit all ten prior paid responses before any network request",
    );
  }
  const expectedByRequest = new Map(
    input.priorSnapshot.rejectedResponses.map(
      (response) => [response.requestIndex, response],
    ),
  );
  const seen = new Set<number>();
  for (const attempt of input.attempts) {
    const expected = expectedByRequest.get(
      attempt.evidence.requestIndex,
    );
    if (
      !expected ||
      seen.has(attempt.evidence.requestIndex) ||
      stableJson(expected) !==
        stableJson(attempt.evidence)
    ) {
      throw new Error(
        "Offline recovery attempt does not match one unique prior ledger response",
      );
    }
    seen.add(attempt.evidence.requestIndex);
    if (attempt.status === "RECOVERED") {
      if (
        attempt.recoveredResponse === undefined ||
        !attempt.provenance ||
        attempt.provenance.length === 0
      ) {
        throw new Error(
          "A recovered response requires structured output and field-level provenance",
        );
      }
      const recoveredResponseSha256 = sha256(
        stableJson(attempt.recoveredResponse),
      );
      if (
        attempt.recoveredResponseSha256 !== undefined &&
        attempt.recoveredResponseSha256 !==
          recoveredResponseSha256
      ) {
        throw new Error(
          "Recovered response hash does not match its deterministic structured output",
        );
      }
    }
  }
  const selected: {
    perspectiveId: ResponseRecoveryPerspectiveId;
    attempt: 1 | 2;
    requestIndex: number;
    recoveredResponseSha256: string;
  }[] = [];
  for (const perspectiveId of RECOVERY_PERSPECTIVE_IDS) {
    const candidates = input.attempts
      .filter(
        (attempt) =>
          attempt.evidence.perspectiveId === perspectiveId &&
          attempt.status === "RECOVERED",
      )
      .sort(
        (left, right) =>
          left.evidence.attempt -
          right.evidence.attempt,
      );
    const chosen = candidates[0];
    if (chosen?.recoveredResponse !== undefined) {
      selected.push({
        perspectiveId,
        attempt: chosen.evidence.attempt,
        requestIndex: chosen.evidence.requestIndex,
        recoveredResponseSha256: sha256(
          stableJson(chosen.recoveredResponse),
        ),
      });
    }
  }
  const recoveredPerspectiveIds = selected.map(
    (item) => item.perspectiveId,
  );
  const missingPerspectiveIds =
    RECOVERY_PERSPECTIVE_IDS.filter(
      (perspectiveId) =>
        !recoveredPerspectiveIds.includes(perspectiveId),
    );
  const recoveryPlan = buildResponseRecoveryPlan({
    previousPlanHash:
      input.priorSnapshot.previousPlanHash,
    previousLedgerTerminalHash:
      input.priorSnapshot.previousLedgerTerminalHash,
    previousLedgerSha256:
      input.priorSnapshot.previousLedgerSha256,
    previousLockSha256:
      input.priorSnapshot.previousLockSha256,
    rejectedResponses:
      input.priorSnapshot.rejectedResponses,
    correctedResponseSchemaSha256:
      input.correctedResponseSchemaSha256,
    recoveredPerspectiveIds,
    missingPerspectiveIds,
  });
  const outputDirectory = resolve(
    input.priorRunDirectory ?? DEFAULT_OUTPUT,
  );
  const phaseRoot = resolve(
    input.phaseRootForTest ?? PHASE2C_ROOT,
  );
  const priorLedgerPath = resolve(
    outputDirectory,
    "ai-evaluation-ledger.jsonl",
  );
  const priorLockPath = resolve(
    phaseRoot,
    TASK_WIDE_PAID_LOCK_FILENAME,
  );
  if (
    (await sha256File(priorLedgerPath)) !==
      input.priorSnapshot.previousLedgerSha256 ||
    (await sha256File(priorLockPath)) !==
      input.priorSnapshot.previousLockSha256
  ) {
    throw new Error(
      "Prior ledger or paid lock changed before offline recovery artifacts were written",
    );
  }
  const recoveryLedgerPath = resolve(
    outputDirectory,
    "response-recovery-ledger.jsonl",
  );
  const recoveryReportPath = resolve(
    outputDirectory,
    "response-recovery-report.md",
  );
  const recoveredResponsesDirectory = resolve(
    outputDirectory,
    "recovered-ai-judge-responses",
  );
  const recoveryPlanPath = resolve(
    outputDirectory,
    "response-recovery-plan.json",
  );
  if (
    (await pathExists(recoveryLedgerPath)) ||
    (await pathExists(recoveryReportPath)) ||
    (await pathExists(recoveryPlanPath))
  ) {
    throw new Error(
      "Offline response-recovery artifacts already exist; append new execution events instead of replaying the audit",
    );
  }
  await mkdir(recoveredResponsesDirectory, {
    recursive: false,
    mode: 0o700,
  });
  await writeNewJson(recoveryPlanPath, recoveryPlan);
  const now =
    input.now ?? (() => new Date().toISOString());
  await appendResponseRecoveryLedgerEvent(
    recoveryLedgerPath,
    recoveryPlan.recoveryPlanHash,
    "PRIOR_PAID_RUN_VERIFIED",
    {
      previousPlanHash: PRIOR_PAID_PLAN_HASH,
      previousLedgerSha256:
        input.priorSnapshot.previousLedgerSha256,
      previousLedgerTerminalHash:
        input.priorSnapshot.previousLedgerTerminalHash,
      previousLockSha256:
        input.priorSnapshot.previousLockSha256,
      carriedActualCostUsd:
        PRIOR_PAID_ACTUAL_COST_USD,
      carriedExternalRequests:
        PRIOR_PAID_EXTERNAL_REQUESTS,
      carriedUncertainCostUsd: 0,
      oldLedgerAndLockBytesPreserved: true,
    },
    now,
  );
  for (const attempt of [...input.attempts].sort(
    (left, right) =>
      left.evidence.requestIndex -
      right.evidence.requestIndex,
  )) {
    const recoveredResponseSha256 =
      attempt.recoveredResponse === undefined
        ? null
        : sha256(stableJson(attempt.recoveredResponse));
    if (
      attempt.status === "RECOVERED" &&
      attempt.recoveredResponse !== undefined
    ) {
      await writeNewJson(
        resolve(
          recoveredResponsesDirectory,
          `${String(
            attempt.evidence.requestIndex,
          ).padStart(2, "0")}-${attempt.evidence.perspectiveId}-attempt-${String(
            attempt.evidence.attempt,
          )}.json`,
        ),
        {
          schemaVersion:
            "tenxpros-phase2c-recovered-judge-response-artifact-v1",
          originalResponseId:
            attempt.evidence.originalResponseId,
          originalResponseSha256:
            attempt.evidence.responseSha256,
          recoveredResponseSha256,
          recoveredResponse: attempt.recoveredResponse,
          provenance: attempt.provenance,
          rawProviderResponseStored: false,
        },
      );
    }
    await appendResponseRecoveryLedgerEvent(
      recoveryLedgerPath,
      recoveryPlan.recoveryPlanHash,
      "OFFLINE_RESPONSE_AUDITED",
      {
        requestIndex: attempt.evidence.requestIndex,
        perspectiveId:
          attempt.evidence.perspectiveId,
        attempt: attempt.evidence.attempt,
        originalResponseId:
          attempt.evidence.originalResponseId,
        ledgerResponseSha256:
          attempt.evidence.responseSha256,
        ledgerMetadataHashMatch: true,
        rawResponseStored: false,
        bodyHashVerification:
          "UNVERIFIED_BYTES_ABSENT",
        status: attempt.status,
        issueCodes: attempt.issueCodes,
        recoveredResponseSha256,
        provenanceRecords:
          attempt.provenance?.length ?? 0,
      },
      now,
    );
  }
  for (const perspectiveId of RECOVERY_PERSPECTIVE_IDS) {
    const chosen = selected.find(
      (item) => item.perspectiveId === perspectiveId,
    );
    await appendResponseRecoveryLedgerEvent(
      recoveryLedgerPath,
      recoveryPlan.recoveryPlanHash,
      chosen
        ? "INDEPENDENT_RESPONSE_SELECTED"
        : "INDEPENDENT_PERSPECTIVE_MISSING",
      chosen
        ? {
            ...chosen,
            selectionRule:
              chosen.attempt === 1
                ? "VALID_INITIAL_PREFERRED"
                : "INITIAL_INVALID_RETRY_VALID",
            countedIndependentResponses: 1,
          }
        : {
            perspectiveId,
            countedIndependentResponses: 0,
            replacementPrimaryRequired: true,
          },
      now,
    );
  }
  const attemptLines = [...input.attempts]
    .sort(
      (left, right) =>
        left.evidence.requestIndex -
        right.evidence.requestIndex,
    )
    .map(
      (attempt) =>
        `| ${String(
          attempt.evidence.requestIndex,
        )} | ${attempt.evidence.perspectiveId} | ${String(
          attempt.evidence.attempt,
        )} | ${attempt.status} | MATCH | UNVERIFIED_BYTES_ABSENT | ${attempt.issueCodes.join(
          ", ",
        ) || "none"} |`,
    )
    .join("\n");
  await writeAtomicText(
    recoveryReportPath,
    `# Phase 2C response-recovery report

Status: **OFFLINE RECOVERY COMPLETE — NO NETWORK REQUESTS**

- Prior plan hash: \`${PRIOR_PAID_PLAN_HASH}\`
- Prior ledger SHA-256: \`${input.priorSnapshot.previousLedgerSha256}\`
- Prior lock SHA-256: \`${input.priorSnapshot.previousLockSha256}\`
- Carried actual cost: USD ${PRIOR_PAID_ACTUAL_COST_USD.toFixed(5)}
- Carried external requests: ${String(PRIOR_PAID_EXTERNAL_REQUESTS)}
- Carried uncertain cost: USD 0
- Cumulative caps: USD ${String(RECOVERY_MAXIMUM_USD)} and ${String(RECOVERY_MAXIMUM_EXTERNAL_REQUESTS)} requests
- Ledger ↔ redacted metadata ID/hash/status/usage matches: 10 / 10
- Raw response bodies available: 0 / 10
- Body hash verification: **UNVERIFIED_BYTES_ABSENT**. Ledger and metadata contain matching recorded hashes, but the original bytes were not persisted and therefore cannot be independently re-hashed.
- Independently recovered perspectives: ${String(recoveryPlan.recoveredPerspectiveCount)} / 5
- Missing perspectives: ${recoveryPlan.missingPerspectiveIds.join(", ") || "none"}
- New paid requests made during this offline pass: 0

| Request | Perspective | Attempt | Recovery status | Ledger ↔ metadata | Body hash | Issues |
|---:|---|---:|---|---|---|---|
${attemptLines}

Selection is deterministic: a fully valid initial response is preferred; its retry is used only when the initial response is unusable. Initial and retry are never averaged or counted twice.

The old ledger and paid lock remain byte-for-byte unchanged. No old request was replayed. Any subsequent replacement phase must use exactly one primary request per missing perspective, no billed automatic retry, and must pass the cumulative USD 10 / 24-request admission gate.
`,
  );
  await attestOfflineRecoveryReportCompletion({
    recoveryPlan,
    priorRunDirectory: outputDirectory,
    now,
  });
  if (
    (await sha256File(priorLedgerPath)) !==
      input.priorSnapshot.previousLedgerSha256 ||
    (await sha256File(priorLockPath)) !==
      input.priorSnapshot.previousLockSha256
  ) {
    throw new Error(
      "Prior ledger or paid lock changed during offline recovery artifact creation",
    );
  }
  return {
    recoveryPlan,
    selected,
    outputDirectory,
    recoveryLedgerPath,
    recoveryReportPath,
    recoveredResponsesDirectory,
  };
}

export async function runCurrentOfflineResponseRecoveryAudit(
  input: {
    priorRunDirectory?: string;
    phaseRootForTest?: string;
    now?: () => string;
  } = {},
): Promise<OfflineResponseRecoveryArtifacts> {
  /*
   * This mode is intentionally incapable of network or secret access. It
   * audits only immutable local evidence and must finish its ledger/report
   * before a separate replacement executor may be considered.
   */
  await loadFrozenInput();
  const priorSnapshot =
    await loadPriorPaidRunRecoverySnapshot(input);
  const priorRunDirectory = resolve(
    input.priorRunDirectory ?? DEFAULT_OUTPUT,
  );
  const outputFiles = await listFilesRecursively(
    priorRunDirectory,
  );
  const filenameCandidates = outputFiles.filter((path) =>
    /(?:raw[-_.]?response|response[-_.]?body|parsed[-_.]?(?:output|response)|tool[-_.]?arguments)/iu.test(
      path,
    ),
  );
  const payloadKeyCandidates: string[] = [];
  const responsePayloadKeys = new Set([
    "rawResponse",
    "raw_response",
    "responseBody",
    "response_body",
    "parsedOutput",
    "parsed_output",
    "toolArguments",
    "tool_arguments",
    "tool_calls",
    "choices",
  ]);
  const containsResponsePayload = (
    value: unknown,
  ): boolean => {
    if (Array.isArray(value)) {
      return value.some(containsResponsePayload);
    }
    if (!isRecord(value)) return false;
    return Object.entries(value).some(
      ([key, nested]) =>
        (responsePayloadKeys.has(key) &&
          nested !== null &&
          nested !== false) ||
        containsResponsePayload(nested),
    );
  };
  for (const relativePath of outputFiles.filter((path) =>
    /\.(?:json|jsonl)$/u.test(path),
  )) {
    const raw = await readFile(
      resolve(priorRunDirectory, relativePath),
      "utf8",
    );
    const values = relativePath.endsWith(".jsonl")
      ? raw
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line) as unknown)
      : [JSON.parse(raw) as unknown];
    if (values.some(containsResponsePayload)) {
      payloadKeyCandidates.push(relativePath);
    }
  }
  const rawLikeFiles = [
    ...new Set([
      ...filenameCandidates,
      ...payloadKeyCandidates,
    ]),
  ];
  if (rawLikeFiles.length > 0) {
    throw new Error(
      `Unexpected raw/parsed response candidates exist across the prior output tree (${rawLikeFiles.join(
        ", ",
      )}); route them through the deterministic recovery adapter instead of treating them as absent`,
    );
  }
  const attempts: OfflineResponseRecoveryAttempt[] =
    priorSnapshot.rejectedResponses.map((evidence) => ({
      evidence,
      status: "SOURCE_MISSING",
      issueCodes: ["RAW_RESPONSE_BODY_MISSING"],
    }));
  return writeOfflineResponseRecoveryArtifacts({
    priorSnapshot,
    attempts,
    correctedResponseSchemaSha256: hashAiValue(
      AI_AUDIO_RECOVERED_RESPONSE_JSON_SCHEMA,
    ),
    priorRunDirectory,
    phaseRootForTest: input.phaseRootForTest,
    now: input.now,
  });
}

function recoverySourcePairsFromFrozen(
  frozen: FrozenInput,
): readonly AiBlindSourcePair[] {
  const audioBySampleId = new Map(
    frozen.audio.map((audio) => [audio.sampleId, audio]),
  );
  return frozen.manifest.pairs.map((pair) => ({
    pairId: pair.pairId,
    tableEvaluation:
      pair.pairId === frozen.manifest.tablePairId,
    samples: pair.samples.map((sample) => {
      const audio = audioBySampleId.get(sample.sampleId);
      if (
        !audio ||
        audio.sha256 !== sample.sha256 ||
        audio.durationSeconds !== sample.durationSeconds
      ) {
        throw new Error(
          "Recovery source-pair construction found frozen-input drift",
        );
      }
      return {
        sampleId: sample.sampleId,
        audioSha256: sample.sha256,
        durationSeconds: sample.durationSeconds,
      };
    }) as [
      AiBlindSourcePair["samples"][number],
      AiBlindSourcePair["samples"][number],
    ],
  }));
}

function recoveryAssignmentFromBlind(
  assignment: AiBlindJudgeAssignment,
): AiAudioRecoveryAssignment {
  return {
    assignmentId: assignment.assignmentId,
    judgeId: assignment.judgeId,
    pairs: assignment.pairs.map((pair) => ({
      pairId: pair.neutralPairLabel,
      versionAFileId: pair.clips[0].neutralLabel,
      versionBFileId: pair.clips[1].neutralLabel,
      tableEvaluation: pair.tableEvaluation,
    })),
  };
}

async function recoveryAudioContent(
  frozen: FrozenInput,
  randomization: FreshRecoveryRandomization,
): Promise<readonly Readonly<Record<string, unknown>>[]> {
  const audioBySampleId = new Map(
    frozen.audio.map((audio) => [audio.sampleId, audio]),
  );
  const content: Record<string, unknown>[] = [];
  for (const pair of randomization.assignment.pairs) {
    content.push({
      type: "text",
      text: `Now listen to ${pair.neutralPairLabel}. The first attached clip is Version A; the second is Version B.`,
    });
    for (const clip of pair.clips) {
      const audio = audioBySampleId.get(
        clip.sourceSampleId,
      );
      if (!audio || audio.sha256 !== clip.audioSha256) {
        throw new Error(
          "Fresh recovery assignment does not match frozen audio",
        );
      }
      const bytes = await readFile(audio.path);
      if (sha256(bytes) !== clip.audioSha256) {
        throw new Error(
          "Frozen recovery audio bytes changed before dispatch",
        );
      }
      content.push({
        type: "text",
        text: `Neutral clip label: ${clip.neutralLabel}`,
      });
      content.push({
        type: "input_audio",
        input_audio: {
          data: bytes.toString("base64"),
          format: "mp3",
        },
      });
    }
  }
  return content;
}

const SAFE_RESPONSE_HEADER_NAMES = Object.freeze([
  "content-type",
  "content-length",
  "date",
  "x-request-id",
  "x-openrouter-generation-id",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
] as const);

function safeResponseHeaders(
  headers: FetchResponseLike["headers"],
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    SAFE_RESPONSE_HEADER_NAMES.flatMap((name) => {
      const value = headers?.get(name);
      return value === null ||
        value === undefined ||
        /authorization|bearer |sk-or-/iu.test(value)
        ? []
        : [[name, value] as const];
    }),
  );
}

function redactInputAudioDataForPersistence(
  value: unknown,
): { value: unknown; redactionCount: number } {
  if (Array.isArray(value)) {
    const children = value.map(
      redactInputAudioDataForPersistence,
    );
    return {
      value: children.map((child) => child.value),
      redactionCount: children.reduce(
        (sum, child) => sum + child.redactionCount,
        0,
      ),
    };
  }
  if (!isRecord(value)) {
    return { value, redactionCount: 0 };
  }
  let redactionCount = 0;
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key === "input_audio" && isRecord(nested)) {
      const redactedAudio: Record<string, unknown> = {};
      for (const [audioKey, audioValue] of Object.entries(
        nested,
      )) {
        if (
          audioKey === "data" &&
          typeof audioValue === "string"
        ) {
          redactedAudio[audioKey] =
            "[REDACTED_INPUT_AUDIO_BASE64]";
          redactionCount += 1;
        } else {
          const child =
            redactInputAudioDataForPersistence(audioValue);
          redactedAudio[audioKey] = child.value;
          redactionCount += child.redactionCount;
        }
      }
      output[key] = redactedAudio;
      continue;
    }
    const child =
      redactInputAudioDataForPersistence(nested);
    output[key] = child.value;
    redactionCount += child.redactionCount;
  }
  return { value: output, redactionCount };
}

function containsUnredactedInputAudioData(
  value: unknown,
): boolean {
  if (Array.isArray(value)) {
    return value.some(containsUnredactedInputAudioData);
  }
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) => {
    if (key === "input_audio" && isRecord(nested)) {
      return (
        typeof nested.data === "string" &&
        nested.data !==
          "[REDACTED_INPUT_AUDIO_BASE64]"
      );
    }
    return containsUnredactedInputAudioData(nested);
  });
}

interface PersistedProviderHttpBody {
  rawBodySha256: string;
  artifactBodySha256: string;
  artifactBody: string;
  rawBodyBytes: number;
  artifactBodyBytes: number;
  exactRawBodyStored: boolean;
  sanitizedArtifactStored: boolean;
  providerMetadataAllowlistApplied: boolean;
  providerMetadataRedactionCount: number;
  inputAudioRedacted: boolean;
  inputAudioRedactionCount: number;
}

async function persistProviderHttpBodyBeforeSemanticParse(input: {
  path: string;
  rawBody: string;
  secret: string;
  persistencePolicy?:
    | "DEFAULT"
    | "CURRENT_KEY_ALLOWLIST";
}): Promise<PersistedProviderHttpBody> {
  const rawBodySha256 = sha256(input.rawBody);
  if (
    input.rawBody.includes(input.secret) ||
    /authorization"\s*:|bearer\s+sk-/iu.test(
      input.rawBody,
    ) ||
    (input.persistencePolicy !==
      "CURRENT_KEY_ALLOWLIST" &&
      /sk-or-v1-/iu.test(input.rawBody))
  ) {
    throw new Error(
      "Provider response contains secret material and cannot be persisted",
    );
  }
  let artifactBody = input.rawBody;
  let redactionCount = 0;
  let providerMetadataRedactionCount = 0;
  const providerMetadataAllowlistApplied =
    input.persistencePolicy ===
    "CURRENT_KEY_ALLOWLIST";
  if (providerMetadataAllowlistApplied) {
    let keyEnvelope: unknown;
    try {
      keyEnvelope = JSON.parse(
        input.rawBody,
      ) as unknown;
    } catch {
      throw new Error(
        "Current-key response cannot be safely parsed for allowlisted persistence",
      );
    }
    if (
      !isRecord(keyEnvelope) ||
      !isRecord(keyEnvelope.data)
    ) {
      throw new Error(
        "Current-key response lacks an allowlistable data object",
      );
    }
    const allowedKeyFields = new Set([
      "usage",
      "limit",
      "limit_remaining",
      "is_management_key",
      "is_provisioning_key",
      "disabled",
      "is_active",
      "expires_at",
    ]);
    const allowlistedData = Object.fromEntries(
      Object.entries(keyEnvelope.data).filter(
        ([key]) => allowedKeyFields.has(key),
      ),
    );
    providerMetadataRedactionCount =
      Object.keys(keyEnvelope.data).length -
      Object.keys(allowlistedData).length;
    artifactBody = JSON.stringify({
      data: allowlistedData,
    });
  } else if (/input_audio/iu.test(input.rawBody)) {
    let parsedForRedaction: unknown;
    try {
      parsedForRedaction = JSON.parse(
        input.rawBody,
      ) as unknown;
    } catch {
      throw new Error(
        "Provider response mentions input_audio but cannot be safely parsed for pre-persistence redaction",
      );
    }
    const redacted =
      redactInputAudioDataForPersistence(
        parsedForRedaction,
      );
    redactionCount = redacted.redactionCount;
    if (
      containsUnredactedInputAudioData(redacted.value)
    ) {
      throw new Error(
        "Provider response input_audio payload could not be proven fully redacted",
      );
    }
    if (redactionCount > 0) {
      artifactBody = JSON.stringify(redacted.value);
    }
  }
  if (
    artifactBody.includes(input.secret) ||
    /authorization|bearer\s+sk-|sk-or-v1-/iu.test(
      artifactBody,
    ) ||
    /"[A-Za-z0-9+/]{1000,}={0,2}"/u.test(
      artifactBody,
    )
  ) {
    throw new Error(
      "Sanitized provider artifact still contains secret or probable base64 payload material",
    );
  }
  const handle = await open(input.path, "wx", 0o600);
  try {
    await handle.writeFile(artifactBody, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  const directoryHandle = await open(
    dirname(input.path),
    "r",
  );
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
  const artifactBodySha256 = sha256(artifactBody);
  const metadata = await lstat(input.path);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o600 ||
    (await sha256File(input.path)) !==
      artifactBodySha256
  ) {
    throw new Error(
      "Restricted provider artifact failed its mode or post-write SHA-256 verification",
    );
  }
  return {
    rawBodySha256,
    artifactBodySha256,
    artifactBody,
    rawBodyBytes: Buffer.byteLength(
      input.rawBody,
      "utf8",
    ),
    artifactBodyBytes: Buffer.byteLength(
      artifactBody,
      "utf8",
    ),
    exactRawBodyStored:
      !providerMetadataAllowlistApplied &&
      redactionCount === 0,
    sanitizedArtifactStored:
      providerMetadataAllowlistApplied ||
      redactionCount > 0,
    providerMetadataAllowlistApplied,
    providerMetadataRedactionCount,
    inputAudioRedacted: redactionCount > 0,
    inputAudioRedactionCount: redactionCount,
  };
}

export interface HistoricalGenerationBinding {
  generationId: (typeof HISTORICAL_GENERATION_IDS)[number];
  requestIndex: number;
  perspectiveId: ResponseRecoveryPerspectiveId;
  attempt: 1 | 2;
  retryOfRequestIndex: number | null;
  oldLedgerResultSequence: number;
  oldLedgerResultEntryHash: string;
  oldResponseSha256: string;
  oldActualCostUsd: number;
  oldUsage: UsageCost;
  assignmentId: string;
  assignmentHash: string;
}

export interface GenerationRetrievalPlan {
  schemaVersion: typeof GENERATION_RETRIEVAL_SCHEMA_VERSION;
  taskInstructionSha256: typeof SUPERSEDING_GENERATION_TASK_SHA256;
  historicalGenerations: readonly HistoricalGenerationBinding[];
  immutableBindings: {
    priorPlanHash: typeof PRIOR_PAID_PLAN_HASH;
    priorPlanFileSha256:
      typeof PRIOR_PAID_PLAN_FILE_SHA256;
    priorLedgerSha256: typeof PRIOR_PAID_LEDGER_SHA256;
    priorLedgerTerminalHash:
      typeof PRIOR_PAID_LEDGER_TERMINAL_HASH;
    privateManifestSha256:
      typeof PRIOR_PRIVATE_MANIFEST_SHA256;
    initialKeyPreflightSummarySha256:
      typeof INITIAL_KEY_PREFLIGHT_SUMMARY_SHA256;
    responseRecoveryPlanSha256:
      typeof PRIOR_RESPONSE_RECOVERY_PLAN_SHA256;
    responseRecoveryPlanHash: string;
    responseRecoveryLedgerSha256:
      typeof PRIOR_RESPONSE_RECOVERY_LEDGER_SHA256;
    responseRecoveryLedgerTerminalHash:
      typeof PRIOR_RESPONSE_RECOVERY_LEDGER_TERMINAL_HASH;
    responseRecoveryLockSha256:
      typeof PRIOR_RESPONSE_RECOVERY_LOCK_SHA256;
    request16RawResponseSha256:
      typeof REQUEST_16_RAW_RESPONSE_SHA256;
  };
  endpoints: {
    generationContent:
      typeof GENERATION_CONTENT_ENDPOINT;
    generationMetadata: typeof GENERATION_ENDPOINT;
    currentKey: typeof KEY_PREFLIGHT_ENDPOINT;
    chatPostProhibitedDuringRetrieval: true;
  };
  limits: {
    carriedActualCostUsd:
      typeof PRIOR_PAID_ACTUAL_COST_USD;
    cumulativeInferenceUsd:
      typeof RECOVERY_MAXIMUM_USD;
    maximumNewPaidJudgePosts:
      typeof MAXIMUM_NEW_PAID_RECOVERY_POSTS;
    maximumMetadataGets:
      typeof MAXIMUM_GENERATION_METADATA_GETS;
    plannedHistoricalGets: 20;
    plannedCurrentKeyGets: 2;
  };
  requestPolicy: {
    method: "GET";
    redirect: "error";
    responseFormatOmitted: true;
    directOpenAiCalls: 0;
    elevenLabsCalls: 0;
  };
  retrievalPlanHash: string;
}

export function buildGenerationRetrievalPlan(input: {
  historicalGenerations: readonly HistoricalGenerationBinding[];
  responseRecoveryPlanHash: string;
}): GenerationRetrievalPlan {
  if (input.historicalGenerations.length !== 10) {
    throw new Error(
      "Generation retrieval requires exactly ten historical generation bindings",
    );
  }
  const seenIds = new Set<string>();
  const seenRequests = new Set<number>();
  const seenPerspectiveAttempts = new Set<string>();
  input.historicalGenerations.forEach(
    (binding, index) => {
      const expectedId =
        HISTORICAL_GENERATION_IDS[index];
      const expectedRequestIndex = index + 3;
      const expectedPerspective =
        `judge-${String(
          Math.floor(index / 2) + 1,
        ).padStart(2, "0")}` as ResponseRecoveryPerspectiveId;
      const expectedAttempt =
        index % 2 === 0 ? 1 : 2;
      if (
        binding.generationId !== expectedId ||
        binding.requestIndex !== expectedRequestIndex ||
        binding.perspectiveId !== expectedPerspective ||
        binding.attempt !== expectedAttempt ||
        binding.retryOfRequestIndex !==
          (expectedAttempt === 2
            ? expectedRequestIndex - 1
            : null) ||
        binding.oldLedgerResultSequence !==
          7 + index * 2 ||
        !Number.isFinite(binding.oldActualCostUsd) ||
        binding.oldActualCostUsd < 0 ||
        binding.oldUsage.openRouterCostUsd !==
          binding.oldActualCostUsd ||
        !binding.assignmentId ||
        !/^[a-f0-9]{64}$/u.test(
          binding.assignmentHash,
        )
      ) {
        throw new Error(
          "Historical generation mapping differs from the immutable paid ledger",
        );
      }
      assertExactSha256(
        binding.oldLedgerResultEntryHash,
        "Historical ledger result entry hash",
      );
      assertExactSha256(
        binding.oldResponseSha256,
        "Historical response hash",
      );
      const perspectiveAttempt =
        `${binding.perspectiveId}:${String(
          binding.attempt,
        )}`;
      if (
        seenIds.has(binding.generationId) ||
        seenRequests.has(binding.requestIndex) ||
        seenPerspectiveAttempts.has(perspectiveAttempt)
      ) {
        throw new Error(
          "Historical generation bindings contain a duplicate identity",
        );
      }
      seenIds.add(binding.generationId);
      seenRequests.add(binding.requestIndex);
      seenPerspectiveAttempts.add(
        perspectiveAttempt,
      );
    },
  );
  assertExactSha256(
    input.responseRecoveryPlanHash,
    "Response recovery plan hash",
  );
  const withoutHash: Omit<
    GenerationRetrievalPlan,
    "retrievalPlanHash"
  > = {
    schemaVersion:
      GENERATION_RETRIEVAL_SCHEMA_VERSION,
    taskInstructionSha256:
      SUPERSEDING_GENERATION_TASK_SHA256,
    historicalGenerations:
      input.historicalGenerations.map(
        (binding) => ({ ...binding }),
      ),
    immutableBindings: {
      priorPlanHash: PRIOR_PAID_PLAN_HASH,
      priorPlanFileSha256:
        PRIOR_PAID_PLAN_FILE_SHA256,
      priorLedgerSha256:
        PRIOR_PAID_LEDGER_SHA256,
      priorLedgerTerminalHash:
        PRIOR_PAID_LEDGER_TERMINAL_HASH,
      privateManifestSha256:
        PRIOR_PRIVATE_MANIFEST_SHA256,
      initialKeyPreflightSummarySha256:
        INITIAL_KEY_PREFLIGHT_SUMMARY_SHA256,
      responseRecoveryPlanSha256:
        PRIOR_RESPONSE_RECOVERY_PLAN_SHA256,
      responseRecoveryPlanHash:
        input.responseRecoveryPlanHash,
      responseRecoveryLedgerSha256:
        PRIOR_RESPONSE_RECOVERY_LEDGER_SHA256,
      responseRecoveryLedgerTerminalHash:
        PRIOR_RESPONSE_RECOVERY_LEDGER_TERMINAL_HASH,
      responseRecoveryLockSha256:
        PRIOR_RESPONSE_RECOVERY_LOCK_SHA256,
      request16RawResponseSha256:
        REQUEST_16_RAW_RESPONSE_SHA256,
    },
    endpoints: {
      generationContent:
        GENERATION_CONTENT_ENDPOINT,
      generationMetadata: GENERATION_ENDPOINT,
      currentKey: KEY_PREFLIGHT_ENDPOINT,
      chatPostProhibitedDuringRetrieval: true,
    },
    limits: {
      carriedActualCostUsd:
        PRIOR_PAID_ACTUAL_COST_USD,
      cumulativeInferenceUsd:
        RECOVERY_MAXIMUM_USD,
      maximumNewPaidJudgePosts:
        MAXIMUM_NEW_PAID_RECOVERY_POSTS,
      maximumMetadataGets:
        MAXIMUM_GENERATION_METADATA_GETS,
      plannedHistoricalGets: 20,
      plannedCurrentKeyGets: 2,
    },
    requestPolicy: {
      method: "GET",
      redirect: "error",
      responseFormatOmitted: true,
      directOpenAiCalls: 0,
      elevenLabsCalls: 0,
    },
  };
  return {
    ...withoutHash,
    retrievalPlanHash: sha256(
      stableJson(withoutHash),
    ),
  };
}

export function assertGenerationRetrievalPlanInvariant(
  value: unknown,
): asserts value is GenerationRetrievalPlan {
  if (
    !isRecord(value) ||
    value.schemaVersion !==
      GENERATION_RETRIEVAL_SCHEMA_VERSION ||
    !Array.isArray(value.historicalGenerations) ||
    !isRecord(value.immutableBindings) ||
    typeof value.immutableBindings
      .responseRecoveryPlanHash !== "string"
  ) {
    throw new Error(
      "Generation retrieval plan has an invalid runtime shape",
    );
  }
  const plan =
    value as unknown as GenerationRetrievalPlan;
  const rebuilt = buildGenerationRetrievalPlan({
    historicalGenerations:
      plan.historicalGenerations,
    responseRecoveryPlanHash:
      plan.immutableBindings
        .responseRecoveryPlanHash,
  });
  if (stableJson(rebuilt) !== stableJson(plan)) {
    throw new Error(
      "Generation retrieval plan differs from its frozen deterministic reconstruction",
    );
  }
}

interface GenerationRetrievalLedgerEntry {
  schemaVersion:
    typeof GENERATION_RETRIEVAL_LEDGER_SCHEMA_VERSION;
  ledgerId:
    "tenxpros-openrouter-generation-retrieval-20260726";
  sequence: number;
  timestamp: string;
  previousHash: string;
  retrievalPlanHash: string;
  event: string;
  data: Readonly<Record<string, unknown>>;
  entryHash: string;
}

async function readGenerationRetrievalLedger(
  path: string,
): Promise<GenerationRetrievalLedgerEntry[]> {
  if (!(await pathExists(path))) return [];
  return (await readFile(path, "utf8"))
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(
          line,
        ) as GenerationRetrievalLedgerEntry,
    );
}

function verifyGenerationRetrievalLedger(
  entries: readonly GenerationRetrievalLedgerEntry[],
  retrievalPlanHash: string,
): void {
  let previousHash = LEDGER_GENESIS_HASH;
  entries.forEach((entry, index) => {
    const { entryHash, ...base } = entry;
    if (
      entry.schemaVersion !==
        GENERATION_RETRIEVAL_LEDGER_SCHEMA_VERSION ||
      entry.ledgerId !==
        "tenxpros-openrouter-generation-retrieval-20260726" ||
      entry.sequence !== index + 1 ||
      entry.previousHash !== previousHash ||
      entry.retrievalPlanHash !==
        retrievalPlanHash ||
      entry.entryHash !== sha256(stableJson(base))
    ) {
      throw new Error(
        `Generation retrieval ledger hash-chain verification failed at entry ${String(
          index + 1,
        )}`,
      );
    }
    previousHash = entryHash;
  });
}

async function appendGenerationRetrievalLedgerEvent(input: {
  path: string;
  retrievalPlanHash: string;
  event: string;
  data: Readonly<Record<string, unknown>>;
  now: () => string;
}): Promise<GenerationRetrievalLedgerEntry> {
  const entries = await readGenerationRetrievalLedger(
    input.path,
  );
  verifyGenerationRetrievalLedger(
    entries,
    input.retrievalPlanHash,
  );
  const base = {
    schemaVersion:
      GENERATION_RETRIEVAL_LEDGER_SCHEMA_VERSION as typeof GENERATION_RETRIEVAL_LEDGER_SCHEMA_VERSION,
    ledgerId:
      "tenxpros-openrouter-generation-retrieval-20260726" as const,
    sequence: entries.length + 1,
    timestamp: input.now(),
    previousHash:
      entries.at(-1)?.entryHash ??
      LEDGER_GENESIS_HASH,
    retrievalPlanHash: input.retrievalPlanHash,
    event: input.event,
    data: input.data,
  };
  const entry: GenerationRetrievalLedgerEntry = {
    ...base,
    entryHash: sha256(stableJson(base)),
  };
  const serialized = `${JSON.stringify(entry)}\n`;
  if (
    /authorization|bearer |sk-or-|input_audio|data:audio|[A-Za-z0-9+/]{1000,}={0,2}/iu.test(
      serialized,
    )
  ) {
    throw new Error(
      "Generation retrieval ledger contains prohibited secret or audio payload material",
    );
  }
  const flags =
    fsConstants.O_WRONLY |
    fsConstants.O_APPEND |
    fsConstants.O_NOFOLLOW |
    (entries.length === 0
      ? fsConstants.O_CREAT | fsConstants.O_EXCL
      : 0);
  const handle = await open(input.path, flags, 0o600);
  try {
    const descriptorMetadata = await handle.stat();
    const processUid = process.getuid?.();
    if (
      !descriptorMetadata.isFile() ||
      (descriptorMetadata.mode & 0o777) !==
        0o600 ||
      (processUid !== undefined &&
        descriptorMetadata.uid !== processUid)
    ) {
      throw new Error(
        "Generation retrieval ledger descriptor is unsafe",
      );
    }
    await handle.writeFile(serialized, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  const metadata = await lstat(input.path);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o600
  ) {
    throw new Error(
      "Generation retrieval ledger is not a restricted regular file",
    );
  }
  return entry;
}

interface GenerationRetrievalPaths {
  outputDirectory: string;
  contentDirectory: string;
  metadataDirectory: string;
  planPath: string;
  ledgerPath: string;
  evidenceManifestPath: string;
  reportPath: string;
}

async function ensureOwnerOnlyDirectory(
  path: string,
): Promise<void> {
  await mkdir(path, {
    recursive: false,
    mode: 0o700,
  }).catch(async (error: unknown) => {
    if (!isRecord(error) || error.code !== "EEXIST") {
      throw error;
    }
  });
  const metadata = await lstat(path);
  const processUid = process.getuid?.();
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o700 ||
    (processUid !== undefined &&
      metadata.uid !== processUid)
  ) {
    throw new Error(
      `Generation retrieval directory must be owner-only and non-symlink: ${path}`,
    );
  }
}

async function ensureGenerationRetrievalLayout(
  outputDirectory: string,
): Promise<GenerationRetrievalPaths> {
  const root = resolve(outputDirectory);
  await ensureOwnerOnlyDirectory(root);
  const contentDirectory = resolve(
    root,
    "openrouter-generation-content",
  );
  const metadataDirectory = resolve(
    root,
    "openrouter-generation-metadata",
  );
  await ensureOwnerOnlyDirectory(contentDirectory);
  await ensureOwnerOnlyDirectory(metadataDirectory);
  return {
    outputDirectory: root,
    contentDirectory,
    metadataDirectory,
    planPath: resolve(
      root,
      "generation-retrieval-plan.json",
    ),
    ledgerPath: resolve(
      root,
      "generation-retrieval-ledger.jsonl",
    ),
    evidenceManifestPath: resolve(
      root,
      "generation-retrieval-evidence-manifest.json",
    ),
    reportPath: resolve(
      root,
      "generation-retrieval-report.md",
    ),
  };
}

async function loadExistingGenerationRetrievalLayout(
  outputDirectory: string,
): Promise<GenerationRetrievalPaths> {
  const root = resolve(outputDirectory);
  const contentDirectory = resolve(
    root,
    "openrouter-generation-content",
  );
  const metadataDirectory = resolve(
    root,
    "openrouter-generation-metadata",
  );
  const processUid = process.getuid?.();
  for (const path of [
    root,
    contentDirectory,
    metadataDirectory,
  ]) {
    const metadata = await lstat(path);
    if (
      !metadata.isDirectory() ||
      metadata.isSymbolicLink() ||
      (metadata.mode & 0o777) !== 0o700 ||
      (processUid !== undefined &&
        metadata.uid !== processUid)
    ) {
      throw new Error(
        `Resume requires an existing owner-only non-symlink directory: ${path}`,
      );
    }
  }
  return {
    outputDirectory: root,
    contentDirectory,
    metadataDirectory,
    planPath: resolve(
      root,
      "generation-retrieval-plan.json",
    ),
    ledgerPath: resolve(
      root,
      "generation-retrieval-ledger.jsonl",
    ),
    evidenceManifestPath: resolve(
      root,
      "generation-retrieval-evidence-manifest.json",
    ),
    reportPath: resolve(
      root,
      "generation-retrieval-report.md",
    ),
  };
}

async function loadCurrentGenerationRetrievalPlan(
  paths: GenerationRetrievalPaths,
): Promise<GenerationRetrievalPlan> {
  const priorPlanPath = resolve(
    paths.outputDirectory,
    "ai-evaluation-plan.json",
  );
  const priorLedgerPath = resolve(
    paths.outputDirectory,
    "ai-evaluation-ledger.jsonl",
  );
  const privateManifestPath = resolve(
    paths.outputDirectory,
    "private-ai-manifest.json",
  );
  const responseRecoveryPlanPath = resolve(
    paths.outputDirectory,
    "response-recovery-plan.json",
  );
  const responseRecoveryLedgerPath = resolve(
    paths.outputDirectory,
    "response-recovery-ledger.jsonl",
  );
  const responseRecoveryLockPath = resolve(
    PHASE2C_ROOT,
    RECOVERY_RUN_LOCK_FILENAME,
  );
  const request16RawPath = resolve(
    paths.outputDirectory,
    "private",
    "recovery-api-records",
    "16-judge-01-unbilled_format_fallback-raw-response.txt",
  );
  const initialKeyPreflightSummaryPath = resolve(
    paths.outputDirectory,
    "private",
    "api-records",
    "openrouter-preflight-summary.json",
  );
  const [
    priorPlanFileSha256,
    priorLedgerSha256,
    privateManifestSha256,
    initialKeyPreflightSummarySha256,
    responseRecoveryPlanSha256,
    responseRecoveryLedgerSha256,
    responseRecoveryLockSha256,
    request16RawResponseSha256,
  ] = await Promise.all([
    sha256File(priorPlanPath),
    sha256File(priorLedgerPath),
    sha256File(privateManifestPath),
    sha256File(initialKeyPreflightSummaryPath),
    sha256File(responseRecoveryPlanPath),
    sha256File(responseRecoveryLedgerPath),
    sha256File(responseRecoveryLockPath),
    sha256File(request16RawPath),
  ]);
  if (
    priorPlanFileSha256 !==
      PRIOR_PAID_PLAN_FILE_SHA256 ||
    priorLedgerSha256 !==
      PRIOR_PAID_LEDGER_SHA256 ||
    privateManifestSha256 !==
      PRIOR_PRIVATE_MANIFEST_SHA256 ||
    initialKeyPreflightSummarySha256 !==
      INITIAL_KEY_PREFLIGHT_SUMMARY_SHA256 ||
    responseRecoveryPlanSha256 !==
      PRIOR_RESPONSE_RECOVERY_PLAN_SHA256 ||
    responseRecoveryLedgerSha256 !==
      PRIOR_RESPONSE_RECOVERY_LEDGER_SHA256 ||
    responseRecoveryLockSha256 !==
      PRIOR_RESPONSE_RECOVERY_LOCK_SHA256 ||
    request16RawResponseSha256 !==
      REQUEST_16_RAW_RESPONSE_SHA256
  ) {
    throw new Error(
      "An immutable historical artifact changed before generation retrieval planning",
    );
  }
  const priorPlan = JSON.parse(
    await readFile(priorPlanPath, "utf8"),
  ) as AiEvaluationPlan;
  const initialKeyPreflightSummary = JSON.parse(
    await readFile(
      initialKeyPreflightSummaryPath,
      "utf8",
    ),
  ) as unknown;
  if (
    !isRecord(initialKeyPreflightSummary) ||
    !isRecord(initialKeyPreflightSummary.key) ||
    initialKeyPreflightSummary.key
      .configuredLimitUsd !== 10 ||
    initialKeyPreflightSummary.key
      .remainingLimitUsd !== 10
  ) {
    throw new Error(
      "Initial key preflight does not prove the fixed zero-usage baseline",
    );
  }
  const privateManifest = JSON.parse(
    await readFile(privateManifestPath, "utf8"),
  ) as PrivateAiManifest;
  if (priorPlan.planHash !== PRIOR_PAID_PLAN_HASH) {
    throw new Error(
      "Generation retrieval prior plan hash changed",
    );
  }
  assertPrivateManifestHashInvariant(
    priorPlan,
    privateManifest,
  );
  const priorLedger = await readLedger(priorLedgerPath);
  verifyLedgerEntries(
    priorLedger,
    PRIOR_PAID_PLAN_HASH,
  );
  if (
    priorLedger.at(-1)?.entryHash !==
      PRIOR_PAID_LEDGER_TERMINAL_HASH
  ) {
    throw new Error(
      "Generation retrieval prior ledger terminal hash changed",
    );
  }
  const responseRecoveryPlanValue = JSON.parse(
    await readFile(responseRecoveryPlanPath, "utf8"),
  ) as unknown;
  assertResponseRecoveryPlanInvariant(
    responseRecoveryPlanValue,
  );
  const responseRecoveryLedger =
    await readResponseRecoveryLedger(
      responseRecoveryLedgerPath,
    );
  verifyResponseRecoveryLedger(
    responseRecoveryLedger,
    responseRecoveryPlanValue.recoveryPlanHash,
  );
  if (
    responseRecoveryLedger.length !== 27 ||
    responseRecoveryLedger.at(-1)?.entryHash !==
      PRIOR_RESPONSE_RECOVERY_LEDGER_TERMINAL_HASH ||
    responseRecoveryLedger.at(-1)?.event !==
      "RECOVERY_EXTERNAL_REQUEST_RESULT" ||
    responseRecoveryLedger.at(-1)?.data
      .requestIndex !== 16 ||
    responseRecoveryLedger.at(-1)?.data.status !==
      "UNCERTAIN_PAID"
  ) {
    throw new Error(
      "Generation retrieval requires the exact unresolved request-16 ledger terminal",
    );
  }
  const historicalGenerations =
    HISTORICAL_GENERATION_IDS.map(
      (generationId, index) => {
        const result = priorLedger.find(
          (entry) =>
            entry.event ===
              "EXTERNAL_REQUEST_RESULT" &&
            entry.data.openRouterRequestId ===
              generationId,
        );
        const requestIndex = index + 3;
        const perspectiveId =
          `judge-${String(
            Math.floor(index / 2) + 1,
          ).padStart(
            2,
            "0",
          )}` as ResponseRecoveryPerspectiveId;
        const attempt = (index % 2 === 0
          ? 1
          : 2) as 1 | 2;
        const assignment =
          privateManifest.judgeAssignments.find(
            (candidate) =>
              candidate.judgeId === perspectiveId,
          );
        const usage = result?.data.usage;
        if (
          !result ||
          result.sequence !== 7 + index * 2 ||
          result.data.requestIndex !== requestIndex ||
          result.data.judgeId !== perspectiveId ||
          result.data.attempt !== attempt ||
          result.data.retryOfRequestIndex !==
            (attempt === 2
              ? requestIndex - 1
              : null) ||
          result.data.status !== "REJECTED" ||
          typeof result.data.responseSha256 !==
            "string" ||
          typeof result.data.actualCostUsd !==
            "number" ||
          !isRecord(usage) ||
          typeof usage.promptTokens !== "number" ||
          typeof usage.completionTokens !==
            "number" ||
          typeof usage.openRouterCostUsd !==
            "number" ||
          !assignment
        ) {
          throw new Error(
            `Generation ${generationId} is not bound to one exact historical result`,
          );
        }
        return {
          generationId,
          requestIndex,
          perspectiveId,
          attempt,
          retryOfRequestIndex:
            attempt === 2
              ? requestIndex - 1
              : null,
          oldLedgerResultSequence: result.sequence,
          oldLedgerResultEntryHash:
            result.entryHash,
          oldResponseSha256:
            result.data.responseSha256,
          oldActualCostUsd:
            result.data.actualCostUsd,
          oldUsage: {
            promptTokens: usage.promptTokens,
            audioInputTokens:
              typeof usage.audioInputTokens ===
              "number"
                ? usage.audioInputTokens
                : null,
            textInputTokens:
              typeof usage.textInputTokens ===
              "number"
                ? usage.textInputTokens
                : null,
            completionTokens:
              usage.completionTokens,
            openRouterCostUsd:
              usage.openRouterCostUsd,
          },
          assignmentId: assignment.assignmentId,
          assignmentHash:
            assignment.assignmentHash,
        } satisfies HistoricalGenerationBinding;
      },
    );
  const plan = buildGenerationRetrievalPlan({
    historicalGenerations,
    responseRecoveryPlanHash:
      responseRecoveryPlanValue.recoveryPlanHash,
  });
  if (await pathExists(paths.planPath)) {
    const existing = JSON.parse(
      await readFile(paths.planPath, "utf8"),
    ) as unknown;
    assertGenerationRetrievalPlanInvariant(existing);
    if (stableJson(existing) !== stableJson(plan)) {
      throw new Error(
        "Existing generation retrieval plan does not match live immutable reconstruction",
      );
    }
  } else {
    await writeNewJson(paths.planPath, plan);
  }
  return plan;
}

async function acquireGenerationRetrievalLock(input: {
  plan: GenerationRetrievalPlan;
  createdAt: string;
  phaseRootForTest?: string;
}): Promise<string> {
  assertGenerationRetrievalPlanInvariant(input.plan);
  const phaseRoot = resolve(
    input.phaseRootForTest ?? PHASE2C_ROOT,
  );
  await ensureOwnerOnlyDirectory(phaseRoot);
  const lockPath = resolve(
    phaseRoot,
    GENERATION_RETRIEVAL_LOCK_FILENAME,
  );
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (isRecord(error) && error.code === "EEXIST") {
      throw new Error(
        "Generation retrieval is already locked; inspect the append-only retrieval ledger before any resume",
        { cause: error },
      );
    }
    throw error;
  }
  try {
    await handle.writeFile(
      prettyJsonFileBytes({
        schemaVersion:
          "tenxpros-openrouter-generation-retrieval-lock-v1",
        retrievalPlanHash:
          input.plan.retrievalPlanHash,
        retrievalPlanFileSha256: sha256(
          prettyJsonFileBytes(input.plan),
        ),
        createdAt: input.createdAt,
        processId: process.pid,
        immutableBindings:
          input.plan.immutableBindings,
        historicalGenerationIds:
          input.plan.historicalGenerations.map(
            (binding) => binding.generationId,
          ),
        maximumMetadataGets:
          MAXIMUM_GENERATION_METADATA_GETS,
        maximumNewPaidJudgePosts:
          MAXIMUM_NEW_PAID_RECOVERY_POSTS,
        paidInferenceDuringThisLock: 0,
        removal:
          "Fail-closed lock. Never remove until the hash-chained generation retrieval ledger and all stored-response hashes are audited.",
      }),
      "utf8",
    );
    await handle.sync();
  } finally {
    await handle.close();
  }
  const rootHandle = await open(phaseRoot, "r");
  try {
    await rootHandle.sync();
  } finally {
    await rootHandle.close();
  }
  return lockPath;
}

interface GenerationMetadataGetResult {
  requestIndex: number;
  kind:
    | "GENERATION_CONTENT"
    | "GENERATION_METADATA"
    | "CURRENT_KEY_BEFORE"
    | "CURRENT_KEY_AFTER";
  generationId: string | null;
  httpStatus: number | null;
  rawBodySha256: string | null;
  artifactBodySha256: string | null;
  artifactRelativePath: string | null;
  rawBodyBytes: number | null;
  artifactBodyBytes: number | null;
  exactRawBodyStored: boolean;
  sanitizedArtifactStored: boolean;
  providerMetadataAllowlistApplied: boolean;
  providerMetadataRedactionCount: number;
  inputAudioRedactionCount: number;
  safeResponseHeaders: Readonly<
    Record<string, string>
  >;
  receivedBodyForSemanticParse: string | null;
  parsedJson: unknown;
  parsingResult:
    | "PENDING_SEMANTIC_PARSE"
    | "INVALID_JSON"
      | "NETWORK_FAILURE";
}

interface GenerationHttpEvidence {
  requestIndex: number;
  kind: GenerationMetadataGetResult["kind"];
  generationId: string | null;
  httpStatus: number | null;
  artifactRelativePath: string | null;
  rawBodySha256: string | null;
  artifactBodySha256: string | null;
  rawBodyBytes: number | null;
  artifactBodyBytes: number | null;
  exactRawBodyStored: boolean;
  sanitizedArtifactStored: boolean;
  providerMetadataAllowlistApplied: boolean;
  providerMetadataRedactionCount: number;
  inputAudioRedactionCount: number;
  safeResponseHeaders: Readonly<
    Record<string, string>
  >;
  artifactFileMode: "0600" | null;
  transportParsingResult:
    GenerationMetadataGetResult["parsingResult"];
}

function generationHttpEvidence(
  result: GenerationMetadataGetResult,
): GenerationHttpEvidence {
  return {
    requestIndex: result.requestIndex,
    kind: result.kind,
    generationId: result.generationId,
    httpStatus: result.httpStatus,
    artifactRelativePath:
      result.artifactRelativePath,
    rawBodySha256: result.rawBodySha256,
    artifactBodySha256:
      result.artifactBodySha256,
    rawBodyBytes: result.rawBodyBytes,
    artifactBodyBytes:
      result.artifactBodyBytes,
    exactRawBodyStored:
      result.exactRawBodyStored,
    sanitizedArtifactStored:
      result.sanitizedArtifactStored,
    providerMetadataAllowlistApplied:
      result.providerMetadataAllowlistApplied,
    providerMetadataRedactionCount:
      result.providerMetadataRedactionCount,
    inputAudioRedactionCount:
      result.inputAudioRedactionCount,
    safeResponseHeaders:
      result.safeResponseHeaders,
    artifactFileMode:
      result.artifactRelativePath === null
        ? null
        : "0600",
    transportParsingResult:
      result.parsingResult,
  };
}

export interface PreparedGenerationRetrievalRun {
  plan: GenerationRetrievalPlan;
  paths: GenerationRetrievalPaths;
  lockPath: string;
  resume:
    | {
        stage: "AFTER_REQUEST_2";
        interruptedRequestIndex: 2;
        completedContentGenerationId:
          (typeof HISTORICAL_GENERATION_IDS)[0];
        priorMetadataGetReservations: 2;
      }
    | {
        stage: "AFTER_REQUEST_22";
        interruptedRequestIndex: 22;
        priorMetadataGetReservations: 22;
        completedGenerationOutcomes: 20;
      }
    | null;
}

async function writeRestrictedCompletion(input: {
  path: string;
  completion: string;
  secret: string;
}): Promise<string> {
  if (
    input.completion.includes(input.secret) ||
    /input_audio|data:audio|[A-Za-z0-9+/]{1000,}={0,2}/iu.test(
      input.completion,
    )
  ) {
    throw new Error(
      "Extracted completion contains prohibited secret or audio payload material",
    );
  }
  const handle = await open(input.path, "wx", 0o600);
  try {
    await handle.writeFile(
      input.completion,
      "utf8",
    );
    await handle.sync();
  } finally {
    await handle.close();
  }
  const directoryHandle = await open(
    dirname(input.path),
    "r",
  );
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
  const completionSha256 = sha256(
    input.completion,
  );
  const metadata = await lstat(input.path);
  const processUid = process.getuid?.();
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o600 ||
    (processUid !== undefined &&
      metadata.uid !== processUid) ||
    (await sha256File(input.path)) !==
    completionSha256
  ) {
    throw new Error(
      "Extracted completion failed restricted-file or post-write hash verification",
    );
  }
  return completionSha256;
}

async function executeGenerationMetadataGet(input: {
  prepared: PreparedGenerationRetrievalRun;
  kind: GenerationMetadataGetResult["kind"];
  generationId?: string;
  endpoint: string;
  directory: string;
  filenameStem: string;
  retryOfRequestIndex?: number;
  secret: string;
  fetchImpl: NonNullable<
    AiAudioEvaluationDependencies["fetchImpl"]
  >;
  now: () => string;
}): Promise<GenerationMetadataGetResult> {
  if (
    input.generationId !== undefined &&
    !HISTORICAL_GENERATION_IDS.includes(
      input.generationId as (typeof HISTORICAL_GENERATION_IDS)[number],
    )
  ) {
    throw new Error(
      "Generation retrieval refused an unknown generation ID",
    );
  }
  const expectedEndpoint =
    input.generationId === undefined
      ? KEY_PREFLIGHT_ENDPOINT
      : `${
          input.kind === "GENERATION_CONTENT"
            ? GENERATION_CONTENT_ENDPOINT
            : GENERATION_ENDPOINT
        }?id=${encodeURIComponent(
          input.generationId,
        )}`;
  if (
    input.endpoint !== expectedEndpoint ||
    (input.generationId === undefined &&
      input.kind !== "CURRENT_KEY_BEFORE" &&
      input.kind !== "CURRENT_KEY_AFTER") ||
    (input.generationId !== undefined &&
      input.kind !== "GENERATION_CONTENT" &&
      input.kind !== "GENERATION_METADATA")
  ) {
    throw new Error(
      "Generation retrieval endpoint/kind identity is outside the fixed metadata-only allowlist",
    );
  }
  const entries = await readGenerationRetrievalLedger(
    input.prepared.paths.ledgerPath,
  );
  verifyGenerationRetrievalLedger(
    entries,
    input.prepared.plan.retrievalPlanHash,
  );
  const priorReservations = entries.filter(
    (entry) =>
      entry.event ===
      "METADATA_GET_RESERVED",
  );
  const capDecision = checkMetadataGetCap({
    metadataGetsUsed: priorReservations.length,
    maximumMetadataGets:
      MAXIMUM_GENERATION_METADATA_GETS,
  });
  if (!capDecision.allowed) {
    throw new Error(
      "Generation metadata GET cap is exhausted",
    );
  }
  const requestIndex = capDecision.nextCount;
  const identity = {
    requestIndex,
    kind: input.kind,
    generationId: input.generationId ?? null,
    method: "GET",
    endpoint:
      input.generationId === undefined
        ? "/key"
        : input.kind === "GENERATION_CONTENT"
          ? "/generation/content"
          : "/generation",
    paidInference: false,
    retryOfRequestIndex:
      input.retryOfRequestIndex ?? null,
  };
  await appendGenerationRetrievalLedgerEvent({
    path: input.prepared.paths.ledgerPath,
    retrievalPlanHash:
      input.prepared.plan.retrievalPlanHash,
    event: "METADATA_GET_RESERVED",
    data: identity,
    now: input.now,
  });
  await appendGenerationRetrievalLedgerEvent({
    path: input.prepared.paths.ledgerPath,
    retrievalPlanHash:
      input.prepared.plan.retrievalPlanHash,
    event: "METADATA_GET_DISPATCHED",
    data: {
      ...identity,
      redirectPolicy: "error",
      credentialMaterialStored: false,
    },
    now: input.now,
  });
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    30_000,
  );
  const startedAt = Date.now();
  let response: FetchResponseLike;
  let rawBody: string;
  try {
    response = await input.fetchImpl(input.endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.secret}`,
        ...OPENROUTER_ATTRIBUTION_HEADERS,
      },
      redirect: "error",
      signal: controller.signal,
    });
    rawBody = await response.text();
  } catch (error) {
    await appendGenerationRetrievalLedgerEvent({
      path: input.prepared.paths.ledgerPath,
      retrievalPlanHash:
        input.prepared.plan.retrievalPlanHash,
      event: "METADATA_GET_FAILED",
      data: {
        ...identity,
        latencyMs: Date.now() - startedAt,
        failureClass:
          error instanceof Error
            ? error.name
            : "METADATA_GET_FAILED",
        retryAutomatically: false,
      },
      now: input.now,
    });
    return {
      requestIndex,
      kind: input.kind,
      generationId:
        input.generationId ?? null,
      httpStatus: null,
      rawBodySha256: null,
      artifactBodySha256: null,
      artifactRelativePath: null,
      rawBodyBytes: null,
      artifactBodyBytes: null,
      exactRawBodyStored: false,
      sanitizedArtifactStored: false,
      providerMetadataAllowlistApplied: false,
      providerMetadataRedactionCount: 0,
      inputAudioRedactionCount: 0,
      safeResponseHeaders: {},
      receivedBodyForSemanticParse: null,
      parsedJson: undefined,
      parsingResult: "NETWORK_FAILURE",
    };
  } finally {
    clearTimeout(timeout);
  }
  const rawPath = resolve(
    input.directory,
    `${input.filenameStem}.http-body.txt`,
  );
  let persisted: PersistedProviderHttpBody;
  try {
    persisted =
      await persistProviderHttpBodyBeforeSemanticParse({
        path: rawPath,
        rawBody,
        secret: input.secret,
        persistencePolicy:
          input.kind === "CURRENT_KEY_BEFORE" ||
          input.kind === "CURRENT_KEY_AFTER"
            ? "CURRENT_KEY_ALLOWLIST"
            : "DEFAULT",
      });
  } catch (error) {
    await appendGenerationRetrievalLedgerEvent({
      path: input.prepared.paths.ledgerPath,
      retrievalPlanHash:
        input.prepared.plan.retrievalPlanHash,
      event:
        "METADATA_RESPONSE_PERSISTENCE_FAILED",
      data: {
        ...identity,
        httpStatus: response.status,
        rawBodySha256: sha256(rawBody),
        rawBodyBytes: Buffer.byteLength(
          rawBody,
          "utf8",
        ),
        exactRawBodyStored: false,
        sanitizedArtifactStored: false,
        artifactRelativePath: null,
        failureClass:
          error instanceof Error
            ? error.name
            : "PERSISTENCE_FAILED",
        noAutomaticRetryInCurrentProcess: true,
      },
      now: input.now,
    });
    throw error;
  }
  const rawRelativePath = relative(
    input.prepared.paths.outputDirectory,
    rawPath,
  );
  const loggedHeaders = safeResponseHeaders(
    response.headers,
  );
  await appendGenerationRetrievalLedgerEvent({
    path: input.prepared.paths.ledgerPath,
    retrievalPlanHash:
      input.prepared.plan.retrievalPlanHash,
    event: "METADATA_RESPONSE_STORED",
    data: {
      ...identity,
      httpStatus: response.status,
      ok: response.ok,
      rawRelativePath,
      rawBodyBytes: persisted.rawBodyBytes,
      artifactBodyBytes:
        persisted.artifactBodyBytes,
      rawBodySha256: persisted.rawBodySha256,
      artifactBodySha256:
        persisted.artifactBodySha256,
      exactRawBodyStored:
        persisted.exactRawBodyStored,
      sanitizedArtifactStored:
        persisted.sanitizedArtifactStored,
      providerMetadataAllowlistApplied:
        persisted.providerMetadataAllowlistApplied,
      providerMetadataRedactionCount:
        persisted.providerMetadataRedactionCount,
      inputAudioRedacted:
        persisted.inputAudioRedacted,
      inputAudioRedactionCount:
        persisted.inputAudioRedactionCount,
      safeResponseHeaders: loggedHeaders,
      fileMode: "0600",
      storedBeforeSemanticParse: true,
      latencyMs: Date.now() - startedAt,
    },
    now: input.now,
  });
  let parsedJson: unknown;
  let parsingResult:
    | "PENDING_SEMANTIC_PARSE"
    | "INVALID_JSON" =
    "PENDING_SEMANTIC_PARSE";
  try {
    parsedJson = JSON.parse(rawBody) as unknown;
  } catch {
    parsedJson = undefined;
    parsingResult = "INVALID_JSON";
  }
  if (response.status === 401 || response.status === 402) {
    await appendGenerationRetrievalLedgerEvent({
      path: input.prepared.paths.ledgerPath,
      retrievalPlanHash:
        input.prepared.plan.retrievalPlanHash,
      event: "METADATA_RETRIEVAL_AUTH_BLOCKED",
      data: {
        ...identity,
        httpStatus: response.status,
        rawBodySha256: persisted.rawBodySha256,
        noFurtherRequestAllowed: true,
      },
      now: input.now,
    });
    throw new Error(
      `Generation retrieval stopped fail-closed on HTTP ${String(
        response.status,
      )}`,
    );
  }
  return {
    requestIndex,
    kind: input.kind,
    generationId: input.generationId ?? null,
    httpStatus: response.status,
    rawBodySha256: persisted.rawBodySha256,
    artifactBodySha256:
      persisted.artifactBodySha256,
    artifactRelativePath: rawRelativePath,
    rawBodyBytes: persisted.rawBodyBytes,
    artifactBodyBytes:
      persisted.artifactBodyBytes,
    exactRawBodyStored:
      persisted.exactRawBodyStored,
    sanitizedArtifactStored:
      persisted.sanitizedArtifactStored,
    providerMetadataAllowlistApplied:
      persisted.providerMetadataAllowlistApplied,
    providerMetadataRedactionCount:
      persisted.providerMetadataRedactionCount,
    inputAudioRedactionCount:
      persisted.inputAudioRedactionCount,
    safeResponseHeaders: loggedHeaders,
    receivedBodyForSemanticParse: rawBody,
    parsedJson,
    parsingResult,
  };
}

export async function prepareGenerationRetrievalRun(input: {
  outputDirectory?: string;
  phaseRootForTest?: string;
  now?: () => string;
} = {}): Promise<PreparedGenerationRetrievalRun> {
  const outputDirectory = resolve(
    input.outputDirectory ?? DEFAULT_OUTPUT,
  );
  assertSafeOutputDirectory(outputDirectory);
  const paths = await ensureGenerationRetrievalLayout(
    outputDirectory,
  );
  const plan =
    await loadCurrentGenerationRetrievalPlan(paths);
  const existing =
    await readGenerationRetrievalLedger(
      paths.ledgerPath,
    );
  verifyGenerationRetrievalLedger(
    existing,
    plan.retrievalPlanHash,
  );
  if (existing.length > 0) {
    throw new Error(
      existing.at(-1)?.event ===
        "GENERATION_RETRIEVAL_COMPLETED"
        ? "Generation retrieval is already complete; no metadata GET will be repeated"
        : "Generation retrieval has an incomplete locked ledger and requires manual audit; no automatic resume is allowed",
    );
  }
  const now =
    input.now ?? (() => new Date().toISOString());
  const lockPath =
    await acquireGenerationRetrievalLock({
      plan,
      createdAt: now(),
      phaseRootForTest: input.phaseRootForTest,
    });
  await appendGenerationRetrievalLedgerEvent({
    path: paths.ledgerPath,
    retrievalPlanHash: plan.retrievalPlanHash,
    event: "GENERATION_RETRIEVAL_STARTED",
    data: {
      historicalGenerationCount: 10,
      plannedHistoricalGets: 20,
      plannedCurrentKeyGets: 2,
      maximumMetadataGets:
        MAXIMUM_GENERATION_METADATA_GETS,
      paidJudgePostsMade: 0,
      chatEndpointCalled: false,
      responseFormatUsed: false,
    },
    now,
  });
  return {
    plan,
    paths,
    lockPath,
    resume: null,
  };
}

export async function prepareGenerationRetrievalResumeRun(
  input: {
    outputDirectory?: string;
    phaseRootForTest?: string;
    now?: () => string;
  } = {},
): Promise<PreparedGenerationRetrievalRun> {
  const outputDirectory = resolve(
    input.outputDirectory ?? DEFAULT_OUTPUT,
  );
  assertSafeOutputDirectory(outputDirectory);
  const paths =
    await loadExistingGenerationRetrievalLayout(
      outputDirectory,
    );
  const plan =
    await loadCurrentGenerationRetrievalPlan(paths);
  const planFileSha256 = await sha256File(
    paths.planPath,
  );
  const ledgerFileSha256 = await sha256File(
    paths.ledgerPath,
  );
  const resumeStage =
    ledgerFileSha256 ===
    INTERRUPTED_GENERATION_RETRIEVAL_LEDGER_SHA256
      ? "AFTER_REQUEST_2"
      : ledgerFileSha256 ===
          SECOND_INTERRUPTED_GENERATION_RETRIEVAL_LEDGER_SHA256
        ? "AFTER_REQUEST_22"
        : null;
  if (
    plan.retrievalPlanHash !==
      INTERRUPTED_GENERATION_RETRIEVAL_PLAN_HASH ||
    planFileSha256 !==
      INTERRUPTED_GENERATION_RETRIEVAL_PLAN_FILE_SHA256 ||
    resumeStage === null
  ) {
    throw new Error(
      "Resume refused: retrieval plan or interrupted ledger is not one of the exact pinned live prefixes",
    );
  }
  const entries = await readGenerationRetrievalLedger(
    paths.ledgerPath,
  );
  verifyGenerationRetrievalLedger(
    entries,
    plan.retrievalPlanHash,
  );
  const firstGenerationId =
    HISTORICAL_GENERATION_IDS[0];
  if (resumeStage === "AFTER_REQUEST_2") {
    const expectedEvents = [
      "GENERATION_RETRIEVAL_STARTED",
      "METADATA_GET_RESERVED",
      "METADATA_GET_DISPATCHED",
      "METADATA_RESPONSE_STORED",
      "GENERATION_CONTENT_UNAVAILABLE",
      "METADATA_GET_RESERVED",
      "METADATA_GET_DISPATCHED",
    ] as const;
    if (
      entries.length !== expectedEvents.length ||
      entries.some(
        (entry, index) =>
          entry.event !== expectedEvents[index],
      ) ||
      entries[1]?.data.requestIndex !== 1 ||
      entries[1]?.data.kind !==
        "GENERATION_CONTENT" ||
      entries[1]?.data.generationId !==
        firstGenerationId ||
      entries[3]?.data.rawBodySha256 !==
        INTERRUPTED_GENERATION_CONTENT_ARTIFACT_SHA256 ||
      entries[3]?.data.artifactBodySha256 !==
        INTERRUPTED_GENERATION_CONTENT_ARTIFACT_SHA256 ||
      entries[3]?.data.fileMode !== "0600" ||
      entries[4]?.data.httpStatus !== 404 ||
      entries[5]?.data.requestIndex !== 2 ||
      entries[5]?.data.kind !==
        "GENERATION_METADATA" ||
      entries[5]?.data.generationId !==
        firstGenerationId ||
      entries[6]?.data.requestIndex !== 2 ||
      entries[6]?.data.kind !==
        "GENERATION_METADATA" ||
      entries[6]?.data.generationId !==
        firstGenerationId
    ) {
      throw new Error(
        "Resume refused: interrupted ledger semantic prefix differs from the audited request-2 persistence failure",
      );
    }
  } else {
    const reservations = entries.filter(
      (entry) =>
        entry.event === "METADATA_GET_RESERVED",
    );
    const dispatches = entries.filter(
      (entry) =>
        entry.event === "METADATA_GET_DISPATCHED",
    );
    const storedResponses = entries.filter(
      (entry) =>
        entry.event ===
        "METADATA_RESPONSE_STORED",
    );
    const contentOutcomes = entries.filter(
      (entry) =>
        entry.event ===
        "GENERATION_CONTENT_UNAVAILABLE",
    );
    const oldMetadataOutcomes = entries.filter(
      (entry) =>
        entry.event ===
        "GENERATION_METADATA_HISTORICAL_BINDING_MISMATCH",
    );
    const terminal = entries.at(-1);
    if (
      entries.length !== 88 ||
      terminal?.entryHash !==
        SECOND_INTERRUPTED_GENERATION_RETRIEVAL_TERMINAL_HASH ||
      terminal.event !==
        "METADATA_RESPONSE_PERSISTENCE_FAILED" ||
      terminal.data.requestIndex !== 22 ||
      terminal.data.kind !==
        "CURRENT_KEY_BEFORE" ||
      terminal.data.httpStatus !== 200 ||
      terminal.data.rawBodySha256 !==
        SECOND_INTERRUPTED_KEY_RAW_BODY_SHA256 ||
      terminal.data.rawBodyBytes !== 557 ||
      terminal.data.exactRawBodyStored !==
        false ||
      reservations.length !== 22 ||
      dispatches.length !== 22 ||
      storedResponses.length !== 20 ||
      contentOutcomes.length !== 10 ||
      oldMetadataOutcomes.length !== 10
    ) {
      throw new Error(
        "Resume refused: 88-entry ledger differs from the audited request-22 key-persistence interruption",
      );
    }
  }
  const phaseRoot = resolve(
    input.phaseRootForTest ?? PHASE2C_ROOT,
  );
  const phaseRootMetadata = await lstat(phaseRoot);
  const phaseRootUid = process.getuid?.();
  if (
    !phaseRootMetadata.isDirectory() ||
    phaseRootMetadata.isSymbolicLink() ||
    (phaseRootMetadata.mode & 0o777) !== 0o700 ||
    (phaseRootUid !== undefined &&
      phaseRootMetadata.uid !== phaseRootUid)
  ) {
    throw new Error(
      "Resume refused: lock root is not an existing owner-only directory",
    );
  }
  const lockPath = resolve(
    phaseRoot,
    GENERATION_RETRIEVAL_LOCK_FILENAME,
  );
  const lockMetadata = await lstat(lockPath);
  const processUid = process.getuid?.();
  if (
    !lockMetadata.isFile() ||
    lockMetadata.isSymbolicLink() ||
    (lockMetadata.mode & 0o777) !== 0o600 ||
    (processUid !== undefined &&
      lockMetadata.uid !== processUid) ||
    (await sha256File(lockPath)) !==
      INTERRUPTED_GENERATION_RETRIEVAL_LOCK_SHA256
  ) {
    throw new Error(
      "Resume refused: existing retrieval lock is not the exact owner-only pinned lock",
    );
  }
  const lockValue = JSON.parse(
    await readFile(lockPath, "utf8"),
  ) as unknown;
  if (
    !isRecord(lockValue) ||
    lockValue.schemaVersion !==
      "tenxpros-openrouter-generation-retrieval-lock-v1" ||
    lockValue.retrievalPlanHash !==
      plan.retrievalPlanHash ||
    lockValue.retrievalPlanFileSha256 !==
      INTERRUPTED_GENERATION_RETRIEVAL_PLAN_FILE_SHA256 ||
    lockValue.maximumMetadataGets !==
      MAXIMUM_GENERATION_METADATA_GETS ||
    lockValue.maximumNewPaidJudgePosts !==
      MAXIMUM_NEW_PAID_RECOVERY_POSTS ||
    lockValue.paidInferenceDuringThisLock !== 0 ||
    !Array.isArray(
      lockValue.historicalGenerationIds,
    ) ||
    stableJson(lockValue.historicalGenerationIds) !==
      stableJson(HISTORICAL_GENERATION_IDS) ||
    !Number.isInteger(lockValue.processId)
  ) {
    throw new Error(
      "Resume refused: pinned retrieval lock fields are invalid",
    );
  }
  const originalProcessId = lockValue.processId as number;
  const staleProcessIds = [originalProcessId];
  if (resumeStage === "AFTER_REQUEST_22") {
    const priorResume = entries.find(
      (entry) =>
        entry.event ===
        "GENERATION_RETRIEVAL_RESUMED",
    );
    if (
      !priorResume ||
      !Number.isInteger(
        priorResume.data.currentResumeProcessId,
      )
    ) {
      throw new Error(
        "Resume refused: prior audited resume process identity is missing",
      );
    }
    staleProcessIds.push(
      priorResume.data
        .currentResumeProcessId as number,
    );
  }
  if (
    (
      await Promise.all(
        staleProcessIds.map(async (processId) =>
          pathExists(
            `/proc/${String(processId)}`,
          ),
        ),
      )
    ).some(Boolean)
  ) {
    throw new Error(
      "Resume refused: an earlier retrieval process is still alive",
    );
  }
  const contentFiles = (
    await readdir(paths.contentDirectory)
  ).sort();
  const metadataFiles = (
    await readdir(paths.metadataDirectory)
  ).sort();
  const expectedContentFiles =
    (resumeStage === "AFTER_REQUEST_2"
      ? [firstGenerationId]
      : HISTORICAL_GENERATION_IDS
    )
      .map(
        (generationId) =>
          `${generationId}.http-body.txt`,
      )
      .sort();
  const expectedMetadataFiles =
    (resumeStage === "AFTER_REQUEST_2"
      ? []
      : HISTORICAL_GENERATION_IDS.map(
          (generationId) =>
            `${generationId}.http-body.txt`,
        )
    ).sort();
  if (
    stableJson(contentFiles) !==
      stableJson(expectedContentFiles) ||
    stableJson(metadataFiles) !==
      stableJson(expectedMetadataFiles) ||
    (await pathExists(paths.evidenceManifestPath)) ||
    (await pathExists(paths.reportPath))
  ) {
    throw new Error(
      "Resume refused: retrieval artifact inventory differs from the exact interrupted stage",
    );
  }
  const artifactBindings =
    resumeStage === "AFTER_REQUEST_2"
      ? [
          {
            kind: "GENERATION_CONTENT",
            generationId: firstGenerationId,
          },
        ]
      : HISTORICAL_GENERATION_IDS.flatMap(
          (generationId) => [
            {
              kind: "GENERATION_CONTENT",
              generationId,
            },
            {
              kind: "GENERATION_METADATA",
              generationId,
            },
          ],
        );
  for (const artifactBinding of artifactBindings) {
    const stored = entries.find(
      (entry) =>
        entry.event ===
          "METADATA_RESPONSE_STORED" &&
        entry.data.kind === artifactBinding.kind &&
        entry.data.generationId ===
          artifactBinding.generationId,
    );
    const artifactPath = resolve(
      artifactBinding.kind ===
        "GENERATION_CONTENT"
        ? paths.contentDirectory
        : paths.metadataDirectory,
      `${artifactBinding.generationId}.http-body.txt`,
    );
    const artifactMetadata = await lstat(
      artifactPath,
    );
    if (
      !stored ||
      typeof stored.data.artifactBodySha256 !==
        "string" ||
      !artifactMetadata.isFile() ||
      artifactMetadata.isSymbolicLink() ||
      (artifactMetadata.mode & 0o777) !== 0o600 ||
      (processUid !== undefined &&
        artifactMetadata.uid !== processUid) ||
      (await sha256File(artifactPath)) !==
        stored.data.artifactBodySha256
    ) {
      throw new Error(
        "Resume refused: a stored generation artifact does not match its hash-chained evidence",
      );
    }
  }
  const now =
    input.now ?? (() => new Date().toISOString());
  if (resumeStage === "AFTER_REQUEST_2") {
    await appendGenerationRetrievalLedgerEvent({
      path: paths.ledgerPath,
      retrievalPlanHash: plan.retrievalPlanHash,
      event:
        "METADATA_RESPONSE_PERSISTENCE_FAILED",
      data: {
        requestIndex: 2,
        kind: "GENERATION_METADATA",
        generationId: firstGenerationId,
        retryOfRequestIndex: null,
        failedBeforeDurableBodyPersistence: true,
        exactRawBodyStored: false,
        sanitizedArtifactStored: false,
        responseBodySha256: null,
        artifactRelativePath: null,
        failureClass:
          "LEGACY_REDACTION_FALSE_POSITIVE",
        recoveredFromExactPinnedInterruptedPrefix:
          true,
        retryPermittedAsNewReservation: true,
      },
      now,
    });
  }
  const interruptedRequestIndex =
    resumeStage === "AFTER_REQUEST_2" ? 2 : 22;
  const retryRequestIndex =
    resumeStage === "AFTER_REQUEST_2" ? 3 : 23;
  await appendGenerationRetrievalLedgerEvent({
    path: paths.ledgerPath,
    retrievalPlanHash: plan.retrievalPlanHash,
    event: "GENERATION_RETRIEVAL_RESUMED",
    data: {
      interruptedRequestIndex,
      priorMetadataGetReservations:
        interruptedRequestIndex,
      completedLogicalOutcomes:
        resumeStage === "AFTER_REQUEST_2"
          ? 1
          : 20,
      staleOriginalProcessId:
        originalProcessId,
      staleOriginalProcessVerifiedAbsent:
        true,
      staleProcessIds,
      staleEarlierProcessesVerifiedAbsent:
        true,
      currentResumeProcessId: process.pid,
      existingLockReusedWithoutMutation: true,
      retryWillUseNewRequestIndex:
        retryRequestIndex,
      maximumMetadataGets:
        MAXIMUM_GENERATION_METADATA_GETS,
      paidJudgePostsMade: 0,
    },
    now,
  });
  return {
    plan,
    paths,
    lockPath,
    resume:
      resumeStage === "AFTER_REQUEST_2"
        ? {
            stage: "AFTER_REQUEST_2",
            interruptedRequestIndex: 2,
            completedContentGenerationId:
              firstGenerationId,
            priorMetadataGetReservations: 2,
          }
        : {
            stage: "AFTER_REQUEST_22",
            interruptedRequestIndex: 22,
            priorMetadataGetReservations: 22,
            completedGenerationOutcomes: 20,
          },
  };
}

export interface GenerationRetrievalExecutionResult {
  generationContentsRecovered: number;
  generationMetadataRecovered: number;
  generationMetadataGets: number;
  exactHistoricalCostUsd: string;
  reconciliation: OpenRouterUsageReconciliation;
  paidJudgePostsMade: 0;
  reportPath: string;
}

export async function executePreparedGenerationRetrieval(input: {
  prepared: PreparedGenerationRetrievalRun;
  secret: string;
  fetchImpl?: NonNullable<
    AiAudioEvaluationDependencies["fetchImpl"]
  >;
  now?: () => string;
}): Promise<GenerationRetrievalExecutionResult> {
  assertGenerationRetrievalPlanInvariant(
    input.prepared.plan,
  );
  const fetchImpl = input.fetchImpl ?? defaultFetch;
  const now =
    input.now ?? (() => new Date().toISOString());
  const resumeStage =
    input.prepared.resume?.stage ?? null;
  const expectedMetadataGetCount =
    resumeStage === "AFTER_REQUEST_22"
      ? 24
      : resumeStage === "AFTER_REQUEST_2"
        ? 23
        : 22;
  const metadataGetsDispatchedInThisProcess =
    resumeStage === "AFTER_REQUEST_22"
      ? 2
      : resumeStage === "AFTER_REQUEST_2"
        ? 21
        : 22;
  const contents: {
    generationId: string;
    http: GenerationHttpEvidence;
    available: boolean;
    completionSha256: string | null;
    completionRelativePath: string | null;
    completionSourceJsonPath: string | null;
    historicalToolName: string | null;
    parsingResult: string;
  }[] = [];
  const metadata: {
    generationId: string;
    http: GenerationHttpEvidence;
    totalCostUsd: string | null;
    normalizedPromptTokens: number | null;
    normalizedCompletionTokens: number | null;
    nativePromptTokens: number | null;
    nativeCompletionTokens: number | null;
    bindingPromptTokens: number | null;
    bindingCompletionTokens: number | null;
    bindingPromptTokenSource: string | null;
    bindingCompletionTokenSource: string | null;
    historicalInlineBindingSource:
      | "NATIVE_OPENROUTER_FIELDS"
      | "NORMALIZED_OPENROUTER_FIELDS"
      | "MIXED_OR_UNAVAILABLE";
    provider: string | null;
    finishReason: string | null;
    model: string | null;
    costMatchesHistoricalLedger: boolean;
    promptTokensMatchHistoricalLedger: boolean;
    completionTokensMatchHistoricalLedger: boolean;
    matchesHistoricalBinding: boolean;
    parsingResult: string;
  }[] = [];
  const keyReadings: {
    reading: 1 | 2;
    http: GenerationHttpEvidence;
    usageUsd: string | null;
    limitUsd: string | null;
    limitRemainingUsd: string | null;
    keyKind: string | null;
    active: boolean | null;
    expiresAt: string | null;
    parsingResult: string;
  }[] = [];
  const storedHttpEvidence = (
    stored: GenerationRetrievalLedgerEntry,
    expectedKind:
      | "GENERATION_CONTENT"
      | "GENERATION_METADATA",
    expectedGenerationId: string,
  ): GenerationHttpEvidence => {
    const safeHeaders = isRecord(
      stored.data.safeResponseHeaders,
    )
      ? Object.fromEntries(
          Object.entries(
            stored.data.safeResponseHeaders,
          ).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === "string",
          ),
        )
      : {};
    if (
      stored.event !== "METADATA_RESPONSE_STORED" ||
      stored.data.kind !== expectedKind ||
      stored.data.generationId !==
        expectedGenerationId ||
      typeof stored.data.requestIndex !== "number" ||
      typeof stored.data.httpStatus !== "number" ||
      typeof stored.data.rawRelativePath !==
        "string" ||
      typeof stored.data.rawBodySha256 !== "string" ||
      typeof stored.data.artifactBodySha256 !==
        "string" ||
      typeof stored.data.rawBodyBytes !== "number" ||
      typeof stored.data.artifactBodyBytes !==
        "number" ||
      stored.data.fileMode !== "0600" ||
      stored.data.storedBeforeSemanticParse !== true
    ) {
      throw new Error(
        "Stored generation HTTP evidence is incomplete or bound to the wrong request",
      );
    }
    return {
      requestIndex: stored.data.requestIndex,
      kind: expectedKind,
      generationId: expectedGenerationId,
      httpStatus: stored.data.httpStatus,
      artifactRelativePath:
        stored.data.rawRelativePath,
      rawBodySha256:
        stored.data.rawBodySha256,
      artifactBodySha256:
        stored.data.artifactBodySha256,
      rawBodyBytes: stored.data.rawBodyBytes,
      artifactBodyBytes:
        stored.data.artifactBodyBytes,
      exactRawBodyStored:
        stored.data.exactRawBodyStored === true,
      sanitizedArtifactStored:
        stored.data.sanitizedArtifactStored === true,
      providerMetadataAllowlistApplied:
        stored.data
          .providerMetadataAllowlistApplied === true,
      providerMetadataRedactionCount:
        typeof stored.data
          .providerMetadataRedactionCount === "number"
          ? stored.data
              .providerMetadataRedactionCount
          : 0,
      inputAudioRedactionCount:
        typeof stored.data.inputAudioRedactionCount ===
        "number"
          ? stored.data.inputAudioRedactionCount
          : 0,
      safeResponseHeaders: safeHeaders,
      artifactFileMode: "0600",
      transportParsingResult:
        "PENDING_SEMANTIC_PARSE",
    };
  };
  if (resumeStage !== null) {
    const resumeEntries =
      await readGenerationRetrievalLedger(
        input.prepared.paths.ledgerPath,
      );
    verifyGenerationRetrievalLedger(
      resumeEntries,
      input.prepared.plan.retrievalPlanHash,
    );
    if (
      resumeEntries.at(-1)?.event !==
      "GENERATION_RETRIEVAL_RESUMED"
    ) {
      throw new Error(
        "Prepared resume no longer ends at its hash-chained resume audit event",
      );
    }
    if (resumeStage === "AFTER_REQUEST_2") {
      const request2Resume =
        input.prepared.resume;
      if (
        request2Resume?.stage !==
        "AFTER_REQUEST_2"
      ) {
        throw new Error(
          "Prepared request-2 resume discriminator changed",
        );
      }
      const completedGenerationId =
        request2Resume.completedContentGenerationId;
      const stored = resumeEntries.find(
        (entry) =>
          entry.event ===
            "METADATA_RESPONSE_STORED" &&
          entry.data.requestIndex === 1,
      );
      const unavailable = resumeEntries.find(
        (entry) =>
          entry.event ===
            "GENERATION_CONTENT_UNAVAILABLE" &&
          entry.data.requestIndex === 1,
      );
      if (
        !stored ||
        !unavailable ||
        unavailable.data.generationId !==
          completedGenerationId ||
        unavailable.data.parsingResult !==
          "UNAVAILABLE"
      ) {
        throw new Error(
          "Prepared request-2 resume no longer matches its completed request-1 outcome",
        );
      }
      contents.push({
        generationId: completedGenerationId,
        http: storedHttpEvidence(
          stored,
          "GENERATION_CONTENT",
          completedGenerationId,
        ),
        available: false,
        completionSha256: null,
        completionRelativePath: null,
        completionSourceJsonPath: null,
        historicalToolName: null,
        parsingResult: "UNAVAILABLE",
      });
    } else {
      const correctionOverlays: {
        event: string;
        data: Readonly<Record<string, unknown>>;
      }[] = [];
      for (const binding of input.prepared.plan
        .historicalGenerations) {
        const contentStored = resumeEntries.filter(
          (entry) =>
            entry.event ===
              "METADATA_RESPONSE_STORED" &&
            entry.data.kind ===
              "GENERATION_CONTENT" &&
            entry.data.generationId ===
              binding.generationId,
        );
        const contentOutcome = resumeEntries.filter(
          (entry) =>
            entry.event ===
              "GENERATION_CONTENT_UNAVAILABLE" &&
            entry.data.generationId ===
              binding.generationId,
        );
        const metadataStored = resumeEntries.filter(
          (entry) =>
            entry.event ===
              "METADATA_RESPONSE_STORED" &&
            entry.data.kind ===
              "GENERATION_METADATA" &&
            entry.data.generationId ===
              binding.generationId,
        );
        const oldMismatch = resumeEntries.filter(
          (entry) =>
            entry.event ===
              "GENERATION_METADATA_HISTORICAL_BINDING_MISMATCH" &&
            entry.data.generationId ===
              binding.generationId,
        );
        if (
          contentStored.length !== 1 ||
          contentOutcome.length !== 1 ||
          metadataStored.length !== 1 ||
          oldMismatch.length !== 1 ||
          contentOutcome[0]?.data.parsingResult !==
            "UNAVAILABLE" ||
          oldMismatch[0]?.data.matchesHistoricalBinding !==
            false
        ) {
          throw new Error(
            "Second resume cannot reconstruct an exact unique historical outcome set",
          );
        }
        const contentHttp = storedHttpEvidence(
          contentStored[0]!,
          "GENERATION_CONTENT",
          binding.generationId,
        );
        const metadataHttp = storedHttpEvidence(
          metadataStored[0]!,
          "GENERATION_METADATA",
          binding.generationId,
        );
        const contentBody = await readFile(
          resolve(
            input.prepared.paths.contentDirectory,
            `${binding.generationId}.http-body.txt`,
          ),
          "utf8",
        );
        if (
          sha256(contentBody) !==
          contentHttp.artifactBodySha256
        ) {
          throw new Error(
            `Stored content artifact changed after resume preparation for ${binding.generationId}`,
          );
        }
        contents.push({
          generationId: binding.generationId,
          http: contentHttp,
          available: false,
          completionSha256: null,
          completionRelativePath: null,
          completionSourceJsonPath: null,
          historicalToolName: null,
          parsingResult: "UNAVAILABLE",
        });
        const metadataBody = await readFile(
          resolve(
            input.prepared.paths.metadataDirectory,
            `${binding.generationId}.http-body.txt`,
          ),
          "utf8",
        );
        if (
          sha256(metadataBody) !==
          metadataHttp.artifactBodySha256
        ) {
          throw new Error(
            `Stored metadata artifact changed after resume preparation for ${binding.generationId}`,
          );
        }
        const parsedMetadata =
          parseOpenRouterGenerationMetadata(
            metadataBody,
            binding.generationId,
            MODEL_ID,
          );
        const oldCostQuanta = parseUsdToQuanta(
          binding.oldActualCostUsd,
          `historical ledger cost for ${binding.generationId}`,
        );
        const costMatchesHistoricalLedger =
          parsedMetadata.totalCostQuanta ===
          oldCostQuanta;
        const nativePromptTokens =
          parsedMetadata.nativePromptTokens;
        const nativeCompletionTokens =
          parsedMetadata.nativeCompletionTokens;
        const promptTokensMatchHistoricalLedger =
          nativePromptTokens !== null &&
          nativePromptTokens ===
            binding.oldUsage.promptTokens;
        const completionTokensMatchHistoricalLedger =
          nativeCompletionTokens !== null &&
          nativeCompletionTokens ===
            binding.oldUsage.completionTokens;
        const matchesHistoricalBinding =
          costMatchesHistoricalLedger &&
          promptTokensMatchHistoricalLedger &&
          completionTokensMatchHistoricalLedger;
        if (
          nativePromptTokens === null ||
          nativeCompletionTokens === null ||
          !matchesHistoricalBinding
        ) {
          throw new Error(
            `Second resume requires exact native-token historical binding for ${binding.generationId}`,
          );
        }
        const priorMismatch = oldMismatch[0]!;
        const parsingResult =
          "PARSED_AND_BOUND_NATIVE_TOKEN_OVERLAY";
        correctionOverlays.push({
          event:
            "GENERATION_METADATA_NATIVE_BINDING_RECONCILED",
          data: {
            generationId: binding.generationId,
            perspectiveId: binding.perspectiveId,
            attempt: binding.attempt,
            requestIndex:
              metadataHttp.requestIndex,
            sourceArtifactRelativePath:
              metadataHttp.artifactRelativePath,
            sourceArtifactBodySha256:
              metadataHttp.artifactBodySha256,
            correctedPriorMismatchSequence:
              priorMismatch.sequence,
            correctedPriorMismatchEntryHash:
              priorMismatch.entryHash,
            priorMismatchPreservedWithoutMutation:
              true,
            normalizedPromptTokens:
              parsedMetadata.promptTokens,
            normalizedCompletionTokens:
              parsedMetadata.completionTokens,
            nativePromptTokens,
            nativeCompletionTokens,
            bindingPromptTokens:
              nativePromptTokens,
            bindingCompletionTokens:
              nativeCompletionTokens,
            bindingPromptTokenSource:
              "native_tokens_prompt",
            bindingCompletionTokenSource:
              "native_tokens_completion",
            historicalInlineBindingSource:
              "NATIVE_OPENROUTER_FIELDS",
            retrievedTotalCostUsd:
              parsedMetadata.totalCostUsd,
            oldLedgerCostUsd:
              formatUsdQuanta(oldCostQuanta),
            oldLedgerPromptTokens:
              binding.oldUsage.promptTokens,
            oldLedgerCompletionTokens:
              binding.oldUsage.completionTokens,
            costMatchesHistoricalLedger,
            promptTokensMatchHistoricalLedger,
            completionTokensMatchHistoricalLedger,
            matchesHistoricalBinding,
            parsingResult,
          },
        });
        metadata.push({
          generationId: binding.generationId,
          http: metadataHttp,
          totalCostUsd:
            parsedMetadata.totalCostUsd,
          normalizedPromptTokens:
            parsedMetadata.promptTokens,
          normalizedCompletionTokens:
            parsedMetadata.completionTokens,
          nativePromptTokens,
          nativeCompletionTokens,
          bindingPromptTokens:
            nativePromptTokens,
          bindingCompletionTokens:
            nativeCompletionTokens,
          bindingPromptTokenSource:
            "native_tokens_prompt",
          bindingCompletionTokenSource:
            "native_tokens_completion",
          historicalInlineBindingSource:
            "NATIVE_OPENROUTER_FIELDS",
          provider: parsedMetadata.provider,
          finishReason:
            parsedMetadata.finishReason,
          model: parsedMetadata.model,
          costMatchesHistoricalLedger,
          promptTokensMatchHistoricalLedger,
          completionTokensMatchHistoricalLedger,
          matchesHistoricalBinding,
          parsingResult,
        });
      }
      for (const overlay of correctionOverlays) {
        await appendGenerationRetrievalLedgerEvent({
          path: input.prepared.paths.ledgerPath,
          retrievalPlanHash:
            input.prepared.plan.retrievalPlanHash,
          event: overlay.event,
          data: overlay.data,
          now,
        });
      }
    }
  }
  for (const [bindingIndex, binding] of input.prepared.plan
    .historicalGenerations.entries()) {
    if (resumeStage === "AFTER_REQUEST_22") {
      continue;
    }
    if (
      resumeStage !== "AFTER_REQUEST_2" ||
      bindingIndex !== 0
    ) {
      const contentResult =
        await executeGenerationMetadataGet({
        prepared: input.prepared,
        kind: "GENERATION_CONTENT",
        generationId: binding.generationId,
        endpoint:
          `${GENERATION_CONTENT_ENDPOINT}?id=${encodeURIComponent(
            binding.generationId,
          )}`,
        directory:
          input.prepared.paths.contentDirectory,
        filenameStem: binding.generationId,
        secret: input.secret,
        fetchImpl,
        now,
      });
    const unavailable =
      contentResult.httpStatus === 403 ||
      contentResult.httpStatus === 404;
    let parsedContent:
      | ReturnType<
          typeof parseOpenRouterGenerationContent
        >
      | null = null;
    let contentParseFailure: string | null = null;
    if (
      !unavailable &&
      contentResult.httpStatus !== null &&
      contentResult.httpStatus >= 200 &&
      contentResult.httpStatus < 300 &&
      contentResult.receivedBodyForSemanticParse !==
        null
    ) {
      try {
        parsedContent =
          parseOpenRouterGenerationContent(
            contentResult.receivedBodyForSemanticParse,
            binding.generationId,
          );
      } catch (error) {
        contentParseFailure =
          error instanceof Error
            ? error.message
            : "GENERATION_CONTENT_PARSE_FAILED";
      }
    }
    let completionSha256: string | null = null;
    if (parsedContent) {
      completionSha256 =
        await writeRestrictedCompletion({
          path: resolve(
            input.prepared.paths.contentDirectory,
            `${binding.generationId}.completion.txt`,
          ),
          completion: parsedContent.completion,
          secret: input.secret,
        });
    }
    const contentParsingResult = unavailable
      ? "UNAVAILABLE"
      : parsedContent
        ? "PARSED"
        : contentParseFailure ??
          (contentResult.httpStatus === null
            ? contentResult.parsingResult
            : `HTTP_${String(
                contentResult.httpStatus,
              )}_OR_INVALID_CONTENT`);
    await appendGenerationRetrievalLedgerEvent({
      path: input.prepared.paths.ledgerPath,
      retrievalPlanHash:
        input.prepared.plan.retrievalPlanHash,
      event: unavailable
        ? "GENERATION_CONTENT_UNAVAILABLE"
        : parsedContent
          ? "GENERATION_CONTENT_PARSED"
          : "GENERATION_CONTENT_INVALID",
      data: {
        generationId: binding.generationId,
        perspectiveId: binding.perspectiveId,
        attempt: binding.attempt,
        requestIndex: contentResult.requestIndex,
        httpStatus: contentResult.httpStatus,
        rawBodySha256:
          contentResult.rawBodySha256,
        completionAvailable:
          parsedContent !== null,
        completionSha256,
        completionRelativePath: parsedContent
          ? `openrouter-generation-content/${binding.generationId}.completion.txt`
          : null,
        completionSourceJsonPath:
          parsedContent?.sourcePath ?? null,
        historicalToolName:
          parsedContent?.toolName ?? null,
        expectedHistoricalToolName:
          OPENROUTER_HISTORICAL_TOOL_NAME,
        artifactRelativePath:
          contentResult.artifactRelativePath,
        artifactBodySha256:
          contentResult.artifactBodySha256,
        exactRawBodyStored:
          contentResult.exactRawBodyStored,
        sanitizedArtifactStored:
          contentResult.sanitizedArtifactStored,
        oldRawResponseSha256Comparison:
          "NOT_COMPARABLE_ENDPOINT_WRAPPER",
        parsingResult: contentParsingResult,
      },
      now,
    });
    contents.push({
      generationId: binding.generationId,
      http: generationHttpEvidence(contentResult),
      available: parsedContent !== null,
      completionSha256,
      completionRelativePath: parsedContent
        ? `openrouter-generation-content/${binding.generationId}.completion.txt`
        : null,
      completionSourceJsonPath:
        parsedContent?.sourcePath ?? null,
      historicalToolName:
        parsedContent?.toolName ?? null,
      parsingResult: contentParsingResult,
    });
    }

    const metadataResult =
      await executeGenerationMetadataGet({
        prepared: input.prepared,
        kind: "GENERATION_METADATA",
        generationId: binding.generationId,
        endpoint:
          `${GENERATION_ENDPOINT}?id=${encodeURIComponent(
            binding.generationId,
          )}`,
        directory:
          input.prepared.paths.metadataDirectory,
        filenameStem: binding.generationId,
        retryOfRequestIndex:
          resumeStage ===
            "AFTER_REQUEST_2" &&
          bindingIndex === 0
            ? 2
            : undefined,
        secret: input.secret,
        fetchImpl,
        now,
      });
    let parsedMetadata:
      | OpenRouterGenerationMetadata
      | null = null;
    let metadataParseFailure: string | null = null;
    if (
      metadataResult.httpStatus !== null &&
      metadataResult.httpStatus >= 200 &&
      metadataResult.httpStatus < 300 &&
      metadataResult.receivedBodyForSemanticParse !==
        null
    ) {
      try {
        parsedMetadata =
          parseOpenRouterGenerationMetadata(
            metadataResult.receivedBodyForSemanticParse,
            binding.generationId,
            MODEL_ID,
          );
      } catch (error) {
        metadataParseFailure =
          error instanceof Error
            ? error.message
            : "GENERATION_METADATA_PARSE_FAILED";
      }
    }
    const oldCostQuanta = parseUsdToQuanta(
      binding.oldActualCostUsd,
      `historical ledger cost for ${binding.generationId}`,
    );
    const costMatchesHistoricalLedger =
      parsedMetadata !== null &&
      parsedMetadata.totalCostQuanta ===
        oldCostQuanta;
    const bindingPromptTokens =
      parsedMetadata?.nativePromptTokens ??
      parsedMetadata?.promptTokens ??
      null;
    const bindingCompletionTokens =
      parsedMetadata?.nativeCompletionTokens ??
      parsedMetadata?.completionTokens ??
      null;
    const bindingPromptTokenSource =
      parsedMetadata === null
        ? null
        : parsedMetadata.nativePromptTokens !== null
          ? "native_tokens_prompt"
          : parsedMetadata.promptTokenSource;
    const bindingCompletionTokenSource =
      parsedMetadata === null
        ? null
        : parsedMetadata.nativeCompletionTokens !==
            null
          ? "native_tokens_completion"
          : parsedMetadata.completionTokenSource;
    const historicalInlineBindingSource =
      bindingPromptTokenSource ===
        "native_tokens_prompt" &&
      bindingCompletionTokenSource ===
        "native_tokens_completion"
        ? ("NATIVE_OPENROUTER_FIELDS" as const)
        : bindingPromptTokenSource ===
              "tokens_prompt" &&
            bindingCompletionTokenSource ===
              "tokens_completion"
          ? ("NORMALIZED_OPENROUTER_FIELDS" as const)
          : ("MIXED_OR_UNAVAILABLE" as const);
    const promptTokensMatchHistoricalLedger =
      bindingPromptTokens !== null &&
      bindingPromptTokens ===
        binding.oldUsage.promptTokens;
    const completionTokensMatchHistoricalLedger =
      bindingCompletionTokens !== null &&
      bindingCompletionTokens ===
        binding.oldUsage.completionTokens;
    const matchesHistoricalBinding =
      costMatchesHistoricalLedger &&
      promptTokensMatchHistoricalLedger &&
      completionTokensMatchHistoricalLedger;
    const metadataParsingResult = parsedMetadata
      ? matchesHistoricalBinding
        ? "PARSED_AND_BOUND"
        : "PARSED_HISTORICAL_BINDING_MISMATCH"
      : metadataParseFailure ??
        (metadataResult.httpStatus === null
          ? metadataResult.parsingResult
          : `HTTP_${String(
              metadataResult.httpStatus,
            )}_OR_INVALID_METADATA`);
    await appendGenerationRetrievalLedgerEvent({
      path: input.prepared.paths.ledgerPath,
      retrievalPlanHash:
        input.prepared.plan.retrievalPlanHash,
      event: parsedMetadata
        ? matchesHistoricalBinding
          ? "GENERATION_METADATA_PARSED_AND_BOUND"
          : "GENERATION_METADATA_HISTORICAL_BINDING_MISMATCH"
        : "GENERATION_METADATA_INVALID",
      data: {
        generationId: binding.generationId,
        perspectiveId: binding.perspectiveId,
        attempt: binding.attempt,
        requestIndex: metadataResult.requestIndex,
        httpStatus: metadataResult.httpStatus,
        rawBodySha256:
          metadataResult.rawBodySha256,
        totalCostUsd:
          parsedMetadata?.totalCostUsd ?? null,
        normalizedPromptTokens:
          parsedMetadata?.promptTokens ?? null,
        normalizedCompletionTokens:
          parsedMetadata?.completionTokens ?? null,
        nativePromptTokens:
          parsedMetadata?.nativePromptTokens ?? null,
        nativeCompletionTokens:
          parsedMetadata?.nativeCompletionTokens ??
          null,
        bindingPromptTokens,
        bindingCompletionTokens,
        bindingPromptTokenSource,
        bindingCompletionTokenSource,
        historicalInlineBindingSource,
        provider: parsedMetadata?.provider ?? null,
        finishReason:
          parsedMetadata?.finishReason ?? null,
        model: parsedMetadata?.model ?? null,
        artifactRelativePath:
          metadataResult.artifactRelativePath,
        artifactBodySha256:
          metadataResult.artifactBodySha256,
        oldLedgerCostUsd:
          formatUsdQuanta(oldCostQuanta),
        oldLedgerPromptTokens:
          binding.oldUsage.promptTokens,
        oldLedgerCompletionTokens:
          binding.oldUsage.completionTokens,
        costMatchesHistoricalLedger,
        promptTokensMatchHistoricalLedger,
        completionTokensMatchHistoricalLedger,
        matchesHistoricalBinding,
        parsingResult: metadataParsingResult,
      },
      now,
    });
    metadata.push({
      generationId: binding.generationId,
      http: generationHttpEvidence(metadataResult),
      totalCostUsd:
        parsedMetadata?.totalCostUsd ?? null,
      normalizedPromptTokens:
        parsedMetadata?.promptTokens ?? null,
      normalizedCompletionTokens:
        parsedMetadata?.completionTokens ?? null,
      nativePromptTokens:
        parsedMetadata?.nativePromptTokens ?? null,
      nativeCompletionTokens:
        parsedMetadata?.nativeCompletionTokens ??
        null,
      bindingPromptTokens,
      bindingCompletionTokens,
      bindingPromptTokenSource,
      bindingCompletionTokenSource,
      historicalInlineBindingSource,
      provider: parsedMetadata?.provider ?? null,
      finishReason:
        parsedMetadata?.finishReason ?? null,
      model: parsedMetadata?.model ?? null,
      costMatchesHistoricalLedger,
      promptTokensMatchHistoricalLedger,
      completionTokensMatchHistoricalLedger,
      matchesHistoricalBinding,
      parsingResult: metadataParsingResult,
    });
  }
  const keyResults: [
    OpenRouterKeyUsage | null,
    OpenRouterKeyUsage | null,
  ] = [null, null];
  for (const [index, kind] of (
    [
      "CURRENT_KEY_BEFORE",
      "CURRENT_KEY_AFTER",
    ] as const
  ).entries()) {
    const result =
      await executeGenerationMetadataGet({
        prepared: input.prepared,
        kind,
        endpoint: KEY_PREFLIGHT_ENDPOINT,
        directory:
          input.prepared.paths.metadataDirectory,
        filenameStem:
          `current-key-${index === 0 ? "before" : "after"}`,
        retryOfRequestIndex:
          resumeStage ===
            "AFTER_REQUEST_22" &&
          index === 0
            ? 22
            : undefined,
        secret: input.secret,
        fetchImpl,
        now,
      });
    let parsed: OpenRouterKeyUsage | null = null;
    let keyParseFailure: string | null = null;
    if (
      result.httpStatus !== null &&
      result.httpStatus >= 200 &&
      result.httpStatus < 300 &&
      result.receivedBodyForSemanticParse !== null
    ) {
      try {
        parsed = parseOpenRouterKeyUsage(
          result.receivedBodyForSemanticParse,
        );
      } catch (error) {
        keyParseFailure =
          error instanceof Error
            ? error.message
            : "CURRENT_KEY_PARSE_FAILED";
      }
    }
    keyResults[index] = parsed;
    const keyParsingResult = parsed
      ? "PARSED"
      : keyParseFailure ??
        (result.httpStatus === null
          ? result.parsingResult
          : `HTTP_${String(
              result.httpStatus,
            )}_OR_INVALID_KEY`);
    await appendGenerationRetrievalLedgerEvent({
      path: input.prepared.paths.ledgerPath,
      retrievalPlanHash:
        input.prepared.plan.retrievalPlanHash,
      event: parsed
        ? "CURRENT_KEY_USAGE_PARSED"
        : "CURRENT_KEY_USAGE_INVALID",
      data: {
        requestIndex: result.requestIndex,
        reading: index + 1,
        httpStatus: result.httpStatus,
        rawBodySha256: result.rawBodySha256,
        usageUsd: parsed?.usageUsd ?? null,
        limitUsd: parsed?.limitUsd ?? null,
        limitRemainingUsd:
          parsed?.limitRemainingUsd ?? null,
        keyKind: parsed?.keyKind ?? null,
        active: parsed?.active ?? null,
        expiresAt: parsed?.expiresAt ?? null,
        parsingResult: keyParsingResult,
      },
      now,
    });
    keyReadings.push({
      reading: (index + 1) as 1 | 2,
      http: generationHttpEvidence(result),
      usageUsd: parsed?.usageUsd ?? null,
      limitUsd: parsed?.limitUsd ?? null,
      limitRemainingUsd:
        parsed?.limitRemainingUsd ?? null,
      keyKind: parsed?.keyKind ?? null,
      active: parsed?.active ?? null,
      expiresAt: parsed?.expiresAt ?? null,
      parsingResult: keyParsingResult,
    });
  }
  const historicalCosts = metadata.flatMap((item) =>
    item.totalCostUsd === null
      ? []
      : [item.totalCostUsd],
  );
  const historicalCostQuanta =
    historicalCosts.reduce(
      (sum, cost) =>
        sum +
        parseUsdToQuanta(
          cost,
          "retrieved historical generation cost",
        ),
      0n,
    );
  const priorUncertainQuanta = parseUsdToQuanta(
    PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
    "prior uncertain maximum",
  );
  let reconciliation: OpenRouterUsageReconciliation;
  if (keyResults[0] && keyResults[1]) {
    reconciliation = reconcileOpenRouterUsage({
      historicalGenerationCosts: historicalCosts,
      carriedHistoricalCost:
        String(PRIOR_PAID_ACTUAL_COST_USD),
      initialKeyUsage: "0",
      keyReadingBefore: keyResults[0],
      keyReadingAfter: keyResults[1],
      priorUncertainMaximum:
        String(
          PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
        ),
      noInferenceBetweenKeyReadings: true,
      toleranceQuanta:
        OPENROUTER_RECONCILIATION_TOLERANCE_QUANTA,
      maximumKeyLimit: "10",
      nowIso: now(),
    });
  } else {
    reconciliation = {
      status:
        "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN",
      canContinuePaidInference: false,
      historicalGenerationCostQuanta:
        historicalCostQuanta,
      carriedHistoricalCostQuanta:
        parseUsdToQuanta(
          String(PRIOR_PAID_ACTUAL_COST_USD),
        ),
      currentKeyUsageQuanta: null,
      unexplainedDeltaQuanta: null,
      reconciledActualCostQuanta:
        historicalCostQuanta,
      unresolvedActualDeltaQuanta: 0n,
      retainedHypotheticalUncertainQuanta:
        priorUncertainQuanta,
      capAccountedCostQuanta:
        historicalCostQuanta +
        priorUncertainQuanta,
      event: null,
      reasons: [
        "Two valid current-key readings are required",
      ],
    };
  }
  const bindingMismatches = metadata
    .filter(
      (item) => !item.matchesHistoricalBinding,
    )
    .map((item) => item.generationId);
  if (bindingMismatches.length > 0) {
    reconciliation = {
      ...reconciliation,
      status:
        "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN",
      canContinuePaidInference: false,
      retainedHypotheticalUncertainQuanta:
        priorUncertainQuanta,
      capAccountedCostQuanta:
        reconciliation.capAccountedCostQuanta >
        reconciliation.reconciledActualCostQuanta +
          priorUncertainQuanta
          ? reconciliation.capAccountedCostQuanta
          : reconciliation.reconciledActualCostQuanta +
            priorUncertainQuanta,
      event: null,
      reasons: [
        ...reconciliation.reasons,
        `Per-generation cost/token binding mismatch: ${bindingMismatches.join(
          ", ",
        )}`,
      ],
    };
  }
  await appendGenerationRetrievalLedgerEvent({
    path: input.prepared.paths.ledgerPath,
    retrievalPlanHash:
      input.prepared.plan.retrievalPlanHash,
    event:
      reconciliation.event !== null
        ? "UNCERTAIN_COST_RECONCILED"
        : "UNCERTAIN_COST_RECONCILIATION_BLOCKED",
    data: {
      supersedesAccountingWithoutMutatingOldLedger:
        true,
      oldResponseRecoveryLedgerSha256:
        PRIOR_RESPONSE_RECOVERY_LEDGER_SHA256,
      oldResponseRecoveryLedgerTerminalSequence: 27,
      oldResponseRecoveryLedgerTerminalHash:
        PRIOR_RESPONSE_RECOVERY_LEDGER_TERMINAL_HASH,
      oldUncertainRequestIndex: 16,
      oldUncertainMaximumUsd:
        PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
      request16RawResponseSha256:
        REQUEST_16_RAW_RESPONSE_SHA256,
      priorUncertainEntryReferencedOnly: true,
      aggregateDeltaAttributedToRequest16: false,
      baselineKeyUsageUsd: "0.00000000",
      historicalGenerationCostUsd:
        formatUsdQuanta(
          reconciliation.historicalGenerationCostQuanta,
        ),
      stableCurrentKeyUsageUsd:
        reconciliation.currentKeyUsageQuanta === null
          ? null
          : formatUsdQuanta(
              reconciliation.currentKeyUsageQuanta,
            ),
      aggregateActualUnexplainedUsageDeltaUsd:
        reconciliation.unexplainedDeltaQuanta === null
          ? null
          : formatUsdQuanta(
              reconciliation.unexplainedDeltaQuanta,
            ),
      reconciledActualCostUsd: formatUsdQuanta(
        reconciliation.reconciledActualCostQuanta,
      ),
      retainedHypotheticalUncertainUsd:
        formatUsdQuanta(
          reconciliation
            .retainedHypotheticalUncertainQuanta,
        ),
      capAccountedCostUsd: formatUsdQuanta(
        reconciliation.capAccountedCostQuanta,
      ),
      toleranceUsd:
        formatUsdQuanta(
          OPENROUTER_RECONCILIATION_TOLERANCE_QUANTA,
        ),
      reconciliationStatus:
        reconciliation.status,
      canContinuePaidInference:
        reconciliation.canContinuePaidInference,
      overlay: reconciliation.event,
      reasons: reconciliation.reasons,
      oldLedgerEdited: false,
    },
    now,
  });
  const generationContentsRecovered =
    contents.filter((item) => item.available).length;
  const generationMetadataRecovered =
    metadata.filter(
      (item) => item.totalCostUsd !== null,
    ).length;
  const exactHistoricalCostUsd =
    formatUsdQuanta(
      reconciliation.historicalGenerationCostQuanta,
    );
  const ledgerBeforeReport =
    await readGenerationRetrievalLedger(
      input.prepared.paths.ledgerPath,
    );
  const metadataGetCount =
    ledgerBeforeReport.filter(
      (entry) =>
        entry.event === "METADATA_GET_RESERVED",
    ).length;
  const interruptedPersistenceAttemptCount =
    resumeStage === "AFTER_REQUEST_22"
      ? 2
      : resumeStage === "AFTER_REQUEST_2"
        ? 1
        : 0;
  const retryReservationCount =
    interruptedPersistenceAttemptCount;
  if (
    contents.length !== 10 ||
    metadata.length !== 10 ||
    keyReadings.length !== 2 ||
    metadataGetCount !== expectedMetadataGetCount
  ) {
    throw new Error(
      `Generation retrieval cannot become terminal without exactly 10 content outcomes, 10 metadata outcomes, two key readings, and ${String(
        expectedMetadataGetCount,
      )} GET reservations`,
    );
  }
  const nextJudgeEstimate =
    estimateConservativeNextJudgeCost();
  const reconciliationEvidence = {
    status: reconciliation.status,
    canContinuePaidInference:
      reconciliation.canContinuePaidInference,
    historicalGenerationCostUsd:
      exactHistoricalCostUsd,
    carriedHistoricalCostUsd: formatUsdQuanta(
      reconciliation.carriedHistoricalCostQuanta,
    ),
    currentKeyUsageUsd:
      reconciliation.currentKeyUsageQuanta === null
        ? null
        : formatUsdQuanta(
            reconciliation.currentKeyUsageQuanta,
          ),
    aggregateActualUnexplainedUsageDeltaUsd:
      reconciliation.unexplainedDeltaQuanta === null
        ? null
        : formatUsdQuanta(
            reconciliation.unexplainedDeltaQuanta,
          ),
    reconciledActualCostUsd: formatUsdQuanta(
      reconciliation.reconciledActualCostQuanta,
    ),
    unresolvedActualDeltaUsd: formatUsdQuanta(
      reconciliation.unresolvedActualDeltaQuanta,
    ),
    retainedHypotheticalUncertainUsd:
      formatUsdQuanta(
        reconciliation
          .retainedHypotheticalUncertainQuanta,
      ),
    capAccountedCostUsd: formatUsdQuanta(
      reconciliation.capAccountedCostQuanta,
    ),
    overlay: reconciliation.event,
    reasons: reconciliation.reasons,
    aggregateDeltaAttributedToRequest16: false,
  };
  const evidenceManifest = {
    schemaVersion:
      "tenxpros-openrouter-generation-retrieval-evidence-v1",
    retrievalPlanHash:
      input.prepared.plan.retrievalPlanHash,
    taskInstructionSha256:
      SUPERSEDING_GENERATION_TASK_SHA256,
    historicalToolName:
      OPENROUTER_HISTORICAL_TOOL_NAME,
    requestCounts: {
      logicalGenerationContentOutcomes: 10,
      generationContentGetReservations: 10,
      logicalGenerationMetadataOutcomes: 10,
      generationMetadataGetReservations:
        resumeStage === null ? 10 : 11,
      logicalCurrentKeyOutcomes: 2,
      currentKeyGetReservations:
        resumeStage === "AFTER_REQUEST_22"
          ? 3
          : 2,
      totalMetadataGets: metadataGetCount,
      metadataGetsDispatchedInThisProcess,
      interruptedPersistenceAttempts:
        interruptedPersistenceAttemptCount,
      retryReservations:
        retryReservationCount,
      chatCompletionPosts: 0,
    },
    contentOutcomes: contents,
    metadataOutcomes: metadata,
    currentKeyReadings: keyReadings,
    reconciliation: reconciliationEvidence,
    nextPaidJudgeAdmissionEstimate: {
      estimatedCostUsd:
        nextJudgeEstimate.estimatedCostUsd,
      estimatedCostQuanta:
        nextJudgeEstimate.estimatedCostQuanta.toString(),
      baseCostQuanta:
        nextJudgeEstimate.baseCostQuanta.toString(),
      safetyMarginBasisPoints:
        nextJudgeEstimate.safetyMarginBasisPoints,
      theoreticalMaximum: false,
      actualUsageReconciledAfterEveryCall: true,
    },
  };
  await writeNewJson(
    input.prepared.paths.evidenceManifestPath,
    evidenceManifest,
  );
  const evidenceManifestSha256 = await sha256File(
    input.prepared.paths.evidenceManifestPath,
  );
  const report = `# OpenRouter generation retrieval report

- Retrieval plan: \`${input.prepared.plan.retrievalPlanHash}\`
- Historical generation content recovered: ${String(generationContentsRecovered)} / 10
- Historical generation metadata recovered: ${String(generationMetadataRecovered)} / 10
- Metadata GET reservations: ${String(metadataGetCount)}
- Metadata GETs dispatched by this process: ${String(metadataGetsDispatchedInThisProcess)}
- Audited interrupted persistence attempts: ${
    resumeStage === "AFTER_REQUEST_22"
      ? "2 (request 2 retried as request 3; request 22 retried as request 23)"
      : resumeStage === "AFTER_REQUEST_2"
        ? "1 (request 2; retried as request 3)"
        : "0"
  }
- New paid judge POST requests: 0
- Exact historical generation cost: USD ${exactHistoricalCostUsd}
- Prior uncertain-cost reconciliation: ${reconciliation.status}
- Aggregate actual unexplained key-usage delta: ${
    reconciliation.unexplainedDeltaQuanta === null
      ? "unresolved"
      : `USD ${formatUsdQuanta(
          reconciliation.unexplainedDeltaQuanta,
        )}`
  }
- Aggregate delta attributed specifically to request 16: no
- Paid continuation gate: ${reconciliation.canContinuePaidInference ? "accounting evidence passed (semantic recovery still separately required)" : "blocked"}
- Pinned next-judge admission estimate: USD ${nextJudgeEstimate.estimatedCostUsd} (conservative estimate, not a theoretical maximum; actual usage must be reconciled after every call)
- Evidence manifest SHA-256: \`${evidenceManifestSha256}\`
- ElevenLabs calls: 0
- Direct OpenAI calls: 0
- Production mutations: 0

The previous ledgers and locks were not modified. Every received HTTP body was hashed in memory before semantic parsing. Generation artifacts were stored mode 0600 as exact raw bodies only when they contained no echoed input audio; otherwise they were redacted with separate received-body and artifact SHA-256 values. Current-key bodies were persisted mode 0600 only after endpoint-specific field allowlisting, so provider labels and credential-adjacent metadata were not written.
`;
  await writeAtomicText(
    input.prepared.paths.reportPath,
    report,
  );
  const reportSha256 = await sha256File(
    input.prepared.paths.reportPath,
  );
  const revalidatedPlan =
    await loadCurrentGenerationRetrievalPlan(
      input.prepared.paths,
    );
  if (
    revalidatedPlan.retrievalPlanHash !==
    input.prepared.plan.retrievalPlanHash
  ) {
    throw new Error(
      "Immutable historical bindings changed before terminal generation-retrieval settlement",
    );
  }
  await appendGenerationRetrievalLedgerEvent({
    path: input.prepared.paths.ledgerPath,
    retrievalPlanHash:
      input.prepared.plan.retrievalPlanHash,
    event: "GENERATION_RETRIEVAL_COMPLETED",
    data: {
      contentOutcomeCount: contents.length,
      metadataOutcomeCount: metadata.length,
      currentKeyOutcomeCount: keyReadings.length,
      metadataGetCount,
      metadataGetsDispatchedInThisProcess,
      interruptedPersistenceAttemptCount:
        interruptedPersistenceAttemptCount,
      retryReservationCount:
        retryReservationCount,
      paidJudgePostCount: 0,
      generationContentsRecovered,
      generationMetadataRecovered,
      exactHistoricalCostUsd,
      uncertainCostReconciliationStatus:
        reconciliation.status,
      paidContinuationAccountingGate:
        reconciliation.canContinuePaidInference,
      evidenceManifestSha256,
      evidenceManifestRelativePath:
        "generation-retrieval-evidence-manifest.json",
      reportSha256,
      priorLedgerEntryCount:
        ledgerBeforeReport.length,
      productionMutationCount: 0,
      elevenLabsCallCount: 0,
    },
    now,
  });
  return {
    generationContentsRecovered,
    generationMetadataRecovered,
    generationMetadataGets: metadataGetCount,
    exactHistoricalCostUsd,
    reconciliation,
    paidJudgePostsMade: 0,
    reportPath: input.prepared.paths.reportPath,
  };
}

export interface OfflineGenerationReconciliationResult {
  status: "UNCERTAIN_COST_CLEARED";
  canContinuePaidInference: true;
  reconciledActualCostUsd: "3.54151000";
  capAccountedCostUsd: "3.54151000";
  networkRequestCount: 0;
  supplementPath: string;
  supplementReportPath: string;
  terminalSequence: number;
  terminalHash: string;
}

export async function reconcileCompletedGenerationRetrievalOffline(
  input: {
    outputDirectory?: string;
    phaseRootForTest?: string;
    now?: () => string;
  } = {},
): Promise<OfflineGenerationReconciliationResult> {
  const outputDirectory = resolve(
    input.outputDirectory ?? DEFAULT_OUTPUT,
  );
  assertSafeOutputDirectory(outputDirectory);
  const paths =
    await loadExistingGenerationRetrievalLayout(
      outputDirectory,
    );
  const supplementPath = resolve(
    outputDirectory,
    GENERATION_RECONCILIATION_SUPPLEMENT_FILENAME,
  );
  const supplementReportPath = resolve(
    outputDirectory,
    GENERATION_RECONCILIATION_REPORT_FILENAME,
  );
  if (
    (await pathExists(supplementPath)) ||
    (await pathExists(supplementReportPath))
  ) {
    throw new Error(
      "Offline generation reconciliation refused: a supplement artifact already exists",
    );
  }
  const plan =
    await loadCurrentGenerationRetrievalPlan(paths);
  const [
    planFileSha256,
    ledgerFileSha256,
    evidenceSha256,
    reportSha256,
  ] = await Promise.all([
    sha256File(paths.planPath),
    sha256File(paths.ledgerPath),
    sha256File(paths.evidenceManifestPath),
    sha256File(paths.reportPath),
  ]);
  if (
    plan.retrievalPlanHash !==
      INTERRUPTED_GENERATION_RETRIEVAL_PLAN_HASH ||
    planFileSha256 !==
      INTERRUPTED_GENERATION_RETRIEVAL_PLAN_FILE_SHA256 ||
    ledgerFileSha256 !==
      COMPLETED_GENERATION_RETRIEVAL_LEDGER_SHA256 ||
    evidenceSha256 !==
      COMPLETED_GENERATION_RETRIEVAL_EVIDENCE_SHA256 ||
    reportSha256 !==
      COMPLETED_GENERATION_RETRIEVAL_REPORT_SHA256
  ) {
    throw new Error(
      "Offline generation reconciliation refused: completed plan, ledger, evidence, or report differs from the exact pinned live state",
    );
  }
  const entries = await readGenerationRetrievalLedger(
    paths.ledgerPath,
  );
  verifyGenerationRetrievalLedger(
    entries,
    plan.retrievalPlanHash,
  );
  const terminal = entries.at(-1);
  const resumed = entries[88];
  const storedBefore = entries[101];
  const invalidBefore = entries[102];
  const storedAfter = entries[105];
  const invalidAfter = entries[106];
  const blocked = entries[107];
  if (
    entries.length !== 109 ||
    terminal?.sequence !== 109 ||
    terminal.entryHash !==
      COMPLETED_GENERATION_RETRIEVAL_TERMINAL_HASH ||
    terminal.event !==
      "GENERATION_RETRIEVAL_COMPLETED" ||
    terminal.data.evidenceManifestSha256 !==
      COMPLETED_GENERATION_RETRIEVAL_EVIDENCE_SHA256 ||
    terminal.data.reportSha256 !==
      COMPLETED_GENERATION_RETRIEVAL_REPORT_SHA256 ||
    terminal.data.metadataGetCount !== 24 ||
    terminal.data.paidJudgePostCount !== 0 ||
    terminal.data.uncertainCostReconciliationStatus !==
      "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN" ||
    terminal.data.paidContinuationAccountingGate !==
      false ||
    resumed?.event !==
      "GENERATION_RETRIEVAL_RESUMED" ||
    resumed.data.currentResumeProcessId !==
      COMPLETED_GENERATION_RETRIEVAL_PROCESS_ID ||
    storedBefore?.sequence !== 102 ||
    storedBefore.event !==
      "METADATA_RESPONSE_STORED" ||
    storedBefore.data.requestIndex !== 23 ||
    storedBefore.data.kind !==
      "CURRENT_KEY_BEFORE" ||
    storedAfter?.sequence !== 106 ||
    storedAfter.event !==
      "METADATA_RESPONSE_STORED" ||
    storedAfter.data.requestIndex !== 24 ||
    storedAfter.data.kind !==
      "CURRENT_KEY_AFTER" ||
    invalidBefore?.sequence !== 103 ||
    invalidBefore.event !==
      "CURRENT_KEY_USAGE_INVALID" ||
    invalidBefore.data.requestIndex !== 23 ||
    invalidAfter?.sequence !== 107 ||
    invalidAfter.event !==
      "CURRENT_KEY_USAGE_INVALID" ||
    invalidAfter.data.requestIndex !== 24 ||
    blocked?.sequence !== 108 ||
    blocked.event !==
      "UNCERTAIN_COST_RECONCILIATION_BLOCKED" ||
    blocked.data.reconciliationStatus !==
      "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN"
  ) {
    throw new Error(
      "Offline generation reconciliation refused: the exact terminal ledger semantics are not present",
    );
  }
  const expectedInvalidMessage =
    "limit_remaining must be a plain nonnegative decimal with at most eight fractional digits";
  for (const [stored, invalid] of [
    [storedBefore, invalidBefore],
    [storedAfter, invalidAfter],
  ] as const) {
    if (
      stored.data.httpStatus !== 200 ||
      stored.data.rawBodySha256 !==
        SECOND_INTERRUPTED_KEY_RAW_BODY_SHA256 ||
      stored.data.artifactBodySha256 !==
        COMPLETED_CURRENT_KEY_ARTIFACT_SHA256 ||
      stored.data.exactRawBodyStored !== false ||
      stored.data.sanitizedArtifactStored !== true ||
      stored.data
        .providerMetadataAllowlistApplied !== true ||
      stored.data.fileMode !== "0600" ||
      stored.data.storedBeforeSemanticParse !== true ||
      invalid.data.rawBodySha256 !==
        SECOND_INTERRUPTED_KEY_RAW_BODY_SHA256 ||
      invalid.data.parsingResult !==
        expectedInvalidMessage
    ) {
      throw new Error(
        "Offline generation reconciliation refused: key storage or prior invalid-parse evidence differs",
      );
    }
  }
  const phaseRoot = resolve(
    input.phaseRootForTest ?? PHASE2C_ROOT,
  );
  const phaseRootMetadata = await lstat(phaseRoot);
  const processUid = process.getuid?.();
  if (
    !phaseRootMetadata.isDirectory() ||
    phaseRootMetadata.isSymbolicLink() ||
    (phaseRootMetadata.mode & 0o777) !== 0o700 ||
    (processUid !== undefined &&
      phaseRootMetadata.uid !== processUid)
  ) {
    throw new Error(
      "Offline generation reconciliation refused: lock root is unsafe",
    );
  }
  const lockPath = resolve(
    phaseRoot,
    GENERATION_RETRIEVAL_LOCK_FILENAME,
  );
  const lockMetadata = await lstat(lockPath);
  if (
    !lockMetadata.isFile() ||
    lockMetadata.isSymbolicLink() ||
    (lockMetadata.mode & 0o777) !== 0o600 ||
    (processUid !== undefined &&
      lockMetadata.uid !== processUid) ||
    (await sha256File(lockPath)) !==
      INTERRUPTED_GENERATION_RETRIEVAL_LOCK_SHA256
  ) {
    throw new Error(
      "Offline generation reconciliation refused: retrieval lock differs from the exact pinned lock",
    );
  }
  if (
    await pathExists(
      `/proc/${String(
        COMPLETED_GENERATION_RETRIEVAL_PROCESS_ID,
      )}`,
    )
  ) {
    throw new Error(
      "Offline generation reconciliation refused: the completed retrieval process is still alive",
    );
  }
  const evidenceMetadata = await lstat(
    paths.evidenceManifestPath,
  );
  const reportMetadata = await lstat(paths.reportPath);
  for (const [metadata, label] of [
    [evidenceMetadata, "evidence"],
    [reportMetadata, "report"],
  ] as const) {
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      (metadata.mode & 0o777) !== 0o600 ||
      (processUid !== undefined &&
        metadata.uid !== processUid)
    ) {
      throw new Error(
        `Offline generation reconciliation refused: prior ${label} artifact is unsafe`,
      );
    }
  }
  const expectedContentFiles =
    HISTORICAL_GENERATION_IDS.map(
      (generationId) =>
        `${generationId}.http-body.txt`,
    ).sort();
  const expectedMetadataFiles = [
    ...HISTORICAL_GENERATION_IDS.map(
      (generationId) =>
        `${generationId}.http-body.txt`,
    ),
    "current-key-before.http-body.txt",
    "current-key-after.http-body.txt",
  ].sort();
  if (
    stableJson(
      (
        await readdir(paths.contentDirectory)
      ).sort(),
    ) !== stableJson(expectedContentFiles) ||
    stableJson(
      (
        await readdir(paths.metadataDirectory)
      ).sort(),
    ) !== stableJson(expectedMetadataFiles)
  ) {
    throw new Error(
      "Offline generation reconciliation refused: generation artifact inventory differs from the exact completed run",
    );
  }
  const assertStoredArtifact = async (
    kind:
      | "GENERATION_CONTENT"
      | "GENERATION_METADATA",
    generationId: string,
  ): Promise<void> => {
    const matches = entries.filter(
      (entry) =>
        entry.event ===
          "METADATA_RESPONSE_STORED" &&
        entry.data.kind === kind &&
        entry.data.generationId === generationId,
    );
    if (
      matches.length !== 1 ||
      typeof matches[0]!.data
        .artifactBodySha256 !== "string"
    ) {
      throw new Error(
        "Offline generation reconciliation refused: stored generation artifact binding is not unique",
      );
    }
    const path = resolve(
      kind === "GENERATION_CONTENT"
        ? paths.contentDirectory
        : paths.metadataDirectory,
      `${generationId}.http-body.txt`,
    );
    const metadata = await lstat(path);
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      (metadata.mode & 0o777) !== 0o600 ||
      (processUid !== undefined &&
        metadata.uid !== processUid) ||
      (await sha256File(path)) !==
        matches[0]!.data.artifactBodySha256
    ) {
      throw new Error(
        "Offline generation reconciliation refused: a generation artifact changed after retrieval",
      );
    }
  };
  for (const generationId of HISTORICAL_GENERATION_IDS) {
    await assertStoredArtifact(
      "GENERATION_CONTENT",
      generationId,
    );
    await assertStoredArtifact(
      "GENERATION_METADATA",
      generationId,
    );
  }
  const keyPaths = [
    resolve(
      paths.metadataDirectory,
      "current-key-before.http-body.txt",
    ),
    resolve(
      paths.metadataDirectory,
      "current-key-after.http-body.txt",
    ),
  ] as const;
  const keyBodies: [string, string] = [
    await readFile(keyPaths[0], "utf8"),
    await readFile(keyPaths[1], "utf8"),
  ];
  for (const [index, path] of keyPaths.entries()) {
    const metadata = await lstat(path);
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      (metadata.mode & 0o777) !== 0o600 ||
      (processUid !== undefined &&
        metadata.uid !== processUid) ||
      sha256(keyBodies[index]!) !==
        COMPLETED_CURRENT_KEY_ARTIFACT_SHA256
    ) {
      throw new Error(
        "Offline generation reconciliation refused: a current-key artifact differs from the exact sanitized live response",
      );
    }
  }
  if (keyBodies[0] !== keyBodies[1]) {
    throw new Error(
      "Offline generation reconciliation refused: current-key artifacts are not byte-identical",
    );
  }
  const evidence = JSON.parse(
    await readFile(
      paths.evidenceManifestPath,
      "utf8",
    ),
  ) as unknown;
  if (
    !isRecord(evidence) ||
    !isRecord(evidence.requestCounts) ||
    evidence.requestCounts.totalMetadataGets !==
      24 ||
    evidence.requestCounts.chatCompletionPosts !==
      0 ||
    !isRecord(evidence.reconciliation) ||
    evidence.reconciliation.status !==
      "EVIDENCE_BLOCKED_RETAIN_UNCERTAIN" ||
    evidence.reconciliation
      .retainedHypotheticalUncertainUsd !==
      "4.14600000"
  ) {
    throw new Error(
      "Offline generation reconciliation refused: prior evidence semantics differ from the pinned blocked result",
    );
  }
  const now =
    input.now ?? (() => new Date().toISOString());
  const reconciledAt = now();
  if (Number.isNaN(Date.parse(reconciledAt))) {
    throw new Error(
      "Offline generation reconciliation time is malformed",
    );
  }
  const readings = [
    parseOpenRouterKeyUsage(keyBodies[0]),
    parseOpenRouterKeyUsage(keyBodies[1]),
  ] as const;
  for (const reading of readings) {
    const canonicalizations =
      reading.numericCanonicalizations ?? [];
    if (
      reading.usageUsd !== "3.54151000" ||
      reading.limitUsd !== "10.00000000" ||
      reading.limitRemainingUsd !==
        "6.45849000" ||
      reading.keyKind !==
        "INFERENCE_CONFIRMED" ||
      !reading.active ||
      canonicalizations.length !== 1 ||
      canonicalizations[0]?.field !==
        "limit_remaining" ||
      canonicalizations[0]
        .originalNumericLexeme !==
        "6.458489999999999" ||
      canonicalizations[0].canonicalUsd !==
        "6.45849000" ||
      canonicalizations[0]
        .absoluteAdjustmentUsd !==
        "0.000000000000001" ||
      reading.expiresAt !==
        "2026-07-27T17:12:00.014Z"
    ) {
      throw new Error(
        "Offline generation reconciliation refused: key reinterpretation is outside the exact bounded-noise case",
      );
    }
  }
  const reconciliation = reconcileOpenRouterUsage({
    historicalGenerationCosts:
      plan.historicalGenerations.map((binding) =>
        String(binding.oldActualCostUsd),
      ),
    carriedHistoricalCost:
      String(PRIOR_PAID_ACTUAL_COST_USD),
    initialKeyUsage: "0",
    keyReadingBefore: readings[0],
    keyReadingAfter: readings[1],
    priorUncertainMaximum:
      String(
        PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
      ),
    noInferenceBetweenKeyReadings: true,
    toleranceQuanta:
      OPENROUTER_RECONCILIATION_TOLERANCE_QUANTA,
    maximumKeyLimit: "10",
    nowIso: reconciledAt,
  });
  if (
    reconciliation.status !==
      "UNCERTAIN_COST_CLEARED" ||
    reconciliation.canContinuePaidInference !==
      true ||
    reconciliation.event === null ||
    reconciliation.historicalGenerationCostQuanta !==
      354_151_000n ||
    reconciliation.currentKeyUsageQuanta !==
      354_151_000n ||
    reconciliation.unexplainedDeltaQuanta !== 0n ||
    reconciliation.reconciledActualCostQuanta !==
      354_151_000n ||
    reconciliation
      .retainedHypotheticalUncertainQuanta !== 0n ||
    reconciliation.capAccountedCostQuanta !==
      354_151_000n
  ) {
    throw new Error(
      `Offline generation reconciliation remained blocked: ${reconciliation.reasons.join(
        "; ",
      )}`,
    );
  }
  const appendNow = () => reconciledAt;
  const reinterpretationEntries: GenerationRetrievalLedgerEntry[] =
    [];
  for (const [index, reading] of readings.entries()) {
    const priorStored =
      index === 0 ? storedBefore : storedAfter;
    const priorInvalid =
      index === 0 ? invalidBefore : invalidAfter;
    reinterpretationEntries.push(
      await appendGenerationRetrievalLedgerEvent({
        path: paths.ledgerPath,
        retrievalPlanHash:
          plan.retrievalPlanHash,
        event: "CURRENT_KEY_USAGE_REINTERPRETED",
        data: {
          reading: index + 1,
          requestIndex: index === 0 ? 23 : 24,
          priorStoredSequence:
            priorStored.sequence,
          priorStoredEntryHash:
            priorStored.entryHash,
          priorInvalidSequence:
            priorInvalid.sequence,
          priorInvalidEntryHash:
            priorInvalid.entryHash,
          priorInvalidEntryPreservedWithoutMutation:
            true,
          sourceRawBodySha256:
            SECOND_INTERRUPTED_KEY_RAW_BODY_SHA256,
          sourceArtifactBodySha256:
            COMPLETED_CURRENT_KEY_ARTIFACT_SHA256,
          sourceArtifactRelativePath:
            index === 0
              ? "openrouter-generation-metadata/current-key-before.http-body.txt"
              : "openrouter-generation-metadata/current-key-after.http-body.txt",
          sourceArtifactReusedOffline: true,
          networkRequestMade: false,
          usageUsd: reading.usageUsd,
          limitUsd: reading.limitUsd,
          limitRemainingUsd:
            reading.limitRemainingUsd,
          keyKind: reading.keyKind,
          active: reading.active,
          expiresAt: reading.expiresAt,
          numericCanonicalization:
            reading.numericCanonicalizations?.[0],
          canonicalizationPolicy:
            "PLAIN_NUMERIC_DECIMAL_NEAREST_1E-8_WITH_MAX_1E-15_ABSOLUTE_ADJUSTMENT",
          parsingResult:
            "PARSED_AFTER_BOUNDED_IEEE754_NOISE_CANONICALIZATION",
        },
        now: appendNow,
      }),
    );
  }
  const reconciliationEntry =
    await appendGenerationRetrievalLedgerEvent({
      path: paths.ledgerPath,
      retrievalPlanHash:
        plan.retrievalPlanHash,
      event: "UNCERTAIN_COST_RECONCILED",
      data: {
        supersedesBlockedSequence:
          blocked.sequence,
        supersedesBlockedEntryHash:
          blocked.entryHash,
        blockedEntryPreservedWithoutMutation: true,
        oldResponseRecoveryLedgerSha256:
          PRIOR_RESPONSE_RECOVERY_LEDGER_SHA256,
        oldResponseRecoveryLedgerTerminalHash:
          PRIOR_RESPONSE_RECOVERY_LEDGER_TERMINAL_HASH,
        oldUncertainRequestIndex: 16,
        previousUncertainAmountUsd:
          "4.14600000",
        historicalGenerationCostUsd:
          "3.54151000",
        stableCurrentKeyUsageUsd:
          "3.54151000",
        unexplainedActualDeltaUsd:
          "0.00000000",
        reconciledActualCostUsd:
          "3.54151000",
        retainedHypotheticalUncertainUsd:
          "0.00000000",
        capAccountedCostUsd:
          "3.54151000",
        keyLimitRemainingUsd:
          "6.45849000",
        toleranceUsd: "0.00000001",
        reconciliationStatus:
          reconciliation.status,
        canContinuePaidInference: true,
        evidence:
          reconciliation.event.evidence,
        keyReadingReinterpretationSequences:
          reinterpretationEntries.map(
            (entry) => entry.sequence,
          ),
        keyReadingReinterpretationHashes:
          reinterpretationEntries.map(
            (entry) => entry.entryHash,
          ),
        networkRequestCount: 0,
        paidInferenceRequestCount: 0,
      },
      now: appendNow,
    });
  const supplement = {
    schemaVersion:
      "tenxpros-openrouter-generation-reconciliation-supplement-v1",
    status: reconciliation.status,
    reconciledAt,
    offlineOnly: true,
    networkRequestCount: 0,
    paidInferenceRequestCount: 0,
    chatCompletionPostCount: 0,
    carriedMetadataGetCount: 24,
    retrievalPlanHash:
      plan.retrievalPlanHash,
    immutablePriorState: {
      planFileSha256:
        INTERRUPTED_GENERATION_RETRIEVAL_PLAN_FILE_SHA256,
      ledgerSha256:
        COMPLETED_GENERATION_RETRIEVAL_LEDGER_SHA256,
      terminalSequence: 109,
      terminalHash:
        COMPLETED_GENERATION_RETRIEVAL_TERMINAL_HASH,
      evidenceManifestSha256:
        COMPLETED_GENERATION_RETRIEVAL_EVIDENCE_SHA256,
      reportSha256:
        COMPLETED_GENERATION_RETRIEVAL_REPORT_SHA256,
      keyArtifactSha256:
        COMPLETED_CURRENT_KEY_ARTIFACT_SHA256,
      keyRawBodySha256:
        SECOND_INTERRUPTED_KEY_RAW_BODY_SHA256,
      priorArtifactsOverwritten: false,
      priorLedgerEntriesRewritten: false,
    },
    keyReadings: readings.map(
      (reading, index) => ({
        reading: index + 1,
        requestIndex: index === 0 ? 23 : 24,
        usageUsd: reading.usageUsd,
        limitUsd: reading.limitUsd,
        limitRemainingUsd:
          reading.limitRemainingUsd,
        keyKind: reading.keyKind,
        active: reading.active,
        expiresAt: reading.expiresAt,
        numericCanonicalizations:
          reading.numericCanonicalizations,
        reinterpretationSequence:
          reinterpretationEntries[index]!.sequence,
        reinterpretationEntryHash:
          reinterpretationEntries[index]!.entryHash,
      }),
    ),
    reconciliation: {
      historicalGenerationCostUsd:
        "3.54151000",
      stableCurrentKeyUsageUsd:
        "3.54151000",
      unexplainedActualDeltaUsd:
        "0.00000000",
      priorUncertainMaximumUsd:
        "4.14600000",
      retainedHypotheticalUncertainUsd:
        "0.00000000",
      reconciledActualCostUsd:
        "3.54151000",
      capAccountedCostUsd:
        "3.54151000",
      remainingKeyLimitUsd:
        "6.45849000",
      canContinuePaidInference: true,
      accountingGateOnly:
        "Semantic and paid-executor gates remain separately mandatory",
      ledgerSequence:
        reconciliationEntry.sequence,
      ledgerEntryHash:
        reconciliationEntry.entryHash,
    },
  };
  const supplementSha256 =
    await writeNewRestrictedText(
      supplementPath,
      prettyJsonFileBytes(supplement),
    );
  const supplementReport = `# OpenRouter generation reconciliation supplement

- Status: ${reconciliation.status}
- Execution mode: offline only
- External requests: 0
- Paid inference requests: 0
- Prior terminal preserved: sequence 109, \`${COMPLETED_GENERATION_RETRIEVAL_TERMINAL_HASH}\`
- Prior evidence preserved: \`${COMPLETED_GENERATION_RETRIEVAL_EVIDENCE_SHA256}\`
- Prior report preserved: \`${COMPLETED_GENERATION_RETRIEVAL_REPORT_SHA256}\`
- Stable current-key usage: USD 3.54151000
- Exact historical generation cost: USD 3.54151000
- Actual unexplained delta: USD 0.00000000
- Prior request-16 uncertain maximum cleared: USD 4.14600000
- Reconciled actual and cap-accounted cost: USD 3.54151000
- Remaining key limit: USD 6.45849000
- Accounting continuation gate: passed
- JSON supplement SHA-256: \`${supplementSha256}\`

Both stored key readings were byte-identical. Their numeric \`limit_remaining\` lexeme, \`6.458489999999999\`, differs from USD 6.45849000 by exactly USD 0.000000000000001. This is the maximum accepted bounded numeric-noise adjustment and is one ten-millionth of the USD 0.00000001 accounting quantum. String-valued amounts remain strict and are not canonicalized.

No prior ledger line, evidence manifest, report, key artifact, generation artifact, lock, or production record was overwritten.
`;
  const supplementReportSha256 =
    await writeNewRestrictedText(
      supplementReportPath,
      supplementReport,
    );
  if (
    (await sha256File(
      paths.evidenceManifestPath,
    )) !==
      COMPLETED_GENERATION_RETRIEVAL_EVIDENCE_SHA256 ||
    (await sha256File(paths.reportPath)) !==
      COMPLETED_GENERATION_RETRIEVAL_REPORT_SHA256 ||
    (await sha256File(keyPaths[0])) !==
      COMPLETED_CURRENT_KEY_ARTIFACT_SHA256 ||
    (await sha256File(keyPaths[1])) !==
      COMPLETED_CURRENT_KEY_ARTIFACT_SHA256 ||
    (await sha256File(lockPath)) !==
      INTERRUPTED_GENERATION_RETRIEVAL_LOCK_SHA256
  ) {
    throw new Error(
      "Offline generation reconciliation refused terminal settlement because an immutable prior artifact changed",
    );
  }
  const supersedingTerminal =
    await appendGenerationRetrievalLedgerEvent({
      path: paths.ledgerPath,
      retrievalPlanHash:
        plan.retrievalPlanHash,
      event:
        "GENERATION_RETRIEVAL_OFFLINE_RECONCILIATION_COMPLETED",
      data: {
        supersedesPriorTerminalWithoutMutation:
          true,
        priorTerminalSequence: 109,
        priorTerminalHash:
          COMPLETED_GENERATION_RETRIEVAL_TERMINAL_HASH,
        priorLedgerSha256:
          COMPLETED_GENERATION_RETRIEVAL_LEDGER_SHA256,
        priorEvidenceManifestSha256:
          COMPLETED_GENERATION_RETRIEVAL_EVIDENCE_SHA256,
        priorReportSha256:
          COMPLETED_GENERATION_RETRIEVAL_REPORT_SHA256,
        reinterpretationSequences:
          reinterpretationEntries.map(
            (entry) => entry.sequence,
          ),
        reinterpretationEntryHashes:
          reinterpretationEntries.map(
            (entry) => entry.entryHash,
          ),
        reconciliationSequence:
          reconciliationEntry.sequence,
        reconciliationEntryHash:
          reconciliationEntry.entryHash,
        supplementRelativePath:
          GENERATION_RECONCILIATION_SUPPLEMENT_FILENAME,
        supplementSha256,
        supplementReportRelativePath:
          GENERATION_RECONCILIATION_REPORT_FILENAME,
        supplementReportSha256,
        uncertainCostReconciliationStatus:
          reconciliation.status,
        reconciledActualCostUsd:
          "3.54151000",
        capAccountedCostUsd:
          "3.54151000",
        retainedHypotheticalUncertainUsd:
          "0.00000000",
        paidContinuationAccountingGate: true,
        metadataGetCount: 24,
        networkRequestCountDuringContinuation: 0,
        paidJudgePostCountDuringContinuation: 0,
        productionMutationCount: 0,
        elevenLabsCallCount: 0,
      },
      now: appendNow,
    });
  return {
    status: "UNCERTAIN_COST_CLEARED",
    canContinuePaidInference: true,
    reconciledActualCostUsd: "3.54151000",
    capAccountedCostUsd: "3.54151000",
    networkRequestCount: 0,
    supplementPath,
    supplementReportPath,
    terminalSequence:
      supersedingTerminal.sequence,
    terminalHash:
      supersedingTerminal.entryHash,
  };
}

function recoveryJsonContent(
  envelope: unknown,
): unknown {
  if (
    !isRecord(envelope) ||
    !Array.isArray(envelope.choices) ||
    envelope.choices.length !== 1
  ) {
    return undefined;
  }
  const choice = envelope.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    return undefined;
  }
  const content = choice.message.content;
  if (typeof content === "string") return content;
  if (
    Array.isArray(content) &&
    content.length === 1 &&
    isRecord(content[0]) &&
    content[0].type === "text" &&
    typeof content[0].text === "string"
  ) {
    return content[0].text;
  }
  return undefined;
}

function recoveryToolArguments(
  envelope: unknown,
): unknown {
  if (
    !isRecord(envelope) ||
    !Array.isArray(envelope.choices) ||
    envelope.choices.length !== 1
  ) {
    return undefined;
  }
  const choice = envelope.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    return undefined;
  }
  const calls = choice.message.tool_calls;
  if (!Array.isArray(calls) || calls.length !== 1) {
    return undefined;
  }
  const call = calls[0];
  if (
    !isRecord(call) ||
    call.type !== "function" ||
    !isRecord(call.function) ||
    call.function.name !== RECOVERY_TOOL_NAME ||
    typeof call.function.arguments !== "string"
  ) {
    return undefined;
  }
  return call.function.arguments;
}

function confirmedUnbilledForcedToolRejection(input: {
  status: number;
  rawBody: string;
  usage: UsageCost | null;
}): boolean {
  return (
    (input.status === 400 || input.status === 422) &&
    (input.usage?.openRouterCostUsd === 0 ||
      /(?:not billed|no charge|charged[^.]{0,20}(?:false|0))/iu.test(
        input.rawBody,
      )) &&
    /(?:unsupported|not supported|does not support|unknown parameter|invalid parameter)/iu.test(
      input.rawBody,
    ) &&
    (/"param"\s*:\s*"(?:tools|tool_choice)"/iu.test(
      input.rawBody,
    ) ||
      /(?:unsupported|unknown|invalid)\s+(?:top-level\s+)?(?:parameter\s+)?['"]?(?:tools|tool_choice)['"]?/iu.test(
        input.rawBody,
      )) &&
    !/(?:tools?\[[^\]]+\]\.function\.(?:parameters|arguments)|schema validation|invalid tool arguments)/iu.test(
      input.rawBody,
    )
  );
}

async function executeRecoveryMetadataPreflight(input: {
  secret: string;
  recoveryPlan: ResponseRecoveryPlan;
  recoveryLedgerPath: string;
  privateRecordsDirectory: string;
  fetchImpl: NonNullable<
    AiAudioEvaluationDependencies["fetchImpl"]
  >;
  now: () => string;
}): Promise<{
  forcedToolCapability:
    | "SUPPORTED"
    | "UNSUPPORTED"
    | "UNKNOWN";
  capabilityEvidenceRequestIndex: number;
}> {
  const metadataRequest = async (
    requestKind: "KEY_PREFLIGHT" | "MODELS_PREFLIGHT",
    endpoint: string,
  ): Promise<{
    json: unknown;
    requestIndex: number;
  }> => {
    const requestIndex =
      await reserveRecoveryExternalRequest({
        recoveryLedgerPath: input.recoveryLedgerPath,
        recoveryPlan: input.recoveryPlan,
        requestKind,
        maximumPossibleCostUsd: 0,
        now: input.now,
      });
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      30_000,
    );
    let response: FetchResponseLike;
    let parsed: { text: string; json: unknown };
    try {
      response = await input.fetchImpl(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${input.secret}`,
          ...OPENROUTER_ATTRIBUTION_HEADERS,
        },
        signal: controller.signal,
      });
      parsed = await parseResponseText(response);
    } catch (error) {
      await settleRecoveryExternalRequest({
        recoveryLedgerPath: input.recoveryLedgerPath,
        recoveryPlan: input.recoveryPlan,
        requestIndex,
        status: "FAILED_NOT_BILLED",
        actualCostUsd: 0,
        issueCodes: [
          error instanceof Error
            ? error.name
            : "METADATA_PREFLIGHT_FAILED",
        ],
        latencyMs: Date.now() - startedAt,
        now: input.now,
      });
      throw new Error(
        `${requestKind} failed before recovery inference`,
      );
    } finally {
      clearTimeout(timeout);
    }
    const responseSha256 = sha256(parsed.text);
    await writeOrVerifyJson(
      resolve(
        input.privateRecordsDirectory,
        `${String(requestIndex).padStart(2, "0")}-${requestKind.toLocaleLowerCase("en-US")}.json`,
      ),
      {
        schemaVersion:
          "tenxpros-phase2c-recovery-metadata-response-v1",
        requestIndex,
        requestKind,
        httpStatus: response.status,
        ok: response.ok,
        responseSha256,
        rawResponseStored: false,
        secretStored: false,
      },
    );
    await settleRecoveryExternalRequest({
      recoveryLedgerPath: input.recoveryLedgerPath,
      recoveryPlan: input.recoveryPlan,
      requestIndex,
      status: response.ok
        ? "ACCEPTED"
        : "FAILED_NOT_BILLED",
      actualCostUsd: 0,
      issueCodes: response.ok
        ? []
        : [`HTTP_${String(response.status)}`],
      responseSha256,
      latencyMs: Date.now() - startedAt,
      now: input.now,
    });
    if (!response.ok) {
      throw new Error(
        `${requestKind} HTTP ${String(response.status)}; recovery inference did not start`,
      );
    }
    return {
      json: parsed.json,
      requestIndex,
    };
  };
  const keyResult = await metadataRequest(
    "KEY_PREFLIGHT",
    KEY_PREFLIGHT_ENDPOINT,
  );
  const keyEnvelope = keyResult.json;
  const keyData =
    isRecord(keyEnvelope) && isRecord(keyEnvelope.data)
      ? keyEnvelope.data
      : undefined;
  const requiredRemaining =
    RECOVERY_MAXIMUM_USD -
    PRIOR_PAID_ACTUAL_COST_USD;
  const keyTypeVerified =
    keyData?.is_management_key === false ||
    keyData?.is_provisioning_key === false;
  const managementOnly =
    keyData?.is_management_key === true ||
    keyData?.is_provisioning_key === true;
  const keyValid =
    keyData !== undefined &&
    keyData.disabled !== true &&
    keyData.is_active !== false &&
    keyTypeVerified &&
    !managementOnly &&
    typeof keyData.limit === "number" &&
    Number.isFinite(keyData.limit) &&
    keyData.limit > 0 &&
    keyData.limit <= RECOVERY_MAXIMUM_USD &&
    typeof keyData.limit_remaining === "number" &&
    Number.isFinite(keyData.limit_remaining) &&
    keyData.limit_remaining + 1e-12 >=
      requiredRemaining &&
    (keyData.expires_at === null ||
      (typeof keyData.expires_at === "string" &&
        Date.parse(keyData.expires_at) >
          Date.parse(input.now())));
  if (!keyValid) {
    throw new Error(
      `Recovery key preflight requires an active inference key with configured limit <= USD 10 and remaining limit >= USD ${requiredRemaining.toFixed(
        5,
      )}`,
    );
  }
  const modelsResult = await metadataRequest(
    "MODELS_PREFLIGHT",
    MODELS_PREFLIGHT_ENDPOINT,
  );
  const modelsEnvelope = modelsResult.json;
  const models =
    isRecord(modelsEnvelope) &&
    Array.isArray(modelsEnvelope.data)
      ? modelsEnvelope.data
      : [];
  const model = models.find(
    (candidate) =>
      isRecord(candidate) && candidate.id === MODEL_ID,
  );
  const architecture =
    isRecord(model) && isRecord(model.architecture)
      ? model.architecture
      : undefined;
  const pricing =
    isRecord(model) && isRecord(model.pricing)
      ? model.pricing
      : undefined;
  const supportedParameters =
    isRecord(model) &&
    Array.isArray(model.supported_parameters)
      ? model.supported_parameters
      : [];
  if (
    !isRecord(model) ||
    model.context_length !==
      MODEL_CONTEXT_WINDOW_TOKENS ||
    !Array.isArray(architecture?.input_modalities) ||
    !architecture.input_modalities.includes("audio") ||
    !supportedParameters.includes("max_tokens") ||
    Number(pricing?.prompt) !== 0.0000025 ||
    Number(pricing?.audio) !== 0.000032 ||
    Number(pricing?.completion) !== 0.00001
  ) {
    throw new Error(
      "Recovery model capability or pricing drifted before inference",
    );
  }
  const forcedToolCapability =
    supportedParameters.includes("tools") &&
    supportedParameters.includes("tool_choice")
      ? "SUPPORTED"
      : "UNKNOWN";
  await appendResponseRecoveryLedgerEvent(
    input.recoveryLedgerPath,
    input.recoveryPlan.recoveryPlanHash,
    "RECOVERY_FORCED_TOOL_CAPABILITY_DETERMINED",
    {
      modelsPreflightRequestIndex:
        modelsResult.requestIndex,
      forcedToolCapability,
      source:
        "OPENROUTER_MODELS_SUPPORTED_PARAMETERS",
      paidInferenceRequestsMade: 0,
    },
    input.now,
  );
  return {
    forcedToolCapability,
    capabilityEvidenceRequestIndex:
      modelsResult.requestIndex,
  };
}

interface RecoveryJudgeExecutionResult {
  requestIndex: number;
  status:
    | "ACCEPTED"
    | "TOOL_CALL_UNSUPPORTED"
    | "REJECTED_BILLED"
    | "UNCERTAIN_PAID";
  run?: AiValidatedJudgeRun;
  acceptedIdentity?: {
    perspectiveId: ResponseRecoveryPerspectiveId;
    openRouterRequestId: string;
    rawResponseSha256: string;
  };
}

async function executeRecoveryJudgeRequest(input: {
  frozen: FrozenInput;
  sourcePairs: readonly AiBlindSourcePair[];
  priorAssignments: readonly AiBlindJudgeAssignment[];
  priorRecoveryRandomizations: readonly FreshRecoveryRandomization[];
  randomization: FreshRecoveryRandomization;
  formatMode:
    | "FORCED_TOOL_CALL"
    | "PLAIN_JSON_FALLBACK_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION";
  fallbackOfRequestIndex?: number;
  secret: string;
  recoveryPlan: ResponseRecoveryPlan;
  recoveryLedgerPath: string;
  privateRecordsDirectory: string;
  acceptedResponsesDirectory: string;
  fetchImpl: NonNullable<
    AiAudioEvaluationDependencies["fetchImpl"]
  >;
  now: () => string;
}): Promise<RecoveryJudgeExecutionResult> {
  const userContent = await recoveryAudioContent(
    input.frozen,
    input.randomization,
  );
  const prompt = buildRecoveryJudgePrompt(
    input.randomization.assignment,
  );
  const request = buildRecoveryReplacementRequestBody({
    randomization: input.randomization,
    evaluationPackageId: EVALUATION_PACKAGE_ID,
    sourcePairs: input.sourcePairs,
    priorAssignments: input.priorAssignments,
    priorRecoveryRandomizations:
      input.priorRecoveryRandomizations,
    prompt,
    userContent,
    formatMode: input.formatMode,
    fallbackOfRequestIndex:
      input.fallbackOfRequestIndex,
    confirmedUnbilledToolCallRequestIndex:
      input.fallbackOfRequestIndex,
  });
  const mode: RecoveryJudgeRequestMode =
    input.formatMode === "FORCED_TOOL_CALL"
      ? "PRIMARY_FORCED_TOOL_CALL"
      : "UNBILLED_PLAIN_JSON_FALLBACK";
  const requestIndex =
    await reserveRecoveryExternalRequest({
      recoveryLedgerPath: input.recoveryLedgerPath,
      recoveryPlan: input.recoveryPlan,
      requestKind: "JUDGE",
      maximumPossibleCostUsd:
        PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
      perspectiveId:
        input.randomization.perspectiveId,
      mode,
      fallbackOfRequestIndex:
        input.fallbackOfRequestIndex,
      now: input.now,
    });
  const prefix = `${String(requestIndex).padStart(
    2,
    "0",
  )}-${input.randomization.perspectiveId}-${mode.toLocaleLowerCase(
    "en-US",
  )}`;
  await writeNewJson(
    resolve(
      input.privateRecordsDirectory,
      `${prefix}-request.json`,
    ),
    {
      ...request.redactedRequestRecord,
      requestIndex,
    },
  );
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    10 * 60 * 1_000,
  );
  const startedAt = Date.now();
  let response: FetchResponseLike;
  let rawBody: string;
  try {
    response = await input.fetchImpl(
      CHAT_COMPLETIONS_ENDPOINT,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.secret}`,
          "Content-Type": "application/json",
          ...OPENROUTER_ATTRIBUTION_HEADERS,
        },
        body: JSON.stringify(request.body),
        signal: controller.signal,
      },
    );
    rawBody = await response.text();
  } catch (error) {
    await settleRecoveryExternalRequest({
      recoveryLedgerPath: input.recoveryLedgerPath,
      recoveryPlan: input.recoveryPlan,
      requestIndex,
      status: "UNCERTAIN_PAID",
      actualCostUsd: 0,
      issueCodes: [
        error instanceof Error
          ? error.name
          : "AMBIGUOUS_NETWORK_FAILURE",
      ],
      latencyMs: Date.now() - startedAt,
      now: input.now,
    });
    return {
      requestIndex,
      status: "UNCERTAIN_PAID",
    };
  } finally {
    clearTimeout(timeout);
  }
  const latencyMs = Date.now() - startedAt;
  const rawResponsePath = resolve(
    input.privateRecordsDirectory,
    `${prefix}-raw-response.txt`,
  );
  const persisted =
    await persistProviderHttpBodyBeforeSemanticParse({
      path: rawResponsePath,
      rawBody,
      secret: input.secret,
    });
  const responseSha256 = persisted.rawBodySha256;
  const loggedHeaders = safeResponseHeaders(
    response.headers,
  );
  await appendResponseRecoveryLedgerEvent(
    input.recoveryLedgerPath,
    input.recoveryPlan.recoveryPlanHash,
    "RECOVERY_RAW_RESPONSE_PERSISTED",
    {
      requestIndex,
      perspectiveId:
        input.randomization.perspectiveId,
      mode,
      httpStatus: response.status,
      rawBodySha256: persisted.rawBodySha256,
      artifactBodySha256:
        persisted.artifactBodySha256,
      rawBodyBytes: persisted.rawBodyBytes,
      artifactBodyBytes:
        persisted.artifactBodyBytes,
      exactRawBodyStored:
        persisted.exactRawBodyStored,
      sanitizedArtifactStored:
        persisted.sanitizedArtifactStored,
      inputAudioRedacted:
        persisted.inputAudioRedacted,
      inputAudioRedactionCount:
        persisted.inputAudioRedactionCount,
      safeResponseHeaders: loggedHeaders,
      semanticParseStarted: false,
    },
    input.now,
  );
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody) as unknown;
  } catch {
    parsedJson = undefined;
  }
  const envelope = isRecord(parsedJson)
    ? (parsedJson as ChatCompletionEnvelope)
    : {};
  const usage = usageCostFromResponse(envelope);
  const openRouterRequestId =
    typeof envelope.id === "string" &&
    envelope.id.trim() !== ""
      ? envelope.id
      : response.headers?.get("x-request-id") ?? null;
  await writeNewJson(
    resolve(
      input.privateRecordsDirectory,
      `${prefix}-response-metadata.json`,
    ),
    {
      schemaVersion:
        "tenxpros-phase2c-recovery-private-api-response-v1",
      requestIndex,
      perspectiveId:
        input.randomization.perspectiveId,
      httpStatus: response.status,
      ok: response.ok,
      responseSha256,
      artifactBodySha256:
        persisted.artifactBodySha256,
      rawBodyBytes: persisted.rawBodyBytes,
      artifactBodyBytes:
        persisted.artifactBodyBytes,
      exactRawBodyStored:
        persisted.exactRawBodyStored,
      sanitizedArtifactStored:
        persisted.sanitizedArtifactStored,
      inputAudioRedacted:
        persisted.inputAudioRedacted,
      inputAudioRedactionCount:
        persisted.inputAudioRedactionCount,
      safeResponseHeaders: loggedHeaders,
      rawResponseRelativePath:
        `${prefix}-raw-response.txt`,
      rawResponseStored:
        persisted.exactRawBodyStored,
      sanitizedResponseArtifactStored:
        persisted.sanitizedArtifactStored,
      rawResponseMode: "0600",
      openRouterRequestId,
      usage,
      secretStored: false,
      requestAudioStored: false,
    },
  );
  if (response.status === 402) {
    const billed =
      usage !== null &&
      usage.openRouterCostUsd > 0;
    await settleRecoveryExternalRequest({
      recoveryLedgerPath: input.recoveryLedgerPath,
      recoveryPlan: input.recoveryPlan,
      requestIndex,
      status: billed
        ? "REJECTED_BILLED"
        : "FAILED_NOT_BILLED",
      actualCostUsd:
        usage?.openRouterCostUsd ?? 0,
      issueCodes: ["HTTP_402_INSUFFICIENT_CREDIT"],
      usage,
      openRouterRequestId,
      responseSha256,
      latencyMs,
      now: input.now,
    });
    throw new Error(
      "HTTP_402_INSUFFICIENT_CREDIT; recovery stops fail-closed and no later perspective or retry may be sent",
    );
  }
  if (
    mode === "PRIMARY_FORCED_TOOL_CALL" &&
    confirmedUnbilledForcedToolRejection({
      status: response.status,
      rawBody,
      usage,
    })
  ) {
    await settleRecoveryExternalRequest({
      recoveryLedgerPath: input.recoveryLedgerPath,
      recoveryPlan: input.recoveryPlan,
      requestIndex,
      status: "FAILED_NOT_BILLED",
      actualCostUsd: 0,
      issueCodes: [
        "FORCED_TOOL_CALL_UNSUPPORTED",
      ],
      usage,
      openRouterRequestId,
      responseSha256,
      latencyMs,
      now: input.now,
    });
    return {
      requestIndex,
      status: "TOOL_CALL_UNSUPPORTED",
    };
  }
  if (!usage) {
    await settleRecoveryExternalRequest({
      recoveryLedgerPath: input.recoveryLedgerPath,
      recoveryPlan: input.recoveryPlan,
      requestIndex,
      status: "UNCERTAIN_PAID",
      actualCostUsd: 0,
      issueCodes: [
        response.status === 402
          ? "HTTP_402"
          : "MISSING_OPENROUTER_USAGE_COST",
      ],
      openRouterRequestId,
      responseSha256,
      latencyMs,
      now: input.now,
    });
    return {
      requestIndex,
      status: "UNCERTAIN_PAID",
    };
  }
  if (!response.ok) {
    await settleRecoveryExternalRequest({
      recoveryLedgerPath: input.recoveryLedgerPath,
      recoveryPlan: input.recoveryPlan,
      requestIndex,
      status: "REJECTED_BILLED",
      actualCostUsd: usage.openRouterCostUsd,
      issueCodes: [`HTTP_${String(response.status)}`],
      usage,
      openRouterRequestId,
      responseSha256,
      latencyMs,
      now: input.now,
    });
    return {
      requestIndex,
      status: "REJECTED_BILLED",
    };
  }
  if (!openRouterRequestId) {
    await settleRecoveryExternalRequest({
      recoveryLedgerPath: input.recoveryLedgerPath,
      recoveryPlan: input.recoveryPlan,
      requestIndex,
      status: "REJECTED_BILLED",
      actualCostUsd: usage.openRouterCostUsd,
      issueCodes: [
        "MISSING_OPENROUTER_RESPONSE_ID",
      ],
      usage,
      responseSha256,
      latencyMs,
      now: input.now,
    });
    return {
      requestIndex,
      status: "REJECTED_BILLED",
    };
  }
  const recovery = recoverAiAudioJudgeResponse({
    responseId: openRouterRequestId,
    response:
      mode === "PRIMARY_FORCED_TOOL_CALL"
        ? recoveryToolArguments(envelope)
        : recoveryJsonContent(envelope),
    assignment: recoveryAssignmentFromBlind(
      input.randomization.assignment,
    ),
  });
  await writeNewJson(
    resolve(
      input.acceptedResponsesDirectory,
      `${input.randomization.perspectiveId}-request-${String(
        requestIndex,
      )}.json`,
    ),
    {
      schemaVersion:
        "tenxpros-phase2c-recovery-normalized-response-v1",
      requestIndex,
      perspectiveId:
        input.randomization.perspectiveId,
      responseSha256,
      rawResponseRelativePath: `private/recovery-api-records/${prefix}-raw-response.txt`,
      recovery,
    },
  );
  if (!recovery.valid) {
    await settleRecoveryExternalRequest({
      recoveryLedgerPath: input.recoveryLedgerPath,
      recoveryPlan: input.recoveryPlan,
      requestIndex,
      status: "REJECTED_BILLED",
      actualCostUsd: usage.openRouterCostUsd,
      issueCodes: recovery.issues.map(
        (item) => item.code,
      ),
      usage,
      openRouterRequestId,
      responseSha256,
      latencyMs,
      now: input.now,
    });
    return {
      requestIndex,
      status: "REJECTED_BILLED",
    };
  }
  const legacy = toLegacyAiJudgeResponse(
    recovery.response,
    recoveryAssignmentFromBlind(
      input.randomization.assignment,
    ),
  );
  const validated = validateJudgeResponse(
    legacy,
    input.randomization.assignment,
    {
      attemptNumber: 1,
      clearlyDistinctSourcePairIds: [],
    },
  );
  if (!validated.valid) {
    await settleRecoveryExternalRequest({
      recoveryLedgerPath: input.recoveryLedgerPath,
      recoveryPlan: input.recoveryPlan,
      requestIndex,
      status: "REJECTED_BILLED",
      actualCostUsd: usage.openRouterCostUsd,
      issueCodes: validated.issues.map(
        (item) => item.code,
      ),
      usage,
      openRouterRequestId,
      responseSha256,
      latencyMs,
      now: input.now,
    });
    return {
      requestIndex,
      status: "REJECTED_BILLED",
    };
  }
  await settleRecoveryExternalRequest({
    recoveryLedgerPath: input.recoveryLedgerPath,
    recoveryPlan: input.recoveryPlan,
    requestIndex,
    status: "ACCEPTED",
    actualCostUsd: usage.openRouterCostUsd,
    issueCodes: [],
    usage,
    openRouterRequestId,
    responseSha256,
    latencyMs,
    now: input.now,
  });
  return {
    requestIndex,
    status: "ACCEPTED",
    run: {
      assignment: input.randomization.assignment,
      response: validated.response,
      responseHash: validated.responseHash,
    },
    acceptedIdentity: {
      perspectiveId:
        input.randomization.perspectiveId,
      openRouterRequestId,
      rawResponseSha256: responseSha256,
    },
  };
}

async function loadOfflineRecoveredJudgeRuns(input: {
  outputDirectory: string;
  recoveryPlan: ResponseRecoveryPlan;
  priorAssignments: readonly AiBlindJudgeAssignment[];
}): Promise<{
  runs: AiValidatedJudgeRun[];
  identities: {
    perspectiveId: ResponseRecoveryPerspectiveId;
    responseId: string;
    responseHash: string;
    source: "OFFLINE_RECOVERED";
  }[];
}> {
  if (
    input.recoveryPlan.recoveredPerspectiveCount === 0
  ) {
    return { runs: [], identities: [] };
  }
  const directory = resolve(
    input.outputDirectory,
    "recovered-ai-judge-responses",
  );
  const filenames = (
    await readdir(directory)
  ).filter((filename) => filename.endsWith(".json"));
  const artifacts = await Promise.all(
    filenames.map(async (filename) => {
      const value = JSON.parse(
        await readFile(resolve(directory, filename), "utf8"),
      ) as unknown;
      if (
        !isRecord(value) ||
        typeof value.originalResponseId !== "string" ||
        typeof value.originalResponseSha256 !==
          "string" ||
        typeof value.recoveredResponseSha256 !==
          "string" ||
        !Array.isArray(value.provenance) ||
        !isRecord(value.recoveredResponse)
      ) {
        throw new Error(
          "Offline recovered response artifact is invalid",
        );
      }
      return value;
    }),
  );
  const recoveryLedgerPath = resolve(
    input.outputDirectory,
    "response-recovery-ledger.jsonl",
  );
  const recoveryLedger =
    await readResponseRecoveryLedger(
      recoveryLedgerPath,
    );
  verifyResponseRecoveryLedger(
    recoveryLedger,
    input.recoveryPlan.recoveryPlanHash,
  );
  const runs: AiValidatedJudgeRun[] = [];
  const identities: {
    perspectiveId: ResponseRecoveryPerspectiveId;
    responseId: string;
    responseHash: string;
    source: "OFFLINE_RECOVERED";
  }[] = [];
  for (const perspectiveId of input.recoveryPlan
    .recoveredPerspectiveIds) {
    const selectedEvents = recoveryLedger.filter(
      (entry) =>
        entry.event ===
          "INDEPENDENT_RESPONSE_SELECTED" &&
        entry.data.perspectiveId === perspectiveId,
    );
    const selectedEvent = selectedEvents[0];
    const requestIndex =
      selectedEvent?.data.requestIndex;
    const selectedRecoveredHash =
      selectedEvent?.data.recoveredResponseSha256;
    const auditedEvent = recoveryLedger.find(
      (entry) =>
        entry.event === "OFFLINE_RESPONSE_AUDITED" &&
        entry.data.requestIndex === requestIndex &&
        entry.data.perspectiveId === perspectiveId &&
        entry.data.recoveredResponseSha256 ===
          selectedRecoveredHash,
    );
    const candidates = artifacts.filter(
      (artifact) =>
        artifact.recoveredResponseSha256 ===
          selectedRecoveredHash &&
        artifact.originalResponseId ===
          auditedEvent?.data.originalResponseId &&
        artifact.originalResponseSha256 ===
          auditedEvent?.data.ledgerResponseSha256,
    );
    const assignment = input.priorAssignments.find(
      (candidate) =>
        candidate.judgeId === perspectiveId,
    );
    if (
      selectedEvents.length !== 1 ||
      typeof requestIndex !== "number" ||
      typeof selectedRecoveredHash !== "string" ||
      !auditedEvent ||
      candidates.length !== 1 ||
      !assignment
    ) {
      throw new Error(
        `Recovered perspective ${perspectiveId} must have one artifact and one original assignment`,
      );
    }
    const artifact = candidates[0]!;
    if (
      !Array.isArray(artifact.provenance) ||
      artifact.provenance.length === 0 ||
      artifact.provenance.some(
        (entry) =>
          !isRecord(entry) ||
          entry.originalResponseId !==
            artifact.originalResponseId,
      )
    ) {
      throw new Error(
        "Selected offline response provenance is missing or bound to another response",
      );
    }
    const recovered =
      artifact.recoveredResponse as AiAudioRecoveredJudgeResponse;
    if (
      hashAiValue(recovered) !==
      artifact.recoveredResponseSha256
    ) {
      throw new Error(
        "Offline recovered response hash changed before aggregation",
      );
    }
    const legacy = toLegacyAiJudgeResponse(
      recovered,
      recoveryAssignmentFromBlind(assignment),
    );
    const validated = validateJudgeResponse(
      legacy,
      assignment,
      {
        attemptNumber: 1,
        clearlyDistinctSourcePairIds: [],
      },
    );
    if (!validated.valid) {
      throw new Error(
        `Offline recovered perspective ${perspectiveId} is not valid for aggregation`,
      );
    }
    runs.push({
      assignment,
      response: validated.response,
      responseHash: validated.responseHash,
    });
    identities.push({
      perspectiveId,
      responseId:
        artifact.originalResponseId as string,
      responseHash:
        artifact.recoveredResponseSha256 as string,
      source: "OFFLINE_RECOVERED",
    });
  }
  if (
    new Set(
      identities.map((identity) => identity.responseId),
    ).size !== identities.length ||
    new Set(
      identities.map((identity) => identity.responseHash),
    ).size !== identities.length
  ) {
    throw new Error(
      "Offline recovered runs contain duplicate response IDs or hashes",
    );
  }
  return { runs, identities };
}

async function executeResponseRecoveryPlan(input: {
  recoveryPlan: ResponseRecoveryPlan;
  outputDirectory?: string;
  secret: string;
  fetchImpl?: NonNullable<
    AiAudioEvaluationDependencies["fetchImpl"]
  >;
  now?: () => string;
}): Promise<{
  status: "COMPLETE" | "INCOMPLETE";
  validIndependentJudgeCount: number;
  primaryDecision:
    | ReturnType<typeof decideLocalNarration>["primaryDecision"]
    | "INCONCLUSIVE_AI_ONLY_EVALUATION";
  cumulativeActualCostUsd: number;
  cumulativeExternalRequests: number;
}> {
  const outputDirectory = resolve(
    input.outputDirectory ?? DEFAULT_OUTPUT,
  );
  const now =
    input.now ?? (() => new Date().toISOString());
  const fetchImpl = input.fetchImpl ?? defaultFetch;
  const frozen = await loadFrozenInput();
  const priorPlan = JSON.parse(
    await readFile(
      resolve(outputDirectory, "ai-evaluation-plan.json"),
      "utf8",
    ),
  ) as AiEvaluationPlan;
  const priorManifest = JSON.parse(
    await readFile(
      resolve(outputDirectory, "private-ai-manifest.json"),
      "utf8",
    ),
  ) as PrivateAiManifest;
  if (priorPlan.planHash !== PRIOR_PAID_PLAN_HASH) {
    throw new Error(
      "Recovery executor prior plan hash changed",
    );
  }
  assertPrivateManifestHashInvariant(
    priorPlan,
    priorManifest,
  );
  const priorAssignments =
    priorManifest.judgeAssignments;
  const sourcePairs =
    recoverySourcePairsFromFrozen(frozen);
  const recoveryLedgerPath = resolve(
    outputDirectory,
    "response-recovery-ledger.jsonl",
  );
  const privateRecordsDirectory = resolve(
    outputDirectory,
    "private",
    "recovery-api-records",
  );
  const privateRandomizationsDirectory = resolve(
    outputDirectory,
    "private",
    "recovery-randomizations",
  );
  const acceptedResponsesDirectory = resolve(
    outputDirectory,
    "recovery-replacement-responses",
  );
  for (const path of [
    privateRecordsDirectory,
    privateRandomizationsDirectory,
    acceptedResponsesDirectory,
  ]) {
    await mkdir(path, {
      recursive: false,
      mode: 0o700,
    });
  }
  const offlineRecovered =
    await loadOfflineRecoveredJudgeRuns({
      outputDirectory,
      recoveryPlan: input.recoveryPlan,
      priorAssignments,
    });
  const preflight =
    input.recoveryPlan.missingPerspectiveCount > 0
      ? await executeRecoveryMetadataPreflight({
          secret: input.secret,
          recoveryPlan: input.recoveryPlan,
          recoveryLedgerPath,
          privateRecordsDirectory,
          fetchImpl,
          now,
        })
      : {
          forcedToolCapability:
            "UNKNOWN" as const,
          capabilityEvidenceRequestIndex: 0,
        };
  const runs: AiValidatedJudgeRun[] = [
    ...offlineRecovered.runs,
  ];
  const acceptedIdentities: NonNullable<
    RecoveryJudgeExecutionResult["acceptedIdentity"]
  >[] = [];
  const randomizations: FreshRecoveryRandomization[] =
    [];
  let globalFallbackRequestIndex: number | undefined =
    preflight.forcedToolCapability ===
    "UNSUPPORTED"
      ? preflight.capabilityEvidenceRequestIndex
      : undefined;
  for (const perspectiveId of input.recoveryPlan
    .missingPerspectiveIds) {
    const randomization =
      buildFreshRecoveryRandomization({
        perspectiveId,
        evaluationPackageId: EVALUATION_PACKAGE_ID,
        sourcePairs,
        priorAssignments,
        priorRecoveryRandomizations: randomizations,
      });
    await writeNewJson(
      resolve(
        privateRandomizationsDirectory,
        `${perspectiveId}.json`,
      ),
      randomization,
    );
    const primary = await executeRecoveryJudgeRequest({
      frozen,
      sourcePairs,
      priorAssignments,
      priorRecoveryRandomizations: randomizations,
      randomization,
      formatMode:
        globalFallbackRequestIndex === undefined
          ? "FORCED_TOOL_CALL"
          : "PLAIN_JSON_FALLBACK_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
      fallbackOfRequestIndex:
        globalFallbackRequestIndex,
      secret: input.secret,
      recoveryPlan: input.recoveryPlan,
      recoveryLedgerPath,
      privateRecordsDirectory,
      acceptedResponsesDirectory,
      fetchImpl,
      now,
    });
    let final = primary;
    if (
      primary.status === "TOOL_CALL_UNSUPPORTED"
    ) {
      globalFallbackRequestIndex = primary.requestIndex;
      final = await executeRecoveryJudgeRequest({
        frozen,
        sourcePairs,
        priorAssignments,
        priorRecoveryRandomizations: randomizations,
        randomization,
        formatMode:
          "PLAIN_JSON_FALLBACK_AFTER_CONFIRMED_UNBILLED_TOOL_REJECTION",
        fallbackOfRequestIndex:
          globalFallbackRequestIndex,
        secret: input.secret,
        recoveryPlan: input.recoveryPlan,
        recoveryLedgerPath,
        privateRecordsDirectory,
        acceptedResponsesDirectory,
        fetchImpl,
        now,
      });
    }
    randomizations.push(randomization);
    if (final.run && final.acceptedIdentity) {
      runs.push(final.run);
      acceptedIdentities.push(
        final.acceptedIdentity,
      );
    }
  }
  const entries = await readResponseRecoveryLedger(
    recoveryLedgerPath,
  );
  const accounting = recoveryRequestAccounting(entries);
  const cumulativeActualCostUsd = ceilingUsd(
    PRIOR_PAID_ACTUAL_COST_USD +
      accounting.newKnownActualCostUsd,
  );
  const cumulativeExternalRequests =
    PRIOR_PAID_EXTERNAL_REQUESTS +
    accounting.newExternalRequestsUsed;
  let primaryDecision:
    | ReturnType<typeof decideLocalNarration>["primaryDecision"]
    | "INCONCLUSIVE_AI_ONLY_EVALUATION" =
    "INCONCLUSIVE_AI_ONLY_EVALUATION";
  if (runs.length === 5) {
    const combinedPerspectiveIds = [
      ...offlineRecovered.identities.map(
        (identity) => identity.perspectiveId,
      ),
      ...acceptedIdentities.map(
        (identity) => identity.perspectiveId,
      ),
    ];
    const combinedResponseIds = [
      ...offlineRecovered.identities.map(
        (identity) => identity.responseId,
      ),
      ...acceptedIdentities.map(
        (identity) =>
          identity.openRouterRequestId,
      ),
    ];
    const combinedResponseHashes = [
      ...offlineRecovered.identities.map(
        (identity) => identity.responseHash,
      ),
      ...acceptedIdentities.map(
        (identity) =>
          identity.rawResponseSha256,
      ),
    ];
    if (
      new Set(combinedPerspectiveIds).size !== 5 ||
      new Set(combinedResponseIds).size !== 5 ||
      new Set(combinedResponseHashes).size !== 5 ||
      new Set(
        acceptedIdentities.map(
          (identity) => identity.perspectiveId,
        ),
      ).size !== acceptedIdentities.length ||
      new Set(
        acceptedIdentities.map(
          (identity) =>
            identity.openRouterRequestId,
        ),
      ).size !== acceptedIdentities.length ||
      new Set(
        acceptedIdentities.map(
          (identity) =>
            identity.rawResponseSha256,
        ),
      ).size !== acceptedIdentities.length
    ) {
      throw new Error(
        "Five accepted recovery runs must have unique perspectives, OpenRouter response IDs, and exact raw-response hashes",
      );
    }
    const objectiveArtifact = JSON.parse(
      await readFile(
        resolve(
          outputDirectory,
          "objective-audio-analysis.json",
        ),
        "utf8",
      ),
    ) as EnrichedObjectiveArtifact;
    const objective = objectiveSummaryFromArtifact(
      frozen,
      objectiveArtifact,
    );
    const identities = identityRecords(frozen);
    const panel = aggregateAiPanel({
      evaluationPackageId: EVALUATION_PACKAGE_ID,
      runs,
      privateSamples: identities,
      objective,
    });
    const metrics = deriveBryceDecisionMetrics({
      analysis: panel,
      privateSamples: identities,
      correctedCandidateId: "bryce-corrected",
      baselineCandidateId: "bryce-baseline",
    });
    const decision = decideLocalNarration({
      bryce: metrics,
    });
    primaryDecision = decision.primaryDecision;
    await writeNewJson(
      resolve(
        outputDirectory,
        "recovery-ai-panel-analysis.json",
      ),
      {
        schemaVersion:
          "tenxpros-phase2c-recovery-ai-panel-v1",
        recoveryPlanHash:
          input.recoveryPlan.recoveryPlanHash,
        panel,
        metrics,
        decision,
      },
    );
  }
  await writeNewJson(
    resolve(
      outputDirectory,
      "response-recovery-cost-report.json",
    ),
    {
      schemaVersion:
        "tenxpros-phase2c-response-recovery-cost-report-v1",
      priorActualCostUsd:
        PRIOR_PAID_ACTUAL_COST_USD,
      newActualCostUsd:
        accounting.newKnownActualCostUsd,
      newUncertainMaximumCostUsd:
        accounting.newUncertainMaximumCostUsd,
      cumulativeActualCostUsd,
      cumulativeCapAccountedCostUsd: ceilingUsd(
        cumulativeActualCostUsd +
          accounting.newUncertainMaximumCostUsd,
      ),
      priorExternalRequests:
        PRIOR_PAID_EXTERNAL_REQUESTS,
      newExternalRequests:
        accounting.newExternalRequestsUsed,
      cumulativeExternalRequests,
      maximumUsd: RECOVERY_MAXIMUM_USD,
      maximumExternalRequests:
        RECOVERY_MAXIMUM_EXTERNAL_REQUESTS,
      zeroElevenLabsCalls: true,
      zeroDirectOpenAiCalls: true,
    },
  );
  await appendResponseRecoveryLedgerEvent(
    recoveryLedgerPath,
    input.recoveryPlan.recoveryPlanHash,
    runs.length === 5
      ? "RECOVERY_PANEL_COMPLETED"
      : "RECOVERY_PANEL_INCOMPLETE",
    {
      validIndependentJudgeCount: runs.length,
      primaryDecision,
      cumulativeActualCostUsd,
      cumulativeExternalRequests,
      uncertainMaximumCostUsd:
        accounting.newUncertainMaximumCostUsd,
    },
    now,
  );
  return {
    status:
      runs.length === 5 ? "COMPLETE" : "INCOMPLETE",
    validIndependentJudgeCount: runs.length,
    primaryDecision,
    cumulativeActualCostUsd,
    cumulativeExternalRequests,
  };
}

export function assertPaidAuthorization(
  options: AiAudioEvaluationCliOptions,
  plan: AiEvaluationPlan,
): void {
  const suppliedAny =
    options.allowPaid ||
    options.suppliedMaxUsd !== undefined ||
    options.suppliedMaxRequests !== undefined;
  const suppliedAll =
    options.allowPaid &&
    options.suppliedMaxUsd !== undefined &&
    options.suppliedMaxRequests !== undefined;
  if (!suppliedAny) return;
  if (!suppliedAll) {
    throw new Error(
      "Paid execution requires all three exact authorization flags",
    );
  }
  if (
    options.suppliedMaxUsd !== String(HARD_MAX_USD) ||
    options.suppliedMaxRequests !==
      String(plan.judges.maximumApiRequests) ||
    plan.cost.executableEnvelopeMaximumUsd !==
      HARD_MAX_USD ||
    plan.judges.maximumApiRequests !== 17
  ) {
    throw new Error(
      "Paid authorization does not exactly match the frozen plan",
    );
  }
}

export function assertResponseRecoveryPaidAuthorization(
  options: AiAudioEvaluationCliOptions,
): void {
  if (
    !options.executeResponseRecovery ||
    !options.allowPaid ||
    options.suppliedMaxUsd !==
      String(RECOVERY_MAXIMUM_USD) ||
    options.suppliedMaxRequests !==
      String(RECOVERY_MAXIMUM_EXTERNAL_REQUESTS)
  ) {
    throw new Error(
      "Paid response recovery requires --execute-response-recovery and the exact cumulative --max-usd 10 --max-requests 24 authorization",
    );
  }
}

function hasPaidIntent(
  options: AiAudioEvaluationCliOptions,
): boolean {
  return (
    options.allowPaid ||
    options.suppliedMaxUsd !== undefined ||
    options.suppliedMaxRequests !== undefined
  );
}

async function secretIsPresent(): Promise<boolean> {
  try {
    const metadata = await lstat(SECRET_PATH);
    const processUid = process.getuid?.();
    return (
      metadata.isFile() &&
      !metadata.isSymbolicLink() &&
      (metadata.mode & 0o777) === 0o400 &&
      (processUid === undefined || metadata.uid === processUid)
    );
  } catch {
    return false;
  }
}

async function readOpenRouterSecretFileAfterAllGates(
  path: string,
): Promise<string> {
  const handle = await open(
    path,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const metadata = await handle.stat();
    const processUid = process.getuid?.();
    if (
      !metadata.isFile() ||
      (metadata.mode & 0o777) !== 0o400 ||
      (processUid !== undefined && metadata.uid !== processUid)
    ) {
      throw new Error(
        `OpenRouter secret must be a regular, non-symlink, process-owned mode-0400 file at ${path}`,
      );
    }
    const secret = (await handle.readFile("utf8")).trim();
    if (
      !secret ||
      secret.length > 4_096 ||
      !secret.startsWith("sk-or-v1-")
    ) {
      throw new Error(
        "OpenRouter secret is empty, oversized, or does not have the expected sk-or-v1- prefix",
      );
    }
    return secret;
  } finally {
    await handle.close();
  }
}

async function readSecretAfterAllGates(): Promise<string> {
  return readOpenRouterSecretFileAfterAllGates(SECRET_PATH);
}

async function acquireRecoveryLockThenReadSecret(input: {
  acquireLock: () => Promise<unknown>;
  readSecret: () => Promise<string>;
}): Promise<string> {
  await input.acquireLock();
  return input.readSecret();
}

function ownerAction(plan: AiEvaluationPlan): string {
  return [
    "The frozen-sample evaluation may run now and is not blocked by production-content drift. The owner has explicitly superseded the management-only /credits preflight: paid execution relies on the inference key's configured limit and limit_remaining, the CLI USD 10 cap, authoritative usage.cost settlement, and fail-closed HTTP 402 handling. Production-content reconciliation is deferred and becomes a mandatory conditional gate only after a Piper candidate passes, before any full production generation or deployment.",
    `Provision a fresh OpenRouter inference key through an ephemeral, process-isolated secret mount or credential visible only to this one-off process; it must appear as a process-owned, read-only mode 0400 file at ${SECRET_PATH}, must not be passed on the command line, and must be removed or unmounted immediately when the process exits.`,
    `The eventual command is: cd ${APP_ROOT} && pnpm exec tsx scripts/ai-audio-evaluation-cli.ts --allow-paid-ai-evaluation --max-usd 10 --max-requests ${String(
      plan.judges.maximumApiRequests,
    )}. The deterministic plan hash ${plan.planHash} is pinned internally; no second plan-hash approval is required.`,
  ].join(" ");
}

interface FullPrivateSample {
  filename: string;
  pipeline: "baseline" | "corrected";
  transcript: string;
  transcriptSha256: string;
  transcriptWordCount: number;
  recipeHash: string;
  synthesisUnits: readonly {
    id: string;
    sourceBlockId?: string;
    text: string;
    textSha256?: string;
    pauseAfterMs: number;
    pauseReason: string;
  }[];
  audio: {
    sha256: string;
    durationSeconds: number;
  };
  audit: {
    plannedSegmentIds?: readonly string[];
    synthesizedSegmentIds?: readonly string[];
    layout?: readonly {
      segmentId: string;
      pauseAfterMs: number;
      pauseEndFrame: number;
    }[];
  };
}

interface FullPrivateManifest {
  pairs: readonly {
    samples: readonly FullPrivateSample[];
  }[];
}

const ORIGINAL_PHASE2A_MANIFEST = resolve(
  REPOSITORY_ROOT,
  "scratch_academy",
  "piper-evaluation",
  "piper-semantic-v1-bryce-20260726",
  "private",
  "manifest.json",
);
const SUPPLEMENTAL_PHASE2B_MANIFEST = resolve(
  PHASE2B_PACKAGE,
  "private",
  "supplemental-manifest.json",
);

function pauseTypeForBoundary(
  filename: string,
  pauseReason: string,
  milliseconds: number,
):
  | "sentence"
  | "tableRow"
  | "list"
  | "paragraph"
  | "heading"
  | "section" {
  if (pauseReason === "sentence-boundary") {
    return "sentence";
  }
  let value:
    | "tableRow"
    | "list"
    | "paragraph"
    | "heading"
    | "section"
    | undefined;
  if (filename.startsWith("sample-02-")) {
    value = milliseconds === 400 ? "tableRow" : undefined;
  } else if (filename.startsWith("sample-05-")) {
    value = new Map([
      [280, "list"],
      [500, "paragraph"],
      [700, "heading"],
      [900, "section"],
    ] as const).get(
      milliseconds as 280 | 500 | 700 | 900,
    );
  } else if (
    pauseReason === "semantic-block-boundary"
  ) {
    value = "paragraph";
  }
  if (!value) {
    throw new Error(
      `Unsupported semantic pause: ${String(milliseconds)}ms`,
    );
  }
  return value;
}

async function loadFullPrivateSamples(): Promise<
  Map<string, FullPrivateSample>
> {
  if (
    (await sha256File(ORIGINAL_PHASE2A_MANIFEST)) !==
    "577c053ffdd9bc225f142b76dc1e98d35cb8db1529051c93285362fe69f0b75a"
  ) {
    throw new Error(
      "Referenced Phase 2A private manifest hash changed",
    );
  }
  const [original, supplemental] = await Promise.all([
    readFile(ORIGINAL_PHASE2A_MANIFEST, "utf8").then(
      (value) => JSON.parse(value) as FullPrivateManifest,
    ),
    readFile(SUPPLEMENTAL_PHASE2B_MANIFEST, "utf8").then(
      (value) => JSON.parse(value) as FullPrivateManifest,
    ),
  ]);
  const samples = [
    ...original.pairs.flatMap((pair) => pair.samples),
    ...supplemental.pairs.flatMap((pair) => pair.samples),
  ];
  const byFilename = new Map(
    samples.map((sample) => [sample.filename, sample]),
  );
  if (byFilename.size !== 10) {
    throw new Error(
      "Private synthesis evidence does not contain ten samples",
    );
  }
  return byFilename;
}

async function loadFrozenCorrectedPiperExcerpts(
  frozen: FrozenInput,
  requestedPairIds: readonly string[],
): Promise<readonly FrozenCorrectedPiperExcerpt[]> {
  const requested = new Set(requestedPairIds);
  if (
    requested.size !== requestedPairIds.length ||
    requestedPairIds.length === 0
  ) {
    throw new Error(
      "Conditional excerpt ids must be non-empty and unique",
    );
  }
  const evidence = await loadFullPrivateSamples();
  const excerpts = frozen.manifest.pairs
    .filter((pair) => requested.has(pair.pairId))
    .map((pair) => {
      const corrected = pair.samples.find(
        (sample) => sample.pipeline === "corrected",
      );
      if (!corrected) {
        throw new Error(
          `${pair.pairId}: corrected source sample is missing`,
        );
      }
      const sample = evidence.get(corrected.filename);
      if (
        !sample ||
        sample.pipeline !== "corrected" ||
        sample.audio.sha256 !== corrected.sha256 ||
        sample.audio.durationSeconds !== corrected.durationSeconds ||
        sha256(sample.transcript) !== sample.transcriptSha256
      ) {
        throw new Error(
          `${pair.pairId}: corrected synthesis evidence changed`,
        );
      }
      const segments = sample.synthesisUnits.map(
        (unit, index) => {
          if (
            !unit.sourceBlockId ||
            !unit.textSha256 ||
            sha256(unit.text) !== unit.textSha256
          ) {
            throw new Error(
              `${corrected.sampleId}/${unit.id}: source segment evidence changed`,
            );
          }
          const last =
            index === sample.synthesisUnits.length - 1;
          return {
            id: unit.id,
            sourceBlockId: unit.sourceBlockId,
            text: unit.text,
            textSha256: unit.textSha256,
            pauseAfterMs: unit.pauseAfterMs,
            pauseReason: unit.pauseReason,
            pauseType: last
              ? ("sampleEnd" as const)
              : pauseTypeForBoundary(
                  corrected.filename,
                  unit.pauseReason,
                  unit.pauseAfterMs,
                ),
          };
        },
      );
      const reconstructed = segments
        .map((segment) => segment.text)
        .join(" ")
        .replace(/\s+/gu, " ")
        .trim();
      if (
        reconstructed !==
          sample.transcript.replace(/\s+/gu, " ").trim() ||
        segments.at(-1)?.pauseAfterMs !== 0
      ) {
        throw new Error(
          `${pair.pairId}: corrected transcript reconstruction changed`,
        );
      }
      return {
        excerptId: pair.pairId,
        sourceSampleId: corrected.sampleId,
        sourceAudioSha256: corrected.sha256,
        sourceAudioDurationSeconds:
          corrected.durationSeconds,
        sourceRecipeHash: sample.recipeHash,
        transcript: sample.transcript,
        transcriptSha256: sample.transcriptSha256,
        segments,
      };
    });
  if (
    excerpts.length !== requested.size ||
    excerpts.some(
      (excerpt) => !requested.has(excerpt.excerptId),
    )
  ) {
    throw new Error(
      "Conditional corrected excerpts do not match the requested frozen pairs",
    );
  }
  return excerpts.sort((left, right) =>
    left.excerptId.localeCompare(right.excerptId),
  );
}

async function buildObjectivePlan(
  frozen: FrozenInput,
): Promise<{
  schemaVersion: "tenxpros-phase2c-objective-audio-plan-v1";
  analysisId: string;
  samples: readonly {
    id: string;
    path: string;
    expectedSha256: string;
    referenceWordCount: number;
    stitchBoundaries: readonly {
      id: string;
      seconds: number;
      expectedPauseMs: number;
      pauseType:
        | "sentence"
        | "tableRow"
        | "list"
        | "paragraph"
        | "heading"
        | "section";
    }[];
  }[];
}> {
  const evidence = await loadFullPrivateSamples();
  return {
    schemaVersion:
      "tenxpros-phase2c-objective-audio-plan-v1",
    analysisId: "phase2c-bryce-objective-20260726",
    samples: frozen.audio.map((audio) => {
      const sample = evidence.get(audio.filename);
      if (
        !sample ||
        sample.transcriptWordCount <= 0 ||
        sample.audio.sha256 !== audio.sha256
      ) {
        throw new Error(
          `${audio.filename}: private synthesis evidence mismatch`,
        );
      }
      const positiveLayout =
        sample.pipeline === "corrected"
          ? (sample.audit.layout ?? []).filter(
              (boundary) => boundary.pauseAfterMs > 0,
            )
          : [];
      const unitById = new Map(
        sample.synthesisUnits.map((unit) => [unit.id, unit]),
      );
      return {
        id: audio.sampleId,
        path: `/scratch_academy/piper-listening/phase2b-bryce-20260726/listener-package/audio/${audio.filename}`,
        expectedSha256: audio.sha256,
        referenceWordCount: sample.transcriptWordCount,
        stitchBoundaries: positiveLayout.map(
          (boundary, index) => ({
            id: `boundary-${String(index + 1).padStart(3, "0")}`,
            seconds: boundary.pauseEndFrame / 22_050,
            expectedPauseMs: boundary.pauseAfterMs,
            pauseType: pauseTypeForBoundary(
              audio.filename,
              unitById.get(boundary.segmentId)?.pauseReason ??
                "unknown",
              boundary.pauseAfterMs,
            ),
          }),
        ),
      };
    }),
  };
}

async function runObjectiveRuntime(
  outputDirectory: string,
): Promise<unknown> {
  const script = resolve(
    APP_ROOT,
    "scripts",
    "phase2c-audio-objective-runtime.cjs",
  );
  const planPath = resolve(
    outputDirectory,
    "private",
    "objective-audio-plan.json",
  );
  const rawOutput = resolve(
    outputDirectory,
    "private",
    "objective-audio-analysis.raw.json",
  );
  runChecked("docker", [
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
    "128",
    "--tmpfs",
    "/tmp:rw,nosuid,nodev,size=2g",
    "--mount",
    `type=bind,src=${script},dst=/app/scripts/phase2c-audio-objective-runtime.cjs,readonly`,
    "--mount",
    `type=bind,src=${resolve(
      REPOSITORY_ROOT,
      "scratch_academy",
    )},dst=/scratch_academy,readonly`,
    "--entrypoint",
    "node",
    "tenxpros-piper-eval:local",
    "/app/scripts/phase2c-audio-objective-runtime.cjs",
    "--self-test",
  ]);
  runChecked("docker", [
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
    "128",
    "--tmpfs",
    "/tmp:rw,nosuid,nodev,size=2g",
    "--mount",
    `type=bind,src=${script},dst=/app/scripts/phase2c-audio-objective-runtime.cjs,readonly`,
    "--mount",
    `type=bind,src=${resolve(
      REPOSITORY_ROOT,
      "scratch_academy",
      "piper-listening",
    )},dst=/scratch_academy/piper-listening,readonly`,
    "--mount",
    `type=bind,src=${outputDirectory},dst=/evaluation`,
    "--entrypoint",
    "node",
    "tenxpros-piper-eval:local",
    "/app/scripts/phase2c-audio-objective-runtime.cjs",
    "--plan",
    "/evaluation/private/objective-audio-plan.json",
    "--output",
    "/evaluation/private/objective-audio-analysis.raw.json",
  ]);
  return JSON.parse(await readFile(rawOutput, "utf8")) as unknown;
}

function appliedApprovedSpellings(transcript: string): string[] {
  const spellings = [
    "C E O",
    "S M S",
    "Ten X",
    "Ten X Pro",
    "Ten X Pros",
    "small and medium-sized enterprise",
    "S M E",
    "the Ten X Pros pricing page",
    "Mehrdad Naderi's LinkedIn profile",
    "mehrdadnaderi dot com",
    "the Ten X Ops website",
    "mail at mehrdadnaderi dot com",
  ];
  return spellings.filter((value) => transcript.includes(value));
}

async function enrichObjectiveAnalysis(
  frozen: FrozenInput,
  runtime: unknown,
): Promise<unknown> {
  const evidence = await loadFullPrivateSamples();
  const perSample = frozen.audio.map((audio) => {
    const sample = evidence.get(audio.filename);
    if (!sample) {
      throw new Error(
        `${audio.filename}: missing objective enrichment evidence`,
      );
    }
    const planned = sample.audit.plannedSegmentIds ?? [];
    const synthesized =
      sample.audit.synthesizedSegmentIds ?? [];
    return {
      sampleId: audio.sampleId,
      approvedTranscriptSha256: sample.transcriptSha256,
      referenceWordCount: sample.transcriptWordCount,
      secondsPerReferenceWord:
        audio.durationSeconds / sample.transcriptWordCount,
      transcriptReconstructionFromSynthesisUnits:
        sample.synthesisUnits
          .map((unit) => unit.text)
          .join(" ") === sample.transcript,
      synthesisOrderVerified:
        stableJson(planned) === stableJson(synthesized),
      appliedApprovedTermSpellings:
        appliedApprovedSpellings(sample.transcript),
      expectedSentenceBoundaryCount:
        sample.synthesisUnits.filter(
          (unit) =>
            unit.pauseReason === "sentence-boundary" &&
            unit.pauseAfterMs === 220,
        ).length,
      expectedSentencePunctuationCount:
        sample.pipeline === "baseline"
          ? (
              sample.transcript.match(
                /[.!?](?:["')\]]|$)/gu,
              ) ?? []
            ).length
          : null,
      expectedTableRowBoundaryCount:
        sample.synthesisUnits.filter(
          (unit) => unit.pauseAfterMs === 400,
        ).length,
      transcriptAcousticCorrectness: "UNVERIFIED_NO_ASR",
      pronunciationAcousticCorrectness:
        "UNVERIFIED_NO_ASR_OR_FORCED_ALIGNMENT",
    };
  });
  const pairRatios = frozen.manifest.pairs.map((pair) => {
    const baseline = pair.samples.find(
      (sample) => sample.pipeline === "baseline",
    );
    const corrected = pair.samples.find(
      (sample) => sample.pipeline === "corrected",
    );
    if (!baseline || !corrected) {
      throw new Error(`${pair.pairId}: incomplete private pair`);
    }
    const baselineEvidence = evidence.get(baseline.filename);
    const correctedEvidence = evidence.get(corrected.filename);
    if (!baselineEvidence || !correctedEvidence) {
      throw new Error(`${pair.pairId}: missing efficiency evidence`);
    }
    const baselineSecondsPerWord =
      baseline.durationSeconds /
      baselineEvidence.transcriptWordCount;
    const correctedSecondsPerWord =
      corrected.durationSeconds /
      correctedEvidence.transcriptWordCount;
    return {
      pairId: pair.pairId,
      correctedToBaselineDurationRatio:
        corrected.durationSeconds / baseline.durationSeconds,
      correctedToBaselineSecondsPerReferenceWordRatio:
        correctedSecondsPerWord / baselineSecondsPerWord,
      tableEfficiencyRatio:
        pair.pairId === frozen.manifest.tablePairId
          ? correctedSecondsPerWord / baselineSecondsPerWord
          : null,
    };
  });
  return {
    schemaVersion:
      "tenxpros-phase2c-objective-audio-analysis-enriched-v1",
    runtime,
    generationEvidence: {
      perSample,
      pairRatios,
    },
    limitations: [
      "Objective metrics are not a complete measure of naturalness.",
      "No local ASR or forced-alignment model was installed or downloaded.",
      "Transcript and approved-pronunciation acoustic correctness remain unverified.",
    ],
  };
}

interface RuntimeObjectiveSample {
  id: string;
  source: {
    byteForBytePreserved: boolean;
    metadataPreserved: boolean;
  };
  duration: {
    decodedSeconds: number;
  };
  speakingRate: {
    referenceWordCount: number;
    wordsPerMinute: number | null;
  };
  silence: {
    ratio: number;
    flags: {
      hasShortSilence: boolean;
      hasLongSilence: boolean;
      excessiveSilenceRatio: boolean;
    };
  };
  clipping: {
    possibleClipping: boolean;
  };
  edgeAndTruncationHeuristic: {
    requiresPerceptualOrAlignmentReview: boolean;
  };
  duplicateWindowHeuristic: {
    possibleDuplicateWindow: boolean;
  };
  stitchBoundaries: readonly {
    crossSpeechStitchFeatures: {
      anyDiscontinuityCandidate: boolean;
    };
  }[];
  semanticPauseCoverage: {
    expectedBoundaryCount: number;
    coverageRate: number | null;
  };
}

interface EnrichedObjectiveArtifact {
  schemaVersion: string;
  analysisHash: string;
  runtime: {
    schemaVersion: string;
    isolation: {
      externalNetworkRequests: number;
      externalApiRequests: number;
      modelDownloads: number;
    };
    summary: {
      sampleCount: number;
      allSourcesPreserved: boolean;
    };
    samples: readonly RuntimeObjectiveSample[];
  };
  generationEvidence: {
    perSample: readonly {
      sampleId: string;
      referenceWordCount: number;
      secondsPerReferenceWord: number;
      transcriptReconstructionFromSynthesisUnits: boolean;
      synthesisOrderVerified: boolean;
    }[];
    pairRatios: readonly {
      pairId: string;
      correctedToBaselineDurationRatio: number;
      correctedToBaselineSecondsPerReferenceWordRatio: number;
      tableEfficiencyRatio: number | null;
    }[];
  };
  limitations: readonly string[];
}

function identityRecords(
  frozen: FrozenInput,
): readonly AiPrivateSampleIdentity[] {
  return frozen.manifest.pairs.flatMap((pair) =>
    pair.samples.map((sample) => ({
      sourceSampleId: sample.sampleId,
      sourcePairId: pair.pairId,
      candidateId:
        sample.pipeline === "corrected"
          ? "bryce-corrected"
          : "bryce-baseline",
      pipeline: sample.pipeline,
      voice: "bryce" as const,
    })),
  );
}

function objectiveSummaryFromArtifact(
  frozen: FrozenInput,
  artifact: EnrichedObjectiveArtifact,
): AiObjectiveAnalysisSummary {
  if (
    artifact.runtime.summary.sampleCount !== 10 ||
    artifact.runtime.isolation.externalNetworkRequests !== 0 ||
    artifact.runtime.isolation.externalApiRequests !== 0 ||
    artifact.runtime.isolation.modelDownloads !== 0
  ) {
    throw new Error(
      "Objective artifact does not prove a ten-file, local-only analysis",
    );
  }
  const identities = identityRecords(frozen);
  const identityBySample = new Map(
    identities.map((identity) => [
      identity.sourceSampleId,
      identity,
    ]),
  );
  const blockingDefects: AiObjectiveAnalysisSummary["blockingDefects"][number][] =
    [];
  const regressions: AiObjectiveAnalysisSummary["regressions"][number][] =
    [];
  const improvements: AiObjectiveAnalysisSummary["improvements"][number][] =
    [];
  for (const sample of artifact.runtime.samples) {
    const identity = identityBySample.get(sample.id);
    if (!identity) {
      throw new Error(
        `Objective result contains unknown sample ${sample.id}`,
      );
    }
    if (
      !sample.source.byteForBytePreserved ||
      !sample.source.metadataPreserved
    ) {
      blockingDefects.push({
        sampleId: sample.id,
        pairId: identity.sourcePairId,
        code: "SOURCE_INTEGRITY_FAILURE",
        detail:
          "The local analyzer could not prove byte and metadata preservation.",
        severity: "blocking",
      });
    }
    if (sample.clipping.possibleClipping) {
      const finding = {
        sampleId: sample.id,
        pairId: identity.sourcePairId,
        code: "POSSIBLE_CLIPPING",
        detail:
          "Decoded-sample clipping thresholds were exceeded.",
        severity: "blocking" as const,
      };
      if (identity.pipeline === "corrected") {
        blockingDefects.push(finding);
      } else {
        regressions.push({
          ...finding,
          severity: "warning",
          detail:
            "Baseline decoded-sample clipping candidate; this is not attributed to the corrected pipeline.",
        });
      }
    }
    if (
      identity.pipeline === "corrected" &&
      sample.edgeAndTruncationHeuristic
        .requiresPerceptualOrAlignmentReview
    ) {
      regressions.push({
        sampleId: sample.id,
        pairId: identity.sourcePairId,
        code: "EDGE_OR_TRUNCATION_REVIEW_CANDIDATE",
        detail:
          "An amplitude-based edge heuristic requires perceptual or alignment review; it is not proof of a truncated word.",
        severity: "warning",
      });
    }
    if (
      identity.pipeline === "corrected" &&
      sample.duplicateWindowHeuristic.possibleDuplicateWindow
    ) {
      regressions.push({
        sampleId: sample.id,
        pairId: identity.sourcePairId,
        code: "DUPLICATE_WINDOW_REVIEW_CANDIDATE",
        detail:
          "A local PCM/fingerprint heuristic found a possible repeated window; linguistic duplication is unverified without ASR.",
        severity: "warning",
      });
    }
    if (
      identity.pipeline === "corrected" &&
      sample.stitchBoundaries.some(
        (boundary) =>
          boundary.crossSpeechStitchFeatures
            .anyDiscontinuityCandidate,
      )
    ) {
      regressions.push({
        sampleId: sample.id,
        pairId: identity.sourcePairId,
        code: "STITCH_DISCONTINUITY_REVIEW_CANDIDATE",
        detail:
          "At least one supplied stitch boundary exceeded an energy, spectral, or pitch discontinuity threshold.",
        severity: "warning",
      });
    }
    if (
      identity.pipeline === "corrected" &&
      sample.semanticPauseCoverage.expectedBoundaryCount > 0
    ) {
      const coverage =
        sample.semanticPauseCoverage.coverageRate ?? 0;
      if (coverage >= 0.8) {
        improvements.push({
          sampleId: sample.id,
          pairId: identity.sourcePairId,
          code: "SEMANTIC_PAUSE_ACOUSTIC_COVERAGE",
          detail: `${(coverage * 100).toFixed(
            1,
          )}% of supplied semantic pause boundaries had expected low-energy coverage.`,
          severity: "informational",
        });
      } else {
        regressions.push({
          sampleId: sample.id,
          pairId: identity.sourcePairId,
          code: "SEMANTIC_PAUSE_COVERAGE_BELOW_THRESHOLD",
          detail: `Only ${(coverage * 100).toFixed(
            1,
          )}% of supplied semantic pause boundaries met the acoustic coverage rule.`,
          severity: "warning",
        });
      }
    }
  }
  for (const ratio of artifact.generationEvidence.pairRatios) {
    if (
      ratio.tableEfficiencyRatio !== null &&
      ratio.tableEfficiencyRatio > 1.35
    ) {
      regressions.push({
        sampleId: null,
        pairId: ratio.pairId,
        code: "TABLE_EFFICIENCY_REGRESSION",
        detail: `Corrected seconds per reference word are ${ratio.tableEfficiencyRatio.toFixed(
          3,
        )}× the baseline value; perceptual clarity must justify the added time.`,
        severity: "warning",
      });
    }
  }
  const directionalFindings =
    artifact.generationEvidence.pairRatios.map((ratio) => {
      const delta = Math.abs(
        ratio.correctedToBaselineSecondsPerReferenceWordRatio - 1,
      );
      return {
        pairId: ratio.pairId,
        metric: "seconds_per_reference_word_efficiency",
        favoredCandidateId:
          ratio.correctedToBaselineSecondsPerReferenceWordRatio < 1
            ? "bryce-corrected"
            : "bryce-baseline",
        strength:
          delta >= 0.3
            ? ("strong" as const)
            : delta >= 0.1
              ? ("moderate" as const)
              : ("weak" as const),
      };
    });
  const clearlyDistinctPairIds =
    artifact.generationEvidence.pairRatios
      .filter(
        (ratio) =>
          Math.abs(
            ratio.correctedToBaselineDurationRatio - 1,
          ) >= 0.1 ||
          ratio.tableEfficiencyRatio !== null,
      )
      .map((ratio) => ratio.pairId);
  return {
    analysisHash: artifact.analysisHash,
    blockingDefects,
    regressions,
    improvements,
    directionalFindings,
    clearlyDistinctPairIds,
  };
}

interface PaidAccountingSummary {
  externalRequestCount: number;
  acceptedJudgeCalls: number;
  rejectedJudgeCalls: number;
  uncertainPaidCalls: number;
  knownActualCostUsd: number;
  uncertainMaximumExposureUsd: number;
  capAccountedCostUsd: number;
}

interface UsageCost {
  promptTokens: number;
  audioInputTokens: number | null;
  textInputTokens: number | null;
  completionTokens: number;
  openRouterCostUsd: number;
}

interface JudgeCallResult {
  status: "ACCEPTED" | "REJECTED" | "UNCERTAIN_PAID";
  retryAllowed: boolean;
  response?: AiJudgeResponse;
  responseHash?: string;
  openRouterRequestId?: string;
  issues: readonly {
    code: string;
    path: string;
    message: string;
  }[];
  usage: UsageCost | null;
  requestIndex: number;
}

export type PrimaryJudgeNextAction =
  | "RETRY"
  | "NEXT_JUDGE"
  | "STOP_PANEL";

export function primaryJudgeNextAction(
  result: Pick<
    JudgeCallResult,
    "status" | "retryAllowed" | "issues"
  >,
  attempt: 1 | 2,
): PrimaryJudgeNextAction {
  if (result.status === "UNCERTAIN_PAID") {
    return "STOP_PANEL";
  }
  const issueCodes = result.issues.map(
    (issue) => issue.code,
  );
  if (
    issueCodes.some((code) =>
      /^HTTP_(?:401|402|403)$/u.test(code),
    )
  ) {
    return "STOP_PANEL";
  }
  if (issueCodes.includes("HTTP_429_NOT_BILLED")) {
    return attempt === 1 && result.retryAllowed
      ? "RETRY"
      : "STOP_PANEL";
  }
  if (attempt === 1 && result.retryAllowed) {
    return "RETRY";
  }
  return "NEXT_JUDGE";
}

interface ChatCompletionEnvelope {
  id?: unknown;
  usage?: unknown;
  choices?: unknown;
}

/*
 * A request cannot consume more than the model's 128k-token context window.
 * Charging every possible input token at the higher audio-input rate is
 * conservative, even though part of the request is lower-priced text. The
 * requested output is separately capped at 5k text tokens:
 *
 *   128,000 * $32 / 1M + 5,000 * $10 / 1M = $4.146
 *
 * This is deliberately distinct from the duration-based planning estimate:
 * it is the provider-limit bound used by the hard pre-dispatch USD gate.
 */
const PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD =
  (MODEL_CONTEXT_WINDOW_TOKENS *
    OFFICIAL_AUDIO_INPUT_USD_PER_MILLION_TOKENS +
    MAX_OUTPUT_TOKENS_PER_JUDGE *
      OFFICIAL_TEXT_OUTPUT_USD_PER_MILLION_TOKENS) /
  1_000_000;

function ceilingUsd(value: number): number {
  return Math.ceil(value * 100_000_000) / 100_000_000;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function paidAccountingFromLedger(
  entries: readonly LedgerEntry[],
): PaidAccountingSummary {
  const latestByRequest = new Map<
    number,
    Readonly<Record<string, unknown>>
  >();
  for (const entry of entries) {
    const requestIndex = entry.data.requestIndex;
    if (
      typeof requestIndex === "number" &&
      Number.isInteger(requestIndex) &&
      requestIndex >= 1
    ) {
      latestByRequest.set(requestIndex, entry.data);
    }
  }
  let acceptedJudgeCalls = 0;
  let rejectedJudgeCalls = 0;
  let uncertainPaidCalls = 0;
  let knownActualCostUsd = 0;
  let uncertainMaximumExposureUsd = 0;
  for (const record of latestByRequest.values()) {
    const status = record.status;
    const actual =
      typeof record.actualCostUsd === "number"
        ? record.actualCostUsd
        : 0;
    const maximum =
      typeof record.maximumPossibleCostUsd === "number"
        ? record.maximumPossibleCostUsd
        : 0;
    if (status === "ACCEPTED") {
      acceptedJudgeCalls +=
        record.requestKind === "JUDGE" ? 1 : 0;
      knownActualCostUsd += actual;
    } else if (status === "REJECTED") {
      rejectedJudgeCalls +=
        record.requestKind === "JUDGE" ? 1 : 0;
      knownActualCostUsd += actual;
    } else if (
      status === "UNCERTAIN_PAID" ||
      status === "DISPATCHED"
    ) {
      uncertainPaidCalls +=
        record.requestKind === "JUDGE" ? 1 : 0;
      uncertainMaximumExposureUsd += maximum;
    }
  }
  return {
    externalRequestCount: latestByRequest.size,
    acceptedJudgeCalls,
    rejectedJudgeCalls,
    uncertainPaidCalls,
    knownActualCostUsd: ceilingUsd(knownActualCostUsd),
    uncertainMaximumExposureUsd: ceilingUsd(
      uncertainMaximumExposureUsd,
    ),
    capAccountedCostUsd: ceilingUsd(
      knownActualCostUsd + uncertainMaximumExposureUsd,
    ),
  };
}

export function assertNextPaidRequestFits(
  input: {
    requestsUsed: number;
    capAccountedCostUsd: number;
    nextMaximumPossibleCostUsd: number;
    maximumRequests?: number;
    maximumUsd?: number;
  },
): void {
  const maximumRequests =
    input.maximumRequests ?? MAXIMUM_API_REQUESTS;
  const maximumUsd = input.maximumUsd ?? HARD_MAX_USD;
  if (
    !Number.isInteger(input.requestsUsed) ||
    input.requestsUsed < 0 ||
    !Number.isFinite(input.capAccountedCostUsd) ||
    input.capAccountedCostUsd < 0 ||
    !Number.isFinite(input.nextMaximumPossibleCostUsd) ||
    input.nextMaximumPossibleCostUsd < 0
  ) {
    throw new Error("Invalid paid-request accounting input");
  }
  if (input.requestsUsed + 1 > maximumRequests) {
    throw new Error(
      "Next external request would exceed the exact request cap",
    );
  }
  if (
    input.capAccountedCostUsd +
      input.nextMaximumPossibleCostUsd >
    maximumUsd + 1e-12
  ) {
    throw new Error(
      "Next external request could exceed the USD 10 spending cap",
    );
  }
}

/**
 * Conditional panels are admitted one provider-bounded request at a time.
 * Successful responses replace that temporary bound with their known actual
 * cost in the ledger before the next judge is considered. This preserves the
 * USD/request caps without requiring room for all three judges and all three
 * hypothetical retries at once.
 */
export function canStartConditionalBranchSequentially(input: {
  requestsUsed: number;
  capAccountedCostUsd: number;
  maximumRequests?: number;
  maximumUsd?: number;
}): boolean {
  try {
    assertNextPaidRequestFits({
      ...input,
      nextMaximumPossibleCostUsd:
        PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
    });
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      /request cap|spending cap/iu.test(error.message)
    ) {
      return false;
    }
    throw error;
  }
}

function usageCostFromResponse(
  response: ChatCompletionEnvelope,
): UsageCost | null {
  if (!isRecord(response.usage)) return null;
  const usage = response.usage;
  const promptTokens = usage.prompt_tokens;
  const completionTokens = usage.completion_tokens;
  const cost = usage.cost;
  const details = usage.prompt_tokens_details;
  const audioTokens =
    isRecord(details) ? details.audio_tokens : undefined;
  if (
    typeof promptTokens !== "number" ||
    !Number.isInteger(promptTokens) ||
    promptTokens < 0 ||
    typeof completionTokens !== "number" ||
    !Number.isInteger(completionTokens) ||
    completionTokens < 0 ||
    typeof cost !== "number" ||
    !Number.isFinite(cost) ||
    cost < 0 ||
    (audioTokens !== undefined &&
      (typeof audioTokens !== "number" ||
        !Number.isInteger(audioTokens) ||
        audioTokens < 0 ||
        audioTokens > promptTokens))
  ) {
    return null;
  }
  const reportedAudioTokens =
    typeof audioTokens === "number" ? audioTokens : null;
  return {
    promptTokens,
    audioInputTokens: reportedAudioTokens,
    textInputTokens:
      reportedAudioTokens === null
        ? null
        : promptTokens - reportedAudioTokens,
    completionTokens,
    openRouterCostUsd: ceilingUsd(cost),
  };
}

function extractToolArguments(
  response: ChatCompletionEnvelope,
): unknown {
  if (!Array.isArray(response.choices)) {
    return undefined;
  }
  const first = response.choices[0];
  if (!isRecord(first) || !isRecord(first.message)) {
    return undefined;
  }
  const toolCalls = first.message.tool_calls;
  if (!Array.isArray(toolCalls) || toolCalls.length !== 1) {
    return undefined;
  }
  const call = toolCalls[0];
  if (
    !isRecord(call) ||
    call.type !== "function" ||
    !isRecord(call.function) ||
    call.function.name !== TOOL_NAME ||
    typeof call.function.arguments !== "string"
  ) {
    return undefined;
  }
  return call.function.arguments;
}

async function parseResponseText(
  response: FetchResponseLike,
): Promise<{
  text: string;
  json: unknown;
}> {
  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = undefined;
  }
  return { text, json };
}

function chatCompletionTool(): {
  type: "function";
  function: {
    name: typeof TOOL_NAME;
    description: string;
    parameters: typeof AI_AUDIO_EVALUATION_TOOL.parameters;
    strict: boolean;
  };
} {
  return {
    type: "function",
    function: {
      name: AI_AUDIO_EVALUATION_TOOL.name,
      description: AI_AUDIO_EVALUATION_TOOL.description,
      parameters: AI_AUDIO_EVALUATION_TOOL.parameters,
      strict: AI_AUDIO_EVALUATION_TOOL.strict,
    },
  };
}

async function buildBlindChatCompletionBody(
  frozen: FrozenInput,
  assignment: AiBlindJudgeAssignment,
  prompt: string,
  attempt: 1 | 2,
): Promise<{
  body: Readonly<Record<string, unknown>>;
  redactedRequestRecord: Readonly<Record<string, unknown>>;
}> {
  assertPromptIsBlind(prompt);
  const audioBySourceId = new Map(
    frozen.audio.map((audio) => [audio.sampleId, audio]),
  );
  const content: Record<string, unknown>[] = [
    {
      type: "text",
      text:
        attempt === 1
          ? prompt
          : `${prompt}\n\n${VALIDATION_RETRY_INSTRUCTION}`,
    },
  ];
  const redactedClips: {
    neutralPairLabel: string;
    neutralClipLabel: string;
    audioSha256: string;
    bytes: number;
  }[] = [];
  for (const pair of assignment.pairs) {
    content.push({
      type: "text",
      text: `Now listen to ${pair.neutralPairLabel}.`,
    });
    for (const clip of pair.clips) {
      const audio = audioBySourceId.get(clip.sourceSampleId);
      if (!audio || audio.sha256 !== clip.audioSha256) {
        throw new Error(
          "Blind assignment no longer matches a frozen audio input",
        );
      }
      const audioBytes = await readFile(audio.path);
      const exactPayloadSha256 = sha256(audioBytes);
      if (
        exactPayloadSha256 !== audio.sha256 ||
        exactPayloadSha256 !== clip.audioSha256
      ) {
        throw new Error(
          "Exact audio payload bytes changed after the frozen-input check",
        );
      }
      const encoded = audioBytes.toString("base64");
      content.push({
        type: "text",
        text: `Neutral clip label: ${clip.neutralLabel}`,
      });
      content.push({
        type: "input_audio",
        input_audio: {
          data: encoded,
          format: "mp3",
        },
      });
      redactedClips.push({
        neutralPairLabel: pair.neutralPairLabel,
        neutralClipLabel: clip.neutralLabel,
        audioSha256: audio.sha256,
        bytes: audio.bytes,
      });
    }
  }
  const body = {
    model: MODEL_ID,
    provider: {
      allow_fallbacks: false,
      require_parameters: true,
    },
    store: false,
    stream: false,
    max_tokens: MAX_OUTPUT_TOKENS_PER_JUDGE,
    messages: [
      {
        role: "system",
        content:
          "Perform an independent blind listening evaluation at exactly 1.0x normal playback speed using only the attached audio and the supplied neutral labels. Return only the required function call.",
      },
      {
        role: "user",
        content,
      },
    ],
    tools: [chatCompletionTool()],
    tool_choice: {
      type: "function",
      function: { name: TOOL_NAME },
    },
  } as const;
  const textualPayload = content
    .filter((part) => part.type === "text")
    .map((part) => String(part.text))
    .join("\n");
  assertPromptIsBlind(textualPayload);
  return {
    body,
    redactedRequestRecord: {
      schemaVersion:
        "tenxpros-phase2c-openrouter-redacted-api-request-v2",
      provider: "openrouter",
      endpoint: "/chat/completions",
      model: MODEL_ID,
      store: false,
      stream: false,
      authoritativeUsageCostRequired: true,
      maximumOutputRequestField: "max_tokens",
      providerRouting: {
        allowFallbacks: false,
        requireParameters: true,
      },
      promptLoggingRequested: false,
      dataUseOptInRequested: false,
      judgeId: assignment.judgeId,
      attempt,
      basePromptSha256: sha256(prompt),
      validationRetryInstructionSha256:
        attempt === 2
          ? sha256(VALIDATION_RETRY_INSTRUCTION)
          : null,
      effectivePromptSha256: sha256(
        attempt === 1
          ? prompt
          : `${prompt}\n\n${VALIDATION_RETRY_INSTRUCTION}`,
      ),
      audioClipCount: redactedClips.length,
      clips: redactedClips,
      requestBodySha256: sha256(JSON.stringify(body)),
      omittedFields: [
        "API secret",
        "Authorization header",
        "audio base64",
        "source filenames",
        "source paths",
        "private A/B mapping",
        "complete request body",
      ],
    },
  };
}

async function reserveExternalRequest(
  ledgerPath: string,
  plan: AiEvaluationPlan,
  input: {
    requestKind:
      | "KEY_PREFLIGHT"
      | "MODELS_PREFLIGHT"
      | "JUDGE";
    maximumPossibleCostUsd: number;
    judgeId?: string;
    attempt?: 1 | 2;
    subplanHash?: string;
  },
  now: () => string,
): Promise<number> {
  const ledger = await readLedger(ledgerPath);
  verifyLedgerEntries(ledger, plan.planHash);
  const accounting = paidAccountingFromLedger(ledger);
  if (
    input.requestKind === "JUDGE"
      ? !input.judgeId || input.attempt === undefined
      : input.judgeId !== undefined ||
        input.attempt !== undefined ||
        input.subplanHash !== undefined
  ) {
    throw new Error(
      "External request reservation identity is invalid for its request kind",
    );
  }
  const priorAttemptResult =
    input.attempt === 2 && input.judgeId
      ? [...ledger]
          .reverse()
          .find(
            (entry) =>
              entry.event === "EXTERNAL_REQUEST_RESULT" &&
              entry.data.requestKind === "JUDGE" &&
              entry.data.judgeId === input.judgeId &&
              entry.data.attempt === 1 &&
              entry.data.subplanHash ===
                (input.subplanHash ?? null),
          )
      : undefined;
  const conditionalRequest =
    input.judgeId?.startsWith("conditional-judge-") ??
    false;
  if (
    conditionalRequest &&
    (!input.subplanHash ||
      !/^[a-f0-9]{64}$/u.test(input.subplanHash) ||
      !ledger.some(
        (entry) =>
          entry.event === "CONDITIONAL_SUBPLAN_BOUND" &&
          entry.data.subplanHash === input.subplanHash,
      ))
  ) {
    throw new Error(
      "Conditional request is not linked to its exact bound subplan hash",
    );
  }
  if (
    input.judgeId &&
    ledger.some(
      (entry) =>
        entry.event === "EXTERNAL_REQUEST_DISPATCHED" &&
        entry.data.requestKind === "JUDGE" &&
        entry.data.judgeId === input.judgeId &&
        entry.data.attempt === input.attempt &&
        entry.data.subplanHash ===
          (input.subplanHash ?? null),
    )
  ) {
    throw new Error(
      "Judge attempt was already dispatched and cannot be retried again",
    );
  }
  if (
    conditionalRequest &&
    input.attempt === 2 &&
    ledger.some(
      (entry) =>
        entry.event === "EXTERNAL_REQUEST_DISPATCHED" &&
        entry.data.requestKind === "JUDGE" &&
        typeof entry.data.judgeId === "string" &&
        entry.data.judgeId.startsWith(
          "conditional-judge-",
        ) &&
        entry.data.attempt === 2,
    )
  ) {
    throw new Error(
      "The conditional panel already consumed its single task-wide retry",
    );
  }
  if (
    input.attempt === 2 &&
    (!priorAttemptResult ||
      !["REJECTED", "FAILED_NOT_BILLED"].includes(
        String(priorAttemptResult.data.status),
      ) ||
      priorAttemptResult.data.retryPermitted !== true ||
      typeof priorAttemptResult.data.requestIndex !==
        "number")
  ) {
    throw new Error(
      "A second judge attempt requires one settled, retry-eligible first attempt",
    );
  }
  const retryOfRequestIndex =
    priorAttemptResult?.data.requestIndex ?? null;
  assertNextPaidRequestFits({
    requestsUsed: accounting.externalRequestCount,
    capAccountedCostUsd: accounting.capAccountedCostUsd,
    nextMaximumPossibleCostUsd:
      input.maximumPossibleCostUsd,
    maximumRequests: plan.judges.maximumApiRequests,
    maximumUsd: plan.cost.approvedHardMaximumUsd,
  });
  const requestIndex = accounting.externalRequestCount + 1;
  await appendLedger(
    ledgerPath,
    plan.planHash,
    "EXTERNAL_REQUEST_DISPATCHED",
    {
      requestIndex,
      requestKind: input.requestKind,
      judgeId: input.judgeId ?? null,
      attempt: input.attempt ?? null,
      subplanHash: input.subplanHash ?? null,
      retryOfRequestIndex,
      status: "DISPATCHED",
      maximumPossibleCostUsd:
        input.maximumPossibleCostUsd,
      actualCostUsd: null,
      usageKnown: false,
    },
    now,
  );
  return requestIndex;
}

async function finalizeExternalRequest(
  ledgerPath: string,
  plan: AiEvaluationPlan,
  input: {
    requestIndex: number;
    requestKind:
      | "KEY_PREFLIGHT"
      | "MODELS_PREFLIGHT"
      | "JUDGE";
    judgeId?: string;
    attempt?: 1 | 2;
    subplanHash?: string;
    status:
      | "ACCEPTED"
      | "REJECTED"
      | "UNCERTAIN_PAID"
      | "FAILED_NOT_BILLED";
    maximumPossibleCostUsd: number;
    actualCostUsd: number | null;
    usageKnown: boolean;
    usage?: UsageCost | null;
    retryPermitted?: boolean;
    openRouterRequestId?: string | null;
    latencyMs?: number | null;
    responseSha256?: string | null;
    issueCodes?: readonly string[];
  },
  now: () => string,
): Promise<void> {
  const ledger = await readLedger(ledgerPath);
  verifyLedgerEntries(ledger, plan.planHash);
  const accountingBeforeSettlement =
    paidAccountingFromLedger(ledger);
  const dispatch = [...ledger]
    .reverse()
    .find(
      (entry) =>
        entry.event === "EXTERNAL_REQUEST_DISPATCHED" &&
        entry.data.requestIndex === input.requestIndex,
    );
  if (!dispatch) {
    throw new Error(
      "Cannot settle an external request without its append-only dispatch record",
    );
  }
  if (
    dispatch.data.requestKind !== input.requestKind ||
    dispatch.data.judgeId !== (input.judgeId ?? null) ||
    dispatch.data.attempt !== (input.attempt ?? null) ||
    dispatch.data.subplanHash !==
      (input.subplanHash ?? null)
  ) {
    throw new Error(
      "External request settlement identity does not match its immutable dispatch record",
    );
  }
  if (
    ledger.some(
      (entry) =>
        entry.event === "EXTERNAL_REQUEST_RESULT" &&
        entry.data.requestIndex === input.requestIndex,
    )
  ) {
    throw new Error(
      "External request already has an immutable settlement record",
    );
  }
  const dispatchedMaximumPossibleCostUsd =
    typeof dispatch.data.maximumPossibleCostUsd === "number"
      ? dispatch.data.maximumPossibleCostUsd
      : input.maximumPossibleCostUsd;
  const resolvedCurrent =
    input.status !== "UNCERTAIN_PAID";
  const cumulativeActualCostUsd = ceilingUsd(
    accountingBeforeSettlement.knownActualCostUsd +
      (resolvedCurrent ? (input.actualCostUsd ?? 0) : 0),
  );
  const estimatedMaximumUncertainCostUsd = ceilingUsd(
    Math.max(
      0,
      accountingBeforeSettlement.uncertainMaximumExposureUsd -
        (resolvedCurrent
          ? dispatchedMaximumPossibleCostUsd
          : 0),
    ),
  );
  await appendLedger(
    ledgerPath,
    plan.planHash,
    "EXTERNAL_REQUEST_RESULT",
    {
      requestIndex: input.requestIndex,
      requestKind: input.requestKind,
      judgeId: input.judgeId ?? null,
      attempt: input.attempt ?? null,
      subplanHash:
        dispatch.data.subplanHash ?? null,
      retryOfRequestIndex:
        dispatch?.data.retryOfRequestIndex ?? null,
      status: input.status,
      provider: "openrouter",
      model:
        input.requestKind === "JUDGE" ? MODEL_ID : null,
      openRouterRequestId:
        input.openRouterRequestId ?? null,
      maximumPossibleCostUsd:
        input.maximumPossibleCostUsd,
      actualCostUsd: input.actualCostUsd,
      usageKnown: input.usageKnown,
      usage: input.usage ?? null,
      cumulativeActualCostUsd,
      estimatedMaximumUncertainCostUsd,
      latencyMs: input.latencyMs ?? null,
      responseSha256: input.responseSha256 ?? null,
      issueCodes: input.issueCodes ?? [],
      retryPermitted:
        input.retryPermitted ?? false,
    },
    now,
  );
}

function defaultFetch(
  input: string,
  init?: RequestInit,
): Promise<FetchResponseLike> {
  return fetch(input, init) as unknown as Promise<FetchResponseLike>;
}

interface OpenRouterPreflightResult {
  key: {
    active: true;
    managementOnly: false;
    configuredLimitUsd: number;
    remainingLimitUsd: number;
    expiresAt: string | null;
  };
  model: {
    id: typeof MODEL_ID;
    audioInput: true;
    toolCalling: true;
    contextLength: 128_000;
    pricing: {
      promptUsdPerToken: 0.0000025;
      inputAudioUsdPerToken: 0.000032;
      completionUsdPerToken: 0.00001;
    };
  };
}

async function preflightOpenRouter(
  secret: string,
  ledgerPath: string,
  plan: AiEvaluationPlan,
  privateRecordsDirectory: string,
  fetchImpl: NonNullable<
    AiAudioEvaluationDependencies["fetchImpl"]
  >,
  now: () => string,
  policy: {
    minimumRequiredKeyRemainingUsd?: number;
  } = {},
): Promise<OpenRouterPreflightResult> {
  const minimumRequiredKeyRemainingUsd =
    policy.minimumRequiredKeyRemainingUsd ??
    HARD_MAX_USD;
  if (
    !Number.isFinite(minimumRequiredKeyRemainingUsd) ||
    minimumRequiredKeyRemainingUsd < 0 ||
    minimumRequiredKeyRemainingUsd > HARD_MAX_USD
  ) {
    throw new Error(
      "OpenRouter preflight remaining-limit requirement must be between USD 0 and USD 10",
    );
  }
  type MetadataKind =
    | "KEY_PREFLIGHT"
    | "MODELS_PREFLIGHT";
  const getMetadata = async (
    requestKind: MetadataKind,
    endpoint: string,
    filename: string,
  ): Promise<{
    requestIndex: number;
    response: FetchResponseLike;
    parsed: { text: string; json: unknown };
    responseSha256: string;
    latencyMs: number;
  }> => {
    const requestIndex = await reserveExternalRequest(
      ledgerPath,
      plan,
      {
        requestKind,
        maximumPossibleCostUsd: 0,
      },
      now,
    );
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      30_000,
    );
    const startedAt = Date.now();
    let response!: FetchResponseLike;
    let parsed!: { text: string; json: unknown };
    try {
      response = await fetchImpl(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secret}`,
          ...OPENROUTER_ATTRIBUTION_HEADERS,
        },
        signal: controller.signal,
      });
      parsed = await parseResponseText(response);
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const failureClass =
        error instanceof Error
          ? error.name
          : "PREFLIGHT_NETWORK_OR_BODY_READ_FAILURE";
      await finalizeExternalRequest(
        ledgerPath,
        plan,
        {
          requestIndex,
          requestKind,
          status: "FAILED_NOT_BILLED",
          maximumPossibleCostUsd: 0,
          actualCostUsd: 0,
          usageKnown: true,
          latencyMs,
          issueCodes: [failureClass],
        },
        now,
      );
      await writeOrVerifyJson(
        resolve(
          privateRecordsDirectory,
          `${String(requestIndex).padStart(
            2,
            "0",
          )}-${filename}.json`,
        ),
        {
          schemaVersion:
            "tenxpros-phase2c-openrouter-preflight-record-v2",
          provider: "openrouter",
          endpoint: new URL(endpoint).pathname.replace(
            "/api/v1",
            "",
          ),
          requestKind,
          status: response?.status ?? null,
          ok: false,
          responseSha256: null,
          latencyMs,
          bodyReadCompleted: false,
          failureClass,
          rawResponseStored: false,
          keyLabelStored: false,
          creatorIdentifiersStored: false,
          secretStored: false,
          requestHeadersStored: false,
        },
      );
      throw new Error(
        `${requestKind} failed before paid inference`,
      );
    } finally {
      clearTimeout(timeout);
    }
    const latencyMs = Date.now() - startedAt;
    const responseSha256 = sha256(parsed.text);
    await writeNewJson(
      resolve(
        privateRecordsDirectory,
        `${String(requestIndex).padStart(
          2,
          "0",
        )}-${filename}.json`,
      ),
      {
        schemaVersion:
          "tenxpros-phase2c-openrouter-preflight-record-v2",
        provider: "openrouter",
        endpoint: new URL(endpoint).pathname.replace(
          "/api/v1",
          "",
        ),
        requestKind,
        status: response.status,
        ok: response.ok,
        responseSha256,
        latencyMs,
        bodyReadCompleted: true,
        rawResponseStored: false,
        keyLabelStored: false,
        creatorIdentifiersStored: false,
        secretStored: false,
        requestHeadersStored: false,
      },
    );
    if (!response.ok) {
      const issueCode =
        response.status === 401 || response.status === 403
          ? "OPENROUTER_AUTHENTICATION_FAILED"
          : `${requestKind}_HTTP_${String(response.status)}`;
      await finalizeExternalRequest(
        ledgerPath,
        plan,
        {
          requestIndex,
          requestKind,
          status: "FAILED_NOT_BILLED",
          maximumPossibleCostUsd: 0,
          actualCostUsd: 0,
          usageKnown: true,
          latencyMs,
          responseSha256,
          issueCodes: [issueCode],
        },
        now,
      );
      throw new Error(
        `${issueCode}; no paid OpenRouter model request was attempted`,
      );
    }
    return {
      requestIndex,
      response,
      parsed,
      responseSha256,
      latencyMs,
    };
  };

  const keyResult = await getMetadata(
    "KEY_PREFLIGHT",
    KEY_PREFLIGHT_ENDPOINT,
    "openrouter-key-preflight",
  );
  const keyEnvelope = isRecord(keyResult.parsed.json)
    ? keyResult.parsed.json.data
    : undefined;
  const keyData = isRecord(keyEnvelope)
    ? keyEnvelope
    : undefined;
  const configuredLimitUsd = keyData?.limit;
  const remainingLimitUsd = keyData?.limit_remaining;
  const expiresAt = keyData?.expires_at;
  const managementFlag = keyData?.is_management_key;
  const provisioningFlag = keyData?.is_provisioning_key;
  const keyTypeVerified =
    managementFlag === false ||
    provisioningFlag === false;
  const managementOnly =
    managementFlag === true ||
    provisioningFlag === true;
  const keyActive =
    keyData !== undefined &&
    keyData.disabled !== true &&
    keyData.is_active !== false;
  const expirationValid =
    expiresAt === null ||
    (typeof expiresAt === "string" &&
      Number.isFinite(Date.parse(expiresAt)) &&
      Date.parse(expiresAt) > Date.parse(now()));
  const keyValid =
    keyActive &&
    keyTypeVerified &&
    !managementOnly &&
    typeof configuredLimitUsd === "number" &&
    Number.isFinite(configuredLimitUsd) &&
    configuredLimitUsd > 0 &&
    configuredLimitUsd <= HARD_MAX_USD &&
    typeof remainingLimitUsd === "number" &&
    Number.isFinite(remainingLimitUsd) &&
    remainingLimitUsd >=
      minimumRequiredKeyRemainingUsd &&
    expirationValid;
  const keyIssueCodes: string[] = [];
  if (!keyActive) keyIssueCodes.push("KEY_INACTIVE");
  if (!keyTypeVerified || managementOnly) {
    keyIssueCodes.push(
      managementOnly
        ? "MANAGEMENT_ONLY_KEY_REJECTED"
        : "KEY_TYPE_UNVERIFIED",
    );
  }
  if (
    typeof configuredLimitUsd !== "number" ||
    !Number.isFinite(configuredLimitUsd) ||
    configuredLimitUsd <= 0 ||
    configuredLimitUsd > HARD_MAX_USD
  ) {
    keyIssueCodes.push(
      "KEY_CONFIGURED_LIMIT_MISSING_OR_ABOVE_USD_10",
    );
  }
  if (
    typeof remainingLimitUsd !== "number" ||
    !Number.isFinite(remainingLimitUsd) ||
    remainingLimitUsd <
      minimumRequiredKeyRemainingUsd
  ) {
    keyIssueCodes.push("KEY_REMAINING_LIMIT_INSUFFICIENT");
  }
  if (!expirationValid) {
    keyIssueCodes.push("KEY_EXPIRED_OR_EXPIRY_INVALID");
  }
  await finalizeExternalRequest(
    ledgerPath,
    plan,
    {
      requestIndex: keyResult.requestIndex,
      requestKind: "KEY_PREFLIGHT",
      status: keyValid ? "ACCEPTED" : "FAILED_NOT_BILLED",
      maximumPossibleCostUsd: 0,
      actualCostUsd: 0,
      usageKnown: true,
      latencyMs: keyResult.latencyMs,
      responseSha256: keyResult.responseSha256,
      issueCodes: keyIssueCodes,
    },
    now,
  );
  if (!keyValid) {
    throw new Error(
      `OpenRouter key preflight failed: ${keyIssueCodes.join(
        ", ",
      )}`,
    );
  }

  const modelsResult = await getMetadata(
    "MODELS_PREFLIGHT",
    MODELS_PREFLIGHT_ENDPOINT,
    "openrouter-models-preflight",
  );
  const modelsData =
    isRecord(modelsResult.parsed.json) &&
    Array.isArray(modelsResult.parsed.json.data)
      ? modelsResult.parsed.json.data
      : [];
  const model = modelsData.find(
    (item) => isRecord(item) && item.id === MODEL_ID,
  );
  const architecture =
    isRecord(model) && isRecord(model.architecture)
      ? model.architecture
      : undefined;
  const pricing =
    isRecord(model) && isRecord(model.pricing)
      ? model.pricing
      : undefined;
  const supportedParameters =
    isRecord(model) &&
    Array.isArray(model.supported_parameters)
      ? model.supported_parameters
      : [];
  const parseUnitPrice = (value: unknown): number =>
    typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : Number.NaN;
  const promptUsdPerToken = parseUnitPrice(pricing?.prompt);
  const inputAudioUsdPerToken = parseUnitPrice(
    pricing?.audio,
  );
  const completionUsdPerToken = parseUnitPrice(
    pricing?.completion,
  );
  const modelValid =
    isRecord(model) &&
    model.id === MODEL_ID &&
    model.context_length === MODEL_CONTEXT_WINDOW_TOKENS &&
    Array.isArray(architecture?.input_modalities) &&
    architecture.input_modalities.includes("audio") &&
    supportedParameters.includes("tools") &&
    supportedParameters.includes("tool_choice") &&
    supportedParameters.includes("max_tokens") &&
    promptUsdPerToken === 0.0000025 &&
    inputAudioUsdPerToken === 0.000032 &&
    completionUsdPerToken === 0.00001;
  const modelIssueCodes = modelValid
    ? []
    : ["MODEL_CAPABILITY_OR_PRICING_DRIFT"];
  await finalizeExternalRequest(
    ledgerPath,
    plan,
    {
      requestIndex: modelsResult.requestIndex,
      requestKind: "MODELS_PREFLIGHT",
      status: modelValid
        ? "ACCEPTED"
        : "FAILED_NOT_BILLED",
      maximumPossibleCostUsd: 0,
      actualCostUsd: 0,
      usageKnown: true,
      latencyMs: modelsResult.latencyMs,
      responseSha256: modelsResult.responseSha256,
      issueCodes: modelIssueCodes,
    },
    now,
  );
  if (!modelValid) {
    throw new Error(
      "MODEL_CAPABILITY_OR_PRICING_DRIFT; no paid OpenRouter model request was attempted",
    );
  }

  await writeNewJson(
    resolve(
      privateRecordsDirectory,
      "openrouter-preflight-summary.json",
    ),
    {
      schemaVersion:
        "tenxpros-phase2c-openrouter-preflight-summary-v1",
      status: "PASS",
      provider: "openrouter",
      model: MODEL_ID,
      key: {
        active: true,
        managementOnly: false,
        configuredLimitUsd,
        remainingLimitUsd,
        expiresAt:
          typeof expiresAt === "string" ? expiresAt : null,
        labelStored: false,
        creatorIdentifiersStored: false,
      },
      modelCapability: {
        audioInput: true,
        toolCalling: true,
        contextLength: MODEL_CONTEXT_WINDOW_TOKENS,
        pricing: {
          promptUsdPerToken: 0.0000025,
          inputAudioUsdPerToken: 0.000032,
          completionUsdPerToken: 0.00001,
        },
      },
      spendControls: {
        secureInferenceKeyFileRequired: true,
        keyConfiguredLimitMaximumUsd: HARD_MAX_USD,
        minimumRequiredKeyRemainingUsd,
        cliMaximumUsd: HARD_MAX_USD,
        authoritativeActualCostField: "usage.cost",
        creditsEndpointCalled: false,
        http402Policy: "FAIL_CLOSED_NO_RETRY",
      },
      integrationPrivacy: {
        promptLoggingRequested: false,
        dataUseOptInRequested: false,
      },
      externalMetadataRequests: 2,
      paidModelRequests: 0,
      secretStored: false,
      rawResponsesStored: false,
    },
  );
  return {
    key: {
      active: true,
      managementOnly: false,
      configuredLimitUsd,
      remainingLimitUsd,
      expiresAt:
        typeof expiresAt === "string" ? expiresAt : null,
    },
    model: {
      id: MODEL_ID,
      audioInput: true,
      toolCalling: true,
      contextLength: MODEL_CONTEXT_WINDOW_TOKENS,
      pricing: {
        promptUsdPerToken: 0.0000025,
        inputAudioUsdPerToken: 0.000032,
        completionUsdPerToken: 0.00001,
      },
    },
  };
}

async function executeJudgeAttempt(
  frozen: FrozenInput,
  assignment: AiBlindJudgeAssignment,
  prompt: string,
  attempt: 1 | 2,
  clearlyDistinctSourcePairIds: readonly string[],
  secret: string,
  ledgerPath: string,
  plan: AiEvaluationPlan,
  privateRecordsDirectory: string,
  fetchImpl: NonNullable<
    AiAudioEvaluationDependencies["fetchImpl"]
  >,
  now: () => string,
): Promise<JudgeCallResult> {
  await assertFrozenInputUnchanged(frozen);
  const accounting = paidAccountingFromLedger(
    await readLedger(ledgerPath),
  );
  assertNextPaidRequestFits({
    requestsUsed: accounting.externalRequestCount,
    capAccountedCostUsd: accounting.capAccountedCostUsd,
    nextMaximumPossibleCostUsd:
      PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
    maximumRequests: plan.judges.maximumApiRequests,
    maximumUsd: plan.cost.approvedHardMaximumUsd,
  });
  const { body, redactedRequestRecord } =
    await buildBlindChatCompletionBody(
      frozen,
      assignment,
      prompt,
      attempt,
    );
  const requestIndex = await reserveExternalRequest(
    ledgerPath,
    plan,
    {
      requestKind: "JUDGE",
      maximumPossibleCostUsd:
        PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
      judgeId: assignment.judgeId,
      attempt,
    },
    now,
  );
  const recordPrefix = `${String(requestIndex).padStart(
    2,
    "0",
  )}-${assignment.judgeId}-attempt-${String(attempt)}`;
  await writeNewJson(
    resolve(
      privateRecordsDirectory,
      `${recordPrefix}-request.json`,
    ),
    {
      ...redactedRequestRecord,
      requestIndex,
    },
  );
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    10 * 60 * 1_000,
  );
  const startedAt = Date.now();
  let response!: FetchResponseLike;
  let rawBody!: string;
  try {
    response = await fetchImpl(CHAT_COMPLETIONS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        ...OPENROUTER_ATTRIBUTION_HEADERS,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    rawBody = await response.text();
  } catch (error) {
    await finalizeExternalRequest(
      ledgerPath,
      plan,
      {
        requestIndex,
        requestKind: "JUDGE",
        judgeId: assignment.judgeId,
        attempt,
        status: "UNCERTAIN_PAID",
        maximumPossibleCostUsd:
          PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
        actualCostUsd: null,
        usageKnown: false,
        latencyMs: Date.now() - startedAt,
        issueCodes: [
          error instanceof Error
            ? error.name
            : "AMBIGUOUS_NETWORK_FAILURE",
        ],
        retryPermitted: false,
      },
      now,
    );
    await writeNewJson(
      resolve(
        privateRecordsDirectory,
        `${recordPrefix}-uncertain.json`,
      ),
      {
        schemaVersion:
          "tenxpros-phase2c-uncertain-paid-record-v1",
        requestIndex,
        judgeId: assignment.judgeId,
        attempt,
        status: "UNCERTAIN_PAID",
        retryPermitted: false,
        maximumPossibleCostUsd:
          PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
        failureClass:
          error instanceof Error
            ? error.name
            : "AMBIGUOUS_NETWORK_FAILURE",
      },
    );
    return {
      status: "UNCERTAIN_PAID",
      retryAllowed: false,
      issues: [
        {
          code: "UNCERTAIN_PAID",
          path: "$",
          message:
            "The request outcome is ambiguous; no automatic retry is permitted.",
        },
      ],
      usage: null,
      requestIndex,
    };
  } finally {
    clearTimeout(timeout);
  }
  const latencyMs = Date.now() - startedAt;
  const rawResponseRelativePath =
    `${recordPrefix}-raw-response.txt`;
  const persisted =
    await persistProviderHttpBodyBeforeSemanticParse({
      path: resolve(
        privateRecordsDirectory,
        rawResponseRelativePath,
      ),
      rawBody,
      secret,
    });
  const responseSha256 = persisted.rawBodySha256;
  const loggedHeaders = safeResponseHeaders(
    response.headers,
  );
  await appendLedger(
    ledgerPath,
    plan.planHash,
    "RAW_RESPONSE_PERSISTED",
    {
      requestIndex,
      requestKind: "JUDGE",
      judgeId: assignment.judgeId,
      attempt,
      httpStatus: response.status,
      rawBodySha256: persisted.rawBodySha256,
      artifactBodySha256:
        persisted.artifactBodySha256,
      rawBodyBytes: persisted.rawBodyBytes,
      artifactBodyBytes:
        persisted.artifactBodyBytes,
      exactRawBodyStored:
        persisted.exactRawBodyStored,
      sanitizedArtifactStored:
        persisted.sanitizedArtifactStored,
      rawResponseRelativePath,
      inputAudioRedacted:
        persisted.inputAudioRedacted,
      inputAudioRedactionCount:
        persisted.inputAudioRedactionCount,
      safeResponseHeaders: loggedHeaders,
      semanticParseStarted: false,
    },
    now,
  );
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody) as unknown;
  } catch {
    parsedJson = undefined;
  }
  const envelope = isRecord(parsedJson)
    ? (parsedJson as ChatCompletionEnvelope)
    : {};
  const usage = usageCostFromResponse(envelope);
  const openRouterRequestId =
    typeof envelope.id === "string" &&
    envelope.id.trim() !== ""
      ? envelope.id
      : response.headers?.get("x-request-id") ?? null;
  await writeNewJson(
    resolve(
      privateRecordsDirectory,
      `${recordPrefix}-response.json`,
    ),
    {
      schemaVersion:
        "tenxpros-phase2c-private-api-response-v1",
      requestIndex,
      judgeId: assignment.judgeId,
      attempt,
      httpStatus: response.status,
      ok: response.ok,
      responseSha256,
      artifactBodySha256:
        persisted.artifactBodySha256,
      openRouterRequestId,
      latencyMs,
      usage,
      rawResponseStored:
        persisted.exactRawBodyStored,
      sanitizedResponseArtifactStored:
        persisted.sanitizedArtifactStored,
      rawResponseRelativePath,
      rawResponseMode: "0600",
      inputAudioRedacted:
        persisted.inputAudioRedacted,
      inputAudioRedactionCount:
        persisted.inputAudioRedactionCount,
      safeResponseHeaders: loggedHeaders,
      nonJsonResponseTextSha256:
        parsedJson === undefined ? responseSha256 : null,
      secretStored: false,
      requestAudioStored: false,
    },
  );
  if (response.status === 402) {
    await finalizeExternalRequest(
      ledgerPath,
      plan,
      {
        requestIndex,
        requestKind: "JUDGE",
        judgeId: assignment.judgeId,
        attempt,
        status: usage
          ? "REJECTED"
          : "FAILED_NOT_BILLED",
        maximumPossibleCostUsd: Math.max(
          PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
          usage?.openRouterCostUsd ?? 0,
        ),
        actualCostUsd: usage?.openRouterCostUsd ?? 0,
        usageKnown: true,
        usage,
        retryPermitted: false,
        openRouterRequestId,
        latencyMs,
        responseSha256,
        issueCodes: ["HTTP_402"],
      },
      now,
    );
    return {
      status: "REJECTED",
      retryAllowed: false,
      issues: [
        {
          code: "HTTP_402",
          path: "$",
          message:
            "OpenRouter reported Payment Required; execution stops fail-closed and this request is never retried.",
        },
      ],
      usage,
      requestIndex,
    };
  }
  if (!usage && response.status === 429) {
    await finalizeExternalRequest(
      ledgerPath,
      plan,
      {
        requestIndex,
        requestKind: "JUDGE",
        judgeId: assignment.judgeId,
        attempt,
        status: "FAILED_NOT_BILLED",
        maximumPossibleCostUsd:
          PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
        actualCostUsd: 0,
        usageKnown: true,
        openRouterRequestId,
        latencyMs,
        responseSha256,
        issueCodes: ["HTTP_429_NOT_BILLED"],
        retryPermitted: attempt === 1,
      },
      now,
    );
    return {
      status: "REJECTED",
      retryAllowed: attempt === 1,
      issues: [
        {
          code: "HTTP_429_NOT_BILLED",
          path: "$",
          message:
            "OpenRouter returned a definite 429 with no usage charge; one controlled retry is permitted.",
        },
      ],
      usage: null,
      requestIndex,
    };
  }
  if (!usage) {
    await finalizeExternalRequest(
      ledgerPath,
      plan,
      {
        requestIndex,
        requestKind: "JUDGE",
        judgeId: assignment.judgeId,
        attempt,
        status: "UNCERTAIN_PAID",
        maximumPossibleCostUsd:
          PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
        actualCostUsd: null,
        usageKnown: false,
        openRouterRequestId,
        latencyMs,
        responseSha256,
        issueCodes: ["MISSING_OPENROUTER_USAGE_COST"],
        retryPermitted: false,
      },
      now,
    );
    return {
      status: "UNCERTAIN_PAID",
      retryAllowed: false,
      issues: [
        {
          code: "UNCERTAIN_PAID",
          path: "$.usage",
          message:
            "OpenRouter did not report authoritative usage.cost; maximum possible cost was reserved and no retry is permitted.",
        },
      ],
      usage: null,
      requestIndex,
    };
  }
  if (!response.ok) {
    await finalizeExternalRequest(
      ledgerPath,
      plan,
      {
        requestIndex,
        requestKind: "JUDGE",
        judgeId: assignment.judgeId,
        attempt,
        status: "REJECTED",
        maximumPossibleCostUsd: Math.max(
          PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
          usage.openRouterCostUsd,
        ),
        actualCostUsd: usage.openRouterCostUsd,
        usageKnown: true,
        usage,
        openRouterRequestId,
        latencyMs,
        responseSha256,
        issueCodes: [`HTTP_${String(response.status)}`],
        retryPermitted: false,
      },
      now,
    );
    return {
      status: "REJECTED",
      retryAllowed: false,
      issues: [
        {
          code: `HTTP_${String(response.status)}`,
          path: "$",
          message:
            "The API returned a clear HTTP failure with reported usage.",
        },
      ],
      usage,
      requestIndex,
    };
  }
  const validation = validateJudgeResponse(
    extractToolArguments(envelope),
    assignment,
    {
      attemptNumber: attempt,
      clearlyDistinctSourcePairIds,
    },
  );
  if (!validation.valid) {
    await finalizeExternalRequest(
      ledgerPath,
      plan,
      {
        requestIndex,
        requestKind: "JUDGE",
        judgeId: assignment.judgeId,
        attempt,
        status: "REJECTED",
        maximumPossibleCostUsd: Math.max(
          PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
          usage.openRouterCostUsd,
        ),
        actualCostUsd: usage.openRouterCostUsd,
        usageKnown: true,
        usage,
        openRouterRequestId,
        latencyMs,
        responseSha256,
        issueCodes: validation.issues.map(
          (issue) => issue.code,
        ),
        retryPermitted: validation.retryAllowed,
      },
      now,
    );
    return {
      status: "REJECTED",
      retryAllowed: validation.retryAllowed,
      issues: validation.issues,
      usage,
      requestIndex,
    };
  }
  await finalizeExternalRequest(
    ledgerPath,
    plan,
    {
      requestIndex,
      requestKind: "JUDGE",
      judgeId: assignment.judgeId,
      attempt,
      status: "ACCEPTED",
      maximumPossibleCostUsd: Math.max(
        PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
        usage.openRouterCostUsd,
      ),
      actualCostUsd: usage.openRouterCostUsd,
      usageKnown: true,
      usage,
      openRouterRequestId,
      latencyMs,
      responseSha256,
      retryPermitted: false,
    },
    now,
  );
  return {
    status: "ACCEPTED",
    retryAllowed: false,
    response: validation.response,
    responseHash: validation.responseHash,
    openRouterRequestId:
      openRouterRequestId ?? undefined,
    issues: [],
    usage,
    requestIndex,
  };
}

export interface AiConditionalCliAudioPayload {
  identity: AiConditionalAudioClip;
  path: string;
}

/**
 * Connects the transport-agnostic conditional panel executor to the CLI's
 * single append-only ledger, hard-cap guard, and private-record writer.
 *
 * Local generation is intentionally a separate zero-network stage. This
 * adapter accepts only its hash-bound outputs and re-reads every MP3 before
 * the ledger reserves each paid request.
 */
export async function executeBoundConditionalPanel(
  input: {
    subplan: AiBoundConditionalSubplan;
    audioPayloads: readonly AiConditionalCliAudioPayload[];
    secret: string;
    plan: AiEvaluationPlan;
    ledgerPath: string;
    privateRecordsDirectory: string;
    fetchImpl: NonNullable<
      AiAudioEvaluationDependencies["fetchImpl"]
    >;
    now: () => string;
  },
): Promise<AiConditionalExecutionResult> {
  const payloadByKey = new Map(
    input.audioPayloads.map((payload) => [
      `${payload.identity.excerptId}\0${payload.identity.candidateId}`,
      payload,
    ]),
  );
  if (payloadByKey.size !== input.audioPayloads.length) {
    throw new Error(
      "Conditional CLI payload identities are duplicated",
    );
  }
  return executeConditionalPanelWithFetch({
    subplan: input.subplan,
    currentAudioInputs: input.audioPayloads.map(
      (payload) => payload.identity,
    ),
    readAudio: async (clip) => {
      const payload = payloadByKey.get(
        `${clip.excerptId}\0${clip.candidateId}`,
      );
      if (!payload) {
        throw new Error(
          "A bound conditional audio payload is missing",
        );
      }
      return readFile(payload.path);
    },
    secret: input.secret,
    model: MODEL_ID,
    endpoint: CHAT_COMPLETIONS_ENDPOINT,
    maximumExternalRequests:
      MAXIMUM_CONDITIONAL_CALLS_AFTER_WORST_CASE_BRYCE,
    fetchImpl: async (url, init) =>
      input.fetchImpl(url, init),
    hooks: {
      bindSubplanBeforeRequests: async (binding) => {
        if (
          binding.event !== "CONDITIONAL_SUBPLAN_BOUND" ||
          !isRecord(binding.data) ||
          binding.data.subplanHash !==
            input.subplan.subplanHash
        ) {
          throw new Error(
            "Conditional ledger binding record is invalid",
          );
        }
        await appendLedger(
          input.ledgerPath,
          input.plan.planHash,
          "CONDITIONAL_SUBPLAN_BOUND",
          binding.data,
          input.now,
        );
      },
      reserveRequest: async ({
        subplanHash,
        judgeId,
        attempt,
      }) =>
        reserveExternalRequest(
          input.ledgerPath,
          input.plan,
          {
            requestKind: "JUDGE",
            maximumPossibleCostUsd:
            PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
            judgeId,
            attempt,
            subplanHash,
          },
          input.now,
        ),
      settleRequest: async (record) =>
        finalizeExternalRequest(
          input.ledgerPath,
          input.plan,
          {
            requestIndex: record.requestIndex,
            requestKind: "JUDGE",
            judgeId: record.judgeId,
            attempt: record.attempt,
            subplanHash: record.subplanHash,
            status: record.status,
            maximumPossibleCostUsd: Math.max(
              PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
              record.actualCostUsd ?? 0,
            ),
            actualCostUsd: record.actualCostUsd,
            usageKnown:
              record.usage !== null ||
              record.status === "FAILED_NOT_BILLED",
            usage: record.usage,
            openRouterRequestId:
              record.openRouterRequestId,
            latencyMs: record.latencyMs,
            responseSha256: record.responseSha256,
            issueCodes: record.issueCodes,
            retryPermitted: record.retryPermitted,
          },
          input.now,
        ),
      persistPrivateRecord: async ({
        requestIndex,
        kind,
        record,
      }) => {
        const judgeId =
          typeof record.judgeId === "string"
            ? record.judgeId
            : "conditional-judge";
        await writeNewJson(
          resolve(
            input.privateRecordsDirectory,
            `${String(requestIndex).padStart(
              2,
              "0",
            )}-${judgeId}-${kind.toLowerCase()}.json`,
          ),
          record,
        );
      },
    },
  });
}

async function generateAndBindConditionalSubplan(input: {
  frozen: FrozenInput;
  plan: AiEvaluationPlan;
  draft: AiConditionalBranchDraft;
  objective: AiObjectiveAnalysisSummary;
  paths: Phase2CPaths;
}): Promise<{
  subplan: AiBoundConditionalSubplan;
  audioPayloads: readonly AiConditionalCliAudioPayload[];
}> {
  const excerpts = await loadFrozenCorrectedPiperExcerpts(
    input.frozen,
    input.draft.affectedExcerptIds,
  );
  const sourceCandidateId =
    input.draft.branchKind === "TUNING"
      ? "source-corrected"
      : "voice-bryce";
  const frozenAudioBySampleId = new Map(
    input.frozen.audio.map((audio) => [audio.sampleId, audio]),
  );
  const correctedSourcePayloads = excerpts.map((excerpt) => {
    const audio = frozenAudioBySampleId.get(
      excerpt.sourceSampleId,
    );
    if (
      !audio ||
      audio.sha256 !== excerpt.sourceAudioSha256 ||
      audio.durationSeconds !==
        excerpt.sourceAudioDurationSeconds
    ) {
      throw new Error(
        `${excerpt.excerptId}: frozen corrected MP3 identity changed`,
      );
    }
    const blocking = input.objective.blockingDefects.some(
      (finding) =>
        finding.sampleId === null ||
        finding.sampleId === excerpt.sourceSampleId,
    );
    return {
      identity: {
        excerptId: excerpt.excerptId,
        candidateId: sourceCandidateId,
        audioSha256: audio.sha256,
        durationSeconds: audio.durationSeconds,
        objectiveIntegrityPass: !blocking,
        contentConsistency: 1,
      },
      path: audio.path,
    };
  });
  const baselineSourcePayloads =
    input.draft.branchKind === "TUNING"
      ? input.draft.affectedExcerptIds.map((pairId) => {
          const pair = input.frozen.manifest.pairs.find(
            (candidate) => candidate.pairId === pairId,
          );
          const baseline = pair?.samples.find(
            (sample) => sample.pipeline === "baseline",
          );
          const audio =
            baseline === undefined
              ? undefined
              : frozenAudioBySampleId.get(baseline.sampleId);
          if (
            !baseline ||
            !audio ||
            audio.sha256 !== baseline.sha256 ||
            audio.durationSeconds !== baseline.durationSeconds
          ) {
            throw new Error(
              `${pairId}: frozen baseline MP3 identity changed`,
            );
          }
          const blocking =
            input.objective.blockingDefects.some(
              (finding) =>
                finding.sampleId === null ||
                finding.sampleId === baseline.sampleId,
            );
          return {
            identity: {
              excerptId: pairId,
              candidateId: "source-baseline",
              audioSha256: audio.sha256,
              durationSeconds: audio.durationSeconds,
              objectiveIntegrityPass: !blocking,
              contentConsistency: 1,
            },
            path: audio.path,
          };
        })
      : [];
  const sourcePayloads = [
    ...baselineSourcePayloads,
    ...correctedSourcePayloads,
  ];
  const branchRoot = resolve(
    input.paths.privateDirectory,
    "conditional-audio",
    input.draft.draftHash,
  );
  await mkdir(branchRoot, { recursive: true, mode: 0o700 });
  const generatedRecords = [];
  const generatedPaths = new Map<string, string>();
  const generationPlans =
    input.draft.branchKind === "LOCAL_VOICES"
      ? (["linda", "cori"] as const).map((voice) =>
          buildLocalVoicePiperPlan({
            draft: input.draft,
            phase2BManifestSha256:
              input.frozen.manifestSha256,
            voice,
            excerpts,
          }),
        )
      : input.draft.profiles.map((profile) =>
          buildTunedBrycePiperPlan({
            draft: input.draft,
            phase2BManifestSha256:
              input.frozen.manifestSha256,
            profileId: profile.profileId,
            excerpts,
          }),
        );
  for (const generationPlan of generationPlans) {
    if (
      !/^[a-z0-9_-]+$/u.test(generationPlan.candidateId)
    ) {
      throw new Error(
        "Conditional candidate id is unsafe for a private output directory",
      );
    }
    const candidateDirectory = resolve(
      branchRoot,
      generationPlan.candidateId,
    );
    const candidatePrivate = resolve(
      candidateDirectory,
      "private",
    );
    await mkdir(candidatePrivate, {
      recursive: true,
      mode: 0o700,
    });
    const runtimePlanPath = resolve(
      candidatePrivate,
      "runtime-plan.json",
    );
    await writeNewJson(runtimePlanPath, generationPlan);
    const generated =
      await executeConditionalPiperPlan({
        plan: generationPlan,
        planPath: runtimePlanPath,
        outputDirectory: candidateDirectory,
      });
    for (const record of generated) {
      const outputPath = resolve(
        candidateDirectory,
        record.outputFile,
      );
      await assertRegularFile(
        outputPath,
        `${record.candidateId}/${record.excerptId} generated audio`,
      );
      const key = `${record.excerptId}\0${record.candidateId}`;
      if (generatedPaths.has(key)) {
        throw new Error(
          "Conditional generator returned a duplicate audio identity",
        );
      }
      generatedPaths.set(key, outputPath);
      generatedRecords.push(record);
    }
  }
  const clips = assembleConditionalAudioClips({
    draft: input.draft,
    sourceClips: sourcePayloads.map(
      (payload) => payload.identity,
    ),
    generated: generatedRecords,
  });
  const subplan = bindConditionalSubplan({
    draft: input.draft,
    audioInputs: clips,
  });
  const subplanDirectory = resolve(
    input.paths.privateDirectory,
    "conditional-subplans",
  );
  await mkdir(subplanDirectory, {
    recursive: true,
    mode: 0o700,
  });
  await writeNewJson(
    resolve(
      subplanDirectory,
      `${input.draft.draftHash}-bound.json`,
    ),
    subplan,
  );
  const sourcePaths = new Map(
    sourcePayloads.map((payload) => [
      `${payload.identity.excerptId}\0${payload.identity.candidateId}`,
      payload.path,
    ]),
  );
  const audioPayloads = clips.map((identity) => {
    const key = `${identity.excerptId}\0${identity.candidateId}`;
    const path =
      sourcePaths.get(key) ?? generatedPaths.get(key);
    if (!path) {
      throw new Error(
        "A hash-bound conditional clip has no private MP3 path",
      );
    }
    return { identity, path };
  });
  return { subplan, audioPayloads };
}

function pairIdFromSampleId(sampleId: string): string | null {
  const match = /^(sample-\d{2})-/u.exec(sampleId);
  return match?.[1] ?? null;
}

function affectedPairsFromFindings(
  objective: AiObjectiveAnalysisSummary,
  pattern: RegExp,
): readonly string[] {
  return [
    ...new Set(
      [
        ...objective.blockingDefects,
        ...objective.regressions,
      ].flatMap((finding) => {
        if (
          !pattern.test(`${finding.code} ${finding.detail}`)
        ) {
          return [];
        }
        const pairId =
          finding.pairId ??
          (finding.sampleId
            ? pairIdFromSampleId(finding.sampleId)
            : null);
        return pairId ? [pairId] : [];
      }),
    ),
  ].sort();
}

function createAutomaticTuningDraft(input: {
  planHash: string;
  bryce: AiBryceDecisionMetrics;
  objective: AiObjectiveAnalysisSummary;
  allPairIds: readonly string[];
}): AiConditionalBranchDraft {
  const signals: AiTuningFailureSignal[] = [];
  const affected: Partial<
    Record<
      AiTuningFailureSignal["dimension"],
      readonly string[]
    >
  > = {};
  if (!input.bryce.tableEfficiencyPass) {
    signals.push({
      dimension: "table_row_pause",
      direction: "too_long",
      severity: 0.98,
      evidence: [
        "The corrected table failed the locked table-efficiency rule.",
      ],
    });
    affected.table_row_pause = ["sample-02"];
  }
  if (
    input.bryce.correctedExcessivelySlowMajoritySampleIds
      .length > 0
  ) {
    const slowPairs = [
      ...new Set(
        input.bryce.correctedExcessivelySlowMajoritySampleIds
          .map(pairIdFromSampleId)
          .filter((pairId): pairId is string => pairId !== null),
      ),
    ].sort();
    signals.push({
      dimension: "speaking_rate",
      direction: "too_slow",
      severity: 0.95,
      evidence: [
        `A majority marked ${String(
          slowPairs.length,
        )} corrected excerpt(s) excessively slow.`,
      ],
    });
    affected.speaking_rate = slowPairs;
  }
  if (!input.bryce.semanticPauseStructurePass) {
    signals.push({
      dimension: "sentence_pause",
      direction: "too_short",
      severity: 0.92,
      evidence: [
        "The local/objective semantic-pause structure check failed.",
      ],
    });
    affected.sentence_pause =
      affectedPairsFromFindings(
        input.objective,
        /(?:semantic|sentence|pause)/iu,
      ).length > 0
        ? affectedPairsFromFindings(
            input.objective,
            /(?:semantic|sentence|pause)/iu,
          )
        : input.allPairIds;
  }
  if (!input.bryce.segmentationPass) {
    const segmentationPairs = affectedPairsFromFindings(
      input.objective,
      /(?:segment|stitch|fragment|discontinuit)/iu,
    );
    if (segmentationPairs.includes("sample-02")) {
      signals.push({
        dimension: "short_table_field_grouping",
        direction: "too_fragmented",
        severity: 0.9,
        evidence: [
          "The table excerpt failed a local segmentation or stitch-structure check.",
        ],
      });
      affected.short_table_field_grouping = ["sample-02"];
    }
  }
  if (
    (input.bryce.correctedMedianScores.pause_quality ?? 0) <
      4 &&
    !signals.some(
      (signal) => signal.dimension === "sentence_pause",
    )
  ) {
    signals.push({
      dimension: "sentence_pause",
      direction: "too_short",
      severity: 0.85,
      evidence: [
        "The corrected median pause-quality score is below 4.0.",
      ],
    });
    affected.sentence_pause = input.allPairIds;
  }
  if (signals.length === 0) {
    throw new Error(
      "Tuning branch was selected without a permitted localized failure signal",
    );
  }
  return createTuningConditionalDraft({
    basePlanHash: input.planHash,
    signals,
    affectedExcerptIdsByDimension: affected,
  });
}

export function selectedTuningMetrics(
  original: AiBryceDecisionMetrics,
  selected: ReturnType<typeof aggregateConditionalPanel>[
    "candidates"
  ][number],
  conditionalBaseline: ReturnType<
    typeof aggregateConditionalPanel
  >["candidates"][number],
  draft: AiConditionalBranchDraft,
  primaryPanel: ReturnType<typeof aggregateAiPanel>,
  subplan: AiBoundConditionalSubplan,
): AiBryceDecisionMetrics {
  const cause = draft.cause?.dimension;
  const targetDimension =
    cause === "speaking_rate"
      ? ("listening_comfort" as const)
      : ("pause_quality" as const);
  const scores = Object.fromEntries(
    AI_AUDIO_SCORE_DIMENSIONS.map((dimension) => {
      const before = original.correctedMedianScores[dimension];
      const tuned = selected.medianScores[dimension];
      return [
        dimension,
        dimension === targetDimension
          ? tuned
          : before === null || tuned === null
            ? null
            : Math.min(before, tuned),
      ];
    }),
  ) as AiBryceDecisionMetrics["correctedMedianScores"];
  const naturalness = scores.naturalness;
  const listeningComfort = scores.listening_comfort;
  const longForm = scores.long_form_suitability;
  const affected = new Set(draft.affectedExcerptIds);
  const tunedAheadBaseline =
    selected.aheadOfCandidateVotesByExcerpt[
      "source-baseline"
    ] ?? {};
  const tunedClearerThanBaseline =
    selected.clearerThanCandidateVotesByExcerpt[
      "source-baseline"
    ] ?? {};
  let correctedPairMajorityWins = 0;
  let correctedPreferences = 0;
  let totalPreferences = 0;
  for (const [
    pairId,
    preference,
  ] of Object.entries(
    primaryPanel.perceptual.pair_preferences,
  )) {
    if (affected.has(pairId)) {
      const tunedVotes = tunedAheadBaseline[pairId] ?? 0;
      correctedPreferences += tunedVotes;
      totalPreferences += 3;
      if (tunedVotes >= 2) correctedPairMajorityWins += 1;
      continue;
    }
    correctedPreferences +=
      preference.overall.counts["bryce-corrected"] ?? 0;
    totalPreferences += preference.overall.total;
    if (
      preference.overall.majorityCandidateId ===
      "bryce-corrected"
    ) {
      correctedPairMajorityWins += 1;
    }
  }
  const selectedSlow = draft.affectedExcerptIds.filter(
    (excerptId) =>
      (selected.tooSlowJudgeCountByExcerpt[excerptId] ?? 0) >=
      2,
  );
  const runtimeAndContentPass =
    selected.objectiveIntegrityPass &&
    (selected.contentConsistency ?? 0) >= 0.95 &&
    (selected.semanticFaithfulnessMedian ?? 0) >= 4;
  const tunedPausePass =
    runtimeAndContentPass &&
    (selected.medianScores.pause_quality ?? 0) >= 4;
  const tablePairId = "sample-02";
  const durationFor = (candidateId: string) =>
    subplan.audioInputs.find(
      (clip) =>
        clip.excerptId === tablePairId &&
        clip.candidateId === candidateId,
    )?.durationSeconds;
  const selectedTableDuration = durationFor(
    selected.candidateId,
  );
  const sourceTableDuration = durationFor(
    "source-corrected",
  );
  const baselineTableDuration = durationFor(
    "source-baseline",
  );
  const tableWasRetuned =
    affected.has(tablePairId) &&
    (cause === "table_row_pause" ||
      cause === "short_table_field_grouping");
  const tableCorrectedClearerRate = tableWasRetuned
    ? (tunedClearerThanBaseline[tablePairId] ?? 0) / 3
    : original.tableCorrectedClearerRate;
  const tableDurationImproved =
    selectedTableDuration !== undefined &&
    sourceTableDuration !== undefined &&
    selectedTableDuration < sourceTableDuration - 0.01;
  const selectedAddsDuration =
    selectedTableDuration !== undefined &&
    baselineTableDuration !== undefined &&
    selectedTableDuration > baselineTableDuration + 0.01;
  const tableAddedDurationAcceptedRate = tableWasRetuned
    ? !selectedAddsDuration
      ? 1
      : (selected.clarityJustifiesLongerDurationRate ?? 0) >
            0.5 &&
          (selected.longerDurationExcessiveRate ?? 1) <= 0.5
        ? selected.clarityJustifiesLongerDurationRate
        : 0
    : original.tableAddedDurationAcceptedRate;
  const tableEfficiencyPass = tableWasRetuned
    ? tunedPausePass &&
      tableDurationImproved &&
      (tableCorrectedClearerRate ?? 0) > 0.5 &&
      (tableAddedDurationAcceptedRate ?? 0) > 0.5
    : original.tableEfficiencyPass;
  const semanticPauseStructurePass =
    cause?.endsWith("_pause") === true
      ? tunedPausePass
      : original.semanticPauseStructurePass;
  const segmentationPass =
    cause === "short_table_field_grouping"
      ? tunedPausePass
      : original.segmentationPass;
  const voiceNaturalnessAcceptable =
    naturalness !== null &&
    naturalness >= 3.8 &&
    conditionalBaseline.medianScores.naturalness !== null &&
    naturalness >=
      conditionalBaseline.medianScores.naturalness - 0.25;
  const fatigueAcceptable =
    (listeningComfort ?? 0) >= 3.8 &&
    (longForm ?? 0) >= 3.8;
  const conditionalBlockingDefects = [
    ...(runtimeAndContentPass
      ? []
      : ["CONDITIONAL_OBJECTIVE_OR_CONTENT_AUDIT_FAILED"]),
    ...(semanticPauseStructurePass
      ? []
      : ["CONDITIONAL_SEMANTIC_PAUSE_STRUCTURE_FAILED"]),
    ...(segmentationPass
      ? []
      : ["CONDITIONAL_SEGMENTATION_FAILED"]),
    ...(tableEfficiencyPass
      ? []
      : ["CONDITIONAL_TABLE_EFFICIENCY_FAILED"]),
    ...(voiceNaturalnessAcceptable
      ? []
      : ["CONDITIONAL_NATURALNESS_SAFEGUARD_FAILED"]),
    ...(fatigueAcceptable
      ? []
      : ["CONDITIONAL_FATIGUE_SAFEGUARD_FAILED"]),
  ];
  return {
    ...original,
    baselineNaturalnessMedian:
      conditionalBaseline.medianScores.naturalness,
    validJudgeCount: 5,
    correctedPairMajorityWins,
    totalPairCount: Object.keys(
      primaryPanel.perceptual.pair_preferences,
    ).length,
    correctedOverallPreferenceRate:
      totalPreferences === 0
        ? null
        : correctedPreferences / totalPreferences,
    correctedMedianScores: scores,
    criticalPronunciationMaxJudgeCount: Math.max(
      original.criticalPronunciationMaxJudgeCount,
      selected.criticalPronunciationJudgeCount,
    ),
    blockingAcousticDefects: [
      ...original.blockingAcousticDefects,
      ...conditionalBlockingDefects,
    ],
    correctedExcessivelySlowMajoritySampleIds:
      cause === "speaking_rate"
        ? selectedSlow
        : [
            ...new Set([
              ...original.correctedExcessivelySlowMajoritySampleIds,
              ...selectedSlow,
            ]),
          ],
    tableCorrectedClearerRate,
    tableAddedDurationAcceptedRate,
    tableOnlyRemainingIssue: false,
    semanticPauseStructurePass,
    segmentationPass,
    tableEfficiencyPass,
    voiceNaturalnessAcceptable,
    fatigueAcceptable,
    panelConfidence:
      selected.meanConfidence === null
        ? original.panelConfidence
        : Math.min(
            original.panelConfidence,
            selected.meanConfidence,
          ),
    decisiveEvidence: [
      ...original.decisiveEvidence,
      `One-round conditional profile ${selected.candidateId} passed the blind target and safeguard checks.`,
    ],
  };
}

export function incompleteTuningStatusForConditionalExecution(
  status: Exclude<
    AiConditionalExecutionResult["status"],
    "COMPLETE"
  >,
): "NOT_EXECUTED_BUDGET" | "NOT_RUN" {
  return status === "STOPPED_CAP"
    ? "NOT_EXECUTED_BUDGET"
    : "NOT_RUN";
}

interface Phase2CPaths {
  root: string;
  privateDirectory: string;
  privateRecordsDirectory: string;
  judgeResponsesDirectory: string;
  plan: string;
  ledger: string;
  objective: string;
  privateManifest: string;
  invalidResponses: string;
  panelAnalysis: string;
  panelReport: string;
  decisionSummary: string;
  costReport: string;
}

async function ensureOutputLayout(
  outputDirectory: string,
): Promise<Phase2CPaths> {
  assertSafeOutputDirectory(outputDirectory);
  await mkdir(PHASE2C_ROOT, {
    recursive: true,
    mode: 0o700,
  });
  const phaseRoot = await lstat(PHASE2C_ROOT);
  if (
    !phaseRoot.isDirectory() ||
    phaseRoot.isSymbolicLink() ||
    (await realpath(PHASE2C_ROOT)) !== PHASE2C_ROOT
  ) {
    throw new Error(
      "Phase 2C parent must be a canonical non-symlink directory",
    );
  }
  if (await pathExists(outputDirectory)) {
    const existing = await lstat(outputDirectory);
    if (
      !existing.isDirectory() ||
      existing.isSymbolicLink() ||
      (await realpath(outputDirectory)) !== outputDirectory
    ) {
      throw new Error(
        "Phase 2C output must be a canonical non-symlink directory",
      );
    }
  } else {
    await mkdir(outputDirectory, {
      recursive: false,
      mode: 0o700,
    });
  }
  const privateDirectory = resolve(
    outputDirectory,
    "private",
  );
  const privateRecordsDirectory = resolve(
    privateDirectory,
    "api-records",
  );
  const judgeResponsesDirectory = resolve(
    outputDirectory,
    "ai-judge-responses",
  );
  for (const directory of [
    privateDirectory,
    privateRecordsDirectory,
    judgeResponsesDirectory,
  ]) {
    await mkdir(directory, {
      recursive: false,
      mode: 0o700,
    }).catch(async (error: unknown) => {
      if (
        !isRecord(error) ||
        error.code !== "EEXIST"
      ) {
        throw error;
      }
      const existing = await lstat(directory);
      if (
        !existing.isDirectory() ||
        existing.isSymbolicLink()
      ) {
        throw new Error(
          `Required output directory is unsafe: ${directory}`,
        );
      }
    });
  }
  return {
    root: outputDirectory,
    privateDirectory,
    privateRecordsDirectory,
    judgeResponsesDirectory,
    plan: resolve(outputDirectory, "ai-evaluation-plan.json"),
    ledger: resolve(
      outputDirectory,
      "ai-evaluation-ledger.jsonl",
    ),
    objective: resolve(
      outputDirectory,
      "objective-audio-analysis.json",
    ),
    privateManifest: resolve(
      outputDirectory,
      "private-ai-manifest.json",
    ),
    invalidResponses: resolve(
      outputDirectory,
      "invalid-ai-responses.json",
    ),
    panelAnalysis: resolve(
      outputDirectory,
      "ai-panel-analysis.json",
    ),
    panelReport: resolve(
      outputDirectory,
      "ai-panel-report.md",
    ),
    decisionSummary: resolve(
      outputDirectory,
      "decision-summary.md",
    ),
    costReport: resolve(outputDirectory, "cost-report.json"),
  };
}

/**
 * Acquires the single paid-execution lock for this Phase 2C task.
 *
 * The fixed task filename deliberately does not include either the selected
 * output directory or the plan hash. Consequently, changing --output-dir or
 * regenerating a plan cannot create another USD 10 authorization envelope.
 * The plan hash remains recorded inside the lock for reconciliation.
 */
export async function acquireTaskWidePaidExecutionLock(input: {
  planHash: string;
  createdAt: string;
  processId?: number;
  phaseRootForTest?: string;
}): Promise<string> {
  if (!/^[a-f0-9]{64}$/u.test(input.planHash)) {
    throw new Error(
      "Task-wide paid-execution lock requires an exact plan hash",
    );
  }
  const phaseRoot = resolve(
    input.phaseRootForTest ?? PHASE2C_ROOT,
  );
  const rootMetadata = await lstat(phaseRoot);
  const processUid = process.getuid?.();
  if (
    !rootMetadata.isDirectory() ||
    rootMetadata.isSymbolicLink() ||
    (await realpath(phaseRoot)) !== phaseRoot ||
    (rootMetadata.mode & 0o777) !== 0o700 ||
    (processUid !== undefined &&
      rootMetadata.uid !== processUid)
  ) {
    throw new Error(
      "Task-wide paid-execution lock root must be a canonical, process-owned mode-0700 directory",
    );
  }
  const lockPath = resolve(
    phaseRoot,
    TASK_WIDE_PAID_LOCK_FILENAME,
  );
  let lock: Awaited<ReturnType<typeof open>>;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (isRecord(error) && error.code === "EEXIST") {
      throw new Error(
        "Task-wide Phase 2C paid execution is already locked; changing the output directory or regenerating the plan does not authorize another run",
        { cause: error },
      );
    }
    throw error;
  }
  try {
    await lock.writeFile(
      `${JSON.stringify({
        schemaVersion:
          "tenxpros-phase2c-openrouter-task-wide-paid-execution-lock-v2",
        evaluationId: "phase2c-openrouter-bryce-20260726",
        planHash: input.planHash,
        processId: input.processId ?? process.pid,
        createdAt: input.createdAt,
        scope:
          "One paid authorization envelope for the entire Phase 2C task, independent of output directory and regenerated plan hashes.",
        removal:
          "Fail-safe one-off lock. Inspect every Phase 2C ledger and API record and reconcile possible billed exposure before any manual removal.",
      })}\n`,
      "utf8",
    );
    await lock.sync();
  } finally {
    await lock.close();
  }
  const lockMetadata = await lstat(lockPath);
  if (
    !lockMetadata.isFile() ||
    lockMetadata.isSymbolicLink() ||
    (lockMetadata.mode & 0o777) !== 0o600 ||
    (processUid !== undefined &&
      lockMetadata.uid !== processUid)
  ) {
    throw new Error(
      "Task-wide paid-execution lock was not created with secure ownership and mode",
    );
  }
  const rootHandle = await open(phaseRoot, "r");
  try {
    await rootHandle.sync();
  } finally {
    await rootHandle.close();
  }
  return lockPath;
}

export async function acquireResponseRecoveryRunLock(input: {
  recoveryPlan: ResponseRecoveryPlan;
  createdAt: string;
  processId?: number;
  priorRunDirectory?: string;
  phaseRootForTest?: string;
}): Promise<string> {
  assertResponseRecoveryPlanInvariant(input.recoveryPlan);
  const { recoveryPlanHash } = input.recoveryPlan;
  const phaseRoot = resolve(
    input.phaseRootForTest ?? PHASE2C_ROOT,
  );
  const priorRunDirectory = resolve(
    input.priorRunDirectory ?? DEFAULT_OUTPUT,
  );
  const offlineCompletion =
    await verifyOfflineRecoveryCompletionForPaidExecution({
      recoveryPlan: input.recoveryPlan,
      priorRunDirectory,
    });
  const rootMetadata = await lstat(phaseRoot);
  const processUid = process.getuid?.();
  if (
    !rootMetadata.isDirectory() ||
    rootMetadata.isSymbolicLink() ||
    (await realpath(phaseRoot)) !== phaseRoot ||
    (rootMetadata.mode & 0o777) !== 0o700 ||
    (processUid !== undefined &&
      rootMetadata.uid !== processUid)
  ) {
    throw new Error(
      "Response-recovery lock root must be a canonical, process-owned mode-0700 directory",
    );
  }
  const priorLockPath = resolve(
    phaseRoot,
    TASK_WIDE_PAID_LOCK_FILENAME,
  );
  const priorLedgerPath = resolve(
    priorRunDirectory,
    "ai-evaluation-ledger.jsonl",
  );
  const priorLockMetadata = await lstat(priorLockPath);
  if (
    !priorLockMetadata.isFile() ||
    priorLockMetadata.isSymbolicLink() ||
    (priorLockMetadata.mode & 0o777) !== 0o600 ||
    (processUid !== undefined &&
      priorLockMetadata.uid !== processUid)
  ) {
    throw new Error(
      "Prior paid lock is not a secure immutable recovery source",
    );
  }
  const priorLockBytes = await readFile(priorLockPath);
  const priorLedgerBytes = await readFile(priorLedgerPath);
  const priorLockSha256 = sha256(priorLockBytes);
  const priorLedgerSha256 = sha256(priorLedgerBytes);
  if (
    priorLockSha256 !==
      input.recoveryPlan.previousLockSha256 ||
    priorLedgerSha256 !==
      input.recoveryPlan.previousLedgerSha256
  ) {
    throw new Error(
      "Prior paid lock or ledger bytes changed after recovery planning",
    );
  }
  const priorLock = JSON.parse(
    priorLockBytes.toString("utf8"),
  ) as unknown;
  if (
    !isRecord(priorLock) ||
    priorLock.planHash !== PRIOR_PAID_PLAN_HASH
  ) {
    throw new Error(
      "Prior paid lock does not reference the superseded paid plan",
    );
  }
  const recoveryLockPath = resolve(
    phaseRoot,
    RECOVERY_RUN_LOCK_FILENAME,
  );
  let lock: Awaited<ReturnType<typeof open>>;
  try {
    lock = await open(recoveryLockPath, "wx", 0o600);
  } catch (error) {
    if (isRecord(error) && error.code === "EEXIST") {
      throw new Error(
        "Response-recovery execution is already locked; no prior request may be replayed",
        { cause: error },
      );
    }
    throw error;
  }
  try {
    await lock.writeFile(
      `${JSON.stringify({
        schemaVersion:
          "tenxpros-phase2c-response-recovery-run-lock-v1",
        recoveryPlanHash,
        processId: input.processId ?? process.pid,
        createdAt: input.createdAt,
        supersedesWithoutDeletion: {
          priorLockFilename:
            TASK_WIDE_PAID_LOCK_FILENAME,
          priorLockSha256,
          priorPlanHash: PRIOR_PAID_PLAN_HASH,
          priorLedgerRelativePath:
            "phase2c-openrouter-bryce-20260726/ai-evaluation-ledger.jsonl",
          priorLedgerSha256,
          priorLedgerTerminalHash:
            input.recoveryPlan
              .previousLedgerTerminalHash,
        },
        carriedForwardAccounting: {
          actualCostUsd: PRIOR_PAID_ACTUAL_COST_USD,
          externalRequests:
            PRIOR_PAID_EXTERNAL_REQUESTS,
          uncertainCostUsd: 0,
        },
        cumulativeCaps: input.recoveryPlan.cumulativeCaps,
        offlineRecoveryAttestation: {
          recoveryReportSha256:
            offlineCompletion.recoveryReportSha256,
          recoveryLedgerSha256:
            offlineCompletion.recoveryLedgerSha256,
          recoveryLedgerTerminalHash:
            offlineCompletion.recoveryLedgerTerminalHash,
          completionEvent:
            "OFFLINE_RECOVERY_REPORT_HASH_VERIFIED",
        },
        missingPerspectiveIds:
          input.recoveryPlan.missingPerspectiveIds,
        replayProhibitedRequestIndexes:
          input.recoveryPlan.rejectedResponses.map(
            (response) => response.requestIndex,
          ),
        scope:
          "One recovery authorization that preserves the prior lock and ledger, recovers old responses offline first, and permits at most one replacement primary for each still-missing perspective.",
      })}\n`,
      "utf8",
    );
    await lock.sync();
  } finally {
    await lock.close();
  }
  const recoveryLockMetadata = await lstat(
    recoveryLockPath,
  );
  if (
    !recoveryLockMetadata.isFile() ||
    recoveryLockMetadata.isSymbolicLink() ||
    (recoveryLockMetadata.mode & 0o777) !== 0o600 ||
    (processUid !== undefined &&
      recoveryLockMetadata.uid !== processUid)
  ) {
    throw new Error(
      "Response-recovery lock was not created securely",
    );
  }
  if (
    sha256(await readFile(priorLockPath)) !==
      priorLockSha256 ||
    sha256(await readFile(priorLedgerPath)) !==
      priorLedgerSha256
  ) {
    throw new Error(
      "Prior paid lock or ledger changed while acquiring the recovery lock",
    );
  }
  const offlineCompletionAfterLock =
    await verifyOfflineRecoveryCompletionForPaidExecution({
      recoveryPlan: input.recoveryPlan,
      priorRunDirectory,
    });
  if (
    stableJson(offlineCompletionAfterLock) !==
      stableJson(offlineCompletion)
  ) {
    throw new Error(
      "Offline recovery report or completion ledger changed while acquiring the recovery lock",
    );
  }
  const rootHandle = await open(phaseRoot, "r");
  try {
    await rootHandle.sync();
  } finally {
    await rootHandle.close();
  }
  return recoveryLockPath;
}

async function prepareObjectiveArtifact(
  frozen: FrozenInput,
  paths: Phase2CPaths,
): Promise<EnrichedObjectiveArtifact> {
  const objectivePlan = await buildObjectivePlan(frozen);
  const objectivePlanPath = resolve(
    paths.privateDirectory,
    "objective-audio-plan.json",
  );
  await writeOrVerifyJson(objectivePlanPath, objectivePlan);
  const rawPath = resolve(
    paths.privateDirectory,
    "objective-audio-analysis.raw.json",
  );
  const runtime = await pathExists(rawPath)
    ? (JSON.parse(await readFile(rawPath, "utf8")) as unknown)
    : await runObjectiveRuntime(paths.root);
  if (
    !isRecord(runtime) ||
    runtime.schemaVersion !==
      "tenxpros-phase2c-objective-audio-analysis-v1" ||
    !isRecord(runtime.plan) ||
    runtime.plan.sha256 !==
      (await sha256File(objectivePlanPath)) ||
    !isRecord(runtime.summary) ||
    runtime.summary.sampleCount !== frozen.audio.length ||
    runtime.summary.allSourcesPreserved !== true ||
    !Array.isArray(runtime.samples)
  ) {
    throw new Error(
      "Raw objective result does not match the current objective plan",
    );
  }
  const rawSources = new Map(
    runtime.samples.flatMap((sample) => {
      if (
        !isRecord(sample) ||
        typeof sample.id !== "string" ||
        !isRecord(sample.source) ||
        typeof sample.source.sha256 !== "string"
      ) {
        return [];
      }
      return [[sample.id, sample.source.sha256] as const];
    }),
  );
  if (
    rawSources.size !== frozen.audio.length ||
    frozen.audio.some(
      (audio) =>
        rawSources.get(audio.sampleId) !== audio.sha256,
    )
  ) {
    throw new Error(
      "Raw objective result sample ids or source hashes changed",
    );
  }
  const enriched = await enrichObjectiveAnalysis(
    frozen,
    runtime,
  );
  if (!isRecord(enriched)) {
    throw new Error("Objective enrichment returned an invalid object");
  }
  const artifact = {
    ...enriched,
    analysisHash: sha256(stableJson(enriched)),
  } as unknown as EnrichedObjectiveArtifact;
  objectiveSummaryFromArtifact(frozen, artifact);
  await writeOrVerifyJson(paths.objective, artifact);
  return artifact;
}

function dryPanelPlaceholder(
  objective: EnrichedObjectiveArtifact,
): Readonly<Record<string, unknown>> {
  return {
    schemaVersion:
      "tenxpros-phase2c-ai-panel-placeholder-v1",
    status: "NOT_RUN_DRY_RUN",
    validJudgeCount: 0,
    acceptedJudgeCalls: 0,
    rejectedJudgeCalls: 0,
    primaryDecision: "INCONCLUSIVE_AI_ONLY_EVALUATION",
    confidence: 0,
    perceptualJudgmentAvailable: false,
    objectiveAnalysisHash: objective.analysisHash,
    statement:
      "No perceptual result is claimed. Codex and local acoustic metrics do not hear audio; five audio-capable API judge runs remain pending.",
  };
}

function buildCostReport(
  plan: AiEvaluationPlan,
  ledger: readonly LedgerEntry[],
  status: string,
  secretAvailable: boolean,
): Readonly<Record<string, unknown>> {
  const accounting = paidAccountingFromLedger(ledger);
  return {
    schemaVersion:
      "tenxpros-phase2c-openrouter-cost-report-v2",
    provider: "openrouter",
    model: MODEL_ID,
    status,
    currency: "USD",
    secretAvailable,
    approvedHardMaximumUsd:
      plan.cost.approvedHardMaximumUsd,
    estimatedExecutableMaximumUsd:
      plan.cost.estimatedExecutableMaximumUsd,
    uncappedTheoreticalAllSlotsUsd:
      plan.cost.uncappedTheoreticalAllSlotsUsd,
    nominalFiveBryceCallsEstimatedUsd:
      plan.cost.nominalFiveBryceCallsEstimatedUsd,
    nominalOtherVoiceBranchEstimatedUsd:
      plan.cost.nominalOtherVoiceBranchEstimatedUsd,
    nominalTuningBranchEstimatedUsd:
      plan.cost.nominalTuningBranchEstimatedUsd,
    nominalBrycePlusOtherVoicePathEstimatedUsd:
      plan.cost
        .nominalBrycePlusOtherVoicePathEstimatedUsd,
    nominalBrycePlusWorstConditionalPathEstimatedUsd:
      plan.cost
        .nominalBrycePlusWorstConditionalPathEstimatedUsd,
    nominalWorstConditionalPathExceedsHardCap:
      plan.cost
        .nominalBrycePlusWorstConditionalPathEstimatedUsd >
      plan.cost.approvedHardMaximumUsd,
    conditionalGeneratedAudioDurationCeiling:
      plan.expectedMaximumInput
        .conditionalGeneratedAudioDurationCeiling,
    maximumRequests: plan.judges.maximumApiRequests,
    externalRequestsMade:
      accounting.externalRequestCount,
    acceptedJudgeCalls:
      accounting.acceptedJudgeCalls,
    rejectedJudgeCalls:
      accounting.rejectedJudgeCalls,
    uncertainPaidCalls:
      accounting.uncertainPaidCalls,
    knownActualOpenRouterCostUsd:
      accounting.knownActualCostUsd,
    uncertainMaximumExposureUsd:
      accounting.uncertainMaximumExposureUsd,
    capAccountedCostUsd:
      accounting.capAccountedCostUsd,
    actualCostBasis:
      "Authoritative OpenRouter usage.cost from each settled response; missing usage.cost is treated as uncertain paid exposure except explicit pre-inference HTTP 402/429 rejection statuses, which are recorded as unbilled and handled fail-closed.",
    planningAudioTokenAssumption:
      plan.cost.planningAssumption,
    perRequestProviderBoundUsd:
      plan.cost.perRequestProviderBoundUsd,
    providerBoundBasis: plan.cost.providerBoundBasis,
    retriesAndConditionalBranchGuaranteed: false,
    conditionalRequestAdmission:
      "Sequential and fail-closed: stop before dispatch when the remaining USD/request envelope cannot reserve the formal provider-bounded exposure of the next request; optional uncapped branch estimates do not block the initial five-judge run.",
    conditionalBranchImplementation:
      plan.judges.conditionalBranchImplementation,
    elevenLabsRequests: 0,
  };
}

function dryPanelReport(
  plan: AiEvaluationPlan,
  objective: EnrichedObjectiveArtifact,
  secretAvailable: boolean,
): string {
  return `# Phase 2C AI panel report

Status: **NOT RUN — DRY RUN ONLY**

The frozen ten-file Phase 2B package passed its manifest, ZIP, tree, audio-hash, and duration checks. Deterministic local objective analysis completed for all ten MP3 files with zero network requests and no model downloads. Its analysis hash is \`${objective.analysisHash}\`.

No perceptual score or winner is reported. Local acoustic measurements and Codex do not hear the clips. The required five independent OpenRouter audio-capable \`${MODEL_ID}\` judges have not run.

- API secret present: ${secretAvailable ? "yes" : "no"}
- OpenRouter API requests: 0
- Actual OpenRouter cost: USD 0
- Nominal five-judge estimate: USD ${plan.cost.nominalFiveBryceCallsEstimatedUsd.toFixed(6)}
- Approved hard cap: USD ${plan.cost.approvedHardMaximumUsd}
- Planned request cap: ${String(plan.judges.maximumApiRequests)}
- ElevenLabs calls: 0
- Conditional tuning/Linda/Cori orchestration: implemented as corrected-only local generation, hash-bound derived subplans, three fresh blind judges, one validation-only retry, and fail-closed budget checks

Production-content drift does not block this frozen-sample evaluation. Content reconciliation is deferred until a Piper candidate passes and is required before any full production generation or deployment.

AI-only judging is not equivalent to a representative human learner study.
`;
}

function dryDecisionSummary(
  plan: AiEvaluationPlan,
  objective: EnrichedObjectiveArtifact,
  secretAvailable: boolean,
): string {
  return `# Phase 2C decision summary

Primary decision: **INCONCLUSIVE_AI_ONLY_EVALUATION**

Confidence: **0 / 100**

The local objective analysis completed (${objective.analysisHash}), but it cannot establish naturalness, pronunciation correctness, listener fatigue, or professional credibility. Five genuinely audio-capable blind judge runs are still required before returning one of the authorized decision values.

API secret available: **${secretAvailable ? "yes" : "no"}**

## Execution controls and command

${ownerAction(plan)}

No production audio, Academy content, service, learner-facing player, or ElevenLabs integration was changed.

Conditional branches are implemented but were not executed in this dry run. After a complete primary panel selects a branch, each fresh judge and any single validation-only retry is dispatched sequentially only when the append-only ledger can reserve that next request's formal provider-bounded exposure without crossing either hard cap.
`;
}

async function initializeDryRunArtifacts(
  frozen: FrozenInput,
  plan: AiEvaluationPlan,
  privateManifest: PrivateAiManifest,
  paths: Phase2CPaths,
  objective: EnrichedObjectiveArtifact,
  secretAvailable: boolean,
): Promise<void> {
  assertPrivateManifestHashInvariant(plan, privateManifest);
  await writeOrVerifyJson(paths.plan, plan);
  await writeOrVerifyJson(
    paths.privateManifest,
    privateManifest,
  );
  const emittedPrivateManifestSha256 = await sha256File(
    paths.privateManifest,
  );
  if (
    emittedPrivateManifestSha256 !==
    plan.privateAssignmentManifestSha256
  ) {
    throw new Error(
      "Emitted private-ai-manifest.json bytes do not match the plan-bound SHA-256 invariant",
    );
  }
  const ledger = await readLedger(paths.ledger);
  if (ledger.length === 0) {
    await appendLedger(
      paths.ledger,
      plan.planHash,
      "DRY_RUN_PREPARED",
      {
        status: "NOT_RUN_DRY_RUN",
        externalRequestsMade: 0,
        actualOpenRouterCostUsd: 0,
        frozenAudioFiles: frozen.audio.length,
        objectiveAnalysisHash: objective.analysisHash,
      },
      () => "2026-07-26T00:00:00.000Z",
    );
  } else {
    verifyLedgerEntries(ledger, plan.planHash);
  }
  if (!(await pathExists(paths.panelAnalysis))) {
    await writeNewJson(
      paths.panelAnalysis,
      dryPanelPlaceholder(objective),
    );
  }
  if (!(await pathExists(paths.invalidResponses))) {
    await writeNewJson(paths.invalidResponses, {
      schemaVersion:
        "tenxpros-phase2c-invalid-ai-responses-v1",
      invalidResponses: [],
    });
  }
  if (!(await pathExists(paths.panelReport))) {
    await writeAtomicText(
      paths.panelReport,
      dryPanelReport(plan, objective, secretAvailable),
    );
  }
  if (!(await pathExists(paths.decisionSummary))) {
    await writeAtomicText(
      paths.decisionSummary,
      dryDecisionSummary(
        plan,
        objective,
        secretAvailable,
      ),
    );
  }
  await writeAtomicJson(
    paths.costReport,
    buildCostReport(
      plan,
      await readLedger(paths.ledger),
      secretAvailable
        ? "DRY_RUN_READY_FOR_EXPLICIT_PAID_AUTHORIZATION"
        : "BLOCKED_SECRET_ABSENT",
      secretAvailable,
    ),
  );
}

async function executeAutomaticConditionalBranch(input: {
  frozen: FrozenInput;
  plan: AiEvaluationPlan;
  bryce: AiBryceDecisionMetrics;
  primaryPanel: ReturnType<typeof aggregateAiPanel>;
  objective: AiObjectiveAnalysisSummary;
  secret: string;
  paths: Phase2CPaths;
  dependencies: AiAudioEvaluationDependencies;
}): Promise<{
  decision: ReturnType<typeof decideLocalNarration>;
  panelArtifact: unknown;
  conditionalValidJudgeCount: number;
}> {
  const initialDecision = decideLocalNarration({
    bryce: input.bryce,
  });
  if (initialDecision.internalBranch === "NONE") {
    return {
      decision: initialDecision,
      panelArtifact: input.primaryPanel,
      conditionalValidJudgeCount: 0,
    };
  }
  const now =
    input.dependencies.now ??
    (() => new Date().toISOString());
  const accounting = paidAccountingFromLedger(
    await readLedger(input.paths.ledger),
  );
  if (
    !canStartConditionalBranchSequentially({
      requestsUsed: accounting.externalRequestCount,
      capAccountedCostUsd:
        accounting.capAccountedCostUsd,
      maximumRequests:
        input.plan.judges.maximumApiRequests,
      maximumUsd:
        input.plan.cost.approvedHardMaximumUsd,
    })
  ) {
    await appendLedger(
      input.paths.ledger,
      input.plan.planHash,
      "CONDITIONAL_BRANCH_NOT_EXECUTED_BUDGET",
      {
        branch: initialDecision.internalBranch,
        capAccountedCostUsd:
          accounting.capAccountedCostUsd,
        nextRequestProviderBoundUsd:
          PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
        approvedHardMaximumUsd:
          input.plan.cost.approvedHardMaximumUsd,
        dispatchPolicy:
          "SEQUENTIAL_LEDGER_GATED_PER_REQUEST",
        externalRequestMade: false,
      },
      now,
    );
    const decision =
      initialDecision.internalBranch === "TUNING"
        ? decideLocalNarration({
            bryce: input.bryce,
            tuning: {
              status: "NOT_EXECUTED_BUDGET",
              evidence: [
                "The remaining approved budget cannot reserve even the next conditional judge at the formal provider-bound per-request exposure.",
              ],
            },
          })
        : decideLocalNarration({
            bryce: input.bryce,
            voices: {
              status: "NOT_EXECUTED_BUDGET",
            },
          });
    return {
      decision,
      panelArtifact: {
        schemaVersion:
          "tenxpros-phase2c-combined-ai-panel-v1",
        primaryBryce: input.primaryPanel,
        conditional: {
          branch: initialDecision.internalBranch,
          status: "NOT_EXECUTED_BUDGET",
          nextRequestProviderBoundUsd:
            PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
          dispatchPolicy:
            "SEQUENTIAL_LEDGER_GATED_PER_REQUEST",
          externalRequests: 0,
        },
      },
      conditionalValidJudgeCount: 0,
    };
  }
  const allPairIds = input.frozen.manifest.pairs
    .map((pair) => pair.pairId)
    .sort();
  const draft =
    initialDecision.internalBranch === "TUNING"
      ? createAutomaticTuningDraft({
          planHash: input.plan.planHash,
          bryce: input.bryce,
          objective: input.objective,
          allPairIds,
        })
      : createLocalVoiceConditionalDraft({
          basePlanHash: input.plan.planHash,
          excerptIds: allPairIds,
        });
  const prepared = await generateAndBindConditionalSubplan({
    frozen: input.frozen,
    plan: input.plan,
    draft,
    objective: input.objective,
    paths: input.paths,
  });
  const execution = await executeBoundConditionalPanel({
    subplan: prepared.subplan,
    audioPayloads: prepared.audioPayloads,
    secret: input.secret,
    plan: input.plan,
    ledgerPath: input.paths.ledger,
    privateRecordsDirectory:
      input.paths.privateRecordsDirectory,
    fetchImpl:
      input.dependencies.fetchImpl ?? defaultFetch,
    now,
  });
  const invalidArtifact = JSON.parse(
    await readFile(input.paths.invalidResponses, "utf8"),
  ) as unknown;
  if (
    !isRecord(invalidArtifact) ||
    !Array.isArray(invalidArtifact.invalidResponses)
  ) {
    throw new Error(
      "Primary invalid-response artifact changed before conditional aggregation",
    );
  }
  await writeAtomicJson(input.paths.invalidResponses, {
    ...invalidArtifact,
    conditionalSubplanHash:
      prepared.subplan.subplanHash,
    conditionalInvalidResponses: execution.rejected,
  });
  for (const run of execution.runs) {
    await writeNewJson(
      resolve(
        input.paths.judgeResponsesDirectory,
        `conditional-${draft.draftHash.slice(
          0,
          12,
        )}-${run.assignment.judgeId}.json`,
      ),
      {
        schemaVersion:
          "tenxpros-phase2c-accepted-conditional-judge-run-v1",
        subplanHash: prepared.subplan.subplanHash,
        judgeId: run.assignment.judgeId,
        assignmentId: run.assignment.assignmentId,
        assignmentHash: run.assignment.assignmentHash,
        responseHash: run.responseHash,
        response: run.response,
        privateCandidateMappingIncluded: false,
        priorJudgeResultsIncluded: false,
      },
    );
  }
  if (execution.status !== "COMPLETE") {
    const decision =
      draft.branchKind === "TUNING"
        ? decideLocalNarration({
            bryce: input.bryce,
            tuning: {
              status:
                incompleteTuningStatusForConditionalExecution(
                  execution.status,
                ),
              evidence: [
                `The conditional panel stopped ${execution.status} with ${String(
                  execution.runs.length,
                )} of 3 valid judges.`,
              ],
            },
          })
        : decideLocalNarration({
            bryce: input.bryce,
            voices: { status: "INCOMPLETE" },
          });
    return {
      decision,
      panelArtifact: {
        schemaVersion:
          "tenxpros-phase2c-combined-ai-panel-v1",
        primaryBryce: input.primaryPanel,
        conditional: {
          branch: draft.branchKind,
          status: execution.status,
          draftHash: draft.draftHash,
          subplanHash: prepared.subplan.subplanHash,
          validJudgeCount: execution.runs.length,
          rejected: execution.rejected,
        },
      },
      conditionalValidJudgeCount: execution.runs.length,
    };
  }
  const conditionalPanel = aggregateConditionalPanel({
    subplan: prepared.subplan,
    runs: execution.runs,
  });
  let decision: ReturnType<typeof decideLocalNarration>;
  let branchDecisionEvidence: unknown;
  if (draft.branchKind === "TUNING") {
    const selection = selectTunedConditionalCandidate({
      draft,
      summaries: conditionalPanel.candidates,
    });
    const selected =
      selection.selectedCandidateId === null
        ? undefined
        : conditionalPanel.candidates.find(
            (candidate) =>
              candidate.candidateId ===
              selection.selectedCandidateId,
          );
    const conditionalBaseline =
      conditionalPanel.candidates.find(
        (candidate) =>
          candidate.candidateId === "source-baseline",
      );
    const selectedMetrics =
      selected === undefined || conditionalBaseline === undefined
        ? undefined
        : selectedTuningMetrics(
            input.bryce,
            selected,
            conditionalBaseline,
            draft,
            input.primaryPanel,
            prepared.subplan,
          );
    decision = decideLocalNarration({
      bryce: input.bryce,
      tuning:
        selection.status === "COMPLETED_SELECTED" &&
        selectedMetrics
          ? {
              status: "COMPLETED_SELECTED",
              selectedMetrics,
              evidence: selection.evidence,
            }
          : {
              status: "COMPLETED_NO_CLEAR_IMPROVEMENT",
              evidence: selection.evidence,
            },
    });
    branchDecisionEvidence = selection;
  } else {
    const candidates = voiceMetricsFromConditionalPanel({
      draft,
      summaries: conditionalPanel.candidates,
    });
    decision = decideLocalNarration({
      bryce: input.bryce,
      voices: {
        status: "COMPLETE",
        candidates,
      },
    });
    branchDecisionEvidence = {
      candidates,
    };
  }
  await appendLedger(
    input.paths.ledger,
    input.plan.planHash,
    "CONDITIONAL_BRANCH_COMPLETED",
    {
      branch: draft.branchKind,
      draftHash: draft.draftHash,
      subplanHash: prepared.subplan.subplanHash,
      panelHash: conditionalPanel.panelHash,
      validJudgeCount: conditionalPanel.validJudgeCount,
      primaryDecision: decision.primaryDecision,
    },
    now,
  );
  return {
    decision,
    panelArtifact: {
      schemaVersion:
        "tenxpros-phase2c-combined-ai-panel-v1",
      primaryBryce: input.primaryPanel,
      conditional: {
        branch: draft.branchKind,
        status: "COMPLETE",
        draftHash: draft.draftHash,
        subplanHash: prepared.subplan.subplanHash,
        analysis: conditionalPanel,
        decisionEvidence: branchDecisionEvidence,
      },
    },
    conditionalValidJudgeCount:
      conditionalPanel.validJudgeCount,
  };
}

async function executePrimaryBrycePanel(
  frozen: FrozenInput,
  plan: AiEvaluationPlan,
  assignments: readonly AiBlindJudgeAssignment[],
  prompts: readonly {
    judgeId: string;
    prompt: string;
    sha256: string;
  }[],
  objectiveArtifact: EnrichedObjectiveArtifact,
  secret: string,
  paths: Phase2CPaths,
  dependencies: AiAudioEvaluationDependencies,
): Promise<{
  decision: ReturnType<typeof decideLocalNarration>;
  validJudgeCount: number;
}> {
  const fetchImpl = dependencies.fetchImpl ?? defaultFetch;
  const now =
    dependencies.now ?? (() => new Date().toISOString());
  const objectiveSummary = objectiveSummaryFromArtifact(
    frozen,
    objectiveArtifact,
  );
  const runs: AiValidatedJudgeRun[] = [];
  const invalidResponses: Record<string, unknown>[] = [];
  let stopPanel = false;
  for (const assignment of assignments) {
    const prompt = prompts.find(
      (candidate) =>
        candidate.judgeId === assignment.judgeId,
    );
    if (!prompt) {
      throw new Error(
        `Missing prompt for ${assignment.judgeId}`,
      );
    }
    let accepted = false;
    for (const attempt of [1, 2] as const) {
      if (attempt === 2 && accepted) break;
      let result: JudgeCallResult;
      try {
        result = await executeJudgeAttempt(
          frozen,
          assignment,
          prompt.prompt,
          attempt,
          objectiveSummary.clearlyDistinctPairIds,
          secret,
          paths.ledger,
          plan,
          paths.privateRecordsDirectory,
          fetchImpl,
          now,
        );
      } catch (error) {
        if (
          attempt === 2 &&
          error instanceof Error &&
          /spending cap|request cap/iu.test(error.message)
        ) {
          invalidResponses.push({
            judgeId: assignment.judgeId,
            attempt,
            status: "RETRY_NOT_EXECUTED_CAP",
            issues: [
              {
                code: "RETRY_NOT_EXECUTED_CAP",
                message: error.message,
              },
            ],
          });
          break;
        }
        throw error;
      }
      if (
        result.status === "ACCEPTED" &&
        result.response &&
        result.responseHash
      ) {
        runs.push({
          assignment,
          response: result.response,
          responseHash: result.responseHash,
        });
        await writeNewJson(
          resolve(
            paths.judgeResponsesDirectory,
            `${assignment.judgeId}.json`,
          ),
          {
            schemaVersion:
              "tenxpros-phase2c-accepted-ai-judge-run-v1",
            judgeId: assignment.judgeId,
            assignmentId: assignment.assignmentId,
            assignmentHash: assignment.assignmentHash,
            attempt,
            requestIndex: result.requestIndex,
            responseHash: result.responseHash,
            usage: result.usage,
            response: result.response,
            privateMappingIncluded: false,
            priorJudgeResultsIncluded: false,
          },
        );
        accepted = true;
        break;
      }
      invalidResponses.push({
        judgeId: assignment.judgeId,
        assignmentId: assignment.assignmentId,
        attempt,
        requestIndex: result.requestIndex,
        status: result.status,
        retryAllowed: result.retryAllowed,
        usage: result.usage,
        issues: result.issues,
      });
      const nextAction = primaryJudgeNextAction(
        result,
        attempt,
      );
      if (nextAction === "STOP_PANEL") {
        stopPanel = true;
        break;
      }
      if (nextAction === "RETRY") continue;
      break;
    }
    if (stopPanel) break;
  }
  await writeAtomicJson(paths.invalidResponses, {
    schemaVersion:
      "tenxpros-phase2c-invalid-ai-responses-v1",
    invalidResponses,
  });
  const identities = identityRecords(frozen);
  if (runs.length === 0) {
    const noPanel = {
      schemaVersion:
        "tenxpros-phase2c-ai-panel-placeholder-v1",
      status: "INCOMPLETE_NO_VALID_JUDGES",
      validJudgeCount: 0,
      objectiveAnalysisHash: objectiveArtifact.analysisHash,
      perceptualJudgmentAvailable: false,
    };
    await writeAtomicJson(paths.panelAnalysis, noPanel);
    const emptyScores = Object.fromEntries(
      [
        "naturalness",
        "pause_quality",
        "pronunciation",
        "clarity",
        "listening_comfort",
        "professional_quality",
        "long_form_suitability",
      ].map((dimension) => [dimension, null]),
    ) as Parameters<
      typeof decideLocalNarration
    >[0]["bryce"]["correctedMedianScores"];
    const decision = decideLocalNarration({
      bryce: {
        validJudgeCount: 0,
        correctedPairMajorityWins: 0,
        totalPairCount: 0,
        correctedOverallPreferenceRate: null,
        correctedMedianScores: emptyScores,
        baselineNaturalnessMedian: null,
        criticalPronunciationMaxJudgeCount: 0,
        blockingAcousticDefects:
          objectiveSummary.blockingDefects.map(
            (finding) => finding.code,
          ),
        correctedExcessivelySlowMajoritySampleIds: [],
        tableCorrectedClearerRate: null,
        tableAddedDurationAcceptedRate: null,
        tableOnlyRemainingIssue: false,
        semanticPauseStructurePass: false,
        segmentationPass: false,
        tableEfficiencyPass: false,
        voiceNaturalnessAcceptable: false,
        fatigueAcceptable: false,
        panelConfidence: 0,
        decisiveEvidence: [],
        dissentingEvidence: [
          "No valid audio-capable judge response was available.",
        ],
      },
    });
    await finalizePaidReports(
      plan,
      paths,
      noPanel,
      decision,
      runs.length,
    );
    return { decision, validJudgeCount: 0 };
  }
  const panel = aggregateAiPanel({
    evaluationPackageId: EVALUATION_PACKAGE_ID,
    runs,
    privateSamples: identities,
    objective: objectiveSummary,
  });
  const bryce = deriveBryceDecisionMetrics({
    analysis: panel,
    privateSamples: identities,
    correctedCandidateId: "bryce-corrected",
    baselineCandidateId: "bryce-baseline",
  });
  const conditional =
    await executeAutomaticConditionalBranch({
      frozen,
      plan,
      bryce,
      primaryPanel: panel,
      objective: objectiveSummary,
      secret,
      paths,
      dependencies,
    });
  const decision = conditional.decision;
  await writeAtomicJson(
    paths.panelAnalysis,
    conditional.panelArtifact,
  );
  await finalizePaidReports(
    plan,
    paths,
    conditional.panelArtifact,
    decision,
    runs.length,
  );
  return {
    decision,
    validJudgeCount: runs.length,
  };
}

async function finalizePaidReports(
  plan: AiEvaluationPlan,
  paths: Phase2CPaths,
  panel: unknown,
  decision: ReturnType<typeof decideLocalNarration>,
  validJudgeCount: number,
): Promise<void> {
  const ledger = await readLedger(paths.ledger);
  const accounting = paidAccountingFromLedger(ledger);
  await writeAtomicJson(
    paths.costReport,
    buildCostReport(
      plan,
      ledger,
      "PAID_EXECUTION_FINISHED_OR_STOPPED",
      true,
    ),
  );
  const panelHash = sha256(stableJson(panel));
  await writeAtomicText(
    paths.panelReport,
    `# Phase 2C AI panel report

Valid independent Bryce judges: **${String(validJudgeCount)} of 5**

- Accepted judge calls: ${String(accounting.acceptedJudgeCalls)}
- Rejected judge calls: ${String(accounting.rejectedJudgeCalls)}
- Uncertain paid calls: ${String(accounting.uncertainPaidCalls)}
- Calculated known API cost: USD ${accounting.knownActualCostUsd.toFixed(8)}
- Cap-accounted exposure: USD ${accounting.capAccountedCostUsd.toFixed(8)} of USD 10
- Panel artifact hash: \`${panelHash}\`
- ElevenLabs calls: 0
- Conditional branch implementation: ${plan.judges.conditionalBranchImplementation}

The report preserves perceptual/objective disagreement in \`ai-panel-analysis.json\`. Audio-capable AI judges are not a representative human learner study.
`,
  );
  await writeAtomicText(
    paths.decisionSummary,
    `# Phase 2C decision summary

Primary decision: **${decision.primaryDecision}**

Confidence: **${String(decision.confidence)} / 100**

${decision.engineeringBasisStatement}

## Decisive evidence

${
  decision.decisiveEvidence.length > 0
    ? decision.decisiveEvidence
        .map((item) => `- ${item}`)
        .join("\n")
    : "- No decisive evidence was available."
}

## Dissenting evidence

${
  decision.dissentingEvidence.length > 0
    ? decision.dissentingEvidence
        .map((item) => `- ${item}`)
        .join("\n")
    : "- No dissent was recorded."
}

## Limitations and remaining risk

${decision.limitations.map((item) => `- ${item}`).join("\n")}

Exact remaining risk: ${decision.exactRemainingRisk}

Recommended next engineering action: ${decision.recommendedNextEngineeringAction}

No production activation or ElevenLabs call occurred.
`,
  );
}

export async function runAiAudioEvaluationCli(
  rawArgs: readonly string[],
  dependencies: AiAudioEvaluationDependencies = {},
): Promise<{
  mode: "DRY_RUN" | "METADATA" | "PAID";
  status: string;
  outputDirectory: string;
  planHash?: string;
  ownerAction?: string;
  primaryDecision?: string;
}> {
  const options = parseAiAudioEvaluationCliOptions(rawArgs);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return {
      mode: "DRY_RUN",
      status: "HELP",
      outputDirectory: options.outputDirectory,
    };
  }
  if (
    [
      options.recoverResponsesOffline,
      options.attestRecoveryReport,
      options.executeResponseRecovery,
      options.retrieveOpenRouterGenerations,
      options.resumeOpenRouterGenerations,
      options
        .reconcileOpenRouterGenerationsOffline,
    ].filter(Boolean).length > 1
  ) {
    throw new Error(
      "Choose exactly one response-recovery mode",
    );
  }
  if (
    (options.recoverResponsesOffline ||
      options.attestRecoveryReport ||
      options.retrieveOpenRouterGenerations ||
      options.resumeOpenRouterGenerations ||
      options
        .reconcileOpenRouterGenerationsOffline) &&
    hasPaidIntent(options)
  ) {
    throw new Error(
      "Offline response recovery cannot be combined with paid-execution flags",
    );
  }
  assertSafeOutputDirectory(options.outputDirectory);
  if (
    options.reconcileOpenRouterGenerationsOffline
  ) {
    const result =
      await reconcileCompletedGenerationRetrievalOffline(
        {
          outputDirectory:
            options.outputDirectory,
          now: dependencies.now,
        },
      );
    return {
      mode: "METADATA",
      status:
        "GENERATION_RETRIEVAL_OFFLINE_RECONCILIATION_COMPLETE",
      outputDirectory: options.outputDirectory,
      planHash:
        INTERRUPTED_GENERATION_RETRIEVAL_PLAN_HASH,
      ownerAction: `Offline accounting reconciliation cleared the prior request-16 uncertainty. Reconciled actual and cap-accounted cost are USD ${result.reconciledActualCostUsd}; no external request was made.`,
    };
  }
  if (
    options.retrieveOpenRouterGenerations ||
    options.resumeOpenRouterGenerations
  ) {
    const isResume =
      options.resumeOpenRouterGenerations;
    if (!(await secretIsPresent())) {
      return {
        mode: "DRY_RUN",
        status:
          "BLOCKED_GENERATION_RETRIEVAL_SECRET_ABSENT",
        outputDirectory: options.outputDirectory,
        ownerAction: `Mount the temporary OpenRouter inference key as a process-owned mode-0400 file at ${SECRET_PATH}. This mode performs ${
          isResume
            ? "only the remaining metadata GETs (23 or 24 total reservations, depending on the exact pinned interrupted prefix)"
            : "exactly 22 metadata GETs"
        } and zero chat POSTs.`,
      };
    }
    const prepared = isResume
      ? await prepareGenerationRetrievalResumeRun({
          outputDirectory:
            options.outputDirectory,
          now: dependencies.now,
        })
      : await prepareGenerationRetrievalRun({
          outputDirectory:
            options.outputDirectory,
          now: dependencies.now,
        });
    const secret =
      await readSecretAfterAllGates();
    const retrieval =
      await executePreparedGenerationRetrieval({
        prepared,
        secret,
        fetchImpl: dependencies.fetchImpl,
        now: dependencies.now,
      });
    return {
      mode: "METADATA",
      status:
        retrieval.reconciliation
          .canContinuePaidInference
          ? isResume
            ? "GENERATION_RETRIEVAL_RESUME_COMPLETE"
            : "GENERATION_RETRIEVAL_COMPLETE"
          : isResume
            ? "GENERATION_RETRIEVAL_RESUME_COMPLETE_RECONCILIATION_BLOCKED"
            : "GENERATION_RETRIEVAL_COMPLETE_RECONCILIATION_BLOCKED",
      outputDirectory: options.outputDirectory,
      planHash:
        prepared.plan.retrievalPlanHash,
      ownerAction: `Recovered ${String(
        retrieval.generationContentsRecovered,
      )}/10 generation contents and ${String(
        retrieval.generationMetadataRecovered,
      )}/10 exact metadata records with ${String(
        retrieval.generationMetadataGets,
      )} metadata GETs, zero chat POSTs, and zero production mutations.`,
    };
  }
  if (options.recoverResponsesOffline) {
    const recovery =
      await runCurrentOfflineResponseRecoveryAudit({
        priorRunDirectory: options.outputDirectory,
      });
    return {
      mode: "DRY_RUN",
      status:
        recovery.recoveryPlan.missingPerspectiveCount ===
        0
          ? "OFFLINE_RECOVERY_COMPLETE"
          : "OFFLINE_RECOVERY_COMPLETE_REPLACEMENTS_REQUIRED",
      outputDirectory: recovery.outputDirectory,
      planHash:
        recovery.recoveryPlan.recoveryPlanHash,
      ownerAction:
        recovery.recoveryPlan.missingPerspectiveCount ===
        0
          ? "Aggregate the five recovered independent responses without replaying any paid request."
          : `Offline recovery report completed with ${String(
              recovery.recoveryPlan.missingPerspectiveCount,
            )} missing perspectives. A separate recovery executor may send exactly one corrected-schema replacement primary per missing perspective after acquiring the recovery lock and rechecking the cumulative USD 10 / 24-request gates.`,
    };
  }
  if (options.attestRecoveryReport) {
    const recoveryPlanValue = JSON.parse(
      await readFile(
        resolve(
          options.outputDirectory,
          "response-recovery-plan.json",
        ),
        "utf8",
      ),
    ) as unknown;
    assertResponseRecoveryPlanInvariant(
      recoveryPlanValue,
    );
    const recoveryPlan = recoveryPlanValue;
    const priorSnapshot =
      await loadPriorPaidRunRecoverySnapshot({
        priorRunDirectory: options.outputDirectory,
      });
    if (
      recoveryPlan.previousLedgerSha256 !==
        priorSnapshot.previousLedgerSha256 ||
      recoveryPlan.previousLockSha256 !==
        priorSnapshot.previousLockSha256 ||
      recoveryPlan.previousLedgerTerminalHash !==
        priorSnapshot.previousLedgerTerminalHash
    ) {
      throw new Error(
        "Offline recovery attestation refuses changed prior ledger or lock bytes",
      );
    }
    const attestation =
      await attestOfflineRecoveryReportCompletion({
        recoveryPlan,
        priorRunDirectory: options.outputDirectory,
      });
    return {
      mode: "DRY_RUN",
      status:
        "OFFLINE_RECOVERY_REPORT_HASH_VERIFIED",
      outputDirectory: options.outputDirectory,
      planHash: recoveryPlan.recoveryPlanHash,
      ownerAction: `Verified report SHA-256 ${attestation.recoveryReportSha256}; no secret was read and no external request was made.`,
    };
  }
  if (options.executeResponseRecovery) {
    assertResponseRecoveryPaidAuthorization(options);
    const recoveryPlanValue = JSON.parse(
      await readFile(
        resolve(
          options.outputDirectory,
          "response-recovery-plan.json",
        ),
        "utf8",
      ),
    ) as unknown;
    assertResponseRecoveryPlanInvariant(
      recoveryPlanValue,
    );
    const recoveryPlan = recoveryPlanValue;
    await verifyOfflineRecoveryCompletionForPaidExecution({
      recoveryPlan,
      priorRunDirectory: options.outputDirectory,
    });
    await loadFrozenInput();
    const productionBeforeRecovery =
      await productionAudioSnapshot();
    assertExpectedProductionSnapshot(
      productionBeforeRecovery,
    );
    const recoveryPrivateDirectory = resolve(
      options.outputDirectory,
      "private",
    );
    await writeNewJson(
      resolve(
        recoveryPrivateDirectory,
        "production-audio-before-recovery.json",
      ),
      productionBeforeRecovery,
    );
    if (recoveryPlan.missingPerspectiveCount === 0) {
      let recovery: Awaited<
        ReturnType<typeof executeResponseRecoveryPlan>
      >;
      try {
        recovery = await executeResponseRecoveryPlan({
          recoveryPlan,
          outputDirectory: options.outputDirectory,
          secret:
            "unused-offline-recovery-no-secret-read",
          fetchImpl: dependencies.fetchImpl,
          now: dependencies.now,
        });
      } finally {
        const productionAfterRecovery =
          await productionAudioSnapshot();
        await writeOrVerifyJson(
          resolve(
            recoveryPrivateDirectory,
            "production-audio-after-recovery.json",
          ),
          productionAfterRecovery,
        );
        if (
          !productionSnapshotsEqual(
            productionBeforeRecovery,
            productionAfterRecovery,
          )
        ) {
          throw new Error(
            "The 51 legacy production audio records changed during offline recovered-response aggregation",
          );
        }
      }
      return {
        mode: "DRY_RUN",
        status:
          recovery.status === "COMPLETE"
            ? "RECOVERY_PANEL_COMPLETE"
            : "RECOVERY_PANEL_INCOMPLETE",
        outputDirectory: options.outputDirectory,
        planHash:
          recoveryPlan.recoveryPlanHash,
        primaryDecision:
          recovery.primaryDecision,
      };
    }
    throw new Error(
      "BLOCKED_SUPERSEDING_GENERATION_RECOVERY_GATES: paid replacement inference remains hard-disabled until the append-only generation retrieval is complete, its fixed-point accounting reconciliation passes, and every recovered historical completion has completed the separate semantic-recovery audit. The legacy response-recovery plan may not bypass those gates.",
    );
    if (!(await secretIsPresent())) {
      return {
        mode: "DRY_RUN",
        status: "BLOCKED_SECRET_ABSENT",
        outputDirectory: options.outputDirectory,
        planHash: recoveryPlan.recoveryPlanHash,
        ownerAction: `Mount the temporary OpenRouter inference key as a process-owned mode-0400 file at ${SECRET_PATH}.`,
      };
    }
    const secret =
      await acquireRecoveryLockThenReadSecret({
        acquireLock: () =>
          acquireResponseRecoveryRunLock({
            recoveryPlan,
            createdAt:
              dependencies.now?.() ??
              new Date().toISOString(),
            priorRunDirectory:
              options.outputDirectory,
          }),
        readSecret: readSecretAfterAllGates,
      });
    let recovery: Awaited<
      ReturnType<typeof executeResponseRecoveryPlan>
    >;
    try {
      recovery = await executeResponseRecoveryPlan({
        recoveryPlan,
        outputDirectory: options.outputDirectory,
        secret,
        fetchImpl: dependencies.fetchImpl,
        now: dependencies.now,
      });
    } finally {
      const productionAfterRecovery =
        await productionAudioSnapshot();
      await writeNewJson(
        resolve(
          recoveryPrivateDirectory,
          "production-audio-after-recovery.json",
        ),
        productionAfterRecovery,
      );
      if (
        !productionSnapshotsEqual(
          productionBeforeRecovery,
          productionAfterRecovery,
        )
      ) {
        throw new Error(
          "The 51 legacy production audio records changed during response recovery",
        );
      }
    }
    return {
      mode: "PAID",
      status:
        recovery.status === "COMPLETE"
          ? "RECOVERY_PANEL_COMPLETE"
          : "RECOVERY_PANEL_INCOMPLETE",
      outputDirectory: options.outputDirectory,
      planHash: recoveryPlan.recoveryPlanHash,
      primaryDecision: recovery.primaryDecision,
    };
  }
  const frozen = await loadFrozenInput();
  const {
    plan,
    privateManifest,
    assignments,
    prompts,
  } = buildPlanAndPrivateManifest(frozen);
  assertPaidAuthorization(options, plan);
  if (
    plan.judges.maximumApiRequests !== 17 ||
    plan.cost.approvedHardMaximumUsd !==
      HARD_MAX_USD ||
    plan.cost.estimatedExecutableMaximumUsd >
      HARD_MAX_USD
  ) {
    throw new Error(
      "Plan does not match the explicitly authorized caps",
    );
  }
  const productionBefore = await productionAudioSnapshot();
  assertExpectedProductionSnapshot(productionBefore);
  let paths: Phase2CPaths | undefined;
  let result:
    | {
        mode: "DRY_RUN" | "PAID";
        status: string;
        outputDirectory: string;
        planHash: string;
        ownerAction?: string;
        primaryDecision?: string;
      }
    | undefined;
  let taskError: unknown;
  try {
    paths = await ensureOutputLayout(options.outputDirectory);
    await writeOrVerifyJson(
      resolve(
        paths.privateDirectory,
        "production-audio-before.json",
      ),
      productionBefore,
    );
    const objective = await prepareObjectiveArtifact(
      frozen,
      paths,
    );
    const secretAvailable = await secretIsPresent();
    await initializeDryRunArtifacts(
      frozen,
      plan,
      privateManifest,
      paths,
      objective,
      secretAvailable,
    );
    if (!hasPaidIntent(options)) {
      result = {
        mode: "DRY_RUN",
        status: secretAvailable
          ? "READY_FOR_EXPLICIT_PAID_AUTHORIZATION"
          : "BLOCKED_SECRET_ABSENT",
        outputDirectory: paths.root,
        planHash: plan.planHash,
        ownerAction: ownerAction(plan),
        primaryDecision:
          "INCONCLUSIVE_AI_ONLY_EVALUATION",
      };
    } else if (!secretAvailable) {
      await writeAtomicJson(
        paths.costReport,
        buildCostReport(
          plan,
          await readLedger(paths.ledger),
          "BLOCKED_SECRET_ABSENT",
          false,
        ),
      );
      result = {
        mode: "DRY_RUN",
        status: "BLOCKED_SECRET_ABSENT",
        outputDirectory: paths.root,
        planHash: plan.planHash,
        ownerAction: ownerAction(plan),
        primaryDecision:
          "INCONCLUSIVE_AI_ONLY_EVALUATION",
      };
    } else {
      const savedPlan = JSON.parse(
        await readFile(paths.plan, "utf8"),
      ) as AiEvaluationPlan;
      if (
        stableJson(savedPlan) !== stableJson(plan) ||
        savedPlan.planHash !== plan.planHash
      ) {
        throw new Error(
          "Saved deterministic plan or supplied plan hash changed before paid execution",
        );
      }
      await acquireTaskWidePaidExecutionLock({
        planHash: plan.planHash,
        createdAt:
          dependencies.now?.() ??
          new Date().toISOString(),
      });
      await assertFrozenInputUnchanged(frozen);
      const secret = await readSecretAfterAllGates();
      const fetchImpl =
        dependencies.fetchImpl ?? defaultFetch;
      const now =
        dependencies.now ?? (() => new Date().toISOString());
      await preflightOpenRouter(
        secret,
        paths.ledger,
        plan,
        paths.privateRecordsDirectory,
        fetchImpl,
        now,
      );
      const execution = await executePrimaryBrycePanel(
        frozen,
        plan,
        assignments,
        prompts,
        objective,
        secret,
        paths,
        dependencies,
      );
      await appendLedger(
        paths.ledger,
        plan.planHash,
        "PAID_EXECUTION_STOPPED",
        {
          status:
            execution.validJudgeCount === 5
              ? "PRIMARY_PANEL_COMPLETE"
              : "PRIMARY_PANEL_INCOMPLETE",
          validJudgeCount: execution.validJudgeCount,
          primaryDecision:
            execution.decision.primaryDecision,
        },
        now,
      );
      result = {
        mode: "PAID",
        status:
          execution.validJudgeCount === 5
            ? "PRIMARY_PANEL_COMPLETE"
            : "PRIMARY_PANEL_INCOMPLETE",
        outputDirectory: paths.root,
        planHash: plan.planHash,
        primaryDecision:
          execution.decision.primaryDecision,
      };
    }
  } catch (error) {
    taskError = error;
    if (
      paths &&
      hasPaidIntent(options) &&
      (await pathExists(paths.ledger))
    ) {
      try {
        const ledger = await readLedger(paths.ledger);
        await writeAtomicJson(
          paths.costReport,
          buildCostReport(
            plan,
            ledger,
            "PAID_EXECUTION_ABORTED_FAIL_CLOSED",
            await secretIsPresent(),
          ),
        );
        const accounting =
          paidAccountingFromLedger(ledger);
        await writeAtomicText(
          paths.panelReport,
          `# Phase 2C AI panel report

Status: **PAID EXECUTION ABORTED — FAIL CLOSED**

- External requests recorded: ${String(accounting.externalRequestCount)}
- Accepted judge calls: ${String(accounting.acceptedJudgeCalls)}
- Rejected judge calls: ${String(accounting.rejectedJudgeCalls)}
- Uncertain paid calls: ${String(accounting.uncertainPaidCalls)}
- Cap-accounted exposure: USD ${accounting.capAccountedCostUsd.toFixed(8)} of USD 10

No result was inferred after the orchestration failure. Inspect the private append-only ledger and redacted API records before any further action.
`,
        );
        await writeAtomicText(
          paths.decisionSummary,
          `# Phase 2C decision summary

Primary decision: **INCONCLUSIVE_AI_ONLY_EVALUATION**

Confidence: **0 / 100**

Paid execution stopped fail-closed before a complete valid five-judge panel was available. The exact remaining risk is unknown billed exposure or incomplete perceptual evidence recorded in the append-only ledger.

Recommended next engineering action: inspect the ledger and private redacted API records; do not remove the one-off lock or authorize another call until exposure is reconciled.

No production activation or ElevenLabs call occurred.
`,
        );
      } catch (reportError) {
        taskError = new AggregateError(
          [error, reportError],
          "Phase 2C failed and its fail-closed reports could not be finalized",
        );
      }
    }
  } finally {
    try {
      const productionAfter =
        await productionAudioSnapshot();
      assertExpectedProductionSnapshot(productionAfter);
      if (
        !productionSnapshotsEqual(
          productionBefore,
          productionAfter,
        )
      ) {
        throw new Error(
          "Production audio changed during Phase 2C",
        );
      }
      if (paths) {
        await writeOrVerifyJson(
          resolve(
            paths.privateDirectory,
            "production-audio-after.json",
          ),
          productionAfter,
        );
      }
    } catch (productionError) {
      taskError =
        taskError === undefined
          ? productionError
          : new AggregateError(
              [taskError, productionError],
              "Phase 2C failed and production verification also failed",
            );
    }
  }
  if (taskError !== undefined) throw taskError;
  if (!result) {
    throw new Error("Phase 2C ended without a result");
  }
  return result;
}

/*
 * Narrow integration-test surface for the paid HTTP boundary. Keeping these
 * exact production functions injectable lets the test suite exercise the real
 * redaction, ledger, retry, and cost-accounting paths without reading the
 * mounted secret or making a network request.
 */
export const phase2cPrimaryJudgeHttpTestHooks = Object.freeze({
  loadFrozenInput,
  buildPlanAndPrivateManifest,
  assertPrivateManifestHashInvariant,
  executeJudgeAttempt,
  preflightOpenRouter,
  appendLedger,
  reserveExternalRequest,
  finalizeExternalRequest,
  reserveRecoveryExternalRequest,
  settleRecoveryExternalRequest,
  recoveryRequestAccounting,
  readResponseRecoveryLedger,
  readOpenRouterSecretFileAfterAllGates,
  acquireRecoveryLockThenReadSecret,
  executeRecoveryMetadataPreflight,
  executeRecoveryJudgeRequest,
  executeResponseRecoveryPlan,
  recoverySourcePairsFromFrozen,
  recoveryAudioContent,
  recoveryAssignmentFromBlind,
  identityRecords,
  objectiveSummaryFromArtifact,
  persistProviderHttpBodyBeforeSemanticParse,
  writeRestrictedCompletion,
  providerBoundedMaximumRequestCostUsd:
    PROVIDER_BOUNDED_MAXIMUM_REQUEST_COST_USD,
});

const directlyInvoked =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (directlyInvoked) {
  runAiAudioEvaluationCli(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(
        `${JSON.stringify(result, null, 2)}\n`,
      );
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `Phase 2C evaluation failed: ${message}\n`,
      );
      process.exitCode = 1;
    });
}
