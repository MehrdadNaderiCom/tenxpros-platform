# Dash-Lint Report

Deliverable that confirms the content dash rule holds and is enforced.

## The rule, enforced by the build

`app/scripts/lint-content-dashes.cjs` scans `src` and `prisma/seed` (`.ts`, `.tsx`, `.css`, `.md`, `.mdx`; tests and the script itself excluded) and fails with exit 1 if any content contains a forbidden character: U+2014 (em dash), U+2013 (en dash), U+2015 (horizontal bar), or U+2212 (minus sign). Only a comma, a colon, parentheses, or the plain ASCII hyphen are used.

It is wired into `pnpm build` (`node scripts/lint-content-dashes.cjs && next build`) and available as `pnpm lint:content`, so the build fails on any violation.

## Current status: PASS

```
Content dash lint passed: no U+2014, U+2013, U+2015, or U+2212 in content.
```

The check passes clean across all shipped content, including the new modules 15 to 17, the money passages in modules 2, 3, and 13, and every panel feature added in this program. It has run green as a gate on every commit of this work.
