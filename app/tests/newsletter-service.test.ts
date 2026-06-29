import { describe, it, expect } from "vitest";
import { normalizeEmail, isValidEmail } from "../src/lib/newsletter/validation";

describe("newsletter email handling", () => {
  it("normalizes by trimming and lowercasing", () => {
    expect(normalizeEmail("  Person@Example.COM  ")).toBe("person@example.com");
    expect(normalizeEmail("a@b.co")).toBe("a@b.co");
  });

  it("accepts plausible addresses", () => {
    for (const e of ["a@b.co", "first.last@sub.example.com", "x+tag@example.io"]) {
      expect(isValidEmail(e), e).toBe(true);
    }
  });

  it("rejects malformed addresses", () => {
    for (const e of ["", "no-at", "a@b", "a@ b.co", "two@@b.co", "spaces in@x.co"]) {
      expect(isValidEmail(e), e).toBe(false);
    }
  });
});
