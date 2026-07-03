/**
 * Plain-language Partner Program terms, shown in a modal on the application page
 * so an applicant can read and confirm them before applying. This is a faithful
 * summary of the TenXPros 90-Day Partner Pilot Letter and the full Partner
 * Program Agreement (Master Terms and Schedules A to H); the signed agreement is
 * the governing version. Written without em dashes by design.
 *
 * Every rate, cap, threshold and window is rendered from the config source of
 * truth (PROGRAM_CONFIG_DEFAULTS) via buildPartnerTermsSections, so a change to a
 * number there updates the terms and the public partners page together. A few
 * values that have no config field (a focus grant duration, the recognition
 * letter waiting period, the statement query window, and fixed legal periods)
 * are stated as literals and noted as such.
 */
import { PROGRAM_CONFIG_DEFAULTS, type EffectiveConfig } from "./config";
import { formatBp } from "./constants";

export interface TermsSection {
  title: string;
  body?: string[];
  bullets?: string[];
}

export const PARTNER_TERMS_LEAD =
  "This is a plain-language summary of how the TenXPros Partner Program works, so you can read it in full before you apply. If you are accepted and sign, the 90-Day Partner Pilot Letter and the full Partner Program Agreement are the governing versions. Each party should take its own professional and legal advice before signature.";

/** Build the terms with every configurable number rendered from `cfg`. */
export function buildPartnerTermsSections(cfg: EffectiveConfig): TermsSection[] {
  const pct = (bp: number) => formatBp(bp);
  return [
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
      title: `The ${cfg.pilotDays}-day pilot`,
      body: [
        `Every partner starts on a ${cfg.pilotDays}-day pilot, on a commission-only basis, so you can test the opportunity and the company can see your fit. Either party may end the pilot on 7 days written notice, for any reason.`,
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
        "Commission is earned by function, calculated on Net Receipts actually received and cleared. You earn for the functions you actually perform on a Closed Deal. The Seat (one enrolled professional) is the unit of sale. The dividing line between functions is your level of involvement, and you never set your own rate or grade your own origination: the company derives every classification objectively from the recorded facts of the deal, so nothing on your statement is a matter of opinion.",
        `A company's newness is decided by its domain, objectively. New means the domain has never appeared on a closed deal with us. Dormant means it has, but its most recent activity is more than ${cfg.originationWindowMonths} months ago. Existing means there has been activity within the last ${cfg.originationWindowMonths} months. Qualified versus Strong is decided by SEAT COUNT, counted on paid and collected seats: the Strong threshold is ${cfg.strongSeatThresholdB2c} seats or more on B2C and ${cfg.strongSeatThresholdB2b} seats or more on B2B.`,
      ],
      bullets: [
        `Basic Introduction: ${pct(cfg.basicIntroductionBp)} on B2C and B2B. You actively introduce and explain us to a person or organisation you have a genuine, pre-existing warm relationship with (attested, with a note naming the person and the relationship), and then step away: zero meetings and no follow-up. Valuable is a real test, not a word: the relationship is close and trusted, or it takes us somewhere we could not reach on our own. Merely knowing someone, or a casual acquaintance, is not what the program rewards. A genuinely valuable introduction is confirmed and rewarded even though you introduce and step aside. It pays only when that introduced contact becomes a closed, paid deal, and it confers no account ownership or protection.`,
        `Qualified Origination: ${pct(cfg.qualifiedOriginationB2cBp)} on B2C, ${pct(cfg.qualifiedOriginationB2bBp)} on B2B. Origination goes beyond an introduction: you attend the meetings and take on the follow-up, actively advancing the account. On B2B this is a new department, branch or unit of a company we already know, or a new company below the Strong seat threshold.`,
        `Strong Origination: ${pct(cfg.strongOriginationB2cBp)} on B2C, ${pct(cfg.strongOriginationB2bBp)} on B2B. On B2C the test is seats alone: ${cfg.strongSeatThresholdB2c} paid-collected seats or more (an individual has no domain, so the domain plays no role). On B2B two things must both be true: the company's domain is genuinely New or Dormant, and the deal reaches ${cfg.strongSeatThresholdB2b} paid-collected seats or more. Below the threshold, a new-company B2B deal keeps its new-company classification but is paid the Qualified rate, and a deal with no recorded seat count is always Qualified, never Strong.`,
        `Closing: ${pct(cfg.closingB2cBp)} on B2C, ${pct(cfg.closingB2bBp)} on B2B, payable only once the deal carries a recorded signed-agreement date. Closing means you drive the deal to a signed, started contract yourself: our team contributes at most one online meeting of up to forty five minutes, and possibly not even that, and you carry everything else through payment cleared, contract signed, and the engagement started.`,
        `Delivery or Coaching: ${pct(cfg.deliveryPercentBp)} of Net Receipts, a single rate the company sets. Delivery is normally performed by the company; this line is paid only when the company engages a partner to help it scale, and only once the deal carries a recorded delivered date. A fixed fee is possible only as a company exception, recorded with a reason.`,
        `Cap per deal: total partner compensation, across every function and every partner on the deal, is ${pct(cfg.capB2cBp)} of Net Receipts on B2C and ${pct(cfg.capB2bBp)} on B2B, with a Tier 3 focus account able to rise gradually to ${pct(cfg.tier3FocusHardCeilingBp)}. When functions stack above the cap, the percentage lines scale down in proportion to fit it exactly.`,
      ],
    },
    {
      title: "Account protection",
      body: [
        `The company uses reasonable efforts to confirm or decline a registration on the panel within ${cfg.dealConfirmationWindowBusinessDays} business days. A confirmed account is held against competing registrations for a Pipeline Protection period, which is ${cfg.pipelineProtectionDaysTier1} days at Tier 1 and longer at higher tiers, while you actively pursue it.`,
        `To keep an account reserved, you provide a meaningful update on the panel within your tier's cadence, for example a logged meeting, a documented next step, or a customer response. During the pilot you may hold up to ${cfg.maxOpenAccountsTier1} open registered accounts (${cfg.pilotFirst30DaysMaxAccountsTier1} in the first ${cfg.pilotFirst30DaysWindowDays} days, until you show meaningful progress).`,
      ],
    },
    {
      title: "Renewals, trail and the origination tail",
      body: [
        `Commission on a Closed Deal is payable on Net Receipts collected for up to ${cfg.trailPeriodMonths} months from signing. This trail is vested and is not affected by your later activity, subject to the clawback rules.`,
        `On a B2B account (the override is B2B only, and the engine enforces it), a same-scope renewal within the first ${cfg.originationWindowMonths} months also pays an Origination Override of ${pct(cfg.overrideShareBp)} of the rate the account was opened at. Same scope means exactly that: the same organisation and the same unit under the same domain that was originally opened and confirmed. A deal with a different branch, department, unit, country, affiliate, parent, or any other related structure is not a renewal of this account: it is a new registration and, when a partner originates it, a new origination at the full origination rate, not an override. The override is credited to the account's opener, the partner who originated it, not to whoever records the renewal, and only while that opener still holds Active Status by actively supporting the account. After ${cfg.originationWindowMonths} months, or if the opener goes inactive, the override ends. It is one line on the renewal and sits inside that renewal's single cap.`,
        `Where several partners contribute to one deal, each line is credited to the partner who actually performed it, so an introducer, an originator, a closer and a delivery partner can each be paid on the same deal. A single genuinely shared contribution may be split between partners by a company-set weight, recorded with a reason. However the credit is divided, the deal total can never exceed the cap.`,
      ],
    },
    {
      title: "Payment",
      body: [
        `Commission becomes payable once both of the following are met for a given amount: the relevant course or offering has been delivered, and the company has received and cleared the corresponding customer payment. The company then pays within ${cfg.paymentBusinessDays} business days of the later of those two events, in USD, on cleared receipts.`,
        "Where a customer pays in another currency, the conversion uses the exchange rate on the date the final payment is received and cleared. Small amounts below a minimal threshold carry forward. You bear your own taxes and receiving-side bank fees. The company provides commission statements you may query within 30 days.",
      ],
    },
    {
      title: "Clawback",
      body: [
        `If an engagement, or any part of it, is refunded, charged back, cancelled, credited or reversed, no commission is owed on that amount, and any commission already paid on it is reversed and may be set off against future commission or repaid. A refunded or cancelled seat does not count toward any target or bonus. This applies for ${cfg.clawbackDays} days, or for the full refund or chargeback window of the underlying contract if that is longer.`,
      ],
    },
    {
      title: "The tier ladder and progression",
      body: [
        "Every tier earns commission on all functions at the same rates. What grows with tier is the number of open accounts you may hold, how long your accounts stay protected, your priority on company leads, eligibility for a growth bonus, public recognition, and, at Tier 3, an industry or region focus.",
        `Tier 2 is earned by selling and collecting at least ${cfg.tier2SeatThreshold} paid, non-refunded seats within a ${cfg.tierQualifyingWindowMonths}-month window. Tier 3 is earned by holding Tier 2 and then sourcing and collecting at least ${cfg.tier3FocusSeatThreshold} paid, non-refunded seats in one industry or region within a ${cfg.tierQualifyingWindowMonths}-month window. Promotion takes effect only on the company's Panel Confirmation; meeting the thresholds is necessary but not automatic.`,
        `A growth bonus of ${pct(cfg.growthBonusBp)} applies to Tier 2 and Tier 3 partners who close and collect ${cfg.growthBonusOrgThreshold} or more distinct, genuinely new B2B organisations within a rolling ${cfg.tierQualifyingWindowMonths}-month period, counted by domain, so two deals on the same company count once. A deal with no recorded domain never counts. The bonus applies within the overall cap.`,
      ],
    },
    {
      title: "Tier 3 industry or region focus",
      body: [
        "A Tier 3 focus is a time-limited, non-exclusive recognition of one industry or region. It is granted for up to 12 months and re-earned each following year. The company may continue to serve the same industry or region directly and through other partners.",
        `During an active focus you earn a small bonus on the Net Receipts of seats you personally sourced or actively manage in the focus. It starts at ${pct(cfg.focusBonusStartBp)} in the first year and rises by a further ${pct(cfg.focusBonusAnnualIncrementBp)} for each additional full year you hold it, up to a ceiling of ${pct(cfg.focusBonusCeilingBp)}. This is the only way a deal rises above the base cap.`,
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
      title: `The ${cfg.pilotDays}-day pilot scorecard`,
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
      title: "Completion of commitments and continuity of the program",
      body: [
        "TenXPros takes its commitments to partners seriously and stands behind every confirmed Deal Registration, Panel Confirmation, and commission earned on a collected, non-refunded deal, along with the survival obligations described above. Those are honored in full.",
        "At the same time, the Partner Program is offered for defined periods and is not a perpetual commitment. Once the company has met its outstanding obligations to you, the founder may, at the founder's sole discretion, decide to conclude, pause, or change the direction or purpose of the Partner Program and of the wider TenXPros service. Such a decision is final, is made in the ordinary course of running the business, and is not subject to objection or challenge.",
        "This continuity provision does not reduce anything already owed to you. Commission already earned on a confirmed and collected deal remains payable under these terms, and the confidentiality, non-circumvention, non-solicitation, clawback, and ownership clauses continue to apply. Where practical, reasonable notice of any material change will be given through the site, which is the official channel of notice.",
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
}

/**
 * The published terms, built from the config source of truth. The client terms
 * modal imports this, so a change to a rate, cap or window in the config updates
 * the shown terms without any hardcoded literal to drift.
 */
export const PARTNER_TERMS_SECTIONS: TermsSection[] = buildPartnerTermsSections(PROGRAM_CONFIG_DEFAULTS);
