#!/usr/bin/env tsx

import {
  chmod,
  constants,
  mkdir,
  open,
  readFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

function option(
  args: readonly string[],
  name: string,
) {
  const index = args.indexOf(name);
  const value =
    index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalOption(
  args: readonly string[],
  name: string,
) {
  const index = args.indexOf(name);
  const value =
    index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--")
    ? value
    : undefined;
}

async function writeExclusive(
  path: string,
  value: string,
) {
  await mkdir(dirname(path), {
    recursive: true,
    mode: 0o700,
  });
  await chmod(dirname(path), 0o700);
  const handle = await open(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(path, 0o600);
}

function cookies(value: string) {
  return value
    .split(/\r?\n/gu)
    .filter(
      (line) =>
        line.trim() &&
        !line.startsWith("#"),
    )
    .map((line) => {
      const fields = line.split("\t");
      const name = fields.at(-2);
      const cookieValue = fields.at(-1);
      if (!name || !cookieValue) {
        throw new Error(
          "Smoke cookie file is malformed",
        );
      }
      return {
        name,
        value: cookieValue,
        domain: "172.17.0.1",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      };
    });
}

async function main() {
  process.umask(0o077);
  const args = process.argv.slice(2);
  const baseUrl = option(
    args,
    "--base-url",
  ).replace(/\/$/u, "");
  const outputPath = resolve(
    option(args, "--output"),
  );
  const expectedVoiceId =
    optionalOption(
      args,
      "--expected-voice-id",
    ) ?? "bryce";
  const expectedVoiceLabel =
    optionalOption(
      args,
      "--expected-voice-label",
    ) ?? "Bryce (US male)";
  const browser = await chromium.launch({
    headless: true,
  });
  try {
    const context =
      await browser.newContext();
    await context.addCookies(
      cookies(
        await readFile(
          option(args, "--cookie-file"),
          "utf8",
        ),
      ),
    );
    await context.addInitScript(() => {
      if (
        window.sessionStorage.getItem(
          "txp-smoke-seeded",
        )
      ) {
        return;
      }
      window.localStorage.setItem(
        "txp-narration-voice",
        "linda",
      );
      window.localStorage.setItem(
        "txp-narration-rate",
        "1.5",
      );
      window.localStorage.removeItem(
        "txp-narration-active-release-preferences-v1",
      );
      window.sessionStorage.setItem(
        "txp-smoke-seeded",
        "1",
      );
    });
    const page = await context.newPage();
    await page.goto(
      `${baseUrl}/partner/academy/mission`,
      {
        waitUntil: "networkidle",
      },
    );
    await page
      .getByText(expectedVoiceLabel, {
        exact: true,
      })
      .waitFor();
    const migrated =
      await page.evaluate(() => ({
        voice:
          window.localStorage.getItem(
            "txp-narration-voice",
          ),
        rate:
          window.localStorage.getItem(
            "txp-narration-rate",
          ),
        marker:
          window.localStorage.getItem(
            "txp-narration-active-release-preferences-v1",
          ),
        voiceSelectCount:
          [...document.querySelectorAll("label")]
            .filter((label) =>
              label.textContent?.includes(
                "Voice",
              ),
            )
            .flatMap((label) =>
              [
                ...label.querySelectorAll(
                  "select",
                ),
              ],
            ).length,
        audioPresent:
          document.querySelector("audio") !==
          null,
      }));
    const speed = page.getByLabel("Speed");
    await speed.selectOption("1.5");
    await page.reload({
      waitUntil: "networkidle",
    });
    const afterDeliberateChoice =
      await page.evaluate(() => ({
        voice:
          window.localStorage.getItem(
            "txp-narration-voice",
          ),
        rate:
          window.localStorage.getItem(
            "txp-narration-rate",
          ),
        marker:
          window.localStorage.getItem(
            "txp-narration-active-release-preferences-v1",
          ),
        playbackRate:
          document.querySelector("audio")
            ?.playbackRate ?? null,
        preservesPitch:
          document.querySelector("audio")
            ?.preservesPitch ?? null,
        webkitPreservesPitch:
          (
            document.querySelector(
              "audio",
            ) as
              | (HTMLAudioElement & {
                  webkitPreservesPitch?: boolean;
                })
              | null
          )?.webkitPreservesPitch ?? null,
      }));
    const passed =
      migrated.voice === expectedVoiceId &&
      migrated.rate === "1" &&
      Boolean(migrated.marker) &&
      migrated.voiceSelectCount === 0 &&
      migrated.audioPresent &&
      afterDeliberateChoice.voice ===
        expectedVoiceId &&
      afterDeliberateChoice.rate ===
        "1.5" &&
      afterDeliberateChoice.marker ===
        migrated.marker &&
      afterDeliberateChoice.playbackRate ===
        1.5 &&
      afterDeliberateChoice.preservesPitch ===
        true;
    const result = {
      schemaVersion:
        "tenxpros-academy-narration-player-smoke-v1",
      runAt: new Date().toISOString(),
      migrated,
      afterDeliberateChoice,
      passed,
    };
    await writeExclusive(
      outputPath,
      `${JSON.stringify(
        result,
        null,
        2,
      )}\n`,
    );
    process.stdout.write(
      `${JSON.stringify({
        passed,
        outputPath,
      })}\n`,
    );
    if (!passed) process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
