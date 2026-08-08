import { describe, expect, it } from "vitest";
import {
  buildFaqStructuredData,
  buildPublicMetadata,
  ORGANIZATION_STRUCTURED_DATA,
  SOCIAL_IMAGE_URL,
} from "../src/lib/seo";

describe("public SEO metadata", () => {
  it("builds a self-canonical social card for each route", () => {
    const metadata = buildPublicMetadata({
      title: "The Method",
      description: "The TenXPros 100-day journey.",
      path: "/program",
    });

    expect(metadata.alternates?.canonical).toBe("https://tenxpros.com/program");
    expect(metadata.alternates?.languages).toBeUndefined();
    expect(metadata.openGraph).toMatchObject({
      locale: "en_US",
      siteName: "TenXPros",
      url: "https://tenxpros.com/program",
      description: "The TenXPros 100-day journey.",
      images: [expect.objectContaining({ url: SOCIAL_IMAGE_URL, width: 1200, height: 630 })],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [expect.objectContaining({ url: SOCIAL_IMAGE_URL })],
    });
  });

  it("publishes only valid self-referencing homepage language alternates", () => {
    const metadata = buildPublicMetadata({
      title: "TenXPros",
      description: "A selective 100-day journey.",
      path: "/",
      homepageLanguageAlternates: true,
    });

    expect(metadata.alternates).toEqual({
      canonical: "https://tenxpros.com/",
      languages: {
        en: "https://tenxpros.com/",
        "x-default": "https://tenxpros.com/",
      },
    });
  });

  it("keeps organization and visible FAQ structured data factual", () => {
    expect(ORGANIZATION_STRUCTURED_DATA).toMatchObject({
      "@type": "Organization",
      name: "TenXPros",
      url: "https://tenxpros.com/",
      email: "support@tenxpros.com",
      parentOrganization: { name: "Naprolity OÜ" },
    });

    const faq = buildFaqStructuredData("/pricing", [
      ["What is TenXPros?", "A selective 100-day journey."],
    ]);
    expect(faq).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": "https://tenxpros.com/pricing#faq",
      inLanguage: "en",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is TenXPros?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A selective 100-day journey.",
          },
        },
      ],
    });
  });
});
