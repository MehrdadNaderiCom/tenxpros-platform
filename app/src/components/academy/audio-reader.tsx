"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";

/**
 * Split text into short, sentence-sized chunks. Mobile speech engines (notably
 * iOS Safari, and Chrome after ~15s) silently drop or cut off a single long
 * utterance, so we queue several short ones instead of one long one.
 */
function chunkText(text: string, max = 200): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (buf && (buf + s).length > max) {
      chunks.push(buf.trim());
      buf = "";
    }
    buf += s;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

/**
 * Voices are selected by a name + lang composite, NOT by voiceURI: several
 * Android engines report the SAME voiceURI for different voices, so a URI
 * lookup always resolves to the first match and the selection silently never
 * changes. Name plus lang is unique in practice and survives list reloads.
 */
function voiceKey(v: SpeechSynthesisVoice): string {
  return `${v.name}__${v.lang}`;
}

/**
 * Free, built-in audio reader using the browser SpeechSynthesis API. Reads the
 * lesson's plain audioText. Controls are buttons (keyboard operable). No motion
 * is animated, so reduced-motion preferences are respected by default.
 *
 * Voice and speed changes apply IMMEDIATELY, also mid-playback: the reader
 * restarts from the chunk currently being spoken with the new settings, inside
 * the user's select gesture (which keeps iOS happy). A generation counter
 * guards state against stale onend events from the cancelled queue.
 */
export function AudioReader({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceSel, setVoiceSel] = useState("");
  // The chunk currently being spoken, so a settings change can resume in place.
  const currentChunkRef = useRef(0);
  // Bumped on every (re)start; stale utterance events compare against it.
  const generationRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  // Keepalive: Chrome and some mobile engines auto-pause long speech after a few
  // seconds. While playing and not user-paused, nudge the engine to keep going.
  useEffect(() => {
    if (!playing || paused) return;
    const id = window.setInterval(() => {
      const s = window.speechSynthesis;
      if (s.speaking && !s.paused) s.resume();
    }, 8000);
    return () => window.clearInterval(id);
  }, [playing, paused]);

  // Engagement telemetry: announce each second of actual playback on a window
  // event; the telemetry beacon (when present) accumulates and reports it.
  useEffect(() => {
    if (!playing || paused) return;
    const id = window.setInterval(() => {
      window.dispatchEvent(new CustomEvent("txp-academy-audio-second"));
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, paused]);

  /**
   * Start (or restart) speaking from a chunk index with the given settings.
   * Settings are passed explicitly because React state updates are async and a
   * select's change handler must restart with the NEW value, not the stale one.
   */
  const startFrom = (fromIndex: number, opts?: { rate?: number; voiceSel?: string }) => {
    const synth = window.speechSynthesis;
    const gen = ++generationRef.current;
    // Clear any stuck or queued speech, and unstick a globally-paused engine
    // (iOS Safari can leave speechSynthesis paused, which silently blocks speak).
    synth.cancel();
    synth.resume();
    const chunks = chunkText(text);
    if (chunks.length === 0) return;
    const from = Math.min(Math.max(0, fromIndex), chunks.length - 1);
    const effRate = opts?.rate ?? rate;
    const effSel = opts?.voiceSel ?? voiceSel;
    const v = voices.find((vv) => voiceKey(vv) === effSel) ?? null;
    // Queue every remaining chunk synchronously inside this gesture (required by iOS).
    for (let i = from; i < chunks.length; i++) {
      const u = new SpeechSynthesisUtterance(chunks[i]);
      u.rate = effRate;
      if (v) {
        u.voice = v;
        // Some Android engines ignore `voice` unless the utterance lang matches it.
        u.lang = v.lang;
      }
      const idx = i;
      u.onstart = () => {
        if (generationRef.current === gen) currentChunkRef.current = idx;
      };
      if (i === chunks.length - 1) {
        u.onend = () => {
          // A cancelled queue (settings restart) also fires onend; only the
          // current generation may declare playback finished.
          if (generationRef.current !== gen) return;
          setPlaying(false);
          setPaused(false);
          currentChunkRef.current = 0;
        };
      }
      synth.speak(u);
    }
    setPlaying(true);
    setPaused(false);
  };

  const start = () => {
    currentChunkRef.current = 0;
    startFrom(0);
  };

  /** Apply a settings change: live-restart from the current chunk when playing. */
  const applySettings = (opts: { rate?: number; voiceSel?: string }) => {
    if (opts.rate !== undefined) setRate(opts.rate);
    if (opts.voiceSel !== undefined) setVoiceSel(opts.voiceSel);
    if (playing) startFrom(currentChunkRef.current, opts);
  };

  const stop = () => {
    generationRef.current++;
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    currentChunkRef.current = 0;
  };

  if (!supported) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Listen</span>
      {!playing ? (
        <button type="button" onClick={start} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-navy-900 px-3 text-sm font-medium text-white hover:bg-navy-700">
          <Play className="h-4 w-4" aria-hidden="true" /> Play
        </button>
      ) : paused ? (
        <button type="button" onClick={() => { window.speechSynthesis.resume(); setPaused(false); }} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-navy-900 px-3 text-sm font-medium text-white hover:bg-navy-700">
          <Play className="h-4 w-4" aria-hidden="true" /> Resume
        </button>
      ) : (
        <button type="button" onClick={() => { window.speechSynthesis.pause(); setPaused(true); }} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-navy-900 hover:bg-neutral-50">
          <Pause className="h-4 w-4" aria-hidden="true" /> Pause
        </button>
      )}
      <button type="button" onClick={stop} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-navy-900 hover:bg-neutral-50">
        <Square className="h-4 w-4" aria-hidden="true" /> Stop
      </button>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        Speed
        <select
          value={rate}
          onChange={(e) => applySettings({ rate: Number(e.target.value) })}
          className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-sm"
        >
          {[0.75, 1, 1.25, 1.5].map((r) => (
            <option key={r} value={r}>{r}x</option>
          ))}
        </select>
      </label>
      {voices.length > 0 ? (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          Voice
          <select
            value={voiceSel}
            onChange={(e) => applySettings({ voiceSel: e.target.value })}
            className="h-8 max-w-[12rem] rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="">System default</option>
            {voices.map((v, i) => (
              // Key carries the index too: some Android engines report duplicate
              // name+lang pairs, and duplicate keys would drop options silently.
              <option key={`${voiceKey(v)}_${i}`} value={voiceKey(v)}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
