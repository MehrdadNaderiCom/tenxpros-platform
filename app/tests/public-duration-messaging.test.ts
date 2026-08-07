import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const participantMessagingFiles = [
  "src/app/layout.tsx",
  "src/app/(public)/page.tsx",
  "src/app/(public)/program/page.tsx",
  "src/app/(public)/how-it-works/page.tsx",
  "src/components/marketing/home-instrument.tsx",
  "src/components/marketing/program-instrument.tsx",
  "src/components/marketing/dossier-instrument.tsx",
  "src/components/marketing/pricing-instrument.tsx",
  "src/components/marketing/certification-instrument.tsx",
  "src/components/marketing/application-form.tsx",
  "src/lib/program-data.ts",
  "src/lib/marketing/ai-coach.ts",
  "src/lib/marketing/ai-suggest.ts",
  "src/lib/marketing/playbook-seed.ts",
  "public/samples/tenxpros-sample-dossier-excerpt.html",
  "../TENXPROS_SAMPLE_DOSSIER_EXCERPT_V2_PUBLIC_READY.md",
] as const;

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("public participant duration messaging", () => {
  it.each(participantMessagingFiles)("contains no legacy 90-day participant messaging in %s", (file) => {
    expect(read(file)).not.toMatch(/\b90(?:[ -]?day|[ -]?days)\b/i);
  });

  it("states the official journey and explains the guided learning structure", () => {
    const home = read("src/components/marketing/home-instrument.tsx");
    const program = read("src/components/marketing/program-instrument.tsx");

    expect(home).toContain("100-day journey");
    expect(home).toContain("12-week guided");
    expect(program).toContain("100-day journey");
    expect(program).toContain("12 guided learning weeks");
    expect(program).toContain("Weeks 1-4");
    expect(program).toContain("Weeks 11-12");
  });

  it("keeps the public sample source and rendered HTML on the same 100-day roadmap", () => {
    const source = read("../TENXPROS_SAMPLE_DOSSIER_EXCERPT_V2_PUBLIC_READY.md");
    const html = read("public/samples/tenxpros-sample-dossier-excerpt.html");

    for (const content of [source, html]) {
      expect(content).toContain("100-day roadmap");
      expect(content).toContain("Days 61–100");
      expect(content).not.toContain("Days 61–90");
    }
  });
});
