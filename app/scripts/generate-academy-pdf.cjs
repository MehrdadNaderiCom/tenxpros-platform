/**
 * Render the Academy Review Package (Markdown) to a print-ready PDF with proper
 * typography, a clickable table of contents, page breaks per module, page
 * numbers, and embedded screenshots. No external services: Markdown is converted
 * to HTML here, screenshots are inlined as data URIs, and Chromium (Playwright)
 * prints the PDF.
 *
 *   node scripts/generate-academy-pdf.cjs <input.md> <output.pdf>
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const mdPath = process.argv[2] || path.join(__dirname, "../../docs/academy/partner-academy-review-package.md");
const outPath = process.argv[3] || path.join(__dirname, "../../docs/academy/partner-academy-review-package.pdf");
const screensDir = path.join(__dirname, "../public/academy/screens");

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Inline markdown on already-escaped text: code, bold, links.
function inline(s) {
  s = s.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, (_m, c) => `<strong>${c}</strong>`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => `<a href="${u}">${t}</a>`);
  return s;
}
function isRawHtml(line) {
  return /^<(a id=|img |\/?(figure|div|span|blockquote))/.test(line.trim());
}
function cells(row) {
  return row.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((c) => inline(esc(c.trim())));
}

function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  const flushList = [];
  while (i < lines.length) {
    let line = lines[i];
    const t = line.trim();

    if (t === "") { i++; continue; }

    // Raw HTML block (anchors, images) pass through verbatim.
    if (isRawHtml(t)) { out.push(t); i++; continue; }

    // Headings
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      let cls = "";
      if (level === 1) cls = " class=\"pb\"";
      else if (level === 2 && /^Module\s/.test(text)) cls = " class=\"pb module\"";
      out.push(`<h${level}${cls}>${inline(esc(text))}</h${level}>`);
      i++; continue;
    }

    // Horizontal rule
    if (/^---+$/.test(t)) { out.push("<hr />"); i++; continue; }

    // Table (a header row, a separator row of dashes, then body rows)
    if (t.startsWith("|") && i + 1 < lines.length && /^\|[\s:-]+\|/.test(lines[i + 1].trim())) {
      const header = cells(t);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(cells(lines[i].trim())); i++; }
      out.push(
        `<table><thead><tr>${header.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>` +
          rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") +
          `</tbody></table>`,
      );
      continue;
    }

    // Blockquote (consecutive > lines)
    if (t.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) { buf.push(lines[i].trim().replace(/^>\s?/, "")); i++; }
      out.push(`<blockquote>${buf.map((b) => (b ? `<p>${inline(esc(b))}</p>` : "")).join("")}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(t)) {
      const buf = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { buf.push(lines[i].trim().replace(/^[-*]\s+/, "")); i++; }
      out.push(`<ul>${buf.map((b) => `<li>${inline(esc(b))}</li>`).join("")}</ul>`);
      continue;
    }
    // Ordered list
    if (/^\d+\.\s+/.test(t)) {
      const buf = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) { buf.push(lines[i].trim().replace(/^\d+\.\s+/, "")); i++; }
      out.push(`<ol>${buf.map((b) => `<li>${inline(esc(b))}</li>`).join("")}</ol>`);
      continue;
    }

    // Paragraph (gather consecutive plain lines)
    const buf = [line];
    i++;
    while (i < lines.length) {
      const nx = lines[i].trim();
      if (nx === "" || isRawHtml(nx) || /^(#{1,6}\s|>|[-*]\s|\d+\.\s|\|)/.test(nx) || /^---+$/.test(nx)) break;
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${inline(esc(buf.join(" ").trim()))}</p>`);
  }
  return out.join("\n");
}

// Inline the screenshots as data URIs so the PDF is self-contained.
function embedImages(html) {
  const cache = {};
  return html.replace(/src="\/academy\/screens\/([a-z0-9-]+\.png)"/g, (m, file) => {
    if (!cache[file]) {
      const p = path.join(screensDir, file);
      cache[file] = fs.existsSync(p) ? `data:image/png;base64,${fs.readFileSync(p).toString("base64")}` : `/academy/screens/${file}`;
    }
    return `src="${cache[file]}"`;
  });
}

const CSS = `
  :root { --navy:#1f3a5f; --gold:#8a6d2b; --ink:#1f2937; --muted:#6b7280; --line:#d7dbe0; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.55; color: var(--ink); margin: 0; }
  h1, h2, h3, h4, h5, h6 { font-family: 'Helvetica Neue', Arial, sans-serif; color: var(--navy); line-height: 1.25; margin: 1.1em 0 0.4em; }
  h1 { font-size: 20pt; border-bottom: 2px solid var(--gold); padding-bottom: 6px; }
  h2 { font-size: 15pt; border-bottom: 1px solid var(--line); padding-bottom: 4px; }
  h3 { font-size: 12.5pt; }
  h4, h5 { font-size: 11pt; }
  h6 { font-size: 10.5pt; color: #33517a; }
  h1.pb, h2.pb { break-before: page; }
  h2.module { color: var(--navy); }
  p { margin: 0.45em 0; }
  a { color: var(--navy); text-decoration: none; }
  a[href^="#"] { color: var(--navy); }
  a[href^="http"] { color: #1d4ed8; text-decoration: underline; }
  code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 9pt; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }
  strong { color: var(--navy); }
  ul, ol { margin: 0.45em 0; padding-left: 1.4em; }
  li { margin: 0.15em 0; }
  blockquote { margin: 0.6em 0; padding: 0.4em 0.9em; border-left: 3px solid var(--gold); background: #faf8f2; break-inside: avoid; }
  blockquote p { margin: 0.2em 0; }
  hr { border: none; border-top: 1px solid var(--line); margin: 1.1em 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.7em 0; font-size: 9pt; break-inside: avoid; }
  th, td { border: 1px solid var(--line); padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #eef1f5; font-family: 'Helvetica Neue', Arial, sans-serif; color: var(--navy); }
  img { max-width: 100%; height: auto; border: 1px solid var(--line); border-radius: 6px; margin: 0.6em 0; break-inside: avoid; }
  .cover { break-after: page; padding-top: 32%; text-align: center; }
  .cover .kicker { font-family: 'Helvetica Neue', Arial, sans-serif; letter-spacing: 0.28em; text-transform: uppercase; color: var(--gold); font-size: 11pt; }
  .cover h1 { font-size: 30pt; border: none; margin-top: 14px; }
  .cover .sub { color: var(--muted); font-size: 12pt; margin-top: 10px; }
  .cover .meta { margin-top: 40px; font-size: 10pt; color: var(--muted); }
`;

async function main() {
  const md = fs.readFileSync(mdPath, "utf-8");
  // Strip lazy loading: Chromium does not load lazy images below the fold while
  // printing to PDF, so eager-load them (they are inlined data URIs anyway).
  const body = embedImages(mdToHtml(md)).replace(/\s+loading="lazy"/g, "");
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const cover = `<div class="cover">
    <div class="kicker">TenXPros Partner Academy</div>
    <h1>Review Package</h1>
    <div class="sub">The complete production Academy, for offline review and annotation.</div>
    <div class="meta">Generated ${dateStr} &middot; 17 modules (14 with exams, 3 informational) &middot; 252 questions</div>
  </div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${cover}${body}</body></html>`;

  const tmp = path.join(require("os").tmpdir(), `academy-review-${Date.now()}.html`);
  fs.writeFileSync(tmp, html);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + tmp, { waitUntil: "load" });
  await page.pdf({
    path: outPath,
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "18mm", left: "16mm", right: "16mm" },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:7pt;width:100%;padding:0 16mm;text-align:right;color:#9ca3af;font-family:Arial;">TenXPros Partner Academy Review Package</div>`,
    footerTemplate: `<div style="font-size:7pt;width:100%;padding:0 16mm;text-align:center;color:#9ca3af;font-family:Arial;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  });
  await browser.close();
  fs.unlinkSync(tmp);
  const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
  process.stderr.write(`PDF written: ${outPath} (${kb} KB)\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
