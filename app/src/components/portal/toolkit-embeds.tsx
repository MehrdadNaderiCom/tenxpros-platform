/**
 * Renders a Toolkit post's external links and embeds. Embeds are built only from
 * a validated provider id (see resolveEmbed), so the iframe src is always a fixed
 * template and never raw user input. Everything else renders as a plain link card
 * that opens in a new tab. No user HTML is ever injected.
 */
import { resolveEmbed, TOOLKIT_LINK_KIND_LABELS, type ToolkitLinkKind } from "@/lib/toolkit/embeds";

type ToolkitLinkView = { id: string; title: string; url: string; kind: string };

function kindLabel(kind: string): string {
  return TOOLKIT_LINK_KIND_LABELS[kind as ToolkitLinkKind] ?? "Link";
}

export function ToolkitEmbeds({ links }: { links: ToolkitLinkView[] }) {
  if (!links.length) return null;
  return (
    <div className="space-y-5">
      {links.map((link) => {
        const res = resolveEmbed(link.url, link.kind);
        if (res.mode === "iframe") {
          return (
            <figure key={link.id} className="space-y-2">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                <iframe
                  src={res.src}
                  title={link.title}
                  className="absolute inset-0 h-full w-full"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <figcaption className="text-xs text-slate-500">
                {link.title} , {res.provider}
              </figcaption>
            </figure>
          );
        }
        return (
          <a
            key={link.id}
            href={res.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 p-3 hover:border-navy-300 hover:bg-navy-50"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-navy-700">{link.title}</span>
              <span className="block truncate text-xs text-slate-500">{res.provider}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-navy-600">{kindLabel(link.kind)} , open</span>
          </a>
        );
      })}
    </div>
  );
}
