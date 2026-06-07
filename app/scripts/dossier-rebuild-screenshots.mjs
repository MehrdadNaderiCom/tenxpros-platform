import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3010";
const OUT = process.env.SHOT_OUT ?? "../docs/design/dossier-rebuild-sprint-1";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  // Desktop 1440px
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const dPage = await desktop.newPage();
  await dPage.goto(`${BASE}/dossier`, { waitUntil: "networkidle" });
  await dPage.waitForTimeout(400);
  await dPage.screenshot({ path: `${OUT}/dossier-desktop.png`, fullPage: true });
  await dPage.screenshot({ path: `${OUT}/dossier-hero-desktop.png`, fullPage: false });
  const sample = dPage.getByRole("heading", { name: "Preview the artifact before you apply." });
  await sample.scrollIntoViewIfNeeded();
  await dPage.waitForTimeout(300);
  await dPage.screenshot({ path: `${OUT}/dossier-sample-section.png`, fullPage: false });
  const overflowD = await dPage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await desktop.close();

  // Mobile 390px
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mPage = await mobile.newPage();
  await mPage.goto(`${BASE}/dossier`, { waitUntil: "networkidle" });
  await mPage.waitForTimeout(400);
  await mPage.screenshot({ path: `${OUT}/dossier-mobile.png`, fullPage: true });
  const overflowM = await mPage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await mobile.close();

  await browser.close();
  console.log("screenshots written to", OUT);
  console.log("horizontal overflow — desktop:", overflowD, "mobile:", overflowM);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
