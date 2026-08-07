import type { UserRole } from "@prisma/client";

export type SessionTokenState = {
  role?: UserRole;
  authVersion?: number;
};

export type CurrentAccountState = {
  role: UserRole;
  authVersion: number;
  isActive: boolean;
};

export type AuthorizationDecision =
  | { valid: true; role: UserRole; authVersion: number }
  | { valid: false; reason: "ACCOUNT_MISSING" | "ACCOUNT_SUSPENDED" | "ROLE_CHANGED" | "SECURITY_CHANGED" };

/**
 * Decide whether a JWT still represents the current database identity.
 *
 * Legacy sessions issued before authVersion existed are accepted once only when
 * their role still matches the database. This avoids a blanket production
 * logout at rollout while still rejecting an already-stale privileged claim.
 */
export function authorizeSessionToken(
  token: SessionTokenState,
  account: CurrentAccountState | null,
): AuthorizationDecision {
  if (!account) return { valid: false, reason: "ACCOUNT_MISSING" };
  if (!account.isActive) return { valid: false, reason: "ACCOUNT_SUSPENDED" };

  if (token.authVersion == null) {
    // A pre-rollout token can be adopted only while the database account has
    // never had a security-sensitive mutation. Once the trigger has bumped the
    // version, absence of a token version is itself stale-session evidence.
    if (account.authVersion !== 0) {
      return { valid: false, reason: "SECURITY_CHANGED" };
    }
    if (token.role == null || token.role !== account.role) {
      return { valid: false, reason: "ROLE_CHANGED" };
    }
    return { valid: true, role: account.role, authVersion: account.authVersion };
  }

  if (token.authVersion !== account.authVersion) {
    return { valid: false, reason: "SECURITY_CHANGED" };
  }
  // Defense in depth if a role was ever changed outside the version trigger
  // (for example during a restore): never silently adopt a mismatched claim.
  if (token.role == null || token.role !== account.role) {
    return { valid: false, reason: "ROLE_CHANGED" };
  }

  return { valid: true, role: account.role, authVersion: account.authVersion };
}
