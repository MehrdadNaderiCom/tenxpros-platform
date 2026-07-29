#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { basename, resolve } from "node:path";

const SECRET_PATH =
  "/run/secrets/elevenlabs_tts_key";
const API_ROOT = "https://api.elevenlabs.io";

interface Arguments {
  outputDirectory: string;
}

function parseArguments(
  values: readonly string[],
): Arguments {
  let outputDirectory = "";
  for (
    let index = 0;
    index < values.length;
    index += 1
  ) {
    if (values[index] === "--output-dir") {
      outputDirectory =
        values[index + 1] ?? "";
      index += 1;
      continue;
    }
    throw new Error(
      `Unknown argument: ${values[index]}`,
    );
  }
  if (!outputDirectory) {
    throw new Error("--output-dir is required");
  }
  return {
    outputDirectory: resolve(outputDirectory),
  };
}

function sha256(value: string | Buffer): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

async function writePrivate(
  path: string,
  value: string,
): Promise<void> {
  await writeFile(path, value, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await chmod(path, 0o600);
}

async function readSecret(): Promise<string> {
  const metadata = await lstat(SECRET_PATH);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink()
  ) {
    throw new Error(
      "ElevenLabs secret must be a regular non-symlink file",
    );
  }
  if (metadata.uid !== process.getuid?.()) {
    throw new Error(
      "ElevenLabs secret must be owned by the execution user",
    );
  }
  if ((metadata.mode & 0o777) !== 0o400) {
    throw new Error(
      "ElevenLabs secret mode must be exactly 0400",
    );
  }
  const secret = (await readFile(SECRET_PATH, "utf8"))
    .replace(/[\r\n]+$/u, "");
  if (!secret) {
    throw new Error(
      "ElevenLabs secret must be non-empty",
    );
  }
  return secret;
}

async function retrieve(
  secret: string,
  endpoint: string,
  outputDirectory: string,
  ordinal: number,
): Promise<{
  endpoint: string;
  status: number;
  requestId: string | null;
  rawSha256: string;
  parsed: unknown;
}> {
  const response = await fetch(
    `${API_ROOT}${endpoint}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "xi-api-key": secret,
      },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    },
  );
  const raw = await response.text();
  const fileName =
    `${String(ordinal).padStart(2, "0")}-` +
    `${basename(endpoint.split("?")[0]) || "root"}.json`;
  await writePrivate(
    resolve(outputDirectory, fileName),
    raw,
  );
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    parsed = null;
  }
  return {
    endpoint,
    status: response.status,
    requestId:
      response.headers.get("request-id") ??
      response.headers.get(
        "x-request-id",
      ),
    rawSha256: sha256(raw),
    parsed,
  };
}

function subscriptionSummary(
  value: unknown,
): Record<string, unknown> {
  const row = value as Record<string, unknown>;
  const characterCount = Number(
    row.character_count,
  );
  const characterLimit = Number(
    row.character_limit,
  );
  return {
    tier:
      typeof row.tier === "string"
        ? row.tier
        : null,
    status:
      typeof row.status === "string"
        ? row.status
        : null,
    characterCount,
    characterLimit,
    remainingCharacters:
      Number.isFinite(characterCount) &&
      Number.isFinite(characterLimit)
        ? characterLimit - characterCount
        : null,
    maxCreditLimitExtension:
      row.max_credit_limit_extension ?? null,
    canExtendCharacterLimit:
      row.can_extend_character_limit === true,
    nextResetUnix:
      row.next_character_count_reset_unix ??
      null,
  };
}

function voicesSummary(
  value: unknown,
): {
  count: number;
  voices: readonly Record<
    string,
    unknown
  >[];
} {
  const root = value as {
    voices?: unknown[];
  };
  const voices = (root.voices ?? []).map(
    (item) => {
      const voice =
        item as Record<string, unknown>;
      return {
        voiceId: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description:
          voice.description ?? null,
        labels: voice.labels ?? {},
        noticePeriod:
          voice.notice_period ?? null,
        deactivatedAtUnix:
          voice.deactivated_at_unix ??
          null,
        verifiedLanguages:
          voice.verified_languages ?? [],
        highQualityBaseModelIds:
          voice.high_quality_base_model_ids ??
          [],
        sharing: voice.sharing
          ? {
              status:
                (
                  voice.sharing as Record<
                    string,
                    unknown
                  >
                ).status ?? null,
              rate:
                (
                  voice.sharing as Record<
                    string,
                    unknown
                  >
                ).rate ?? null,
              noticePeriod:
                (
                  voice.sharing as Record<
                    string,
                    unknown
                  >
                ).notice_period ?? null,
            }
          : null,
      };
    },
  );
  return {
    count: voices.length,
    voices,
  };
}

async function main(): Promise<void> {
  process.umask(0o077);
  const arguments_ = parseArguments(
    process.argv.slice(2),
  );
  await mkdir(arguments_.outputDirectory, {
    recursive: false,
    mode: 0o700,
  });
  await chmod(
    arguments_.outputDirectory,
    0o700,
  );
  const secret = await readSecret();
  const results = [];
  results.push(
    await retrieve(
      secret,
      "/v1/user/subscription",
      arguments_.outputDirectory,
      1,
    ),
  );
  results.push(
    await retrieve(
      secret,
      "/v1/models",
      arguments_.outputDirectory,
      2,
    ),
  );
  results.push(
    await retrieve(
      secret,
      "/v2/voices?page_size=100&voice_type=default&include_total_count=true",
      arguments_.outputDirectory,
      3,
    ),
  );

  const subscription =
    results[0]!.status === 200
      ? subscriptionSummary(
          results[0]!.parsed,
        )
      : {
          available: false,
          httpStatus: results[0]!.status,
        };
  const modelRows = Array.isArray(
    results[1]!.parsed,
  )
    ? (results[1]!
        .parsed as Array<
        Record<string, unknown>
      >)
    : [];
  const models = modelRows.map((model) => ({
    modelId: model.model_id,
    name: model.name,
    canDoTextToSpeech:
      model.can_do_text_to_speech === true,
    maximumTextLengthPerRequest:
      model.maximum_text_length_per_request ??
      null,
    costFactor:
      model.cost_factor ?? null,
  }));
  const voices =
    results[2]!.status === 200
      ? voicesSummary(results[2]!.parsed)
      : {
          count: 0,
          voices: [],
        };
  const allReadPreflightsPassed =
    results.every(
      (result) => result.status === 200,
    );
  const reportWithoutHash = {
    schemaVersion:
      "tenxpros-elevenlabs-secure-preflight-v1",
    secret: {
      path: SECRET_PATH,
      regularFile: true,
      symlink: false,
      ownerUid: process.getuid?.(),
      mode: "0400",
      nonEmpty: true,
      persistedElsewhere: false,
    },
    subscription,
    models,
    voices,
    requests: results.map(
      ({
        endpoint,
        status,
        requestId,
        rawSha256,
      }) => ({
        endpoint,
        status,
        requestId,
        rawSha256,
        generation: false,
        submittedCharacters: 0,
      }),
    ),
    allReadPreflightsPassed,
  };
  const report = {
    ...reportWithoutHash,
    reportHash: sha256(
      JSON.stringify(reportWithoutHash),
    ),
  };
  const reportPath = resolve(
    arguments_.outputDirectory,
    "preflight-report.json",
  );
  await writePrivate(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      passed: allReadPreflightsPassed,
      reportPath,
      reportHash: report.reportHash,
      subscription,
      modelAvailable: models.some(
        (model) =>
          model.modelId ===
            "eleven_multilingual_v2" &&
          model.canDoTextToSpeech,
      ),
      defaultVoices: voices.count,
      generationRequests: 0,
      submittedCharacters: 0,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${
      error instanceof Error
        ? error.message
        : String(error)
    }\n`,
  );
  process.exitCode = 1;
});
