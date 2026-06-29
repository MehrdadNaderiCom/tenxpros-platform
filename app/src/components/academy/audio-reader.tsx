"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";

/**
 * Free, built-in audio reader using the browser SpeechSynthesis API. Reads the
 * lesson's plain audioText. Controls are buttons (keyboard operable). No motion
 * is animated, so reduced-motion preferences are respected by default.
 */
export function AudioReader({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  const start = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    const v = voices.find((vv) => vv.voiceURI === voiceURI);
    if (v) u.voice = v;
    u.onend = () => {
      setPlaying(false);
      setPaused(false);
    };
    uttRef.current = u;
    synth.speak(u);
    setPlaying(true);
    setPaused(false);
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
      <button type="button" onClick={() => { window.speechSynthesis.cancel(); setPlaying(false); setPaused(false); }} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-navy-900 hover:bg-neutral-50">
        <Square className="h-4 w-4" aria-hidden="true" /> Stop
      </button>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        Speed
        <select
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
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
            value={voiceURI}
            onChange={(e) => setVoiceURI(e.target.value)}
            className="h-8 max-w-[12rem] rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="">System default</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
