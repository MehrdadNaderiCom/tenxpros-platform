import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  generateContentSecurityPolicyNonce,
} from "../src/lib/security-headers";

function directive(policy: string, name: string): string {
  return (
    policy
      .split("; ")
      .find((candidate) => candidate.startsWith(`${name} `)) ?? ""
  );
}

describe("production security headers", () => {
  it("builds a nonce-only script policy with the audited integrations", () => {
    const nonce = "0123456789abcdef0123456789abcdef";
    const policy = buildContentSecurityPolicy(nonce);
    const scripts = directive(policy, "script-src");

    expect(scripts).toBe(
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    );
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("*");
    expect(policy).not.toMatch(/[\r\n]/);

    expect(directive(policy, "frame-src")).toBe(
      "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.loom.com https://docs.google.com https://drive.google.com",
    );
    expect(directive(policy, "connect-src")).toBe("connect-src 'self'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(policy).toContain("font-src 'self' data: https://fonts.gstatic.com");
    expect(policy).not.toContain("stripe.com");
  });

  it("keeps development-only eval compatibility out of production", () => {
    const nonce = "abcdef0123456789abcdef0123456789";
    const production = buildContentSecurityPolicy(nonce);
    const development = buildContentSecurityPolicy(nonce, {
      development: true,
    });

    expect(directive(production, "script-src")).not.toContain("unsafe-eval");
    expect(directive(development, "script-src")).toContain("'unsafe-eval'");
  });

  it("generates unique CSP-safe nonces and rejects header injection", () => {
    const first = generateContentSecurityPolicyNonce();
    const second = generateContentSecurityPolicyNonce();

    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(second).toMatch(/^[a-f0-9]{32}$/);
    expect(first).not.toBe(second);
    expect(() => buildContentSecurityPolicy("valid\r\nInjected: yes")).toThrow(
      /invalid characters/i,
    );
  });

  it("configures every required static response header catch-all", () => {
    const config = fs.readFileSync(
      path.join(process.cwd(), "next.config.mjs"),
      "utf8",
    );

    expect(config).toContain('source: "/:path*"');
    for (const name of [
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Cross-Origin-Opener-Policy",
      "X-Frame-Options",
    ]) {
      expect(config).toContain(`key: "${name}"`);
    }
  });
});
