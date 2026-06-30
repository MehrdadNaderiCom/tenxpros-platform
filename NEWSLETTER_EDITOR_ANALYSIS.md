# Newsletter authoring: editor and email-render analysis

Goal: a professional newsletter authoring experience whose output renders
reliably in real inboxes (Gmail, Outlook, Apple Mail, mobile), not just in a
browser. Email HTML is not web HTML, so the editor output must pass through an
email-safe rendering layer.

## What was wrong before

The previous editor stored `editor.getHTML()` (raw browser HTML) directly and
wrapped it in a hand-built shell. Two real problems:

1. No email transform: browser HTML (semantic tags, web CSS) is not reliable in
   Outlook or many mobile clients (no bulletproof buttons, no table layout, no
   Outlook conditional handling).
2. No sanitization: raw editor HTML went straight into the body and into emails,
   an injection risk.

## Options evaluated (against 10 criteria + this Next standalone codebase)

A parallel review scored each candidate on email reliability, HTML cleanliness,
block coverage, responsiveness, cross-client predictability, previews, plain-text,
sanitization, maintainability, and maturity.

| Approach | Email reliability | Integration risk here | Verdict |
| --- | --- | --- | --- |
| TipTap + MJML transform (chosen) | High | Low (see note) | Adopt |
| TipTap + hand-rolled email HTML | High | Low | Strong runner-up |
| React Email render pipeline | High | Low | Strong runner-up |
| Lexical + custom transform | Medium | High | Rejected: heavier, custom transform, less email-proven |
| Plate + custom transform | Medium | High | Rejected: younger, smaller ecosystem |
| Editor.js + custom renderer | Medium | Medium | Rejected: email rendering entirely bespoke |
| Unlayer (react-email-editor) | High | Medium | Rejected: hosted component, project-id, heavier vendor coupling |
| GrapesJS + grapesjs-mjml | High | High | Rejected: heavy drag-drop builder, large integration surface |

Note on MJML integration risk: the generic concern is Next standalone bundling.
It does not apply here, because the container runs `next start` against the full
`node_modules` (the Dockerfile copies all of `/app`), and MJML is marked
`serverComponentsExternalPackages`, so it is required at runtime and never
bundled. MJML compilation was verified server-side (table-based HTML, Outlook
`mso` conditionals, responsive `@media`, bulletproof buttons, alt text).

## Decision: TipTap + MJML

We keep TipTap as the authoring surface (mature, already in use, great editing UX)
and add a dedicated email-safe rendering layer that converts the editor's
structured document into MJML, which MJML compiles into battle-tested email HTML.

Why MJML over the hand-rolled runner-up:

- MJML is the reputable, email-specific standard (by Mailjet) and was the
  approach the brief explicitly favored. It handles the hardest cross-client
  parts (Outlook VML buttons, bulletproof responsive) so we do not hand-write
  fragile VML.
- We still author the editor-JSON to MJML serializer either way, and emitting
  simple MJML tags (`mj-text`, `mj-button`, `mj-image`, `mj-divider`) is much
  simpler and safer than hand-writing the final Outlook HTML.
- It composes with strong sanitization: we serialize from the editor's structured
  JSON (not raw HTML), escaping all text, allowing only a small set of inline
  marks (bold, italic, link), and validating every URL. No script or unsafe
  handler can survive.

Why not React Email (the other strong "adopt"): it is an excellent server render
pipeline, but it is component/JSX authored, not a browser WYSIWYG. We would still
need a block editor plus a JSON-to-component mapping, i.e. the same serializer
effort, plus a second render dependency. MJML keeps one clear path.

## How the chosen design meets each requirement

- Real email rendering: MJML compiler (Outlook conditionals, responsive).
- Clean HTML: structured JSON to MJML to table-based inline-styled HTML.
- Blocks: headings, paragraphs, links, buttons (CTA), dividers, callouts, images,
  lists, quotes, spacing, all as editor nodes mapped to MJML.
- Mobile responsive: MJML is responsive by default; preview at desktop and mobile.
- Predictable cross-client: MJML is built for exactly this.
- Previews: desktop iframe, mobile iframe, plain-text, and raw HTML source.
- Plain text: generated from the structured JSON (clean, deterministic).
- Sanitization: structured serialize + escape + URL validation, no raw HTML.
- One pipeline: preview, test-send, final-send, and the immutable snapshot all
  call the same `renderNewsletter(doc)` so output is identical everywhere.
- Snapshot: the final compiled HTML and text are frozen on send.
