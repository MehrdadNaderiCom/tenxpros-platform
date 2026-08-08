import { describe, expect, it } from "vitest";
import { authorizeSessionToken } from "../src/lib/auth/session-state";

describe("database-backed JWT authorization freshness", () => {
  it("rejects a stale admin token after a role downgrade", () => {
    expect(
      authorizeSessionToken(
        { role: "ADMIN", authVersion: 4 },
        { role: "APPLICANT", authVersion: 5, isActive: true },
      ),
    ).toEqual({ valid: false, reason: "SECURITY_CHANGED" });
  });

  it("rejects a stale partner token after partner permissions are removed", () => {
    expect(
      authorizeSessionToken(
        { role: "PARTNER", authVersion: 9 },
        { role: "APPLICANT", authVersion: 10, isActive: true },
      ),
    ).toEqual({ valid: false, reason: "SECURITY_CHANGED" });
  });

  it("rejects deleted and suspended accounts", () => {
    expect(authorizeSessionToken({ role: "ADMIN", authVersion: 1 }, null)).toEqual({
      valid: false,
      reason: "ACCOUNT_MISSING",
    });
    expect(
      authorizeSessionToken(
        { role: "PARTICIPANT", authVersion: 1 },
        { role: "PARTICIPANT", authVersion: 1, isActive: false },
      ),
    ).toEqual({ valid: false, reason: "ACCOUNT_SUSPENDED" });
  });

  it("rejects any password or security change that bumps authVersion", () => {
    expect(
      authorizeSessionToken(
        { role: "PARTICIPANT", authVersion: 2 },
        { role: "PARTICIPANT", authVersion: 3, isActive: true },
      ),
    ).toEqual({ valid: false, reason: "SECURITY_CHANGED" });
  });

  it("rejects a role mismatch even if an external restore failed to bump the version", () => {
    expect(
      authorizeSessionToken(
        { role: "ADMIN", authVersion: 3 },
        { role: "APPLICANT", authVersion: 3, isActive: true },
      ),
    ).toEqual({ valid: false, reason: "ROLE_CHANGED" });
  });

  it("migrates a legacy token only when its role is still current", () => {
    expect(
      authorizeSessionToken(
        { role: "PARTNER" },
        { role: "PARTNER", authVersion: 0, isActive: true },
      ),
    ).toEqual({ valid: true, role: "PARTNER", authVersion: 0 });
    expect(
      authorizeSessionToken(
        { role: "ADMIN" },
        { role: "APPLICANT", authVersion: 0, isActive: true },
      ),
    ).toEqual({ valid: false, reason: "ROLE_CHANGED" });
    expect(
      authorizeSessionToken(
        { role: "PARTNER" },
        { role: "PARTNER", authVersion: 7, isActive: true },
      ),
    ).toEqual({ valid: false, reason: "SECURITY_CHANGED" });
    expect(
      authorizeSessionToken({}, { role: "PARTNER", authVersion: 0, isActive: true }),
    ).toEqual({ valid: false, reason: "ROLE_CHANGED" });
  });
});
