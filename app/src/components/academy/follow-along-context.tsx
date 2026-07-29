"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const FOLLOW_PREFERENCE_KEY =
  "txp-academy-follow-audio-v1";

export type AcademyFollowAlongCue = {
  blockIndex: number;
  semanticBlockId: string;
  sourceHtmlPath: string;
  startMs: number;
  endMs: number;
};

type FollowMode = "off" | "following" | "suspended";

type AcademyFollowAlongContextValue = {
  activeCue: AcademyFollowAlongCue | null;
  available: boolean;
  playing: boolean;
  mode: FollowMode;
  reducedMotion: boolean;
  showRequest: number;
  setActiveCue: (cue: AcademyFollowAlongCue | null) => void;
  setAvailable: (available: boolean) => void;
  setPlaying: (playing: boolean) => void;
  toggleFollow: () => void;
  suspendFollow: () => void;
  requestShowActive: () => void;
};

const AcademyFollowAlongContext =
  createContext<AcademyFollowAlongContextValue | null>(
    null,
  );

export function AcademyFollowAlongProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeCue, setActiveCueState] =
    useState<AcademyFollowAlongCue | null>(null);
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<FollowMode>("off");
  const [reducedMotion, setReducedMotion] =
    useState(false);
  const [showRequest, setShowRequest] = useState(0);

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const reduced = media.matches;
    setReducedMotion(reduced);
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(
        FOLLOW_PREFERENCE_KEY,
      );
    } catch {
      /* storage unavailable */
    }
    setMode(
      saved === "on"
        ? "following"
        : saved === "off" || reduced
          ? "off"
          : "following",
    );
    const onChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    if (media.addEventListener) {
      media.addEventListener("change", onChange);
    } else {
      media.addListener?.(onChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", onChange);
      } else {
        media.removeListener?.(onChange);
      }
    };
  }, []);

  const persistMode = useCallback((next: FollowMode) => {
    try {
      window.localStorage.setItem(
        FOLLOW_PREFERENCE_KEY,
        next === "following" ? "on" : "off",
      );
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleFollow = useCallback(() => {
    setMode((current) => {
      const next =
        current === "following" ? "off" : "following";
      persistMode(next);
      return next;
    });
  }, [persistMode]);

  const suspendFollow = useCallback(() => {
    setMode((current) =>
      current === "following" ? "suspended" : current,
    );
  }, []);

  const requestShowActive = useCallback(() => {
    setMode("following");
    persistMode("following");
    setShowRequest((value) => value + 1);
  }, [persistMode]);

  const setActiveCue = useCallback(
    (next: AcademyFollowAlongCue | null) => {
      setActiveCueState((current) => {
        if (current === next) return current;
        if (
          current &&
          next &&
          current.semanticBlockId ===
            next.semanticBlockId &&
          current.startMs === next.startMs &&
          current.endMs === next.endMs
        ) {
          return current;
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      activeCue,
      available,
      playing,
      mode,
      reducedMotion,
      showRequest,
      setActiveCue,
      setAvailable,
      setPlaying,
      toggleFollow,
      suspendFollow,
      requestShowActive,
    }),
    [
      activeCue,
      available,
      mode,
      playing,
      reducedMotion,
      requestShowActive,
      setActiveCue,
      showRequest,
      suspendFollow,
      toggleFollow,
    ],
  );

  return (
    <AcademyFollowAlongContext.Provider value={value}>
      {children}
    </AcademyFollowAlongContext.Provider>
  );
}

export function useAcademyFollowAlong() {
  const value = useContext(AcademyFollowAlongContext);
  if (!value) {
    throw new Error(
      "Academy follow-along components require their provider.",
    );
  }
  return value;
}
