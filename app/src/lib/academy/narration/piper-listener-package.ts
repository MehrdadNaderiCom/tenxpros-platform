import { createHash } from "node:crypto";

import {
  PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION,
  PHASE2B_RESPONSE_SCHEMA_VERSION,
  PHASE2B_SCORE_DIMENSIONS,
  type Phase2BPublicPackage,
} from "./piper-listening-evaluation";

export const PHASE2B_LISTENER_HTML_FILENAME = "index.html";
export const PHASE2B_LISTENER_INSTRUCTIONS_FILENAME =
  "LISTENER-INSTRUCTIONS.txt";

export interface Phase2BPublicFile {
  path: string;
  data: string | Buffer;
}

export interface Phase2BPublicScanInput {
  publicPackage: Phase2BPublicPackage;
  files: readonly Phase2BPublicFile[];
  additionalProhibitedTokens?: readonly string[];
}

export interface Phase2BPublicScanResult {
  passed: true;
  fileCount: number;
  audioCount: number;
  scannedBytes: number;
  sha256ByPath: Readonly<Record<string, string>>;
  codecMarkerException: "LAME3.100";
}

const PUBLIC_TEXT_PROHIBITED_PATTERNS = Object.freeze([
  {
    label: "comparison identity",
    pattern: /\b(?:baseline|corrected|current pipeline)\b/iu,
  },
  {
    label: "voice or provider identity",
    pattern: /\b(?:piper|bryce|linda|cori|elevenlabs)\b/iu,
  },
  {
    label: "generation implementation",
    pattern:
      /\b(?:semantic|recipe|manifest|runtime|onnx|ffmpeg|lame)\b/iu,
  },
  {
    label: "internal lesson identity",
    pattern: /\b(?:mission|journey|conversation|rules)\b/iu,
  },
  {
    label: "internal storage path",
    pattern:
      /(?:\/opt\/|\/home\/|scratch_academy|(?:^|[^a-z])private(?:[^a-z]|$))/iu,
  },
  {
    label: "SHA-256-like value",
    pattern: /\b[a-f0-9]{64}\b/iu,
  },
  {
    label: "external address",
    pattern: /\bhttps?:\/\/|(?:^|["'\s])\/\/[a-z0-9]/iu,
  },
  {
    label: "browser network or logging API",
    pattern:
      /\b(?:fetch|xmlhttprequest|websocket|eventsource|sendbeacon|console)\b/iu,
  },
]);

const PUBLIC_AUDIO_PROHIBITED_PATTERNS = Object.freeze([
  {
    label: "comparison identity",
    pattern: /\b(?:baseline|corrected|current pipeline)\b/iu,
  },
  {
    label: "voice or provider identity",
    pattern: /\b(?:piper|bryce|linda|cori|elevenlabs)\b/iu,
  },
  {
    label: "internal lesson identity",
    pattern: /\b(?:mission|journey|conversation|rules)\b/iu,
  },
  {
    label: "internal storage path",
    pattern:
      /(?:\/opt\/|\/home\/|scratch_academy|(?:^|[^a-z])private(?:[^a-z]|$))/iu,
  },
  {
    label: "SHA-256-like value",
    pattern: /\b[a-f0-9]{64}\b/iu,
  },
]);

const SCORE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  naturalness: "Naturalness",
  pause_quality: "Pause quality",
  pronunciation: "Pronunciation",
  clarity: "Clarity",
  listening_comfort: "Listening comfort",
  professional_quality: "Professional quality",
});

function htmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function assertPublicDefinition(
  publicPackage: Phase2BPublicPackage,
): void {
  if (
    publicPackage.schema_version !==
      PHASE2B_PUBLIC_PACKAGE_SCHEMA_VERSION ||
    !/^blind-review-[a-f0-9]{16}$/u.test(
      publicPackage.evaluation_package_id,
    ) ||
    publicPackage.pairs.length === 0
  ) {
    throw new Error("Invalid public listening definition");
  }
  const pairIds = new Set<string>();
  const sampleIds = new Set<string>();
  const filenames = new Set<string>();
  for (const pair of publicPackage.pairs) {
    if (
      !/^sample-\d{2}$/u.test(pair.pair_id) ||
      pairIds.has(pair.pair_id) ||
      pair.samples.length !== 2
    ) {
      throw new Error(`Invalid public pair: ${pair.pair_id}`);
    }
    pairIds.add(pair.pair_id);
    if (
      pair.samples[0].label !== "A" ||
      pair.samples[1].label !== "B"
    ) {
      throw new Error(`${pair.pair_id} must contain A then B`);
    }
    for (const sample of pair.samples) {
      if (
        sample.sample_id !==
          `${pair.pair_id}-${sample.label}` ||
        sample.filename !== `${sample.sample_id}.mp3` ||
        !/^sample-\d{2}-[AB]\.mp3$/u.test(sample.filename) ||
        sampleIds.has(sample.sample_id) ||
        filenames.has(sample.filename)
      ) {
        throw new Error(
          `Invalid public sample in ${pair.pair_id}`,
        );
      }
      sampleIds.add(sample.sample_id);
      filenames.add(sample.filename);
    }
  }
  if (
    publicPackage.pairs.filter((pair) => pair.table_efficiency)
      .length !== 1
  ) {
    throw new Error(
      "Exactly one listening set must include the table questionnaire",
    );
  }
}

function scoreControls(sampleId: string): string {
  return PHASE2B_SCORE_DIMENSIONS.map(
    (dimension) => `
      <label class="score-row">
        <span>${htmlEscape(SCORE_LABELS[dimension] ?? dimension)}</span>
        <select data-score="${dimension}" data-sample="${sampleId}" aria-label="${htmlEscape(
          SCORE_LABELS[dimension] ?? dimension,
        )} score for version ${sampleId.endsWith("-A") ? "A" : "B"}">
          <option value="">Choose 1-5</option>
          <option value="1">1 - Very poor</option>
          <option value="2">2 - Poor</option>
          <option value="3">3 - Acceptable</option>
          <option value="4">4 - Good</option>
          <option value="5">5 - Excellent</option>
        </select>
      </label>`,
  ).join("");
}

function sampleMarkup(
  pairNumber: number,
  sample: Phase2BPublicPackage["pairs"][number]["samples"][number],
): string {
  const sampleId = htmlEscape(sample.sample_id);
  return `
    <article class="sample-card" data-sample-card="${sampleId}">
      <div class="sample-heading">
        <div>
          <p class="eyebrow">Listening set ${pairNumber}</p>
          <h3>Version ${sample.label}</h3>
        </div>
        <span class="lock-state" data-lock-state="${sampleId}">1.0× scores not locked</span>
      </div>
      <audio
        controls
        preload="metadata"
        data-audio="${sampleId}"
        src="audio/${htmlEscape(sample.filename)}"
        aria-label="Listening set ${pairNumber}, version ${sample.label}"
      ></audio>
      <p class="speed-note" data-speed-note="${sampleId}">
        Main evaluation: listen at 1.0× and score every item below.
      </p>
      <div class="score-grid">
        ${scoreControls(sampleId)}
      </div>
      <div class="button-row">
        <button type="button" class="primary" data-lock="${sampleId}">
          Lock all 1.0× scores
        </button>
        <button type="button" data-optional-speed="${sampleId}" disabled>
          Optional second listen at 1.25×
        </button>
        <button type="button" class="quiet" data-reset-sample="${sampleId}">
          Reset this version
        </button>
      </div>
      <label class="notes-label">
        Optional note about version ${sample.label}
        <textarea data-file-comment="${sampleId}" maxlength="2000" rows="2"></textarea>
      </label>
    </article>`;
}

function selectControl(
  name: string,
  label: string,
  options: readonly (readonly [string, string])[],
): string {
  return `
    <label class="question">
      <span>${htmlEscape(label)}</span>
      <select data-pair-field="${htmlEscape(name)}">
        <option value="">Choose one</option>
        ${options
          .map(
            ([value, text]) =>
              `<option value="${htmlEscape(value)}">${htmlEscape(text)}</option>`,
          )
          .join("")}
      </select>
    </label>`;
}

function pairQuestions(): string {
  const versionOptions = [
    ["A", "Version A"],
    ["B", "Version B"],
  ] as const;
  return [
    selectControl(
      "overall_preference",
      "Which version do you prefer overall?",
      [...versionOptions, ["no_preference", "No preference"]],
    ),
    selectControl(
      "easier_to_understand",
      "Which version is easier to understand?",
      [...versionOptions, ["same", "About the same"]],
    ),
    selectControl(
      "more_natural",
      "Which version sounds more natural?",
      [...versionOptions, ["same", "About the same"]],
    ),
    selectControl(
      "long_lesson_preference",
      "Which version would you prefer for a 15-to-30-minute lesson?",
      [
        ...versionOptions,
        ["neither", "Neither"],
        ["no_preference", "No preference"],
      ],
    ),
    selectControl(
      "too_slow",
      "Did either version feel too slow?",
      [
        ...versionOptions,
        ["both", "Both"],
        ["neither", "Neither"],
      ],
    ),
    selectControl(
      "too_fast",
      "Did either version feel too fast?",
      [
        ...versionOptions,
        ["both", "Both"],
        ["neither", "Neither"],
      ],
    ),
    selectControl(
      "strange_pronunciation",
      "Did you notice incorrect or strange pronunciation?",
      [
        ...versionOptions,
        ["both", "Both"],
        ["neither", "Neither"],
      ],
    ),
  ].join("");
}

function issueMarkup(label: "A" | "B"): string {
  return `
    <div class="issue-card" data-issue-card="${label}" hidden>
      <p>Describe the issue in version ${label}.</p>
      <label>
        Severity
        <select data-issue-severity="${label}">
          <option value="">Choose severity</option>
          <option value="minor">Minor</option>
          <option value="major">Major</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <label>
        What sounded wrong?
        <textarea data-issue-description="${label}" maxlength="500" rows="2"></textarea>
      </label>
    </div>`;
}

function tableQuestions(): string {
  return `
    <fieldset class="table-questions" data-table-questions>
      <legend>Additional table listening questions</legend>
      <p class="muted">Answer these only for this listening set.</p>
      ${selectControl(
        "table:easier_to_understand",
        "Which version makes the table easier to understand?",
        [
          ["A", "Version A"],
          ["B", "Version B"],
          ["same", "About the same"],
        ],
      )}
      ${selectControl(
        "table:repeated_labels_usefulness",
        "How useful are repeated labels for understanding the table?",
        [
          ["1", "1 - Not useful"],
          ["2", "2 - Slightly useful"],
          ["3", "3 - Moderately useful"],
          ["4", "4 - Very useful"],
          ["5", "5 - Essential"],
        ],
      )}
      ${selectControl(
        "table:excessively_slow",
        "Did either version feel excessively slow?",
        [
          ["A", "Version A"],
          ["B", "Version B"],
          ["both", "Both"],
          ["neither", "Neither"],
        ],
      )}
      ${selectControl(
        "table:pauses_excessive",
        "Did either version have excessive pauses?",
        [
          ["A", "Version A"],
          ["B", "Version B"],
          ["both", "Both"],
          ["neither", "Neither"],
        ],
      )}
      ${selectControl(
        "table:prefer_longer_clearer",
        "Would you prefer a version that is longer if it is also clearer?",
        [
          ["yes", "Yes"],
          ["no", "No"],
          ["not_applicable", "Not applicable"],
        ],
      )}
      ${selectControl(
        "table:test_more_concise_format",
        "Should a more concise spoken table format be tested?",
        [
          ["yes", "Yes"],
          ["no", "No"],
          ["unsure", "Unsure"],
        ],
      )}
    </fieldset>`;
}

function pairMarkup(
  pair: Phase2BPublicPackage["pairs"][number],
  index: number,
): string {
  const pairId = htmlEscape(pair.pair_id);
  return `
    <section class="pair-card" data-pair="${pairId}">
      <div class="pair-heading">
        <p class="eyebrow">Independent comparison</p>
        <h2>Listening set ${index + 1} of __PAIR_COUNT__</h2>
      </div>
      <div class="sample-layout">
        ${sampleMarkup(index + 1, pair.samples[0])}
        ${sampleMarkup(index + 1, pair.samples[1])}
      </div>
      <fieldset class="pair-questions" data-pair-questions="${pairId}" disabled>
        <legend>Compare versions A and B</legend>
        <p class="locked-message" data-pair-lock-message="${pairId}">
          Lock the six 1.0× scores for both versions to unlock these questions.
        </p>
        <div class="question-grid">
          ${pairQuestions()}
        </div>
        <div class="issue-layout">
          ${issueMarkup("A")}
          ${issueMarkup("B")}
        </div>
        ${pair.table_efficiency ? tableQuestions() : ""}
        <label class="notes-label">
          Optional comments for this listening set
          <textarea data-pair-comment maxlength="2000" rows="3"></textarea>
        </label>
      </fieldset>
    </section>`;
}

const LISTENING_PAGE_CSS = String.raw`
  :root {
    color-scheme: light;
    --ink: #172033;
    --muted: #59657b;
    --line: #d7ddea;
    --paper: #ffffff;
    --wash: #f3f6fb;
    --accent: #365fc7;
    --accent-dark: #284a9e;
    --good: #176b4d;
    --warn: #945d13;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: var(--ink);
    background: linear-gradient(180deg, #eaf0fb 0, var(--wash) 18rem);
    line-height: 1.5;
  }
  main { width: min(1120px, calc(100% - 2rem)); margin: 0 auto; padding: 2.5rem 0 5rem; }
  h1, h2, h3, p { margin-top: 0; }
  h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.05; letter-spacing: -.04em; }
  h2 { font-size: 1.55rem; }
  h3 { margin-bottom: .25rem; }
  .hero, .identity-card, .pair-card, .finish-card {
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 20px;
    box-shadow: 0 14px 38px rgba(32, 50, 89, .07);
  }
  .hero { padding: clamp(1.4rem, 4vw, 3rem); margin-bottom: 1rem; }
  .hero p { max-width: 68ch; color: var(--muted); font-size: 1.05rem; }
  .identity-card, .finish-card { padding: 1.25rem; margin: 1rem 0; }
  .identity-row { display: flex; gap: .75rem; align-items: end; flex-wrap: wrap; }
  .identity-row label { flex: 1 1 18rem; }
  .pair-card { padding: clamp(1rem, 3vw, 2rem); margin: 1.25rem 0; }
  .pair-heading { border-bottom: 1px solid var(--line); margin-bottom: 1rem; }
  .eyebrow { color: var(--accent); font-size: .78rem; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; margin-bottom: .35rem; }
  .sample-layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .sample-card { border: 1px solid var(--line); border-radius: 15px; padding: 1rem; background: #fbfcff; }
  .sample-heading { display: flex; justify-content: space-between; align-items: start; gap: 1rem; }
  .lock-state { color: var(--warn); font-size: .78rem; font-weight: 700; text-align: right; }
  .lock-state.locked { color: var(--good); }
  audio { display: block; width: 100%; margin: .8rem 0; }
  .speed-note, .muted, .status { color: var(--muted); }
  .score-grid, .question-grid { display: grid; gap: .65rem; }
  .score-row, .question, .issue-card label, .notes-label, .identity-row label {
    display: grid;
    gap: .3rem;
    font-weight: 650;
  }
  .score-row { grid-template-columns: minmax(9rem, 1fr) minmax(9rem, 12rem); align-items: center; }
  select, textarea, input {
    width: 100%;
    color: var(--ink);
    background: white;
    border: 1px solid #aeb8cb;
    border-radius: 9px;
    padding: .65rem .7rem;
    font: inherit;
  }
  textarea { resize: vertical; font-weight: 400; }
  select:focus, textarea:focus, input:focus, button:focus-visible { outline: 3px solid rgba(54, 95, 199, .25); outline-offset: 2px; }
  .button-row { display: flex; flex-wrap: wrap; gap: .5rem; margin: .9rem 0; }
  button {
    border: 1px solid #aeb8cb;
    border-radius: 9px;
    background: white;
    color: var(--ink);
    padding: .65rem .9rem;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  button.primary { color: white; background: var(--accent); border-color: var(--accent); }
  button.primary:hover { background: var(--accent-dark); }
  button.quiet { color: var(--muted); }
  button:disabled { cursor: not-allowed; opacity: .48; }
  fieldset { min-width: 0; }
  .pair-questions, .table-questions { border: 1px solid var(--line); border-radius: 15px; padding: 1rem; margin-top: 1rem; }
  .pair-questions > legend, .table-questions > legend { font-size: 1.15rem; font-weight: 750; padding: 0 .4rem; }
  .question-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .locked-message { color: var(--warn); font-weight: 650; }
  .issue-layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
  .issue-card { margin-top: 1rem; padding: .85rem; border-radius: 10px; background: #fff6ea; }
  .issue-card label + label { margin-top: .6rem; }
  .table-questions { background: #f7f9fe; }
  .notes-label { margin-top: 1rem; }
  .progress-wrap { position: sticky; top: .5rem; z-index: 2; background: rgba(255,255,255,.96); border: 1px solid var(--line); border-radius: 12px; padding: .7rem 1rem; box-shadow: 0 6px 20px rgba(32,50,89,.08); }
  progress { width: 100%; height: .75rem; accent-color: var(--accent); }
  .finish-row { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
  .finish-row .status { flex: 1 1 20rem; margin: 0; }
  .error { color: #a22d2d; font-weight: 650; }
  [hidden] { display: none !important; }
  @media (max-width: 760px) {
    .sample-layout, .question-grid, .issue-layout { grid-template-columns: 1fr; }
    .score-row { grid-template-columns: 1fr; }
    main { width: min(100% - 1rem, 1120px); padding-top: .5rem; }
  }
`;

const LISTENING_PAGE_SCRIPT = String.raw`
(() => {
  "use strict";
  const definition = JSON.parse(document.getElementById("study-data").textContent);
  const scoreNames = ["naturalness", "pause_quality", "pronunciation", "clarity", "listening_comfort", "professional_quality"];
  const pairNames = ["overall_preference", "easier_to_understand", "more_natural", "long_lesson_preference", "too_slow", "too_fast", "strange_pronunciation"];
  const tableNames = ["easier_to_understand", "repeated_labels_usefulness", "excessively_slow", "pauses_excessive", "prefer_longer_clearer", "test_more_concise_format"];
  const draftKey = "blind-audio-study:" + definition.evaluation_package_id;
  const listenerPattern = /^L-[A-Z2-9]{8,16}$/;
  const now = () => new Date().toISOString();
  const by = (selector, root) => (root || document).querySelector(selector);
  const all = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const safeText = (value, maximum) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
  const safeChoice = (value, allowed) => allowed.includes(value) ? value : undefined;
  const safeScore = (value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5 ? Number(value) : undefined;

  function newListenerId() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    let value = "L-";
    for (let index = 0; index < 10; index += 1) value += alphabet[bytes[index] % alphabet.length];
    return value;
  }

  function emptyState() {
    const started = now();
    const value = {
      schema_version: "academy-blind-listening-response-v2",
      evaluation_package_id: definition.evaluation_package_id,
      listener_id: newListenerId(),
      timestamps: { started_at: started, updated_at: started, exported_at: started },
      files: {},
      pairs: {}
    };
    for (const pair of definition.pairs) {
      for (const sample of pair.samples) {
        value.files[sample.sample_id] = {
          scores: {},
          one_x_recorded_at: null,
          optional_1_25x_used: false,
          comment: ""
        };
      }
      value.pairs[pair.pair_id] = {
        preferences: {},
        pronunciation_issues: [],
        table_efficiency: pair.table_efficiency ? {} : null,
        comments: ""
      };
    }
    return value;
  }

  function allowedDraft(candidate) {
    const clean = emptyState();
    if (!candidate || candidate.evaluation_package_id !== definition.evaluation_package_id || !listenerPattern.test(candidate.listener_id || "")) return clean;
    clean.listener_id = candidate.listener_id;
    if (candidate.timestamps && typeof candidate.timestamps.started_at === "string" && !Number.isNaN(Date.parse(candidate.timestamps.started_at))) {
      clean.timestamps.started_at = new Date(candidate.timestamps.started_at).toISOString();
    }
    for (const pair of definition.pairs) {
      for (const sample of pair.samples) {
        const incoming = candidate.files && candidate.files[sample.sample_id];
        const target = clean.files[sample.sample_id];
        if (!incoming || typeof incoming !== "object") continue;
        for (const name of scoreNames) {
          const score = safeScore(incoming.scores && incoming.scores[name]);
          if (score !== undefined) target.scores[name] = score;
        }
        if (scoreNames.every((name) => target.scores[name] !== undefined) && typeof incoming.one_x_recorded_at === "string" && !Number.isNaN(Date.parse(incoming.one_x_recorded_at))) {
          target.one_x_recorded_at = new Date(incoming.one_x_recorded_at).toISOString();
          target.optional_1_25x_used = Boolean(incoming.optional_1_25x_used);
        }
        target.comment = safeText(incoming.comment, 2000);
      }
      const incomingPair = candidate.pairs && candidate.pairs[pair.pair_id];
      const targetPair = clean.pairs[pair.pair_id];
      if (!incomingPair || typeof incomingPair !== "object") continue;
      const options = {
        overall_preference: ["A", "B", "no_preference"],
        easier_to_understand: ["A", "B", "same"],
        more_natural: ["A", "B", "same"],
        long_lesson_preference: ["A", "B", "neither", "no_preference"],
        too_slow: ["A", "B", "both", "neither"],
        too_fast: ["A", "B", "both", "neither"],
        strange_pronunciation: ["A", "B", "both", "neither"]
      };
      for (const name of pairNames) {
        const choice = safeChoice(incomingPair.preferences && incomingPair.preferences[name], options[name]);
        if (choice !== undefined) targetPair.preferences[name] = choice;
      }
      const affected = targetPair.preferences.strange_pronunciation === "both" ? ["A", "B"] : ["A", "B"].includes(targetPair.preferences.strange_pronunciation) ? [targetPair.preferences.strange_pronunciation] : [];
      if (Array.isArray(incomingPair.pronunciation_issues)) {
        for (const label of affected) {
          const issue = incomingPair.pronunciation_issues.find((item) => item && item.version === label);
          const severity = issue && safeChoice(issue.severity, ["minor", "major", "critical"]);
          const description = issue && safeText(issue.description, 500);
          if (severity && description) targetPair.pronunciation_issues.push({ version: label, severity, description });
        }
      }
      if (pair.table_efficiency && incomingPair.table_efficiency && typeof incomingPair.table_efficiency === "object") {
        const tableOptions = {
          easier_to_understand: ["A", "B", "same"],
          excessively_slow: ["A", "B", "both", "neither"],
          pauses_excessive: ["A", "B", "both", "neither"],
          prefer_longer_clearer: ["yes", "no", "not_applicable"],
          test_more_concise_format: ["yes", "no", "unsure"]
        };
        for (const name of tableNames) {
          if (name === "repeated_labels_usefulness") {
            const score = safeScore(incomingPair.table_efficiency[name]);
            if (score !== undefined) targetPair.table_efficiency[name] = score;
          } else {
            const choice = safeChoice(incomingPair.table_efficiency[name], tableOptions[name]);
            if (choice !== undefined) targetPair.table_efficiency[name] = choice;
          }
        }
      }
      targetPair.comments = safeText(incomingPair.comments, 2000);
    }
    return clean;
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? allowedDraft(JSON.parse(raw)) : emptyState();
    } catch (_) {
      return emptyState();
    }
  }

  let state = loadDraft();
  const listenerId = by("[data-listener-id]");
  listenerId.value = state.listener_id;

  function setSaveStatus(message, isError) {
    const node = by("[data-save-status]");
    node.textContent = message;
    node.classList.toggle("error", Boolean(isError));
  }

  function saveDraft() {
    state.timestamps.updated_at = now();
    try {
      localStorage.setItem(draftKey, JSON.stringify(buildResponse(state.timestamps.updated_at)));
      setSaveStatus("Draft saved on this device.", false);
    } catch (_) {
      setSaveStatus("Draft saving is unavailable. Keep this page open until final export.", true);
    }
  }

  function sampleLocked(sampleId) {
    return Boolean(state.files[sampleId].one_x_recorded_at);
  }

  function pairUnlocked(pair) {
    return pair.samples.every((sample) => sampleLocked(sample.sample_id));
  }

  function affectedLabels(pairState) {
    const answer = pairState.preferences.strange_pronunciation;
    if (answer === "both") return ["A", "B"];
    if (answer === "A" || answer === "B") return [answer];
    return [];
  }

  function syncIssues(pairElement, pairState) {
    const labels = affectedLabels(pairState);
    const issues = [];
    for (const label of ["A", "B"]) {
      const card = by('[data-issue-card="' + label + '"]', pairElement);
      const severityControl = by('[data-issue-severity="' + label + '"]', pairElement);
      const descriptionControl = by('[data-issue-description="' + label + '"]', pairElement);
      const visible = labels.includes(label);
      card.hidden = !visible;
      severityControl.disabled = !visible;
      descriptionControl.disabled = !visible;
      if (visible) {
        const severity = safeChoice(severityControl.value, ["minor", "major", "critical"]);
        const description = safeText(descriptionControl.value, 500);
        if (severity && description) issues.push({ version: label, severity, description });
      }
    }
    pairState.pronunciation_issues = issues;
  }

  function updateSampleUi(sampleId) {
    const file = state.files[sampleId];
    const locked = sampleLocked(sampleId);
    const card = by('[data-sample-card="' + sampleId + '"]');
    for (const control of all("[data-score]", card)) control.disabled = locked;
    const lockButton = by('[data-lock="' + sampleId + '"]');
    lockButton.disabled = locked;
    lockButton.textContent = locked ? "1.0× scores locked" : "Lock all 1.0× scores";
    const speedButton = by('[data-optional-speed="' + sampleId + '"]');
    speedButton.disabled = !locked;
    const lockState = by('[data-lock-state="' + sampleId + '"]');
    lockState.textContent = locked ? "1.0× scores locked" : "1.0× scores not locked";
    lockState.classList.toggle("locked", locked);
    const audio = by('[data-audio="' + sampleId + '"]');
    if (!locked) {
      audio.dataset.optionalMode = "no";
      audio.playbackRate = 1;
      speedButton.textContent = "Optional second listen at 1.25×";
    }
    by('[data-speed-note="' + sampleId + '"]').textContent = locked
      ? (file.optional_1_25x_used ? "Main 1.0× scores are locked. The optional speed was used." : "Main 1.0× scores are locked. A second listen at 1.25× is optional.")
      : "Main evaluation: listen at 1.0× and score every item below.";
  }

  function updatePairUi(pair) {
    const element = by('[data-pair="' + pair.pair_id + '"]');
    const fieldset = by('[data-pair-questions="' + pair.pair_id + '"]', element);
    const unlocked = pairUnlocked(pair);
    fieldset.disabled = !unlocked;
    const message = by('[data-pair-lock-message="' + pair.pair_id + '"]', element);
    message.hidden = unlocked;
    syncIssues(element, state.pairs[pair.pair_id]);
  }

  function completion() {
    let answered = 0;
    let total = 0;
    const errors = [];
    for (const pair of definition.pairs) {
      for (const sample of pair.samples) {
        const file = state.files[sample.sample_id];
        for (const name of scoreNames) {
          total += 1;
          if (file.scores[name] !== undefined) answered += 1;
        }
        total += 1;
        if (file.one_x_recorded_at) answered += 1;
      }
      const pairState = state.pairs[pair.pair_id];
      for (const name of pairNames) {
        total += 1;
        if (pairState.preferences[name] !== undefined) answered += 1;
      }
      const affected = affectedLabels(pairState);
      if (affected.length > 0 && (pairState.pronunciation_issues.length !== affected.length || pairState.pronunciation_issues.some((issue) => !issue.description || !issue.severity))) {
        errors.push("Add severity and a short description for every version with a pronunciation issue in listening set " + (definition.pairs.indexOf(pair) + 1) + ".");
      }
      if (pair.table_efficiency) {
        for (const name of tableNames) {
          total += 1;
          if (pairState.table_efficiency[name] !== undefined) answered += 1;
        }
      }
    }
    const complete = answered === total && errors.length === 0;
    return {
      status: complete ? "complete" : "incomplete",
      answered_required: answered,
      required_total: total,
      percent: Number(((answered / total) * 100).toFixed(2)),
      errors
    };
  }

  function updateProgress() {
    const result = completion();
    const bar = by("[data-progress]");
    bar.max = result.required_total;
    bar.value = result.answered_required;
    by("[data-progress-text]").textContent = result.answered_required + " of " + result.required_total + " required answers complete (" + result.percent + "%).";
    const exportButton = by("[data-export]");
    exportButton.disabled = result.status !== "complete";
    const exportStatus = by("[data-export-status]");
    exportStatus.textContent = result.errors.length ? result.errors[0] : result.status === "complete" ? "Ready for final export." : "Complete every required answer to enable final export.";
    exportStatus.classList.toggle("error", result.errors.length > 0);
  }

  function buildResponse(exportedAt) {
    const files = {};
    const pairs = {};
    for (const pair of definition.pairs) {
      for (const sample of pair.samples) {
        const input = state.files[sample.sample_id];
        const scores = {};
        for (const name of scoreNames) {
          const score = safeScore(input.scores[name]);
          if (score !== undefined) scores[name] = score;
        }
        files[sample.sample_id] = {
          scores,
          one_x_recorded_at: typeof input.one_x_recorded_at === "string" ? input.one_x_recorded_at : null,
          optional_1_25x_used: Boolean(input.optional_1_25x_used),
          comment: safeText(input.comment, 2000)
        };
      }
      const inputPair = state.pairs[pair.pair_id];
      const preferences = {};
      const pairOptions = {
        overall_preference: ["A", "B", "no_preference"],
        easier_to_understand: ["A", "B", "same"],
        more_natural: ["A", "B", "same"],
        long_lesson_preference: ["A", "B", "neither", "no_preference"],
        too_slow: ["A", "B", "both", "neither"],
        too_fast: ["A", "B", "both", "neither"],
        strange_pronunciation: ["A", "B", "both", "neither"]
      };
      for (const name of pairNames) {
        const choice = safeChoice(inputPair.preferences[name], pairOptions[name]);
        if (choice !== undefined) preferences[name] = choice;
      }
      const pronunciationIssues = [];
      for (const label of affectedLabels(inputPair)) {
        const issue = inputPair.pronunciation_issues.find((item) => item.version === label);
        const severity = issue && safeChoice(issue.severity, ["minor", "major", "critical"]);
        const description = issue && safeText(issue.description, 500);
        if (severity && description) pronunciationIssues.push({ version: label, severity, description });
      }
      let tableEfficiency = null;
      if (pair.table_efficiency) {
        tableEfficiency = {};
        const tableOptions = {
          easier_to_understand: ["A", "B", "same"],
          excessively_slow: ["A", "B", "both", "neither"],
          pauses_excessive: ["A", "B", "both", "neither"],
          prefer_longer_clearer: ["yes", "no", "not_applicable"],
          test_more_concise_format: ["yes", "no", "unsure"]
        };
        for (const name of tableNames) {
          if (name === "repeated_labels_usefulness") {
            const score = safeScore(inputPair.table_efficiency[name]);
            if (score !== undefined) tableEfficiency[name] = score;
          } else {
            const choice = safeChoice(inputPair.table_efficiency[name], tableOptions[name]);
            if (choice !== undefined) tableEfficiency[name] = choice;
          }
        }
      }
      pairs[pair.pair_id] = {
        preferences,
        pronunciation_issues: pronunciationIssues,
        table_efficiency: tableEfficiency,
        comments: safeText(inputPair.comments, 2000)
      };
    }
    const result = completion();
    return {
      schema_version: "academy-blind-listening-response-v2",
      evaluation_package_id: definition.evaluation_package_id,
      listener_id: state.listener_id,
      timestamps: {
        started_at: state.timestamps.started_at,
        updated_at: exportedAt,
        exported_at: exportedAt
      },
      files,
      pairs,
      completion: {
        status: result.status,
        answered_required: result.answered_required,
        required_total: result.required_total,
        percent: result.percent,
        completed_at: result.status === "complete" ? exportedAt : null,
        errors: result.errors
      }
    };
  }

  for (const pair of definition.pairs) {
    const pairElement = by('[data-pair="' + pair.pair_id + '"]');
    for (const sample of pair.samples) {
      const sampleId = sample.sample_id;
      const card = by('[data-sample-card="' + sampleId + '"]');
      const file = state.files[sampleId];
      for (const control of all("[data-score]", card)) {
        const name = control.dataset.score;
        control.value = file.scores[name] === undefined ? "" : String(file.scores[name]);
        control.addEventListener("change", () => {
          const score = safeScore(control.value);
          if (score === undefined) delete file.scores[name];
          else file.scores[name] = score;
          saveDraft();
          updateProgress();
        });
      }
      const comment = by('[data-file-comment="' + sampleId + '"]');
      comment.value = file.comment;
      comment.addEventListener("input", () => {
        file.comment = safeText(comment.value, 2000);
        saveDraft();
      });
      const audio = by('[data-audio="' + sampleId + '"]');
      audio.playbackRate = 1;
      audio.defaultPlaybackRate = 1;
      audio.preservesPitch = true;
      audio.dataset.optionalMode = "no";
      audio.addEventListener("ratechange", () => {
        const allowed = sampleLocked(sampleId) && audio.dataset.optionalMode === "yes";
        const expected = allowed ? 1.25 : 1;
        if (Math.abs(audio.playbackRate - expected) > 0.001) audio.playbackRate = expected;
      });
      by('[data-lock="' + sampleId + '"]').addEventListener("click", () => {
        if (!scoreNames.every((name) => file.scores[name] !== undefined)) {
          setSaveStatus("Choose all six scores before locking this version.", true);
          return;
        }
        file.one_x_recorded_at = now();
        audio.dataset.optionalMode = "no";
        audio.playbackRate = 1;
        saveDraft();
        updateSampleUi(sampleId);
        updatePairUi(pair);
        updateProgress();
      });
      by('[data-optional-speed="' + sampleId + '"]').addEventListener("click", () => {
        if (!sampleLocked(sampleId)) return;
        const optional = audio.dataset.optionalMode !== "yes";
        audio.dataset.optionalMode = optional ? "yes" : "no";
        audio.playbackRate = optional ? 1.25 : 1;
        file.optional_1_25x_used = true;
        by('[data-optional-speed="' + sampleId + '"]').textContent = optional ? "Return this player to 1.0×" : "Optional second listen at 1.25×";
        saveDraft();
        updateSampleUi(sampleId);
        if (optional) audio.play().catch(() => {});
      });
      by('[data-reset-sample="' + sampleId + '"]').addEventListener("click", () => {
        file.scores = {};
        file.one_x_recorded_at = null;
        file.optional_1_25x_used = false;
        audio.pause();
        audio.currentTime = 0;
        audio.dataset.optionalMode = "no";
        audio.playbackRate = 1;
        for (const control of all("[data-score]", card)) control.value = "";
        saveDraft();
        updateSampleUi(sampleId);
        updatePairUi(pair);
        updateProgress();
      });
      updateSampleUi(sampleId);
    }

    const pairState = state.pairs[pair.pair_id];
    for (const control of all("[data-pair-field]", pairElement)) {
      const compoundName = control.dataset.pairField;
      if (compoundName.startsWith("table:")) {
        const name = compoundName.slice(6);
        const stored = pairState.table_efficiency && pairState.table_efficiency[name];
        control.value = stored === undefined ? "" : String(stored);
      } else {
        const stored = pairState.preferences[compoundName];
        control.value = stored === undefined ? "" : String(stored);
      }
      control.addEventListener("change", () => {
        if (compoundName.startsWith("table:")) {
          const name = compoundName.slice(6);
          if (name === "repeated_labels_usefulness") {
            const score = safeScore(control.value);
            if (score === undefined) delete pairState.table_efficiency[name];
            else pairState.table_efficiency[name] = score;
          } else if (!control.value) delete pairState.table_efficiency[name];
          else pairState.table_efficiency[name] = control.value;
        } else if (!control.value) {
          delete pairState.preferences[compoundName];
        } else {
          pairState.preferences[compoundName] = control.value;
        }
        syncIssues(pairElement, pairState);
        saveDraft();
        updateProgress();
      });
    }
    for (const label of ["A", "B"]) {
      const severity = by('[data-issue-severity="' + label + '"]', pairElement);
      const description = by('[data-issue-description="' + label + '"]', pairElement);
      const existing = pairState.pronunciation_issues.find((issue) => issue.version === label);
      severity.value = existing ? existing.severity : "";
      description.value = existing ? existing.description : "";
      for (const control of [severity, description]) {
        control.addEventListener(control === description ? "input" : "change", () => {
          syncIssues(pairElement, pairState);
          saveDraft();
          updateProgress();
        });
      }
    }
    const pairComment = by("[data-pair-comment]", pairElement);
    pairComment.value = pairState.comments;
    pairComment.addEventListener("input", () => {
      pairState.comments = safeText(pairComment.value, 2000);
      saveDraft();
    });
    updatePairUi(pair);
  }

  by("[data-export]").addEventListener("click", () => {
    const result = completion();
    if (result.status !== "complete") {
      updateProgress();
      return;
    }
    const exportedAt = now();
    const response = buildResponse(exportedAt);
    const blob = new Blob([JSON.stringify(response, null, 2) + "\n"], { type: "application/json" });
    const address = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = address;
    link.download = "listener-response-" + state.listener_id + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(address);
    state.timestamps.updated_at = exportedAt;
    state.timestamps.exported_at = exportedAt;
    saveDraft();
    setSaveStatus("Final response exported. Return the JSON file to the study coordinator.", false);
  });

  by("[data-new-response]").addEventListener("click", () => {
    if (!window.confirm("Clear this local draft and create a new anonymous response?")) return;
    try { localStorage.removeItem(draftKey); } catch (_) {}
    window.location.reload();
  });

  updateProgress();
  saveDraft();
})();
`;

export function renderPhase2BListeningHtml(
  publicPackage: Phase2BPublicPackage,
): string {
  assertPublicDefinition(publicPackage);
  const definition = JSON.stringify(publicPackage)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
  const pairs = publicPackage.pairs
    .map((pair, index) => pairMarkup(pair, index))
    .join("")
    .replaceAll("__PAIR_COUNT__", String(publicPackage.pairs.length));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src 'self' file: blob:; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>Blind audio listening study</title>
  <style>${LISTENING_PAGE_CSS}</style>
</head>
<body>
  <main>
    <header class="hero">
      <p class="eyebrow">Independent review</p>
      <h1>Blind audio listening study</h1>
      <p>Compare each pair only by what you hear. Use a quiet space and headphones if available. Please do not discuss answers with other listeners until everyone has submitted.</p>
      <p><strong>Keep every player at 1.0× during the main evaluation.</strong> After all six scores for a version are locked, the page enables an optional second listen at 1.25×.</p>
    </header>
    <section class="identity-card" aria-labelledby="identity-heading">
      <h2 id="identity-heading">Anonymous listener code</h2>
      <div class="identity-row">
        <label>
          Your automatically generated code
          <input data-listener-id readonly aria-readonly="true">
        </label>
        <p class="muted">Do not enter your name, email address, or other identifying details in any note.</p>
      </div>
      <p class="status" data-save-status role="status">Preparing local draft…</p>
    </section>
    <div class="progress-wrap">
      <progress data-progress value="0" max="1"></progress>
      <div data-progress-text aria-live="polite">Preparing questions…</div>
    </div>
    ${pairs}
    <section class="finish-card" aria-labelledby="finish-heading">
      <h2 id="finish-heading">Final export</h2>
      <p>Your draft is saved only in this browser. Export creates one JSON file containing the anonymous code and your answers. It does not reveal what either version represents.</p>
      <div class="finish-row">
        <button type="button" class="primary" data-export disabled>Export final response</button>
        <button type="button" class="quiet" data-new-response>Start a fresh response</button>
        <p class="status" data-export-status aria-live="polite">Complete every required answer to enable final export.</p>
      </div>
    </section>
  </main>
  <script type="application/json" id="study-data">${definition}</script>
  <script>${LISTENING_PAGE_SCRIPT}</script>
</body>
</html>
`;
}

export function renderPhase2BListenerInstructions(): string {
  return `BLIND AUDIO LISTENING STUDY

Purpose
-------
This is an independent listening review. Compare versions A and B only by
what you hear. There are no right answers.

Before you begin
----------------
1. Use a quiet room and headphones if available.
2. Complete the review independently. Do not discuss answers with another
   listener until everyone has submitted.
3. The page creates an anonymous code beginning with "L-". Do not enter your
   name, email address, or any identifying information in comments.

For each listening set
----------------------
1. Listen to both versions at 1.0x.
2. Give each version all six 1-to-5 scores:
   naturalness, pause quality, pronunciation, clarity, listening comfort,
   and professional quality.
3. Lock the six 1.0x scores for each version. A lock is required before the
   comparison questions become available.
4. Only after locking may you optionally listen again at 1.25x. The main
   scores remain locked. Use "Reset this version" if you truly need to clear
   them and repeat the 1.0x evaluation.
5. Answer all comparison questions. If you report strange pronunciation,
   add a severity and a short description for every affected version.
6. Add optional notes using only the labels A and B.

Saving and submitting
---------------------
Your draft is saved locally in the current browser. Nothing is uploaded.
When every required answer is complete, select "Export final response".
Return the downloaded JSON file to the study coordinator without renaming
or editing its contents.

If several people use the same device, export the completed response first,
then select "Start a fresh response" before the next person begins.
`;
}

function printableAsciiStrings(data: Buffer): string {
  return (
    data
      .toString("latin1")
      .match(/[\x20-\x7e]{4,}/gu)
      ?.join("\n") ?? ""
  );
}

function exactExpectedPaths(
  publicPackage: Phase2BPublicPackage,
): readonly string[] {
  return [
    PHASE2B_LISTENER_HTML_FILENAME,
    PHASE2B_LISTENER_INSTRUCTIONS_FILENAME,
    ...publicPackage.pairs.flatMap((pair) =>
      pair.samples.map((sample) => `audio/${sample.filename}`),
    ),
  ].sort();
}

/**
 * Fails closed if the listener bundle has extra files, identifying text,
 * internal paths/hashes, browser network calls, or MP3 ID3 tags.
 *
 * The standard LAME3.100 MPEG encoder marker is intentionally tolerated in
 * MP3 frame headers because it is present in the immutable reference audio
 * and does not identify either side of the comparison. ID3v1/ID3v2 metadata
 * remains prohibited.
 */
export function assertPhase2BPublicPackageSafe({
  publicPackage,
  files,
  additionalProhibitedTokens = [],
}: Phase2BPublicScanInput): Phase2BPublicScanResult {
  assertPublicDefinition(publicPackage);
  const expectedPaths = exactExpectedPaths(publicPackage);
  const actualPaths = files.map((file) => file.path).sort();
  if (
    JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths) ||
    new Set(actualPaths).size !== actualPaths.length
  ) {
    throw new Error(
      `Public listener file allowlist mismatch: ${JSON.stringify(actualPaths)}`,
    );
  }
  const normalizedAdditional = additionalProhibitedTokens
    .map((token) => token.trim().toLocaleLowerCase("en-US"))
    .filter((token) => token.length >= 4);
  const sha256ByPath: Record<string, string> = {};
  let scannedBytes = 0;
  let audioCount = 0;

  for (const file of files) {
    const data = Buffer.isBuffer(file.data)
      ? file.data
      : Buffer.from(file.data, "utf8");
    scannedBytes += data.length;
    sha256ByPath[file.path] = createHash("sha256")
      .update(data)
      .digest("hex");
    const isAudio = file.path.startsWith("audio/");
    if (isAudio) {
      audioCount += 1;
      if (
        data.subarray(0, 3).toString("ascii") === "ID3" ||
        (data.length >= 128 &&
          data.subarray(data.length - 128, data.length - 125).toString(
            "ascii",
          ) === "TAG")
      ) {
        throw new Error(`MP3 metadata is prohibited: ${file.path}`);
      }
    }
    const scannedText = (
      isAudio ? printableAsciiStrings(data) : data.toString("utf8")
    ).normalize("NFKC");
    const patterns = isAudio
      ? PUBLIC_AUDIO_PROHIBITED_PATTERNS
      : PUBLIC_TEXT_PROHIBITED_PATTERNS;
    for (const { label, pattern } of patterns) {
      if (pattern.test(scannedText)) {
        throw new Error(
          `Public listener file contains ${label}: ${file.path}`,
        );
      }
    }
    const lowered = scannedText.toLocaleLowerCase("en-US");
    for (const token of normalizedAdditional) {
      if (lowered.includes(token)) {
        throw new Error(
          `Public listener file contains a prohibited private token: ${file.path}`,
        );
      }
    }
  }
  return {
    passed: true,
    fileCount: files.length,
    audioCount,
    scannedBytes,
    sha256ByPath,
    codecMarkerException: "LAME3.100",
  };
}

export const PHASE2B_LISTENER_RESPONSE_SCHEMA_VERSION =
  PHASE2B_RESPONSE_SCHEMA_VERSION;
