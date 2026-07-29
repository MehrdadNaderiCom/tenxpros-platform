import type { MetadataRoute } from "next";

const publicPaths = [
  "",
  "/program",
  "/dossier",
  "/certification",
  "/pricing",
  "/services",
  "/how-it-works",
  "/partners",
  "/partners/apply",
  "/partners/terms",
  "/directory",
  "/radar",
  "/apply",
  "/about",
  "/faq",
  "/support",
  "/privacy",
  "/terms",
  "/terms/updates",
  "/terms/archive/fa-2026-07-v1",
  "/refund",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "https://tenxpros.ir";

  return publicPaths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
