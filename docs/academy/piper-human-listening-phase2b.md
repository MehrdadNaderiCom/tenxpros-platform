# TenXPros Academy Piper human-listening evaluation — Phase 2B

Phase 2B is a local-only, zero-cost, blinded human-listening package. It does
not change Academy production audio, the learner player, the Range API, or
visible lesson content. It makes no external TTS request.

## Prepared package

- Evaluation id: `blind-review-8fab36b45ab641b5`
- Listener directory:
  `/opt/tenxpros/scratch_academy/piper-listening/phase2b-bryce-20260726/listener-package`
- Self-contained ZIP:
  `/opt/tenxpros/scratch_academy/piper-listening/phase2b-bryce-20260726/blind-audio-review-8fab36b45ab641b5.zip`
- ZIP SHA-256:
  `8ef39d1b7b0d6c3e1a8d47031dd1e9a1d2795d54810864ded364e2b28f57ff23`
- Private analysis manifest:
  `/opt/tenxpros/scratch_academy/piper-listening/phase2b-bryce-20260726/private/manifest.json`

The eight Phase 2A MP3s are copied byte-for-byte from the authoritative
package. Only the two files in `sample-05` were synthesized. The listener
directory and ZIP contain exactly the neutral page, instructions, and ten
blindly named MP3s.

## Pause coverage

The complete listening set now acoustically verifies:

- sentence: 220 ms;
- ordered-list item: 280 ms, three occurrences in `sample-05`;
- table row: 400 ms;
- paragraph/callout boundary: 500 ms, three occurrences in `sample-05`;
- heading: 700 ms, one occurrence in `sample-05`;
- section transition: 900 ms, one occurrence in `sample-05`.

The frozen Academy corpus has no native `sectionBreak`, `<hr>`, or `<section>`
block. Therefore, the 900 ms coverage is an evaluation-only, source-locked
transition after the second existing callout and before the following H2. It
tests the exact silence insertion without changing the renderer, source
lesson, visible content, or production audio. It must not be described as
native corpus coverage.

## Listener workflow

Listeners should work independently in a quiet space with headphones when
available. The page generates an anonymous `L-...` code; listeners must not
enter names, email addresses, or identifying information.

For every version, listen and enter all six scores at 1.0x, then lock them.
Only after the 1.0x scores are locked does the optional 1.25x control become
available. Both versions must be locked before pair questions unlock. The page
saves a draft only in local browser storage and enables final JSON export only
after all 111 required values are complete.

The table pair includes the named `table_efficiency` section covering
understandability, repeated-label usefulness, excessive speed, excessive
pauses, preference for a longer/clearer version, and whether to test a more
concise spoken table.

## Safe local serving

From `/opt/tenxpros/app`:

```bash
pnpm academy:piper-eval -- serve \
  --root /opt/tenxpros/scratch_academy/piper-listening/phase2b-bryce-20260726/listener-package
```

The server binds to `127.0.0.1:4173`, requires Basic authentication, and shows
a generated 24-character temporary password once. It serves only the exact
public allowlist, accepts only GET/HEAD, and supports audio byte ranges.
Non-loopback binding fails unless the operator explicitly supplies
`--allow-network-exposure`, `--tls-cert`, and `--tls-key`.

## Response aggregation

Place 5–10 exported listener JSON files in a directory containing no other
non-hidden files, then run:

```bash
pnpm academy:piper-eval -- aggregate \
  --manifest /opt/tenxpros/scratch_academy/piper-listening/phase2b-bryce-20260726/private/manifest.json \
  --responses /absolute/path/to/listener-responses \
  --output /opt/tenxpros/scratch_academy/piper-listening/phase2b-bryce-20260726/private/analysis-YYYYMMDD
```

The output contains `analysis.json`, `report.md`, `decision-summary.md`, and
`invalid-responses.json`. Only canonical, complete, unique responses are
analyzed. Exact duplicate exports collapse; conflicting exports using the same
listener id invalidate that listener; no value is imputed. Fewer than 5 or
more than 10 valid listeners yields `INSUFFICIENT_DATA`.

The implemented recommendations are `PASS`, `TUNE_AND_RETEST`,
`TEST_OTHER_LOCAL_VOICES`, `CONSIDER_ELEVENLABS`, and `INSUFFICIENT_DATA`.
Targets are advisory only; aggregation never tunes audio, switches voices, or
contacts an external provider.

## Validation evidence

- Ten MP3s decoded as mono 22,050 Hz MP3 in a network-disabled container.
- Existing eight SHA-256 values match the authoritative Phase 2A manifest.
- Runtime source, executed plan, voice model, inserted pause frames, and
  output hashes were verified.
- Public scan passed for 12 allowlisted files and 8,129,836 bytes.
- Browser smoke test passed local draft reload, 1.0x locking, optional 1.25x,
  all 111 required answers, strict downloaded-response parsing, zero network
  requests, and zero console messages.
- Five explicitly synthetic responses produced 5 valid listeners, 0 invalid
  responses, and the expected synthetic `PASS`. They are not human evidence.
- Production snapshot remained 51 rows and 271,123,569 bytes, with binary-copy
  SHA-256
  `2ba47ce80f134b47f210a00ba6d47639742596df536c396ee3f651757859202d`.
