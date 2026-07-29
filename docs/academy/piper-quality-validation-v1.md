# TenXPros Academy Piper quality validation v1

This is the final private implementation and evidence report for the limited,
zero-cost Bryce A/B evaluation completed on 2026-07-26. It authorizes only a
blinded human listening test. It does not authorize production activation or a
full Academy regeneration.

## 1. Pronunciation audit result

The final audit covered 17 narration documents and 954 blocks:

- `REQUIRES_OWNER_REVIEW = 0`
- `INVALID_SEMANTIC_DRIFT = 0`
- pending owner occurrences: 0
- protected-feature drift: 0

All requested narration-only forms are applied: `SMS`, lesson-scoped `SME`,
`CEO`, the Ten X product names, the pricing page, Mehrdad Naderi's LinkedIn
profile, `mehrdadnaderi.com`, and `tenxops.org`. Visible HTML is not rewritten.

## 2. Confirmation that the narration recipe was frozen

The gate status is `FROZEN`. The revision is
`academy-owner-approved-pronunciations-v1`, with approval reference
`USER-APPROVAL-cce0f6a1-48ec-4686-8c01-16fe1d6b10e8-2026-07-26`.
Seventeen deterministic lesson recipe hashes are recorded in
`private/manifest.json`.

## 3. Files created and modified

Created for this validation phase:

- `app/Dockerfile.piper-evaluation`
- `app/scripts/generate-piper-evaluation.ts`
- `app/scripts/piper-evaluation-runtime.cjs`
- `app/src/lib/academy/narration/approved-pronunciations.ts`
- `app/src/lib/academy/narration/scoped-pronunciation.ts`
- `app/src/lib/academy/narration/piper-evaluation.ts`
- `app/tests/academy-piper-evaluation.test.ts`
- `docs/academy/piper-quality-validation-v1.md`

The current Phase 1 `academy-content-narration` CLI, narration contracts,
recipe, policy, alignment, normalization, semantic renderer, warnings, focused
narration tests, `app/package.json`, and
`docs/academy/phase1-narration-layer.md` were extended for the freeze gate and
evaluation command.

The final isolated package contains:

- `listening/index.html`
- exactly eight files under `listening/audio/`
- `private/runtime-plan.json`
- `private/runtime-results.json`
- `private/manifest.pending.json`
- `private/manifest.json`
- `private/audit.json`
- `private/report.md`
- `private/validation-results.md`

No production audio, visible lesson content, active player, or Range API was
modified.

## 4. Semantic Piper generation architecture

Corrected flow:

```text
frozen semantic narration plan
-> one-sentence local Piper requests
-> PCM16 mono at 22,050 Hz
-> trim contiguous exact-zero trailing frames
-> insert exact zero-frame semantic pauses
-> deterministic PCM stitch
-> one measured constant-gain adjustment
-> LAME mono 64 kbps CBR
-> decoded-MP3 and reconstruction audit
```

Baseline flow uses one whitespace-collapsed transcript request, Bryce's current
350 ms Piper sentence silence, no normalization, and the same final MP3 format.
The isolated runtime imports no Prisma or database code and ran with Docker
`--network none`, a read-only root filesystem, only loopback networking, no
default route, and no `DATABASE_URL`.

## 5. Segmentation strategy

The deterministic version is `spoken-sentences-with-semantic-pauses-v1`.
Headings are not merged with paragraphs; table rows, form fields, list items,
callouts, and section boundaries remain distinct. Adjacent sentences remain
inside the same semantic block but are synthesized as ordered sentence units,
so each intended pause can be inserted explicitly.

The four fixed excerpts are:

| Pair | Lesson | Source | Corrected units |
| --- | --- | --- | ---: |
| sample-01 | mission | `root/p[7]` | 5 |
| sample-02 | journey | `root/table[1]`, 12 row blocks | 48 |
| sample-03 | conversation | `root/div[4]` | 2 |
| sample-04 | rules | `root/p[11]`, five source-bound long segments | 15 |

Each baseline has one flat synthesis unit. Planned and synthesized segment IDs,
order, and reconstructed transcripts match for every sample.

## 6. Actual pause and audio-processing settings

The inserted pause profile is:

- sentence: 220 ms
- list item: 280 ms
- paragraph: 500 ms
- table row: 400 ms
- heading: 700 ms
- section boundary: 900 ms

The corrected samples contained, respectively, 19,404; 271,656; 4,851; and
67,914 planned zero frames. Every frame was present and still zero after
normalization. Piper's trailing silence is trimmed only when it is contiguous
exact-zero PCM, preventing double pauses without removing speech.

These excerpts acoustically exercise 55 sentence pauses at 220 ms and 11 table
row pauses at 400 ms. The 280/500/700/900 ms values are frozen and covered by
the plan/test contract, but the selected four excerpts do not contain a
boundary that exercises those four values. This is a stated sample-coverage
limit, not a claim that all six pause types were heard in this package.

Bryce is the only voice in this controlled package:
`en_US-bryce-medium.onnx`, native 22,050 Hz, model SHA-256
`dc9caa6c313199ffb5ac698b6e542fa6cba388aeaf2731e25262e33b9810aef1`.
Linda and Cori were not added so the narration pipeline remained the only major
variable.

Corrected loudness uses a single fixed gain targeting -19 LUFS, prioritizing a
-2 dBTP ceiling, and caps positive gain at +6 dB. The decoded acceptance range
is -22 to -18 LUFS and at most -1.5 dBTP. There is no compressor or limiter.
Baseline remains unnormalized and uses an observational -32 to -12 LUFS range
and +1.5 dBTP ceiling; a clipping plateau remains blocking. Final encoding is
mono MP3, 64 kbps CBR. Runtime tools were Piper 1.2.0, FFmpeg/ffprobe 5.1.9,
and LAME 3.100.

## 7. Exact sample files generated

- `listening/audio/sample-01-A.mp3`
- `listening/audio/sample-01-B.mp3`
- `listening/audio/sample-02-A.mp3`
- `listening/audio/sample-02-B.mp3`
- `listening/audio/sample-03-A.mp3`
- `listening/audio/sample-03-B.mp3`
- `listening/audio/sample-04-A.mp3`
- `listening/audio/sample-04-B.mp3`

The local page has eight players, defaults to 1.0x, offers 1.0x and 1.25x, and
records 1-5 scores for naturalness, pauses, pronunciation, clarity, listening
fatigue, and professional quality. It also stores notes locally and exports a
blind JSON score file. Its opaque public identifier and HTML contain no engine,
pipeline, lesson, transcript, recipe, source-path, or assignment terms.

## 8. Private baseline/corrected manifest

Do not give this mapping to listeners before scores are locked:

| Blind file | Private pipeline | Voice | Lesson | Excerpt |
| --- | --- | --- | --- | --- |
| sample-01-A.mp3 | corrected | Bryce | mission | E01-mission-brand-ai |
| sample-01-B.mp3 | baseline | Bryce | mission | E01-mission-brand-ai |
| sample-02-A.mp3 | baseline | Bryce | journey | E02-journey-week-table |
| sample-02-B.mp3 | corrected | Bryce | journey | E02-journey-week-table |
| sample-03-A.mp3 | corrected | Bryce | conversation | E03-conversation-application-form |
| sample-03-B.mp3 | baseline | Bryce | conversation | E03-conversation-application-form |
| sample-04-A.mp3 | baseline | Bryce | rules | E04-rules-cap-stacking |
| sample-04-B.mp3 | corrected | Bryce | rules | E04-rules-cap-stacking |

Corrected is counterbalanced as A twice and B twice. The authoritative private
manifest also contains voice/model hashes, recipe hashes, pause profiles,
transcript hashes, source hashes, full plan, and per-file audits.

## 9. Duration and size comparison for every sample

| File | Pipeline | Duration (s) | Bytes | LUFS | dBTP |
| --- | --- | ---: | ---: | ---: | ---: |
| sample-01-A.mp3 | corrected | 31.295 | 250,565 | -20.9 | -3.2 |
| sample-01-B.mp3 | baseline | 32.287 | 258,506 | -18.2 | -0.1 |
| sample-02-A.mp3 | baseline | 97.802 | 782,627 | -19.4 | -1.1 |
| sample-02-B.mp3 | corrected | 151.458 | 1,211,871 | -20.3 | -2.2 |
| sample-03-A.mp3 | corrected | 17.136 | 137,298 | -20.0 | -2.6 |
| sample-03-B.mp3 | baseline | 19.644 | 157,360 | -18.0 | -0.6 |
| sample-04-A.mp3 | baseline | 200.385 | 1,603,290 | -18.0 | 1.2 |
| sample-04-B.mp3 | corrected | 197.355 | 1,579,048 | -20.8 | -1.7 |

## 10. Automated audio-audit results

PASS: 8/8 files, 23/23 check types per file, and 184/184 per-file checks.
All eight are `qualityPassed`, `eligibleForBlindReview`, and published, with
zero quality findings. Disk size and SHA-256 match runtime, manifest, and audit
records for every MP3.

All corrected samples have true peak at or below -1.7 dBTP, zero decoded
full-scale samples, and no clipping plateau. Baseline `sample-04-A` measures
+1.2 dBTP: it remains inside the declared baseline observational ceiling of
+1.5 dBTP and has zero decoded full-scale samples and no plateau, but it is a
residual intersample-peak risk under a stricter <= 0 dBTP interpretation. It is
kept unchanged because it is the current-pipeline control.

Checks cover file existence/non-zero size, MP3 decode/codec, duration, 22,050
Hz mono, 64 kbps CBR, blind metadata, loudness, true peak, zero full-scale
samples, no clipping plateau, network/database/output isolation, segment count
and order, transcript reconstruction, exact silence before/after normalization,
frame preservation, and published-copy integrity.

## 11. Test, typecheck, and build results

- `pnpm test`: PASS, 41/41 files and 550/550 tests.
- Final focused Piper evaluation test: PASS, 11/11.
- `pnpm typecheck`: PASS on final source.
- `pnpm lint`: PASS, 0 errors; 15 pre-existing image warnings.
- `pnpm lint:content`: PASS.
- `pnpm prisma validate`: PASS.
- `pnpm build`: PASS; 108 static pages generated.
- Runtime syntax and self-test: PASS; 12 assertions.
- `git diff --check`: PASS.

Exact results are stored in `private/validation-results.md`.

## 12. Confirmation of no external TTS or ElevenLabs request

External TTS requests: 0. ElevenLabs requests: 0. The runtime had only a
loopback interface, no default route, and an explicit child-process allowlist
containing only local Piper, FFmpeg, ffprobe, and LAME executables. No external
TTS SDK or API was integrated.

## 13. Confirmation that production audio remained byte-for-byte unchanged

Before and after values are identical:

| Measure | Before | After |
| --- | ---: | ---: |
| `AcademyLessonAudio` rows | 51 | 51 |
| total bytes | 271,123,569 | 271,123,569 |
| row-MD5 aggregate | `307e49138be9ea27192a3bef9f060d18` | `307e49138be9ea27192a3bef9f060d18` |
| binary-COPY SHA-256 | `2ba47ce80f134b47f210a00ba6d47639742596df536c396ee3f651757859202d` | `2ba47ce80f134b47f210a00ba6d47639742596df536c396ee3f651757859202d` |

The after snapshot was also repeated independently after final source and
artifact validation. No seed, database update, production audio write, full
Academy regeneration, deployment, player change, or Range API change occurred.

## 14. Exact command for regenerating the evaluation samples

Run from a host with the existing local app/Piper image and database available:

```bash
cd /opt/tenxpros/app
pnpm academy:piper-eval -- \
  --output-dir /opt/tenxpros/scratch_academy/piper-evaluation/piper-semantic-v1-bryce-20260726-rerun \
  --package-id piper-semantic-v1-bryce-20260726-rerun
```

The command requires a new output directory and refuses to overwrite an
existing package.

## 15. Recommendation

The corrected Piper pipeline is ready for the requested blinded human listening
test. This is not a production-readiness decision: the next action is to gather
blind scores and compare the paired results. Do not activate the pipeline,
regenerate all Academy audio, deploy, or proceed to ElevenLabs based on this
technical validation alone.
