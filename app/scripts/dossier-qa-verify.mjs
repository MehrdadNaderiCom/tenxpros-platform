import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3010";
const OUT = process.env.SHOT_OUT ?? "../docs/design/dossier-polish-round-1-verified";
const NAV_OFFSET = 80; // sticky nav height, so headings clear the nav when framed

// Expected major section headings (exact text from the live page), in document order.
const HEADINGS = [
  "The Living AI Solution Dossier is the work behind the credential.",
  "A dossier proves that your AI work can be understood, reviewed, and defended.",
  "Twelve sections, organized by the TenX Method.",
  "Eight assets become one professional dossier.",
  "Review is part of the product.",
  "Preview the artifact before you apply.",
  "A reviewed artifact is different from a completion certificate.",
  "Bring one real problem. Leave with reviewed evidence.",
];

// Trigger lazy-loaded images by stepping through the whole document, then
// return to the top. Without this, `loading="lazy"` images below the fold
// never fire `load` while parked at scroll 0.
async function triggerLazyLoad(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    const max = document.documentElement.scrollHeight;
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
}

// Wait for fonts + images to finish so layout heights are final. Each image
// wait is capped so a slow/never-firing image can't hang the run.
async function settle(page) {
  await triggerLazyLoad(page);
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
    }
    const imgs = Array.from(document.images);
    const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
    await Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : withTimeout(
              new Promise((res) => {
                img.addEventListener("load", res, { once: true });
                img.addEventListener("error", res, { once: true });
              }),
              4000,
            ),
      ),
    );
  });
  await page.waitForTimeout(300);
}

// Collect all DOM facts in one evaluate call.
async function measure(page, headings) {
  return page.evaluate((HEADINGS) => {
    const doc = document.documentElement;
    const scrollHeight = doc.scrollHeight;
    const clientHeight = doc.clientHeight;
    const overflowX = doc.scrollWidth - doc.clientWidth;

    const allHeads = Array.from(document.querySelectorAll("h1, h2"));
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

    const sections = HEADINGS.map((text) => {
      const el = allHeads.find((h) => norm(h.textContent) === norm(text));
      if (!el) return { text, found: false };
      const rect = el.getBoundingClientRect();
      const absTop = rect.top + window.scrollY;
      const style = getComputedStyle(el);
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0;
      return {
        text,
        found: true,
        absTop: Math.round(absTop),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        visible,
        withinDoc: absTop >= 0 && absTop <= scrollHeight,
      };
    });

    // Footer presence
    const footer = document.querySelector("footer");
    let footerInfo = { found: false };
    if (footer) {
      const r = footer.getBoundingClientRect();
      footerInfo = {
        found: true,
        absTop: Math.round(r.top + window.scrollY),
        absBottom: Math.round(r.bottom + window.scrollY),
        height: Math.round(r.height),
      };
    }

    // Blank-gap analysis: ordered landmark tops (found headings) + footer bottom.
    const tops = sections.filter((s) => s.found).map((s) => s.absTop);
    if (footerInfo.found) tops.push(footerInfo.absTop);
    tops.sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < tops.length; i++) gaps.push(tops[i] - tops[i - 1]);
    const maxGap = gaps.length ? Math.max(...gaps) : 0;
    const trailingBlank = footerInfo.found ? scrollHeight - footerInfo.absBottom : null;

    // Find suspiciously tall elements (height > 3x viewport) — a common cause of
    // huge blank bands in fullPage screenshots.
    const tall = [];
    const walker = document.querySelectorAll("body *");
    walker.forEach((el) => {
      const h = el.getBoundingClientRect().height;
      if (h > clientHeight * 3) {
        tall.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && el.className.toString().slice(0, 60)) || "",
          height: Math.round(h),
        });
      }
    });
    // De-dup ancestors (main/section legitimately tall); keep the leaf-ish offenders.
    const tallSorted = tall.sort((a, b) => b.height - a.height).slice(0, 8);

    // Largest single inter-heading gap, with the pair it sits between.
    let maxGapPair = null;
    for (let i = 1; i < tops.length; i++) {
      if (tops[i] - tops[i - 1] === maxGap) {
        maxGapPair = { from: tops[i - 1], to: tops[i], gap: maxGap };
        break;
      }
    }

    return {
      scrollHeight,
      clientHeight,
      scrollWidth: doc.scrollWidth,
      overflowX,
      sections,
      footer: footerInfo,
      maxGap,
      maxGapPair,
      trailingBlank,
      tallElements: tallSorted,
      bodyScrollHeight: document.body.scrollHeight,
    };
  }, headings);
}

async function shotAt(page, heading, path) {
  // Scroll the heading to just below the sticky nav, then capture the viewport.
  await page.evaluate(
    ({ text, offset }) => {
      const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
      const el = Array.from(document.querySelectorAll("h1, h2")).find(
        (h) => norm(h.textContent) === norm(text),
      );
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo(0, Math.max(0, y));
      }
    },
    { text: heading, offset: NAV_OFFSET },
  );
  await page.waitForTimeout(250);
  await page.screenshot({ path, fullPage: false });
}

async function run(page, label, dims) {
  const r = {};
  await page.goto(`${BASE}/dossier`, { waitUntil: "networkidle" });
  await settle(page);

  // Top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/dossier-${label}-top.png`, fullPage: false });

  // Segmented section captures
  await shotAt(page, "Twelve sections, organized by the TenX Method.", `${OUT}/dossier-${label}-anatomy.png`);
  await shotAt(page, "Review is part of the product.", `${OUT}/dossier-${label}-review-standard.png`);
  await shotAt(page, "Preview the artifact before you apply.", `${OUT}/dossier-${label}-sample-section.png`);

  // Bottom (final CTA + footer)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/dossier-${label}-bottom.png`, fullPage: false });

  // Full page (may be unreliable on tall dark pages — captured for the record)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/dossier-${label}-full.png`, fullPage: true });

  r.measurements = await measure(page, HEADINGS);
  r.viewport = dims;
  return r;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const desktop = await run(await desktopCtx.newPage(), "desktop", { width: 1440, height: 900 });
  await desktopCtx.close();

  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobile = await run(await mobileCtx.newPage(), "mobile", { width: 390, height: 844 });
  await mobileCtx.close();

  await browser.close();

  const result = { desktop, mobile };
  await writeFile(`${OUT}/qa-measurements.json`, JSON.stringify(result, null, 2));

  // Console summary
  for (const [label, r] of Object.entries(result)) {
    const m = r.measurements;
    console.log(`\n===== ${label.toUpperCase()} (${r.viewport.width}x${r.viewport.height}) =====`);
    console.log(`scrollHeight: ${m.scrollHeight}px  |  body.scrollHeight: ${m.bodyScrollHeight}px`);
    console.log(`horizontal overflow: ${m.overflowX}px  (scrollWidth ${m.scrollWidth})`);
    console.log(`footer: ${m.footer.found ? `top ${m.footer.absTop} → bottom ${m.footer.absBottom} (h ${m.footer.height})` : "NOT FOUND"}`);
    console.log(`trailing blank after footer: ${m.trailingBlank}px`);
    console.log(`max inter-heading gap: ${m.maxGap}px  ${m.maxGapPair ? `(between y=${m.maxGapPair.from} and y=${m.maxGapPair.to})` : ""}`);
    console.log("sections:");
    for (const s of m.sections) {
      console.log(
        `  ${s.found ? "✓" : "✗"} ${s.found ? `[y=${String(s.absTop).padStart(6)} vis=${s.visible} inDoc=${s.withinDoc}]` : "[MISSING]"}  ${s.text.slice(0, 60)}`,
      );
    }
    console.log("tall elements (>3x viewport):");
    if (!m.tallElements.length) console.log("  (none)");
    for (const t of m.tallElements) console.log(`  ${t.height}px  <${t.tag} class="${t.cls}">`);
  }
  console.log(`\nmeasurements written to ${OUT}/qa-measurements.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
