"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { BookmarkCheck } from "lucide-react";
import { useAcademyFollowAlong } from "@/components/academy/follow-along-context";
import type { AcademyReadingResumeSnapshot } from "@/lib/academy/resume-server";
import {
  useAcademyResumeSaver,
  type AcademyReadingResumePosition,
} from "@/lib/academy/resume-client";
import {
  academyChapterAnchorId,
  type AcademyChapterPlan,
} from "@/lib/academy/chapter-plans";
import { cn } from "@/lib/utils";

/**
 * Renders lesson content with copy-protection as a deterrent: selection, copy,
 * context menu, and the obvious copy shortcut are suppressed while focus is in
 * the lesson. The text stays in the DOM, so screen readers and the audio reader
 * still reach it. This never applies to exercise or exam answering.
 *
 * Rich lessons pass sanitized `html` (from the content manager or seed); legacy
 * lessons pass plain `paragraphs`. The styling classes cover headings, lists,
 * blockquotes, links, tables, images, callouts, and form-preview frames.
 *
 * The durable reading bookmark is semantic rather than a raw page scroll
 * offset. It stores the block nearest the reader's eye line, an offset within
 * that block, and a lesson-relative percentage fallback. That remains useful
 * when the same person moves between desktop and mobile.
 */

const GUARD = {
  onCopy: (e: React.ClipboardEvent) => e.preventDefault(),
  onCut: (e: React.ClipboardEvent) => e.preventDefault(),
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  onKeyDown: (e: React.KeyboardEvent) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      ["c", "x"].includes(e.key.toLowerCase())
    ) {
      e.preventDefault();
    }
  },
};

const RICH_CLASS =
  "academy-lesson select-none text-slate-700 " +
  "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy-900 " +
  "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-navy-900 " +
  "[&_h4]:mt-5 [&_h4]:mb-1 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-navy-900 " +
  "[&_p]:my-3 [&_p]:leading-8 [&_p]:text-[1.02rem] " +
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_li]:leading-7 " +
  "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-gold-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 " +
  "[&_a]:font-medium [&_a]:text-navy-600 [&_a]:underline " +
  "[&_strong]:text-navy-900 [&_hr]:my-6 [&_hr]:border-neutral-200 " +
  "[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-neutral-200 " +
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
  "[&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold " +
  "[&_td]:border [&_td]:border-neutral-200 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top " +
  "[&_.callout]:my-4 [&_.callout]:rounded-md [&_.callout]:border-l-4 [&_.callout]:px-4 [&_.callout]:py-3 [&_.callout_p]:my-1 [&_.callout_p]:text-sm " +
  "[&_.callout-info]:border-blue-400 [&_.callout-info]:bg-blue-50 " +
  "[&_.callout-tip]:border-indigo-400 [&_.callout-tip]:bg-indigo-50 " +
  "[&_.callout-warning]:border-amber-400 [&_.callout-warning]:bg-amber-50 " +
  "[&_.callout-success]:border-emerald-400 [&_.callout-success]:bg-emerald-50 " +
  "[&_.form-preview]:my-4 [&_.form-preview]:rounded-lg [&_.form-preview]:border [&_.form-preview]:border-dashed [&_.form-preview]:border-neutral-300 [&_.form-preview]:bg-neutral-50 [&_.form-preview]:p-4 " +
  "[&_.form-preview-label]:mb-2 [&_.form-preview-label]:text-xs [&_.form-preview-label]:font-semibold [&_.form-preview-label]:uppercase [&_.form-preview-label]:tracking-wide [&_.form-preview-label]:text-slate-500 " +
  "[&_.checklist]:my-3 [&_.checklist]:list-none [&_.checklist]:pl-0 [&_.lead]:text-[1.08rem] [&_.lead]:text-slate-600";

const BLOCK_SELECTOR =
  "h2,h3,h4,p,li,blockquote,tr,img";
const NESTED_INTERACTIVE_SELECTOR =
  'a[href],button,input,select,textarea,summary,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="slider"],[role="combobox"]';
const NARRATION_SECTION_TARGET_SELECTOR =
  "h1,h2,h3,h4,p,li,blockquote,tr,div,img";
const SAVE_DEBOUNCE_MS = 650;
const AUTO_REVEAL_SCROLL_FALLBACK_MS = 5_000;

const AcademyLessonContent = memo(
  function AcademyLessonContent({
    html,
    paragraphs,
    rootRef,
    chaptered,
  }: {
    html?: string | null;
    paragraphs: string[];
    rootRef: RefObject<HTMLDivElement>;
    chaptered: boolean;
  }) {
    if (html) {
      return (
        <div
          ref={rootRef}
          data-academy-lesson-content
          className={cn(
            RICH_CLASS,
            chaptered && "max-w-[78ch]",
          )}
          {...GUARD}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    return (
      <div
        ref={rootRef}
        data-academy-lesson-content
        className="academy-lesson max-w-prose select-none space-y-5 text-[1.02rem] leading-8 text-slate-700"
        {...GUARD}
      >
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    );
  },
);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Stable, browser-safe FNV-1a key; occurrence disambiguates repeated copy. */
export function academyReadingBlockBaseKey(
  element: Element,
): string {
  const source =
    element instanceof HTMLImageElement
      ? element.alt
      : element.textContent ?? "";
  const normalized = source
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase()
    .slice(0, 320);
  let hash = 0x811c9dc5;
  const input = `${element.tagName.toLowerCase()}:${normalized}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${element.tagName.toLowerCase()}:${(hash >>> 0).toString(36)}`;
}

function prepareBlocks(root: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR),
  );
  const blocks = elements.length > 0 ? elements : [root];
  const occurrences = new Map<string, number>();
  for (const block of blocks) {
    const base = academyReadingBlockBaseKey(block);
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    block.dataset.academyResumeKey = `${base}:${occurrence}`;
  }
  return blocks;
}

/**
 * Resolve the frozen semantic renderer's path against the sanitized lesson
 * DOM. Each numeric suffix is an nth-of-type index, not a CSS selector. Long
 * spoken paragraphs may have several #segment cues; all correctly highlight
 * their one visible paragraph.
 */
export function academyNarrationElementForPath(
  root: HTMLElement,
  sourceHtmlPath: string,
): HTMLElement | null {
  if (sourceHtmlPath === "title") {
    return document.querySelector<HTMLElement>(
      "[data-academy-narration-title] h1",
    );
  }
  if (!sourceHtmlPath.startsWith("root/")) return null;
  const segments = sourceHtmlPath
    .slice("root/".length)
    .split("/");
  let current: HTMLElement = root;
  for (const rawSegment of segments) {
    const segment = rawSegment.replace(
      /#segment\[\d+\]$/u,
      "",
    );
    const match = /^([a-z][a-z0-9-]*)\[(\d+)\]$/u.exec(
      segment,
    );
    if (!match) return null;
    const [, tagName, ordinalText] = match;
    const ordinal = Number(ordinalText);
    if (
      !Number.isSafeInteger(ordinal) ||
      ordinal < 1 ||
      ordinal > 10_000
    ) {
      return null;
    }
    const matches = Array.from(current.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        element.localName === tagName,
    );
    const next = matches[ordinal - 1];
    if (!next) return null;
    current = next;
  }
  return current;
}

function activePassageNeedsScroll(
  element: HTMLElement,
): boolean {
  const rect = element.getBoundingClientRect();
  const safeTop = window.innerHeight * 0.18;
  const safeBottom = window.innerHeight * 0.82;
  return rect.top < safeTop || rect.bottom > safeBottom;
}

function viewportReadingLine(): number {
  return clamp(window.innerHeight * 0.32, 120, 260);
}

function measureReadingPosition(
  root: HTMLElement,
): AcademyReadingResumePosition {
  const blocks = prepareBlocks(root);
  const marker =
    (window.scrollY || document.documentElement.scrollTop) +
    viewportReadingLine();
  const rootRect = root.getBoundingClientRect();
  const rootTop = rootRect.top + window.scrollY;
  const rootHeight = Math.max(1, rootRect.height);
  const progressPct =
    Math.round(
      clamp(((marker - rootTop) / rootHeight) * 100, 0, 100) *
        1000,
    ) / 1000;

  let index = 0;
  for (let i = 0; i < blocks.length; i += 1) {
    const top =
      blocks[i].getBoundingClientRect().top + window.scrollY;
    if (top <= marker) index = i;
    else break;
  }
  if (marker >= rootTop + rootHeight) {
    index = Math.max(0, blocks.length - 1);
  }

  const block = blocks[index];
  const rect = block.getBoundingClientRect();
  const blockTop = rect.top + window.scrollY;
  const offsetRatio = clamp(
    (marker - blockTop) / Math.max(1, rect.height),
    0,
    1,
  );
  return {
    kind: "reading",
    contentKey: "",
    blockKey: block.dataset.academyResumeKey ?? null,
    blockIndex: index,
    offsetRatio:
      Math.round(offsetRatio * 10000) / 10000,
    progressPct,
  };
}

function restoreReadingPosition(
  root: HTMLElement,
  resume: AcademyReadingResumeSnapshot,
) {
  const blocks = prepareBlocks(root);
  const byKey = resume.blockKey
    ? blocks.find(
        (block) =>
          block.dataset.academyResumeKey === resume.blockKey,
      )
    : null;
  const byIndex =
    resume.blockIndex != null
      ? blocks[
          clamp(
            resume.blockIndex,
            0,
            Math.max(0, blocks.length - 1),
          )
        ]
      : null;
  const block = byKey ?? byIndex;
  const rootRect = root.getBoundingClientRect();
  const rootTop = rootRect.top + window.scrollY;
  let marker: number;
  if (block) {
    const rect = block.getBoundingClientRect();
    marker =
      rect.top +
      window.scrollY +
      clamp(resume.offsetRatio ?? 0, 0, 1) *
        Math.max(1, rect.height);
  } else {
    marker =
      rootTop +
      clamp((resume.progressPct ?? 0) / 100, 0, 1) *
        Math.max(1, rootRect.height);
  }
  window.scrollTo({
    top: Math.max(0, marker - viewportReadingLine()),
    behavior: "auto",
  });
}

function hasMeaningfulReadingResume(
  resume: AcademyReadingResumeSnapshot,
) {
  return (
    (resume.progressPct ?? 0) >= 1 ||
    (resume.blockIndex ?? 0) > 0 ||
    (resume.offsetRatio ?? 0) > 0.05
  );
}

export function LessonReader({
  paragraphs,
  html,
  resume,
  resumeEndpoint,
  resumeEnabled = true,
  chapterPlan = null,
}: {
  paragraphs: string[];
  html?: string | null;
  resume: AcademyReadingResumeSnapshot;
  resumeEndpoint: string;
  resumeEnabled?: boolean;
  chapterPlan?: AcademyChapterPlan | null;
}) {
  const {
    activateSectionAudio,
    activeCue,
    playing: audioPlaying,
    sectionCues,
  } = useAcademyFollowAlong();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activePassageRef = useRef<HTMLElement | null>(null);
  const audioPlayingRef = useRef(audioPlaying);
  audioPlayingRef.current = audioPlaying;
  const readyToSaveRef = useRef(false);
  const readingDirtyRef = useRef(false);
  const suppressScrollRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const autoRevealActiveRef = useRef(false);
  const autoRevealTimerRef = useRef<number | null>(null);
  const preAudioRevealReadingRef =
    useRef<AcademyReadingResumePosition | null>(null);
  const [startedOver, setStartedOver] = useState(false);
  const [restored, setRestored] = useState(false);
  const initiallySaved = useMemo(
    () => hasMeaningfulReadingResume(resume),
    [resume],
  );
  const saveResume = useAcademyResumeSaver({
    endpoint: resumeEndpoint,
    initialRevision: resume.revision,
    enabled: resumeEnabled,
  });

  // Chapter labels are presentation-only attributes on the existing boundary
  // nodes. No lesson node is wrapped, moved, hidden, or recreated, so semantic
  // follow-along paths and global reading bookmarks keep their exact DOM.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !chapterPlan) return;
    const originals: Array<{
      element: HTMLElement;
      id: string | null;
      heading: string | null;
      index: string | null;
      hadClass: boolean;
      tabIndex: string | null;
    }> = [];

    chapterPlan.chapters.forEach((chapter, index) => {
      const element = academyNarrationElementForPath(
        root,
        chapter.readingStartSourceHtmlPath,
      );
      if (!element) return;
      originals.push({
        element,
        id: element.getAttribute("id"),
        heading: element.getAttribute(
          "data-academy-chapter-heading",
        ),
        index: element.getAttribute(
          "data-academy-chapter-index",
        ),
        hadClass: element.classList.contains(
          "academy-chapter-start",
        ),
        tabIndex: element.getAttribute("tabindex"),
      });
      element.id = academyChapterAnchorId(
        chapterPlan.moduleSlug,
        chapter.id,
      );
      element.dataset.academyChapterHeading =
        `Part ${chapter.number} · ${chapter.title}`;
      element.dataset.academyChapterIndex = String(index);
      element.tabIndex = -1;
      element.classList.add("academy-chapter-start");
    });

    return () => {
      for (const original of originals) {
        const { element } = original;
        if (original.id === null) element.removeAttribute("id");
        else element.setAttribute("id", original.id);
        if (original.heading === null) {
          element.removeAttribute(
            "data-academy-chapter-heading",
          );
        } else {
          element.setAttribute(
            "data-academy-chapter-heading",
            original.heading,
          );
        }
        if (original.index === null) {
          element.removeAttribute(
            "data-academy-chapter-index",
          );
        } else {
          element.setAttribute(
            "data-academy-chapter-index",
            original.index,
          );
        }
        if (!original.hadClass) {
          element.classList.remove("academy-chapter-start");
        }
        if (original.tabIndex === null) {
          element.removeAttribute("tabindex");
        } else {
          element.setAttribute("tabindex", original.tabIndex);
        }
      }
    };
  }, [chapterPlan, html, paragraphs]);

  const snapshot = useCallback(() => {
    const root = rootRef.current;
    if (!root) return null;
    return {
      ...measureReadingPosition(root),
      contentKey: resume.contentKey,
    };
  }, [resume.contentKey]);

  const finishAutoRevealScroll = useCallback(() => {
    autoRevealActiveRef.current = false;
    if (autoRevealTimerRef.current !== null) {
      window.clearTimeout(autoRevealTimerRef.current);
      autoRevealTimerRef.current = null;
    }
    suppressScrollRef.current = false;
  }, []);

  const holdAutoRevealScroll = useCallback(() => {
    if (autoRevealTimerRef.current !== null) {
      window.clearTimeout(autoRevealTimerRef.current);
    }
    autoRevealTimerRef.current = window.setTimeout(() => {
      autoRevealActiveRef.current = false;
      autoRevealTimerRef.current = null;
      suppressScrollRef.current = false;
    }, AUTO_REVEAL_SCROLL_FALLBACK_MS);
  }, []);

  // Restore only after fonts and in-lesson images have had a short opportunity
  // to settle. Any deliberate wheel/touch/key action before then cancels the
  // automatic jump.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let userActed = false;
    const markUserAction = () => {
      userActed = true;
      readingDirtyRef.current = true;
    };
    const markKeyboardReadingAction = (
      event: KeyboardEvent,
    ) => {
      const target =
        event.target instanceof Element
          ? event.target
          : null;
      if (
        !event.defaultPrevented &&
        !target?.closest(
          NESTED_INTERACTIVE_SELECTOR,
        ) &&
        [
          "ArrowDown",
          "ArrowUp",
          "End",
          "Home",
          "PageDown",
          "PageUp",
          " ",
        ].includes(event.key)
      ) {
        markUserAction();
      }
    };
    const options = { passive: true } as const;
    window.addEventListener("wheel", markUserAction, options);
    window.addEventListener("touchmove", markUserAction, options);
    window.addEventListener(
      "keydown",
      markKeyboardReadingAction,
    );

    const settle = async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* use the current metrics */
      }
      const images = Array.from(root.querySelectorAll("img"));
      if (images.length > 0) {
        await Promise.race([
          Promise.all(
            images.map((image) =>
              image.complete
                ? Promise.resolve()
                : new Promise<void>((resolve) => {
                    image.addEventListener("load", () => resolve(), {
                      once: true,
                    });
                    image.addEventListener("error", () => resolve(), {
                      once: true,
                    });
                  }),
            ),
          ),
          new Promise<void>((resolve) =>
            window.setTimeout(resolve, 800),
          ),
        ]);
      }
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve()),
        ),
      );

      if (cancelled) return;
      if (
        !userActed &&
        !audioPlayingRef.current &&
        resumeEnabled &&
        initiallySaved &&
        !window.location.hash
      ) {
        suppressScrollRef.current = true;
        restoreReadingPosition(root, resume);
        setRestored(true);
        window.requestAnimationFrame(() => {
          suppressScrollRef.current = false;
        });
      }
      readyToSaveRef.current = true;
      if (userActed) {
        // A deliberate scroll before layout settled is the new reading place,
        // not a reason to silently keep or overwrite the old one at page top.
        window.dispatchEvent(new Event("scroll"));
      }
    };
    void settle();

    return () => {
      cancelled = true;
      window.removeEventListener("wheel", markUserAction);
      window.removeEventListener("touchmove", markUserAction);
      window.removeEventListener(
        "keydown",
        markKeyboardReadingAction,
      );
    };
  }, [initiallySaved, resume, resumeEnabled]);

  useEffect(() => {
    if (!resumeEnabled) return;
    const flush = () => {
      if (
        !readyToSaveRef.current ||
        !readingDirtyRef.current
      ) {
        return;
      }
      const position =
        preAudioRevealReadingRef.current ?? snapshot();
      if (position) saveResume(position, { keepalive: true });
    };
    const onScroll = () => {
      if (suppressScrollRef.current) return;
      preAudioRevealReadingRef.current = null;
      readingDirtyRef.current = true;
      if (!readyToSaveRef.current) return;
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        const position =
          preAudioRevealReadingRef.current ?? snapshot();
        if (position) saveResume(position);
      }, SAVE_DEBOUNCE_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener(
        "visibilitychange",
        onVisibility,
      );
    };
  }, [resumeEnabled, saveResume, snapshot]);

  // React runs layout-effect cleanup before removing the lesson DOM. This is
  // the reliable final checkpoint for Next.js client-side navigation, where
  // pagehide does not fire and passive cleanup may see a detached ref.
  useLayoutEffect(
    () => () => {
      if (
        !resumeEnabled ||
        !readyToSaveRef.current ||
        !readingDirtyRef.current
      ) {
        return;
      }
      const position =
        preAudioRevealReadingRef.current ?? snapshot();
      if (position) {
        saveResume(position, { keepalive: true });
      }
    },
    [resumeEnabled, saveResume, snapshot],
  );

  // Programmatic audio following must not become a text bookmark. Keep scroll
  // saves suppressed until `scrollend`, with a bounded fallback for engines
  // that do not emit it. A real wheel, touch, or reading key cancels that
  // motion and restores ordinary reading-position saves for the user's own
  // movement.
  useEffect(() => {
    const onScroll = () => {
      if (autoRevealActiveRef.current) {
        holdAutoRevealScroll();
      }
    };
    const onScrollEnd = () => {
      if (autoRevealActiveRef.current) {
        finishAutoRevealScroll();
      }
    };
    const cancelForUser = () => {
      if (!autoRevealActiveRef.current) return;
      window.scrollTo({
        top: window.scrollY,
        behavior: "auto",
      });
      preAudioRevealReadingRef.current = null;
      finishAutoRevealScroll();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target =
        event.target instanceof Element
          ? event.target
          : null;
      if (
        event.defaultPrevented ||
        target?.closest(
          NESTED_INTERACTIVE_SELECTOR,
        )
      ) {
        return;
      }
      if (
        [
          "ArrowDown",
          "ArrowUp",
          "End",
          "Home",
          "PageDown",
          "PageUp",
          " ",
        ].includes(event.key)
      ) {
        cancelForUser();
      }
    };
    const passive = { passive: true } as const;
    window.addEventListener("scroll", onScroll, passive);
    window.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("wheel", cancelForUser, passive);
    window.addEventListener(
      "touchmove",
      cancelForUser,
      passive,
    );
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("wheel", cancelForUser);
      window.removeEventListener(
        "touchmove",
        cancelForUser,
      );
      window.removeEventListener("keydown", onKeyDown);
      finishAutoRevealScroll();
    };
  }, [
    finishAutoRevealScroll,
    holdAutoRevealScroll,
  ]);

  const startFromBeginning = () => {
    const root = rootRef.current;
    if (!root) return;
    const blocks = prepareBlocks(root);
    const position: AcademyReadingResumePosition = {
      kind: "reading",
      contentKey: resume.contentKey,
      blockKey:
        blocks[0]?.dataset.academyResumeKey ?? null,
      blockIndex: blocks.length > 0 ? 0 : null,
      offsetRatio: 0,
      progressPct: 0,
    };
    suppressScrollRef.current = true;
    preAudioRevealReadingRef.current = null;
    readingDirtyRef.current = false;
    saveResume(position);
    setStartedOver(true);
    setRestored(false);
    window.scrollTo({
      top: Math.max(
        0,
        root.getBoundingClientRect().top +
          window.scrollY -
          96,
      ),
      behavior: "auto",
    });
    window.requestAnimationFrame(() => {
      suppressScrollRef.current = false;
    });
  };

  // Audited timing metadata turns only resolvable passages into pointer/touch
  // targets. Native click is used instead of dblclick so two taps naturally
  // mean select then play, while the original document semantics stay intact.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || sectionCues.length === 0) return;

    const cueByElement = new Map<
      HTMLElement,
      (typeof sectionCues)[number]
    >();
    for (const cue of sectionCues) {
      const element = academyNarrationElementForPath(
        root,
        cue.sourceHtmlPath,
      );
      if (
        !element ||
        !element.matches(
          NARRATION_SECTION_TARGET_SELECTOR,
        ) ||
        element.closest(NESTED_INTERACTIVE_SELECTOR)
      ) {
        continue;
      }
      const current = cueByElement.get(element);
      if (!current || cue.startMs < current.startMs) {
        cueByElement.set(element, cue);
      }
    }
    if (cueByElement.size === 0) return;

    const originals = Array.from(
      cueByElement.keys(),
      (element) => ({
        element,
        hadClass: element.classList.contains(
          "academy-audio-section",
        ),
        marker: element.getAttribute(
          "data-academy-audio-section",
        ),
      }),
    );

    for (const { element } of originals) {
      element.classList.add("academy-audio-section");
      element.dataset.academyAudioSection = "true";
    }

    const sectionForEvent = (
      event: MouseEvent,
    ): HTMLElement | null => {
      if (
        event.defaultPrevented ||
        !(event.target instanceof Element)
      ) {
        return null;
      }
      const section = event.target.closest<HTMLElement>(
        '[data-academy-audio-section="true"]',
      );
      if (!section || !cueByElement.has(section)) {
        return null;
      }
      const nestedInteractive = event.target.closest(
        NESTED_INTERACTIVE_SELECTOR,
      );
      if (nestedInteractive) {
        return null;
      }
      return section;
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const section = sectionForEvent(event);
      if (!section) return;
      event.preventDefault();
      event.stopPropagation();
      activateSectionAudio(cueByElement.get(section)!);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      for (const original of originals) {
        const { element } = original;
        if (!original.hadClass) {
          element.classList.remove(
            "academy-audio-section",
          );
        }
        if (original.marker === null) {
          element.removeAttribute(
            "data-academy-audio-section",
          );
        } else {
          element.setAttribute(
            "data-academy-audio-section",
            original.marker,
          );
        }
      }
    };
  }, [
    activateSectionAudio,
    html,
    paragraphs,
    sectionCues,
  ]);

  // Keep exactly one semantic passage current. The original heading,
  // paragraph, list, callout, or table-row semantics remain untouched.
  useEffect(() => {
    let scrollFrame: number | null = null;
    const previous = activePassageRef.current;
    if (previous) {
      previous.classList.remove(
        "academy-narration-active",
      );
      previous.removeAttribute(
        "data-academy-narration-active",
      );
      previous.removeAttribute("data-narration-state");
      previous.removeAttribute("aria-current");
    }
    activePassageRef.current = null;
    const root = rootRef.current;
    if (!root || !activeCue) return;
    const element = academyNarrationElementForPath(
      root,
      activeCue.sourceHtmlPath,
    );
    if (!element) return;
    element.classList.add("academy-narration-active");
    element.dataset.academyNarrationActive = "true";
    element.dataset.narrationState = audioPlaying
      ? "playing"
      : "paused";
    element.setAttribute("aria-current", "true");
    activePassageRef.current = element;
    if (audioPlaying && activePassageNeedsScroll(element)) {
      scrollFrame = window.requestAnimationFrame(() => {
        if (
          activePassageRef.current !== element ||
          !element.isConnected
        ) {
          return;
        }
        if (!preAudioRevealReadingRef.current) {
          preAudioRevealReadingRef.current = snapshot();
        }
        autoRevealActiveRef.current = true;
        suppressScrollRef.current = true;
        holdAutoRevealScroll();
        element.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches
            ? "auto"
            : "smooth",
        });
      });
    }
    return () => {
      if (scrollFrame !== null) {
        window.cancelAnimationFrame(scrollFrame);
      }
      element.classList.remove("academy-narration-active");
      element.removeAttribute(
        "data-academy-narration-active",
      );
      element.removeAttribute("data-narration-state");
      element.removeAttribute("aria-current");
      if (activePassageRef.current === element) {
        activePassageRef.current = null;
      }
    };
  }, [
    activeCue,
    audioPlaying,
    holdAutoRevealScroll,
    snapshot,
  ]);

  const bookmarkActive = initiallySaved && !startedOver;
  return (
    <>
      {resumeEnabled ? (
        <div
          className="mb-5 flex min-h-12 flex-wrap items-center justify-between gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2.5"
          data-testid="academy-reading-bookmark"
          role="status"
          aria-live="polite"
        >
          <span className="flex items-center gap-2 text-sm text-navy-800">
            <BookmarkCheck
              className="h-4 w-4 shrink-0 text-blue-600"
              aria-hidden="true"
            />
            {bookmarkActive
              ? restored
                ? "You are back at your saved reading position."
                : "Your saved reading position will open automatically."
              : "Your reading position is saved automatically on this account."}
          </span>
          {bookmarkActive ? (
            <button
              type="button"
              onClick={startFromBeginning}
              className="text-xs font-semibold text-navy-700 underline decoration-blue-300 underline-offset-2 hover:text-navy-900"
            >
              Start from the beginning
            </button>
          ) : null}
        </div>
      ) : null}
      <AcademyLessonContent
        html={html}
        paragraphs={paragraphs}
        rootRef={rootRef}
        chaptered={Boolean(chapterPlan)}
      />
    </>
  );
}
