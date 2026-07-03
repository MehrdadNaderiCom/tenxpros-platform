/**
 * Pre-generate the Partner Academy lesson narration for every curated voice.
 *
 *   node scripts/generate-academy-audio.cjs [--voices bryce,linda,cori] [--force]
 *
 * Runs inside the app container after a deploy (and safely anytime): for each
 * lesson with audioText and each curated voice, synthesize with Piper, encode
 * to mono 64 kbps CBR MP3 with lame, and upsert AcademyLessonAudio keyed by
 * the sha256 of the text. Rows whose hash and engine already match are
 * skipped, so re-runs are cheap. Exits non-zero if any generation failed.
 *
 * The voice list here mirrors src/lib/academy/voices.ts (this script is plain
 * CJS and cannot import the TS module; keep the two in sync).
 */
const { createHash } = require("node:crypto");
const { execFile } = require("node:child_process");
const { promises: fs } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { PrismaClient } = require("@prisma/client");

const PIPER_BIN = process.env.PIPER_BIN || "/opt/piper/piper";
const PIPER_VOICES_DIR = process.env.PIPER_VOICES_DIR || "/opt/piper/voices";
const LAME_BIN = process.env.LAME_BIN || "lame";
const AUDIO_ENGINE = "piper-2023.11.14-2/lame-64k-mono";
const WORKERS = Number(process.env.AUDIO_WORKERS || 2);

const VOICES = [
  { id: "bryce", modelFile: "en_US-bryce-medium.onnx" },
  { id: "linda", modelFile: "en_US-ljspeech-high.onnx" },
  { id: "cori", modelFile: "en_GB-cori-high.onnx" },
];

const prisma = new PrismaClient();

function sha256(text) {
  return createHash("sha256").update(text.trim()).digest("hex");
}

function run(bin, args, stdin) {
  return new Promise((resolve, reject) => {
    const child = execFile(bin, args, { maxBuffer: 1024 * 1024 }, (err) => (err ? reject(err) : resolve()));
    if (stdin !== undefined && child.stdin) {
      // Swallow stream errors (EPIPE when the child dies early): the execFile
      // callback still rejects, so the per-job failure counting keeps working
      // instead of the whole run dying on an uncaught 'error' event.
      child.stdin.on("error", () => {});
      child.stdin.write(stdin);
      child.stdin.end();
    }
  });
}

function wavDurationSeconds(wav) {
  if (wav.length < 44 || wav.toString("ascii", 0, 4) !== "RIFF") return 0;
  const bytesPerSecond = wav.readUInt32LE(28);
  if (!bytesPerSecond) return 0;
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const chunkId = wav.toString("ascii", offset, offset + 4);
    const chunkSize = wav.readUInt32LE(offset + 4);
    if (chunkId === "data") return Math.round(chunkSize / bytesPerSecond);
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return Math.round((wav.length - 44) / bytesPerSecond);
}

async function generateOne(lesson, voice, force) {
  const text = lesson.audioText.trim();
  const hash = sha256(text);
  if (!force) {
    const existing = await prisma.academyLessonAudio.findUnique({
      where: { lessonId_voice: { lessonId: lesson.id, voice: voice.id } },
      select: { textHash: true, engine: true },
    });
    if (existing && existing.textHash === hash && existing.engine === AUDIO_ENGINE) return "skipped";
  }
  const modelPath = join(PIPER_VOICES_DIR, voice.modelFile);
  const stamp = `${lesson.id}-${voice.id}-${process.pid}-${Math.floor(Math.random() * 1e9)}`;
  const wavPath = join(tmpdir(), `gen-${stamp}.wav`);
  const mp3Path = join(tmpdir(), `gen-${stamp}.mp3`);
  try {
    // Collapse whitespace: piper treats each stdin line as its own utterance.
    await run(PIPER_BIN, ["-q", "--model", modelPath, "--config", `${modelPath}.json`, "--output_file", wavPath, "--sentence_silence", "0.35"], text.replace(/\s+/g, " "));
    const wav = await fs.readFile(wavPath);
    const durationSeconds = wavDurationSeconds(wav);
    await run(LAME_BIN, ["--quiet", "-m", "m", "-b", "64", "--cbr", wavPath, mp3Path]);
    const mp3 = await fs.readFile(mp3Path);
    await prisma.academyLessonAudio.upsert({
      where: { lessonId_voice: { lessonId: lesson.id, voice: voice.id } },
      update: { textHash: hash, engine: AUDIO_ENGINE, sizeBytes: mp3.length, durationSeconds, data: mp3 },
      create: { lessonId: lesson.id, voice: voice.id, textHash: hash, engine: AUDIO_ENGINE, sizeBytes: mp3.length, durationSeconds, data: mp3 },
    });
    return `generated ${durationSeconds}s ${(mp3.length / 1024 / 1024).toFixed(1)}MB`;
  } finally {
    await fs.rm(wavPath, { force: true }).catch(() => {});
    await fs.rm(mp3Path, { force: true }).catch(() => {});
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const voicesArg = args.find((a) => a.startsWith("--voices"));
  const only = voicesArg ? (voicesArg.split("=")[1] || args[args.indexOf(voicesArg) + 1] || "").split(",").filter(Boolean) : null;
  const voices = only ? VOICES.filter((v) => only.includes(v.id)) : VOICES;

  await fs.access(PIPER_BIN);
  const lessons = await prisma.academyLesson.findMany({
    select: { id: true, title: true, audioText: true, module: { select: { slug: true } } },
    orderBy: { moduleId: "asc" },
  });
  const jobs = [];
  for (const lesson of lessons) {
    if (!lesson.audioText || !lesson.audioText.trim()) continue;
    for (const voice of voices) jobs.push({ lesson, voice });
  }
  console.log(`lesson narration: ${jobs.length} jobs (${lessons.length} lessons x ${voices.length} voices), ${WORKERS} workers`);

  let failed = 0;
  let done = 0;
  const queue = jobs.slice();
  async function worker() {
    for (;;) {
      const job = queue.shift();
      if (!job) return;
      const label = `${job.lesson.module.slug}/${job.voice.id}`;
      const startedAt = Date.now();
      try {
        const result = await generateOne(job.lesson, job.voice, force);
        done += 1;
        console.log(`  [${done}/${jobs.length}] ${label}: ${result} (${Math.round((Date.now() - startedAt) / 1000)}s)`);
      } catch (err) {
        failed += 1;
        done += 1;
        console.error(`  [${done}/${jobs.length}] ${label}: FAILED: ${err && err.message ? err.message : err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: WORKERS }, () => worker()));
  const rows = await prisma.academyLessonAudio.count();
  console.log(`narration rows in DB: ${rows}; failures: ${failed}`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
