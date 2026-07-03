"use client";

import { useEffect, useRef } from "react";
import { recordAcademyLessonBeat, recordAcademyModuleOpened } from "@/lib/actions/academy";

/**
 * Invisible engagement beacon for a module page. On mount it records one page
 * view, then sends a reading heartbeat every BEAT_INTERVAL_SECONDS while the
 * tab is actually visible, carrying the deepest scroll reached and the seconds
 * of lesson audio played since the last beat (the audio reader announces each
 * played second on a window event). The server clamps every credit, so nothing
 * this component sends can inflate time. Renders nothing; disabled in admin
 * preview so an admin never writes a partner's analytics.
 */
const BEAT_INTERVAL_MS = 20_000; // matches BEAT_INTERVAL_SECONDS server-side
export const AUDIO_SECOND_EVENT = "txp-academy-audio-second";

export function TelemetryBeacon({ slug, disabled = false }: { slug: string; disabled?: boolean }) {
  const maxScrollRef = useRef(0);
  const audioSecondsRef = useRef(0);

  useEffect(() => {
    if (disabled) return;

    // One view per mount. Errors are irrelevant to the partner and swallowed.
    recordAcademyModuleOpened(slug).catch(() => {});

    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const pct = total > 0 ? Math.round(((window.scrollY || doc.scrollTop) / total) * 100) : 100;
      if (pct > maxScrollRef.current) maxScrollRef.current = Math.min(100, pct);
    };
    const onAudioSecond = () => {
      audioSecondsRef.current += 1;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(AUDIO_SECOND_EVENT, onAudioSecond);
    onScroll();

    const timer = window.setInterval(() => {
      // Only beat while the tab is visible: a hidden tab earns no reading time
      // (the server clamp also caps whatever gap the pause creates).
      if (document.visibilityState !== "visible") return;
      const audioDelta = audioSecondsRef.current;
      audioSecondsRef.current = 0;
      recordAcademyLessonBeat({ slug, scrollPct: maxScrollRef.current, audioSecondsDelta: audioDelta }).catch(() => {});
    }, BEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(AUDIO_SECOND_EVENT, onAudioSecond);
    };
  }, [slug, disabled]);

  return null;
}
