"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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

export type AcademySectionAudioOptions = {
  restart?: boolean;
  play?: boolean;
};

export function academyFollowAlongElementPath(
  sourceHtmlPath: string,
): string {
  return sourceHtmlPath.replace(
    /#segment\[\d+\]$/u,
    "",
  );
}

type AcademyFollowAlongContextValue = {
  activeCue: AcademyFollowAlongCue | null;
  audioDurationMs: number | null;
  playing: boolean;
  sectionCues: readonly AcademyFollowAlongCue[];
  activateSectionAudio: (
    cue: AcademyFollowAlongCue,
  ) => void;
  restartSectionAudio: (
    cue: AcademyFollowAlongCue,
  ) => void;
  registerSectionAudioController: (
    controller: (
      cue: AcademyFollowAlongCue,
      options?: AcademySectionAudioOptions,
    ) => void,
  ) => () => void;
  setActiveCue: (cue: AcademyFollowAlongCue | null) => void;
  setAudioDurationMs: (durationMs: number | null) => void;
  setPlaying: (playing: boolean) => void;
  setSectionCues: (
    cues: readonly AcademyFollowAlongCue[],
  ) => void;
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
  const [audioDurationMs, setAudioDurationMs] = useState<
    number | null
  >(null);
  const [playing, setPlaying] = useState(false);
  const [sectionCues, setSectionCuesState] = useState<
    readonly AcademyFollowAlongCue[]
  >([]);
  const sectionAudioControllerRef = useRef<
    ((
      cue: AcademyFollowAlongCue,
      options?: AcademySectionAudioOptions,
    ) => void) | null
  >(null);

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

  const setSectionCues = useCallback(
    (next: readonly AcademyFollowAlongCue[]) => {
      setSectionCuesState((current) => {
        if (
          current.length === next.length &&
          current.every((cue, index) => {
            const candidate = next[index];
            return (
              cue.semanticBlockId ===
                candidate.semanticBlockId &&
              cue.sourceHtmlPath ===
                candidate.sourceHtmlPath &&
              cue.startMs === candidate.startMs &&
              cue.endMs === candidate.endMs
            );
          })
        ) {
          return current;
        }
        return [...next];
      });
    },
    [],
  );

  const registerSectionAudioController = useCallback(
    (
      controller: (
        cue: AcademyFollowAlongCue,
        options?: AcademySectionAudioOptions,
      ) => void,
    ) => {
      sectionAudioControllerRef.current = controller;
      return () => {
        if (
          sectionAudioControllerRef.current === controller
        ) {
          sectionAudioControllerRef.current = null;
        }
      };
    },
    [],
  );

  const activateSectionAudio = useCallback(
    (cue: AcademyFollowAlongCue) => {
      sectionAudioControllerRef.current?.(cue);
    },
    [],
  );

  const restartSectionAudio = useCallback(
    (cue: AcademyFollowAlongCue) => {
      sectionAudioControllerRef.current?.(cue, {
        restart: true,
        play: true,
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      activeCue,
      audioDurationMs,
      playing,
      sectionCues,
      activateSectionAudio,
      restartSectionAudio,
      registerSectionAudioController,
      setActiveCue,
      setAudioDurationMs,
      setPlaying,
      setSectionCues,
    }),
    [
      activeCue,
      activateSectionAudio,
      audioDurationMs,
      playing,
      registerSectionAudioController,
      restartSectionAudio,
      sectionCues,
      setActiveCue,
      setAudioDurationMs,
      setSectionCues,
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
