import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://tenxpros.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/portal/", "/api/"],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
