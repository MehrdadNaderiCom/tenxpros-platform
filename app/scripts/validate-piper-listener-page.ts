#!/usr/bin/env tsx

import {
  lstat,
  readFile,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

import {
  parsePhase2BResponse,
  type Phase2BPublicPackage,
} from "../src/lib/academy/narration/piper-listening-evaluation";

function optionValue(
  args: readonly string[],
  option: string,
): string {
  const index = args.indexOf(option);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} is required`);
  }
  return resolve(process.cwd(), value);
}

async function readJson<T>(path: string): Promise<T> {
  const file = await lstat(path);
  if (!file.isFile() || file.isSymbolicLink()) {
    throw new Error(`Expected a regular non-symlink file: ${path}`);
  }
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const listenerDirectory = optionValue(args, "--root");
  const publicPackagePath = optionValue(args, "--public-package");
  const outputIndex = args.indexOf("--output");
  const outputPath =
    outputIndex >= 0 && args[outputIndex + 1]
      ? resolve(process.cwd(), args[outputIndex + 1]!)
      : undefined;
  const publicPackage =
    await readJson<Phase2BPublicPackage>(publicPackagePath);
  const indexPath = resolve(listenerDirectory, "index.html");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const nonLocalRequests: string[] = [];
  page.on("console", (message) => {
    consoleMessages.push(`${message.type()}: ${message.text()}`);
  });
  page.on("request", (request) => {
    const protocol = new URL(request.url()).protocol;
    if (!["file:", "data:", "blob:"].includes(protocol)) {
      nonLocalRequests.push(request.url());
    }
  });
  try {
    await page.goto(pathToFileURL(indexPath).href, {
      waitUntil: "load",
    });
    const listenerId = await page
      .locator("[data-listener-id]")
      .inputValue();
    if (!/^L-[A-Z2-9]{8,16}$/u.test(listenerId)) {
      throw new Error("The page did not generate an anonymous listener id");
    }
    const firstScore = page.locator("[data-score]").first();
    await firstScore.selectOption("4");
    await page.reload({ waitUntil: "load" });
    if (
      (await page.locator("[data-listener-id]").inputValue()) !==
        listenerId ||
      (await page.locator("[data-score]").first().inputValue()) !== "4"
    ) {
      throw new Error("Local draft did not survive a page reload");
    }
    if (
      !(await page
        .locator("[data-pair-questions]")
        .first()
        .evaluate(
          (element) => (element as HTMLFieldSetElement).disabled,
        ))
    ) {
      throw new Error("Pair questions unlocked before 1.0x scores");
    }
    const scores = page.locator("[data-score]");
    for (let index = 0; index < (await scores.count()); index += 1) {
      await scores.nth(index).selectOption("4");
    }
    const optionalSpeed = page.locator("[data-optional-speed]").first();
    if (!(await optionalSpeed.isDisabled())) {
      throw new Error("Optional speed unlocked before score locking");
    }
    const lockButtons = page.locator("[data-lock]");
    for (
      let index = 0;
      index < (await lockButtons.count());
      index += 1
    ) {
      await lockButtons.nth(index).click();
    }
    if (await optionalSpeed.isDisabled()) {
      throw new Error("Optional speed stayed disabled after score locking");
    }
    await optionalSpeed.click();
    const firstRate = await page
      .locator("[data-audio]")
      .first()
      .evaluate((audio) => (audio as HTMLAudioElement).playbackRate);
    if (Math.abs(firstRate - 1.25) > 0.001) {
      throw new Error("Optional playback did not switch to 1.25x");
    }
    if (
      await page
        .locator("[data-pair-questions]")
        .first()
        .evaluate(
          (element) => (element as HTMLFieldSetElement).disabled,
        )
    ) {
      throw new Error("Pair questions did not unlock");
    }

    for (const pair of publicPackage.pairs) {
      const root = page.locator(`[data-pair="${pair.pair_id}"]`);
      const choices: Readonly<Record<string, string>> = {
        overall_preference: "A",
        easier_to_understand: "A",
        more_natural: "A",
        long_lesson_preference: "A",
        too_slow: "neither",
        too_fast: "neither",
        strange_pronunciation: "neither",
      };
      for (const [name, value] of Object.entries(choices)) {
        await root
          .locator(`[data-pair-field="${name}"]`)
          .selectOption(value);
      }
      if (pair.table_efficiency) {
        const tableChoices: Readonly<Record<string, string>> = {
          easier_to_understand: "A",
          repeated_labels_usefulness: "4",
          excessively_slow: "neither",
          pauses_excessive: "neither",
          prefer_longer_clearer: "yes",
          test_more_concise_format: "no",
        };
        for (const [name, value] of Object.entries(tableChoices)) {
          await root
            .locator(`[data-pair-field="table:${name}"]`)
            .selectOption(value);
        }
      }
    }
    const exportButton = page.locator("[data-export]");
    if (await exportButton.isDisabled()) {
      throw new Error("A complete response did not enable export");
    }
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportButton.click(),
    ]);
    const downloadPath = await download.path();
    if (!downloadPath) throw new Error("Export created no download");
    const rawResponse = await readFile(downloadPath, "utf8");
    const response = parsePhase2BResponse(
      JSON.parse(rawResponse) as unknown,
      publicPackage,
    );
    if (
      response.listener_id !== listenerId ||
      response.completion.status !== "complete" ||
      response.completion.required_total !== 111 ||
      response.completion.errors.length !== 0 ||
      response.files["sample-01-A"]?.optional_1_25x_used !== true
    ) {
      throw new Error("Exported response failed its browser contract");
    }
    if (nonLocalRequests.length > 0 || consoleMessages.length > 0) {
      throw new Error(
        `Listener page used a network/logging channel: ${JSON.stringify({
          nonLocalRequests,
          consoleMessages,
        })}`,
      );
    }
    const result = {
      status: "PASS",
      listenerIdPattern: "PASS",
      localDraftReload: "PASS",
      oneXLock: "PASS",
      optionalOnePointTwoFiveX: "PASS",
      requiredAnswers: response.completion.required_total,
      strictExportParse: "PASS",
      networkRequests: 0,
      consoleMessages: 0,
    };
    if (outputPath) {
      await writeFile(
        outputPath,
        `${JSON.stringify(result, null, 2)}\n`,
        { encoding: "utf8", mode: 0o600, flag: "wx" },
      );
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
