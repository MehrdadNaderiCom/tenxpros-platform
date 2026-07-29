# Final Piper narration recipe

Status: `FROZEN`

Recipe version: `semantic-block-flow-v2-final`

Recipe SHA-256:
`0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe`

Parent recipe: `semantic-block-flow-v1`, plan
`110fbd6db6d5a7c59f4d3d31c7e538e7a215d9dd9066c3ecea4dfb93a32ce599`.

## Frozen architecture

The synthesis unit is a coherent semantic block: one Piper request per
paragraph, heading, list item, table row, coherent form-field unit, callout,
or genuinely separate section. Sentences inside a paragraph remain in the
same request and are never externally stitched.

Bryce remains the frozen voice. Piper uses `sentence_silence=0.15`,
`length_scale=1`, and a 22,050 Hz native sample rate. Semantic-block edges use
the frozen effective-pause normalization detector, safe speech margins, exact
zero PCM insertion, and insertion-only fallback when a safe trim cannot be
proven.

## Effective targets

| Boundary | Target |
| --- | ---: |
| Internal sentence | Piper-controlled, 150 ms configuration |
| List item | 300 ms |
| Table row | 270 ms |
| Paragraph | 800 ms |
| Callout | 700 ms |
| Heading | 900 ms |
| Section | 1050 ms |

The only material numeric changes from the parent candidate are paragraph
`700 → 800 ms` and callout `650 → 700 ms`.

## Focused validation

The final profile was regenerated only for the frozen Sample 05 and Sample 02
clips in a network-isolated local container. No external inference or TTS API
was called.

- Internal sentence pauses: median 238.46 ms; p95 301.56 ms.
- Paragraphs: 819.05–829.07 ms.
- Callout: 709.02 ms.
- Heading: 919.05 ms.
- Section: 1119.14 ms.
- Lists: 309.02–319.05 ms.
- Table rows: 251.25–293.56 ms.
- Stitch-discontinuity warnings: 0.

All objective, transcript, MP3, loudness, duration, checksum, clipping,
truncation, duplication, and missing-speech gates passed.

## Future full-generation command

This command is prepared but was not executed during recipe freeze:

```bash
pnpm exec tsx scripts/generate-final-piper-academy.ts --recipe-version semantic-block-flow-v2-final --recipe-hash 0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe --all --output-dir /opt/tenxpros/scratch_academy/piper-full-generation/semantic-block-flow-v2-final
```

Full Academy generation remains a separately authorized future stage.
