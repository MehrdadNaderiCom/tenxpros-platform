import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("form field primitives", () => {
  it("forward refs for React Hook Form registration", () => {
    const source = readFileSync(join(process.cwd(), "src/components/ui/form-fields.tsx"), "utf8");

    expect(source).toContain("export const Input = forwardRef");
    expect(source).toContain("export const Select = forwardRef");
    expect(source).toContain("export const Textarea = forwardRef");
    expect(source.match(/ref=\{ref\}/g)).toHaveLength(3);
  });
});
