#!/usr/bin/env node

const {
  createHash,
} = require("node:crypto");
const {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readFile,
  writeFile,
} = require("node:fs/promises");
const {
  dirname,
  relative,
  resolve,
} = require("node:path");

const APP_ROOT = resolve(__dirname, "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
const PHASE_ROOT = resolve(
  REPOSITORY_ROOT,
  "scratch_academy/elevenlabs-final-migration/phase-e1-final-20260728",
);
const AUDITION_ROOT = resolve(
  PHASE_ROOT,
  "audition-runtime",
);
const RESULT_PATH = resolve(
  AUDITION_ROOT,
  "audition-result.json",
);
const OUTPUT_ROOT = resolve(
  PHASE_ROOT,
  "owner-voice-review",
);
const EXPECTED_RESULT_HASH =
  "0877bc1764214cd2347e61dde8800959bc1527b1b57f38ec24899d5efa7aab00";
const VOICE_LABELS = [
  "Voice A",
  "Voice B",
  "Voice C",
];
const ALIAS_LABELS = {
  a_i_space: "A I",
  a_i_periods: "A. I.",
  ay_eye: "ay eye",
};
const SCORE_FIELDS = [
  ["naturalness", "Naturalness"],
  ["clarity", "Clarity"],
  [
    "professional_quality",
    "Professional quality",
  ],
  [
    "long_form_suitability",
    "Long-form suitability",
  ],
  ["comfort", "Listening comfort"],
  [
    "pronunciation_consistency",
    "Pronunciation consistency",
  ],
];

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string")
    return JSON.stringify(value);
  if (
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(canonical).join(",")}]`;
  if (
    typeof value === "object" &&
    value !== null
  ) {
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
  throw new Error(
    `Unsupported canonical value: ${typeof value}`,
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function ensurePrivateDirectory(path) {
  await mkdir(path, {
    recursive: false,
    mode: 0o700,
  });
  await chmod(path, 0o700);
  const metadata = await lstat(path);
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o700
  ) {
    throw new Error(
      `Unsafe private directory: ${path}`,
    );
  }
}

async function writeRestricted(path, value) {
  await writeFile(path, value, {
    encoding:
      typeof value === "string"
        ? "utf8"
        : undefined,
    mode: 0o600,
    flag: "wx",
  });
  await chmod(path, 0o600);
}

function slug(label) {
  return label.toLowerCase().replace(" ", "-");
}

function voiceCard(voice) {
  const scoreInputs = SCORE_FIELDS.map(
    ([field, label]) => `<label>${escapeHtml(
      label,
    )}<select data-score="${field}" required>
      <option value="">Score…</option>
      <option value="1">1 — poor</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5 — excellent</option>
    </select></label>`,
  ).join("");
  const micros = voice.micros
    .map(
      (micro) => `<tr>
        <th>${escapeHtml(
          ALIAS_LABELS[micro.aliasId],
        )}<small>${escapeHtml(
          micro.aliasId,
        )}</small></th>
        <td><audio controls preload="metadata" src="${escapeHtml(
          micro.audioPath,
        )}"></audio></td>
        <td>${micro.durationSeconds.toFixed(
          2,
        )} s</td>
      </tr>`,
    )
    .join("");
  return `<section class="voice-card" data-voice="${escapeHtml(
    voice.label,
  )}">
    <header>
      <div>
        <p class="eyebrow">Anonymous candidate</p>
        <h2>${escapeHtml(voice.label)}</h2>
      </div>
      <label class="preference"><input type="radio" name="preferred_voice" value="${escapeHtml(
        voice.label,
      )}"> Preferred voice</label>
    </header>
    <div class="golden">
      <div>
        <h3>Complete Golden Audition</h3>
        <p>${voice.golden.durationSeconds.toFixed(
          2,
        )} seconds · ${voice.golden.integratedLufs.toFixed(
          1,
        )} LUFS · ${voice.golden.truePeakDbtp.toFixed(
          1,
        )} dBTP</p>
      </div>
      <audio controls preload="metadata" src="${escapeHtml(
        voice.golden.audioPath,
      )}"></audio>
    </div>
    <details>
      <summary>Show approved Golden transcript</summary>
      <pre>${escapeHtml(
        voice.golden.transcript,
      )}</pre>
    </details>
    <h3>AI pronunciation micro-samples</h3>
    <p class="hint">Listen for two clear English letter names without an unnatural pause.</p>
    <table>
      <thead><tr><th>Written alias</th><th>Audio</th><th>Duration</th></tr></thead>
      <tbody>${micros}</tbody>
    </table>
    <div class="scores">${scoreInputs}</div>
    <div class="decision-row">
      <label>Best AI alias
        <select data-field="selected_ai_alias" required>
          <option value="">Choose…</option>
          <option value="a_i_space">A I</option>
          <option value="a_i_periods">A. I.</option>
          <option value="ay_eye">ay eye</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" data-field="ai_pronunciation_correct"> Selected alias pronounces AI correctly</label>
      <label class="check"><input type="checkbox" data-field="critical_defect"> Critical audible defect</label>
    </div>
    <label>Notes
      <textarea data-field="notes" rows="3" placeholder="Pronunciation, fatigue, flow, or production concerns…"></textarea>
    </label>
  </section>`;
}

function html(manifest) {
  const cards = manifest.voices
    .map(voiceCard)
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TenXPros ElevenLabs Owner Voice Review</title>
  <style>
    :root { color-scheme: light; --ink:#132238; --muted:#607086; --paper:#f3f6fa; --card:#fff; --accent:#1457d9; --line:#dce3ec; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif; }
    main { width:min(1120px,calc(100% - 32px)); margin:40px auto 80px; }
    .hero { background:#10264a; color:white; padding:32px; border-radius:20px; box-shadow:0 18px 50px #10264a20; }
    .hero h1 { margin:.15em 0; font-size:clamp(28px,5vw,48px); line-height:1.06; }
    .hero p { max-width:780px; color:#dce8ff; }
    .notice { margin:20px 0; padding:16px 18px; border:1px solid #e8c76c; background:#fff9df; border-radius:12px; }
    .voice-card { margin:24px 0; padding:24px; background:var(--card); border:1px solid var(--line); border-radius:18px; box-shadow:0 8px 30px #10264a0c; }
    .voice-card header,.golden,.decision-row { display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap; }
    h2 { margin:.15em 0; font-size:32px; } h3 { margin:20px 0 8px; }
    .eyebrow { margin:0; text-transform:uppercase; letter-spacing:.12em; font-size:12px; font-weight:700; color:var(--accent); }
    .preference { padding:10px 14px; border:1px solid var(--line); border-radius:999px; }
    audio { width:min(520px,100%); }
    details { margin:18px 0; } pre { white-space:pre-wrap; max-height:280px; overflow:auto; padding:16px; background:#f7f9fc; border-radius:10px; font:14px/1.55 ui-monospace,monospace; }
    table { width:100%; border-collapse:collapse; } th,td { padding:10px; text-align:left; border-bottom:1px solid var(--line); } th small { display:block; color:var(--muted); font-weight:400; }
    .scores { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:12px; margin:24px 0; }
    label { display:grid; gap:5px; font-weight:600; } select,textarea { width:100%; padding:10px; border:1px solid #b8c3d1; border-radius:8px; background:white; font:inherit; }
    .check { display:flex; grid-template-columns:auto 1fr; align-items:center; font-weight:500; }
    .hint { color:var(--muted); }
    .actions { position:sticky; bottom:16px; display:flex; gap:12px; justify-content:flex-end; margin-top:28px; padding:14px; background:#ffffffeb; backdrop-filter:blur(8px); border:1px solid var(--line); border-radius:14px; }
    button { border:0; border-radius:10px; padding:12px 18px; background:var(--accent); color:white; font:600 16px system-ui; cursor:pointer; }
    #status { margin-right:auto; align-self:center; color:var(--muted); }
  </style>
</head>
<body>
<main>
  <section class="hero">
    <p class="eyebrow">TenXPros Academy · blind owner review</p>
    <h1>Choose one production narrator</h1>
    <p>Listen to every complete Golden Audition and the three AI pronunciation clips. Candidate identities are intentionally hidden. Audio is local and this page makes no provider or application request.</p>
  </section>
  <div class="notice"><strong>Why manual review?</strong> OpenRouter rejected the configured judging key twice with HTTP 401. No paid judge request was sent. Do not choose from metadata; choose only after listening.</div>
  ${cards}
  <div class="actions">
    <span id="status">Nothing leaves this browser.</span>
    <button id="export" type="button">Export review JSON</button>
  </div>
</main>
<script>
const manifestHash=${JSON.stringify(
    manifest.manifestHash,
  )};
const scoreFields=${JSON.stringify(
    SCORE_FIELDS.map(([field]) => field),
  )};
document.querySelector("#export").addEventListener("click", () => {
  const preferred=document.querySelector('input[name="preferred_voice"]:checked')?.value ?? null;
  const voices=[...document.querySelectorAll(".voice-card")].map(card => {
    const scores=Object.fromEntries(scoreFields.map(field => {
      const raw=card.querySelector('[data-score="'+field+'"]').value;
      return [field, raw === "" ? null : Number(raw)];
    }));
    return {
      voice_label:card.dataset.voice,
      scores,
      selected_ai_alias:card.querySelector('[data-field="selected_ai_alias"]').value || null,
      ai_pronunciation_correct:card.querySelector('[data-field="ai_pronunciation_correct"]').checked,
      critical_defect:card.querySelector('[data-field="critical_defect"]').checked,
      notes:card.querySelector('[data-field="notes"]').value.trim()
    };
  });
  const payload={
    schemaVersion:"tenxpros-elevenlabs-owner-voice-review-response-v1",
    sourceManifestHash:manifestHash,
    reviewedAt:new Date().toISOString(),
    preferred_voice:preferred,
    voices
  };
  const blob=new Blob([JSON.stringify(payload,null,2)+"\\n"],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="tenxpros-elevenlabs-owner-voice-review.json";
  link.click();
  URL.revokeObjectURL(url);
  document.querySelector("#status").textContent="Review JSON exported.";
});
</script>
</body>
</html>`;
}

async function main() {
  const result = JSON.parse(
    await readFile(RESULT_PATH, "utf8"),
  );
  if (
    result.resultHash !== EXPECTED_RESULT_HASH ||
    !Array.isArray(result.results) ||
    result.results.length !== 12
  ) {
    throw new Error(
      "Frozen audition result changed",
    );
  }
  await ensurePrivateDirectory(OUTPUT_ROOT);
  const audioRoot = resolve(
    OUTPUT_ROOT,
    "audio",
  );
  await ensurePrivateDirectory(audioRoot);
  const voices = [];
  for (const label of VOICE_LABELS) {
    const voiceRoot = resolve(
      audioRoot,
      slug(label),
    );
    await ensurePrivateDirectory(voiceRoot);
    const samples = result.results.filter(
      (sample) =>
        sample.neutralLabel === label,
    );
    const rendered = [];
    for (const sample of samples) {
      const source = resolve(
        AUDITION_ROOT,
        sample.outputRelativePath,
      );
      const sourceBytes = await readFile(source);
      if (
        sha256(sourceBytes) !==
          sample.generatedAudioChecksum ||
        sourceBytes.length !==
          sample.audit.fileBytes
      ) {
        throw new Error(
          `Frozen audio changed: ${sample.ordinal}`,
        );
      }
      const name =
        sample.kind === "GOLDEN_AUDITION"
          ? "golden-audition.mp3"
          : `ai-${sample.aliasId}.mp3`;
      const destination = resolve(
        voiceRoot,
        name,
      );
      await copyFile(source, destination);
      await chmod(destination, 0o600);
      const copied = await readFile(destination);
      if (sha256(copied) !== sha256(sourceBytes)) {
        throw new Error(
          `Review copy failed: ${sample.ordinal}`,
        );
      }
      rendered.push({
        kind: sample.kind,
        aliasId: sample.aliasId,
        aliasSpoken: sample.aliasSpoken,
        transcript: sample.transcript,
        transcriptSha256:
          sample.transcriptSha256,
        audioPath: relative(
          OUTPUT_ROOT,
          destination,
        ),
        audioSha256:
          sample.generatedAudioChecksum,
        sizeBytes: sample.audit.fileBytes,
        durationSeconds:
          sample.audit.durationSeconds,
        integratedLufs:
          sample.audit.integratedLufs,
        truePeakDbtp:
          sample.audit.truePeakDbtp,
      });
    }
    const golden = rendered.find(
      (sample) =>
        sample.kind === "GOLDEN_AUDITION",
    );
    const micros = rendered
      .filter(
        (sample) =>
          sample.kind ===
          "AI_PRONUNCIATION_MICRO",
      )
      .sort(
        (left, right) =>
          Object.keys(ALIAS_LABELS).indexOf(
            left.aliasId,
          ) -
          Object.keys(ALIAS_LABELS).indexOf(
            right.aliasId,
          ),
      );
    if (!golden || micros.length !== 3) {
      throw new Error(
        `${label} review samples are incomplete`,
      );
    }
    voices.push({ label, golden, micros });
  }
  const manifestCore = {
    schemaVersion:
      "tenxpros-elevenlabs-owner-voice-review-manifest-v1",
    sourceAuditionResultHash:
      result.resultHash,
    sourceAuditionPlanHash:
      result.planHash,
    reason:
      "OPENROUTER_KEY_PREFLIGHT_HTTP_401_TWICE",
    openRouterPaidJudgeRequests: 0,
    openRouterActualCostUsd: "0.00000000",
    privateVoiceMappingExcluded: true,
    scoreScale: {
      minimum: 1,
      maximum: 5,
    },
    requiredScoreFields: SCORE_FIELDS.map(
      ([field]) => field,
    ),
    passThresholds: {
      aiPronunciationCorrect: true,
      criticalDefect: false,
      naturalnessMinimum: 4,
      clarityMinimum: 4,
      professionalQualityMinimum: 4,
      longFormSuitabilityMinimum: 4,
    },
    voices,
  };
  const manifestHash = sha256(
    canonical(manifestCore),
  );
  const manifest = {
    ...manifestCore,
    manifestHash,
  };
  await writeRestricted(
    resolve(
      OUTPUT_ROOT,
      "owner-review-manifest.json",
    ),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeRestricted(
    resolve(OUTPUT_ROOT, "index.html"),
    html(manifest),
  );
  const report = {
    schemaVersion:
      "tenxpros-elevenlabs-owner-review-package-report-v1",
    status: "OWNER_VOICE_SELECTION_REQUIRED",
    manifestHash,
    voiceCount: voices.length,
    goldenAuditionCount:
      voices.length,
    pronunciationMicroCount:
      voices.reduce(
        (sum, voice) =>
          sum + voice.micros.length,
        0,
      ),
    audioAssetCount:
      voices.reduce(
        (sum, voice) =>
          sum + 1 + voice.micros.length,
        0,
      ),
    pagePath: relative(
      REPOSITORY_ROOT,
      resolve(OUTPUT_ROOT, "index.html"),
    ),
    manifestPath: relative(
      REPOSITORY_ROOT,
      resolve(
        OUTPUT_ROOT,
        "owner-review-manifest.json",
      ),
    ),
    makesNetworkRequests: false,
    supportsJsonExport: true,
    productionMutations: 0,
    fullLessonGenerations: 0,
  };
  await writeRestricted(
    resolve(
      OUTPUT_ROOT,
      "package-report.json",
    ),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify(report)}\n`,
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
