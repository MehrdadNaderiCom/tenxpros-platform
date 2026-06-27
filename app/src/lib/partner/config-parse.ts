import type { ConfigUnit } from "./constants";

export type ParsedConfigValue = number | string | boolean | null;

/**
 * Parse one raw config form value according to its unit. An empty string means
 * "not provided" → null (the caller decides whether that clears an override or
 * leaves a global value unchanged). Numeric units are stored as integers
 * (basis points / cents / days / counts), never floats.
 */
export function parseConfigField(unit: ConfigUnit, raw: string | null | undefined): ParsedConfigValue {
  const t = (raw ?? "").trim();
  if (t === "") return null;
  switch (unit) {
    case "bool":
      return t === "true" || t === "on" || t === "1" || t === "yes";
    case "enum":
    case "text":
      return t;
    default: {
      const n = Number(t);
      if (!Number.isFinite(n)) return null;
      return Math.round(n);
    }
  }
}
