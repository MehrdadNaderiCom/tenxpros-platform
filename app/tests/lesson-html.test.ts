import { describe, it, expect } from "vitest";
import { sanitizeLessonHtml, htmlToPlainText, plainTextParagraphs } from "../src/lib/academy/lesson-html";

describe("sanitizeLessonHtml", () => {
  it("keeps allowed structural tags", () => {
    const html = "<h2>Title</h2><p>Hello <strong>world</strong></p><ul><li>One</li></ul>";
    const out = sanitizeLessonHtml(html);
    expect(out).toContain("<h2>");
    expect(out).toContain("<strong>");
    expect(out).toContain("<li>");
  });

  it("strips script and style blocks entirely", () => {
    const out = sanitizeLessonHtml('<p>ok</p><script>alert(1)</script><style>p{}</style>');
    expect(out).not.toMatch(/script/i);
    expect(out).not.toMatch(/alert/i);
    expect(out).not.toMatch(/<style/i);
    expect(out).toContain("<p>ok</p>");
  });

  it("removes event handler attributes", () => {
    const out = sanitizeLessonHtml('<p onclick="steal()">hi</p>');
    expect(out).not.toMatch(/onclick/i);
    expect(out).toContain("hi");
  });

  it("drops javascript: links but keeps safe hrefs", () => {
    const bad = sanitizeLessonHtml('<a href="javascript:alert(1)">x</a>');
    expect(bad).not.toMatch(/javascript:/i);
    const good = sanitizeLessonHtml('<a href="https://tenxpros.com">x</a>');
    expect(good).toContain('href="https://tenxpros.com"');
    expect(good).toContain('rel="noopener noreferrer"');
  });

  it("unwraps unknown tags but keeps their text", () => {
    const out = sanitizeLessonHtml("<marquee>scroll</marquee>");
    expect(out).not.toMatch(/marquee/i);
    expect(out).toContain("scroll");
  });

  it("keeps only allowlisted classes (callout frames)", () => {
    const out = sanitizeLessonHtml('<div class="callout callout-tip evil">tip</div>');
    expect(out).toContain('class="callout callout-tip"');
    expect(out).not.toMatch(/evil/);
  });

  it("escapes a double-quote in an href so it cannot break out of the attribute", () => {
    // A single-quoted source href may carry an embedded double-quote. Without
    // escaping it would close the emitted attribute early and inject a handler.
    const out = sanitizeLessonHtml(`<a href='/path" onmouseover="alert(1)'>x</a>`);
    // Every embedded quote becomes an inert entity inside the value, so the
    // attribute cannot be closed early: no raw `href="/path"` followed by a handler.
    expect(out).not.toMatch(/href="\/path"\s+onmouseover/i);
    expect(out).toContain('/path&quot; onmouseover=&quot;alert(1)');
  });

  it("escapes a double-quote in an img src so it cannot break out of the attribute", () => {
    const out = sanitizeLessonHtml(`<img src='/img" onerror="alert(1)' alt="ok">`);
    expect(out).not.toMatch(/src="\/img"\s+onerror/i);
    expect(out).toContain('/img&quot; onerror=&quot;alert(1)');
  });

  it("still emits a normal href unchanged (no over-escaping of quote-free urls)", () => {
    const out = sanitizeLessonHtml('<a href="https://tenxpros.com/x?a=1">x</a>');
    expect(out).toContain('href="https://tenxpros.com/x?a=1"');
    expect(out).not.toContain("&quot;");
  });
});

describe("htmlToPlainText", () => {
  it("renders block boundaries as paragraph breaks and strips tags", () => {
    const text = htmlToPlainText("<h2>A</h2><p>B</p><p>C</p>");
    expect(text).toBe("A\n\nB\n\nC");
  });

  it("decodes common entities", () => {
    expect(htmlToPlainText("<p>a &amp; b</p>")).toBe("a & b");
  });

  it("splits into paragraphs", () => {
    expect(plainTextParagraphs("one\n\ntwo")).toEqual(["one", "two"]);
  });
});
