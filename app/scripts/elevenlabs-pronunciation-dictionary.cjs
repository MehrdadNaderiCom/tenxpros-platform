#!/usr/bin/env node
"use strict";

const {
  createHash,
} = require("node:crypto");
const fs = require("node:fs");
const { promises: fsp } = fs;
const path = require("node:path");

const SECRET_PATH =
  "/run/secrets/elevenlabs_tts_key";
const ENDPOINT =
  "https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-file";
const PHASE_ROOT = path.resolve(
  __dirname,
  "../../scratch_academy/elevenlabs-final-migration/phase-e1-final-20260728",
);
const OUTPUT_ROOT = path.resolve(
  PHASE_ROOT,
  "pronunciation-dictionary-v1",
);
const PREFLIGHT_HASH =
  "d55845cc0ffb0d060b81778540c16beb5a5090c92acb551b21d312735ddd6b39";
const PLS = `<?xml version="1.0" encoding="UTF-8"?>
<lexicon version="1.0" alphabet="ipa" xml:lang="en-US" xmlns="http://www.w3.org/2005/01/pronunciation-lexicon">
  <lexeme><grapheme>AI</grapheme><alias>A. I.</alias></lexeme>
  <lexeme><grapheme>TenX</grapheme><alias>Ten X</alias></lexeme>
  <lexeme><grapheme>TenXPro</grapheme><alias>Ten X Pro</alias></lexeme>
  <lexeme><grapheme>TenXPros</grapheme><alias>Ten X Pros</alias></lexeme>
  <lexeme><grapheme>TenXPros.com</grapheme><alias>Ten X Pros dot com</alias></lexeme>
  <lexeme><grapheme>B2B</grapheme><alias>B to B</alias></lexeme>
  <lexeme><grapheme>B2C</grapheme><alias>B to C</alias></lexeme>
  <lexeme><grapheme>HR</grapheme><alias>H R</alias></lexeme>
  <lexeme><grapheme>CEO</grapheme><alias>C E O</alias></lexeme>
  <lexeme><grapheme>SMS</grapheme><alias>S M S</alias></lexeme>
  <lexeme><grapheme>SME</grapheme><alias>small and medium-sized enterprise</alias></lexeme>
  <lexeme><grapheme>API</grapheme><alias>A P I</alias></lexeme>
  <lexeme><grapheme>CRM</grapheme><alias>C R M</alias></lexeme>
  <lexeme><grapheme>FAQ</grapheme><alias>F A Q</alias></lexeme>
  <lexeme><grapheme>ROI</grapheme><alias>R O I</alias></lexeme>
  <lexeme><grapheme>SEO</grapheme><alias>S E O</alias></lexeme>
</lexicon>
`;

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

async function readSecret() {
  const metadata = await fsp.lstat(
    SECRET_PATH,
  );
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.uid !== process.getuid() ||
    (metadata.mode & 0o777) !== 0o400 ||
    metadata.size <= 0
  ) {
    throw new Error(
      "ElevenLabs secret isolation gate failed",
    );
  }
  return (
    await fsp.readFile(SECRET_PATH, "utf8")
  ).replace(/[\r\n]+$/u, "");
}

async function main() {
  process.umask(0o077);
  if (fs.existsSync(OUTPUT_ROOT)) {
    const existing = path.resolve(
      OUTPUT_ROOT,
      "dictionary-result.json",
    );
    if (!fs.existsSync(existing)) {
      throw new Error(
        "Dictionary output exists without a completed result; automatic retry prohibited",
      );
    }
    const result = JSON.parse(
      await fsp.readFile(existing, "utf8"),
    );
    process.stdout.write(
      `${JSON.stringify({
        reused: true,
        dictionaryId: result.dictionaryId,
        versionId: result.versionId,
        providerRequests: 0,
        resultHash: result.resultHash,
      })}\n`,
    );
    return;
  }
  await fsp.mkdir(OUTPUT_ROOT, {
    recursive: false,
    mode: 0o700,
  });
  await fsp.chmod(OUTPUT_ROOT, 0o700);
  await writeExclusive(
    path.resolve(
      OUTPUT_ROOT,
      "tenxpros-academy-pronunciation-v1.pls",
    ),
    PLS,
  );
  const sourceSha256 = sha256(PLS);
  const requestIntent = {
    schemaVersion:
      "tenxpros-elevenlabs-pronunciation-dictionary-intent-v1",
    provider: "ElevenLabs",
    endpoint:
      "/v1/pronunciation-dictionaries/add-from-file",
    name:
      "TenXPros Academy production pronunciation v1",
    description:
      "Narration-only aliases for the TenXPros Academy final production release.",
    sourceSha256,
    ruleCount: 16,
    providerPreflightHash: PREFLIGHT_HASH,
    automaticRetry: false,
  };
  const requestHash = sha256(
    canonical(requestIntent),
  );
  await writeExclusive(
    path.resolve(
      OUTPUT_ROOT,
      "request-intent.json",
    ),
    `${JSON.stringify(
      { ...requestIntent, requestHash },
      null,
      2,
    )}\n`,
  );
  const secret = await readSecret();
  const form = new FormData();
  form.append(
    "name",
    requestIntent.name,
  );
  form.append(
    "description",
    requestIntent.description,
  );
  form.append(
    "file",
    new Blob([PLS], {
      type: "application/pls+xml",
    }),
    "tenxpros-academy-pronunciation-v1.pls",
  );
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "xi-api-key": secret,
      },
      body: form,
      redirect: "error",
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    await writeExclusive(
      path.resolve(
        OUTPUT_ROOT,
        "UNCERTAIN_MUTATION.json",
      ),
      `${JSON.stringify(
        {
          requestHash,
          retryProhibited: true,
          reason:
            error instanceof Error
              ? error.message
              : String(error),
        },
        null,
        2,
      )}\n`,
    );
    throw new Error(
      "Ambiguous dictionary mutation; no retry was attempted",
    );
  }
  const raw = await response.text();
  await writeExclusive(
    path.resolve(
      OUTPUT_ROOT,
      "raw-response.json",
    ),
    raw,
  );
  await writeExclusive(
    path.resolve(
      OUTPUT_ROOT,
      "response-metadata.json",
    ),
    `${JSON.stringify(
      {
        httpStatus: response.status,
        requestId:
          response.headers.get("request-id") ??
          response.headers.get(
            "x-request-id",
          ),
        rawSha256: sha256(raw),
        rawBytes: Buffer.byteLength(raw),
        persistedBeforeParse: true,
      },
      null,
      2,
    )}\n`,
  );
  if (!response.ok) {
    throw new Error(
      `Dictionary request failed with HTTP ${response.status}; no retry was attempted`,
    );
  }
  const parsed = JSON.parse(raw);
  const dictionaryId =
    parsed.id ??
    parsed.pronunciation_dictionary_id;
  const versionId =
    parsed.version_id ??
    parsed.versionId;
  if (
    typeof dictionaryId !== "string" ||
    dictionaryId.length === 0 ||
    typeof versionId !== "string" ||
    versionId.length === 0
  ) {
    throw new Error(
      "Dictionary response omitted id or version_id",
    );
  }
  const core = {
    schemaVersion:
      "tenxpros-elevenlabs-pronunciation-dictionary-result-v1",
    provider: "ElevenLabs",
    dictionaryId,
    versionId,
    sourceSha256,
    ruleCount: 16,
    requestHash,
    rawResponseSha256: sha256(raw),
    providerRequestCount: 1,
    textToSpeechRequests: 0,
    submittedCharacters: 0,
    automaticRetries: 0,
  };
  const resultHash = sha256(canonical(core));
  await writeExclusive(
    path.resolve(
      OUTPUT_ROOT,
      "dictionary-result.json",
    ),
    `${JSON.stringify(
      { ...core, resultHash },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      reused: false,
      dictionaryId,
      versionId,
      providerRequests: 1,
      resultHash,
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
