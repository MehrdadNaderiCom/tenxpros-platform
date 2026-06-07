# TenXPros — Full Public-Site QA Report (Live)

**Target:** `https://tenxpros.com` (live)
**Deployed commit:** `e6dd35f` (pushed to `origin/deployment/production-deployment-sprint-a`)
**Date:** 2026-06-07
**Type:** Read-only external-user QA. No code/commit/deploy/container changes were made.
**Verdict:** ✅ **GO — ready for public review.** No Critical/High/Medium issues. One benign Low (Next.js prefetch abort) and a few Low content/scope notes.

---

## 1. Availability (HTTP, redirects, content type)

| Route | Status | Redirects | Content-Type | Bytes |
| --- | --- | --- | --- | --- |
| `/` | 200 | 0 | text/html | 70,648 |
| `/program` | 200 | 0 | text/html | 110,337 |
| `/dossier` | 200 | 0 | text/html | 92,715 |
| `/certification` | 200 | 0 | text/html | 103,740 |
| `/pricing` | 200 | 0 | text/html | 119,489 |
| `/apply` | 200 | 0 | text/html | 70,091 |
| `/about` | 200 | 0 | text/html | 70,316 |
| `/samples/tenxpros-sample-dossier-excerpt.pdf` | 200 | 0 | application/pdf | 465,633 |
| `/samples/tenxpros-sample-dossier-excerpt.html` | 200 | 0 | text/html | 70,090 |
| `/login` | 200 | 0 | text/html | 10,881 |

All 200, **zero redirects → no redirect loops**, no server errors. Footer/menu secondary routes also 200: `/how-it-works`, `/terms`, `/privacy`, `/refund`.

## 2. Core message / headline verification

| Route | Title | Expected headline | Result |
| --- | --- | --- | --- |
| `/` | Selective AI Adoption Certification for Experienced Professionals | "Lead AI adoption in your field. Don’t just use AI." | ✅ present (H1 split across `<h1>`+`<span>`) |
| `/program` | The Method — Frame · Design · Prove · Foresee | "Frame. Design. Prove. Foresee." | ✅ |
| `/dossier` | Living AI Solution Dossier | "The Living AI Solution Dossier is the work behind the credential." | ✅ |
| `/certification` | Certification — Earned, not attended | "Certification is earned, not attended." | ✅ |
| `/pricing` | Pricing — Founding Charter | "Apply first. Pay only after acceptance." | ✅ |
| `/apply` | Apply — Founding Charter | "Apply with one real professional problem." | ✅ |
| `/about` | About — Why TenXPros exists | "AI adoption has become professional judgment work." | ✅ |

Playwright headline check (desktop + mobile): **7/7 present on both viewports.**

## 3. Navigation & CTA links

Header nav (desktop, from live DOM):

| Label | href | Result |
| --- | --- | --- |
| The Method | `/program` | ✅ |
| The Dossier | `/dossier` | ✅ |
| Certification | `/certification` | ✅ |
| Pricing | `/pricing` | ✅ |
| About | `/about` | ✅ |
| Login | `/login` | ✅ |
| Apply for Founding Charter (CTA) | `/apply` | ✅ |

Major CTAs found on the expected pages: **Apply for Founding Charter** (home, pricing, dossier, …), **Preview sample dossier** (home), **See the method** + **See the review standard** (about), **Preview the full sample** + **Open HTML preview** (dossier). "View pricing" CTA appears on the Home/Dossier final CTAs (correctly not self-linked on `/pricing`). No broken nav/CTA targets.

## 4. Sample dossier assets

- **PDF**: 200, `application/pdf`, **465,633 bytes**, magic bytes `%PDF-1.4` → valid, not empty.
- **HTML preview**: 200, `text/html`, title "Living AI Solution Dossier — Illustrative Sample Excerpt · TenXPros" → opens correctly.
- **Sample link presence** (PDF refs per page): `/`=2, `/program`=8, `/dossier`=16, `/certification`=12, `/pricing`=12, `/apply`=10, `/about`=2 → **present on all 7 pages**.
- **Broken images**: **0** across all 7 pages × desktop+mobile (every `<img>` loaded with `naturalWidth>0`). Sample preview cards (cover + Executive Snapshot + Eight Assets & Rubric thumbnails) render.

## 5. Apply form integrity (`/apply`, post-hydration, NOT submitted)

| Check | Result |
| --- | --- |
| Form fields present | ✅ **14 / 14** (fullName, email, country, professionalRole, domain, linkedinUrl, aiExperience, dataSensitivity, timeAvailability, whyTenXPros, realProblemBrief, preferredLanguage, consentConfidentiality, consentTerms) |
| Missing fields | none |
| Submit button ("Submit application") | ✅ present |
| "No payment details required" messaging | ✅ present |
| "Pay only after acceptance" messaging | ✅ present |
| Confidential-data warning (+ "redacted or fictionalized") | ✅ present |

**No real application was submitted** (production). No obvious non-polluting test mode was found, so no test submission was attempted (and none is recommended without a staging path).

## 6. Mobile QA (390px)

All 7 pages, live:

| Check | Result |
| --- | --- |
| Horizontal overflow | ✅ **0px on all 7** |
| Footer flush (trailing blank) | ✅ **0px on all 7** |
| Mobile menu opens (covers viewport) | ✅ all 7 (`elementFromPoint` center = menu `<nav>`) |
| Mobile menu closes | ✅ all 7 (`closed=true`) |
| Menu links usable | ✅ 10 unique nav/footer link labels reachable |
| CTAs tappable / not clipped | ✅ (full-width stacked CTAs; 0 overflow) |

## 7. Visual consistency

- All 7 routes serve the rebuilt **Instrument** components (titles + headlines confirm the new pages; the old light `MarketingHero`/`PageHeader` copy — e.g. "Build AI adoption work serious enough" — is **gone** from all 7).
- Shared dark base (`#070B14`), indigo action CTAs, gold reserved for credential/review/seal moments (certification criteria, charter seal, the standard panel) — consistent across pages (verified during each page's rebuild QA; committed evidence in prior `*-rebuild-round-1` folders).
- No generic-AI-course look; no old light-page remnants on the seven public pages.
- **Note (Low):** shared **nav/footer remain light** by design this phase, and the **secondary pages** (`/how-it-works`, `/terms`, `/privacy`, `/refund`, `/login`) are still the older light theme — out of the 7-page rebuild scope, functional (all 200), but stylistically different.

## 8. Claims safety

Swept all 7 pages for risky phrases:

| Phrase | Finding |
| --- | --- |
| "best in the world" | ✅ none |
| "world's first" | ✅ none |
| "guaranteed income" | ✅ none |
| "guaranteed job" | ⚠️ present on `/` and `/apply` — **negation/disclaimer only**: "People expecting a guaranteed job, income, or business outcome" (Home "Not for"), "People looking for guaranteed job or income outcomes" (Apply "Not a fit"). Safe. |
| "accredited" | ⚠️ present on `/certification` and `/pricing` — **negation only**: "Not academic accreditation" / "not a university degree or an accredited academic program." Safe. |
| "university equivalent" / "-equivalent" | ✅ none (only explicit "Not a university degree" negations) |
| "19,000" / "19000" | ✅ **none** (the unsourced founder hours figure is correctly unpublished) |
| "founder-led" | ✅ **none** |

**No risky claims.** Every match is an explicit disclaimer, consistent with the locked positioning. No accreditation/university-equivalence/outcome-guarantee assertions.

## 9. Console / network smoke check (Playwright, 14 page-loads)

- **Console errors: 0** across all 7 pages × desktop + mobile.
- **Page errors: 0.**
- **Network failures (4xx/5xx asset failures): 0.**
- **Only non-2xx events:** 3 × `net::ERR_ABORTED` on `https://tenxpros.com/login?_rsc=…` (certification desktop, pricing desktop, home mobile). These are **Next.js RSC prefetch cancellations** for the nav "Login" link (the prefetch was aborted when the test navigated/closed the page). `/login` itself returns **200**. Not a server error, not a broken resource — informational only.

## 10. Recommended fixes (ranked)

- **Critical:** none.
- **High:** none.
- **Medium:** none.
- **Low / optional:**
  1. **`net::ERR_ABORTED` on `/login` prefetch** — cosmetic console-network noise from Next.js Link prefetch cancellation. Optional: set `prefetch={false}` on the nav Login link to silence it. No user impact.
  2. **Content governance (not a live defect):** confirm the `/about` founder descriptors ("DeepLearning.AI Ambassador", HealthTech/FinTech/EdTech/PropTech sectors) against a citable source during a content review; the unsourced "19,000+ hours" remains intentionally unpublished.
  3. **Secondary pages still light-themed** (`/how-it-works`, `/terms`, `/privacy`, `/refund`, `/login`) and the shared nav/footer remain light — outside the 7-page scope, functional, but a future Instrument pass would unify them.

## Final go / no-go

✅ **GO for public sharing of the seven rebuilt pages.** All availability, messaging, navigation, CTA, sample-asset, Apply-form, mobile, visual-consistency, claims-safety, and console/network checks pass. The only findings are Low/cosmetic (a benign prefetch abort) and out-of-scope content/legacy-page notes — none block public review.

---

### Routes tested
`/`, `/program`, `/dossier`, `/certification`, `/pricing`, `/apply`, `/about`, `/samples/…excerpt.pdf`, `/samples/…excerpt.html`, `/login` (+ footer routes `/how-it-works`, `/terms`, `/privacy`, `/refund`).

### Method
Live `curl` (status/redirects/titles/claims/asset bytes) + headless Chromium via Playwright (console/network capture, overflow/footer metrics, mobile menu open/close, broken-image detection, Apply-form post-hydration integrity, nav/CTA extraction) at desktop 1440px and mobile 390px. No screenshots were written (screenshot-retention state preserved; `about-rebuild-round-1/` kept). No code, commit, deploy, or container action.
