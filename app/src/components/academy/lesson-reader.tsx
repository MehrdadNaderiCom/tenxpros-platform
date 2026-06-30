"use client";

/**
 * Renders lesson content with copy-protection as a deterrent: selection, copy,
 * context menu, and the obvious copy shortcut are suppressed while focus is in
 * the lesson. The text stays in the DOM, so screen readers and the audio reader
 * still reach it. This never applies to exercise or exam answering.
 *
 * Rich lessons pass sanitized `html` (from the content manager or seed); legacy
 * lessons pass plain `paragraphs`. The styling classes cover headings, lists,
 * blockquotes, links, tables, images, callouts, and form-preview frames.
 */

const GUARD = {
  onCopy: (e: React.ClipboardEvent) => e.preventDefault(),
  onCut: (e: React.ClipboardEvent) => e.preventDefault(),
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  onKeyDown: (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && ["c", "x"].includes(e.key.toLowerCase())) e.preventDefault();
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

export function LessonReader({ paragraphs, html }: { paragraphs: string[]; html?: string | null }) {
  if (html) {
    return <div className={RICH_CLASS} {...GUARD} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <div className="academy-lesson max-w-prose select-none space-y-5 text-[1.02rem] leading-8 text-slate-700" {...GUARD}>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
