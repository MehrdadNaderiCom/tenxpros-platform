import type { MetadataRoute } from "next";

const publicRoutes = [
  "",
  "/program",
  "/how-it-works",
  "/dossier",
  "/certification",
  "/pricing",
  "/directory",
  "/radar",
  "/about",
  "/apply",
  "/terms",
  "/privacy",
  "/refund",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://tenxpros.com";
  return publicRoutes.map((route) => ({
    url: new URL(route, base).toString(),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
