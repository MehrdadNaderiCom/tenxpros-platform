import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3010";
const OUT = process.env.SHOT_OUT ?? "../docs/design/apply-rebuild-round-1";
const NAV_OFFSET = 80;

const HEADINGS = [
  "Apply with one real professional problem.",
  "Strong applications are specific.",
  "What happens after you apply.",
  "Start your Founding Charter application.",
  "Before you submit.",
  "See the standard before you apply.",
  "Ready to apply?",
];

// Application form field names that must be present (preserved from the
// existing ApplicationForm / applicationSchema).
const FORM_FIELDS = [
  "fullName", "email", "country", "professionalRole", "domain", "linkedinUrl",
  "aiExperience", "dataSensitivity", "timeAvailability", "whyTenXPros",
  "realProblemBrief", "preferredLanguage", "consentConfidentiality", "consentTerms",
];

async function triggerLazyLoad(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    const max = document.documentElement.scrollHeight;
    for (let y = 0; y <= max; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
}

async function settle(page) {
  await triggerLazyLoad(page);
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
    const imgs = Array.from(document.images);
    const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
    await Promise.all(imgs.map((img) => (img.complete && img.naturalWidth > 0) ? Promise.resolve()
      : withTimeout(new Promise((res) => { img.addEventListener("load", res, { once: true }); img.addEventListener("error", res, { once: true }); }), 4000)));
  });
  await page.waitForTimeout(300);
}

async function measure(page, headings) {
  return page.evaluate(({ HEADINGS, FORM_FIELDS }) => {
    const doc = document.documentElement;
    const scrollHeight = doc.scrollHeight;
    const overflowX = doc.scrollWidth - doc.clientWidth;
    const allHeads = Array.from(document.querySelectorAll("h1, h2"));
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const sections = HEADINGS.map((text) => {
      const el = allHeads.find((h) => norm(h.textContent) === norm(text));
      if (!el) return { text, found: false };
      const rect = el.getBoundingClientRect();
      const absTop = rect.top + window.scrollY;
      const st = getComputedStyle(el);
      const visible = rect.width > 0 && rect.height > 0 && st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) !== 0;
      return { text, found: true, absTop: Math.round(absTop), visible, withinDoc: absTop >= 0 && absTop <= scrollHeight };
    });
    const footer = document.querySelector("footer");
    const f = footer ? (() => { const r = footer.getBoundingClientRect(); return { found: true, absTop: Math.round(r.top + window.scrollY), absBottom: Math.round(r.bottom + window.scrollY) }; })() : { found: false };
    const tops = sections.filter((s) => s.found).map((s) => s.absTop);
    if (f.found) tops.push(f.absTop);
    tops.sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 1; i < tops.length; i++) maxGap = Math.max(maxGap, tops[i] - tops[i - 1]);
    // form integrity
    const formFields = FORM_FIELDS.map((name) => ({ name, present: !!document.querySelector(`[name="${name}"]`) }));
    const hasForm = !!document.querySelector("form");
    const hasSubmit = !!Array.from(document.querySelectorAll("button[type=submit]")).find((b) => /submit application/i.test(b.textContent || ""));
    const anchorTarget = !!document.querySelector("#application-form");
    return { scrollHeight, overflowX, footer: f, trailingBlank: f.found ? scrollHeight - f.absBottom : null, maxGap, sections, formFields, hasForm, hasSubmit, anchorTarget };
  }, { HEADINGS: headings, FORM_FIELDS });
}

async function scrollToText(page, text, offset = NAV_OFFSET) {
  await page.evaluate(({ text, offset }) => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const el = Array.from(document.querySelectorAll("h1, h2, h3, span, p, summary, dt")).find((e) => norm(e.textContent) === norm(text));
    if (el) window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset));
  }, { text, offset });
  await page.waitForTimeout(250);
}

async function run(page, label) {
  await page.goto(`${BASE}/apply`, { waitUntil: "networkidle" });
  await settle(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/apply-${label}-top.png`, fullPage: false });

  if (label === "desktop") {
    await scrollToText(page, "What happens after you apply.");
    await page.screenshot({ path: `${OUT}/apply-${label}-flow.png`, fullPage: false });
  }

  await scrollToText(page, "Start your Founding Charter application.");
  await page.screenshot({ path: `${OUT}/apply-${label}-form.png`, fullPage: false });

  await scrollToText(page, "See the standard before you apply.");
  await page.screenshot({ path: `${OUT}/apply-${label}-proof.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/apply-${label}-bottom.png`, fullPage: false });

  // anchor check: click "Start application" and confirm it jumps to the form
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  let anchorWorks = null;
  try {
    await page.getByRole("link", { name: "Start application" }).first().click();
    await page.waitForTimeout(400);
    anchorWorks = await page.evaluate(() => {
      const el = document.querySelector("#application-form");
      if (!el) return false;
      const top = el.getBoundingClientRect().top;
      return Math.abs(top) < 200; // form section is at/near the top of the viewport
    });
  } catch { anchorWorks = "error"; }

  let extra = {};
  if (label === "mobile") {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/apply-${label}-menu-open.png`, fullPage: false });
    extra.menuCenter = await page.evaluate(() => { const el = document.elementFromPoint(195, 400); return el ? `${el.tagName}.${(el.className || "").toString().slice(0, 36)}` : "none"; });
    await page.getByRole("button", { name: "Close menu" }).click();
    await page.waitForTimeout(200);
  }
  return { ...extra, anchorWorks, measurements: await measure(page, HEADINGS) };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const desktop = await run(await dctx.newPage(), "desktop");
  await dctx.close();
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  const mobile = await run(await mctx.newPage(), "mobile");
  await mctx.close();
  await browser.close();

  await writeFile(`${OUT}/qa-measurements.json`, JSON.stringify({ desktop, mobile }, null, 2));
  for (const [label, r] of Object.entries({ desktop, mobile })) {
    const m = r.measurements;
    console.log(`\n===== ${label.toUpperCase()} =====`);
    console.log(`scrollHeight ${m.scrollHeight}px | overflowX ${m.overflowX}px | trailingBlank ${m.trailingBlank}px | maxGap ${m.maxGap}px`);
    console.log(`footer ${m.footer.found ? `${m.footer.absTop}→${m.footer.absBottom}` : "MISSING"}`);
    console.log(`form present: ${m.hasForm} | submit btn: ${m.hasSubmit} | #application-form anchor target: ${m.anchorTarget} | "Start application" jumps to form: ${r.anchorWorks}`);
    const missing = m.formFields.filter((f) => !f.present).map((f) => f.name);
    console.log(`form fields present: ${m.formFields.filter((f) => f.present).length}/${m.formFields.length}${missing.length ? ` — MISSING: ${missing.join(", ")}` : " (all)"}`);
    if (r.menuCenter) console.log(`menu center element: ${r.menuCenter}`);
    for (const s of m.sections) console.log(`  ${s.found ? "✓" : "✗"} ${s.found ? `y=${s.absTop} vis=${s.visible} inDoc=${s.withinDoc}` : "MISSING"}  ${s.text.slice(0, 48)}`);
  }
  console.log(`\nwritten to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
