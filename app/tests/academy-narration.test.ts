import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { audioTextHash, parseRange, AUDIO_ENGINE } from "../src/lib/academy/narration-core";
import { NARRATION_VOICES, DEFAULT_NARRATION_VOICE_ID, narrationVoice, rankDeviceVoice } from "../src/lib/academy/voices";

// ---------------------------------------------------------------------------
// The curated voice catalog: small, professional, stable ids, good default.
// ---------------------------------------------------------------------------

describe("narration voice catalog", () => {
  it("is a small curated list with a configured default that exists", () => {
    expect(NARRATION_VOICES.length).toBeGreaterThanOrEqual(2);
    expect(NARRATION_VOICES.length).toBeLessThanOrEqual(5);
    expect(narrationVoice(DEFAULT_NARRATION_VOICE_ID)).not.toBeNull();
    const ids = NARRATION_VOICES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only the license-verified public domain models (rejected models never reappear)", () => {
    const files = NARRATION_VOICES.map((v) => v.modelFile).join(" ");
    for (const rejected of ["ryan", "lessac", "hfc", "amy", "alan", "northern_english"]) {
      expect(files).not.toContain(rejected);
    }
    expect(files).toContain("en_US-bryce-medium.onnx");
    expect(files).toContain("en_US-ljspeech-high.onnx");
    expect(files).toContain("en_GB-cori-high.onnx");
  });

  it("unknown voice ids resolve to null (the bytes route answers 404, never a path)", () => {
    expect(narrationVoice("../../etc/passwd")).toBeNull();
    expect(narrationVoice("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The text hash: stable, trim-insensitive, content-sensitive.
// ---------------------------------------------------------------------------

describe("audioTextHash", () => {
  it("is stable and trim-insensitive but content-sensitive", () => {
    expect(audioTextHash("Hello world")).toBe(audioTextHash("  Hello world \n"));
    expect(audioTextHash("Hello world")).not.toBe(audioTextHash("Hello worlds"));
    expect(audioTextHash("x")).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// The Range parser: the exact contract iOS playback depends on.
// ---------------------------------------------------------------------------

describe("parseRange", () => {
  const total = 1000;
  it("returns null (whole file) without a header or with a malformed one", () => {
    expect(parseRange(null, total)).toBeNull();
    expect(parseRange("bites=0-1", total)).toBeNull();
    expect(parseRange("bytes=a-b", total)).toBeNull();
    expect(parseRange("bytes=-", total)).toBeNull();
  });
  it("parses the iOS probe bytes=0-1 to exactly two bytes", () => {
    expect(parseRange("bytes=0-1", total)).toEqual({ start: 0, end: 1 });
  });
  it("parses the open-ended form Chrome sends when seeking", () => {
    expect(parseRange("bytes=500-", total)).toEqual({ start: 500, end: 999 });
  });
  it("clamps an end beyond the file and honors the suffix form", () => {
    expect(parseRange("bytes=900-5000", total)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=-100", total)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=-5000", total)).toEqual({ start: 0, end: 999 });
  });
  it("answers unsatisfiable (416) for a start at or beyond the end", () => {
    expect(parseRange("bytes=1000-", total)).toBe("unsatisfiable");
    expect(parseRange("bytes=1500-1600", total)).toBe("unsatisfiable");
    expect(parseRange("bytes=-0", total)).toBe("unsatisfiable");
  });
});

// ---------------------------------------------------------------------------
// The fallback device-voice curation: garbage excluded, best ranked first.
// ---------------------------------------------------------------------------

describe("rankDeviceVoice", () => {
  it("excludes non-English and known junk voices", () => {
    expect(rankDeviceVoice("Google Deutsch", "de-DE")).toBe(-1);
    expect(rankDeviceVoice("eSpeak English", "en-GB")).toBe(-1);
    expect(rankDeviceVoice("Zarvox", "en-US")).toBe(-1);
    expect(rankDeviceVoice("Bubbles", "en-US")).toBe(-1);
  });
  it("prefers natural and premium voices over plain engine voices", () => {
    const natural = rankDeviceVoice("Microsoft Aria Online (Natural)", "en-US");
    const google = rankDeviceVoice("Google US English", "en-US");
    const plain = rankDeviceVoice("English United States", "en-US");
    expect(natural).toBeGreaterThan(google);
    expect(google).toBeGreaterThan(plain);
    expect(plain).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Wiring pins (source inspection): the pieces stay connected.
// ---------------------------------------------------------------------------

describe("narration wiring (source inspection)", () => {
  const root = join(__dirname, "..");
  const reader = readFileSync(join(root, "src/components/academy/audio-reader.tsx"), "utf8");
  const lessonPage = readFileSync(join(root, "src/app/(partner)/partner/academy/[slug]/page.tsx"), "utf8");
  const contentAction = readFileSync(join(root, "src/lib/actions/academy-content.ts"), "utf8");
  const bytesRoute = readFileSync(join(root, "src/app/api/partner/academy/audio/[slug]/[voice]/route.ts"), "utf8");
  const statusRoute = readFileSync(join(root, "src/app/api/partner/academy/audio/[slug]/route.ts"), "utf8");
  // The Dockerfile is not shipped into the image, so its pins are host-only
  // and skip when this suite runs inside the deployed container.
  let dockerfile = "";
  try {
    dockerfile = readFileSync(join(root, "Dockerfile"), "utf8");
  } catch {
    dockerfile = "";
  }
  const legacyGenScript = readFileSync(join(root, "scripts/generate-academy-audio.cjs"), "utf8");
  const releaseGenScript = readFileSync(join(root, "scripts/generate-final-piper-academy.ts"), "utf8");
  const lib = readFileSync(join(root, "src/lib/academy/lesson-audio.ts"), "utf8");

  it("the lesson page passes the slug so the player reaches the narration API", () => {
    expect(lessonPage).toMatch(
      /<AudioReader[\s\S]*?slug=\{m\.slug\}/u,
    );
  });

  it("the player keeps the engagement telemetry event and plays through a real audio element", () => {
    expect(reader).toContain("AUDIO_SECOND_EVENT");
    expect(reader).toContain("<audio");
    expect(reader).toContain("playbackRate");
    // Voice swaps stay inside the user gesture: set src, load, play synchronously.
    expect(reader).toContain("el.src = srcFor(id);");
    expect(reader).toContain("el.load();");
    // iOS: the resume position applies at canplay/playing, never loadedmetadata.
    expect(reader).toContain("onCanPlay={applyPendingSeek}");
    expect(reader).toContain("webkitPreservesPitch");
    expect(reader).toContain("ACTIVE_RELEASE_PREF_MIGRATION_KEY");
    expect(reader).toContain("status.defaultVoice");
    expect(reader).toContain("setVoiceId(activeVoiceId)");
    expect(reader).toContain('window.localStorage.setItem(RATE_PREF_KEY, "1")');
    // The src is NEVER a controlled React prop: a re-commit would re-run the
    // media load algorithm and abort the in-gesture play() after a voice swap.
    expect(reader).not.toContain("src={srcFor");
    // A failed status fetch retries; it can never be terminal for the session.
    expect(reader).toContain("if (!statusFailed) return;");
    // A manual seek or stop supersedes a pending voice-swap resume position.
    expect(reader.match(/pendingSeekFractionRef\.current = null;/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("a superadmin lesson save only records pending narration work", () => {
    expect(contentAction).toContain("academyNarrationPending.upsert");
    expect(contentAction).toContain('status: "PENDING"');
    expect(contentAction).not.toContain("ensureLessonAudio");
  });

  it("both routes mirror the lesson page access (partner session, unlocked module) and are dynamic", () => {
    for (const src of [bytesRoute, statusRoute]) {
      expect(src).toContain("getCurrentPartner()");
      expect(src).toContain("getModuleForLesson(current.partner.id, params.slug)");
      expect(src).toContain("data.unlocked");
      expect(src).toContain('export const dynamic = "force-dynamic"');
    }
  });

  it("the bytes route serves the iOS Range contract and never caches stale audio", () => {
    expect(bytesRoute).toContain("Accept-Ranges");
    expect(bytesRoute).toContain("Content-Range");
    expect(bytesRoute).toContain("status: 206");
    expect(bytesRoute).toContain("status: 416");
    expect(bytesRoute).toContain("private, no-store");
    // Range requests fetch ONLY the slice from the database (a 2 byte iOS
    // probe must not pull a multi-megabyte blob), and the metadata lookup
    // never selects the data column.
    expect(bytesRoute).toContain('substring("data" FROM');
    expect(bytesRoute).toContain('"AcademyNarrationAsset"');
    expect(bytesRoute).toContain('"AcademyLessonAudio"');
  });

  it.skipIf(!dockerfile)("container startup never generates narration", () => {
    expect(dockerfile).not.toContain("sleep 15");
    expect(dockerfile).not.toContain("narration-generate.log");
    expect(dockerfile).toContain("pnpm prisma migrate deploy && pnpm start");
  });

  it("the web library and retired legacy CLI cannot generate or update audio", () => {
    expect(lib).not.toContain("execFile");
    expect(lib).not.toContain("generateLessonAudio");
    expect(legacyGenScript).toContain("Legacy AcademyLessonAudio generation is disabled");
    expect(legacyGenScript).not.toContain("PrismaClient");
  });

  it.skipIf(!dockerfile)("the image bakes the pinned piper build, the three voice models, and lame", () => {
    expect(dockerfile).toContain("piper_linux_x86_64.tar.gz");
    expect(dockerfile).toContain("a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992");
    expect(dockerfile).toContain("en_US-bryce-medium.onnx");
    expect(dockerfile).toContain("en_US-ljspeech-high.onnx");
    expect(dockerfile).toContain("en_GB-cori-high.onnx");
    expect(dockerfile).toContain("sha256sum -c -");
    expect(dockerfile).toContain(" lame");
    expect(dockerfile).toContain("COPY --from=tts /opt/piper /opt/piper");
  });

  it("the release generator is pinned, resumable, and network isolated", () => {
    expect(releaseGenScript).toContain("semantic-block-flow-v2-final");
    expect(releaseGenScript).toContain("0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe");
    expect(releaseGenScript).toContain("networkIsolationState");
    expect(releaseGenScript).toContain("completed chunk drift");
    expect(releaseGenScript).toContain("COPYFILE_EXCL");
    expect(releaseGenScript).not.toContain("OpenRouter");
    expect(releaseGenScript).not.toContain("ElevenLabs");
    expect(releaseGenScript).not.toContain("fetch(");
  });
});
