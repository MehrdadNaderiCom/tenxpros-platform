/**
 * Single source for the annual validity of the terms and the survival clauses
 * that outlast year end. Both the public "Terms and rules updates" page and the
 * TermsVersion seed are built from here, so the wording stays in one place.
 * Written without em dashes by design.
 */

export interface SurvivalClause {
  title: string;
  body: string;
}

/** Obligations that continue after the calendar year ends and after a partnership ends. */
export const SURVIVAL_CLAUSES: SurvivalClause[] = [
  {
    title: "Confidentiality",
    body: "TenXPros materials, methods, curriculum, brand, customer data, pipeline, and pricing stay confidential and remain company property. This duty continues after year end and after the relationship ends.",
  },
  {
    title: "Non-circumvention",
    body: "During the relationship and for the defined period after it ends, you do not use TenXPros confidential information, registered accounts, introduced opportunities, or materials to divert business to a competing offering.",
  },
  {
    title: "Non-solicitation",
    body: "For the defined period after the relationship ends, you do not solicit TenXPros staff, contractors, coaches, or other partners.",
  },
  {
    title: "Clawback on commission already paid",
    body: "If an engagement, a seat, or a payment is later refunded, charged back, cancelled, credited, or reversed, the clawback right on commission already paid continues for its window, including the full refund or chargeback period of the underlying contract if that is longer.",
  },
  {
    title: "Ownership of intellectual property and customer relationships",
    body: "Ownership of TenXPros intellectual property and of customer relationships remains with the company. You keep legitimate relationships that existed before TenXPros and may do unrelated work in your field.",
  },
];

/** Plain statements of how the annual validity works. */
export const ANNUAL_VALIDITY: string[] = [
  "All terms, contracts, partner agreements, and program rules are valid for the calendar year in which they are accepted and expire on the thirty first of December of that year.",
  "The commission structure, the tier thresholds, and the program policies are set for the current calendar year and can change at the start of each new calendar year, for partners and for students alike.",
  "Every change is announced through the website, which is the official channel of notice. Continuing in the new year means accepting that year's published terms, and renewal happens through the site.",
  "The annual reset changes the commercial terms going forward. It does not erase the survival obligations you already carry from prior years.",
  "TenXPros is offered for defined periods and is not a perpetual service. After the company has met its outstanding obligations, the founder may, at the founder's sole discretion, conclude, pause, or change the direction or purpose of the service, and that decision is final and not subject to objection. Commitments already owed to participants and partners, and the survival obligations, are honored regardless.",
];

export function currentTermsYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

function paras(items: string[]): string {
  return items.map((p) => `<p>${p}</p>`).join("");
}

/** Build the TermsVersion row for a given year from the single source above. */
export function buildTermsVersionSeed(year: number) {
  const bodyHtml = [
    `<h2>Validity for ${year}</h2>`,
    paras(ANNUAL_VALIDITY),
    `<h2>Clauses that survive year end</h2>`,
    `<p>These obligations continue after the year ends and after a partnership ends:</p>`,
    `<ul>${SURVIVAL_CLAUSES.map((c) => `<li><strong>${c.title}.</strong> ${c.body}</li>`).join("")}</ul>`,
  ].join("");

  const changelog =
    year <= 2026
      ? `<ul><li>First published versioned terms for ${year}.</li><li>Stated the annual validity: terms run for the calendar year and expire on 31 December.</li><li>Listed the clauses that survive year end and the end of a partnership.</li></ul>`
      : `<ul><li>Annual review for ${year}. See the archive for prior years.</li></ul>`;

  return {
    year,
    audience: "all" as const,
    effectiveFrom: new Date(Date.UTC(year, 0, 1)),
    effectiveTo: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
    bodyHtml,
    changelog,
    isCurrent: true,
  };
}
