import type { ModuleStatus } from "@prisma/client";

export const PARTICIPANT_STARTABLE_MODULE_STATUSES: readonly ModuleStatus[] = ["UNLOCKED"];
export const PARTICIPANT_SUBMITTABLE_MODULE_STATUSES: readonly ModuleStatus[] = [
  "IN_PROGRESS",
  "REVISE",
];

export function canParticipantStartModule(status: ModuleStatus): boolean {
  return PARTICIPANT_STARTABLE_MODULE_STATUSES.includes(status);
}

export function canParticipantSubmitModule(status: ModuleStatus): boolean {
  return PARTICIPANT_SUBMITTABLE_MODULE_STATUSES.includes(status);
}
