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
  "img", "figure", "figcaption", "div", "span", "code", "pre", "label",
]);

// Class values we let through (callouts, form-preview frames, figures).
const ALLOWED_CLASSES = new Set([
  "callout", "callout-info", "callout-warning", "callout-success", "callout-tip",
  "form-preview", "form-preview-label", "checklist", "lead",
]);

function safeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  // A raw ASCII control or whitespace character is never part of a legitimate
  // URL, and such characters (tab, newline, carriage return) are used to hide a
  // scheme, for example "java\tscript:". Reject them outright.
  for (let i = 0; i < v.length; i += 1) {
    const code = v.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return null;
  }

  // If the value carries an explicit scheme, allow only http, https, and mailto.
  // The scheme is matched at the very start with a strict scheme grammar, so a
  // scheme disguised with an HTML entity ("jav&#x09;ascript:" or "javascript&colon;")
  // never matches here; it falls through to the relative branch below, which
  // forbids "&" and ":". For http and https we also parse with URL(), matching
  // the toolkit link validator so the two code paths agree.
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(v)?.[1]?.toLowerCase();
  if (scheme) {
    if (scheme === "http" || scheme === "https") {
      try {
        new URL(v);
        return v;
      } catch {
        return null;
      }
    }
    if (scheme === "mailto") return v;
    return null; // javascript, data, vbscript, file, and anything else
  }

  // No explicit scheme: a relative path or an anchor. Reject any "&" (which begins
  // every HTML entity, numeric or named) and any ":" so a scheme can never be
  // hidden through an entity or a stray colon, then require a safe leading char.
  if (v.includes("&") || v.includes(":")) return null;
  return /^[#/.]/.test(v) || /^[a-z0-9_-]/i.test(v) ? v : null;
}

/**
 * Escape a double-quote so a value interpolated into a double-quoted attribute
 * cannot break out of it (e.g. a href/src URL that contains a quote). Applied to
 * every emitted attribute value. This does not change which URL schemes are
 * allowed; safeUrl still decides that. It only neutralizes an embedded quote.
 */
function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;");
}

function parsedAttributeNames(rawAttrs: string): Set<string> {
  const names = new Set<string>();
  const attribute =
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
  for (const match of rawAttrs.matchAll(attribute)) {
    names.add(match[1].toLowerCase());
  }
  return names;
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
    const attributeNames = parsedAttributeNames(rawAttrs);

    // href on <a>
    if (name === "a") {
      const href = /\bhref\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const val = href ? (href[2] ?? href[3] ?? "") : "";
      const safe = val ? safeUrl(val) : null;
      if (safe) {
        attrs.push(`href="${escapeAttr(safe)}"`);
        if (/^https?:/i.test(safe)) attrs.push('target="_blank"', 'rel="noopener noreferrer"');
      }
    }
    // src/alt on <img>
    if (name === "img") {
      const src = /\bsrc\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const alt = /\balt\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const srcVal = src ? (src[2] ?? src[3] ?? "") : "";
      const safe = srcVal ? safeUrl(srcVal) : null;
      if (safe) attrs.push(`src="${escapeAttr(safe)}"`);
      const altVal = alt ? (alt[2] ?? alt[3] ?? "") : "";
      attrs.push(`alt="${escapeAttr(altVal)}"`);
      attrs.push('loading="lazy"');
    }
    // colspan/rowspan on table cells
    if (name === "td" || name === "th") {
      for (const span of ["colspan", "rowspan"]) {
        const m = new RegExp(`\\b${span}\\s*=\\s*("(\\d+)"|'(\\d+)')`, "i").exec(rawAttrs);
        if (m) attrs.push(`${span}="${m[2] ?? m[3]}"`);
      }
    }
    // Preserve explicit visibility semantics so narration and visual rendering
    // agree about content that authors intentionally hid.
    if (attributeNames.has("hidden")) {
      attrs.push("hidden");
    }
    if (
      attributeNames.has("aria-hidden") &&
      /\baria-hidden\s*=\s*("true"|'true')/i.test(rawAttrs)
    ) {
      attrs.push('aria-hidden="true"');
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
