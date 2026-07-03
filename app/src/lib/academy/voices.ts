/**
 * The curated narration voice catalog. This list IS the voice picker: partners
 * only ever see these professional, hand-picked voices, on every device and
 * browser alike, because the audio is synthesized on the server (Piper TTS
 * inside the app container) and the browser just plays an MP3. No device voice
 * list, no engine-dependent default, no garbage entries.
 *
 * The model files are baked into the app image by the Dockerfile (pinned URLs
 * with checksums). All three models carry a public domain model card with no
 * restricted lineage (verified against rhasspy/piper-voices; note that
 * ryan/lessac/hfc/amy/alan were REJECTED for non-commercial or restricted
 * licenses; do not add a voice without checking its MODEL_CARD).
 *
 * The ids here are stable API values: they appear in URLs and in the
 * AcademyLessonAudio.voice column, so treat them as append-only.
 */

export type NarrationVoice = {
  /** Stable id used in routes and DB rows. Append-only. */
  id: string;
  /** Human label shown in the picker. */
  label: string;
  /** Piper model file name (without directory), as baked into the image. */
  modelFile: string;
  /** One-line description shown next to the label. */
  tagline: string;
};

export const NARRATION_VOICES: NarrationVoice[] = [
  {
    id: "bryce",
    label: "Bryce (US male)",
    modelFile: "en_US-bryce-medium.onnx",
    tagline: "Clear, professional US narrator",
  },
  {
    id: "linda",
    label: "Linda (US female)",
    modelFile: "en_US-ljspeech-high.onnx",
    tagline: "Warm, articulate US narrator",
  },
  {
    id: "cori",
    label: "Cori (UK female)",
    modelFile: "en_GB-cori-high.onnx",
    tagline: "Composed British narrator",
  },
];

/** The voice used when the partner has not picked one. */
export const DEFAULT_NARRATION_VOICE_ID = "bryce";

export function narrationVoice(id: string): NarrationVoice | null {
  return NARRATION_VOICES.find((v) => v.id === id) ?? null;
}

/**
 * Rank a DEVICE voice for the fallback speech-synthesis reader (shown only
 * while the studio narration is being prepared, or where the toolchain is
 * absent). Higher is better; -1 excludes. English only, known junk excluded,
 * natural and premium engines first, so even the fallback default is the
 * best voice the device has instead of whatever the OS lists first.
 */
export function rankDeviceVoice(name: string, lang: string): number {
  if (!/^en[-_]/i.test(lang)) return -1;
  const n = name.toLowerCase();
  if (/espeak|robot|whisper|bad news|good news|bells|boing|bubbles|cellos|albert|jester|organ|superstar|trinoids|wobble|zarvox/.test(n)) return -1;
  if (/natural|neural/.test(n)) return 6;
  if (/premium|enhanced/.test(n)) return 5;
  if (/google/.test(n)) return 4;
  if (/samantha|daniel|karen|moira|tessa|arthur|martha/.test(n)) return 3;
  if (/microsoft/.test(n)) return 2;
  return 0;
}
