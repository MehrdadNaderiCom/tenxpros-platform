# TenXPros — Sample Dossier Design Report

**Asset:** Living AI Solution Dossier — Illustrative Sample Excerpt
**Design direction:** "The Instrument" — engineered precision, restrained, premium
**Status:** Complete · public artifact only · internal production notes excluded
**Date:** 2026-06-06

---

## 1. Files created

| File | Purpose |
|---|---|
| `app/public/samples/tenxpros-sample-dossier-excerpt.html` | Standalone, self-contained designed HTML of the **public artifact only**. Opens locally with no network dependencies. |
| `app/public/samples/tenxpros-sample-dossier-excerpt.pdf` | Print-CSS PDF rendered from the HTML. **11 pages**, A4. |
| `app/public/samples/tenxpros-sample-dossier-cover.png` | High-resolution cover/preview image (1680 × 2376 px) for the Home and Dossier pages. |
| `scripts/generate-sample-dossier-pdf.mjs` | Node script that renders the PDF and the cover PNG from the HTML using headless Chromium. No heavy dependencies. |
| `TENXPROS_SAMPLE_DOSSIER_EXCERPT_V2_PUBLIC_READY.md` | The approved V2 source content, persisted as the canonical build source (see note in §10). |
| `docs/design/TENXPROS_SAMPLE_DOSSIER_DESIGN_REPORT.md` | This report. |

**No website application logic was modified.** No server actions, auth, database, routes, or existing page logic were touched. The only additions are static assets under `app/public/samples/`, a build script under `scripts/`, the source markdown, and this report.

---

## 2. Design system — "The Instrument"

A restrained, engineered evidence artifact — deliberately unlike course material or a university paper. Principles applied:

- **Near-black / deep-navy cover** with a single cool-indigo accent and fine hairline rules.
- **Monospace labels and metadata** (section kickers, table headers, meta keys, the recurring motif) against serif body copy — the editorial-technical contrast of a serious dossier.
- **Carefully structured tables** with mono uppercase headers, centered numeric columns, generous-but-tight row rhythm, and hairline separators.
- **Gold used only for credential / seal moments** and for the one *intentional evidence gap* — never decoratively.
- **Reviewer notes as distinct callouts** — review is the product, so the assessment voice is visually separated from body text throughout.
- No stock imagery, no fake logos, no fake testimonials, no exaggerated claims.

### Recurring motif
The boundary **"AI drafts; a human owns the output"** recurs as:
- a small mono line at the top-right of every flowing section header (`.sec-head::after`),
- a quiet indigo banner on the "What this sample shows" and Executive Snapshot pages,
- bold inline emphasis everywhere the source states it (§3, §6, §7, §12).

### Seal / credential motif
A restrained circular **gold seal** (concentric hairline rings; arced "THE TENX METHOD" and "FRAME · DESIGN · PROVE · FORESEE"; "TXP" monogram; "10×" mark) appears twice — large on the cover, smaller beside the Rubric Mapping where the credential logic is explained. It reads as *a mark of standard, not a trophy*. The final-page footer states plainly that credential verification applies to issued certifications, **not** to this illustrative sample.

---

## 3. Typography

| Role | Stack | Notes |
|---|---|---|
| Body copy | `"Iowan Old Style", "Charter", "Georgia", "Times New Roman", serif` | 10 pt / 1.4 line-height. High-readability serif gives the gravitas of a professional dossier and separates it from generic (usually sans) course material. |
| Headings / UI | `"Inter", "Helvetica Neue", "Segoe UI", Roboto, Arial, system-ui, sans-serif` | Tight, low-contrast section titles; engineered feel. |
| Labels / metadata / mono | `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace` | Uppercase, letter-spaced. Section kickers, table headers, meta keys, the recurring motif, the seal text. |

All fonts are **system stacks** — no web-font requests, so the HTML is fully self-contained and renders identically offline and in print. Smallest type used is the mono micro-label (~6 pt for the recurring motif and running labels only); **body copy is 10 pt and table copy is 8.7 pt** to satisfy the readability requirement (no tiny body text, no low-contrast body copy). Tables stay legible on screen and in print.

---

## 4. Color palette

| Token | Hex | Use |
|---|---|---|
| Near-black ink | `#16181D` | Body text (high contrast on white). |
| Soft ink | `#454B59` | Secondary copy. |
| Faint ink | `#767C8C` | Mono labels, captions. |
| Hairline | `#E5E7EE` / `#CBD0DB` | Rules, table borders. |
| Cover navy | `#10152A` → `#0A0D18` → `#05070F` | Cover gradient field. |
| **Cool indigo** | `#5664E6` (accent) · `#3A47C7` (deep) · `#F1F2FD` (tint) · `#CBD0F7` (line) | The single accent: reviewer notes, banners, primary use-case row, section kickers. |
| **Restrained gold** | `#C2A057` / `#CBAA63` (cover seal) · `#9F8338` (deep, on light) · `#FAF5E9` (tint) · `#E6D6AC` (line) | Seal, the credential/"fully certifiable" box, and the **intentional evidence gap** only. |
| Page | `#FFFFFF` body · `#F6F7FB` tint | White printed pages; near-black cover. |

The gap is rendered in **calm gold, never red** — "visually clear but not alarming," consistent with the brief's instruction that the gap and the "what would make this certifiable" section read as a high-trust review mechanism, not a failure note.

---

## 5. Layout decisions

- **Page model.** Named CSS paged media: `@page cover { margin: 0 }` gives the cover a true full-bleed dark field; the default `@page { margin: 14mm 0 }` gives every other page top/bottom breathing room. Side margins come from a 14 mm sheet padding.
- **Opening sequence (anchored full pages):** Cover → *What this sample shows* (bordered intro panel) → *Executive Snapshot* (with the reframed review-outcome table) — each a deliberate, full-height statement page.
- **Continuous flow for the body:** *The dossier at a glance* through the twelve sections, *What would make this fully certifiable?*, *Eight Assets Map*, and *Rubric Mapping* **flow and pack each page full**, rather than one-section-per-page (which wasted half-pages and pushed the document to 15–16 pages). Headings are kept with their content (`break-after: avoid`); callouts, panels, banners, and the seal block never split; tables may break across pages but keep rows intact and repeat their headers.
- **Reviewer-note callouts:** a consistent indigo left-bar style, with the four "review is the product" notes (§5, §7, §10, §12) given extra visual weight (a ◆ marker). The §10 "decisive section" note and the snapshot's value-evidence row use the gold gap treatment.
- **Tables:** mono uppercase headers, centered numeric/score columns, primary use-case row tinted indigo, the gap rows tinted gold. Left-aligned text, scannable spacing.
- **Final page** ends on a full page with the closing disclaimer, the method/thread line, and the quiet verification footer.

### Resulting page order (11 pages)
1. Cover · 2. What this sample shows · 3. Executive Snapshot · 4. The dossier at a glance (+ §1–2 begin) · 5. §3–4 · 6. §5–7 · 7. §7–9 · 8. §10–11 · 9. §11–12 + *What would make this fully certifiable?* · 10. Eight Assets Map + Rubric Mapping (begin) · 11. Rubric Mapping + closing disclaimer.

(The flow packs sections tightly, so exact section/page coincidence differs slightly from the source's suggested 11-page split, but every required page and section is present and the count lands inside the 10–12 target.)

---

## 6. Content included (the public artifact)

Everything up to and including the closing disclaimer, verbatim from the approved V2 source:

- Cover (title, method, fictional participant Maya R., status, disclaimer, seal).
- *What this sample shows* (5 bullets).
- Executive Snapshot (context, AI will/won't, hypothesis-framed value, the 8-row dimension table with the gap row, 90-day direction).
- *The dossier at a glance* (12-section index + mapping note).
- The **twelve dossier sections** in full, each with its reviewer note(s) and the source tables (stakeholders, use-case portfolio, before/after workflow, risk register, proof-plan rubric, 5-case test set, value hypotheses, 90-day roadmap).
- *What would make this fully certifiable?* (the six-item evidence box).
- Eight Assets Map.
- Rubric Mapping — the TenXPros 8 review criteria (with the seal block).
- Closing disclaimer + method/thread line.

**Substance, review logic, and the illustrative/fictional framing were preserved exactly — nothing was rewritten, softened, or re-judged.**

---

## 7. Content intentionally excluded

- **Everything after the marker** `END OF PUBLIC ARTIFACT — INTERNAL PRODUCTION NOTES BELOW`: the PDF layout notes, the website excerpt copy, and the final quality checklist. These are build-team guidance and appear **only** in the source markdown, never in the HTML, PDF, or cover image.
- The exclusion is enforced two ways: the public HTML was authored from the public content only, **and** the generator script (`generate-sample-dossier-pdf.mjs`) refuses to build if the HTML contains any internal-notes marker (`END OF PUBLIC ARTIFACT`, `INTERNAL PRODUCTION NOTES`, `Website excerpt copy`, `Final quality checklist`, `Home-page teaser`).
- Verified: `pdftotext` of the final PDF contains **0** occurrences of any internal-notes marker.

The brief's internal guidance *was* honored as design direction (recurring motif, highlighted reviewer notes, seal placement, gap treatment, CTA framing) — but the guidance text itself is not in the published asset.

---

## 8. How the PDF / assets should be embedded on the website

These are recommendations for a later, separate task — **no site code was changed here.**

- **Dossier page (`/dossier`):** Embed the first 2–3 rendered pages inline (cover → *What this sample shows* → Executive Snapshot) as real images, then a **"Preview the full sample"** control that opens `/samples/tenxpros-sample-dossier-excerpt.pdf` (or the HTML) in a new tab. Suggested intro copy is in the source markdown's "Dossier-page intro" line.
- **Home page (`/`):** Show a single rendered page as a real object — the Executive Snapshot or the Eight Assets Map (or the `…-cover.png`) — linking to the full sample. Avoid stock imagery.
- **Pricing page:** A trust line linking to the sample ("You're not buying a course — you're earning a reviewed professional asset").
- **Apply page:** A reassurance line linking to the sample.
- **CTA everywhere:** *Preview a sample dossier* — with the microcopy disclaimer ("Illustrative sample. Fictional participant. No real client data. Review labels are illustrative, not a certification decision.") adjacent to the link/embed.
- **Serving:** assets live under `app/public/samples/`, so they are served at `/samples/…` by Next.js's static handling with no routing changes.
- **Metadata:** the HTML carries `<meta name="robots" content="noindex">` so a directly-served preview is not separately indexed; remove if a standalone indexable page is desired.

---

## 9. Generation issues encountered (and how they were resolved)

| Issue | Resolution |
|---|---|
| **Snap Chromium is AppArmor-confined** — cannot read/write `/opt`, and the snap `home` interface blocks hidden (dot) directories. | The script stages the HTML in a **non-hidden** `$HOME/tenxpros-build-*` directory, renders there, and copies the artifacts back into the repo. Harmless `dbus`/`UPower` stderr noise from the snap is ignored. |
| **`position: fixed` does not repeat per printed page** in this Chromium (148) — a fixed footer rendered once (page-1 bottom / page-2 top), not as a running element. | Abandoned CSS running footers; the recurring motif is carried by a per-section header element instead, plus the banners and inline emphasis. |
| **Full-bleed cover vs. margined body** conflict. | Verified named-page support and used `@page cover { margin: 0 }` for the cover while the default page keeps top/bottom margins. |
| **Page count too high (15–16)** under a rigid one-section-per-sheet model with `min-height: 297mm`, which turned any 1.05-page section into a wasteful 2-page spread. | Switched the body to continuous flow with intelligent break rules; tuned rhythm; let "The dossier at a glance" begin the flow. Final: **11 pages**, every page full. |
| **Seal did not render** — `<symbol>` + `<use>` with class-based CSS fills was dropped on Chromium's print path. | Replaced with self-contained inline SVG seals using **presentation attributes** (no `<use>`, no CSS-dependent fills). Renders identically in browser and print. |
| **Cover content overflowed** because `.sheet.cover { padding: 0 }` (specificity 0,2,0) overrode `.cover { padding }` (0,1,0). | Removed the conflicting override so the cover's intended padding applies; added `overflow: hidden` for the inset hairline frame. |

**PDF generation succeeded.** Output: 11 pages, A4 (594.96 × 841.92 pt), ~455 KB.

---

## 10. Note on the source file

The brief referenced `TENXPROS_SAMPLE_DOSSIER_EXCERPT_V2_PUBLIC_READY.md` as already in the repo, but **no such file was physically present** anywhere on the system at build time (verified by filesystem search). The approved V2 content was provided directly (as an upload) and arrived with mojibake from an encoding round-trip (e.g. `Â·`, `â`). The exact approved content was therefore persisted to that path as the canonical build source, with punctuation **normalized to proper UTF-8** (`·`, `—`, `–`, `→`, `≥`, typographic quotes) — **substance unchanged, nothing rewritten**. The HTML/PDF/cover were designed strictly from that content; no new dossier content was authored.

---

## 11. Exact commands run

Environment probe and setup:

```bash
# Confirm the source was/was not present; check tooling
find / -iname "*SAMPLE_DOSSIER*EXCERPT*" -o -iname "*V2_PUBLIC_READY*" 2>/dev/null
chromium-browser --version            # Chromium 148.0.7778.167 (snap)
mkdir -p app/public/samples docs/design scripts
```

Generate the PDF and cover PNG (the documented build step):

```bash
node scripts/generate-sample-dossier-pdf.mjs
# -> app/public/samples/tenxpros-sample-dossier-excerpt.pdf  (11 pages)
# -> app/public/samples/tenxpros-sample-dossier-cover.png    (1680 x 2376)
```

Under the hood, the script runs (staged in a snap-accessible `$HOME` dir):

```bash
# PDF
chromium-browser --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --hide-scrollbars --no-pdf-header-footer --print-to-pdf-no-header \
  --print-to-pdf="$STAGE/dossier.pdf" "file://$STAGE/dossier.html"

# Cover PNG (cover-only capture variant, A4 portrait ratio, 2x)
chromium-browser --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --hide-scrollbars --force-device-scale-factor=2 --window-size=840,1188 \
  --screenshot="$STAGE/cover.png" "file://$STAGE/cover.html"
```

Verification:

```bash
pdfinfo app/public/samples/tenxpros-sample-dossier-excerpt.pdf | grep -E "Pages|Page size"
#   Pages: 11 ; Page size: 594.96 x 841.92 pts (A4)

# Confirm no internal production notes leaked into HTML or PDF
grep -c "INTERNAL PRODUCTION\|END OF PUBLIC ARTIFACT" app/public/samples/*.html   # 0
pdftotext app/public/samples/tenxpros-sample-dossier-excerpt.pdf - | \
  grep -ci "INTERNAL PRODUCTION\|END OF PUBLIC\|Website excerpt\|quality checklist"  # 0

# Confirm fictional framing + disclaimers present
pdftotext app/public/samples/tenxpros-sample-dossier-excerpt.pdf - | grep -ci "fictional"   # > 0
pdftotext app/public/samples/tenxpros-sample-dossier-excerpt.pdf - | \
  grep -ci "not.*a certification decision"                                                   # cover + final
```

(`pdftoppm` / ImageMagick `montage` were used during design only, to render page previews for visual QA; they are not part of the build.)

---

## 12. Final verification checklist

- [x] HTML opens locally (self-contained: system fonts, inline CSS, inline SVG — no network).
- [x] PDF exists and is not empty (~455 KB, 11 pages, A4).
- [x] Cover image exists (PNG, 1680 × 2376).
- [x] Internal production notes are **not** present in the HTML or PDF (0 markers; build guard enforces this).
- [x] Disclaimer appears on the **cover** and the **final page**; "Review labels are illustrative … not a certification decision" preserved.
- [x] Page count is within target (**11**, target 10–12).
- [x] "Maya R." kept clearly fictional; sample clearly illustrative; no claim of a real graduate case, guaranteed results, certified sample, or HBS/MIT/Stanford comparisons.
- [x] Review critique preserved in full (reviewer notes, the intentional gap, the rubric "Needs revision" label).
- [x] No website application logic, server actions, auth, database, or routes changed.
