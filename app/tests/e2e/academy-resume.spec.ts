import { createHash } from "node:crypto";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  ACADEMY_NARRATION_DEPLOYMENT_ID,
  ACTIVE_ACADEMY_NARRATION_VOICE_ID,
  FINAL_ACADEMY_NARRATION_RECIPE_HASH,
  FINAL_ACADEMY_NARRATION_RECIPE_VERSION,
  visibleLessonContentHash,
} from "../../src/lib/academy/narration-release";

/**
 * Cross-device Academy resume coverage.
 *
 * This suite owns a namespaced module, two partner accounts, and one temporary
 * production narration pointer. It has no fallback URLs: both the disposable
 * DB and disposable app server must be named explicitly, and the database name
 * (or schema) must carry an E2E marker.
 */

const fixtureDatabaseUrl =
  process.env.DATABASE_URL;
const fixtureBaseUrl =
  process.env.E2E_BASE_URL;
const fixtureRequested =
  process.env.ACADEMY_RESUME_E2E_DISPOSABLE === "1";
const fixtureEnabled = Boolean(
  fixtureRequested &&
    fixtureDatabaseUrl &&
    fixtureBaseUrl,
);

if (
  fixtureRequested &&
  (!fixtureDatabaseUrl || !fixtureBaseUrl)
) {
  throw new Error(
    "Academy resume E2E is destructive fixture work. Set ACADEMY_RESUME_E2E_DISPOSABLE=1, DATABASE_URL, and E2E_BASE_URL explicitly for dedicated disposable services.",
  );
}

function assertLoopbackDatabase(databaseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Academy resume E2E requires a valid DATABASE_URL.");
  }
  const hostname = parsed.hostname;
  if (
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      hostname,
    )
  ) {
    throw new Error(
      `Refusing Academy resume E2E fixture writes to non-local database host "${hostname}".`,
    );
  }
  const databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\/+/u, ""),
  );
  if (!/resume.*test/iu.test(databaseName)) {
    throw new Error(
      `Refusing Academy resume fixture writes because database "${databaseName}" does not match the required "resume...test" disposable naming convention.`,
    );
  }
}

function assertDisposableAppServer(appBaseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(appBaseUrl);
  } catch {
    throw new Error(
      "Academy resume E2E requires a valid explicit E2E_BASE_URL.",
    );
  }
  if (
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      parsed.hostname,
    )
  ) {
    throw new Error(
      `Refusing Academy resume E2E against non-local app host "${parsed.hostname}".`,
    );
  }
  // Port 3003 is the existing local TenXPros service in this workspace.
  if (parsed.port === "3003") {
    throw new Error(
      "Refusing Academy resume E2E against the existing localhost:3003 service. Start a disposable server on a different port.",
    );
  }
}

if (fixtureEnabled) {
  assertLoopbackDatabase(fixtureDatabaseUrl!);
  assertDisposableAppServer(fixtureBaseUrl!);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      // Never inherit the repository's localhost:5433 database when this
      // opt-in suite is merely collected by the ordinary E2E command.
      url: fixtureEnabled
        ? fixtureDatabaseUrl!
        : "postgresql://disabled:disabled@127.0.0.1:1/academy_resume_test_disabled",
    },
  },
});
const baseUrl = (
  fixtureEnabled
    ? fixtureBaseUrl!
    : "http://127.0.0.1:1"
).replace(/\/+$/u, "");
const runToken = `${Date.now()}-${process.pid}`;
const namespace = `e2e-academy-resume-${runToken}`;
const moduleId = `${namespace}-module`;
const lessonId = `${namespace}-lesson`;
const releaseId = `${namespace}-release`;
const assetId = `${namespace}-asset`;
const moduleSlug = namespace;
const lessonPath = `/partner/academy/${moduleSlug}`;
const resumeEndpoint = `/api/partner/academy/resume/${moduleSlug}`;
const fixturePassword = "E2E-Academy-Resume-123!";
const userA = {
  id: `${namespace}-user-a`,
  partnerId: `${namespace}-partner-a`,
  email: `${namespace}.a@tenxpros.test`,
  name: "Academy Resume Partner A",
};
const userB = {
  id: `${namespace}-user-b`,
  partnerId: `${namespace}-partner-b`,
  email: `${namespace}.b@tenxpros.test`,
  name: "Academy Resume Partner B",
};

const PARAGRAPH_COUNT = 45;
const OTHER_USER_PARAGRAPH_INDEX = 19;
const SHALLOW_HEADING_TEXT =
  "E2E responsive strategy checkpoint";
const DEEP_LIST_TEXT =
  "E2E semantic list checkpoint for the durable resume.";
const DESKTOP_VIEWPORT = { width: 1_280, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const richParagraphs = Array.from(
  { length: PARAGRAPH_COUNT },
  (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return (
      `E2E semantic paragraph ${number}. ` +
      `Marker RSM${number} identifies this exact reading block. ` +
      "The deliberately substantial copy gives the browser stable vertical geometry across reloads and makes this lesson long enough to exercise a real reading session. " +
      "A partner can pause here, leave the Academy, and later continue from this precise part of the material on another browser context."
    );
  },
);
const paragraphHtml = richParagraphs.map(
  (paragraph) => `<p>${paragraph}</p>`,
);
const lessonBodyHtml = [
  ...paragraphHtml.slice(0, 5),
  `<h2>${SHALLOW_HEADING_TEXT}</h2>`,
  ...paragraphHtml.slice(5, 15),
  "<ul>",
  "<li>E2E mixed-content list item before the middle section.</li>",
  "<li>E2E second mixed-content list item with a distinct semantic key.</li>",
  "</ul>",
  "<h2>E2E responsive middle section</h2>",
  ...paragraphHtml.slice(15, 30),
  "<h2>E2E field checklist</h2>",
  "<ol>",
  "<li>E2E checklist preparation item.</li>",
  `<li>${DEEP_LIST_TEXT}</li>`,
  "<li>E2E checklist follow-through item.</li>",
  "</ol>",
  ...paragraphHtml.slice(30),
].join("");
const lessonBody = [
  ...richParagraphs.slice(0, 5),
  SHALLOW_HEADING_TEXT,
  ...richParagraphs.slice(5, 15),
  "E2E mixed-content list item before the middle section.",
  "E2E second mixed-content list item with a distinct semantic key.",
  "E2E responsive middle section",
  ...richParagraphs.slice(15, 30),
  "E2E field checklist",
  "E2E checklist preparation item.",
  DEEP_LIST_TEXT,
  "E2E checklist follow-through item.",
  ...richParagraphs.slice(30),
].join("\n\n");
const lessonAudioText =
  "This deterministic Academy resume fixture validates narration bookmarks without playing automatically.";

type StoredDeployment = {
  activeReleaseId: string | null;
  previousReleaseId: string | null;
  activatedAt: Date | null;
  rollbackReleaseId: string | null;
  rollbackReason: string | null;
  lastRolledBackAt: Date | null;
};

let priorDeployment: StoredDeployment | null = null;
let deploymentExisted = false;
let fixtureDeploymentInstalled = false;

function sha256(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

/** A deterministic 20-second, 8 kHz, mono, 16-bit PCM silent WAV. */
function silentWav(seconds: number) {
  const sampleRate = 8_000;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const sampleCount = sampleRate * seconds;
  const dataSize = sampleCount * channels * bytesPerSample;
  const wav = Buffer.alloc(44 + dataSize);

  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  wav.writeUInt16LE(channels * bytesPerSample, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(dataSize, 40);

  return wav;
}

const narrationDurationSeconds = 20;
const narrationBytes = silentWav(narrationDurationSeconds);

function appUrl(path: string) {
  return `${baseUrl}${path}`;
}

async function openAuthenticatedLesson(
  browser: Browser,
  email: string,
  options?: {
    viewport?: { width: number; height: number };
  },
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: options?.viewport,
  });
  const page = await context.newPage();
  await page.goto(
    appUrl(
      `/login?callbackUrl=${encodeURIComponent(lessonPath)}`,
    ),
  );
  await page.locator('input[name="email"]').fill(email);
  await page
    .locator('input[name="password"]')
    .fill(fixturePassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname === lessonPath),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
  await expect(page.locator(".academy-lesson")).toBeVisible();
  await expect(
    page.locator(".academy-lesson p"),
  ).toHaveCount(PARAGRAPH_COUNT);
  return { context, page };
}

function lessonParagraph(page: Page, index: number) {
  return page.locator(".academy-lesson p").nth(index);
}

function shallowHeading(page: Page) {
  return page
    .locator(".academy-lesson h2")
    .filter({ hasText: SHALLOW_HEADING_TEXT });
}

function deepListItem(page: Page) {
  return page
    .locator(".academy-lesson li")
    .filter({ hasText: DEEP_LIST_TEXT });
}

async function semanticBlockIndex(block: Locator) {
  return block.evaluate((element) => {
    const root = element.closest(".academy-lesson");
    if (!root) return -1;
    return Array.from(
      root.querySelectorAll(
        "h2,h3,h4,p,li,blockquote,tr,img",
      ),
    ).indexOf(element);
  });
}

async function moveReadingLineToBlock(
  page: Page,
  block: Locator,
) {
  await expect(block).toBeVisible();
  await block.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const readingLine = Math.min(
      260,
      Math.max(120, window.innerHeight * 0.32),
    );
    const offsetInsideBlock = rect.height * 0.28;
    const documentTop = window.scrollY + rect.top;
    window.scrollTo({
      top: Math.max(
        0,
        documentTop + offsetInsideBlock - readingLine,
      ),
      behavior: "auto",
    });
  });
  // Reading saves are intentionally debounced by 650 ms. The tiny second
  // movement also makes this helper resilient if the first scroll happened
  // while fonts were completing their initial layout.
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollBy(0, 1));
  await page.waitForTimeout(800);
}

async function resumeRow(userId: string) {
  return prisma.academyLessonResume.findUnique({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
  });
}

async function waitForReadingIndex(
  userId: string,
  index: number,
) {
  await expect
    .poll(async () => (await resumeRow(userId))?.readingBlockIndex)
    .toBe(index);
  return prisma.academyLessonResume.findUniqueOrThrow({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
  });
}

async function expectBlockAtSavedReadingLine(
  page: Page,
  block: Locator,
  offsetRatio: number,
) {
  await expect(
    page.getByTestId("academy-reading-bookmark"),
  ).toContainText("back at your saved reading position");
  await expect
    .poll(async () =>
      block.evaluate(
        (element, savedOffsetRatio) => {
          const rect = element.getBoundingClientRect();
          const readingLine = Math.min(
            260,
            Math.max(120, window.innerHeight * 0.32),
          );
          const savedMarker =
            rect.top +
            rect.height * savedOffsetRatio;
          return Math.abs(savedMarker - readingLine);
        },
        offsetRatio,
      ),
    )
    .toBeLessThan(45);
}

test.describe("Partner Academy durable resume", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });
  test.skip(
    !fixtureEnabled,
    "Requires explicit disposable Academy resume DB and app services.",
  );

  test.beforeAll(async () => {
    if (!fixtureDatabaseUrl || !fixtureBaseUrl) {
      throw new Error(
        "Disposable Academy resume services were not configured.",
      );
    }
    assertLoopbackDatabase(fixtureDatabaseUrl);
    assertDisposableAppServer(fixtureBaseUrl);

    priorDeployment =
      await prisma.academyNarrationDeployment.findUnique({
        where: {
          id: ACADEMY_NARRATION_DEPLOYMENT_ID,
        },
        select: {
          activeReleaseId: true,
          previousReleaseId: true,
          activatedAt: true,
          rollbackReleaseId: true,
          rollbackReason: true,
          lastRolledBackAt: true,
        },
      });
    deploymentExisted = priorDeployment !== null;

    const passwordHash = await hash(fixturePassword, 10);
    const now = new Date();
    const sourceManifestHash = sha256(
      `${namespace}:source-manifest`,
    );
    const narrationChecksum = sha256(narrationBytes);

    await prisma.$transaction(async (tx) => {
      for (const fixture of [userA, userB]) {
        await tx.user.create({
          data: {
            id: fixture.id,
            email: fixture.email,
            name: fixture.name,
            role: "PARTNER",
            passwordHash,
            partner: {
              create: {
                id: fixture.partnerId,
                status: "TIER1",
                tier: "TIER1",
                displayName: fixture.name,
                contactEmail: fixture.email,
                country: "United States",
                activeStatus: true,
              },
            },
          },
        });
      }

      await tx.academyModule.create({
        data: {
          id: moduleId,
          slug: moduleSlug,
          order: 1,
          title: "E2E Durable Academy Resume",
          summary:
            "A disposable long-form lesson for cross-device resume verification.",
          isPublished: true,
          isInformational: false,
          contentVersion: 1,
          lessons: {
            create: {
              id: lessonId,
              order: 1,
              title: "Resume fixture lesson",
              body: lessonBody,
              bodyHtml: lessonBodyHtml,
              audioText: lessonAudioText,
              updatedByEmail: "e2e@tenxpros.test",
            },
          },
        },
      });

      await tx.academyNarrationRelease.create({
        data: {
          id: releaseId,
          recipeVersion:
            FINAL_ACADEMY_NARRATION_RECIPE_VERSION,
          recipeHash: FINAL_ACADEMY_NARRATION_RECIPE_HASH,
          rendererVersion: "academy-resume-e2e-renderer-v1",
          normalizationVersion:
            "academy-resume-e2e-normalization-v1",
          pronunciationVersion:
            "academy-resume-e2e-pronunciation-v1",
          segmentationVersion:
            "academy-resume-e2e-segmentation-v1",
          voiceId: ACTIVE_ACADEMY_NARRATION_VOICE_ID,
          piperVersion: "academy-resume-e2e",
          generationStatus: "COMPLETE",
          // The production gate intentionally requires the canonical Academy
          // corpus size. This fixture only needs the one asset it exercises.
          expectedAssetCount: 17,
          sourceContentManifestHash: sourceManifestHash,
          generationStartedAt: now,
          generationCompletedAt: now,
          auditStatus: "PASSED",
          auditManifestHash: sha256(
            `${namespace}:audit-manifest`,
          ),
          releaseChecksumSha256: sha256(
            `${namespace}:release`,
          ),
        },
      });

      await tx.academyNarrationAsset.create({
        data: {
          id: assetId,
          releaseId,
          lessonId,
          lessonSlug: moduleSlug,
          lessonOrder: 1,
          contentHash:
            visibleLessonContentHash(lessonBodyHtml),
          spokenScriptHash: sha256(lessonAudioText),
          data: narrationBytes,
          mimeType: "audio/wav",
          durationSeconds: narrationDurationSeconds,
          sampleRate: 8_000,
          channels: 1,
          bitrateKbps: 128,
          sizeBytes: narrationBytes.byteLength,
          checksumSha256: narrationChecksum,
          integratedLufs: -120,
          truePeakDbtp: -120,
          generationMetadata: {
            fixture: "academy-resume-e2e",
            deterministicSilence: true,
          },
        },
      });

      await tx.academyNarrationDeployment.upsert({
        where: {
          id: ACADEMY_NARRATION_DEPLOYMENT_ID,
        },
        create: {
          id: ACADEMY_NARRATION_DEPLOYMENT_ID,
          activeReleaseId: releaseId,
          activatedAt: now,
        },
        update: {
          activeReleaseId: releaseId,
          activatedAt: now,
        },
      });
    });
    fixtureDeploymentInstalled = true;
  });

  test.afterAll(async () => {
    const cleanupFailures = new Map<string, unknown>();
    const cleanupSteps: Array<{
      label: string;
      run: () => Promise<unknown>;
    }> = [
      {
        label: "restore narration deployment",
        run: async () => {
          if (!fixtureDeploymentInstalled) return;
          if (deploymentExisted && priorDeployment) {
            await prisma.academyNarrationDeployment.update({
              where: {
                id: ACADEMY_NARRATION_DEPLOYMENT_ID,
              },
              data: {
                activeReleaseId:
                  priorDeployment.activeReleaseId,
                previousReleaseId:
                  priorDeployment.previousReleaseId,
                activatedAt: priorDeployment.activatedAt,
                rollbackReleaseId:
                  priorDeployment.rollbackReleaseId,
                rollbackReason:
                  priorDeployment.rollbackReason,
                lastRolledBackAt:
                  priorDeployment.lastRolledBackAt,
              },
            });
            return;
          }
          await prisma.academyNarrationDeployment.updateMany({
            where: {
              id: ACADEMY_NARRATION_DEPLOYMENT_ID,
              activeReleaseId: releaseId,
            },
            data: {
              activeReleaseId: null,
              previousReleaseId: null,
            },
          });
          await prisma.academyNarrationDeployment.deleteMany({
            where: {
              id: ACADEMY_NARRATION_DEPLOYMENT_ID,
              activeReleaseId: null,
            },
          });
        },
      },
      {
        label: "delete narration asset",
        run: () =>
          prisma.academyNarrationAsset.deleteMany({
            where: { id: assetId },
          }),
      },
      {
        label: "delete narration release",
        run: () =>
          prisma.academyNarrationRelease.deleteMany({
            where: { id: releaseId },
          }),
      },
      {
        label: "delete Academy module",
        run: () =>
          prisma.academyModule.deleteMany({
            where: { id: moduleId },
          }),
      },
      {
        label: "delete partners",
        run: () =>
          prisma.partner.deleteMany({
            where: {
              id: {
                in: [userA.partnerId, userB.partnerId],
              },
            },
          }),
      },
      {
        label: "delete users",
        run: () =>
          prisma.user.deleteMany({
            where: {
              id: { in: [userA.id, userB.id] },
            },
          }),
      },
    ];

    const attempt = async (step: (typeof cleanupSteps)[number]) => {
      try {
        await step.run();
        cleanupFailures.delete(step.label);
      } catch (error) {
        cleanupFailures.set(step.label, error);
      }
    };

    try {
      for (const step of cleanupSteps) {
        await attempt(step);
      }
      // A transient pointer failure can make the first release delete fail.
      // Retry every failed step once, in dependency order, while still ensuring
      // unrelated module/account cleanup has already had its own attempt.
      for (const step of cleanupSteps) {
        if (cleanupFailures.has(step.label)) {
          await attempt(step);
        }
      }
    } finally {
      try {
        await prisma.$disconnect();
      } catch (error) {
        cleanupFailures.set("disconnect Prisma", error);
      }
    }

    if (cleanupFailures.size > 0) {
      throw new AggregateError(
        [...cleanupFailures.values()],
        `Academy resume E2E cleanup failed: ${[
          ...cleanupFailures.keys(),
        ].join(", ")}`,
      );
    }
  });

  test("restores the latest semantic reading position across reloads and browser contexts", async ({
    browser,
  }) => {
    const first = await openAuthenticatedLesson(
      browser,
      userA.email,
      { viewport: DESKTOP_VIEWPORT },
    );
    try {
      expect(first.page.viewportSize()).toEqual(
        DESKTOP_VIEWPORT,
      );
      await pageReadyForReadingSaves(first.page);
      const deepBlock = deepListItem(first.page);
      const deepBlockIndex =
        await semanticBlockIndex(deepBlock);
      expect(deepBlockIndex).toBeGreaterThan(0);
      await moveReadingLineToBlock(
        first.page,
        deepBlock,
      );
      const deepResume = await waitForReadingIndex(
        userA.id,
        deepBlockIndex,
      );
      expect(deepResume.readingBlockKey).toMatch(/^li:/u);
      expect(deepResume.readingOffsetRatio).not.toBeNull();
      expect(deepResume.readingProgressPct).toBeGreaterThan(50);

      await first.page.reload();
      await expectBlockAtSavedReadingLine(
        first.page,
        deepListItem(first.page),
        deepResume.readingOffsetRatio!,
      );
    } finally {
      await first.context.close();
    }

    const second = await openAuthenticatedLesson(
      browser,
      userA.email,
      { viewport: MOBILE_VIEWPORT },
    );
    try {
      expect(second.page.viewportSize()).toEqual(
        MOBILE_VIEWPORT,
      );
      const deepResume = await resumeRow(userA.id);
      expect(deepResume?.readingOffsetRatio).not.toBeNull();
      await expectBlockAtSavedReadingLine(
        second.page,
        deepListItem(second.page),
        deepResume!.readingOffsetRatio!,
      );

      const shallowBlock = shallowHeading(second.page);
      const shallowBlockIndex =
        await semanticBlockIndex(shallowBlock);
      expect(shallowBlockIndex).toBeGreaterThanOrEqual(0);
      await moveReadingLineToBlock(
        second.page,
        shallowBlock,
      );
      const latestResume = await waitForReadingIndex(
        userA.id,
        shallowBlockIndex,
      );
      expect(latestResume.readingBlockIndex).toBeLessThan(
        deepResume!.readingBlockIndex!,
      );
      expect(latestResume.readingBlockKey).toMatch(/^h2:/u);
      expect(latestResume.readingProgressPct).toBeLessThan(
        deepResume!.readingProgressPct!,
      );

      await second.page.reload();
      await expectBlockAtSavedReadingLine(
        second.page,
        shallowHeading(second.page),
        latestResume.readingOffsetRatio!,
      );
    } finally {
      await second.context.close();
    }
  });

  test("keeps each partner's reading bookmark isolated", async ({
    browser,
  }) => {
    const beforeA = await resumeRow(userA.id);
    expect(beforeA?.readingBlockKey).toMatch(/^h2:/u);
    expect(await resumeRow(userB.id)).toBeNull();

    const other = await openAuthenticatedLesson(
      browser,
      userB.email,
    );
    try {
      await expect(
        other.page.getByTestId("academy-reading-bookmark"),
      ).toContainText(
        "reading position is saved automatically",
      );
      await expect(
        other.page.getByRole("button", {
          name: "Start from the beginning",
        }),
      ).toHaveCount(0);

      await pageReadyForReadingSaves(other.page);
      const otherBlock = lessonParagraph(
        other.page,
        OTHER_USER_PARAGRAPH_INDEX,
      );
      const otherBlockIndex =
        await semanticBlockIndex(otherBlock);
      await moveReadingLineToBlock(
        other.page,
        otherBlock,
      );
      const savedB = await waitForReadingIndex(
        userB.id,
        otherBlockIndex,
      );
      expect(savedB.partnerId).toBe(userB.partnerId);

      const afterA = await resumeRow(userA.id);
      expect(afterA?.partnerId).toBe(userA.partnerId);
      expect(afterA?.readingBlockKey).toBe(
        beforeA?.readingBlockKey,
      );
      expect(afterA?.readingRevision).toBe(
        beforeA?.readingRevision,
      );
    } finally {
      await other.context.close();
    }
  });

  test("persists real playback on pause and exit without autoplay, and Stop clears while playing", async ({
    browser,
  }) => {
    let exitPosition = 0;
    const playback = await openAuthenticatedLesson(
      browser,
      userA.email,
    );
    try {
      const statusResponse =
        await playback.context.request.get(
          appUrl(
            `/api/partner/academy/audio/${moduleSlug}`,
          ),
        );
      expect(statusResponse.status()).toBe(200);
      const status = (await statusResponse.json()) as {
        productionVoiceLocked?: boolean;
        voices?: Array<{ id: string; ready: boolean }>;
      };
      expect(status.productionVoiceLocked).toBe(true);
      expect(status.voices).toEqual([
        expect.objectContaining({
          id: ACTIVE_ACADEMY_NARRATION_VOICE_ID,
          ready: true,
        }),
      ]);

      const seek = playback.page.getByLabel("Seek", {
        exact: true,
      });
      await expect(seek).toBeVisible();
      await expect
        .poll(async () => Number(await seek.getAttribute("max")))
        .toBe(narrationDurationSeconds);
      await expect(
        playback.page.getByLabel("Voice", { exact: true }),
      ).toHaveCount(0);
      await expect(
        playback.page
          .locator("label")
          .filter({ hasText: /^\s*Voice\b/u }),
      ).toHaveCount(0);

      await playback.page
        .getByRole("combobox", {
          name: "Speed",
          exact: true,
        })
        .selectOption("1.5");
      const audio = playback.page.locator("audio");
      await playback.page
        .getByRole("button", {
          name: "Play",
          exact: true,
        })
        .click();
      await expect(
        playback.page.getByRole("button", {
          name: "Pause",
          exact: true,
        }),
      ).toBeVisible();
      await expect
        .poll(async () =>
          audio.evaluate(
            (element) =>
              (element as HTMLAudioElement).currentTime,
          ),
        )
        .toBeGreaterThanOrEqual(7);
      await playback.page
        .getByRole("button", {
          name: "Pause",
          exact: true,
        })
        .click();
      const pausedPosition = await audio.evaluate(
        (element) =>
          (element as HTMLAudioElement).currentTime,
      );
      expect(pausedPosition).toBeGreaterThanOrEqual(7);
      await expect
        .poll(async () => {
          const saved = (await resumeRow(userA.id))
            ?.audioPositionSeconds;
          return saved == null
            ? Number.POSITIVE_INFINITY
            : Math.abs(saved - pausedPosition);
        })
        .toBeLessThan(0.75);

      await playback.page
        .getByRole("button", {
          name: "Resume",
          exact: true,
        })
        .click();
      const exitTarget = Math.min(
        narrationDurationSeconds - 4,
        pausedPosition + 4,
      );
      await expect
        .poll(async () =>
          audio.evaluate(
            (element) =>
              (element as HTMLAudioElement).currentTime,
          ),
        )
        .toBeGreaterThanOrEqual(exitTarget);
      exitPosition = await audio.evaluate(
        (element) =>
          (element as HTMLAudioElement).currentTime,
      );
      expect(
        await audio.evaluate(
          (element) =>
            (element as HTMLAudioElement).paused,
        ),
      ).toBe(false);

      // Dispatch the browser's exit signal while the document is still
      // observable, so Playwright can verify the keepalive response itself.
      // The full navigation immediately afterward proves the server checkpoint
      // survives the old page and remains the latest position.
      const pagehideWrite = playback.page.waitForResponse(
        (response) =>
          response.url() === appUrl(resumeEndpoint) &&
          response.request().method() === "POST",
      );
      await playback.page.evaluate(() => {
        window.dispatchEvent(
          new PageTransitionEvent("pagehide", {
            persisted: false,
          }),
        );
      });
      expect((await pagehideWrite).status()).toBe(200);
      await expect
        .poll(async () => {
          const saved = (await resumeRow(userA.id))
            ?.audioPositionSeconds;
          return saved == null
            ? Number.POSITIVE_INFINITY
            : Math.abs(saved - exitPosition);
        })
        .toBeLessThan(1);
      await playback.page.goto(appUrl("/partner/academy"));
      await expect(playback.page).toHaveURL(
        appUrl("/partner/academy"),
      );
      expect(
        (await resumeRow(userA.id))
          ?.audioPositionSeconds,
      ).toBeGreaterThanOrEqual(exitPosition - 1);
    } finally {
      await playback.context.close();
    }

    const resumed = await openAuthenticatedLesson(
      browser,
      userA.email,
    );
    try {
      const savedAfterExit = await resumeRow(userA.id);
      expect(
        savedAfterExit?.audioPositionSeconds,
      ).toBeGreaterThanOrEqual(exitPosition - 1);
      const restoredSeek = resumed.page.getByLabel("Seek", {
        exact: true,
      });
      await expect
        .poll(async () => Number(await restoredSeek.inputValue()))
        .toBe(
          Math.floor(
            savedAfterExit!.audioPositionSeconds!,
          ),
        );
      const restoredAudio = resumed.page.locator("audio");
      await expect
        .poll(async () => {
          const actual = await restoredAudio.evaluate(
            (element) =>
              (element as HTMLAudioElement).currentTime,
          );
          return Math.abs(
            actual -
              savedAfterExit!.audioPositionSeconds!,
          );
        })
        .toBeLessThan(0.75);
      const stableTime = await restoredAudio.evaluate(
        (element) =>
          (element as HTMLAudioElement).currentTime,
      );
      await resumed.page.waitForTimeout(600);
      const restoredState = await restoredAudio.evaluate(
        (element) => ({
          paused: (element as HTMLAudioElement).paused,
          autoplay: (element as HTMLAudioElement).autoplay,
          currentTime:
            (element as HTMLAudioElement).currentTime,
        }),
      );
      expect(restoredState.paused).toBe(true);
      expect(restoredState.autoplay).toBe(false);
      expect(
        Math.abs(restoredState.currentTime - stableTime),
      ).toBeLessThan(0.1);

      await resumed.page
        .getByRole("button", {
          name: "Resume",
          exact: true,
        })
        .click();
      await expect(
        resumed.page.getByRole("button", {
          name: "Pause",
          exact: true,
        }),
      ).toBeVisible();
      await expect
        .poll(async () =>
          restoredAudio.evaluate(
            (element) =>
              (element as HTMLAudioElement).currentTime,
          ),
        )
        .toBeGreaterThan(stableTime + 0.5);
      await resumed.page
        .getByRole("button", { name: /Stop/u })
        .click();
      await expect
        .poll(
          async () =>
            (await resumeRow(userA.id))
              ?.audioPositionSeconds ?? -1,
        )
        .toBe(0);

      await resumed.page.reload();
      const clearedSeek = resumed.page.getByLabel("Seek", {
        exact: true,
      });
      await expect
        .poll(async () => Number(await clearedSeek.inputValue()))
        .toBe(0);
      await expect(
        resumed.page.getByRole("button", {
          name: "Play",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        resumed.page.getByTestId("academy-audio-resume"),
      ).toHaveCount(0);

      const origin = new URL(resumed.page.url()).origin;
      const crossSite =
        await resumed.context.request.post(
          appUrl(resumeEndpoint),
          {
            headers: {
              "Content-Type": "application/json",
              Origin: "https://attacker.invalid",
              "Sec-Fetch-Site": "cross-site",
            },
            data: {},
          },
        );
      expect(crossSite.status()).toBe(403);
      expect(await crossSite.json()).toEqual({
        message: "Cross-site request refused.",
      });

      const invalid =
        await resumed.context.request.post(
          appUrl(resumeEndpoint),
          {
            headers: {
              "Content-Type": "application/json",
              Origin: origin,
              "Sec-Fetch-Site": "same-origin",
            },
            data: {
              kind: "reading",
              progressPct: 101,
            },
          },
        );
      expect(invalid.status()).toBe(400);
      expect(await invalid.json()).toEqual({
        message: "Invalid bookmark.",
      });
    } finally {
      await resumed.context.close();
    }
  });
});

async function pageReadyForReadingSaves(page: Page) {
  await page.evaluate(async () => {
    try {
      await document.fonts?.ready;
    } catch {
      // Current layout is sufficient when the Font Loading API is unavailable.
    }
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => resolve()),
      ),
    );
  });
  await page.waitForTimeout(150);
}
