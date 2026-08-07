import type { Metadata } from "next";

export const SITE_URL = "https://tenxpros.com";
export const PERSIAN_SITE_URL = "https://tenxpros.ir";
export const SOCIAL_IMAGE_URL = `${SITE_URL}/opengraph-image`;

const SITE_NAME = "TenXPros";
const SOCIAL_IMAGE_ALT =
  "TenXPros, a 100-day AI adoption journey for experienced professionals";

type PublicMetadataInput = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  homepageLanguageAlternates?: boolean;
};

function absoluteUrl(path: PublicMetadataInput["path"]): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

/**
 * Shared metadata for indexable English pages on tenxpros.com. Canonicals are
 * always route-specific. Only the homepage declares the Persian site because
 * that is the only reciprocal hreflang pair currently published by tenxpros.ir.
 */
export function buildPublicMetadata({
  title,
  description,
  path,
  homepageLanguageAlternates = false,
}: PublicMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const languages = homepageLanguageAlternates
    ? {
        en: `${SITE_URL}/`,
        "fa-IR": `${PERSIAN_SITE_URL}/`,
        "x-default": `${SITE_URL}/`,
      }
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: [
        {
          url: SOCIAL_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: SOCIAL_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: SOCIAL_IMAGE_URL, alt: SOCIAL_IMAGE_ALT }],
    },
  };
}

export const ORGANIZATION_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "TenXPros",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icon.svg`,
  email: "support@tenxpros.com",
  sameAs: [`${PERSIAN_SITE_URL}/`],
  parentOrganization: {
    "@type": "Organization",
    name: "Naprolity OÜ",
  },
} as const;

export function buildFaqStructuredData(
  path: PublicMetadataInput["path"],
  faqs: ReadonlyArray<readonly [question: string, answer: string]>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${absoluteUrl(path)}#faq`,
    inLanguage: "en",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  } as const;
}
