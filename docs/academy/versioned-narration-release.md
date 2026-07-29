# Versioned Academy narration release

The production Academy narration path is release-based and additive. Learner
requests only read already-audited audio. Piper synthesis is never triggered
by a lesson page, audio status request, byte-range request, content save,
application startup, or container startup.

The frozen production recipe is `semantic-block-flow-v2-final`, recipe hash
`0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe`,
with the pinned Bryce model. A release contains exactly one immutable MP3 for
each of the 17 lessons plus block-level provenance and pause measurements.

## Storage and resolution

- `AcademyNarrationRelease` stores recipe, renderer, normalization,
  pronunciation, segmentation, Piper, generation, content-manifest, audit,
  and checksum identity.
- `AcademyNarrationAsset` stores one audited MP3 per lesson and release.
- `AcademyNarrationChunk` stores semantic-block progress, hashes, PCM
  checksums, silence measurements, and resume state.
- `AcademyNarrationDeployment` is the singleton atomic active/previous
  release pointer.
- `AcademyNarrationPending` records content-save staleness without generating
  audio.
- The 51 `AcademyLessonAudio` rows remain the untouched rollback fallback.

When the active pointer is null, learner routes use the legacy assets and
legacy voice catalog. When an audited release is active, routes expose only
Bryce and require the asset's exact visible-content hash to match the current
lesson. An inactive release is available only through the superadmin preview
route.

## Explicit local generation

Prepare the immutable plan from the passed reconciliation manifest:

```sh
pnpm exec tsx scripts/generate-final-piper-academy.ts prepare \
  --recipe-version semantic-block-flow-v2-final \
  --recipe-hash 0f196123bbcafa585a9cda880f5bc94158d75eceac296c8c7c7d53c360041bfe \
  --reconciliation /path/to/content-reconciliation.json \
  --output-dir /opt/tenxpros/scratch_academy/piper-full-generation/semantic-block-flow-v2-final
```

Run the generated plan in the pinned Piper evaluation image with
`--network none`, no database URL, a read-only application mount, and only the
generation directory writable. A safe rerun verifies all 17 completed assets
and performs zero synthesis.

Import is fail-closed and requires the independent corrected boundary audit.
The importer verifies the original manifest still fails only the superseded
absolute-level boundary check, the corrected audit's deterministic payload
hash and complete passing check set, and every MP3 checksum in all three
manifests:

```sh
pnpm exec tsx scripts/academy-narration-rollout.ts import-release \
  --generation-dir /opt/tenxpros/scratch_academy/piper-full-generation/semantic-block-flow-v2-final \
  --corrected-audit /opt/tenxpros/scratch_academy/piper-forensic-audit/semantic-block-flow-v2-final-20260727-corrected-v2-final-run1/corrected-release-audit.json
```

## Promotion and rollback

Promotion updates only `AcademyNarrationDeployment.activeReleaseId` in a
transaction after all 17 content hashes and audit states are rechecked.
Rollback atomically swaps the active pointer back to the stored previous/null
pointer. Neither operation deletes or regenerates audio.

```sh
pnpm exec tsx scripts/academy-narration-rollout.ts rollback \
  --reason "operator-requested rollback"
```

The rollback path requires neither Piper nor FFmpeg nor any external API.
