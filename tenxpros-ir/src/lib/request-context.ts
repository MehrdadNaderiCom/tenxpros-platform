import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { getRateLimitSalt } from "@/lib/rate-limit";

export async function getRequestClientIp() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-real-ip")?.trim() ||
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function rateLimitSubjectHash(kind: "ip" | "email", value: string) {
  return createHash("sha256")
    .update(
      `${getRateLimitSalt()}:${kind}:${value.trim().toLocaleLowerCase("en-US")}`,
    )
    .digest("hex");
}
