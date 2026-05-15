import type { ApplicationStatus } from "@prisma/client";

const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "ACCEPTED", "REVISE_AND_REAPPLY", "NOT_ACCEPTED"],
  UNDER_REVIEW: ["ACCEPTED", "REVISE_AND_REAPPLY", "NOT_ACCEPTED"],
  ACCEPTED: ["ENROLLED", "REVISE_AND_REAPPLY", "NOT_ACCEPTED"],
  REVISE_AND_REAPPLY: ["SUBMITTED", "UNDER_REVIEW"],
  NOT_ACCEPTED: [],
  ENROLLED: [],
};

export function canTransitionApplication(from: ApplicationStatus, to: ApplicationStatus) {
  return from === to || transitions[from].includes(to);
}

export function assertApplicationTransition(from: ApplicationStatus, to: ApplicationStatus) {
  if (!canTransitionApplication(from, to)) {
    throw new Error(`Invalid application status transition: ${from} -> ${to}`);
  }
}
