# Academy Phase 1 narration layer

## Scope and safety boundary

This layer is an offline review tool. It derives a semantic narration plan from
the reviewed canonical `bodyHtml`, but it is not connected to the Academy
player, the Piper generator, an external TTS provider, Prisma, or production
audio storage.

The three representations remain separate:

```text
canonical seed bodyHtml
  -> reviewed visible bodyHtml
  -> semantic narration blocks
  -> deterministic spoken normalization
  -> review-only JSON plan and text preview
```

Spoken text and narration-only overrides are never written back to visible
lesson content.

## Semantic blocks

The typed contract preserves headings, paragraphs, ordered and unordered list
items, table rows and labeled cells, form previews, callouts, and section
boundaries. Every block carries a stable semantic path and pause metadata.
Visible and spoken fields are explicit and separate.

The default pause profile is:

- sentence boundary: 220 ms
- list item: 280 ms
- paragraph: 500 ms
- table row: 400 ms
- heading: 700 ms
- section boundary: 900 ms

`Step one`, `Step two`, and similar markers are limited to a versioned
`slug + list path` allowlist whose visible context explicitly describes a
sequence. Other ordered lists use neutral ordinals such as `First` and
`Second`. Tables retain their visible labels and row/column meaning, including
multi-row headers, `rowspan`, and `colspan`. Form labels and descriptions
remain separate; an exact label repeated at the start of its description is
spoken once without rewriting the description.

Four reviewed long paragraphs are split at source-hash-bound sentence
boundaries. Joining their segments with one ASCII space reconstructs both the
visible and spoken streams exactly. A stale source hash or sentence count
fails closed and leaves the original block intact with an error.

## Reproducibility

The plan includes independent versions for the schema, semantic renderer,
content revision, spoken normalization, pronunciation dictionary, pause
profile, alignment policy, and long-block segmentation policy. Stable hashes
cover the source, visible content revision, blocks, recipe, overrides, and
complete narration document.

The same source, versions, and overrides produce the same JSON and hashes. A
change in an editorial rule or narration recipe invalidates the relevant hash
without changing the legacy production audio hash.

## Review CLI

Run from `app/`:

```bash
pnpm academy:audio -- content-audit
pnpm academy:audio -- content-review --all
pnpm academy:audio -- content-diff --slug mission
pnpm academy:audio -- narration-plan --all --output /tmp/academy-plan.json
pnpm academy:audio -- narration-plan --slug journey
pnpm academy:audio -- narration-preview --slug journey
pnpm academy:audio -- narration-preview --all --output /tmp/academy-previews
pnpm academy:audio -- narration-audit
pnpm academy:audio -- narration-alignment --format markdown
pnpm academy:audio -- narration-alignment --format json
```

These commands read canonical seed content only. They make no network calls,
perform no database writes, generate no audio, and do not update active audio
assets.

## Quality warnings

The audit reports empty or malformed semantic content, missing or partial table
headers, merged cells, empty cells, heading concatenation, duplicate visible
text, missing punctuation, malformed punctuation, long blocks, a single block
over 9,000 characters, raw URLs, unknown abbreviations, symbol-heavy content,
meaningful visual content omitted from speech, decorative-only content, and
material visible-versus-spoken differences.

The alignment gate classifies every difference as exactly one of
`ALLOWED_SPEECH_TRANSFORMATION`, `REQUIRES_OWNER_REVIEW`, or
`INVALID_SEMANTIC_DRIFT`. It compares whole-word, context-aware features for
person/responsible actor, modality, negation, typed quantities, conditions,
comparatives, obligation/permission, eligibility, assessment, commission,
governance, and tense. Protected drift is rejected; an unapproved residual
wording override falls back to deterministic visible-derived speech.

The plan also includes deterministic review-only chunks. Chunks close at
semantic block boundaries and remain at or below 9,000 characters; an
oversized single block is left intact and reported instead of being split in
the middle of its meaning.

Warnings never change visible content. Narrow overrides can adjust an
owner-approved pronunciation, approved URL/email form, one spoken block, one
table cell, list style, or pause. Meaningful manual omission is rejected;
decorative and hidden elements are omitted automatically. Each override
payload, owner-approval reference, and human revision label is hashed.

## Approved pronunciation freeze

The owner-approved narration-only profile is frozen as
`academy-owner-approved-pronunciations-v1`, with approval reference
`USER-APPROVAL-cce0f6a1-48ec-4686-8c01-16fe1d6b10e8-2026-07-26`. It spells
`SMS`, `CEO`, and later lesson occurrences of `SME`; expands the first
meaningful `SME` occurrence per lesson; separates the Ten X product names; and
uses the approved spoken forms for the pricing page, LinkedIn profile, and
reviewed domains. The profile is applied only to spoken fields and is included
in deterministic recipe hashes. The alignment freeze gate is permitted only
when owner-review and invalid-semantic-drift counts are both zero.

## Phase boundary

No ElevenLabs SDK, API key, voice, model, request, cost-estimation call, audio
generation, production trigger, migration, deployment, or restart is part of
Phase 1. Provider evaluation and sample generation require separate owner
approval.
