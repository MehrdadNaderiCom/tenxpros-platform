import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(date: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", opts).format(d);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function percentage(n: number, denom: number) {
  if (denom === 0) return 0;
  return Math.round((n / denom) * 100);
}

export function generatePublicCertificateId(): string {
  // Short, human-readable, URL-safe id used in /verify URLs (12 chars)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TXP-";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const certificateLevelLabels: Record<string, string> = {
  L1_AI_READY: "AI-Ready Professional · Foundation",
  L2_AI_ADOPTED: "AI-Adopted Professional · Practitioner",
  L3_AI_AUGMENTED: "AI-Augmented Specialist",
  L4_AI_IMPLEMENTER: "AI Adoption Implementer",
  L5_AI_LEADER: "AI Adoption Lead",
};

export const workModeLabels: Record<string, string> = {
  HUMAN_LED: "Human-led",
  AI_ASSISTED: "AI-assisted",
  RULES_BASED: "Rules-based",
  AUTOMATED: "Fully automated",
  AI_TOOL_CHAIN: "AI tool chain",
  ESCALATE: "Needs technical implementation",
  NOT_SUITABLE: "Not suitable for AI",
};

export const workModeDescriptions: Record<string, string> = {
  HUMAN_LED: "Done by a human; AI may proofread, but it is not in the loop.",
  AI_ASSISTED: "Human is in charge; AI accelerates discrete steps.",
  RULES_BASED: "Deterministic rules / templates / spreadsheets handle it.",
  AUTOMATED: "End-to-end automation, with monitoring and exceptions.",
  AI_TOOL_CHAIN: "Multi-step AI + tools, orchestrated, with verification.",
  ESCALATE: "Escalate to a developer or platform team.",
  NOT_SUITABLE: "Risk, judgement or context makes AI unsafe here.",
};
