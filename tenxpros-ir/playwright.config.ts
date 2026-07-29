import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

function dedicatedTestDatabaseUrl() {
  const value = process.env.E2E_DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      "E2E_DATABASE_URL is required and must point to the dedicated local tenxpros_ir_test database.",
    );
  }

  const parsed = new URL(value);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.port !== "55432" ||
    parsed.username !== "tenxpros_ir_test" ||
    databaseName !== "tenxpros_ir_test"
  ) {
    throw new Error(
      "Refusing to run E2E tests: E2E_DATABASE_URL must be the dedicated PostgreSQL database tenxpros_ir_test at 127.0.0.1:55432.",
    );
  }

  return value;
}

const databaseUrl = dedicatedTestDatabaseUrl();
const configuredBaseURL =
  process.env.E2E_BASE_URL ?? "http://127.0.0.1:3190";
const parsedBaseURL = new URL(configuredBaseURL);
if (
  parsedBaseURL.protocol !== "http:" ||
  !["127.0.0.1", "localhost"].includes(parsedBaseURL.hostname) ||
  parsedBaseURL.pathname !== "/" ||
  parsedBaseURL.search ||
  parsedBaseURL.hash
) {
  throw new Error("E2E_BASE_URL must be a plain local HTTP origin.");
}
const serverPort = parsedBaseURL.port || "80";
const baseURL = `${parsedBaseURL.origin}/`;
const uploadDirectory =
  process.env.E2E_UPLOAD_DIR ?? path.resolve("storage/e2e-receipts");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "fa-IR",
    timezoneId: "Asia/Tehran",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev -H ${parsedBaseURL.hostname} -p ${serverPort}`,
    url: new URL("/api/health", baseURL).toString(),
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    timeout: 180_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "development",
      APP_URL: baseURL,
      EMAIL_MODE: "log",
      ZOOM_MODE: "mock",
      UPLOAD_DIR: uploadDirectory,
      RATE_LIMIT_SALT:
        "tenxpros-ir-playwright-rate-limit-salt-2026-local-test-only",
    },
  },
});
