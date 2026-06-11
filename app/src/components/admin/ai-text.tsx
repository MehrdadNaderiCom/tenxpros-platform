import type { ReactNode } from "react";

/**
 * Renders constrained AI output (the coach/suggestion text) as clean HTML:
 * "**Heading**" lines become headings, "- " lines become bullet lists,
 * "1." lines become numbered lists, and inline **bold** is bolded.
 * Pure string parsing into React nodes — no HTML injection is possible.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <strong key={`${keyBase}-b${i++}`} className="font-semibold text-navy-900">
        {match[1]}
      </strong>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function AiText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!list) return;
    const items = list.items;
    const ordered = list.ordered;
    const k = `l${key++}`;
    blocks.push(
      ordered ? (
        <ol key={k} className="list-decimal space-y-1 pl-5">
          {items.map((item, i) => (
            <li key={i}>{inline(item, `${k}-${i}`)}</li>
          ))}
        </ol>
      ) : (
        <ul key={k} className="list-disc space-y-1 pl-5">
          {items.map((item, i) => (
            <li key={i}>{inline(item, `${k}-${i}`)}</li>
          ))}
        </ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    const bullet = line.match(/^[-•*]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    if (numbered) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }
    flushList();
    // A line that is entirely bold (or markdown heading) renders as a heading.
    const heading = line.match(/^#{1,4}\s+(.+)$/) ?? line.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (heading) {
      blocks.push(
        <h3 key={`h${key++}`} className="pt-1 text-[13px] font-bold uppercase tracking-wide text-navy-900">
          {heading[1].replace(/\*\*/g, "").replace(/:$/, "")}
        </h3>,
      );
      continue;
    }
    blocks.push(<p key={`p${key++}`}>{inline(line, `p${key}`)}</p>);
  }
  flushList();

  return <div className="space-y-2 text-sm leading-6 text-slate-800">{blocks}</div>;
}
