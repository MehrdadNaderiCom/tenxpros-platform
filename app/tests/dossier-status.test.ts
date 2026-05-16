import { describe, expect, it } from "vitest";
import {
  assertParticipantCanEditDossierSection,
  canParticipantEditDossierSection,
  isDossierSectionLocked,
} from "../src/lib/dossier";

describe("dossier section participant edit rules", () => {
  it.each(["DRAFT", "REVIEWED", "REVISED"] as const)("allows participant edits for %s sections", (status) => {
    expect(canParticipantEditDossierSection(status)).toBe(true);
    expect(isDossierSectionLocked(status)).toBe(false);
    expect(() => assertParticipantCanEditDossierSection(status)).not.toThrow();
  });

  it.each(["SUBMITTED", "APPROVED"] as const)("locks participant edits for %s sections", (status) => {
    expect(canParticipantEditDossierSection(status)).toBe(false);
    expect(isDossierSectionLocked(status)).toBe(true);
    expect(() => assertParticipantCanEditDossierSection(status)).toThrow(/submitted for review/i);
  });
});
