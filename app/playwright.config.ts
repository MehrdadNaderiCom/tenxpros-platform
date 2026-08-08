import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const preferredChromium = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  "/snap/bin/chromium",
].find((candidate): candidate is string => Boolean(candidate && fs.existsSync(candidate)));
const includeWebKit =
  process.env.PLAYWRIGHT_WEBKIT === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: ".playwright-report",
      },
    ],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3003",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: preferredChromium
          ? { executablePath: preferredChromium }
          : undefined,
      },
    },
    ...(includeWebKit
      ? [
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],
});
