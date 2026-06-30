import { describe, it, expect } from "vitest";
import { renderNewsletter, renderCampaign, safeUrl, escapeHtml, docHasContent, type TipTapDoc } from "../src/lib/email/newsletter-render";

const OPTS = { subject: "Test subject", unsubscribeUrl: "https://tenxpros.com/u/TOK", senderIdentity: "TenXPros, Naprolity OU" };

const fullDoc: TipTapDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Monthly note" }] },
    { type: "paragraph", content: [
      { type: "text", text: "Bold ", marks: [{ type: "bold" }] },
      { type: "text", text: "and a " },
      { type: "text", text: "link", marks: [{ type: "link", attrs: { href: "https://tenxpros.com" } }] },
      { type: "text", text: " and " },
      { type: "text", text: "xss", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
    ] },
    { type: "button", attrs: { href: "https://tenxpros.com/apply", label: "Apply now", align: "center" } },
    { type: "horizontalRule" },
    { type: "callout", attrs: { tone: "warning" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Deadline in 48 hours." }] }] },
    { type: "image", attrs: { src: "https://tenxpros.com/a.png", alt: "Diagram", width: 480 } },
    { type: "image", attrs: { src: "javascript:evil()", alt: "evil" } },
    { type: "bulletList", content: [
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Two" }] }] },
    ] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "A quote." }] }] },
    { type: "paragraph", content: [{ type: "text", text: "The TenXPros team", marks: [{ type: "bold" }] }] },
  ],
};

describe("safeUrl", () => {
  it("allows http(s) and mailto links", () => {
    expect(safeUrl("https://x.com", "link")).toBe("https://x.com");
    expect(safeUrl("http://x.com", "link")).toBe("http://x.com");
    expect(safeUrl("mailto:a@b.co", "link")).toBe("mailto:a@b.co");
  });
  it("allows only http(s) images, not mailto", () => {
    expect(safeUrl("https://x.com/a.png", "image")).toBe("https://x.com/a.png");
    expect(safeUrl("mailto:a@b.co", "image")).toBe("");
  });
  it("rejects javascript, data, vbscript, and junk", () => {
    for (const u of ["javascript:alert(1)", "data:text/html,x", "vbscript:msgbox", "  javascript:x", "file:///etc", "//evil.com"]) {
      expect(safeUrl(u, "link"), u).toBe("");
    }
  });
});

describe("escapeHtml + docHasContent", () => {
  it("escapes angle brackets and ampersands", () => {
    expect(escapeHtml('<script>&"')).toBe('&lt;script&gt;&amp;"');
  });
  it("detects real content vs empty doc", () => {
    expect(docHasContent({ type: "doc", content: [{ type: "paragraph" }] })).toBe(false);
    expect(docHasContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "   " }] }] })).toBe(false);
    expect(docHasContent({ type: "doc", content: [{ type: "image", attrs: { src: "https://x/a.png" } }] })).toBe(true);
    expect(docHasContent(fullDoc)).toBe(true);
  });
});

describe("renderNewsletter: email-safe output", () => {
  const r = renderNewsletter(fullDoc, OPTS);
  it("compiles with no MJML errors", () => expect(r.errors).toEqual([]));
  it("produces table-based HTML with Outlook conditionals and a responsive media query", () => {
    expect(r.html).toContain("<table");
    expect(r.html.includes("mso") || r.html.includes("<!--[if")).toBe(true);
    expect(r.html).toContain("@media");
  });
  it("includes every block", () => {
    expect(r.html).toContain("Monthly note");
    expect(r.html).toContain("Apply now");
    expect(r.html).toContain("#FFFBEB"); // warning callout bg
    expect(r.html).toContain('alt="Diagram"');
    expect(r.html).toContain("One");
    expect(r.html).toContain("A quote.");
    expect(r.html).toContain("<strong>The TenXPros team</strong>");
  });
  it("contains no script tags, no javascript: URLs, and no event handlers", () => {
    expect(/<script/i.test(r.html)).toBe(false);
    expect(/javascript:/i.test(r.html)).toBe(false);
    expect(/<[^>]*\son[a-z]+\s*=/i.test(r.html)).toBe(false); // no onerror=/onclick= etc. inside a tag
    expect(r.html).not.toContain("evil()");
  });
  it("generates a plain-text fallback with the unsubscribe line", () => {
    expect(r.text).toContain("Monthly note");
    expect(r.text).toContain("Apply now: https://tenxpros.com/apply");
    expect(r.text).toContain("Unsubscribe in one click: https://tenxpros.com/u/TOK");
  });
  it("is deterministic (same input renders identically)", () => {
    expect(renderNewsletter(fullDoc, OPTS).html).toBe(r.html);
  });
});

describe("renderCampaign", () => {
  it("renders from bodyJson", () => {
    const r = renderCampaign({ bodyJson: JSON.stringify(fullDoc) }, OPTS);
    expect(r.html).toContain("Monthly note");
  });
  it("falls back safely for legacy bodyHtml and never leaks script", () => {
    const r = renderCampaign({ bodyHtml: "<p>Hello <script>alert(1)</script></p>" }, OPTS);
    expect(/<script/i.test(r.html)).toBe(false);
    expect(r.html).toContain("Hello");
  });
  it("handles an empty/invalid doc without throwing", () => {
    expect(() => renderCampaign({ bodyJson: "not json" }, OPTS)).not.toThrow();
    expect(() => renderCampaign({}, OPTS)).not.toThrow();
  });
});
