import type { BadgeCategory, CertificationOutcome, CredentialStatus } from "@prisma/client";

export type CredentialValidity = "ACTIVE" | "REVOKED" | "EXPIRED" | "INACTIVE";
export type PublicCredentialStatus = CredentialValidity | "PRIVATE";

export type CredentialStateInput = {
  storedStatus: CredentialStatus;
  expiresAt: Date | null;
  badgeIsActive: boolean;
  badgeCategory: BadgeCategory;
  contextRef: string | null;
  certification: { id: string; outcome: CertificationOutcome } | null;
};

/**
 * Resolve validity from authoritative lifecycle state, independently of the
 * recipient's public/private preference. CAPSTONE badges are defensive: both
 * the stored badge state and the current CertificationReview must agree.
 */
export function resolveCredentialValidity(
  input: CredentialStateInput,
  now = new Date(),
): CredentialValidity {
  if (input.storedStatus === "REVOKED") return "REVOKED";
  if (
    input.badgeCategory === "CAPSTONE" &&
    (input.certification?.outcome !== "CERTIFIED" ||
      (input.contextRef != null && input.contextRef !== input.certification.id))
  ) {
    return "REVOKED";
  }
  if (input.expiresAt && input.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  if (!input.badgeIsActive) return "INACTIVE";
  return "ACTIVE";
}

export function resolvePublicCredentialStatus(
  validity: CredentialValidity,
  isPublic: boolean,
): PublicCredentialStatus {
  return validity === "ACTIVE" && !isPublic ? "PRIVATE" : validity;
}

/**
 * Certification field/specialization belong to the current certification,
 * rather than to every badge the participant has ever earned. Expose them only
 * while both the badge and the underlying certification are currently valid
 * and the recipient has opted into public verification.
 */
export function canExposeCertificationDetails(input: {
  credentialStatus: PublicCredentialStatus;
  isPublic: boolean;
  certificationOutcome: CertificationOutcome | null | undefined;
}): boolean {
  return (
    input.credentialStatus === "ACTIVE" &&
    input.isPublic &&
    input.certificationOutcome === "CERTIFIED"
  );
}
