import mjml2html from "mjml";

/**
 * Email-safe rendering layer for the newsletter. The editor produces a structured
 * TipTap/ProseMirror JSON document; this converts it to MJML and compiles MJML to
 * battle-tested, cross-client email HTML (Outlook conditionals, bulletproof
 * buttons, responsive). It also derives a clean plain-text alternative.
 *
 * Safety: output is built from the structured JSON, never from raw editor HTML.
 * All text is escaped, only bold/italic/link inline marks are allowed, and every
 * URL is validated. No script, style, or event-handler can survive.
 *
 * This is the single pipeline used by the preview, the test send, the final send,
 * and the immutable snapshot, so all four are guaranteed identical.
 */

export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}
export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
}
export interface TipTapDoc {
  type: "doc";
  content?: TipTapNode[];
}

const NAVY = "#0B1F3A";
const GOLD = "#B58A3C";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const CALLOUT_TONES: Record<string, { bg: string; border: string }> = {
  info: { bg: "#F0F9FF", border: "#0EA5E9" },
  warning: { bg: "#FFFBEB", border: "#F59E0B" },
  success: { bg: "#ECFDF5", border: "#10B981" },
  neutral: { bg: "#F8FAFC", border: "#94A3B8" },
};

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

/** Allow only safe URL schemes. Links allow mailto; images do not. Returns "" if unsafe. */
export function safeUrl(raw: unknown, kind: "link" | "image"): string {
  if (typeof raw !== "string") return "";
  const url = raw.trim();
  if (!url) return "";
  const lower = url.toLowerCase();
  if (lower.startsWith("https://") || lower.startsWith("http://")) return url;
  if (kind === "link" && lower.startsWith("mailto:")) return url;
  // Reject javascript:, data:, vbscript:, file:, and protocol-relative tricks.
  return "";
}

function renderInline(nodes?: TipTapNode[]): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "<br/>";
      if (n.type !== "text" || typeof n.text !== "string") return "";
      let out = escapeHtml(n.text);
      for (const mark of n.marks ?? []) {
        if (mark.type === "bold" || mark.type === "strong") out = `<strong>${out}</strong>`;
        else if (mark.type === "italic" || mark.type === "em") out = `<em>${out}</em>`;
        else if (mark.type === "strike" || mark.type === "s") out = `<span style="text-decoration:line-through;">${out}</span>`;
        else if (mark.type === "code") out = `<code style="font-family:Menlo,Consolas,monospace;background:#F1F5F9;padding:1px 5px;border-radius:3px;font-size:90%;">${out}</code>`;
        else if (mark.type === "link") {
          const href = safeUrl(mark.attrs?.href, "link");
          if (href) out = `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" style="color:${NAVY};">${out}</a>`;
        }
      }
      return out;
    })
    .join("");
}

function inlineText(nodes?: TipTapNode[]): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "\n";
      if (n.type === "text" && typeof n.text === "string") {
        const link = n.marks?.find((m) => m.type === "link");
        const href = link ? safeUrl(link.attrs?.href, "link") : "";
        return href ? `${n.text} (${href})` : n.text;
      }
      return "";
    })
    .join("");
}

function listItems(node: TipTapNode): string {
  return (node.content ?? [])
    .map((li) => {
      const inner = (li.content ?? []).map((p) => renderInline(p.content)).join(" ");
      return `<li style="margin:0 0 6px;">${inner}</li>`;
    })
    .join("");
}

/** Recursively collect all descendant text, so a catch-all never drops content. */
function collectText(node: TipTapNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(collectText).filter(Boolean).join(" ");
}

function blockToMjml(node: TipTapNode): string {
  switch (node.type) {
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const size = level <= 2 ? "22px" : "18px";
      return `<mj-text padding="16px 0 6px" font-size="${size}" font-weight="700" color="${NAVY}" line-height="1.3">${renderInline(node.content)}</mj-text>`;
    }
    case "paragraph": {
      const inner = renderInline(node.content);
      if (!inner) return `<mj-spacer height="10px" />`;
      return `<mj-text padding="6px 0" font-size="15px" line-height="1.7" color="#334155">${inner}</mj-text>`;
    }
    case "bulletList":
      return `<mj-text padding="6px 0" font-size="15px" line-height="1.7" color="#334155"><ul style="margin:0;padding-left:22px;">${listItems(node)}</ul></mj-text>`;
    case "orderedList":
      return `<mj-text padding="6px 0" font-size="15px" line-height="1.7" color="#334155"><ol style="margin:0;padding-left:22px;">${listItems(node)}</ol></mj-text>`;
    case "blockquote": {
      const inner = (node.content ?? []).map((p) => renderInline(p.content)).join("<br/>");
      return `<mj-text padding="6px 0"><blockquote style="margin:0;border-left:3px solid ${GOLD};padding:2px 0 2px 14px;color:#475569;font-style:italic;font-size:15px;line-height:1.7;">${inner}</blockquote></mj-text>`;
    }
    case "horizontalRule":
      return `<mj-divider border-color="#E3E8EF" border-width="1px" padding="14px 0" />`;
    case "image": {
      const src = safeUrl(node.attrs?.src, "image");
      if (!src) return "";
      const alt = escapeAttr(String(node.attrs?.alt ?? ""));
      const w = Number(node.attrs?.width);
      const widthAttr = Number.isFinite(w) && w > 0 ? ` width="${Math.min(Math.round(w), 600)}px"` : "";
      return `<mj-image src="${escapeAttr(src)}" alt="${alt}"${widthAttr} padding="12px 0" align="center" />`;
    }
    case "button": {
      const href = safeUrl(node.attrs?.href, "link");
      const label = escapeHtml(String(node.attrs?.label ?? "Open"));
      if (!href) return "";
      const align = ["left", "center", "right"].includes(String(node.attrs?.align)) ? String(node.attrs?.align) : "left";
      return `<mj-button href="${escapeAttr(href)}" background-color="${NAVY}" color="#ffffff" border-radius="8px" font-weight="600" font-size="15px" inner-padding="12px 26px" padding="14px 0" align="${align}">${label}</mj-button>`;
    }
    case "callout": {
      const tone = CALLOUT_TONES[String(node.attrs?.tone ?? "info")] ?? CALLOUT_TONES.info;
      const inner = (node.content ?? []).map((p) => renderInline(p.content)).join("<br/>");
      return `<mj-text padding="10px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="background:${tone.bg};border-left:4px solid ${tone.border};padding:14px 16px;border-radius:6px;color:#334155;font-size:14px;line-height:1.6;">${inner}</td></tr></table></mj-text>`;
    }
    default: {
      // Catch-all: never silently drop content from an unexpected node type.
      const t = collectText(node);
      return t ? `<mj-text padding="6px 0" font-size="15px" line-height="1.7" color="#334155">${escapeHtml(t)}</mj-text>` : "";
    }
  }
}

function blockToText(node: TipTapNode): string {
  switch (node.type) {
    case "heading":
      return `${inlineText(node.content)}\n`;
    case "paragraph":
      return `${inlineText(node.content)}\n`;
    case "bulletList":
    case "orderedList":
      return (node.content ?? []).map((li) => `- ${(li.content ?? []).map((p) => inlineText(p.content)).join(" ")}`).join("\n") + "\n";
    case "blockquote":
      return (node.content ?? []).map((p) => `> ${inlineText(p.content)}`).join("\n") + "\n";
    case "horizontalRule":
      return "----------\n";
    case "image":
      return node.attrs?.alt ? `[Image: ${String(node.attrs.alt)}]\n` : "[Image]\n";
    case "button": {
      const href = safeUrl(node.attrs?.href, "link");
      return href ? `${String(node.attrs?.label ?? "Open")}: ${href}\n` : "";
    }
    case "callout":
      return (node.content ?? []).map((p) => inlineText(p.content)).join("\n") + "\n";
    default: {
      const t = collectText(node);
      return t ? `${t}\n` : "";
    }
  }
}

export interface RenderResult {
  html: string;
  text: string;
  mjml: string;
  errors: string[];
}

export function renderNewsletter(
  doc: TipTapDoc | null | undefined,
  opts: { subject: string; unsubscribeUrl: string; senderIdentity?: string },
): RenderResult {
  const blocks = doc?.content ?? [];
  const bodyMjml = blocks.map(blockToMjml).filter(Boolean).join("\n") || `<mj-text padding="6px 0">&nbsp;</mj-text>`;
  const unsub = escapeAttr(opts.unsubscribeUrl);
  const identity = opts.senderIdentity ? `<br/>${escapeHtml(opts.senderIdentity)}` : "";

  const mjmlSrc = `<mjml>
  <mj-head>
    <mj-preview>${escapeHtml(opts.subject).slice(0, 140)}</mj-preview>
    <mj-attributes>
      <mj-all font-family="${FONT}" />
    </mj-attributes>
    <mj-style>a { color: ${NAVY}; }</mj-style>
  </mj-head>
  <mj-body background-color="#EEF2F7" width="600px">
    <mj-section background-color="${NAVY}" padding="22px 32px">
      <mj-column>
        <mj-text color="#ffffff" font-size="19px" font-weight="700" padding="0">TenXPros <span style="font-size:12px;color:#9FB0C8;font-weight:400;">Newsletter</span></mj-text>
      </mj-column>
    </mj-section>
    <mj-section padding="0"><mj-column><mj-divider border-width="3px" border-color="${GOLD}" padding="0" /></mj-column></mj-section>
    <mj-section background-color="#ffffff" padding="26px 32px 6px">
      <mj-column>
${bodyMjml}
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="0 32px 28px">
      <mj-column>
        <mj-divider border-color="#E3E8EF" border-width="1px" padding="10px 0 14px" />
        <mj-text font-size="12px" color="#94A3B8" line-height="1.7" padding="0">You are receiving this because you subscribed to the TenXPros newsletter. <a href="${unsub}" style="color:#64748B;text-decoration:underline;">Unsubscribe in one click</a>.<br/>This newsletter is sent from a send-only address. Please do not reply to this email.${identity}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

  const compiled = mjml2html(mjmlSrc, { validationLevel: "soft", minify: false });

  const text = [
    blocks.map(blockToText).filter(Boolean).join("\n").trim(),
    "",
    "You are receiving this because you subscribed to the TenXPros newsletter.",
    `Unsubscribe in one click: ${opts.unsubscribeUrl}`,
    "This newsletter is sent from a send-only address. Please do not reply to this email.",
    ...(opts.senderIdentity ? [opts.senderIdentity] : []),
  ].join("\n");

  return {
    html: compiled.html,
    text,
    mjml: mjmlSrc,
    errors: compiled.errors.map((e) => e.formattedMessage),
  };
}

/** True if the editor document has real content (text, image, button, or divider). */
export function docHasContent(doc: TipTapDoc | null | undefined): boolean {
  let found = false;
  const walk = (n: TipTapNode | TipTapDoc) => {
    if (found || !n) return;
    const node = n as TipTapNode;
    if (node.type === "text" && typeof node.text === "string" && node.text.trim()) found = true;
    if (node.type === "image" || node.type === "button" || node.type === "horizontalRule") found = true;
    (("content" in n && n.content) || []).forEach(walk);
  };
  if (doc) walk(doc);
  return found;
}

/**
 * Render a campaign's email from its stored structured body. bodyJson (the editor
 * document) is the source of truth. If a legacy campaign only has bodyHtml, it is
 * rendered as a single escaped paragraph so it still sends safely. This is the one
 * function used by preview, test send, final send, and the immutable snapshot.
 */
export function renderCampaign(
  input: { bodyJson?: string | null; bodyHtml?: string | null },
  opts: { subject: string; unsubscribeUrl: string; senderIdentity?: string },
): RenderResult {
  if (input.bodyJson) {
    try {
      const doc = JSON.parse(input.bodyJson) as TipTapDoc;
      if (doc && doc.type === "doc") return renderNewsletter(doc, opts);
    } catch {
      // fall through to the legacy path
    }
  }
  const legacyText = (input.bodyHtml ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const doc: TipTapDoc = { type: "doc", content: legacyText ? [{ type: "paragraph", content: [{ type: "text", text: legacyText }] }] : [] };
  return renderNewsletter(doc, opts);
}
