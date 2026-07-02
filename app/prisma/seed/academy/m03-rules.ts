import type { ModuleSeed } from "./content-types";
import { PROGRAM_CONFIG_DEFAULTS as CFG } from "../../../src/lib/partner/config";
import { formatBp as pct } from "../../../src/lib/partner/constants";

// Worked-example sums, computed from config so the examples never drift from the
// per-function rates or the caps.
const sumB2c = CFG.qualifiedOriginationB2cBp + CFG.closingB2cBp + CFG.deliveryPercentMaxBp;
const paidB2c = Math.min(sumB2c, CFG.capB2cBp);
const sumB2b = CFG.strongOriginationB2bBp + CFG.closingB2bBp + CFG.deliveryPercentMaxBp;
const paidB2b = Math.min(sumB2b, CFG.capB2bBp);

export const m03: ModuleSeed = {
  slug: "rules",
  order: 3,
  title: "The Rules",
  summary: "Where your right to earn comes from: the five part formula, the Partner Panel as single source of truth, commission by function, tiers, clawback, annual validity, and survival clauses.",
  passMark: 80,
  examSize: 10,
  lesson: "This is the most precise part of the Academy, and the most important to get right, because your right to earn lives here. Read it once fully before your first conversation, then come back to it as reference. Everything in this module is governed by the official Partner Program Terms, and the Partner Panel is the single source of truth. When this lesson and a casual message disagree, the Panel and the Terms win.\n\nStart with the formula, because it is the whole logic in one place. Your right to earn comes from five things, and you need all five together. A registered opportunity. A real role you actually performed. Money that was actually received and cleared. A defined time window. And active account management. If something is not registered, not confirmed, not performed, not cleared, and not recorded, it is not a protected earning right. A friendly conversation is not a right. A pending status is not a right. A confirmed record on the Panel is a right.\n\nUnderstand the relationship you are in. It is an independent contractor relationship. It does not create employment, agency, equity, co founder status, salary, benefits, exclusivity, territory ownership, or any long term commitment. You earn defined commission only when there is a confirmed deal registration, real work performed, and cleared money received. Nothing more is implied by being a partner.\n\nThe Partner Panel is the single source of truth, and this is not a slogan. A verbal comment, a chat message, an email thread, a pending label, or warm encouragement from someone at the company is not approval. A right exists only when the company confirms it on the Panel. No reply is not approval. Silence is not a yes. If it is not confirmed on the Panel, treat it as not yet real.\n\nEvery partner begins with a ninety day pilot. The pilot is commission only. It lets both sides test fit, quality, seriousness, and operating discipline before anything longer. Either side can end it on seven days written notice. Ending the pilot does not erase commission you already earned on a closed deal, subject to the refund, chargeback, cancellation, and clawback rules. The pilot is a real start, not a trap.\n\nBefore you contact a single prospect using the TenXPros name, you complete the Activation Gate. That means a signed agreement, completed onboarding, approved messaging, acknowledgement of the partner terms, agreement to use no spam and no bought or scraped lists, your first target list submitted on the Panel, and the company's confirmation on the Panel. Only after that confirmation do you begin outreach. Not before.\n\nDeal registration is how you protect a specific opportunity, and the details matter. Register the opportunity before substantive contact. The registration is effective only when the company confirms it on the Panel. A proper registration names the legal entity or individual, the country, the business unit, the contact, the offering, the estimated seats and value, your role, and a real reason you are positioned to pursue this account, such as a warm contact, sector relevance, or a concrete route in. Scope is exact. A registered account covers only the precise scope confirmed. Parent companies, affiliates, sister companies, other countries, other departments, and group accounts are not included unless the company expressly adds them. Some things cannot be registered at all: house accounts, existing TenXPros relationships or pipeline, direct inbound customers, and accounts already registered to another partner. And priority is simple. If two partners want the same account, priority goes to the one whose registration was confirmed first on the Panel.\n\nNow commission, in structure. It is earned by function and calculated on net receipts that were actually received and cleared. The unit of sale is the seat, which means one enrolled professional. There are two contexts, a business to consumer charter when an individual enrolls, and a business to business engagement when an organization buys seats for its people. Each function pays a defined rate in each context, the stronger origination and closing roles pay more than a basic introduction, delivery or coaching pays a fixed fee or a small approved percentage, and there is a cap on total commission per deal. A focused tier three account can rise toward a higher cap under the focus rules. The exact figures for the current year live in the official terms. What you must remember is the logic: you are paid on cleared money, for the function you performed, up to a cap, and never simply because a conversation happened.\n\nPayment timing is specific. Commission becomes payable only after the relevant course or offering has been delivered and the company has received and cleared the matching customer payment. Payment is then made within thirty business days of the later of those two events. You are responsible for your own taxes, for any receiving side bank fees, and for checking your commission statements and raising any query within thirty days.\n\nClawback is the other side of cleared money. If an engagement, a seat, or a payment is refunded, charged back, cancelled, credited, or reversed, no commission is owed on that amount. If you were already paid, it can be reversed, offset against future commission, or repaid. The clawback applies for a defined window, and for the full refund or chargeback period of the underlying contract if that is longer.\n\nAccount protection rewards real activity. A confirmed account is protected for a pipeline protection period while you actively pursue it. Higher tiers get longer protection. To keep an account active you provide meaningful updates on the Panel, such as a logged meeting, a documented next step, a customer response, a proposal path, or conversion evidence. During the pilot you can hold a limited number of open registered accounts, with a tighter limit in the first thirty days until you show real progress.\n\nThe tiers are a ladder you climb on collected results, not on promises. Tier one is the referral partner, where everyone begins, on the pilot, able to register opportunities, earn on confirmed closed deals, hold a small number of open accounts, and use the referral partner credential. Tier two is the certified partner, earned by selling and collecting a defined number of paid, non refunded seats within twelve months, with a clean record and Panel confirmation. It brings more open accounts, longer protection, priority on company leads, growth bonus eligibility, a certified credential, a public listing, and a letter of recognition. Tier three is the territory builder, earned after tier two by sourcing and collecting a defined number of paid, non refunded seats in one industry or region within twelve months. It brings the most open accounts, the longest protection, first priority on leads in your focus, a focus bonus, and public recognition as the lead partner for your area.\n\nThere are firm limits on your authority and the brand. You cannot bind the company. You cannot quote prices unless you are using approved current materials. You cannot give discounts, promise results, approve terms, accept payment, or issue invoices. You cannot register domains, handles, or business names using the TenXPros brand, and you cannot use unofficial titles or credentials.\n\nConfidentiality and intellectual property are clear. TenXPros materials, methods, curriculum, brand, customer data, pipeline, and pricing are confidential and remain company property. Customer relationships remain company property. You may keep legitimate relationships that existed before TenXPros, and you may do unrelated work in your field.\n\nTwo obligations follow you after the relationship ends. Non circumvention means that during the relationship and for a defined period after it ends, you do not use TenXPros confidential information, registered accounts, introduced opportunities, or materials to divert business to a competing offering. Non solicitation means that for a defined period after the relationship ends, you do not solicit TenXPros staff, contractors, coaches, or other partners.\n\nNow the part about time, because it shapes every term above. All of these rules, the commission structure, the tier thresholds, and the program policies, are valid for the current calendar year only. They can change at the start of each new calendar year, for partners and for students alike, and every change is announced through the website, which is the official channel of notice. All contracts and partner agreements are valid until the end of the calendar year in which they were accepted, on the thirty first of December of that year. Renewal for the next year happens through the site, and continuing as a partner in the new year means accepting that year's published terms.\n\nThe annual reset does not cancel everything, and this is the part people get wrong. Some obligations survive the year end and survive the end of the partnership. Confidentiality survives. Non circumvention survives for its defined period. Non solicitation survives for its defined period. Clawback rights on commission already paid survive for their window. Ownership of intellectual property and of customer relationships survives. In plain words, yearly renewal changes the commercial terms going forward, but it does not erase the obligations you already carry from prior years.\n\nHold the spirit of this whole module in one line. Your right to earn comes from recorded, real work, inside a defined year, under terms the Panel confirms. Follow the process and you are protected. Skip it and you are not.",
  bodyHtml: `<p class="lead">This is the most precise part of the Academy and the most important to get right, because your right to earn lives here. Everything is governed by the official Partner Program Terms, and the Partner Panel is the single source of truth. When this lesson and a casual message disagree, the Panel and the Terms win. Read it once fully before your first conversation, then keep it as reference.</p>

<h2>What you will be able to do</h2>
<ul>
  <li>State the five part earning formula and explain why a conversation is not a right.</li>
  <li>Register a deal correctly, respect exact scope, and know what cannot be registered.</li>
  <li>Explain commission logic, clawback, the tier ladder, your authority limits, and which obligations survive the year end.</li>
</ul>

<h2>What you need to understand</h2>

<h3>A plain-language glossary</h3>
<p>A handful of terms recur through this module and the Panel. Here they are in plain language, so nothing later reads as jargon.</p>
<ul>
  <li><strong>House account:</strong> a customer the company already owns or is already working, including existing relationships, live pipeline, and direct inbound customers. House accounts cannot be registered by a partner, because they were never yours to bring.</li>
  <li><strong>Net receipts:</strong> the money that actually reaches and clears to the company after the real costs of the sale, such as processor and gateway fees and any currency conversion cost. Commission is a percentage of net receipts, not of the sticker price and not of profit.</li>
  <li><strong>Seat:</strong> the unit of sale, meaning one enrolled professional. Everything is counted in seats.</li>
  <li><strong>B2C charter:</strong> an individual enrolls and pays for their own seat. <strong>B2B engagement:</strong> an organization buys seats for its people.</li>
  <li><strong>Deal registration:</strong> recording a specific opportunity on the Panel so your role on it is protected once the company confirms it.</li>
  <li><strong>Activation Gate:</strong> the one time set of steps you finish before any outreach using the TenXPros name.</li>
  <li><strong>Origination, closing, and delivery:</strong> the three families of function you can be paid for. Origination is bringing and qualifying the opportunity, closing is getting it to a paid decision, and delivery or coaching is doing approved work inside the engagement.</li>
  <li><strong>Clawback:</strong> the rule that reverses commission when the underlying money is refunded, charged back, cancelled, or reversed.</li>
  <li><strong>Pipeline protection:</strong> the period during which your confirmed account is shielded from other partners while you actively work it.</li>
  <li><strong>Growth bonus and focus bonus:</strong> extra earnings a qualifying tier two or tier three partner can become eligible for. They live inside the same per deal cap, never above it.</li>
  <li><strong>Survival clauses:</strong> the obligations that continue after the year ends and after the partnership ends, such as confidentiality, non circumvention, and non solicitation.</li>
</ul>

<h3>The five part formula</h3>
<p>Your right to earn comes from five things, and you need all five together: a registered opportunity, a real role you actually performed, money that was actually received and cleared, a defined time window, and active account management. If something is not registered, not confirmed, not performed, not cleared, and not recorded, it is not a protected earning right. A friendly conversation is not a right. A pending status is not a right. A confirmed record on the Panel is a right.</p>

<h3>The relationship, and the Panel as single source of truth</h3>
<p>It is an independent contractor relationship. It does not create employment, agency, equity, co founder status, salary, benefits, exclusivity, territory ownership, or any long term commitment. You earn defined commission only when there is a confirmed deal registration, real work performed, and cleared money received.</p>
<p>The Panel being the single source of truth is not a slogan. A verbal comment, a chat message, an email thread, a pending label, or warm encouragement from someone at the company is not approval. No reply is not approval. Silence is not a yes. If it is not confirmed on the Panel, treat it as not yet real.</p>

<h3>The pilot and the Activation Gate</h3>
<p>Every partner begins with a ninety day commission only pilot that lets both sides test fit, quality, seriousness, and operating discipline. Either side can end it on seven days written notice, and ending it does not erase commission already earned on a closed deal, subject to the refund, chargeback, cancellation, and clawback rules.</p>
<p>Before you contact a single prospect using the TenXPros name, you complete the Activation Gate: a signed agreement, completed onboarding, approved messaging, acknowledgement of the partner terms, agreement to use no spam and no bought or scraped lists, your first target list submitted on the Panel, and the company's confirmation on the Panel. Only after that confirmation do you begin outreach.</p>

<h3>Deal registration and scope</h3>
<p>Register the opportunity before substantive contact, and it is effective only when the company confirms it on the Panel. A proper registration names the legal entity or individual, the country, the business unit, the contact, the offering, the estimated seats and value, your role, and a real reason you are positioned to pursue this account.</p>
<ul>
  <li><strong>Scope is exact.</strong> A registered account covers only the precise scope confirmed. Parent companies, affiliates, sister companies, other countries, other departments, and group accounts are not included unless the company expressly adds them.</li>
  <li><strong>Some things cannot be registered:</strong> house accounts, existing TenXPros relationships or pipeline, direct inbound customers, and accounts already registered to another partner.</li>
  <li><strong>Priority is simple.</strong> If two partners want the same account, priority goes to the one whose registration was confirmed first on the Panel.</li>
</ul>

<h3>Commission, payment, and clawback</h3>
<p>Commission is earned by function and calculated on net receipts actually received and cleared. The unit of sale is the seat, meaning one enrolled professional, sold either as a business to consumer charter (an individual enrolls) or a business to business engagement (an organization buys seats). Stronger origination and closing pay more than a basic introduction, delivery or coaching pays a fixed fee or small approved percentage, and there is a cap per deal. The exact figures live in the official terms. The logic to remember: you are paid on cleared money, for the function you performed, up to a cap, never simply because a conversation happened.</p><div class="callout callout-info"><p><strong>The current rates, by function.</strong> These are the current published rates. They can change, so always treat your Panel and the current published terms as the source of truth, not a number you memorized.</p></div><ul><li>Basic Introduction: ${pct(CFG.basicIntroductionBp)} on B2C and B2B.</li><li>Qualified Origination: ${pct(CFG.qualifiedOriginationB2cBp)} on B2C, ${pct(CFG.qualifiedOriginationB2bBp)} on B2B.</li><li>Strong Origination: ${pct(CFG.strongOriginationB2cBp)} on B2C (after ${CFG.strongOriginationUnlockSeats} paid seats, or by Panel Confirmation), ${pct(CFG.strongOriginationB2bBp)} on B2B.</li><li>Closing: ${pct(CFG.closingB2cBp)} on B2C, ${pct(CFG.closingB2bBp)} on B2B.</li><li>Delivery or Coaching: a fixed fee, or ${pct(CFG.deliveryPercentMinBp)} to ${pct(CFG.deliveryPercentMaxBp)} if approved.</li></ul><p><strong>The cap, and how functions add up.</strong> Total partner compensation on any one deal is capped: ${pct(CFG.capB2cBp)} of Net Receipts on B2C and ${pct(CFG.capB2bBp)} on B2B, and an eligible Tier 3 focus account can rise gradually to ${pct(CFG.tier3FocusHardCeilingBp)}. When you perform more than one function on the same deal, the rates add up, and the total is then clamped to that cap. Two plain examples. First, on a B2C deal where you qualified the opportunity (${pct(CFG.qualifiedOriginationB2cBp)}), closed it (${pct(CFG.closingB2cBp)}), and were approved to deliver at ${pct(CFG.deliveryPercentMaxBp)}, the rates add to ${pct(sumB2c)}. The B2C cap is ${pct(CFG.capB2cBp)}, so you are paid ${pct(paidB2c)} of Net Receipts, and any total above the cap is clamped to it. Second, on a B2B deal where you strongly originated (${pct(CFG.strongOriginationB2bBp)}), closed (${pct(CFG.closingB2bBp)}), and delivered at ${pct(CFG.deliveryPercentMaxBp)}, the rates add to ${pct(sumB2b)}. The B2B cap is ${pct(CFG.capB2bBp)}, so you are paid ${pct(paidB2b)}, and the cap is an absolute ceiling, so a further function or a bonus never takes the total above it.</p>
<p>Commission becomes payable only after the offering has been delivered and the matching customer payment is received and cleared, then within thirty business days of the later of those two events. You handle your own taxes and any receiving side bank fees, and you check your statements and raise any query within thirty days. Clawback is the other side: if an engagement, seat, or payment is refunded, charged back, cancelled, credited, or reversed, no commission is owed, and if you were already paid it can be reversed, offset, or repaid.</p>

<h3>The tier ladder</h3>
<p>The tiers are a ladder you climb on collected results, not on promises. Each step is a real change in what you can hold, how long you are protected, and how you are recognized, and you move up only on paid, non refunded seats that the Panel confirms.</p>
<ul>
  <li><strong>Tier one, referral partner.</strong> Where everyone begins, on the pilot. You can register opportunities, earn on confirmed closed deals, hold a small number of open accounts, and use the referral partner credential. This tier is about proving you can find real fits and follow the process cleanly. Think of it as your working audition, where discipline matters more than volume, and where a handful of well run deals says more than a long list of loose conversations.</li>
  <li><strong>Tier two, certified partner.</strong> Earned by selling and collecting a defined number of paid, non refunded seats within twelve months, with a clean record and Panel confirmation. It is a genuine step up: more open accounts so you can carry a wider pipeline, longer account protection so your work is shielded for more time, priority on company leads, eligibility for the growth bonus, a certified credential, a public listing, and a letter of recognition. In plain terms, the company starts investing in you because you have shown you turn real opportunities into cleared money.</li>
  <li><strong>Tier three, territory builder.</strong> Earned after tier two by sourcing and collecting a defined number of paid, non refunded seats in one industry or region within twelve months. This is the depth tier: you have gone deep in a focus rather than wide across everything. It brings the most open accounts, the longest protection, first priority on leads inside your focus, a focus bonus, and public recognition as the lead partner for your area. It is the difference between someone who closes deals and someone who owns a corner of the market by reputation.</li>
</ul>
<p>Two things stay true at every tier. You never stop being bound by the rules above, and you never rise on anything but confirmed, collected results. A tier is a record of what you have actually delivered, so it cannot be argued into existence, and once earned within its period it reflects real, cleared work rather than a title someone handed you.</p>

<h3>Authority limits, and what survives the year</h3>
<p>You cannot bind the company, quote prices outside approved current materials, give discounts, promise results, approve terms, accept payment, or issue invoices. You cannot register domains, handles, or business names using the brand, or use unofficial titles. The rules, commission structure, and tier thresholds are valid for the current calendar year only, changeable each new year with notice through the website, and contracts run until the thirty first of December of the year accepted. The annual reset does not cancel everything: confidentiality, non circumvention, non solicitation, clawback on commission already paid, and ownership of intellectual property and customer relationships survive for their defined periods.</p>

<h2>How to sell it honestly</h2>
<p>You sell within the limits, not around them. You describe the offering from approved current materials, you register your role before substantive contact, and you let the Panel confirm what is real. If a prospect pushes for a discount or a price you cannot quote, you do not improvise: you point to the approved materials and route the rest to the company. Your honesty here is what makes your earning right durable, because a right built on the process cannot be argued away later.</p>

<div class="callout callout-success"><p><strong>Say this:</strong> I will register this opportunity before we go further, so your account and my role are recorded and protected on the Panel. Pricing comes from our approved current materials, not from me.</p></div>
<div class="callout callout-warning"><p><strong>Do not say this:</strong> I can knock USD 500 off and lock your whole company group in under one registration, and we will sort the paperwork later.</p></div>

<h2>Common objections and honest answers</h2>
<table>
  <thead>
    <tr><th>Objection</th><th>How to answer</th></tr>
  </thead>
  <tbody>
    <tr><td>Someone at the company said yes over chat, so I am covered, right.</td><td>Not yet. A right exists only when it is confirmed on the Panel. A chat message, a pending label, and silence are not approval.</td></tr>
    <tr><td>Can you give me a discount to close today.</td><td>No. Partners cannot give discounts or quote outside approved current materials. I will use the approved figures and route the rest to the company.</td></tr>
    <tr><td>If I buy seats for the whole group, is the parent company covered too.</td><td>Only the exact scope confirmed is covered. Parents, affiliates, and other departments are not included unless the company expressly adds them.</td></tr>
    <tr><td>When do I get paid.</td><td>Commission is payable after delivery and after the matching customer payment is received and cleared, then within thirty business days of the later of those two events.</td></tr>
    <tr><td>If a seat is refunded after I am paid, do I keep the commission.</td><td>No. Clawback applies, so it can be reversed, offset against future commission, or repaid.</td></tr>
  </tbody>
</table>

<h2>Forms and screens you will reference</h2>
<div class="form-preview"><div class="form-preview-label">The Partner Panel deal registration</div><img src="/academy/screens/deal-registration.png" alt="The Partner Panel deal registration" /><p>The deal registration screen on the Partner Panel. It captures the legal entity or individual, country, business unit, contact, offering, estimated seats and value, your role, and your real reason for pursuing the account. The registration only protects you once the company confirms it here, and it covers only the exact scope shown.</p></div>

<h2>Talking points</h2>
<ul>
  <li>Five parts make a right: registered, performed, cleared, timed, managed.</li>
  <li>The Panel is the single source of truth. Silence is not a yes.</li>
  <li>Register before substantive contact, and respect exact scope.</li>
  <li>Paid on cleared money, by function, up to a cap.</li>
  <li>Clawback and survival clauses outlast a refund and the year end.</li>
</ul>

<div class="callout callout-warning"><p><strong>Mistakes to avoid:</strong> Treating a verbal or pending nod as approval. Contacting a prospect with the TenXPros name before the Activation Gate is confirmed. Assuming a registration covers the parent or other departments. Quoting prices or giving discounts on your own authority. Forgetting that clawback, confidentiality, non circumvention, and non solicitation survive the year end and the partnership.</p></div>

<h2>Summary checklist</h2>
<ul class="checklist">
  <li>I can recite the five part formula and explain why a conversation is not a right.</li>
  <li>I can register a deal with the required details and respect exact scope.</li>
  <li>I can name what cannot be registered and who gets priority on a contested account.</li>
  <li>I can explain commission on cleared money, payment timing, and clawback.</li>
  <li>I can describe the three tiers and which obligations survive the year end.</li>
</ul>

<h2>A real scenario</h2>
<p>You had a strong call with a regional bank's training lead, who said over chat, "We are in, send it through." You feel done, but nothing is registered or confirmed on the Panel, so you have no protected right yet. You register the opportunity with the exact business unit and your real role, wait for the company's confirmation, and only then continue. A week later another partner mentions the same bank. Because your registration was confirmed first on the Panel, priority is yours. The process, not the conversation, is what protected you.</p>

<h2>How this maps to your exam</h2>
<p>Your exam tests the five part formula, the Panel as the only source of approval, the Activation Gate, exact registration scope and first-confirmed priority, commission on cleared receipts with payment timing and clawback, the tier thresholds, your authority limits, and which obligations survive the calendar year.</p>`,
  exercises: [
    {
      stem: "Which set is the five part earning formula?",
      options: ["A registered opportunity, a real role performed, cleared money, a defined time window, and active account management", "A phone call, an email, a meeting, a proposal, and a handshake", "A verbal yes, a pending status, a friendly note, a follow up, and patience", "Volume, speed, discounts, urgency, and persistence"],
      correct: 0,
      explanation: "The formula is registered opportunity, real role, cleared money, defined window, and active management. The other sets describe activity or pressure, not protected rights.",
    },
    {
      stem: "What counts as approval of a right?",
      options: ["A warm verbal comment from someone at the company", "A pending status on the Panel", "A confirmation by the company on the Partner Panel", "No reply within a week"],
      correct: 2,
      explanation: "Only a company confirmation on the Panel creates a right. Verbal comments, pending labels, and silence do not.",
    },
    {
      stem: "Commission is calculated on which basis?",
      options: ["The value of the conversation", "Net receipts actually received and cleared", "The estimated deal size at registration", "The number of meetings held"],
      correct: 1,
      explanation: "Commission is on cleared net receipts. Conversations, estimates, and meeting counts do not create commission.",
    },
    {
      stem: "Which of these accounts cannot be registered by a partner?",
      options: ["A new company you have a warm contact at", "An account already registered to another partner", "A prospect in a sector relevant to you", "A business unit you have a concrete route into"],
      correct: 1,
      explanation: "Accounts already registered to another partner, like house accounts and existing pipeline, are not available. The others are normal registrable opportunities.",
    },
    {
      stem: "For how long is a partner contract valid?",
      options: ["Forever, once signed", "Until the end of the calendar year in which it was accepted", "For exactly ninety days, then it ends", "For twenty four months automatically"],
      correct: 1,
      explanation: "Contracts are valid until the thirty first of December of the year they were accepted, with renewal through the site. The other durations are wrong.",
    },
    {
      stem: "Once commission becomes payable, when is it paid?",
      options: ["Within the window set in the current official terms, counted from the later of delivery and cleared payment", "Immediately when the deal is signed, before delivery or payment", "As soon as the opportunity is registered on the Panel", "Only after the partner reaches tier two"],
      correct: 0,
      explanation: "Payment is due within the window set in the current official terms, counted from the later of delivery and cleared customer payment. Quote the current figure from the official terms rather than memorizing it. Signing alone, registration alone, or a tier requirement are not the rule.",
    },
  ],
  exam: [
    {
      stem: "A partner had a great call but nothing is registered or confirmed on the Panel. What is true?",
      options: ["The partner has a protected earning right from the call", "There is no protected right yet, because it is not registered and confirmed", "The call counts as a registration automatically", "The right exists once the partner emails a summary"],
      correct: 1,
      explanation: "A right requires registration and Panel confirmation, among the five elements. A call, an automatic assumption, or an email summary do not create one.",
    },
    {
      stem: "The partner relationship creates which of the following?",
      options: ["Employment and benefits", "Equity and co founder status", "An independent contractor relationship with defined commission only", "Guaranteed territory ownership"],
      correct: 2,
      explanation: "It is an independent contractor relationship with commission only. It does not create employment, equity, or guaranteed territory.",
    },
    {
      stem: "Why is the Partner Panel called the single source of truth?",
      options: ["Because verbal approvals are stronger than the Panel", "Because a right exists only when the company confirms it on the Panel", "Because pending statuses are binding", "Because silence counts as approval"],
      correct: 1,
      explanation: "The Panel is authoritative because confirmation there is what creates a right. Verbal approvals, pending labels, and silence are not binding.",
    },
    {
      stem: "What is required before a partner contacts a prospect using the TenXPros name?",
      options: ["A single signed page only", "The full Activation Gate, including Panel confirmation", "A first commission", "Ninety days of waiting"],
      correct: 1,
      explanation: "The complete Activation Gate, ending in Panel confirmation, is required before outreach. A partial step, a commission, or time alone is not enough.",
    },
    {
      stem: "A registered account covers which scope?",
      options: ["The parent company and all affiliates automatically", "Only the exact scope confirmed, unless the company adds more", "Every department in the group", "Other countries where the company operates"],
      correct: 1,
      explanation: "Scope is exactly what is confirmed. Parents, affiliates, group departments, and other countries are not included unless expressly added.",
    },
    {
      stem: "Two partners register the same account. Who has priority?",
      options: ["The one with the larger company", "The one whose registration was confirmed first on the Panel", "The one who has been a partner longer", "Whoever closes first"],
      correct: 1,
      explanation: "Priority follows the first confirmed registration on the Panel, not company size, tenure, or who closes first.",
    },
    {
      stem: "A seat is refunded after the partner was paid commission on it. What happens?",
      options: ["The partner keeps the commission regardless", "The commission can be reversed, offset, or repaid under clawback", "Nothing, because it was already paid", "The refund is ignored for commission purposes"],
      correct: 1,
      explanation: "Clawback applies to refunds, chargebacks, and reversals, so paid commission can be reversed, offset, or repaid. It is not kept regardless.",
    },
    {
      stem: "Tier two, the certified partner, is earned by which of these?",
      options: ["Simply waiting past the pilot", "Selling and collecting a defined number of paid, non refunded seats within twelve months, with a clean record and Panel confirmation", "A verbal promotion from a team member", "Registering a single large account"],
      correct: 1,
      explanation: "Tier two is earned on collected, non refunded seats over twelve months with a clean record and Panel confirmation, not on time, a verbal nod, or one registration.",
    },
    {
      stem: "Which of these is something a partner may not do?",
      options: ["Use approved current materials to describe the offering", "Give a discount to close a deal faster", "Provide a meaningful Panel update on an active account", "Submit a proper deal registration"],
      correct: 1,
      explanation: "Partners cannot give discounts, quote outside approved materials, promise results, accept payment, or bind the company. The other actions are allowed and expected.",
    },
    {
      stem: "How long are the program rules and commission structure valid?",
      options: ["Permanently, once published", "For the current calendar year only, with changes announced through the site", "For twenty four months", "Until the partner reaches tier three"],
      correct: 1,
      explanation: "Rules and commission are valid for the current calendar year, changeable each new year with notice on the site. They are not permanent or tied to a tier.",
    },
    {
      stem: "When the year ends, which obligation still survives?",
      options: ["The current year commission rates continue unchanged", "Confidentiality, non circumvention, non solicitation, and clawback survive for their defined periods", "Nothing survives, every term resets", "Only the partner's commission claims survive"],
      correct: 1,
      explanation: "Survival clauses outlast year end and termination. Commercial rates do not simply continue, and the reset does not erase those obligations.",
    },
    {
      stem: "Which single line best captures the Rules module?",
      options: ["Earn on conversations, fast and often", "Your right to earn comes from recorded, real work, inside a defined year, under terms the Panel confirms", "Promises and persistence create rights", "Territory is owned by whoever asks first"],
      correct: 1,
      explanation: "The module's spirit is recorded, real work, within a defined year, confirmed by the Panel. Conversations, promises, and asking for territory do not create rights.",
    },
  ],
};
