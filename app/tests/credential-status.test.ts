import { describe, expect, it } from "vitest";
import {
  canExposeCertificationDetails,
  resolveCredentialValidity,
  resolvePublicCredentialStatus,
} from "../src/lib/credentials/status";

const active = {
  storedStatus: "ACTIVE" as const,
  expiresAt: null,
  badgeIsActive: true,
  badgeCategory: "CAPSTONE" as const,
  contextRef: "review_1",
  certification: { id: "review_1", outcome: "CERTIFIED" as const },
};

describe("credential lifecycle status", () => {
  it("keeps an active certification and matching badge active", () => {
    expect(resolveCredentialValidity(active)).toBe("ACTIVE");
  });

  it("makes a revoked badge authoritative", () => {
    expect(resolveCredentialValidity({ ...active, storedStatus: "REVOKED" })).toBe("REVOKED");
  });

  it("revokes capstone verification after certification downgrade", () => {
    expect(
      resolveCredentialValidity({
        ...active,
        certification: { id: "review_1", outcome: "CONDITIONALLY_CERTIFIED" },
      }),
    ).toBe("REVOKED");
  });

  it("rejects a capstone badge linked to a superseded review", () => {
    expect(
      resolveCredentialValidity({ ...active, certification: { id: "review_2", outcome: "CERTIFIED" } }),
    ).toBe("REVOKED");
  });

  it("derives expiry at request time without a cron", () => {
    expect(
      resolveCredentialValidity(
        { ...active, expiresAt: new Date("2026-01-01T00:00:00Z") },
        new Date("2026-01-02T00:00:00Z"),
      ),
    ).toBe("EXPIRED");
  });

  it("keeps privacy separate from credential validity", () => {
    expect(resolvePublicCredentialStatus("ACTIVE", false)).toBe("PRIVATE");
    expect(resolvePublicCredentialStatus("REVOKED", false)).toBe("REVOKED");
  });

  it("never exposes stale certification details through another active badge", () => {
    expect(
      canExposeCertificationDetails({
        credentialStatus: "ACTIVE",
        isPublic: true,
        certificationOutcome: "CONDITIONALLY_CERTIFIED",
      }),
    ).toBe(false);
    expect(
      canExposeCertificationDetails({
        credentialStatus: "ACTIVE",
        isPublic: true,
        certificationOutcome: "CERTIFIED",
      }),
    ).toBe(true);
  });
});
