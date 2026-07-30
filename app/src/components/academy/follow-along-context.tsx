"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AcademyFollowAlongCue = {
  blockIndex: number;
  semanticBlockId: string;
  sourceHtmlPath: string;
  startMs: number;
  endMs: number;
};

type AcademyFollowAlongContextValue = {
  activeCue: AcademyFollowAlongCue | null;
  playing: boolean;
  setActiveCue: (cue: AcademyFollowAlongCue | null) => void;
  setPlaying: (playing: boolean) => void;
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
  const [playing, setPlaying] = useState(false);

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
      playing,
      setActiveCue,
      setPlaying,
    }),
    [activeCue, playing, setActiveCue],
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
