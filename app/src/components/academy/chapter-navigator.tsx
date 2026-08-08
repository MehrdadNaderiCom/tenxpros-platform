"use client";

import { useMemo } from "react";
import {
  BookOpen,
  Headphones,
} from "lucide-react";
import {
  academyFollowAlongElementPath,
  useAcademyFollowAlong,
} from "@/components/academy/follow-along-context";
import { academyNarrationElementForPath } from "@/components/academy/lesson-reader";
import {
  formatAcademyChapterDuration,
  type AcademyChapterPlan,
} from "@/lib/academy/chapter-plans";
import { cn } from "@/lib/utils";

function prefersReducedMotion(): boolean {
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
}

/**
 * Compact navigation over one continuous lesson. Reading navigation only
 * scrolls to existing nodes; listening seeks the one existing AudioReader.
 */
export function AcademyChapterNavigator({
  plan,
}: {
  plan: AcademyChapterPlan;
}) {
  const {
    activeCue,
    audioDurationMs,
    playing,
    restartSectionAudio,
    sectionCues,
  } = useAcademyFollowAlong();

  const chapterCues = useMemo(
    () =>
      plan.chapters.map((chapter) =>
        sectionCues.find(
          (cue) =>
            academyFollowAlongElementPath(
              cue.sourceHtmlPath,
            ) === chapter.audioStartSourceHtmlPath,
        ),
      ),
    [plan.chapters, sectionCues],
  );

  const activeChapterIndex = useMemo(() => {
    if (!activeCue) return -1;
    let match = -1;
    for (
      let index = 0;
      index < plan.chapters.length;
      index += 1
    ) {
      const startMs =
        index === 0 ? 0 : chapterCues[index]?.startMs;
      if (startMs === undefined) break;
      if (activeCue.startMs >= startMs) match = index;
      else break;
    }
    return match;
  }, [activeCue, chapterCues, plan.chapters]);

  const readChapter = (index: number) => {
    const root = document.querySelector<HTMLElement>(
      "[data-academy-lesson-content]",
    );
    if (!root) return;
    const chapter = plan.chapters[index];
    const target = academyNarrationElementForPath(
      root,
      chapter.readingStartSourceHtmlPath,
    );
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const chapterDuration = (index: number): string | null => {
    const startMs =
      index === 0 ? 0 : chapterCues[index]?.startMs;
    const endMs =
      index < plan.chapters.length - 1
        ? chapterCues[index + 1]?.startMs
        : audioDurationMs ?? undefined;
    if (startMs === undefined || endMs === undefined) {
      return null;
    }
    return formatAcademyChapterDuration({ startMs, endMs });
  };

  const totalDuration =
    audioDurationMs === null
      ? null
      : formatAcademyChapterDuration({
          startMs: 0,
          endMs: audioDurationMs,
        });

  return (
    <section
      className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="academy-chapter-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-800">
            Focused lesson
          </p>
          <h2
            id="academy-chapter-heading"
            className="mt-1 text-lg font-semibold text-navy-900"
          >
            {plan.chapters.length} focused parts, one continuous lesson
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Read in shorter sections or listen from any starting point. Your
            studio audio and saved position stay continuous across the whole
            module.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-800">
          <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
          Same studio audio{totalDuration ? ` · ${totalDuration}` : ""}
        </span>
      </div>

      <nav className="mt-5" aria-label="Module parts">
        <ol className="grid gap-3 md:grid-cols-3">
          {plan.chapters.map((chapter, index) => {
            const isActive = index === activeChapterIndex;
            const cue = chapterCues[index];
            const durationLabel = chapterDuration(index);
            return (
              <li key={chapter.id} className="min-w-0">
                <article
                  className={cn(
                    "flex h-full flex-col rounded-lg border p-3 transition-colors sm:p-4",
                    isActive
                      ? "border-gold-500 bg-gold-50"
                      : "border-neutral-200 bg-neutral-50/70",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-navy-700">
                      Part {chapter.number}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {isActive
                        ? `${playing ? "Playing" : "Audio here"} · `
                        : ""}
                      {durationLabel ?? "Studio audio"}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold leading-6 text-navy-900">
                    {chapter.title}
                  </h3>
                  <p className="mt-1 hidden flex-1 text-sm leading-6 text-slate-600 sm:block">
                    {chapter.summary}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-200 pt-3">
                    <button
                      type="button"
                      onClick={() => readChapter(index)}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-navy-900 bg-white px-2.5 text-sm font-medium text-navy-900 transition hover:bg-navy-50 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2"
                      aria-label={`Read Part ${chapter.number}: ${chapter.title}`}
                    >
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      Read
                    </button>
                    <button
                      type="button"
                      onClick={() => cue && restartSectionAudio(cue)}
                      disabled={!cue}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-navy-900 px-2.5 text-sm font-medium text-white transition hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
                      aria-label={`Listen from Part ${chapter.number}: ${chapter.title}`}
                    >
                      <Headphones
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      {isActive ? "Restart" : "Listen"}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </nav>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        The audio continues naturally into the next part. Each part has its own
        short review below; the module exam remains one final check.
      </p>
    </section>
  );
}
