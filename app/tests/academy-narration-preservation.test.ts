import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import { htmlToPlainText, sanitizeLessonHtml } from "../src/lib/academy/lesson-html";
import { AUDIO_ENGINE } from "../src/lib/academy/narration-core";
import { DEFAULT_NARRATION_VOICE_ID, NARRATION_VOICES } from "../src/lib/academy/voices";

/**
 * Phase 0/1 preservation guard.
 *
 * The semantic layer is additive analysis code only. Until a paid-provider
 * migration is explicitly approved, it must not alter the live Piper recipe,
 * trigger network traffic, write audio, or become reachable from production
 * generation and delivery paths.
 */

const appRoot = join(__dirname, "..");
const narrationDir = join(appRoot, "src/lib/academy/narration");
const narrationFiles = [
  "contracts.ts",
  "approved-pronunciations.ts",
  "alignment.ts",
  "normalization.ts",
  "policy.ts",
  "recipe.ts",
  "scoped-pronunciation.ts",
  "segmentation.ts",
  "semantic-renderer.ts",
  "preview.ts",
  "warnings.ts",
  "chunking.ts",
].map((name) => join(narrationDir, name));

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("the Phase 0/1 narration layer remains pure and offline", () => {
  it("has the expected pure contract, recipe, normalization, renderer, preview, and warning modules", () => {
    for (const path of narrationFiles) {
      expect(existsSync(path), path).toBe(true);
    }
  });

  it("does not import a provider, Prisma, child processes, or environment secrets", () => {
    const combined = narrationFiles.map(source).join("\n");
    const forbidden: Array<[string, RegExp]> = [
      ["network fetch", /\bfetch\s*\(/],
      ["network client import", /\bfrom\s+["'](?:@elevenlabs|axios|undici|node:https?)\b/i],
      ["network client require", /\brequire\s*\(\s*["'](?:@elevenlabs|axios|undici|node:https?)/i],
      ["ElevenLabs credential/header", /\b(?:xi-api-key|ELEVENLABS_API_KEY)\b/i],
      ["Prisma import", /@prisma\/client|@\/lib\/prisma/],
      ["environment access", /\bprocess\.env\b/],
      ["child process", /node:child_process|\b(?:execFile|spawn)\s*\(/],
      ["filesystem write", /\b(?:writeFile|appendFile|unlink|rm)\s*\(/],
    ];

    for (const [label, pattern] of forbidden) {
      expect(combined, label).not.toMatch(pattern);
    }
  });

  it("has no provider SDK or external TTS dependency in the Phase 0/1 package", () => {
    const pkg = JSON.parse(source(join(appRoot, "package.json"))) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    expect(
      Object.keys(dependencies).filter((name) => /elevenlabs|text-to-speech|tts-sdk/i.test(name)),
    ).toEqual([]);
  });
});

describe("the legacy Piper assets are preserved by the versioned release path", () => {
  it("keeps the existing engine and three stable voice ids", () => {
    expect(AUDIO_ENGINE).toBe("piper-2023.11.14-2/lame-64k-mono");
    expect(DEFAULT_NARRATION_VOICE_ID).toBe("bryce");
    expect(NARRATION_VOICES.map((voice) => voice.id)).toEqual(["bryce", "linda", "cori"]);
  });

  it("keeps every learner and web-process path generation-free", () => {
    const webSources = [
      source(join(appRoot, "src/lib/academy/lesson-audio.ts")),
      source(join(appRoot, "src/app/api/partner/academy/audio/[slug]/route.ts")),
      source(join(appRoot, "src/app/api/partner/academy/audio/[slug]/[voice]/route.ts")),
      source(join(appRoot, "src/lib/actions/academy-content.ts")),
    ];
    for (const runtime of webSources) {
      expect(runtime).not.toContain("generateLessonAudio");
      expect(runtime).not.toContain("ensureLessonAudio");
      expect(runtime).not.toContain("synthesizePiper");
    }
  });

  it("moves Piper synthesis into the isolated immutable release CLI and keeps Range delivery", () => {
    const runtime = source(join(appRoot, "src/lib/academy/lesson-audio.ts"));
    const batch = source(join(appRoot, "scripts/generate-academy-audio.cjs"));
    const releaseBatch = source(
      join(appRoot, "scripts/generate-final-piper-academy.ts"),
    );
    const bytesRoute = source(
      join(appRoot, "src/app/api/partner/academy/audio/[slug]/[voice]/route.ts"),
    );

    expect(runtime).not.toContain("execFile");
    expect(batch).toContain("Legacy AcademyLessonAudio generation is disabled");
    expect(releaseBatch).toContain("synthesizePiper");
    expect(releaseBatch).toContain("encodeLame");
    expect(releaseBatch).toContain("sentenceSilenceSeconds: 0.15");
    expect(releaseBatch).toContain("networkIsolationState");
    expect(bytesRoute).toContain("Accept-Ranges");
    expect(bytesRoute).toContain("Content-Range");
    expect(bytesRoute).toContain('substring("data" FROM');
    expect(bytesRoute).toContain("private, no-store");
  });

  it("keeps the existing audio-row identity so no Piper row is rewritten by analysis", () => {
    const schema = source(join(appRoot, "prisma/schema.prisma"));
    const audioModel = schema.match(
      /model AcademyLessonAudio \{[\s\S]*?\n\}/,
    )?.[0];

    expect(audioModel).toBeDefined();
    expect(audioModel).toContain("@@unique([lessonId, voice])");
    expect(audioModel).not.toMatch(/providerRequestId|billedCharacters|externalVoiceId/i);
    expect(schema).toContain("model AcademyNarrationRelease");
    expect(schema).toContain("model AcademyNarrationAsset");
    expect(schema).toContain("model AcademyNarrationChunk");
    expect(schema).toContain("model AcademyNarrationDeployment");
  });
});

describe("canonical Academy content is preserved", () => {
  it("keeps all 17 canonical lessons complete, unique, and deterministically hashable", () => {
    const rows = ACADEMY_MODULES.map((module) => {
      const bodyHtml = module.bodyHtml ? sanitizeLessonHtml(module.bodyHtml) : null;
      const text = bodyHtml ? htmlToPlainText(bodyHtml) : module.lesson;
      return {
        slug: module.slug,
        text,
        hash: createHash("sha256").update(text.trim()).digest("hex"),
      };
    });

    expect(rows).toHaveLength(17);
    // Editorial revisions may intentionally change a few characters. This is a
    // gross-loss guard, not a reason to freeze approved visible copy forever.
    expect(rows.reduce((total, row) => total + row.text.length, 0)).toBeGreaterThan(170_000);
    expect(rows.every((row) => row.text.length > 1_000)).toBe(true);
    expect(new Set(rows.map((row) => row.slug)).size).toBe(17);
    expect(new Set(rows.map((row) => row.hash)).size).toBe(17);
    expect(rows.every((row) => /^[a-f0-9]{64}$/.test(row.hash))).toBe(true);
  });
});
