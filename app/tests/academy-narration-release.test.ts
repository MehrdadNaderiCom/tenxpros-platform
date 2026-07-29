import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ACTIVE_ACADEMY_NARRATION_VOICE_ID,
  academyNarrationAudioStatus,
  academyNarrationVoiceLabel,
  FINAL_ELEVENLABS_NARRATION_RECIPE_HASH,
  FINAL_ELEVENLABS_NARRATION_RECIPE_VERSION,
  FINAL_ELEVENLABS_NARRATION_VOICE_ID,
  FINAL_ELEVENLABS_NARRATION_VOICE_LABEL,
  FINAL_ACADEMY_NARRATION_RECIPE_HASH,
  FINAL_ACADEMY_NARRATION_RECIPE_VERSION,
  visibleLessonContentHash,
} from "../src/lib/academy/narration-release";

const root = join(__dirname, "..");
const source = (path: string) =>
  readFileSync(join(root, path), "utf8");

describe("versioned Academy narration release", () => {
  it("pins both approved recipes and exact visible-content hash", () => {
    expect(ACTIVE_ACADEMY_NARRATION_VOICE_ID).toBe("bryce");
    expect(FINAL_ACADEMY_NARRATION_RECIPE_VERSION).toBe(
      "semantic-block-flow-v2-final",
    );
    expect(FINAL_ACADEMY_NARRATION_RECIPE_HASH).toBe(
      "0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe",
    );
    expect(FINAL_ELEVENLABS_NARRATION_VOICE_ID).toBe(
      "hpp4J3VqNfWAUOO0d1Us",
    );
    expect(FINAL_ELEVENLABS_NARRATION_VOICE_LABEL).toBe(
      "Bella (professional warm)",
    );
    expect(FINAL_ELEVENLABS_NARRATION_RECIPE_VERSION).toBe(
      "elevenlabs-bella-multilingual-v2-final-v1",
    );
    expect(FINAL_ELEVENLABS_NARRATION_RECIPE_HASH).toBe(
      "d43797ae6555cedd6cc1061abe71c89ac41a611c400029503f0e267e77b4edb3",
    );
    expect(
      academyNarrationVoiceLabel(
        FINAL_ELEVENLABS_NARRATION_VOICE_ID,
      ),
    ).toBe(FINAL_ELEVENLABS_NARRATION_VOICE_LABEL);
    const html = "<p>Exact visible content.</p>";
    expect(visibleLessonContentHash(html)).toBe(
      createHash("sha256").update(html).digest("hex"),
    );
    expect(visibleLessonContentHash(`${html} `)).not.toBe(
      visibleLessonContentHash(html),
    );
  });

  it("derives current, stale, missing, generating, and failed audio status without generation", () => {
    expect(
      academyNarrationAudioStatus({
        currentContentHash: "same",
        activeAudioSourceContentHash: "same",
      }),
    ).toBe("CURRENT");
    expect(
      academyNarrationAudioStatus({
        currentContentHash: "new",
        activeAudioSourceContentHash: "old",
      }),
    ).toBe("STALE");
    expect(
      academyNarrationAudioStatus({
        currentContentHash: "new",
      }),
    ).toBe("MISSING");
    expect(
      academyNarrationAudioStatus({
        currentContentHash: "new",
        activeAudioSourceContentHash: "old",
        pendingStatus: "GENERATING",
      }),
    ).toBe("GENERATING");
    expect(
      academyNarrationAudioStatus({
        currentContentHash: "new",
        activeAudioSourceContentHash: "old",
        pendingStatus: "FAILED",
      }),
    ).toBe("FAILED");
  });

  it("uses only additive release tables and never alters the legacy table", () => {
    const migration = source(
      "prisma/migrations/20260727120000_academy_versioned_narration_release/migration.sql",
    );
    for (const table of [
      "AcademyNarrationRelease",
      "AcademyNarrationAsset",
      "AcademyNarrationChunk",
      "AcademyNarrationDeployment",
      "AcademyNarrationPending",
    ]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
    expect(migration).not.toMatch(
      /(?:ALTER|UPDATE|DELETE FROM|DROP TABLE)\s+"AcademyLessonAudio"/u,
    );
  });

  it("keeps inactive fallback, active release status, and admin preview separate", () => {
    const statusRoute = source(
      "src/app/api/partner/academy/audio/[slug]/route.ts",
    );
    const bytesRoute = source(
      "src/app/api/partner/academy/audio/[slug]/[voice]/route.ts",
    );
    const previewRoute = source(
      "src/app/api/admin/academy/narration-preview/[releaseId]/[slug]/route.ts",
    );
    expect(statusRoute).toContain('releaseMode: "versioned"');
    expect(statusRoute).toContain("productionVoiceLocked: true");
    expect(statusRoute).toContain('releaseMode: "legacy"');
    expect(bytesRoute).toContain('source: "legacy"');
    expect(bytesRoute).toContain('source: "versioned"');
    expect(previewRoute).toContain("isSuperAdmin");
    expect(previewRoute).toContain("status: 401");
    expect(previewRoute).toContain("status: 403");
    expect(previewRoute).toContain("status: 206");
    expect(previewRoute).toContain("status: 416");
  });

  it("makes promotion and rollback atomic pointer-only operations", () => {
    for (const path of [
      "scripts/academy-narration-rollout.ts",
      "scripts/elevenlabs-final-rollout.ts",
    ]) {
      const rollout = source(path);
      expect(rollout).toMatch(
        /async function promote(?:Release)?\(/u,
      );
      expect(rollout).toMatch(
        /async function rollback(?:Release)?\(/u,
      );
      expect(rollout).toContain("prisma.$transaction");
      expect(rollout).not.toMatch(
        /academyLessonAudio\.(?:update|upsert|delete)/u,
      );
    }
  });

  it("migrates legacy preferences once and retains pitch preservation", () => {
    const player = source(
      "src/components/academy/audio-reader.tsx",
    );
    expect(player).toContain(
      "txp-narration-active-release-preferences-v1",
    );
    expect(player).toContain("status.defaultVoice");
    expect(player).toContain("setVoiceId(activeVoiceId)");
    expect(player).toContain(
      'window.localStorage.setItem(RATE_PREF_KEY, "1")',
    );
    expect(player).toContain("preservesPitch = true");
    expect(player).toContain("webkitPreservesPitch = true");
  });

  it("keeps stale-audio warnings admin-only and content saves generation-free", () => {
    const dashboard = source(
      "src/app/(admin)/admin/page.tsx",
    );
    const content = source(
      "src/app/(admin)/admin/academy/content/page.tsx",
    );
    const editor = source(
      "src/app/(admin)/admin/academy/content/[lessonId]/page.tsx",
    );
    const save = source(
      "src/lib/actions/academy-content.ts",
    );
    expect(dashboard).toContain(
      "Academy audio requires attention:",
    );
    expect(dashboard).toContain(
      "lessons changed after audio generation.",
    );
    expect(content).toContain(
      "Academy audio requires attention:",
    );
    expect(content).toContain(
      "requireSuperAdmin",
    );
    expect(editor).toContain(
      "Audio is out of date. This lesson has changed since its active narration was generated.",
    );
    expect(editor).toContain(
      "requireSuperAdmin",
    );
    expect(save).toContain(
      "academyNarrationPending.upsert",
    );
    expect(save).not.toMatch(
      /(?:elevenlabs|textToSpeech|generateAudio)\s*\(/iu,
    );
  });
});
