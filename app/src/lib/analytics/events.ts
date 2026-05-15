export const analyticsEvents = {
  pageView: "PAGE_VIEW",
  ctaClickApply: "CTA_CLICK_APPLY",
  ctaClickPricing: "CTA_CLICK_PRICING",
  applicationSubmitted: "APPLICATION_SUBMITTED",
  applicationAccepted: "APPLICATION_ACCEPTED",
  enrollmentCompleted: "ENROLLMENT_COMPLETED",
  starterPackCompleted: "STARTER_PACK_COMPLETED",
  diagnosticSubmitted: "DIAGNOSTIC_SUBMITTED",
  moduleSubmitted: "MODULE_SUBMITTED",
  modulePassed: "MODULE_PASSED",
  dossierSectionSubmitted: "DOSSIER_SECTION_SUBMITTED",
  certificationDecision: "CERTIFICATION_DECISION",
  ticketCreated: "TICKET_CREATED",
  badgeEarned: "BADGE_EARNED",
} as const;

export type AnalyticsEvent = (typeof analyticsEvents)[keyof typeof analyticsEvents];
