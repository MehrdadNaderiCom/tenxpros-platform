import type { DossierSectionStatus } from "@prisma/client";

const editableStatuses = new Set<DossierSectionStatus>(["DRAFT", "REVIEWED", "REVISED"]);
const lockedStatuses = new Set<DossierSectionStatus>(["SUBMITTED", "APPROVED"]);

export function canParticipantEditDossierSection(status: DossierSectionStatus) {
  return editableStatuses.has(status);
}

export function isDossierSectionLocked(status: DossierSectionStatus) {
  return lockedStatuses.has(status);
}

export function assertParticipantCanEditDossierSection(status: DossierSectionStatus) {
  if (!canParticipantEditDossierSection(status)) {
    throw new Error("This section is submitted for review and cannot be edited.");
  }
}
