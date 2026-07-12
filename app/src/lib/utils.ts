import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Deterministic timestamp with an explicit zone label, e.g. "2026-07-12 09:08 UTC".
 * Server components render in the server's zone, so an unlabeled toLocaleString
 * would show partners an ambiguous local-looking time.
 */
export function formatUtcDateTime(d: Date) {
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function absoluteUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
