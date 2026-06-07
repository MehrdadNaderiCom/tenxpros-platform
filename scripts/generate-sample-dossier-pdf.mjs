#!/usr/bin/env node
/**
 * generate-sample-dossier-pdf.mjs
 * -----------------------------------------------------------------------------
 * Generates the print PDF and the cover PNG for the TenXPros sample dossier
 * from the standalone HTML, using headless Chromium (no heavy dependencies).
 *
 *   Input : app/public/samples/tenxpros-sample-dossier-excerpt.html
 *   Output: app/public/samples/tenxpros-sample-dossier-excerpt.pdf
 *           app/public/samples/tenxpros-sample-dossier-cover.png
 *
 * Why a staging directory:
 *   The Chromium available here is the snap build, which is AppArmor-confined.
 *   It cannot read/write files under /opt, and the snap "home" interface blocks
 *   hidden (dot) directories. So we stage the HTML in a NON-hidden directory
 *   under $HOME, render there, then copy the artifacts back into the repo.
 *
 * Usage:
 *   node scripts/generate-sample-dossier-pdf.mjs
 *   CHROME=/path/to/chrome node scripts/generate-sample-dossier-pdf.mjs   (override binary)
 * -----------------------------------------------------------------------------
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const samplesDir = join(repoRoot, 'app', 'public', 'samples');

const htmlPath = join(samplesDir, 'tenxpros-sample-dossier-excerpt.html');
const pdfOut   = join(samplesDir, 'tenxpros-sample-dossier-excerpt.pdf');
const pngOut   = join(samplesDir, 'tenxpros-sample-dossier-cover.png');

if (!existsSync(htmlPath)) {
  console.error(`[error] Source HTML not found: ${htmlPath}`);
  process.exit(1);
}

/* ---- Resolve a Chromium/Chrome binary ----------------------------------- */
function resolveChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME;
  const candidates = [
    'chromium-browser', 'chromium', 'google-chrome', 'google-chrome-stable',
    '/usr/bin/chromium-browser', '/usr/bin/chromium', '/snap/bin/chromium',
  ];
  for (const c of candidates) {
    try { execFileSync(c, ['--version'], { stdio: 'ignore' }); return c; }
    catch { /* keep trying */ }
  }
  throw new Error('No Chromium/Chrome binary found. Set CHROME=/path/to/chrome.');
}

const CHROME = resolveChrome();

/* ---- Stage in a non-hidden $HOME dir the snap sandbox can reach ---------- */
let stageDir;
try {
  stageDir = mkdtempSync(join(homedir(), 'tenxpros-build-'));
} catch {
  stageDir = mkdtempSync(join(tmpdir(), 'tenxpros-build-'));
}

const stageHtml      = join(stageDir, 'dossier.html');
const stageCoverHtml = join(stageDir, 'cover.html');
const stagePdf       = join(stageDir, 'dossier.pdf');
const stagePng       = join(stageDir, 'cover.png');

// Main document, verbatim, for the PDF.
copyFileSync(htmlPath, stageHtml);

// Cover capture variant: same document, but <body class="shot"> activates the
// cover-only, full-viewport screen styles defined in the HTML.
const html = readFileSync(htmlPath, 'utf8');

// Safety guard: the public HTML must never contain internal production notes.
const FORBIDDEN = [
  'END OF PUBLIC ARTIFACT',
  'INTERNAL PRODUCTION NOTES',
  'Website excerpt copy',
  'Final quality checklist',
  'Home-page teaser',
];
const leaked = FORBIDDEN.filter((s) => html.includes(s));
if (leaked.length) {
  console.error(`[error] Public HTML contains internal-notes markers: ${leaked.join(', ')}`);
  console.error('        Refusing to build. Remove internal production notes from the public artifact.');
  process.exit(1);
}
const shotHtml = html.replace(/<body(\s|>)/, '<body class="shot"$1');
if (!/<body class="shot"/.test(shotHtml)) {
  console.error('[error] Could not inject cover capture class into <body>.');
  process.exit(1);
}
writeFileSync(stageCoverHtml, shotHtml);

const baseFlags = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--no-first-run',
  '--disable-extensions',
];

function run(label, args) {
  process.stdout.write(`[run] ${label}\n`);
  execFileSync(CHROME, args, { stdio: ['ignore', 'ignore', 'inherit'] });
}

/* ---- 1) PDF (print CSS, no browser header/footer chrome) ---------------- */
run('print-to-pdf', [
  ...baseFlags,
  '--no-pdf-header-footer',
  '--print-to-pdf-no-header',
  `--print-to-pdf=${stagePdf}`,
  `file://${stageHtml}`,
]);

/* ---- 2) Cover PNG (A4 portrait ratio, 2x for crispness) ----------------- */
run('screenshot-cover', [
  ...baseFlags,
  '--force-device-scale-factor=2',
  '--window-size=840,1188',          // ~A4 portrait ratio; 2x -> 1680x2376
  `--screenshot=${stagePng}`,
  `file://${stageCoverHtml}`,
]);

/* ---- Copy artifacts back into the repo ---------------------------------- */
function deliver(from, to, kind) {
  if (!existsSync(from) || statSync(from).size === 0) {
    throw new Error(`${kind} was not produced (or is empty): ${from}`);
  }
  copyFileSync(from, to);
  const kb = (statSync(to).size / 1024).toFixed(1);
  console.log(`[ok] ${kind}: ${to} (${kb} KB)`);
}

deliver(stagePdf, pdfOut, 'PDF');
deliver(stagePng, pngOut, 'Cover PNG');

console.log(`[done] Staging dir: ${stageDir} (safe to delete)`);
