"use client";

/**
 * Renders lesson prose with copy-protection as a deterrent: selection, copy,
 * context menu, and the obvious copy shortcut are suppressed while focus is in
 * the lesson. The text stays in the DOM, so screen readers and the audio reader
 * still reach it. This never applies to exercise or exam answering.
 */
export function LessonReader({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div
      className="academy-lesson max-w-prose select-none space-y-5 text-[1.02rem] leading-8 text-slate-700"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && ["c", "x"].includes(e.key.toLowerCase())) e.preventDefault();
      }}
    >
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
