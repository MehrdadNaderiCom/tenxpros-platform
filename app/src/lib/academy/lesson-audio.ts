import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { NARRATION_VOICES, narrationVoice } from "@/lib/academy/voices";

/**
 * Server-side lesson narration. Piper TTS synthesizes the lesson's audioText
 * to WAV inside the app container, lame encodes it to a small mono MP3, and
 * the bytes live in AcademyLessonAudio keyed by (lessonId, voice) with the
 * sha256 of the exact text they were generated from. A lesson edit changes
 * the hash, which makes every row stale; stale or missing rows are
 * regenerated in the background (every container start runs
 * scripts/generate-academy-audio.cjs in the background, and the superadmin
 * save hook and the status endpoint both call ensureLessonAudio).
 *
 * The generation never runs twice concurrently for the same (lesson, voice):
 * an in-process promise map dedupes triggers, and a global limiter keeps a
 * single synthesis running so the web process never starves.
 */

const PIPER_BIN = process.env.PIPER_BIN ?? "/opt/piper/piper";
const PIPER_VOICES_DIR = process.env.PIPER_VOICES_DIR ?? "/opt/piper/voices";
const LAME_BIN = process.env.LAME_BIN ?? "lame";

export { AUDIO_ENGINE, audioTextHash, parseRange } from "./narration-core";
import { AUDIO_ENGINE, audioTextHash } from "./narration-core";

function run(bin: string, args: string[], stdin?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile(bin, args, { maxBuffer: 1024 * 1024 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
    if (stdin !== undefined && child.stdin) {
      // A child that dies before draining stdin raises EPIPE on this stream;
      // without a listener that is an uncaught 'error' event that would kill
      // the whole server process. The execFile callback still reports the
      // failure (non-zero exit), so swallowing the stream error loses nothing.
      child.stdin.on("error", () => {});
      child.stdin.write(stdin);
      child.stdin.end();
    }
  });
}

/** Exact duration from the source WAV header (sample rate + data size). */
function wavDurationSeconds(wav: Buffer): number {
  if (wav.length < 44 || wav.toString("ascii", 0, 4) !== "RIFF") return 0;
  const sampleRate = wav.readUInt32LE(24);
  const bytesPerSecond = wav.readUInt32LE(28);
  if (!sampleRate || !bytesPerSecond) return 0;
  // Find the data chunk (piper writes a canonical 44-byte header, but scan to be safe).
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const chunkId = wav.toString("ascii", offset, offset + 4);
    const chunkSize = wav.readUInt32LE(offset + 4);
    if (chunkId === "data") return Math.round(chunkSize / bytesPerSecond);
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return Math.round((wav.length - 44) / bytesPerSecond);
}

/** True when the TTS toolchain is present in this environment (the image has it; dev machines may not). */
export async function narrationAvailable(): Promise<boolean> {
  try {
    await fs.access(PIPER_BIN);
    return true;
  } catch {
    return false;
  }
}

/**
 * Synthesize one lesson in one voice and upsert the row. Throws on toolchain
 * failure; callers decide whether that is fatal (the pre-generate script) or
 * logged and retried later (the background ensure path).
 */
export async function generateLessonAudio(lessonId: string, voiceId: string): Promise<void> {
  const voice = narrationVoice(voiceId);
  if (!voice) throw new Error(`Unknown narration voice: ${voiceId}`);
  const lesson = await prisma.academyLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, audioText: true },
  });
  if (!lesson || !lesson.audioText.trim()) return;

  const text = lesson.audioText.trim();
  const hash = audioTextHash(text);
  // Piper treats every stdin LINE as its own utterance; collapse all
  // whitespace so paragraph breaks become ordinary sentence pauses. The hash
  // is computed on the raw text so it always matches the status endpoint.
  const speakable = text.replace(/\s+/g, " ");
  const modelPath = join(PIPER_VOICES_DIR, voice.modelFile);
  const stamp = `${lessonId}-${voiceId}-${Date.now()}`;
  const wavPath = join(tmpdir(), `lesson-${stamp}.wav`);
  const mp3Path = join(tmpdir(), `lesson-${stamp}.mp3`);

  try {
    await run(PIPER_BIN, [
      "-q",
      "--model", modelPath,
      "--config", `${modelPath}.json`,
      "--output_file", wavPath,
      "--sentence_silence", "0.35",
    ], speakable);
    const wav = await fs.readFile(wavPath);
    const durationSeconds = wavDurationSeconds(wav);
    // Mono CBR 64 kbps: small, seek-accurate, and it plays everywhere.
    await run(LAME_BIN, ["--quiet", "-m", "m", "-b", "64", "--cbr", wavPath, mp3Path]);
    const mp3 = await fs.readFile(mp3Path);
    await prisma.academyLessonAudio.upsert({
      where: { lessonId_voice: { lessonId, voice: voiceId } },
      update: { textHash: hash, engine: AUDIO_ENGINE, sizeBytes: mp3.length, durationSeconds, data: mp3 },
      create: {
        lessonId,
        voice: voiceId,
        textHash: hash,
        engine: AUDIO_ENGINE,
        sizeBytes: mp3.length,
        durationSeconds,
        data: mp3,
      },
    });
  } finally {
    await fs.rm(wavPath, { force: true }).catch(() => {});
    await fs.rm(mp3Path, { force: true }).catch(() => {});
  }
}

// In-process dedupe and a small global limiter for background generation.
const inFlight = new Map<string, Promise<void>>();
let running = 0;
const queue: Array<() => void> = [];

function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  // One synthesis at a time in the web process: Piper saturates several cores,
  // and the app must stay responsive while audio regenerates in the background.
  const MAX = 1;
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      running += 1;
      fn().then(resolve, reject).finally(() => {
        running -= 1;
        const next = queue.shift();
        if (next) next();
      });
    };
    if (running < MAX) start();
    else queue.push(start);
  });
}

/**
 * Make sure every catalog voice for this lesson is generated from the current
 * text. Missing and stale rows are synthesized in the background; the call
 * returns immediately. Safe to call often (status endpoint, save hook).
 */
export function ensureLessonAudio(lessonId: string, currentText: string): void {
  const hash = audioTextHash(currentText.trim());
  if (!currentText.trim()) return;
  void (async () => {
    if (!(await narrationAvailable())) return;
    const rows = await prisma.academyLessonAudio.findMany({
      where: { lessonId },
      select: { voice: true, textHash: true, engine: true },
    });
    const fresh = new Set(
      rows.filter((r) => r.textHash === hash && r.engine === AUDIO_ENGINE).map((r) => r.voice),
    );
    for (const v of NARRATION_VOICES) {
      if (fresh.has(v.id)) continue;
      const key = `${lessonId}:${v.id}`;
      if (inFlight.has(key)) continue;
      const p = withSlot(() => generateLessonAudio(lessonId, v.id))
        .catch((err) => {
          console.error(`lesson audio generation failed for ${key}:`, err);
        })
        .finally(() => {
          inFlight.delete(key);
        });
      inFlight.set(key, p);
    }
  })();
}
