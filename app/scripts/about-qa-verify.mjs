import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3010";
const OUT = process.env.SHOT_OUT ?? "../docs/design/about-rebuild-round-1";
const NAV_OFFSET = 80;

const HEADINGS = [
  "AI adoption has become professional judgment work.",
  "Most AI training stops too early.",
  "A method for turning expertise into reviewed AI adoption work.",
  "The standard is the product.",
  "Who set the standard.",
  "What we will not compromise.",
  "What TenXPros is not.",
  "You can inspect the standard before you apply.",
  "Bring your expertise. We bring the AI method.",
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
  return page.evaluate((HEADINGS) => {
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
    // claims guard: the unsourced exact number must NOT be present
    const bodyText = norm(document.body.innerText);
    const hasHoursClaim = /19[,\s]?000/.test(bodyText);
    return { scrollHeight, overflowX, footer: f, trailingBlank: f.found ? scrollHeight - f.absBottom : null, maxGap, sections, hasHoursClaim };
  }, headings);
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
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  await settle(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/about-${label}-top.png`, fullPage: false });

  if (label === "desktop") {
    await scrollToText(page, "Most AI training stops too early.");
    await page.screenshot({ path: `${OUT}/about-${label}-problem.png`, fullPage: false });
    await scrollToText(page, "The standard is the product.");
    await page.screenshot({ path: `${OUT}/about-${label}-standard.png`, fullPage: false });
  }

  await scrollToText(page, "Who set the standard.");
  await page.screenshot({ path: `${OUT}/about-${label}-founder.png`, fullPage: false });

  if (label === "desktop") {
    await scrollToText(page, "What we will not compromise.");
    await page.screenshot({ path: `${OUT}/about-${label}-principles.png`, fullPage: false });
  }

  await scrollToText(page, "You can inspect the standard before you apply.");
  await page.screenshot({ path: `${OUT}/about-${label}-proof.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/about-${label}-bottom.png`, fullPage: false });

  let extra = {};
  if (label === "mobile") {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/about-${label}-menu-open.png`, fullPage: false });
    extra.menuCenter = await page.evaluate(() => { const el = document.elementFromPoint(195, 400); return el ? `${el.tagName}.${(el.className || "").toString().slice(0, 36)}` : "none"; });
    await page.getByRole("button", { name: "Close menu" }).click();
    await page.waitForTimeout(200);
  }
  return { ...extra, measurements: await measure(page, HEADINGS) };
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
    console.log(`footer ${m.footer.found ? `${m.footer.absTop}→${m.footer.absBottom}` : "MISSING"} | "19,000" hours claim present: ${m.hasHoursClaim}`);
    if (r.menuCenter) console.log(`menu center element: ${r.menuCenter}`);
    for (const s of m.sections) console.log(`  ${s.found ? "✓" : "✗"} ${s.found ? `y=${s.absTop} vis=${s.visible} inDoc=${s.withinDoc}` : "MISSING"}  ${s.text.slice(0, 48)}`);
  }
  console.log(`\nwritten to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
