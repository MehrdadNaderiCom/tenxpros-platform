/**
 * Validate and print all seedable reference content (Academy modules, the current
 * TermsVersion, and the default newsletter groups) as one JSON document. Run on
 * the host with tsx:
 *   pnpm exec tsx scripts/dump-content.ts > /tmp/content.json
 * It is then seeded inside the container by scripts/seed-content.cjs. This is how
 * reference content reaches the shared database (the normal prisma seed refuses
 * to run in production, and that guard is for test data, not content).
 */
import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import { validateAcademyContent } from "../prisma/seed/academy";
import { buildTermsVersionSeed, currentTermsYear } from "../src/lib/terms/annual";
import { sanitizeLessonHtml, htmlToPlainText } from "../src/lib/academy/lesson-html";

validateAcademyContent(ACADEMY_MODULES);

// Prepare the rich body and audio text here (in TS, where the sanitizer lives) so
// the plain CommonJS prod seeder can write them verbatim.
const academy = ACADEMY_MODULES.map((m) => {
  const bodyHtml = m.bodyHtml ? sanitizeLessonHtml(m.bodyHtml) : null;
  return { ...m, bodyHtml, audioText: bodyHtml ? htmlToPlainText(bodyHtml) : m.lesson };
});

const payload = {
  academy,
  terms: [buildTermsVersionSeed(currentTermsYear())],
  groups: [
    { name: "General updates", description: "Everyone who subscribed from the site." },
    { name: "Partners", description: "Partners and partner applicants." },
  ],
};

process.stdout.write(JSON.stringify(payload));
