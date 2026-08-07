import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACTIVE_PARTNER_STATUSES, isActivePartnerStatus } from "../src/lib/partner/status";

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

// Every PartnerStatus enum value, split by whether it may access the panel.
const ACTIVE = ["PILOT", "TIER1", "TIER2", "TIER3", "INACTIVE"];
const BLOCKED = ["APPLICANT", "TERMINATED"];

describe("isActivePartnerStatus", () => {
  it("admits exactly the approved, non-terminated statuses", () => {
    for (const s of ACTIVE) expect(isActivePartnerStatus(s)).toBe(true);
  });

  it("blocks a bare applicant and a terminated partner", () => {
    for (const s of BLOCKED) expect(isActivePartnerStatus(s)).toBe(false);
  });

  it("blocks unknown or empty statuses", () => {
    expect(isActivePartnerStatus("")).toBe(false);
    expect(isActivePartnerStatus("PENDING")).toBe(false);
    expect(isActivePartnerStatus("tier1")).toBe(false); // case sensitive on purpose
  });

  it("uses the same allowlist that ACTIVE_PARTNER_STATUSES exposes", () => {
    expect([...ACTIVE_PARTNER_STATUSES].sort()).toEqual([...ACTIVE].sort());
    for (const s of BLOCKED) expect(ACTIVE_PARTNER_STATUSES as readonly string[]).not.toContain(s);
  });
});

describe("panel read gate (finding 2)", () => {
  const source = readSource("src/lib/partner/auth.ts");

  it("gates the panel read path in getCurrentPartner on active status", () => {
    const fn = sourceBetween(source, "export async function getCurrentPartner", "export async function requirePartner");
    // Resolves the session partner, then returns null unless the status is active.
    expect(fn).toContain("getSessionPartner()");
    expect(fn).toContain("isActivePartnerStatus(current.partner.status)");
    expect(fn).toContain("return null");
  });

  it("keeps the super admin preview branch BEFORE the active-status gate (preview unaffected)", () => {
    const fn = sourceBetween(source, "export async function getCurrentPartner", "export async function requirePartner");
    // The preview return must appear before the gate, so a super admin can still
    // preview a partner of any status (including terminated) read-only.
    expect(fn.indexOf("preview: true")).toBeGreaterThanOrEqual(0);
    expect(fn.indexOf("preview: true")).toBeLessThan(fn.indexOf("isActivePartnerStatus"));
  });

  it("still gates mutations in requirePartner with the same predicate", () => {
    const fn = sourceBetween(source, "export async function requirePartner", "export function isActivated");
    expect(fn).toContain("isActivePartnerStatus(current.partner.status)");
    expect(fn).toContain("Your partner account is not active.");
  });
});

describe("toolkit download gate (finding 3)", () => {
  const source = readSource("src/app/api/toolkit/files/[id]/route.ts");

  it("requires an active partner status for the non-admin branch", () => {
    expect(source).toContain('import { isActivePartnerStatus } from "@/lib/partner/status"');
    expect(source).toContain("getSessionPartner()");
    expect(source).toContain("!isActivePartnerStatus(current.partner.status)");
  });

  it("requires the parent post (and its category) to be published for non-admin downloads", () => {
    expect(source).toContain("post: { select: { isPublished: true, categoryRef: { select: { isPublished: true } } } }");
    expect(source).toContain("categoryHidden = Boolean(file.post?.categoryRef && !file.post.categoryRef.isPublished)");
    expect(source).toContain("!isAdmin && (!file.post?.isPublished || categoryHidden)");
  });

  it("still lets an admin fetch drafts and orphans (published check is admin-scoped)", () => {
    // The publication check is guarded by !isAdmin, so an admin path is unaffected.
    expect(source).toMatch(/if \(!isAdmin && \(!file\.post\?\.isPublished \|\| categoryHidden\)\)/);
  });
});
