#!/usr/bin/env node
"use strict";

/**
 * Retired safety stub.
 *
 * This former batch writer upserted the legacy AcademyLessonAudio table.
 * Legacy rows are immutable under the versioned release architecture, so the
 * command now fails closed. Use generate-final-piper-academy.ts from an
 * isolated --network none container for an explicit new release.
 */
process.stderr.write(
  "Legacy AcademyLessonAudio generation is disabled. Use scripts/generate-final-piper-academy.ts in the isolated release workflow.\n",
);
process.exitCode = 1;
