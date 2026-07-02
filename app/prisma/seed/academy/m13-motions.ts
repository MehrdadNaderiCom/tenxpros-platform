import type { ModuleSeed } from "./content-types";
import { PROGRAM_CONFIG_DEFAULTS as CFG } from "../../../src/lib/partner/config";
import { formatBp as pct } from "../../../src/lib/partner/constants";
import { pricingTiers } from "../../../src/lib/program-data";

// Prices from the pricing source of truth, so the content tracks a price change.
const foundingPrice = pricingTiers.find((t) => t.tier === "FOUNDING")?.price ?? 997;
const standardPrice = pricingTiers.find((t) => t.tier === "STANDARD")?.price ?? 2497;

export const m13: ModuleSeed = {
  slug: "motions",
  order: 13,
  title: "Selling to Organizations and to Individuals",
  summary: "Selling to organizations and to individuals: the two motions, the unit of sale, and how each is handled.",
  passMark: 80,
  examSize: 10,
  lesson: "The program is sold two very different ways, and a partner who blurs them loses both. Selling to one experienced professional who enrolls themselves is a business to consumer sale, the B2C Charter. Selling seats to an organization that wants to develop its people is a business to business sale, the B2B Engagement. The product is the same twelve week certification, but the buyer, the motivation, the conversation, and the path to a decision are different. This module is the two motions side by side, so you can run whichever one the situation calls for.\n\nStart with the individual sale, the B2C Charter. Here the buyer and the participant are the same person, an experienced professional deciding to invest in their own standing. Their motivation is personal: to move from using AI to leading it in their field, to hold a defensible, verifiable credential built on their own real work, and to be ahead in a market where most of their peers are not. The conversation is the one you already know from the earlier modules: open with their challenge, match their field story, give the honest mini pitch, handle price by pointing to the current approved details and the application, and guide them to apply, since payment follows acceptance. The decision is theirs alone, so the sale turns on personal relevance and trust. Your commission here follows the B2C Charter rates by function.\n\nNow the organizational sale, the B2B Engagement, which is a different motion and where the larger deals live. Here the buyer is not the participant. The buyer is usually a leader responsible for capability, risk, or transformation: a head of learning and development, an HR or talent leader, a transformation or innovation lead, a department head, or an executive sponsor. They are not buying a personal credential. They are buying an outcome for the organization, a group of their people who can lead AI adoption responsibly, with a consistent method, documented governance, and defensible work, rather than a scattered set of individuals each improvising with AI on their own. Remember the unit: a seat is one enrolled professional, so a B2B engagement is simply a number of seats bought for a team, and your commission follows the B2B Engagement rates and the per deal cap.\n\nThe organizational conversation is built around a business case, not a personal one, and you frame it in the leader's terms. The problem you are solving for them is that inconsistent and risky AI use across their team becomes a shared, governed standard. People who were improvising start producing reviewed, defensible work. The organization builds real internal capability instead of depending on outside help for every AI decision. And the leader can see proof, because every participant produces a dossier reviewed against public criteria. You never promise a specific business result or a return figure you cannot stand behind, but you can honestly describe the capability, the consistency, and the governance the program builds, which is exactly what a responsible leader is trying to buy.\n\nThe organizational decision also runs differently, and you should expect that and work with it. There are usually several stakeholders: the sponsor who wants the outcome, the people who will participate, and often a procurement or finance step. The motion that works is land and expand. You propose a small first group, a pilot cohort, so the organization can see the quality of the work and the credential before committing more seats, and then you grow from there. You register the organizational opportunity on the Panel with the real scope, you keep it active with documented progress, and you respect the scope rule: a registered account covers only the confirmed scope, so other departments, affiliates, or countries are not included unless the company expressly adds them.\n\nWatch for the moment a B2C conversation is actually a B2B door, because this is where a single good conversation becomes a large deal. An individual professional who is enthusiastic and senior is often the way into their whole team. When one prospect could bring ten colleagues, you are no longer in a personal sale, you are in an organizational one, and you shift the conversation toward the team outcome and a pilot. Recognizing that switch, and handling it without losing the individual's trust, is one of the most valuable instincts a partner can build.\n\nKeep the limits the same in both motions, because the rules do not relax for a bigger deal. In neither motion do you bind the company, quote outside approved materials, give discounts, promise results, accept payment, or issue invoices. The company handles acceptance, payment, and delivery in both. Your job in both is to bring the right buyer to the door honestly and register the opportunity correctly. The difference is who the buyer is and what they are buying, not what you are allowed to promise.\n\nOne line for the module. A B2C Charter sale is to an individual investing in their own credential and turns on personal relevance, a B2B Engagement is seats sold to an organization and turns on a business case run through several stakeholders with a pilot first, and a strong individual prospect is often the door to a whole team.",
  bodyHtml: `<p class="lead">The same twelve week certification is sold two very different ways, and a partner who blurs them loses both. Selling to one professional who enrolls themselves is the B2C Charter. Selling seats to an organization that wants to develop its people is the B2B Engagement. The product does not change. The buyer, the motivation, the conversation, and the path to a decision all do. This module puts the two motions side by side so you can run whichever one the situation calls for.</p>

<h2>What you will be able to do</h2>
<ul>
  <li>Tell, within the first minutes of a conversation, whether you are in a B2C Charter or a B2B Engagement.</li>
  <li>Run the individual sale on personal relevance and trust, and guide the prospect to apply.</li>
  <li>Frame the organizational sale as a business case in the leader's own terms, never as a personal credential.</li>
  <li>Count the unit of sale correctly: a seat is one enrolled professional, so a team deal is a number of seats.</li>
  <li>Run land and expand with a pilot cohort, register the opportunity at its real scope, and respect the scope rule.</li>
  <li>Spot the moment a strong individual prospect is actually the door to a whole team, and shift without losing their trust.</li>
</ul>

<h2>What you need to understand</h2>

<h3>The B2C Charter: buyer and participant are the same person</h3>
<p>Here the person deciding and the person enrolling are one experienced professional investing in their own standing. Their motivation is personal: to move from using AI to leading it in their field, to hold a defensible, verifiable credential built on their own real work, and to be ahead of peers who are still improvising. This is the multiplier in action. The program multiplies an AI method onto expertise the person already has, so the input has to be real. Ten times zero is still zero. A senior professional with a real field is exactly the input that multiplies. The decision is theirs alone, so the sale turns on personal relevance and trust, and your commission follows the B2C Charter rates by function.</p>

<h3>The B2B Engagement: the buyer is not the participant</h3>
<p>The buyer is usually a leader responsible for capability, risk, or transformation: a head of learning and development, an HR or talent leader, a transformation or innovation lead, a department head, or an executive sponsor. They are not buying a personal credential. They are buying an outcome for the organization, a group of their people who can lead AI adoption responsibly, with a consistent method, documented governance, and defensible work, instead of a scattered set of individuals each improvising on their own. The unit is the seat: one enrolled professional. A B2B engagement is simply a number of seats bought for a team, and your commission follows the B2B Engagement rates and the per deal cap.</p>

<h3>The business case, framed in the leader's terms</h3>
<p>The problem you solve for a leader is that inconsistent and risky AI use across their team becomes a shared, governed standard. People who were improvising start producing reviewed, defensible work. The organization builds real internal capability instead of depending on outside help for every AI decision. And the leader can see proof, because every participant produces a dossier reviewed against public criteria. You never promise a specific business result or a return figure you cannot stand behind, but you can honestly describe the capability, the consistency, and the governance the program builds. That is exactly what a responsible leader is trying to buy.</p>

<h3>The organizational decision and land and expand</h3>
<p>The B2B decision runs through several stakeholders: the sponsor who wants the outcome, the people who will participate, and often a procurement or finance step. The motion that works is land and expand. You propose a small first group, a pilot cohort, so the organization can see the quality of the work and the credential before committing more seats, and then you grow from there. You register the opportunity on the Panel at its real scope, keep it active with documented progress, and respect the scope rule: a registered account covers only the confirmed scope, so other departments, affiliates, or countries are not included unless the company expressly adds them.</p>

<h3>What the customer pays, and what you earn</h3><p><strong>What the customer pays.</strong> For an individual on the B2C Charter, the program is sold at the Founding Charter price, which starts at ${foundingPrice} dollars. Be honest that this is an early, rising price: as the Founding Charter fills, it rises over time toward the standard price of ${standardPrice} dollars. You never quote or discount on your own. The single, transparent source of pricing for customers is https://tenxpros.com/pricing, and your Panel is the source of truth for what applies to a given deal.</p><p><strong>What you earn, by motion.</strong> Your commission is a percentage of Net Receipts, the money that reaches and clears to the company after the real costs of the sale (payment-processor and gateway fees and any currency-conversion cost), never the gross price and never a share of profit. The two motions pay differently by design: on a B2C Charter, origination is rewarded more (${pct(CFG.qualifiedOriginationB2cBp)}, or ${pct(CFG.strongOriginationB2cBp)} strong once unlocked) and closing is ${pct(CFG.closingB2cBp)}; on a B2B Engagement, closing is rewarded more (${pct(CFG.closingB2bBp)}) because an organizational sale is harder to carry to signature, while origination is ${pct(CFG.qualifiedOriginationB2bBp)}, or ${pct(CFG.strongOriginationB2bBp)} strong. On a B2B account you originated, a same scope renewal within the origination window can also pay you an origination override, a share of the rate the account was opened at, covered in the Rules module. Delivery or coaching pays a fixed fee or ${pct(CFG.deliveryPercentMinBp)} to ${pct(CFG.deliveryPercentMaxBp)} when approved, and a basic introduction pays ${pct(CFG.basicIntroductionBp)}. The total on any one deal is capped at ${pct(CFG.capB2cBp)} on B2C and ${pct(CFG.capB2bBp)} on B2B. The full rate table is in the Rules module, and because these numbers can change, treat your Panel and the published terms as the source of truth.</p><h2>How to use it</h2>
<p>Identify the buyer before you position anything. If the person in front of you is deciding for themselves, run the B2C conversation you already know: open with their challenge, match their field story, give the honest mini pitch, point to the current approved details and the application, and guide them to apply, since payment follows acceptance. If the buyer is responsible for other people, switch to the business case, propose a pilot, and register the opportunity. Your job in detection here is the same as everywhere else: detection, not persuasion. You are reading which motion is true, not talking someone into a buyer role they do not occupy.</p>

<div class="callout callout-success"><p><strong>Say this:</strong> "If a few people on your team are each improvising with AI in different ways, a pilot cohort gives you a shared method, reviewed work, and documented governance you can actually point to. Start with a small group, see the quality, then decide on more seats."</p></div>

<div class="callout callout-warning"><p><strong>Do not say this:</strong> "Enroll the whole department now and you will see a return of USD 1,200 per person in productivity." You never promise a result or a return figure, the deal size does not relax that rule, and demanding full commitment before a pilot is the wrong motion.</p></div>

<h2>Common objections and honest answers</h2>
<table>
  <thead><tr><th>Objection</th><th>How to answer</th></tr></thead>
  <tbody>
    <tr><td>"Can you just give us a team discount and we will sign everyone?"</td><td>You do not set price or give discounts in either motion. Point to the current approved details, and propose a pilot so they see the quality before scaling.</td></tr>
    <tr><td>"What return will we get on this for the organization?"</td><td>You cannot promise a return figure. You can honestly describe the capability, the consistency, and the governance the program builds, and the reviewed dossier each participant produces as proof.</td></tr>
    <tr><td>"We registered one department, so the rest of the company is covered too, right?"</td><td>No. A registration covers only its confirmed scope. Another department, affiliate, or country is included only when the company expressly adds it.</td></tr>
    <tr><td>"I am just one person, why are you talking about my team?"</td><td>Only raise the team if they raise it. When a senior prospect mentions colleagues who share the problem, it is honest to ask whether a small group should explore it together.</td></tr>
    <tr><td>"Can we skip the pilot to save time?"</td><td>The pilot is what lets you see the quality of the work and the credential before committing more seats. It builds confidence rather than slowing the deal for no reason.</td></tr>
  </tbody>
</table>

<h2>Forms and screens you will reference</h2>
<div class="form-preview"><div class="form-preview-label">The Partner Panel deal registration</div><img src="/academy/screens/deal-registration.png" alt="The Partner Panel deal registration" /><p>The Panel deal registration screen, where you log a B2B opportunity at its real scope: the legal entity, the country, the business unit, the contact, the estimated seats and value, and your route in. The opportunity is protected only once the company confirms it.</p></div>
<div class="form-preview"><div class="form-preview-label">The application screen</div><img src="/academy/screens/application.png" alt="The application screen" /><p>The application a B2C prospect completes themselves, where they describe their expertise and the real problem they want to work on. Acceptance comes first, and only then is there a payment decision.</p></div>

<h2>Talking points</h2>
<ul>
  <li>Same product, different buyer: the twelve week certification does not change between the two motions.</li>
  <li>B2C turns on personal relevance and trust; B2B turns on a business case run through several stakeholders.</li>
  <li>A seat is one enrolled professional, so fifteen people is fifteen seats, not one license.</li>
  <li>Land and expand: a pilot cohort first, then growth once the organization has seen the quality.</li>
  <li>A senior, enthusiastic individual is often the door to their whole team.</li>
  <li>The limits never relax for a bigger deal.</li>
</ul>

<div class="callout callout-warning"><p><strong>Mistakes to avoid:</strong> Treating every conversation as the same sale. Pitching a personal credential to a leader who wants a team outcome. Forgetting to switch when an individual mentions a team of ten. Assuming a single department registration covers the whole company. Relaxing any guardrail because the deal is large: you still never bind the company, quote outside approved materials, discount, promise results, accept payment, or issue invoices.</p></div>

<h2>Summary checklist</h2>
<ul class="checklist">
  <li>I can tell whether a conversation is a B2C Charter or a B2B Engagement.</li>
  <li>I can run the individual sale on personal relevance and guide the prospect to apply.</li>
  <li>I can frame the organizational value as a governed standard and reviewed, defensible work, without promising a return.</li>
  <li>I can count seats correctly and register an opportunity at its confirmed scope.</li>
  <li>I can propose a pilot cohort and run land and expand.</li>
  <li>I can recognize when an individual is the door to a team, and shift without losing trust.</li>
  <li>I hold every limit identically in both motions.</li>
</ul>

<h2>A real scenario</h2>
<p>Priya is a head of learning and development at a mid size insurer. She reaches out after a colleague enrolled as an individual and produced a dossier she could actually read and judge. She does not want a personal credential. She wants twelve of her people, who are each using AI loosely and inconsistently, to share one method with documented governance, because compliance is watching. You do not promise her a number. You describe the shared standard, the reviewed work, and the internal capability the program builds, and you propose a pilot of three first so she can see the quality. You register the opportunity at that confirmed scope, and you leave the rest of the company out until she expressly adds it.</p>

<h2>How this maps to your exam</h2>
<p>The exam checks that you can name the core difference between the two motions (same product, different buyer, motivation, and decision path), identify the B2B buyer and what they are purchasing, count seats correctly, and confirm that no limit changes for a larger deal. Expect a question on when a B2C conversation becomes a B2B door and why a pilot cohort comes first.</p>`,
  exercises: [
    {
      stem: "In a B2C Charter sale, who is the buyer?",
      options: ["An organization buying for its team", "The individual professional who will also be the participant", "A procurement department", "An executive sponsor"],
      correct: 1,
      explanation: "In a B2C Charter sale the buyer and the participant are the same individual. Organizations, procurement, and sponsors belong to the B2B motion.",
    },
    {
      stem: "In a B2B Engagement, who is usually the buyer?",
      options: ["The participant themselves", "A leader responsible for capability, risk, or transformation, such as an L&D or HR leader", "A random employee", "An outside vendor"],
      correct: 1,
      explanation: "The B2B buyer is typically a capability, risk, or transformation leader. It is not the participant, a random employee, or an outside vendor.",
    },
    {
      stem: "What is a seat?",
      options: ["A discount tier", "One enrolled professional", "A physical classroom place", "A coaching session"],
      correct: 1,
      explanation: "A seat is one enrolled professional, so a team deal is a number of seats. It is not a discount, a classroom place, or a session.",
    },
    {
      stem: "What motion works best for an organizational sale?",
      options: ["Demand the whole organization commit at once", "Land and expand, starting with a pilot cohort, then grow", "Skip the pilot and sign everyone", "Sell to individuals only and avoid the organization"],
      correct: 1,
      explanation: "Land and expand with a pilot lets the organization see quality before committing more. Demanding full commitment, skipping the pilot, or avoiding the org entirely are weaker or wrong.",
    },
    {
      stem: "You registered a deal for one department, and a second department now wants to join. What is true?",
      options: ["The second department is automatically covered by your registration", "Your registration covers only its confirmed scope, so the new department is not included unless the company expressly adds it", "You can quietly extend the deal yourself", "The whole company is yours once one department signs"],
      correct: 1,
      explanation: "A registration covers only its confirmed scope, so a new department must be expressly added by the company. It is not automatic, not self extended, and not company wide.",
    },
    {
      stem: "When does a B2C conversation become a B2B opportunity?",
      options: ["Never, they are always separate", "When a single enthusiastic, senior prospect could bring their whole team", "Only after the individual certifies", "Only if procurement calls first"],
      correct: 1,
      explanation: "A senior, enthusiastic individual is often the door to their team, which turns it into a B2B opportunity. It is not always separate, not gated on certification, and not dependent on procurement calling.",
    },
  ],
  exam: [
    {
      stem: "What is the core difference between the B2C and B2B motions?",
      options: ["The product is different", "The buyer, the motivation, the conversation, and the decision path differ, while the product is the same", "The rules are looser in B2B", "Only the price changes"],
      correct: 1,
      explanation: "The same product is sold to a different buyer with a different motivation and decision path. The product is not different, the rules do not loosen, and it is more than price.",
    },
    {
      stem: "A B2C Charter sale turns mainly on what?",
      options: ["A multi stakeholder business case", "Personal relevance and trust for the individual", "Procurement approval", "A pilot cohort"],
      correct: 1,
      explanation: "The individual sale turns on personal relevance and trust. The business case, procurement, and pilot belong to the organizational motion.",
    },
    {
      stem: "What is a B2B buyer actually purchasing?",
      options: ["A personal credential for themselves", "An organizational outcome, a team that can lead AI adoption with consistent method and governance", "A single seat for one person", "A discount package"],
      correct: 1,
      explanation: "The B2B buyer purchases a team level capability and governance outcome. It is not a personal credential, a single seat, or a discount.",
    },
    {
      stem: "How should a partner frame the value to an organizational buyer?",
      options: ["Promise a specific return figure", "Describe how risky, inconsistent AI use becomes a governed standard with reviewed, defensible work", "Guarantee revenue growth", "Focus only on the personal credential"],
      correct: 1,
      explanation: "You honestly describe the move to a governed standard and defensible work. You do not promise a return figure, guarantee growth, or reduce it to a personal credential.",
    },
    {
      stem: "A team of fifteen people is being enrolled. In terms of the unit of sale, that is what?",
      options: ["One charter", "Fifteen seats", "A single license", "A coaching package"],
      correct: 1,
      explanation: "Fifteen enrolled professionals is fifteen seats. It is not one charter, a single license, or a coaching package.",
    },
    {
      stem: "Why propose a pilot cohort to an organization?",
      options: ["To slow the deal down for no reason", "So the organization can see the quality of the work and the credential before committing more seats", "Because pilots are required by law", "To avoid registering the account"],
      correct: 1,
      explanation: "A pilot lets the buyer see quality before scaling, which builds confidence. It is not pointless delay, a legal requirement, or a way to skip registration.",
    },
    {
      stem: "Which stakeholders typically appear in a B2B decision?",
      options: ["Only the participant", "A sponsor who wants the outcome, the people who will participate, and often procurement or finance", "Only an outside consultant", "No one, it is a solo decision"],
      correct: 1,
      explanation: "B2B decisions usually involve a sponsor, the participants, and a procurement or finance step. It is not a solo or single party decision.",
    },
    {
      stem: "A senior individual prospect is excited and mentions their team of ten. What should the partner do?",
      options: ["Keep it a personal sale only", "Shift toward the team outcome and a pilot, since this is now an organizational opportunity", "Ignore the team", "Promise the team guaranteed results"],
      correct: 1,
      explanation: "A senior prospect with a team is a B2B door, so shift to the team outcome and a pilot. Keeping it personal, ignoring the team, or promising results are all wrong.",
    },
    {
      stem: "How do the commission contexts map to the two motions?",
      options: ["Both use the same single rate", "The individual sale follows B2C Charter rates and the organizational sale follows B2B Engagement rates, each by function and within the per deal cap", "Commission does not depend on the motion", "The partner sets the rate"],
      correct: 1,
      explanation: "B2C Charter rates apply to the individual sale and B2B Engagement rates to the organizational one, by function and within the cap. There is not a single flat rate, and the partner does not set it.",
    },
    {
      stem: "Which limit changes when the deal is a large organizational one?",
      options: ["The partner may now quote outside approved materials", "None of the limits change, you still never bind the company, quote outside approved materials, discount, promise results, accept payment, or invoice", "The partner may now give discounts", "The partner may now accept payment"],
      correct: 1,
      explanation: "The limits hold regardless of deal size. A bigger deal does not allow quoting outside approved materials, discounting, promising results, or taking payment.",
    },
    {
      stem: "Who handles acceptance, payment, and delivery in both motions?",
      options: ["The partner", "The company", "Procurement", "The participant"],
      correct: 1,
      explanation: "The company handles acceptance, payment, and delivery in both the B2C and B2B motions. It is not the partner, procurement, or the participant.",
    },
    {
      stem: "What is the essence of the two selling motions?",
      options: ["Treat every sale the same way", "B2C turns on personal relevance, B2B turns on a business case run through several stakeholders with a pilot first, and a strong individual is often the door to a whole team", "Promise organizations a guaranteed return", "Relax the rules for bigger deals"],
      correct: 1,
      explanation: "The essence is two distinct motions plus the individual to team door. Treating all sales alike, guaranteeing returns, and relaxing rules are the opposite of the module.",
    },
  ],
};
