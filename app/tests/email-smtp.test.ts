import { describe, expect, it, vi } from "vitest";
import { redactRecipient, resolveSmtpConfig, safeRun } from "../src/lib/services/email-smtp";

describe("redactRecipient", () => {
  it("masks the local part and keeps the domain", () => {
    expect(redactRecipient("hello@tenxpros.com")).toBe("***@tenxpros.com");
  });
  it("handles malformed input without leaking it", () => {
    expect(redactRecipient("not-an-email")).toBe("***");
    expect(redactRecipient("@x.com")).toBe("***");
  });
});

describe("resolveSmtpConfig", () => {
  const base = {
    SMTP_HOST: "tenxpros.com",
    SMTP_USER: "hello@tenxpros.com",
    SMTP_PASSWORD: "s3cr3t-pass",
    SMTP_PORT: "465",
    SMTP_SECURE: "true",
  };

  it("returns host/port/secure/auth from env", () => {
    expect(resolveSmtpConfig(base)).toEqual({
      host: "tenxpros.com",
      port: 465,
      secure: true,
      auth: { user: "hello@tenxpros.com", pass: "s3cr3t-pass" },
    });
  });

  it("treats SMTP_SECURE=false as not secure and defaults port to 465", () => {
    const cfg = resolveSmtpConfig({ ...base, SMTP_SECURE: "false", SMTP_PORT: undefined });
    expect(cfg.secure).toBe(false);
    expect(cfg.port).toBe(465);
  });

  it("throws naming the missing keys when config is incomplete", () => {
    expect(() => resolveSmtpConfig({ SMTP_HOST: "tenxpros.com" })).toThrow(/SMTP_USER/);
    expect(() => resolveSmtpConfig({})).toThrow(/SMTP_HOST.*SMTP_USER.*SMTP_PASSWORD/);
  });

  it("never includes the password value in the thrown error", () => {
    let message = "";
    try {
      resolveSmtpConfig({ SMTP_USER: "hello@tenxpros.com", SMTP_PASSWORD: "s3cr3t-pass" });
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain("SMTP_HOST");
    expect(message).not.toContain("s3cr3t-pass");
  });
});

describe("safeRun (the core of safeSendEmail)", () => {
  it("returns ok:true when delivery succeeds", async () => {
    const res = await safeRun({ template: "application_received", to: "a@b.com" }, async () => {});
    expect(res).toEqual({ ok: true });
  });

  it("catches a thrown provider error and does NOT throw", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await safeRun({ template: "application_received", to: "user@example.com" }, async () => {
      throw new Error("SMTP connection refused");
    });
    expect(res).toEqual({ ok: false, error: "SMTP connection refused" });

    // the warning is redacted to domain-only and does not leak the local part
    const logged = warn.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(logged).toContain("***@example.com");
    expect(logged).not.toContain("user@example.com");
    warn.mockRestore();
  });
});
