import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function sourceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe("security hardening regressions", () => {
  it("protects application status changes with the admin authorization helper", () => {
    const source = readSource("src/lib/actions/applications.ts");
    const actionSource = sourceBetween(
      source,
      "export async function updateApplicationStatus",
      "async function createPendingPaymentAndSendAcceptedEmail",
    );

    expect(source).toContain("requireAdminUser");
    expect(actionSource).toContain("const admin = await requireAdminUser();");
    expect(actionSource).toContain("actorId: admin.id");
    expect(actionSource).toContain("actorRole: admin.role");
  });

  it("protects manual payment enrollment with the admin authorization helper", () => {
    const source = readSource("src/lib/actions/applications.ts");
    const actionSource = sourceBetween(
      source,
      "export async function markPaymentReceivedAndEnroll",
      "export async function setParticipantPassword",
    );

    expect(actionSource).toContain("const admin = await requireAdminUser();");
    expect(actionSource).toContain("actorId: admin.id");
    expect(actionSource).toContain("actorRole: admin.role");
  });

  it("protects exported badge issuance directly", () => {
    const source = readSource("src/lib/actions/admin.ts");
    const issueBadgeSource = sourceBetween(source, "export async function issueBadge", "async function issueBadgeForAdmin");

    expect(source).toContain('requireAdminUser as requireAdmin');
    expect(issueBadgeSource.indexOf("await requireAdmin();")).toBeLessThan(
      issueBadgeSource.indexOf("issueBadgeForAdmin"),
    );
  });

  it("keeps a defense-in-depth role check in the portal layout", () => {
    const source = readSource("src/app/(participant)/portal/layout.tsx");

    expect(source).toContain('"PARTICIPANT"');
    expect(source).toContain('"COACH"');
    expect(source).toContain('"ADMIN"');
    expect(source).toContain("portalRoles.includes(session.user.role)");
  });
});
