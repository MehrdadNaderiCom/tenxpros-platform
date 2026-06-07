import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3010";
const OUT = process.env.SHOT_OUT ?? "../docs/design/home-rebuild-sprint-1";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  // Desktop 1440px — full page
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const dPage = await desktop.newPage();
  await dPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await dPage.waitForTimeout(400);
  await dPage.screenshot({ path: `${OUT}/home-desktop.png`, fullPage: true });
  // Hero only (above the fold)
  await dPage.screenshot({ path: `${OUT}/home-hero-desktop.png`, fullPage: false });
  // Sample dossier proof section
  const sample = dPage.getByRole("heading", { name: "See what reviewed work looks like." });
  await sample.scrollIntoViewIfNeeded();
  await dPage.waitForTimeout(300);
  await dPage.screenshot({ path: `${OUT}/home-sample-section.png`, fullPage: false });
  await desktop.close();

  // Mobile 390px — full page
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mPage = await mobile.newPage();
  await mPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await mPage.waitForTimeout(400);
  await mPage.screenshot({ path: `${OUT}/home-mobile.png`, fullPage: true });
  await mobile.close();

  await browser.close();
  console.log("screenshots written to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
