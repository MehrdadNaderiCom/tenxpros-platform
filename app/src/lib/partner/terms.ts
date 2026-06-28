/**
 * Plain-language Partner Program terms, shown in a modal on the application page
 * so an applicant can read and confirm them before applying. This is a faithful
 * summary of the TenXPros 90-Day Partner Pilot Letter and the full Partner
 * Program Agreement (Master Terms and Schedules A to H); the signed agreement is
 * the governing version. Written without em dashes by design.
 */

export interface TermsSection {
  title: string;
  body?: string[];
  bullets?: string[];
}

export const PARTNER_TERMS_LEAD =
  "This is a plain-language summary of how the TenXPros Partner Program works, so you can read it in full before you apply. If you are accepted and sign, the 90-Day Partner Pilot Letter and the full Partner Program Agreement are the governing versions. Each party should take its own professional and legal advice before signature.";

export const PARTNER_TERMS_SECTIONS: TermsSection[] = [
  {
    title: "How your rights work",
    body: [
      "Your rights as a partner come from a clear, simple formula: a registered opportunity, a real role performed, money actually received and cleared, a defined time window, and active management of the account.",
      "This is an independent contractor relationship. It is performance based and creates no employment, partnership, joint venture or agency, and no share, equity, option, co-founder status, board seat, salary, employment benefit, territory, country, industry or market exclusivity, or long-term commitment. You earn a defined commission only when there is a confirmed Deal Registration, a real role performed, and cleared money received.",
      "The company may also work with other partners, sell directly, and change its pricing or offerings, while always honouring confirmed Deal Registrations and Closed Deals.",
    ],
  },
  {
    title: "Who you contract with",
    body: [
      "The TenXPros Partner Program is operated by Naprolity OÜ, the company that operates TenXPros and is the payee for the program. Your partner agreement is entered into with Naprolity OÜ.",
      "If you are accepted and sign, the 90-Day Partner Pilot Letter and the full Partner Program Agreement are the governing documents, under the laws of England and Wales.",
    ],
  },
  {
    title: "Everything runs on the Partner Panel",
    body: [
      "The TenXPros Partner Panel is the single source of truth. Nothing is approved, registered, promoted or confirmed unless the company confirms it on the panel (a Panel Confirmation).",
      "You request access, complete onboarding, register opportunities, and from then on every confirmation, scorecard step, tier change and focus grant is recorded on the panel. A pending status, a verbal comment, or a message on any other channel is not a confirmation.",
    ],
  },
  {
    title: "The 90-day pilot",
    body: [
      "Every partner starts on a 90-day pilot, on a commission-only basis, so you can test the opportunity and the company can see your fit. Either party may end the pilot on 7 days written notice, for any reason.",
      "Ending the pilot does not remove commission already earned on a Closed Deal, subject to the clawback rules below. A partner who performs well in the pilot may be offered the full Partner Program Agreement.",
    ],
  },
  {
    title: "Onboarding and the Activation Gate",
    body: [
      "Before you contact any prospect using the TenXPros name, you complete the Activation Gate: a signed agreement and completed onboarding, approved messaging, acknowledgement of these terms, agreement to use no spam and no bought or scraped lists, and a first target list submitted on the panel.",
      "You may begin outreach once the company confirms your gate on the panel.",
    ],
  },
  {
    title: "Deal Registration",
    body: [
      "Deal Registration is how you obtain priority and protection in a specific opportunity. You submit a registration before any substantive contact, and it is effective only when the company gives Panel Confirmation. No reply is not approval.",
      "A registration names the legal entity or individual, country, business unit, contact, offering, estimated seats and value, and your role. You also submit your case for the account: why it is reasonable for you to pursue this organisation, such as an existing relationship, a named warm contact, relevant sector experience, or a concrete route in.",
      "A registered account is limited to the exact scope confirmed. Affiliates, parent and sister companies, other countries, departments and group accounts are not included unless the company expressly adds them. House accounts, the company's existing relationships and pipeline, direct inbound, and accounts already registered to another partner are not available to register.",
      "Where two or more partners seek the same account, priority belongs to the partner whose registration the company confirmed first on the panel.",
      "A customer who signs up directly through tenxpros.com belongs to no partner, unless you show, and the company confirms, that you sourced them under a confirmed registration, in which case your rights on that account are fully preserved.",
    ],
  },
  {
    title: "How commission is earned",
    body: [
      "Commission is earned by function, calculated on Net Receipts actually received and cleared. You earn for the functions you actually perform on a Closed Deal. The Seat (one enrolled professional) is the unit of sale.",
    ],
    bullets: [
      "Basic Introduction: 5% on B2C and B2B, paid if the introduction becomes a closed deal.",
      "Qualified Origination: 10% on B2C, 8% on B2B.",
      "Strong Origination: 15% on B2C (after 40 paid seats, or by Panel Confirmation), 12% on B2B.",
      "Closing: 5% on B2C, 10% on B2B.",
      "Delivery or Coaching: a fixed fee, or 5 to 8% if approved.",
      "Cap per deal: total partner compensation is 25% of Net Receipts on B2C and 30% on B2B, with a Tier 3 focus account able to rise gradually to 35%.",
    ],
  },
  {
    title: "Account protection",
    body: [
      "The company uses reasonable efforts to confirm or decline a registration on the panel within 5 business days. A confirmed account is held against competing registrations for a Pipeline Protection period, which is 120 days at Tier 1 and longer at higher tiers, while you actively pursue it.",
      "To keep an account reserved, you provide a meaningful update on the panel within your tier's cadence, for example a logged meeting, a documented next step, or a customer response. During the pilot you may hold up to 3 open registered accounts (2 in the first 30 days, until you show meaningful progress).",
    ],
  },
  {
    title: "Renewals, trail and the origination tail",
    body: [
      "Commission on a Closed Deal is payable on Net Receipts collected for up to 12 months from signing. This trail is vested and is not affected by your later activity, subject to the clawback rules.",
      "On a B2B account you opened, for the first 12 months you also earn an Origination Override of 50% of the rate the account was opened at on a same-scope renewal, while you keep actively supporting the account. After 12 months the override ends. A genuinely new engagement, or an expansion that adds at least 15 paid seats, opens its own fresh 12-month window.",
    ],
  },
  {
    title: "Payment",
    body: [
      "Commission becomes payable once both of the following are met for a given amount: the relevant course or offering has been delivered, and the company has received and cleared the corresponding customer payment. The company then pays within 30 business days of the later of those two events, in USD, on cleared receipts.",
      "Where a customer pays in another currency, the conversion uses the exchange rate on the date the final payment is received and cleared. Small amounts below a minimal threshold carry forward. You bear your own taxes and receiving-side bank fees. The company provides commission statements you may query within 30 days.",
    ],
  },
  {
    title: "Clawback",
    body: [
      "If an engagement, or any part of it, is refunded, charged back, cancelled, credited or reversed, no commission is owed on that amount, and any commission already paid on it is reversed and may be set off against future commission or repaid. A refunded or cancelled seat does not count toward any target or bonus. This applies for 120 days, or for the full refund or chargeback window of the underlying contract if that is longer.",
    ],
  },
  {
    title: "The tier ladder and progression",
    body: [
      "Every tier earns commission on all functions at the same rates. What grows with tier is the number of open accounts you may hold, how long your accounts stay protected, your priority on company leads, eligibility for a growth bonus, public recognition, and, at Tier 3, an industry or region focus.",
      "Tier 2 is earned by selling and collecting at least 40 paid, non-refunded seats within a 12-month window. Tier 3 is earned by holding Tier 2 and then sourcing and collecting at least 15 paid, non-refunded seats in one industry or region within a 12-month window. Promotion takes effect only on the company's Panel Confirmation; meeting the thresholds is necessary but not automatic.",
      "A growth bonus of 1% applies to Tier 2 and Tier 3 partners who open, close and collect 3 or more new B2B organisations within a rolling 12-month period, within the overall cap.",
    ],
  },
  {
    title: "Tier 3 industry or region focus",
    body: [
      "A Tier 3 focus is a time-limited, non-exclusive recognition of one industry or region. It is granted for up to 12 months and re-earned each following year. The company may continue to serve the same industry or region directly and through other partners.",
      "During an active focus you earn a small bonus on the Net Receipts of seats you personally sourced or actively manage in the focus. It starts at 1% in the first year and rises by a further 1% for each additional full year you hold it, up to a ceiling of 35%. This is the only way a deal rises above the base cap.",
    ],
  },
  {
    title: "Recognition and credentials",
    body: [
      "At each tier you hold a real, professional credential and may describe your role accurately while you hold the tier, and truthfully in the past tense afterwards. After 6 months of good standing at Tier 2 or above, you may request a written letter of recognition confirming your role, tier and verified results. Tier 2 partners may be listed by name on tenxpros.com.",
    ],
  },
  {
    title: "Authority and brand",
    body: [
      "You may not bind the company, quote prices, give discounts, promise results, approve terms, accept payment, or issue invoices. You use only approved materials and current approved wording, and you may use the official title and credential for your current tier while you hold it. You do not register any domain, handle or business name that incorporates the company brand.",
    ],
  },
  {
    title: "Confidentiality, intellectual property and customer relationships",
    body: [
      "TenXPros materials, methods, curriculum, brand, customer data, pipeline and pricing are confidential and remain the company's property. All customers, accounts and customer relationships are and remain the company's property. You may keep legitimate relationships that existed before TenXPros, and you may do unrelated work in the field.",
    ],
  },
  {
    title: "Non-circumvention and non-solicitation",
    body: [
      "During the relationship, and for 24 months after it ends, you will not use the company's confidential information, registered accounts, introduced opportunities or materials to divert business to a competing offering. There is no general restriction on you working in the field. You will also not solicit the company's staff, contractors, coaches or other partners for 12 months after the relationship ends.",
    ],
  },
  {
    title: "The 90-day pilot scorecard",
    body: ["The scorecard shows your progress on the panel:"],
    bullets: [
      "Before outreach: the Activation Gate is complete.",
      "Day 14: at least 3 realistic target accounts or channels, each with your case for pursuing it.",
      "Day 30: at least 1 confirmed Qualified Lead, or documented progress on approved accounts.",
      "Day 60: at least 1 prospect meeting, a proposal path, or conversion evidence.",
      "Day 90: a review to end, extend the pilot, continue at Tier 1, or move toward Tier 2.",
    ],
  },
  {
    title: "Quality matters more than volume",
    body: [
      "Every target, tier and bonus counts only paid, collected seats that are not later refunded or cancelled, and requires a clean quality and compliance record. The program rewards real, lasting results rather than a high number of weak sales.",
    ],
  },
  {
    title: "Governing law and language",
    body: [
      "The partner agreement, between you and Naprolity OÜ, is governed by the laws of England and Wales. The parties first negotiate in good faith for 30 days, and any unresolved dispute is finally settled by arbitration under the LCIA Rules, by one arbitrator, in London, conducted in English. The English language version of the agreement is the governing and authoritative version.",
    ],
  },
  {
    title: "Your acknowledgement",
    body: [
      "By applying, you confirm that you have read and understood these terms, and that your rights as a partner arise only from confirmed Deal Registrations, real work performed, cleared and non-refunded Net Receipts, and defined time windows, all recorded on the TenXPros Partner Panel.",
    ],
  },
];
