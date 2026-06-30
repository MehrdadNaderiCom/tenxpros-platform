/**
 * Lesson rich-content helpers. Lesson HTML is authored by superadmins (the seed
 * and the content manager), so this is a trusted source. We still run a
 * conservative allowlist sanitizer as defense in depth, and derive a plain-text
 * version for the audio reader and search.
 */

// Tags the lesson renderer is allowed to emit. Anything else is unwrapped
// (its tags removed, inner text kept).
const ALLOWED_TAGS = new Set([
  "h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "b", "i", "u", "s",
  "a", "blockquote", "hr", "br", "table", "thead", "tbody", "tr", "th", "td",
  "img", "figure", "figcaption", "div", "span", "code", "pre",
]);

// Class values we let through (callouts, form-preview frames, figures).
const ALLOWED_CLASSES = new Set([
  "callout", "callout-info", "callout-warning", "callout-success", "callout-tip",
  "form-preview", "form-preview-label", "checklist", "lead",
]);

function safeUrl(raw: string): string | null {
  const v = raw.trim();
  if (/^(https?:|mailto:|\/)/i.test(v)) return v;
  // Allow bare anchors and relative paths; reject javascript:, data:, etc.
  if (/^[#.a-z0-9_/-]/i.test(v) && !/^[a-z]+:/i.test(v)) return v;
  return null;
}

/**
 * Sanitize lesson HTML: drop <script>/<style> blocks, strip event handlers and
 * unsafe URLs, and remove any tag outside the allowlist while keeping its text.
 */
export function sanitizeLessonHtml(html: string): string {
  if (!html) return "";
  let out = html;

  // Remove script/style blocks entirely (including content).
  out = out.replace(/<\s*(script|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  // Remove comments.
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  // Walk each tag and rebuild it from an allowlist.
  out = out.replace(/<\/?\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    const closing = /^<\s*\//.test(match);
    if (!ALLOWED_TAGS.has(name)) return ""; // unwrap unknown tag, keep inner text
    if (closing) return `</${name}>`;

    const selfClose = name === "br" || name === "hr" || name === "img";
    const attrs: string[] = [];

    // href on <a>
    if (name === "a") {
      const href = /\bhref\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const val = href ? (href[2] ?? href[3] ?? "") : "";
      const safe = val ? safeUrl(val) : null;
      if (safe) {
        attrs.push(`href="${safe}"`);
        if (/^https?:/i.test(safe)) attrs.push('target="_blank"', 'rel="noopener noreferrer"');
      }
    }
    // src/alt on <img>
    if (name === "img") {
      const src = /\bsrc\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const alt = /\balt\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const srcVal = src ? (src[2] ?? src[3] ?? "") : "";
      const safe = srcVal ? safeUrl(srcVal) : null;
      if (safe) attrs.push(`src="${safe}"`);
      const altVal = alt ? (alt[2] ?? alt[3] ?? "") : "";
      attrs.push(`alt="${altVal.replace(/"/g, "&quot;")}"`);
      attrs.push('loading="lazy"');
    }
    // colspan/rowspan on table cells
    if (name === "td" || name === "th") {
      for (const span of ["colspan", "rowspan"]) {
        const m = new RegExp(`\\b${span}\\s*=\\s*("(\\d+)"|'(\\d+)')`, "i").exec(rawAttrs);
        if (m) attrs.push(`${span}="${m[2] ?? m[3]}"`);
      }
    }
    // class (allowlisted values only) on any allowed tag
    const cls = /\bclass\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
    if (cls) {
      const kept = (cls[2] ?? cls[3] ?? "")
        .split(/\s+/)
        .filter((c) => ALLOWED_CLASSES.has(c));
      if (kept.length) attrs.push(`class="${kept.join(" ")}"`);
    }

    const attrStr = attrs.length ? " " + attrs.join(" ") : "";
    return selfClose ? `<${name}${attrStr} />` : `<${name}${attrStr}>`;
  });

  return out.trim();
}

/** Collapse HTML to readable plain text (for the audio reader and search). */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\s*(script|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Block boundaries become paragraph breaks so the audio reader pauses.
    .replace(/<\/(p|h2|h3|h4|li|blockquote|tr|figcaption)\s*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Split plain text into paragraphs (for the fallback LessonReader). */
export function plainTextParagraphs(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}
