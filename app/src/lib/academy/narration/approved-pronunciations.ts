import type { NarrationOverrides } from "./contracts";

/**
 * Owner approval recorded in the Piper quality-validation request. Keeping
 * every approved choice in one immutable profile prevents the audit, preview,
 * and evaluation pipeline from silently using different pronunciations.
 */
export const ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE =
  "USER-APPROVAL-cce0f6a1-48ec-4686-8c01-16fe1d6b10e8-2026-07-26";

export const ACADEMY_PRONUNCIATION_FREEZE_REVISION =
  "academy-owner-approved-pronunciations-v1";

const APPROVED_TERM_PRONUNCIATIONS = Object.freeze({
  CEO: "C E O",
  SMS: "S M S",
  TenX: "Ten X",
  TenXPro: "Ten X Pro",
  TenXPros: "Ten X Pros",
});

const APPROVED_LESSON_SCOPED_PRONUNCIATIONS = Object.freeze({
  SME: Object.freeze({
    firstOccurrence: "small and medium-sized enterprise",
    subsequentOccurrences: "S M E",
  }),
});

const APPROVED_URL_PRONUNCIATIONS = Object.freeze({
  "https://tenxpros.com/pricing": "the Ten X Pros pricing page",
  "https://www.linkedin.com/in/mehrdad-naderi/":
    "Mehrdad Naderi's LinkedIn profile",
  "linkedin.com/in/mehrdad-naderi":
    "Mehrdad Naderi's LinkedIn profile",
  "mehrdadnaderi.com": "mehrdadnaderi dot com",
  "tenxops.org": "the Ten X Ops website",
});

/*
 * Email addresses are protected before bare domains are normalized. This exact
 * mapping therefore applies the approved domain pronunciation to the address
 * without allowing a generic domain rule to rewrite arbitrary email tokens.
 */
const APPROVED_EMAIL_PRONUNCIATIONS = Object.freeze({
  "mail@mehrdadnaderi.com": "mail at mehrdadnaderi dot com",
});

export const FROZEN_ACADEMY_NARRATION_OVERRIDES = Object.freeze({
  revision: ACADEMY_PRONUNCIATION_FREEZE_REVISION,
  ownerApproval: Object.freeze({
    reference: ACADEMY_PRONUNCIATION_OWNER_APPROVAL_REFERENCE,
    approved: true as const,
  }),
  pronunciations: APPROVED_TERM_PRONUNCIATIONS,
  lessonScopedPronunciations:
    APPROVED_LESSON_SCOPED_PRONUNCIATIONS,
  approvedUrls: APPROVED_URL_PRONUNCIATIONS,
  approvedEmails: APPROVED_EMAIL_PRONUNCIATIONS,
}) satisfies NarrationOverrides;
