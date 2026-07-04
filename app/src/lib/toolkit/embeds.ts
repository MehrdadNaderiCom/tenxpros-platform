/**
 * Safe handling of Toolkit external links and embeds. Links are stored as
 * structured records (ToolkitLink), never as raw HTML in a post body, so nothing
 * a superadmin pastes can inject markup. This module is the single source of
 * truth for two things:
 *
 *  - normalizeLinkUrl: validate a pasted URL (https only) before it is stored.
 *  - resolveEmbed: for a VIDEO or SLIDES link on a known provider, build a
 *    sanitized embed src from an id extracted with a strict character class, so
 *    the iframe src is always a fixed template plus a validated id, never the
 *    raw user string. Anything else resolves to a plain link card.
 *
 * Pure functions, no prisma and no network, so both the server action and the
 * render component share exactly the same rules.
 */

export const TOOLKIT_LINK_KINDS = ["LINK", "VIDEO", "SLIDES", "DOC"] as const;
export type ToolkitLinkKind = (typeof TOOLKIT_LINK_KINDS)[number];

export const TOOLKIT_LINK_KIND_LABELS: Record<ToolkitLinkKind, string> = {
  LINK: "Link",
  VIDEO: "Video",
  SLIDES: "Slide deck",
  DOC: "Document",
};

export function isToolkitLinkKind(value: string): value is ToolkitLinkKind {
  return (TOOLKIT_LINK_KINDS as readonly string[]).includes(value);
}

/**
 * Validate and normalize a pasted link URL. Returns the normalized https URL, or
 * null if it is not a well-formed https URL. http is rejected so nothing embeds
 * or links over an insecure scheme.
 */
export function normalizeLinkUrl(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  return u.toString();
}

export type EmbedResolution =
  | { mode: "iframe"; src: string; provider: string }
  | { mode: "link"; href: string; provider: string };

/**
 * Decide how to present a link. Only VIDEO and SLIDES kinds are ever embedded,
 * and only for a short allowlist of providers; every id is matched against a
 * strict character class and the src is a fixed template. Everything else is a
 * plain, safe link card.
 */
export function resolveEmbed(rawUrl: string, kind: string): EmbedResolution {
  const url = normalizeLinkUrl(rawUrl);
  if (!url) return { mode: "link", href: "#", provider: "link" };

  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  const wantsEmbed = kind === "VIDEO" || kind === "SLIDES";
  if (wantsEmbed) {
    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const fromQuery = u.searchParams.get("v");
      const fromPath = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/)?.[1] ?? null;
      const id = fromQuery ?? fromPath;
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
        return { mode: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}`, provider: "YouTube" };
      }
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
        return { mode: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}`, provider: "YouTube" };
      }
    }
    // Vimeo
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = u.pathname.match(/(\d{6,})/)?.[1] ?? null;
      if (id) return { mode: "iframe", src: `https://player.vimeo.com/video/${id}`, provider: "Vimeo" };
    }
    // Loom
    if (host === "loom.com") {
      const id = u.pathname.match(/\/(?:share|embed)\/([A-Za-z0-9]+)/)?.[1] ?? null;
      if (id) return { mode: "iframe", src: `https://www.loom.com/embed/${id}`, provider: "Loom" };
    }
    // Google Slides
    if (host === "docs.google.com") {
      const id = u.pathname.match(/\/presentation\/d\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
      if (id) return { mode: "iframe", src: `https://docs.google.com/presentation/d/${id}/embed`, provider: "Google Slides" };
    }
    // Google Drive file
    if (host === "drive.google.com") {
      const id = u.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
      if (id) return { mode: "iframe", src: `https://drive.google.com/file/d/${id}/preview`, provider: "Google Drive" };
    }
  }

  return { mode: "link", href: url, provider: host };
}
